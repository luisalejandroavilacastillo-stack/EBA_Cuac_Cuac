# Historial de versiones

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## 0.24.2 · Registro de fincas solo por el ICA
- El productor ya no ve «Registrar finca»: las fincas las registran el inspector, el coordinador o el administrador (RN-51 y HU-44 ajustadas; CU-04).
- Prueba nueva en `pruebas/prueba_prototipo.py`.

## 0.24.1 · Documentación
- Casos de uso CU-01 a CU-26 con actores, matriz y especificación (`docs/requerimientos/CASOS_DE_USO.md`) y un diagrama por actor.
- Diagramas regenerados desde fuentes (`docs/uml/fuentes`, `herramientas/generar_diagramas.sh`): 7 flujos de actividad, 4 diagramas de estados (con «Seguimiento programado»), 4 secuencias, modelo de dominio, 7 vistas de clases y paquetes. Los diagramas de clases de la v0.17 quedan en `docs/uml/clases/historico_v0_17`.
- Base de datos: `06_actualizacion_v0_24.sql` (aves por especie, proceso de seguimiento y reprogramación, 5 aves por punto, recorrido de gansos, asistente sin texto de preguntas); metodología, ER y diccionario regenerados (73 tablas).
- Libro de requerimientos: HU-177 a HU-192, RN-175 a RN-190 y hojas 12_Casos_de_Uso, 13_Cambios_v0_24 y 14_Diagramas_v0_24.
- Capturas actualizadas (32), con registro por especies, recorrido de patos y gansos, asistente flotante y seguimiento programado.

## 0.24.0
- La norma completa solo se consulta en «Ayuda de la norma» (menú lateral). Se quitan los accesos desde otras pantallas: «Consultar la norma» del recorrido, «Cómo se hace el muestreo (Tabla 3)» en la apertura, «cómo se calcula» en el resultado y los enlaces «Abrir en el centro de ayuda» y «Norma en PDF» de la ficha.
- «Ficha del indicador»: se abre en un panel lateral encima de la pantalla actual (también sobre la ventana de aves o de gansos) y muestra solo el indicador evaluado. En el recorrido cada indicador tiene su botón «?». Al cerrarla se sigue en el mismo punto, sin perder el avance.

## 0.23.1
- Recorrido de gansos: se quita la sección «Observación del grupo»; agresiones, interacción con el humano y comportamientos positivos se evalúan en la lista de indicadores.

## 0.23.0
- Fincas mixtas (decisión del proyecto): el tramo (Tabla 1) y la muestra (Tabla 3) se calculan con las aves de la especie que se inspecciona. Ej.: 200 patos (comercial, 50 aves) y 100 gansos (traspatio, 15 aves, sin gestión). Registro, apertura, ficha y nueva inspección muestran el tramo por especie.
- Gansos: recorrido por puntos con la muestra de la Tabla 3 (la norma pide «inspección visual de una proporción de los gansos acorde con la muestra»). Ganso por ganso se marca solo lo que tiene (heridas, plumaje, podo dermatitis, diarrea, pico, secreciones, cojera); recursos más cercanos por punto y galpón con riesgo; el sistema cuenta y llena los indicadores, con alertas por galpón. Botón «Los gansos restantes, sin novedad».
- 7.2.6 Cojos y 7.2.10 Comportamientos positivos: «gansos evaluados» (muestra), como dice la norma; agresiones (7.2.8) e interacción con el humano (7.2.9) siguen con «animales observados».

## 0.22.2
- Apertura: el número de aves se confirma por especie («Patos en la finca…», «Gansos en la finca…»), con la especie que se inspecciona resaltada. En fincas mixtas se muestra el total y el tramo (Tabla 3). La ventana de nueva inspección muestra las aves de cada especie.

## 0.22.1
- Botones sin numerales: «Anterior», «Siguiente» y «Siguiente pendiente» en el pie del indicador (el numeral y el nombre quedan como ayuda al pasar el cursor); también en los botones del recorrido y en las preguntas sugeridas del asistente.

## 0.22.0
- Asistente de la norma en los cuatro perfiles (se agrega el inspector), en ventana flotante que no saca al usuario de su pantalla.
- Responde según el perfil: inspector (cómo se evalúa: método, muestra, escala, casos dudosos; toma el indicador abierto como contexto), coordinador y administrador (norma y resultados, lenguaje técnico) y productor (qué mejorar y cómo).
- Solo responde sobre la metodología del ICA y las evaluaciones; fuera de tema lo dice con amabilidad. Cita numeral, tabla y página (nuevo js/datos/norma_paginas.js).
- Con IA, la consulta lleva los temas generales de la norma y las fichas relacionadas con la pregunta; sin datos personales.

## 0.21.2
- Gansos: «Gansos evaluados» viene escrito con el tamaño de la muestra del plan (Tabla 3) y avisa si el inspector escribe otro número.

## 0.21.1
- Nidal (6.1.10): si la finca está como de carne, el inspector puede indicar «La finca produce huevo: evaluar el nidal»; con eso se evalúa el nidal y la condición corporal usa la escala de huevo (Tabla 28). Se puede deshacer con «La finca no produce huevo».
- Corrección: «nidales calificados» (antes «nidals»).

## 0.21.0
- Registro de finca más compacto: en «Datos de la finca» se marcan las especies (patos, gansos o las dos) con su número de aves; el tramo (comercial o traspatio) se muestra al momento sumando las dos (Tabla 3).

## 0.20.0
- Seguimiento automático: si la visita no cumple, el cierre pide la fecha de la próxima visita (sugerida: día siguiente al plazo más lejano del plan de mejora; sin plazos, 30 días). Aviso, sin bloquear, si queda antes de ese plazo. Al finalizar, la visita queda «Finalizada» y el seguimiento queda «Programado» con esa fecha.
- Nuevo estado «Seguimiento programado» (Fincas, filtro, Inicio, gráficas). Acción «Iniciar seguimiento»; el productor ve «Ver resultados» y la fecha de la próxima visita.
- Reprogramar la fecha desde la ficha de la finca o desde el resultado. Al ampliar el proceso, el coordinador deja programado el siguiente seguimiento.

## 0.19.5
- Inicio: «Por atender» pasa a «Tareas pendientes · N» (inspector). Cada tarea dice qué falta, la finca y la especie, y se ordena por urgencia (vencidas, antes de cerrar, galpón con alerta, documentos en plazo, decisiones del coordinador). Los documentos muestran «Vence hoy», «Vence mañana» o «Vencido hace N días».

## 0.19.4
- Inicio del inspector: se retira el panel «Visitas programadas»; «Mi trabajo · N» reúne en una sola lista lo que hay por evaluar (vencidas, en proceso, programadas por fecha y por iniciar), con municipio y etiqueta «Vencida hace N días». «Por atender» queda al lado.

## 0.19.3
- Gráficas y comparación entre visitas solo con inspecciones finalizadas (Reportes, informe por finca e Inicio del productor); se retiran los registros de ejemplo «anteriores al sistema».
- Inicio: «Próximas visitas» pasa a «Visitas programadas · N de M fincas».
- Gráfica de evolución: las etiquetas del eje ya no se cortan.

## 0.19.2
- Inicio solo para visualizar: sin botones ni enlaces (Nueva inspección, Ver en Fincas, Continuar inspección, Abrir, Iniciar, Ver mis fincas, Administrar, Ver bitácora, Ver reportes). Se mantiene el selector de periodo del coordinador.

## [0.19.0] · Inicio como tablero (dashboard) por perfil

### Cambiado
- Fila de indicadores clave para todos: fincas activas (inactivas, comerciales y traspatio) y aves registradas (patos y gansos).
- Inspector: por iniciar, en proceso y finalizadas (con % de las fincas activas y enlace a Fincas filtrado); Mi trabajo; Próximas visitas; Por atender (documentos —vencidos si pasó el día hábil—, hallazgos sin observación y galpones con alerta); Mis últimos resultados; Nivel actual de las fincas.
- Coordinador: selector de periodo (últimos 30 días, este año, todo); evaluaciones finalizadas, puntaje promedio y fincas que cumplen; estado de las evaluaciones (barra apilada con leyenda y conteos), nivel actual, procesos de seguimiento, promedio por medida, criterios que requieren atención y alertas.
- Administrador: lo del coordinador más usuarios por rol y actividad reciente de la bitácora.
- Productor: último puntaje y pendientes; tarjeta por finca y especie con el estado del proceso; lo que debe mejorar (los 3 indicadores más bajos con la acción y el plazo del plan); evolución desde la segunda visita.
- Datos siempre reales; sin datos, cada panel lo dice. El tablero se recalcula al abrirlo y si los datos cambian en otra pestaña.
- «En proceso · 0 %» pasa a «apertura hecha · 0 de N indicadores».

## [0.18.3] · Recorrido: tarjetas de aves y ventana que muestra lo que falta

### Cambiado
- Las aves del punto se muestran como tarjetas con su avance («Completa», «6 de 8», «Sin empezar») y un resumen («2 de 5 completas · 1 a medias»); un solo botón dice qué sigue («Evaluar el Ave 1», «Continuar con el Ave 3» o «Revisar aves del punto»).
- La ventana de aves muestra el punto, «Ave 3 de 5» y cuántos indicadores van; marca con «Falta» los que no se han calificado. En la última ave, si el punto quedó completo, ofrece «Punto completo · Ir al siguiente punto»; si faltan recursos, «Volver al punto (faltan recursos)».

## [0.18.2] · Recorrido: aves en ventana flotante y norma en la barra superior

### Cambiado
- Cada punto tiene dos pasos: 1 · recursos más cercanos (en la pantalla) y 2 · aves del punto, que se evalúan en una ventana flotante con pestañas por ave (colores de estado), los indicadores del animal, «Ave sin hallazgos», observaciones de los hallazgos en 0, «Ave anterior» / «Siguiente ave» y «Guardar y volver al punto». Al cerrarla se sigue en el mismo punto con los colores actualizados.
- Los botones de la pantalla pasan a «Punto anterior» / «Siguiente punto» y, en el último, «Continuar con la evaluación por indicador».
- «Consultar la norma» va en la barra superior, donde estaba el antiguo botón «Ayuda» y con su mismo estilo.
- Se quita el botón «Ver ficha».

## [0.18.1] · Recorrido por puntos: estado de cada punto, ficha del punto y jadeo en ventana flotante

### Cambiado
- Cada punto de muestreo (botones y esquema de galpones) y cada ave cambia de color según lo guardado: pendiente (blanco), en proceso (amarillo) y evaluado (verde con ✓); el punto actual lleva contorno oscuro. Leyenda debajo de los puntos.
- La etiqueta «Punto completo» se reemplaza por el botón «Ver ficha»: lista solo los indicadores que se evalúan en ese punto (recursos más cercanos y los de cada ave) con su avance.
- «Terminar recorrido» pasa a «Continuar con la evaluación por indicador» y lleva al primer indicador pendiente (o al cierre).
- Encabezado: se quita el enlace «Cómo se hace el muestreo»; un solo botón «Consultar la norma» abre un panel con el muestreo (5.6 y Tabla 3) y la ficha de cada indicador del recorrido. El botón a la lista se llama «Listado por indicador».
- Jadeo y amontonamiento se califican en una ventana flotante sobre el recorrido; al cerrarla se sigue en el mismo punto y ave.
- Sin cambios: el botón «+ Otro bebedero cercano» (6.1.5 pide revisar de 2 a 4 bebederos por punto), los indicadores y el cálculo.

## [0.18.0] · Usabilidad: Fincas como centro de trabajo, inicio por perfil y reportes

### Cambiado
- **Fincas integra el seguimiento de las evaluaciones.** Cada finca muestra, por especie, el estado calculado con lo guardado (Por iniciar · En proceso · Finalizada) y la acción que corresponde: «Nueva evaluación», «Iniciar evaluación» o «Iniciar seguimiento», «Continuar evaluación» (lleva al primer indicador pendiente) y «Ver resultados» (con «Programar seguimiento» cuando el proceso lo pide). Búsqueda por nombre, filtros por estado con contadores; las fincas inactivas no cuentan.
- **Evaluaciones sale del menú.** Ninguna función se pierde: la nueva evaluación o seguimiento es una ventana que se abre desde Fincas o Inicio (conserva los tres tipos de visita y sus avisos); el listado de todas las visitas pasa a Reportes (consulta por visita) y al historial de cada finca; las direcciones antiguas llevan a Fincas. La ruta de navegación de una evaluación es Fincas / finca / evaluación.
- **Inicio compacto por perfil**: inspector (contadores por estado, «Mi trabajo» y lo que hay por atender), coordinador y administrador (además, nivel actual de las fincas y procesos por ampliar), productor (una tarjeta por finca y especie y la evolución solo si hay dos visitas o más). Sin textos ni periodos fijos.
- **Reportes rediseñado**: filtros por finca, especie, estado, tipo de visita y fechas; indicadores generales; niveles y promedio por medida; criterios con mayor cumplimiento y los que requieren atención; comparación entre visitas (o aviso claro si no hay historial); consulta por visita; informe detallado por finca para imprimir o guardar en PDF; CSV con los filtros aplicados y sin datos personales.
- **Evaluación**: se quita el botón «Ayuda» del encabezado en toda la plataforma (el menú tiene «Ayuda de la norma» y cada indicador su «Ficha del indicador»). El índice marca calificados (✓ con el color del nivel), pendientes, el actual y los que no aplican, con avance numérico y «Ver solo pendientes»; en el celular se pliega. El pie ofrece «Siguiente pendiente». «Indicadores uno por uno» / «Ver indicadores uno por uno» pasa a «Continuar evaluando lista de indicadores» y lleva al primer pendiente (o al cierre).
- **Ficha del indicador**: suma la Ilustración 3 (punto de muestreo) y las interpretaciones del equipo que la afectan (muestreo de 5 aves por punto y varios galpones), que antes solo estaban en el centro de ayuda.
- **Ventanas** por tamaño (pequeña, mediana y ancha) con encabezado y botones fijos y desplazamiento solo en el contenido; a pantalla completa en el celular. El registro de finca usa dos columnas (finca y persona) y cabe sin desplazar en 1366 × 768.
- La ficha de la finca reúne estado de la evaluación, datos y persona en dos columnas, historial con «Ver resultados» por visita y población.

### Agregado
- `js/norma/flujo.js` (estado por finca y especie, siguiente pendiente, paso para continuar) y `js/vistas/reportes.js`.
- `pruebas/prueba_flujo.js` (29 pruebas) y nuevas secciones de extremo a extremo (Fincas, evaluación, reportes, ventanas y móvil).

## [0.15.0] · Recorrido de campo, galpones y cierre por cumplimiento

### Cambiado
- Muestreo: siempre 5 aves por punto (texto de 5.6); la Tabla 3 define galpones y puntos y su tamaño de muestra es el mínimo. 200 o más: 2 × 5 × 5 = 50 aves (25 por galpón); menos de 200 con corral: 3 × 5 = 15; sin corral, sin cambios. Si hay menos aves, se evalúan todas, repartidas entre los puntos.
- Los seguimientos dependen del cumplimiento: al finalizar cada visita se valida (nivel Excelente ≥ 90, ningún indicador en 0 y sin información pendiente). Si cumple, el proceso queda «Cumplido» y no pide más visitas; si no, hasta 3 seguimientos, ampliables a 5 por el coordinador o el administrador con motivo. El resultado final del proceso es el de la última visita.

### Agregado
- Recorrido por galpón, punto y ave (`js/vistas/recorrido.js`): recursos más cercanos al punto (Ilustración 3) y ficha de cada ave con todos los indicadores del animal; botón «Ave sin hallazgos»; observación inmediata de los hallazgos en 0.
- Con 2 galpones: jadeo y amontonamiento se cuentan por galpón; alojamiento, aves por bebedero y por comedero, confort térmico y pocetas se califican en cada galpón y se promedian; alertas cuando un galpón queda por debajo (observación obligatoria para cerrar); detalle por galpón en el resultado y columna «Galpón» en el plan de mejora.
- Estados del proceso: En curso, En seguimiento, Requiere ampliación, Cumplido, Cerrado sin cumplir; tarjeta «Resultado final del proceso».
- Ejemplo de finca que cumple en la visita inicial (EVA-2026-00065, Finca San Isidro).
- Pruebas unitarias (162) y de extremo a extremo del recorrido, los galpones y el ciclo de seguimiento.

## [0.14.1] · Tablero con detalle

### Agregado
- Cada indicador del tablero (evaluaciones registradas o abiertas, puntaje promedio, pendientes y fincas activas) y cada nivel de «Evaluaciones por nivel» se puede abrir para ver qué elementos cuenta, con enlace a cada uno. Los registros anteriores al sistema se identifican como tales y enlazan a la ficha de la finca.

### Cambiado
- Fincas activas cuenta solo las fincas que el usuario puede ver.
- Clave de almacenamiento `eba4.`: al abrir esta versión se cargan los datos de ejemplo con el proceso de seguimiento.

## [0.14.0] · Identidad propia y seguimiento de procesos

### Cambiado
- Se reemplaza el logo del ICA por un logo propio del proyecto (pato y ganso, colores institucionales): `img/logo-eba-color.svg`, `img/logo-eba-blanco.svg` e `img/icono-eba.svg`.

### Agregado
- Procesos de evaluación: visita inicial y hasta 5 visitas de seguimiento por finca y especie para subir el puntaje o completar la información faltante (`js/norma/seguimiento.js`).
- El seguimiento retoma lo registrado en la última visita finalizada (respuestas, observaciones, plan de mejora); las visitas finalizadas no se modifican.
- Cada indicador muestra el puntaje de la visita anterior y si sube o baja; el resultado muestra la tabla y la gráfica del proceso y los indicadores que mejoraron, se completaron o bajaron.
- Agotados los seguimientos, se inicia un proceso nuevo desde cero o retomando la última evaluación.
- Historial por proceso en la ficha de la finca; columna «Proceso y visita» en Evaluaciones.
- Datos de ejemplo: EVA-2026-00072 (visita inicial, finalizada) y EVA-2026-00088 (seguimiento 1 de 5).
- Pruebas de extremo a extremo del ciclo completo (inicial + 5 seguimientos + nuevo proceso).

## [0.13.0] · Cálculos, administrador y ayuda de la norma

Detalle y evidencia en [docs/validacion/INFORME_VALIDACION.md](docs/validacion/INFORME_VALIDACION.md).

### Corregido
- 6.1.5: «No hay suministro de agua» valía 55 (errata de la Tabla 9); ahora 0.
- 6.2.10: mortalidad del 14 % daba 55; ahora ≥ 14 % = 0.
- Un solo corte de 200 aves para tramo, Tabla 1, Tabla 3 y medidas de gestión (antes 199 en el muestreo).
- Muestreo según la Tabla 3 (indicación de la docente): con 200 o más, 2 galpones × 5 puntos y 10 aves (1 por punto); con menos de 200, 3 puntos y 5 aves. Si la especie tiene menos aves, se evalúan todas.
- 6.1.11: la densidad máxima se interpola entre los pesos de la tabla y usa solo los patos de la finca.
- 6.1.6 en traspatio ya no exige registros de tratamiento del agua.
- 6.1.3, 6.1.4 y 6.1.8: se puede registrar que no hay bebederos o comederos (0 puntos).
- 7.2.5: sin lesiones en el pico = 100.
- Redondeo del total exacto a 1 decimal (74,95 quedaba en 74,9 · Medio).
- Gráficas del inicio y de cada indicador ya no usan valores fijos.

### Agregado
- El administrador ve y opera todos los módulos.
- Centro de ayuda con el texto de la norma de los 58 indicadores, Tablas 1–4 y 39, Ilustraciones 2–5, gráficas, calculadora, erratas e interpretaciones y el PDF.
- Detalle del cálculo en el resultado; esquema del muestreo en la apertura; puntos y aves por punto sin corral; bebederos y comederos del predio en traspatio.
- `pruebas/prueba_calculo.js`: 152 pruebas del motor de cálculo frente a las tablas de la norma.
- Informe de validación cruzada con el prototipo de aves de corral y traspatio.

## [0.12.1] · Corrección del plan de muestreo

### Corregido
- El plan de muestreo usa los valores de la Tabla 3 de la norma (5.6): con menos de 199 patos y gansos, 1 galpón o corral, 3 puntos y tamaño de la muestra de 5 aves; con 199 o más, 2 galpones o corrales, 5 puntos por galpón y tamaño de la muestra de 10 aves (antes mostraba 50, al multiplicar 5 aves por punto).
- Las tarjetas de la apertura muestran «Galpones o corrales a inspeccionar», «Puntos por galpón o corral» y «Tamaño de la muestra».
- Base de datos: `plan_muestreo.tamano_muestra` reemplaza `aves_por_punto` y solo acepta las combinaciones de la Tabla 3; datos de ejemplo recalculados.
- Requerimientos (RN-105, HU-64) y Vista 5 del diagrama de clases actualizados.

## [0.12.0] · Entrega semana 12

### Agregado
- Prototipo funcional en HTML, CSS y JavaScript con identidad visual ICA: ingreso con verificación en dos pasos, tablero por rol, notificaciones de pendientes, fincas, evaluación por fases, una pantalla por numeral (6.1.1 a 6.3.10 y 7.1.1 a 7.3.8), cálculo automático del nivel, cierre con validación, resultado con diagnóstico y plan de mejora, ayuda de la norma, reportes, usuarios, bitácora y cuenta.
- Código organizado en módulos (`datos`, `nucleo`, `norma`, `ui`, `vistas`).
- Diseño de la base de datos en PostgreSQL: 67 tablas, reglas de negocio en disparadores, funciones y vistas, catálogos, versión 1.0 de la metodología (58 indicadores), datos de ejemplo y pruebas.
- Diagramas entidad-relación por módulo y diccionario de datos.
- Diagramas de clases (6 vistas), estados de la evaluación, secuencia del cálculo y paquetes del código.
- Libro unificado de requerimientos: personas, RF01–RF40, HU-01 a HU-162, RN-01 a RN-158, clases y trazabilidad.
- Mockup de formularios RF01–RF40 y capturas del prototipo.
- Prueba de extremo a extremo con Playwright.

### Cambiado
- La calificación de los indicadores es automática: el inspector registra lo observado (antes elegía el nivel).
- Estados de la evaluación ajustados a la norma: PROGRAMADA, EN_PROCESO, FINALIZADA y ANULADA.
- Se reemplaza «Sesión segura» por el botón de notificaciones.

### Retirado
- Indicadores «críticos» marcados a mano (HU-129): la norma no los define; el hallazgo es el indicador en 0.
- RF24–RF26, RF37 y RF39: no aplican a la norma.
