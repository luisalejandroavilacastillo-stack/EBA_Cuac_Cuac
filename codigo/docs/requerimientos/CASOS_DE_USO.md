# Casos de uso · EBA Cuac Cuac · plataforma 1.0

Evaluación del bienestar animal en patos y gansos según la Metodología ICA v1.0 (2024). Este documento refleja la **plataforma 1.0** (Angular + API Node.js + MariaDB), construida a partir del prototipo v0.25 con los mismos perfiles: el coordinador asigna y aprueba, el inspector evalúa lo que le asignan, el productor ve lo aprobado y el administrador gestiona la plataforma. Lo nuevo de la plataforma frente al prototipo es el **ingreso real** (contraseña propia creada con un enlace, código al correo, bloqueo por intentos), el **trabajo sin señal en campo** y la **privacidad por perfil** en el servidor (CU-01 a CU-03, CU-24, CU-25 y los nuevos CU-32 y CU-33).

## Actores

| Actor | Descripción | Módulos (PERMISOS) |
|---|---|---|
| Inspector ICA | Ve solo las fincas que le asignaron. Diligencia la visita en campo (Fases I a IV), propone la fecha del seguimiento, finaliza y la envía a aprobación. Puede reprogramar el seguimiento que le asignaron. En esas fincas ve el historial aprobado de todos los inspectores. | Inicio, Fincas, Evaluaciones, Reportes, Asistente, Ayuda, Mi cuenta |
| Coordinador ICA | Registra fincas, asigna cada inspección (inspector y fecha), reasigna, **aprueba o devuelve** lo que el inspector finaliza, asigna seguimientos y amplía procesos de 3 a 5. Es el único que aprueba. | Inicio, Fincas, Evaluaciones, Reportes, Asistente, Ayuda, Mi cuenta |
| Productor | Ve solo sus fincas. Ve el resultado solo cuando el coordinador lo aprueba; descarga la constancia de cumplimiento o consulta su plan de mejora. No registra fincas ni evalúa. | Inicio, Fincas (las suyas), Evaluaciones (lo aprobado), Asistente, Ayuda, Mi cuenta |
| Administrador | Gestiona usuarios y perfiles, parametrización y bitácora. Tiene además los permisos del coordinador (fincas, asignar, reasignar, seguimientos) **excepto aprobar o devolver**; no recibe avisos de aprobación. | Todos |
| Servicio de IA (secundario) | Gemini, por medio de la API de la plataforma, solo si el servidor tiene la clave (`GEMINI_API_KEY` en el `.env`). La clave nunca llega al navegador; el servidor quita nombres, documentos, correos y teléfonos antes de enviar la pregunta. Sin él, el asistente responde en modo local. | — |
| Servicio de correo (secundario) | Correo institucional del ICA (SMTP). Envía el enlace para crear la contraseña, el código de ingreso y el enlace para restablecerla. | — |

Las cuentas las crea solo el ICA (administrador); no hay registro propio del productor. El nombre del perfil es el mismo para hombres y mujeres.

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
| CU-01 | Ingresar con contraseña y código al correo | ● | ● | ● | ● | [sec_06](../uml/secuencia/sec_06_ingreso.svg) |
| CU-02 | Recuperar contraseña | ● | ● | ● | ● | [act_09](../uml/actividad/act_09_cuenta.svg) |
| CU-03 | Gestionar mi cuenta | ● | ● | ● | ● | — |
| CU-04 | Registrar finca (especies y número de aves) |  | ● |  | ● | [act_02](../uml/actividad/act_02_registro_finca.svg) |
| CU-05 | Consultar ficha e historial de la finca | ● | ● | ● | ● | — |
| CU-06 | Gestionar persona responsable |  | ● |  | ● | — |
| CU-07 | Eliminar o inactivar finca |  | ● |  | ● | [est_04](../uml/estados/est_04_finca.svg) |
| CU-08 | Asignar inspección (inspector y fecha) |  | ● |  | ● | [act_08](../uml/actividad/act_08_asignar_aprobar.svg) |
| CU-09 | Registrar apertura | ● |  |  |  | [act_01](../uml/actividad/act_01_inspeccion_completa.svg) |
| CU-10 | Recorrido por puntos · patos | ● |  |  |  | [act_03](../uml/actividad/act_03_recorrido_patos.svg) |
| CU-11 | Recorrido por puntos · gansos | ● |  |  |  | [act_04](../uml/actividad/act_04_recorrido_gansos.svg) |
| CU-12 | Evaluar indicador de la lista | ● |  |  |  | [sec_01](../uml/secuencia/sec_01_calculo.svg) |
| CU-13 | Consultar ficha del indicador | ● |  |  |  | [act_07](../uml/actividad/act_07_ficha_indicador.svg) |
| CU-14 | Marcar finca que produce huevo | ● |  |  |  | — |
| CU-15 | Finalizar visita y enviar a aprobación | ● |  |  |  | [act_05](../uml/actividad/act_05_cierre_seguimiento.svg) |
| CU-16 | Consultar resultado y plan de mejora | ● | ● | ● | ● | — |
| CU-17 | Programar seguimiento al aprobar | (sistema) | ● |  | ● | [sec_02](../uml/secuencia/sec_02_cierre_seguimiento.svg) |
| CU-18 | Reprogramar seguimiento (con motivo) | ● | ● |  | ● | [act_05](../uml/actividad/act_05_cierre_seguimiento.svg) |
| CU-19 | Ampliar proceso a 5 seguimientos |  | ● |  | ● | [est_02](../uml/estados/est_02_proceso.svg) |
| CU-20 | Consultar tablero de inicio | ● | ● | ● | ● | — |
| CU-21 | Generar reportes | ● | ● |  | ● | — |
| CU-22 | Consultar asistente de la norma | ● | ● | ● | ● | [act_06](../uml/actividad/act_06_asistente.svg) |
| CU-23 | Consultar Ayuda de la norma | ● | ● | ● | ● | — |
| CU-24 | Gestionar usuarios, perfiles y acceso |  |  |  | ● | [est_06](../uml/estados/est_06_cuenta.svg) |
| CU-25 | Parametrizar lista y asistente IA |  |  |  | ● | — |
| CU-26 | Consultar bitácora |  |  |  | ● | — |
| CU-27 | Reasignar inspección |  | ● |  | ● | [act_08](../uml/actividad/act_08_asignar_aprobar.svg) |
| CU-28 | Aprobar o devolver inspección |  | ● |  |  | [act_08](../uml/actividad/act_08_asignar_aprobar.svg) · [sec_05](../uml/secuencia/sec_05_aprobacion.svg) |
| CU-29 | Corregir y reenviar visita devuelta | ● |  |  |  | [est_01](../uml/estados/est_01_evaluacion.svg) |
| CU-30 | Emitir y descargar constancia de cumplimiento | (sistema) | ● | ● | ● | [sec_05](../uml/secuencia/sec_05_aprobacion.svg) |
| CU-31 | Consultar avisos | ● | ● | ● | ● | — |
| CU-32 | Activar la cuenta (crear la contraseña con el enlace) | ● | ● | ● | ● | [act_09](../uml/actividad/act_09_cuenta.svg) |
| CU-33 | Trabajar sin señal en campo | ● |  |  |  | [act_10](../uml/actividad/act_10_sin_senal.svg) |

## Especificaciones

### CU-01 Ingresar con contraseña y código al correo
- **Actor:** todos. **RF:** RF01.
- **Flujo principal:**
  1. Escribe su correo y su contraseña (ya no elige el perfil: el perfil es el de su cuenta).
  2. El sistema valida la contraseña y envía al correo un código de 6 dígitos (vence en 10 minutos).
  3. Escribe el código; el sistema abre la sesión y muestra Inicio según su perfil.
- **Alternos:** contraseña errada (a los 5 intentos la cuenta se bloquea 15 minutos); código errado o vencido («Reenviar código»); cuenta inactiva o sin activar (mensaje genérico, sin revelar si el correo existe); la sesión se cierra tras 15 minutos sin uso (un minuto antes pregunta si sigue ahí) y dura como máximo 12 horas.
- **Reglas:** la sesión vive en una cookie `HttpOnly` (`Secure` con https) que el navegador no puede leer; la contraseña se guarda cifrada (scrypt) y nadie la ve, ni el administrador; los códigos y enlaces se guardan como huella (SHA-256) y no se escriben en los registros. La pantalla de ingreso es pública: no muestra perfiles, usuarios ni correos.

### CU-02 Recuperar contraseña
- **Actor:** todos. **RF:** RF04.
- **Flujo:** pulsa «¿Olvidó su contraseña?», escribe su correo y el sistema envía un enlace de un solo uso (vence en 30 minutos); la respuesta es la misma exista o no el correo. Con el enlace crea una contraseña nueva y se cierran sus sesiones abiertas.
- **Reglas:** la contraseña tiene mínimo 10 caracteres, con letras y números, y no contiene el correo ni el documento.

### CU-03 Gestionar mi cuenta
- **Actor:** todos.
- **Flujo:** consulta sus datos de acceso y cambia su contraseña (pide la actual); al cambiarla se cierran sus otras sesiones.

### CU-04 Registrar finca
- **Actor:** coordinador, administrador. **RF:** RF05 a RF07.
- **Flujo principal:**
  1. Escribe los datos de la finca: nombre, departamento, municipio, vereda y área.
  2. Escribe la persona responsable: nombre, documento, correo, teléfono y la autorización de la Ley 1581.
  3. Marca **Patos y/o Gansos** y escribe el número de aves de cada especie.
  4. El sistema muestra el tramo de cada especie (menos de 200 aves = traspatio; 200 o más = comercial).
  5. El sistema crea la finca ACTIVA, con cada especie «Por asignar».
- **Alternos:** sin especie o con 0 aves, o documento o correo inválidos, el sistema muestra el error en el campo.
- **Reglas:** el inspector y el productor no registran fincas (RN-51 actualizada en la v0.25). Si existe un usuario productor con el mismo documento, la finca queda vinculada a él.

### CU-05 Consultar ficha e historial de la finca
- **Actor:** todos.
- **Flujo:** abre la finca y ve cada especie con su estado, la acción disponible para su perfil, la tendencia y el historial de visitas.
- **Visibilidad:**
  - Coordinador y administrador: todas las fincas y todas las visitas.
  - Inspector: solo las fincas con alguna visita asignada a él; en ellas, sus visitas y las **aprobadas** de cualquier inspector (historial), en solo lectura. No ve visitas ajenas en curso.
  - Productor: solo sus fincas y solo lo aprobado.

### CU-06 Gestionar persona responsable
- **Actor:** coordinador, administrador.
- **Flujo:** edita los datos del titular. Los datos personales no se exportan ni se envían al asistente.

### CU-07 Eliminar o inactivar finca
- **Actor:** coordinador, administrador.
- **Flujo:**
  - Si la finca no tiene evaluaciones, se elimina y queda constancia en la bitácora.
  - Si las tiene, solo se puede inactivar con un motivo: conserva su historial y no recibe asignaciones.

### CU-08 Asignar inspección
- **Actor:** coordinador, administrador. **RF:** RF13.
- **Precondición:** la finca está ACTIVA, tiene la especie y no hay otra visita sin aprobar para esa finca y especie.
- **Flujo principal:**
  1. En la especie «Por asignar» pulsa **Asignar inspector**.
  2. Elige el tipo de visita (seguimiento del proceso, nuevo proceso retomando la última visita o desde cero), la fecha acordada con el productor y el inspector (por defecto, el que ya conoce la finca).
  3. El sistema crea la visita en estado **Programada** (se muestra «Asignada») con los datos de la asignación (quién, cuándo, a quién) y avisa al inspector.
- **Alternos:** fecha anterior a hoy; visita abierta (Asignada, En proceso, Devuelta o Pendiente de aprobación): no se crea otra y se ofrece reasignarla.

### CU-09 Registrar apertura (Fase I)
- **Actor:** inspector asignado.
- **Flujo:**
  1. Registra la persona que atiende y el **número de aves de cada especie**. Si la finca es traspatio de patos, registra también bebederos y comederos.
  2. El sistema calcula el tramo **por especie** y el plan de muestreo: comercial 2 galpones × 5 puntos × 5 aves = 50; traspatio 1 × 3 × 5 = 15; sin corral, de 1 a 3 puntos.
  3. Con el primer dato, la visita pasa de Asignada a **En proceso**.

### CU-10 Recorrido por puntos · patos (Fase II)
- **Actor:** inspector asignado. **Incluye:** CU-12. **Norma:** 6.2, Tabla 1.
- **Flujo:**
  1. Por cada galpón y punto, califica los recursos más cercanos (cama, bebederos, comederos). Con **«Igual en todo el galpón»** copia la respuesta a los puntos del galpón.
  2. Abre la **ficha del ave** (la misma de gansos): un renglón por indicador con botones de texto y color (verde normal, amarillo intermedio, rojo grave), sin números. Patos: tres niveles por indicador y condición corporal 1 a 5.
  3. **«Sin hallazgos · siguiente ave»** deja el ave normal y pasa a la siguiente; con algo marcado, **«Lo demás sin hallazgos»** completa solo lo que falta. En un ave completa el botón desaparece para no borrar hallazgos.
  4. Los hallazgos graves piden observación dentro de la ficha.

### CU-11 Recorrido por puntos · gansos (Fase II)
- **Actor:** inspector asignado. **Incluye:** CU-12. **Norma:** 7.2, Tablas 47 a 53.
- **Flujo:**
  1. Por punto, califica comedero, bebedero y acceso al agua (con «Igual en todo el galpón») y, una vez por galpón, limpieza y elementos de riesgo.
  2. En la **ficha del ave** (la misma de patos) responde cada novedad: «No tiene / Sí tiene»; plumaje «Adecuado / Inadecuado»; lesión en el pico «Sin lesión / Conserva la función / Sin funcionalidad completa».
  3. Los botones rápidos funcionan igual que en patos.
  4. El tratamiento (GA01, GA03, GA04, GA07) se pide en el punto solo para las novedades encontradas.
  5. El sistema cuenta evaluados y con novedad y deriva GR02 a GR05 y GA01 a GA07, también por galpón.

### CU-12 Evaluar indicador de la lista (Fase III)
- **Actor:** inspector asignado. **Extensiones:** CU-13 y CU-14.
- **Flujo:** responde el indicador; el sistema calcula el puntaje (0, 20, 55 o 100) y pasa al siguiente con «Anterior», «Siguiente» o «Siguiente pendiente».

### CU-13 Consultar ficha del indicador
- **Actor:** inspector.
- **Flujo:** el botón **?** abre una capa con la pregunta, el método, el cálculo y la escala del indicador actual, sin salir del punto.

### CU-14 Marcar finca que produce huevo
- **Actor:** inspector.
- **Flujo:** en el indicador del nidal pulsa **«La finca produce huevo: evaluar el nidal»**. El propósito pasa a Huevo y cambia la escala de condición corporal.

### CU-15 Finalizar visita y enviar a aprobación (Fase IV)
- **Actor:** inspector asignado.
- **Precondición:** no hay indicadores obligatorios pendientes y están las firmas (la del productor se recoge en campo).
- **Flujo:**
  1. Revisa la calificación preliminar y el plan de mejora (acción, responsable, plazo).
  2. Si la finca no cumple, **propone** la fecha del siguiente seguimiento acordada con el productor (sugerida: el plazo más lejano del plan + 1 día).
  3. Pulsa **«Finalizar y enviar a aprobación»**. El sistema calcula el resultado con la lógica de siempre, deja la visita en **Pendiente de aprobación** y avisa al coordinador.
- **Reglas:** mientras está pendiente, el inspector no la puede modificar. El seguimiento **no** se crea al finalizar, sino al aprobar (CU-17).

### CU-16 Consultar resultado y plan de mejora
- **Actor:** todos.
- **Flujo:** ve la calificación, el nivel, la comparación con la visita anterior, el plan de mejora, el panel de revisión (enviada, devuelta, aprobada, por quién y cuándo) y el estado del seguimiento.
- **Reglas:** el productor solo ve visitas **aprobadas**; si la finca no cumple ve el panel **«Plan de mejora»** con las acciones y la próxima visita; si cumple, el panel de la constancia (CU-30).

### CU-17 Programar seguimiento al aprobar
- **Actor:** coordinador (en CU-28); administrador al asignar un seguimiento.
- **Disparador:** se aprueba una visita que **no cumple** y quedan seguimientos.
- **Flujo:**
  1. En la ventana de aprobación el sistema muestra la fecha propuesta por el inspector y el inspector por defecto (el mismo de la visita).
  2. El coordinador confirma o cambia la fecha y el inspector.
  3. El sistema crea la visita N de M en estado Programada, retoma lo registrado en la visita anterior, la especie queda en **Seguimiento programado** y avisa al inspector.
- **Reglas:** cumple = puntaje ≥ 90, ningún indicador en 0 y nada pendiente. Máximo 3 seguimientos, ampliables a 5 (CU-19).

### CU-18 Reprogramar seguimiento
- **Actor:** coordinador, administrador y el inspector asignado a ese seguimiento.
- **Precondición:** la visita de seguimiento está Programada y no se ha iniciado.
- **Flujo:** escribe la nueva fecha (no anterior a hoy ni igual a la actual) y el **motivo**. El cambio queda en el historial de reprogramaciones y en la bitácora; si reprograma el inspector, se avisa al coordinador; siempre se avisa al productor.

### CU-19 Ampliar proceso a 5 seguimientos
- **Actor:** coordinador, administrador.
- **Precondición:** el proceso usó 3 seguimientos y no cumple (Requiere ampliación).
- **Flujo:** registra el motivo; el máximo pasa a 5 y se programa el siguiente seguimiento.

### CU-20 Consultar tablero de inicio
- **Actor:** todos.
- **Flujo:** tablero de solo lectura según el perfil:
  - Coordinador: **Por aprobar y por asignar** (pendientes de aprobación, devueltas, especies sin asignar), indicadores y gráficas.
  - Administrador: **Por asignar**, usuarios por perfil y actividad reciente (sin nada por aprobar).
  - Inspector: **Mi trabajo** (asignadas, en proceso, devueltas y seguimientos; vencidas primero) y tareas pendientes.
  - Productor: una tarjeta por finca y especie con el estado («En evaluación», «En revisión del ICA», «Plan de mejora», «Certificada», «Constancia vencida»), el último resultado aprobado y «Descargar constancia».

### CU-21 Generar reportes
- **Actor:** inspector, coordinador, administrador.
- **Flujo:** filtra por periodo, especie, finca o estado; imprime o exporta a CSV sin datos personales; compara visitas.
- **Reglas:** el inspector ve sus visitas y las aprobadas de las fincas que le asignaron.

### CU-22 Consultar asistente de la norma
- **Actor:** todos. **Secundario:** Servicio de IA.
- **Flujo:** el botón flotante abre un panel con sugerencias según el perfil; responde solo sobre la norma y la evaluación, citando el numeral y la página.
- **Reglas:** no envía documento, correo ni teléfono; la bitácora registra la consulta sin el texto de la pregunta.

### CU-23 Consultar Ayuda de la norma
- **Actor:** todos.
- **Flujo:** consulta el documento completo de la norma en su propio módulo.

### CU-24 Gestionar usuarios, perfiles y acceso
- **Actor:** administrador. **RF:** RF02, RF03.
- **Flujo principal:**
  1. Pulsa **Crear usuario** y escribe nombre, tipo y número de documento, correo, teléfono y perfil (no se pide matrícula profesional ni contraseña).
  2. El sistema valida que el correo y el documento no se repitan, crea la cuenta y **envía al correo el enlace para crear la contraseña** (un solo uso, 48 horas). Si es productor, la vincula con las fincas que tengan su mismo documento.
  3. La columna **Acceso** muestra «Pendiente de activación» hasta que la persona crea su contraseña; luego «Activa».
- **Flujos alternos:**
  - **Reenviar enlace:** si el enlace venció («Enlace vencido») o no se envió («Sin enlace»), el administrador envía uno nuevo; el anterior deja de servir.
  - **Editar:** cambia datos y perfil; el cambio de perfil queda en la bitácora.
  - **Inactivar / reactivar:** un usuario inactivo no entra ni recibe asignaciones; al inactivarlo se cierran sus sesiones.
  - **Eliminar:** solo si no tiene historial.
  - Búsqueda por nombre o correo y filtro por perfil.
- **Reglas:** no se cambia el perfil ni se inactiva a un inspector con visitas sin aprobar (primero se reasignan); el administrador no se cambia el perfil ni se inactiva a sí mismo. El primer administrador lo crea la instalación (`ADMIN_CORREO`) y recibe su enlace igual que los demás.

### CU-25 Parametrizar lista y asistente IA
- **Actor:** administrador. **RF:** RF10 a RF12.
- **Flujo:** consulta las versiones publicadas de la lista por especie y los pesos por tramo, y el estado del asistente con IA («Activo» con Gemini o «Modo local»), con el botón **Probar conexión**. La clave de la IA se escribe solo en el `.env` del servidor: no se escribe ni se muestra en la pantalla.

### CU-26 Consultar bitácora
- **Actor:** administrador.
- **Flujo:** consulta las acciones con fecha, usuario y descripción (asignaciones, aprobaciones, devoluciones, reprogramaciones, constancias, usuarios, consultas de reportes y del asistente, sin el texto de la pregunta).
- **Reglas:** el usuario y la hora de cada registro los pone el servidor con la sesión; nadie la edita ni la borra; solo el administrador la consulta.

### CU-27 Reasignar inspección
- **Actor:** coordinador, administrador.
- **Precondición:** la visita está Asignada, En proceso o Devuelta (no enviada a aprobación).
- **Flujo:** elige otro inspector y, si la visita no ha empezado, otra fecha. Se avisa al inspector nuevo y al anterior; lo registrado se conserva.

### CU-28 Aprobar o devolver inspección
- **Actor:** coordinador (solo él).
- **Precondición:** la visita está **Pendiente de aprobación**.
- **Flujo principal (aprobar):**
  1. Abre «Revisar y aprobar» y ve el puntaje calculado automáticamente, si cumple y la fecha de seguimiento propuesta.
  2. Pulsa **Aprobar inspección**. No puede modificar las calificaciones.
  3. La visita queda **Finalizada** (se muestra «Aprobada»), con quién y cuándo la aprobó. Si cumple, se emite la constancia (CU-30); si no, se programa el seguimiento (CU-17).
  4. Se avisa al inspector y al productor, que ya puede ver el resultado.
- **Flujo alterno (devolver):** pulsa **Devolver con observación**, escribe qué se debe corregir (obligatorio) y la visita queda **Devuelta**; se avisa al inspector (CU-29).

### CU-29 Corregir y reenviar visita devuelta
- **Actor:** inspector asignado.
- **Flujo:** ve la observación del coordinador en el cierre, corrige lo indicado y pulsa **«Corregida: reenviar a aprobación»**. La visita vuelve a Pendiente de aprobación y se avisa al coordinador.

### CU-30 Emitir y descargar constancia de cumplimiento
- **Actor:** sistema (al aprobar); productor, coordinador y administrador la descargan.
- **Disparador:** se aprueba una visita en la que la finca **cumple**.
- **Flujo:**
  1. El sistema emite la **Constancia de cumplimiento de bienestar animal**: código consecutivo CER-AAAA-NNNNN, código de verificación, finca, ubicación, titular, especie, propósito y tramo, visita, puntaje y nivel, inspector, coordinador que aprobó, fecha de emisión y vigencia de 1 año.
  2. Avisa al productor («¡Finca certificada!»).
  3. «Descargar constancia» abre la página lista para guardar como PDF o imprimir.
- **Reglas:** una constancia por especie y visita; al vencer se muestra «Constancia vencida» y se requiere una nueva inspección. No hay verificación pública por código.

### CU-31 Consultar avisos
- **Actor:** todos.
- **Flujo:** la campana de Notificaciones muestra los avisos sin leer y las tareas del perfil; al abrir un aviso queda leído.
- **Avisos:** asignación y reasignación (inspector); por aprobar y reprogramaciones (coordinador; el administrador recibe los de gestión pero **no** los de aprobar); devolución y aprobación (inspector); resultado disponible, finca certificada y reprogramación (productor).

### CU-32 Activar la cuenta (crear la contraseña con el enlace)
- **Actor:** todos (la persona a la que el administrador le creó la cuenta). **RF:** RF01, RF02.
- **Flujo principal:**
  1. Abre el enlace que le llegó al correo («Active su cuenta»).
  2. El sistema verifica que el enlace exista, no se haya usado y no haya vencido (48 horas).
  3. Escribe y confirma su contraseña (las reglas se ven mientras la escribe).
  4. El sistema la guarda cifrada, marca la cuenta como activa e invalida el enlace; la persona ya puede ingresar (CU-01).
- **Alternos:** enlace vencido o ya usado («Pida al administrador un enlace nuevo»); contraseña que no cumple las reglas.
- **Reglas:** el enlace es de un solo uso, se guarda solo su huella y no queda en los registros del servidor web.

### CU-33 Trabajar sin señal en campo
- **Actor:** inspector. **RF:** RF14, RF15.
- **Precondición:** el inspector abrió la plataforma con señal al menos una vez en ese equipo (queda guardada la aplicación y la copia de sus datos).
- **Flujo principal:**
  1. Sin señal, abre la plataforma: carga desde el equipo con la última copia de sus fincas y visitas y muestra «Sin señal: está trabajando con los datos guardados en este equipo».
  2. Diligencia la apertura, el recorrido y los indicadores; cada cambio queda guardado en el equipo («Sin conexión: los cambios quedan en este equipo»).
  3. Al volver la señal, la plataforma envía sola lo pendiente y muestra «Guardado».
- **Alternos:** otra persona cambió la visita mientras tanto (por ejemplo, la reasignaron): se carga la versión de la base y se avisa; finalizar y enviar a aprobación (CU-15) necesita señal.
- **Reglas:** la copia de los datos es solo de quien ingresó y se borra al cerrar la sesión; la identidad guardada no incluye correo, documento ni teléfono; sin señal se puede abrir hasta 12 horas después del último ingreso.

## Seguridad y privacidad en la plataforma 1.0

| Tema | Regla |
|---|---|
| Datos por perfil | La API entrega a cada perfil solo lo suyo: el productor, sus fincas (y de las visitas que el ICA aún no aprueba, solo el estado); el inspector, las fincas que tiene asignadas; correo, documento y teléfono de los usuarios, solo al administrador (y a cada persona, los suyos); la bitácora, solo al administrador; los avisos, solo a quien van dirigidos. |
| Cambios | Sin sesión la API no cambia nada (403). Cada cambio lleva la versión del registro: si otra persona lo cambió antes, se rechaza (409) y se carga la versión de la base. |
| Navegador | Política de contenido (CSP) que solo permite el código de la plataforma, cabeceras contra incrustación y rastreo, y protección contra peticiones de otros sitios (CSRF). |
| Producción | La API no arranca en producción con el ingreso de demostración, los datos de ejemplo, la clave de ejemplo de la base, `localhost` como dirección pública o https sin cookie segura. |
| Exportaciones y asistente | El CSV de reportes no trae datos personales; al asistente con IA no se le envían documento, correo ni teléfono, y la bitácora registra la consulta sin el texto. |
