# Diseño UML · plataforma 1.0

Todos los diagramas se generan desde las fuentes de [`fuentes/`](fuentes/): Mermaid (`.mmd`) y Graphviz (`.dot`) para los casos de uso. Para regenerarlos:

```bash
bash herramientas/generar_diagramas.sh
```

Los diagramas nuevos de la plataforma 1.0 (ingreso real, cuenta, trabajo sin señal y despliegue) están marcados con **1.0**; los demás siguen siendo los del prototipo v0.25, que la plataforma reproduce. Cada diagrama se publica en SVG (para Figma o el informe) y en PNG (para leerlo aquí). Los diagramas de clases de la v0.17 se conservan en [`clases/historico_v0_17/`](clases/historico_v0_17/) solo como referencia.

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
| 5 | Finalizar, aprobar y programar el seguimiento | CU-15, CU-17 a CU-19, CU-28 | [SVG](actividad/act_05_cierre_seguimiento.svg) · [PNG](actividad/act_05_cierre_seguimiento.png) |
| 6 | Asistente de la norma | CU-22 | [SVG](actividad/act_06_asistente.svg) · [PNG](actividad/act_06_asistente.png) |
| 7 | Ficha del indicador durante la evaluación | CU-13 | [SVG](actividad/act_07_ficha_indicador.svg) · [PNG](actividad/act_07_ficha_indicador.png) |
| 8 | Asignar, evaluar, aprobar o devolver (v0.25) | CU-08, CU-15, CU-27 a CU-29 | [SVG](actividad/act_08_asignar_aprobar.svg) · [PNG](actividad/act_08_asignar_aprobar.png) |
| 9 | **1.0** Cuenta: crear usuario, activar con el enlace, ingresar con código, recuperar | CU-01, CU-02, CU-24, CU-32 | [SVG](actividad/act_09_cuenta.svg) · [PNG](actividad/act_09_cuenta.png) |
| 10 | **1.0** Trabajo sin señal en campo | CU-33 | [SVG](actividad/act_10_sin_senal.svg) · [PNG](actividad/act_10_sin_senal.png) |

## 3. Diagramas de estados

| Objeto | Estados | Archivo |
|---|---|---|
| Evaluación (visita) | Programada («Asignada») → En proceso → Pendiente de aprobación ⇄ Devuelta → Finalizada («Aprobada») | [SVG](estados/est_01_evaluacion.svg) · [PNG](estados/est_01_evaluacion.png) |
| Proceso de seguimiento | En curso, Seguimiento programado, En seguimiento, Requiere ampliación, Cumplido, Cerrado sin cumplir | [SVG](estados/est_02_proceso.svg) · [PNG](estados/est_02_proceso.png) |
| Especie de la finca | Por asignar, Asignada, En proceso, Devuelta, Pendiente de aprobación, Aprobada, Seguimiento programado (y la vista del productor) | [SVG](estados/est_03_especie.svg) · [PNG](estados/est_03_especie.png) |
| Finca | ACTIVA, INACTIVA, eliminada | [SVG](estados/est_04_finca.svg) · [PNG](estados/est_04_finca.png) |
| Constancia de cumplimiento | Vigente → Vencida (1 año) | [SVG](estados/est_05_constancia.svg) · [PNG](estados/est_05_constancia.png) |
| **1.0** Cuenta de usuario | Pendiente de activación, Enlace vencido, Sin enlace, Activa, Bloqueada temporalmente, Inactiva | [SVG](estados/est_06_cuenta.svg) · [PNG](estados/est_06_cuenta.png) |

## 4. Diagramas de secuencia

| # | Escenario | Archivo |
|---|---|---|
| 1 | Cálculo del resultado de una visita | [SVG](secuencia/sec_01_calculo.svg) · [PNG](secuencia/sec_01_calculo.png) |
| 2 | Finalizar, aprobar sin cumplir y programar el seguimiento | [SVG](secuencia/sec_02_cierre_seguimiento.svg) · [PNG](secuencia/sec_02_cierre_seguimiento.png) |
| 3 | Consulta al asistente de la norma | [SVG](secuencia/sec_03_asistente.svg) · [PNG](secuencia/sec_03_asistente.png) |
| 4 | Recorrido por puntos de gansos | [SVG](secuencia/sec_04_recorrido_ganso.svg) · [PNG](secuencia/sec_04_recorrido_ganso.png) |
| 5 | Aprobación que cumple y constancia de cumplimiento | [SVG](secuencia/sec_05_aprobacion.svg) · [PNG](secuencia/sec_05_aprobacion.png) |
| 6 | **1.0** Ingreso con contraseña y código al correo (API, MariaDB y correo) | [SVG](secuencia/sec_06_ingreso.svg) · [PNG](secuencia/sec_06_ingreso.png) |

## 5. Diagramas de clases

| Vista | Módulo | Requerimientos | Archivo |
|---|---|---|---|
| 0 | Modelo de dominio (vista general) | Todos | [SVG](clases/cls_0_dominio.svg) · [PNG](clases/cls_0_dominio.png) |
| 1 | Perfiles, usuarios, sesión y avisos | RF02, RF03 | [SVG](clases/cls_1_roles_usuarios.svg) · [PNG](clases/cls_1_roles_usuarios.png) |
| 2 | **1.0** Autenticación y sesión (usuario, enlace de cuenta, código, sesión) | RF01, RF04 | [SVG](clases/cls_2_autenticacion.svg) · [PNG](clases/cls_2_autenticacion.png) |
| 3 | Unidades productivas (especies y tramo por especie) | RF05 a RF08 | [SVG](clases/cls_3_unidades_productivas.svg) · [PNG](clases/cls_3_unidades_productivas.png) |
| 4 | Parametrización de la lista y de la norma | RF10 a RF12 | [SVG](clases/cls_4_parametrizacion.svg) · [PNG](clases/cls_4_parametrizacion.png) |
| 5 | Evaluación y resultado (incluye el recorrido de gansos) | RF13 a RF23 | [SVG](clases/cls_5_evaluacion_resultado.svg) · [PNG](clases/cls_5_evaluacion_resultado.png) |
| 6 | Asignación, aprobación, seguimiento, constancia, reportes y tablero | RF27 a RF36, RF40 | [SVG](clases/cls_6_seguimiento_reportes.svg) · [PNG](clases/cls_6_seguimiento_reportes.png) |
| 7 | Asistente de la norma y ayuda | RF24, RF25 | [SVG](clases/cls_7_asistente.svg) · [PNG](clases/cls_7_asistente.png) |

Convenciones:
- Composición: rombo lleno.
- Dependencia: línea punteada.
- Asociación con multiplicidad.
- Los estereotipos `«vista»`, `«capa»` y `«ui»` marcan las pantallas y los componentes de interfaz.

## 6. Diagrama de paquetes

- Prototipo · organización de `src/js` (incluye `ficha_ave.js`, `flujo.js`, `seguimiento.js`, `recorrido_ganso.js`, `asistente_norma.js` y `norma_paginas.js`): [SVG](paquetes/paq_01_paquetes.svg) · [PNG](paquetes/paq_01_paquetes.png)
- **1.0** Plataforma · paquetes y despliegue (Angular, `@eba/norma`, service worker, Nginx, API, MariaDB, correo y Gemini): [SVG](paquetes/paq_02_plataforma.svg) · [PNG](paquetes/paq_02_plataforma.png)

## 7. Modelo de datos

La base de datos que usa la plataforma 1.0 (MariaDB 11.8: migraciones, diagrama y diccionario) está en [`../../base_de_datos/mariadb/`](../../base_de_datos/mariadb/). El modelo relacional de diseño (PostgreSQL), con las migraciones `06_actualizacion_v0_24.sql` y `07_actualizacion_v0_25.sql`, el diagrama entidad-relación y el diccionario de datos, está en [`../../base_de_datos/`](../../base_de_datos/).
