import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NOMBRE_PERFIL, puede, puedeHacer, type Accion, type Modulo, type Rol } from '@eba/norma';
import { environment } from '../../environments/environment';
import { SIN_MENSAJE } from './contexto';
import { Dialogo } from './dialogo';

/** Usuario de la plataforma tal como lo entrega la API (nunca trae la contraseña). */
export interface Usuario {
  clave: string;
  nombre: string;
  perfil: Rol;
  rol: string;
  correo: string;
  tipoDocumento: string;
  documento: string;
  telefono: string;
  estado: 'Activo' | 'Inactivo';
  activacion: 'Activa' | 'Pendiente de activación' | 'Enlace vencido' | 'Sin enlace';
  bloqueada: boolean;
  enlaceVence: string | null;
  ultimoIngreso: string | null;
  version: number;
}

export interface Desafio { desafio: string; correo: string; minutos: number }

const CALLADO = () => ({ context: new HttpContext().set(SIN_MENSAJE, true) });
const RENOVAR_CADA = 4 * 60_000;
const SIN_SENAL = 'eba.sinsenal';   // con actividad, se avisa al servidor cada 4 minutos

/**
 * Sesión real (módulo 1). La identidad vive en una cookie HttpOnly que el navegador envía sola; esta clase solo
 * guarda en memoria quién es el usuario para pintar la pantalla.
 * - Cierre por inactividad (RF01): 15 minutos sin tocar la pantalla; un minuto antes pregunta si sigue ahí.
 * - Mientras el prototipo siga en uso, se deja en sessionStorage («eba.ses») quién ingresó, para que al abrir
 *   el prototipo en la misma pestaña no tenga que volver a ingresar (la API igual exige la cookie).
 */
@Injectable({ providedIn: 'root' })
export class Sesion {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly dialogo = inject(Dialogo);
  private readonly api = `${environment.apiUrl}/auth`;
  private readonly _usuario = signal<Usuario | null>(null);
  readonly usuario = this._usuario.asReadonly();
  readonly perfil = computed<Rol | null>(() => this._usuario()?.perfil ?? null);
  readonly nombrePerfil = computed(() => (this.perfil() ? NOMBRE_PERFIL[this.perfil()!] : ''));
  readonly iniciales = computed(() => (this._usuario()?.nombre ?? '').split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase());
  /** Se abrió sin señal con la última persona que ingresó en este equipo. */
  readonly sinConexion = signal(false);
  private listo: Promise<void> | null = null;
  private minutos = 15;
  private ultimaInteraccion = Date.now();
  private ultimaRenovacion = Date.now();
  private reloj: ReturnType<typeof setInterval> | null = null;
  private avisando = false;

  constructor() {
    if (typeof document !== 'undefined')
      for (const t of ['click', 'keydown', 'input', 'touchstart']) document.addEventListener(t, () => (this.ultimaInteraccion = Date.now()), { passive: true });
  }

  /** Pregunta al servidor si hay sesión (al abrir o recargar la página). */
  restaurar(): Promise<void> {
    this.listo ??= (async () => {
      try {
        const r = await firstValueFrom(this.http.get<{ usuario: Usuario; minutosInactividad: number }>(`${this.api}/sesion`, CALLADO()));
        this.abrir(r.usuario, r.minutosInactividad);
      } catch (e) {
        const sinRed = !(e instanceof HttpErrorResponse) || e.status === 0 || e.status >= 500;
        // Sin señal en campo: se sigue con la persona que ingresó en este equipo (la API vuelve a pedir la cookie al reconectar).
        const guardado = sinRed ? this.leerSinSenal() : null;
        if (guardado) { this.abrir(guardado, this.minutos); this.sinConexion.set(true); return; }
        this.limpiar();
        // Sin conexión: se vuelve a preguntar en la próxima navegación.
        if (sinRed) this.listo = null;
      }
    })();
    return this.listo;
  }

  /** Paso 1: correo y contraseña. El servidor envía el código al correo. */
  ingresar(correo: string, clave: string): Promise<Desafio> {
    return firstValueFrom(this.http.post<Desafio>(`${this.api}/ingresar`, { correo, clave }, CALLADO()));
  }

  /** Paso 2: código de 6 dígitos. Abre la sesión. */
  async verificar(desafio: string, codigo: string): Promise<Usuario> {
    const r = await firstValueFrom(this.http.post<{ usuario: Usuario }>(`${this.api}/verificar`, { desafio, codigo }, CALLADO()));
    this.listo = Promise.resolve();
    this.abrir(r.usuario, this.minutos);
    return r.usuario;
  }

  reenviarCodigo(desafio: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.api}/reenviar-codigo`, { desafio }, CALLADO()));
  }

  recuperar(correo: string): Promise<{ mensaje: string }> {
    return firstValueFrom(this.http.post<{ mensaje: string }>(`${this.api}/recuperar`, { correo }, CALLADO()));
  }

  /** Cierra la sesión en el servidor y en la pantalla. */
  async cerrar(motivo = 'Cierre de sesión'): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/salir`, { motivo }, CALLADO())).catch(() => null);
    this.limpiar();
  }

  /** La API respondió 401 (sesión vencida o cerrada en otro lado): se sale y se explica en el ingreso. */
  expirada(): void {
    if (!this._usuario()) return;
    this.limpiar();
    this.dialogo.abierto()?.responder(false);
    void this.router.navigate(['/ingreso'], { queryParams: { motivo: 'vencida' } });
  }

  /** Datos del propio usuario después de un cambio (por ejemplo, en Mi cuenta). */
  actualizar(u: Usuario): void { if (this._usuario()?.clave === u.clave) this._usuario.set(u); }

  puede(m: Modulo): boolean { return puede(this.perfil(), m); }
  puedeHacer(a: Accion): boolean { return puedeHacer(this.perfil(), a); }

  private abrir(u: Usuario, minutos: number): void {
    this._usuario.set(u);
    this.minutos = minutos || 15;
    this.ultimaInteraccion = this.ultimaRenovacion = Date.now();
    try { sessionStorage.setItem(CLAVE, JSON.stringify({ rol: u.perfil, u: u.clave, desde: new Date().toISOString(), real: true })); } catch { /* sin almacenamiento */ }
    // Para abrir sin señal: solo quién es y su perfil (sin correo, documento ni teléfono).
    try { localStorage.setItem(SIN_SENAL, JSON.stringify({ u: { clave: u.clave, nombre: u.nombre, perfil: u.perfil, rol: u.rol, estado: u.estado }, t: Date.now() })); } catch { /* sin almacenamiento */ }
    if (this.reloj) clearInterval(this.reloj);
    this.reloj = setInterval(() => void this.vigilar(), 15_000);
  }

  private limpiar(): void {
    this._usuario.set(null);
    if (this.reloj) clearInterval(this.reloj);
    this.reloj = null;
    try { sessionStorage.removeItem(CLAVE); localStorage.removeItem(SIN_SENAL); } catch { /* sin almacenamiento */ }
    this.sinConexion.set(false);
  }

  /** Última persona que ingresó en este equipo, si fue hace menos de 12 horas (duración máxima de una sesión). */
  private leerSinSenal(): Usuario | null {
    try {
      const x = JSON.parse(localStorage.getItem(SIN_SENAL) || 'null') as { u: Usuario; t: number } | null;
      return x && Date.now() - x.t < 12 * 3_600_000 ? x.u : null;
    } catch { return null; }
  }

  /** Cierre por inactividad y renovación de la sesión mientras la persona trabaja. */
  private async vigilar(): Promise<void> {
    if (!this._usuario()) return;
    const ahora = Date.now(), quieto = ahora - this.ultimaInteraccion, limite = this.minutos * 60_000;
    if (quieto >= limite) {
      this.dialogo.abierto()?.responder(false);
      await this.cerrar('La sesión se cerró por inactividad');
      void this.router.navigate(['/ingreso'], { queryParams: { motivo: 'inactividad' } });
      return;
    }
    if (quieto >= limite - 60_000 && !this.avisando) {
      this.avisando = true;
      const seguir = await this.dialogo.confirmar({
        titulo: '¿Sigue ahí?', mensaje: 'Por seguridad, la sesión se cerrará en 1 minuto por inactividad.', aceptar: 'Seguir trabajando', cancelar: 'Cerrar sesión',
      });
      this.avisando = false;
      if (!this._usuario()) return;
      if (seguir) { this.ultimaInteraccion = Date.now(); await this.renovar(); }
      else { await this.cerrar(); void this.router.navigate(['/ingreso']); }
      return;
    }
    if (this.ultimaInteraccion > this.ultimaRenovacion && ahora - this.ultimaRenovacion >= RENOVAR_CADA) await this.renovar();
  }

  private async renovar(): Promise<void> {
    this.ultimaRenovacion = Date.now();
    try {
      const r = await firstValueFrom(this.http.get<{ usuario: Usuario }>(`${this.api}/sesion`, CALLADO()));
      this._usuario.set(r.usuario);
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 401) this.expirada();
    }
  }
}

const CLAVE = 'eba.ses';
