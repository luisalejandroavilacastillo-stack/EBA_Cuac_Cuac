# EBA Patos y Gansos · ICA

Plataforma para evaluar el bienestar animal en patos y gansos según la **Metodología para evaluar el bienestar animal en patos y gansos, ICA v1.0 (2024)**. Proyecto académico.

El inspector registra en cada indicador lo que observa y la plataforma calcula el nivel con la tabla de la norma. Luego pondera las medidas con la Tabla 1 según el tramo (traspatio o comercial) y clasifica el resultado con la Tabla 2 (Excelente, Alto, Medio o Bajo). El cierre deja un diagnóstico y un plan de mejora acordado con el productor.

> **Estado (v0.25.2):** perfiles reorganizados. El coordinador registra fincas, asigna cada inspección (inspector y fecha), reasigna y aprueba o devuelve; el inspector solo ve lo asignado, llena patos y gansos con la misma ficha del ave y finaliza a «Pendiente de aprobación»; el productor ve solo lo aprobado y descarga su **constancia de cumplimiento**; el administrador gestiona usuarios y tiene los permisos del coordinador menos aprobar. Avisos dentro de la aplicación. Ver [CHANGELOG.md](CHANGELOG.md).
>
> **v0.18.0:** Fincas es el centro de trabajo: cada finca muestra por especie si la evaluación está por iniciar, en proceso o finalizada (calculado con lo guardado) y la acción que sigue; búsqueda, filtros y contadores. Inicio compacto por perfil, Reportes con filtros, comparación entre visitas, criterios destacados, informe por finca y exportación; avance real en la evaluación con «siguiente pendiente». **v0.17:** datos de la persona responsable de la finca y asistente para el productor. **v0.15.0:** recorrido de campo por galpón, punto y ave (50 aves, 5 por punto), promedio y alertas por galpón y cierre del proceso por cumplimiento. **v0.14.0:** logo propio y procesos con hasta 5 visitas de seguimiento. **v0.13.0:** cálculos revisados contra la norma (162 pruebas), administrador con acceso a todos los módulos y centro de ayuda con la norma, tablas y gráficas. Ver [docs/validacion/INFORME_VALIDACION.md](docs/validacion/INFORME_VALIDACION.md).
>
> **Semana 12:** prototipo funcional en HTML, CSS y JavaScript sin servidor (guarda en el navegador), diseño UML completo y diseño de la base de datos probado en PostgreSQL.

## Contenido del repositorio

```
├── src/                     Prototipo funcional (abrir src/index.html)
│   ├── index.html
│   ├── css/estilos.css      Identidad visual ICA (verdes institucionales, Nunito Sans y Lora)
│   ├── img/                 Logo del proyecto (pato y ganso) e ilustraciones de la norma
│   └── js/
│       ├── datos/           norma.js (58 indicadores), ejemplo.js, semilla.js
│       ├── nucleo/          utilidades.js, sesion.js
│       ├── norma/           calculo.js (reglas, muestreo, pesos, resultado), seguimiento.js (procesos), flujo.js (estado por finca)
│       ├── ui/              capas.js, iconos.js, estructura.js, graficas.js, boton-asistente.js
│       ├── vistas/          ingreso, inicio, fincas, evaluaciones, indicador, recorrido, recorrido_ganso, resultado, reportes, asistente, asistente_norma, administracion, ayuda
│       └── app.js           enrutador
├── base_de_datos/           Diseño de la BD: SQL, diagramas ER, diccionario de datos
├── docs/
│   ├── uml/                 v0.25: casos de uso por actor, 8 flujos, 5 diagramas de estados, 5 secuencias, 8 vistas de clases y paquetes (SVG y PNG)
│   ├── interfaz/            Mockup de formularios RF01–RF40 y 40 capturas del prototipo
│   └── requerimientos/      Casos de uso CU-01 a CU-31 y libro unificado: personas, RF, HU-01 a HU-212, RN-01 a RN-208, clases
├── pruebas/                 Prueba de extremo a extremo del prototipo (Playwright)
└── herramientas/            Capturas de pantalla, diagramas (generar_diagramas.sh) y actualización del libro
```

## Cómo ejecutar el prototipo

1. Abrir `src/index.html` en Chrome, Edge o Firefox. No necesita servidor ni instalación.
2. Elegir un perfil (Inspector ICA, Coordinador ICA, Productor o Administrador) y escribir el correo del usuario (viene uno de ejemplo; otros: d.ortiz@ica.gov.co, rosa.quintero@correo.co).
3. Contraseña `Ica2026*` · código de verificación `482073`.

Lo diligenciado se guarda en el navegador. «Restablecer datos de ejemplo» está en *Mi cuenta y seguridad*.

| Qué probar | Dónde |
|---|---|
| Inicio por perfil (contadores por estado, trabajo y pendientes) | Inicio |
| Estado de la evaluación por finca y especie, búsqueda y filtros | Fincas |
| Nueva evaluación o seguimiento | Fincas › botón de la finca (o *Nueva evaluación* en Inicio) |
| Reportes: filtros, comparación entre visitas, criterios, informe por finca y CSV | Reportes |
| Notificaciones (visitas, evaluaciones en proceso, observaciones y documentos pendientes) | Botón *Notificaciones* |
| Cálculo automático de un indicador y avance de la evaluación | Fincas › Granja La Esperanza › Continuar evaluación |
| Ficha de la norma de cada indicador | Botón *Ficha del indicador* |
| Norma, tablas, gráficas, calculadora y erratas | Ayuda de la norma |
| Todos los módulos con el perfil Administrador | Menú lateral |
| Cierre con validación y firmas | EVA-2026-00088 › Ir al cierre |
| Resultado, diagnóstico y plan de mejora | EVA-2026-00088 › Resultado |
| Eliminar sin historial o inactivar | Fincas › ficha · Usuarios (perfil Administrador) |
| Recorrido por galpón, punto y ave | EVA-2026-00088 › Apertura › Ir al recorrido por puntos |
| Seguimiento según cumplimiento (3, ampliable a 5) | EVA-2026-00088 › Resultado · EVA-2026-00065 (proceso cumplido) |

## Base de datos

```bash
./base_de_datos/instalar.sh eba     # PostgreSQL 14+; crea el esquema eba, carga datos y ejecuta pruebas
```

Ver [`base_de_datos/README.md`](base_de_datos/README.md): modelo ER por módulo, diccionario de datos y decisiones de diseño.

## Pruebas

```bash
pip install playwright && playwright install chromium   # una sola vez
node pruebas/prueba_calculo.js                            # 169 pruebas del cálculo frente a la norma
node pruebas/prueba_asistente.js                          # 56 pruebas: persona de la finca y asistente
node pruebas/prueba_flujo.js                              # 29 pruebas: estado por finca, siguiente pendiente y reportes
python pruebas/prueba_prototipo.py                        # extremo a extremo: ingreso, 58 pantallas, fincas, evaluación, reportes, ventanas, asistente, móvil
psql -d eba -f base_de_datos/05_pruebas.sql               # reglas de la base de datos
```

## Trazabilidad

| Módulo | Requerimientos | Historias | Reglas | Clases | Tablas |
|---|---|---|---|---|---|
| Administrador | RF01–RF04 | HU-01 a HU-43 | RN-01 a RN-50 | Vistas 1 y 2 | 18 |
| Unidades productivas | RF05–RF08 | HU-44 a HU-69 | RN-51 a RN-79 | Vista 3 | 15 |
| Evaluación | RF10–RF23 | HU-70 a HU-131 | RN-80 a RN-132 | Vistas 4 y 5 | 30 |
| Seguimiento y reportes | RF27–RF36, RF40 | HU-132 a HU-162 | RN-133 a RN-158 | Vista 6 | 4 |

Se omiten RF24 a RF26 (recomendaciones con IA), RF37 (certificación) y RF39 (multi-especie) porque la norma no los contempla; RF09 queda pendiente.

## Trabajo con Git

Ramas `main` (entregas), `develop` (integración) y `feature/*` por módulo. Ver [CONTRIBUTING.md](CONTRIBUTING.md) y el historial de versiones en [CHANGELOG.md](CHANGELOG.md).

## Créditos

- Norma: Instituto Colombiano Agropecuario (ICA), *Metodología para evaluar el bienestar animal en patos y gansos*, versión 1.0, 2024.
- Guía de requerimientos: PhD. Paola Andrea Valencia A.
- Logos e identidad visual: Manual de Identidad Visual del ICA (uso académico).
