import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Evaluacion, Finca } from '@eba/norma';
import { environment } from '../../environments/environment';
import { SIN_MENSAJE } from './contexto';
import { Datos } from './datos';
import { Notificaciones } from './notificaciones';
import { Sesion } from './sesion';

type EstadoGuardado = 'ok' | 'guardando' | 'pendiente' | 'sin-conexion';
interface Pendiente { version: number | null; datos: Evaluacion }

const COLA = 'eba.cola.';         // + clave del usuario: visitas con cambios sin enviar
const ESPERA = 700;               // ms sin escribir antes de enviar
const REINTENTO = 20_000;

/**
 * Visita en campo: copia de trabajo de la visita que el inspector está diligenciando.
 *
 * Cada cambio se aplica en la copia, queda en el navegador (por si se cierra la página o se pierde la señal) y se envía
 * a la base unos instantes después con su versión. Sin conexión, los cambios esperan en el navegador y se envían solos
 * cuando vuelve la señal. Si otra persona cambió la visita (409) se carga lo que hay en la base y se avisa.
 */
@Injectable({ providedIn: 'root' })
export class Trabajo {
  private readonly http = inject(HttpClient);
  private readonly datos = inject(Datos);
  private readonly sesion = inject(Sesion);
  private readonly notas = inject(Notificaciones);
  private readonly api = `${environment.apiUrl}/sincronizacion`;

  /** Sube con cada cambio en una copia: las pantallas lo leen para volver a calcular. */
  readonly tick = signal(0);
  readonly estado = signal<EstadoGuardado>('ok');
  /** Hora del último cambio guardado (en la base o, sin conexión, en el navegador). */
  readonly guardado = signal<string | null>(null);

  private readonly copias = new Map<string, { version: number | null; ev: Evaluacion }>();
  private cola: Record<string, Pendiente> = {};
  private espera: ReturnType<typeof setTimeout> | null = null;
  private enviando: Promise<void> | null = null;
  private reintento: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const u = this.sesion.usuario();
      this.copias.clear();
      this.cola = u ? this.leerCola(u.clave) : {};
      if (Object.keys(this.cola).length) { this.estado.set('pendiente'); void this.enviar(); }
    });
    // los datos de la base cambiaron (otra persona o la propia visita): se refrescan las copias que no tienen cambios por enviar
    effect(() => { this.datos.evals(); this.tick.update((n) => n + 1); });
    addEventListener('online', () => void this.enviar());
    addEventListener('beforeunload', (e) => { if (this.hayPendientes()) e.preventDefault(); });
  }

  hayPendientes(): boolean { return Object.keys(this.cola).length > 0 || !!this.espera; }

  /** Copia de trabajo de la visita (se crea con lo que hay en la base o con lo que quedó sin enviar). */
  copia(id: string): Evaluacion | undefined {
    const enCola = this.cola[id];
    const base = this.datos.evals().find((e) => e.id === id), vBase = this.datos.version('evals', id);
    const c = this.copias.get(id);
    if (enCola) {
      if (!c || c.ev !== enCola.datos) this.copias.set(id, { version: enCola.version, ev: enCola.datos });
    } else if (base && (!c || (vBase != null && (c.version == null || vBase > c.version)))) {
      this.copias.set(id, { version: vBase, ev: structuredClone(base) });
    }
    return this.copias.get(id)?.ev;
  }

  /**
   * Registra un cambio hecho en la copia: la visita pasa a «En proceso» si estaba asignada, se marca la hora y se envía.
   * Con «inmediato» se envía sin esperar (p. ej., al salir de la pantalla).
   */
  cambio(ev: Evaluacion, inmediato = false): void {
    if (ev.estado === 'Programada') ev.estado = 'En proceso';
    ev['guardado'] = new Date().toISOString();
    const c = this.copias.get(ev.id);
    this.cola[ev.id] = { version: c?.version ?? this.datos.version('evals', ev.id), datos: ev };
    this.escribirCola();
    this.guardado.set(ev['guardado'] as string);
    this.estado.set('pendiente');
    this.tick.update((n) => n + 1);
    if (this.espera) clearTimeout(this.espera);
    this.espera = setTimeout(() => { this.espera = null; void this.enviar(); }, inmediato ? 0 : ESPERA);
  }

  /** Envía ya lo pendiente y espera a que termine (antes de finalizar o de salir de la visita). */
  async vaciar(): Promise<boolean> {
    if (this.espera) { clearTimeout(this.espera); this.espera = null; }
    if (this.enviando) await this.enviando;
    this.rechazo = false;
    await this.enviar();
    if (this.enviando) await this.enviando;
    return !Object.keys(this.cola).length && !this.rechazo;
  }
  private rechazo = false;

  /** Cambia el propósito de la finca (huevo o carne) desde el nidal: habilita el nidal y la escala de condición corporal. */
  async propositoFinca(ev: Evaluacion, huevo: boolean): Promise<void> {
    const f = this.datos.finca(ev.finca); if (!f) return;
    const nueva: Finca = structuredClone(f);
    const e = nueva.especies.find((x) => x.sp === ev.sp); if (!e) return;
    e.proposito = huevo ? 'Huevo' : 'Carne';
    this.cambio(ev, true);
    await this.datos.guardarFinca(nueva);
    await this.datos.registrar(`Propósito de la finca: ${e.proposito.toLowerCase()} (${ev.id})`);
  }

  /** Deja la visita sin cambios locales y vuelve a tomar lo que hay en la base. */
  descartar(id: string): void {
    delete this.cola[id]; this.copias.delete(id); this.escribirCola(); this.tick.update((n) => n + 1);
  }

  /* ---------------- envío ---------------- */
  private enviar(): Promise<void> {
    if (this.enviando) return this.enviando.then(() => (Object.keys(this.cola).length && !this.espera ? this.enviar() : undefined));
    const ids = Object.keys(this.cola);
    if (!ids.length) { this.estado.set('ok'); return Promise.resolve(); }
    this.enviando = (async () => {
      this.estado.set('guardando');
      let sinRed = false;
      for (const id of ids) {
        const p = this.cola[id]; if (!p) continue;
        const enviado = p.datos;
        try {
          const r = await firstValueFrom(this.http.put<{ version: number }>(`${this.api}/evals/${encodeURIComponent(id)}`,
            { version: p.version, datos: enviado }, { context: new HttpContext().set(SIN_MENSAJE, true) }));
          const c = this.copias.get(id);
          if (c) c.version = r.version;
          // si hubo otro cambio mientras se enviaba, queda en la cola con la versión nueva
          if (this.cola[id] && this.cola[id].datos === enviado && this.cola[id] === p) delete this.cola[id];
          else if (this.cola[id]) this.cola[id].version = r.version;
        } catch (e) {
          const st = e instanceof HttpErrorResponse ? e.status : 0;
          if (st === 0 || st >= 500) { sinRed = true; break; }
          if (st === 401) { sinRed = false; this.rechazo = true; break; }   // la sesión venció: se envía al volver a ingresar
          const msg = (e as HttpErrorResponse).error?.error as string | undefined;
          delete this.cola[id]; this.copias.delete(id); this.rechazo = true;
          this.notas.error(st === 409 ? 'Otra persona modificó esta visita. Se cargó la versión más reciente; revise lo último que registró.'
            : msg || 'No se pudo guardar el cambio.');
        }
      }
      this.escribirCola();
      if (sinRed) { this.estado.set('sin-conexion'); this.programarReintento(); }
      else {
        this.estado.set(Object.keys(this.cola).length ? 'pendiente' : 'ok');
        if (!Object.keys(this.cola).length && this.reintento) { clearInterval(this.reintento); this.reintento = null; }
        await this.datos.cargar();
      }
      this.tick.update((n) => n + 1);
    })().finally(() => { this.enviando = null; });
    return this.enviando;
  }
  private programarReintento(): void {
    this.reintento ??= setInterval(() => { if (navigator.onLine !== false) void this.enviar(); }, REINTENTO);
  }

  /* ---------------- copia en el navegador ---------------- */
  private leerCola(clave: string): Record<string, Pendiente> {
    try { return JSON.parse(localStorage.getItem(COLA + clave) || '{}'); } catch { return {}; }
  }
  private escribirCola(): void {
    const u = this.sesion.usuario(); if (!u) return;
    try {
      if (Object.keys(this.cola).length) localStorage.setItem(COLA + u.clave, JSON.stringify(this.cola));
      else localStorage.removeItem(COLA + u.clave);
    } catch { /* sin almacenamiento: se trabaja en memoria */ }
  }
}
