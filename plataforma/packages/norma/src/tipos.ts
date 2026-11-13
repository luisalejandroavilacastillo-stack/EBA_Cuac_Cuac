/** Tipos del dominio compartidos por el backend y el frontend. */
export type Especie = 'pato' | 'ganso';
export type Tramo = 'traspatio' | 'comercial';
export type Medida = 'MBA' | 'MBR' | 'MBG';
export type Nivel = 'Excelente' | 'Alto' | 'Medio' | 'Bajo';
export type Rol = 'inspector' | 'coordinador' | 'productor' | 'admin';
/** Estados de una visita (v0.25). «Programada» se muestra como «Asignada» y «Finalizada» como «Aprobada». */
export type EstadoEvaluacion = 'Programada' | 'En proceso' | 'Pendiente de aprobación' | 'Devuelta' | 'Finalizada' | 'Anulada';
/** Estado de cada especie de la finca, según el personal del ICA. */
export type EstadoEspecie = 'Por asignar' | 'Asignada' | 'En proceso' | 'Devuelta' | 'Pendiente de aprobación' | 'Aprobada' | 'Seguimiento programado';
/** El mismo estado, como lo ve el productor. */
export type EstadoProductor = 'Sin programar' | 'En evaluación' | 'En revisión del ICA' | 'Plan de mejora' | 'Certificada' | 'Constancia vencida';
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
