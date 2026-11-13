# -*- coding: utf-8 -*-
"""Toma capturas de las pantallas del prototipo para docs/interfaz/capturas/.

Uso:  python herramientas/capturar_pantallas.py
"""
import pathlib
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parents[1]
BASE = (RAIZ / "src" / "index.html").as_uri()
OUT = RAIZ / "docs" / "interfaz" / "capturas"
OUT.mkdir(parents=True, exist_ok=True)

PANTALLAS = [  # (archivo, dirección, preparación)
    ("03_inicio_inspector", "#/inicio", None),
    ("04_notificaciones", "#/inicio", "#notif-btn"),
    ("05_fincas", "#/fincas", None),
    ("06_ficha_finca", "#/finca/FIN-2026-00417", None),
    ("07_informe_finca", "#/reportes/finca/FIN-2026-00417", None),
    ("08_apertura_muestreo", "#/eval/EVA-2026-00088/apertura", None),
    ("09_indicador_6.1.12_pocetas", "#/eval/EVA-2026-00088/PR12", None),
    ("10_indicador_6.2.1_jadeo", "#/eval/EVA-2026-00088/PA01", None),
    ("11_indicador_6.2.3_por_ave", "#/eval/EVA-2026-00088/PA03", None),
    ("12_indicador_6.3.10_medicamentos", "#/eval/EVA-2026-00088/PG10", None),
    ("14_ficha_del_indicador", "#/eval/EVA-2026-00088/PA01", "[data-ayuda]"),
    ("15_cierre", "#/eval/EVA-2026-00088/cierre", None),
    ("16_resultado_y_plan_de_mejora", "#/eval/EVA-2026-00088/resultado", None),
    ("17_centro_de_ayuda", "#/ayuda", None),
    ("18_reportes", "#/reportes", None),
    ("19_mi_cuenta_y_seguridad", "#/cuenta", None),
    # v0.24
    ("27_recorrido_patos", "#/eval/EVA-2026-00088/recorrido", None),
    ("38_ficha_del_ave_patos", "#/eval/EVA-2026-00088/recorrido", "#evalAves"),
    ("29_asistente_flotante", "#/eval/EVA-2026-00088/PA01", "#fab-asistente"),
]

# Cierra EVA-2026-00088 sin cumplir para mostrar el seguimiento programado (mismo procedimiento que las pruebas).
FINALIZAR = """(id => { const ev = EVALS.find(e => e.id === id), ctx = contexto(ev);
  lista(ev).forEach(i => { if (aplica(i, ctx) || calcular(i, ev.resp[i.code], ctx).done) return;
    if (i.m.kind === 'density') ev.resp[i.code] = { aves: 812, peso: 2.5, area: 110 };
    else if (i.m.kind === 'cc' || i.m.kind === 'units') ev.resp[i.code] = { units: Array(nUnidades(i, ctx)).fill(i.m.kind === 'cc' ? 3 : 100) };
    else if (i.m.kind === 'doc') ev.resp[i.code] = { estado: 'Válido', legible: 1, sinCorr: 1, firmado: 1, contenido: 1, matricula: 1 }; });
  lista(ev).forEach(i => { ev.obs[i.code] = ev.obs[i.code] || 'Observación'; });
  ev.apertura.atiende = ev.apertura.atiende || 'Encargado'; ev.firmas = { productor: 'P', inspector: 'I' };
  ev.plan = { PA03: { accion: 'Ajustar bebederos', responsable: 'Encargado', plazo: '2099-01-10' } }; guardar(); })('EVA-2026-00088')"""


def entrar(pg, rol="inspector", correo=None, limpiar=True):
    """v0.25: un botón por perfil y el correo del usuario (sin correo, el que viene escrito)."""
    pg.goto(BASE)
    if limpiar: pg.evaluate("() => { try { localStorage.clear(); } catch (e) {} }")
    pg.evaluate("() => { try { sessionStorage.clear(); } catch (e) {} }")
    pg.goto(BASE); pg.reload(); pg.wait_for_timeout(200)
    pg.click(f'[data-rol="{rol}"]')
    if correo: pg.fill("#correo", correo)
    pg.click("text=Continuar")
    for i, d in enumerate("482073"):
        pg.locator(".codigo input").nth(i).fill(d)
    pg.click("text=Verificar")
    pg.wait_for_timeout(300)


with sync_playwright() as p:
    nav = p.chromium.launch()
    pg = nav.new_page(viewport={"width": 1440, "height": 900})
    pg.route("https://fonts.*/**", lambda r: r.abort())
    pg.goto(BASE); pg.wait_for_timeout(200)
    pg.screenshot(path=str(OUT / "01_ingreso.png"))
    pg.click("text=Continuar"); pg.wait_for_timeout(200)
    pg.screenshot(path=str(OUT / "02_verificacion_dos_pasos.png"))
    entrar(pg)
    for nombre, ruta, accion in PANTALLAS:
        pg.goto(BASE + ruta); pg.wait_for_timeout(300)
        if accion:
            pg.click(accion); pg.wait_for_timeout(250)
        pg.screenshot(path=str(OUT / f"{nombre}.png"), full_page=accion is None)
        pg.keyboard.press("Escape"); pg.evaluate("() => { cerrarCapas && cerrarCapas(); }")
    pg.evaluate("cerrarAsistenteFlotante()"); pg.evaluate(FINALIZAR)
    pg.goto(BASE + "#/eval/EVA-2026-00088/cierre"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / "30_cierre_finalizar_y_enviar.png"), full_page=True)
    pg.click("#fin"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / "31_enviada_pendiente_de_aprobacion.png"), full_page=True)
    # gansos: la visita de Santa Clara está asignada a la segunda inspectora
    entrar(pg, "inspector", "d.ortiz@ica.gov.co", limpiar=False)
    for nombre, ruta, accion in [("13_indicador_7.2.1_heridas_gansos", "#/eval/EVA-2026-00091/GA01", None), ("28_recorrido_gansos", "#/eval/EVA-2026-00091/recorrido", None),
                                 ("39_ficha_del_ave_gansos", "#/eval/EVA-2026-00091/recorrido", "#evalAves")]:
        pg.goto(BASE + ruta); pg.wait_for_timeout(300)
        if accion: pg.click(accion); pg.wait_for_timeout(250)
        pg.screenshot(path=str(OUT / f"{nombre}.png"), full_page=accion is None); pg.evaluate("() => { cerrarCapas && cerrarCapas(); }")
    entrar(pg, "coordinador", limpiar=False)
    pg.screenshot(path=str(OUT / "20_inicio_coordinadora.png"), full_page=True)
    pg.goto(BASE + "#/fincas"); pg.wait_for_timeout(300); pg.click("#nueva"); pg.wait_for_timeout(250)
    pg.screenshot(path=str(OUT / "26_registro_finca_especies.png")); pg.evaluate("cerrarCapas()")
    pg.locator('[data-nueva="FIN-2025-00198|ganso"]').click(); pg.wait_for_timeout(250)
    pg.screenshot(path=str(OUT / "33_asignar_inspeccion.png")); pg.evaluate("cerrarCapas()")
    pg.goto(BASE + "#/eval/EVA-2026-00088/resultado"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / "34_revision_del_coordinador.png"))
    pg.click("#aprobarBtn"); pg.wait_for_timeout(250)
    pg.screenshot(path=str(OUT / "35_aprobar_con_seguimiento.png")); pg.click(".modal [data-ok]"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / "36_resultado_aprobado_seguimiento_programado.png"), full_page=True)
    pg.goto(BASE + "#/fincas"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / "32_fincas_seguimiento_programado.png"), full_page=True)
    entrar(pg, "productor", limpiar=False)
    pg.screenshot(path=str(OUT / "21_inicio_productor.png"), full_page=True)
    entrar(pg, "productor", "rosa.quintero@correo.co", limpiar=False)
    pg.goto(BASE + "#/eval/EVA-2026-00065/constancia"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / "37_constancia_de_cumplimiento.png"), full_page=True)
    entrar(pg, "admin", limpiar=False)
    pg.goto(BASE + "#/usuarios"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / "22_usuarios_admin.png"), full_page=True)
    pg.click("#nuevoU"); pg.wait_for_timeout(250)
    pg.screenshot(path=str(OUT / "40_crear_usuario.png")); pg.evaluate("cerrarCapas()")
    pg.goto(BASE + "#/bitacora"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / "23_bitacora.png"), full_page=True)
    movil = nav.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    movil.route("https://fonts.*/**", lambda r: r.abort())
    entrar(movil, "inspector")
    movil.screenshot(path=str(OUT / "24_movil_inicio.png"))
    movil.goto(BASE + "#/eval/EVA-2026-00088/PR12"); movil.wait_for_timeout(300)
    movil.screenshot(path=str(OUT / "25_movil_indicador.png"), full_page=True)
    nav.close()
print("Capturas en", OUT.relative_to(RAIZ), len(list(OUT.glob("*.png"))))
