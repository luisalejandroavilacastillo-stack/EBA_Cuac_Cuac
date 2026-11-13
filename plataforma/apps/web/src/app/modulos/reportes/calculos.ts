/**
 * Cálculos de los reportes (js/vistas/reportes.js del prototipo v0.25): filtro de visitas, cumplimiento por indicador
 * y comparación entre visitas. Todo sale de las evaluaciones guardadas.
 */
import type { Especie, Evaluacion, Flujo, Indicador, Medida, Resultado } from '@eba/norma';
import { fmt } from '@eba/norma';

export interface FiltroReporte { sp: '' | Especie; finca: string; estado: string; visita: '' | 'inicial' | 'seg'; desde: string; hasta: string }
export const filtroVacio = (): FiltroReporte => ({ sp: '', finca: '', estado: '', visita: '', desde: '', hasta: '' });

/** Evaluaciones que entran en el reporte según los filtros (las anuladas nunca cuentan). */
export function datosReporte(flujo: Flujo, evals: Evaluacion[], flt: FiltroReporte): Evaluacion[] {
  const vis = flujo.fincasVisibles().map((f) => f.id);
  return evals.filter((e) => e.estado !== 'Anulada' && vis.includes(e.finca) && flujo.enHistorial(e) && (!flt.sp || e.sp === flt.sp) && (!flt.finca || e.finca === flt.finca)
      && (!flt.estado || e.estado === flt.estado) && (!flt.visita || (flt.visita === 'inicial' ? !e.visita : !!e.visita))
      && (!flt.desde || e.fecha >= flt.desde) && (!flt.hasta || e.fecha <= flt.hasta))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.visita || 0) - (a.visita || 0));
}

export interface CriterioReporte { ind: Indicador; n: number; suma: number; ceros: number; prom: number }
/** Cumplimiento de cada indicador en las evaluaciones finalizadas: promedio, número de evaluaciones y calificaciones en 0. */
export function criteriosReporte(flujo: Flujo, finalizadas: Evaluacion[]) {
  const m: Record<string, Omit<CriterioReporte, 'prom'>> = {};
  finalizadas.forEach((e) => flujo.resultado(e).filas.forEach(({ ind, score }) => {
    const x = (m[ind.code] ??= { ind, n: 0, suma: 0, ceros: 0 }); x.n++; x.suma += score; if (score === 0) x.ceros++;
  }));
  const v: CriterioReporte[] = Object.values(m).map((x) => ({ ...x, prom: x.suma / x.n }));
  const porNum = (a: CriterioReporte, b: CriterioReporte) => a.ind.num.localeCompare(b.ind.num, 'es', { numeric: true });
  return {
    mejores: v.filter((x) => x.prom >= 90).sort((a, b) => b.prom - a.prom || b.n - a.n || porNum(a, b)).slice(0, 5),
    atencion: v.filter((x) => x.prom < 90).sort((a, b) => a.prom - b.prom || b.ceros - a.ceros || porNum(a, b)).slice(0, 5),
  };
}

export type Cambio = [Indicador, number, number];
/** Visitas finalizadas de una finca y especie, en orden; y cambios entre las dos últimas. */
export function compararVisitas(flujo: Flujo, evals: Evaluacion[], fid: string, sp: Especie) {
  const v = evals.filter((e) => e.finca === fid && e.sp === sp && e.estado === 'Finalizada').sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.visita || 0) - (b.visita || 0));
  if (v.length < 2) return { visitas: v, cambios: null, a: null, b: null };
  const [a, b] = v.slice(-2), ra = flujo.resultado(a), rb = flujo.resultado(b);
  const sa = Object.fromEntries(ra.filas.map((x) => [x.ind.code, x.score])), cambios = { mejoro: [] as Cambio[], empeoro: [] as Cambio[], igual: 0 };
  rb.filas.forEach(({ ind, score }) => { const antes = sa[ind.code]; if (antes == null) return;
    if (score > antes + 1e-9) cambios.mejoro.push([ind, antes, score]); else if (score < antes - 1e-9) cambios.empeoro.push([ind, antes, score]); else cambios.igual++; });
  cambios.mejoro.sort((x, y) => (y[2] - y[1]) - (x[2] - x[1])); cambios.empeoro.sort((x, y) => (x[2] - x[1]) - (y[2] - y[1]));
  return { visitas: v, cambios, a, b };
}

/** Promedio de cada medida (MBR, MBA, MBG) o «—» si el tramo no la evalúa. */
export const medidas = (r: Resultado) => (['MBR', 'MBA', 'MBG'] as Medida[]).map((g) => (r.pesos[g] > 0 ? fmt(r.med[g]) : '—'));

/** CSV del reporte, sin datos personales (separado por «;», con BOM para Excel). */
export function csvReporte(flujo: Flujo, evs: Evaluacion[]): string {
  const rows: (string | number)[][] = [['evaluacion', 'fecha', 'finca_id', 'especie', 'tramo', 'proceso', 'visita', 'estado', 'avance_pct', 'recursos', 'animal', 'gestion', 'total', 'nivel']];
  evs.forEach((e) => { const r = flujo.resultado(e), pr = e.estado === 'Programada';
    rows.push([e.id, e.fecha, e.finca, e.sp, r.ctx.tramo, e.proceso, flujo.nombreVisita(e), e.estado, flujo.avance(e).pct, pr ? '' : fmt(r.med.MBR), pr ? '' : fmt(r.med.MBA), pr ? '' : fmt(r.med.MBG), pr ? '' : fmt(r.total), pr ? '' : r.nivel[0]]); });
  return '﻿' + rows.map((x) => x.join(';')).join('\n');
}
