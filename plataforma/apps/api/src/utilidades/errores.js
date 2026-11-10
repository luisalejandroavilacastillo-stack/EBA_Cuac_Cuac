/** Error con código HTTP y mensaje para el usuario. */
export class ErrorApi extends Error {
  /**
   * @param {number} estado código HTTP
   * @param {string} mensaje mensaje en español para mostrar en la pantalla
   * @param {object} [detalles] p. ej. los campos con error
   */
  constructor(estado, mensaje, detalles) {
    super(mensaje);
    this.estado = estado;
    this.detalles = detalles;
  }
}

export const noEncontrado = (que = 'El recurso') => new ErrorApi(404, `${que} no existe`);
export const datosInvalidos = (campos) => new ErrorApi(400, 'Revise los datos enviados', { campos });
