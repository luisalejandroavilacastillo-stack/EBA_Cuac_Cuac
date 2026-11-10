# Imagen de la API EBA (Node.js + Express). Se construye desde la raíz del proyecto:
#   docker compose build api
# Etapa 1: compila el paquete compartido de la norma.
FROM node:24-slim AS construccion
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/norma/package.json packages/norma/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts -w @eba/norma
COPY packages/norma packages/norma
RUN npm run build -w @eba/norma

# Etapa 2: solo lo necesario para ejecutar (express, mariadb y la norma compilada).
FROM node:24-slim
ENV NODE_ENV=produccion TZ=America/Bogota EN_DOCKER=1
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/norma/package.json packages/norma/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --ignore-scripts -w @eba/api && npm cache clean --force
COPY --from=construccion /app/packages/norma/dist packages/norma/dist
COPY apps/api/src apps/api/src
COPY apps/api/bd apps/api/bd
WORKDIR /app/apps/api
USER node
EXPOSE 3085
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3085/api/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/EBA_patosgansos.js"]
