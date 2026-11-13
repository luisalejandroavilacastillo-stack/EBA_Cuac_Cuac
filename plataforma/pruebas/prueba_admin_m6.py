"""Módulo 6 en Docker: reportes, informe de finca, ayuda de la norma, bitácora, parametrización y asistente en Angular.
Compara cada pantalla con el prototipo (misma sesión y mismos datos). El asistente se compara en modo local (sin GEMINI_API_KEY).
Uso: python3 pruebas/prueba_admin_m6.py [carpeta_capturas]
Requiere la base con los datos de ejemplo y las cuentas de ejemplo SIN activar (docker compose down -v; up)."""
import csv, io, json, re, sys, time, urllib.request
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


def texto(p, sel):
    return re.sub(r"\s+", " ", p.evaluate(f"() => [...document.querySelectorAll({json.dumps(sel)})].map((x) => x.innerText).join(' | ')")).strip()


def reporte(p, ang):
    """KPIs, gráficas, criterios y tabla de la consulta (sin la columna de acciones)."""
    p.wait_for_selector(".kpi", timeout=10000); p.wait_for_timeout(500)
    raiz = "" if ang else "#rep "
    return {"kpis": texto(p, raiz + ".kpi"), "barras": texto(p, raiz + ".barras"),
            "filas": p.evaluate(f"""() => [...document.querySelectorAll('{raiz}.panel:last-of-type tbody tr')].map((tr) => [...tr.querySelectorAll('td:not(.no-imprimir)')].map((td) => td.innerText.replace(/\\s+/g, ' ').trim()).join(' ; '))"""),
            "criterios": texto(p, raiz + ".rejilla.r-2:nth-of-type(3) table, " + raiz + ".tabla-compacta:not(:last-child)")}


def preguntar(p, q, ang):
    n = p.locator(".asis-panel .msg-a, #asis-panel .msg-a").count()
    p.fill("#apQ", q); p.press("#apQ", "Enter")
    p.wait_for_function(f"() => document.querySelectorAll('.asis-panel .msg-a:not(.msg-escribiendo), #asis-panel .msg-a:not(.msg-escribiendo)').length > {n}", timeout=10000)
    p.wait_for_timeout(200)
    return re.sub(r"\s+", " ", p.locator(".asis-panel .msg-a:not(.msg-escribiendo), #asis-panel .msg-a:not(.msg-escribiendo)").last.inner_text()).strip()


def comparar_asistente(p, ruta_ang, ruta_proto, preguntas, etiqueta):
    resp = {}
    for ang in (True, False):
        p.goto(BASE + ruta_ang if ang else WEB + "/#/" + ruta_proto)
        p.wait_for_selector(".fab-asistente", timeout=10000); p.wait_for_timeout(400)
        p.locator(".fab-asistente").click()
        p.wait_for_selector("#apQ")
        if CAP and ang:
            p.screenshot(path=f"{CAP}/asistente_{etiqueta}.png")
        resp[ang] = [preguntar(p, q, ang) for q in preguntas]
        p.keyboard.press("Escape")
    distintos = [(q, a[:160], b[:160]) for q, a, b in zip(preguntas, resp[True], resp[False]) if a != b]
    ok(not distintos, f"asistente ({etiqueta}): {len(preguntas)} respuestas iguales al prototipo{'' if not distintos else ' ' + json.dumps(distintos[:2], ensure_ascii=False)}")


with sync_playwright() as pw:
    b = pw.chromium.launch()
    errores = []

    def pagina():
        pg = b.new_context(viewport={"width": 1366, "height": 900}, accept_downloads=True).new_page()
        pg.on("pageerror", lambda e: errores.append(str(e)))
        return pg

    adm = pagina()
    adm.goto(WEB + "/"); adm.wait_for_timeout(5000)
    activar(adm, "a.rojas@ica.gov.co"); ingresar(adm, "a.rojas@ica.gov.co")
    for u in adm.evaluate("fetch('/api/usuarios').then((r) => r.json())")["usuarios"]:
        if u["correo"] in ("l.cardenas@ica.gov.co", "c.pena@ica.gov.co", "h.mejia@correo.co"):
            adm.evaluate(f"fetch('/api/usuarios/{u['clave']}/enlace', {{ method: 'POST' }})")
    for e in ("l.cardenas@ica.gov.co", "c.pena@ica.gov.co", "h.mejia@correo.co"):
        activar(pagina(), e)
    co, ins, pro = pagina(), pagina(), pagina()
    ingresar(co, "l.cardenas@ica.gov.co"); ingresar(ins, "c.pena@ica.gov.co"); ingresar(pro, "h.mejia@correo.co")

    # 1. Reportes (coordinador e inspector): igual al prototipo, con y sin filtros
    for p, quien in ((co, "coordinador"), (ins, "inspector")):
        p.goto(BASE + "reportes"); a = reporte(p, True)
        p.goto(WEB + "/#/reportes"); pr = reporte(p, False)
        ok(a["kpis"] == pr["kpis"], f"reportes ({quien}): indicadores iguales ({a['kpis'][:90]})")
        ok(a["barras"] == pr["barras"], f"reportes ({quien}): gráficas de niveles y medidas iguales")
        ok(a["filas"] == pr["filas"], f"reportes ({quien}): consulta por visita igual ({len(a['filas'])} filas)")
    co.goto(BASE + "reportes"); co.wait_for_selector(".kpi")
    co.select_option("#rf2", "pato"); co.select_option("#rf3", "Finalizada"); a = reporte(co, True)
    co.goto(WEB + "/#/reportes"); co.wait_for_selector("#rf2"); co.select_option("#rf2", "pato"); co.select_option("#rf3", "Finalizada"); pr = reporte(co, False)
    ok(a["kpis"] == pr["kpis"] and a["filas"] == pr["filas"], "reportes con filtros (patos, finalizadas) iguales al prototipo")
    co.goto(BASE + "reportes"); co.wait_for_selector(".kpi")
    co.select_option("#rf3", "Finalizada")
    co.locator("a", has_text="Ver resultados").first.click(); co.wait_for_selector(".anillo")
    co.go_back(); co.wait_for_selector(".kpi")
    ok(co.input_value("#rf3") == "Finalizada", "los filtros se conservan al volver a Reportes")
    co.get_by_role("button", name="Limpiar filtros").click(); co.wait_for_timeout(300)
    comp_a = texto(co, "#comparar")
    co.goto(WEB + "/#/reportes"); co.wait_for_selector("#comparar")
    ok(comp_a.replace("Finca y especie", "") [:400] == texto(co, "#comparar").replace("Finca y especie", "")[:400], "comparación entre visitas igual al prototipo")
    co.goto(BASE + "reportes"); co.wait_for_selector(".kpi")
    co.get_by_role("button", name="Limpiar filtros").click()
    if CAP: co.screenshot(path=f"{CAP}/reportes.png", full_page=True)
    with co.expect_download() as d:
        co.get_by_role("button", name="Exportar CSV").click()
    contenido = open(d.value.path(), encoding="utf-8-sig").read()
    filas_csv = list(csv.reader(io.StringIO(contenido), delimiter=";"))
    ok(filas_csv[0][:3] == ["evaluacion", "fecha", "finca_id"] and len(filas_csv) > 3, f"CSV exportado ({len(filas_csv) - 1} evaluaciones)")
    ok(not re.search(r"@|\b\d{7,}\b", contenido), "el CSV no trae correos ni documentos")
    # informe de la finca
    co.goto(BASE + "reportes/finca/FIN-2026-00417"); co.wait_for_selector(".informe-especie")
    inf_a = texto(co, ".informe-especie")
    co.goto(WEB + "/#/reportes/finca/FIN-2026-00417"); co.wait_for_selector(".informe-especie")
    inf_p = texto(co, ".informe-especie")
    ok(inf_a == inf_p, f"informe de la finca igual al prototipo{'' if inf_a == inf_p else ' ' + json.dumps([inf_a[:200], inf_p[:200]], ensure_ascii=False)}")
    if CAP:
        co.goto(BASE + "reportes/finca/FIN-2026-00417"); co.wait_for_selector(".informe-especie"); co.screenshot(path=f"{CAP}/informe.png", full_page=True)

    # 2. Ayuda de la norma: secciones y fichas iguales al prototipo; calculadora
    distintos = []
    for k in ("norma", "fases", "muestreo", "calculo", "indicadores", "densidad", "condicion", "erratas", "PA03", "GR05", "PG10"):
        co.goto(BASE + "ayuda/" + k); co.wait_for_selector(".eval > div > *"); co.wait_for_timeout(300)
        a = texto(co, ".eval > div")
        co.goto(WEB + "/#/ayuda/" + k); co.wait_for_selector(".eval > div > *"); co.wait_for_timeout(300)
        pr = texto(co, ".eval > div")
        if a != pr:
            distintos.append((k, a[:120], pr[:120]))
    ok(not distintos, f"ayuda: 8 secciones y 3 fichas iguales al prototipo{'' if not distintos else ' ' + json.dumps(distintos[:2], ensure_ascii=False)}")
    co.goto(BASE + "ayuda"); co.wait_for_selector(".indice .item-ind")
    ok(co.locator(".indice .item-ind").count() == 58, "ayuda: índice con las 58 fichas")
    co.goto(BASE + "ayuda/calculo"); co.wait_for_selector("#cA")
    co.fill("#cA", "90"); co.fill("#cR", "90"); co.fill("#cG", "90")
    ok(visible(co, "#cOut:has-text('= 90') >> text=Excelente", 4000), "calculadora del puntaje: 90 · Excelente")
    co.select_option("#cTr", "traspatio")
    ok(co.locator("#cG").is_disabled(), "calculadora: en traspatio no se usa la gestión")
    co.locator(".eval a.item-ind", has_text="Jadeo").first.click()
    ok(visible(co, "h2:has-text('Jadeo')"), "el índice abre la ficha sin recargar")
    if CAP: co.screenshot(path=f"{CAP}/ayuda.png", full_page=True)

    # 3. Bitácora y parametrización (administrador)
    adm.goto(BASE + "bitacora"); adm.wait_for_selector("tbody tr")
    bit_a = adm.evaluate("() => [...document.querySelectorAll('tbody tr')].slice(0, 15).map((t) => t.innerText.replace(/\\s+/g, ' ').trim())")
    adm.goto(WEB + "/#/bitacora"); adm.wait_for_selector("tbody tr"); adm.wait_for_timeout(500)
    bit_p = adm.evaluate("() => [...document.querySelectorAll('tbody tr')].slice(0, 15).map((t) => t.innerText.replace(/\\s+/g, ' ').trim())")
    ok(len(bit_a) > 5 and bit_a[1:] == bit_p[1:len(bit_a)], f"bitácora igual al prototipo ({len(bit_a)} primeras filas)")
    ok(any("Consulta del informe" in x or "Exportación de reporte" in x for x in adm.evaluate("fetch('/api/sincronizacion').then((r) => r.json()).then((d) => d.bitacora.map((b) => b.a))")), "las consultas de reportes quedan en la bitácora")
    adm.goto(BASE + "parametrizacion"); adm.wait_for_selector("#cfgAsis")
    par_a = texto(adm, "section.panel:not(#cfgAsis) table")
    adm.goto(WEB + "/#/parametros"); adm.wait_for_selector("#cfgAsis")
    ok(par_a == texto(adm, "section.panel:not(#cfgAsis) table"), "parametrización: versiones y pesos iguales al prototipo")
    adm.goto(BASE + "parametrizacion"); adm.wait_for_selector("#cfgAsis")
    ok("Modo local" in adm.inner_text("#cfgAsis") and "GEMINI_API_KEY" in adm.inner_text("#cfgAsis"), "parametrización: estado del asistente sin mostrar la clave")
    ok(not visible(co, "a[href='/plataforma/bitacora']", 500), "el coordinador no ve la bitácora en el menú")
    co.goto(BASE + "bitacora")
    ok(visible(co, "text=No tiene permiso") or "/sin-permiso" in co.url or "/inicio" in co.url, "el coordinador no entra a la bitácora")

    # 4. Asistente en modo local: mismas respuestas que el prototipo
    comparar_asistente(co, "visitas/EVA-2026-00065/resultado", "eval/EVA-2026-00065/resultado",
                       ["¿Cómo se toma la muestra?", "¿Cómo se evalúa el jadeo?", "6.1.2", "¿Cómo va la evaluación EVA-2026-00065?", "¿Qué hora es en Tokio?", "¿Qué falta por evaluar?", "Granja La Esperanza puntaje"], "coordinador")
    comparar_asistente(ins, "visitas/EVA-2026-00088/PA03", "eval/EVA-2026-00088/PA03",
                       ["¿Cómo se evalúa este indicador?", "¿Qué hago si dudo entre dos niveles?", "¿Qué falta por evaluar?", "se me están muriendo muchas aves"], "inspector")
    comparar_asistente(pro, "inicio", "inicio",
                       ["¿Qué significa mi puntaje?", "¿Qué debo corregir primero?", "¿Qué dice mi plan de mejora?", "¿Cuándo se cierra mi proceso?", "cama"], "productor")
    # página completa del asistente (productor)
    pro.goto(BASE + "asistente"); pro.wait_for_selector("#asQ")
    ok(visible(pro, ".asis-puntaje"), "asistente: panel con el resultado de la finca")
    pro.fill("#asQ", "¿Qué debo corregir primero?"); pro.press("#asQ", "Enter")
    ok(visible(pro, ".chat-msgs .msg-a:nth-of-type(3)", 6000) or pro.locator(".chat-msgs .msg-a").count() >= 2, "asistente: responde en la página completa")
    ok(not visible(pro, ".fab-asistente", 500), "en la página del asistente no aparece el botón flotante")
    if CAP: pro.screenshot(path=f"{CAP}/asistente_pagina.png", full_page=True)
    bit = adm.evaluate("fetch('/api/sincronizacion').then((r) => r.json()).then((d) => d.bitacora.map((b) => b.a).filter((a) => a.startsWith('Consulta al asistente')))")
    ok(len(bit) >= 3 and not any("muestra" in x or "puntaje" in x for x in bit), f"la bitácora registra las consultas sin el texto ({len(bit)})")
    ok(not errores, f"sin errores de JavaScript {errores[:2]}")
    b.close()

print(f"\n{'TODO BIEN' if not fallas else str(len(fallas)) + ' fallas'}")
sys.exit(1 if fallas else 0)
