#!/usr/bin/env python3
"""Capturas de la plataforma 1.0 para la documentación (docs/interfaz/capturas_plataforma/).
Requiere la plataforma en Docker recién instalada con los datos de ejemplo (DATOS_EJEMPLO=si) y Mailpit:
  cd plataforma && docker compose down -v && docker compose up -d
Uso: python herramientas/capturar_plataforma.py [http://localhost:4200]"""
import json, pathlib, re, sys, time, urllib.request
from playwright.sync_api import sync_playwright

WEB = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4200"
BASE, MAIL = WEB + "/plataforma/", WEB.rsplit(":", 1)[0] + ":8025/api/v1"
OUT = pathlib.Path(__file__).resolve().parents[1] / "docs/interfaz/capturas_plataforma"
OUT.mkdir(parents=True, exist_ok=True)
CLAVE = "Patos2026seguro"


def get(url):
    with urllib.request.urlopen(url, timeout=5) as r:
        return json.loads(r.read().decode())


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
    raise SystemExit(f"No llegó el correo a {para}")


def foto(p, nombre, completa=True):
    p.wait_for_timeout(700); p.screenshot(path=str(OUT / f"{nombre}.png"), full_page=completa); print("  ", nombre)


def activar(p, email, capturar=False):
    p.goto(WEB + correo(email, r"(/plataforma/activar/[A-Za-z0-9_-]+)")); p.wait_for_selector("#nueva")
    p.fill("#nueva", CLAVE); p.fill("#confirmar", CLAVE)
    if capturar: foto(p, "p03_activar_cuenta", False)
    p.get_by_role("button", name="Activar mi cuenta").click(); p.wait_for_selector("text=Ya puede ingresar")


def ingresar(p, email, capturar=False):
    p.goto(BASE + "ingreso"); p.wait_for_selector("#correo")
    p.fill("#correo", email); p.fill("#clave", CLAVE)
    if capturar: foto(p, "p01_ingreso", False)
    p.get_by_role("button", name="Continuar").click(); p.wait_for_selector(".codigo input")
    if capturar: foto(p, "p02_codigo_al_correo", False)
    for i, d in enumerate(correo(email, r"es (\d{6})\.")):
        p.locator(".codigo input").nth(i).fill(d)
    p.wait_for_selector(".rail .nav", timeout=10000)


with sync_playwright() as pw:
    b = pw.chromium.launch()
    nueva = lambda **k: b.new_context(viewport={"width": 1366, "height": 900}, **k).new_page()
    adm = nueva()
    activar(adm, "a.rojas@ica.gov.co", True); ingresar(adm, "a.rojas@ica.gov.co", True)
    for u in adm.evaluate("fetch('/api/usuarios').then((r) => r.json())")["usuarios"]:
        if u["correo"] in ("l.cardenas@ica.gov.co", "c.pena@ica.gov.co", "d.ortiz@ica.gov.co"):
            adm.evaluate(f"fetch('/api/usuarios/{u['clave']}/enlace', {{ method: 'POST' }})")
    adm.goto(BASE + "usuarios"); adm.wait_for_selector("tbody tr"); foto(adm, "p04_usuarios_acceso")
    for e in ("l.cardenas@ica.gov.co", "c.pena@ica.gov.co", "d.ortiz@ica.gov.co"):
        activar(nueva(), e)
    co, ins, ins2 = nueva(), nueva(), nueva()
    ingresar(co, "l.cardenas@ica.gov.co"); ingresar(ins, "c.pena@ica.gov.co"); ingresar(ins2, "d.ortiz@ica.gov.co")
    co.goto(BASE + "inicio"); co.wait_for_selector(".kpi"); foto(co, "p05_inicio_coordinador")
    co.goto(BASE + "fincas"); co.wait_for_selector("tbody tr"); foto(co, "p06_fincas")
    ins.goto(BASE + "visitas/EVA-2026-00088"); ins.wait_for_selector(".kpi"); foto(ins, "p07_apertura_y_muestreo")
    ins.goto(BASE + "visitas/EVA-2026-00088/PR02"); ins.wait_for_selector(".resultado-ind"); foto(ins, "p08_indicador")
    ins.goto(BASE + "visitas/EVA-2026-00088/recorrido/0/0"); ins.wait_for_selector(".tarjeta-ave"); foto(ins, "p09_recorrido_patos")
    ins.locator(".evaluar-aves .btn").last.click(); ins.wait_for_selector(".ficha-ave"); foto(ins, "p10_ficha_del_ave", False)
    ins.keyboard.press("Escape")
    ins2.goto(BASE + "visitas/EVA-2026-00091/recorrido"); ins2.wait_for_selector(".tarjeta-ave"); foto(ins2, "p11_recorrido_gansos")
    ins.goto(BASE + "visitas/EVA-2026-00088/cierre"); ins.wait_for_selector(".firma"); foto(ins, "p12_cierre")
    co.goto(BASE + "visitas/EVA-2026-00072/resultado"); co.wait_for_selector(".anillo"); foto(co, "p13_resultado")
    co.goto(BASE + "reportes"); co.wait_for_selector(".kpi"); foto(co, "p14_reportes")
    ins.goto(BASE + "visitas/EVA-2026-00088/PA01"); ins.wait_for_selector(".fab-asistente"); ins.locator(".fab-asistente").click()
    ins.fill("#apQ", "¿Cómo se evalúa este indicador?"); ins.press("#apQ", "Enter"); ins.wait_for_timeout(800); foto(ins, "p15_asistente_flotante", False)
    ins.keyboard.press("Escape")
    co.goto(BASE + "ayuda/calculo"); co.wait_for_selector("#cA"); foto(co, "p16_ayuda_de_la_norma")
    ins.goto(BASE + "visitas/EVA-2026-00088/PG01"); ins.wait_for_selector(".ficha textarea")
    ins.evaluate("navigator.serviceWorker.ready.then(() => true)"); ins.wait_for_timeout(3000)
    ins.context.set_offline(True); ins.reload(); ins.wait_for_selector(".aviso-sin-senal", timeout=15000)
    ins.locator(".ficha textarea").first.fill("Registrado sin señal"); ins.wait_for_timeout(1500); foto(ins, "p17_sin_senal", False)
    ins.context.set_offline(False)
    mov = b.new_context(**pw.devices["iPhone 13"]).new_page()
    ingresar(mov, "c.pena@ica.gov.co"); mov.goto(BASE + "visitas/EVA-2026-00088/PA03"); mov.wait_for_selector(".resultado-ind"); foto(mov, "p18_movil_indicador", False)
    b.close()
print(f"Capturas en {OUT}")
