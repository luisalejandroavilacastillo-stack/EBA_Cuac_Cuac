import nodemailer from 'nodemailer';
import { config } from '../../config/config.js';

/**
 * Envío de correos (códigos de verificación, invitaciones y recuperación de contraseña).
 * En su computador los correos llegan al buzón de prueba Mailpit: http://localhost:8025.
 * En el servidor se configura un correo real en el .env (CORREO_HOST, CORREO_PUERTO, CORREO_USUARIO, CORREO_CLAVE).
 */
let transporte;
function obtenerTransporte() {
  transporte ??= nodemailer.createTransport({
    host: config.correo.host,
    port: config.correo.puerto,
    secure: config.correo.seguro,
    auth: config.correo.usuario ? { user: config.correo.usuario, pass: config.correo.clave } : undefined,
    tls: { minVersion: 'TLSv1.2' },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });
  return transporte;
}

const VERDE = '#317330';
function plantilla(titulo, cuerpoHtml) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f6f7f2;font-family:Arial,Helvetica,sans-serif;color:#1f2a1f">
  <div style="max-width:560px;margin:24px auto;background:#fff;border:1px solid #e2e6dc;border-radius:12px;overflow:hidden">
    <div style="background:${VERDE};color:#fff;padding:16px 22px;font-weight:bold;font-size:18px">EBA Cuac Cuac · Bienestar animal en patos y gansos</div>
    <div style="padding:22px"><h2 style="margin:0 0 12px;font-size:20px">${titulo}</h2>${cuerpoHtml}
    <p style="color:#5b6b5b;font-size:12px;margin-top:24px">Si usted no solicitó este correo, ignórelo. Sus datos se tratan según la Ley 1581 de 2012.</p></div>
  </div></body></html>`;
}
const boton = (url, texto) => `<p style="margin:20px 0"><a href="${url}" style="background:${VERDE};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${texto}</a></p>
  <p style="font-size:12px;color:#5b6b5b">Si el botón no funciona, copie esta dirección en el navegador:<br>${url}</p>`;
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function enviar(para, asunto, html, texto) {
  await obtenerTransporte().sendMail({ from: config.correo.remitente, to: para, subject: asunto, html, text: texto });
}

export const correos = {
  codigo: (para, nombre, codigo) => enviar(para, `Su código de ingreso: ${codigo}`,
    plantilla('Código de verificación', `<p>Hola, ${esc(nombre)}. Su código para ingresar es:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:12px 0">${codigo}</p><p>Vence en 10 minutos.</p>`),
    `Hola, ${nombre}. Su código para ingresar a EBA Cuac Cuac es ${codigo}. Vence en 10 minutos.`),

  invitacion: (para, nombre, perfil, url) => enviar(para, 'Active su cuenta en EBA Cuac Cuac',
    plantilla('Bienvenido a EBA Cuac Cuac', `<p>Hola, ${esc(nombre)}. Se creó su cuenta con el perfil <b>${esc(perfil)}</b>.</p>
      <p>Para activarla, cree su contraseña con el siguiente enlace. Es de un solo uso y vence en 48 horas.</p>${boton(url, 'Crear mi contraseña')}`),
    `Hola, ${nombre}. Se creó su cuenta en EBA Cuac Cuac con el perfil ${perfil}. Cree su contraseña aquí (vence en 48 horas): ${url}`),

  recuperacion: (para, nombre, url) => enviar(para, 'Restablecer su contraseña de EBA Cuac Cuac',
    plantilla('Restablecer contraseña', `<p>Hola, ${esc(nombre)}. Recibimos una solicitud para cambiar su contraseña.</p>
      <p>El enlace es de un solo uso y vence en 30 minutos.</p>${boton(url, 'Crear una contraseña nueva')}`),
    `Hola, ${nombre}. Para crear una contraseña nueva en EBA Cuac Cuac use este enlace (vence en 30 minutos): ${url}`),
};

/** Solo para pruebas. */
export const _reiniciarTransporte = () => { transporte = undefined; };
