/**
 * Modelo de datos del prototipo v0.25 (mismo formato que guarda la base de datos en la columna «datos»).
 * Angular y el prototipo leen y escriben estos registros por /api/sincronizacion mientras conviven.
 */
import type { Especie, EstadoEvaluacion, Medida } from '../tipos.js';

export interface MetodoIndicador {
  kind: 'auto' | 'units' | 'pct' | 'density' | 'cc' | 'doc' | 'bpumv' | 'radio' | 'direct';
  aux?: [string, string][];
  unit?: string;
  src?: 'aves' | 'bebederos' | 'comederos' | 'puntos' | string;
  total?: string;
  part?: string;
  rule?: string;
  extra?: string;
  prof?: boolean;
  mode?: string;
  opts?: [string, number][];
}

export interface Indicador {
  code: string;
  sp: Especie;
  g: Medida;
  num: string;
  tabla: string;
  name: string;
  q: string;
  metodo: string;
  unidad: string;
  prod: string;
  cond: string;
  trasp: boolean;
  formula: string;
  escala: [number, string][];
  crit: string;
  m: MetodoIndicador;
  app: { cama?: boolean; proposito?: string; permanencia?: boolean; sistema?: string[] };
  nota?: string;
}

export interface Inventario { cat: string; n: number; edad?: number; peso?: number }
export interface EspecieFinca {
  sp: Especie;
  proposito?: string;
  sistema?: string;
  conCorral?: boolean;
  permanencia?: boolean;
  cama?: boolean;
  inventario: Inventario[];
}
export interface Titular { nombre: string; tipoDoc: string; doc: string; correo?: string; tel?: string; autoriza?: boolean }
export interface Finca {
  id: string;
  nombre: string;
  productor?: string;
  titular?: Titular | null;
  depto: string;
  mpio: string;
  vereda?: string;
  estado: 'ACTIVA' | 'INACTIVA' | string;
  especies: EspecieFinca[];
  area?: number;
}

export interface Constancia { codigo: string; verificacion: string; emitida: string; vence: string; puntaje?: number; nivel?: string }

/** Respuesta de un indicador (cada tipo usa sus campos). */
export type Respuesta = Record<string, any>;   // eslint-disable-line @typescript-eslint/no-explicit-any

export interface Evaluacion {
  id: string;
  finca: string;
  sp: Especie;
  fecha: string;
  inspector: string;
  estado: EstadoEvaluacion;
  proceso: string;
  visita: number;
  apertura?: { atiende?: string; bebederos?: number; comederos?: number; puntosSC?: number; avesPuntoSC?: number; [k: string]: unknown };
  pobConfirmada?: number | null;
  pobEsp?: Partial<Record<Especie, number>>;
  resp: Record<string, Respuesta>;
  obs: Record<string, string>;
  plan?: Record<string, { accion?: string; plazo?: string; [k: string]: unknown }>;
  finalizada?: string;
  constancia?: Constancia | null;
  asignacion?: { por: string | null; fecha: string; inspector: string; fechaVisita: string };
  reprogramaciones?: { antes: string; nueva: string; motivo: string; por: string | null; fecha: string }[];
  [k: string]: unknown;
}

export interface Proceso { ampliado?: { motivo: string; por: string; fecha: string } }
