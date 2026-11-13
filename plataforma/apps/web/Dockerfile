# Imagen del frontend EBA: la plataforma Angular (en /plataforma/) servida con Nginx. Se construye desde la raíz del proyecto:
#   docker compose build web
# Etapa 1: compila la norma y Angular en modo producción.
# CON_PROTOTIPO=si incluye el prototipo v0.25 en / (solo para las pruebas que comparan con él).
ARG CON_PROTOTIPO=no
FROM node:24-slim AS construccion
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/norma packages/norma
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# npm ci instala y, al terminar, compila la norma (script postinstall de la raíz).
RUN npm ci -w @eba/norma -w @eba/web
COPY apps/web apps/web
RUN npm run build -w @eba/web

# Etapa 2: el prototipo v0.25 solo se incluye para las pruebas que comparan con él (CON_PROTOTIPO=si).
FROM nginx:1.29-alpine AS base
# sin la página de bienvenida de Nginx
RUN rm -rf /usr/share/nginx/html/*
FROM base AS prototipo-si
COPY apps/prototipo /usr/share/nginx/html
FROM base AS prototipo-no

# Etapa 3: Nginx sirve la plataforma en /plataforma/ y reenvía /api a la API.
FROM prototipo-${CON_PROTOTIPO}
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/seguridad.conf /etc/nginx/snippets/seguridad.conf
COPY --from=construccion /app/apps/web/dist/web/browser /usr/share/nginx/html/plataforma
EXPOSE 80
