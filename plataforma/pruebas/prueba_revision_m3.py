"""Módulo 3 en Docker: asignar, reasignar, reprogramar, devolver y aprobar en Angular; resultado y constancia.
Activa las cuentas de ejemplo con los enlaces de Mailpit, entra con cada perfil y revisa que Angular muestre
lo mismo que el prototipo (estados por finca y especie, conteos y acciones).
Uso: python3 pruebas/prueba_fincas_m2.py [carpeta_capturas]
Requiere la base con los datos de ejemplo y las cuentas de ejemplo SIN activar (docker compose down -v; up)."""
import json, re, sys, time, urllib.request
from playwright.sync_api import sync_playwright

WEB = "http://localhost:4200"
BASE = WEB + "/plataforma/"
MAIL = "http://localhost:8025/api/v1"
CAP = sys.argv[1] if len(sys.argv) > 1 else None
CLAVE = "Patos2026seguro"
fallas = []


def ok(c, t):
    print(("OK   " if c else "FALLA ") + t)
    if not c:
        fallas.append(t)


def get(url):
    with urllib.request.urlopen(url, timeout=5) as r:
        return json.loads(r.read().decode())


def correo(para, patron, espera=20):
    fin = time.time() + espera
    while time.time() < fin:
        for m in get(f"{MAIL}/messages")["messages"]:
            if any(t["Address"].lower() == para for t in m["To"]):
                g = re.search(patron, get(f"{MAIL}/message/{m['ID']}").get("Text", ""))
                if g:
                    return g.group(1)
                break
        time.sleep(0.5)
    return None


def visible(p, sel, ms=8000):
    try:
        p.wait_for_selector(sel, timeout=ms)
        return True
    except Exception:
        return False


def activar(p, email):
    ruta = correo(email, r"(/plataforma/activar/[A-Za-z0-9_-]+)")
    p.goto(WEB + ruta)
    p.wait_for_selector("#nueva")
    p.fill("#nueva", CLAVE)
    p.fill("#confirmar", CLAVE)
    p.get_by_role("button", name="Activar mi cuenta").click()
    p.wait_for_selector("text=Ya puede ingresar")


def ingresar(p, email):
    p.goto(BASE + "ingreso")
    p.wait_for_selector("#correo")
    p.fill("#correo", email)
    p.fill("#clave", CLAVE)
    p.get_by_role("button", name="Continuar").click()
    p.wait_for_selector(".codigo input")
    c = correo(email, r"es (\d{6})\.")
    for i, d in enumerate(c):
        p.locator(".codigo input").nth(i).fill(d)
    p.wait_for_selector(".rail .nav", timeout=10000)


def estados_angular(p):
    """{(finca, especie): (estado, acciones)} de la tabla de Fincas de Angular."""
    p.goto(BASE + "fincas")
    p.wait_for_selector("tbody.grupo-finca, .tabla-fincas tbody td p", timeout=10000)
    return p.evaluate("""() => { const out = {};
      document.querySelectorAll('tbody.grupo-finca').forEach((tb) => { const id = tb.dataset.finca;
        tb.querySelectorAll('tr').forEach((tr) => { const sp = tr.querySelector('.c-esp').textContent.trim();
          out[id + '|' + sp] = [tr.querySelector('td[data-l=Estado] .etiqueta').textContent.trim(),
            [...tr.querySelectorAll('.col-eval .btn, .col-eval .accion-texto')].map((b) => b.textContent.trim()).join(' + ')]; }); });
      return out; }""")


def estados_prototipo(p):
    p.goto(WEB + "/#/fincas")
    p.wait_for_selector(".tabla-fincas", timeout=15000)
    p.wait_for_timeout(800)
    return p.evaluate("""() => { const out = {};
      document.querySelectorAll('tbody.grupo-finca').forEach((tb) => { const id = tb.dataset.finca;
        tb.querySelectorAll('tr').forEach((tr) => { const sp = tr.querySelector('.c-esp').textContent.trim();
          out[id + '|' + sp] = [tr.querySelector('td[data-l=Estado] .etiqueta').textContent.trim(),
            [...tr.querySelectorAll('.col-eval .btn, .col-eval .accion-texto')].map((b) => b.textContent.trim()).join(' + ')]; }); });
      return out; }""")


def kpis(p):
    return p.evaluate("() => [...document.querySelectorAll('.kpis-tab .kpi')].map((k) => k.querySelector('.l').textContent.trim() + '=' + k.querySelector('.v').textContent.trim())")


with sync_playwright() as pw:
    b = pw.chromium.launch()
    errores = []

    def pagina():
        pg = b.new_context(viewport={"width": 1366, "height": 900}).new_page()
        pg.on("pageerror", lambda e: errores.append(str(e)))
        return pg

    adm = pagina()
    adm.goto(WEB + "/")
    adm.wait_for_timeout(5000)
    activar(adm, "a.rojas@ica.gov.co")
    ingresar(adm, "a.rojas@ica.gov.co")
    for u in adm.evaluate("fetch('/api/usuarios').then((r) => r.json())")["usuarios"]:
        if u["correo"] in ("l.cardenas@ica.gov.co", "c.pena@ica.gov.co", "h.mejia@correo.co"):
            adm.evaluate(f"fetch('/api/usuarios/{u['clave']}/enlace', {{ method: 'POST' }})")
    for e in ("l.cardenas@ica.gov.co", "c.pena@ica.gov.co", "h.mejia@correo.co"):
        activar(pagina(), e)
    co, ins, pro = pagina(), pagina(), pagina()
    ingresar(co, "l.cardenas@ica.gov.co"); ingresar(ins, "c.pena@ica.gov.co"); ingresar(pro, "h.mejia@correo.co")

    def fila(p, finca, sp="Gansos"):
        return p.locator("tbody.grupo-finca", has_text=finca).locator("tr", has_text=sp)

    # 1. Asignar inspección desde Fincas (coordinador)
    co.goto(BASE + "fincas"); co.wait_for_selector("tbody.grupo-finca")
    fila(co, "Finca San Isidro").get_by_role("button", name="Asignar inspector").click()
    ok(visible(co, "text=Asignar inspección"), "se abre la ventana «Asignar inspección»")
    ok("Nuevo proceso desde cero" in co.inner_text(".modal"), "opciones de tipo de visita")
    if CAP: co.screenshot(path=f"{CAP}/asignar.png")
    co.select_option("#ne4", label="Diana Marcela Ortiz")
    co.get_by_role("button", name="Crear evaluación").click()
    ok(visible(co, "text=Inspección asignada a Diana Marcela Ortiz"), "inspección asignada")
    ok(visible(co, "tbody.grupo-finca:has-text('Finca San Isidro') tr:has-text('Gansos'):has-text('Asignada'):has-text('Diana')"), "la fila queda «Asignada» a Diana")
    # 2. Reasignar
    fila(co, "Finca San Isidro").get_by_role("button", name="Reasignar").click()
    co.select_option("#raI", label="Camilo Andrés Peña")
    co.get_by_role("button", name="Guardar").click()
    ok(visible(co, "tbody.grupo-finca:has-text('Finca San Isidro') tr:has-text('Gansos'):has-text('Camilo')"), "reasignada a Camilo")
    ins.goto(BASE + "fincas"); ok(visible(ins, "tbody.grupo-finca:has-text('Finca San Isidro')"), "el inspector ve la finca asignada")
    avisos_ins = ins.evaluate("fetch('/api/sincronizacion').then((r) => r.json()).then((d) => d.colecciones.avisos.map((a) => a.datos).filter((a) => a.para === 'inspector').map((a) => a.txt))")
    ok(any("reasignada a usted" in t for t in avisos_ins), "aviso al inspector de la reasignación")
    # el prototipo ve lo mismo
    ang = estados_angular(co); pro_ = estados_prototipo(co)
    ok(ang == pro_, f"Fincas igual al prototipo tras asignar{'' if ang == pro_ else ' ' + json.dumps([ang, pro_], ensure_ascii=False)}")

    # 3. Devolver y aprobar (la visita EVA-2026-00088 pasa a «Pendiente de aprobación»)
    def poner_pendiente(id="EVA-2026-00088"):
        adm.evaluate("""async (id) => { const d = await (await fetch('/api/sincronizacion')).json(); const r = d.colecciones.evals.find((x) => x.id === id);
          const ev = { ...r.datos, estado: 'Pendiente de aprobación', finalizada: new Date().toISOString(), segFecha: null, constancia: null };
          return (await fetch('/api/sincronizacion/evals/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: r.version, datos: ev }) })).status; }""", id)
    poner_pendiente()
    co.goto(BASE + "visitas/EVA-2026-00088/resultado")
    ok(visible(co, "text=Revisión del coordinador"), "resultado: panel de revisión del coordinador")
    ok(visible(co, ".anillo"), "resultado: puntaje")
    if CAP: co.screenshot(path=f"{CAP}/resultado_revision.png", full_page=True)
    co.get_by_role("button", name="Devolver con observación").click()
    co.get_by_role("button", name="Devolver", exact=True).click()
    ok(visible(co, "text=Escriba la observación para el inspector"), "devolver exige observación")
    co.fill("#obsDev", "Falta la observación del galpón 2")
    co.get_by_role("button", name="Devolver", exact=True).click()
    ok(visible(co, "text=Visita devuelta a Camilo"), "visita devuelta")
    ok(visible(co, "text=El coordinador devolvió la visita"), "resultado muestra la devolución")
    poner_pendiente()
    co.reload(); co.wait_for_selector("text=Aprobar inspección")
    co.get_by_role("button", name="Aprobar inspección").click()
    ok(visible(co, "text=Seguimiento 2 de 3"), "aprobar: propone el seguimiento (no cumple)")
    co.get_by_role("button", name="Aprobar", exact=True).click()
    ok(visible(co, "text=Inspección aprobada. Seguimiento 2 de 3 asignado"), "aprobada y seguimiento programado")
    ok(visible(co, "text=Seguimiento 2 de 3 programado para el"), "resultado: seguimiento programado")
    co.goto(BASE + "fincas"); ok(visible(co, "tbody.grupo-finca:has-text('Granja La Esperanza') tr:has-text('Seguimiento programado')"), "la finca queda «Seguimiento programado»")

    # 4. El inspector reprograma su seguimiento
    ins.goto(BASE + "fincas"); ins.wait_for_selector("tbody.grupo-finca")
    fila(ins, "Granja La Esperanza", "Patos").get_by_role("button", name="Reprogramar").click()
    ins.fill("#rpF", "2027-01-15"); ins.get_by_role("button", name="Guardar fecha").click()
    ok(visible(ins, "text=Escriba el motivo de la reprogramación"), "reprogramar exige motivo")
    ins.fill("#rpM", "El productor pidió otra fecha")
    ins.get_by_role("button", name="Guardar fecha").click()
    ok(visible(ins, "text=reprogramado para el 15/01/2027"), "seguimiento reprogramado por el inspector")

    # 5. Productor: resultado aprobado con plan de mejora; constancia
    pro.goto(BASE + "visitas/EVA-2026-00088/resultado")
    ok(visible(pro, "text=Resultado aprobado por el ICA"), "productor: resultado aprobado")
    ok(visible(pro, ".panel-plan"), "productor: plan de mejora")
    if CAP: pro.screenshot(path=f"{CAP}/resultado_productor.png", full_page=True)
    # una visita que cumple: al aprobarla se emite la constancia
    poner_pendiente("EVA-2026-00065")
    co.goto(BASE + "visitas/EVA-2026-00065/resultado"); co.wait_for_selector("text=Aprobar inspección")
    ok("Cumple los criterios" in co.inner_text("main"), "la visita cumple los criterios")
    co.get_by_role("button", name="Aprobar inspección").click()
    co.get_by_role("button", name="Aprobar", exact=True).click()
    ok(visible(co, "text=la finca cumple. Constancia CER-"), "aprobada: constancia emitida")
    co.get_by_role("link", name="Descargar constancia").click()
    ok(visible(co, "article.constancia"), "página de la constancia")
    ok(re.search(r"CER-\d{4}-\d{5}", co.inner_text("article.constancia")) is not None, "código de la constancia")
    if CAP: co.screenshot(path=f"{CAP}/constancia.png", full_page=True)
    ok(not errores, f"sin errores de JavaScript {errores[:2]}")
    b.close()

print(f"\n{'TODO BIEN' if not fallas else str(len(fallas)) + ' fallas'}")
sys.exit(1 if fallas else 0)
