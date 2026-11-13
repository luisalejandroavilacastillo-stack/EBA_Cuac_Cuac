import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { problemasProduccion } from '../src/config/config.js';

/** Módulo 7: la API no arranca en producción con una configuración insegura. */
describe('Configuración de producción', () => {
  const base = { entorno: 'produccion', ingresoDemostracion: false, datosEjemplo: false, publicoUrl: 'https://eba.ica.gov.co', sesion: { cookieSegura: true } };
  it('una configuración correcta no tiene problemas', () => assert.deepEqual(problemasProduccion(base), []));
  it('en desarrollo no se revisa', () => assert.deepEqual(problemasProduccion({ ...base, entorno: 'desarrollo', ingresoDemostracion: true }), []));
  it('rechaza el ingreso de demostración, los datos de ejemplo, la cookie sin https y localhost', () => {
    const p = problemasProduccion({ ...base, ingresoDemostracion: true, datosEjemplo: true, publicoUrl: 'https://localhost', sesion: { cookieSegura: false } });
    assert.equal(p.length, 4);
  });
});
