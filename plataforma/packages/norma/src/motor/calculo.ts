/**
 * Motor de cálculo de una visita: plan de muestreo, aplicabilidad, puntaje de cada indicador y resultado (5.4).
 * Traducción fiel de apps/prototipo/js/norma/calculo.js (v0.25). La prueba calculo.spec.ts compara este motor con el
 * del prototipo sobre las mismas visitas: si alguno cambia, la prueba avisa.
 */
import type { Especie, Medida, Nivel, Tramo } from '../tipos.js';
import { AVES_POR_PUNTO, PESOS, UMBRAL_COMERCIAL, clasificar, redondear1, tramo } from '../reglas.js';
import { INDICADORES } from './indicadores.js';
import type { EspecieFinca, Evaluacion, Finca, Indicador, Respuesta } from './modelo.js';

/* ---------------- formato ---------------- */
/** Número con coma decimal y sin «,0» final (igual que el prototipo): 89,5 · 90 · —. */
export const fmt = (v: number | null | undefined, d = 1): string =>
  v == null || isNaN(v) ? '—' : Number(v).toFixed(d).replace('.', ',').replace(/,0$/, '');
/** Color de cada nivel (variables CSS del diseño). */
export const COLOR_NIVEL: Record<Nivel, string> = { Excelente: 'var(--campo)', Alto: 'var(--siembra)', Medio: '#A8A600', Bajo: 'var(--rojo)' };
export const nivelDe = (p: number): [Nivel, string] => { const n = clasificar(p); return [n, COLOR_NIVEL[n]]; };

/* ---------------- población y tramo ---------------- */
export const poblacionEspecie = (e: EspecieFinca): number => e.inventario.reduce((a, c) => a + (+c.n || 0), 0);
export const poblacion = (f: Finca): number => f.especies.reduce((s, e) => s + poblacionEspecie(e), 0);
export const tramoEspecie = (e: EspecieFinca): Tramo => tramo(poblacionEspecie(e));
/** La finca es comercial si alguna de sus especies tiene 200 aves o más. */
export const tramoFinca = (f: Finca): Tramo => (f.especies.some((e) => tramoEspecie(e) === 'comercial') ? 'comercial' : 'traspatio');
/** «200 patos: comercial · 100 gansos: traspatio». */
export const tramosTexto = (f: Finca): string =>
  f.especies.map((e) => `${poblacionEspecie(e)} ${e.sp === 'pato' ? 'patos' : 'gansos'}: ${tramoEspecie(e)}`).join(' · ');

/* ---------------- plan de muestreo (5.6 y Tabla 3) ---------------- */
export interface PlanVisita {
  corrales: number; puntosCorral: number; puntos: number; avesPunto: number; minimo: number | null; texto: string;
  aves: number; reparto: number[]; avesGalpon: number[];
}
export function planMuestreoVisita(pob: number, conCorral: boolean, nEspecie?: number | null, opc: { puntos?: unknown; avesPunto?: unknown } = {}): PlanVisita {
  let p: Omit<PlanVisita, 'aves' | 'reparto' | 'avesGalpon'> & Partial<PlanVisita>;
  if (!conCorral) {
    const puntos = Math.min(3, Math.max(1, +(opc.puntos as number) || 3)), avesPunto = Math.min(5, Math.max(2, +(opc.avesPunto as number) || 3));
    p = { corrales: 0, puntosCorral: puntos, puntos, avesPunto, minimo: null,
      texto: `Sin corral (5.6): ${puntos} punto${puntos > 1 ? 's' : ''} donde estén las aves y sus recursos, con ${avesPunto} aves por punto (la norma permite de 1 a 3 puntos y de 2 a 5 aves por punto)` };
  } else if (pob < UMBRAL_COMERCIAL) {
    p = { corrales: 1, puntosCorral: 3, puntos: 3, avesPunto: AVES_POR_PUNTO, minimo: 5,
      texto: 'Menos de 200 aves de la especie (Tabla 3 y 5.6): 1 galpón o corral, 3 puntos y 5 aves por punto = 15 aves (mínimo de la Tabla 3: 5)' };
  } else {
    p = { corrales: 2, puntosCorral: 5, puntos: 10, avesPunto: AVES_POR_PUNTO, minimo: 10,
      texto: '200 aves o más de la especie (Tabla 3 y 5.6): 2 galpones o corrales, 5 puntos por galpón en los extremos y el centro (Ilustración 2) y 5 aves por punto = 50 aves, 25 por galpón (mínimo de la Tabla 3: 10)' };
  }
  let aves = p.puntos * p.avesPunto;
  if (nEspecie != null && nEspecie > 0 && aves > nEspecie) { aves = nEspecie; p.texto += `. La especie tiene ${nEspecie} aves: se evalúan todas, repartidas entre los puntos`; }
  aves = Math.max(1, aves);
  const base = Math.floor(aves / p.puntos), extra = aves % p.puntos;
  const reparto = Array.from({ length: p.puntos }, (_, i) => Math.min(p.avesPunto, base + (i < extra ? 1 : 0)));
  const avesGalpon = p.corrales === 2 ? [0, 1].map((g) => reparto.slice(g * p.puntosCorral, (g + 1) * p.puntosCorral).reduce((a, b) => a + b, 0)) : [aves];
  return { ...p, aves, reparto, avesGalpon } as PlanVisita;
}
export const galponDePunto = (plan: PlanVisita, pt: number) => (plan.corrales === 2 ? Math.floor(pt / plan.puntosCorral) : 0);
export function ubicarAve(plan: PlanVisita, i: number) {
  let acc = 0;
  for (let pt = 0; pt < plan.reparto.length; pt++) { if (i < acc + plan.reparto[pt]) return { punto: pt, ave: i - acc, galpon: galponDePunto(plan, pt) }; acc += plan.reparto[pt]; }
  return { punto: plan.reparto.length - 1, ave: 0, galpon: galponDePunto(plan, plan.reparto.length - 1) };
}
/** Índices de unidades de un punto (aves o recursos). */
export function unidadesDePunto(ind: Indicador, ctx: Contexto, pt: number): number[] {
  const src = ind.m.src, plan = ctx.plan;
  if (src === 'aves') { const ini = plan.reparto.slice(0, pt).reduce((a, b) => a + b, 0); return Array.from({ length: plan.reparto[pt] }, (_, k) => ini + k); }
  if (src === 'bebederos') return ctx.tramo === 'traspatio' ? [] : [pt * 2, pt * 2 + 1];
  if (src === 'comederos') return ctx.tramo === 'traspatio' ? [] : [galponDePunto(plan, pt)];
  return [pt];
}
export const galponDeUnidad = (ind: Indicador, ctx: Contexto, i: number): number => {
  const src = ind.m.src, plan = ctx.plan;
  if (src === 'aves') return ubicarAve(plan, i).galpon;
  if (src === 'bebederos') return ctx.tramo === 'traspatio' ? 0 : galponDePunto(plan, Math.floor(i / 2));
  if (src === 'comederos') return ctx.tramo === 'traspatio' ? 0 : i;
  return galponDePunto(plan, i);
};
export const PUNTO_FLEX = ['PR02', 'PR05', 'PR10'];
export const esFlexPunto = (ind: Indicador, ctx: Contexto) => PUNTO_FLEX.includes(ind.code) && !!ctx.plan && !(ind.m.src === 'bebederos' && ctx.tramo === 'traspatio');
export interface PuntoRecurso { v?: (number | null)[]; mismo?: number | null; nohay?: boolean }
export function porPuntoDe(ind: Indicador, r: Respuesta, ctx: Contexto): (PuntoRecurso | null)[] {
  if (Array.isArray(r['porPunto'])) return r['porPunto'];
  const u: (number | null)[] = r['units'] || [], n = ctx.plan.puntos;
  if (!u.length) return [];
  return Array.from({ length: n }, (_, pt) => {
    const v = (ind.m.src === 'bebederos' ? [u[pt * 2], u[pt * 2 + 1]] : [u[pt]]).filter((x) => x != null);
    return v.length ? { v, mismo: null, nohay: false } : null;
  });
}
export const puntoListo = (e: PuntoRecurso | null | undefined): e is PuntoRecurso =>
  !!e && (e.mismo != null || !!e.nohay || (Array.isArray(e.v) && e.v.length > 0 && e.v.every((x) => x != null)));

/* ---------------- reglas por porcentaje y automáticas ---------------- */
export const RULES: Record<string, (p: number, x?: boolean) => number> = {
  PR03: (p) => (p >= 80 ? 100 : p >= 40 ? 55 : 0),
  PA01: (p) => (p <= 40 ? 100 : p <= 60 ? 55 : 0),
  PA02: (p) => (p <= 40 ? 100 : p < 60 ? 55 : 0),
  PA10: (p) => (p < 12 ? 100 : p < 14 ? 55 : 0),
  GR02: (p) => (p >= 100 ? 100 : p >= 80 ? 55 : 0),
  GR03: (p) => (p >= 100 ? 100 : p >= 80 ? 55 : p >= 60 ? 20 : 0),
  GR05: (p) => (p <= 0 ? 100 : p < 20 ? 55 : p <= 40 ? 20 : 0),
  GA01: (p, x) => (p <= 0 ? 100 : p <= 15 && x ? 55 : p <= 20 || x ? 20 : 0),
  GA02: (p) => (p >= 100 ? 100 : p >= 60 ? 55 : 0),
  GA03: (p, x) => (p <= 0 ? 100 : x ? (p < 20 ? 55 : 20) : p < 20 ? 20 : 0),
  GA04: (p, x) => (p <= 0 ? 100 : x ? (p <= 10 ? 55 : 20) : p <= 10 ? 20 : 0),
  GA05: (p, x) => (p <= 0 ? 100 : p <= 6 ? (x ? 55 : 20) : p <= 8 ? 20 : x ? 20 : 0),
  GA06: (p) => (p < 3 ? 100 : p <= 6 ? 55 : p <= 8 ? 20 : 0),
  GA08: (p) => (p < 5 ? 100 : p <= 8 ? 55 : p <= 10 ? 20 : 0),
  GA10: (p) => (p >= 70 ? 100 : p >= 50 ? 55 : 0),
  GG05: (p, x) => (p > 80 ? 100 : x && p >= 50 ? 55 : x && p >= 20 ? 20 : 0),
  GG07: (p, x) => (p <= 3 ? (x ? 100 : 55) : p <= 5 ? 20 : 0),
};
type Aux = Record<string | number, any>;   // eslint-disable-line @typescript-eslint/no-explicit-any
function exceso(a: Aux): number | null {
  const aves = +a[0], rec = +a[1], dec = +a[2];
  if (!aves || !dec) return null;
  if (a[1] === '' || a[1] == null) return null;
  if (rec === 0) return 0;
  const ex = ((aves / rec - dec) / dec) * 100;
  return ex <= 30 ? (a[3] ? 55 : 100) : a[3] ? 0 : 55;
}
const AUTO: Record<string, (a: Aux, t: Tramo) => number | null> = {
  PR01: (a) => (!a[0] ? 0 : a[1] && a[2] && a[3] ? 100 : 55),
  PR04: (a) => exceso(a), PR08: (a) => exceso(a),
  PR06: (a, t) => (t === 'traspatio' ? (a[2] ? 100 : 0) : !a[0] || !a[1] || !a[2] ? 0 : a[3] ? 100 : 55),
  PR09: (a, t) => (!a[0] || !a[1] ? 0 : t === 'traspatio' || a[2] ? 100 : 55),
  PR12: (a) => { if (!a[0]) return 0; if (a[1] === undefined || a[1] === '') return null; if (+a[1] < 10) return 0; return a[2] && a[3] && !a[4] ? 100 : 55; },
  GR01: (a) => (!a[0] || !a[2] || !a[3] ? 0 : a[1] ? 100 : 55),
};
export const DENS: [number, number][] = [[1.5, 17], [2, 18], [2.5, 20], [3, 21], [3.5, 22], [4, 23], [4.5, 24]];
export function densidadMaxima(w: number) {
  if (w <= DENS[0][0]) return { max: DENS[0][1], desde: DENS[0], hasta: DENS[0] };
  const ult = DENS[DENS.length - 1];
  if (w >= ult[0]) return { max: ult[1], desde: ult, hasta: ult };
  for (let i = 0; i < DENS.length - 1; i++) {
    const [w0, d0] = DENS[i], [w1, d1] = DENS[i + 1];
    if (w >= w0 && w <= w1) return { max: d0 + ((w - w0) / (w1 - w0)) * (d1 - d0), desde: DENS[i], hasta: DENS[i + 1] };
  }
  return { max: ult[1], desde: ult, hasta: ult };
}
export const BPUMV = ['No usa sustancias prohibidas por el ICA', 'Usa promotores de crecimiento solo si el registro ICA lo autoriza',
  'Todos los medicamentos tienen registro ICA', 'No hay medicamentos vencidos', 'Almacena y aplica según el rotulado del producto',
  'Agujas y equipos en buen estado', 'Área de almacenamiento limpia',
  'Antimicrobianos y biológicos solo con prescripción de MV o MVZ con matrícula vigente', 'Lleva registro de tratamientos veterinarios'];
const BPUMV_N = BPUMV.length;
const BPUMV_MIN = [0, 2, 3, 7, 8];

/* ---------------- contexto de la visita ---------------- */
export interface Contexto { f: Finca; e: EspecieFinca; pob: number; pobFinca: number; nEsp: number; tramo: Tramo; plan: PlanVisita; ap: NonNullable<Evaluacion['apertura']> }

export function contexto(ev: Evaluacion, f: Finca): Contexto {
  const e = f.especies.find((x) => x.sp === ev.sp) ?? f.especies[0];
  const pobDe = (x: EspecieFinca) => (ev.pobEsp && ev.pobEsp[x.sp] != null ? +ev.pobEsp[x.sp]! : f.especies.length === 1 && ev.pobConfirmada != null ? ev.pobConfirmada : poblacionEspecie(x));
  const pobFinca = ev.pobEsp && Object.keys(ev.pobEsp).length ? f.especies.reduce((t, x) => t + pobDe(x), 0) : ev.pobConfirmada ?? poblacion(f);
  const nEsp = pobDe(e), pob = nEsp;
  const ap = ev.apertura || {};
  return { f, e, pob, pobFinca, nEsp, tramo: tramo(pob), plan: planMuestreoVisita(pob, e.conCorral !== false, nEsp, { puntos: ap.puntosSC, avesPunto: ap.avesPuntoSC }), ap };
}
/** Motivo por el que el indicador no aplica, o null si aplica. */
export function aplica(ind: Indicador, ctx: Contexto): string | null {
  if (!ind.trasp && ctx.tramo === 'traspatio') return 'No se evalúa en traspatio (menos de 200 aves).';
  const a = ind.app || {};
  if (a.proposito && !String(ctx.e.proposito).toLowerCase().includes(a.proposito)) return 'Solo aplica a producción de huevo.';
  if (a.permanencia && !ctx.e.permanencia) return 'Solo aplica si los patos permanecen todo el tiempo en corral o galpón.';
  if (a.cama && ctx.e.cama === false) return 'No se evalúa en corral nocturno con piso de cemento, madera o tierra.';
  if (a.sistema && !a.sistema.includes(ctx.e.sistema ?? '')) return 'Solo aplica a sistemas intensivos y semi-intensivos.';
  return null;
}
export function nUnidades(ind: Indicador, ctx: Contexto): number {
  const p = ctx.plan, src = ind.m.src, ap = ctx.ap || {};
  if (src === 'aves') return p.aves;
  if (src === 'bebederos') return ctx.tramo === 'traspatio' ? Math.max(1, +(ap.bebederos ?? 0) || 2) : p.puntos * 2;
  if (src === 'comederos') return ctx.tramo === 'traspatio' ? Math.max(1, +(ap.comederos ?? 0) || 2) : Math.max(1, p.corrales);
  return p.puntos;
}
const esHuevo = (prop: unknown) => { const s = String(prop).toLowerCase(); return s.includes('huevo') && !s.includes('carne'); };
export function ccNivel(s: number, prop: unknown): number {
  if (esHuevo(prop)) return s === 2 || s === 3 ? 100 : s === 4 ? 55 : 0;
  return s === 3 || s === 4 ? 100 : s === 2 ? 55 : 0;
}

export interface Calculo {
  score: number | null; done: boolean; det?: string; pend?: boolean;
  dist?: Record<number, number>; n?: number; hechas?: number; pct?: number | null;
  porGalpon?: (number | null)[] | null; pctGalpon?: (number | null)[] | null; dens?: number; max?: number;
}

/** Puntaje de un indicador con lo registrado. */
export function calcular(ind: Indicador, r: Respuesta | undefined, ctx: Contexto): Calculo {
  r = r || {};
  const m = ind.m;
  if (m.kind === 'auto') {
    if (!r['rev']) return { score: null, done: false, det: '' };
    const a: Aux = r['aux'] || {}, lv = AUTO[ind.code](a, ctx.tramo);
    if (lv == null) return { score: null, done: false, det: 'Complete los datos para calcular.' };
    let det = 'Calculado con las condiciones observadas';
    if (ind.code === 'PR04' || ind.code === 'PR08') {
      const rec = ind.code === 'PR04' ? 'bebedero' : 'comedero';
      if (+a[1] === 0) det = `No hay ${rec}s: 0 puntos`;
      else { const x = +a[0] / +a[1], ex = ((x - +a[2]) / +a[2]) * 100;
        det = `${fmt(+a[0], 0)} ÷ ${fmt(+a[1], 0)} = ${fmt(x)} aves por ${rec}; declarado ${fmt(+a[2])}; exceso = (${fmt(x)} − ${fmt(+a[2])}) ÷ ${fmt(+a[2])} × 100 = ${fmt(ex)} %${ex <= 30 ? ' (≤ 30 %)' : ' (> 30 %)'}${a[3] ? ' · con competencia' : ' · sin competencia'}`; }
    }
    if (ind.code === 'PR06' && ctx.tramo === 'traspatio') det = a[2] ? 'Traspatio: fuente y agua limpias y aptas (no se exige protocolo)' : 'Traspatio: el agua que se ofrece está sucia o no es apta';
    if (ind.code === 'PR12') det = a[0] ? `Profundidad ${fmt(+a[1])} cm${+a[1] >= 10 ? ' (≥ 10 cm)' : ' (menos de 10 cm: no permite nadar)'} · ${a[2] && a[3] ? 'con rampas de ingreso y salida' : 'falta alguna rampa'}${a[4] ? ' · con encharcamiento' : ' · sin encharcamiento'}` : 'No existe un lugar para nadar';
    return { score: lv, done: true, det };
  }
  if (m.kind === 'direct' || m.kind === 'radio') {
    const lv = m.kind === 'radio' ? (r['opt'] != null ? m.opts![r['opt']][1] : null) : r['level'];
    return { score: lv ?? null, done: lv != null, det: lv != null ? 'Nivel según la opción observada en la tabla' : '' };
  }
  if (m.kind === 'units' && esFlexPunto(ind, ctx)) {
    const pp = porPuntoDe(ind, r, ctx), n = ctx.plan.puntos, vals: number[] = [], porG: number[][] = [[], []];
    let listos = 0, compartidos = 0, sinRecurso = 0;
    for (let pt = 0; pt < n; pt++) {
      const e = pp[pt]; if (!puntoListo(e)) continue; listos++;
      if (e.mismo != null) { compartidos++; continue; }
      const vs = e.nohay ? [0] : (e.v as number[]); if (e.nohay) sinRecurso++;
      vs.forEach((v) => { vals.push(v); porG[galponDePunto(ctx.plan, pt)].push(v); });
    }
    const dist: Record<number, number> = {}; vals.forEach((v) => (dist[v] = (dist[v] || 0) + 1));
    const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const partes = Object.keys(dist).map(Number).sort((a, b) => b - a).map((k) => `${dist[k]} × ${k}`).join(' + ');
    const porGalpon = ctx.plan.corrales === 2 ? porG.map((a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)) : null;
    return { score, done: listos === n && vals.length > 0, dist, n, hechas: listos, porGalpon,
      det: vals.length ? `(${partes}) ÷ ${vals.length} = ${fmt(score)} · ${listos} de ${n} puntos${compartidos ? ` · ${compartidos} comparte${compartidos > 1 ? 'n' : ''} recurso con otro punto` : ''}${sinRecurso ? ` · ${sinRecurso} sin recurso (0)` : ''}` : '' };
  }
  if (m.kind === 'units' || m.kind === 'cc') {
    const n = nUnidades(ind, ctx), u: (number | null)[] = (r['units'] || []).slice(0, n);
    const vals = u.filter((x): x is number => x != null).map((x) => (m.kind === 'cc' ? ccNivel(x, ctx.e.proposito) : x));
    const dist: Record<number, number> = {}; vals.forEach((v) => (dist[v] = (dist[v] || 0) + 1));
    const suma = vals.reduce((a, b) => a + b, 0);
    const score = vals.length ? suma / vals.length : null;
    const partes = Object.keys(dist).map(Number).sort((a, b) => b - a).map((k) => `${dist[k]} × ${k}`).join(' + ');
    const det = vals.length ? `(${partes}) ÷ ${vals.length} ${m.unit}${vals.length > 1 ? 's' : ''} = ${fmt(score)}` : '';
    let porGalpon: (number | null)[] | null = null;
    if (ctx.plan && ctx.plan.corrales === 2) {
      const sum = [0, 0], cnt = [0, 0];
      u.forEach((x, i) => { if (x == null) return; const g = galponDeUnidad(ind, ctx, i), v = m.kind === 'cc' ? ccNivel(x, ctx.e.proposito) : x; sum[g] += v; cnt[g]++; });
      porGalpon = [0, 1].map((g) => (cnt[g] ? sum[g] / cnt[g] : null));
    }
    return { score, done: vals.length >= n, det, dist, n, hechas: vals.length, porGalpon };
  }
  if (m.kind === 'pct') {
    if (m.rule === 'PR03' && r['total'] !== '' && r['total'] != null && +r['total'] === 0) return { score: 0, done: true, pct: null, det: 'No hay bebederos: 0 puntos (Tabla 7)' };
    const t = +r['total'], p = +r['part'];
    if (!t || r['part'] === '' || r['part'] == null || p > t || p < 0) return { score: null, done: false, det: p > t ? 'La cantidad no puede ser mayor que el total.' : '' };
    const pct = (p / t) * 100, lv = RULES[m.rule!](pct, !!r['extra']);
    let porGalpon: (number | null)[] | null = null, pctGalpon: (number | null)[] | null = null;
    if (Array.isArray(r['g']) && ctx.plan && ctx.plan.corrales === 2) {
      pctGalpon = (r['g'] as { total?: number; part?: number }[]).map((x) => (x && +x.total! ? (+x.part! / +x.total!) * 100 : null));
      porGalpon = pctGalpon.map((q) => (q == null ? null : RULES[m.rule!](q, !!r!['extra'])));
    }
    return { score: lv, done: true, pct, porGalpon, pctGalpon, det: `${p} ÷ ${t} × 100 = ${fmt(pct)} %${pctGalpon ? ` (galpón 1: ${fmt(pctGalpon[0])} % · galpón 2: ${fmt(pctGalpon[1])} %)` : ''}` };
  }
  if (m.kind === 'density') {
    const a = +r['aves'], w = +r['peso'], s = +r['area'];
    if (!a || !w || !s) return { score: null, done: false, det: '' };
    const d = (a * w) / s, ref = densidadMaxima(w);
    const tramoTxt = ref.desde === ref.hasta ? `${fmt(ref.desde[0])} kg → ${ref.desde[1]} kg/m²` : `interpolado entre ${fmt(ref.desde[0])} kg (${ref.desde[1]}) y ${fmt(ref.hasta[0])} kg (${ref.hasta[1]})`;
    return { score: d <= ref.max + 1e-9 ? 100 : 0, done: true, dens: d, max: ref.max,
      det: `${a} aves × ${fmt(w, 2)} kg ÷ ${s} m² = ${fmt(d, 2)} kg/m² · máximo ${fmt(ref.max, 2)} kg/m² (${tramoTxt})` };
  }
  if (m.kind === 'bpumv') {
    const c: boolean[] = r['checks'] || [];
    if (!r['revisado']) return { score: null, done: false, det: '' };
    const todas = Array.from({ length: BPUMV_N }, (_, i) => i).every((i) => c[i]);
    const lv = todas ? 100 : m.mode === 'pato' && BPUMV_MIN.every((i) => c[i]) ? 55 : 0;
    return { score: lv, done: true, det: `${c.filter(Boolean).length} de ${BPUMV_N} prácticas se cumplen${!todas && m.mode === 'pato' ? (lv === 55 ? ' · cumple el mínimo de la Tabla 38' : ' · no cumple el mínimo de la Tabla 38') : ''}` };
  }
  if (m.kind === 'doc') {
    if (!r['estado']) return { score: null, done: false, det: '' };
    const req = ['legible', 'sinCorr', 'firmado', 'contenido'].concat(m.prof ? ['matricula'] : []);
    const ok = r['estado'] === 'Válido' && req.every((k) => r![k]);
    return { score: ok ? 100 : 0, done: true, pend: r['estado'] === 'Pendiente', det: r['estado'] === 'Pendiente' ? 'Pendiente: cuenta 0 hasta que se entregue (1 día hábil)' : ok ? 'Cumple todos los requisitos' : 'No cumple algún requisito' };
  }
  return { score: null, done: false };
}

/** Indicadores de una especie, en el orden de la norma. */
export const indicadoresDe = (sp: Especie): Indicador[] => INDICADORES.filter((i) => i.sp === sp);
export const INDICADOR: Readonly<Record<string, Indicador>> = Object.fromEntries(INDICADORES.map((i) => [i.code, i]));

const bandaNivel = (s: number) => (s >= 90 ? 3 : s >= 50 ? 2 : s >= 20 ? 1 : 0);
export const esAlertaGalpon = (s: number | null, finca: number | null) =>
  s != null && finca != null && (s < finca - 10 - 1e-9 || (bandaNivel(s) < bandaNivel(finca) && s < finca - 5 - 1e-9));
export interface AlertaGalpon { ind: Indicador; galpon: number; score: number; finca: number; pct: number | null }
/** Galpones que quedan claramente por debajo del puntaje de la finca (para que el promedio no esconda el problema). */
export function alertasGalpon(ev: Evaluacion, f: Finca): AlertaGalpon[] {
  const ctx = contexto(ev, f), out: AlertaGalpon[] = [];
  if (ctx.plan.corrales !== 2) return out;
  indicadoresDe(ev.sp).forEach((ind) => {
    if (aplica(ind, ctx)) return;
    const c = calcular(ind, ev.resp[ind.code], ctx);
    if (!c.done || c.score == null || !c.porGalpon) return;
    c.porGalpon.forEach((s, g) => { if (esAlertaGalpon(s, c.score)) out.push({ ind, galpon: g, score: s!, finca: c.score!, pct: c.pctGalpon ? c.pctGalpon[g] : null }); });
  });
  return out;
}

export interface Resultado {
  ctx: Contexto; pesos: Record<Medida, number>; med: Record<Medida, number | null>; aporte: Record<Medida, number>; total: number;
  filas: { ind: Indicador; score: number }[]; pend: number; aplican: Record<Medida, number>; n: Record<Medida, number>;
  provisional: boolean; completo: boolean; nivel: [Nivel, string];
}
/** Resultado (5.4): promedio de cada medida, total ponderado (Tabla 1) a 1 decimal y nivel (Tabla 2). */
export function resultado(ev: Evaluacion, f: Finca): Resultado {
  const ctx = contexto(ev, f), pesos = PESOS[ctx.tramo];
  const g: Record<Medida, number[]> = { MBR: [], MBA: [], MBG: [] }, filas: Resultado['filas'] = [], aplican: Record<Medida, number> = { MBR: 0, MBA: 0, MBG: 0 };
  let pend = 0, provisional = false;
  indicadoresDe(ev.sp).forEach((ind) => {
    if (aplica(ind, ctx)) return;
    aplican[ind.g]++;
    const c = calcular(ind, ev.resp[ind.code], ctx);
    if (c.pend) provisional = true;
    if (c.done && c.score != null) { g[ind.g].push(c.score); filas.push({ ind, score: c.score }); } else pend++;
  });
  const med = {} as Record<Medida, number | null>, aporte = {} as Record<Medida, number>;
  (Object.keys(g) as Medida[]).forEach((k) => (med[k] = g[k].length ? g[k].reduce((a, b) => a + b, 0) / g[k].length : null));
  let total = 0;
  (Object.keys(pesos) as Medida[]).forEach((k) => { aporte[k] = pesos[k] * (med[k] ?? 0); total += aporte[k]; });
  total = redondear1(total);
  return { ctx, pesos, med, aporte, total, filas, pend, aplican, n: { MBR: g.MBR.length, MBA: g.MBA.length, MBG: g.MBG.length }, provisional, completo: pend === 0, nivel: nivelDe(total) };
}
/** Avance de la visita: indicadores aplicables calificados. */
export function avance(ev: Evaluacion, f: Finca): { ap: number; hechos: number; pct: number } {
  const ctx = contexto(ev, f); let ap = 0, hechos = 0;
  indicadoresDe(ev.sp).forEach((ind) => { if (aplica(ind, ctx)) return; ap++; if (calcular(ind, ev.resp[ind.code], ctx).done) hechos++; });
  return { ap, hechos, pct: ap ? Math.round((hechos / ap) * 100) : 0 };
}
