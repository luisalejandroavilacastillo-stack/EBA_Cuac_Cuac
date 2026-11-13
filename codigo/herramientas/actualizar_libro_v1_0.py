# -*- coding: utf-8 -*-
"""Actualiza el libro de requerimientos a la plataforma 1.0 (Angular + API Node.js + MariaDB).

Agrega historias HU-213 a HU-224 y reglas RN-209 a RN-222 (ingreso real, activación por enlace, trabajo sin señal,
privacidad por perfil y configuración segura), ajusta RN-195, rehace la hoja 12_Casos_de_Uso desde
docs/requerimientos/CASOS_DE_USO.md y crea las hojas 17_Cambios_v1_0 y 18_Diagramas_v1_0.
Es idempotente: si el libro ya tiene la hoja 17_Cambios_v1_0, no hace nada.
Uso:  python herramientas/actualizar_libro_v1_0.py   (después de actualizar_libro_v0_25.py)
"""
import importlib.util
import pathlib
import re

from openpyxl import load_workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Font, PatternFill

RAIZ = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("v24", RAIZ / "herramientas/actualizar_libro_v0_24.py")
v24 = importlib.util.module_from_spec(spec); spec.loader.exec_module(v24)
LIBRO, UML, VERDE, CLARO = v24.LIBRO, v24.UML, v24.VERDE, v24.CLARO

M_AD, M_EV, M_SR = "Administrador", "Evaluación", "Seguimiento y reportes"
P = "Plataforma 1.0."
# (módulo, id, RF, persona, historia, para, criterios, reglas, norma, prioridad, puntos, tamaño, validación, motivo)
HU = [
    (M_AD, "HU-213", "RF02", "P5", "Como administrador, quiero crear la cuenta sin escribir una contraseña,", "para que solo la persona conozca la suya.",
     "Al crear el usuario el servidor envía al correo un enlace de un solo uso (48 horas); columna «Acceso»: Pendiente de activación, Enlace vencido, Sin enlace o Activa.", "RN-209, RN-210", "—", "Alta", "3", "S", "Nueva", P),
    (M_AD, "HU-214", "RF02", "P5", "Como administrador, quiero reenviar el enlace de activación,", "para que entre quien no alcanzó a usarlo.",
     "Botón «Reenviar enlace» si el enlace venció o no se envió; el anterior deja de servir; queda en la bitácora.", "RN-210", "—", "Media", "1", "XS", "Nueva", P),
    (M_AD, "HU-215", "RF01", "P1–P5", "Como usuario, quiero crear mi contraseña con el enlace que me llegó al correo,", "para activar mi cuenta.",
     "Enlace válido, sin usar y vigente; reglas visibles mientras se escribe; al guardarla se invalida el enlace y se puede ingresar.", "RN-209, RN-211", "—", "Alta", "2", "S", "Nueva", P),
    (M_AD, "HU-216", "RF01", "P1–P5", "Como usuario, quiero ingresar con mi correo, mi contraseña y un código que llega a mi correo,", "para que nadie entre con mi cuenta aunque conozca mi contraseña.",
     "Código de 6 dígitos (10 minutos) con «Reenviar código»; mensajes que no revelan si el correo existe; la pantalla no muestra perfiles ni usuarios.", "RN-212, RN-213", "—", "Alta", "5", "M", "Nueva", P),
    (M_AD, "HU-217", "RF01", "P1–P5", "Como usuario, quiero que mi sesión se cierre sola si dejo el equipo,", "para proteger los datos en equipos compartidos.",
     "15 minutos sin uso (aviso un minuto antes con «Seguir conectado»); máximo 12 horas; la sesión vive en una cookie HttpOnly.", "RN-214", "—", "Alta", "2", "S", "Nueva", P),
    (M_AD, "HU-218", "RF04", "P1–P5", "Como usuario, quiero recuperar mi contraseña con un enlace,", "para volver a entrar sin pedir ayuda.",
     "Enlace de 30 minutos y un solo uso; misma respuesta exista o no el correo; al cambiarla se cierran las sesiones abiertas.", "RN-211, RN-215", "—", "Alta", "2", "S", "Nueva", P),
    (M_AD, "HU-219", "RF04", "P1–P5", "Como usuario, quiero cambiar mi contraseña desde Mi cuenta,", "para renovarla cuando lo necesite.",
     "Pide la actual y la nueva con las mismas reglas; cierra las otras sesiones.", "RN-211", "—", "Media", "1", "XS", "Nueva", P),
    (M_EV, "HU-220", "RF14", "P1", "Como inspector, quiero diligenciar la visita aunque no haya señal en la finca,", "para no perder lo que registro en campo.",
     "La aplicación abre sin conexión con la última copia de mis datos; cada cambio queda en el equipo y se envía solo al volver la señal; aviso «Sin señal».", "RN-216, RN-217", "5.5, 5.6", "Alta", "8", "L", "Nueva", P),
    (M_EV, "HU-221", "RF14", "P1, P2", "Como inspector, quiero que si otra persona cambió la visita se me avise y se cargue lo último,", "para no borrar sin querer el trabajo de otro.",
     "Cada cambio lleva la versión del registro; si no coincide (409) se carga la versión de la base y se avisa.", "RN-218", "—", "Media", "2", "S", "Nueva", P),
    (M_SR, "HU-222", "RF30", "P4", "Como productor, quiero que la plataforma solo me entregue los datos de mis fincas,", "para que mis datos y los de los demás estén protegidos.",
     "El servidor entrega a cada perfil solo lo suyo; de las visitas sin aprobar, el productor solo recibe el estado.", "RN-219", "—", "Alta", "3", "S", "Nueva", P),
    (M_AD, "HU-223", "RF10", "P5", "Como administrador, quiero ver si el asistente usa la IA y probar la conexión,", "para saber cómo responde sin manejar la clave.",
     "Parametrización muestra «Activo» (Gemini) o «Modo local» y el botón «Probar conexión»; la clave solo está en el .env del servidor.", "RN-220", "—", "Media", "1", "XS", "Nueva", P),
    (M_AD, "HU-224", "RF10", "P5", "Como responsable de la instalación, quiero que el servidor no arranque con una configuración insegura,", "para no publicar por error una plataforma de prueba.",
     "En producción la API no arranca con ingreso de demostración, datos de ejemplo, clave de ejemplo de la base, localhost como dirección pública o https sin cookie segura.", "RN-221, RN-222", "—", "Alta", "2", "S", "Nueva", P),
]
# (módulo, id, tema, regla, entidad, RF, tipo, validación, motivo)
RN = [
    (M_AD, "RN-209", "Activación", "La cuenta se crea sin contraseña. La persona la crea con un enlace de un solo uso que vence en 48 horas; se guarda solo la huella (SHA-256) del enlace.", "Usuario, EnlaceCuenta", "RF02", "Seguridad", "Nueva", P),
    (M_AD, "RN-210", "Reenvío del enlace", "El administrador puede enviar un enlace nuevo si el anterior venció o no se envió; el anterior deja de servir.", "EnlaceCuenta", "RF02", "Seguridad", "Nueva", P),
    (M_AD, "RN-211", "Contraseña", "Mínimo 10 caracteres, con letras y números, sin el correo ni el documento de la persona. Se guarda cifrada con scrypt; nadie la puede ver.", "Usuario", "RF01", "Validación", "Nueva", P),
    (M_AD, "RN-212", "Código de ingreso", "Tras la contraseña, el ingreso pide un código de 6 dígitos enviado al correo, que vence en 10 minutos; se guarda solo su huella.", "CodigoVerificacion", "RF01", "Seguridad", "Nueva", P),
    (M_AD, "RN-213", "Bloqueo", "Cinco contraseñas erradas bloquean la cuenta 15 minutos. Los mensajes no revelan si el correo existe ni si la cuenta está bloqueada o sin activar.", "Usuario", "RF01", "Seguridad", "Nueva", P),
    (M_AD, "RN-214", "Sesión", "La sesión vive en una cookie HttpOnly y SameSite=Strict (Secure con https); se cierra tras 15 minutos sin uso y dura como máximo 12 horas.", "Sesion", "RF01", "Seguridad", "Nueva", P),
    (M_AD, "RN-215", "Recuperación", "El enlace para restablecer la contraseña vence en 30 minutos y es de un solo uso; la respuesta es la misma exista o no el correo; al cambiarla se cierran las sesiones.", "EnlaceCuenta, Sesion", "RF04", "Seguridad", "Nueva", P),
    (M_EV, "RN-216", "Trabajo sin señal", "Sin señal, la aplicación abre desde el equipo con la última copia de los datos de quien ingresó; los cambios quedan en el equipo y se envían al volver la señal. Finalizar y enviar a aprobación necesita señal.", "Evaluacion", "RF14", "Usabilidad", "Nueva", P),
    (M_EV, "RN-217", "Copia en el equipo", "La copia de los datos y la identidad guardada (sin correo, documento ni teléfono) son solo de quien ingresó y se borran al cerrar la sesión; sin señal se puede abrir hasta 12 horas después del último ingreso.", "Evaluacion, Usuario", "RF14", "Seguridad", "Nueva", P),
    (M_EV, "RN-218", "Versiones", "Cada cambio lleva la versión del registro; si otra persona lo cambió antes, el servidor lo rechaza (409) y se carga la versión de la base.", "Evaluacion, Finca", "RF14", "Validación", "Nueva", P),
    (M_SR, "RN-219", "Privacidad por perfil", "El servidor entrega a cada perfil solo lo suyo: productor, sus fincas y de las visitas sin aprobar solo el estado; inspector, sus fincas asignadas; correo, documento y teléfono solo al administrador y a cada persona los suyos; bitácora solo al administrador; avisos solo a quien van dirigidos.", "Usuario, Finca, Evaluacion", "RF30", "Seguridad", "Nueva", P),
    (M_AD, "RN-220", "Clave de la IA", "La clave del asistente con IA solo está en el .env del servidor; nunca llega al navegador. Antes de cada pregunta el servidor quita nombres, documentos, correos y teléfonos.", "Asistente", "RF10", "Seguridad", "Nueva", P),
    (M_AD, "RN-221", "Bitácora confiable", "El usuario y la hora de cada registro de la bitácora los pone el servidor con la sesión; sin sesión no se escribe ni se cambia ningún dato.", "Bitacora", "RF10", "Seguridad", "Nueva", P),
    (M_AD, "RN-222", "Producción", "En producción la API no arranca con ingreso de demostración, datos de ejemplo, la clave de ejemplo de la base, localhost como dirección pública o https sin cookie segura. El navegador aplica una política de contenido que solo permite el código de la plataforma.", "Configuracion", "RF10", "Seguridad", "Nueva", P),
]
AJUSTES_RN = {
    "RN-195": ("Se ingresa con correo y contraseña y un código de 6 dígitos enviado al correo (RN-212); el perfil es el de la cuenta, ya no se elige. La pantalla de ingreso no muestra perfiles, usuarios ni correos.",
               "Ajustada", "Plataforma 1.0: ingreso real (reemplaza el ingreso por perfil del prototipo)."),
}
CAMBIOS = [
    ("1.0.0", "Ingreso real: cuenta sin contraseña con enlace de activación, contraseña cifrada, código al correo, bloqueo, recuperación y cierre por inactividad.", "CU-01 a CU-03, CU-24, CU-32", "HU-213 a HU-219"),
    ("1.0.0", "Toda la aplicación en Angular con el mismo cálculo y flujo del prototipo (verificado contra él): fincas, asignación y revisión, evaluación en campo, resultado y constancia, reportes, ayuda, asistente y administración.", "CU-04 a CU-31", "—"),
    ("1.0.0", "Trabajo sin señal en campo y control de versiones de cada cambio.", "CU-33, CU-09 a CU-15", "HU-220, HU-221"),
    ("1.0.0", "Privacidad por perfil en el servidor, bitácora con usuario y hora del servidor, política de contenido y configuración de producción revisada al arrancar.", "CU-21, CU-24 a CU-26", "HU-222 a HU-224"),
    ("1.0.0", "Base de datos MariaDB con migraciones automáticas (001 a 004); los datos de ejemplo los carga la API; el prototipo deja de publicarse.", "—", "—"),
]
DIAG = [("Flujo · Cuenta: crear, activar, ingresar y recuperar", "actividad/act_09_cuenta.png"), ("Flujo · Trabajo sin señal en campo", "actividad/act_10_sin_senal.png"),
        ("Estados · Cuenta de usuario", "estados/est_06_cuenta.png"), ("Secuencia · Ingreso con código al correo", "secuencia/sec_06_ingreso.png"),
        ("Clases · Autenticación y sesión", "clases/cls_2_autenticacion.png"), ("Paquetes y despliegue de la plataforma", "paquetes/paq_02_plataforma.png"),
        ("Casos de uso · Inspector", "casos_de_uso/cu_01_inspector.png"), ("Casos de uso · Administrador", "casos_de_uso/cu_04_administrador.png")]


def main():
    wb = load_workbook(LIBRO)
    if "17_Cambios_v1_0" in wb.sheetnames:
        print("El libro ya está en la plataforma 1.0."); return
    if "15_Cambios_v0_25" not in wb.sheetnames:
        raise SystemExit("Primero ejecute actualizar_libro_v0_25.py")
    v24.anexar(wb["4_Historias_Usuario"], HU, "HU-01 a HU-212", "HU-01 a HU-224")
    ws = wb["6_Reglas_Negocio"]
    for fila in ws.iter_rows(min_row=1, max_row=ws.max_row):
        rid = fila[2].value
        if rid in AJUSTES_RN:
            txt, val, mot = AJUSTES_RN[rid]; fila[4].value, fila[8].value, fila[9].value = txt, val, mot
    v24.anexar(ws, RN, "RN-01 a RN-208", "RN-01 a RN-222")
    pos = wb.sheetnames.index("12_Casos_de_Uso")
    del wb["12_Casos_de_Uso"]
    filas = []
    for l in (RAIZ / "docs/requerimientos/CASOS_DE_USO.md").read_text(encoding="utf-8").splitlines():
        if not re.match(r"^\| CU-\d\d \|", l): continue
        p = [x.strip() for x in l.strip("|").split("|")]
        filas.append([p[0], p[1], "Sí" if p[2] else "", "Sí" if p[3] else "", "Sí" if p[4] else "", "Sí" if p[5] else "", re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", p[6])])
    v24.hoja_tabla(wb, "12_Casos_de_Uso", "  Casos de uso CU-01 a CU-33 · plataforma 1.0",
                   "  Especificación completa en docs/requerimientos/CASOS_DE_USO.md · diagramas en docs/uml/casos_de_uso",
                   ["ID", "Caso de uso", "Inspector", "Coordinador", "Productor", "Administrador", "Diagrama de flujo"], filas, [9, 44, 11, 12, 11, 13, 26])
    hoja = wb["12_Casos_de_Uso"]; wb._sheets.remove(hoja); wb._sheets.insert(pos, hoja)
    v24.hoja_tabla(wb, "17_Cambios_v1_0", "  Cambios de la plataforma 1.0 (Angular + API Node.js + MariaDB)",
                   "  Qué cambió frente al prototipo v0.25, qué casos de uso toca y qué historias nuevas lo describen",
                   ["Versión", "Cambio", "Casos de uso", "Historias"], CAMBIOS, [9, 90, 26, 30])
    ws = wb.create_sheet("18_Diagramas_v1_0"); ws.column_dimensions["A"].width = 2; ws.column_dimensions["B"].width = 120
    t = ws.cell(1, 2, "  Diagramas de la plataforma 1.0 (todos en docs/uml, en SVG y PNG)"); t.font = Font(name="Arial", size=14, bold=True, color="FFFFFFFF")
    t.fill = PatternFill("solid", fgColor=VERDE)
    fila = 3
    for nombre, ruta in DIAG:
        c = ws.cell(fila, 2, "  " + nombre); c.font = Font(name="Arial", size=11, bold=True, color=VERDE); c.fill = PatternFill("solid", fgColor=CLARO)
        img = XLImage(str(UML / ruta)); esc = min(1.0, 900 / img.width); img.width, img.height = int(img.width * esc), int(img.height * esc)
        ws.add_image(img, f"B{fila + 1}"); fila += 2 + int(img.height / 20) + 1
    port = wb["Portada"]; r = port.max_row + 1
    port.cell(r, 2, "Actualización plataforma 1.0: ingreso real, trabajo sin señal, privacidad por perfil y configuración segura; HU-213 a HU-224, RN-209 a RN-222; hojas 17_Cambios_v1_0 y 18_Diagramas_v1_0.").font = Font(name="Arial", size=9, bold=True, color=VERDE)
    wb.save(LIBRO); print("Libro actualizado:", LIBRO.name)


if __name__ == "__main__":
    main()
