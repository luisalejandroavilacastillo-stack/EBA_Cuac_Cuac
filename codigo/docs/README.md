# Documentación · EBA Cuac Cuac · plataforma 1.0

Guía de dónde está cada entregable del análisis y diseño. Corresponde a la **plataforma 1.0** (Angular + API Node.js + MariaDB), que reproduce el prototipo v0.25 (perfiles, ficha del ave, constancia) y agrega el ingreso real, el trabajo sin señal y la privacidad por perfil.

| Qué | Dónde |
|---|---|
| Casos de uso: actores, matriz, especificación CU-01 a CU-33, seguridad y privacidad | [`requerimientos/CASOS_DE_USO.md`](requerimientos/CASOS_DE_USO.md) |
| Diagramas de casos de uso por actor | [`uml/casos_de_uso/`](uml/casos_de_uso/) |
| Flujos (actividad): inspección, registro de finca, recorrido de patos y gansos, finalizar, aprobar y seguimiento, asistente, ficha del indicador, asignar y aprobar o devolver, cuenta y contraseña, trabajo sin señal | [`uml/actividad/`](uml/actividad/) |
| Diagramas de estados: evaluación (con pendiente de aprobación y devuelta), proceso de seguimiento, especie, finca, constancia, cuenta de usuario | [`uml/estados/`](uml/estados/) |
| Diagramas de secuencia: cálculo, aprobación con seguimiento, asistente, recorrido de gansos, aprobación con constancia, ingreso con código | [`uml/secuencia/`](uml/secuencia/) |
| Diagramas de clases (dominio y 7 vistas), de paquetes y de despliegue de la plataforma | [`uml/clases/`](uml/clases/) · [`uml/paquetes/`](uml/paquetes/) |
| Índice de todos los diagramas | [`uml/README.md`](uml/README.md) |
| Libro de requerimientos: personas, RF, HU-01 a HU-224, RN-01 a RN-222, clases, trazabilidad | [`requerimientos/`](requerimientos/) |
| Mockup de formularios, 40 capturas del prototipo y capturas de la plataforma 1.0 | [`interfaz/`](interfaz/) |
| Base de datos de la plataforma (MariaDB 11.8): migraciones, ER y diccionario | [`../base_de_datos/mariadb/`](../base_de_datos/mariadb/) |
| Modelo de datos de diseño PostgreSQL (76 tablas), ER y diccionario | [`../base_de_datos/`](../base_de_datos/) |
| Informe de validación contra la norma | [`validacion/INFORME_VALIDACION.md`](validacion/INFORME_VALIDACION.md) |

## Cómo regenerar

```bash
bash herramientas/generar_diagramas.sh                          # diagramas UML (SVG y PNG)
python herramientas/capturar_pantallas.py                       # capturas del prototipo
python herramientas/empaquetar_prototipo.py                     # prototipo en un solo archivo (Prototipo_EBA_Cuac_Cuac.html)
python herramientas/actualizar_libro_v1_0.py                    # libro de requerimientos a la plataforma 1.0
python base_de_datos/herramientas/generar_documentacion.py eba  # ER y diccionario (con la BD instalada)
```

## Puntos pendientes de decisión

- 7.3.2 Plan sanitario «implementado»: queda pendiente cómo verificarlo.
- Interpretaciones de casos que la norma no define en las Tablas 47 a 53: se dejan como están.
- El motor de la plataforma es **MariaDB** (el diseño de 76 tablas sigue en PostgreSQL como referencia del análisis); si el informe del proyecto menciona un solo motor, conviene unificarlo con MariaDB.
