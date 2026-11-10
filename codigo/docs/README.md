# Documentación · EBA Cuac Cuac v0.24

Guía de dónde está cada entregable del análisis y diseño. Todo corresponde al prototipo v0.24.

| Qué | Dónde |
|---|---|
| Casos de uso: actores, matriz, especificación CU-01 a CU-26 | [`requerimientos/CASOS_DE_USO.md`](requerimientos/CASOS_DE_USO.md) |
| Diagramas de casos de uso por actor | [`uml/casos_de_uso/`](uml/casos_de_uso/) |
| Flujos (actividad): inspección, registro de finca, recorrido de patos y gansos, cierre y seguimiento, asistente, ficha del indicador | [`uml/actividad/`](uml/actividad/) |
| Diagramas de estados: evaluación, proceso de seguimiento, especie, finca | [`uml/estados/`](uml/estados/) |
| Diagramas de secuencia: cálculo, cierre con seguimiento, asistente, recorrido de gansos | [`uml/secuencia/`](uml/secuencia/) |
| Diagramas de clases (dominio y 7 vistas) y de paquetes | [`uml/clases/`](uml/clases/) · [`uml/paquetes/`](uml/paquetes/) |
| Índice de todos los diagramas | [`uml/README.md`](uml/README.md) |
| Libro de requerimientos: personas, RF, HU-01 a HU-192, RN-01 a RN-190, clases, trazabilidad | [`requerimientos/`](requerimientos/) |
| Mockup de formularios y 32 capturas del prototipo | [`interfaz/`](interfaz/) |
| Modelo de datos PostgreSQL (73 tablas), ER y diccionario | [`../base_de_datos/`](../base_de_datos/) |
| Informe de validación contra la norma | [`validacion/INFORME_VALIDACION.md`](validacion/INFORME_VALIDACION.md) |

## Cómo regenerar

```bash
bash herramientas/generar_diagramas.sh                          # diagramas UML (SVG y PNG)
python herramientas/capturar_pantallas.py                       # capturas del prototipo
python base_de_datos/herramientas/generar_documentacion.py eba  # ER y diccionario (con la BD instalada)
```

## Puntos pendientes de decisión

- 7.3.2 Plan sanitario «implementado»: queda pendiente cómo verificarlo.
- Interpretaciones de casos que la norma no define en las Tablas 47 a 53: se dejan como están.
- El motor de base de datos del diseño es PostgreSQL; si el informe del proyecto menciona otro motor, conviene unificarlo.
