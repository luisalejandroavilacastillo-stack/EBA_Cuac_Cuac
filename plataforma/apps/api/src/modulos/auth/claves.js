import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Contraseñas, códigos y enlaces.
 * - Contraseñas: scrypt (incluido en Node.js) con sal aleatoria. Formato: scrypt$N$r$p$sal$hash.
 * - Códigos de verificación, sesiones y enlaces: valores aleatorios; en la base solo se guarda su SHA-256.
 */
const scryptAsync = promisify(scrypt);
const N = 16384, R = 8, P = 1, LARGO = 64;

export async function cifrarClave(clave) {
  const sal = randomBytes(16);
  const h = await scryptAsync(clave.normalize('NFKC'), sal, LARGO, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${sal.toString('base64')}$${h.toString('base64')}`;
}

export async function verificarClave(clave, guardada) {
  // Si no hay contraseña guardada, se hace igual el cálculo para no revelar por el tiempo de respuesta si el usuario existe.
  const [alg, n, r, p, sal, hash] = String(guardada || 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$').split('$');
  if (alg !== 'scrypt') return false;
  const esperado = Buffer.from(hash || '', 'base64');
  const h = await scryptAsync(String(clave).normalize('NFKC'), Buffer.from(sal, 'base64'), LARGO, { N: +n, r: +r, p: +p, maxmem: 64 * 1024 * 1024 });
  return esperado.length === h.length && timingSafeEqual(esperado, h) && Boolean(guardada);
}

/** Política de contraseñas: 10 caracteres o más, con letras y números, y que no sea el correo ni el documento. */
export function problemaClave(clave, { correo, documento } = {}) {
  const c = String(clave ?? '');
  if (c.length < 10) return 'La contraseña debe tener al menos 10 caracteres.';
  if (c.length > 128) return 'La contraseña es demasiado larga.';
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(c) || !/\d/.test(c)) return 'La contraseña debe combinar letras y números.';
  const minus = c.toLowerCase();
  if ((correo && minus.includes(String(correo).split('@')[0].toLowerCase())) || (documento && c.includes(String(documento))))
    return 'La contraseña no puede contener su correo ni su documento.';
  return null;
}

export const sha256 = (v) => createHash('sha256').update(String(v)).digest('hex');
export const tokenAleatorio = () => randomBytes(32).toString('base64url');
export const codigoSeisDigitos = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
