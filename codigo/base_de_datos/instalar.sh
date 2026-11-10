#!/usr/bin/env bash
# Crea la base de datos EBA en PostgreSQL y carga esquema, catálogos, metodología y datos de ejemplo.
# Uso:  ./base_de_datos/instalar.sh [nombre_bd]      (usa PGHOST, PGPORT y PGUSER si están definidos)
set -euo pipefail
BD="${1:-eba}"
DIR="$(cd "$(dirname "$0")" && pwd)"
createdb "$BD" 2>/dev/null || echo "La base de datos $BD ya existe: se recrea el esquema eba."
for f in 01_esquema 02_catalogos 03_metodologia 04_datos_ejemplo 05_pruebas 06_actualizacion_v0_24; do
  echo "→ $f.sql"
  psql -d "$BD" -v ON_ERROR_STOP=1 -q -f "$DIR/$f.sql" > /dev/null
done
psql -d "$BD" -c "SET search_path TO eba; SELECT evaluacion, especie, tramo, puntaje_total, nivel, caracter FROM v_resultado_vigente;"
echo "Listo."
