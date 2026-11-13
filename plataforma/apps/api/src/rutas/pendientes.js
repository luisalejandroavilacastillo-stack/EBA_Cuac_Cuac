import { Router } from 'express';

/**
 * Módulos que se construyen en las siguientes etapas. Mientras tanto responden 501
 * e indican qué casos de uso cubrirán (docs/requerimientos/CASOS_DE_USO.md del prototipo).
 */
export const MODULOS = [
  { ruta: 'bitacora', nombre: 'Bitácora', cu: 'CU-26', etapa: 3 },
  { ruta: 'evaluaciones', nombre: 'Inspección: apertura, recorridos, lista y cierre', cu: 'CU-08 a CU-16', etapa: 5 },
  { ruta: 'seguimiento', nombre: 'Proceso de seguimiento', cu: 'CU-17 a CU-19', etapa: 6 },
  { ruta: 'reportes', nombre: 'Tablero y reportes', cu: 'CU-20 y CU-21', etapa: 6 },
];

export function rutaPendiente(modulo) {
  const r = Router();
  r.all('/{*resto}', (req, res) =>
    res.status(501).json({
      error: `El módulo «${modulo.nombre}» aún no está disponible`,
      casosDeUso: modulo.cu,
      etapa: modulo.etapa,
    }));
  return r;
}
