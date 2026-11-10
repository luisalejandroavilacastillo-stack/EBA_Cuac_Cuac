/* EBA Patos y Gansos · ICA — js/vistas/recorrido.js
   Recorrido de campo por galpón, punto y ave (5.6, Ilustraciones 2 y 3).
   El inspector revisa en cada punto los recursos más cercanos y, ave por ave, todos los indicadores del animal.
   Lo registrado aquí se guarda en los mismos indicadores (6.1.2, 6.1.5, 6.1.7, 6.1.10 y 6.2.3 a 6.2.11), así que el cálculo no cambia. */
"use strict";

/* Textos cortos de cada nivel (resumen de la tabla de la norma) para los botones de campo. */
const CORTO = {
  PA03: { 100: "Ausente", 55: "Leve", 0: "Severo" },
  PA04: { 100: "Ausente", 55: "Leve, sin dolor", 0: "Severo, con dolor" },
  PA05: { 100: "Sin daño", 55: "Daño sin dolor", 0: "Daño con dolor" },
  PA06: { 100: "Sin lesión o ≤ 2 rasguños", 55: "Lesión 0,5–2 cm o ≥ 3 rasguños", 0: "Lesión ≥ 2 cm o prolapso" },
  PA07: { 100: "Homogéneo", 55: "Quebrado o sin brillo", 0: "Pérdida del manto" },
  PA08: { 100: "Sin descarga", 55: "Descarga nasal u ocular", 0: "Ambas o lesión" },
  PA09: { 100: "Sin lesión", 55: "Lesión sin dolor", 0: "Lesión con dolor" },
  PR02: { 100: "Suelta o granulosa", 55: "Ligeramente compacta", 0: "Muy compacta o con líquido" },
  PR05: { 100: "Con agua", 55: "Agua insuficiente o goteo", 0: "Sin agua" },
  PR07: { 100: "Altura adecuada, íntegro y limpio", 55: "Deteriorado, sucio o al sol", 0: "Altura insuficiente" },
  PR10: { 100: "Íntegro y con cama", 55: "Funcional, no ideal", 0: "No hay o en mal estado" }
};
const IND_AVE = ["PA03", "PA04", "PA05", "PA06", "PA07", "PA08", "PA09", "PA11"];
const IND_PUNTO = ["PR02", "PR05", "PR07", "PR10"];
const CC_TXT = { 1: "Delgado", 2: "Adecuada", 3: "Ideal", 4: "Musculoso", 5: "Sobrepeso" };

function vRecorrido(ev, pt, av) {
  const ctx = contexto(ev), plan = ctx.plan, ed = SES.rol !== "productor" && ev.estado !== "Finalizada";
  pt = Math.min(plan.puntos - 1, Math.max(0, +pt || 0)); av = Math.max(0, +av || 0);
  const nAves = plan.reparto[pt]; if (av >= nAves) av = Math.max(0, nAves - 1);
  try { history.replaceState(null, "", `#/eval/${ev.id}/recorrido/${pt}/${av}`); } catch (e) { }
  const aplicaInd = (c) => IND[c] && IND[c].sp === ev.sp && !aplica(IND[c], ctx);
  const indAve = IND_AVE.filter(aplicaInd).map((c) => IND[c]);
  const flex = PUNTO_FLEX.filter(aplicaInd).map((c) => IND[c]).filter((i) => esFlexPunto(i, ctx));          // cama, bebedero y nidal más cercanos
  const comedero = aplicaInd("PR07") && ctx.tramo !== "traspatio" ? IND.PR07 : null;                       // una vez por galpón
  const gal = galponDePunto(plan, pt), ptsGal = Array.from({ length: plan.puntos }, (_, p) => p).filter((p) => galponDePunto(plan, p) === gal);
  const resp = (code) => { const r = (ev.resp[code] = ev.resp[code] || {}); const n = nUnidades(IND[code], ctx); r.units = (r.units || []).slice(0, n); while (r.units.length < n) r.units.push(null); return r; };
  const valor = (code, i) => resp(code).units[i];
  const entrada = (code, p) => { const r = (ev.resp[code] = ev.resp[code] || {});
    if (!Array.isArray(r.porPunto)) r.porPunto = porPuntoDe(IND[code], r, ctx).slice();
    while (r.porPunto.length < plan.puntos) r.porPunto.push(null);
    if (p != null && !r.porPunto[p]) r.porPunto[p] = { v: [null], mismo: null, nohay: false };
    return p == null ? r.porPunto : r.porPunto[p]; };
  const idxAve = (k) => unidadesDePunto(IND.PA03, ctx, pt)[k];
  const puntoCompleto = (p) => indAve.every((i) => unidadesDePunto(i, ctx, p).every((u) => valor(i.code, u) != null))
    && flex.every((i) => puntoListo((ev.resp[i.code] && (ev.resp[i.code].porPunto || porPuntoDe(i, ev.resp[i.code], ctx)) || [])[p]))
    && (!comedero || valor("PR07", galponDePunto(plan, p)) != null);
  const aveCompleta = (k) => indAve.every((i) => valor(i.code, idxAve(k)) != null);
  /* Estado real de cada punto y ave (se calcula con lo guardado): pend = nada registrado · proceso = empezado · hecho = completo.
     El comedero no cuenta para «en proceso» porque se califica una vez por galpón y es compartido por sus puntos. */
  const porPuntoGuardado = (i) => (ev.resp[i.code] && (ev.resp[i.code].porPunto || porPuntoDe(i, ev.resp[i.code], ctx))) || [];
  const conDato = (p) => indAve.some((i) => unidadesDePunto(i, ctx, p).some((u) => valor(i.code, u) != null))
    || flex.some((i) => { const e = porPuntoGuardado(i)[p]; return !!e && (e.mismo != null || e.nohay || (e.v || []).some((x) => x != null)); });
  const estadoPunto = (p) => (puntoCompleto(p) ? "hecho" : conDato(p) ? "proceso" : "pend");
  const estadoAve = (k) => (aveCompleta(k) ? "hecho" : indAve.some((i) => valor(i.code, idxAve(k)) != null) ? "proceso" : "pend");
  const TXT_EST = { pend: "pendiente", proceso: "en proceso", hecho: "evaluado" };
  const nombrePunto = (p) => (plan.corrales === 2 ? `Galpón ${galponDePunto(plan, p) + 1} · Punto ${(p % plan.puntosCorral) + 1}` : plan.corrales === 1 ? `Corral · Punto ${p + 1}` : `Punto ${p + 1}`);
  const corto = (p) => `P${(plan.corrales === 2 ? p % plan.puntosCorral : p) + 1}`;
  const hechos = Array.from({ length: plan.puntos }, (_, p) => puntoCompleto(p)).filter(Boolean).length;
  const dis = ed ? "" : "disabled";
  const chips = Array.from({ length: plan.puntos }, (_, p) => `${plan.corrales === 2 && p % plan.puntosCorral === 0 ? `<span class="muted" style="font-size:12px;font-weight:800;width:100%;margin-top:${p ? 6 : 0}px">Galpón ${galponDePunto(plan, p) + 1}</span>` : ""}
    <button class="chip-punto est-${estadoPunto(p)} ${p === pt ? "actual" : ""}" data-pt="${p}" title="${nombrePunto(p)}: ${TXT_EST[estadoPunto(p)]}" ${p === pt ? 'aria-current="true"' : ""}>${estadoPunto(p) === "hecho" ? "✓ " : ""}${corto(p)}<small>${plan.reparto[p]} aves</small><span class="sr"> · ${TXT_EST[estadoPunto(p)]}</span></button>`).join("");
  const leyenda = `<p class="leyenda-puntos"><span><i class="lp est-pend"></i>Pendiente</span><span><i class="lp est-proceso"></i>En proceso</span><span><i class="lp est-hecho"></i>Evaluado</span><span><i class="lp actual"></i>Punto actual</span></p>`;
  const previos = ["PA01", "PA02"].filter(aplicaInd).map((c) => IND[c]).map((i) => { const c = calcular(i, ev.resp[i.code], ctx);
    return `<button type="button" class="btn btn-sec btn-chico" data-flot="${i.code}" title="${i.num} ${esc(i.name)}">${c.done ? "✓ " : ""}${esc(i.name)}${c.done ? ` · ${fmt(c.score)}` : ""}</button>`; }).join(" ");
  const opc = (code) => (code === "PA11" ? [1, 2, 3, 4, 5].map((s) => [s, `${CC_TXT[s]} · ${ccNivel(s, ctx.e.proposito)} pts`]) : IND[code].escala.map(([p]) => [p, CORTO[code]?.[p] || ""]).filter((x, k, a) => a.findIndex((y) => y[0] === x[0]) === k));
  const botones = (attr, actual, code) => `<div class="niveles-campo">${opc(code).map(([v, t]) => `<button type="button" class="nv ${actual === v ? "sel" : ""}" style="--c:${COL[code === "PA11" ? ccNivel(v, ctx.e.proposito) : v]}" ${attr(v)} ${dis}><b>${v}</b><span>${esc(t)}</span></button>`).join("")}</div>`;
  const filaNiveles = (code, i) => botones((v) => `data-set="${code}:${i}:${v}"`, valor(code, i), code);
  // recursos más cercanos al punto
  const unidadTxt = { PR02: "Puñado de cama", PR05: "Bebedero", PR10: "Nidal" };
  const recursos = flex.map((i) => { const e = entrada(i.code, pt), code = i.code, compartible = code !== "PR02";
    const anteriores = ptsGal.filter((p) => p < pt && (() => { const x = entrada(code)[p]; return x && x.mismo == null && !x.nohay; })());
    let cuerpo;
    if (e.mismo != null) cuerpo = `<p style="margin:0">Es el mismo ${unidadTxt[code].toLowerCase()} del <b>${corto(e.mismo)}</b>: no se vuelve a contar. ${ed ? `<button class="btn btn-fantasma btn-chico" data-undo="${code}">Cambiar</button>` : ""}</p>`;
    else if (e.nohay) cuerpo = `<p style="margin:0;color:var(--rojo)"><b>No hay ${code === "PR05" ? "bebederos" : "nidales"} en este galpón</b>: cuenta 0 puntos. ${ed ? `<button class="btn btn-fantasma btn-chico" data-undo="${code}">Deshacer</button>` : ""}</p>`;
    else cuerpo = e.v.map((v, k) => `<div style="display:grid;grid-template-columns:${e.v.length > 1 ? "90px " : ""}minmax(0,1fr) ${k > 0 && ed ? "auto" : ""};gap:8px;align-items:center;margin-bottom:6px">${e.v.length > 1 ? `<span class="muted" style="font-size:12px">${unidadTxt[code]} ${k + 1}</span>` : ""}
        ${botones((x) => `data-flex="${code}:${k}:${x}"`, v, code)}${k > 0 && ed ? `<button class="btn btn-fantasma btn-chico" data-del="${code}:${k}" title="Quitar">✕</button>` : ""}</div>`).join("");
    const herramientas = ed ? `<div class="herr-recurso">
        ${e.mismo == null && !e.nohay && code === "PR05" && e.v.length < MAX_POR_PUNTO.PR05 ? `<button class="btn btn-fantasma btn-chico" data-add="${code}">+ Otro bebedero cercano</button>` : ""}
        ${e.mismo == null && !e.nohay && e.v.every((x) => x != null) && ptsGal.length > 1 ? `<button class="btn btn-fantasma btn-chico" data-igual="${code}">Igual en todo el galpón</button>` : ""}
        ${compartible && e.mismo == null && !e.nohay && anteriores.length ? `<label class="muted" style="font-size:12px">Es el mismo del <select data-mismo="${code}"><option value="">—</option>${anteriores.map((p) => `<option value="${p}">${corto(p)}</option>`).join("")}</select></label>` : ""}
        ${compartible && e.mismo == null && !e.nohay ? `<button class="btn btn-fantasma btn-chico" data-nohay="${code}">No hay en este galpón</button>` : ""}</div>` : "";
    return `<div class="fila-campo"><div><b>${i.num} ${esc(i.name)}</b> ${btnFicha(i.code)}<br><span class="muted" style="font-size:12px">El más cercano al punto</span></div><div>${cuerpo}${herramientas}</div></div>`; }).join("")
    + (comedero ? `<div class="fila-campo"><div><b>6.1.7 Calidad de los comederos</b> ${btnFicha("PR07")}<br><span class="muted" style="font-size:12px">Una vez por ${plan.corrales === 2 ? `galpón (galpón ${gal + 1})` : "galpón o corral"}</span></div>${filaNiveles("PR07", gal)}</div>` : "");
  const chipAve = (k, actual) => `<button type="button" class="chip-punto est-${estadoAve(k)} ${k === actual ? "actual" : ""}" data-av="${k}" title="Ave ${k + 1}: ${TXT_EST[estadoAve(k)]}" ${k === actual ? 'aria-current="true"' : ""}>${estadoAve(k) === "hecho" ? "✓ " : ""}Ave ${k + 1}<span class="sr"> · ${TXT_EST[estadoAve(k)]}</span></button>`;
  const estAves = Array.from({ length: nAves }, (_, k) => estadoAve(k));
  const avesHechas = estAves.filter((e) => e === "hecho").length, avesMedias = estAves.filter((e) => e === "proceso").length;
  /** Indicadores del animal calificados en el ave k del punto. */
  const avanceAve = (k) => ({ hechos: indAve.filter((i) => valor(i.code, idxAve(k)) != null).length, total: indAve.length });
  const tarjetaAve = (k) => { const e = estadoAve(k), a = avanceAve(k), pct = Math.round((a.hechos / Math.max(1, a.total)) * 100);
    return `<button type="button" class="tarjeta-ave est-${e}" data-av="${k}" aria-label="Ave ${k + 1}: ${e === "hecho" ? "completa" : e === "proceso" ? `${a.hechos} de ${a.total} indicadores` : "sin empezar"}">
      <b>${e === "hecho" ? "✓ " : ""}Ave ${k + 1}</b><span>${e === "hecho" ? "Completa" : e === "proceso" ? `${a.hechos} de ${a.total}` : "Sin empezar"}</span><i class="barra-ave"><i style="width:${pct}%"></i></i></button>`; };
  const sigAve = estAves.findIndex((e) => e !== "hecho");
  const textoAves = !ed ? "Ver aves del punto" : sigAve < 0 ? "Revisar aves del punto" : estAves[sigAve] === "proceso" ? `Continuar con el Ave ${sigAve + 1}` : `Evaluar el Ave ${sigAve + 1}`;
  const recursosListos = flex.every((i) => puntoListo(porPuntoGuardado(i)[pt])) && (!comedero || valor("PR07", gal) != null);
  // hallazgos en 0 del punto que necesitan observación (recursos en la pantalla; aves en su ventana)
  const enCero = (i) => { if (flex.includes(i)) { const e = entrada(i.code)[pt]; return !!e && (e.nohay || (e.mismo == null && e.v.includes(0))); }
    if (i.code === "PR07") return valor("PR07", gal) === 0;
    return unidadesDePunto(i, ctx, pt).some((u) => (i.code === "PA11" ? valor(i.code, u) != null && ccNivel(valor(i.code, u), ctx.e.proposito) === 0 : valor(i.code, u) === 0)); };
  const obsDe = (lst) => lst.map((i) => `<div class="campo"><label for="ob_${i.code}">${i.num} ${esc(i.name)}</label><textarea id="ob_${i.code}" data-obs="${i.code}" rows="2" ${dis}>${esc(ev.obs[i.code] || "")}</textarea></div>`).join("");
  const cerosRec = flex.concat(comedero ? [comedero] : []).filter(enCero);
  const obsHTML = cerosRec.length ? `<section class="panel" style="border-left:5px solid var(--rojo)"><h3>Hallazgos en 0 en los recursos del punto</h3><p class="muted">Describa lo observado (queda en la observación del indicador).</p>${obsDe(cerosRec)}</section>` : "";
  const ultimoPunto = pt === plan.puntos - 1;

  shell("fincas", migasEval(ev, "Recorrido por puntos"), `<div class="encabezado"><div><h1>Recorrido por puntos</h1>
      <p>${esc(ctx.f.nombre)} · ${nombreVisita(ev)} · ${plan.corrales ? `${plan.corrales} galpón(es) × ${plan.puntosCorral} puntos` : `${plan.puntos} punto(s) sin corral`} · ${plan.aves} aves (${plan.avesPunto} por punto) · ${hechos} de ${plan.puntos} puntos completos</p></div>
      <a class="btn btn-sec" id="irLista" href="${destinoLista(ev)}">Listado por indicador</a></div>
    ${previos ? `<section class="panel"><h3>1 · Al llegar, antes de manipular las aves</h3><p class="muted" style="margin:0 0 8px">La norma pide observar jadeo y amontonamiento desde afuera y desde el centro${plan.corrales === 2 ? " de cada galpón" : ""}, antes de cualquier otra medición.</p>${previos}</section>` : ""}
    <div class="recorrido"><section class="panel"><h3>2 · Puntos de muestreo</h3>${muestreoSVG(plan, pt, Array.from({ length: plan.puntos }, (_, p) => estadoPunto(p)))}<div class="chips">${chips}</div>${leyenda}</section>
    <div><section class="panel"><h2 style="margin:0">${nombrePunto(pt)}</h2>
      ${recursos ? `<h3 class="paso-punto"><span class="paso-n">1</span>Recursos más cercanos al punto (Ilustración 3)</h3><p class="muted" style="margin:0 0 6px;font-size:13px">Se califica el recurso que esté más cerca, aunque lo comparta con otro punto.</p>${recursos}` : ""}
      ${ctx.tramo === "traspatio" && aplicaInd("PR05") ? '<p class="muted" style="margin-top:10px">En traspatio los bebederos y comederos se califican todos en su propia pantalla (6.1.5 y 6.1.7).</p>' : ""}
      <h3 class="paso-punto"><span class="paso-n">${recursos ? 2 : 1}</span>Aves del punto <span class="resumen-aves">${avesHechas} de ${nAves} completas${avesMedias ? ` · ${avesMedias} a medias` : ""}</span></h3>
      ${nAves ? `<div class="tarjetas-aves" id="avesPunto">${Array.from({ length: nAves }, (_, k) => tarjetaAve(k)).join("")}</div>
        <div class="evaluar-aves"><button type="button" class="btn ${sigAve >= 0 && ed ? "btn-primario" : "btn-sec"}" id="evalAves">${textoAves}${sigAve >= 0 && ed ? " →" : ""}</button></div>` : '<p class="muted">Este punto no tiene aves asignadas (la especie tiene menos aves que la muestra).</p>'}
      <div class="acciones" style="justify-content:space-between;margin-top:18px"><button class="btn btn-sec" id="prev" ${pt === 0 ? "disabled" : ""}>${pt === 0 ? "Punto anterior" : `Punto anterior: ${nombrePunto(pt - 1)}`}</button>
        <button class="btn btn-primario" id="next">${!ultimoPunto ? `Siguiente punto: ${nombrePunto(pt + 1)}` : "Continuar con la evaluación por indicador"}</button></div></section>
      ${obsHTML}</div></div>`);
  const ir = (p, a) => vRecorrido(ev, p, a);
  const cambio = () => { if (ev.estado === "Programada") ev.estado = "En proceso"; ev.guardado = new Date().toISOString(); guardar(); };
  raiz.querySelectorAll("[data-pt]").forEach((b) => (b.onclick = () => ir(+b.dataset.pt, 0)));
  raiz.querySelector("#prev").onclick = () => ir(pt - 1, 0);
  raiz.querySelector("#next").onclick = () => (!ultimoPunto ? ir(pt + 1, 0) : (location.hash = destinoLista(ev)));
  // jadeo y amontonamiento: se califican en una ventana flotante sin salir del recorrido
  raiz.querySelectorAll("[data-flot]").forEach((b) => (b.onclick = () => abrirIndicadorFlotante(ev, b.dataset.flot, () => ir(pt, av))));

  /* Aves del punto en una ventana flotante: pestañas por ave, los indicadores del animal, «sin hallazgos» y observaciones.
     Todo se guarda al instante; al cerrar se vuelve al mismo punto con los colores actualizados. */
  const estAvesAhora = () => Array.from({ length: nAves }, (_, k) => estadoAve(k));
  const abrirAves = (k0) => {
    let k = Math.min(Math.max(0, k0), nAves - 1);
    modal(`<div class="modal-cab"><div class="cab-aves"><div><small class="muted">${nombrePunto(pt)}</small><h3 id="avTit"></h3><p id="avInfo" class="info-ave"></p></div><button type="button" class="btn btn-sec btn-chico" id="avCerrar">Cerrar</button></div><div class="chips" id="avTabs"></div></div>
      <div class="modal-cuerpo" id="avCuerpo"></div><div class="acciones" id="avPie"></div>`, (c) => {
      c.querySelector(".modal > div").classList.add("modal-ancho", "modal-aves");
      c.querySelector(".modal > div").setAttribute("aria-label", `Aves de ${nombrePunto(pt)}`);
      const volver = () => { cerrarCapas(); ir(pt, k); };
      c.querySelector("#avCerrar").onclick = volver;
      c.querySelector(".modal").addEventListener("click", (e) => { if (e.target.classList.contains("modal")) ir(pt, k); });
      const pinta = (arriba) => {
        const cuerpo = c.querySelector("#avCuerpo"), top = cuerpo.scrollTop, iA = idxAve(k), ultima = k >= nAves - 1;
        const cerosAve = indAve.filter(enCero);
        const a = avanceAve(k);
        c.querySelector("#avTit").textContent = `Ave ${k + 1} de ${nAves}`;
        c.querySelector("#avInfo").innerHTML = a.hechos === a.total ? `<b class="ok">✓ Completa</b> · ${a.total} de ${a.total} indicadores calificados` : `<b>${a.hechos} de ${a.total}</b> indicadores calificados · faltan ${a.total - a.hechos} (marcados en la lista)`;
        c.querySelector("#avTabs").innerHTML = Array.from({ length: nAves }, (_, j) => chipAve(j, k)).join("");
        cuerpo.innerHTML = `${ed ? `<div class="sin-hallazgos"><button class="btn btn-primario" id="sinHallazgos">✓ Ave ${k + 1} sin hallazgos</button> <span class="muted texto-chico">Marca todo en 100 y condición corporal 3; luego cambie solo lo anormal.</span></div>` : ""}
          ${indAve.map((i) => { const falta = valor(i.code, iA) == null; return `<div class="fila-campo ${falta ? "fila-falta" : ""}"><div><b>${i.num} ${esc(i.name)}</b> ${btnFicha(i.code)}${falta ? ' <span class="etiqueta-falta">Falta</span>' : ""}</div>${filaNiveles(i.code, iA)}</div>`; }).join("")}
          ${cerosAve.length ? `<div class="obs-aves"><h4>Hallazgos en 0 en las aves de este punto</h4><p class="muted texto-chico">Describa lo observado (queda en la observación del indicador).</p>${obsDe(cerosAve)}</div>` : ""}`;
        c.querySelector("#avPie").innerHTML = `<span class="guardado" style="margin-right:auto">${ev.guardado ? "💾 Guardado " + hora(new Date(ev.guardado)) : ""}</span>
          <button class="btn btn-sec" id="avPrev" ${k === 0 ? "disabled" : ""}>Ave anterior</button>
          ${ultima ? (puntoCompleto(pt) ? `<button class="btn btn-primario" id="avFin" data-sig="1">${ultimoPunto ? "Recorrido completo · Continuar con la evaluación por indicador" : "Punto completo · Ir al siguiente punto →"}</button>`
            : `<button class="btn btn-primario" id="avFin">Volver al punto${ed && avanceAve(k).hechos === indAve.length && estAvesAhora().every((e) => e === "hecho") ? " (faltan recursos)" : ""}</button>`) : `<button class="btn btn-primario" id="avNext">Siguiente ave: ${k + 2} →</button>`}`;
        cuerpo.scrollTop = arriba ? 0 : top;
        c.querySelectorAll("#avTabs [data-av]").forEach((b) => (b.onclick = () => { k = +b.dataset.av; pinta(true); }));
        c.querySelector("#avPrev").onclick = () => { k--; pinta(true); };
        const nx = c.querySelector("#avNext"); if (nx) nx.onclick = () => { k++; pinta(true); };
        const fin = c.querySelector("#avFin"); if (fin) fin.onclick = () => { if (!fin.dataset.sig) return volver(); cerrarCapas(); if (ultimoPunto) location.hash = destinoLista(ev); else ir(pt + 1, 0); };
        if (!ed) return;
        c.querySelectorAll("#avCuerpo [data-set]").forEach((b) => (b.onclick = () => { const [code, i, v] = b.dataset.set.split(":"); resp(code).units[+i] = +v; cambio(); pinta(false); }));
        c.querySelector("#sinHallazgos").onclick = () => { indAve.forEach((i) => { resp(i.code).units[iA] = i.code === "PA11" ? 3 : 100; }); cambio(); if (!ultima) k++; pinta(true); };
        c.querySelectorAll("#avCuerpo [data-obs]").forEach((t) => (t.oninput = () => { ev.obs[t.dataset.obs] = t.value; cambio(); }));
      };
      pinta(true);
    });
  };
  const ea = raiz.querySelector("#evalAves");
  if (ea) ea.onclick = () => abrirAves(Math.max(0, sigAve));
  raiz.querySelectorAll("#avesPunto [data-av]").forEach((b) => (b.onclick = () => abrirAves(+b.dataset.av)));
  if (!ed) return;
  const listo = () => { cambio(); ir(pt, av); };
  raiz.querySelectorAll("[data-set]").forEach((b) => (b.onclick = () => { const [code, i, v] = b.dataset.set.split(":"); resp(code).units[+i] = +v; listo(); }));
  raiz.querySelectorAll("[data-flex]").forEach((b) => (b.onclick = () => { const [code, k, v] = b.dataset.flex.split(":"); const e = entrada(code, pt); e.v[+k] = +v; e.mismo = null; e.nohay = false; listo(); }));
  raiz.querySelectorAll("[data-add]").forEach((b) => (b.onclick = () => { entrada(b.dataset.add, pt).v.push(null); listo(); }));
  raiz.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => { const [code, k] = b.dataset.del.split(":"); entrada(code, pt).v.splice(+k, 1); listo(); }));
  raiz.querySelectorAll("[data-undo]").forEach((b) => (b.onclick = () => { const pp = entrada(b.dataset.undo); pp[pt] = { v: [null], mismo: null, nohay: false }; listo(); }));
  raiz.querySelectorAll("[data-mismo]").forEach((sl) => (sl.onchange = () => { if (sl.value === "") return; const e = entrada(sl.dataset.mismo, pt); e.mismo = +sl.value; e.nohay = false; listo(); }));
  raiz.querySelectorAll("[data-nohay]").forEach((b) => (b.onclick = () => { const pp = entrada(b.dataset.nohay); ptsGal.forEach((p) => (pp[p] = { v: [], mismo: null, nohay: true })); listo(); }));
  raiz.querySelectorAll("[data-igual]").forEach((b) => (b.onclick = () => { const code = b.dataset.igual, pp = entrada(code), e = pp[pt];
    ptsGal.forEach((p) => { if (p !== pt) pp[p] = { v: e.v.slice(), mismo: null, nohay: false }; }); toast(`Se copió a los ${ptsGal.length} puntos del galpón; cambie solo el que sea distinto.`); listo(); }));
  raiz.querySelectorAll("[data-obs]").forEach((t) => (t.oninput = () => { ev.obs[t.dataset.obs] = t.value; cambio(); }));
}

