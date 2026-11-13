# EBA Cuac Cuac

Evaluación del bienestar animal en patos y gansos según la Metodología ICA v1.0 (2024).

| Carpeta o archivo | Qué contiene |
|---|---|
| [`plataforma/`](plataforma/) | **La plataforma 1.0 para desplegar**: frontend Angular, API Node.js + Express, MariaDB y Docker. Empiece por [`plataforma/README.md`](plataforma/README.md). |
| [`codigo/`](codigo/) | Prototipo validado v0.25 (versión por archivos), sus pruebas y **toda la documentación**: casos de uso, diagramas UML, libro de requerimientos, mockups, capturas, el diseño de base de datos de referencia y la base MariaDB de la plataforma (`codigo/base_de_datos/mariadb/`). |
| `Prototipo_EBA_Cuac_Cuac.html` | El prototipo en un solo archivo: se abre con doble clic, sin instalar nada (guarda en el navegador). Sirve para mostrar el flujo sin servidor. |

## Desplegar

```bash
cd plataforma
cp .env.example .env        # en Windows: copy .env.example .env
# editar .env siguiendo la lista «PRODUCCIÓN» del inicio del archivo:
#   NODE_ENV=produccion, INGRESO_DEMOSTRACION=no, DATOS_EJEMPLO=no, claves nuevas de la base,
#   PUBLICO_URL con la dirección real, COOKIE_SEGURA=si (con https), ADMIN_CORREO y el correo institucional
docker compose up -d --build
```

La plataforma queda en `http://<servidor>:4200/plataforma/` (la dirección raíz lleva allí). El primer administrador (`ADMIN_CORREO`) recibe en su correo el enlace para crear su contraseña; desde Usuarios crea las demás cuentas. Detalles en [`plataforma/README.md`](plataforma/README.md).

Si falta algo de la lista de producción, la API **no arranca** y dice qué corregir (`docker compose logs api`).

## Lo que no está en el repositorio

El archivo `.env` (claves de la base de datos, del correo y de Gemini) no se sube nunca. Cada persona crea el suyo a partir de `plataforma/.env.example`.
