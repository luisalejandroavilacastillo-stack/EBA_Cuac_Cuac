/* EBA Patos y Gansos · ICA — js/vistas/reportes.js
   Reportes: consolidar, analizar y exportar la información de las inspecciones.
   Todo sale de las evaluaciones guardadas; los filtros se aplican a indicadores, gráficas, tablas y exportación. */
"use strict";

const FILTRO_REP = { sp: "", finca: "", estado: "", visita: "", desde: "", hasta: "" };
let COMPARAR_REP = "";

/** Evaluaciones que entran en el reporte según los filtros (las anuladas nunca cuentan). */
function datosReporte(flt) {
  const vis = fincasVisibles().map((f) => f.id);
  return EVALS.filter((e) => e.estado !== "Anulada" && vis.includes(e.finca) && (!flt.sp || e.sp === flt.sp) && (!flt.finca || e.finca === flt.finca)
      && (!flt.estado || e.estado === flt.estado) && (!flt.visita || (flt.visita === "inicial" ? !e.visita : !!e.visita))
      && (!flt.desde || e.fecha >= flt.desde) && (!flt.hasta || e.fecha <= flt.hasta))
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || (b.visita || 0) - (a.visita || 0));
}
/** Cumplimiento de cada indicador en las evaluaciones finalizadas: promedio, número de evaluaciones y calificaciones en 0. */
function criteriosReporte(finalizadas) {
  const m = {};
  finalizadas.forEach((e) => resultado(e).filas.forEach(({ ind, score }) => { const x = (m[ind.code] = m[ind.code] || { ind, n: 0, suma: 0, ceros: 0 }); x.n++; x.suma += score; if (score === 0) x.ceros++; }));
  const v = Object.values(m).map((x) => ({ ...x, prom: x.suma / x.n }));
  const porNum = (a, b) => a.ind.num.localeCompare(b.ind.num, "es", { numeric: true });
  return {
    mejores: v.filter((x) => x.prom >= 90).sort((a, b) => b.prom - a.prom || b.n - a.n || porNum(a, b)).slice(0, 5),
    atencion: v.filter((x) => x.prom < 90).sort((a, b) => a.prom - b.prom || b.ceros - a.ceros || porNum(a, b)).slice(0, 5)
  };
}
/** Visitas con resultado (en proceso o finalizadas) de una finca y especie, en orden; y cambios entre las dos últimas. */
function compararVisitas(fid, sp) {
  const v = EVALS.filter((e) => e.finca === fid && e.sp === sp && e.estado === "Finalizada").sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.visita || 0) - (b.visita || 0));
  if (v.length < 2) return { visitas: v, cambios: null };
  const [a, b] = v.slice(-2), ra = resultado(a), rb = resultado(b);
  const sa = Object.fromEntries(ra.filas.map((x) => [x.ind.code, x.score])), cambios = { mejoro: [], empeoro: [], igual: 0 };
  rb.filas.forEach(({ ind, score }) => { const antes = sa[ind.code]; if (antes == null) return;
    if (score > antes + 1e-9) cambios.mejoro.push([ind, antes, score]); else if (score < antes - 1e-9) cambios.empeoro.push([ind, antes, score]); else cambios.igual++; });
  cambios.mejoro.sort((x, y) => (y[2] - y[1]) - (x[2] - x[1])); cambios.empeoro.sort((x, y) => (x[2] - x[1]) - (y[2] - y[1]));
  return { visitas: v, cambios, a, b };
}
const filaMedidas = (r) => ["MBR", "MBA", "MBG"].map((g) => `<td class="num">${r.pesos[g] > 0 ? fmt(r.med[g]) : "—"}</td>`).join("");

function vReportes() {
  const fs = fincasVisibles(), f = FILTRO_REP;
  const opt = (v, t, sel) => `<option value="${v}" ${sel === v ? "selected" : ""}>${t}</option>`;
  shell("reportes", "<b>Reportes</b>", `<div class="encabezado"><div><h1>Reportes</h1><p>Consolida y analiza las inspecciones registradas. Los filtros se aplican a todo lo que se ve y a la exportación, que no incluye datos personales.</p></div>
    <div class="no-imprimir acciones-encabezado"><button class="btn btn-sec" onclick="window.print()">Imprimir</button><button class="btn btn-primario" id="csv">Exportar CSV</button></div></div>
    <section class="panel filtros-reporte no-imprimir" aria-label="Filtros"><div class="rejilla-filtros">
      <div class="campo"><label for="rf1">Finca</label><select id="rf1">${opt("", "Todas", f.finca)}${fs.map((x) => opt(x.id, esc(x.nombre), f.finca)).join("")}</select></div>
      <div class="campo"><label for="rf2">Especie</label><select id="rf2">${opt("", "Patos y gansos", f.sp)}${opt("pato", "Patos", f.sp)}${opt("ganso", "Gansos", f.sp)}</select></div>
      <div class="campo"><label for="rf3">Estado</label><select id="rf3">${opt("", "Todos", f.estado)}${opt("Finalizada", "Finalizada", f.estado)}${opt("En proceso", "En proceso", f.estado)}${opt("Programada", "Programada (por iniciar)", f.estado)}</select></div>
      <div class="campo"><label for="rf4">Visita</label><select id="rf4">${opt("", "Todas", f.visita)}${opt("inicial", "Visita inicial", f.visita)}${opt("seg", "Seguimientos", f.visita)}</select></div>
      <div class="campo"><label for="rf5">Desde</label><input id="rf5" type="date" value="${f.desde}"></div>
      <div class="campo"><label for="rf6">Hasta</label><input id="rf6" type="date" value="${f.hasta}"></div>
      <div class="campo campo-boton"><button type="button" class="btn-texto" id="rfx">Limpiar filtros</button></div></div></section>
    <div id="rep"></div>`);
  const ids = { rf1: "finca", rf2: "sp", rf3: "estado", rf4: "visita", rf5: "desde", rf6: "hasta" };
  Object.entries(ids).forEach(([id, k]) => (raiz.querySelector("#" + id).onchange = (e) => { FILTRO_REP[k] = e.target.value; pintaReporte(); }));
  raiz.querySelector("#rfx").onclick = () => { Object.keys(FILTRO_REP).forEach((k) => (FILTRO_REP[k] = "")); vReportes(); };
  raiz.querySelector("#csv").onclick = () => {
    const rows = [["evaluacion", "fecha", "finca_id", "especie", "tramo", "proceso", "visita", "estado", "avance_pct", "recursos", "animal", "gestion", "total", "nivel"]]
      .concat(datosReporte(FILTRO_REP).map((e) => { const r = resultado(e), pr = e.estado === "Programada";
        return [e.id, e.fecha, e.finca, e.sp, r.ctx.tramo, e.proceso, nombreVisita(e), e.estado, avance(e).pct, pr ? "" : fmt(r.med.MBR), pr ? "" : fmt(r.med.MBA), pr ? "" : fmt(r.med.MBG), pr ? "" : fmt(r.total), pr ? "" : r.nivel[0]]; }));
    const blob = new Blob(["﻿" + rows.map((x) => x.join(";")).join("\n")], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "reporte_eba.csv"; a.click();
    log(`Exportación de reporte (${rows.length - 1} evaluaciones, sin datos personales)`); };
  pintaReporte();
}

function pintaReporte() {
  const cont = raiz.querySelector("#rep"); if (!cont) return;
  const evs = datosReporte(FILTRO_REP), fin = evs.filter((e) => e.estado === "Finalizada"), rf = fin.map((e) => ({ e, r: resultado(e) }));
  const prom = rf.length ? rf.reduce((a, x) => a + x.r.total, 0) / rf.length : null, cumplen = fin.filter((e) => verificarCumplimiento(e).cumple).length;
  const abiertas = evs.filter((e) => e.estado !== "Finalizada").length;
  if (!evs.length) { cont.innerHTML = `<section class="panel"><p class="muted" style="margin:0">No hay evaluaciones que coincidan con los filtros.</p></section>`; return; }
  const niveles = { Excelente: 0, Alto: 0, Medio: 0, Bajo: 0 }; rf.forEach((x) => niveles[x.r.nivel[0]]++);
  const sps = [...new Set(fin.map((e) => e.sp))];
  const promMed = (sp, g) => { const v = rf.filter((x) => x.e.sp === sp && x.r.pesos[g] > 0 && x.r.med[g] != null).map((x) => x.r.med[g]); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const crit = criteriosReporte(fin);
  const filaCrit = (x, c) => `<tr><td>${x.ind.num} ${esc(x.ind.name)}<br><span class="muted texto-chico">${nombreSp(x.ind.sp)} · ${x.ind.g}</span></td><td class="num"><b style="color:${c}">${fmt(x.prom)}</b></td><td class="num">${x.n}</td><td class="num">${x.ceros}</td></tr>`;
  const tablaCrit = (arr, c, vacio) => arr.length ? `<div class="envoltura-tabla"><table class="tabla tabla-compacta"><thead><tr><th>Indicador</th><th class="num">Promedio</th><th class="num">Evaluaciones</th><th class="num">Ceros</th></tr></thead><tbody>${arr.map((x) => filaCrit(x, c)).join("")}</tbody></table></div>` : `<p class="muted">${vacio}</p>`;
  // pares finca·especie con visitas para comparar
  const pares = [...new Set(evs.map((e) => e.finca + "|" + e.sp))];
  const conDos = pares.filter((p) => { const [fid, sp] = p.split("|"); return compararVisitas(fid, sp).visitas.length >= 2; });
  if (!pares.includes(COMPARAR_REP)) COMPARAR_REP = conDos[0] || pares[0] || "";
  const nomPar = (p) => { const [fid, sp] = p.split("|"); return `${esc(FINCAS.find((x) => x.id === fid)?.nombre || fid)} · ${nombreSp(sp)}`; };
  cont.innerHTML = `<div class="rejilla r-4 kpis-compactos">${kpi(evs.length, "Evaluaciones en la consulta", "var(--semilla)")}${kpi(fin.length, `Finalizadas · ${abiertas} abiertas`, "var(--campo)")}
      ${kpi(fmt(prom), "Puntaje promedio de las finalizadas", prom == null ? "var(--linea)" : clasificar(prom)[1])}${kpi(fin.length ? `${cumplen}<small> de ${fin.length}</small>` : "—", "Cumplen los criterios (≥ 90, sin ceros ni pendientes)", "var(--azul)")}</div>
    <div class="rejilla r-2" style="margin-top:18px"><section class="panel"><h3>Evaluaciones finalizadas por nivel</h3>${fin.length ? `<div class="barras">${[["Excelente", "var(--campo)"], ["Alto", "var(--siembra)"], ["Medio", "var(--cosecha)"], ["Bajo", "var(--rojo)"]].map(([k, c]) => barraH(k, niveles[k], Math.max(1, ...Object.values(niveles)), String(niveles[k]), c)).join("")}</div><p class="muted texto-chico" style="margin-top:8px">Niveles de la Tabla 2 con el puntaje total.</p>` : '<p class="muted">No hay evaluaciones finalizadas en la consulta.</p>'}</section>
      <section class="panel"><h3>Promedio por medida</h3>${sps.length ? `<div class="barras">${sps.flatMap((sp) => [["MBR", "recursos", "var(--siembra)"], ["MBA", "animal", "var(--campo)"], ["MBG", "gestión", "var(--cosecha)"]].map(([g, t, c]) => { const v = promMed(sp, g); return v == null ? "" : barraH(`${nombreSp(sp)} · ${t}`, v, 100, fmt(v), c); })).join("")}</div><p class="muted texto-chico" style="margin-top:8px">Promedio de las evaluaciones finalizadas. En traspatio no se evalúa la gestión.</p>` : '<p class="muted">No hay evaluaciones finalizadas en la consulta.</p>'}</section></div>
    <div class="rejilla r-2" style="margin-top:18px"><section class="panel"><h3>Criterios con mayor cumplimiento</h3>${tablaCrit(crit.mejores, "var(--campo)", fin.length ? "Ningún indicador promedia 90 o más." : "No hay evaluaciones finalizadas.")}</section>
      <section class="panel"><h3>Criterios que requieren atención</h3>${tablaCrit(crit.atencion, "var(--rojo)", fin.length ? "Todos los indicadores promedian 90 o más." : "No hay evaluaciones finalizadas.")}</section></div>
    <section class="panel" style="margin-top:18px" id="comparar"><div class="panel-cab"><h3>Comparación entre visitas</h3>
      <div class="campo campo-en-linea no-imprimir"><label for="rc">Finca y especie</label><select id="rc">${pares.map((p) => `<option value="${p}" ${p === COMPARAR_REP ? "selected" : ""}>${nomPar(p)}${conDos.includes(p) ? "" : " · sin historial"}</option>`).join("")}</select></div></div><div id="cmp"></div></section>
    <section class="panel" style="margin-top:18px"><div class="panel-cab"><h3>Consulta por visita · ${evs.length}</h3></div><div class="envoltura-tabla"><table class="tabla tabla-compacta"><thead><tr><th>Evaluación</th><th>Finca</th><th>Visita</th><th>Estado</th><th class="num">Avance</th><th class="num">MBR</th><th class="num">MBA</th><th class="num">MBG</th><th class="num">Total</th><th>Nivel</th><th class="no-imprimir"></th></tr></thead><tbody>
      ${evs.map((e) => { const r = resultado(e), pr = e.estado === "Programada", fn = FINCAS.find((x) => x.id === e.finca);
        return `<tr><td><b>${e.id}</b><br><span class="muted texto-chico">${fecha(new Date(e.fecha + "T07:00"))}</span></td><td>${esc(fn ? fn.nombre : e.finca)}<br><span class="muted texto-chico">${nombreSp(e.sp)}</span></td><td>${nombreVisita(e)}<br><span class="muted texto-chico">${esc(e.proceso)}</span></td>
        <td><span class="etiqueta ${e.estado === "Finalizada" ? "e-ok" : e.estado === "En proceso" ? "e-medio" : "e-info"}">${e.estado}${e.estado === "Finalizada" && r.provisional ? " · provisional" : ""}</span></td><td class="num">${avance(e).pct} %</td>
        ${pr ? '<td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td>—</td>' : `${filaMedidas(r)}<td class="num"><b>${fmt(r.total)}</b></td><td>${r.nivel[0]}${e.estado !== "Finalizada" ? '<span class="muted texto-chico"> · prel.</span>' : ""}</td>`}
        <td class="num no-imprimir acciones-fila"><a class="btn btn-sec btn-chico" href="#/eval/${e.id}${e.estado === "Finalizada" ? "/resultado" : ""}">${e.estado === "Finalizada" ? "Ver resultados" : "Abrir"}</a><a class="btn-texto" href="#/reportes/finca/${e.finca}">Informe de la finca</a></td></tr>`; }).join("")}</tbody></table></div></section>`;
  const pintaCmp = () => {
    const box = cont.querySelector("#cmp"); if (!COMPARAR_REP) { box.innerHTML = '<p class="muted">No hay fincas en la consulta.</p>'; return; }
    const [fid, sp] = COMPARAR_REP.split("|"), c = compararVisitas(fid, sp);
    if (c.visitas.length < 2) { box.innerHTML = `<p class="aviso-vacio">Esta finca aún no tiene historial para comparar: ${c.visitas.length ? "tiene una sola inspección finalizada" : "no tiene inspecciones finalizadas"}. La comparación aparece cuando hay dos inspecciones finalizadas.</p>`; return; }
    const puntos = c.visitas.map((e) => { const r = resultado(e); return [`${nombreCorto(e)} ${e.fecha.slice(5, 7)}/${e.fecha.slice(2, 4)}`, r.total, r.provisional]; });
    const filas = c.visitas.map((e, k) => { const r = resultado(e), d = k ? r.total - resultado(c.visitas[k - 1]).total : null;
      return `<tr><td>${nombreVisita(e)}<br><span class="muted texto-chico">${e.id} · ${fecha(new Date(e.fecha + "T07:00"))}</span></td>${filaMedidas(r)}<td class="num"><b>${fmt(r.total)}</b></td><td>${r.nivel[0]}${r.provisional ? " (prov.)" : ""}</td><td class="num">${d == null ? "—" : `<b class="${d > 0 ? "sube" : d < 0 ? "baja" : ""}">${d > 0 ? "+" : ""}${fmt(d)}</b>`}</td></tr>`; }).join("");
    const lst = (arr) => arr.length ? `<ul class="lista-cambios">${arr.slice(0, 5).map(([i, a, b]) => `<li>${i.num} ${esc(i.name)}: ${fmt(a)} → <b>${fmt(b)}</b></li>`).join("")}</ul>${arr.length > 5 ? `<p class="muted texto-chico">y ${arr.length - 5} más</p>` : ""}` : '<p class="muted">Ninguno.</p>';
    box.innerHTML = `<div class="rejilla r-2"><div class="envoltura-tabla"><table class="tabla tabla-compacta"><thead><tr><th>Visita</th><th class="num">MBR</th><th class="num">MBA</th><th class="num">MBG</th><th class="num">Total</th><th>Nivel</th><th class="num">Cambio</th></tr></thead><tbody>${filas}</tbody></table></div>
        <div>${evolucionSVG(puntos)}</div></div>
      <h4 style="margin:14px 0 0">Cambios por indicador entre ${c.a.id} y ${c.b.id} <span class="muted texto-chico">· ${c.cambios.igual} sin cambio</span></h4>
      <div class="rejilla r-2"><div><h4 class="sube">Mejoraron · ${c.cambios.mejoro.length}</h4>${lst(c.cambios.mejoro)}</div><div><h4 class="baja">Bajaron · ${c.cambios.empeoro.length}</h4>${lst(c.cambios.empeoro)}</div></div>`;
  };
  cont.querySelector("#rc").onchange = (e) => { COMPARAR_REP = e.target.value; pintaCmp(); };
  pintaCmp();
}

/** Informe detallado de una finca: estado por especie, último resultado, criterios por mejorar, plan de mejora e historial. */
function vInformeFinca(fid) {
  const f = fincasVisibles().find((x) => x.id === fid); if (!f) { location.replace("#/reportes"); return; }
  const p = poblacion(f);
  const bloques = f.especies.map((esp) => {
    const s = estadoEspecie(f, esp.sp), evs = evaluacionesDe(f.id, esp.sp).filter((e) => e.estado !== "Programada");
    const ev = s.ultimaFin || evs[0];
    if (!ev) return `<section class="panel"><h3>${nombreSp(esp.sp)}</h3>${lineaFlujo(s, false)}<p class="muted">Sin evaluaciones con resultado.</p></section>`;
    const r = resultado(ev), mejorar = r.filas.filter((x) => x.score < 100).sort((a, b) => a.score - b.score);
    const plan = Object.entries(ev.plan || {}).filter(([, v]) => v && (v.accion || "").trim());
    const c = compararVisitas(f.id, esp.sp);
    const puntos = c.visitas.map((e) => { const rr = resultado(e); return [nombreCorto(e), rr.total, rr.provisional]; });
    return `<section class="panel informe-especie"><h3>${nombreSp(esp.sp)} · ${esc(esp.proposito)}</h3>${lineaFlujo(s, false)}
      <div class="rejilla r-2" style="margin-top:12px"><div><h4>${ev.estado === "Finalizada" ? "Último resultado" : "Resultado preliminar"} · ${nombreVisita(ev)} (${ev.id}, ${fecha(new Date(ev.fecha + "T07:00"))})</h4>
        <p class="puntaje-informe"><b style="color:${r.nivel[1]}">${fmt(r.total)}</b> ${r.nivel[0]}${r.provisional ? ' <span class="etiqueta e-medio">Provisional</span>' : ""}</p>
        <div class="barras">${["MBA", "MBR", "MBG"].filter((g) => r.pesos[g] > 0).map((g) => barraH(`${{ MBA: "Animal", MBR: "Recursos", MBG: "Gestión" }[g]} · ${r.pesos[g] * 100} %`, r.med[g] ?? 0, 100, fmt(r.med[g]), g === "MBA" ? "var(--campo)" : g === "MBR" ? "var(--siembra)" : "var(--cosecha)")).join("")}</div>
        <p class="texto-chico" style="margin-top:10px">${r.filas.filter((x) => x.score >= 100).length} indicadores en 100 · ${r.filas.filter((x) => x.score > 0 && x.score < 100).length} por mejorar · ${r.filas.filter((x) => x.score === 0).length} en 0${r.pend ? ` · ${r.pend} sin calificar` : ""}.</p></div>
        <div>${puntos.length > 1 ? evolucionSVG(puntos) : '<p class="muted">La evolución aparece cuando hay dos inspecciones finalizadas.</p>'}</div></div>
      <h4 style="margin-top:14px">Indicadores por mejorar · ${mejorar.length}</h4>${mejorar.length ? `<div class="envoltura-tabla"><table class="tabla tabla-compacta"><thead><tr><th>Indicador</th><th class="num">Puntaje</th><th>Observación del inspector</th></tr></thead><tbody>${mejorar.map((x) => `<tr><td>${x.ind.num} ${esc(x.ind.name)}</td><td class="num"><b style="color:${x.score === 0 ? "var(--rojo)" : "inherit"}">${fmt(x.score)}</b></td><td>${esc(ev.obs[x.ind.code] || "—")}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">Todos los indicadores calificados están en 100.</p>'}
      <h4 style="margin-top:14px">Plan de mejora acordado</h4>${plan.length ? `<div class="envoltura-tabla"><table class="tabla tabla-compacta"><thead><tr><th>Indicador</th><th>Acción</th><th>Responsable</th><th>Plazo</th></tr></thead><tbody>${plan.map(([code, v]) => `<tr><td>${IND[code] ? IND[code].num + " " + esc(IND[code].name) : code}${v.galpon ? ` · ${esc(v.galpon)}` : ""}</td><td>${esc(v.accion)}</td><td>${esc(v.resp || "—")}</td><td>${v.plazo ? fecha(new Date(v.plazo + "T07:00")) : "—"}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">No hay acciones registradas en el plan de mejora de esta visita.</p>'}
      <h4 style="margin-top:14px">Historial de visitas</h4><div class="envoltura-tabla"><table class="tabla tabla-compacta"><thead><tr><th>Visita</th><th>Proceso</th><th>Estado</th><th class="num">MBR</th><th class="num">MBA</th><th class="num">MBG</th><th class="num">Total</th><th>Nivel</th></tr></thead><tbody>
        ${evaluacionesDe(f.id, esp.sp).map((e) => { const rr = resultado(e), pr = e.estado === "Programada"; return `<tr><td>${nombreVisita(e)}<br><span class="muted texto-chico">${e.id} · ${fecha(new Date(e.fecha + "T07:00"))}</span></td><td>${esc(e.proceso)}</td><td>${e.estado}</td>${pr ? '<td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td>—</td>' : `${filaMedidas(rr)}<td class="num"><b>${fmt(rr.total)}</b></td><td>${rr.nivel[0]}</td>`}</tr>`; }).join("")}</tbody></table></div></section>`;
  }).join("");
  shell("reportes", `<a href="#/reportes">Reportes</a> / <b>Informe · ${esc(f.nombre)}</b>`, `<div class="encabezado"><div><h1>Informe de ${esc(f.nombre)}</h1><p>${esc(f.mpio)}, ${esc(f.depto)} · ${f.id} · ${p} aves · ${tramo(p) === "comercial" ? "Comercial" : "Traspatio"}${f.titular ? ` · Responsable: ${esc(f.titular.nombre)}` : ""} · generado el ${fecha()}</p></div>
    <div class="no-imprimir acciones-encabezado"><a class="btn btn-sec" href="#/finca/${f.id}">Ficha de la finca</a><button class="btn btn-primario" onclick="window.print()">Imprimir o guardar PDF</button></div></div>${bloques}`);
  log(`Consulta del informe de ${f.nombre}`);
}
