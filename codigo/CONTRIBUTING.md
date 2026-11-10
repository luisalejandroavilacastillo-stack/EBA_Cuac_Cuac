# Cómo trabajamos con Git

## Ramas

| Rama | Para qué | Quién integra |
|---|---|---|
| `main` | Versiones entregadas. Cada entrega lleva una etiqueta (`v0.12.0` = semana 12). | Solo por *merge* desde `develop` |
| `develop` | Integración del trabajo terminado y probado. | *Merge* desde `feature/*` o `fix/*` |
| `feature/<modulo>-<tema>` | Una funcionalidad o un diseño (p. ej. `feature/bd-esquema`). | Quien la desarrolla |
| `fix/<tema>` | Corrección puntual. | Quien la corrige |
| `docs/<tema>` | Documentación. | Quien la escribe |

Flujo:

```bash
git switch develop && git pull
git switch -c feature/evaluacion-cierre
# ... cambios pequeños con commits frecuentes ...
python pruebas/prueba_prototipo.py         # debe terminar en «Todas las pruebas pasaron.»
git push -u origin feature/evaluacion-cierre
# abrir Pull Request hacia develop; otra persona revisa y aprueba
git switch develop && git merge --no-ff feature/evaluacion-cierre
```

Para una entrega: `git switch main && git merge --no-ff develop && git tag -a v0.N.0 -m "Entrega semana N"`.

## Mensajes de commit

Formato [Conventional Commits](https://www.conventionalcommits.org/es/) en español, en imperativo y con el alcance del módulo:

```
<tipo>(<alcance>): <qué cambia>

<por qué, si no es obvio; referencia a RF, HU, RN o numeral de la norma>
```

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección |
| `refactor` | Reorganización sin cambiar el comportamiento |
| `docs` | Documentación, UML, diseño |
| `test` | Pruebas |
| `chore` | Configuración del repositorio |

Alcances: `prototipo`, `norma`, `evaluacion`, `fincas`, `seguridad`, `bd`, `uml`, `interfaz`, `requerimientos`.

Ejemplo: `feat(evaluacion): calcular automáticamente el nivel de 6.1.12 (HU-84, Tabla 16)`

## Reglas del código

- Un archivo por responsabilidad dentro de `src/js/` (datos, núcleo, norma, ui, vistas); el orden de carga está en `src/index.html`.
- Textos en español, en tercera persona; sin códigos internos (RF, HU, OBS) en las pantallas.
- Los criterios salen de la norma: no se inventan niveles ni umbrales. Si la norma no lo define, se documenta la decisión en `docs/requerimientos/`.
- Nada de datos personales reales en los datos de ejemplo.
- `base_de_datos/03_metodologia.sql`, `diccionario_de_datos.xlsx` y `modelo/` son generados: se cambian con los scripts de `base_de_datos/herramientas/`, no a mano.
