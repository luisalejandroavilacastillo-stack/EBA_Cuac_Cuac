/* EBA Patos y Gansos · ICA — js/vistas/resultado.js
   Cierre de la visita (validación y firmas) y resultado con diagnóstico y plan de mejora. */
"use strict";

/* ---- cierre: validación y firmas ---- */
function vCierre(ev) {
  const ctx = contexto(ev), r = resultado(ev), ed = puedeEvaluar(ev);
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
      <p class="muted texto-chico" style="margin:2px 0 8px">La finca no cumple (${verC.motivos.map(esc).join(" · ")}). Proponga la fecha acordada con el productor: el coordinador la confirma al aprobar la inspección.</p>
      <div class="campo"><label for="segF">Fecha propuesta para la próxima visita</label><input type="date" id="segF" min="${hoyISO}" value="${esc(ev.segFecha || "")}">
      <span class="ayuda-campo">${sug.plazoMax ? `Sugerida: día siguiente al plazo más lejano del plan de mejora (${esc(sug.accion)}, ${fecha(new Date(sug.plazoMax + "T07:00"))}).` : "El plan de mejora no tiene plazos: se sugieren 30 días. Puede acordar los plazos en el resultado."}</span>
      <span class="aviso-seg" id="avSeg">${esc(avisoFechaSeguimiento(ev, ev.segFecha))}</span></div></div>`
    : ed && !verC.cumple && (ev.visita || 0) >= stC.max ? `<p class="aplica"><span>ℹ</span><span>Es el último seguimiento del proceso: si no cumple, el coordinador decide si lo amplía a ${MAX_SEGUIMIENTOS}.</span></p>` : "";
  const dev = ev.estado === "Devuelta" ? ultimaRevision(ev, "Devuelta") : null;
  shell("fincas", migasEval(ev, "Cierre"), `<div class="encabezado"><div><h1>Cierre de la visita</h1><p>Se presentan los resultados al productor y se deja copia de la forma oficial. Al finalizar, la visita pasa al coordinador para su aprobación.</p></div>
    <a class="btn btn-sec" href="#/eval/${ev.id}/resultado">Ver resultado preliminar</a></div>
    ${dev ? avisoDevuelta(dev) : ""}
    ${ev.estado === "Pendiente de aprobación" ? '<div class="aplica aviso-revision"><span>⏳</span><span><b>Enviada al coordinador.</b> La visita está pendiente de aprobación; no se puede modificar mientras la revisa.</span></div>' : ""}
    <div class="rejilla r-2"><section class="panel"><h3>Antes de finalizar</h3>${falt.length ? `<ul style="margin:0;padding-left:0;list-style:none;display:grid;gap:8px">${falt.map(([t, c]) => `<li class="aplica" style="background:#F8EDEC;color:var(--rojo);margin:0;justify-content:space-between"><span>${esc(t)}</span>${c ? `<a class="btn btn-sec btn-chico" href="#/eval/${ev.id}/${c}">Ir</a>` : ""}</li>`).join("")}</ul>` :
      '<p class="etiqueta e-ok" style="font-size:14px">Todo lo obligatorio está diligenciado.</p>'}
      ${r.provisional ? '<div class="aplica"><span>ℹ</span><span>Hay documentos pendientes: el resultado quedará provisional y el productor tiene 1 día hábil para entregarlos.</span></div>' : ""}</section>
    <section class="panel"><h3>Firmas</h3><div class="rejilla r-2"><div><div class="etq">Productor o encargado</div><div class="firma ${ev.firmas.productor ? "ok" : ""}" data-f="productor" tabindex="0" role="button">${ev.firmas.productor ? esc(ev.firmas.productor) : "Toque para firmar"}</div></div>
      <div><div class="etq">Inspector</div><div class="firma ${ev.firmas.inspector ? "ok" : ""}" data-f="inspector" tabindex="0" role="button">${ev.firmas.inspector ? esc(ev.firmas.inspector) : "Toque para firmar"}</div></div></div>
      <div class="campo" style="margin-top:14px"><label for="og">Observación general</label><textarea id="og" ${ed ? "" : "disabled"}>${esc(ev.obsGeneral || "")}</textarea></div>
      ${bloqueSeg}
      <div class="acciones"><button class="btn btn-primario" id="fin" ${falt.length || !ed ? "disabled" : ""}>${ev.estado === "Devuelta" ? "Corregida: reenviar a aprobación" : "Finalizar y enviar a aprobación"}</button></div></section></div>`);
  if (ed) {
    raiz.querySelectorAll("[data-f]").forEach((d) => (d.onclick = d.onkeydown = (e) => { if (e.type === "keydown" && e.key !== "Enter") return;
      ev.firmas[d.dataset.f] = d.dataset.f === "inspector" ? nombreInspector(ev.inspector) : FINCAS.find((f) => f.id === ev.finca).productor; guardar(); vCierre(ev); }));
    raiz.querySelector("#og").oninput = (e) => { ev.obsGeneral = e.target.value; guardar(); };
    const sf = raiz.querySelector("#segF");
    if (sf) sf.onchange = () => { ev.segFecha = sf.value; guardar(); vCierre(ev); };
    // v0.25: «Finalizar» calcula el resultado con la lógica de siempre y deja la visita «Pendiente de aprobación» del coordinador.
    // La fecha del seguimiento queda como propuesta; el seguimiento se crea cuando el coordinador aprueba.
    raiz.querySelector("#fin").onclick = () => { const reenvio = ev.estado === "Devuelta", f = FINCAS.find((x) => x.id === ev.finca);
      ev.estado = "Pendiente de aprobación"; ev.finalizada = new Date().toISOString();
      registrarRevision(ev, reenvio ? "Reenviada" : "Enviada");
      const r = resultado(ev), ver = verificarCumplimiento(ev);
      log(`${reenvio ? "Reenvío" : "Finalización"} de ${ev.id}: ${fmt(r.total)} ${r.nivel[0]}${ver.cumple ? " · cumple" : " · no cumple"} · pendiente de aprobación`);
      avisar("coordinador", `${reenvio ? "Inspección corregida" : "Inspección por aprobar"}: ${f.nombre} · ${nombreSp(ev.sp)} (${fmt(r.total)} ${r.nivel[0]}) · ${nombreInspector(ev.inspector)}`, `#/eval/${ev.id}/resultado`, "aprobar");
      toast(`Evaluación ${reenvio ? "reenviada" : "finalizada"}: queda pendiente de aprobación del coordinador.`);
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
    <div class="no-imprimir" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-sec" onclick="window.print()">Descargar PDF</button>${puede("asistente") ? `<a class="btn btn-sec" id="irAsis" href="#/asistente/${ev.id}">Preguntar al asistente</a>` : ""}${puedeEvaluar(ev) ? `<a class="btn btn-primario" href="#/eval/${ev.id}/cierre">Ir al cierre</a>` : ""}</div></div>
    ${panelRevision(ev)}${panelConstancia(ev)}
    <section class="panel"><div class="marcador"><div class="anillo" style="--v:${r.total};--c:${col}"><div><span><b>${fmt(r.total)}</b><small>de 100</small></span></div></div>
      <div><span class="nivel-final" style="--c:${col}">${niv}</span> ${r.provisional ? '<span class="etiqueta e-medio">Provisional: hay documentos pendientes</span> ' : ""}${ev.estado === "Finalizada" ? (r.provisional ? '<span class="etiqueta e-ok">Aprobado</span>' : '<span class="etiqueta e-ok">Definitivo · aprobado</span>') : ev.estado === "Pendiente de aprobación" ? '<span class="etiqueta e-rev">Pendiente de aprobación del coordinador</span>' : ev.estado === "Devuelta" ? '<span class="etiqueta e-alerta">Devuelta al inspector</span>' : '<span class="etiqueta e-gris">Preliminar · evaluación en proceso</span>'}
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
  enlazarSeguimiento(ev); enlazarRevision(ev);
  if (!puedeEvaluar(ev)) raiz.querySelectorAll("[data-pl]").forEach((i) => (i.disabled = true));   // el plan de mejora lo acuerda el inspector con el productor en campo
  else raiz.querySelectorAll("[data-pl]").forEach((i) => (i.oninput = i.onchange = () => { ev.plan[i.dataset.pl] = ev.plan[i.dataset.pl] || {}; ev.plan[i.dataset.pl][i.dataset.k] = i.value; guardar(); }));
}

/* ---- constancia de cumplimiento (v0.25) ---- */
function panelConstancia(ev) {
  if (ev.estado !== "Finalizada") return "";
  const c = ev.constancia;
  if (c) { const vig = constanciaVigente(c);
    return `<section class="panel panel-constancia ${vig ? "" : "vencida"} no-imprimir"><div class="pc-cuerpo"><span class="pc-sello" aria-hidden="true">${vig ? "✔" : "⌛"}</span><div><h3 style="margin:0">${vig ? "Finca certificada" : "Constancia vencida"} · ${nombreSp(ev.sp)}</h3>
      <p style="margin:4px 0 0">Constancia de cumplimiento de bienestar animal <b>${c.codigo}</b> · ${vig ? "vigente hasta" : "venció el"} <b>${fecha(new Date(c.vence + "T12:00"))}</b>.${vig ? "" : " Se requiere una nueva inspección."}</p></div></div>
      <a class="btn btn-primario" href="#/eval/${ev.id}/constancia">Descargar constancia</a></section>`; }
  if (!esProductor()) return "";
  const prog = EVALS.find((e) => e.proceso === ev.proceso && e.estado === "Programada");
  const acciones = Object.entries(ev.plan || {}).filter(([, p]) => p && p.accion);
  return `<section class="panel panel-plan no-imprimir"><h3 style="margin:0 0 6px">Plan de mejora</h3><p style="margin:0 0 8px">La finca aún no cumple los criterios para la constancia de cumplimiento. Estas son las acciones acordadas con el inspector${prog ? `; la próxima visita es el <b>${fecha(new Date(prog.fecha + "T07:00"))}</b>` : ""}.</p>
    ${acciones.length ? `<ul class="lista-revision">${acciones.map(([code, p]) => `<li><b>${esc(IND[code] ? IND[code].num + " " + IND[code].name : code)}</b>: ${esc(p.accion)}${p.plazo ? ` · plazo ${fecha(new Date(p.plazo + "T12:00"))}` : ""}</li>`).join("")}</ul>` : '<p class="muted" style="margin:0">El detalle del plan está más abajo, en el diagnóstico.</p>'}</section>`;
}
/** Constancia lista para imprimir o guardar como PDF. */
function vConstancia(ev) {
  const c = ev.constancia, f = FINCAS.find((x) => x.id === ev.finca);
  if (!c || !f) { toast("Esta visita no tiene constancia de cumplimiento."); location.replace(`#/eval/${ev.id}/resultado`); return; }
  const r = resultado(ev), ctx = r.ctx, apr = ev.aprobada || {}, vig = constanciaVigente(c);
  shell("fincas", `${migasEval(ev, "Constancia")}`, `<div class="encabezado no-imprimir"><div><h1>Constancia de cumplimiento</h1><p>${vig ? "Vigente" : "Vencida"} · use «Descargar o imprimir» y elija «Guardar como PDF».</p></div>
      <div style="display:flex;gap:8px"><a class="btn btn-sec" href="#/eval/${ev.id}/resultado">Ver resultado</a><button class="btn btn-primario" id="imprimirC">Descargar o imprimir</button></div></div>
    <article class="constancia ${vig ? "" : "vencida"}"><header><div class="c-marca">EBA <b>Cuac Cuac</b><small>Bienestar animal · patos y gansos</small></div><div class="c-cod"><small>Código</small><b>${c.codigo}</b><small>Verificación ${c.verificacion}</small></div></header>
      <h1>Constancia de cumplimiento de bienestar animal</h1>
      <p class="c-intro">Se hace constar que la unidad productiva descrita cumple los criterios de bienestar animal para <b>${nombreSp(ev.sp).toLowerCase()}</b> de la metodología de evaluación, según la visita aprobada por el ICA.</p>
      <dl class="c-datos">
        <div><dt>Finca</dt><dd>${esc(f.nombre)} · ${esc(f.id)}</dd></div><div><dt>Ubicación</dt><dd>${esc(f.vereda ? f.vereda + ", " : "")}${esc(f.mpio)}, ${esc(f.depto)}</dd></div>
        <div><dt>Titular</dt><dd>${esc(f.productor)}</dd></div><div><dt>Especie y propósito</dt><dd>${nombreSp(ev.sp)} · ${esc(ctx.e.proposito || "")} · ${ctx.tramo === "traspatio" ? "Traspatio" : "Comercial"}</dd></div>
        <div><dt>Visita</dt><dd>${nombreVisita(ev)} · ${fecha(new Date(ev.fecha + "T07:00"))} · ${esc(ev.id)}</dd></div><div><dt>Resultado</dt><dd><b>${fmt(r.total)}</b> de 100 · ${r.nivel[0]}</dd></div>
        <div><dt>Inspector</dt><dd>${esc(nombreInspector(ev.inspector))}</dd></div><div><dt>Aprobó</dt><dd>${esc(nombreInspector(apr.por))} · Coordinador ICA${apr.fecha ? ` · ${fecha(new Date(apr.fecha))}` : ""}</dd></div>
        <div><dt>Emitida</dt><dd>${fecha(new Date(c.emitida))}</dd></div><div><dt>Vigente hasta</dt><dd><b>${fecha(new Date(c.vence + "T12:00"))}</b>${vig ? "" : ' <span class="etiqueta e-gris">Vencida</span>'}</dd></div>
      </dl>
      <p class="c-nota">Criterios: puntaje de 90 o más (nivel Excelente), ningún indicador en 0 y ningún pendiente. La constancia se refiere a la especie y a la fecha de la visita indicadas; una nueva visita que no cumpla no la anula, pero al vencer se requiere una nueva inspección.</p>
      <footer><span>Documento generado por EBA Cuac Cuac (prototipo)</span><span>${c.codigo} · ${c.verificacion}</span></footer></article>`);
  raiz.querySelector("#imprimirC").onclick = () => { log(`Descarga de la constancia ${c.codigo}`); window.print(); };
}

/* ---- revisión del coordinador (v0.25): aprobar o devolver lo que el inspector finaliza ---- */
const ultimaRevision = (ev, accion) => (ev.revision || []).filter((x) => !accion || x.accion === accion).slice(-1)[0] || null;
function registrarRevision(ev, accion, obs) { ev.revision = (ev.revision || []).concat([{ accion, por: yoClave(), fecha: new Date().toISOString(), obs: obs || "" }]); guardar(); }
const avisoDevuelta = (d) => `<div class="aplica aviso-devuelta"><span>↩</span><span><b>El coordinador devolvió la visita</b> (${esc(nombreInspector(d.por))}, ${fecha(new Date(d.fecha))}): «${esc(d.obs)}». Corrija lo indicado y vuelva a enviarla desde el cierre.</span></div>`;
/** Clave del usuario productor de una finca (para avisarle), si existe en la demostración. */
const usuarioProductor = (f) => (Object.entries(USUARIOS).find(([, x]) => x.perfil === "productor" && x.nombre === f.productor) || [])[0];
const TXT_REV = { Enviada: "Enviada a aprobación", Reenviada: "Reenviada corregida", Devuelta: "Devuelta al inspector", Aprobada: "Aprobada" };
function panelRevision(ev) {
  const hist = ev.revision || [], pend = ev.estado === "Pendiente de aprobación", coord = SES.rol === "coordinador";   // aprobar o devolver: solo el coordinador
  if (!hist.length && !pend) return "";
  if (esProductor()) { const ap = ultimaRevision(ev, "Aprobada"); return ap ? `<div class="aplica aviso-aprobada no-imprimir"><span>✔</span><span>Resultado aprobado por el ICA (${esc(nombreInspector(ap.por))}, ${fecha(new Date(ap.fecha))}).</span></div>` : ""; }
  const ver = verificarCumplimiento(ev), st = estadoProceso(ev.proceso), sig = (ev.visita || 0) + 1;
  const lineas = hist.map((x) => `<li><b>${TXT_REV[x.accion] || x.accion}</b> · ${esc(nombreInspector(x.por))} · ${fecha(new Date(x.fecha))} ${hora(new Date(x.fecha))}${x.obs ? `<br><span class="muted">«${esc(x.obs)}»</span>` : ""}</li>`).join("");
  const propuesta = pend && !ver.cumple ? (sig <= st.max ? `<p style="margin:8px 0 0">Seguimiento ${sig} de ${st.max} propuesto por el inspector para el <b>${ev.segFecha ? fecha(new Date(ev.segFecha + "T07:00")) : "—"}</b>. Se programa al aprobar.</p>`
    : `<p style="margin:8px 0 0">Es el último seguimiento del proceso: al aprobar, podrá decidir si lo amplía a ${MAX_SEGUIMIENTOS}.</p>`) : "";
  return `<section class="panel panel-revision ${pend ? "pendiente" : ""}"><div class="panel-cab"><h3>Revisión del coordinador ${pend ? '<span class="etiqueta e-rev">Pendiente de aprobación</span>' : ev.estado === "Devuelta" ? '<span class="etiqueta e-alerta">Devuelta</span>' : ev.estado === "Finalizada" ? '<span class="etiqueta e-ok">Aprobada</span>' : ""}</h3></div>
    ${pend ? `<p style="margin:0">${esc(nombreInspector(ev.inspector))} finalizó la visita. El puntaje se calculó automáticamente con la metodología: <b>${fmt(resultado(ev).total)} · ${resultado(ev).nivel[0]}</b> · ${ver.cumple ? '<span class="etiqueta e-ok">Cumple los criterios</span>' : '<span class="etiqueta e-gris">No cumple</span>'}. El coordinador no modifica las calificaciones: aprueba o devuelve con una observación.</p>${propuesta}` : ""}
    ${ev.estado === "Devuelta" ? avisoDevuelta(ultimaRevision(ev, "Devuelta")) : ""}
    ${lineas ? `<ul class="lista-revision">${lineas}</ul>` : ""}
    ${pend && coord ? '<div class="acciones"><button class="btn btn-sec" id="devolverBtn">Devolver con observación</button><button class="btn btn-primario" id="aprobarBtn">Aprobar inspección</button></div>' : ""}</section>`;
}
function enlazarRevision(ev) {
  const ap = raiz.querySelector("#aprobarBtn"), dv = raiz.querySelector("#devolverBtn"), f = FINCAS.find((x) => x.id === ev.finca);
  if (dv) dv.onclick = () => modal(`<h3>Devolver al inspector</h3><p>La visita vuelve a ${esc(nombreInspector(ev.inspector))} para que corrija y la reenvíe. Escriba qué debe revisar.</p>
      <div class="campo"><label for="obsDev">Observación</label><textarea id="obsDev" rows="3" placeholder="Ej.: falta la observación del indicador 6.2.1 del galpón 2"></textarea><span class="error-campo" id="errDev"></span></div>
      <div class="acciones"><button class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-peligro" data-ok>Devolver</button></div>`, (c) => {
      c.querySelector("[data-c]").onclick = cerrarCapas;
      c.querySelector("[data-ok]").onclick = () => { const o = c.querySelector("#obsDev").value.trim(); if (o.length < 5) { c.querySelector("#errDev").textContent = "Escriba la observación para el inspector."; return; }
        ev.estado = "Devuelta"; registrarRevision(ev, "Devuelta", o); log(`Devolución de ${ev.id} al inspector: ${o}`);
        avisar(ev.inspector, `Inspección devuelta: ${f.nombre} · ${nombreSp(ev.sp)}. «${o}»`, `#/eval/${ev.id}/cierre`);
        cerrarCapas(); toast(`Visita devuelta a ${nombreInspector(ev.inspector)}.`); vResultado(ev); }; });
  if (ap) ap.onclick = () => {
    const ver = verificarCumplimiento(ev), st = estadoProceso(ev.proceso), sig = (ev.visita || 0) + 1, sigue = !ver.cumple && sig <= st.max, hoyISO = new Date().toISOString().slice(0, 10);
    const fSug = ev.segFecha && ev.segFecha >= hoyISO ? ev.segFecha : fechaSugeridaSeguimiento(ev).fecha;
    modal(`<div class="modal-cab"><h3>Aprobar inspección</h3><p class="muted">${esc(f.nombre)} · ${nombreSp(ev.sp)} · ${nombreVisita(ev)} · ${ev.id}</p></div><div class="modal-cuerpo">
      <p style="margin-top:0">Resultado: <b>${fmt(resultado(ev).total)} · ${resultado(ev).nivel[0]}</b>. ${ver.cumple ? "La finca <b>cumple</b> todos los criterios: el proceso se cierra." : `La finca <b>no cumple</b> (${ver.motivos.map(esc).join(" · ")}).`} Al aprobar, el productor ve el resultado.</p>
      ${sigue ? `<div class="bloque-seg"><h4>Seguimiento ${sig} de ${st.max}</h4><div class="fila"><div class="campo"><label for="apF">Fecha de la visita</label><input type="date" id="apF" min="${hoyISO}" value="${fSug}"><span class="ayuda-campo">${ev.segFecha ? "Propuesta por el inspector." : "Sugerida según el plan de mejora."}</span></div>
        <div class="campo"><label for="apI">Inspector</label><select id="apI">${inspectores().map(([k, x]) => `<option value="${k}" ${k === ev.inspector ? "selected" : ""}>${esc(x.nombre)}</option>`).join("")}</select></div></div></div>`
        : !ver.cumple ? `<p class="aplica"><span>ℹ</span><span>No quedan seguimientos en el proceso: después de aprobar puede ampliarlo a ${MAX_SEGUIMIENTOS} desde el resultado.</span></p>` : ""}
      <span class="error-campo" id="errAp"></span></div>
      <div class="acciones"><button class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-primario" data-ok>Aprobar</button></div>`, (c) => {
      c.querySelector(".modal > div").classList.add("modal-medio"); c.querySelector("[data-c]").onclick = cerrarCapas;
      c.querySelector("[data-ok]").onclick = () => {
        const fch = sigue ? c.querySelector("#apF").value : null, insp = sigue ? c.querySelector("#apI").value : null;
        if (sigue && (!fch || fch < hoyISO)) { c.querySelector("#errAp").textContent = "La fecha del seguimiento debe ser hoy o posterior."; return; }
        ev.estado = "Finalizada"; ev.aprobada = { por: yoClave(), fecha: new Date().toISOString() }; delete ev.segFecha; registrarRevision(ev, "Aprobada");
        const cons = ver.cumple ? emitirConstancia(ev) : null; if (cons) log(`Constancia de cumplimiento ${cons.codigo} emitida para ${f.nombre} · ${nombreSp(ev.sp)} (vence ${cons.vence})`);
        log(`Aprobación de ${ev.id} (${f.nombre} · ${nombreSp(ev.sp)})`);
        const st2 = estadoProceso(ev.proceso); if (st2.cumplido) log(`Proceso ${ev.proceso} cumplido en ${nombreVisita(ev)}`);
        const seg = sigue ? programarSeguimiento(ev.proceso, fch, insp) : null;
        if (seg && seg.ev) avisar(insp, `Seguimiento asignado: ${f.nombre} · ${nombreSp(ev.sp)} (${nombreVisita(seg.ev)}) para el ${fecha(new Date(fch + "T07:00"))}`, `#/finca/${f.id}`);
        avisar(ev.inspector, `Inspección aprobada: ${f.nombre} · ${nombreSp(ev.sp)}`, `#/eval/${ev.id}/resultado`);
        const up = usuarioProductor(f); if (up) avisar(up, cons ? `¡Finca certificada! ${f.nombre} · ${nombreSp(ev.sp)}: constancia ${cons.codigo} lista para descargar` : `Resultado disponible: ${f.nombre} · ${nombreSp(ev.sp)} (${fmt(resultado(ev).total)} ${resultado(ev).nivel[0]}): consulte su plan de mejora`, cons ? `#/eval/${ev.id}/constancia` : `#/eval/${ev.id}/resultado`);
        guardar(); cerrarCapas();
        toast(st2.cumplido ? `Inspección aprobada: la finca cumple. Constancia ${cons ? cons.codigo : ""} emitida y el proceso quedó cerrado.` : seg && seg.ev ? `Inspección aprobada. ${nombreVisita(seg.ev)} asignado a ${nombreInspector(insp)} para el ${fecha(new Date(fch + "T07:00"))}.` : "Inspección aprobada.");
        vResultado(ev); };
    });
  };
}

/* ---- seguimiento y continuidad del proceso ---- */
const COLOR_ESTADO_PROC = { "Seguimiento programado": "e-seg", Cumplido: "e-ok", "En seguimiento": "e-info", "En curso": "e-medio", "Requiere ampliación": "e-medio", "Cerrado sin cumplir": "e-alerta" };
function seccionSeguimiento(ev) {
  const st = estadoProceso(ev.proceso), v = esProductor() ? st.visitas.filter((e) => ["Finalizada", "Programada"].includes(e.estado)) : st.visitas.filter((e) => enHistorial(e) || e.estado === "Programada");   // el productor no ve lo que aún no está aprobado
  const filas = v.map((e, k) => { const r = resultado(e), prev = k ? resultado(v[k - 1]).total : null, d = prev == null || e.estado === "Programada" ? null : r.total - prev;
    const ver = e.estado === "Finalizada" ? verificarCumplimiento(e) : null;
    return `<tr ${e === ev ? 'style="background:#F7FAF2"' : ""}><td><b>${nombreVisita(e)}</b><br><a href="#/eval/${e.id}${e.estado === "Finalizada" ? "/resultado" : ""}">${e.id}</a></td><td>${fecha(new Date(e.fecha + "T07:00"))}</td><td><span class="etiqueta ${COLOR_FLUJO[etqEstadoEv(e.estado)] || "e-info"}">${etqEstadoEv(e.estado)}</span></td>
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
      ${ver.cumple ? `<b>Esta visita cumple todos los criterios</b> (puntaje ≥ ${CRITERIO_CUMPLE.puntajeMin}, ningún indicador en 0 y sin información pendiente)${ev.estado === "Finalizada" ? ": el proceso quedó cumplido y no requiere más seguimientos." : ". Cuando el coordinador la apruebe, el proceso se cierra y no se piden más seguimientos."}`
        : `<b>${ev.estado === "Finalizada" ? "Esta visita no cumplió" : ev.estado === "Pendiente de aprobación" ? "Esta visita no cumple" : "Para cumplir en esta visita falta"}:</b> ${ver.motivos.map(esc).join(" · ")}.`}</span></div>`;
  // estado del proceso y resultado final
  const ampl = st.ampliacion ? `<p class="muted" style="font-size:13px;margin:6px 0 0">Ampliado a ${MAX_SEGUIMIENTOS} seguimientos por ${esc(st.ampliacion.por)} el ${fecha(new Date(st.ampliacion.fecha))}: «${esc(st.ampliacion.motivo)}».</p>` : "";
  const final = st.final ? `<div class="panel" style="margin-top:12px;border:2px solid ${st.cumplido ? "var(--campo)" : "var(--ocre)"};box-shadow:none"><h4 style="margin:0">Resultado final del proceso</h4>
      <p style="margin:6px 0 0"><b style="font-size:22px">${fmt(resultado(st.final).total)}</b> · ${resultado(st.final).nivel[0]} · ${nombreVisita(st.final)} (${st.final.id}, ${fecha(new Date(st.final.fecha + "T07:00"))}) · ${st.cumplido ? "La finca cumple todos los criterios." : "Se agotaron los seguimientos sin cumplir todos los criterios."}
      ${st.final !== ev ? ` <a href="#/eval/${st.final.id}/resultado">Ver la visita final</a>` : ""}</p></div>` : "";
  const puedeOperar = esGestor(), coordina = puedeOperar;   // coordinador o administrador: asignan y amplían
  // Reprogramar la fecha: el coordinador, el administrador o el inspector asignado al seguimiento.
  const puedeReprog = (p) => puedeOperar || (SES.rol === "inspector" && p.inspector === yoClave());
  const prog = st.abierta && st.abierta.estado === "Programada" && st.abierta.visita > 0 ? st.abierta : null;
  const esUltima = st.ultima === ev || (prog && st.visitas[st.visitas.indexOf(prog) - 1] === ev);
  const progHTML = prog ? `<div class="aplica aviso-programado"><span>📅</span><span><b>${nombreVisita(prog)} programado para el ${fecha(new Date(prog.fecha + "T07:00"))}</b>${esProductor() ? "" : ` · ${esc(nombreInspector(prog.inspector))}`}${prog.fecha < new Date().toISOString().slice(0, 10) ? ' <span class="etiqueta e-alerta">Vencido</span>' : ""}. Retoma lo registrado en esta visita; el inspector actualiza lo que cambió.</span>${puedeReprog(prog) ? `<button class="btn btn-sec btn-chico" data-reprog="${prog.id}">Reprogramar</button>` : ""}</div>` : "";
  let acciones = "";
  if (puedeOperar && esUltima) {
    if (st.puedeSeguimiento) acciones = `<button class="btn btn-primario" id="segBtn">Asignar seguimiento ${st.usados + 1} de ${st.max}</button>`;
    else if (st.puedeAmpliar) acciones = coordina ? `<button class="btn btn-primario" id="ampliarBtn">Ampliar a ${MAX_SEGUIMIENTOS} seguimientos</button>` : `<span class="etiqueta e-medio">Se usaron los ${st.max} seguimientos: el coordinador puede ampliar a ${MAX_SEGUIMIENTOS}</span>`;
    if (st.cerrado && st.puedeNuevo) acciones += ` <button class="btn btn-sec" id="nuevoBtn">Asignar nuevo proceso</button>`;
  }
  return `<section class="panel"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:start"><div><h3>Seguimiento y continuidad · ${esc(ev.proceso)} <span class="etiqueta ${COLOR_ESTADO_PROC[st.estado]}">${st.estado}</span></h3>
      <p class="muted" style="margin:4px 0 0">Cada visita se valida cuando el coordinador la aprueba: si la finca cumple, el proceso se cierra y no pide más seguimientos; si no, se programan hasta ${SEGUIMIENTOS_BASE} seguimientos (ampliables a ${MAX_SEGUIMIENTOS}). Seguimientos usados: <b>${st.usados} de ${st.max}</b>. Las visitas finalizadas no se modifican.</p>${ampl}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${acciones}</div></div>
    ${verHTML}${progHTML}${final}
    <div style="margin-top:12px"><div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Visita</th><th>Fecha</th><th>Estado</th><th class="num">MBA</th><th class="num">MBR</th><th class="num">MBG</th><th class="num">Total</th><th>Nivel</th><th class="num">Cambio</th><th>Criterios</th></tr></thead><tbody>${filas}</tbody></table></div>
      <div style="max-width:620px">${evolucionSVG(puntos)}</div></div>${camHTML}</section>`;
}
function enlazarSeguimiento(ev) {
  const s = raiz.querySelector("#segBtn"), n = raiz.querySelector("#nuevoBtn"), a = raiz.querySelector("#ampliarBtn");
  if (s) s.onclick = () => abrirNuevaEvaluacion(`${ev.finca}|${ev.sp}`);
  if (n) n.onclick = () => abrirNuevaEvaluacion(`${ev.finca}|${ev.sp}`);
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
    <div class="modal-cuerpo"><div class="campo"><label for="rpF">Nueva fecha de la visita</label><input type="date" id="rpF" min="${hoyISO}" value="${esc(prog.fecha)}"><span class="aviso-seg" id="rpAv"></span></div>
      <div class="campo"><label for="rpM">Motivo</label><input id="rpM" placeholder="Ej.: el productor pidió otra fecha; vía cerrada por lluvias"></div><span class="error-campo" id="rpErr"></span></div>
    <div class="acciones"><button class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-primario" data-ok>Guardar fecha</button></div>`, (c) => {
    const inp = c.querySelector("#rpF"), av = () => (c.querySelector("#rpAv").textContent = avisoFechaSeguimiento(base, inp.value)); av(); inp.oninput = inp.onchange = av;
    c.querySelector("[data-c]").onclick = cerrarCapas;
    c.querySelector("[data-ok]").onclick = () => { const r = reprogramarSeguimiento(prog, inp.value, c.querySelector("#rpM").value); if (r.error) { c.querySelector("#rpErr").textContent = r.error; return; }
      const f = FINCAS.find((x) => x.id === prog.finca), txt = `${nombreVisita(prog)} de ${f.nombre} · ${nombreSp(prog.sp)} reprogramado para el ${fecha(new Date(prog.fecha + "T07:00"))}`;
      if (SES.rol === "inspector") avisar("coordinador", `${txt} por ${yo().nombre}`, `#/finca/${f.id}`); else if (prog.inspector !== yoClave()) avisar(prog.inspector, txt, `#/finca/${f.id}`);
      const up = usuarioProductor(f); if (up) avisar(up, txt, `#/finca/${f.id}`);
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
