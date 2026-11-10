# -*- coding: utf-8 -*-
"""Actualiza el libro de requerimientos a la v0.24 del prototipo.

Agrega historias HU-177 a HU-192 y reglas RN-175 a RN-190 a sus hojas (las fórmulas de trazabilidad las cuentan
solas) y crea las hojas 12_Casos_de_Uso, 13_Cambios_v0_24 y 14_Diagramas_v0_24.
Es idempotente: si el libro ya tiene las hojas nuevas, no hace nada.
Uso:  python herramientas/actualizar_libro_v0_24.py
"""
import pathlib
import re
from copy import copy

from openpyxl import load_workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

RAIZ = pathlib.Path(__file__).resolve().parents[1]
LIBRO = RAIZ / "docs/requerimientos/Diagramas_de_Clases_e_Historias_de_Usuario_Unificado_Patos_Gansos.xlsx"
UML = RAIZ / "docs/uml"

VERDE, CLARO, TEXTO = "FF1F4E3D", "FFDCEFE5", "FF262626"
fino = Side(style="thin", color="FFBFBFBF")
BORDE = Border(left=fino, right=fino, top=fino, bottom=fino)

# ── Historias nuevas (módulo, id, RF, persona, historia, para, criterios, reglas, norma, prioridad, puntos, tamaño, validación, motivo)
HU = [
    ("Unidades productivas", "HU-177", "RF07", "P1", "Como inspector, quiero registrar la finca marcando Patos y/o Gansos con el número de aves de cada especie,", "para no pedir datos de manejo que aún no conozco.",
     "Pide solo datos de la finca, persona responsable y especies con su número de aves; muestra el tramo por especie; exige al menos una especie con aves > 0.", "RN-175, RN-176", "5.6, Tabla 3", "Alta", "3", "S", "Nueva", "Prototipo v0.21: registro de finca simplificado."),
    ("Evaluación", "HU-178", "RF13", "P1", "Como inspector, quiero confirmar en la apertura el número de aves de cada especie,", "para que el tramo y la muestra se calculen con la especie evaluada.",
     "Campos por especie con el valor actual; el tramo y el plan de muestreo usan las aves de la especie (opción B).", "RN-176, RN-177", "5.6", "Alta", "3", "S", "Nueva", "Prototipo v0.22: finca mixta."),
    ("Evaluación", "HU-179", "RF15", "P1", "Como inspector, quiero recorrer los puntos revisando ganso por ganso y marcar sus novedades,", "para aplicar el muestreo de la norma también en gansos.",
     "Por punto: agua, comida, bebedero; por ganso: novedades GA01–GA07 (incluye cojera) y tratamiento (GA01, GA03, GA04, GA07).", "RN-178, RN-179", "7.2, Tablas 47–53", "Alta", "5", "M", "Nueva", "Prototipo v0.23."),
    ("Evaluación", "HU-180", "RF15", "P1", "Como inspector, quiero un botón «Los gansos restantes, sin novedad»,", "para completar el punto rápido cuando el resto del grupo está bien.",
     "Marca sin novedad a los gansos no revisados del punto; se puede deshacer ganso por ganso.", "RN-178", "7.2", "Media", "1", "XS", "Nueva", "Prototipo v0.23."),
    ("Evaluación", "HU-181", "RF15", "P1", "Como inspector, quiero abrir la ficha del indicador con el botón ? sin salir del punto,", "para resolver una duda sin perder lo registrado.",
     "Capa superpuesta con pregunta, método, cálculo y escala; Esc la cierra; se cierra al cambiar de pantalla; no enlaza a la Ayuda ni al PDF.", "RN-185", "—", "Alta", "2", "S", "Nueva", "Prototipo v0.24."),
    ("Evaluación", "HU-182", "RF20", "P1", "Como inspector, quiero indicar desde el nidal que la finca produce huevo,", "para que se evalúe el nidal y la condición corporal use la escala de postura.",
     "Botón «La finca produce huevo: evaluar el nidal»; cambia el propósito de la especie a Huevo.", "RN-180", "6.1, 6.2", "Media", "1", "XS", "Nueva", "Prototipo v0.21."),
    ("Evaluación", "HU-183", "RF20", "P1", "Como inspector, quiero que «Gansos evaluados» venga con el tamaño de la muestra,", "para no recontar y ver un aviso si escribo otro número.",
     "Prellenado con plan.aves; aviso si difiere; con recorrido hecho, los indicadores derivados se muestran en solo lectura.", "RN-179", "7.2", "Media", "1", "XS", "Nueva", "Prototipo v0.22."),
    ("Seguimiento y reportes", "HU-184", "RF27+", "P1", "Como inspector, quiero que al cerrar una visita que no cumple quede programado el seguimiento con la fecha acordada,", "para que la primera visita quede finalizada y la siguiente agendada.",
     "Fecha sugerida = plazo más lejano del plan + 1 día (o +30); aviso no bloqueante si es antes del plazo; crea la visita N de M Programada.", "RN-181, RN-182", "—", "Alta", "5", "M", "Nueva", "Prototipo v0.20."),
    ("Seguimiento y reportes", "HU-185", "RF27+", "P1", "Como inspector, quiero reprogramar un seguimiento que aún no inicia,", "para ajustar la fecha si cambia lo acordado con el productor.",
     "Solo visitas Programadas; fecha ≥ hoy; el cambio queda en la bitácora.", "RN-183", "—", "Media", "2", "S", "Nueva", "Prototipo v0.20."),
    ("Seguimiento y reportes", "HU-186", "RF36", "P1, P2", "Como inspector, quiero ver la especie en «Seguimiento programado» en el módulo Fincas,", "para saber qué fincas tienen visita agendada.",
     "Estados: Por iniciar, En proceso, Finalizada, Seguimiento programado; botón Iniciar seguimiento y Reprogramar; el productor ve Ver resultados.", "RN-184", "—", "Alta", "2", "S", "Nueva", "Prototipo v0.20."),
    ("Seguimiento y reportes", "HU-187", "RF30", "P1–P4", "Como usuario, quiero un tablero de inicio solo de visualización,", "para ver de un vistazo mi trabajo sin botones que distraigan.",
     "Sin botones; KPI con Seguimientos programados; «Mi trabajo» con vencidas primero; «Tareas pendientes» finca · especie por urgencia.", "RN-186", "—", "Alta", "3", "S", "Nueva", "Prototipo v0.19."),
    ("Seguimiento y reportes", "HU-188", "RF30", "P1–P4", "Como usuario, quiero que las gráficas usen solo inspecciones finalizadas,", "para que todos los datos sean reales.",
     "Sin datos históricos ficticios; los puntos de comparación coinciden con las visitas finalizadas.", "RN-187", "—", "Alta", "2", "S", "Nueva", "Prototipo v0.19."),
    ("Seguimiento y reportes", "HU-189", "RF24", "P1–P4", "Como usuario de cualquier perfil, quiero un asistente flotante que responda dudas sobre la norma,", "para resolverlas sin salir de la pantalla.",
     "Panel flotante con sugerencias por rol; solo temas de la norma y la evaluación; cita numeral y página; modo local o IA.", "RN-188, RN-189", "Todo el documento", "Alta", "5", "M", "Nueva", "Prototipo v0.21."),
    ("Seguimiento y reportes", "HU-190", "RF25", "P4", "Como productor, quiero que el asistente me explique qué debo mejorar y cómo,", "para cumplir en el próximo seguimiento.",
     "Usa el resultado y el plan de mejora de su finca; lenguaje sencillo; cita el numeral.", "RN-188", "—", "Media", "3", "S", "Nueva", "Prototipo v0.21."),
    ("Seguimiento y reportes", "HU-191", "RF24", "P5", "Como administrador, quiero que el asistente no envíe datos personales ni guarde el texto de las preguntas,", "para cumplir la Ley 1581.",
     "Sin documento, correo ni teléfono en el mensaje; bitácora «Consulta al asistente» sin texto; la clave de la API la configura el administrador.", "RN-190", "—", "Alta", "2", "S", "Nueva", "Prototipo v0.21."),
    ("Evaluación", "HU-192", "Ayuda", "P1", "Como inspector, quiero que el documento completo de la norma esté solo en el módulo Ayuda,", "para que durante la evaluación solo vea lo del indicador actual.",
     "Ningún botón ni enlace lleva a la Ayuda o al PDF desde la evaluación; queda solo la ficha del indicador.", "RN-185", "—", "Media", "1", "XS", "Nueva", "Prototipo v0.24."),
]
# ── Reglas nuevas (módulo, id, tema, regla, entidad, RF, tipo, validación, motivo)
RN = [
    ("Unidades productivas", "RN-175", "Registro de finca", "El registro de la finca pide solo datos de la finca, de la persona responsable y las especies con su número de aves; las características de manejo se observan en la visita.", "Finca, EspecieFinca", "RF07", "Validación", "Nueva", "Prototipo v0.21."),
    ("Unidades productivas", "RN-176", "Tramo por especie", "El tramo se calcula por especie: menos de 200 aves de la especie = traspatio; 200 o más = comercial (opción B para fincas mixtas).", "EspecieFinca", "RF07", "Cálculo", "Nueva", "Prototipo v0.22."),
    ("Evaluación", "RN-177", "Muestreo", "Plan de muestreo con 5 aves por punto: comercial 2 galpones × 5 puntos = 50 aves; traspatio 1 × 3 = 15; sin corral 1 a 3 puntos con 2 a 5 aves; si la especie tiene menos aves, se evalúan todas.", "PlanMuestreo", "RF13", "Cálculo", "Ajustada", "Tabla 3 y 5.6."),
    ("Evaluación", "RN-178", "Recorrido de gansos", "En gansos el recorrido registra cada ganso del punto con sus novedades; un ganso sin novedad marcada cuenta como sin novedad.", "RecorridoGanso", "RF15", "Validación", "Nueva", "7.2."),
    ("Evaluación", "RN-179", "Derivación de gansos", "GR02–GR05 y GA01–GA07 se derivan del recorrido (total, parte, extra y por galpón) y quedan en solo lectura; GA08, GA09 y GA10 se evalúan en la lista.", "RecorridoGanso, Respuesta", "RF20", "Cálculo", "Nueva", "Tablas 47–53."),
    ("Evaluación", "RN-180", "Propósito huevo", "Si en el nidal se indica que la finca produce huevo, el propósito de la especie pasa a Huevo y la condición corporal usa la escala de postura.", "EspecieFinca", "RF20", "Cálculo", "Nueva", "6.1, 6.2."),
    ("Seguimiento y reportes", "RN-181", "Seguimiento programado", "Al finalizar una visita que no cumple se programa el seguimiento siguiente con la fecha acordada; la visita cerrada queda Finalizada.", "ProcesoSeguimiento", "RF27+", "Estado", "Nueva", "Prototipo v0.20."),
    ("Seguimiento y reportes", "RN-182", "Fecha sugerida", "La fecha sugerida es el plazo más lejano del plan de mejora + 1 día; sin plazos, +30 días. Una fecha anterior al plazo muestra un aviso que no bloquea.", "ProcesoSeguimiento", "RF27+", "Cálculo", "Nueva", "Prototipo v0.20."),
    ("Seguimiento y reportes", "RN-183", "Reprogramación", "Solo se reprograma una visita Programada que no se ha iniciado, a una fecha no anterior a hoy; el cambio queda en la bitácora.", "Evaluacion", "RF27+", "Validación", "Nueva", "Prototipo v0.20."),
    ("Seguimiento y reportes", "RN-184", "Estados de especie", "Cada especie de la finca está en Por iniciar, En proceso, Finalizada o Seguimiento programado.", "EstadoEspecie", "RF36", "Estado", "Nueva", "Prototipo v0.20."),
    ("Evaluación", "RN-185", "Ficha del indicador", "Durante la evaluación solo se consulta la ficha del indicador actual en una capa superpuesta; el documento completo está solo en el módulo Ayuda.", "FichaIndicador", "Ayuda", "Validación", "Nueva", "Prototipo v0.24."),
    ("Seguimiento y reportes", "RN-186", "Tablero", "El tablero de inicio es de solo lectura: no tiene botones de acción.", "vInicio", "RF30", "Validación", "Nueva", "Prototipo v0.19."),
    ("Seguimiento y reportes", "RN-187", "Gráficas", "Las gráficas y comparaciones usan solo inspecciones finalizadas registradas en el sistema.", "vInicio, vReportes", "RF30", "Cálculo", "Nueva", "Prototipo v0.19."),
    ("Seguimiento y reportes", "RN-188", "Alcance del asistente", "El asistente responde solo sobre la norma ICA y la evaluación, según el rol del usuario, citando numeral y página; fuera de tema responde con su alcance.", "AsistenteNorma", "RF24", "Validación", "Nueva", "Prototipo v0.21."),
    ("Seguimiento y reportes", "RN-189", "Modo del asistente", "Sin clave configurada el asistente responde en modo local; con clave del administrador usa el servicio de IA y, si falla, vuelve al modo local.", "AsistenteNorma", "RF24", "Estado", "Nueva", "Prototipo v0.21."),
    ("Seguimiento y reportes", "RN-190", "Privacidad del asistente", "El asistente nunca envía documento, correo ni teléfono; la bitácora registra la consulta sin el texto de la pregunta (Ley 1581).", "AsistenteNorma, Bitacora", "RF25", "Validación", "Nueva", "Ley 1581 de 2012."),
]
CU = [l for l in (RAIZ / "docs/requerimientos/CASOS_DE_USO.md").read_text(encoding="utf-8").splitlines() if re.match(r"^\| CU-\d\d \|", l)]
CAMBIOS = [
    ("0.19", "Inicio como tablero de solo lectura; gráficas solo con inspecciones finalizadas; «Mi trabajo» y «Tareas pendientes».", "CU-20", "HU-187, HU-188"),
    ("0.20", "Seguimiento programado automático al cerrar sin cumplir; estado «Seguimiento programado»; reprogramar.", "CU-15, CU-17, CU-18", "HU-184 a HU-186"),
    ("0.21", "Registro de finca con especies y número de aves; botón de huevo en el nidal; asistente de la norma flotante para los cuatro roles.", "CU-04, CU-14, CU-22", "HU-177, HU-182, HU-189 a HU-191"),
    ("0.22", "Aves por especie en la apertura; tramo y muestra por especie (opción B); «Gansos evaluados» prellenado.", "CU-09, CU-12", "HU-178, HU-183"),
    ("0.23", "Recorrido por puntos de gansos ganso por ganso con tratamiento; sin «Observación del grupo»; botones sin numerales.", "CU-11", "HU-179, HU-180"),
    ("0.24", "Ficha del indicador en capa superpuesta; la Ayuda de la norma solo en su módulo.", "CU-13, CU-23", "HU-181, HU-192"),
]
DIAG = [("Casos de uso · Inspector", "casos_de_uso/cu_01_inspector.png"), ("Flujo · Inspección completa", "actividad/act_01_inspeccion_completa.png"),
        ("Flujo · Cierre y seguimiento", "actividad/act_05_cierre_seguimiento.png"), ("Flujo · Recorrido de gansos", "actividad/act_04_recorrido_gansos.png"),
        ("Estados · Proceso de seguimiento", "estados/est_02_proceso.png"), ("Clases · Modelo de dominio", "clases/cls_0_dominio.png"),
        ("Clases · Evaluación y resultado", "clases/cls_5_evaluacion_resultado.png"), ("Paquetes", "paquetes/paq_01_paquetes.png")]


def anexar(ws, filas, titulo_viejo, titulo_nuevo):
    ultima = ws.max_row
    for i, fila in enumerate(filas, start=1):
        for j, v in enumerate(fila, start=2):
            m = ws.cell(ultima, j)
            if isinstance(m.value, int) and isinstance(v, str) and v.isdigit(): v = int(v)
            c = ws.cell(ultima + i, j, v)
            c.font, c.border, c.alignment, c.fill = copy(m.font), copy(m.border), copy(m.alignment), copy(m.fill)
    ref = ws.auto_filter.ref
    if ref: ws.auto_filter.ref = re.sub(r"\d+$", str(ws.max_row), ref)
    t = ws.cell(1, 2); t.value = str(t.value).replace(titulo_viejo, titulo_nuevo)


def hoja_tabla(wb, nombre, titulo, sub, cab, filas, anchos):
    ws = wb.create_sheet(nombre)
    ws.column_dimensions["A"].width = 2
    for k, w in enumerate(anchos, start=2): ws.column_dimensions[ws.cell(1, k).column_letter].width = w
    ultima_col = 1 + len(cab)
    for r, (txt, f, fill) in enumerate([(titulo, Font(name="Arial", size=14, bold=True, color="FFFFFFFF"), VERDE),
                                        (sub, Font(name="Arial", size=9, color=VERDE), CLARO)], start=1):
        for k in range(2, ultima_col + 1): ws.cell(r, k).fill = PatternFill("solid", fgColor=fill)
        c = ws.cell(r, 2, txt); c.font = f
    for k, h in enumerate(cab, start=2):
        c = ws.cell(4, k, h); c.font = Font(name="Arial", size=9, bold=True, color="FFFFFFFF")
        c.fill = PatternFill("solid", fgColor=VERDE); c.border = BORDE; c.alignment = Alignment(wrap_text=True, vertical="center")
    for i, fila in enumerate(filas, start=5):
        for k, v in enumerate(fila, start=2):
            c = ws.cell(i, k, v); c.font = Font(name="Arial", size=8.5, color=TEXTO); c.border = BORDE
            c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes = "C5"; ws.auto_filter.ref = f"B4:{ws.cell(4, ultima_col).column_letter}{ws.max_row}"
    return ws


def main():
    wb = load_workbook(LIBRO)
    if "12_Casos_de_Uso" in wb.sheetnames:
        print("El libro ya está en la v0.24."); return
    anexar(wb["4_Historias_Usuario"], HU, "HU-01 a HU-176", "HU-01 a HU-192")
    anexar(wb["6_Reglas_Negocio"], RN, "RN-01 a RN-174", "RN-01 a RN-190")
    filas = []
    for l in CU:
        p = [x.strip() for x in l.strip("|").split("|")]
        filas.append([p[0], p[1], "Sí" if p[2] else "", "Sí" if p[3] else "", "Sí" if p[4] else "", "Sí" if p[5] else "",
                      re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", p[6])])
    hoja_tabla(wb, "12_Casos_de_Uso", "  Casos de uso CU-01 a CU-26 · v0.24",
               "  Especificación completa en docs/requerimientos/CASOS_DE_USO.md · diagramas en docs/uml/casos_de_uso",
               ["ID", "Caso de uso", "Inspector", "Coordinador", "Productor", "Administrador", "Diagrama de flujo"], filas, [9, 44, 11, 12, 11, 13, 22])
    hoja_tabla(wb, "13_Cambios_v0_24", "  Cambios del prototipo v0.19 a v0.24",
               "  Qué cambió, qué casos de uso toca y qué historias nuevas lo describen",
               ["Versión", "Cambio", "Casos de uso", "Historias"], CAMBIOS, [9, 90, 22, 26])
    ws = wb.create_sheet("14_Diagramas_v0_24"); ws.column_dimensions["A"].width = 2; ws.column_dimensions["B"].width = 120
    t = ws.cell(1, 2, "  Diagramas v0.24 (todos en docs/uml, en SVG y PNG)"); t.font = Font(name="Arial", size=14, bold=True, color="FFFFFFFF")
    t.fill = PatternFill("solid", fgColor=VERDE)
    fila = 3
    for nombre, ruta in DIAG:
        c = ws.cell(fila, 2, "  " + nombre); c.font = Font(name="Arial", size=11, bold=True, color=VERDE); c.fill = PatternFill("solid", fgColor=CLARO)
        img = XLImage(str(UML / ruta)); esc = min(1.0, 900 / img.width); img.width, img.height = int(img.width * esc), int(img.height * esc)
        ws.add_image(img, f"B{fila + 1}"); fila += 2 + int(img.height / 20) + 1
    port = wb["Portada"]; r = port.max_row + 2
    port.cell(r, 2, "Actualización v0.24: hojas 12_Casos_de_Uso, 13_Cambios_v0_24 y 14_Diagramas_v0_24; historias HU-177 a HU-192 y reglas RN-175 a RN-190.").font = Font(name="Arial", size=9, bold=True, color=VERDE)
    wb.save(LIBRO); print("Libro actualizado:", LIBRO.name)


if __name__ == "__main__":
    main()
