# -*- coding: utf-8 -*-
"""Actualiza el libro de requerimientos a la v0.25 del prototipo (perfiles reorganizados, ficha del ave y constancia).

Agrega historias HU-193 a HU-212 y reglas RN-191 a RN-208, ajusta RN-51 y RN-140, rehace la hoja 12_Casos_de_Uso
desde docs/requerimientos/CASOS_DE_USO.md y crea las hojas 15_Cambios_v0_25 y 16_Diagramas_v0_25.
Es idempotente: si el libro ya tiene la hoja 15_Cambios_v0_25, no hace nada.
Uso:  python herramientas/actualizar_libro_v0_25.py   (después de actualizar_libro_v0_24.py)
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

M_UP, M_EV, M_SR, M_AD = "Unidades productivas", "Evaluación", "Seguimiento y reportes", "Administrador"
# (módulo, id, RF, persona, historia, para, criterios, reglas, norma, prioridad, puntos, tamaño, validación, motivo)
HU = [
    (M_AD, "HU-193", "RF02", "P5", "Como administrador, quiero crear usuarios con su perfil (administrador, coordinador, inspector o productor),", "para que cada persona entre solo a lo que le corresponde.",
     "Botón «Crear usuario»: nombre, tipo y número de documento, correo, teléfono y perfil; sin matrícula profesional; correo y documento únicos; queda activo.", "RN-191, RN-192", "—", "Alta", "3", "S", "Nueva", "Prototipo v0.25."),
    (M_AD, "HU-194", "RF03", "P5", "Como administrador, quiero editar, inactivar, reactivar o eliminar usuarios,", "para mantener las cuentas al día sin perder el historial.",
     "Cambio de perfil en la bitácora; eliminar solo sin historial; inactivo no entra ni recibe asignaciones; no se inactiva a sí mismo; búsqueda y filtro por perfil.", "RN-193, RN-194", "—", "Alta", "3", "S", "Nueva", "Prototipo v0.25."),
    (M_AD, "HU-195", "RF02", "P5", "Como administrador, quiero que al crear un productor se vincule con las fincas que tienen su documento,", "para que vea sus fincas sin trámites adicionales.",
     "Vinculación por tipo y número de documento del titular; mensaje con el número de fincas vinculadas.", "RN-192", "—", "Media", "2", "S", "Nueva", "Prototipo v0.25."),
    (M_AD, "HU-196", "RF01", "P1–P5", "Como usuario, quiero elegir mi perfil y entrar con mi correo,", "para que un mismo perfil sirva a varias personas (inspector o inspectora).",
     "Un botón por perfil, sin conteos ni correos visibles (sitio público); el correo debe corresponder al perfil y al usuario activo.", "RN-195", "—", "Alta", "2", "S", "Nueva", "Prototipo v0.25."),
    (M_EV, "HU-197", "RF13", "P2", "Como coordinador, quiero asignar cada inspección a un inspector con la fecha acordada,", "para organizar el trabajo de campo.",
     "Ventana «Asignar inspección»: tipo de visita, fecha ≥ hoy e inspector (por defecto el que conoce la finca); la visita queda «Asignada» y se avisa al inspector.", "RN-196, RN-197", "—", "Alta", "3", "S", "Nueva", "Prototipo v0.25."),
    (M_EV, "HU-198", "RF13", "P2", "Como coordinador, quiero reasignar una visita que aún no se envía,", "para cubrir ausencias sin perder lo registrado.",
     "Asignada, En proceso o Devuelta; otro inspector y, si no ha empezado, otra fecha; avisos al nuevo y al anterior.", "RN-197", "—", "Media", "2", "S", "Nueva", "Prototipo v0.25."),
    (M_EV, "HU-199", "RF14", "P1", "Como inspector, quiero ver solo las fincas que me asignaron y diligenciar solo mis visitas,", "para concentrarme en mi trabajo.",
     "Fincas con alguna visita asignada a él; edita solo sus visitas Asignadas, En proceso o Devueltas.", "RN-198", "—", "Alta", "2", "S", "Nueva", "Prototipo v0.25."),
    (M_EV, "HU-200", "RF14", "P1", "Como inspector, quiero ver el historial aprobado de las fincas que me asignan, aunque lo haya calificado otro inspector,", "para llegar a la visita sabiendo qué se encontró antes.",
     "Solo lectura; solo visitas aprobadas de otros; no ve visitas ajenas en curso; aplica a ficha, resultado y reportes.", "RN-199", "—", "Alta", "2", "S", "Nueva", "Prototipo v0.25."),
    (M_EV, "HU-201", "RF22", "P1", "Como inspector, quiero finalizar la visita y enviarla a aprobación,", "para que el coordinador revise el resultado antes de publicarlo.",
     "Botón «Finalizar y enviar a aprobación»; calcula el resultado con la lógica de siempre; estado «Pendiente de aprobación»; aviso al coordinador; ya no se edita.", "RN-200", "—", "Alta", "3", "S", "Nueva", "Prototipo v0.25."),
    (M_EV, "HU-202", "RF22", "P2", "Como coordinador, quiero aprobar o devolver con observación lo que el inspector finaliza,", "para validar el resultado sin cambiar las calificaciones.",
     "Panel «Revisión del coordinador»: puntaje automático, si cumple, fecha propuesta; Aprobar o Devolver (observación obligatoria); historial de revisión.", "RN-200, RN-201", "—", "Alta", "5", "M", "Nueva", "Prototipo v0.25."),
    (M_EV, "HU-203", "RF22", "P1", "Como inspector, quiero ver la observación de una visita devuelta y reenviarla corregida,", "para atender lo que pide el coordinador.",
     "Aviso en rojo en el cierre; botón «Corregida: reenviar a aprobación»; vuelve a Pendiente de aprobación.", "RN-201", "—", "Alta", "2", "S", "Nueva", "Prototipo v0.25."),
    (M_SR, "HU-204", "RF27+", "P2", "Como coordinador, quiero que el seguimiento se programe al aprobar, con la fecha propuesta por el inspector,", "para que solo lo aprobado genere visitas nuevas.",
     "Ventana de aprobación con fecha e inspector del seguimiento N de M; crea la visita Programada retomando la anterior.", "RN-202", "—", "Alta", "3", "S", "Nueva", "Prototipo v0.25."),
    (M_SR, "HU-205", "RF27+", "P1", "Como inspector, quiero reprogramar el seguimiento que me asignaron con un motivo,", "para ajustar la fecha si el productor o el clima lo exigen.",
     "Solo antes de iniciar; motivo obligatorio; historial de reprogramaciones; aviso al coordinador y al productor.", "RN-203", "—", "Media", "2", "S", "Nueva", "Prototipo v0.25."),
    (M_SR, "HU-206", "RF36", "P4", "Como productor, quiero ver el estado de mi inspección sin puntajes hasta que se apruebe,", "para no confundirme con resultados preliminares.",
     "«En evaluación», «En revisión del ICA»; no abre visitas sin aprobar; ve el resultado y el plan de mejora al aprobarse.", "RN-204", "—", "Alta", "2", "S", "Nueva", "Prototipo v0.25."),
    (M_SR, "HU-207", "RF36", "P4", "Como productor, quiero descargar la constancia de cumplimiento cuando mi finca cumple,", "para demostrar el bienestar animal de mi producción.",
     "«Certificada» y «Descargar constancia»; página lista para PDF; «Constancia vencida» al año; «Plan de mejora» si no cumple.", "RN-205, RN-206", "—", "Alta", "3", "S", "Nueva", "Prototipo v0.25."),
    (M_SR, "HU-208", "RF36", "P2", "Como coordinador, quiero que la constancia se emita sola al aprobar una visita que cumple,", "para no hacer el documento a mano.",
     "Código CER-AAAA-NNNNN, verificación, datos de la finca, especie, resultado, inspector, coordinador, emisión y vigencia de 1 año.", "RN-205", "—", "Alta", "3", "S", "Nueva", "Prototipo v0.25."),
    (M_SR, "HU-209", "RF30", "P1–P5", "Como usuario, quiero avisos dentro de la aplicación,", "para enterarme de asignaciones, devoluciones, aprobaciones y reprogramaciones.",
     "Campana con avisos sin leer por usuario o perfil; al abrir queda leído; el administrador no recibe los de aprobar.", "RN-207", "—", "Media", "2", "S", "Nueva", "Prototipo v0.25."),
    (M_SR, "HU-210", "RF30", "P2, P5", "Como coordinador, quiero en mi inicio lo que está por aprobar y por asignar,", "para atender primero lo urgente.",
     "Bandeja «Por aprobar y por asignar» (pendientes, devueltas, sin asignar); el administrador ve solo «Por asignar».", "RN-140, RN-207", "—", "Media", "2", "S", "Nueva", "Prototipo v0.25."),
    (M_EV, "HU-211", "RF15", "P1", "Como inspector, quiero llenar patos y gansos con la misma ficha del ave,", "para que el recorrido sea práctico y rápido en las dos especies.",
     "Mismo orden, pestañas Ave 1…5, botones de texto y color sin números; «Sin hallazgos · siguiente ave» y «Lo demás sin hallazgos»; opciones según la norma de cada especie.", "RN-208", "6.2, 7.2", "Alta", "3", "S", "Nueva", "Prototipo v0.25."),
    (M_EV, "HU-212", "RF15", "P1", "Como inspector, quiero «Igual en todo el galpón» también en los recursos de gansos,", "para no repetir la misma respuesta en cada punto.",
     "Comedero, bebedero y acceso al agua; copia a los puntos del galpón y se cambia solo el distinto.", "RN-208", "7.1", "Media", "1", "XS", "Nueva", "Prototipo v0.25."),
]
# (módulo, id, tema, regla, entidad, RF, tipo, validación, motivo)
RN = [
    (M_AD, "RN-191", "Perfiles", "Hay cuatro perfiles: administrador, coordinador, inspector y productor. El nombre visible del perfil es el mismo para hombres y mujeres.", "Usuario", "RF02", "Seguridad", "Nueva", "Prototipo v0.25."),
    (M_AD, "RN-192", "Creación de usuarios", "Solo el administrador crea cuentas (no hay registro propio del productor). Correo y documento son únicos. Un productor se vincula con las fincas cuyo titular tiene su mismo documento.", "Usuario", "RF02", "Validación", "Nueva", "Decisión del 12 de noviembre de 2026."),
    (M_AD, "RN-193", "Baja de usuarios", "Un usuario con historial no se elimina: se inactiva. Un inactivo no entra ni recibe asignaciones. El administrador no se inactiva ni se cambia el perfil a sí mismo.", "Usuario", "RF03", "Validación", "Nueva", "Prototipo v0.25."),
    (M_AD, "RN-194", "Cambio de perfil", "No se cambia el perfil ni se inactiva a un inspector con visitas sin aprobar; primero se reasignan.", "Usuario, Evaluacion", "RF03", "Validación", "Nueva", "Prototipo v0.25."),
    (M_AD, "RN-195", "Ingreso", "Se ingresa eligiendo el perfil y escribiendo el correo; el correo debe pertenecer a un usuario activo de ese perfil. La pantalla de ingreso no muestra cuántos usuarios hay ni sus correos.", "Usuario", "RF01", "Seguridad", "Nueva", "Prototipo v0.25: sitio público."),
    (M_EV, "RN-196", "Asignación", "Cada inspección (por especie) la asigna el coordinador o el administrador a un inspector activo, con fecha ≥ hoy. No puede haber dos visitas sin aprobar para la misma finca y especie.", "Evaluacion", "RF13", "Validación", "Nueva", "Prototipo v0.25."),
    (M_EV, "RN-197", "Reasignación", "Se reasigna una visita Asignada, En proceso o Devuelta; la fecha solo cambia si no ha empezado. Se conserva lo registrado y se avisa a los dos inspectores.", "Evaluacion", "RF13", "Validación", "Nueva", "Prototipo v0.25."),
    (M_EV, "RN-198", "Quién evalúa", "Solo el inspector asignado diligencia la visita, y solo mientras está Asignada, En proceso o Devuelta. Coordinador y administrador no modifican calificaciones.", "Evaluacion", "RF14", "Seguridad", "Nueva", "Prototipo v0.25."),
    (M_EV, "RN-199", "Historial del inspector", "El inspector ve las fincas con alguna visita asignada a él; en ellas ve sus visitas y las aprobadas de cualquier inspector, en solo lectura. No ve visitas ajenas en curso.", "Evaluacion", "RF14", "Seguridad", "Nueva", "Decisión del 12 de noviembre de 2026."),
    (M_EV, "RN-200", "Aprobación", "Al finalizar, la visita queda Pendiente de aprobación. Solo el coordinador aprueba o devuelve; el administrador no aprueba ni recibe esos avisos. La visita aprobada queda Finalizada y es la única que ve el productor.", "Evaluacion, Revision", "RF22", "Seguridad", "Nueva", "Decisión del 12 de noviembre de 2026."),
    (M_EV, "RN-201", "Devolución", "Devolver exige una observación. La visita vuelve al inspector (Devuelta) y él la reenvía corregida. Cada envío, devolución y aprobación queda en el historial de revisión.", "Revision", "RF22", "Validación", "Nueva", "Prototipo v0.25."),
    (M_SR, "RN-202", "Seguimiento al aprobar", "El seguimiento se crea al aprobar una visita que no cumple (no al finalizar), con la fecha propuesta por el inspector y confirmada por el coordinador; por defecto, el mismo inspector.", "ProcesoSeguimiento", "RF27+", "Cálculo", "Ajustada", "Reemplaza el seguimiento al cierre de la v0.20."),
    (M_SR, "RN-203", "Reprogramación", "Reprograman el coordinador, el administrador y el inspector asignado, solo antes de iniciar la visita, con motivo obligatorio; queda en el historial y se avisa. Ampliar a 5 es solo del coordinador o el administrador.", "Reprogramacion", "RF27+", "Validación", "Ajustada", "Decisión del 12 de noviembre de 2026."),
    (M_SR, "RN-204", "Vista del productor", "El productor ve «En evaluación» (asignada, en proceso o devuelta) y «En revisión del ICA» (pendiente), sin puntajes; con la visita aprobada ve «Certificada», «Constancia vencida» o «Plan de mejora».", "Evaluacion", "RF36", "Seguridad", "Nueva", "Prototipo v0.25."),
    (M_SR, "RN-205", "Constancia de cumplimiento", "Al aprobar una visita que cumple (≥ 90, sin ceros, sin pendientes) se emite una constancia por especie: código consecutivo CER-AAAA-NNNNN, código de verificación y vigencia de 1 año. Una visita posterior que no cumpla no la anula.", "Constancia", "RF36", "Cálculo", "Nueva", "Decisión del 12 de noviembre de 2026."),
    (M_SR, "RN-206", "Vigencia", "La constancia vence 12 meses después de la emisión (menos un día); vencida, se requiere una nueva inspección. No hay verificación pública por código.", "Constancia", "RF36", "Validación", "Nueva", "Decisión del 12 de noviembre de 2026."),
    (M_SR, "RN-207", "Avisos", "Los avisos se dirigen a un usuario o a un perfil y se marcan leídos al abrirlos: asignación, reasignación, por aprobar, devolución, aprobación, certificación y reprogramación.", "Aviso", "RF30", "Notificación", "Nueva", "Prototipo v0.25."),
    (M_EV, "RN-208", "Ficha del ave", "Patos y gansos se llenan con la misma ficha del ave; cada especie conserva sus opciones de la norma. El botón rápido no borra hallazgos ya marcados.", "Respuesta", "RF15", "Usabilidad", "Nueva", "Prototipo v0.25."),
]
AJUSTES_RN = {
    "RN-51": ("La finca la registra el coordinador o el administrador a nombre de un productor; el inspector y el productor no registran fincas. Toda finca tiene exactamente un propietario vigente.",
              "Ajustada", "v0.25: el inspector ya no registra fincas (decisión del 12 de noviembre de 2026)."),
    "RN-140": ("El tablero depende del perfil: inspector (Mi trabajo con lo asignado), coordinador (por aprobar y por asignar), productor (sus fincas, lo aprobado y su constancia) y administrador (por asignar, usuarios y actividad). Promedios con 1 decimal.",
               "Ajustada", "v0.25: tableros por perfil."),
}
CAMBIOS = [
    ("0.25.0", "Perfiles reorganizados: el coordinador asigna, aprueba o devuelve; el inspector solo ve lo asignado y finaliza a «Pendiente de aprobación»; el productor ve solo lo aprobado; avisos.", "CU-08, CU-15, CU-27 a CU-29, CU-31", "HU-197 a HU-204, HU-206, HU-209, HU-210"),
    ("0.25.0", "Gestión de usuarios del administrador e ingreso con un botón por perfil y el correo.", "CU-01, CU-24", "HU-193 a HU-196"),
    ("0.25.0", "Ficha del ave única para patos y gansos; «Igual en todo el galpón» en gansos.", "CU-10, CU-11", "HU-211, HU-212"),
    ("0.25.1", "El administrador tiene los permisos del coordinador; el inspector reprograma su seguimiento con motivo.", "CU-18, CU-27", "HU-205"),
    ("0.25.1", "Aprobar o devolver es solo del coordinador; el administrador no recibe avisos de aprobación.", "CU-28, CU-31", "HU-202, HU-209"),
    ("0.25.2", "Constancia de cumplimiento al aprobar una visita que cumple; plan de mejora para el productor; historial aprobado para el inspector.", "CU-05, CU-16, CU-30", "HU-200, HU-207, HU-208"),
]
DIAG = [("Casos de uso · Coordinador", "casos_de_uso/cu_02_coordinador.png"), ("Casos de uso · Administrador", "casos_de_uso/cu_04_administrador.png"),
        ("Flujo · Asignar, evaluar, aprobar o devolver", "actividad/act_08_asignar_aprobar.png"), ("Flujo · Finalizar, aprobar y seguimiento", "actividad/act_05_cierre_seguimiento.png"),
        ("Estados · Evaluación", "estados/est_01_evaluacion.png"), ("Estados · Especie de la finca", "estados/est_03_especie.png"),
        ("Estados · Constancia", "estados/est_05_constancia.png"), ("Secuencia · Aprobación y constancia", "secuencia/sec_05_aprobacion.png"),
        ("Clases · Perfiles y usuarios", "clases/cls_1_roles_usuarios.png"), ("Clases · Modelo de dominio", "clases/cls_0_dominio.png")]


def main():
    wb = load_workbook(LIBRO)
    if "15_Cambios_v0_25" in wb.sheetnames:
        print("El libro ya está en la v0.25."); return
    if "12_Casos_de_Uso" not in wb.sheetnames:
        raise SystemExit("Primero ejecute actualizar_libro_v0_24.py")
    v24.anexar(wb["4_Historias_Usuario"], HU, "HU-01 a HU-192", "HU-01 a HU-212")
    ws = wb["6_Reglas_Negocio"]
    for fila in ws.iter_rows(min_row=1, max_row=ws.max_row):
        rid = fila[2].value
        if rid in AJUSTES_RN:
            txt, val, mot = AJUSTES_RN[rid]; fila[4].value, fila[8].value, fila[9].value = txt, val, mot
    v24.anexar(ws, RN, "RN-01 a RN-190", "RN-01 a RN-208")
    del wb["12_Casos_de_Uso"]
    filas = []
    for l in (RAIZ / "docs/requerimientos/CASOS_DE_USO.md").read_text(encoding="utf-8").splitlines():
        if not re.match(r"^\| CU-\d\d \|", l): continue
        p = [x.strip() for x in l.strip("|").split("|")]
        filas.append([p[0], p[1], "Sí" if p[2] else "", "Sí" if p[3] else "", "Sí" if p[4] else "", "Sí" if p[5] else "", re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", p[6])])
    v24.hoja_tabla(wb, "12_Casos_de_Uso", "  Casos de uso CU-01 a CU-31 · v0.25",
                   "  Especificación completa en docs/requerimientos/CASOS_DE_USO.md · diagramas en docs/uml/casos_de_uso",
                   ["ID", "Caso de uso", "Inspector", "Coordinador", "Productor", "Administrador", "Diagrama de flujo"], filas, [9, 44, 11, 12, 11, 13, 26])
    hoja = wb["12_Casos_de_Uso"]; wb._sheets.remove(hoja); wb._sheets.insert(wb.sheetnames.index("13_Cambios_v0_24"), hoja)
    v24.hoja_tabla(wb, "15_Cambios_v0_25", "  Cambios del prototipo v0.25 (perfiles, usuarios, ficha del ave y constancia)",
                   "  Qué cambió, qué casos de uso toca y qué historias nuevas lo describen",
                   ["Versión", "Cambio", "Casos de uso", "Historias"], CAMBIOS, [9, 90, 26, 30])
    ws = wb.create_sheet("16_Diagramas_v0_25"); ws.column_dimensions["A"].width = 2; ws.column_dimensions["B"].width = 120
    t = ws.cell(1, 2, "  Diagramas v0.25 (todos en docs/uml, en SVG y PNG)"); t.font = Font(name="Arial", size=14, bold=True, color="FFFFFFFF")
    t.fill = PatternFill("solid", fgColor=VERDE)
    fila = 3
    for nombre, ruta in DIAG:
        c = ws.cell(fila, 2, "  " + nombre); c.font = Font(name="Arial", size=11, bold=True, color=VERDE); c.fill = PatternFill("solid", fgColor=CLARO)
        img = XLImage(str(UML / ruta)); esc = min(1.0, 900 / img.width); img.width, img.height = int(img.width * esc), int(img.height * esc)
        ws.add_image(img, f"B{fila + 1}"); fila += 2 + int(img.height / 20) + 1
    port = wb["Portada"]; r = port.max_row + 1
    port.cell(r, 2, "Actualización v0.25: perfiles reorganizados (asignar, aprobar o devolver), usuarios, ficha del ave y constancia de cumplimiento; HU-193 a HU-212, RN-191 a RN-208; hojas 15_Cambios_v0_25 y 16_Diagramas_v0_25.").font = Font(name="Arial", size=9, bold=True, color=VERDE)
    wb.save(LIBRO); print("Libro actualizado:", LIBRO.name)


if __name__ == "__main__":
    main()
