import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Flujo, type Evaluacion, type Finca, type Proceso, type Rol } from '@eba/norma';
import { environment } from '../../environments/environment';
import { SIN_MENSAJE } from './contexto';
import { Sesion } from './sesion';

interface Registro<T> { id: string; version: number; datos: T }
interface Respuesta {
  sello: string;
  colecciones: {
    fincas: Registro<Finca>[]; evals: Registro<Evaluacion>[]; procesos: Registro<Proceso>[];
    usuarios: Registro<{ nombre: string; perfil: Rol; estado: string }>[];
  };
  bitacora: { h: string; t: string; u: string; a: string }[];
  catalogos?: { departamentos?: string[] };
}
export interface Persona { nombre: string; perfil: Rol; estado: string }
export interface EntradaBitacora { h: string; t: string; u: string; a: string }

const CALLADO = () => ({ context: new HttpContext().set(SIN_MENSAJE, true) });
const CADA = 15_000;
const COPIA = 'eba.copia.';   // + clave del usuario   // revisión de cambios hechos por otras personas (igual que el prototipo)

/**
 * Datos del trabajo (fincas, visitas, procesos, usuarios y bitácora), los mismos que usa el prototipo.
 * Se leen de /api/sincronizacion y se vuelven a leer cuando otra persona cambia algo (cada 15 s se compara el «sello»).
 * Los cálculos (estado por finca y especie, puntajes, procesos) los hace el motor de @eba/norma, igual que el prototipo.
 */
@Injectable({ providedIn: 'root' })
export class Datos {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(Sesion);
  private readonly api = `${environment.apiUrl}/sincronizacion`;

  readonly cargando = signal(true);
  readonly error = signal('');
  private readonly crudo = signal<Respuesta | null>(null);
  readonly fincas = computed(() => this.crudo()?.colecciones.fincas.map((r) => r.datos) ?? []);
  readonly evals = computed(() => this.crudo()?.colecciones.evals.map((r) => r.datos) ?? []);
  readonly procesos = computed<Record<string, Proceso>>(() => Object.fromEntries(this.crudo()?.colecciones.procesos.map((r) => [r.id, r.datos]) ?? []));
  readonly usuarios = computed<Record<string, Persona>>(() => Object.fromEntries(this.crudo()?.colecciones.usuarios.map((r) => [r.id, r.datos]) ?? []));
  readonly bitacora = computed(() => this.crudo()?.bitacora ?? []);
  readonly departamentos = computed(() => this.crudo()?.catalogos?.departamentos ?? []);
  /** Motor del flujo para quien mira (cambia con los datos o con la sesión). */
  readonly flujo = computed(() => {
    const u = this.sesion.usuario();
    return new Flujo({ fincas: this.fincas(), evals: this.evals(), procesos: this.procesos() }, { rol: u?.perfil ?? null, clave: u?.clave ?? null, nombre: u?.nombre ?? null });
  });
  /** Motor del flujo con una visita cambiada (la copia de trabajo de campo, que aún no está en la base). */
  flujoCon(ev: Evaluacion): Flujo {
    const u = this.sesion.usuario();
    return new Flujo({ fincas: this.fincas(), evals: this.evals().map((e) => (e.id === ev.id ? ev : e)), procesos: this.procesos() },
      { rol: u?.perfil ?? null, clave: u?.clave ?? null, nombre: u?.nombre ?? null });
  }
  readonly actualizado = signal<Date | null>(null);
  /** Se está trabajando con la copia guardada en el equipo (sin señal). */
  readonly sinConexion = signal(false);
  private reloj: ReturnType<typeof setInterval> | null = null;
  private habia = false;
  private pidiendo: Promise<void> | null = null;

  constructor() {
    effect(() => {
      const u = this.sesion.usuario();
      if (u) { this.habia = true; void this.cargar(); this.vigilar(); }
      else {
        this.crudo.set(null); if (this.reloj) clearInterval(this.reloj); this.reloj = null;
        if (this.habia) this.borrarCopias();   // solo al salir (no al abrir la página, antes de saber quién es)
        this.habia = false;
      }
    });
  }

  /** Lee todo (o espera la lectura en curso). */
  cargar(): Promise<void> {
    this.pidiendo ??= (async () => {
      try {
        const r = await firstValueFrom(this.http.get<Respuesta>(this.api, CALLADO()));
        this.crudo.set(r);
        this.actualizado.set(new Date()); this.error.set(''); this.sinConexion.set(false);
        this.guardarCopia(r);
      } catch (e) {
        const st = e instanceof HttpErrorResponse ? e.status : 0;
        // Sin señal: se trabaja con la última copia que quedó en este equipo.
        const copia = st === 0 || st >= 500 ? this.leerCopia() : null;
        if (copia) { if (!this.crudo()) this.crudo.set(copia); this.sinConexion.set(true); this.error.set(''); }
        else if (st !== 401) this.error.set('No se pudieron cargar los datos. Revise la conexión e intente de nuevo.');
      } finally { this.cargando.set(false); this.pidiendo = null; }
    })();
    return this.pidiendo;
  }

  private vigilar(): void {
    if (this.reloj) return;
    this.reloj = setInterval(async () => {
      if (document.hidden || !this.crudo()) return;
      const r = await firstValueFrom(this.http.get<{ sello: string }>(`${this.api}/sello`, CALLADO())).catch(() => null);
      if (r && r.sello !== this.crudo()?.sello) await this.cargar();
    }, CADA);
  }

  /* ---------------- copia para trabajar sin señal (solo de quien ingresó; se borra al cerrar la sesión) ---------------- */
  private claveCopia(): string | null { const u = this.sesion.usuario(); return u ? COPIA + u.clave : null; }
  private guardarCopia(r: Respuesta): void {
    const k = this.claveCopia(); if (!k) return;
    try { localStorage.setItem(k, JSON.stringify({ ...r, bitacora: [] })); } catch { /* sin espacio: se trabaja en línea */ }
  }
  private leerCopia(): Respuesta | null {
    const k = this.claveCopia(); if (!k) return null;
    try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; }
  }
  private borrarCopias(): void {
    try { Object.keys(localStorage).filter((k) => k.startsWith(COPIA)).forEach((k) => localStorage.removeItem(k)); } catch { /* sin almacenamiento */ }
  }

  nombreUsuario(clave: string | null | undefined): string { return (clave && this.usuarios()[clave]?.nombre) || clave || 'Sin asignar'; }
  finca(id: string): Finca | undefined { return this.fincas().find((f) => f.id === id); }
  version(coleccion: 'fincas' | 'evals', id: string): number | null {
    return (this.crudo()?.colecciones[coleccion] as Registro<unknown>[] | undefined)?.find((r) => r.id === id)?.version ?? null;
  }

  /** Guarda una finca (nueva o editada). 409 = otra persona la cambió: se recargan los datos. */
  async guardarFinca(f: Finca): Promise<void> {
    const version = this.version('fincas', f.id);
    try {
      await firstValueFrom(this.http.put(`${this.api}/fincas/${encodeURIComponent(f.id)}`, { version, datos: f }));
    } finally { await this.cargar(); }
  }
  async eliminarFinca(id: string): Promise<void> {
    try { await firstValueFrom(this.http.delete(`${this.api}/fincas/${encodeURIComponent(id)}`, { params: { version: String(this.version('fincas', id)) } })); }
    finally { await this.cargar(); }
  }

  async guardarEval(ev: Evaluacion): Promise<void> {
    const version = this.version('evals', ev.id);
    try { await firstValueFrom(this.http.put(`${this.api}/evals/${encodeURIComponent(ev.id)}`, { version, datos: ev })); }
    finally { await this.cargar(); }
  }
  async guardarProceso(id: string, p: Proceso): Promise<void> {
    const version = (this.crudo()?.colecciones.procesos.find((r) => r.id === id)?.version) ?? null;
    await firstValueFrom(this.http.put(`${this.api}/procesos/${encodeURIComponent(id)}`, { version, datos: p }));
  }
  /** Aviso dentro de la aplicación para un usuario (clave) o un perfil («coordinador»). tipo «aprobar» = solo el coordinador. */
  async avisar(para: string | undefined | null, txt: string, href = '#/inicio', tipo = ''): Promise<void> {
    if (!para) return;
    const id = 'AV-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    await firstValueFrom(this.http.put(`${this.api}/avisos/${id}`, { version: null, datos: { id, para, t: new Date().toISOString(), txt, href, leido: false, tipo } }, CALLADO())).catch(() => null);
  }
  /** Inspectores activos para asignar: [clave, nombre]. */
  inspectores(): [string, string][] {
    return Object.entries(this.usuarios()).filter(([, x]) => x.perfil === 'inspector' && x.estado === 'Activo').map(([k, x]) => [k, x.nombre] as [string, string]).sort((a, b) => a[1].localeCompare(b[1]));
  }
  /** Clave del usuario productor de una finca (para avisarle), si existe. */
  usuarioProductor(f: Finca): string | undefined {
    return Object.entries(this.usuarios()).find(([, x]) => x.perfil === 'productor' && x.nombre === f.productor)?.[0];
  }

  /** Deja constancia en la bitácora (sin documento, correo ni teléfono). */
  async registrar(accion: string): Promise<void> {
    const t = new Date().toISOString(), h = `ng-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    await firstValueFrom(this.http.post(`${this.api}/bitacora`, { entradas: [{ h, t, u: this.sesion.usuario()?.nombre ?? '—', a: accion }] }, CALLADO())).catch(() => null);
  }
}

/** Destino de una pantalla de la visita. paso '' = apertura. */
export function destinoVisita(id: string, paso: string): { interno: string[] } {
  return { interno: ['/visitas', id, ...(paso ? paso.split('/').filter(Boolean) : [])] };
}
/** Traduce los enlaces que guardan los avisos (formato del prototipo: #/finca/…, #/eval/…) a las rutas de la plataforma. */
export function rutaDeAviso(enlace: string): string {
  const ruta = String(enlace || '').replace(/^#?\/?/, '');
  const finca = ruta.match(/^finca\/([^/]+)/);
  if (finca) return `/fincas/${finca[1]}`;
  const ev = ruta.match(/^eval\/([^/]+)\/?(.*)$/);
  if (ev) return destinoVisita(ev[1], ev[2]).interno.join('/');
  if (/^parametros$/.test(ruta)) return '/parametrizacion';
  return '/' + (ruta || 'inicio');
}
