import type { Tramo } from '@eba/norma';

export const nombreEspecie = (e: string, n?: number) =>
  e === 'pato' ? (n === 1 ? 'Pato' : 'Patos') : n === 1 ? 'Ganso' : 'Gansos';
export const nombreTramo = (t: Tramo) => (t === 'comercial' ? 'Comercial' : 'Traspatio');
export const miles = (n: number) => n.toLocaleString('es-CO');
