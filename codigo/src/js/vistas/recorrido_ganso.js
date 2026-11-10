/* EBA Patos y Gansos · ICA — js/vistas/recorrido_ganso.js
   Recorrido de campo de gansos por galpón, punto y ganso, con la misma muestra que patos (5.6, Tabla 3, Ilustraciones 2 y 3).
   En patos la norma califica cada ave; en gansos califica el porcentaje de la muestra con cada novedad (numeral 7).
   Por eso aquí el inspector marca, ganso por ganso, solo lo que encuentra; el sistema cuenta y llena los indicadores
   (evaluados y con novedad), así que el cálculo de las tablas no cambia. */
"use strict";

/* Novedades que se marcan en cada ganso de la muestra (indicadores «con muestreo» del numeral 7.2). */
const NOV_GANSO = [
  { code: "GA01", txt: "Herida grave (más de 5 cm)" },
  { code: "GA02", txt: "Plumaje inadecuado" },
  { code: "GA03", txt: "Podo dermatitis" },
  { code: "GA04", txt: "Diarrea" },
  { code: "GA05", txt: "Lesión en el pico", opc: [["f", "conserva la función"], ["s", "sin funcionalidad completa"]] },
  { code: "GA07", txt: "Secreción ocular o conjuntivitis" },
  { code: "GA06", txt: "Cojera (sin dudas sobre su condición)" },
];
/* Agresiones (7.2.8), interacción con el humano (7.2.9) y comportamientos positivos (7.2.10) se evalúan en la lista
   de indicadores, no en el recorrido. */
/* Indicadores que se llenan desde el recorrido de gansos. */
const DESDE_RECORRIDO_G = ["GR02", "GR03", "GR04", "GR05", "GA01", "GA02", "GA03", "GA04", "GA05", "GA06", "GA07"];
/* Tratamiento: la tabla lo pide cuando hay gansos con la novedad. */
const TRAT_GANSO = { GA01: "heridas", GA03: "podo dermatitis", GA04: "diarrea", GA07: "secreciones o conjuntivitis" };

/** Datos del recorrido de gansos de la visita. */
function rgDe(ev) {
  ev.rg = ev.rg || { aves: {}, pts: {}, gal: {}, trat: {} };
  ["aves", "pts", "gal", "trat"].forEach((k) => (ev.rg[k] = ev.rg[k] || {}));
  return ev.rg;
}
/** Pasa lo registrado en el recorrido a los indicadores (evaluados / con novedad, por finca y por galpón). */
function derivarGansos(ev) {
  if (!ev.rg) return;
  const ctx = contexto(ev), plan = ctx.plan, rg = ev.rg, dosG = plan.corrales === 2;
  const gDe = (p) => galponDePunto(plan, p);
  const aves = [];   // { g, m }
  Object.entries(rg.aves).forEach(([p, lst]) => (lst || []).forEach((a) => { if (a && a.ok) aves.push({ g: gDe(+p), m: a.m || {} }); }));
  const conteo = (fn, filtro) => { const t = [0, 0], c = [0, 0]; aves.forEach((a) => { if (filtro && !filtro(a)) return; t[a.g]++; if (fn(a.m)) c[a.g]++; }); return { t, c }; };
  const pon = (code, t, c, extra) => {
    const r = (ev.resp[code] = ev.resp[code] || {}), tot = t[0] + t[1];
    if (!tot) { if (r.rg) { delete r.total; delete r.part; delete r.g; } return; }   // no borra lo que se escribió a mano
    r.total = tot; r.part = c[0] + c[1]; r.rg = true;
    if (extra !== undefined) r.extra = extra;
    if (dosG) r.g = [0, 1].map((g) => (t[g] ? { total: t[g], part: c[g] } : null)); else delete r.g;
  };
  NOV_GANSO.forEach((n) => {
    if (n.code === "GA02") { const k = conteo((m) => !m.GA02); pon("GA02", k.t, k.c); return; }   // la tabla cuenta los de plumaje adecuado
    const k = conteo((m) => !!m[n.code]);
    if (n.code === "GA05") { pon("GA05", k.t, k.c, !aves.some((a) => a.m.GA05 === "s")); return; }  // conservan la funcionalidad
    pon(n.code, k.t, k.c, TRAT_GANSO[n.code] ? !!rg.trat[n.code] : undefined);
  });
  // recursos: comedero y bebedero más cercanos a cada punto; acceso al agua de los gansos del punto; riesgo por galpón
  const porPunto = (campo, positivo, peso) => { const t = [0, 0], c = [0, 0];
    Object.entries(rg.pts).forEach(([p, x]) => { if (!x || x[campo] == null) return; const g = gDe(+p), w = peso ? plan.reparto[+p] : 1; t[g] += w; if (x[campo] === positivo) c[g] += w; });
    return { t, c }; };
  let k = porPunto("agua", true, true); pon("GR02", k.t, k.c);
  k = porPunto("com", true); pon("GR03", k.t, k.c);
  k = porPunto("beb", true); pon("GR04", k.t, k.c);
  const tg = [0, 0], cg = [0, 0]; Object.entries(rg.gal).forEach(([g, v]) => { if (v == null) return; tg[+g]++; if (v) cg[+g]++; });
  pon("GR05", tg, cg);
}

function vRecorridoGanso(ev, pt) {
  const ctx = contexto(ev), plan = ctx.plan, ed = SES.rol !== "productor" && ev.estado !== "Finalizada", rg = rgDe(ev);
  pt = Math.min(plan.puntos - 1, Math.max(0, +pt || 0));
  try { history.replaceState(null, "", `#/eval/${ev.id}/recorrido/${pt}`); } catch (e) { }
  const aplicaInd = (c) => IND[c] && !aplica(IND[c], ctx);
  const nAves = (p) => plan.reparto[p] || 0;
  const avesDe = (p) => { const l = (rg.aves[p] = rg.aves[p] || []); while (l.length < nAves(p)) l.push({ m: {}, ok: false }); return l; };
  const ptD = (p) => (rg.pts[p] = rg.pts[p] || { agua: null, com: null, beb: null });
  const gal = galponDePunto(plan, pt), primeroDelGalpon = pt === 0 || galponDePunto(plan, pt - 1) !== gal;
  const recursosListos = (p) => { const x = rg.pts[p] || {}; return x.agua != null && x.com != null && x.beb != null; };
  const galListo = (g) => rg.gal[g] != null;
  const avesListas = (p) => avesDe(p).every((a) => a.ok);
  const estadoPunto = (p) => { const algo = avesDe(p).some((a) => a.ok || Object.keys(a.m || {}).length) || Object.values(rg.pts[p] || {}).some((v) => v != null);
    return recursosListos(p) && avesListas(p) && galListo(galponDePunto(plan, p)) ? "hecho" : algo ? "proceso" : "pend"; };
  const nombrePunto = (p) => (plan.corrales === 2 ? `Galpón ${galponDePunto(plan, p) + 1} · Punto ${(p % plan.puntosCorral) + 1}` : plan.corrales === 1 ? `Corral · Punto ${p + 1}` : `Punto ${p + 1}`);
  const corto = (p) => `P${(plan.corrales === 2 ? p % plan.puntosCorral : p) + 1}`;
  const TXT_EST = { pend: "pendiente", proceso: "en proceso", hecho: "evaluado" };
  const hechos = Array.from({ length: plan.puntos }, (_, p) => estadoPunto(p) === "hecho").filter(Boolean).length;
  const dis = ed ? "" : "disabled";
  const chips = Array.from({ length: plan.puntos }, (_, p) => `${plan.corrales === 2 && p % plan.puntosCorral === 0 ? `<span class="muted" style="font-size:12px;font-weight:800;width:100%;margin-top:${p ? 6 : 0}px">Galpón ${galponDePunto(plan, p) + 1}</span>` : ""}
    <button class="chip-punto est-${estadoPunto(p)} ${p === pt ? "actual" : ""}" data-pt="${p}" title="${nombrePunto(p)}: ${TXT_EST[estadoPunto(p)]}" ${p === pt ? 'aria-current="true"' : ""}>${estadoPunto(p) === "hecho" ? "✓ " : ""}${corto(p)}<small>${nAves(p)} gansos</small></button>`).join("");
  const leyenda = `<p class="leyenda-puntos"><span><i class="lp est-pend"></i>Pendiente</span><span><i class="lp est-proceso"></i>En proceso</span><span><i class="lp est-hecho"></i>Evaluado</span><span><i class="lp actual"></i>Punto actual</span></p>`;
  // recursos del punto
  const dosOpc = (campo, actual, si, no) => `<div class="niveles-campo">${[[true, si, 100], [false, no, 0]].map(([v, t, c]) => `<button type="button" class="nv ${actual === v ? "sel" : ""}" style="--c:${COL[c]}" data-rec="${campo}:${v ? 1 : 0}" ${dis}><span>${esc(t)}</span></button>`).join("")}</div>`;
  const x = ptD(pt);
  const filaRec = (code, campo, titulo, sub, si, no) => aplicaInd(code) ? `<div class="fila-recurso"><div><b>${IND[code].num} ${esc(titulo)}</b> ${btnFicha(code)}<small class="muted">${esc(sub)}</small></div>${dosOpc(campo, x[campo], si, no)}</div>` : "";
  const recursos = filaRec("GR03", "com", "Comedero", "El más cercano al punto", "Buen estado y limpio", "Dañado, sucio o con riesgo")
    + filaRec("GR04", "beb", "Bebedero", "El más cercano al punto", "Buen estado y limpio", "Dañado, sucio o con riesgo")
    + filaRec("GR02", "agua", "Acceso al agua", `Los ${nAves(pt)} gansos del punto`, "Tienen acceso permanente", "No tienen acceso");
  const galHTML = aplicaInd("GR05") && primeroDelGalpon ? `<div class="fila-recurso"><div><b>${IND.GR05.num} ${plan.corrales === 2 ? `Galpón ${gal + 1}` : "Galpón o potrero"}</b> ${btnFicha("GR05")}<small class="muted">Una vez por galpón: limpieza y elementos de riesgo</small></div>
      <div class="niveles-campo">${[[false, "Limpio, sin elementos de riesgo", 100], [true, "Con elementos de riesgo", 0]].map(([v, t, c]) => `<button type="button" class="nv ${rg.gal[gal] === v ? "sel" : ""}" style="--c:${COL[c]}" data-gal="${v ? 1 : 0}" ${dis}><span>${esc(t)}</span></button>`).join("")}</div></div>` : "";
  // gansos del punto
  const lst = avesDe(pt);
  const novTxt = (a) => NOV_GANSO.filter((n) => a.m[n.code]).map((n) => n.txt.split(" (")[0]);
  const tarjeta = (a, k) => { const e = a.ok ? "hecho" : Object.keys(a.m).length ? "proceso" : "pend", nv = novTxt(a);
    return `<button type="button" class="tarjeta-ave est-${e}" data-av="${k}"><b>${a.ok ? "✓ " : ""}Ganso ${k + 1}</b><span>${a.ok ? (nv.length ? `${nv.length} novedad${nv.length > 1 ? "es" : ""}` : "Sin novedad") : e === "proceso" ? "Sin terminar" : "Sin revisar"}</span></button>`; };
  const sig = lst.findIndex((a) => !a.ok);
  const revisadas = lst.filter((a) => a.ok).length;
  // tratamiento: solo para las novedades encontradas
  derivarGansos(ev);
  const conNov = Object.keys(TRAT_GANSO).filter((c) => aplicaInd(c) && +(ev.resp[c] || {}).part > 0);
  const tratHTML = conNov.length ? `<section class="panel"><h3>Evidencia de tratamiento</h3><p class="muted" style="margin:0 0 8px">La tabla de estos indicadores cambia si los gansos con la novedad están siendo tratados. Marque la que verifique.</p>
      ${conNov.map((c) => `<label class="chk"><input type="checkbox" data-trat="${c}" ${rg.trat[c] ? "checked" : ""} ${dis}>${IND[c].num} · hay evidencia de tratamiento de ${TRAT_GANSO[c]} (${ev.resp[c].part} de ${ev.resp[c].total} gansos)</label>`).join("")}</section>` : "";
  const ultimo = pt === plan.puntos - 1;
  shell("fincas", migasEval(ev, "Recorrido por puntos"), `<div class="encabezado"><div><h1>Recorrido por puntos</h1>
      <p>${esc(ctx.f.nombre)} · Gansos · ${nombreVisita(ev)} · ${plan.corrales ? `${plan.corrales} galpón(es) × ${plan.puntosCorral} puntos` : `${plan.puntos} punto(s) sin corral`} · ${plan.aves} gansos (${plan.avesPunto} por punto) · ${hechos} de ${plan.puntos} puntos completos</p></div>
      <a class="btn btn-sec" id="irLista" href="${destinoLista(ev)}">Listado por indicador</a></div>
    <div class="recorrido"><section class="panel"><h3>Puntos de muestreo</h3>${muestreoSVG(plan, pt, Array.from({ length: plan.puntos }, (_, p) => estadoPunto(p)))}<div class="chips">${chips}</div>${leyenda}</section>
    <div><section class="panel"><h2 style="margin:0">${nombrePunto(pt)}</h2>
      <h3 class="paso-punto"><span class="paso-n">1</span>Recursos más cercanos al punto</h3>${galHTML}${recursos}
      <h3 class="paso-punto"><span class="paso-n">2</span>Gansos del punto <span class="resumen-aves">${revisadas} de ${lst.length} revisados</span></h3>
      <p class="muted" style="margin:0 0 8px;font-size:13px">Marque solo lo que encuentre en cada ganso; si no tiene nada, «Sin novedad».</p>
      ${lst.length ? `<div class="tarjetas-aves">${lst.map(tarjeta).join("")}</div>
        <div class="evaluar-aves">${ed && sig >= 0 ? `<button type="button" class="btn btn-sec" id="restoSin" title="Marca como revisados y sin novedad los gansos que faltan">${revisadas ? "Los gansos restantes, sin novedad" : "Todos los gansos del punto, sin novedad"}</button>` : ""}<button type="button" class="btn ${sig >= 0 && ed ? "btn-primario" : "btn-sec"}" id="evalAves">${!ed ? "Ver gansos del punto" : sig < 0 ? "Revisar gansos del punto" : `Revisar el Ganso ${sig + 1} →`}</button></div>` : '<p class="muted">Este punto no tiene gansos asignados.</p>'}
      <div class="acciones" style="justify-content:space-between;margin-top:18px"><button class="btn btn-sec" id="prev" ${pt === 0 ? "disabled" : ""}>${pt === 0 ? "Punto anterior" : `Punto anterior: ${nombrePunto(pt - 1)}`}</button>
        <button class="btn btn-primario" id="next">${!ultimo ? `Siguiente punto: ${nombrePunto(pt + 1)}` : "Continuar con la evaluación por indicador"}</button></div></section>
      ${tratHTML}</div></div>`);
  const ir = (p) => vRecorridoGanso(ev, p);
  const cambio = () => { if (ev.estado === "Programada") ev.estado = "En proceso"; derivarGansos(ev); ev.guardado = new Date().toISOString(); guardar(); };
  raiz.querySelectorAll("[data-pt]").forEach((b) => (b.onclick = () => ir(+b.dataset.pt)));
  raiz.querySelector("#prev").onclick = () => ir(pt - 1);
  raiz.querySelector("#next").onclick = () => (!ultimo ? ir(pt + 1) : (location.hash = destinoLista(ev)));
  if (!ed) { const b = raiz.querySelector("#evalAves"); if (b) b.onclick = () => abrirGansos(0); }
  raiz.querySelectorAll("[data-rec]").forEach((b) => (b.onclick = () => { const [c, v] = b.dataset.rec.split(":"); ptD(pt)[c] = v === "1"; cambio(); ir(pt); }));
  raiz.querySelectorAll("[data-gal]").forEach((b) => (b.onclick = () => { rg.gal[gal] = b.dataset.gal === "1"; cambio(); ir(pt); }));
  raiz.querySelectorAll("[data-trat]").forEach((b) => (b.onchange = () => { rg.trat[b.dataset.trat] = b.checked; cambio(); }));
  raiz.querySelectorAll("[data-av]").forEach((b) => (b.onclick = () => abrirGansos(+b.dataset.av)));
  const rs = raiz.querySelector("#restoSin"); if (rs) rs.onclick = () => { lst.forEach((a) => { if (!a.ok) { if (!Object.keys(a.m || {}).length) a.m = {}; a.ok = true; } }); cambio(); toast("Gansos del punto marcados como revisados."); ir(pt); };
  const ev0 = raiz.querySelector("#evalAves"); if (ev0) ev0.onclick = () => abrirGansos(sig >= 0 ? sig : 0);

  /* Gansos del punto en ventana flotante: uno a la vez, se marca solo lo que tiene. */
  function abrirGansos(k0) {
    let k = Math.min(Math.max(0, k0), lst.length - 1);
    modal(`<div class="modal-cab"><div class="cab-aves"><div><small class="muted">${nombrePunto(pt)}</small><h3 id="gTit"></h3></div><button type="button" class="btn btn-sec btn-chico" id="gCerrar">Cerrar</button></div><div class="chips" id="gTabs"></div></div>
      <div class="modal-cuerpo" id="gCuerpo"></div><div class="acciones" id="gPie"></div>`, (c) => {
      c.querySelector(".modal > div").classList.add("modal-medio", "modal-aves");
      const volver = () => { cerrarCapas(); ir(pt); };
      c.querySelector("#gCerrar").onclick = volver;
      const pinta = () => {
        const a = lst[k];
        c.querySelector("#gTit").textContent = `Ganso ${k + 1} de ${lst.length}`;
        c.querySelector("#gTabs").innerHTML = lst.map((x, j) => `<button type="button" class="chip-punto est-${x.ok ? "hecho" : Object.keys(x.m).length ? "proceso" : "pend"} ${j === k ? "actual" : ""}" data-g="${j}">${x.ok ? "✓ " : ""}G${j + 1}</button>`).join("");
        c.querySelector("#gCuerpo").innerHTML = `<p class="muted" style="margin:0 0 10px">Marque lo que encuentre en este ganso.</p>
          <div class="novedades">${NOV_GANSO.filter((n) => aplicaInd(n.code)).map((n) => n.opc
            ? `<div class="nov-fila ${a.m[n.code] ? "sel" : ""}"><span class="nov-txt">${esc(n.txt)}</span>${btnFicha(n.code)}<div class="nov-opc">${n.opc.map(([v, t]) => `<button type="button" class="nov-btn ${a.m[n.code] === v ? "sel" : ""}" data-nov="${n.code}:${v}" ${dis}>${esc(t)}</button>`).join("")}</div></div>`
            : `<div class="nov-fila nov-con-ficha ${a.m[n.code] ? "sel" : ""}"><button type="button" class="nov-toggle" data-nov="${n.code}:1" ${dis}><span class="nov-caja">${a.m[n.code] ? "✓" : ""}</span><span class="nov-txt">${esc(n.txt)}</span></button>${btnFicha(n.code)}</div>`).join("")}</div>`;
        const siguiente = lst.findIndex((x, j) => j > k && !x.ok);
        c.querySelector("#gPie").innerHTML = !ed ? `<button class="btn btn-sec" id="gAnt" ${k === 0 ? "disabled" : ""}>← Anterior</button><button class="btn btn-primario" id="gSig" ${k === lst.length - 1 ? "disabled" : ""}>Siguiente →</button>`
          : `<button class="btn btn-sec" id="gAnt" ${k === 0 ? "disabled" : ""}>← Anterior</button>
            <button class="btn ${Object.keys(a.m).length ? "btn-sec" : "btn-primario"}" id="gSin">Sin novedad${k < lst.length - 1 ? " · siguiente" : ""}</button>
            ${Object.keys(a.m).length ? `<button class="btn btn-primario" id="gOk">Guardar${k < lst.length - 1 ? " · siguiente" : " y cerrar"}</button>` : ""}`;
        c.querySelectorAll("[data-g]").forEach((b) => (b.onclick = () => { k = +b.dataset.g; pinta(); }));
        c.querySelectorAll("[data-nov]").forEach((b) => (b.onclick = () => { const [code, v] = b.dataset.nov.split(":");
          if (a.m[code] === (v === "1" ? true : v)) delete a.m[code]; else a.m[code] = v === "1" ? true : v;
          if (a.ok) cambio(); pinta(); }));
        const avanza = () => { a.ok = true; cambio(); if (k < lst.length - 1) { k = siguiente > k ? siguiente : k + 1; pinta(); } else volver(); };
        const sn = c.querySelector("#gSin"); if (sn) sn.onclick = () => { a.m = {}; avanza(); };
        const ok = c.querySelector("#gOk"); if (ok) ok.onclick = avanza;
        c.querySelector("#gAnt").onclick = () => { k--; pinta(); };
        const gs = c.querySelector("#gSig"); if (gs) gs.onclick = () => { k++; pinta(); };
      };
      pinta();
    });
  }
}
