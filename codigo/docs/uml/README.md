# Diseño UML · v0.24

Todos los diagramas se generan desde las fuentes de [`fuentes/`](fuentes/): Mermaid (`.mmd`) y Graphviz (`.dot`) para los casos de uso. Para regenerarlos:

```bash
bash herramientas/generar_diagramas.sh
```

Cada diagrama se publica en SVG (para Figma o el informe) y en PNG (para leerlo aquí). Los diagramas de clases de la v0.17 se conservan en [`clases/historico_v0_17/`](clases/historico_v0_17/) solo como referencia.

## 1. Casos de uso

La especificación completa está en [`../requerimientos/CASOS_DE_USO.md`](../requerimientos/CASOS_DE_USO.md).

| Actor | Diagrama |
|---|---|
| Inspector ICA | [SVG](casos_de_uso/cu_01_inspector.svg) · [PNG](casos_de_uso/cu_01_inspector.png) |
| Coordinador ICA | [SVG](casos_de_uso/cu_02_coordinador.svg) · [PNG](casos_de_uso/cu_02_coordinador.png) |
| Productor | [SVG](casos_de_uso/cu_03_productor.svg) · [PNG](casos_de_uso/cu_03_productor.png) |
| Administrador | [SVG](casos_de_uso/cu_04_administrador.svg) · [PNG](casos_de_uso/cu_04_administrador.png) |

## 2. Flujos (diagramas de actividad)

| # | Flujo | CU | Archivo |
|---|---|---|---|
| 1 | Inspección completa, Fases I a IV | CU-08 a CU-17 | [SVG](actividad/act_01_inspeccion_completa.svg) · [PNG](actividad/act_01_inspeccion_completa.png) |
| 2 | Registro de finca (especies y número de aves) | CU-04 | [SVG](actividad/act_02_registro_finca.svg) · [PNG](actividad/act_02_registro_finca.png) |
| 3 | Recorrido por puntos · patos | CU-10 | [SVG](actividad/act_03_recorrido_patos.svg) · [PNG](actividad/act_03_recorrido_patos.png) |
| 4 | Recorrido por puntos · gansos | CU-11 | [SVG](actividad/act_04_recorrido_gansos.svg) · [PNG](actividad/act_04_recorrido_gansos.png) |
| 5 | Cierre y seguimiento automático | CU-15, CU-17 a CU-19 | [SVG](actividad/act_05_cierre_seguimiento.svg) · [PNG](actividad/act_05_cierre_seguimiento.png) |
| 6 | Asistente de la norma | CU-22 | [SVG](actividad/act_06_asistente.svg) · [PNG](actividad/act_06_asistente.png) |
| 7 | Ficha del indicador durante la evaluación | CU-13 | [SVG](actividad/act_07_ficha_indicador.svg) · [PNG](actividad/act_07_ficha_indicador.png) |

## 3. Diagramas de estados

| Objeto | Estados | Archivo |
|---|---|---|
| Evaluación (visita) | Programada → En proceso → Finalizada (reprogramable mientras está Programada) | [SVG](estados/est_01_evaluacion.svg) · [PNG](estados/est_01_evaluacion.png) |
| Proceso de seguimiento | En curso, Seguimiento programado, En seguimiento, Requiere ampliación, Cumplido, Cerrado sin cumplir | [SVG](estados/est_02_proceso.svg) · [PNG](estados/est_02_proceso.png) |
| Especie de la finca | Por iniciar, En proceso, Finalizada, Seguimiento programado | [SVG](estados/est_03_especie.svg) · [PNG](estados/est_03_especie.png) |
| Finca | ACTIVA, INACTIVA, eliminada | [SVG](estados/est_04_finca.svg) · [PNG](estados/est_04_finca.png) |

## 4. Diagramas de secuencia

| # | Escenario | Archivo |
|---|---|---|
| 1 | Cálculo del resultado de una visita | [SVG](secuencia/sec_01_calculo.svg) · [PNG](secuencia/sec_01_calculo.png) |
| 2 | Cierre sin cumplir y seguimiento programado | [SVG](secuencia/sec_02_cierre_seguimiento.svg) · [PNG](secuencia/sec_02_cierre_seguimiento.png) |
| 3 | Consulta al asistente de la norma | [SVG](secuencia/sec_03_asistente.svg) · [PNG](secuencia/sec_03_asistente.png) |
| 4 | Recorrido por puntos de gansos | [SVG](secuencia/sec_04_recorrido_ganso.svg) · [PNG](secuencia/sec_04_recorrido_ganso.png) |

## 5. Diagramas de clases

| Vista | Módulo | Requerimientos | Archivo |
|---|---|---|---|
| 0 | Modelo de dominio (vista general) | Todos | [SVG](clases/cls_0_dominio.svg) · [PNG](clases/cls_0_dominio.png) |
| 1 | Roles y usuarios | RF02, RF03 | [SVG](clases/cls_1_roles_usuarios.svg) · [PNG](clases/cls_1_roles_usuarios.png) |
| 2 | Autenticación y sesión | RF01, RF04 | [SVG](clases/cls_2_autenticacion.svg) · [PNG](clases/cls_2_autenticacion.png) |
| 3 | Unidades productivas (especies y tramo por especie) | RF05 a RF08 | [SVG](clases/cls_3_unidades_productivas.svg) · [PNG](clases/cls_3_unidades_productivas.png) |
| 4 | Parametrización de la lista y de la norma | RF10 a RF12 | [SVG](clases/cls_4_parametrizacion.svg) · [PNG](clases/cls_4_parametrizacion.png) |
| 5 | Evaluación y resultado (incluye el recorrido de gansos) | RF13 a RF23 | [SVG](clases/cls_5_evaluacion_resultado.svg) · [PNG](clases/cls_5_evaluacion_resultado.png) |
| 6 | Seguimiento, reportes y tablero | RF27 a RF36, RF40 | [SVG](clases/cls_6_seguimiento_reportes.svg) · [PNG](clases/cls_6_seguimiento_reportes.png) |
| 7 | Asistente de la norma y ayuda | RF24, RF25 | [SVG](clases/cls_7_asistente.svg) · [PNG](clases/cls_7_asistente.png) |

Convenciones:
- Composición: rombo lleno.
- Dependencia: línea punteada.
- Asociación con multiplicidad.
- Los estereotipos `«vista»`, `«capa»` y `«ui»` marcan las pantallas y los componentes de interfaz.

## 6. Diagrama de paquetes

Organización de `src/js` (incluye `flujo.js`, `seguimiento.js`, `recorrido_ganso.js`, `asistente_norma.js` y `norma_paginas.js`): [SVG](paquetes/paq_01_paquetes.svg) · [PNG](paquetes/paq_01_paquetes.png)

## 7. Modelo de datos

El modelo relacional (PostgreSQL), con la migración `06_actualizacion_v0_24.sql`, el diagrama entidad-relación y el diccionario de datos, está en [`../../base_de_datos/`](../../base_de_datos/).
