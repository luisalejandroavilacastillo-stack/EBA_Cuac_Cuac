/**
 * Reglas generales de la Metodología ICA v1.0 (2024), migradas del prototipo (src/js/norma/calculo.js).
 * Este archivo es la única fuente de estas reglas: el backend las usa para el resultado oficial
 * y el frontend para mostrar el avance mientras el inspector registra.
 */
import type { Medida, Nivel, PlanMuestreo, Tramo } from './tipos.js';

/** Tabla 3: desde 200 aves de la especie el tramo es comercial. */
export const UMBRAL_COMERCIAL = 200;
/** Decisión del equipo (5.6): siempre 5 aves por punto. */
export const AVES_POR_PUNTO = 5;

/** Tabla 1: pesos de cada medida por tramo. */
export const PESOS: Record<Tramo, Record<Medida, number>> = {
  comercial: { MBA: 0.6, MBR: 0.25, MBG: 0.15 },
  traspatio: { MBA: 0.7, MBR: 0.3, MBG: 0 },
};

/** Tabla 2: niveles de bienestar (puntaje mínimo de cada nivel). */
export const NIVELES: ReadonlyArray<{ nivel: Nivel; minimo: number }> = [
  { nivel: 'Excelente', minimo: 90 },
  { nivel: 'Alto', minimo: 75 },
  { nivel: 'Medio', minimo: 50 },
  { nivel: 'Bajo', minimo: 0 },
];

/** Seguimiento (decisión del equipo): 3 seguimientos, ampliables a 5 por el coordinador. */
export const SEGUIMIENTOS_BASE = 3;
export const MAX_SEGUIMIENTOS = 5;
/** Cumple = puntaje ≥ 90, ningún indicador en 0 y nada pendiente (regla del proyecto, no del ICA). */
export const CRITERIO_CUMPLE = { puntajeMin: 90, sinCeros: true, sinPendientes: true } as const;

/** Tramo de una especie según sus aves (opción B: en fincas mixtas cada especie tiene su tramo). */
export const tramo = (aves: number): Tramo => (aves >= UMBRAL_COMERCIAL ? 'comercial' : 'traspatio');

/** Nivel de bienestar de un puntaje total (Tabla 2). */
export const clasificar = (puntaje: number): Nivel =>
  (NIVELES.find((n) => puntaje >= n.minimo) ?? NIVELES[NIVELES.length - 1]).nivel;

/** Redondeo a 1 decimal «al más cercano, 0,05 sube» (RN-121) sin el error de coma flotante. */
export const redondear1 = (x: number): number => Math.round(Math.round(x * 1e6) / 1e5) / 10;

/** Puntaje total: suma de cada medida por su peso en el tramo. */
export function puntajeTotal(medidas: Record<Medida, number>, t: Tramo): number {
  const p = PESOS[t];
  return redondear1(medidas.MBA * p.MBA + medidas.MBR * p.MBR + medidas.MBG * p.MBG);
}

/**
 * Plan de muestreo (5.6 y Tabla 3).
 * - Con corral, menos de 200 aves: 1 galpón × 3 puntos × 5 aves = 15 (mínimo de la Tabla 3: 5).
 * - Con corral, 200 o más: 2 galpones × 5 puntos × 5 aves = 50, 25 por galpón (mínimo: 10).
 * - Sin corral: de 1 a 3 puntos y de 2 a 5 aves por punto.
 * La muestra nunca supera las aves de la especie: si hay menos, se evalúan todas.
 */
export function planMuestreo(
  aves: number,
  conCorral: boolean,
  opc: { puntos?: number; avesPunto?: number } = {},
): PlanMuestreo {
  let base: Omit<PlanMuestreo, 'aves' | 'reparto' | 'avesGalpon'>;
  if (!conCorral) {
    const puntos = Math.min(3, Math.max(1, opc.puntos ?? 3));
    const avesPunto = Math.min(5, Math.max(2, opc.avesPunto ?? 3));
    base = { corrales: 0, puntosCorral: puntos, puntos, avesPunto, minimo: null,
      texto: `Sin corral (5.6): ${puntos} punto${puntos > 1 ? 's' : ''} con ${avesPunto} aves por punto` };
  } else if (aves < UMBRAL_COMERCIAL) {
    base = { corrales: 1, puntosCorral: 3, puntos: 3, avesPunto: AVES_POR_PUNTO, minimo: 5,
      texto: 'Menos de 200 aves de la especie (Tabla 3 y 5.6): 1 galpón o corral, 3 puntos y 5 aves por punto = 15 aves' };
  } else {
    base = { corrales: 2, puntosCorral: 5, puntos: 10, avesPunto: AVES_POR_PUNTO, minimo: 10,
      texto: '200 aves o más de la especie (Tabla 3 y 5.6): 2 galpones, 5 puntos por galpón y 5 aves por punto = 50 aves' };
  }
  let total = base.puntos * base.avesPunto;
  if (aves > 0 && total > aves) {
    total = aves;
    base.texto += `. La especie tiene ${aves} aves: se evalúan todas, repartidas entre los puntos`;
  }
  total = Math.max(1, total);
  const cada = Math.floor(total / base.puntos), resto = total % base.puntos;
  const reparto = Array.from({ length: base.puntos }, (_, i) => Math.min(base.avesPunto, cada + (i < resto ? 1 : 0)));
  const avesGalpon = base.corrales === 2
    ? [0, 1].map((g) => reparto.slice(g * base.puntosCorral, (g + 1) * base.puntosCorral).reduce((a, b) => a + b, 0))
    : [total];
  return { ...base, aves: total, reparto, avesGalpon };
}
