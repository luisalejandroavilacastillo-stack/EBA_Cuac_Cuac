"""Módulo 2 en Docker: Inicio por perfil y Fincas (lista, registro y ficha) en Angular, comparados con el prototipo.
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

    # 0. El prototipo carga los datos de ejemplo; el administrador activa su cuenta y envía los enlaces a los demás
    adm = pagina()
    adm.goto(WEB + "/")
    adm.wait_for_timeout(5000)
    activar(adm, "a.rojas@ica.gov.co")
    ingresar(adm, "a.rojas@ica.gov.co")
    usuarios = adm.evaluate("fetch('/api/usuarios').then((r) => r.json())")["usuarios"]
    for u in usuarios:
        if u["correo"] in ("l.cardenas@ica.gov.co", "c.pena@ica.gov.co", "d.ortiz@ica.gov.co", "h.mejia@correo.co"):
            adm.evaluate(f"fetch('/api/usuarios/{u['clave']}/enlace', {{ method: 'POST' }}).then((r) => r.status)")
    for e in ("l.cardenas@ica.gov.co", "c.pena@ica.gov.co", "h.mejia@correo.co"):
        activar(pagina(), e)

    # 1. Cada perfil: Angular muestra lo mismo que el prototipo
    perfiles = [("administrador", adm, None), ("coordinador", pagina(), "l.cardenas@ica.gov.co"), ("inspector", pagina(), "c.pena@ica.gov.co"), ("productor", pagina(), "h.mejia@correo.co")]
    for nombre, p, email in perfiles:
        if email:
            ingresar(p, email)
        p.goto(BASE + "inicio")
        p.wait_for_selector(".kpis-tab .kpi", timeout=10000)
        ka = kpis(p)
        if CAP:
            p.wait_for_timeout(400)
            p.screenshot(path=f"{CAP}/inicio_{nombre}.png", full_page=True)
        ang = estados_angular(p)
        if CAP and nombre == "coordinador":
            p.screenshot(path=f"{CAP}/fincas_{nombre}.png", full_page=True)
        pro = estados_prototipo(p)
        ok(ang == pro and len(ang) > 0, f"{nombre}: Fincas igual al prototipo ({len(ang)} filas){'' if ang == pro else ' ANG=' + json.dumps(ang, ensure_ascii=False) + ' PRO=' + json.dumps(pro, ensure_ascii=False)}")
        p.goto(WEB + "/#/inicio")
        p.wait_for_selector(".kpis-tab .kpi", timeout=15000)
        kp = kpis(p)
        ok(ka == kp, f"{nombre}: tarjetas del Inicio iguales al prototipo {ka}{'' if ka == kp else ' ≠ ' + str(kp)}")

    # 2. Coordinador: bandeja, ficha, persona responsable, registro de finca
    co = perfiles[1][1]
    co.goto(BASE + "inicio")
    co.wait_for_selector(".kpis-tab .kpi")
    ok("Por aprobar y por asignar" in co.inner_text("main"), "coordinador: bandeja «Por aprobar y por asignar»")
    adm.goto(BASE + "inicio")
    adm.wait_for_selector(".kpis-tab .kpi")
    txt = adm.inner_text("main")
    ok("Por asignar" in txt and "Por aprobar y por asignar" not in txt and "Actividad reciente" in txt and "Usuarios" in txt, "administrador: solo «Por asignar», usuarios y actividad")
    co.goto(BASE + "fincas")
    co.wait_for_selector("tbody.grupo-finca")
    primera = co.locator("tbody.grupo-finca .enlace-finca").first
    nombre_finca = primera.inner_text()
    primera.click()
    ok(visible(co, ".panel-flujo .flujo-linea"), f"ficha de «{nombre_finca}» con su evaluación")
    ok(visible(co, "text=Historial ·"), "ficha: historial por especie")
    if CAP:
        co.screenshot(path=f"{CAP}/ficha_coordinador.png", full_page=True)
    ok("•••" in co.inner_text("#titular"), "ficha: datos personales enmascarados")
    co.get_by_role("button", name="Ver datos completos").click()
    ok(visible(co, "text=La consulta quedó en la bitácora"), "ver datos completos queda en la bitácora")
    # registro
    co.goto(BASE + "fincas")
    co.get_by_role("button", name="Registrar finca").click()
    co.wait_for_selector("#fn1")
    co.fill("#fn1", "Finca La Prueba")
    co.select_option("#fn2", index=1)
    co.fill("#fn3", "Paipa")
    co.check("#fs_pato")
    co.fill("#fpato_n", "250")
    ok("Comercial" in co.inner_text(".tramo-reg"), "registro: calcula el tramo (250 patos = comercial)")
    co.get_by_role("button", name="Registrar finca").last.click()
    ok(visible(co, "text=Revise los datos de la persona responsable"), "registro: valida la persona responsable")
    co.fill("#tn", "Marta Lucía Gómez")
    co.fill("#td", "52123456")
    co.fill("#tc", "marta.gomez@correo.co")
    co.fill("#tf", "3101234567")
    co.check("input[name=ta]")
    co.get_by_role("button", name="Registrar finca").last.click()
    ok(visible(co, "text=Finca registrada (comercial)"), "registro de finca guardado")
    ok(visible(co, "tbody.grupo-finca:has-text('Finca La Prueba'):has-text('Por asignar')"), "la finca nueva aparece «Por asignar» con «Asignar inspector»")
    co.goto(WEB + "/#/fincas")
    ok(visible(co, "tbody.grupo-finca:has-text('Finca La Prueba')", 15000), "el prototipo ve la finca registrada en Angular")

    # 3. Inspector y productor: solo lo suyo
    ins, pro = perfiles[2][1], perfiles[3][1]
    ins.goto(BASE + "fincas")
    ins.wait_for_selector("h1")
    ok("Mis fincas asignadas" in ins.inner_text("h1") and ins.locator("button:has-text('Registrar finca')").count() == 0, "inspector: «Mis fincas asignadas», sin registrar fincas")
    pro.goto(BASE + "fincas")
    pro.wait_for_selector("h1")
    ok("Mis fincas" in pro.inner_text("h1"), "productor: «Mis fincas»")
    ajenas = [f for f in pro.evaluate("fetch('/api/sincronizacion').then((r) => r.json()).then((d) => d.colecciones.fincas.map((x) => x.datos))") if f.get("productor") != "Hernán Darío Mejía"]
    if ajenas:
        pro.goto(BASE + "fincas/" + ajenas[0]["id"])
        ok(visible(pro, "text=No tiene permiso para ver esta finca"), "productor: no ve la ficha de otra finca")
    # las acciones del flujo abren las pantallas de la visita en Angular (módulo 4)
    co.goto(BASE + "fincas")
    co.wait_for_selector("tbody.grupo-finca")
    href = co.locator(".col-eval a.btn").first.get_attribute("href")
    ok(href.startswith("/plataforma/visitas/"), f"las acciones de visitas abren Angular ({href})")

    # 4. Móvil
    m = b.new_context(viewport={"width": 390, "height": 800}).new_page()
    m.goto(BASE + "ingreso")
    m.wait_for_selector("#correo")
    ok(not errores, f"sin errores de JavaScript {errores[:2]}")
    b.close()

print(f"\n{'TODO BIEN' if not fallas else str(len(fallas)) + ' fallas'}")
sys.exit(1 if fallas else 0)
