#!/usr/bin/env bash
# Genera SVG y PNG de todos los diagramas de docs/uml/fuentes (Mermaid .mmd y Graphviz .dot).
# Uso: bash herramientas/generar_diagramas.sh   (requiere mmdc · @mermaid-js/mermaid-cli y graphviz)
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=docs/uml/fuentes
CFG=$(mktemp); trap 'rm -f "$CFG"' EXIT
echo '{"theme":"neutral","themeVariables":{"fontFamily":"Arial, Helvetica, sans-serif","fontSize":"14px"}}' > "$CFG"
destino() { case "$1" in cu_*) echo casos_de_uso;; act_*) echo actividad;; est_*) echo estados;; sec_*) echo secuencia;; cls_*) echo clases;; paq_*) echo paquetes;; *) echo otros;; esac; }
for f in "$SRC"/*.mmd; do
  b=$(basename "$f" .mmd); d=docs/uml/$(destino "$b"); mkdir -p "$d"
  mmdc -q -i "$f" -o "$d/$b.svg" -c "$CFG" -b white -w 1400
  mmdc -q -i "$f" -o "$d/$b.png" -c "$CFG" -b white -w 1400 -s 2
  echo "  $d/$b"
done
for f in "$SRC"/*.dot; do
  b=$(basename "$f" .dot); d=docs/uml/$(destino "$b"); mkdir -p "$d"
  dot -Tsvg "$f" -o "$d/$b.svg"; dot -Tpng -Gdpi=150 "$f" -o "$d/$b.png"
  echo "  $d/$b"
done
