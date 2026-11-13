"""Módulo 7 en Docker (imagen sin el prototipo): instalación nueva con datos de ejemplo cargados por la API, retiro del
prototipo, cabeceras de seguridad, privacidad por perfil, escrituras sin sesión y trabajo sin señal (recargar sin conexión).
Uso: python3 pruebas/prueba_final_m7.py [carpeta_capturas]
Requiere una instalación nueva: docker compose down -v; docker compose up -d (imágenes 1.0.0 sin CON_PROTOTIPO)."""
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


class SinRedireccion(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


ABRIR = urllib.request.build_opener(SinRedireccion)


def pedir(url, metodo="GET", cuerpo=None, cab=None):
    r = urllib.request.Request(url, method=metodo, data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
                               headers={"Content-Type": "application/json", **(cab or {})})
    try:
        with ABRIR.open(r, timeout=8) as x:
            return x.status, dict(x.headers), x.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode()


def get(url):
    return json.loads(pedir(url)[2])


def correo(para, patron, espera=30):
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
    p.goto(WEB + correo(email, r"(/plataforma/activar/[A-Za-z0-9_-]+)"))
    p.wait_for_selector("#nueva")
    p.fill("#nueva", CLAVE); p.fill("#confirmar", CLAVE)
    p.get_by_role("button", name="Activar mi cuenta").click()
    p.wait_for_selector("text=Ya puede ingresar")


def ingresar(p, email):
    p.goto(BASE + "ingreso"); p.wait_for_selector("#correo")
    p.fill("#correo", email); p.fill("#clave", CLAVE)
    p.get_by_role("button", name="Continuar").click()
    p.wait_for_selector(".codigo input")
    for i, d in enumerate(correo(email, r"es (\d{6})\.")):
        p.locator(".codigo input").nth(i).fill(d)
    p.wait_for_selector(".rail .nav", timeout=10000)


# 1. Instalación nueva: la API cargó los datos de ejemplo y el prototipo ya no se publica
st, cab, cuerpo = pedir(WEB + "/")
ok(st == 302 and cab.get("Location") == "/plataforma/", f"la dirección raíz lleva a la plataforma ({st} {cab.get('Location')})")
ok("EBA_BD" not in cuerpo and "arranque.js" not in cuerpo, "el prototipo ya no se publica")
st, cab, _ = pedir(WEB + "/js/arranque.js")
ok(st == 302 and cab.get("Location") == "/plataforma/", f"los archivos del prototipo no están en el servidor ({st})")
st, cab, _ = pedir(BASE)
csp = cab.get("Content-Security-Policy", "")
ok("script-src 'self'" in csp and "frame-ancestors 'self'" in csp, "política de contenido (CSP) en la plataforma")
ok(cab.get("X-Content-Type-Options") == "nosniff" and cab.get("X-Frame-Options") == "SAMEORIGIN" and cab.get("Referrer-Policy") == "same-origin", "cabeceras de seguridad en la plataforma")
st, cab, _ = pedir(BASE + "ngsw.json")
ok(st == 200 and "no-cache" in cab.get("Cache-Control", ""), "el service worker se revisa siempre (ngsw.json sin caché)")
st, _, _ = pedir(WEB + "/api/sincronizacion/fincas/FIN-2099-00001", "PUT", {"version": None, "datos": {"id": "FIN-2099-00001", "nombre": "x", "depto": "x", "mpio": "x", "estado": "ACTIVA", "especies": []}})
ok(st == 403, f"sin sesión la API no cambia datos ({st})")
st, _, _ = pedir(WEB + "/api/sincronizacion/bitacora", "POST", {"entradas": [{"h": "x1", "t": "2026-01-01T00:00:00Z", "u": "Falso", "a": "inventado"}]})
ok(st == 401, f"sin sesión no se escribe en la bitácora ({st})")

with sync_playwright() as pw:
    b = pw.chromium.launch()
    errores = []

    def pagina():
        ctx = b.new_context(viewport={"width": 1366, "height": 900})
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errores.append(str(e)))
        return pg

    adm = pagina()
    activar(adm, "a.rojas@ica.gov.co"); ingresar(adm, "a.rojas@ica.gov.co")
    d = adm.evaluate("fetch('/api/sincronizacion').then((r) => r.json())")
    ok(len(d["colecciones"]["fincas"]) == 4 and len(d["colecciones"]["evals"]) == 4, "datos de ejemplo cargados por la API (4 fincas y 4 visitas)")
    for u in adm.evaluate("fetch('/api/usuarios').then((r) => r.json())")["usuarios"]:
        if u["correo"] in ("c.pena@ica.gov.co", "h.mejia@correo.co", "l.cardenas@ica.gov.co"):
            adm.evaluate(f"fetch('/api/usuarios/{u['clave']}/enlace', {{ method: 'POST' }})")
    for e in ("c.pena@ica.gov.co", "h.mejia@correo.co", "l.cardenas@ica.gov.co"):
        activar(pagina(), e)
    ins, pro, co = pagina(), pagina(), pagina()
    ingresar(ins, "c.pena@ica.gov.co"); ingresar(pro, "h.mejia@correo.co"); ingresar(co, "l.cardenas@ica.gov.co")

    # 2. Privacidad por perfil
    dp = pro.evaluate("fetch('/api/sincronizacion').then((r) => r.json())")
    ok(all(set(u["datos"]) <= {"nombre", "perfil", "estado", "mp"} for u in dp["colecciones"]["usuarios"] if u["datos"].get("nombre") != "Hernán Darío Mejía"), "el productor no recibe correo, documento ni teléfono de los demás usuarios")
    ok(any(u["datos"].get("correo") == "h.mejia@correo.co" for u in dp["colecciones"]["usuarios"]), "cada persona recibe completo su propio registro (Mi cuenta)")
    ok(not dp["bitacora"], "el productor no recibe la bitácora")
    ok(all(f["datos"]["productor"] == "Hernán Darío Mejía" for f in dp["colecciones"]["fincas"]), f"el productor recibe solo sus fincas ({len(dp['colecciones']['fincas'])})")
    abiertas = [e for e in dp["colecciones"]["evals"] if e["datos"]["estado"] != "Finalizada"]
    ok(all(not e["datos"]["resp"] for e in abiertas), "de las visitas sin aprobar, el productor solo ve el estado (sin lo registrado)")
    dc = co.evaluate("fetch('/api/sincronizacion').then((r) => r.json())")
    ok(len(dc["colecciones"]["fincas"]) == 4 and not dc["bitacora"], "el coordinador ve todas las fincas y no la bitácora")
    di = ins.evaluate("fetch('/api/sincronizacion').then((r) => r.json())")
    ok({f["id"] for f in di["colecciones"]["fincas"]} == {e["datos"]["finca"] for e in di["colecciones"]["evals"] if e["datos"]["inspector"] == "inspector"}, "el inspector ve solo las fincas que tiene asignadas")
    ins.evaluate("fetch('/api/sincronizacion/bitacora', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entradas: [{ h: 'falsa1', t: '2020-01-01T00:00:00Z', u: 'Otra persona', a: 'Entrada de prueba' }] }) })")
    bit = adm.evaluate("fetch('/api/sincronizacion').then((r) => r.json()).then((d) => d.bitacora.find((b) => b.a === 'Entrada de prueba'))")
    ok(bit and bit["u"] == "Camilo Andrés Peña" and not bit["t"].startswith("2020"), "la bitácora toma el usuario y la hora del servidor")

    # 3. Trabajo sin señal: la plataforma abre sin conexión, con los datos guardados, y envía lo registrado al volver
    ins.goto(BASE + "visitas/EVA-2026-00088/PG01"); ins.wait_for_selector(".ficha textarea")
    ok(ins.evaluate("navigator.serviceWorker.ready.then(() => true)"), "service worker instalado")
    ins.wait_for_timeout(3000)
    ins.context.set_offline(True)
    ins.reload(); ok(visible(ins, ".ficha textarea", 15000), "sin señal: la pantalla del indicador abre al recargar")
    ok(visible(ins, ".aviso-sin-senal", 4000), "sin señal: avisa que trabaja con los datos del equipo")
    if CAP: ins.screenshot(path=f"{CAP}/sin_senal.png", full_page=True)
    ins.locator(".ficha textarea").first.fill("Registrado sin señal tras recargar")
    ok(visible(ins, "text=Sin conexión", 6000), "lo registrado queda en el equipo")
    ins.goto(BASE + "visitas/EVA-2026-00088/recorrido"); ok(visible(ins, "h1:has-text('Recorrido por puntos')", 10000), "sin señal: se navega a otras pantallas de la visita")
    ins.context.set_offline(False)
    ins.evaluate("window.dispatchEvent(new Event('online'))")
    ins.wait_for_timeout(4000)
    e = adm.evaluate("fetch('/api/sincronizacion').then((r) => r.json()).then((d) => d.colecciones.evals.find((x) => x.id === 'EVA-2026-00088').datos)")
    ok(e["obs"].get("PG01") == "Registrado sin señal tras recargar", "al volver la señal lo registrado llega a la base")
    ins.get_by_role("button", name="Cerrar sesión").first.click()
    ins.locator(".modal").get_by_role("button", name="Cerrar sesión").click()
    ins.wait_for_selector("#correo")
    ok(not ins.evaluate("Object.keys(localStorage).some((k) => k.startsWith('eba.copia.') || k === 'eba.sinsenal')"), "al cerrar la sesión se borra la copia de los datos del equipo")
    ok(not errores, f"sin errores de JavaScript {errores[:2]}")
    b.close()

print(f"\n{'TODO BIEN' if not fallas else str(len(fallas)) + ' fallas'}")
sys.exit(1 if fallas else 0)
