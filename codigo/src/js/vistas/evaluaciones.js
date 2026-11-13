/* EBA Patos y Gansos · ICA — js/vistas/evaluaciones.js
   Nueva evaluación o seguimiento (ventana que se abre desde Fincas) y apertura con plan de muestreo.
   El listado de todas las visitas está en Reportes (consulta por visita) y en el historial de cada finca. */
"use strict";

/* ==========================================================================
   Nueva evaluación o seguimiento
   ========================================================================== */
/** Ventana «Asignar inspección» (solo el coordinador, v0.25). pre = "FIN-…|pato" para dejar elegida la finca y la especie.
 *  Conserva las tres opciones de visita (seguimiento, nuevo proceso retomando, nuevo proceso desde cero), la fecha de la visita
 *  y el inspector al que se asigna; el inspector la ve en su lista de trabajo y recibe un aviso. */
function abrirNuevaEvaluacion(pre) {
  if (!esGestor()) return toast("Solo el coordinador o el administrador asignan las inspecciones.");
  const activas = FINCAS.filter((f) => f.estado === "ACTIVA");
  if (!activas.length) return toast("No hay fincas activas para evaluar.");
  const opciones = activas.flatMap((f) => f.especies.map((e) => `<option value="${f.id}|${e.sp}" ${pre === f.id + "|" + e.sp ? "selected" : ""}>${esc(f.nombre)} · ${nombreSp(e.sp)}</option>`)).join("");
  modal(`<div class="modal-cab"><h3>Asignar inspección</h3><p class="muted">Elija el inspector y la fecha acordada con el productor. Si la finca ya tiene un proceso, la visita puede ser de seguimiento y retoma lo registrado en la última evaluación.</p></div>
    <form id="fne" novalidate><div class="modal-cuerpo">
    <div class="campo"><label for="ne1">Finca y especie</label><select id="ne1">${opciones}</select></div>
    <div class="campo"><label>Tipo de visita</label><div id="tipos"></div></div>
    <div class="fila fila-3"><div class="campo"><label for="ne2">Fecha de la visita</label><input id="ne2" type="date" value="${new Date().toISOString().slice(0, 10)}"></div><div class="campo"><label for="ne3">Hora</label><input id="ne3" type="time" value="07:00"></div>
    <div class="campo"><label for="ne4">Inspector</label><select id="ne4">${inspectores().map(([k, x]) => `<option value="${k}">${esc(x.nombre)}${x.mp ? " · " + x.mp : ""}</option>`).join("")}</select></div></div>
    <div id="prev" class="aplica"></div></div>
    <div class="acciones"><button type="button" class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-primario" id="crear">Crear evaluación</button></div></form>`, (c) => {
    c.querySelector(".modal > div").classList.add("modal-medio");
    c.querySelector("[data-c]").onclick = cerrarCapas;
    const sel = c.querySelector("#ne1");
    const prev = () => { const [fid, sp] = sel.value.split("|"); const f = FINCAS.find((x) => x.id === fid), t = tramoEspecie(f.especies.find((e) => e.sp === sp));
      const n = NORMA.filter((i) => i.sp === sp).length, ok = NORMA.filter((i) => i.sp === sp && !aplica(i, { e: f.especies.find((e) => e.sp === sp), tramo: t, f })).length;
      const procs = procesosDe(fid, sp), abierta = EVALS.find((x) => x.finca === fid && x.sp === sp && esAbierta(x));
      const ult = procs[0], ultFin = EVALS.filter((x) => x.finca === fid && x.sp === sp && x.estado === "Finalizada").sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      const tipos = [];
      if (ult && ult.puedeSeguimiento) tipos.push(["seg", `<b>Visita de seguimiento ${ult.usados + 1} de ${ult.max}</b> del proceso ${ult.id}: retoma ${ult.ultima.id} (${fecha(new Date(ult.ultima.fecha + "T07:00"))}, ${fmt(resultado(ult.ultima).total)} puntos) para mejorar el puntaje o completar lo que faltó.`]);
      if (ultFin) tipos.push(["retoma", `<b>Nuevo proceso retomando la última evaluación</b> (${ultFin.id}): copia lo registrado como punto de partida; la evaluación anterior queda en el histórico.`]);
      tipos.push(["cero", "<b>Nuevo proceso desde cero</b>: lista de chequeo vacía."]);
      const ultIns = EVALS.filter((x) => x.finca === fid && x.sp === sp).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))[0];
      if (ultIns && USUARIOS[ultIns.inspector]) c.querySelector("#ne4").value = ultIns.inspector;   // por defecto, el inspector que ya conoce la finca
      c.querySelector("#tipos").innerHTML = abierta ? `<p class="etiqueta e-medio">Ya hay una visita sin aprobar (${abierta.id} · ${nombreVisita(abierta)} · ${etqEstadoEv(abierta.estado).toLowerCase()} · ${esc(nombreInspector(abierta.inspector))}).${abierta.estado === "Programada" ? ` <a href="#" data-reasig="${abierta.id}">Reasignarla</a>` : ""}</p>`
        : (ult && ult.cumplido ? `<p class="etiqueta e-ok" style="margin-bottom:8px">El proceso ${ult.id} está cumplido (${nombreVisita(ult.visitaCumple)}): no requiere seguimientos. Si se necesita, inicie un proceso nuevo.</p>`
          : ult && ult.puedeAmpliar ? `<p class="etiqueta e-medio" style="margin-bottom:8px">El proceso ${ult.id} usó sus ${ult.max} seguimientos sin cumplir: el coordinador puede ampliarlo a ${MAX_SEGUIMIENTOS} desde el resultado de la última visita.</p>`
          : ult && ult.completo ? `<p class="muted" style="font-size:13px">El proceso ${ult.id} se cerró sin cumplir: se inicia un proceso nuevo.</p>` : "") +
          tipos.map(([k, tx], j) => `<label class="chk"><input type="radio" name="tipo" value="${k}" ${j === 0 ? "checked" : ""}><span>${tx}</span></label>`).join("");
      c.querySelectorAll("[data-reasig]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); cerrarCapas(); abrirReasignar(a.dataset.reasig); }));
      c.querySelector("#crear").disabled = !!abierta;
      c.querySelector("#prev").innerHTML = `<span>📋</span><span>${n} indicadores de ${sp === "pato" ? "patos (numeral 6)" : "gansos (numeral 7)"}; aplican ${ok} para esta finca (${t}).<br><b>${tramosTexto(f)}</b> (el tramo y la muestra se calculan por especie, Tabla 3).</span>`; };
    sel.onchange = prev; prev();
    c.querySelector("#fne").onsubmit = (e) => { e.preventDefault(); const [fid, sp] = sel.value.split("|");
      const tipo = (c.querySelector('input[name="tipo"]:checked') || {}).value, fch = c.querySelector("#ne2").value, insp = c.querySelector("#ne4").value;
      if (!tipo) return;
      if (!fch || fch < new Date().toISOString().slice(0, 10)) return toast("La fecha de la visita debe ser hoy o posterior.");
      const ultFin = EVALS.filter((x) => x.finca === fid && x.sp === sp && x.estado === "Finalizada").sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      const r = tipo === "seg" ? crearSeguimiento(procesosDe(fid, sp)[0].id, insp) : crearProceso(fid, sp, tipo === "retoma" ? ultFin.id : null, fch, insp);
      if (r.error) { toast(r.error); return; }
      r.ev.fecha = fch; r.ev.asignacion.fechaVisita = fch; guardar();
      const f = FINCAS.find((x) => x.id === fid);
      log(`Asignación de ${r.ev.id} (${f.nombre} · ${nombreSp(sp)}) a ${nombreInspector(insp)} para el ${fch}`);
      avisar(insp, `Nueva inspección asignada: ${f.nombre} · ${nombreSp(sp)} (${nombreVisita(r.ev)}) para el ${fecha(new Date(fch + "T07:00"))}`, `#/finca/${fid}`);
      cerrarCapas(); toast(`Inspección asignada a ${nombreInspector(insp)} para el ${fecha(new Date(fch + "T07:00"))}.`); render(); }; 
  });
}
/** Reasignar una visita que aún no se ha enviado (asignada, en proceso o devuelta): otro inspector y, si no ha empezado, otra fecha. */
function abrirReasignar(evId, alListo) {
  const ev = EVALS.find((e) => e.id === evId); if (!ev || !esGestor()) return;
  if (!["Programada", "En proceso", "Devuelta"].includes(ev.estado)) return toast("Solo se reasigna una visita que aún no se ha enviado a aprobación.");
  const f = FINCAS.find((x) => x.id === ev.finca), hoyISO = new Date().toISOString().slice(0, 10), noIniciada = ev.estado === "Programada";
  modal(`<div class="modal-cab"><h3>Reasignar ${nombreVisita(ev).toLowerCase()}</h3><p class="muted">${esc(f.nombre)} · ${nombreSp(ev.sp)} · ${ev.id} · hoy la tiene ${esc(nombreInspector(ev.inspector))}</p></div>
    <div class="modal-cuerpo"><div class="fila"><div class="campo"><label for="raI">Inspector</label><select id="raI">${inspectores().map(([k, x]) => `<option value="${k}" ${k === ev.inspector ? "selected" : ""}>${esc(x.nombre)}${x.mp ? " · " + x.mp : ""}</option>`).join("")}</select></div>
      <div class="campo"><label for="raF">Fecha de la visita</label><input type="date" id="raF" min="${hoyISO}" value="${esc(ev.fecha)}" ${noIniciada ? "" : "disabled"}>${noIniciada ? "" : '<span class="ayuda-campo">La visita ya empezó: se conserva la fecha y lo registrado.</span>'}</div></div>
      <span class="error-campo" id="raErr"></span></div>
    <div class="acciones"><button class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-primario" data-ok>Guardar</button></div>`, (c) => {
    c.querySelector("[data-c]").onclick = cerrarCapas;
    c.querySelector("[data-ok]").onclick = () => { const insp = c.querySelector("#raI").value, fch = c.querySelector("#raF").value, antes = ev.inspector;
      if (noIniciada && (!fch || fch < hoyISO)) { c.querySelector("#raErr").textContent = "La fecha debe ser hoy o posterior."; return; }
      if (insp === antes && (!noIniciada || fch === ev.fecha)) { cerrarCapas(); return; }
      ev.inspector = insp; if (noIniciada) ev.fecha = fch;
      ev.asignacion = Object.assign({}, ev.asignacion, datosAsignacion(insp, ev.fecha), { anterior: antes !== insp ? antes : (ev.asignacion || {}).anterior });
      log(`Reasignación de ${ev.id}: ${nombreInspector(antes)} → ${nombreInspector(insp)} · visita ${ev.fecha}`);
      if (antes !== insp) { avisar(insp, `Inspección reasignada a usted: ${f.nombre} · ${nombreSp(ev.sp)} para el ${fecha(new Date(ev.fecha + "T07:00"))}`, `#/finca/${f.id}`);
        avisar(antes, `La inspección de ${f.nombre} · ${nombreSp(ev.sp)} se reasignó a ${nombreInspector(insp)}`, "#/inicio"); }
      else avisar(insp, `Cambió la fecha de la visita a ${f.nombre} · ${nombreSp(ev.sp)}: ${fecha(new Date(ev.fecha + "T07:00"))}`, `#/finca/${f.id}`);
      guardar(); cerrarCapas(); toast(`Visita asignada a ${nombreInspector(insp)} para el ${fecha(new Date(ev.fecha + "T07:00"))}.`); if (alListo) alListo(); else render(); };
  });
}
/** Ruta antigua «#/evaluaciones/nueva»: muestra Fincas y abre la ventana. */
function vNueva() {
  if (!esGestor()) return sinPermiso("evaluaciones/nueva");
  const pre = sessionStorage.getItem("eba.nueva") || ""; try { sessionStorage.removeItem("eba.nueva"); } catch (e) { }
  try { history.replaceState(null, "", "#/fincas"); } catch (e) { }
  vFincas(); abrirNuevaEvaluacion(pre);
}
/* ---- apertura y plan de muestreo ---- */
function vApertura(ev) {
  const ctx = contexto(ev), f = ctx.f, ed = puedeEvaluar(ev);
  const ap = ev.apertura;
  const na = lista(ev).filter((i) => aplica(i, ctx));
  shell("fincas", migasEval(ev, "Apertura y muestreo"), `<div class="encabezado"><div><h1>Apertura de la visita</h1><p>${esc(f.nombre)} · ${ev.sp === "pato" ? "Patos" : "Gansos"} · ${esc(ctx.e.proposito)} · <b>${esc(ev.proceso)} · ${nombreVisita(ev)}</b></p></div>
    ${ev.estado === "Finalizada" ? `<a class="btn btn-primario" href="#/eval/${ev.id}/resultado">Ver resultados</a>` : `<div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-sec" id="irLista" href="${destinoLista(ev)}">Continuar evaluando lista de indicadores</a><a class="btn btn-primario" href="#/eval/${ev.id}/recorrido">Ir al recorrido por puntos</a></div>`}</div>
    ${ev.anterior ? `<div class="aplica" style="margin-bottom:16px"><span>↻</span><span><b>${nombreVisita(ev)}.</b> Se retomó lo registrado en ${esc(ev.anterior.id)} (${fecha(new Date(ev.anterior.fecha + "T07:00"))}, ${fmt(ev.anterior.total)} puntos). Actualice los indicadores que cambiaron y complete los que quedaron pendientes; cada pantalla muestra el puntaje de la visita anterior. La evaluación anterior no se modifica.</span></div>` : ""}<div class="rejilla r-2"><section class="panel"><h3>Datos de la apertura</h3><form id="fap">
      <div class="fila"><div class="campo"><label for="a1">Hora de inicio</label><input id="a1" type="time" value="${esc(ap.hora || "")}" ${ed ? "" : "disabled"}></div>
      <div class="campo"><label for="a3">Ingreso a galpones</label><input id="a3" type="time" value="${esc(ap.ingreso || "")}" ${ed ? "" : "disabled"}></div></div>
      <div class="campo"><label for="a2">Persona que atiende</label><input id="a2" value="${esc(ap.atiende || "")}" ${ed ? "" : "disabled"}></div>
      ${(() => { const sps = [ev.sp].concat(f.especies.map((x) => x.sp).filter((s) => s !== ev.sp)), mixta = sps.length > 1;
        const nDe = (sp) => (ev.pobEsp && ev.pobEsp[sp] != null ? ev.pobEsp[sp] : sp === ev.sp ? ctx.nEsp : poblacionEspecie(f.especies.find((x) => x.sp === sp)));
        return `<div class="${mixta ? "fila pob-especies" : ""}">${sps.map((sp) => `<div class="campo ${mixta && sp === ev.sp ? "campo-actual" : ""}"><label for="a4_${sp}">${nombreSp(sp)} en la finca el día de la visita${mixta && sp === ev.sp ? ' <span class="etiqueta e-info">se inspecciona</span>' : ""}</label>
          <input id="a4_${sp}" data-pobsp="${sp}" type="number" min="0" value="${nDe(sp)}" ${ed ? "" : "disabled"}></div>`).join("")}</div>
          <p class="tramo-reg t-${ctx.tramo === "traspatio" ? "trasp" : "com"}" id="apTot"><b>${nombreSp(ev.sp)}: ${ctx.nEsp} aves · ${ctx.tramo === "traspatio" ? "Traspatio" : "Comercial"}</b> <span>${mixta ? `(${ctx.pobFinca} aves en la finca). ` : ""}El tramo (200 aves o más = comercial) y la muestra (Tabla 3) se calculan con las aves de la especie que se inspecciona.</span></p>`; })()}
      ${ctx.e.conCorral === false ? `<div class="fila"><div class="campo"><label for="a5">Puntos de inspección (1 a 3)</label><input id="a5" type="number" min="1" max="3" value="${ctx.plan.puntos}" ${ed ? "" : "disabled"}></div>
        <div class="campo"><label for="a6">Aves por punto (2 a 5)</label><input id="a6" type="number" min="2" max="5" value="${ctx.plan.avesPunto}" ${ed ? "" : "disabled"}></div></div>` : ""}
      ${ctx.tramo === "traspatio" && ev.sp === "pato" ? `<div class="fila"><div class="campo"><label for="a7">Bebederos en el predio</label><input id="a7" type="number" min="1" value="${esc(ap.bebederos ?? 2)}" ${ed ? "" : "disabled"}><span class="ayuda-campo">En traspatio se revisan todos (6.1.3 y 6.1.5).</span></div>
        <div class="campo"><label for="a8">Comederos en el predio</label><input id="a8" type="number" min="1" value="${esc(ap.comederos ?? 2)}" ${ed ? "" : "disabled"}><span class="ayuda-campo">En traspatio se revisan todos (6.1.7).</span></div></div>` : ""}</form></section>
    <section class="panel"><div class="panel-cab"><h3>Plan de muestreo</h3></div><div id="plan"></div></section></div>
    <section class="panel"><h3>Indicadores que no aplican en esta finca</h3>${na.length ? `<ul style="margin:0;padding-left:18px">${na.map((i) => `<li><b>${i.num} ${esc(i.name)}</b> — ${esc(aplica(i, ctx))}</li>`).join("")}</ul>` : '<p class="muted">Todos los indicadores aplican.</p>'}</section>`);
  const pinta = () => { const c = contexto(ev), p = c.plan;
    raiz.querySelector("#plan").innerHTML = `<div class="rejilla r-3">${kpi(p.corrales || "—", "Galpones o corrales a inspeccionar", "var(--semilla)")}${kpi(p.puntosCorral, p.corrales ? "Puntos por galpón o corral" : "Puntos", "var(--siembra)")}${kpi(p.aves, "Tamaño de la muestra (aves)", "var(--campo)")}</div>
      ${muestreoSVG(p)}
      <p style="margin-top:12px">${esc(p.texto)}. Se priorizan las aves de mayor edad.</p><p><span class="etiqueta ${c.tramo === "comercial" ? "e-info" : "e-gris"}">${c.tramo === "comercial" ? "Comercial (200 aves o más): pesos 60 / 25 / 15 y revisión documental" : "Traspatio (menos de 200 aves): pesos 70 / 30 y sin revisión documental"}</span></p>`; };
  pinta();
  const tramoAntes = ctx.tramo;
  if (ed) raiz.querySelectorAll("#fap input").forEach((i) => (i.oninput = () => {
    const v = (id) => { const x = raiz.querySelector("#" + id); return x ? x.value : undefined; };
    ap.hora = v("a1"); ap.atiende = v("a2"); ap.ingreso = v("a3");
    if (v("a5") !== undefined) { ap.puntosSC = Math.min(3, Math.max(1, +v("a5") || 1)); ap.avesPuntoSC = Math.min(5, Math.max(2, +v("a6") || 2)); }
    if (v("a7") !== undefined) { ap.bebederos = Math.max(1, +v("a7") || 1); ap.comederos = Math.max(1, +v("a8") || 1); }
    ev.pobEsp = Object.assign({}, ev.pobEsp); raiz.querySelectorAll("[data-pobsp]").forEach((x) => (ev.pobEsp[x.dataset.pobsp] = +x.value || 0));
    ev.pobConfirmada = Object.values(ev.pobEsp).reduce((t, n) => t + n, 0);
    const tot = raiz.querySelector("#apTot"), c2 = contexto(ev);
    if (tot) { tot.className = `tramo-reg t-${c2.tramo === "traspatio" ? "trasp" : "com"}`; tot.querySelector("b").textContent = `${nombreSp(ev.sp)}: ${c2.nEsp} aves · ${c2.tramo === "traspatio" ? "Traspatio" : "Comercial"}`; }
    if (ev.estado === "Programada") ev.estado = "En proceso"; ev.guardado = new Date().toISOString(); guardar(); pinta(); }));
  if (ed) raiz.querySelectorAll("[data-pobsp]").forEach((a4) => (a4.onchange = () => { if (contexto(ev).tramo !== tramoAntes) { toast("Cambió el tramo de la finca: se actualizan los indicadores que aplican."); } vApertura(ev); }));
}
/** Primer indicador pendiente (o el cierre si no queda ninguno). Se conserva el nombre por compatibilidad. */
const primerCodigo = (ev) => siguientePendiente(ev) || "cierre";
