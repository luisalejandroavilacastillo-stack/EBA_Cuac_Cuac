# -*- coding: utf-8 -*-
"""Genera base_de_datos/03_metodologia.sql a partir de src/js/datos/norma.js.

Así la base de datos y el prototipo usan exactamente los mismos 58 indicadores,
escalas y reglas de la Metodología para evaluar el bienestar animal en patos y
gansos (ICA v1.0, 2024).

Uso:  python base_de_datos/herramientas/generar_metodologia.py
"""
import json
import pathlib

RAIZ = pathlib.Path(__file__).resolve().parents[2]
NORMA = RAIZ / "src" / "js" / "datos" / "norma.js"
SALIDA = RAIZ / "base_de_datos" / "03_metodologia.sql"

COLOR = {100: "#048C38", 55: "#C6C309", 20: "#BD9C54", 0: "#8A3431"}
TIPO = {"auto": "CONDICIONES", "radio": "OPCION", "units": "POR_UNIDAD", "cc": "CONDICION_CORPORAL", "pct": "PORCENTAJE",
        "density": "DENSIDAD", "bpumv": "PRACTICAS", "doc": "DOCUMENTO"}
DIM = {"MBR": ("Medidas basadas en los recursos", 1), "MBA": ("Medidas basadas en el animal", 2), "MBG": ("Medidas basadas en la gestión", 3)}
NUM = {("pato", "MBR"): "6.1", ("pato", "MBA"): "6.2", ("pato", "MBG"): "6.3",
       ("ganso", "MBR"): "7.1", ("ganso", "MBA"): "7.2", ("ganso", "MBG"): "7.3"}
PESOS = {"COMERCIAL": {"MBA": 0.60, "MBR": 0.25, "MBG": 0.15}, "TRASPATIO": {"MBA": 0.70, "MBR": 0.30, "MBG": 0.0}}
RANGOS = [("EXCELENTE", 90, None, "#048C38"), ("ALTO", 75, 90, "#86B327"), ("MEDIO", 50, 75, "#A8A600"), ("BAJO", 0, 50, "#8A3431")]

# Porcentaje → nivel: (mínimo, incluye_mínimo, máximo, incluye_máximo, puntaje). Igual a RULES en js/norma/calculo.js
CONVERSION = {
    "PR03": [(80, True, None, True, 100), (40, True, 80, False, 55), (None, True, 40, False, 0)],
    "PA01": [(None, True, 40, True, 100), (40, False, 60, True, 55), (60, False, None, True, 0)],
    "PA02": [(None, True, 40, True, 100), (40, False, 60, False, 55), (60, True, None, True, 0)],
    "PA10": [(None, True, 12, False, 100), (12, True, 14, True, 55), (14, False, None, True, 0)],
    "GR02": [(100, True, None, True, 100), (80, True, 100, False, 55), (None, True, 80, False, 0)],
    "GR03": [(100, True, None, True, 100), (80, True, 100, False, 55), (60, True, 80, False, 20), (None, True, 60, False, 0)],
    "GR04": [(100, True, None, True, 100), (80, True, 100, False, 55), (60, True, 80, False, 20), (None, True, 60, False, 0)],
    "GR05": [(None, True, 0, True, 100), (0, False, 20, False, 55), (20, True, 40, True, 20), (40, False, None, True, 0)],
    "GA02": [(100, True, None, True, 100), (60, True, 100, False, 55), (None, True, 60, False, 0)],
    "GA06": [(None, True, 3, False, 100), (3, True, 6, True, 55), (6, False, 8, True, 20), (8, False, None, True, 0)],
    "GA08": [(None, True, 5, False, 100), (5, True, 8, True, 55), (8, False, 10, True, 20), (10, False, None, True, 0)],
    "GA09": [(None, True, 3, False, 100), (3, True, 6, True, 55), (6, False, 8, True, 20), (8, False, None, True, 0)],
    "GA10": [(70, True, None, True, 100), (50, True, 70, False, 55), (None, True, 50, False, 0)],
}
# Reglas por condiciones (el servicio de cálculo evalúa la clave «regla»). Igual a AUTO y RULES en js/norma/calculo.js
CONDICION = {
    "PR01": "Sin refugio → 0; con refugio, equipado, limpio y con rampas → 100; con refugio y alguna condición faltante → 55.",
    "PR04": "Exceso ≤ 30 % sin competencia → 100; ≤ 30 % con competencia o > 30 % sin competencia → 55; > 30 % con competencia → 0.",
    "PR06": "Falta infraestructura funcional, registros o agua apta → 0; todo cumple y (traspatio o protocolo escrito) → 100; en otro caso → 55.",
    "PR08": "Exceso ≤ 30 % sin competencia → 100; ≤ 30 % con competencia o > 30 % sin competencia → 55; > 30 % con competencia → 0.",
    "PR09": "Sin medios o no funcionales → 0; funcionales y (traspatio o declarados en el POE) → 100; en otro caso → 55.",
    "PR12": "Sin lugar para nadar o profundidad < 10 cm → 0; rampas de ingreso y salida sin encharcamiento → 100; en otro caso → 55.",
    "GR01": "Alimento inadecuado, sin registro ICA o mal almacenado → 0; todo cumple y dieta formulada por profesional → 100; sin dieta formulada → 55.",
    "GA01": "0 % → 100; ≤ 15 % con tratamiento → 55; ≤ 20 % o con tratamiento → 20; en otro caso → 0.",
    "GA03": "0 % → 100; con tratamiento: < 20 % → 55, ≥ 20 % → 20; sin tratamiento: < 20 % → 20, ≥ 20 % → 0.",
    "GA04": "0 % → 100; con tratamiento: ≤ 10 % → 55, > 10 % → 20; sin tratamiento: ≤ 10 % → 20, > 10 % → 0.",
    "GA05": "0 % con pico funcional → 100; ≤ 6 % con pico funcional → 55; ≤ 8 % → 20; > 8 % → 0.",
    "GA07": "0 % → 100; con tratamiento: ≤ 10 % → 55, > 10 % → 20; sin tratamiento: ≤ 10 % → 20, > 10 % → 0.",
    "GG05": "> 80 % → 100; con conocimiento demostrado: ≥ 50 % → 55, ≥ 20 % → 20; en otro caso → 0.",
    "GG07": "≤ 3 % con registros → 100; ≤ 3 % sin registros → 55; ≤ 5 % → 20; > 5 % → 0.",
    "PR11": "Densidad ≤ máximo de la tabla para el peso promedio más cercano → 100; mayor → 0.",
    "PA11": "Puntaje de cada ave según su puntuación (1 a 5) y el propósito; indicador = promedio.",
    "PG10": "Las 9 prácticas → 100; las 5 prácticas mínimas (1, 3, 4, 8 y 9) → 55; falta alguna mínima → 0.",
    "GG06": "Las 9 prácticas → 100; falta alguna → 0.",
}
BPUMV = ["No usa sustancias prohibidas por el ICA", "Usa promotores de crecimiento solo si el registro ICA lo autoriza",
         "Todos los medicamentos tienen registro ICA", "No hay medicamentos vencidos", "Almacena y aplica según el rotulado del producto",
         "Agujas y equipos en buen estado", "Área de almacenamiento limpia",
         "Antimicrobianos y biológicos solo con prescripción de MV o MVZ con matrícula vigente", "Lleva registro de tratamientos veterinarios"]
APLICA = {"proposito": ("PROPOSITO", "=", "HUEVO", "Solo aplica a producción de huevo."),
          "permanencia": ("PERMANENCIA", "=", "true", "Solo aplica si los patos permanecen todo el tiempo en corral o galpón."),
          "cama": ("PISO", "=", "CAMA", "No se evalúa en corral nocturno con piso de cemento, madera o tierra."),
          "sistema": ("SISTEMA", "IN", "INTENSIVO,SEMI_INTENSIVO", "Solo aplica a sistemas intensivos y semi-intensivos.")}


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def preguntas(i):
    """(texto, tipo_dato, es_principal, evidencia, opciones) de cada dato que registra el inspector."""
    m = i["m"]
    k = m["kind"]
    out = [(i["q"], "CASILLA", True, "OPCIONAL", None)]
    if k == "auto":
        out = [(i["q"], "CASILLA", True, "OPCIONAL", None)] + [(a[0], "NUMERO" if a[1] == "num" else "CASILLA", False, "NO", None) for a in m["aux"]]
    elif k == "radio":
        out[0] = (i["q"], "OPCION", True, "OPCIONAL", [(o[0], o[1]) for o in m["opts"]])
    elif k == "pct":
        out = [(i["q"], "NUMERO", True, "OPCIONAL", None), (m["total"], "NUMERO", False, "NO", None), (m["part"], "NUMERO", False, "NO", None)]
        if m.get("extra"):
            out.append((m["extra"], "CASILLA", False, "SEGUN_NIVEL" if "tratamiento" in m["extra"] else "NO", None))
    elif k == "density":
        out += [("Aves alojadas", "NUMERO", False, "NO", None), ("Peso promedio (kg)", "NUMERO", False, "NO", None), ("Área útil (m²)", "NUMERO", False, "NO", None)]
    elif k == "bpumv":
        out = [(i["q"], "CASILLA", True, "OBLIGATORIA", None)] + [(b, "CASILLA", False, "NO", None) for b in BPUMV]
    elif k == "doc":
        out = [(i["q"], "ARCHIVO", True, "OBLIGATORIA", [("Válido", None), ("No válido", None), ("Pendiente", None)])]
        out += [(t, "CASILLA", False, "NO", None) for t in ["Legible", "Sin correcciones ni agregados", "Firmado", "Contenido completo"]]
        if m.get("prof"):
            out.append(("Firmado por MV, MVZ o Z con matrícula COMVEZCOL vigente", "CASILLA", False, "NO", None))
    elif k == "units":
        out = [(f"{i['q']} (puntaje de cada {m['unit']})", "OPCION", True, "OPCIONAL", [(d, p) for p, d in i["escala"]])]
    elif k == "cc":
        out[0] = (i["q"], "OPCION", True, "NO", [(f"Puntuación {s}", None) for s in range(1, 6)])
    return out


def main():
    txt = NORMA.read_text(encoding="utf-8")
    norma = json.loads(txt[txt.index("["):txt.rindex("]") + 1])
    assert len(norma) == 58
    L = ["-- =============================================================================",
         "-- EBA Patos y Gansos · ICA — Versión 1.0 de la metodología (generado, no editar a mano)",
         "-- Fuente: src/js/datos/norma.js · Generador: base_de_datos/herramientas/generar_metodologia.py",
         "-- Metodología para evaluar el bienestar animal en patos y gansos, ICA v1.0 (2024).",
         "-- =============================================================================",
         "SET search_path TO eba;", "BEGIN;", ""]
    for sp, nombre in (("pato", "pato"), ("ganso", "ganso")):
        V = f"(SELECT v.id FROM version_metodologia v JOIN especie e ON e.id = v.especie_id WHERE e.nombre = '{nombre}' AND v.numero = '1.0')"
        L.append(f"-- ----------------------------------------------------------------- {nombre.upper()}S (numeral {'6' if sp == 'pato' else '7'})")
        L.append("INSERT INTO version_metodologia (especie_id, numero, fuente, estado, fecha_publicacion)")
        L.append(f"SELECT id, '1.0', 'Metodología para evaluar el bienestar animal en patos y gansos, ICA v1.0 (2024)', 'PUBLICADA', now() FROM especie WHERE nombre = '{nombre}';")
        for g, (dn, o) in DIM.items():
            L.append(f"INSERT INTO dimension (version_id, codigo, nombre, numeral, orden) VALUES ({V}, '{g}', {q(dn)}, '{NUM[(sp, g)]}', {o});")
            for t, p in PESOS.items():
                L.append(f"INSERT INTO ponderacion_tramo (dimension_id, tramo, peso) SELECT id, '{t}', {p[g]} FROM dimension WHERE version_id = {V} AND codigo = '{g}';")
        for n, mn, mx, c in RANGOS:
            L.append(f"INSERT INTO rango_clasificacion (version_id, nivel, minimo, maximo, color) VALUES ({V}, '{n}', {mn}, {q(mx)}, '{c}');")
        inds = [i for i in norma if i["sp"] == sp]
        crits = []
        for i in inds:
            if (i["g"], i["crit"]) not in crits:
                crits.append((i["g"], i["crit"]))
        for o, (g, cn) in enumerate(crits, 1):
            L.append(f"INSERT INTO criterio (dimension_id, nombre, orden) SELECT id, {q(cn)}, {o} FROM dimension WHERE version_id = {V} AND codigo = '{g}';")
        for o, i in enumerate(inds, 1):
            c = i["code"]
            CR = f"(SELECT c.id FROM criterio c JOIN dimension d ON d.id = c.dimension_id WHERE d.version_id = {V} AND d.codigo = '{i['g']}' AND c.nombre = {q(i['crit'])})"
            L.append("")
            L.append(f"-- {i['num']} {i['name']} (Tabla {i['tabla']})")
            L.append("INSERT INTO indicador (version_id, criterio_id, codigo, nombre, numeral, tabla, pregunta, metodo, unidad_muestreo, grupo_productivo, condicion, aplica_traspatio, tipo_captura, formula, orden)")
            L.append(f"VALUES ({V}, {CR}, '{c}', {q(i['name'])}, '{i['num']}', {q(i['tabla'])}, {q(i['q'])}, {q(i['metodo'])}, {q(i['unidad'])}, {q(i['prod'])}, {q(i['cond'])}, {q(i['trasp'])}, '{TIPO[i['m']['kind']]}', {q(i['formula'])}, {o});")
            I = f"(SELECT id FROM indicador WHERE version_id = {V} AND codigo = '{c}')"
            for o_n, (p, d) in enumerate(i["escala"], 1):
                ev = i["m"]["kind"] == "pct" and bool(i["m"].get("extra")) and "tratamiento" in i["m"]["extra"] and p in (55, 20)
                L.append(f"INSERT INTO nivel_escala (indicador_id, puntaje, descripcion, color, exige_evidencia, orden) VALUES ({I}, {p}, {q(d)}, '{COLOR[p]}', {q(ev)}, {o_n});")
            for k, (var, op, val, mot) in APLICA.items():
                if k in i.get("app", {}):
                    L.append(f"INSERT INTO regla_aplicabilidad (indicador_id, variable, operador, valor, motivo) VALUES ({I}, '{var}', '{op}', {q(val)}, {q(mot)});")
            if not i["trasp"]:
                L.append(f"INSERT INTO regla_aplicabilidad (indicador_id, variable, operador, valor, motivo) VALUES ({I}, 'TRAMO', '=', 'COMERCIAL', 'No se evalúa en traspatio (menos de 200 aves).');")
            for n, (t, td, pr, evd, opts) in enumerate(preguntas(i), 1):
                L.append(f"INSERT INTO pregunta (indicador_id, texto, tipo_dato, es_principal, obligatoria, evidencia, orden) VALUES ({I}, {q(t)}, '{td}', {q(pr)}, {q(pr)}, '{evd}', {n});")
                for m, (ot, pts) in enumerate(opts or [], 1):
                    L.append(f"INSERT INTO opcion_respuesta (pregunta_id, texto, valor, puntaje, orden) SELECT id, {q(ot)}, '{m}', {q(pts)}, {m} FROM pregunta WHERE indicador_id = {I} AND orden = {n};")
            if c in CONVERSION:
                for mn, imn, mx, imx, p in CONVERSION[c]:
                    L.append(f"INSERT INTO regla_conversion (indicador_id, variable, minimo, incluye_minimo, maximo, incluye_maximo, puntaje) VALUES ({I}, 'porcentaje', {q(mn)}, {q(imn)}, {q(mx)}, {q(imx)}, {p});")
            else:
                kind = i["m"]["kind"]
                desc = CONDICION.get(c) or {
                    "units": "Puntaje de cada unidad según la tabla; indicador = promedio de las unidades evaluadas.",
                    "doc": "Válido y con todos los requisitos → 100; no válido o falta un requisito → 0; pendiente → 0 hasta que se entregue (1 día hábil).",
                    "radio": "; ".join(f"{o[0]} → {o[1]}" for o in i["m"].get("opts", [])) + ".",
                }[kind]
                cond = {"regla": c, "tipo": TIPO[kind]}
                L.append(f"INSERT INTO regla_condicion (indicador_id, descripcion, condiciones) VALUES ({I}, {q(desc)}, {q(json.dumps(cond, ensure_ascii=False))}::jsonb);")
            et = f"{i['num']} {i['name']}"
            L.append(f"INSERT INTO plantilla_diagnostico (indicador_id, tipo, texto) VALUES "
                     f"({I}, 'FORTALEZA', {q(et + ': cumple lo que pide la norma.')}), "
                     f"({I}, 'OPORTUNIDAD', {q(et + ': cumple en parte; se incluye en el plan de mejora.')}), "
                     f"({I}, 'INCUMPLIMIENTO', {q(et + ': no cumple; requiere acción prioritaria.')});")
        L.append("")
    L += ["COMMIT;", ""]
    SALIDA.write_text("\n".join(L), encoding="utf-8")
    print(f"{SALIDA.relative_to(RAIZ)}: {len(norma)} indicadores")


if __name__ == "__main__":
    main()
