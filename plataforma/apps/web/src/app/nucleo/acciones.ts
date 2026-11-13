import { Injectable, inject, signal } from '@angular/core';
import {
  ampliar, crearProceso, crearSeguimiento, emitirConstancia, esError, fechaLarga, fmt, fechaSugeridaSeguimiento, nombreEspecie, puntajeTexto, reprogramar,
  type Especie, type Evaluacion,
} from '@eba/norma';
import { Datos } from './datos';
import { Notificaciones } from './notificaciones';
import { Sesion } from './sesion';
import { Trabajo } from './trabajo';

export type TipoVisita = 'seg' | 'retoma' | 'cero';

/**
 * Acciones del flujo de las visitas (v0.25), las mismas del prototipo: asignar (coordinador o administrador), reasignar,
 * reprogramar, devolver y aprobar (solo el coordinador), ampliar el proceso y finalizar (inspector).
 * Cada acción guarda en la base, deja constancia en la bitácora y avisa a quien corresponde.
 * Devuelven un mensaje de error para mostrar en la ventana, o null si todo salió bien.
 */
@Injectable({ providedIn: 'root' })
export class Acciones {
  private readonly datos = inject(Datos);
  private readonly sesion = inject(Sesion);
  private readonly avisos = inject(Notificaciones);
  private readonly trabajo = inject(Trabajo);

  /** Ventanas abiertas (las pinta <app-ventanas-visita> en el marco). */
  readonly asignando = signal<string | null>(null);     // «FIN-…|pato»
  readonly reasignando = signal<string | null>(null);   // id de la visita
  readonly reprogramando = signal<string | null>(null); // id de la visita

  private get yo() { return this.sesion.usuario()!; }
  private finca(ev: Evaluacion) { return this.datos.finca(ev.finca)!; }
  private nombre(ev: Evaluacion) { return `${this.finca(ev).nombre} · ${nombreEspecie(ev.sp)}`; }
  private async ejecutar(f: () => Promise<void>): Promise<string | null> {
    try { await f(); return null; } catch (e) { return (e as { error?: { error?: string } })?.error?.error ?? 'No se pudo guardar. Intente de nuevo.'; }
  }

  /** Asignar inspección: seguimiento, proceso nuevo retomando la última evaluación, o desde cero. */
  async asignar(fid: string, sp: Especie, tipo: TipoVisita, fecha: string, inspector: string): Promise<string | null> {
    if (!fecha || fecha < new Date().toISOString().slice(0, 10)) return 'La fecha de la visita debe ser hoy o posterior.';
    const flujo = this.datos.flujo();
    const ultFin = this.datos.evals().filter((x) => x.finca === fid && x.sp === sp && x.estado === 'Finalizada').sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
    const r = tipo === 'seg' ? crearSeguimiento(flujo, flujo.procesosDe(fid, sp)[0].id, inspector, this.yo.clave, fecha)
      : crearProceso(flujo, fid, sp, tipo === 'retoma' ? ultFin?.id ?? null : null, fecha, inspector, this.yo.clave);
    if (esError(r)) return r.error;
    const ev = { ...r.ev, fecha, asignacion: { ...r.ev.asignacion!, fechaVisita: fecha } };
    return this.ejecutar(async () => {
      await this.datos.guardarEval(ev);
      const f = this.finca(ev);
      await this.datos.registrar(`Asignación de ${ev.id} (${this.nombre(ev)}) a ${this.datos.nombreUsuario(inspector)} para el ${fecha}`);
      await this.datos.avisar(inspector, `Nueva inspección asignada: ${this.nombre(ev)} (${this.datos.flujo().nombreVisita(ev)}) para el ${fechaLarga(fecha)}`, `#/finca/${f.id}`);
      this.avisos.ok(`Inspección asignada a ${this.datos.nombreUsuario(inspector)} para el ${fechaLarga(fecha)}.`);
    });
  }

  /** Reasignar una visita que aún no se envía: otro inspector y, si no ha empezado, otra fecha. */
  async reasignar(evId: string, inspector: string, fecha: string): Promise<string | null> {
    const ev = this.datos.evals().find((e) => e.id === evId);
    if (!ev || !['Programada', 'En proceso', 'Devuelta'].includes(ev.estado)) return 'Solo se reasigna una visita que aún no se ha enviado a aprobación.';
    const noIniciada = ev.estado === 'Programada', antes = ev.inspector, hoy = new Date().toISOString().slice(0, 10);
    if (noIniciada && (!fecha || fecha < hoy)) return 'La fecha debe ser hoy o posterior.';
    if (inspector === antes && (!noIniciada || fecha === ev.fecha)) return null;
    const nueva: Evaluacion = { ...ev, inspector, fecha: noIniciada ? fecha : ev.fecha };
    nueva.asignacion = { ...(ev.asignacion || {}), por: this.yo.clave, fecha: new Date().toISOString(), inspector, fechaVisita: nueva.fecha,
      ...({ anterior: antes !== inspector ? antes : (ev.asignacion as { anterior?: string } | undefined)?.anterior } as object) } as Evaluacion['asignacion'];
    return this.ejecutar(async () => {
      await this.datos.guardarEval(nueva);
      const f = this.finca(ev), nom = this.datos.nombreUsuario.bind(this.datos);
      await this.datos.registrar(`Reasignación de ${ev.id}: ${nom(antes)} → ${nom(inspector)} · visita ${nueva.fecha}`);
      if (antes !== inspector) {
        await this.datos.avisar(inspector, `Inspección reasignada a usted: ${this.nombre(ev)} para el ${fechaLarga(nueva.fecha)}`, `#/finca/${f.id}`);
        await this.datos.avisar(antes, `La inspección de ${this.nombre(ev)} se reasignó a ${nom(inspector)}`, '#/inicio');
      } else await this.datos.avisar(inspector, `Cambió la fecha de la visita a ${this.nombre(ev)}: ${fechaLarga(nueva.fecha)}`, `#/finca/${f.id}`);
      this.avisos.ok(`Visita asignada a ${nom(inspector)} para el ${fechaLarga(nueva.fecha)}.`);
    });
  }

  /** Reprogramar un seguimiento: el coordinador, el administrador o el inspector asignado (motivo obligatorio). */
  async reprogramar(evId: string, fecha: string, motivo: string): Promise<string | null> {
    const ev = this.datos.evals().find((e) => e.id === evId)!;
    const r = reprogramar(ev, fecha, motivo, this.yo.clave);
    if (esError(r)) return r.error;
    return this.ejecutar(async () => {
      await this.datos.guardarEval(r.ev);
      const f = this.finca(ev), flujo = this.datos.flujo(), txt = `${flujo.nombreVisita(ev)} de ${this.nombre(ev)} reprogramado para el ${fechaLarga(fecha)}`;
      await this.datos.registrar(`Reprogramación de ${ev.id}: ${ev.fecha} → ${fecha} · ${motivo.trim()}`);
      if (this.yo.perfil === 'inspector') await this.datos.avisar('coordinador', `${txt} por ${this.yo.nombre}`, `#/finca/${f.id}`);
      else if (ev.inspector !== this.yo.clave) await this.datos.avisar(ev.inspector, txt, `#/finca/${f.id}`);
      await this.datos.avisar(this.datos.usuarioProductor(f), txt, `#/finca/${f.id}`);
      this.avisos.ok(`${flujo.nombreVisita(ev)} reprogramado para el ${fechaLarga(fecha)}.`);
    });
  }

  /**
   * Finalizar (inspector): la visita queda «Pendiente de aprobación» del coordinador, se registra el envío (o reenvío
   * de una visita devuelta) y se avisa al coordinador. Necesita conexión para que el coordinador reciba el aviso.
   * ev es la copia de trabajo de la visita.
   */
  async finalizar(ev: Evaluacion): Promise<string | null> {
    if (!(await this.trabajo.vaciar())) return 'Sin conexión: lo registrado está guardado en este equipo. Finalice la visita cuando vuelva la señal.';
    const reenvio = ev.estado === 'Devuelta', antes = { estado: ev.estado, finalizada: ev.finalizada, revision: ev['revision'] };
    ev.estado = 'Pendiente de aprobación'; ev.finalizada = new Date().toISOString();
    ev['revision'] = [...((ev['revision'] as unknown[]) || []), { accion: reenvio ? 'Reenviada' : 'Enviada', por: this.yo.clave, fecha: new Date().toISOString(), obs: '' }];
    this.trabajo.cambio(ev, true);
    if (!(await this.trabajo.vaciar())) {
      // sin señal: la visita vuelve a como estaba en este equipo (si la base la rechazó, ya se cargó la versión de la base)
      if (this.trabajo.estado() === 'sin-conexion') { Object.assign(ev, antes); this.trabajo.cambio(ev); }
      return 'No se pudo enviar la visita al coordinador. Revise la conexión e intente de nuevo.';
    }
    const flujo = this.datos.flujo(), r = flujo.resultado(ev), ver = flujo.verificarCumplimiento(ev);
    await this.datos.registrar(`${reenvio ? 'Reenvío' : 'Finalización'} de ${ev.id}: ${puntajeTexto(flujo, ev)}${ver.cumple ? ' · cumple' : ' · no cumple'} · pendiente de aprobación`);
    await this.datos.avisar('coordinador', `${reenvio ? 'Inspección corregida' : 'Inspección por aprobar'}: ${this.nombre(ev)} (${fmt(r.total)} ${r.nivel[0]}) · ${this.datos.nombreUsuario(ev.inspector)}`, `#/eval/${ev.id}/resultado`, 'aprobar');
    this.avisos.ok(`Evaluación ${reenvio ? 'reenviada' : 'finalizada'}: queda pendiente de aprobación del coordinador.`);
    return null;
  }

  /** Devolver al inspector con una observación (solo el coordinador). */
  async devolver(ev: Evaluacion, obs: string): Promise<string | null> {
    const o = obs.trim();
    if (o.length < 5) return 'Escriba la observación para el inspector.';
    const nueva: Evaluacion = { ...ev, estado: 'Devuelta', revision: [...((ev['revision'] as unknown[]) || []), { accion: 'Devuelta', por: this.yo.clave, fecha: new Date().toISOString(), obs: o }] };
    return this.ejecutar(async () => {
      await this.datos.guardarEval(nueva);
      await this.datos.registrar(`Devolución de ${ev.id} al inspector: ${o}`);
      await this.datos.avisar(ev.inspector, `Inspección devuelta: ${this.nombre(ev)}. «${o}»`, `#/eval/${ev.id}/cierre`);
      this.avisos.ok(`Visita devuelta a ${this.datos.nombreUsuario(ev.inspector)}.`);
    });
  }

  /** Aprobar (solo el coordinador): si cumple, emite la constancia; si no y quedan seguimientos, programa el siguiente. */
  async aprobar(ev: Evaluacion, segFecha: string | null, segInspector: string | null): Promise<string | null> {
    const flujo = this.datos.flujo(), ver = flujo.verificarCumplimiento(ev), st = flujo.estadoProceso(ev.proceso), sig = (ev.visita || 0) + 1;
    const sigue = !ver.cumple && sig <= st.max, hoy = new Date().toISOString().slice(0, 10);
    if (sigue && (!segFecha || segFecha < hoy)) return 'La fecha del seguimiento debe ser hoy o posterior.';
    const aprobada: Evaluacion = { ...ev, estado: 'Finalizada', aprobada: { por: this.yo.clave, fecha: new Date().toISOString() },
      revision: [...((ev['revision'] as unknown[]) || []), { accion: 'Aprobada', por: this.yo.clave, fecha: new Date().toISOString(), obs: '' }] };
    delete aprobada['segFecha'];
    const cons = ver.cumple ? emitirConstancia(flujo, aprobada) : null;
    if (cons) aprobada.constancia = cons;
    return this.ejecutar(async () => {
      await this.datos.guardarEval(aprobada);
      const f = this.finca(ev);
      if (cons) await this.datos.registrar(`Constancia de cumplimiento ${cons.codigo} emitida para ${this.nombre(ev)} (vence ${cons.vence})`);
      await this.datos.registrar(`Aprobación de ${ev.id} (${this.nombre(ev)})`);
      const flujo2 = this.datos.flujo(), st2 = flujo2.estadoProceso(ev.proceso);
      if (st2.cumplido) await this.datos.registrar(`Proceso ${ev.proceso} cumplido en ${flujo2.nombreVisita(ev)}`);
      let seg: Evaluacion | null = null;
      if (sigue) {
        const r = crearSeguimiento(flujo2, ev.proceso, segInspector, this.yo.clave, segFecha!);
        if (!esError(r)) {
          seg = { ...r.ev, fecha: segFecha!, asignacion: { ...r.ev.asignacion!, fechaVisita: segFecha! } };
          await this.datos.guardarEval(seg);
          await this.datos.registrar(`${this.datos.flujo().nombreVisita(seg)} programado para el ${segFecha} (${seg.id})`);
          await this.datos.avisar(segInspector, `Seguimiento asignado: ${this.nombre(ev)} (${this.datos.flujo().nombreVisita(seg)}) para el ${fechaLarga(segFecha!)}`, `#/finca/${f.id}`);
        }
      }
      await this.datos.avisar(ev.inspector, `Inspección aprobada: ${this.nombre(ev)}`, `#/eval/${ev.id}/resultado`);
      await this.datos.avisar(this.datos.usuarioProductor(f), cons ? `¡Finca certificada! ${this.nombre(ev)}: constancia ${cons.codigo} lista para descargar`
        : `Resultado disponible: ${this.nombre(ev)} (${puntajeTexto(flujo, ev)}): consulte su plan de mejora`, cons ? `#/eval/${ev.id}/constancia` : `#/eval/${ev.id}/resultado`);
      this.avisos.ok(st2.cumplido ? `Inspección aprobada: la finca cumple. Constancia ${cons?.codigo ?? ''} emitida y el proceso quedó cerrado.`
        : seg ? `Inspección aprobada. ${this.datos.flujo().nombreVisita(seg)} asignado a ${this.datos.nombreUsuario(segInspector)} para el ${fechaLarga(segFecha!)}.` : 'Inspección aprobada.');
    });
  }

  /** Ampliar el proceso a 5 seguimientos (coordinador o administrador) y programar el siguiente con la fecha sugerida. */
  async ampliar(ev: Evaluacion, motivo: string): Promise<string | null> {
    const r = ampliar(this.datos.flujo(), ev.proceso, motivo, this.yo.nombre);
    if (esError(r)) return r.error;
    return this.ejecutar(async () => {
      await this.datos.guardarProceso(ev.proceso, r.proceso);
      await this.datos.registrar(`Ampliación del proceso ${ev.proceso} a 5 seguimientos: ${motivo.trim()}`);
      await this.datos.cargar();
      const flujo = this.datos.flujo(), fecha = fechaSugeridaSeguimiento(ev).fecha;
      const s = crearSeguimiento(flujo, ev.proceso, null, this.yo.clave, fecha);
      if (!esError(s)) {
        await this.datos.guardarEval(s.ev);
        await this.datos.registrar(`${this.datos.flujo().nombreVisita(s.ev)} programado para el ${fecha} (${s.ev.id})`);
      }
      this.avisos.ok(`Proceso ampliado a 5 seguimientos${!esError(s) ? `. ${this.datos.flujo().nombreVisita(s.ev)} programado para el ${fechaLarga(fecha)}` : ''}.`);
    });
  }
}
