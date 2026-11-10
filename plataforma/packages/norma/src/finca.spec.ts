import { describe, expect, it } from 'vitest';
import { validarRegistroFinca } from './finca.js';

const persona = { nombre: 'Ana María Rojas', tipoDocumento: 'CC' as const, numeroDocumento: '1.098.765.432', correo: '', telefono: '310 555 1234', autorizaDatos: true };
const base = { nombre: 'Granja El Lago', departamento: '68', municipio: 'Lebrija', especies: [{ especie: 'pato' as const, numeroAves: 120 }], persona };

describe('Registro de finca (CU-04)', () => {
  it('traspatio: el correo es opcional', () => {
    expect(validarRegistroFinca(base)).toEqual({});
  });
  it('comercial: el correo es obligatorio', () => {
    const e = validarRegistroFinca({ ...base, especies: [{ especie: 'pato', numeroAves: 250 }] });
    expect(e['persona.correo']).toBeDefined();
  });
  it('mixta: si una especie es comercial, pide correo', () => {
    const e = validarRegistroFinca({ ...base, especies: [{ especie: 'pato', numeroAves: 50 }, { especie: 'ganso', numeroAves: 200 }] });
    expect(e['persona.correo']).toBeDefined();
  });
  it('sin especies, especie repetida o sin aves', () => {
    expect(validarRegistroFinca({ ...base, especies: [] })['especies']).toBeDefined();
    expect(validarRegistroFinca({ ...base, especies: [{ especie: 'pato', numeroAves: 1 }, { especie: 'pato', numeroAves: 2 }] })['especies']).toBeDefined();
    expect(validarRegistroFinca({ ...base, especies: [{ especie: 'ganso', numeroAves: 0 }] })['especies.ganso']).toBeDefined();
  });
  it('persona: nombre, documento, teléfono y Ley 1581', () => {
    const e = validarRegistroFinca({ ...base, persona: { ...persona, nombre: 'Ana', numeroDocumento: '12', telefono: '123', autorizaDatos: false } });
    expect(Object.keys(e).sort()).toEqual(['persona.autorizaDatos', 'persona.nombre', 'persona.numeroDocumento', 'persona.telefono']);
  });
});
