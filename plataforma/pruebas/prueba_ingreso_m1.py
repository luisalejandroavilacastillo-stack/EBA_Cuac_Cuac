"""Módulo 1 en Docker: ingreso real, activación por enlace, recuperación y gestión de usuarios.
Lee los correos en Mailpit (http://localhost:8025). Uso: python3 pruebas/prueba_ingreso_m1.py [carpeta_capturas]
Requiere la base con los datos de ejemplo y el administrador de ejemplo (a.rojas@ica.gov.co) SIN activar."""
import json, re, sys, time, urllib.request
from playwright.sync_api import sync_playwright

WEB = "http://localhost:4200"
BASE = WEB + "/plataforma/"
MAIL = "http://localhost:8025/api/v1"
CAP = sys.argv[1] if len(sys.argv) > 1 else None
fallas = []


def ok(c, t):
    print(("OK   " if c else "FALLA ") + t)
    if not c:
        fallas.append(t)


def get(url):
    with urllib.request.urlopen(url, timeout=5) as r:
        return json.loads(r.read().decode())


def correo(para, patron, despues=0.0, espera=15):
    """Último correo a «para» que contenga el patrón (regex); devuelve el primer grupo."""
    fin = time.time() + espera
    while time.time() < fin:
        for m in get(f"{MAIL}/messages")["messages"]:
            if any(t["Address"].lower() == para for t in m["To"]):
                texto = get(f"{MAIL}/message/{m['ID']}").get("Text", "")
                g = re.search(patron, texto)
                if g:
                    return g.group(1)
                break
        time.sleep(0.5)
    return None


def visible(p, sel, estado="visible", ms=6000):
    try:
        p.wait_for_selector(sel, state=estado, timeout=ms)
        return True
    except Exception:
        return False


ENLACE = r"(/plataforma/(?:activar|restablecer)/[A-Za-z0-9_-]+)"
CODIGO = r"es (\d{6})\."


def activar(p, ruta, clave):
    p.goto(WEB + ruta)
    p.wait_for_selector("#nueva")
    p.fill("#nueva", clave)
    p.fill("#confirmar", clave)
    p.get_by_role("button", name=re.compile("Activar mi cuenta|Guardar contraseña")).click()
    return visible(p, "text=Ya puede ingresar")


def ingresar(p, email, clave, codigo_ok=True):
    p.goto(BASE + "ingreso")
    p.wait_for_selector("#correo")
    p.fill("#correo", email)
    p.fill("#clave", clave)
    p.get_by_role("button", name="Continuar").click()
    p.wait_for_selector(".codigo input", timeout=10000)
    c = correo(email, CODIGO)
    for i, d in enumerate(c if codigo_ok else "000000"):
        p.locator(".codigo input").nth(i).fill(d)
    if codigo_ok:
        p.wait_for_selector(".rail .nav", timeout=10000)
    return c


def salir(p):
    p.get_by_role("button", name="Cerrar sesión").click()
    p.locator(".modal").get_by_role("button", name="Cerrar sesión").click()
    p.wait_for_selector("#correo")


with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={"width": 1366, "height": 860})
    p = ctx.new_page()
    errores = []
    p.on("pageerror", lambda e: errores.append(str(e)))

    # 0. El prototipo (desarrollo) carga los usuarios de ejemplo; el administrador recibe su enlace
    p.goto(WEB + "/")
    p.wait_for_timeout(5000)
    enlace_admin = correo("a.rojas@ica.gov.co", ENLACE, espera=20)
    ok(bool(enlace_admin), "el primer administrador recibe el enlace de activación en Mailpit")

    # 1. Sin sesión, Angular pide ingresar
    p.goto(BASE + "usuarios")
    p.wait_for_selector("#correo")
    ok("/ingreso" in p.url, "sin sesión: pantalla de ingreso")
    ok(p.locator(".roles").count() == 0, "el ingreso real ya no muestra perfiles de demostración")
    if CAP:
        p.screenshot(path=f"{CAP}/1_ingreso.png")

    # 2. Sin activar no se puede ingresar
    p.fill("#correo", "a.rojas@ica.gov.co")
    p.fill("#clave", "Cualquiera2026")
    p.get_by_role("button", name="Continuar").click()
    ok(visible(p, "text=Correo o contraseña incorrectos"), "cuenta sin activar: mensaje genérico (no revela nada)")

    # 3. Activación con reglas de contraseña
    p.goto(WEB + enlace_admin)
    p.wait_for_selector("#nueva")
    ok("Andrés Felipe Rojas" in p.inner_text(".tarjeta-ingreso"), "el enlace saluda a la persona por su nombre")
    p.fill("#nueva", "corta1")
    p.fill("#confirmar", "corta1")
    ok(p.locator(".reglas-clave li.cumple").count() == 2, "la lista de reglas se marca mientras escribe")
    if CAP:
        p.screenshot(path=f"{CAP}/3_activar.png")
    p.get_by_role("button", name="Activar mi cuenta").click()
    ok(visible(p, "text=Falta: al menos 10 caracteres"), "contraseña corta: no deja activar")
    ok(activar(p, enlace_admin, "Patos2026seguro"), "cuenta activada con una contraseña válida")
    p.goto(WEB + enlace_admin)
    ok(visible(p, "text=El enlace no sirve"), "el enlace es de un solo uso")

    # 4. Ingreso con código del correo
    ingresar(p, "a.rojas@ica.gov.co", "Patos2026seguro")
    ok(p.url.endswith("/inicio"), "administrador entra al inicio con contraseña + código")
    ok("Andrés Felipe Rojas" in p.inner_text(".rail-pie"), "nombre en el menú")

    # 5. Usuarios: crear inspector sin contraseña
    p.goto(BASE + "usuarios")
    p.wait_for_selector("tr[data-usuario]")
    fila_admin = p.locator("tr", has_text="Andrés Felipe Rojas")
    ok("Activa" in fila_admin.inner_text(), "usuarios: el administrador aparece con acceso Activa")
    ok("Sin enlace" in p.locator("tr", has_text="Camilo Andrés Peña").inner_text(), "usuarios de ejemplo: «Sin enlace»")
    ok("@ica.gov.co" in p.inner_text("tbody") and "1110456789" not in p.inner_text("tbody"), "documentos enmascarados en la lista")
    p.get_by_role("button", name="Crear usuario").click()
    p.wait_for_selector("#un")
    p.get_by_role("button", name="Crear usuario y enviar enlace").click()
    ok(visible(p, "text=Escriba nombre y apellido"), "crear usuario vacío: errores por campo del servidor")
    p.fill("#un", "Laura Gómez Ruiz")
    p.fill("#ud", "1.020.304.050")
    p.fill("#uc", "c.pena@ica.gov.co")
    p.select_option("#up", "inspector")
    if CAP:
        p.screenshot(path=f"{CAP}/5_crear_usuario.png")
    p.get_by_role("button", name="Crear usuario y enviar enlace").click()
    ok(visible(p, "text=Ese correo ya lo usa Camilo"), "correo repetido: avisa quién lo usa")
    p.fill("#uc", "l.gomez@ica.gov.co")
    p.get_by_role("button", name="Crear usuario y enviar enlace").click()
    ok(visible(p, "text=Le enviamos al correo el enlace"), "usuario creado: aviso del enlace enviado")
    ok(visible(p, "tr:has-text('Laura Gómez Ruiz'):has-text('Pendiente de activación')"), "nuevo usuario: «Pendiente de activación»")
    enlace_laura = correo("l.gomez@ica.gov.co", ENLACE)
    ok(bool(enlace_laura), "Laura recibe su enlace en Mailpit")
    p.locator("tr", has_text="Camilo Andrés Peña").get_by_role("button", name="Enviar enlace").click()
    ok(visible(p, "tr:has-text('Camilo Andrés Peña'):has-text('Pendiente de activación')"), "enviar enlace a un usuario de ejemplo")
    ok(bool(correo("c.pena@ica.gov.co", ENLACE)), "Camilo recibe su enlace")
    if CAP:
        p.wait_for_timeout(600)
        p.screenshot(path=f"{CAP}/4_usuarios.png")

    # 6. El prototipo en la misma pestaña reconoce la sesión y muestra el acceso
    p.goto(WEB + "/#/usuarios")
    ok(visible(p, ".tabla-usuarios", ms=10000), "el prototipo abre con la misma sesión (sin volver a ingresar)")
    ok(visible(p, ".tabla-usuarios tr:has-text('Laura Gómez Ruiz'):has-text('Pendiente de activación')"), "el prototipo muestra el acceso de cada cuenta")
    ok(p.locator("[data-enlace]").count() >= 1, "el prototipo tiene «Reenviar enlace»")
    if CAP:
        p.screenshot(path=f"{CAP}/6_prototipo_usuarios.png")

    # 7. Laura activa su cuenta e ingresa como inspectora
    q = b.new_context(viewport={"width": 1366, "height": 860}).new_page()
    ok(activar(q, enlace_laura, "Gansos2026campo"), "Laura activa su cuenta")
    c = ingresar(q, "l.gomez@ica.gov.co", "Gansos2026campo")
    menu = q.locator(".nav a").all_inner_texts()
    ok("Usuarios" not in menu and "Fincas" in menu, f"menú del inspector: {menu}")
    q.goto(BASE + "usuarios")
    ok(visible(q, ".bloqueo"), "inspector en /usuarios: sin permiso")
    salir(q)

    # 8. Código incorrecto y contraseña errada
    q.fill("#correo", "l.gomez@ica.gov.co")
    q.fill("#clave", "Gansos2026campo")
    q.get_by_role("button", name="Continuar").click()
    q.wait_for_selector(".codigo input")
    if CAP:
        q.screenshot(path=f"{CAP}/2_codigo.png")
    for i in range(6):
        q.locator(".codigo input").nth(i).fill("0")
    ok(visible(q, "text=Código incorrecto"), "código incorrecto: no entra")
    q.get_by_role("button", name="Volver").click()
    q.fill("#correo", "l.gomez@ica.gov.co")
    q.fill("#clave", "Equivocada2026")
    q.get_by_role("button", name="Continuar").click()
    ok(visible(q, "text=Intentos restantes: 4"), "contraseña errada: cuenta los intentos")

    # 9. ¿Olvidó su contraseña?
    q.get_by_role("button", name="¿Olvidó su contraseña?").click()
    q.fill("#correoR", "l.gomez@ica.gov.co")
    q.get_by_role("button", name="Enviar enlace").click()
    ok(visible(q, "text=Revise su correo"), "recuperar: mensaje que no revela si el correo existe")
    enlace_rec = correo("l.gomez@ica.gov.co", r"(/plataforma/restablecer/[A-Za-z0-9_-]+)")
    ok(bool(enlace_rec), "llega el enlace para restablecer")
    ok(activar(q, enlace_rec, "Nueva2026clave"), "contraseña restablecida")
    ingresar(q, "l.gomez@ica.gov.co", "Nueva2026clave")
    ok(q.url.endswith("/inicio"), "ingresa con la contraseña nueva (y se borran los intentos fallidos)")

    # 10. El administrador inactiva a Laura: su sesión se cierra
    p.goto(BASE + "usuarios")
    p.wait_for_selector("tr[data-usuario]")
    p.locator("tr", has_text="Laura Gómez Ruiz").get_by_role("button", name="Editar").click()
    p.get_by_role("button", name="Inactivar cuenta").click()
    p.locator(".modal", has_text="No podrá ingresar").get_by_role("button", name="Inactivar", exact=True).click()
    ok(visible(p, "tr:has-text('Laura Gómez Ruiz'):has-text('Inactivo')"), "inactivar usuario")
    q.goto(BASE + "fincas")
    ok(visible(q, "#correo", ms=8000), "la sesión de la usuaria inactivada se cierra")

    # 11. Mi cuenta: cambiar contraseña
    p.goto(BASE + "cuenta")
    p.wait_for_selector("#ca")
    p.fill("#ca", "Patos2026seguro")
    p.fill("#cn", "Otra2026segura")
    p.fill("#cc", "Otra2026segura")
    p.get_by_role("button", name="Cambiar contraseña").click()
    ok(visible(p, "text=Contraseña actualizada"), "Mi cuenta: cambiar contraseña")

    # 12. Cerrar sesión cierra también el prototipo
    salir(p)
    p.goto(BASE + "inicio")
    ok(visible(p, "#correo"), "después de cerrar sesión, /inicio pide ingresar")
    r = p.evaluate("fetch('/api/auth/sesion').then(r => r.status)")
    ok(r == 401, "la cookie de sesión quedó cerrada en el servidor")

    # 13. Móvil
    m = b.new_context(viewport={"width": 390, "height": 800}).new_page()
    m.goto(BASE + "ingreso")
    m.wait_for_selector("#correo")
    ok(m.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "ingreso sin desplazamiento horizontal en móvil")
    ok(not errores, f"sin errores de JavaScript {errores[:2]}")
    b.close()

print(f"\n{'TODO BIEN' if not fallas else str(len(fallas)) + ' fallas'}")
sys.exit(1 if fallas else 0)
