/**
 * Captura en campo (traducción de js/vistas/recorrido.js, recorrido_ganso.js e indicador.js del prototipo v0.25):
 * textos cortos de los niveles, recorrido de gansos (lo marcado ganso por ganso se convierte en los conteos de los
 * indicadores), ubicación de cada unidad de muestreo y lo que falta para cerrar la visita.
 */
import { aplica, calcular, contexto, galponDePunto, indicadoresDe, ubicarAve, alertasGalpon, type Contexto } from './calculo.js';
import type { Evaluacion, Finca, Indicador } from './modelo.js';

/** Textos cortos de cada nivel (resumen de la tabla de la norma) para los botones de campo. */
export const CORTO: Record<string, Record<number, string>> = {
  PA03: { 100: 'Ausente', 55: 'Leve', 0: 'Severo' },
  PA04: { 100: 'Ausente', 55: 'Leve, sin dolor', 0: 'Severo, con dolor' },
  PA05: { 100: 'Sin daño', 55: 'Daño sin dolor', 0: 'Daño con dolor' },
  PA06: { 100: 'Sin lesión o ≤ 2 rasguños', 55: 'Lesión 0,5–2 cm o ≥ 3 rasguños', 0: 'Lesión ≥ 2 cm o prolapso' },
  PA07: { 100: 'Homogéneo', 55: 'Quebrado o sin brillo', 0: 'Pérdida del manto' },
  PA08: { 100: 'Sin descarga', 55: 'Descarga nasal u ocular', 0: 'Ambas o lesión' },
  PA09: { 100: 'Sin lesión', 55: 'Lesión sin dolor', 0: 'Lesión con dolor' },
  PR02: { 100: 'Suelta o granulosa', 55: 'Ligeramente compacta', 0: 'Muy compacta o con líquido' },
  PR05: { 100: 'Con agua', 55: 'Agua insuficiente o goteo', 0: 'Sin agua' },
  PR07: { 100: 'Altura adecuada, íntegro y limpio', 55: 'Deteriorado, sucio o al sol', 0: 'Altura insuficiente' },
  PR10: { 100: 'Íntegro y con cama', 55: 'Funcional, no ideal', 0: 'No hay o en mal estado' },
};
/** Indicadores del animal que se califican ave por ave en el recorrido de patos. */
export const IND_AVE = ['PA03', 'PA04', 'PA05', 'PA06', 'PA07', 'PA08', 'PA09', 'PA11'];
export const CC_TXT: Record<number, string> = { 1: 'Delgado', 2: 'Adecuada', 3: 'Ideal', 4: 'Musculoso', 5: 'Sobrepeso' };
/** Máximo de recursos por punto (cama, bebederos y nidal más cercanos). */
export const MAX_POR_PUNTO: Record<string, number> = { PR02: 1, PR05: 4, PR10: 1 };
/** Conteo por galpón para jadeo y amontonamiento (6.2.1 y 6.2.2). */
export const GALPON_PCT = ['PA01', 'PA02'];

/* ---------------- recorrido de gansos ---------------- */
export type ValorNov = 'no' | 'si' | 'f' | 's';
/** Novedades que se marcan en cada ganso. ops: [valor, texto, nivel para el color]; «no» es lo normal. */
export const NOV_GANSO: { code: string; txt: string; ops?: [ValorNov, string, number][] }[] = [
  { code: 'GA01', txt: 'Herida grave (más de 5 cm)' },
  { code: 'GA02', txt: 'Plumaje', ops: [['no', 'Adecuado', 100], ['si', 'Inadecuado', 0]] },
  { code: 'GA03', txt: 'Podo dermatitis' },
  { code: 'GA04', txt: 'Diarrea' },
  { code: 'GA05', txt: 'Lesión en el pico', ops: [['no', 'Sin lesión', 100], ['f', 'Conserva la función', 55], ['s', 'Sin funcionalidad completa', 0]] },
  { code: 'GA07', txt: 'Secreción ocular o conjuntivitis' },
  { code: 'GA06', txt: 'Cojera (sin dudas sobre su condición)' },
];
export const OPS_NOV: [ValorNov, string, number][] = [['no', 'No tiene', 100], ['si', 'Sí tiene', 0]];
/** Indicadores que se llenan desde el recorrido de gansos. */
export const DESDE_RECORRIDO_G = ['GR02', 'GR03', 'GR04', 'GR05', 'GA01', 'GA02', 'GA03', 'GA04', 'GA05', 'GA06', 'GA07'];
/** Tratamiento: la tabla lo pide cuando hay gansos con la novedad. */
export const TRAT_GANSO: Record<string, string> = { GA01: 'heridas', GA03: 'podo dermatitis', GA04: 'diarrea', GA07: 'secreciones o conjuntivitis' };

export interface Ganso { m: Record<string, true | ValorNov>; n?: Record<string, true>; ok: boolean }
export interface PuntoGanso { agua: boolean | null; com: boolean | null; beb: boolean | null }
export interface RecorridoGanso { aves: Record<string, Ganso[]>; pts: Record<string, PuntoGanso>; gal: Record<string, boolean | null>; trat: Record<string, boolean> }

/** Respuesta de un ganso a una novedad: «si»/«f»/«s» si la tiene, «no» si se respondió que no (o quedó revisado), null si falta. */
export const valorNov = (a: Ganso, code: string): ValorNov | null =>
  a.m[code] ? (a.m[code] === true ? 'si' : (a.m[code] as ValorNov)) : a.ok || (a.n && a.n[code]) ? 'no' : null;

/** Datos del recorrido de gansos de la visita (los crea si faltan). */
export function rgDe(ev: Evaluacion): RecorridoGanso {
  const rg = (ev['rg'] ??= { aves: {}, pts: {}, gal: {}, trat: {} }) as RecorridoGanso;
  (['aves', 'pts', 'gal', 'trat'] as const).forEach((k) => ((rg as unknown as Record<string, object>)[k] ??= {}));
  return rg;
}

/** Pasa lo registrado en el recorrido de gansos a los indicadores (evaluados / con novedad, por finca y por galpón). */
export function derivarGansos(ev: Evaluacion, f: Finca): void {
  if (!ev['rg']) return;
  const plan = contexto(ev, f).plan, rg = ev['rg'] as RecorridoGanso, dosG = plan.corrales === 2;
  const gDe = (p: number) => galponDePunto(plan, p);
  const aves: { g: number; m: Ganso['m'] }[] = [];
  Object.entries(rg.aves).forEach(([p, lst]) => (lst || []).forEach((a) => { if (a && a.ok) aves.push({ g: gDe(+p), m: a.m || {} }); }));
  const conteo = (fn: (m: Ganso['m']) => boolean) => { const t = [0, 0], c = [0, 0]; aves.forEach((a) => { t[a.g]++; if (fn(a.m)) c[a.g]++; }); return { t, c }; };
  const pon = (code: string, t: number[], c: number[], extra?: boolean) => {
    const r = (ev.resp[code] ??= {}), tot = t[0] + t[1];
    if (!tot) { if (r['rg']) { delete r['total']; delete r['part']; delete r['g']; } return; }   // no borra lo que se escribió a mano
    r['total'] = tot; r['part'] = c[0] + c[1]; r['rg'] = true;
    if (extra !== undefined) r['extra'] = extra;
    if (dosG) r['g'] = [0, 1].map((g) => (t[g] ? { total: t[g], part: c[g] } : null)); else delete r['g'];
  };
  NOV_GANSO.forEach((n) => {
    if (n.code === 'GA02') { const k = conteo((m) => !m['GA02']); pon('GA02', k.t, k.c); return; }   // la tabla cuenta los de plumaje adecuado
    const k = conteo((m) => !!m[n.code]);
    if (n.code === 'GA05') { pon('GA05', k.t, k.c, !aves.some((a) => a.m['GA05'] === 's')); return; }
    pon(n.code, k.t, k.c, TRAT_GANSO[n.code] ? !!rg.trat[n.code] : undefined);
  });
  const porPunto = (campo: keyof PuntoGanso, positivo: boolean, peso?: boolean) => {
    const t = [0, 0], c = [0, 0];
    Object.entries(rg.pts).forEach(([p, x]) => { if (!x || x[campo] == null) return; const g = gDe(+p), w = peso ? plan.reparto[+p] : 1; t[g] += w; if (x[campo] === positivo) c[g] += w; });
    return { t, c };
  };
  let k = porPunto('agua', true, true); pon('GR02', k.t, k.c);
  k = porPunto('com', true); pon('GR03', k.t, k.c);
  k = porPunto('beb', true); pon('GR04', k.t, k.c);
  const tg = [0, 0], cg = [0, 0];
  Object.entries(rg.gal).forEach(([g, v]) => { if (v == null) return; tg[+g]++; if (v) cg[+g]++; });
  pon('GR05', tg, cg);
}

/* ---------------- navegación y cierre ---------------- */
/** Siguiente indicador pendiente después de «desde» (da la vuelta a la lista); null si no queda ninguno. */
export function siguientePendiente(ev: Evaluacion, f: Finca, desde?: string): string | null {
  const ctx = contexto(ev, f), todos = indicadoresDe(ev.sp);
  const pend = todos.filter((i) => !aplica(i, ctx) && !calcular(i, ev.resp[i.code], ctx).done);
  if (!pend.length) return null;
  if (!desde) return pend[0].code;
  const k = todos.findIndex((i) => i.code === desde);
  const despues = pend.find((i) => todos.indexOf(i) > k && i.code !== desde);
  return (despues ?? pend.find((i) => i.code !== desde))?.code ?? null;
}

/** Ubicación legible de una unidad de muestreo: «Galpón 1 · Punto 3 · Ave 2». */
export function lugarUnidad(ind: Indicador, ctx: Contexto, i: number): string {
  const plan = ctx.plan, gal = (pt: number) => (plan.corrales === 2 ? `Galpón ${galponDePunto(plan, pt) + 1} · Punto ${(pt % plan.puntosCorral) + 1}` : `Punto ${pt + 1}`);
  if (ind.m.src === 'aves') { const u = ubicarAve(plan, i); return `${gal(u.punto)} · Ave ${u.ave + 1}`; }
  if (ind.m.src === 'bebederos') return ctx.tramo === 'traspatio' ? `Bebedero ${i + 1} del predio` : `${gal(Math.floor(i / 2))} · Bebedero ${(i % 2) + 1}`;
  if (ind.m.src === 'comederos') return ctx.tramo === 'traspatio' ? `Comedero ${i + 1} del predio` : gal(i);
  return gal(i);
}

/** Lo que falta para finalizar la visita: [texto, paso al que lleva (indicador, «apertura») o null]. */
export function faltantesCierre(ev: Evaluacion, f: Finca): [string, string | null][] {
  const ctx = contexto(ev, f), falt: [string, string | null][] = [];
  indicadoresDe(ev.sp).forEach((i) => {
    if (aplica(i, ctx)) return;
    const c = calcular(i, ev.resp[i.code], ctx);
    if (!c.done) falt.push([`${i.num} ${i.name}: falta calificar`, i.code]);
    else if (c.score === 0 && i.g === 'MBA' && !(ev.obs[i.code] || '').trim()) falt.push([`${i.num} ${i.name}: falta la observación del hallazgo`, i.code]);
  });
  alertasGalpon(ev, f).forEach((a) => { if (!(ev.obs[a.ind.code] || '').trim()) falt.push([`Alerta galpón ${a.galpon + 1} · ${a.ind.num} ${a.ind.name}: falta la observación`, a.ind.code]); });
  if (!ev.apertura?.atiende) falt.push(['Apertura: falta la persona que atiende', 'apertura']);
  const firmas = (ev['firmas'] ?? {}) as { productor?: string; inspector?: string };
  if (!firmas.productor || !firmas.inspector) falt.push(['Faltan las firmas del cierre', null]);
  return falt;
}

