# Casos de uso · EBA Cuac Cuac v0.24

Evaluación del bienestar animal en patos y gansos según la Metodología ICA v1.0 (2024). Este documento reemplaza la lista de casos de uso anterior a la v0.18 y refleja el prototipo tal como está hoy.

## Actores

| Actor | Descripción | Módulos (PERMISOS) |
|---|---|---|
| Inspector ICA | Registra fincas, hace la visita (Fases I a IV), cierra y programa el seguimiento. | Inicio, Fincas, Evaluaciones, Reportes, Asistente, Ayuda, Mi cuenta |
| Coordinador ICA | Supervisa, consulta resultados y amplía procesos de 3 a 5 seguimientos. | Igual que el inspector |
| Productor | Consulta sus fincas, resultados y plan de mejora; pregunta al asistente. | Inicio, Fincas (solo las suyas), Evaluaciones (lectura), Asistente, Ayuda, Mi cuenta |
| Administrador | Gestiona usuarios, parametrización, bitácora y la clave del asistente IA. Ve todos los módulos. | Todos |
| Servicio de IA (secundario) | Claude API, solo si el administrador lo configura. Nunca recibe documento, correo ni teléfono. | — |

## Diagramas por actor

| Actor | Diagrama |
|---|---|
| Inspector ICA | [SVG](../uml/casos_de_uso/cu_01_inspector.svg) · [PNG](../uml/casos_de_uso/cu_01_inspector.png) |
| Coordinador ICA | [SVG](../uml/casos_de_uso/cu_02_coordinador.svg) · [PNG](../uml/casos_de_uso/cu_02_coordinador.png) |
| Productor | [SVG](../uml/casos_de_uso/cu_03_productor.svg) · [PNG](../uml/casos_de_uso/cu_03_productor.png) |
| Administrador | [SVG](../uml/casos_de_uso/cu_04_administrador.svg) · [PNG](../uml/casos_de_uso/cu_04_administrador.png) |

## Matriz actor × caso de uso

| CU | Nombre | Insp. | Coord. | Prod. | Admin | Flujo |
|---|---|:-:|:-:|:-:|:-:|---|
| CU-01 | Ingresar con doble factor | ● | ● | ● | ● | — |
| CU-02 | Recuperar contraseña | ● | ● | ● | ● | — |
| CU-03 | Gestionar mi cuenta | ● | ● | ● | ● | — |
| CU-04 | Registrar finca (especies y número de aves) | ● | ● |  | ● | [act_02](../uml/actividad/act_02_registro_finca.svg) |
| CU-05 | Consultar ficha e historial de la finca | ● | ● | ● | ● | — |
| CU-06 | Gestionar persona responsable | ● | ● |  | ● | — |
| CU-07 | Eliminar o inactivar finca | ● | ● |  | ● | [est_04](../uml/estados/est_04_finca.svg) |
| CU-08 | Iniciar inspección | ● | ● |  |  | [act_01](../uml/actividad/act_01_inspeccion_completa.svg) |
| CU-09 | Registrar apertura | ● |  |  |  | [act_01](../uml/actividad/act_01_inspeccion_completa.svg) |
| CU-10 | Recorrido por puntos · patos | ● |  |  |  | [act_03](../uml/actividad/act_03_recorrido_patos.svg) |
| CU-11 | Recorrido por puntos · gansos | ● |  |  |  | [act_04](../uml/actividad/act_04_recorrido_gansos.svg) |
| CU-12 | Evaluar indicador de la lista | ● |  |  |  | [sec_01](../uml/secuencia/sec_01_calculo.svg) |
| CU-13 | Consultar ficha del indicador | ● |  |  |  | [act_07](../uml/actividad/act_07_ficha_indicador.svg) |
| CU-14 | Marcar finca que produce huevo | ● |  |  |  | — |
| CU-15 | Cerrar visita y firmar acta | ● | ● |  |  | [act_05](../uml/actividad/act_05_cierre_seguimiento.svg) |
| CU-16 | Consultar resultado y plan de mejora | ● | ● | ● | ● | — |
| CU-17 | Programar seguimiento automático | (sistema) |  |  |  | [sec_02](../uml/secuencia/sec_02_cierre_seguimiento.svg) |
| CU-18 | Reprogramar seguimiento | ● | ● |  |  | [act_05](../uml/actividad/act_05_cierre_seguimiento.svg) |
| CU-19 | Ampliar proceso a 5 seguimientos |  | ● |  | ● | [est_02](../uml/estados/est_02_proceso.svg) |
| CU-20 | Consultar tablero de inicio | ● | ● | ● | ● | — |
| CU-21 | Generar reportes | ● | ● |  | ● | — |
| CU-22 | Consultar asistente de la norma | ● | ● | ● | ● | [act_06](../uml/actividad/act_06_asistente.svg) |
| CU-23 | Consultar Ayuda de la norma | ● | ● | ● | ● | — |
| CU-24 | Gestionar usuarios |  |  |  | ● | — |
| CU-25 | Parametrizar lista y asistente IA |  |  |  | ● | — |
| CU-26 | Consultar bitácora |  |  |  | ● | — |

## Especificaciones

### CU-01 Ingresar con doble factor
- **Actor:** todos. **RF:** RF01.
- **Flujo principal:** 1) Escribe usuario y contraseña. 2) El sistema pide el código de 6 dígitos. 3) Valida el código y abre Inicio según el rol.
- **Alternos:** código errado (se cuentan los intentos); la sesión se cierra tras 15 minutos de inactividad.

### CU-02 Recuperar contraseña
- **Actor:** todos. **RF:** RF04.
- **Flujo:** escribe su correo y el sistema confirma el envío del enlace de recuperación.

### CU-03 Gestionar mi cuenta
- **Actor:** todos.
- **Flujo:** consulta sus datos de acceso y las sesiones activas.

### CU-04 Registrar finca
- **Actor:** inspector, coordinador, administrador. **RF:** RF05 a RF07.
- **Precondición:** sesión activa.
- **Flujo principal:**
  1. Escribe los datos de la finca: nombre, departamento, municipio, vereda y área.
  2. Escribe la persona responsable: nombre, documento, correo, teléfono y la autorización de la Ley 1581.
  3. Marca **Patos y/o Gansos** y escribe el número de aves de cada especie.
  4. El sistema muestra el tramo de cada especie (menos de 200 aves = traspatio; 200 o más = comercial).
  5. El sistema crea la finca ACTIVA. Cada especie recibe valores por defecto: Carne, Semi-intensivo, con corral; los patos además tienen permanencia y cama.
- **Alternos:** sin especie o con 0 aves, o documento o correo inválidos, el sistema muestra el error en el campo.
- **Reglas:** solo el ICA registra fincas (RN-51, decisión del 7 de noviembre de 2026): el productor no ve la opción y la API rechaza el registro con su rol. El registro no pide características de manejo (peso, material de cama, etc.); eso se observa en la visita.

### CU-05 Consultar ficha e historial de la finca
- **Actor:** todos (el productor solo ve sus fincas).
- **Flujo:**
  1. Abre la finca.
  2. Ve cada especie con su estado (Por iniciar, En proceso, Finalizada, Seguimiento programado), la acción disponible, la tendencia y el historial de visitas.

### CU-06 Gestionar persona responsable
- **Actor:** inspector, coordinador, administrador.
- **Flujo:** edita los datos del titular. Los datos personales no se exportan ni se envían al asistente.

### CU-07 Eliminar o inactivar finca
- **Actor:** inspector, coordinador, administrador (el productor no ve la opción).
- **Flujo:**
  - Si la finca no tiene evaluaciones, se elimina y queda una copia en la bitácora.
  - Si las tiene, solo se puede inactivar con un motivo: conserva su historial y no recibe visitas.

### CU-08 Iniciar inspección
- **Actor:** inspector, coordinador. **RF:** RF13.
- **Precondición:** la finca está ACTIVA y tiene la especie.
- **Flujo principal:** pulsa **Nueva inspección**. El sistema crea el proceso (PRC) y la visita inicial (visita 0) en estado Programada.
- **Alternos:** si ya hay una visita Programada o En proceso para esa finca y especie, la abre y no crea otra.

### CU-09 Registrar apertura (Fase I)
- **Actor:** inspector. **Incluye:** CU-08.
- **Flujo:**
  1. Registra la persona que atiende y el **número de aves de cada especie** (pobEsp). Si la finca es traspatio de patos, registra también bebederos y comederos.
  2. El sistema calcula el tramo **por especie**.
  3. El sistema calcula el plan de muestreo: comercial 2 galpones × 5 puntos × 5 aves = 50; traspatio 1 × 3 × 5 = 15; sin corral, de 1 a 3 puntos.

### CU-10 Recorrido por puntos · patos (Fase II)
- **Actor:** inspector. **Incluye:** CU-12. **Norma:** 6.2, Tabla 1.
- **Flujo:**
  1. Por cada galpón y punto, registra ave por ave los indicadores animales.
  2. Registra en el punto los recursos (cama, bebederos, comederos).
  3. Puede abrir la ficha del indicador (CU-13) sin salir del punto.

### CU-11 Recorrido por puntos · gansos (Fase II)
- **Actor:** inspector. **Incluye:** CU-12. **Norma:** 7.2, Tablas 47 a 53.
- **Flujo:**
  1. Por punto, registra el agua, la comida y el bebedero.
  2. Revisa ganso por ganso y marca las novedades GA01 a GA07 (incluye cojera) y si el ave recibe tratamiento (GA01, GA03, GA04, GA07).
  3. El botón **«Los gansos restantes, sin novedad»** completa el punto.
  4. El sistema deriva GR02 a GR05 y GA01 a GA07, también por galpón, y los muestra en solo lectura en la lista. GA08, GA09 y GA10 se evalúan en la lista de chequeo.

### CU-12 Evaluar indicador de la lista (Fase III)
- **Actor:** inspector. **Extensiones:** CU-13 y CU-14.
- **Flujo:**
  1. Responde el indicador.
  2. El sistema calcula el puntaje (0, 20, 55 o 100) y pasa al siguiente con «Anterior», «Siguiente» o «Siguiente pendiente».
  3. En gansos, «Gansos evaluados» viene con el tamaño de la muestra y un aviso si se cambia.

### CU-13 Consultar ficha del indicador
- **Actor:** inspector.
- **Flujo:**
  1. El botón **?** abre una capa superpuesta con la pregunta, el método, el cálculo y la escala del indicador actual.
  2. Esc la cierra; la capa también se cierra al cambiar de pantalla. No sale del punto y no enlaza a la Ayuda ni al PDF.

### CU-14 Marcar finca que produce huevo
- **Actor:** inspector.
- **Flujo:** en el indicador del nidal pulsa **«La finca produce huevo: evaluar el nidal»**. El propósito de la especie pasa a Huevo y cambia la escala de condición corporal.

### CU-15 Cerrar visita y firmar acta (Fase IV)
- **Actor:** inspector. **Incluye:** CU-17.
- **Precondición:** no hay indicadores pendientes.
- **Flujo:**
  1. Revisa la calificación (MBA, MBR y MBG ponderadas por tramo; nivel según la Tabla 2) y las alertas por galpón.
  2. Completa el plan de mejora (acción, responsable, plazo).
  3. Recoge las firmas y pulsa Finalizar.
- **Reglas:** el resultado es provisional si hay documentos pendientes (1 día hábil).

### CU-16 Consultar resultado y plan de mejora
- **Actor:** todos.
- **Flujo:** ve la calificación, el nivel, la comparación con la visita anterior, el plan de mejora y el estado del seguimiento.

### CU-17 Programar seguimiento automático
- **Actor:** sistema, durante CU-15.
- **Disparador:** se cierra una visita que **no cumple**.
- **Flujo:**
  1. El sistema sugiere la fecha: el plazo más lejano del plan de mejora + 1 día, o +30 días si no hay plazos. El inspector la ajusta a lo acordado con el productor.
  2. Si la fecha es anterior al plazo, el sistema muestra un aviso que no bloquea.
  3. Al finalizar, el sistema crea la visita N de M en estado Programada y retoma las respuestas anteriores. La especie queda en **Seguimiento programado**.
- **Reglas:**
  - Cumple = puntaje ≥ 90, ningún indicador en 0 y nada pendiente (regla del proyecto).
  - Máximo 3 seguimientos.

### CU-18 Reprogramar seguimiento
- **Actor:** inspector, coordinador.
- **Precondición:** la visita de seguimiento está Programada y no se ha iniciado.
- **Flujo:** escribe la nueva fecha (no anterior a hoy). El cambio queda en la bitácora.

### CU-19 Ampliar proceso a 5 seguimientos
- **Actor:** coordinador, administrador.
- **Precondición:** el proceso usó 3 seguimientos y no cumple (Requiere ampliación).
- **Flujo:** registra el motivo; el máximo pasa a 5 y se puede programar el siguiente seguimiento.

### CU-20 Consultar tablero de inicio
- **Actor:** todos.
- **Flujo:** ve un tablero de solo lectura, sin botones:
  - indicadores clave (incluye Seguimientos programados);
  - **Mi trabajo**, con las vencidas primero;
  - **Tareas pendientes** (finca · especie, por urgencia);
  - gráficas hechas solo con inspecciones finalizadas.

### CU-21 Generar reportes
- **Actor:** inspector, coordinador, administrador.
- **Flujo:**
  1. Filtra por periodo, especie, finca o estado.
  2. Imprime o exporta a CSV, sin datos personales.
  3. Puede comparar visitas.

### CU-22 Consultar asistente de la norma
- **Actor:** todos. **Secundario:** Servicio de IA.
- **Flujo:**
  1. El botón flotante abre un panel sobre la pantalla actual, con sugerencias según el rol.
  2. El sistema responde solo sobre la norma y la evaluación, citando el numeral y la página. Funciona en modo local, o en modo IA si el administrador lo configuró.
  3. Al productor le explica qué debe mejorar y cómo hacerlo.
- **Reglas:**
  - No envía documento, correo ni teléfono.
  - La bitácora registra la consulta sin el texto de la pregunta.
  - Fuera de tema, responde con el alcance del asistente.

### CU-23 Consultar Ayuda de la norma
- **Actor:** todos.
- **Flujo:** consulta el documento completo de la norma en su propio módulo. Es el único acceso a la Ayuda; durante la evaluación solo existe la ficha del indicador (CU-13).

### CU-24 Gestionar usuarios
- **Actor:** administrador. **RF:** RF02, RF03.
- **Flujo:** crea usuarios, cambia su rol o estado, e inactiva (si tienen historial) o elimina (si no lo tienen).

### CU-25 Parametrizar lista y asistente IA
- **Actor:** administrador. **RF:** RF10 a RF12.
- **Flujo:**
  1. Consulta las versiones publicadas de la lista por especie (no se modifican) y los pesos por tramo.
  2. Configura la clave del asistente IA, que nunca queda en el código.

### CU-26 Consultar bitácora
- **Actor:** administrador.
- **Flujo:** consulta las acciones con fecha, usuario y descripción. La bitácora no guarda los textos de las preguntas al asistente.
