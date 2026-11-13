"""Prueba de extremo a extremo de la plataforma v0.25 en Docker (http://localhost:4200) con MariaDB.

Parte de la base como queda tras actualizar desde la v0.24 (fincas y evaluaciones de ejemplo, sin usuarios con perfil).
Recorre: usuarios con perfil, asignar, permisos de la API (403), finalizar, devolver, aprobar con seguimiento,
reprogramar con motivo, constancia de cumplimiento y creación de usuarios, y revisa cada paso en las tablas de MariaDB.
Uso:  docker compose up -d   y luego   python pruebas/prueba_docker_v0_25.py
"""
import json, subprocess, sys, urllib.request
from playwright.sync_api import sync_playwright
BASE = "http://localhost:4200/"
ok = mal = 0
def sql(q):
    r = subprocess.run(["docker", "exec", "-e", "Q=" + q, "eba-mariadb", "sh", "-c", 'mariadb --default-character-set=utf8mb4 -uroot -p"$MARIADB_ROOT_PASSWORD" eba -N -B -e "$Q"'], capture_output=True, text=True)
    if r.returncode: print(r.stderr); 
    return [l.split("\t") for l in r.stdout.strip().splitlines() if l]
def esperar(n, v, e):
    global ok, mal
    if v == e: ok += 1; print("  [OK ]", n)
    else: mal += 1; print("  [FALLA]", n, "→", v, "esperado", e)
def api(metodo, ruta, cuerpo=None, rol="", clave=""):
    req = urllib.request.Request("http://localhost:3085/api/sincronizacion" + ruta, method=metodo, data=json.dumps(cuerpo).encode() if cuerpo else None,
                                 headers={"Content-Type": "application/json", "X-EBA-Rol": rol, "X-EBA-Clave": clave, "X-EBA-Usuario": "prueba"})
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b"null")
def ev_bd(id):
    s, d = api("GET", "")
    return next(r for r in d["colecciones"]["evals"] if r["id"] == id)

with sync_playwright() as p:
    b = p.chromium.launch()
    errores = []
    def entrar(perfil, correo=None):
        c = b.new_context(viewport={"width": 1366, "height": 900}); pg = c.new_page()
        pg.on("pageerror", lambda e: errores.append(str(e)))
        pg.goto(BASE); pg.wait_for_timeout(1500)
        pg.click(f'[data-rol="{perfil}"]')
        if correo: pg.fill("#correo", correo)
        pg.click("text=Continuar")
        for i, d in enumerate("482073"): pg.locator(".codigo input").nth(i).fill(d)
        pg.click("text=Verificar"); pg.wait_for_timeout(800)
        return pg
    def sincronizado(pg):
        for _ in range(40):
            if not pg.evaluate("EBA_BD.hayPendientes()"): return True
            pg.wait_for_timeout(250)
        return False

    print("Arranque: usuarios de ejemplo suben a MariaDB")
    pg0 = b.new_page(); pg0.goto(BASE); pg0.wait_for_timeout(3000)
    esperar("Modo base de datos", pg0.evaluate("EBA_BD.modo"), "bd")
    esperar("Usuarios con perfil en la tabla usuario", sql("SELECT COUNT(*) FROM usuario")[0][0], "7")
    esperar("Perfiles", sql("SELECT GROUP_CONCAT(DISTINCT perfil ORDER BY perfil) FROM usuario")[0][0], "admin,coordinador,inspector,productor")
    esperar("Ingreso: cuatro perfiles, sin conteos", (pg0.locator(".roles [data-rol]").count(), "usuario" in pg0.inner_text(".roles")), (4, False))

    print("Coordinador asigna una inspección")
    co = entrar("coordinador")
    co.goto(BASE + "#/fincas"); co.wait_for_timeout(500)
    co.locator('[data-nueva="FIN-2025-00198|ganso"]').click(); co.wait_for_timeout(300)
    co.select_option("#ne4", "inspector2"); co.click("#crear"); co.wait_for_timeout(300)
    esperar("Sincronizado", sincronizado(co), True)
    fila = sql("SELECT codigo, estado, inspector, asignado_por FROM evaluacion WHERE finca_codigo = 'FIN-2025-00198' AND especie = 'ganso'")
    esperar("Visita asignada en MariaDB", [f[1:] for f in fila], [["Programada", "inspector2", "coordinador"]])
    nueva = fila[0][0]
    esperar("Aviso para la inspectora en la tabla aviso", sql("SELECT COUNT(*) FROM aviso WHERE para = 'inspector2'")[0][0], "1")

    print("Permisos de la API")
    e88 = ev_bd("EVA-2026-00088")
    d = dict(e88["datos"]); d["estado"] = "Pendiente de aprobación"
    esperar("Otro inspector no modifica la visita (403)", api("PUT", "/evals/EVA-2026-00088", {"version": e88["version"], "datos": d}, "inspector", "inspector2")[0], 403)
    esperar("El productor no modifica visitas (403)", api("PUT", "/evals/EVA-2026-00088", {"version": e88["version"], "datos": d}, "productor", "productor")[0], 403)
    esperar("El inspector no crea visitas (403)", api("PUT", "/evals/EVA-2026-00999", {"version": None, "datos": dict(d, id="EVA-2026-00999")}, "inspector", "inspector")[0], 403)
    esperar("El inspector no registra fincas (403)", api("PUT", "/fincas/FIN-2026-00999", {"version": None, "datos": {"id": "FIN-2026-00999"}}, "inspector", "inspector")[0], 403)
    esperar("Solo el administrador crea usuarios (403)", api("PUT", "/usuarios/u_x", {"version": None, "datos": {"perfil": "admin"}}, "coordinador", "coordinador")[0], 403)

    print("Inspector finaliza y envía a aprobación")
    ins = entrar("inspector")
    ins.evaluate("""(id => { const ev = EVALS.find(e => e.id === id), ctx = contexto(ev);
      lista(ev).forEach(i => { if (aplica(i, ctx) || calcular(i, ev.resp[i.code], ctx).done) return;
        if (i.m.kind === 'density') ev.resp[i.code] = { aves: 812, peso: 2.5, area: 110 };
        else if (i.m.kind === 'cc' || i.m.kind === 'units') ev.resp[i.code] = { units: Array(nUnidades(i, ctx)).fill(i.m.kind === 'cc' ? 3 : 100) };
        else if (i.m.kind === 'doc') ev.resp[i.code] = { estado: 'Válido', legible: 1, sinCorr: 1, firmado: 1, contenido: 1, matricula: 1 }; });
      lista(ev).forEach(i => { ev.obs[i.code] = ev.obs[i.code] || 'Observación'; }); ev.apertura.atiende = ev.apertura.atiende || 'Encargado';
      ev.firmas = { productor: 'Hernán Darío Mejía', inspector: 'Camilo Andrés Peña' }; guardar(); })('EVA-2026-00088')""")
    ins.goto(BASE + "#/eval/EVA-2026-00088/cierre"); ins.wait_for_timeout(500)
    ins.click("#fin"); ins.wait_for_timeout(500); esperar("Sincronizado", sincronizado(ins), True)
    esperar("Pendiente de aprobación en MariaDB", sql("SELECT estado FROM evaluacion WHERE codigo = 'EVA-2026-00088'")[0][0], "Pendiente de aprobación")
    esperar("Revisión «Enviada»", sql("SELECT accion, usuario FROM revision_evaluacion WHERE evaluacion = 'EVA-2026-00088'"), [["Enviada", "inspector"]])
    e88 = ev_bd("EVA-2026-00088"); d = dict(e88["datos"]); d["estado"] = "Finalizada"
    esperar("El administrador no aprueba (403)", api("PUT", "/evals/EVA-2026-00088", {"version": e88["version"], "datos": d}, "admin", "admin")[0], 403)

    print("Coordinador devuelve y aprueba")
    co.goto(BASE + "#/inicio"); co.reload(); co.wait_for_timeout(1500)
    co.goto(BASE + "#/eval/EVA-2026-00088/resultado"); co.wait_for_timeout(500)
    co.click("#devolverBtn"); co.fill("#obsDev", "Revise la observación del galpón 2"); co.click(".modal [data-ok]"); co.wait_for_timeout(300)
    esperar("Sincronizado", sincronizado(co), True)
    esperar("Devuelta en MariaDB con observación", sql("SELECT estado FROM evaluacion WHERE codigo = 'EVA-2026-00088'")[0][0], "Devuelta")
    ins.goto(BASE + "#/inicio"); ins.reload(); ins.wait_for_timeout(1500)
    ins.goto(BASE + "#/eval/EVA-2026-00088/cierre"); ins.wait_for_timeout(500)
    esperar("El inspector ve la observación", "Revise la observación del galpón 2" in ins.inner_text("main"), True)
    ins.click("#fin"); ins.wait_for_timeout(500); esperar("Sincronizado", sincronizado(ins), True)
    co.goto(BASE + "#/inicio"); co.reload(); co.wait_for_timeout(1500)
    co.goto(BASE + "#/eval/EVA-2026-00088/resultado"); co.wait_for_timeout(500)
    co.click("#aprobarBtn"); co.wait_for_timeout(300); co.fill("#apF", "2099-03-01"); co.click(".modal [data-ok]"); co.wait_for_timeout(500)
    esperar("Sincronizado", sincronizado(co), True)
    esperar("Aprobada por el coordinador en MariaDB", sql("SELECT estado, aprobada_por FROM evaluacion WHERE codigo = 'EVA-2026-00088'")[0], ["Finalizada", "coordinador"])
    esperar("Historial de revisión", [r[0] for r in sql("SELECT accion FROM revision_evaluacion WHERE evaluacion = 'EVA-2026-00088' ORDER BY fecha")], ["Enviada", "Devuelta", "Reenviada", "Aprobada"])
    esperar("Seguimiento creado al aprobar", sql("SELECT estado, fecha, inspector FROM evaluacion WHERE proceso = (SELECT proceso FROM evaluacion WHERE codigo = 'EVA-2026-00088') AND visita = (SELECT visita + 1 FROM evaluacion WHERE codigo = 'EVA-2026-00088')"), [["Programada", "2099-03-01", "inspector"]])

    print("Inspector reprograma su seguimiento con motivo")
    ins.goto(BASE + "#/inicio"); ins.reload(); ins.wait_for_timeout(1500); ins.goto(BASE + "#/fincas"); ins.wait_for_timeout(500)
    ins.locator("[data-reprog]").first.click(); ins.wait_for_timeout(200); ins.fill("#rpF", "2099-03-10"); ins.fill("#rpM", "El productor pidió otra fecha"); ins.click(".modal [data-ok]"); ins.wait_for_timeout(400)
    esperar("Sincronizado", sincronizado(ins), True)
    esperar("Reprogramación con motivo en MariaDB", sql("SELECT fecha_anterior, fecha_nueva, motivo, usuario FROM reprogramacion"), [["2099-03-01", "2099-03-10", "El productor pidió otra fecha", "inspector"]])

    print("Constancia de cumplimiento")
    co.goto(BASE + "#/inicio"); co.reload(); co.wait_for_timeout(1500)
    co.goto(BASE + "#/fincas"); co.wait_for_timeout(500)
    co.locator('[data-nueva="FIN-2025-00198|pato"]').click(); co.wait_for_timeout(300)
    co.check('input[name="tipo"][value="retoma"]'); co.select_option("#ne4", "inspector"); co.click("#crear"); co.wait_for_timeout(400)
    esperar("Sincronizado", sincronizado(co), True)
    nuevaP = sql("SELECT codigo FROM evaluacion WHERE finca_codigo = 'FIN-2025-00198' AND especie = 'pato' AND estado = 'Programada'")[0][0]
    ins.goto(BASE + "#/inicio"); ins.reload(); ins.wait_for_timeout(1500)
    ins.evaluate(f"""(id => {{ const ev = EVALS.find(e => e.id === id); ev.estado = 'En proceso'; ev.apertura.atiende = 'Encargado'; ev.firmas = {{ productor: 'Rosa Elena Quintero', inspector: 'Camilo Andrés Peña' }}; guardar(); }})('{nuevaP}')""")
    ins.goto(BASE + f"#/eval/{nuevaP}/cierre"); ins.wait_for_timeout(500)
    esperar("Sin pendientes para cerrar", ins.locator("#fin").is_disabled(), False)
    ins.click("#fin"); ins.wait_for_timeout(500); esperar("Sincronizado", sincronizado(ins), True)
    co.goto(BASE + "#/inicio"); co.reload(); co.wait_for_timeout(1500)
    co.goto(BASE + f"#/eval/{nuevaP}/resultado"); co.wait_for_timeout(500); co.click("#aprobarBtn"); co.wait_for_timeout(300); co.click(".modal [data-ok]"); co.wait_for_timeout(500)
    esperar("Sincronizado", sincronizado(co), True)
    cons = sql(f"SELECT codigo, aprobada_por, vence > CURDATE() FROM constancia WHERE evaluacion = '{nuevaP}'")
    esperar("Constancia en MariaDB", [[c[0][:9], c[1], c[2]] for c in cons], [["CER-2026-", "coordinador", "1"]])
    pr = entrar("productor", "rosa.quintero@correo.co")
    esperar("La productora ve «Certificada» y puede descargarla", ("Certificada" in pr.inner_text("main"), pr.locator('a:has-text("Descargar constancia")').count() >= 1), (True, True))

    print("Administrador crea un usuario")
    ad = entrar("admin"); ad.goto(BASE + "#/usuarios"); ad.wait_for_timeout(500)
    ad.click("#nuevoU"); ad.fill("#tn", "Julián Andrés Mora"); ad.fill("#td", "1020304050"); ad.fill("#tc", "j.mora@ica.gov.co"); ad.fill("#tf", "3201234567"); ad.select_option("#tp", "inspector")
    ad.click(".modal button.btn-primario"); ad.wait_for_timeout(400); esperar("Sincronizado", sincronizado(ad), True)
    esperar("Usuario nuevo en MariaDB", sql("SELECT nombre, perfil, estado FROM usuario WHERE correo = 'j.mora@ica.gov.co'"), [["Julián Andrés Mora", "inspector", "Activo"]])
    jm = entrar("inspector", "j.mora@ica.gov.co")
    esperar("El usuario nuevo entra", jm.evaluate("yo().nombre"), "Julián Andrés Mora")
    esperar("El administrador no recibe avisos de aprobar", ad.evaluate("misAvisos().some(a => a.tipo === 'aprobar')"), False)
    esperar("Vistas v_bandeja_coordinador y v_constancias", (len(sql("SELECT * FROM v_bandeja_coordinador")) >= 0, len(sql("SELECT * FROM v_constancias")) >= 1), (True, True))
    esperar("Errores de JavaScript", errores, [])
    b.close()
print(f"\n{ok} correctas, {mal} fallas"); sys.exit(1 if mal else 0)
