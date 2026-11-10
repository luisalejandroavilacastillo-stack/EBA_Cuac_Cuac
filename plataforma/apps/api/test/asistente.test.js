import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

/** Pruebas del asistente con un Gemini simulado (no gasta cuota ni necesita internet). */
let recibido = null, rutas = [], fallas = 0, respuesta = { estado: 200, cuerpo: { candidates: [{ content: { parts: [{ text: 'Según el numeral 6.1.2 · pág. 18, …' }] }, finishReason: 'STOP' }] } };
const gemini = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    recibido = { url: req.url, clave: req.headers['x-goog-api-key'], cuerpo: JSON.parse(b) }; rutas.push(req.url);
    if (fallas > 0) { fallas--; res.writeHead(503, { 'Content-Type': 'application/json' }); return res.end('{"error":{"message":"overloaded"}}'); }
    res.writeHead(respuesta.estado, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(respuesta.cuerpo));
  });
});
await new Promise((r) => gemini.listen(0, '127.0.0.1', r));
Object.assign(process.env, { DB_PUERTO: '1', GEMINI_API_KEY: 'clave-de-prueba', GEMINI_MODELO: 'gemini-prueba', GEMINI_MODELO_RESPALDO: 'gemini-respaldo', GEMINI_URL: `http://127.0.0.1:${gemini.address().port}/v1beta`, ASISTENTE_CONSULTAS_MINUTO: '7' });
const { crearApp } = await import('../src/app.js');
const { cerrarBaseDeDatos } = await import('../src/bd/conexion.js');

let servidor, base;
before(async () => {
  servidor = crearApp({ registrar: false }).listen(0, '127.0.0.1');
  await new Promise((r) => servidor.once('listening', r));
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});
after(async () => { servidor.close(); gemini.close(); await cerrarBaseDeDatos(); });

const preguntar = (cuerpo) => fetch(`${base}/asistente`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
const ok = { sistema: 'Eres el asistente de la norma ICA.', mensajes: [{ role: 'user', content: '¿Cuántas aves se evalúan por punto?' }] };

describe('Asistente con Gemini', () => {
  it('informa que está disponible sin revelar la clave', async () => {
    const j = await (await fetch(`${base}/asistente/estado`)).json();
    assert.deepEqual(j, { disponible: true, proveedor: 'gemini', modelo: 'gemini-prueba' });
    assert.ok(!JSON.stringify(await (await fetch(`${base}/salud`)).json()).includes('clave-de-prueba'));
  });

  it('llama a Gemini con la clave en el encabezado y devuelve el texto', async () => {
    const j = await (await preguntar(ok)).json();
    assert.equal(j.texto, 'Según el numeral 6.1.2 · pág. 18, …');
    assert.equal(recibido.clave, 'clave-de-prueba');
    assert.equal(recibido.url, '/v1beta/models/gemini-prueba:generateContent');
    assert.equal(recibido.cuerpo.systemInstruction.parts[0].text, ok.sistema);
    assert.equal(recibido.cuerpo.contents[0].role, 'user');
  });

  it('quita correos, teléfonos y documentos antes de enviar', async () => {
    await preguntar({ sistema: 'Productor con CC 1.098.765.432, correo ana.rojas@correo.co, celular 310 555 1234 y documento 52111222.',
      mensajes: [{ role: 'user', content: 'Mi teléfono es +57 3001112233' }] });
    const enviado = JSON.stringify(recibido.cuerpo);
    for (const dato of ['1.098.765.432', 'ana.rojas@correo.co', '310 555 1234', '52111222', '3001112233']) assert.ok(!enviado.includes(dato), dato);
    assert.match(enviado, /\[correo\]/);
    assert.match(enviado, /\[teléfono\]/);
  });

  it('explica una clave inválida sin mostrar el error interno', async () => {
    respuesta = { estado: 400, cuerpo: { error: { message: 'API key not valid. Please pass a valid API key.' } } };
    const r = await preguntar(ok);
    assert.equal(r.status, 502);
    assert.match((await r.json()).error, /GEMINI_API_KEY/);
    respuesta = { estado: 200, cuerpo: { candidates: [{ content: { parts: [{ text: 'ok' }] } }] } };
  });

  it('si Gemini está saturado (503), reintenta y luego usa el modelo de respaldo', async () => {
    fallas = 2; rutas = [];
    const j = await (await preguntar(ok)).json();
    assert.equal(j.modelo, 'gemini-respaldo');
    assert.deepEqual(rutas.map((u) => u.split('/')[3]), ['gemini-prueba:generateContent', 'gemini-prueba:generateContent', 'gemini-respaldo:generateContent']);
    fallas = 3;
    const r = await preguntar(ok);
    assert.equal(r.status, 503);
    assert.match((await r.json()).error, /saturado/);
  });

  it('rechaza datos inválidos y limita las consultas por minuto', async () => {
    assert.equal((await preguntar({ sistema: 'x', mensajes: [] })).status, 400);
    let ultimo;
    for (let i = 0; i < 4; i++) ultimo = await preguntar(ok);   // 3 antes + 4 = más de 7
    assert.equal(ultimo.status, 429);
  });
});
