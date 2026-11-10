import { Router } from 'express';
import {
  AVES_POR_PUNTO, CRITERIO_CUMPLE, MAX_SEGUIMIENTOS, NIVELES, PESOS, SEGUIMIENTOS_BASE, UMBRAL_COMERCIAL,
  clasificar, planMuestreo, puntajeTotal, tramo,
} from '@eba/norma';
import { reglas, validar } from '../utilidades/validar.js';

/**
 * Reglas de la Metodología ICA v1.0 (2024). Usan el paquete compartido @eba/norma,
 * el mismo que usa Angular: el cálculo nunca da dos resultados distintos.
 */
export const rutasNorma = Router();

/** GET /api/norma/reglas · pesos (Tabla 1), niveles (Tabla 2), umbral y seguimiento. */
rutasNorma.get('/reglas', (req, res) => {
  res.json({
    umbralComercial: UMBRAL_COMERCIAL,
    avesPorPunto: AVES_POR_PUNTO,
    pesos: PESOS,
    niveles: NIVELES,
    seguimiento: { base: SEGUIMIENTOS_BASE, maximo: MAX_SEGUIMIENTOS, cumple: CRITERIO_CUMPLE },
  });
});

/** POST /api/norma/plan-muestreo · { aves, conCorral, puntos?, avesPunto? } */
rutasNorma.post('/plan-muestreo', (req, res) => {
  const d = validar(req.body, {
    aves: [reglas.requerido, reglas.entero(0, 1_000_000)],
    conCorral: [reglas.requerido, reglas.booleano],
    puntos: [reglas.entero(1, 3)],
    avesPunto: [reglas.entero(2, 5)],
  });
  res.json({ tramo: tramo(d.aves), ...planMuestreo(d.aves, d.conCorral, { puntos: d.puntos, avesPunto: d.avesPunto }) });
});

/** POST /api/norma/resultado · { aves, medidas: { MBA, MBR, MBG } } → tramo, puntaje y nivel. */
rutasNorma.post('/resultado', (req, res) => {
  validar(req.body, { aves: [reglas.requerido, reglas.entero(0, 1_000_000)], medidas: [reglas.requerido] });
  const medidas = validar(req.body.medidas, {
    MBA: [reglas.requerido, reglas.numero(0, 100)],
    MBR: [reglas.requerido, reglas.numero(0, 100)],
    MBG: [reglas.numero(0, 100)],
  });
  const t = tramo(req.body.aves);
  const puntaje = puntajeTotal({ MBA: medidas.MBA, MBR: medidas.MBR, MBG: medidas.MBG ?? 0 }, t);
  res.json({ tramo: t, pesos: PESOS[t], puntaje, nivel: clasificar(puntaje) });
});
