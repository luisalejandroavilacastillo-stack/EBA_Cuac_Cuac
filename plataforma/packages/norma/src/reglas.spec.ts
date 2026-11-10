import { describe, expect, it } from 'vitest';
import { clasificar, planMuestreo, puntajeTotal, redondear1, tramo } from './reglas.js';

describe('Tramo por especie (Tabla 3, opción B)', () => {
  it('199 aves es traspatio y 200 comercial', () => {
    expect(tramo(199)).toBe('traspatio');
    expect(tramo(200)).toBe('comercial');
  });
});

describe('Plan de muestreo (5.6 y Tabla 3)', () => {
  it('comercial: 2 × 5 × 5 = 50 aves, 25 por galpón', () => {
    const p = planMuestreo(847, true);
    expect([p.corrales, p.puntos, p.aves]).toEqual([2, 10, 50]);
    expect(p.avesGalpon).toEqual([25, 25]);
  });
  it('traspatio: 1 × 3 × 5 = 15 aves', () => {
    expect(planMuestreo(120, true).aves).toBe(15);
  });
  it('con menos aves que la muestra se evalúan todas', () => {
    const p = planMuestreo(12, true);
    expect(p.aves).toBe(12);
    expect(p.reparto).toEqual([4, 4, 4]);
  });
  it('sin corral: de 1 a 3 puntos y de 2 a 5 aves por punto', () => {
    const p = planMuestreo(30, false, { puntos: 9, avesPunto: 1 });
    expect([p.puntos, p.avesPunto, p.aves]).toEqual([3, 2, 6]);
  });
});

describe('Resultado (Tablas 1 y 2)', () => {
  it('pesos comerciales 0,60 / 0,25 / 0,15', () => {
    expect(puntajeTotal({ MBA: 80, MBR: 90, MBG: 70 }, 'comercial')).toBe(81);
  });
  it('traspatio no tiene gestión', () => {
    expect(puntajeTotal({ MBA: 80, MBR: 90, MBG: 0 }, 'traspatio')).toBe(83);
  });
  it('niveles y el caso 89,95 → Excelente', () => {
    expect(clasificar(redondear1(89.95))).toBe('Excelente');
    expect(clasificar(75)).toBe('Alto');
    expect(clasificar(50)).toBe('Medio');
    expect(clasificar(49.9)).toBe('Bajo');
  });
});
