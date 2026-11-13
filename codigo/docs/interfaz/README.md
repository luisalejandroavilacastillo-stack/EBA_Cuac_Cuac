# Diseño de interfaz

- **Mockup de formularios** · [`Mockup_Formularios_EBA_Patos_Gansos_RF01_RF40.xlsx`](Mockup_Formularios_EBA_Patos_Gansos_RF01_RF40.xlsx): matriz requerimiento → formulario, 113 pantallas (F01 a F113): una por numeral de la norma con escala, cálculo y gráfica; el módulo 14 agrega la persona responsable de la finca, el recorrido por galpón, punto y ave, el detalle por galpón con alertas, el proceso de seguimiento y el asistente virtual con su configuración; y la guía de la norma. Las pantallas nuevas de la v0.19 a la v0.24 (registro con especies, recorrido de gansos, asistente flotante, ficha superpuesta y seguimiento programado) se documentan con las capturas 26 a 32; las de la v0.25 (asignar, revisión del coordinador, aprobar, constancia, crear usuario y ficha del ave) con las capturas 30 a 40; y todas con los casos de uso de [`../requerimientos/CASOS_DE_USO.md`](../requerimientos/CASOS_DE_USO.md).
- **Prototipo funcional** · [`../../src/index.html`](../../src/index.html). Las capturas se regeneran con `python herramientas/capturar_pantallas.py`.

## Identidad visual (Manual de Identidad Visual ICA)

| Uso | Color |
|---|---|
| Verde Semilla (menú, encabezados) | `#317330` |
| Verde Campo (100 puntos, Excelente) | `#048C38` |
| Verde Siembra (Alto) | `#86B327` |
| Verde Cosecha (55 puntos, Medio) | `#C6C309` |
| Protección Animal (patrón y acentos) | `#745E35` · `#D8CAAA` |
| Incumplimiento (0 puntos, Bajo) | `#8A3431` |

Tipografía: Nunito Sans (principal) y Lora (alterna). Diseño adaptable: escritorio, tableta y celular (390 px sin desplazamiento horizontal).

## Capturas (v0.25)

### 01 · Ingreso
![Ingreso](capturas/01_ingreso.png)

### 02 · Verificacion dos pasos
![Verificacion dos pasos](capturas/02_verificacion_dos_pasos.png)

### 03 · Inicio inspector
![Inicio inspector](capturas/03_inicio_inspector.png)

### 04 · Notificaciones
![Notificaciones](capturas/04_notificaciones.png)

### 05 · Fincas
![Fincas](capturas/05_fincas.png)

### 06 · Ficha finca
![Ficha finca](capturas/06_ficha_finca.png)

### 07 · Informe finca
![Informe finca](capturas/07_informe_finca.png)

### 08 · Apertura muestreo
![Apertura muestreo](capturas/08_apertura_muestreo.png)

### 09 · Indicador 6.1.12 pocetas
![Indicador 6.1.12 pocetas](capturas/09_indicador_6.1.12_pocetas.png)

### 10 · Indicador 6.2.1 jadeo
![Indicador 6.2.1 jadeo](capturas/10_indicador_6.2.1_jadeo.png)

### 11 · Indicador 6.2.3 por ave
![Indicador 6.2.3 por ave](capturas/11_indicador_6.2.3_por_ave.png)

### 12 · Indicador 6.3.10 medicamentos
![Indicador 6.3.10 medicamentos](capturas/12_indicador_6.3.10_medicamentos.png)

### 13 · Indicador 7.2.1 heridas gansos
![Indicador 7.2.1 heridas gansos](capturas/13_indicador_7.2.1_heridas_gansos.png)

### 14 · Ficha del indicador
![Ficha del indicador](capturas/14_ficha_del_indicador.png)

### 15 · Cierre
![Cierre](capturas/15_cierre.png)

### 16 · Resultado y plan de mejora
![Resultado y plan de mejora](capturas/16_resultado_y_plan_de_mejora.png)

### 17 · Centro de ayuda
![Centro de ayuda](capturas/17_centro_de_ayuda.png)

### 18 · Reportes
![Reportes](capturas/18_reportes.png)

### 19 · Mi cuenta y seguridad
![Mi cuenta y seguridad](capturas/19_mi_cuenta_y_seguridad.png)

### 20 · Inicio coordinadora
![Inicio coordinadora](capturas/20_inicio_coordinadora.png)

### 21 · Inicio productor
![Inicio productor](capturas/21_inicio_productor.png)

### 22 · Usuarios admin
![Usuarios admin](capturas/22_usuarios_admin.png)

### 23 · Bitacora
![Bitacora](capturas/23_bitacora.png)

### 24 · Movil inicio
![Movil inicio](capturas/24_movil_inicio.png)

### 25 · Movil indicador
![Movil indicador](capturas/25_movil_indicador.png)

### 26 · Registro finca especies
![Registro finca especies](capturas/26_registro_finca_especies.png)

### 27 · Recorrido patos
![Recorrido patos](capturas/27_recorrido_patos.png)

### 28 · Recorrido gansos
![Recorrido gansos](capturas/28_recorrido_gansos.png)

### 29 · Asistente flotante
![Asistente flotante](capturas/29_asistente_flotante.png)

### 30 · Cierre finalizar y enviar
![Cierre finalizar y enviar](capturas/30_cierre_finalizar_y_enviar.png)

### 31 · Enviada pendiente de aprobacion
![Enviada pendiente de aprobacion](capturas/31_enviada_pendiente_de_aprobacion.png)

### 32 · Fincas seguimiento programado
![Fincas seguimiento programado](capturas/32_fincas_seguimiento_programado.png)

### 33 · Asignar inspeccion
![Asignar inspeccion](capturas/33_asignar_inspeccion.png)

### 34 · Revision del coordinador
![Revision del coordinador](capturas/34_revision_del_coordinador.png)

### 35 · Aprobar con seguimiento
![Aprobar con seguimiento](capturas/35_aprobar_con_seguimiento.png)

### 36 · Resultado aprobado seguimiento programado
![Resultado aprobado seguimiento programado](capturas/36_resultado_aprobado_seguimiento_programado.png)

### 37 · Constancia de cumplimiento
![Constancia de cumplimiento](capturas/37_constancia_de_cumplimiento.png)

### 38 · Ficha del ave patos
![Ficha del ave patos](capturas/38_ficha_del_ave_patos.png)

### 39 · Ficha del ave gansos
![Ficha del ave gansos](capturas/39_ficha_del_ave_gansos.png)

### 40 · Crear usuario
![Crear usuario](capturas/40_crear_usuario.png)

## Capturas de la plataforma 1.0

Tomadas de la plataforma en Docker con los datos de ejemplo (`python herramientas/capturar_plataforma.py`, con la plataforma recién instalada).

| Captura | Pantalla |
|---|---|
| [`p01_ingreso.png`](capturas_plataforma/p01_ingreso.png) | Ingreso con correo y contraseña (sin perfiles ni usuarios visibles) |
| [`p02_codigo_al_correo.png`](capturas_plataforma/p02_codigo_al_correo.png) | Código de 6 dígitos enviado al correo |
| [`p03_activar_cuenta.png`](capturas_plataforma/p03_activar_cuenta.png) | Activar la cuenta: crear la contraseña con el enlace |
| [`p04_usuarios_acceso.png`](capturas_plataforma/p04_usuarios_acceso.png) | Usuarios con la columna «Acceso» y «Reenviar enlace» |
| [`p05_inicio_coordinador.png`](capturas_plataforma/p05_inicio_coordinador.png) | Inicio del coordinador |
| [`p06_fincas.png`](capturas_plataforma/p06_fincas.png) | Fincas |
| [`p07_apertura_y_muestreo.png`](capturas_plataforma/p07_apertura_y_muestreo.png) | Apertura y plan de muestreo |
| [`p08_indicador.png`](capturas_plataforma/p08_indicador.png) | Indicador con cálculo en vivo y gráfica |
| [`p09_recorrido_patos.png`](capturas_plataforma/p09_recorrido_patos.png) | Recorrido por puntos · patos |
| [`p10_ficha_del_ave.png`](capturas_plataforma/p10_ficha_del_ave.png) | Ficha del ave |
| [`p11_recorrido_gansos.png`](capturas_plataforma/p11_recorrido_gansos.png) | Recorrido por puntos · gansos |
| [`p12_cierre.png`](capturas_plataforma/p12_cierre.png) | Cierre: faltantes, firmas y envío a aprobación |
| [`p13_resultado.png`](capturas_plataforma/p13_resultado.png) | Resultado, plan de mejora y constancia |
| [`p14_reportes.png`](capturas_plataforma/p14_reportes.png) | Reportes |
| [`p15_asistente_flotante.png`](capturas_plataforma/p15_asistente_flotante.png) | Asistente flotante con el contexto del indicador |
| [`p16_ayuda_de_la_norma.png`](capturas_plataforma/p16_ayuda_de_la_norma.png) | Ayuda de la norma con la calculadora |
| [`p17_sin_senal.png`](capturas_plataforma/p17_sin_senal.png) | Trabajo sin señal: aviso y cambios guardados en el equipo |
| [`p18_movil_indicador.png`](capturas_plataforma/p18_movil_indicador.png) | Indicador en el celular |
