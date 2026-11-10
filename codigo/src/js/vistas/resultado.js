/* EBA Patos y Gansos · ICA — js/vistas/resultado.js
   Cierre de la visita (validación y firmas) y resultado con diagnóstico y plan de mejora. */
"use strict";

/* ---- cierre: validación y firmas ---- */
function vCierre(ev) {
  const ctx = contexto(ev), r = resultado(ev), ed = SES.rol !== "productor" && ev.estado !== "Finalizada";
  const falt = [];
  lista(ev).forEach((i) => { if (aplica(i, ctx)) return; const c = calcular(i, ev.resp[i.code], ctx);
    if (!c.done) falt.push([`${i.num} ${i.name}: falta calificar`, i.code]);
    else if (c.score === 0 && i.g === "MBA" && !(ev.obs[i.code] || "").trim()) falt.push([`${i.num} ${i.name}: falta la observación del hallazgo`, i.code]); });
  alertasGalpon(ev).forEach((a) => { if (!(ev.obs[a.ind.code] || "").trim()) falt.push([`Alerta galpón ${a.galpon + 1} · ${a.ind.num} ${a.ind.name}: falta la observación`, a.ind.code]); });
  if (!ev.apertura.atiende) falt.push(["Apertura: falta la persona que atiende", "apertura"]);
  if (!ev.firmas.productor || !ev.firmas.inspector) falt.push(["Faltan las firmas del cierre", null]);
  // si la visita no cumple, al finalizar queda programado el siguiente seguimiento: el inspector confirma la fecha
  const verC = verificarCumplimiento(ev), stC = estadoProceso(ev.proceso), sigSeg = (ev.visita || 0) + 1;
  const programa = ed && !verC.cumple && sigSeg <= stC.max, sug = fechaSugeridaSeguimiento(ev);
  if (programa && !ev.segFecha) ev.segFecha = sug.fecha;
  const hoyISO = new Date().toISOString().slice(0, 10);
  if (programa && (!ev.segFecha || ev.segFecha < hoyISO)) falt.push(["Indique una fecha válida (hoy o posterior) para el seguimiento", null]);
  const bloqueSeg = programa ? `<div class="bloque-seg"><h4>Seguimiento ${sigSeg} de ${stC.max}</h4>
      <p class="muted texto-chico" style="margin:2px 0 8px">La finca no cumple (${verC.motivos.map(esc).join(" · ")}). Al finalizar, el seguimiento queda programado con esta fecha.</p>
      <div class="campo"><label for="segF">Fecha de la próxima visita</label><input type="date" id="segF" min="${hoyISO}" value="${esc(ev.segFecha || "")}">
      <span class="ayuda-campo">${sug.plazoMax ? `Sugerida: día siguiente al plazo más lejano del plan de mejora (${esc(sug.accion)}, ${fecha(new Date(sug.plazoMax + "T07:00"))}).` : "El plan de mejora no tiene plazos: se sugieren 30 días. Puede acordar los plazos en el resultado."}</span>
      <span class="aviso-seg" id="avSeg">${esc(avisoFechaSeguimiento(ev, ev.segFecha))}</span></div></div>`
    : ed && !verC.cumple && (ev.visita || 0) >= stC.max ? `<p class="aplica"><span>ℹ</span><span>Es el último seguimiento del proceso: si no cumple, el coordinador decide si lo amplía a ${MAX_SEGUIMIENTOS}.</span></p>` : "";
  shell("fincas", migasEval(ev, "Cierre"), `<div class="encabezado"><div><h1>Cierre de la visita</h1><p>Se presentan los resultados al productor y se deja copia de la forma oficial.</p></div>
    <a class="btn btn-sec" href="#/eval/${ev.id}/resultado">Ver resultado preliminar</a></div>
    <div class="rejilla r-2"><section class="panel"><h3>Antes de finalizar</h3>${falt.length ? `<ul style="margin:0;padding-left:0;list-style:none;display:grid;gap:8px">${falt.map(([t, c]) => `<li class="aplica" style="background:#F8EDEC;color:var(--rojo);margin:0;justify-content:space-between"><span>${esc(t)}</span>${c ? `<a class="btn btn-sec btn-chico" href="#/eval/${ev.id}/${c}">Ir</a>` : ""}</li>`).join("")}</ul>` :
      '<p class="etiqueta e-ok" style="font-size:14px">Todo lo obligatorio está diligenciado.</p>'}
      ${r.provisional ? '<div class="aplica"><span>ℹ</span><span>Hay documentos pendientes: el resultado quedará provisional y el productor tiene 1 día hábil para entregarlos.</span></div>' : ""}</section>
    <section class="panel"><h3>Firmas</h3><div class="rejilla r-2"><div><div class="etq">Productor o encargado</div><div class="firma ${ev.firmas.productor ? "ok" : ""}" data-f="productor" tabindex="0" role="button">${ev.firmas.productor ? esc(ev.firmas.productor) : "Toque para firmar"}</div></div>
      <div><div class="etq">Inspector</div><div class="firma ${ev.firmas.inspector ? "ok" : ""}" data-f="inspector" tabindex="0" role="button">${ev.firmas.inspector ? esc(ev.firmas.inspector) : "Toque para firmar"}</div></div></div>
      <div class="campo" style="margin-top:14px"><label for="og">Observación general</label><textarea id="og" ${ed ? "" : "disabled"}>${esc(ev.obsGeneral || "")}</textarea></div>
      ${bloqueSeg}
      <div class="acciones"><button class="btn btn-primario" id="fin" ${falt.length || !ed ? "disabled" : ""}>Finalizar evaluación</button></div></section></div>`);
  if (ed) {
    raiz.querySelectorAll("[data-f]").forEach((d) => (d.onclick = d.onkeydown = (e) => { if (e.type === "keydown" && e.key !== "Enter") return;
      ev.firmas[d.dataset.f] = d.dataset.f === "inspector" ? USUARIOS.inspector.nombre : FINCAS.find((f) => f.id === ev.finca).productor; guardar(); vCierre(ev); }));
    raiz.querySelector("#og").oninput = (e) => { ev.obsGeneral = e.target.value; guardar(); };
    const sf = raiz.querySelector("#segF");
    if (sf) sf.onchange = () => { ev.segFecha = sf.value; guardar(); vCierre(ev); };
    raiz.querySelector("#fin").onclick = () => { const fSeg = ev.segFecha; ev.estado = "Finalizada"; ev.finalizada = new Date().toISOString(); delete ev.segFecha; log(`Finalización de ${ev.id}`);
      const st = estadoProceso(ev.proceso); if (st.cumplido) log(`Proceso ${ev.proceso} cumplido en ${nombreVisita(ev)}`); guardar();
      const seg = !st.cumplido && st.puedeSeguimiento ? programarSeguimiento(ev.proceso, fSeg) : null;
      toast(st.cumplido ? "Evaluación finalizada: la finca cumple todos los criterios y el proceso quedó cerrado."
        : seg && seg.ev ? `Evaluación finalizada. ${nombreVisita(seg.ev)} programado para el ${fecha(new Date(seg.ev.fecha + "T07:00"))}.`
        : st.puedeAmpliar ? "Evaluación finalizada. Se usaron los seguimientos: el coordinador decide si amplía el proceso." : "Evaluación finalizada.");
      location.hash = `#/eval/${ev.id}/resultado`; };
  }
}

/* ---- resultado, diagnóstico y plan de mejora ---- */
function vResultado(ev) {
  const r = resultado(ev), f = r.ctx.f;
  const [niv, col] = r.nivel;
  const fort = r.filas.filter((x) => x.score >= 100), opo = r.filas.filter((x) => x.score > 0 && x.score < 100), inc = r.filas.filter((x) => x.score === 0);
  const hall = inc.slice().sort((a, b) => r.pesos[b.ind.g] - r.pesos[a.ind.g]);
  const li = (x, c) => `<li style="--c:${c}"><b>${x.ind.num} ${esc(x.ind.name)}</b> · ${fmt(x.score)} puntos${ev.obs[x.ind.code] ? `<br><span class="muted">${esc(ev.obs[x.ind.code])}</span>` : ""}</li>`;
  ev.plan = ev.plan || {};
  const dosG = r.ctx.plan.corrales === 2, alertas = alertasGalpon(ev);
  const selG = (code, val) => dosG ? `<td><select data-pl="${code}" data-k="galpon" style="min-height:36px;border:1.5px solid var(--linea);border-radius:6px;padding:4px 6px"><option value="">Ambos</option><option ${val === "Galpón 1" ? "selected" : ""}>Galpón 1</option><option ${val === "Galpón 2" ? "selected" : ""}>Galpón 2</option></select></td>` : "";
  const planFilas = opo.concat(inc).map((x) => { const p = ev.plan[x.ind.code] || {}; return `<tr><td><b>${x.ind.num}</b> ${esc(x.ind.name)}</td>${selG(x.ind.code, p.galpon)}<td><input data-pl="${x.ind.code}" data-k="accion" value="${esc(p.accion || "")}" placeholder="Acción acordada" style="width:100%;min-height:36px;border:1.5px solid var(--linea);border-radius:6px;padding:4px 8px"></td>
    <td><input data-pl="${x.ind.code}" data-k="resp" value="${esc(p.resp || "")}" placeholder="Responsable" style="width:130px;min-height:36px;border:1.5px solid var(--linea);border-radius:6px;padding:4px 8px"></td>
    <td><input type="date" data-pl="${x.ind.code}" data-k="plazo" value="${esc(p.plazo || "")}" style="min-height:36px;border:1.5px solid var(--linea);border-radius:6px;padding:4px 8px"></td></tr>`; }).join("");
  shell("fincas", migasEval(ev, "Resultado"), `<div class="encabezado"><div><h1>Resultado de la evaluación</h1><p>${esc(f.nombre)} · ${ev.sp === "pato" ? "Patos" : "Gansos"} · ${r.ctx.tramo === "comercial" ? "Comercial" : "Traspatio"} · ${ev.id}</p></div>
    <div class="no-imprimir" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-sec" onclick="window.print()">Descargar PDF</button>${puede("asistente") ? `<a class="btn btn-sec" id="irAsis" href="#/asistente/${ev.id}">Preguntar al asistente</a>` : ""}${ev.estado !== "Finalizada" ? `<a class="btn btn-primario" href="#/eval/${ev.id}/cierre">Ir al cierre</a>` : ""}</div></div>
    <section class="panel"><div class="marcador"><div class="anillo" style="--v:${r.total};--c:${col}"><div><span><b>${fmt(r.total)}</b><small>de 100</small></span></div></div>
      <div><span class="nivel-final" style="--c:${col}">${niv}</span> ${r.provisional ? '<span class="etiqueta e-medio">Provisional: hay documentos pendientes</span>' : ev.estado === "Finalizada" ? '<span class="etiqueta e-ok">Definitivo</span>' : '<span class="etiqueta e-gris">Preliminar · evaluación en proceso</span>'}
      <div class="barras ancho" style="margin-top:18px;max-width:620px">${["MBA", "MBR", "MBG"].filter((g) => r.pesos[g] > 0).map((g) => barraH(`${{ MBA: "Animal", MBR: "Recursos", MBG: "Gestión" }[g]} · ${r.pesos[g] * 100} %`, r.med[g] ?? 0, 100, `${fmt(r.med[g])} · aporta ${fmt((r.med[g] ?? 0) * r.pesos[g])}`, g === "MBA" ? "var(--campo)" : g === "MBR" ? "var(--siembra)" : "var(--cosecha)")).join("")}</div>
      ${escalaSVG(r.total)}
      ${r.pend ? `<p class="etiqueta e-medio" style="margin-top:8px">${r.pend} indicadores sin calificar: el puntaje es preliminar y solo promedia los calificados.</p>` : ""}</div></div></section>
    <section class="panel" style="margin-top:18px"><h3>Detalle del cálculo (5.4 y Tabla 1)</h3><div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Grupo de medidas</th><th class="num">Indicadores calificados</th><th class="num">Promedio del grupo</th><th class="num">Peso</th><th class="num">Aporte al total</th></tr></thead><tbody>
      ${["MBA", "MBR", "MBG"].filter((g) => r.pesos[g] > 0).map((g) => `<tr><td><b>${g}</b> · ${MEDIDA[g]}</td><td class="num">${r.n[g]} de ${r.aplican[g]}</td><td class="num">${fmt(r.med[g], 2)}</td><td class="num">${r.pesos[g] * 100} %</td><td class="num">${fmt(r.med[g] ?? 0, 2)} × ${String(r.pesos[g]).replace(".", ",")} = <b>${fmt(r.aporte[g], 2)}</b></td></tr>`).join("")}
      <tr><td colspan="4"><b>Puntaje total</b> (suma de aportes, redondeada a 1 decimal)</td><td class="num"><b>${fmt(r.total)}</b> · ${niv}</td></tr></tbody></table></div></section>
    ${dosG ? detalleGalpones(ev, alertas) : ""}
    ${seccionSeguimiento(ev)}
    <div class="rejilla r-3" style="margin-top:18px"><section class="panel"><h3>Fortalezas · ${fort.length}</h3><ul class="diag">${fort.map((x) => li(x, "var(--campo)")).join("") || '<li class="muted">—</li>'}</ul></section>
      <section class="panel"><h3>Oportunidades de mejora · ${opo.length}</h3><ul class="diag">${opo.map((x) => li(x, "var(--cosecha)")).join("") || '<li class="muted">—</li>'}</ul></section>
      <section class="panel"><h3>Incumplimientos · ${inc.length}</h3><ul class="diag">${hall.map((x) => li(x, "var(--rojo)")).join("") || '<li class="muted">—</li>'}</ul></section></div>
    <section class="panel"><h3>Plan de mejora</h3><p class="muted">Se acuerda con el productor a partir de los indicadores que no obtuvieron 100 puntos.</p>
      <div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Indicador</th>${dosG ? "<th>Galpón</th>" : ""}<th>Acción</th><th>Responsable</th><th>Plazo</th></tr></thead><tbody>${planFilas}</tbody></table></div></section>`);
  enlazarSeguimiento(ev);
  raiz.querySelectorAll("[data-pl]").forEach((i) => (i.oninput = i.onchange = () => { ev.plan[i.dataset.pl] = ev.plan[i.dataset.pl] || {}; ev.plan[i.dataset.pl][i.dataset.k] = i.value; guardar(); }));
}

/* ---- seguimiento y continuidad del proceso ---- */
const COLOR_ESTADO_PROC = { "Seguimiento programado": "e-seg", Cumplido: "e-ok", "En seguimiento": "e-info", "En curso": "e-medio", "Requiere ampliación": "e-medio", "Cerrado sin cumplir": "e-alerta" };
function seccionSeguimiento(ev) {
  const st = estadoProceso(ev.proceso), v = st.visitas;
  const filas = v.map((e, k) => { const r = resultado(e), prev = k ? resultado(v[k - 1]).total : null, d = prev == null || e.estado === "Programada" ? null : r.total - prev;
    const ver = e.estado === "Finalizada" ? verificarCumplimiento(e) : null;
    return `<tr ${e === ev ? 'style="background:#F7FAF2"' : ""}><td><b>${nombreVisita(e)}</b><br><a href="#/eval/${e.id}${e.estado === "Finalizada" ? "/resultado" : ""}">${e.id}</a></td><td>${fecha(new Date(e.fecha + "T07:00"))}</td><td><span class="etiqueta ${e.estado === "Finalizada" ? "e-ok" : e.estado === "En proceso" ? "e-medio" : "e-info"}">${e.estado}</span></td>
      ${["MBA", "MBR", "MBG"].map((g) => `<td class="num">${r.pesos[g] > 0 ? fmt(r.med[g]) : "—"}</td>`).join("")}<td class="num"><b>${e.estado === "Programada" ? "—" : fmt(r.total)}</b></td><td>${e.estado === "Programada" ? "—" : r.nivel[0]}</td>
      <td class="num">${d == null ? "—" : `<b style="color:${d > 0 ? "var(--campo)" : d < 0 ? "var(--rojo)" : "var(--gris)"}">${d > 0 ? "+" : ""}${fmt(d)}</b>`}</td>
      <td>${ver ? (ver.cumple ? '<span class="etiqueta e-ok">Cumple</span>' : '<span class="etiqueta e-gris">No cumple</span>') : "—"}</td></tr>`; }).join("");
  const puntos = v.filter((e) => e.estado !== "Programada").map((e) => { const r = resultado(e); return [nombreCorto(e), r.total, e.estado !== "Finalizada" || r.provisional]; });
  const cam = cambiosFrenteAnterior(ev);
  const lista_ = (arr, f) => arr.length ? `<ul style="margin:6px 0 0;padding-left:18px">${arr.map(f).join("")}</ul>` : '<p class="muted" style="margin:6px 0 0">—</p>';
  const camHTML = cam ? `<div class="rejilla r-3" style="margin-top:14px"><div><h4>Mejoraron · ${cam.mejoro.length}</h4>${lista_(cam.mejoro, ([i, a, b]) => `<li>${i.num} ${esc(i.name)}: ${fmt(a)} → <b>${fmt(b)}</b></li>`)}</div>
      <div><h4>Completados en esta visita · ${cam.completado.length}</h4>${lista_(cam.completado, ([i, b]) => `<li>${i.num} ${esc(i.name)}: <b>${fmt(b)}</b></li>`)}</div>
      <div><h4>Bajaron · ${cam.empeoro.length}</h4>${lista_(cam.empeoro, ([i, a, b]) => `<li>${i.num} ${esc(i.name)}: ${fmt(a)} → <b>${fmt(b)}</b></li>`)}</div></div>
      <p class="muted" style="font-size:13px;margin-top:8px">${cam.igual} indicadores sin cambio${cam.pendiente.length ? ` · ${cam.pendiente.length} todavía sin calificar` : ""}. Comparado con ${esc(ev.anterior.id)} (${fmt(ev.anterior.total)} puntos).</p>` : "";
  // verificación de esta visita
  const ver = verificarCumplimiento(ev);
  const verHTML = `<div class="aplica" style="margin-top:12px;${ver.cumple ? "background:#E8F4EA;color:var(--semilla)" : ""}"><span>${ver.cumple ? "✔" : "ℹ"}</span><span>
      ${ver.cumple ? `<b>Esta visita cumple todos los criterios</b> (puntaje ≥ ${CRITERIO_CUMPLE.puntajeMin}, ningún indicador en 0 y sin información pendiente)${ev.estado === "Finalizada" ? ": el proceso quedó cumplido y no requiere más seguimientos." : ". Al finalizarla, el proceso se cierra y no se piden más seguimientos."}`
        : `<b>${ev.estado === "Finalizada" ? "Esta visita no cumplió" : "Para cumplir en esta visita falta"}:</b> ${ver.motivos.map(esc).join(" · ")}.`}</span></div>`;
  // estado del proceso y resultado final
  const ampl = st.ampliacion ? `<p class="muted" style="font-size:13px;margin:6px 0 0">Ampliado a ${MAX_SEGUIMIENTOS} seguimientos por ${esc(st.ampliacion.por)} el ${fecha(new Date(st.ampliacion.fecha))}: «${esc(st.ampliacion.motivo)}».</p>` : "";
  const final = st.final ? `<div class="panel" style="margin-top:12px;border:2px solid ${st.cumplido ? "var(--campo)" : "var(--ocre)"};box-shadow:none"><h4 style="margin:0">Resultado final del proceso</h4>
      <p style="margin:6px 0 0"><b style="font-size:22px">${fmt(resultado(st.final).total)}</b> · ${resultado(st.final).nivel[0]} · ${nombreVisita(st.final)} (${st.final.id}, ${fecha(new Date(st.final.fecha + "T07:00"))}) · ${st.cumplido ? "La finca cumple todos los criterios." : "Se agotaron los seguimientos sin cumplir todos los criterios."}
      ${st.final !== ev ? ` <a href="#/eval/${st.final.id}/resultado">Ver la visita final</a>` : ""}</p></div>` : "";
  const puedeOperar = SES.rol !== "productor", coordina = ["coordinador", "admin"].includes(SES.rol);
  const prog = st.abierta && st.abierta.estado === "Programada" && st.abierta.visita > 0 ? st.abierta : null;
  const esUltima = st.ultima === ev || (prog && st.visitas[st.visitas.indexOf(prog) - 1] === ev);
  const progHTML = prog ? `<div class="aplica aviso-programado"><span>📅</span><span><b>${nombreVisita(prog)} programado para el ${fecha(new Date(prog.fecha + "T07:00"))}</b>${prog.fecha < new Date().toISOString().slice(0, 10) ? ' <span class="etiqueta e-alerta">Vencido</span>' : ""}. Retoma lo registrado en esta visita; el inspector actualiza lo que cambió.</span>${puedeOperar ? `<button class="btn btn-sec btn-chico" data-reprog="${prog.id}">Reprogramar</button>` : ""}</div>` : "";
  let acciones = "";
  if (puedeOperar && esUltima) {
    if (st.puedeSeguimiento) acciones = `<button class="btn btn-primario" id="segBtn">Programar seguimiento ${st.usados + 1} de ${st.max}</button>`;
    else if (st.puedeAmpliar) acciones = coordina ? `<button class="btn btn-primario" id="ampliarBtn">Ampliar a ${MAX_SEGUIMIENTOS} seguimientos</button>` : `<span class="etiqueta e-medio">Se usaron los ${st.max} seguimientos: el coordinador puede ampliar a ${MAX_SEGUIMIENTOS}</span>`;
    if (st.cerrado && st.puedeNuevo) acciones += ` <button class="btn btn-sec" id="nuevoBtn">Iniciar nuevo proceso retomando esta evaluación</button>`;
  }
  return `<section class="panel"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:start"><div><h3>Seguimiento y continuidad · ${esc(ev.proceso)} <span class="etiqueta ${COLOR_ESTADO_PROC[st.estado]}">${st.estado}</span></h3>
      <p class="muted" style="margin:4px 0 0">Cada visita se valida al finalizar: si la finca cumple, el proceso se cierra y no pide más seguimientos; si no, se programan hasta ${SEGUIMIENTOS_BASE} seguimientos (ampliables a ${MAX_SEGUIMIENTOS}). Seguimientos usados: <b>${st.usados} de ${st.max}</b>. Las visitas finalizadas no se modifican.</p>${ampl}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${acciones}</div></div>
    ${verHTML}${progHTML}${final}
    <div style="margin-top:12px"><div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Visita</th><th>Fecha</th><th>Estado</th><th class="num">MBA</th><th class="num">MBR</th><th class="num">MBG</th><th class="num">Total</th><th>Nivel</th><th class="num">Cambio</th><th>Criterios</th></tr></thead><tbody>${filas}</tbody></table></div>
      <div style="max-width:620px">${evolucionSVG(puntos)}</div></div>${camHTML}</section>`;
}
function enlazarSeguimiento(ev) {
  const s = raiz.querySelector("#segBtn"), n = raiz.querySelector("#nuevoBtn"), a = raiz.querySelector("#ampliarBtn");
  if (s) s.onclick = () => { const r = crearSeguimiento(ev.proceso); if (r.error) return toast(r.error); toast(`${nombreVisita(r.ev)} programada: se retomó lo registrado en ${ev.id}.`); location.hash = `#/eval/${r.ev.id}`; };
  if (n) n.onclick = () => { const r = crearProceso(ev.finca, ev.sp, ev.id); if (r.error) return toast(r.error); toast(`Proceso ${r.ev.proceso} iniciado retomando ${ev.id}.`); location.hash = `#/eval/${r.ev.id}`; };
  if (a) a.onclick = () => modal(`<h3>Ampliar a ${MAX_SEGUIMIENTOS} seguimientos</h3><p>El proceso ${esc(ev.proceso)} usó los ${SEGUIMIENTOS_BASE} seguimientos programados sin cumplir. Indique por qué se amplía.</p>
      <div class="campo"><label for="motAmp">Motivo</label><textarea id="motAmp" rows="3" placeholder="Ej.: el productor está ejecutando el plan de mejora del galpón 2"></textarea><span class="error-campo" id="errAmp"></span></div>
      <div class="acciones"><button class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-primario" data-ok>Ampliar</button></div>`, (c) => {
      c.querySelector("[data-c]").onclick = cerrarCapas;
      c.querySelector("[data-ok]").onclick = () => { const r = ampliarProceso(ev.proceso, c.querySelector("#motAmp").value); if (r.error) { c.querySelector("#errAmp").textContent = r.error; return; }
        const seg = programarSeguimiento(ev.proceso, fechaSugeridaSeguimiento(ev).fecha); cerrarCapas();
        toast(`Proceso ampliado a ${MAX_SEGUIMIENTOS} seguimientos${seg.ev ? `. ${nombreVisita(seg.ev)} programado para el ${fecha(new Date(seg.ev.fecha + "T07:00"))}` : ""}.`); vResultado(ev); }; });
  enlazarReprogramar(raiz, () => vResultado(ev));
}

/** Ventana para cambiar la fecha de un seguimiento programado (aviso si queda antes del último plazo del plan). */
function abrirReprogramar(prog, alListo) {
  const base = EVALS.find((e) => e.id === prog.base) || prog, hoyISO = new Date().toISOString().slice(0, 10);
  modal(`<div class="modal-cab"><h3>Reprogramar ${nombreVisita(prog).toLowerCase()}</h3><p class="muted">${esc(FINCAS.find((f) => f.id === prog.finca)?.nombre || "")} · ${nombreSp(prog.sp)} · fecha actual ${fecha(new Date(prog.fecha + "T07:00"))}</p></div>
    <div class="modal-cuerpo"><div class="campo"><label for="rpF">Nueva fecha de la visita</label><input type="date" id="rpF" min="${hoyISO}" value="${esc(prog.fecha)}"><span class="aviso-seg" id="rpAv"></span><span class="error-campo" id="rpErr"></span></div></div>
    <div class="acciones"><button class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-primario" data-ok>Guardar fecha</button></div>`, (c) => {
    const inp = c.querySelector("#rpF"), av = () => (c.querySelector("#rpAv").textContent = avisoFechaSeguimiento(base, inp.value)); av(); inp.oninput = inp.onchange = av;
    c.querySelector("[data-c]").onclick = cerrarCapas;
    c.querySelector("[data-ok]").onclick = () => { const r = reprogramarSeguimiento(prog, inp.value); if (r.error) { c.querySelector("#rpErr").textContent = r.error; return; }
      cerrarCapas(); toast(`${nombreVisita(prog)} reprogramado para el ${fecha(new Date(prog.fecha + "T07:00"))}.`); if (alListo) alListo(); }; });
}
const enlazarReprogramar = (cont, alListo) => cont.querySelectorAll("[data-reprog]").forEach((b) => (b.onclick = () => abrirReprogramar(EVALS.find((e) => e.id === b.dataset.reprog), alListo)));

/* ---- detalle por galpón (informativo: el puntaje oficial es uno solo para la finca) ---- */
function detalleGalpones(ev, alertas) {
  const ctx = contexto(ev);
  const filas = lista(ev).filter((i) => !aplica(i, ctx)).map((i) => ({ i, c: calcular(i, ev.resp[i.code], ctx) })).filter((x) => x.c.done && x.c.porGalpon);
  const esAl = (code, g) => alertas.some((a) => a.ind.code === code && a.galpon === g);
  const celda = (x, g) => { const v = x.c.porGalpon[g]; const p = x.c.pctGalpon ? ` <span class="muted">(${fmt(x.c.pctGalpon[g])} %)</span>` : "";
    return `<td class="num" style="${esAl(x.i.code, g) ? "background:#F8EDEC;color:var(--rojo);font-weight:800" : ""}">${v == null ? "—" : fmt(v)}${p}${esAl(x.i.code, g) ? " ⚠" : ""}</td>`; };
  return `<section class="panel"><h3>Detalle por galpón ${alertas.length ? `<span class="etiqueta e-alerta">${alertas.length} alerta${alertas.length > 1 ? "s" : ""}</span>` : ""}</h3>
    <p class="muted" style="margin:4px 0 10px">El puntaje de cada indicador es el promedio de los dos galpones (las 50 aves cuentan igual). ⚠ = el galpón queda más de 10 puntos por debajo de la finca, o en un nivel más bajo con al menos 5 puntos de diferencia; requiere observación y conviene incluirlo en el plan de mejora.</p>
    ${alertas.length ? `<ul style="margin:0 0 12px;padding-left:18px">${alertas.map((a) => `<li><b>Galpón ${a.galpon + 1} · ${a.ind.num} ${esc(a.ind.name)}</b>: ${fmt(a.score)}${a.pct != null ? ` (${fmt(a.pct)} %)` : ""} frente a ${fmt(a.finca)} de la finca${ev.obs[a.ind.code] ? ` · <span class="muted">${esc(ev.obs[a.ind.code])}</span>` : ' · <a href="#/eval/' + ev.id + "/" + a.ind.code + '">falta observación</a>'}</li>`).join("")}</ul>` : ""}
    <div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Indicador</th><th class="num">Galpón 1</th><th class="num">Galpón 2</th><th class="num">Finca</th></tr></thead><tbody>
    ${filas.map((x) => `<tr><td>${x.i.num} ${esc(x.i.name)}</td>${celda(x, 0)}${celda(x, 1)}<td class="num"><b>${fmt(x.c.score)}</b></td></tr>`).join("")}</tbody></table></div></section>`;
}
