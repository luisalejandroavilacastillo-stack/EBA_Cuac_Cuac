# Imagen del frontend EBA: prototipo v0.24 (en /) y Angular (en /plataforma/), servidos con Nginx. Se construye desde la raíz del proyecto:
#   docker compose build web
# Etapa 1: compila la norma y Angular en modo producción.
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

# Etapa 2: Nginx sirve el prototipo v0.24 en / y la versión Angular en /plataforma/, y reenvía /api a la API.
FROM nginx:1.29-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/prototipo /usr/share/nginx/html
COPY --from=construccion /app/apps/web/dist/web/browser /usr/share/nginx/html/plataforma
EXPOSE 80
