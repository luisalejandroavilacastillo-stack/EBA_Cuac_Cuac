# Informe de validación · versión 0.13.0

Revisión del prototipo de **patos y gansos** frente a la *Metodología para evaluar el bienestar animal en patos y gansos* (ICA v1.0, 2024) y validación cruzada con el prototipo de **aves de corral y traspatio** (`Prototipo_ICA_Bienestar_Aves_Vr.2.html`).

Fecha: 18/10/2026 · Rama: `fix/calculos-admin-ayuda`

---

## 1. Resumen

| Tema | Antes (0.12.1) | Ahora (0.13.0) |
|---|---|---|
| Errores de cálculo frente a la norma | 11 confirmados | Corregidos; 152 pruebas unitarias contra las tablas |
| Administrador | Sin acceso a Fincas ni Evaluaciones | Ve y opera todos los módulos |
| Ayuda | Fichas resumidas y 2 tablas | Texto de la norma de los 58 indicadores, Tablas 1–4 y 39, ilustraciones 2–5, gráficas, calculadora, erratas y el PDF |
| Gráficas | Valores inventados en el inicio y en cada indicador | Calculadas con las evaluaciones reales |

Cómo verificar:

```bash
node pruebas/prueba_calculo.js        # 152 pruebas del motor de cálculo frente a la norma
python pruebas/prueba_prototipo.py    # extremo a extremo: ayuda, administrador, muestreo, vista móvil
```

---

## 2. Errores de cálculo corregidos (patos y gansos)

Cada caso se reprodujo con el código de la versión 0.12.1 antes de corregirlo.

| # | Dónde | Error en 0.12.1 | Ejemplo | Corrección |
|---|---|---|---|---|
| 1 | 6.1.5 · Tabla 9 | «No hay suministro de agua» valía **55** (se copió una errata de la norma) | Bebedero seco = 55 | El peor nivel vale **0** |
| 2 | 6.2.10 · Tabla 26 | Mortalidad del 14 % daba 55 | 14 % → 55 | ≥ 14 % = 0; 12 % a < 14 % = 55; < 12 % = 100 |
| 3 | Tramo vs Tabla 3 | El tramo usaba 200 y el muestreo 199: con 199 aves la finca era traspatio pero se pedían 2 galpones | 199 aves → traspatio con plan comercial | Un solo corte: < 200 traspatio, ≥ 200 comercial |
| 4 | Muestreo (5.6 y Tabla 3) | Se revisó la contradicción entre la Tabla 3 (10 aves) y el texto de 5.6 («5 aves por punto» = 50) | 812 aves | **Se aplica la Tabla 3** por indicación de la docente: 10 aves (1 por punto en 2 galpones × 5 puntos); con menos de 200, 5 aves en 3 puntos |
| 5 | Muestreo | La muestra podía superar las aves de la especie y el indicador nunca se completaba | 4 patos → 5 casillas | Si hay menos aves que la muestra, se evalúan todas |
| 6 | 6.1.11 densidad | Se tomaba el peso **más cercano** de la tabla | 1,74 kg y 17,3 kg/m² → 0 (comparaba con 17) | Interpolación lineal: máximo 17,48 → 100 |
| 7 | 6.1.11 densidad | Usaba la población de patos **y gansos** de la finca | Finca mixta inflaba la densidad | Usa solo los patos |
| 8 | 6.1.6 · Tabla 10 | En traspatio exigía registros de tratamiento del agua (que la norma solo pide con 200 o más) | Traspatio con agua limpia → 0 | Traspatio: agua limpia y apta = 100; sucia = 0 |
| 9 | 6.1.3 · Tabla 7 | No había forma de registrar «no hay bebederos» | Indicador imposible de cerrar | 0 bebederos inspeccionados = 0 puntos |
| 10 | 7.2.5 · Tabla 51 | Sin lesiones en el pico pero sin marcar la casilla daba 20 | 0 % → 20 | 0 % = 100 |
| 11 | Redondeo (RN-121) | `Math.round(x*10)/10` falla con coma flotante | Traspatio 0,7 × 80,5 + 0,3 × 62 = 74,95 → **74,9 Medio** | Redondeo exacto → **75,0 Alto** |

Otros ajustes del cálculo:

- **Bebederos y comederos en traspatio** (6.1.3, 6.1.5, 6.1.7): la norma pide revisar *todos*; la apertura ahora pregunta cuántos hay en el predio. En comercial: 2 bebederos y 1 comedero por punto.
- **Sin corral**: el inspector elige de 1 a 3 puntos y de 2 a 5 aves por punto (antes era fijo 3 × 3).
- **6.1.4 y 6.1.8**: con 0 bebederos o comederos el resultado es 0 (antes quedaba sin calcular).
- **7.1.5 · Tabla 44**: la escala que se muestra ahora coincide con la regla aplicada (antes el botón resaltado no correspondía al texto).
- El resultado muestra el **detalle del cálculo**: indicadores calificados por grupo, promedio, peso y aporte.

### Lo que se revisó y está bien

- Pesos de la Tabla 1 (60/25/15 y 70/30) y rangos de la Tabla 2.
- Promedio simple por grupo y exclusión de los «No aplica» (RN-90, RN-103, RN-120).
- Reglas de 6.2.1, 6.2.2, 7.1.2–7.1.4, 7.2.1–7.2.4, 7.2.6–7.2.10, 7.3.5, 7.3.7, condición corporal (Tablas 27 y 28), BPUMV y documentos.

---

## 3. Decisiones que conviene confirmar con el director o con el ICA

La norma es inconsistente en estos puntos. El prototipo aplica la lectura de la columna derecha y la deja escrita en *Ayuda › Erratas e interpretaciones*:

| Punto | Lectura aplicada |
|---|---|
| Tabla 3 «Tamaño de la muestra» 5 / 10 frente al texto «5 aves por punto» | **Decidido por la docente revisora:** se aplica la Tabla 3 (10 aves con 200 o más; 5 con menos de 200). La Ilustración 2 define dónde están los 5 puntos de cada galpón. |
| Tabla 1 «≥ 299 patos» | Errata de «≥ 200» |
| Tabla 18: el 60 % aparece en dos niveles | 60 % = 0 (fila «≥ 60 %») |
| Tabla 44: niveles 55 y 20 invertidos | Orden lógico: < 20 % = 55; 20–40 % = 20 |
| Tabla 28: «5 punto» | 55 |
| Tabla 15 remite a la «tabla 5» | Es la tabla de densidades de 6.1.11 |
| Objetivo: «producción porcícola» | Errata; el alcance es patos y gansos |

---

## 4. Administrador

`PERMISOS.admin` ahora incluye Inicio, Fincas, Evaluaciones, Reportes, Usuarios, Parametrización, Bitácora, Ayuda y Mi cuenta (RN-140: «administrador (todo)»). El administrador puede abrir y diligenciar evaluaciones, ver resultados y fichas de las fincas. La prueba de extremo a extremo recorre 12 pantallas con ese perfil.

---

## 5. Centro de ayuda de la norma

Nueva vista `js/vistas/ayuda.js` con ocho secciones y las 58 fichas:

- **La norma**: objetivo, cinco libertades, grupos de medidas, métodos (5.3) y puntuación (5.4), con el texto literal.
- **Fases de la visita** (Ilustración 1) y conducta del evaluador.
- **Muestreo**: Tabla 3, esquemas en SVG de los tres casos (Ilustración 2) e Ilustración 3 tomada del PDF.
- **Cálculo y clasificación**: los 4 pasos, Tablas 1 y 2 con gráficas, calculadora y un ejemplo con los datos reales de EVA-2026-00088.
- **Indicadores**: Tablas 4 y 39 (propósito huevo/carne y si aplica en traspatio).
- **Densidad**: tabla de 6.1.11 con gráfica peso–densidad.
- **Condición corporal**: Ilustración 5 y Tablas 27 y 28.
- **Erratas e interpretaciones**.
- **Ficha de cada indicador**: texto literal de «Descripción del indicador» (extraído del PDF con `herramientas/extraer_descripciones.py`), pregunta, método, unidad, cuándo aplica, cálculo, escala, nota de interpretación y una gráfica (bandas de puntaje por porcentaje, densidad, poceta o condición corporal).
- Botón **Abrir la norma (PDF)** (`src/norma/`).

---

## 6. Datos inventados que se retiraron

- **Inicio**: «38 evaluaciones», «71,2», niveles 4/12/16/6, promedios por medida y «indicadores con más 0» eran fijos. Ahora salen de las evaluaciones y del historial.
- **Gráfica de cada indicador**: mostraba siempre «10/2025: 55» y «04/2026: 100». Ahora muestra las evaluaciones finalizadas anteriores de la misma finca o, si no hay, lo dice.
- **Evolución del productor**: gráfica de línea con las bandas de la Tabla 2.

---

## 7. Validación del prototipo de aves de corral y traspatio

Se ejecutó en Chromium con los 7 roles, se recalculó el resultado de la evaluación de ejemplo y se creó una evaluación de traspatio nueva.

### Lo que funciona y se tomó como referencia

- La aritmética es consistente: el total recalculado por separado (86,06) coincide con el de la aplicación.
- El **administrador ve todos los módulos**: es el modelo que se aplicó a patos y gansos.
- Promedio simple por grupo y pesos de la Tabla 1, igual que en patos y gansos.
- En traspatio limita la muestra a las aves que existen («todas si hay menos»): se adoptó la misma regla.
- La ayuda por indicador incluye escala, fórmula e ilustraciones de la norma.
- No hubo errores de JavaScript en ninguna pantalla.

### Hallazgos para la compañera

| # | Hallazgo | Evidencia | Sugerencia |
|---|---|---|---|
| 1 | **Clasificación sin redondear**: el nivel se calcula con el total sin redondear y se muestra redondeado | Total 89,96 → se ve «90,0 %» y el nivel dice **ALTO** | Clasificar con el total redondeado a 1 decimal (como RN-122) |
| 2 | **Documento pendiente cuenta como cumplido** | En la evaluación de ejemplo, MBG-07 está PENDIENTE y suma 2 puntos (100 %) | Un pendiente debe valer 0 y dejar el resultado provisional hasta que se entregue (Fase IV de la norma) |
| 3 | Los datos viven solo en memoria | Al recargar se pierde lo diligenciado | Guardar en `localStorage` como en patos y gansos |
| 4 | La ayuda está solo dentro de cada indicador | No hay un centro con las Tablas 1–3 ni la clasificación | Puede reutilizar la estructura de `ayuda.js` |
| 5 | El tablero e histórico usan datos semilla | `S.historico` es fijo | Marcarlos como históricos o calcularlos |

No se pudo validar cada umbral de su lista de chequeo porque no se tuvo su metodología (aves de corral v2.0); solo se validó la consistencia interna.

---

## 8. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/js/norma/calculo.js` | Correcciones 1–11, interpolación de densidad, plan de muestreo, detalle del resultado |
| `src/js/datos/norma.js` | Escalas de 6.1.5, 6.2.2, 6.2.10, 6.2.11, 7.1.5; fórmulas; notas de interpretación |
| `src/js/datos/norma_textos.js` | **Nuevo**: descripción literal de los 58 indicadores |
| `src/js/datos/ejemplo.js` | Permisos del administrador |
| `src/js/ui/graficas.js` | **Nuevo**: gráficas SVG |
| `src/js/ui/capas.js` | Ficha completa del indicador |
| `src/js/vistas/ayuda.js` | **Nuevo**: centro de ayuda |
| `src/js/vistas/evaluaciones.js` | Apertura: esquema de muestreo, puntos y aves sin corral, bebederos y comederos en traspatio |
| `src/js/vistas/indicador.js` | Gráficas reales, densidad por especie, «no hay bebederos» |
| `src/js/vistas/inicio.js` | Tablero calculado |
| `src/js/vistas/resultado.js` | Escala de la Tabla 2 y detalle del cálculo |
| `src/js/nucleo/utilidades.js` | Clave de almacenamiento `eba3.` (las muestras cambiaron de tamaño) |
| `src/img/norma/`, `src/norma/` | Ilustraciones 3 y 5 y PDF de la norma |
| `pruebas/prueba_calculo.js` | **Nuevo**: 152 pruebas unitarias |
| `pruebas/prueba_prototipo.py` | Pruebas de ayuda, administrador, muestreo y móvil |

> Como cambió el tamaño de la muestra, los datos guardados en el navegador con la versión anterior no se cargan. Se arranca con los datos de ejemplo.

**Pendiente en el libro de requerimientos:** actualizar RN-105 (muestra de la Tabla 3: 10 aves con 200 o más, 1 por punto; 5 con menos de 200; todas si hay menos), RN-69 (corte único en 200) y RN-155 (la ficha incluye el texto de la norma y la gráfica).

---

## 9. Versión 0.14.0 · Seguimiento y continuidad

Regla del proyecto (no está en la norma): una finca y especie se evalúa por **procesos** con una visita inicial y hasta **5 visitas de seguimiento**.

| Regla | Cómo funciona en el prototipo |
|---|---|
| Crear un seguimiento | Solo si la última visita del proceso está finalizada y no hay otra evaluación abierta de la finca y especie. Se crea desde el resultado, la ficha de la finca o «Nueva evaluación o seguimiento». |
| Retomar | El seguimiento copia respuestas, observaciones, plan de mejora y datos de la apertura de la visita anterior; el inspector actualiza lo que cambió y completa lo pendiente. |
| Histórico | Las visitas finalizadas no se editan. Cada seguimiento guarda una foto de la visita anterior (puntaje por indicador y total) para comparar. |
| Comparación | Cada indicador muestra el puntaje anterior; el resultado muestra la tabla del proceso, la gráfica de evolución y los indicadores que mejoraron, se completaron o bajaron. |
| Límite | Con 5 seguimientos el proceso queda completo y se ofrece «Iniciar nuevo proceso retomando esta evaluación» (o desde cero en «Nueva evaluación»). |

Sugerencia para el libro de requerimientos: nuevas reglas RN-159 a RN-163 con estas filas y una clase `ProcesoEvaluacion` (id, finca, especie, seguimientos usados) relacionada 1 a 1..6 con `Evaluacion` (atributos `visita` y `evaluacionBase`).

---

## 10. Versión 0.15.0 · Decisiones del equipo

| Tema | Decisión | Cómo funciona |
|---|---|---|
| Tamaño de la muestra | 5 aves por punto (texto de 5.6); la Tabla 3 da galpones, puntos y el mínimo | 200 o más: 2 galpones × 5 puntos × 5 aves = **50** (25 por galpón). Menos de 200 con corral: 3 × 5 = **15**. Sin corral: 1–3 puntos y 2–5 aves por punto. Menos aves que la muestra: se evalúan todas |
| Captura en campo | Por galpón, punto y ave | En cada punto: recursos más cercanos (Ilustración 3) y una ficha por ave con 6.2.3 a 6.2.11; «Ave sin hallazgos» marca todo en 100 y CC 3 |
| Dos galpones | Un solo puntaje para la finca | Aves y recursos por punto: promedio de todas las unidades. Jadeo y amontonamiento: suma de conteos. Condiciones (6.1.1, 6.1.4, 6.1.8, 6.1.9, 6.1.12): se califica cada galpón y se promedia |
| Alertas por galpón | Para que el promedio no esconda un galpón malo | Galpón más de 10 puntos por debajo de la finca, o en un nivel más bajo con al menos 5 puntos de diferencia → alerta, observación obligatoria y galpón en el plan de mejora |
| Cumplimiento | Nivel Excelente (≥ 90), ningún indicador en 0 y sin información pendiente | Se valida al finalizar cada visita; si cumple, el proceso queda «Cumplido» y no pide más seguimientos |
| Número de seguimientos | Solo los necesarios: hasta 3, ampliables a 5 | La ampliación la hace el coordinador o el administrador con motivo; agotados, «Cerrado sin cumplir» |
| Resultado final | El de la última visita del proceso | Se muestra en la tarjeta «Resultado final del proceso»; el histórico conserva todas las visitas y la gráfica de evolución |

Para el libro de requerimientos: actualizar RN-105 (muestra) y agregar reglas para el recorrido por punto, el promedio y las alertas por galpón, el criterio de cumplimiento y la ampliación de seguimientos (RN-159 a RN-166), y los atributos `estado`, `maxSeguimientos` y `ampliacion` en `ProcesoEvaluacion`.

## 11. Versión 0.18.0 · Usabilidad y organización

### Funciones del módulo Evaluaciones antes de quitarlo del menú

| Función | Dónde queda |
|---|---|
| Listado de todas las visitas (proceso, visita, avance, puntaje, estado) | Reportes › Consulta por visita (con filtros) e historial de cada finca |
| Nueva evaluación o seguimiento (seguimiento, nuevo proceso retomando, nuevo proceso desde cero; avisos de evaluación abierta, proceso cumplido y ampliación) | Ventana desde Fincas (acción de cada finca y especie) e Inicio; misma lógica (`crearSeguimiento`, `crearProceso`) |
| Apertura, recorrido, indicadores, cierre y resultado | Mismas direcciones `#/eval/…`; ruta Fincas / finca / evaluación |
| Consulta del productor | Fincas e Inicio («Ver avance», «Ver resultados») |
| Direcciones antiguas `#/evaluaciones` y `#/evaluaciones/nueva` | Llevan a Fincas (la segunda abre la ventana) |

Los permisos no cambian: el permiso «evaluaciones» sigue controlando el acceso a las pantallas de la visita.

### Estado de la evaluación por finca (calculado, nunca manual)

- **Por iniciar**: sin evaluaciones, o con una visita en estado «Programada» (aún no se registra nada en ella).
- **En proceso**: la visita abierta ya tiene registros (estado «En proceso»; cambia sola al registrar el primer dato).
- **Finalizada**: la última visita está finalizada.
Cada visita nueva se crea aparte; las finalizadas no se modifican (`prueba_flujo.js` lo verifica).

### Botón «Ayuda» y fichas de los indicadores (verificación antes de quitarlo)

- En la pantalla de un indicador, «Ayuda» abría el mismo panel que «Ficha» (`ayuda(code)`): estaba duplicado. En apertura, recorrido, cierre y resultado solo abría el buscador general de la guía, que sigue en el menú «Ayuda de la norma».
- Las 58 fichas tienen completos: pregunta, texto de la norma, numeral y tabla, medida, grupo productivo, método, unidad de muestreo, cuándo aplica, cálculo y escala; 7 tienen nota de interpretación. Las instrucciones de captura están en la pantalla del indicador y no cambian.
- **Incompleto y corregido sin inventar criterios:** la Ilustración 3 (punto de muestreo) y las interpretaciones del equipo sobre muestreo (5 aves por punto) y varios galpones solo estaban en el centro de ayuda; ahora aparecen en la ficha de los indicadores a los que aplican, con el mismo texto.
- **Pendiente de confirmar (no se modificó):** en patos de traspatio el tratamiento de los animales no se revisa en ningún indicador de la norma.
