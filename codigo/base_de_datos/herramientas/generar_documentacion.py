# -*- coding: utf-8 -*-
"""Genera los diagramas entidad-relación (Graphviz) y el diccionario de datos (Excel)
leyendo el catálogo de una base de datos EBA ya instalada con instalar.sh.

Requisitos: psql y dot (Graphviz) en el PATH; openpyxl.
Uso:  PGHOST=... PGPORT=... PGUSER=... python base_de_datos/herramientas/generar_documentacion.py [nombre_bd]
"""
import pathlib
import subprocess
import sys
from collections import defaultdict, OrderedDict

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

BD = sys.argv[1] if len(sys.argv) > 1 else "eba"
RAIZ = pathlib.Path(__file__).resolve().parents[2]
SALIDA = RAIZ / "base_de_datos" / "modelo"
SALIDA.mkdir(parents=True, exist_ok=True)

MODULOS = OrderedDict([
    ("1_administrador", ("Administrador · seguridad y acceso (RF01–RF04, Vistas 1 y 2)", "#317330", [
        "seccional", "usuario", "rol", "permiso", "rol_permiso", "usuario_rol", "perfil_profesional", "perfil_ica",
        "perfil_productor", "perfil_consultor", "politica_contrasena", "credencial", "historial_contrasena", "sesion",
        "codigo_verificacion", "intento_acceso", "token_recuperacion", "registro_auditoria"])),
    ("2_unidades_productivas", ("Unidades productivas y catálogos (RF05–RF08, RF35, Vista 3)", "#86B327", [
        "departamento", "municipio", "finca", "asignacion_finca", "ubicacion_finca", "historial_ubicacion", "instalacion",
        "especie", "finca_especie", "categoria_etaria", "inventario_corte", "detalle_inventario", "catalogo", "item_catalogo", "festivo"])),
    ("3_parametrizacion", ("Parametrización de la metodología (RF10–RF12, Vista 4)", "#C6C309", [
        "version_metodologia", "dimension", "ponderacion_tramo", "rango_clasificacion", "criterio", "indicador",
        "regla_aplicabilidad", "pregunta", "opcion_respuesta", "nivel_escala", "regla_conversion", "regla_condicion", "plantilla_diagnostico"])),
    ("4_evaluacion", ("Evaluación y resultado (RF13–RF23, Vista 5)", "#048C38", [
        "evaluacion", "transicion_estado", "seccion_evaluacion", "guardado_parcial", "plan_muestreo", "punto_muestreo", "unidad_muestreo",
        "indicador_evaluado", "respuesta", "observacion", "evidencia", "documento_soporte", "resultado_evaluacion",
        "resultado_dimension", "diagnostico", "item_diagnostico", "hallazgo", "recurso_punto", "novedad_ave"])),
    ("5_seguimiento", ("Seguimiento, reportes y control (RF27–RF36, RF40, Vista 6)", "#745E35", [
        "plan_mejora", "accion_mejora", "proceso_seguimiento", "reprogramacion", "notificacion", "reporte"])),
    ("6_asistente", ("Asistente de la norma (RF24, RF25, Vista 7)", "#2B6CB0", [
        "configuracion_asistente", "consulta_asistente"])),
])


def sql(q):
    r = subprocess.run(["psql", "-d", BD, "-At", "-F", "\t", "-c", q], capture_output=True, text=True, check=True)
    return [line.split("\t") for line in r.stdout.splitlines() if line]


cols = defaultdict(list)
for t, c, typ, nul, dflt, pos in sql("""
    SELECT c.table_name, c.column_name,
           CASE WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
                WHEN c.data_type = 'ARRAY' THEN replace(c.udt_name, '_', '') || '[]'
                WHEN c.character_maximum_length IS NOT NULL THEN c.data_type || '(' || c.character_maximum_length || ')'
                WHEN c.numeric_precision IS NOT NULL AND c.data_type = 'numeric' THEN 'numeric(' || c.numeric_precision || ',' || c.numeric_scale || ')'
                ELSE c.data_type END,
           c.is_nullable, coalesce(c.column_default, ''), c.ordinal_position
      FROM information_schema.columns c JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
     WHERE c.table_schema = 'eba' ORDER BY c.table_name, c.ordinal_position"""):
    typ = typ.replace("character varying", "varchar").replace("timestamp with time zone", "timestamptz").replace("character(", "char(")
    cols[t].append((c, typ, nul == "YES", dflt))
pk = defaultdict(set)
for t, c in sql("""SELECT tc.table_name, kcu.column_name FROM information_schema.table_constraints tc
                   JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
                   WHERE tc.table_schema = 'eba' AND tc.constraint_type = 'PRIMARY KEY'"""):
    pk[t].add(c)
fks = sql("""SELECT cl.relname, a.attname, rf.relname
               FROM pg_constraint co JOIN pg_class cl ON cl.oid = co.conrelid JOIN pg_class rf ON rf.oid = co.confrelid
               JOIN pg_namespace n ON n.oid = cl.relnamespace
               JOIN pg_attribute a ON a.attrelid = co.conrelid AND a.attnum = co.conkey[1]
              WHERE co.contype = 'f' AND n.nspname = 'eba' ORDER BY 1, 2""")
fk = defaultdict(dict)
for t, c, r in fks:
    fk[t][c] = r
checks = defaultdict(list)
for t, d in sql("""SELECT cl.relname, pg_get_constraintdef(co.oid) FROM pg_constraint co JOIN pg_class cl ON cl.oid = co.conrelid
                   JOIN pg_namespace n ON n.oid = cl.relnamespace WHERE n.nspname = 'eba' AND co.contype IN ('c', 'u') ORDER BY 1"""):
    checks[t].append(d)
uniq_idx = defaultdict(list)
for t, d in sql("""SELECT tablename, indexdef FROM pg_indexes WHERE schemaname = 'eba' AND indexname LIKE 'ux_%' ORDER BY 1"""):
    uniq_idx[t].append(d.split(" USING btree ")[-1] + (" (índice único parcial)" if " WHERE " in d else " (índice único)"))
enums = sql("SELECT t.typname, string_agg(e.enumlabel, ' · ' ORDER BY e.enumsortorder) FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid "
            "JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'eba' GROUP BY 1 ORDER BY 1")
vistas = sql("SELECT table_name FROM information_schema.views WHERE table_schema = 'eba' ORDER BY 1")
trig = sql("SELECT event_object_table, trigger_name, string_agg(event_manipulation, ', '), action_timing FROM information_schema.triggers "
           "WHERE trigger_schema = 'eba' GROUP BY 1, 2, 4 ORDER BY 1, 2")
todas = [t for _, (_, _, ts) in MODULOS.items() for t in ts]
assert sorted(todas) == sorted(cols), set(cols) ^ set(todas)
modulo_de = {t: m for m, (_, _, ts) in MODULOS.items() for t in ts}


# ----------------------------------------------------------------- diagramas ER (Graphviz)
def nodo(t, color, externo=False):
    filas = []
    for c, typ, nul, _ in cols[t]:
        marca = "PK" if c in pk[t] else ("FK" if c in fk[t] else "")
        nombre = f"<B>{c}</B>" if c in pk[t] else (f"<I>{c}</I>" if c in fk[t] else c)
        filas.append(f'<TR><TD ALIGN="LEFT" WIDTH="22">{f'<FONT POINT-SIZE="8" COLOR="#5B6660">{marca}</FONT>' if marca else ' '}</TD>'
                     f'<TD ALIGN="LEFT">{nombre}{"" if nul else " *"}</TD><TD ALIGN="LEFT" PORT="{c}"><FONT COLOR="#5B6660">{typ}</FONT></TD></TR>')
    if externo:
        filas = [f'<TR><TD COLSPAN="3"><FONT COLOR="#5B6660">otro módulo</FONT></TD></TR>']
        color = "#8A8F98"
    return (f'"{t}" [label=<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3" BGCOLOR="white">'
            f'<TR><TD COLSPAN="3" BGCOLOR="{color}" PORT="tabla"><FONT COLOR="white"><B>{t}</B></FONT></TD></TR>{"".join(filas)}</TABLE>>];')


def dibujar(nombre, titulo, tablas, color_de):
    externos = set()
    aristas = []
    for t in tablas:
        for c, r in fk[t].items():
            if r not in tablas:
                externos.add(r)
            nul = next(x[2] for x in cols[t] if x[0] == c)
            aristas.append(f'"{t}":"{c}":e -> "{r}":"tabla":w [arrowhead={"teeodot" if nul else "teetee"}, arrowtail=crowodot, dir=both];')
    dot = ["digraph ER {", 'graph [rankdir=LR, fontname="Arial", fontsize=18, labelloc=t, nodesep=0.35, ranksep=0.9, pad=0.3, bgcolor="#F5F5F5",',
           f'       label=<<B>Modelo entidad-relación · {titulo}</B><BR/><FONT POINT-SIZE="11">PK clave primaria · FK clave foránea · * obligatorio · '
           f'pata de gallo = muchos · barra = uno · círculo = opcional · esquema eba (PostgreSQL)</FONT>>];',
           'node [shape=plain, fontname="Arial", fontsize=10];', 'edge [color="#3C4043", penwidth=1.1];']
    dot += [nodo(t, color_de(t)) for t in tablas]
    dot += [nodo(t, "#8A8F98", externo=True) for t in sorted(externos)]
    dot += aristas + ["}"]
    f = SALIDA / f"er_{nombre}.dot"
    f.write_text("\n".join(dot), encoding="utf-8")
    for fmt in ("svg", "png"):
        subprocess.run(["dot", f"-T{fmt}", "-Gdpi=110" if fmt == "png" else "-Gdpi=72", str(f), "-o", str(SALIDA / f"er_{nombre}.{fmt}")], check=True)
    print("ER:", f"er_{nombre}.svg/.png", len(tablas), "tablas")


for m, (titulo, color, tablas) in MODULOS.items():
    dibujar(m, titulo, tablas, lambda t, c=color: c)
dibujar("0_general", f"modelo completo ({len(todas)} tablas)", todas, lambda t: MODULOS[modulo_de[t]][1])

# ----------------------------------------------------------------- diccionario de datos (Excel)
DESCR = {
    "usuario": "Persona que usa la plataforma (ICA o externo). Con historial no se elimina: se inactiva con motivo.",
    "rol": "Rol de la plataforma (8 roles: de la guía a la norma).", "permiso": "Acción permitida sobre un módulo.",
    "rol_permiso": "Permisos de cada rol con vigencia (historial).", "usuario_rol": "Roles de cada usuario con vigencia (historial).",
    "perfil_profesional": "MV, MVZ o Z con matrícula COMVEZCOL vigente (firma documentos, 5.5 Fase III).",
    "perfil_ica": "Cargo y seccional del personal ICA.", "perfil_productor": "Tipo de productor (comercial o traspatio).",
    "perfil_consultor": "Acceso a término para consultores externos.", "politica_contrasena": "Parámetros de seguridad (una fila).",
    "credencial": "Contraseña cifrada (hash) y vencimiento.", "historial_contrasena": "Últimas contraseñas para no repetirlas.",
    "sesion": "Sesiones con dispositivo; cierre por inactividad a los 15 minutos.", "codigo_verificacion": "Código de 6 dígitos del doble factor.",
    "intento_acceso": "Cada intento de ingreso (inmutable).", "token_recuperacion": "Enlace de recuperación de un solo uso.",
    "registro_auditoria": "Bitácora inmutable de acciones (RF34).", "seccional": "Seccional del ICA.",
    "departamento": "Departamentos DIVIPOLA.", "municipio": "Municipios DIVIPOLA.",
    "finca": "Unidad productiva de patos o gansos (la norma la llama predio o granja).", "asignacion_finca": "Propietario, responsable técnico o encargado con vigencia.",
    "ubicacion_finca": "Ubicación vigente con coordenadas opcionales.", "historial_ubicacion": "Ubicaciones anteriores de fincas evaluadas.",
    "instalacion": "Galpones, corrales, pocetas, estanques, potreros y bodega (área útil, piso, profundidad).",
    "especie": "Pato y ganso (capítulos 6 y 7 de la norma).", "finca_especie": "Especie asociada a la finca con propósito y sistema.",
    "categoria_etaria": "Categorías por especie para el inventario y la muestra.", "inventario_corte": "Inventario a una fecha (el de la visita define el tramo).",
    "detalle_inventario": "Cantidad, edad y peso por categoría.", "catalogo": "Catálogo de apoyo (RF35).", "item_catalogo": "Ítem activo o inactivo de un catálogo.",
    "festivo": "Festivos para el plazo de 1 día hábil.",
    "version_metodologia": "Versión de la norma por especie; una sola PUBLICADA.", "dimension": "Grupo de medidas MBR, MBA o MBG.",
    "ponderacion_tramo": "Peso de la medida por tramo (Tabla 1).", "rango_clasificacion": "Niveles de la Tabla 2.",
    "criterio": "Tema que agrupa indicadores.", "indicador": "Indicador de la norma (58) con su tipo de captura.",
    "regla_aplicabilidad": "Cuándo aplica un indicador y el motivo de «No aplica».", "pregunta": "Dato que registra el inspector.",
    "opcion_respuesta": "Opciones de una pregunta de selección.", "nivel_escala": "Niveles de la tabla del indicador (100, 55, 20, 0).",
    "regla_conversion": "Porcentaje → nivel con rangos contiguos.", "regla_condicion": "Condiciones observadas → nivel (cálculo automático).",
    "plantilla_diagnostico": "Texto del diagnóstico por indicador y tipo.",
    "evaluacion": "Visita a una finca para una especie: PROGRAMADA → EN_PROCESO → FINALIZADA, o ANULADA.",
    "transicion_estado": "Cambios de estado de la evaluación (historial).", "seccion_evaluacion": "Fases I a IV de la visita (5.5).",
    "guardado_parcial": "Cada guardado (historial).", "plan_muestreo": "Muestra de la Tabla 3.", "punto_muestreo": "Puntos por corral.",
    "unidad_muestreo": "Ave, bebedero, comedero, nidal… de cada punto.", "indicador_evaluado": "Indicador dentro de una evaluación con su puntaje calculado.",
    "respuesta": "Valor registrado por pregunta y unidad.", "observacion": "Observación por pregunta, indicador o general; adendas.",
    "evidencia": "Foto, PDF o video con metadatos.", "documento_soporte": "Documento MBG con su validación (hereda de evidencia).",
    "resultado_evaluacion": "Puntaje total, nivel y carácter; cada recálculo es una versión nueva.", "resultado_dimension": "Puntaje y aporte por medida.",
    "diagnostico": "Diagnóstico del resultado.", "item_diagnostico": "Fortaleza (100), oportunidad (0–100) o incumplimiento (0).",
    "hallazgo": "Indicador en 0 ordenado por el peso de su medida.", "plan_mejora": "Plan acordado en el cierre (RF27).",
    "accion_mejora": "Acción con responsable, plazo y prioridad.", "notificacion": "Avisos enviados (RF40).", "reporte": "PDF o CSV generado (historial).",
    "proceso_seguimiento": "Proceso PRC de una finca y especie: visita inicial y hasta 3 seguimientos, ampliable a 5 con motivo (v0.24).",
    "reprogramacion": "Cambios de fecha de un seguimiento programado aún no iniciado (historial, v0.24).",
    "recurso_punto": "Agua, comida y bebedero observados en un punto del recorrido de gansos (v0.24).",
    "novedad_ave": "Novedad GA01 a GA07 de un ganso y si recibe tratamiento; sin filas = sin novedad (v0.24).",
    "configuracion_asistente": "Modo del asistente (local o IA) y referencia al secreto de la clave; la clave no se guarda (v0.24).",
    "consulta_asistente": "Registro de consultas al asistente sin el texto de la pregunta (Ley 1581, v0.24).",
}
assert set(DESCR) == set(cols), set(cols) ^ set(DESCR)

wb = Workbook()
B = Side(style="thin", color="BFBFBF")
BORDE = Border(left=B, right=B, top=B, bottom=B)
CAB = PatternFill("solid", fgColor="1F4E3D")


def hoja(nombre, titulo, enc, filas, anchos):
    ws = wb.create_sheet(nombre)
    ws["A1"] = titulo
    ws["A1"].font = Font(name="Arial", size=13, bold=True, color="1F4E3D")
    for j, h in enumerate(enc, 1):
        c = ws.cell(3, j, h)
        c.font = Font(name="Arial", size=9, bold=True, color="FFFFFF")
        c.fill = CAB
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = BORDE
    for i, f in enumerate(filas, 4):
        for j, v in enumerate(f, 1):
            c = ws.cell(i, j, v)
            c.font = Font(name="Arial", size=9, bold=(j <= 2 and enc[0] == "Módulo" and j == 2))
            c.alignment = Alignment(vertical="top", wrap_text=True)
            c.border = BORDE
    for j, w in enumerate(anchos, 1):
        ws.column_dimensions[chr(64 + j)].width = w
    ws.auto_filter.ref = f"A3:{chr(64 + len(enc))}{3 + len(filas)}"
    ws.freeze_panes = "A4"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth, ws.page_setup.fitToHeight = 1, 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    return ws


wb.remove(wb.active)
hoja("Tablas", "Diccionario de datos · tablas del esquema eba", ["Módulo", "Tabla", "Descripción", "Columnas", "Restricciones y únicos"],
     [(MODULOS[modulo_de[t]][0], t, DESCR[t], len(cols[t]), "\n".join(checks[t] + uniq_idx[t])) for t in todas], [34, 24, 60, 10, 80])
filas = []
for t in todas:
    for c, typ, nul, dflt in cols[t]:
        clave = "PK" if c in pk[t] else ""
        if c in fk[t]:
            clave = (clave + " FK → " + fk[t][c]).strip()
        filas.append((MODULOS[modulo_de[t]][0].split(" (")[0], t, c, typ, "No" if nul else "Sí", clave, dflt.replace("::character varying", "")))
hoja("Columnas", "Diccionario de datos · columnas", ["Módulo", "Tabla", "Columna", "Tipo", "Obligatoria", "Clave", "Valor por defecto"],
     filas, [30, 24, 26, 22, 11, 30, 30])
hoja("Relaciones", "Relaciones (claves foráneas)", ["Tabla", "Columna", "Referencia"], fks, [26, 26, 26])
hoja("Enumeraciones", "Tipos enumerados", ["Tipo", "Valores"], enums, [26, 110])
hoja("Reglas_en_BD", "Disparadores y vistas que aplican reglas de negocio", ["Objeto", "Nombre", "Evento", "Momento"],
     [(t, n, e, m) for t, n, e, m in trig] + [("vista", v[0], "—", "—") for v in vistas], [26, 34, 26, 12])
out = RAIZ / "base_de_datos" / "diccionario_de_datos.xlsx"
wb.save(out)
print("Diccionario:", out.relative_to(RAIZ), len(cols), "tablas,", len(filas), "columnas,", len(fks), "relaciones")
