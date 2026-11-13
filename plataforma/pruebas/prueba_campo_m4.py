"""Módulo 4 en Docker: evaluación en campo en Angular (apertura, indicadores, recorrido de patos y gansos, cierre y trabajo sin señal).
Compara cada pantalla con el prototipo usando la misma sesión y los mismos datos.
Uso: python3 pruebas/prueba_campo_m4.py [carpeta_capturas]
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


def evaluacion(p, id):
    return p.evaluate("(id) => fetch('/api/sincronizacion').then((r) => r.json()).then((d) => d.colecciones.evals.find((x) => x.id === id))", id)


def calculo(p):
    """Puntaje, detalle y estado del índice de la pantalla de un indicador (igual en los dos)."""
    p.wait_for_selector(".resultado-ind .dial span", timeout=10000)
    p.wait_for_timeout(250)
    return p.evaluate("""() => ({ dial: document.querySelector('.resultado-ind .dial span').textContent.trim(),
      det: document.querySelector('.resultado-ind p b').textContent.trim(),
      indice: [...document.querySelectorAll('.item-ind')].map((i) => [...i.classList].find((c) => c.startsWith('est-')) + ':' + i.querySelector('.n').textContent.trim()).join(' ') })""")


def na(p):
    return p.evaluate("() => document.querySelector('.na-banda')?.textContent.replace(/\\s+/g, ' ').trim().slice(0, 80) ?? null")


def comparar_indicadores(p, id, codigos, etiqueta):
    distintos = []
    for c in codigos:
        p.goto(f"{BASE}visitas/{id}/{c}")
        p.wait_for_selector(".ficha-cab h2", timeout=10000); p.wait_for_timeout(300)
        a = na(p) or calculo(p)
        p.goto(f"{WEB}/#/eval/{id}/{c}")
        p.wait_for_selector(".ficha-cab h2", timeout=10000); p.wait_for_timeout(300)
        b = na(p) or calculo(p)
        if a != b:
            distintos.append((c, a, b))
    ok(not distintos, f"{etiqueta}: {len(codigos)} indicadores iguales al prototipo{'' if not distintos else ' ' + json.dumps(distintos[:2], ensure_ascii=False)}")


with sync_playwright() as pw:
    b = pw.chromium.launch()
    errores = []

    def pagina():
        ctx = b.new_context(viewport={"width": 1366, "height": 900})
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errores.append(str(e)))
        return pg

    adm = pagina()
    adm.goto(WEB + "/"); adm.wait_for_timeout(5000)
    activar(adm, "a.rojas@ica.gov.co"); ingresar(adm, "a.rojas@ica.gov.co")
    for u in adm.evaluate("fetch('/api/usuarios').then((r) => r.json())")["usuarios"]:
        if u["correo"] in ("l.cardenas@ica.gov.co", "c.pena@ica.gov.co"):
            adm.evaluate(f"fetch('/api/usuarios/{u['clave']}/enlace', {{ method: 'POST' }})")
    for e in ("l.cardenas@ica.gov.co", "c.pena@ica.gov.co"):
        activar(pagina(), e)
    ins, co = pagina(), pagina()
    ingresar(ins, "c.pena@ica.gov.co"); ingresar(co, "l.cardenas@ica.gov.co")

    # 1. Apertura (patos, en proceso): plan de muestreo igual al prototipo
    ins.goto(BASE + "visitas/EVA-2026-00088")
    ok(visible(ins, "h1:has-text('Apertura de la visita')"), "apertura en Angular")
    plan_a = ins.evaluate("() => [...document.querySelectorAll('.kpi')].map((k) => k.textContent.trim()).join('|')")
    ins.goto(WEB + "/#/eval/EVA-2026-00088/apertura"); ins.wait_for_selector("#plan .kpi")
    plan_p = ins.evaluate("() => [...document.querySelectorAll('#plan .kpi')].map((k) => k.textContent.trim()).join('|')")
    ok(plan_a == plan_p, f"plan de muestreo igual al prototipo ({plan_a})")
    if CAP:
        ins.goto(BASE + "visitas/EVA-2026-00088"); ins.wait_for_selector(".kpi"); ins.screenshot(path=f"{CAP}/apertura.png", full_page=True)

    # 2. Indicadores de patos: puntaje, detalle e índice iguales al prototipo
    ins.goto(BASE + "visitas/EVA-2026-00088/PR01"); ins.wait_for_selector(".item-ind")
    cods_pato = ins.evaluate("() => [...document.querySelectorAll('.item-ind')].map((a) => a.getAttribute('href').split('/').pop()).filter((c) => /^P[RAG]\\d\\d$/.test(c))")
    comparar_indicadores(ins, "EVA-2026-00088", cods_pato, "patos")
    # captura: un nivel directo y una observación se guardan en la base
    ins.goto(BASE + "visitas/EVA-2026-00088/PG01"); ins.wait_for_selector(".ficha-cab h2")
    if CAP: ins.screenshot(path=f"{CAP}/indicador.png", full_page=True)
    ins.locator(".ficha textarea").first.fill("Observación de prueba del módulo 4")
    ok(visible(ins, "text=Guardado", 6000), "la observación se guarda («Guardado …»)")
    ins.wait_for_timeout(1500)
    ok(evaluacion(ins, "EVA-2026-00088")["datos"]["obs"].get("PG01") == "Observación de prueba del módulo 4", "la observación queda en la base")
    ins.goto(WEB + "/#/eval/EVA-2026-00088/PG01"); ins.wait_for_selector("#obs")
    ok(ins.input_value("#obs") == "Observación de prueba del módulo 4", "el prototipo ve la observación")

    # 3. Recorrido de patos: el punto 1 queda sin hallazgos; los chips coinciden con el prototipo
    ins.goto(BASE + "visitas/EVA-2026-00088/recorrido/0/0")
    ok(visible(ins, "h1:has-text('Recorrido por puntos')"), "recorrido de patos en Angular")
    if CAP: ins.screenshot(path=f"{CAP}/recorrido_pato.png", full_page=True)
    boton = ins.locator(".evaluar-aves .btn-sec", has_text="sin hallazgos")
    if boton.count():
        boton.first.click()
        ok(visible(ins, "text=Aves del punto completas"), "aves del punto completas sin hallazgos")
    ins.locator(".evaluar-aves .btn").last.click()
    ok(visible(ins, ".ficha-ave h3:has-text('Ave 1 de')"), "ficha del ave")
    if CAP: ins.screenshot(path=f"{CAP}/ficha_ave.png")
    ins.locator(".ficha-ave .nv").nth(1).click()   # PA03 «Leve» en el ave 1
    ins.wait_for_timeout(300)
    ok(visible(ins, ".ficha-ave .chip-punto.actual i.punto-hall", 4000), "el hallazgo marca el ave")
    ins.locator(".ficha-ave .cab-aves button", has_text="Cerrar").click()
    ins.wait_for_timeout(1500)
    chips_a = ins.evaluate("() => [...document.querySelectorAll('.chip-punto')].map((c) => c.className.match(/est-\\w+/)[0]).join(' ')")
    aves_a = ins.evaluate("() => [...document.querySelectorAll('.tarjeta-ave')].map((c) => c.textContent.trim()).join('|')")
    ins.goto(WEB + "/#/eval/EVA-2026-00088/recorrido/0/0"); ins.wait_for_selector(".tarjeta-ave"); ins.wait_for_timeout(500)
    chips_p = ins.evaluate("() => [...document.querySelectorAll('.chips > .chip-punto')].map((c) => c.className.match(/est-\\w+/)[0]).join(' ')")
    aves_p = ins.evaluate("() => [...document.querySelectorAll('.tarjeta-ave')].map((c) => c.textContent.trim()).join('|')")
    ok(chips_a == chips_p, f"estado de los puntos igual al prototipo ({chips_a})")
    ok(aves_a == aves_p, f"aves del punto iguales al prototipo ({aves_a})")
    comparar_indicadores(ins, "EVA-2026-00088", ["PA03", "PA04", "PA11", "PR02", "PR05"], "patos tras el recorrido")

    # 4. Gansos (visita asignada): recorrido → pasa a «En proceso» y los conteos salen del recorrido
    ins.goto(BASE + "visitas/EVA-2026-00091/recorrido")
    ok(visible(ins, "h1:has-text('Recorrido por puntos')"), "recorrido de gansos en Angular")
    ins.locator(".nv", has_text="Limpio, sin elementos de riesgo").first.click(); ins.wait_for_timeout(200)
    ins.locator(".nv", has_text="Buen estado y limpio").nth(0).click(); ins.wait_for_timeout(200)
    ins.locator(".nv", has_text="Buen estado y limpio").nth(1).click(); ins.wait_for_timeout(200)
    ins.locator(".nv", has_text="Tienen acceso permanente").first.click(); ins.wait_for_timeout(200)
    ins.locator(".evaluar-aves .btn").last.click()
    ins.wait_for_selector(".ficha-ave")
    ins.locator(".ficha-ave .fila-ave", has_text="Diarrea").locator(".nv", has_text="Sí tiene").click()
    ins.locator(".ficha-ave .sin-hallazgos button").click()
    ins.locator(".ficha-ave .cab-aves button", has_text="Cerrar").click()
    ins.locator(".evaluar-aves .btn-sec", has_text="sin hallazgos").click()
    ins.wait_for_timeout(300)
    ok(visible(ins, "text=Evidencia de tratamiento"), "pide la evidencia de tratamiento de la novedad")
    if CAP: ins.screenshot(path=f"{CAP}/recorrido_ganso.png", full_page=True)
    ins.wait_for_timeout(2000)
    eg = evaluacion(ins, "EVA-2026-00091")["datos"]
    ok(eg["estado"] == "En proceso", f"la visita de gansos pasa a «En proceso» ({eg['estado']})")
    ok((eg["resp"].get("GA04") or {}).get("part") == 1, "el conteo de diarrea sale del recorrido")
    ins.goto(BASE + "visitas/EVA-2026-00091/GR01"); ins.wait_for_selector(".item-ind")
    cods_ganso = ins.evaluate("() => [...document.querySelectorAll('.item-ind')].map((a) => a.getAttribute('href').split('/').pop()).filter((c) => /^G[RAG]\\d\\d$/.test(c))")
    comparar_indicadores(ins, "EVA-2026-00091", cods_ganso, "gansos")

    # 5. Sin señal: los cambios quedan en el equipo y se envían al volver
    ins.goto(BASE + "visitas/EVA-2026-00088/PG02"); ins.wait_for_selector(".ficha textarea")
    ins.context.set_offline(True)
    ins.locator(".ficha textarea").first.fill("Escrito sin señal")
    ok(visible(ins, "text=Sin conexión", 6000), "sin señal: avisa que los cambios quedan en el equipo")
    ins.context.set_offline(False)
    ins.evaluate("window.dispatchEvent(new Event('online'))")
    ins.wait_for_timeout(3000)
    ok(evaluacion(adm, "EVA-2026-00088")["datos"]["obs"].get("PG02") == "Escrito sin señal", "al volver la señal el cambio llega a la base")

    # 6. Cierre: faltantes iguales al prototipo; con todo diligenciado se envía al coordinador
    ins.goto(BASE + "visitas/EVA-2026-00088/cierre"); ins.wait_for_selector("h1:has-text('Cierre de la visita')"); ins.wait_for_timeout(500)
    falt_a = ins.evaluate("() => [...document.querySelectorAll('.panel li span')].map((s) => s.textContent.trim())")
    ins.goto(WEB + "/#/eval/EVA-2026-00088/cierre"); ins.wait_for_selector("h1"); ins.wait_for_timeout(500)
    falt_p = ins.evaluate("() => [...document.querySelectorAll('.panel li span')].map((s) => s.textContent.trim())")
    ok(falt_a == falt_p, f"lo que falta para cerrar es igual al prototipo ({len(falt_a)} pendientes)")
    # se completa con lo registrado en la visita anterior (EVA-2026-00072) para poder finalizar
    adm.evaluate("""async () => { const d = await (await fetch('/api/sincronizacion')).json(); const r = d.colecciones.evals.find((x) => x.id === 'EVA-2026-00088');
      const base = d.colecciones.evals.find((x) => x.id === 'EVA-2026-00072').datos;
      const ev = { ...r.datos, resp: base.resp, obs: { ...base.obs, PR02: 'Galpón 2 con la cama compacta' }, apertura: { ...base.apertura, atiende: 'Hernán Mejía' }, pobEsp: base.pobEsp, pobConfirmada: base.pobConfirmada, firmas: {} };
      return (await fetch('/api/sincronizacion/evals/EVA-2026-00088', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: r.version, datos: ev }) })).status; }""")
    ins.goto(BASE + "inicio"); ins.wait_for_timeout(500)
    ins.evaluate("() => location.reload()"); ins.wait_for_selector(".rail .nav")
    ins.goto(BASE + "visitas/EVA-2026-00088/cierre"); ins.wait_for_selector(".firma")
    ins.wait_for_timeout(800)
    ins.locator(".firma").nth(0).click(); ins.locator(".firma").nth(1).click()
    ins.wait_for_timeout(500)
    if ins.locator("li a:has-text('Ir')").count():
        print("     pendientes:", ins.evaluate("() => [...document.querySelectorAll('.panel li span')].map((s) => s.textContent.trim())"))
    ok(visible(ins, "text=Todo lo obligatorio está diligenciado", 5000), "cierre: todo lo obligatorio diligenciado")
    if CAP: ins.screenshot(path=f"{CAP}/cierre.png", full_page=True)
    ins.get_by_role("button", name="Finalizar y enviar a aprobación").click()
    ok(visible(ins, "text=queda pendiente de aprobación del coordinador"), "visita enviada al coordinador")
    ok(visible(ins, "h1:has-text('Resultado de la evaluación')"), "después de finalizar se abre el resultado")
    e = evaluacion(adm, "EVA-2026-00088")["datos"]
    ok(e["estado"] == "Pendiente de aprobación" and e["revision"][-1]["accion"] == "Enviada", "queda «Pendiente de aprobación» con el envío registrado")
    avisos = co.evaluate("fetch('/api/sincronizacion').then((r) => r.json()).then((d) => d.colecciones.avisos.map((a) => a.datos).filter((a) => a.para === 'coordinador' && a.tipo === 'aprobar').map((a) => a.txt))")
    ok(any("Inspección por aprobar" in t for t in avisos), "el coordinador recibe el aviso para aprobar")
    co.goto(BASE + "visitas/EVA-2026-00088/resultado")
    ok(visible(co, "text=Aprobar inspección"), "el coordinador puede aprobarla")
    ins.goto(BASE + "visitas/EVA-2026-00088/PG01"); ins.wait_for_selector(".ficha textarea")
    ok(ins.locator(".ficha textarea").first.is_disabled(), "enviada: el inspector ya no la modifica")
    ok(not errores, f"sin errores de JavaScript {errores[:2]}")
    b.close()

print(f"\n{'TODO BIEN' if not fallas else str(len(fallas)) + ' fallas'}")
sys.exit(1 if fallas else 0)
