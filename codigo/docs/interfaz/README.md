# Diseño de interfaz

- **Mockup de formularios** · [`Mockup_Formularios_EBA_Patos_Gansos_RF01_RF40.xlsx`](Mockup_Formularios_EBA_Patos_Gansos_RF01_RF40.xlsx): matriz requerimiento → formulario, 113 pantallas (F01 a F113): una por numeral de la norma con escala, cálculo y gráfica; el módulo 14 agrega la persona responsable de la finca, el recorrido por galpón, punto y ave, el detalle por galpón con alertas, el proceso de seguimiento y el asistente virtual con su configuración; y la guía de la norma. Las pantallas nuevas de la v0.19 a la v0.24 (registro con especies, recorrido de gansos, asistente flotante, ficha superpuesta y seguimiento programado) se documentan con las capturas 26 a 32 y los casos de uso de [`../requerimientos/CASOS_DE_USO.md`](../requerimientos/CASOS_DE_USO.md).
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

## Capturas (v0.24)

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

### 14 · Ficha del indicador (capa superpuesta)
![Ficha del indicador (capa superpuesta)](capturas/14_ficha_del_indicador.png)

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

### 26 · Registro de finca con especies y número de aves
![Registro de finca con especies y número de aves](capturas/26_registro_finca_especies.png)

### 27 · Recorrido patos
![Recorrido patos](capturas/27_recorrido_patos.png)

### 28 · Recorrido gansos
![Recorrido gansos](capturas/28_recorrido_gansos.png)

### 29 · Asistente de la norma (panel flotante)
![Asistente de la norma (panel flotante)](capturas/29_asistente_flotante.png)

### 30 · Cierre con fecha del seguimiento
![Cierre con fecha del seguimiento](capturas/30_cierre_con_seguimiento.png)

### 31 · Resultado con seguimiento programado
![Resultado con seguimiento programado](capturas/31_resultado_seguimiento_programado.png)

### 32 · Fincas con estado Seguimiento programado
![Fincas con estado Seguimiento programado](capturas/32_fincas_seguimiento_programado.png)
