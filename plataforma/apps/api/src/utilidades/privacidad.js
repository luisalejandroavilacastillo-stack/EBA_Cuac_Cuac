/**
 * Enmascarado de datos personales (Ley 1581 de 2012), igual que la ficha del prototipo:
 * los listados y la ficha muestran solo lo necesario para reconocer a la persona.
 */
export const enmascararDocumento = (d) => (d ? '•'.repeat(Math.max(0, String(d).length - 4)) + String(d).slice(-4) : null);
export const enmascararTelefono = (t) => (t ? `••• ••• ${String(t).slice(-4)}` : null);
export function enmascararCorreo(c) {
  if (!c) return null;
  const [u, d] = String(c).split('@');
  return `${u.slice(0, 2)}${'•'.repeat(Math.max(1, u.length - 2))}@${d}`;
}
