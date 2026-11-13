import { describe, expect, it } from 'vitest';
import { COLOR_ESTADO, ESTADOS_ESPECIE, ESTADOS_PRODUCTOR, esAbierta, estadoParaProductor, nombreEstadoVisita, puede, puedeHacer } from './perfiles.js';

describe('Perfiles y permisos (v0.25)', () => {
  it('el productor no ve Reportes ni Usuarios; el administrador ve todo', () => {
    expect(puede('productor', 'reportes')).toBe(false);
    expect(puede('productor', 'usuarios')).toBe(false);
    expect(puede('admin', 'usuarios')).toBe(true);
    expect(puede(null, 'inicio')).toBe(false);
  });
  it('solo el coordinador aprueba o devuelve; el administrador asigna pero no aprueba', () => {
    expect(puedeHacer('coordinador', 'aprobar')).toBe(true);
    expect(puedeHacer('admin', 'aprobar')).toBe(false);
    expect(puedeHacer('admin', 'asignar')).toBe(true);
    expect(puedeHacer('inspector', 'registrarFinca')).toBe(false);
    expect(puedeHacer('productor', 'registrarFinca')).toBe(false);
  });
  it('visitas abiertas y nombres visibles', () => {
    expect(esAbierta('Pendiente de aprobación')).toBe(true);
    expect(esAbierta('Finalizada')).toBe(false);
    expect(nombreEstadoVisita('Programada')).toBe('Asignada');
    expect(nombreEstadoVisita('Finalizada')).toBe('Aprobada');
  });
  it('vista del productor', () => {
    expect(estadoParaProductor('En proceso')).toBe('En evaluación');
    expect(estadoParaProductor('Pendiente de aprobación')).toBe('En revisión del ICA');
    expect(estadoParaProductor('Aprobada', { vigente: true })).toBe('Certificada');
    expect(estadoParaProductor('Aprobada', { vigente: false })).toBe('Constancia vencida');
    expect(estadoParaProductor('Aprobada', null)).toBe('Plan de mejora');
  });
  it('todos los estados tienen color', () => {
    for (const e of [...ESTADOS_ESPECIE, ...ESTADOS_PRODUCTOR]) expect(COLOR_ESTADO[e]).toMatch(/^e-/);
  });
});
