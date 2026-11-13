import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';

/**
 * Pruebas del ingreso real (módulo 1) contra una MariaDB real, con un buzón SMTP de prueba dentro de la prueba.
 * Usa una base temporal «eba_ingreso_N» que se borra al final. Si no hay MariaDB, las pruebas se omiten.
 */
const { default: mariadb } = await import('mariadb');
const bd = {
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PUERTO || 3306),
  user: 'root', password: process.env.DB_CLAVE_ROOT || 'cambie_esta_clave_root',
};
const nombreBd = `eba_ingreso_${process.pid}`;
let disponible = false;
try {
  const c = await mariadb.createConnection({ ...bd, connectTimeout: 1500 });
  await c.query(`CREATE DATABASE ${nombreBd} CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish2_ci`);
  await c.end();
  disponible = true;
} catch { /* sin MariaDB: se omiten */ }

/* Buzón SMTP mínimo: guarda cada correo recibido. */
const buzon = [];
const smtp = net.createServer((s) => {
  let datos = false, cuerpo = '', para = '';
  s.write('220 prueba\r\n');
  s.on('data', (b) => {
    for (const linea of b.toString().split('\r\n')) {
      if (datos) {
        if (linea === '.') { datos = false; buzon.push({ para, texto: decodificar(cuerpo) }); cuerpo = ''; s.write('250 ok\r\n'); }
        else cuerpo += linea + '\n';
        continue;
      }
      if (!linea) continue;
      const cmd = linea.slice(0, 4).toUpperCase();
      if (cmd === 'EHLO' || cmd === 'HELO') s.write('250 prueba\r\n');
      else if (cmd === 'RCPT') { para = linea.match(/<([^>]+)>/)?.[1] ?? ''; s.write('250 ok\r\n'); }
      else if (cmd === 'DATA') { datos = true; s.write('354 siga\r\n'); }
      else if (cmd === 'QUIT') { s.write('221 adios\r\n'); s.end(); }
      else s.write('250 ok\r\n');
    }
  });
});
const decodificar = (t) => t.replace(/=\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
await new Promise((r) => smtp.listen(0, '127.0.0.1', r));

Object.assign(process.env, {
  DB_HOST: bd.host, DB_PUERTO: String(bd.port), DB_USUARIO: bd.user, DB_CLAVE: bd.password, DB_NOMBRE: nombreBd,
  CORREO_HOST: '127.0.0.1', CORREO_PUERTO: String(smtp.address().port), ADMIN_CORREO: 'jefe@ica.gov.co', ADMIN_NOMBRE: 'Jefe de Prueba',
  DATOS_EJEMPLO: 'no', INGRESO_DEMOSTRACION: 'no', PUBLICO_URL: 'http://localhost:4200',
});
const { crearApp } = await import('../src/app.js');
const { cerrarBaseDeDatos, consultar } = await import('../src/bd/conexion.js');
const { aplicarMigraciones } = await import('../src/bd/migraciones.js');
const { asegurarPrimerAdministrador } = await import('../src/modulos/auth/primer_admin.js');
const { _limpiarLimites } = await import('../src/modulos/auth/auth.rutas.js');

let servidor, base;
before(async () => {
  if (!disponible) return;
  await aplicarMigraciones({ registrar: () => {} });
  servidor = crearApp({ registrar: false }).listen(0);
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});
after(async () => {
  smtp.close();
  if (!disponible) return;
  servidor?.close();
  await cerrarBaseDeDatos();
  const c = await mariadb.createConnection(bd);
  await c.query(`DROP DATABASE IF EXISTS ${nombreBd}`);
  await c.end();
});

/** Cliente con cookie propia (como un navegador). */
function navegador() {
  let cookie = '';
  return async (metodo, ruta, cuerpo) => {
    const r = await fetch(base + ruta, {
      method: metodo, headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0].endsWith('=') ? '' : sc.split(';')[0];
    return { estado: r.status, cuerpo: r.status === 204 ? null : await r.json() };
  };
}
const ultimo = (para) => [...buzon].reverse().find((m) => m.para === para)?.texto ?? '';
const enlace = (para) => ultimo(para).match(/\/plataforma\/(?:activar|restablecer)\/([A-Za-z0-9_-]+)/)?.[1];
const codigo = (para) => ultimo(para).match(/es (\d{6})\./)?.[1];

async function ingresar(nav, correo, clave) {
  const r1 = await nav('POST', '/auth/ingresar', { correo, clave });
  assert.equal(r1.estado, 200, JSON.stringify(r1.cuerpo));
  const r2 = await nav('POST', '/auth/verificar', { desafio: r1.cuerpo.desafio, codigo: codigo(correo) });
  assert.equal(r2.estado, 200, JSON.stringify(r2.cuerpo));
  return r2.cuerpo.usuario;
}

describe('Ingreso real y usuarios (módulo 1)', { skip: !disponible && 'MariaDB no disponible' }, () => {
  const admin = navegador();
  let claveInspector;

  it('sin sesión (producción) no entrega datos', async () => {
    const r = await navegador()('GET', '/sincronizacion');
    assert.equal(r.estado, 401);
    assert.equal((await navegador()('GET', '/usuarios')).estado, 401);
  });

  it('crea el primer administrador y le envía el enlace de activación', async () => {
    assert.equal(await asegurarPrimerAdministrador(() => {}), 'enviado');
    assert.ok(enlace('jefe@ica.gov.co'), 'llega el enlace');
    assert.equal(await asegurarPrimerAdministrador(() => {}), 'pendiente', 'no reenvía si el enlace sigue vigente');
  });

  it('sin activar la cuenta no se puede ingresar', async () => {
    const r = await navegador()('POST', '/auth/ingresar', { correo: 'jefe@ica.gov.co', clave: 'Cualquiera123' });
    assert.equal(r.estado, 401);
  });

  it('activa la cuenta con el enlace y aplica las reglas de contraseña', async () => {
    const t = enlace('jefe@ica.gov.co'), nav = navegador();
    const info = await nav('GET', `/auth/enlace/${t}`);
    assert.equal(info.cuerpo.tipo, 'activacion');
    assert.equal(info.cuerpo.nombre, 'Jefe de Prueba');
    assert.equal((await nav('POST', `/auth/enlace/${t}`, { clave: 'corta1' })).estado, 400);
    assert.equal((await nav('POST', `/auth/enlace/${t}`, { clave: 'solamenteletras' })).estado, 400);
    assert.equal((await nav('POST', `/auth/enlace/${t}`, { clave: 'Patos2026seguro' })).estado, 200);
    assert.equal((await nav('POST', `/auth/enlace/${t}`, { clave: 'Patos2026seguro' })).estado, 400, 'el enlace es de un solo uso');
  });

  it('ingresa con contraseña y código de 6 dígitos', async () => {
    const u = await ingresar(admin, 'jefe@ica.gov.co', 'Patos2026seguro');
    assert.equal(u.perfil, 'admin');
    assert.equal(u.activacion, 'Activa');
    const s = await admin('GET', '/auth/sesion');
    assert.equal(s.estado, 200);
    assert.equal(s.cuerpo.usuario.nombre, 'Jefe de Prueba');
    assert.ok(!('clave_hash' in s.cuerpo.usuario), 'nunca devuelve la contraseña');
  });

  it('el código incorrecto no abre la sesión', async () => {
    const nav = navegador();
    const r1 = await nav('POST', '/auth/ingresar', { correo: 'jefe@ica.gov.co', clave: 'Patos2026seguro' });
    const r2 = await nav('POST', '/auth/verificar', { desafio: r1.cuerpo.desafio, codigo: '000000' === codigo('jefe@ica.gov.co') ? '111111' : '000000' });
    assert.equal(r2.estado, 400);
    assert.equal((await nav('GET', '/auth/sesion')).estado, 401);
  });

  it('el administrador crea un inspector sin contraseña: recibe el enlace', async () => {
    const r = await admin('POST', '/usuarios', { nombre: 'Laura Gómez Ruiz', tipoDocumento: 'CC', documento: '1.020.304.050', correo: 'L.Gomez@ica.gov.co', perfil: 'inspector' });
    assert.equal(r.estado, 201, JSON.stringify(r.cuerpo));
    assert.equal(r.cuerpo.usuario.activacion, 'Pendiente de activación');
    assert.equal(r.cuerpo.usuario.documento, '1020304050');
    assert.equal(r.cuerpo.enlace, 'enviado');
    assert.ok(enlace('l.gomez@ica.gov.co'));
    claveInspector = r.cuerpo.usuario.clave;
    const rep = await admin('POST', '/usuarios', { nombre: 'Otra Persona', tipoDocumento: 'CC', documento: '1020304050', correo: 'otra@ica.gov.co', perfil: 'productor' });
    assert.equal(rep.estado, 409);
    assert.match(rep.cuerpo.detalles.campos.documento, /Laura/);
  });

  it('el prototipo ve la cuenta nueva con su estado de activación', async () => {
    const r = await admin('GET', '/sincronizacion');
    const u = r.cuerpo.colecciones.usuarios.find((x) => x.id === claveInspector);
    assert.equal(u.datos.activacion, 'Pendiente de activación');
    assert.equal(u.datos.perfil, 'inspector');
  });

  it('reenviar enlace anula el anterior', async () => {
    const viejo = enlace('l.gomez@ica.gov.co');
    assert.equal((await admin('POST', `/usuarios/${claveInspector}/enlace`)).estado, 200);
    const nuevo = enlace('l.gomez@ica.gov.co');
    assert.notEqual(viejo, nuevo);
    assert.equal((await navegador()('GET', `/auth/enlace/${viejo}`)).estado, 400);
    assert.equal((await navegador()('POST', `/auth/enlace/${nuevo}`, { clave: 'Gansos2026campo' })).estado, 200);
  });

  it('otro perfil no gestiona usuarios', async () => {
    _limpiarLimites();
    const insp = navegador();
    await ingresar(insp, 'l.gomez@ica.gov.co', 'Gansos2026campo');
    assert.equal((await insp('GET', '/usuarios')).estado, 403);
    assert.equal((await insp('GET', '/sincronizacion')).estado, 200, 'con sesión sí lee los datos');
    // Los encabezados del ingreso de demostración no sirven sin INGRESO_DEMOSTRACION
    const r = await fetch(`${base}/usuarios`, { headers: { 'X-EBA-Rol': 'admin', 'X-EBA-Clave': 'admin' } });
    assert.equal(r.status, 401);
  });

  it('5 contraseñas erradas bloquean la cuenta 15 minutos', async () => {
    _limpiarLimites();
    const nav = navegador();
    for (let i = 1; i <= 4; i++) {
      const r = await nav('POST', '/auth/ingresar', { correo: 'l.gomez@ica.gov.co', clave: 'Equivocada99' });
      assert.equal(r.estado, 401);
      assert.match(r.cuerpo.error, new RegExp(`Intentos restantes: ${5 - i}`));
    }
    assert.equal((await nav('POST', '/auth/ingresar', { correo: 'l.gomez@ica.gov.co', clave: 'Equivocada99' })).estado, 423);
    assert.equal((await nav('POST', '/auth/ingresar', { correo: 'l.gomez@ica.gov.co', clave: 'Gansos2026campo' })).estado, 423, 'bloqueada aunque la clave sea correcta');
    const lista = await admin('GET', '/usuarios');
    assert.equal(lista.cuerpo.usuarios.find((u) => u.clave === claveInspector).bloqueada, true);
  });

  it('recuperar contraseña: misma respuesta exista o no el correo; el enlace desbloquea', async () => {
    _limpiarLimites();
    const nav = navegador();
    const a = await nav('POST', '/auth/recuperar', { correo: 'l.gomez@ica.gov.co' });
    const b = await nav('POST', '/auth/recuperar', { correo: 'nadie@ica.gov.co' });
    assert.deepEqual(a.cuerpo, b.cuerpo);
    const t = enlace('l.gomez@ica.gov.co');
    assert.equal((await nav('GET', `/auth/enlace/${t}`)).cuerpo.tipo, 'recuperacion');
    assert.equal((await nav('POST', `/auth/enlace/${t}`, { clave: 'Nueva2026clave' })).estado, 200);
    await ingresar(nav, 'l.gomez@ica.gov.co', 'Nueva2026clave');
  });

  it('inactivar cierra las sesiones; el administrador no se inactiva a sí mismo', async () => {
    _limpiarLimites();
    const insp = navegador();
    await ingresar(insp, 'l.gomez@ica.gov.co', 'Nueva2026clave');
    assert.equal((await admin('POST', `/usuarios/${claveInspector}/estado`, { estado: 'Inactivo' })).estado, 200);
    assert.equal((await insp('GET', '/auth/sesion')).estado, 401);
    const yo = (await admin('GET', '/auth/sesion')).cuerpo.usuario.clave;
    assert.equal((await admin('POST', `/usuarios/${yo}/estado`, { estado: 'Inactivo' })).estado, 400);
    assert.equal((await admin('PATCH', `/usuarios/${yo}`, { perfil: 'coordinador' })).estado, 400);
  });

  it('elimina solo usuarios sin historial', async () => {
    assert.equal((await admin('DELETE', `/usuarios/${claveInspector}`)).estado, 409, 'ya ingresó');
    const r = await admin('POST', '/usuarios', { nombre: 'Sin Historial Uno', tipoDocumento: 'CC', documento: '55667788', correo: 'sin@correo.co', perfil: 'productor' });
    assert.equal((await admin('DELETE', `/usuarios/${r.cuerpo.usuario.clave}`)).estado, 204);
  });

  it('cambiar la contraseña con sesión', async () => {
    _limpiarLimites();
    assert.equal((await admin('POST', '/auth/cambiar-clave', { actual: 'mala', nueva: 'Otra2026segura' })).estado, 400);
    assert.equal((await admin('POST', '/auth/cambiar-clave', { actual: 'Patos2026seguro', nueva: 'Otra2026segura' })).estado, 200);
  });

  it('cerrar sesión', async () => {
    assert.equal((await admin('POST', '/auth/salir')).estado, 200);
    assert.equal((await admin('GET', '/auth/sesion')).estado, 401);
    const [{ n }] = await consultar("SELECT COUNT(*) AS n FROM bitacora WHERE accion LIKE 'Inicio de sesión%'");
    assert.ok(Number(n) >= 3, 'los ingresos quedan en la bitácora');
  });
});
