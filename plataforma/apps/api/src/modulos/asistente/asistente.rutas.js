import { Router } from 'express';
import { config } from '../../config/config.js';
import { ErrorApi } from '../../utilidades/errores.js';
import { quitarDatosPersonales } from './privacidad.js';

/**
 * Asistente de la norma con Gemini (CU-22).
 *   GET  /api/asistente/estado   ¿hay IA configurada en el servidor? (nunca devuelve la clave)
 *   POST /api/asistente          { sistema, mensajes: [{ role: 'user'|'assistant', content }], maxTokens? } → { texto, modelo }
 * El navegador arma las instrucciones (rol, numeral y página de la norma, resumen de la evaluación) igual que antes;
 * el servidor quita los datos personales, agrega la clave y llama a Gemini. El texto de las preguntas no se registra.
 */
export const rutasAsistente = Router();

rutasAsistente.get('/estado', (req, res) => {
  res.json({ disponible: Boolean(config.gemini.clave), proveedor: 'gemini', modelo: config.gemini.clave ? config.gemini.modelo : null });
});

/* Límite de consultas por minuto y por equipo, para cuidar la cuota de Gemini. */
const uso = new Map();
function limitar(req) {
  const ahora = Date.now(), ip = req.ip ?? 'desconocida';
  const lista = (uso.get(ip) ?? []).filter((t) => ahora - t < 60_000);
  if (lista.length >= config.gemini.consultasPorMinuto) throw new ErrorApi(429, 'Hizo muchas preguntas seguidas. Espere un minuto e intente de nuevo.');
  lista.push(ahora); uso.set(ip, lista);
  if (uso.size > 5000) uso.clear();
}

/** Traduce los errores de Gemini a mensajes que la persona entienda (sin mostrar detalles internos). */
function errorGemini(estado, cuerpo) {
  const msg = String(cuerpo?.error?.message ?? '');
  if (estado === 400 && /api key/i.test(msg)) return new ErrorApi(502, 'La clave de Gemini no es válida. Revise GEMINI_API_KEY en el archivo .env.');
  if (estado === 401) return new ErrorApi(502, 'Gemini no aceptó la clave (401). Genere una clave nueva en Google AI Studio, péguela en GEMINI_API_KEY del .env y reinicie la API.');
  if (estado === 403) return new ErrorApi(502, 'La clave de Gemini no tiene permiso para usar este modelo o la API no está habilitada.');
  if (estado === 404) return new ErrorApi(502, `El modelo «${config.gemini.modelo}» no existe. Revise GEMINI_MODELO en el archivo .env.`);
  if (estado === 429) return new ErrorApi(503, 'Se alcanzó el límite de uso de Gemini. Intente de nuevo en un momento.');
  if (estado === 503 || estado === 500) return new ErrorApi(503, 'Gemini está saturado en este momento. Intente de nuevo en unos segundos.');
  return new ErrorApi(502, `Gemini no respondió correctamente (error ${estado}).`);
}

rutasAsistente.post('/', async (req, res) => {
  if (!config.gemini.clave) throw new ErrorApi(503, 'El asistente con IA no está configurado en el servidor (falta GEMINI_API_KEY).');
  limitar(req);
  const { sistema, mensajes, maxTokens } = req.body ?? {};
  if (typeof sistema !== 'string' || !sistema.trim() || sistema.length > 80_000) throw new ErrorApi(400, 'Faltan las instrucciones del asistente.');
  if (!Array.isArray(mensajes) || !mensajes.length || mensajes.length > 24) throw new ErrorApi(400, 'Falta la pregunta.');
  const limpios = [];
  for (const m of mensajes) {
    const texto = String(m?.content ?? '').trim();
    if (!texto || texto.length > 4000 || !['user', 'assistant'].includes(m?.role)) throw new ErrorApi(400, 'Mensaje inválido.');
    limpios.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: await quitarDatosPersonales(texto) }] });
  }
  if (limpios.at(-1).role !== 'user') throw new ErrorApi(400, 'El último mensaje debe ser la pregunta.');

  const cuerpo = {
    systemInstruction: { parts: [{ text: await quitarDatosPersonales(sistema) }] },
    contents: limpios,
    generationConfig: { temperature: 0.2, maxOutputTokens: Math.min(Math.max(Number(maxTokens) || 900, 256), 4096) * 2 },
  };
  // Gemini responde 503 (saturado) o 500 de vez en cuando: se reintenta una vez y luego se usa el modelo de respaldo.
  const intentos = [config.gemini.modelo, config.gemini.modelo, config.gemini.respaldo].filter(Boolean);
  let datos, modelo, ultimo;
  for (let i = 0; i < intentos.length; i++) {
    modelo = intentos[i];
    if (i > 0) await new Promise((ok) => setTimeout(ok, 1200));
    let r;
    try {
      r = await fetch(`${config.gemini.url}/models/${encodeURIComponent(modelo)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.gemini.clave },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(40_000),
      });
    } catch (e) {
      ultimo = new ErrorApi(504, e.name === 'TimeoutError' ? 'Gemini tardó demasiado en responder.' : 'No hay conexión con Gemini desde el servidor.');
      continue;
    }
    datos = await r.json().catch(() => null);
    if (r.ok) { ultimo = null; break; }
    console.error(`Gemini (${modelo}) respondió ${r.status}`);   // sin el texto de la pregunta
    ultimo = errorGemini(r.status, datos);
    if (![500, 503].includes(r.status)) break;                    // clave, modelo o cuota: reintentar no sirve
  }
  if (ultimo) throw ultimo;
  const cand = datos?.candidates?.[0];
  const texto = (cand?.content?.parts ?? []).filter((p) => p.text && !p.thought).map((p) => p.text).join('\n').trim();
  if (!texto) {
    if (cand?.finishReason === 'SAFETY' || datos?.promptFeedback?.blockReason) throw new ErrorApi(502, 'Gemini no quiso responder esta pregunta.');
    throw new ErrorApi(502, 'Gemini devolvió una respuesta vacía.');
  }
  res.json({ texto, modelo });
});
