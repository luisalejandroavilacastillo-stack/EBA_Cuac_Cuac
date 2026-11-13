#!/usr/bin/env python3
"""Arma el prototipo en un solo archivo HTML (Prototipo_EBA_Cuac_Cuac.html) a partir de src/.
Pone en línea la hoja de estilos, los scripts (en el orden de src/index.html), las imágenes (como data URI)
y la norma en PDF (se abre como blob al hacer clic en cualquier enlace a la norma).
Uso: python herramientas/empaquetar_prototipo.py [salida]   (por defecto ../Prototipo_EBA_Cuac_Cuac.html)"""
import base64, re, sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src"
SALIDA = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC.parent.parent / "Prototipo_EBA_Cuac_Cuac.html"
TIPOS = {".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".webp": "image/webp"}


def data_uri(ruta):
    p = SRC / ruta
    return f"data:{TIPOS[p.suffix]};base64," + base64.b64encode(p.read_bytes()).decode()


def imagenes(texto):
    return re.sub(r"img/[A-Za-z0-9_./-]+\.(?:png|svg|jpg|webp)", lambda m: data_uri(m.group(0)), texto)


html = (SRC / "index.html").read_text(encoding="utf-8")
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">',
              lambda m: "<style>\n" + imagenes((SRC / m.group(1)).read_text(encoding="utf-8")) + "\n</style>", html)
html = re.sub(r'<script src="([^"]+)"></script>',
              lambda m: f"<script>/* {m.group(1)} */\n" + imagenes((SRC / m.group(1)).read_text(encoding="utf-8")).replace("</script", "<\\/script") + "\n</script>", html)
html = imagenes(html)
html = html.replace("<!-- La aplicación se dibuja en #raiz con los scripts de js/.", "<!-- Versión de un solo archivo (v0.13.0): estilos, scripts, imágenes y la norma en PDF van incluidos. La aplicación se dibuja en #raiz.", 1)
PDF = "Metodologia-EBA-Patos-y-Gansos-ICA-2024.pdf"
pdf = base64.b64encode((SRC / "norma" / PDF).read_bytes()).decode()
abrir_pdf = f"""<script>/* Norma en PDF incluida en el archivo: se abre como blob al hacer clic en cualquier enlace a la norma. */
const NORMA_PDF_B64 = "{pdf}";
document.addEventListener("click", (e) => {{
  const a = e.target.closest('a[href*="Metodologia-EBA-Patos-y-Gansos"]'); if (!a) return;
  e.preventDefault();
  if (!window.__pdfURL) {{ const b = atob(NORMA_PDF_B64), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    window.__pdfURL = URL.createObjectURL(new Blob([u], {{ type: "application/pdf" }})); }}
  const w = window.open(window.__pdfURL, "_blank");
  if (!w) {{ const d = document.createElement("a"); d.href = window.__pdfURL; d.download = "{PDF}"; d.click(); }}
}}, true);
</script>
</body>"""
html = html.replace("</body>", abrir_pdf, 1)
SALIDA.write_text(html, encoding="utf-8")
print(f"{SALIDA} · {SALIDA.stat().st_size / 1e6:.1f} MB")
