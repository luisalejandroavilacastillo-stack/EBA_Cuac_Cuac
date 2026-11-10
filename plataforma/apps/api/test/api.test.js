import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

// La prueba no necesita MariaDB: apunta a un puerto sin servidor para comprobar que la API lo informa sin caerse.
process.env.DB_PUERTO = '1';
process.env.WEB_ORIGEN = 'http://192.168.1.50:4200,http://localhost:4200';
const { crearApp } = await import('../src/app.js');
const { cerrarBaseDeDatos } = await import('../src/bd/conexion.js');

let servidor, base;
before(async () => {
  servidor = crearApp({ registrar: false }).listen(0, '127.0.0.1');
  await new Promise((r) => servidor.once('listening', r));
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});
after(async () => { servidor.close(); await cerrarBaseDeDatos(); });

const post = (ruta, cuerpo, cab = {}) =>
  fetch(base + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json', ...cab }, body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo) });

describe('Salud', () => {
  it('responde ok aunque la base de datos no esté disponible', async () => {
    const r = await fetch(`${base}/salud`);
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.estado, 'ok');
    assert.equal(j.baseDeDatos.estado, 'sin conexión');
    assert.equal(r.headers.get('x-powered-by'), null);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  });
});

describe('Norma', () => {
  it('plan de muestreo comercial: 50 aves', async () => {
    const j = await (await post('/norma/plan-muestreo', { aves: 320, conCorral: true })).json();
    assert.equal(j.tramo, 'comercial');
    assert.equal(j.aves, 50);
  });
  it('resultado: pesos del tramo y nivel', async () => {
    const j = await (await post('/norma/resultado', { aves: 120, medidas: { MBA: 80, MBR: 90 } })).json();
    assert.deepEqual([j.tramo, j.puntaje, j.nivel], ['traspatio', 83, 'Alto']);
  });
  it('datos inválidos: 400 con los campos', async () => {
    const r = await post('/norma/plan-muestreo', { aves: -3 });
    assert.equal(r.status, 400);
    const j = await r.json();
    assert.ok(j.detalles.campos.aves);
    assert.ok(j.detalles.campos.conCorral);
  });
  it('JSON mal formado: 400', async () => {
    assert.equal((await post('/norma/resultado', '{malo')).status, 400);
  });
});

describe('CORS', () => {
  it('permite el frontend configurado por IP', async () => {
    const r = await fetch(`${base}/salud`, { method: 'OPTIONS', headers: { Origin: 'http://192.168.1.50:4200', 'Access-Control-Request-Method': 'GET' } });
    assert.equal(r.status, 204);
    assert.equal(r.headers.get('access-control-allow-origin'), 'http://192.168.1.50:4200');
  });
  it('rechaza otros orígenes', async () => {
    const r = await fetch(`${base}/salud`, { method: 'OPTIONS', headers: { Origin: 'http://sitio-extraño.com' } });
    assert.equal(r.status, 403);
  });
});

describe('Rutas', () => {
  it('módulo en construcción: 501', async () => {
    const r = await fetch(`${base}/evaluaciones/EVA-2026-00001`);
    assert.equal(r.status, 501);
    assert.equal((await r.json()).casosDeUso, 'CU-08 a CU-16');
  });
  it('sin base de datos, fincas responde 503 con un mensaje claro', async () => {
    const r = await fetch(`${base}/fincas`);
    assert.equal(r.status, 503);
    assert.match((await r.json()).error, /base de datos/);
  });
  it('ruta inexistente: 404', async () => {
    assert.equal((await fetch(`${base}/no-existe`)).status, 404);
  });
});
