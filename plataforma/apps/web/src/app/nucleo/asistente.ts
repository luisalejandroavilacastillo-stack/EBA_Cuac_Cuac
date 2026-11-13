import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  COLOR_PROCESO, DESC_NORMA, INDICADOR, INDICADORES, MAX_SEGUIMIENTOS, PAG_NORMA, SEGUIMIENTOS_BASE, alertasGalpon, aplica, calcular,
  cambiosFrenteAnterior, contexto, fmt, indicadoresDe, nombreEspecie, poblacion, type Evaluacion,
} from '@eba/norma';
import { esc } from '../compartido/graficas';
import { fechaCorta } from '../compartido/flujo-ui';
import { crearMotorAsistente } from '../modulos/asistente/motor';
import { environment } from '../../environments/environment';
import { SIN_MENSAJE } from './contexto';
import { Datos } from './datos';
import { Sesion } from './sesion';

export interface Mensaje { rol: 'u' | 'a'; texto: string; nota?: string; fuente?: 'local' | 'ia'; error?: boolean }

/**
 * Asistente de la norma (CU-22): el motor del prototipo con los datos de la plataforma, las conversaciones de esta sesión
 * y la conexión con la IA del servidor (Gemini). La clave de la IA nunca llega al navegador; el servidor quita los datos
 * personales antes de enviar la pregunta. Si la IA no responde, contesta el motor local con el texto de la norma.
 */
@Injectable({ providedIn: 'root' })
export class Asistente {
  private readonly http = inject(HttpClient);
  private readonly datos = inject(Datos);
  private readonly sesion = inject(Sesion);
  private readonly api = `${environment.apiUrl}/asistente`;

  /** IA del servidor: { disponible, modelo }. */
  readonly servidor = signal<{ disponible: boolean; modelo: string | null } | null>(null);
  readonly modo = computed(() => (this.servidor()?.disponible ? 'gemini' : 'local'));
  readonly nombreModo = computed(() => (this.modo() === 'gemini' ? 'IA · Gemini (servidor de la plataforma)' : 'Modo local (sin conexión)'));
  /** Ventana flotante abierta. */
  readonly abierto = signal(false);
  /** Conversaciones de esta sesión (por perfil y evaluación o finca). */
  private readonly chats = new Map<string, Mensaje[]>();

  constructor() {
    effect(() => {
      if (!this.sesion.usuario()) { this.chats.clear(); this.abierto.set(false); return; }
      void firstValueFrom(this.http.get<{ disponible: boolean; modelo: string | null }>(`${this.api}/estado`, { context: new HttpContext().set(SIN_MENSAJE, true) }))
        .then((s) => this.servidor.set(s)).catch(() => this.servidor.set(null));
    });
  }

  /** Motor con los datos actuales y el perfil de quien pregunta. */
  readonly motor = computed(() => {
    const flujo = this.datos.flujo(), u = this.sesion.usuario(), finca = (id: string) => this.datos.finca(id)!;
    return crearMotorAsistente({
      NORMA: INDICADORES, IND: INDICADOR, EVALS: this.datos.evals(), FINCAS: this.datos.fincas(), rol: u?.perfil ?? 'productor', yoNombre: u?.nombre ?? '',
      resultado: (ev: Evaluacion) => flujo.resultado(ev), lista: (ev: Evaluacion) => indicadoresDe(ev.sp), aplica, calcular,
      alertasGalpon: (ev: Evaluacion) => alertasGalpon(ev, finca(ev.finca)), cambiosFrenteAnterior: (ev: Evaluacion) => cambiosFrenteAnterior(ev, finca(ev.finca)),
      estadoProceso: (pid: string) => { const st = flujo.estadoProceso(pid); return { ...st, verificacion: st.ultima.estado === 'Finalizada' ? flujo.verificarCumplimiento(st.ultima) : null }; },
      nombreVisita: (ev: Evaluacion) => flujo.nombreVisita(ev), poblacion, nombreSp: nombreEspecie,
      fecha: (d: Date) => fechaCorta(d.toISOString()), fmt, esc, DESC_NORMA, PAG_NORMA, MAX_SEGUIMIENTOS, SEGUIMIENTOS_BASE, COLOR_ESTADO_PROC: COLOR_PROCESO,
    });
  });
  /** contexto() del motor de cálculo (para quien necesite el plan de la visita). */
  readonly contexto = contexto;

  conversacion(clave: string, bienvenida: () => string): Mensaje[] {
    if (!this.chats.has(clave)) this.chats.set(clave, [{ rol: 'a', texto: bienvenida(), fuente: 'local' }]);
    return this.chats.get(clave)!;
  }

  /** Pregunta a la IA del servidor; el nombre de la finca vuelve a su lugar (el servidor lo cambia por «[finca]»). */
  async preguntarIA(q: string, cx: { f?: { nombre: string } | null }, historial: Mensaje[], sistema: string): Promise<string> {
    const mensajes = historial.filter((m) => !m.error).slice(-12).map((m) => ({ role: m.rol === 'u' ? 'user' : 'assistant', content: m.texto }));
    while (mensajes.length && mensajes[0].role !== 'user') mensajes.shift();
    mensajes.push({ role: 'user', content: q });
    try {
      const r = await firstValueFrom(this.http.post<{ texto: string }>(this.api, { sistema, mensajes, maxTokens: 900 }, { context: new HttpContext().set(SIN_MENSAJE, true) }));
      if (!r.texto) throw new Error('respuesta vacía');
      return r.texto.replace(/\[finca\]/g, cx?.f ? cx.f.nombre : 'la finca');
    } catch (e) {
      const err = e as { status?: number; error?: { error?: string }; message?: string };
      throw new Error(err.error?.error || (err.status === 0 ? 'sin conexión con el servidor' : err.message || 'sin conexión'));
    }
  }

  /** Responde una pregunta (local o con IA) y deja la consulta en la bitácora, sin el texto. */
  async responder(conv: Mensaje[], q: string, cx: Record<string, unknown>, notaIA: string, notaLocal: string, notaError: string, registro: string): Promise<void> {
    const m = this.motor(), previo = conv.slice(1);
    conv.push({ rol: 'u', texto: q });
    const cxq = m.contextoDePregunta(q, cx), pend = m.respuestaPendientes(q, cxq);
    if (this.modo() === 'local' || pend) conv.push({ rol: 'a', texto: pend || m.responderAsistente(q, cxq), fuente: 'local', nota: notaLocal });
    else {
      try { conv.push({ rol: 'a', texto: await this.preguntarIA(q, cxq, previo, m.promptAsistente(cxq, q)), fuente: 'ia', nota: notaIA }); }
      catch (e) { conv.push({ rol: 'a', texto: m.responderAsistente(q, cxq), fuente: 'local', error: true, nota: `${notaError} (${(e as Error).message}).` }); }
    }
    void this.datos.registrar(registro);
  }
}
