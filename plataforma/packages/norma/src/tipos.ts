/** Tipos del dominio compartidos por el backend y el frontend. */
export type Especie = 'pato' | 'ganso';
export type Tramo = 'traspatio' | 'comercial';
export type Medida = 'MBA' | 'MBR' | 'MBG';
export type Nivel = 'Excelente' | 'Alto' | 'Medio' | 'Bajo';
export type Rol = 'inspector' | 'coordinador' | 'productor' | 'admin';
export type EstadoEvaluacion = 'Programada' | 'En proceso' | 'Finalizada';
export type EstadoEspecie = 'Por iniciar' | 'En proceso' | 'Finalizada' | 'Seguimiento programado';
export type EstadoProceso =
  | 'En curso' | 'Seguimiento programado' | 'En seguimiento' | 'Requiere ampliación' | 'Cumplido' | 'Cerrado sin cumplir';

export interface PlanMuestreo {
  corrales: number;          // galpones o corrales a inspeccionar (0 = sin corral)
  puntosCorral: number;
  puntos: number;
  avesPunto: number;
  minimo: number | null;     // mínimo de la Tabla 3
  aves: number;              // aves a evaluar
  reparto: number[];         // aves de cada punto, en orden
  avesGalpon: number[];
  texto: string;
}
