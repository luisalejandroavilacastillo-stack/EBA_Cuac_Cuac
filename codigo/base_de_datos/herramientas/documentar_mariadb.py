#!/usr/bin/env python3
"""Documenta la base de datos MariaDB de la plataforma 1.0 a partir de la base instalada (contenedor eba-mariadb):
diccionario de datos (base_de_datos/mariadb/DICCIONARIO.md) y diagrama entidad-relación (er_mariadb.dot, .svg y .png).
Uso: python base_de_datos/herramientas/documentar_mariadb.py   (con la plataforma corriendo en Docker; requiere graphviz)"""
import json, pathlib, subprocess

SALIDA = pathlib.Path(__file__).resolve().parents[1] / "mariadb"
CONTENEDOR, BASE = "eba-mariadb", "eba"


def consulta(sql):
    r = subprocess.run(["docker", "exec", CONTENEDOR, "sh", "-c", f'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -N -B {BASE} -e "$0"', sql],
                       capture_output=True, text=True, check=True)
    return [l.split("\t") for l in r.stdout.splitlines() if l]


tablas = consulta("SELECT table_name, table_type, IFNULL(table_comment,'') FROM information_schema.tables WHERE table_schema=DATABASE() ORDER BY table_type, table_name")
cols = consulta("SELECT table_name, column_name, column_type, is_nullable, column_key, IFNULL(column_default,''), IFNULL(column_comment,'') FROM information_schema.columns WHERE table_schema=DATABASE() ORDER BY table_name, ordinal_position")
fks = consulta("SELECT table_name, column_name, referenced_table_name, referenced_column_name FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND referenced_table_name IS NOT NULL ORDER BY table_name")
migr = consulta("SELECT version, aplicada FROM esquema_version ORDER BY version") if any(t[0] == "esquema_version" for t in tablas) else []

# Descripción de cada tabla (las migraciones no les ponen comentario).
DESCRIPCION = {
    "aviso": "Avisos dentro de la aplicación (asignación, devolución, por aprobar, certificación…), dirigidos a un usuario o a un perfil.",
    "bitacora": "Registro de acciones; no se edita ni se borra. Usuario y hora los pone el servidor.",
    "codigo_verificacion": "Código de 6 dígitos del ingreso (solo la huella), con vencimiento de 10 minutos, intentos y reenvíos.",
    "consecutivo": "Consecutivos por año (fincas, visitas, constancias).",
    "constancia": "Constancias de cumplimiento emitidas al aprobar una visita que cumple (código, verificación y vigencia).",
    "departamento": "Catálogo de departamentos (DIVIPOLA) para el registro de fincas.",
    "enlace_cuenta": "Enlaces de un solo uso para activar la cuenta (48 h) o restablecer la contraseña (30 min); solo la huella.",
    "especie": "Catálogo de especies: pato y ganso.",
    "esquema_version": "Migraciones aplicadas por la API al arrancar.",
    "evaluacion": "Visitas de inspección: documento JSON completo (respuestas, recorrido, plan de mejora, firmas, revisión) y versión.",
    "finca": "Fincas o unidades productivas: documento JSON (especies, inventario, persona responsable) y versión.",
    "finca_especie": "Especies de cada finca con su propósito, sistema y número de aves (para consultas).",
    "persona_responsable": "Persona responsable (titular) de la finca.",
    "proceso": "Procesos de seguimiento (visita inicial y seguimientos; ampliación a 5).",
    "reprogramacion": "Historial de reprogramaciones de visitas con su motivo.",
    "revision_evaluacion": "Historial de revisión del coordinador: enviada, reenviada, devuelta y aprobada.",
    "sesion": "Sesiones abiertas (solo la huella del token de la cookie), con última actividad y vencimiento.",
    "usuario": "Cuentas con perfil: datos en JSON, contraseña cifrada (scrypt), activación, intentos y bloqueo.",
    "v_bandeja_coordinador": "Vista: visitas por aprobar y por asignar del coordinador.",
    "v_constancias": "Vista: constancias con su finca, especie y vigencia.",
    "v_cuentas": "Vista: estado de acceso de cada cuenta (Activa, Pendiente de activación, Enlace vencido, Sin enlace) y bloqueo.",
}
tablas = [(t, tipo, (com if com and com != "VIEW" else "") or DESCRIPCION.get(t, "")) for t, tipo, com in tablas]

por_tabla = {}
for t, c, tipo, nulo, clave, defecto, com in cols:
    por_tabla.setdefault(t, []).append((c, tipo, nulo, clave, defecto, com))
fk_de = {(t, c): f"{rt}.{rc}" for t, c, rt, rc in fks}

md = ["# Base de datos de la plataforma 1.0 · MariaDB 11.8", "",
      "Diccionario generado desde la base instalada con `base_de_datos/herramientas/documentar_mariadb.py`. La API crea y actualiza estas tablas sola al arrancar, con las migraciones de `plataforma/apps/api/bd/migraciones/` (cada una se aplica una sola vez y queda en la tabla `esquema_version`).", "",
      "Diagrama entidad-relación: [SVG](er_mariadb.svg) · [PNG](er_mariadb.png)", "",
      "## Cómo guarda los datos la plataforma", "",
      "- **Fincas, visitas (evaluacion), procesos, usuarios y avisos** guardan el registro completo en la columna `datos` (JSON, el mismo formato del prototipo v0.25 y de `@eba/norma`) y una columna `version` que sube con cada cambio: si dos personas cambian el mismo registro, la segunda recibe un conflicto (409) y se le carga la versión de la base.",
      "- Las columnas sueltas (estado, finca, inspector, fechas…) se llenan desde `datos` para filtrar y ordenar sin leer el JSON.",
      "- **Ingreso real** (migración 004): contraseñas cifradas con scrypt (`usuario.clave_hash`); códigos, enlaces y sesiones se guardan solo como huella SHA-256.",
      "- La **bitácora** no se edita ni se borra; el usuario y la hora los pone el servidor.", ""]
if migr:
    md += ["## Migraciones aplicadas", "", "| Migración | Aplicada |", "|---|---|"] + [f"| `{n}` | {a} |" for n, a in migr] + [""]
md += ["## Tablas", "", "| Tabla | Tipo | Descripción |", "|---|---|---|"]
md += [f"| [`{t}`](#{t}) | {'Vista' if tipo == 'VIEW' else 'Tabla'} | {com} |" for t, tipo, com in tablas] + [""]
for t, tipo, com in tablas:
    md += [f"### {t}", "", (com + "\n") if com else "", "| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |", "|---|---|:-:|:-:|---|---|---|"]
    for c, ct, nulo, clave, defecto, ccom in por_tabla.get(t, []):
        md.append(f"| `{c}` | {ct} | {'Sí' if nulo == 'YES' else 'No'} | {clave} | {defecto.replace('|', '/')} | {fk_de.get((t, c), '')} | {ccom.replace('|', '/')} |")
    md.append("")
(SALIDA / "DICCIONARIO.md").write_text("\n".join(md), encoding="utf-8")

dot = ['digraph ER {', 'rankdir=LR; fontname="Arial"; bgcolor="white"; nodesep=0.4; ranksep=1.0;',
       'node [shape=plain, fontname="Arial", fontsize=10]; edge [color="#2e7d4f", arrowhead=crow, arrowtail=none, fontname="Arial", fontsize=9];']
for t, tipo, _ in tablas:
    if tipo == "VIEW": continue
    filas = "".join(f'<tr><td align="left" port="{c}">{"🔑 " if k == "PRI" else ""}{c}</td><td align="left"><font color="#666666">{ct}</font></td></tr>'
                    for c, ct, _, k, _, _ in por_tabla.get(t, []))
    dot.append(f'{t} [label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="3"><tr><td colspan="2" bgcolor="#1f5d3a"><font color="white"><b>{t}</b></font></td></tr>{filas}</table>>];')
for t, c, rt, rc in fks:
    dot.append(f'{rt}:{rc} -> {t}:{c};')
dot.append("}")
(SALIDA / "er_mariadb.dot").write_text("\n".join(dot), encoding="utf-8")
subprocess.run(["dot", "-Tsvg", str(SALIDA / "er_mariadb.dot"), "-o", str(SALIDA / "er_mariadb.svg")], check=True)
subprocess.run(["dot", "-Tpng", "-Gdpi=130", str(SALIDA / "er_mariadb.dot"), "-o", str(SALIDA / "er_mariadb.png")], check=True)
print(f"{len(tablas)} tablas y vistas · {len(cols)} columnas · {len(fks)} referencias → {SALIDA}")
