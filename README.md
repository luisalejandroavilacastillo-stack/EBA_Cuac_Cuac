# EBA Cuac Cuac

Evaluación del bienestar animal en patos y gansos según la Metodología ICA v1.0 (2024).

| Carpeta o archivo | Qué contiene |
|---|---|
| [`plataforma/`](plataforma/) | **La aplicación para desplegar**: prototipo conectado a MariaDB, API Node.js + Express, frontend Angular y Docker. Empiece por [`plataforma/README.md`](plataforma/README.md). |
| [`codigo/`](codigo/) | Prototipo validado v0.24 (versión por archivos), pruebas y **toda la documentación**: casos de uso, diagramas UML, requerimientos, mockups, capturas y el diseño de base de datos (`codigo/base_de_datos/`). |
| `Prototipo_EBA_Cuac_Cuac.html` | El prototipo en un solo archivo: se abre con doble clic, sin instalar nada (guarda en el navegador). |

## Desplegar

```bash
cd plataforma
cp .env.example .env        # en Windows: copy .env.example .env
# editar .env: claves nuevas de la base, NODE_ENV=produccion, DATOS_EJEMPLO=no y su propia GEMINI_API_KEY
docker compose up -d --build
```

La aplicación queda en el puerto 4200. Detalles en [`plataforma/README.md`](plataforma/README.md).

> **Importante antes de exponerlo en un servidor:** todavía no hay ingreso real (se entra con el código de prueba 482073) y la API no exige usuario. Úselo solo en una red interna o protegida mientras se implementa el ingreso con contraseña y los permisos por rol.

## Lo que no está en el repositorio

El archivo `.env` (claves de la base de datos y de Gemini) no se sube nunca. Cada persona crea el suyo a partir de `plataforma/.env.example`.
