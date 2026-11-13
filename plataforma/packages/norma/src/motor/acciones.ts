/**
 * Acciones sobre las visitas (asignar, seguimiento, reprogramar, ampliar, constancia), traducidas de
 * apps/prototipo/js/norma/seguimiento.js y flujo.js (v0.25). Son funciones puras: devuelven los registros nuevos o
 * cambiados y quien llama los guarda. Nunca modifican los objetos que reciben.
 */
import type { Especie } from '../tipos.js';
import { MAX_SEGUIMIENTOS } from '../reglas.js';
import { esAbierta } from '../perfiles.js';
import { aplica, calcular, contexto, fmt, indicadoresDe, INDICADOR } from './calculo.js';
import { Flujo, hoyISO } from './flujo.js';
import type { Constancia, Evaluacion, Finca, Indicador, Proceso } from './modelo.js';

const copia = <T>(x: T): T => JSON.parse(JSON.stringify(x ?? {}));
const masDias = (iso: string, d: number) => { const x = new Date(iso + 'T12:00'); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
export const fechaLarga = (iso: string) => new Date(iso.length === 10 ? iso + 'T07:00' : iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
type Resultado<T> = T | { error: string };
export const esError = (r: unknown): r is { error: string } => !!r && typeof r === 'object' && 'error' in r;

export function nuevoIdProceso(evals: Evaluacion[]): string {
  const anio = new Date().getFullYear(), usados = new Set(evals.map((e) => e.proceso));
  let n = usados.size + 1, id: string;
  do { id = `PRC-${anio}-${String(n++).padStart(4, '0')}`; } while (usados.has(id));
  return id;
}
export function nuevoIdEvaluacion(evals: Evaluacion[]): string {
  const usados = new Set(evals.map((e) => e.id));
  let n = 100 + evals.length, id: string;
  do { id = `EVA-${new Date().getFullYear()}-${String(n++).padStart(5, '0')}`; } while (usados.has(id));
  return id;
}

/** Foto de la evaluación base para comparar en el seguimiento: puntaje de cada indicador y total. */
export function fotoEvaluacion(flujo: Flujo, base: Evaluacion) {
  const r = flujo.resultado(base), sc: Record<string, number | null> = {};
  indicadoresDe(base.sp).forEach((i) => { const c = calcular(i, base.resp[i.code], r.ctx); sc[i.code] = c.done ? c.score : null; });
  return { id: base.id, fecha: base.fecha, visita: base.visita || 0, total: r.total, med: r.med, scores: sc };
}
function evaluacionDesde(flujo: Flujo, base: Evaluacion, extra: Partial<Evaluacion>): Evaluacion {
  return {
    id: nuevoIdEvaluacion(flujo.datos.evals), finca: base.finca, sp: base.sp, fecha: hoyISO(), inspector: base.inspector || 'inspector', estado: 'Programada',
    apertura: { atiende: base.apertura?.atiende || '', bebederos: base.apertura?.bebederos, comederos: base.apertura?.comederos, puntosSC: base.apertura?.puntosSC, avesPuntoSC: base.apertura?.avesPuntoSC },
    pobConfirmada: base.pobConfirmada ?? null, pobEsp: base.pobEsp ? copia(base.pobEsp) : undefined, resp: copia(base.resp), obs: copia(base.obs), firmas: {}, plan: copia(base.plan), guardado: null,
    anterior: fotoEvaluacion(flujo, base), base: base.id, proceso: '', visita: 0, ...extra,
  } as Evaluacion;
}
const datosAsignacion = (por: string | null, inspector: string, fechaVisita: string) => ({ por, fecha: new Date().toISOString(), inspector, fechaVisita });

/** Visita de seguimiento siguiente: retoma todo lo registrado en la última evaluación finalizada del proceso. */
export function crearSeguimiento(flujo: Flujo, pid: string, inspector: string | null, por: string | null, fecha?: string): Resultado<{ ev: Evaluacion }> {
  const st = flujo.estadoProceso(pid);
  if (!st.puedeSeguimiento) return { error: st.cumplido ? 'La finca ya cumple: el proceso está cerrado y no requiere más seguimientos.'
    : st.puedeAmpliar ? `Se usaron los ${st.max} seguimientos programados: el coordinador puede ampliar a ${MAX_SEGUIMIENTOS}.`
    : st.completo ? `El proceso ya usó sus ${st.max} seguimientos.` : 'La última visita del proceso debe estar finalizada y no puede haber otra evaluación abierta de esta finca y especie.' };
  const insp = inspector || st.ultima.inspector || 'inspector';
  const ev = evaluacionDesde(flujo, st.ultima, { proceso: pid, visita: st.usados + 1, inspector: insp, ...(fecha ? { fecha } : {}) });
  ev.asignacion = datosAsignacion(por, insp, ev.fecha);
  return { ev };
}
/** Proceso nuevo para una finca y especie, desde cero o retomando una evaluación anterior (que queda en el histórico). */
export function crearProceso(flujo: Flujo, fincaId: string, sp: Especie, retomarId: string | null, fecha: string, inspector: string, por: string | null): Resultado<{ ev: Evaluacion }> {
  const evals = flujo.datos.evals;
  if (evals.some((e) => e.finca === fincaId && e.sp === sp && esAbierta(e.estado))) return { error: 'Ya hay una evaluación abierta para esta finca y especie.' };
  const pid = nuevoIdProceso(evals), base = retomarId ? evals.find((e) => e.id === retomarId) : undefined;
  const ev: Evaluacion = base ? evaluacionDesde(flujo, base, { proceso: pid, visita: 0, fecha, inspector })
    : { id: nuevoIdEvaluacion(evals), finca: fincaId, sp, fecha, inspector, estado: 'Programada', apertura: {}, pobConfirmada: null, resp: {}, obs: {}, firmas: {}, guardado: null, proceso: pid, visita: 0 } as Evaluacion;
  ev.asignacion = datosAsignacion(por, ev.inspector, ev.fecha);
  return { ev };
}

/** Cambia la fecha de un seguimiento programado que aún no se ha iniciado (motivo obligatorio). */
export function reprogramar(ev: Evaluacion, fechaISO: string, motivo: string | null, por: string | null): Resultado<{ ev: Evaluacion }> {
  if (!ev || ev.estado !== 'Programada') return { error: 'Solo se puede reprogramar una visita que aún no se ha iniciado.' };
  if (!fechaISO) return { error: 'Indique la nueva fecha.' };
  if (fechaISO < hoyISO()) return { error: 'La fecha no puede ser anterior a hoy.' };
  if (fechaISO === ev.fecha) return { error: 'La nueva fecha es igual a la actual.' };
  const m = String(motivo == null ? 'Sin motivo (reprogramación interna)' : motivo).trim();
  if (m.length < 5) return { error: 'Escriba el motivo de la reprogramación.' };
  const nueva = copia(ev), antes = ev.fecha;
  nueva.fecha = fechaISO; if (nueva.asignacion) nueva.asignacion.fechaVisita = fechaISO;
  nueva.reprogramaciones = (ev.reprogramaciones || []).concat([{ antes, nueva: fechaISO, motivo: m, por, fecha: new Date().toISOString() }]);
  return { ev: nueva };
}
/** Amplía el proceso de 3 a 5 seguimientos (coordinador o administrador, con motivo). */
export function ampliar(flujo: Flujo, pid: string, motivo: string, porNombre: string): Resultado<{ proceso: Proceso }> {
  const st = flujo.estadoProceso(pid);
  if (!st.puedeAmpliar) return { error: 'El proceso no requiere ampliación.' };
  if (!String(motivo || '').trim()) return { error: 'Escriba el motivo de la ampliación.' };
  return { proceso: { ...(flujo.datos.procesos[pid] || {}), ampliado: { motivo: String(motivo).trim(), por: porNombre, fecha: new Date().toISOString() } } };
}

/** Fecha sugerida para el siguiente seguimiento: el día siguiente al plazo más lejano del plan de mejora; sin plazos, 30 días. */
export function fechaSugeridaSeguimiento(ev: Evaluacion): { fecha: string; plazoMax: string | null; accion: string | null } {
  const hoy = hoyISO();
  const plazos = Object.entries(ev.plan || {}).filter(([, v]) => v && v.plazo).sort((a, b) => b[1].plazo!.localeCompare(a[1].plazo!));
  if (!plazos.length) return { fecha: masDias(hoy, 30), plazoMax: null, accion: null };
  const [code, v] = plazos[0], f = masDias(v.plazo!, 1);
  return { fecha: f < hoy ? masDias(hoy, 1) : f, plazoMax: v.plazo!, accion: INDICADOR[code] ? `${INDICADOR[code].num} ${INDICADOR[code].name}` : code };
}
/** Aviso (no bloquea) cuando la visita queda antes del plazo más lejano del plan de mejora. */
export function avisoFechaSeguimiento(ev: Evaluacion, fechaISO: string): string {
  const s = fechaSugeridaSeguimiento(ev);
  return s.plazoMax && fechaISO && fechaISO <= s.plazoMax ? `La visita queda antes de que venza la acción ${s.accion} (plazo ${fechaLarga(s.plazoMax)}). Puede continuar si así se acordó con el productor.` : '';
}

/** Constancia de cumplimiento (código consecutivo CER-AAAA-NNNNN, verificación y vigencia de 1 año). */
export function emitirConstancia(flujo: Flujo, ev: Evaluacion): Constancia {
  if (ev.constancia) return ev.constancia;
  const hoy = new Date(), anio = hoy.getFullYear(), n = flujo.datos.evals.filter((e) => e.constancia && e.constancia.codigo.startsWith(`CER-${anio}-`)).length + 1;
  const vence = new Date(hoy); vence.setMonth(vence.getMonth() + 12); vence.setDate(vence.getDate() - 1);
  const al = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', v = Array.from({ length: 8 }, () => al[Math.floor(Math.random() * al.length)]).join('');
  const r = flujo.resultado(ev);
  return { codigo: `CER-${anio}-${String(n).padStart(5, '0')}`, verificacion: `${v.slice(0, 4)}-${v.slice(4)}`, emitida: hoy.toISOString(), vence: vence.toISOString().slice(0, 10),
    puntaje: Math.round(r.total * 10) / 10, nivel: r.nivel[0] };
}

/** Cambios de cada indicador frente a la visita anterior. */
export function cambiosFrenteAnterior(ev: Evaluacion, f: Finca) {
  const ant = ev['anterior'] as { id: string; total: number; scores: Record<string, number | null> } | undefined;
  if (!ant) return null;
  const ctx = contexto(ev, f), out = { mejoro: [] as [Indicador, number, number][], empeoro: [] as [Indicador, number, number][], completado: [] as [Indicador, number][], igual: 0, pendiente: [] as Indicador[], anterior: ant };
  indicadoresDe(ev.sp).forEach((i) => {
    if (aplica(i, ctx)) return;
    const c = calcular(i, ev.resp[i.code], ctx), antes = ant.scores[i.code], ahora = c.done ? c.score : null;
    if (ahora == null) { out.pendiente.push(i); return; }
    if (antes == null) out.completado.push([i, ahora]);
    else if (ahora > antes + 1e-9) out.mejoro.push([i, antes, ahora]);
    else if (ahora < antes - 1e-9) out.empeoro.push([i, antes, ahora]);
    else out.igual++;
  });
  return out;
}

/** Texto «78,5 Alto» para avisos y bitácora. */
export const puntajeTexto = (flujo: Flujo, ev: Evaluacion) => { const r = flujo.resultado(ev); return `${fmt(r.total)} ${r.nivel[0]}`; };
