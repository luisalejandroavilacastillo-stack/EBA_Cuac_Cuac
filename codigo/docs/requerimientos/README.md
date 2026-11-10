# Requerimientos, historias de usuario y clases

[`Diagramas_de_Clases_e_Historias_de_Usuario_Unificado_Patos_Gansos.xlsx`](Diagramas_de_Clases_e_Historias_de_Usuario_Unificado_Patos_Gansos.xlsx) reúne los cuatro módulos validados contra el prototipo (EBA Cuac Cuac v0.17, actualizado a la v0.24) y la norma. La especificación de los casos de uso está en [`CASOS_DE_USO.md`](CASOS_DE_USO.md).


| Hoja | Contenido |
|---|---|
| 0_Validacion | Qué se validó, ajustó, agregó o retiró y por qué (conteos con fórmulas); al final, la actualización con el prototipo v0.17 |
| 1_User_Personas | Personas por módulo |
| 2_Requerimientos | RF01 a RF40 con el ajuste a la norma; complementos RF01+, RF27+ y Ayuda; RF24–RF25 ajustados como asistente virtual; omitidos y pendientes con su motivo |
| 3_Informacion_Solicitada | Cada dato que pide la plataforma |
| 4_Historias_Usuario | HU-01 a HU-192 (HU-177 a HU-192: cambios v0.19–v0.24) con criterios de aceptación, prioridad, puntos y validación |
| 5_De_Pequeno_a_Grande | Incrementos de construcción por módulo |
| 6_Reglas_Negocio | RN-01 a RN-190 (RN-175 a RN-190: cambios v0.19–v0.24) |
| 7_Eliminar_vs_Inactivar | Qué se elimina y qué se inactiva |
| 8_Clases | Las 115 entradas de clases de las Vistas 1 a 7 |
| 9_Diagramas | Imágenes de las 7 vistas de la v0.17 (histórico) |
| 10_Trazabilidad | Requerimiento → historias, puntos, prioridad (fórmulas) |
| 11_Catalogo_Parametrizado | Los 58 indicadores con tipo de captura y regla de nivel |
| 12_Casos_de_Uso | CU-01 a CU-26 por actor, con su diagrama de flujo |
| 13_Cambios_v0_24 | Cambios del prototipo de la v0.19 a la v0.24 con sus casos de uso e historias |
| 14_Diagramas_v0_24 | Casos de uso, flujos, estados, clases y paquetes actualizados |

Para volver a aplicar la actualización a un libro sin ella: `python herramientas/actualizar_libro_v0_24.py` (no hace nada si ya está aplicada).
