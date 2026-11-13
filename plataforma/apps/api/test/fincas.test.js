import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pruebas del registro de fincas contra una MariaDB real (la de docker compose: npm run db:up).
 * Usa una base temporal «eba_prueba_N» que se borra al final. Si no hay MariaDB, las pruebas se omiten.
 */
const { default: mariadb } = await import('mariadb');
const bd = {
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PUERTO || 3306),
  user: 'root', password: process.env.DB_CLAVE_ROOT || 'cambie_esta_clave_root',
};
const nombreBd = `eba_prueba_${process.pid}`;
let disponible = false;
try {
  const c = await mariadb.createConnection({ ...bd, connectTimeout: 1500 });
  await c.query(`CREATE DATABASE ${nombreBd} CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish2_ci`);
  await c.end();
  disponible = true;
} catch { /* sin MariaDB: se omiten */ }

Object.assign(process.env, { DB_HOST: bd.host, DB_PUERTO: String(bd.port), DB_USUARIO: bd.user, DB_CLAVE: bd.password, DB_NOMBRE: nombreBd });
const { crearApp } = await import('../src/app.js');
const { cerrarBaseDeDatos } = await import('../src/bd/conexion.js');
const { aplicarMigraciones } = await import('../src/bd/migraciones.js');

let servidor, base;
before(async () => {
  if (!disponible) return;
  await aplicarMigraciones({ registrar: () => {} });
  servidor = crearApp({ registrar: false }).listen(0, '127.0.0.1');
  await new Promise((r) => servidor.once('listening', r));
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});
after(async () => {
  if (!disponible) return;
  servidor.close(); await cerrarBaseDeDatos();
  const c = await mariadb.createConnection(bd); await c.query(`DROP DATABASE ${nombreBd}`); await c.end();
});

const persona = { nombre: 'Ana María Rojas', tipoDocumento: 'CC', numeroDocumento: '1098765432', correo: 'ana.rojas@correo.co', telefono: '3105551234', autorizaDatos: true };
const registro = { nombre: 'Granja El Lago', departamento: '68', municipio: 'Lebrija', vereda: 'La Puente',
  especies: [{ especie: 'pato', numeroAves: 320 }, { especie: 'ganso', numeroAves: 45 }], persona };
const post = (cuerpo) => fetch(`${base}/fincas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });

describe('Registro de fincas con MariaDB', { skip: !disponible && 'MariaDB no disponible' }, () => {
  it('las migraciones crean los catálogos', async () => {
    const j = await (await fetch(`${base}/catalogos`)).json();
    assert.equal(j.departamentos.length, 33);
    assert.deepEqual(j.especies.map((e) => e.codigo), ['pato', 'ganso']);
  });

  it('registra una finca mixta con tramo por especie y código FIN-AAAA-00001', async () => {
    const r = await post(registro);
    assert.equal(r.status, 201);
    const f = await r.json();
    assert.match(f.codigo, /^FIN-\d{4}-00001$/);
    assert.deepEqual(f.especies.map((e) => [e.especie, e.numeroAves, e.tramo]), [['pato', 320, 'comercial'], ['ganso', 45, 'traspatio']]);
    assert.equal(f.totalAves, 365);
    assert.equal(f.departamento.nombre, 'Santander');
    assert.equal(f.responsable.numeroDocumento, '••••••5432');
    assert.equal(f.responsable.telefono, '••• ••• 1234');
  });

  it('no repite el nombre en el mismo municipio (409)', async () => {
    assert.equal((await post(registro)).status, 409);
  });

  it('valida en el servidor con las mismas reglas del formulario (400)', async () => {
    const r = await post({ ...registro, nombre: 'Otra', especies: [{ especie: 'pato', numeroAves: 250 }], persona: { ...persona, correo: '' } });
    assert.equal(r.status, 400);
    assert.ok((await r.json()).detalles.campos['persona.correo']);
  });

  it('la misma persona puede tener otra finca; el consecutivo sigue', async () => {
    const r = await post({ ...registro, nombre: 'Granja El Lago 2', especies: [{ especie: 'ganso', numeroAves: 12 }], persona: { ...persona, correo: '' } });
    assert.equal(r.status, 201);
    assert.match((await r.json()).codigo, /-00002$/);
  });

  it('lista, busca y muestra la ficha', async () => {
    const l = await (await fetch(`${base}/fincas?q=lago`)).json();
    assert.equal(l.total, 2);
    const f = await (await fetch(`${base}/fincas/${l.fincas[1].codigo}`)).json();
    assert.equal(f.nombre, 'Granja El Lago');
    assert.match(f.especies[0].muestra, /50 aves/);
    assert.equal((await fetch(`${base}/fincas/FIN-2000-99999`)).status, 404);
  });

  it('deja registro en la bitácora sin datos personales', async () => {
    const c = await mariadb.createConnection({ ...bd, database: nombreBd });
    const filas = await c.query('SELECT accion FROM bitacora');
    await c.end();
    assert.equal(filas.length, 2);
    assert.ok(filas.every((f) => !f.accion.includes('1098765432') && !f.accion.includes('@')));
  });
});

describe('Sincronización del prototipo con MariaDB', { skip: !disponible && 'MariaDB no disponible' }, () => {
  const finca = { id: 'FIN-2026-00500', nombre: 'Granja Sincronizada', productor: 'Luis Gómez Ruiz', depto: 'Tolima', mpio: 'Ibagué', vereda: '', estado: 'ACTIVA', area: 0,
    titular: { nombre: 'Luis Gómez Ruiz', tipoDoc: 'CC', doc: '79111222', correo: '', tel: '3001234567', autoriza: true },
    especies: [{ sp: 'ganso', proposito: 'Carne y plumas', sistema: 'Semi-intensivo', conCorral: true, inventario: [{ cat: 'Engorde', n: 220, edad: 14, peso: 4.2 }, { cat: 'Reproductores', n: 40, edad: 60, peso: 5 }] }] };
  const put = (col, id, cuerpo) => fetch(`${base}/sincronizacion/${col}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-EBA-Rol': 'coordinador', 'X-EBA-Clave': 'coordinador', 'X-EBA-Usuario': encodeURIComponent('Camilo Andrés Peña') }, body: JSON.stringify(cuerpo) });

  it('el productor no puede registrar fincas (403)', async () => {
    const r = await fetch(`${base}/sincronizacion/fincas/FIN-2026-00777`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-EBA-Rol': 'productor' },
      body: JSON.stringify({ version: null, datos: { ...finca, id: 'FIN-2026-00777' } }) });
    assert.equal(r.status, 403);
    const r2 = await fetch(`${base}/fincas`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-EBA-Rol': 'productor' }, body: JSON.stringify(registro) });
    assert.equal(r2.status, 403);
  });

  it('crea una finca del prototipo y llena las tablas relacionales', async () => {
    const r = await put('fincas', finca.id, { version: null, datos: finca });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).version, 1);
    const f = await (await fetch(`${base}/fincas/${finca.id}`)).json();
    assert.equal(f.especies[0].numeroAves, 260);
    assert.equal(f.especies[0].tramo, 'comercial');
  });

  it('una versión vieja no sobrescribe: 409 con la versión actual', async () => {
    assert.equal((await put('fincas', finca.id, { version: 1, datos: { ...finca, nombre: 'Cambio 1' } })).status, 200);
    const r = await put('fincas', finca.id, { version: 1, datos: { ...finca, nombre: 'Cambio viejo' } });
    assert.equal(r.status, 409);
    const j = await r.json();
    assert.equal(j.detalles.actual.version, 2);
    assert.equal(j.detalles.actual.datos.nombre, 'Cambio 1');
  });

  it('guarda una evaluación completa y la devuelve igual', async () => {
    const ev = { id: 'EVA-2026-00900', finca: finca.id, sp: 'ganso', fecha: '2026-11-07', estado: 'En proceso', inspector: 'inspector', proceso: 'PRC-2026-0900', visita: 0,
      resp: { GA01: { total: 15, part: 2 } }, rg: { aves: { 0: [{ m: ['GA01'], ok: false }] } }, obs: {}, firmas: {} };
    assert.equal((await put('evals', ev.id, { version: null, datos: ev })).status, 200);
    const d = await (await fetch(`${base}/sincronizacion`, { headers: { 'X-EBA-Rol': 'admin' } })).json();
    assert.deepEqual(d.colecciones.evals.find((e) => e.id === ev.id).datos, ev);
    assert.equal(d.vacio, false);
  });

  it('no elimina una finca con evaluaciones', async () => {
    const r = await fetch(`${base}/sincronizacion/fincas/${finca.id}?version=2`, { method: 'DELETE', headers: { 'X-EBA-Rol': 'coordinador' } });
    assert.equal(r.status, 409);
  });

  it('permisos v0.25: solo el coordinador o el administrador eliminan fincas', async () => {
    const r = await fetch(`${base}/sincronizacion/fincas/${finca.id}?version=2`, { method: 'DELETE', headers: { 'X-EBA-Rol': 'inspector' } });
    assert.equal(r.status, 403);
  });

  it('permisos v0.25: usuarios con perfil; solo el administrador los crea', async () => {
    const u = { nombre: 'Julián Andrés Mora', perfil: 'inspector', tipoDoc: 'CC', doc: '1020304050', correo: 'j.mora@ica.gov.co', tel: '3201234567', estado: 'Activo' };
    const conRol = (rol) => fetch(`${base}/sincronizacion/usuarios/u_prueba`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-EBA-Rol': rol, 'X-EBA-Clave': rol }, body: JSON.stringify({ version: null, datos: u }) });
    assert.equal((await conRol('coordinador')).status, 403);
    assert.equal((await conRol('admin')).status, 200);
    const c = await mariadb.createConnection({ ...bd, database: nombreBd });
    const [fila] = await c.query("SELECT nombre, perfil, documento FROM usuario WHERE clave = 'u_prueba'"); await c.end();
    assert.deepEqual({ ...fila }, { nombre: 'Julián Andrés Mora', perfil: 'inspector', documento: '1020304050' });
  });

  it('la bitácora no repite entradas', async () => {
    const e = { h: 'abc123', t: '2026-11-07T10:00:00.000Z', u: 'Camilo Andrés Peña', a: 'Prueba de bitácora' };
    const post = (h = { 'X-EBA-Rol': 'inspector' }) => fetch(`${base}/sincronizacion/bitacora`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify({ entradas: [e] }) });
    assert.equal((await post({})).status, 401);
    assert.equal((await (await post()).json()).insertadas, 1);
    assert.equal((await (await post()).json()).insertadas, 0);
  });

  it('sin sesión no se cambia nada', async () => {
    const r = await fetch(`${base}/sincronizacion/fincas/FIN-2026-00778`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: null, datos: { ...finca, id: 'FIN-2026-00778' } }) });
    assert.equal(r.status, 403);
  });

  it('cada perfil recibe solo lo suyo (sin correo ni documento de otros, sin bitácora)', async () => {
    const { recortar } = await import('../src/modulos/sincronizacion/recorte.js');
    const reg = (id, datos) => ({ id, version: 1, datos });
    const cols = {
      usuarios: [reg('u1', { nombre: 'Ana', perfil: 'productor', estado: 'Activo', correo: 'a@x.co', doc: '123' })],
      fincas: [reg('F1', { productor: 'Ana' }), reg('F2', { productor: 'Otro' })],
      evals: [reg('E1', { finca: 'F1', proceso: 'P1', estado: 'En proceso', inspector: 'i1', resp: { PR01: {} }, obs: { PR01: 'x' } }),
        reg('E2', { finca: 'F2', proceso: 'P2', estado: 'Finalizada', inspector: 'i2', resp: {}, obs: {} })],
      procesos: [reg('P1', {}), reg('P2', {})], avisos: [reg('A1', { para: 'productor' }), reg('A2', { para: 'coordinador' })],
    };
    const bit = [{ a: 'x' }];
    assert.equal(recortar(cols, bit, { rol: 'admin' }).bitacora.length, 1);
    const prod = recortar(cols, bit, { rol: 'productor', clave: 'u1', nombre: 'Ana' });
    assert.deepEqual(prod.bitacora, []);
    assert.deepEqual(prod.colecciones.fincas.map((r) => r.id), ['F1']);
    assert.deepEqual(prod.colecciones.evals[0].datos.resp, {});
    assert.equal(prod.colecciones.usuarios[0].datos.correo, 'a@x.co');   // su propio registro, completo
    assert.deepEqual(Object.keys(recortar(cols, bit, { rol: 'coordinador', clave: 'c1' }).colecciones.usuarios[0].datos).sort(), ['estado', 'nombre', 'perfil']);
    assert.deepEqual(prod.colecciones.avisos.map((r) => r.id), ['A1']);
    const ins = recortar(cols, bit, { rol: 'inspector', clave: 'i2', nombre: 'I' });
    assert.deepEqual(ins.colecciones.fincas.map((r) => r.id), ['F2']);
    assert.equal(recortar(cols, bit, { rol: 'coordinador' }).colecciones.fincas.length, 2);
  });
});

