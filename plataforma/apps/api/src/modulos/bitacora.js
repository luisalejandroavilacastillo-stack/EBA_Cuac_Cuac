/**
 * Registro en la bitácora (CU-26). La descripción nunca lleva documento, correo ni teléfono.
 * Mientras no exista el ingreso (etapa 3), el usuario se registra como «sin sesión».
 */
export async function registrarBitacora(con, usuario, accion) {
  await con.query('INSERT INTO bitacora (usuario, accion) VALUES (?, ?)', [usuario || 'sin sesión', accion.slice(0, 300)]);
}
