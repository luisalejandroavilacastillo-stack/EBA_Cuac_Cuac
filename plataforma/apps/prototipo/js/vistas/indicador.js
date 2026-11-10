/* EBA Patos y Gansos · ICA — js/vistas/indicador.js
   Pantalla de un indicador (numerales 6.x y 7.x): captura, cálculo en vivo, gráfica, observación y evidencia. */
"use strict";

/* ---- preferencias de la vista (solo para quien la usa; si el navegador no guarda, se trabaja en memoria) ---- */
const PREF = {};
const leerPref = (k) => { try { return PREF[k] ?? (sessionStorage.getItem("eba.pref." + k) === "1"); } catch (e) { return !!PREF[k]; } };
const guardarPref = (k, v) => { PREF[k] = !!v; try { sessionStorage.setItem("eba.pref." + k, v ? "1" : "0"); } catch (e) { } };

/** Índice de la evaluación con el avance real: ✓ calificado (color del nivel), ○ pendiente, actual resaltado y «no aplica» atenuado. */
function indiceEvalHTML(ev, code, abierta) {
  const ctx = contexto(ev), todos = lista(ev), a = avance(ev), nPend = a.ap - a.hechos;
  const colorDe = (s) => COL[s >= 90 ? 100 : s >= 50 ? 55 : s >= 20 ? 20 : 0];
  const item = (go, nombre, num, est, color, extra) => `<button class="item-ind est-${est}" data-go="${go}" ${go === code ? 'aria-current="true"' : ""} title="${est === "hecho" ? "Calificado" : est === "na" ? "No aplica en esta finca" : "Pendiente"}${extra ? " · " + extra : ""}">
    <span class="marca" style="--c:${color || "transparent"}" aria-hidden="true">${est === "hecho" ? "✓" : est === "na" ? "–" : ""}</span><span>${esc(nombre)}${go === code ? ' <small class="actual">actual</small>' : ""}</span><span class="n">${num}</span><span class="sr">${est === "hecho" ? "calificado" : est === "na" ? "no aplica" : "pendiente"}</span></button>`;
  const grupos = ["MBR", "MBA", "MBG"].map((g) => { const its = todos.filter((i) => i.g === g);
    return `<div class="grupo-ind"><h4>${CAP[ev.sp][g]} · ${MEDIDA[g]}</h4>${its.map((i) => { const n = aplica(i, ctx), c = calcular(i, ev.resp[i.code], ctx);
      return item(i.code, i.name, i.num, n ? "na" : c.done ? "hecho" : "pend", n ? "" : c.done ? colorDe(c.score) : "", c.done && !n ? fmt(c.score) + " puntos" : ""); }).join("")}</div>`; }).join("");
  const unidades = todos.filter((i) => !aplica(i, ctx) && i.m.kind === "units"), recOk = unidades.length && unidades.every((i) => calcular(i, ev.resp[i.code], ctx).done);
  const recOkG = ev.sp === "ganso" && !!ev.rg && DESDE_RECORRIDO_G.filter((c) => !aplica(IND[c], ctx)).every((c) => calcular(IND[c], ev.resp[c], ctx).done);
  return `<div class="indice-cab"><div class="indice-tit"><b>${ev.sp === "pato" ? "Patos · numeral 6" : "Gansos · numeral 7"}</b><button type="button" class="btn-lista" id="verLista" aria-expanded="${!!abierta}" aria-controls="listaInd">${abierta ? "Ocultar lista" : "Ver lista"}</button></div>
      <small>${a.hechos} de ${a.ap} calificados · ${nPend ? `${nPend} pendiente${nPend > 1 ? "s" : ""}` : "ninguno pendiente"}</small>
      <div class="avance" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${a.pct}" aria-label="Avance de la evaluación"><i style="width:${a.pct}%"></i></div><b class="pct">${a.pct} %</b>
      <label class="chk-mini"><input type="checkbox" id="soloPend" ${leerPref("soloPend") ? "checked" : ""}> Ver solo pendientes</label></div>
    <div class="indice-lista ${abierta ? "abierta" : ""}" id="listaInd"><div class="grupo-ind">${item("apertura", "Apertura y muestreo", "5.5", ev.apertura && ev.apertura.atiende ? "hecho" : "pend", "var(--semilla)")}
      ${item("recorrido", "Recorrido por puntos (aves y recursos)", "5.6", (ev.sp === "pato" ? recOk : recOkG) ? "hecho" : "pend", "var(--cosecha)")}</div>${grupos}
      <div class="grupo-ind">${item("cierre", "Cierre y resultado", "5.5", ev.estado === "Finalizada" ? "hecho" : "pend", "var(--tierra)")}</div></div>
    <p class="leyenda-indice"><span>✓ calificado</span><span>○ pendiente</span><span>– no aplica</span></p>`;
}
/** Pie del indicador: anterior, guardado y cómo seguir (siguiente pendiente, siguiente en orden o cierre). */
function pieIndicadorHTML(ev, code, prev, next) {
  const sig = siguientePendiente(ev, code), hechoActual = (() => { const i = IND[code], ctx = contexto(ev); return !!aplica(i, ctx) || calcular(i, ev.resp[code], ctx).done; })();
  // botones sin numerales: el nombre completo queda como ayuda al pasar el cursor
  const t = (c) => `title="${IND[c].num} ${esc(IND[c].name)}"`;
  let prim, sec = "";
  if (sig && next && sig === next.code) prim = `<button class="btn btn-primario" data-go="${sig}" ${t(sig)}>Siguiente</button>`;
  else if (sig) { prim = `<button class="btn btn-primario" data-go="${sig}" ${t(sig)}>Siguiente pendiente</button>`; if (next) sec = `<button class="btn btn-sec" data-go="${next.code}" ${t(next.code)}>Siguiente</button>`; }
  else { prim = `<button class="btn btn-primario" data-go="cierre">${hechoActual ? "Todo calificado · Ir al cierre" : "Ir al cierre"}</button>`; if (next) sec = `<button class="btn btn-sec" data-go="${next.code}" ${t(next.code)}>Siguiente</button>`; }
  return `<button class="btn btn-sec" data-go="${prev ? prev.code : "apertura"}" ${prev ? t(prev.code) : ""}>${prev ? "Anterior" : "Apertura"}</button>
    <span class="guardado" id="guardado">${ev.guardado ? "💾 Guardado " + hora(new Date(ev.guardado)) : ""}</span><span class="pie-siguiente">${sec}${prim}</span>`;
}

/* ---- pantalla de un indicador ---- */
function vIndicador(ev, code) {
  const ind = IND[code]; if (!ind || ind.sp !== ev.sp) return vApertura(ev);
  const ctx = contexto(ev), na = aplica(ind, ctx), ed = SES.rol !== "productor" && ev.estado !== "Finalizada";
  const r = (ev.resp[code] = ev.resp[code] || {});
  const todos = lista(ev), k = todos.indexOf(ind), prev = todos[k - 1], next = todos[k + 1];
  const html = `<div class="eval"><nav class="panel indice ${leerPref("soloPend") ? "solo-pend" : ""}" aria-label="Indicadores de la norma" id="indice">${indiceEvalHTML(ev, code)}</nav>
    <article class="ficha"><header class="ficha-cab"><div><div class="num">${ind.num}</div><h2>${esc(ind.name)}</h2><p class="pregunta">${esc(ind.q)}</p></div>
      <button class="btn-ayuda no-imprimir" data-ayuda title="Pregunta, texto de la norma, método, cálculo, escala y notas de interpretación"><span class="q">?</span>Ficha del indicador</button></header>
      ${na ? `<div style="padding:24px"><div class="na-banda">No aplica en esta finca. ${esc(na)} Se excluye del promedio.${ed && code === "PR10" ? `<div style="margin-top:12px"><button type="button" class="btn btn-primario btn-chico" data-huevo="1">La finca produce huevo: evaluar el nidal</button></div>` : ""}</div></div>`
        : `<div class="ficha-cuerpo"><div id="captura"></div><div id="calculo"></div></div>${ed && code === "PR10" ? `<p class="nota-huevo">¿Se marcó por error? <button type="button" class="btn btn-fantasma btn-chico" data-huevo="0">La finca no produce huevo</button></p>` : ""}`}
      <footer class="pie-ficha" id="pie">${pieIndicadorHTML(ev, code, prev, next)}</footer></article></div>`;
  shell("fincas", migasEval(ev, `${ind.num} ${esc(ind.name)}`), html);
  const enlazarIr = (cont) => cont.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => { location.hash = `#/eval/${ev.id}/${b.dataset.go}`; }));
  const enlazarIndice = () => { const nav = raiz.querySelector("#indice"); enlazarIr(nav);
    const sp = nav.querySelector("#soloPend"); if (sp) sp.onchange = () => { guardarPref("soloPend", sp.checked); nav.classList.toggle("solo-pend", sp.checked); };
    const bl = nav.querySelector("#verLista"); if (bl) bl.onclick = () => { const ab = nav.querySelector("#listaInd").classList.toggle("abierta"); bl.setAttribute("aria-expanded", ab); bl.textContent = ab ? "Ocultar lista" : "Ver lista"; }; };
  enlazarIndice(); enlazarIr(raiz.querySelector("#pie"));
  raiz.querySelectorAll("[data-huevo]").forEach((b) => (b.onclick = () => { const h = b.dataset.huevo === "1"; marcarHuevo(ev, h);
    toast(h ? "Finca de huevo: se evalúa el nidal y la condición corporal usa la escala de huevo (Tabla 28)." : "Finca de carne: el nidal no aplica y la condición corporal usa la escala de carne (Tabla 27)."); vIndicador(ev, code); }));
  raiz.querySelector("[data-ayuda]").onclick = () => ayuda(code);
  const actual = raiz.querySelector('#indice [aria-current="true"]'); if (actual && actual.scrollIntoView && innerWidth > 1100) actual.scrollIntoView({ block: "nearest" });
  /* Refresca el índice y el pie con lo guardado (se llama después de cada cambio). */
  const pintaNav = () => { const nav = raiz.querySelector("#indice"), abierta = nav.querySelector("#listaInd").classList.contains("abierta"), top = nav.scrollTop;
    nav.innerHTML = indiceEvalHTML(ev, code, abierta); nav.scrollTop = top; enlazarIndice();
    const pie = raiz.querySelector("#pie"), g = pie.querySelector("#guardado").textContent; pie.innerHTML = pieIndicadorHTML(ev, code, prev, next); pie.querySelector("#guardado").textContent = g; enlazarIr(pie); };
  if (na) return;
  montarCaptura(ev, code, raiz, () => { const g = raiz.querySelector("#guardado"); if (g) g.textContent = "💾 Guardado " + hora(); pintaNav(); });
}

/** Captura y cálculo de un indicador dentro de un contenedor con #captura y #calculo: la pantalla del indicador
 *  o una ventana flotante (p. ej., jadeo y amontonamiento desde el recorrido). Cada cambio se guarda de inmediato. */
function montarCaptura(ev, code, cont, alGuardar) {
  const ind = IND[code], ctx = contexto(ev), ed = SES.rol !== "productor" && ev.estado !== "Finalizada";
  const r = (ev.resp[code] = ev.resp[code] || {});
  const cap = cont.querySelector("#captura"), calc = cont.querySelector("#calculo");
  const dis = ed ? "" : "disabled";
  const cambio = () => { if (ev.estado === "Programada") ev.estado = "En proceso"; ev.guardado = new Date().toISOString(); guardar(); pintaCalc(); if (alGuardar) alGuardar(); };
  const botonesEscala = (sel, auto) => `<div class="escala" style="--k:${Math.min(ind.escala.length, 4)}">${ind.escala.map(([p, t], j) =>
    `<button type="button" class="nivel ${auto ? "auto" : ""}" style="--c:${COL[p]}" data-n="${p}" data-j="${j}" aria-pressed="${sel === p && (auto || r.j == null || r.j === j)}" ${auto || !ed ? "tabindex='-1'" : ""}><span class="p">${p}</span>${esc(t)}</button>`).join("")}</div>`;
  const m = ind.m;
  let capHTML = "";
  if (m.kind === "auto" && porGalponAuto(ind, ctx)) {
    const val = (g, j) => (r.auxG ? r.auxG[g]?.[j] : r.aux?.[j]);
    const bloqueG = (g) => `<div class="bloque" style="border:1px solid var(--linea);border-radius:10px;padding:12px 14px"><h3>Galpón ${g + 1}</h3>
      ${m.aux.map(([l, t], j) => t === "num" ? `<div class="campo"><label for="ax${g}_${j}">${esc(l)}</label><input id="ax${g}_${j}" type="number" min="0" data-auxg="${g}:${j}" value="${esc(val(g, j) ?? "")}" ${dis}></div>`
        : `<label class="chk"><input type="checkbox" data-auxg="${g}:${j}" ${val(g, j) ? "checked" : ""} ${dis}>${esc(l)}</label>`).join("")}</div>`;
    capHTML = `<div class="bloque"><h3>Lo que se observa en cada galpón</h3><div class="rejilla r-2">${bloqueG(0)}${bloqueG(1)}</div>
      <p class="ayuda-campo">Con 2 galpones se califica cada uno y el indicador es el promedio. Si un galpón queda por debajo, el sistema muestra una alerta.</p></div>
      <div class="bloque"><h3>Calificación automática</h3><div id="esc-auto"></div></div>`;
  } else if (m.kind === "auto") {
    const nums = m.aux.map(([l, t], j) => (t === "num" ? `<div class="campo"><label for="ax${j}">${esc(l)}</label><input id="ax${j}" type="number" min="0" data-aux="${j}" value="${esc(r.aux?.[j] ?? "")}" ${dis}></div>` : "")).join("");
    const chks = m.aux.map(([l, t], j) => (t === "chk" ? `<label class="chk"><input type="checkbox" data-aux="${j}" ${r.aux?.[j] ? "checked" : ""} ${dis}>${esc(l)}</label>` : "")).join("");
    capHTML = `<div class="bloque"><h3>Lo que se observa</h3>${nums ? `<div class="fila">${nums}</div>` : ""}${chks}
      <p class="ayuda-campo">Marque lo que se cumple. La calificación se asigna sola con la escala de la norma.</p>
      ${ctx.plan.corrales >= 1 && ["PR01", "PR04", "PR08", "PR09", "PR12"].includes(code) ? `<p class="ayuda-campo" style="background:#FFF8E1;border:1px solid #EAD48A;border-radius:8px;padding:8px 10px">Este indicador califica el predio${ctx.plan.corrales === 2 ? " (los dos galpones)" : ""}. Si algún galpón o corral no cumple una condición, déjela sin marcar y escriba en la observación cuál falla (p. ej., «Galpón 2 sin rampas de acceso a las perchas»).</p>` : ""}</div>
      <div class="bloque"><h3>Calificación automática</h3><div id="esc-auto"></div></div>`;
  } else if (m.kind === "radio") {
    capHTML = `<div class="bloque"><h3>Lo que se encontró</h3>${m.opts.map(([t, p], j) => `<label class="chk"><input type="radio" name="op" value="${j}" ${r.opt === j ? "checked" : ""} ${dis}>${esc(t)}</label>`).join("")}</div>
      <div class="bloque"><h3>Calificación</h3><div id="esc-auto"></div></div>`;
  } else if (m.kind === "units" && esFlexPunto(ind, ctx)) {
    const pp = porPuntoDe(ind, r, ctx), nom = (p) => (ctx.plan.corrales === 2 ? `Galpón ${galponDePunto(ctx.plan, p) + 1} · P${(p % ctx.plan.puntosCorral) + 1}` : `Punto ${p + 1}`);
    const txt = (e, p) => !puntoListo(e) ? '<span class="muted">Pendiente</span>' : e.mismo != null ? `Es el mismo de ${nom(e.mismo).split(" · ").pop()}` : e.nohay ? '<b style="color:var(--rojo)">No hay en el galpón · 0</b>' : e.v.map((v) => `<b>${v}</b>`).join(" · ");
    capHTML = `<div class="bloque"><h3>Recurso más cercano a cada punto</h3><p class="ayuda-campo" style="margin-top:0">Se registra en el recorrido por puntos: el recurso más cercano a cada punto, aunque lo comparta con otro punto.</p>
      <div class="envoltura-tabla"><table class="tabla"><tbody>${Array.from({ length: ctx.plan.puntos }, (_, p) => `<tr><td>${nom(p)}</td><td>${txt(pp[p], p)}</td></tr>`).join("")}</tbody></table></div>
      ${ev.sp === "pato" ? `<a class="btn btn-primario" style="margin-top:10px" href="#/eval/${ev.id}/recorrido">Registrar en el recorrido por puntos</a>` : ""}</div>`;
  } else if (m.kind === "units" || m.kind === "cc") {
    const n = nUnidades(ind, ctx); r.units = (r.units || []).slice(0, n);
    capHTML = `<div class="bloque"><div class="contador-u"><span id="cu"></span><span class="muted" style="font-weight:600;font-size:13px">${esc(ctx.plan.texto.split(":")[0])}</span></div>
      <div class="unidades" id="unis"></div>
      <p class="ayuda-campo" style="margin-top:8px">${m.unit === "ave" || m.kind === "cc" ? `Muestra de ${n} aves según el plan de muestreo (${ctx.plan.corrales ? ctx.plan.corrales + " galpón(es), " : ""}${ctx.plan.puntos} punto(s)).` : m.unit === "bebedero" ? (ctx.tramo === "traspatio" ? `Traspatio: todos los bebederos del predio (${n}, dato de la apertura).` : `2 bebederos por punto × ${ctx.plan.puntos} puntos = ${n}.`) : m.unit === "comedero" ? (ctx.tramo === "traspatio" ? `Traspatio: todos los comederos del predio (${n}, dato de la apertura).` : `1 comedero por punto × ${ctx.plan.puntos} puntos = ${n}.`) : `Uno por punto de muestreo: ${n}.`}</p></div>
      <div class="bloque"><h3>${m.kind === "cc" ? "Condición corporal del ave (1 a 5, por palpación)" : "Calificación de la unidad"}</h3>
      ${m.kind === "cc" ? `<div class="escala" style="--k:5">${[1, 2, 3, 4, 5].map((s) => `<button type="button" class="nivel" style="--c:${COL[ccNivel(s, ctx.e.proposito)]}" data-cc="${s}"><span class="p">${s}</span>${ccNivel(s, ctx.e.proposito)} puntos</button>`).join("")}</div>
        <p class="muted" style="margin-top:8px">Escala de ${String(ctx.e.proposito).toLowerCase().includes("huevo") && !String(ctx.e.proposito).toLowerCase().includes("carne") ? "producción de huevo" : "producción de carne"}.</p>` : botonesEscala(null, false)}
      ${ed ? '<button class="btn btn-fantasma btn-chico" id="resto" style="margin-top:10px">Calificar las restantes con el último nivel</button>' : ""}</div>`;
  } else if (m.kind === "pct" && GALPON_PCT.includes(code) && ctx.plan.corrales === 2) {
    const gv = (g, k) => (Array.isArray(r.g) && r.g[g] ? r.g[g][k] ?? "" : "");
    capHTML = `<div class="bloque"><h3>Conteo en cada galpón</h3><p class="ayuda-campo" style="margin-top:0">Se observa desde afuera y desde el centro de cada galpón, antes de cualquier otra medición.</p>
      ${[0, 1].map((g) => `<div class="fila"><div class="campo"><label for="pt${g}">Galpón ${g + 1} · ${esc(m.total)}</label><input id="pt${g}" type="number" min="0" data-pg="${g}:total" value="${esc(gv(g, "total"))}" ${dis}></div>
        <div class="campo"><label for="pp${g}">Galpón ${g + 1} · ${esc(m.part)}</label><input id="pp${g}" type="number" min="0" data-pg="${g}:part" value="${esc(gv(g, "part"))}" ${dis}></div></div>`).join("")}
      <p class="ayuda-campo">El porcentaje de la finca suma los conteos de los dos galpones; cada galpón se muestra aparte y genera alerta si queda en un nivel más bajo.</p></div>
      <div class="bloque"><h3>Calificación automática</h3><div id="esc-auto"></div></div>`;
  } else if (m.kind === "pct" && ev.sp === "ganso" && DESDE_RECORRIDO_G.includes(code) && ev.rg && r.rg) {
    // gansos: el conteo sale del recorrido por puntos (se marca ganso por ganso)
    capHTML = `<div class="bloque"><h3>Conteo del recorrido por puntos</h3><div class="fila"><div class="campo"><label>${esc(m.total)}</label><input value="${esc(r.total ?? "—")}" disabled></div>
      <div class="campo"><label>${esc(m.part)}</label><input value="${esc(r.part ?? "—")}" disabled></div></div>
      ${m.extra ? `<label class="chk"><input type="checkbox" disabled ${r.extra ? "checked" : ""}>${esc(m.extra)}</label>` : ""}
      <p class="ayuda-campo">Se registra en el recorrido: ${code.startsWith("GR") ? "en cada punto, el recurso más cercano" : "ganso por ganso, solo lo que se encuentra"}.${m.extra && code !== "GA05" ? " La evidencia de tratamiento se marca al final del recorrido." : ""}</p>
      ${["GA01", "GA03"].includes(code) ? '<p class="ayuda-campo">Evidencia de tratamiento: se observa en el animal (p. ej., herida curada o pata tratada). Es una verificación visual; no se adjunta archivo.</p>' : ""}
      ${["GA04", "GA07"].includes(code) ? '<p class="ayuda-campo">Evidencia de tratamiento: se verifica con el documento, foto o video reciente que muestra el productor. Es una verificación visual; no se adjunta archivo.</p>' : ""}
      <a class="btn btn-sec" href="#/eval/${ev.id}/recorrido">Registrar en el recorrido por puntos</a></div>
      <div class="bloque"><h3>Calificación automática</h3><div id="esc-auto"></div></div>`;
  } else if (m.kind === "pct") {
    // gansos: «Gansos evaluados» es la muestra del plan (Tabla 3); viene escrita y avisa si se cambia
    const muestraG = ev.sp === "ganso" && /^Gansos evaluados/.test(m.total) ? ctx.plan.aves : null;
    if (muestraG && ed && (r.total == null || r.total === "")) r.total = muestraG;
    capHTML = `<div class="bloque"><h3>Conteo</h3><div class="fila"><div class="campo"><label for="pt">${esc(m.total)}</label><input id="pt" type="number" min="0" value="${esc(r.total ?? "")}" ${dis}>${muestraG ? `<span class="ayuda-campo">Muestra de esta finca: ${muestraG} gansos (Tabla 3).</span><span class="aviso-seg" id="avMuestra">${r.total !== "" && r.total != null && +r.total !== muestraG ? `La muestra de esta finca es de ${muestraG} gansos (Tabla 3). Verifique el número.` : ""}</span>` : ""}</div>
      <div class="campo"><label for="pp">${esc(m.part)}</label><input id="pp" type="number" min="0" value="${esc(r.part ?? "")}" ${dis}></div></div>
      ${m.extra ? `<label class="chk"><input type="checkbox" id="px" ${r.extra ? "checked" : ""} ${dis}>${esc(m.extra)}</label>` : ""}
      ${["GA01", "GA03"].includes(code) ? '<p class="ayuda-campo">Evidencia de tratamiento: se observa en el animal (p. ej., herida curada o pata tratada). Es una verificación visual; no se adjunta archivo.</p>' : ""}
      ${["GA04", "GA07"].includes(code) ? '<p class="ayuda-campo">Evidencia de tratamiento: se verifica con el documento, foto o video reciente que muestra el productor. Es una verificación visual; no se adjunta archivo.</p>' : ""}
      ${code === "PR03" ? '<p class="ayuda-campo">Si en el predio no hay bebederos, escriba 0 en «Bebederos inspeccionados»: la Tabla 7 da 0 puntos.</p>' : ""}</div>
      <div class="bloque"><h3>Calificación automática</h3><div id="esc-auto"></div></div>`;
  } else if (m.kind === "density") {
    const inv = ctx.e.inventario, avesD = inv.reduce((s, c) => s + (+c.n || 0), 0), pesoD = inv.length ? inv.reduce((s, c) => s + c.peso * c.n, 0) / Math.max(1, avesD) : 0;
    if (r.aves == null) { r.aves = ctx.nEsp || avesD; r.peso = Math.round(pesoD * 100) / 100; }  // patos de la finca (no la suma de patos y gansos)
    capHTML = `<div class="bloque"><h3>Datos del galpón o corral</h3><div class="fila"><div class="campo"><label for="d1">Número de aves</label><input id="d1" type="number" min="0" value="${esc(r.aves ?? "")}" ${dis}></div>
      <div class="campo"><label for="d2">Peso promedio (kg)</label><input id="d2" type="number" step="0.01" min="0" value="${esc(r.peso ?? "")}" ${dis}></div>
      <div class="campo"><label for="d3">Área útil (m²)</label><input id="d3" type="number" min="0" value="${esc(r.area ?? "")}" ${dis}></div></div></div>
      <div class="bloque"><h3>Calificación automática</h3><div id="esc-auto"></div></div>`;
  } else if (m.kind === "bpumv") {
    const c = r.checks || [];
    capHTML = `<div class="bloque"><h3>Buenas prácticas para el uso de medicamentos veterinarios</h3>${BPUMV.map((t, j) => `<label class="chk"><input type="checkbox" data-bp="${j}" ${c[j] ? "checked" : ""} ${dis}>${esc(t)}</label>`).join("")}
      <p class="ayuda-campo">Se verifica en los documentos y en la bodega de medicamentos.</p></div><div class="bloque"><h3>Calificación automática</h3><div id="esc-auto"></div></div>`;
  } else if (m.kind === "doc") {
    const req = [["legible", "Legible"], ["sinCorr", "Sin correcciones ni agregados"], ["firmado", "Firmado por el responsable"], ["contenido", "Tiene el contenido que pide la norma"]].concat(m.prof ? [["matricula", "Firmado por MV, MVZ o Z con matrícula COMVEZCOL vigente"]] : []);
    capHTML = `<div class="bloque"><h3>Documento</h3><p class="ayuda-campo" style="margin-top:0">El inspector revisa el documento que presenta el productor y marca lo que verifica; la calificación sale de esa verificación.</p>
      <div class="campo"><label for="dfile">Soporte (opcional)</label><input id="dfile" type="file" accept=".pdf,.jpg,.jpeg,.png" ${dis}><span class="ayuda-campo">${r.archivo ? "Archivo: " + esc(r.archivo) : "Solo si el productor entrega el documento después de la visita (plazo de 1 día hábil). PDF o imagen, hasta 20 MB."}</span></div>
      <div class="campo"><label>Estado</label><div>${["Válido", "No válido", "Pendiente", "No presentado"].map((t) => `<label class="chk" style="display:inline-flex;margin-right:14px"><input type="radio" name="est" value="${t}" ${r.estado === t ? "checked" : ""} ${dis}>${t}</label>`).join("")}</div></div>
      ${req.map(([k, t]) => `<label class="chk"><input type="checkbox" data-req="${k}" ${r[k] ? "checked" : ""} ${dis}>${esc(t)}</label>`).join("")}
      ${ctx.tramo === "comercial" ? "" : ""}<p class="ayuda-campo">Si el documento queda pendiente, el productor tiene 1 día hábil después del cierre para entregarlo.</p></div>
      <div class="bloque"><h3>Calificación automática</h3><div id="esc-auto"></div></div>`;
  }
  capHTML += `<div class="bloque"><h3>Observación del inspector</h3><div class="campo" style="margin:0"><textarea id="obs" maxlength="1000" placeholder="Describa lo observado. Es obligatoria si el indicador queda en 0 en las medidas del animal." ${dis}>${esc(ev.obs[code] || "")}</textarea></div>
    ${ind.g === "MBA" ? '<p class="ayuda-campo" style="margin-top:8px">Las medidas del animal se verifican por inspección visual de las aves (la norma no pide adjuntar fotos).</p>' : `<div class="campo" style="margin-top:10px"><label for="evi">Foto de apoyo (opcional)</label><input id="evi" type="file" accept="image/*,.pdf,video/mp4" ${dis}><div id="evi-prev" class="ayuda-campo">${(r.evid || []).map(esc).join(", ")}</div></div>`}</div>`;
  cap.innerHTML = capHTML;

  function pintaCalc() {
    const c = calcular(ind, r, ctx);
    const sc = c.score, col = sc == null ? "var(--linea)" : COL[sc >= 90 ? 100 : sc >= 50 ? 55 : sc >= 20 ? 20 : 0];
    let graf = "";
    if (m.kind === "units" || m.kind === "cc") {
      const lv = m.kind === "cc" ? [100, 55, 0] : ind.escala.map((x) => x[0]).filter((v, i, a) => a.indexOf(v) === i);
      graf = `<div class="barras">${lv.map((p) => barraH(`Nivel ${p}`, c.dist?.[p] || 0, Math.max(1, c.n), String(c.dist?.[p] || 0), COL[p])).join("")}</div><p class="muted" style="font-size:12px;margin-top:6px">${c.hechas || 0} de ${c.n} ${m.unit === "ave" ? "aves calificadas" : (/[aeiou]$/.test(m.unit) ? m.unit + "s" : m.unit + "es") + " calificados"}</p>`;
    } else if (m.kind === "pct") {
      graf = (c.pct != null ? `<div class="barras">${barraH(esc(m.part.split("(")[0]), c.pct, 100, fmt(c.pct) + " %", col)}</div>` : "") + bandaReglaSVG(ind);
    } else if (m.kind === "density") {
      graf = densidadSVG(c.dens != null ? +r.peso : null, c.dens);
    } else {
      /* Historial real: evaluaciones finalizadas de la misma finca y especie (antes eran valores fijos de ejemplo). */
      const prev = EVALS.filter((e) => e !== ev && e.finca === ev.finca && e.sp === ev.sp && e.estado === "Finalizada")
        .map((e) => [fecha(new Date(e.fecha + "T07:00")), calcular(ind, e.resp[code], contexto(e)).score]).filter((x) => x[1] != null);
      const h = prev.concat(sc != null ? [["Hoy", sc]] : []);
      graf = h.length > 1 ? columnas(h.map(([l, v]) => [l, v, COL[v >= 90 ? 100 : v >= 50 ? 55 : v >= 20 ? 20 : 0]]), 100)
        : `<p class="muted" style="font-size:13px">No hay evaluaciones finalizadas anteriores de esta finca para comparar este indicador.</p>`;
    }
    calc.innerHTML = `<div class="bloque"><h3>Cálculo</h3><div class="resultado-ind"><div class="dial" style="--v:${sc ?? 0};--c:${col}"><span>${sc == null ? "—" : fmt(sc)}</span></div>
      <div><div class="formula">${esc(ind.formula)}</div><p style="margin:8px 0 0"><b>${c.det ? esc(c.det) : "Diligencie los campos para calcular."}</b></p>
      ${sc != null ? `<p style="margin:6px 0 0" class="muted">Puntaje del indicador: <b>${fmt(sc)}</b> de 100</p>` : ""}</div></div>
      ${ev.anterior ? (() => { const ant = ev.anterior.scores[code]; const d = ant == null || sc == null ? null : sc - ant;
        return `<div class="aplica" style="margin-top:12px"><span>↻</span><span>Visita anterior (${esc(ev.anterior.id)}, ${fecha(new Date(ev.anterior.fecha + "T07:00"))}): <b>${ant == null ? "sin calificar" : fmt(ant) + " puntos"}</b>${d == null ? (ant == null && sc != null ? " · <b>completado en esta visita</b>" : "") : d > 0 ? ` · <b style="color:var(--campo)">sube ${fmt(d)}</b>` : d < 0 ? ` · <b style="color:var(--rojo)">baja ${fmt(-d)}</b>` : " · sin cambio"}</span></div>`; })() : ""}</div>
      ${c.porGalpon && ctx.plan.corrales === 2 ? `<div class="bloque"><h3>Por galpón</h3><div class="barras">${[0, 1].map((g) => { const v = c.porGalpon[g], al = esAlertaGalpon(v, sc);
        return barraH(`Galpón ${g + 1}${al ? " ⚠" : ""}`, v ?? 0, 100, v == null ? "—" : fmt(v) + (c.pctGalpon && c.pctGalpon[g] != null ? ` (${fmt(c.pctGalpon[g])} %)` : ""), v == null ? "var(--linea)" : COL[v >= 90 ? 100 : v >= 50 ? 55 : v >= 20 ? 20 : 0]); }).join("")}</div>
        ${c.porGalpon.some((v) => esAlertaGalpon(v, sc)) ? '<div class="aplica" style="background:#F8EDEC;color:var(--rojo);margin-top:8px"><span>⚠</span><span>Un galpón queda por debajo del puntaje de la finca: registre una observación (es obligatoria para cerrar) e inclúyalo en el plan de mejora.</span></div>' : ""}</div>` : ""}
      <div class="bloque"><h3>Gráfica</h3>${graf || '<p class="muted">Aparece cuando hay datos.</p>'}</div>
      ${sc === 0 && ind.g === "MBA" ? '<div class="aplica" style="background:#F8EDEC;color:var(--rojo)"><span>⚠</span><span>Hallazgo: el indicador quedó en 0. Registre una observación antes de cerrar.</span></div>' : ""}
      ${ind.cond && ind.cond !== "Siempre" ? `<div class="aplica"><span>ℹ</span><span>${esc(ind.cond)}</span></div>` : ""}`;
    const ea = cap.querySelector("#esc-auto"); if (ea) ea.innerHTML = botonesEscala(sc, true);
  }
  // eventos
  if (ed) {
    cap.querySelectorAll(".nivel:not(.auto)[data-n]").forEach((b) => (b.onclick = () => {
      const p = +b.dataset.n;
      if (m.kind === "direct") { r.level = p; r.j = +b.dataset.j; cap.querySelectorAll(".nivel[data-n]").forEach((x) => x.setAttribute("aria-pressed", x === b)); }
      if (m.kind === "units") { const i = r.cur ?? r.units.findIndex((x) => x == null); const idx = i < 0 ? r.units.length : i; if (idx < nUnidades(ind, ctx)) { r.units[idx] = p; r.last = p; r.cur = null; pintaUnis(); } }
      cambio();
    }));
    cap.querySelectorAll("[data-cc]").forEach((b) => (b.onclick = () => { const i = r.cur ?? r.units.findIndex((x) => x == null); const idx = i < 0 ? r.units.length : i; if (idx < nUnidades(ind, ctx)) { r.units[idx] = +b.dataset.cc; r.last = +b.dataset.cc; r.cur = null; pintaUnis(); cambio(); } }));
    const resto = cap.querySelector("#resto"); if (resto) resto.onclick = () => { const n = nUnidades(ind, ctx), v = r.last ?? (m.kind === "cc" ? 3 : 100); for (let i = 0; i < n; i++) if (r.units[i] == null) r.units[i] = v; pintaUnis(); cambio(); };
    cap.querySelectorAll("[data-auxg]").forEach((i) => (i.oninput = i.onchange = () => { const [g, j] = i.dataset.auxg.split(":").map(Number);
      r.auxG = r.auxG || [JSON.parse(JSON.stringify(r.aux || {})), JSON.parse(JSON.stringify(r.aux || {}))]; r.auxG[g][j] = i.type === "checkbox" ? i.checked : i.value; r.rev = true; cambio(); }));
    cap.querySelectorAll("[data-pg]").forEach((i) => (i.oninput = () => { const [g, k] = i.dataset.pg.split(":"); r.g = Array.isArray(r.g) ? r.g : [{}, {}]; r.g[+g][k] = i.value;
      const tot = r.g.reduce((a, x) => a + (+x.total || 0), 0), par = r.g.reduce((a, x) => a + (+x.part || 0), 0);
      const lleno = r.g.every((x) => x.total !== undefined && x.total !== "" && x.part !== undefined && x.part !== "");
      r.total = lleno ? tot : ""; r.part = lleno ? par : ""; cambio(); }));
    cap.querySelectorAll("[data-aux]").forEach((i) => (i.oninput = i.onchange = () => { r.aux = r.aux || {}; r.aux[i.dataset.aux] = i.type === "checkbox" ? i.checked : i.value; r.rev = true; cambio(); }));
    cap.querySelectorAll('input[name="op"]').forEach((i) => (i.onchange = () => { r.opt = +i.value; cambio(); }));
    ["pt", "pp"].forEach((id) => { const i = cap.querySelector("#" + id); if (i) i.oninput = () => { r[id === "pt" ? "total" : "part"] = i.value; cambio();
      const av = cap.querySelector("#avMuestra"); if (av && id === "pt") { const mu = contexto(ev).plan.aves; av.textContent = i.value !== "" && +i.value !== mu ? `La muestra de esta finca es de ${mu} gansos (Tabla 3). Verifique el número.` : ""; } }; });
    const px = cap.querySelector("#px"); if (px) px.onchange = () => { r.extra = px.checked; cambio(); };
    [["d1", "aves"], ["d2", "peso"], ["d3", "area"]].forEach(([id, k]) => { const i = cap.querySelector("#" + id); if (i) i.oninput = () => { r[k] = i.value; cambio(); }; });
    cap.querySelectorAll("[data-bp]").forEach((i) => (i.onchange = () => { r.checks = r.checks || []; r.checks[i.dataset.bp] = i.checked; r.revisado = true; cambio(); }));
    cap.querySelectorAll('input[name="est"]').forEach((i) => (i.onchange = () => { r.estado = i.value; cambio(); }));
    cap.querySelectorAll("[data-req]").forEach((i) => (i.onchange = () => { r[i.dataset.req] = i.checked; cambio(); }));
    const df = cap.querySelector("#dfile"); if (df) df.onchange = () => { if (df.files[0]) { if (df.files[0].size > 20e6) { toast("El archivo supera 20 MB."); df.value = ""; return; } r.archivo = df.files[0].name; cambio(); df.nextElementSibling.textContent = "Archivo: " + r.archivo; } };
    const ob = cap.querySelector("#obs"); ob.oninput = () => { ev.obs[code] = ob.value; cambio(); };
    const evi = cap.querySelector("#evi"); if (evi) evi.onchange = () => { const fl = evi.files[0]; if (!fl) return; if (fl.size > 50e6) { toast("El archivo supera el tamaño permitido."); return; }
      r.evid = (r.evid || []).concat(`${fl.name} · ${hora()}`); cap.querySelector("#evi-prev").textContent = r.evid.join(", "); log(`Evidencia en ${code}: ${fl.name}`); cambio(); };
  }
  function pintaUnis() {
    if (!(m.kind === "units" || m.kind === "cc") || (m.kind === "units" && esFlexPunto(ind, ctx))) return;
    const n = nUnidades(ind, ctx), cur = r.cur ?? r.units.findIndex((x) => x == null), idx = cur < 0 ? (r.units.length < n ? r.units.length : -1) : cur;
    cap.querySelector("#cu").textContent = idx >= 0 ? `${m.unit[0].toUpperCase() + m.unit.slice(1)} ${idx + 1} de ${n}` : `Las ${n} unidades están calificadas`;
    cap.querySelector("#unis").innerHTML = Array.from({ length: n }, (_, i) => { const v = r.units[i]; const lv = v == null ? null : m.kind === "cc" ? ccNivel(v, ctx.e.proposito) : v;
      return `<button type="button" class="unidad ${v != null ? "hecha" : ""} ${i === idx ? "actual" : ""}" style="--c:${lv == null ? "transparent" : COL[lv]}" data-u="${i}" title="${esc(lugarUnidad(ind, ctx, i))}" aria-label="${m.unit} ${i + 1} (${esc(lugarUnidad(ind, ctx, i))})${v != null ? ": " + v : ""}" ${dis}>${m.kind === "cc" && v != null ? v : i + 1}</button>`; }).join("");
    cap.querySelectorAll("[data-u]").forEach((b) => (b.onclick = () => { r.cur = +b.dataset.u; pintaUnis(); }));
  }
  pintaUnis(); pintaCalc();
}

/** Ubicación legible de una unidad de muestreo: «Galpón 1 · Punto 3 · Ave 2». */
function lugarUnidad(ind, ctx, i) {
  const plan = ctx.plan, gal = (pt) => (plan.corrales === 2 ? `Galpón ${galponDePunto(plan, pt) + 1} · Punto ${(pt % plan.puntosCorral) + 1}` : `Punto ${pt + 1}`);
  if (ind.m.src === "aves") { const u = ubicarAve(plan, i); return `${gal(u.punto)} · Ave ${u.ave + 1}`; }
  if (ind.m.src === "bebederos") return ctx.tramo === "traspatio" ? `Bebedero ${i + 1} del predio` : `${gal(Math.floor(i / 2))} · Bebedero ${(i % 2) + 1}`;
  if (ind.m.src === "comederos") return ctx.tramo === "traspatio" ? `Comedero ${i + 1} del predio` : gal(i);
  return gal(i);
}

/** Ventana flotante para calificar un indicador sin salir de la pantalla actual (p. ej., jadeo y amontonamiento desde el recorrido).
 *  Usa la misma captura y cálculo de la pantalla del indicador; lo registrado se guarda al instante. alCerrar refresca la pantalla de fondo. */
function abrirIndicadorFlotante(ev, code, alCerrar) {
  const ind = IND[code], ed = SES.rol !== "productor" && ev.estado !== "Finalizada";
  modal(`<div class="modal-cab"><div class="num-ind">${ind.num} · ${MEDIDA[ind.g]}</div><h3>${esc(ind.name)} ${btnFicha(code)}</h3><p class="pregunta">${esc(ind.q)}</p></div>
    <div class="modal-cuerpo"><div class="ficha-cuerpo ficha-flotante"><div id="captura"></div><div id="calculo"></div></div></div>
    <div class="acciones"><span class="guardado" id="guardadoF" style="margin-right:auto">${ev.guardado ? "💾 Guardado " + hora(new Date(ev.guardado)) : ""}</span><button class="btn btn-primario" data-ok>${ed ? "Guardar y volver" : "Cerrar"}</button></div>`, (c) => {
    c.querySelector(".modal > div").classList.add("modal-ancho");
    c.querySelector(".modal > div").setAttribute("aria-label", `${ind.num} ${ind.name}`);
    c.querySelector("[data-ok]").onclick = () => { cerrarCapas(); if (alCerrar) alCerrar(); };
    c.querySelector(".modal").addEventListener("click", (e) => { if (e.target.classList.contains("modal") && alCerrar) alCerrar(); });
    montarCaptura(ev, code, c.querySelector(".modal-cuerpo"), () => { const g = c.querySelector("#guardadoF"); if (g) g.textContent = "💾 Guardado " + hora(); });
  });
}
