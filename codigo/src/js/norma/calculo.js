/* EBA Patos y Gansos · ICA — js/norma/calculo.js
   Reglas de la norma: tramo, pesos (Tabla 1), muestreo (Tabla 3), cálculo automático de cada indicador y resultado.
   Versión 0.13.0: correcciones de cálculo documentadas en docs/validacion/INFORME_VALIDACION.md. */
"use strict";

/* ---------------- parámetros de la norma ---------------- */
/** Corte entre traspatio y comercial. La norma escribe «menos de 199», «199 o más», «más de 199», «≥299» y «menor a 200»;
 *  se usa un solo corte para todo (tramo, Tabla 1, Tabla 3 y medidas de gestión): menos de 200 = traspatio; 200 o más = comercial. */
const UMBRAL_COMERCIAL = 200;
const poblacion = (f) => f.especies.reduce((s, e) => s + poblacionEspecie(e), 0);
const poblacionEspecie = (e) => e.inventario.reduce((a, c) => a + (+c.n || 0), 0);
const tramo = (n) => (n >= UMBRAL_COMERCIAL ? "comercial" : "traspatio");
/* Decisión del proyecto para fincas mixtas: cada especie tiene su propia inspección, así que el tramo (Tabla 1) y la
   muestra (Tabla 3) se calculan con el número de aves de la especie que se inspecciona. */
const tramoEspecie = (e) => tramo(poblacionEspecie(e));
/** La finca es comercial si alguna de sus especies tiene 200 aves o más. */
const tramoFinca = (f) => (f.especies.some((e) => tramoEspecie(e) === "comercial") ? "comercial" : "traspatio");
/** «200 patos: comercial · 100 gansos: traspatio». */
const tramosTexto = (f) => f.especies.map((e) => `${poblacionEspecie(e)} ${e.sp === "pato" ? "patos" : "gansos"}: ${tramoEspecie(e)}`).join(" · ");
const PESOS = { comercial: { MBA: 0.6, MBR: 0.25, MBG: 0.15 }, traspatio: { MBA: 0.7, MBR: 0.3, MBG: 0 } };
const NIVELES = [["Excelente", 90, "var(--campo)"], ["Alto", 75, "var(--siembra)"], ["Medio", 50, "#A8A600"], ["Bajo", 0, "var(--rojo)"]];
const clasificar = (p) => { const n = NIVELES.find(([, min]) => p >= min) || NIVELES[3]; return [n[0], n[2]]; };
/** Redondeo a 1 decimal «al más cercano, 0,05 sube» (RN-121) sin el error de coma flotante (89,95 se guardaba como 89,9499… y quedaba en Alto). */
const redondear1 = (x) => Math.round(Math.round(x * 1e6) / 1e5) / 10;

/** Plan de muestreo (5.6 y Tabla 3). Decisión del equipo: siempre 5 aves por punto (texto de 5.6); la Tabla 3 define galpones y puntos
 *  y su «tamaño de la muestra» es el mínimo.
 *  población < 200 con corral → 1 galpón o corral × 3 puntos × 5 aves = 15 aves (mínimo de la Tabla 3: 5);
 *  población ≥ 200 → 2 galpones × 5 puntos (Ilustración 2) × 5 aves = 50 aves, 25 por galpón (mínimo: 10);
 *  sin corral (la Tabla 3 no tiene fila) → de 1 a 3 puntos y de 2 a 5 aves por punto (el inspector lo ajusta en la apertura).
 *  En todos los casos la muestra no puede superar las aves de la especie: si hay menos, se evalúan todas.
 *  reparto = aves de cada punto, en orden (galpón 1: puntos 1–5, galpón 2: puntos 1–5).
 *  opc = { puntos, avesPunto } solo para el caso sin corral. */
const AVES_POR_PUNTO = 5;
function planMuestreo(pob, conCorral, nEspecie, opc) {
  opc = opc || {};
  let p;
  if (!conCorral) {
    const puntos = Math.min(3, Math.max(1, +opc.puntos || 3)), avesPunto = Math.min(5, Math.max(2, +opc.avesPunto || 3));
    p = { corrales: 0, puntosCorral: puntos, puntos, avesPunto, minimo: null,
      texto: `Sin corral (5.6): ${puntos} punto${puntos > 1 ? "s" : ""} donde estén las aves y sus recursos, con ${avesPunto} aves por punto (la norma permite de 1 a 3 puntos y de 2 a 5 aves por punto)` };
  } else if (pob < UMBRAL_COMERCIAL) {
    p = { corrales: 1, puntosCorral: 3, puntos: 3, avesPunto: AVES_POR_PUNTO, minimo: 5,
      texto: "Menos de 200 aves de la especie (Tabla 3 y 5.6): 1 galpón o corral, 3 puntos y 5 aves por punto = 15 aves (mínimo de la Tabla 3: 5)" };
  } else {
    p = { corrales: 2, puntosCorral: 5, puntos: 10, avesPunto: AVES_POR_PUNTO, minimo: 10,
      texto: "200 aves o más de la especie (Tabla 3 y 5.6): 2 galpones o corrales, 5 puntos por galpón en los extremos y el centro (Ilustración 2) y 5 aves por punto = 50 aves, 25 por galpón (mínimo de la Tabla 3: 10)" };
  }
  p.aves = p.puntos * p.avesPunto;
  if (nEspecie != null && nEspecie > 0 && p.aves > nEspecie) { p.aves = nEspecie; p.texto += `. La especie tiene ${nEspecie} aves: se evalúan todas, repartidas entre los puntos`; }
  p.aves = Math.max(1, p.aves);
  // reparto parejo de las aves entre los puntos (si hay menos aves que la muestra)
  const base = Math.floor(p.aves / p.puntos), extra = p.aves % p.puntos;
  p.reparto = Array.from({ length: p.puntos }, (_, i) => Math.min(p.avesPunto, base + (i < extra ? 1 : 0)));
  p.avesGalpon = p.corrales === 2 ? [0, 1].map((g) => p.reparto.slice(g * p.puntosCorral, (g + 1) * p.puntosCorral).reduce((a, b) => a + b, 0)) : [p.aves];
  return p;
}
/** Galpón (0 o 1) de un punto, y ubicación de cada unidad de muestreo: {galpon, punto (en el galpón), ave (en el punto)}. */
const galponDePunto = (plan, pt) => (plan.corrales === 2 ? Math.floor(pt / plan.puntosCorral) : 0);
function ubicarAve(plan, i) {
  let acc = 0;
  for (let pt = 0; pt < plan.reparto.length; pt++) { if (i < acc + plan.reparto[pt]) return { punto: pt, ave: i - acc, galpon: galponDePunto(plan, pt) }; acc += plan.reparto[pt]; }
  return { punto: plan.reparto.length - 1, ave: 0, galpon: galponDePunto(plan, plan.reparto.length - 1) };
}
/** Índices de unidades de un punto (aves o recursos). */
function unidadesDePunto(ind, ctx, pt) {
  const src = ind.m.src, plan = ctx.plan;
  if (src === "aves") { const ini = plan.reparto.slice(0, pt).reduce((a, b) => a + b, 0); return Array.from({ length: plan.reparto[pt] }, (_, k) => ini + k); }
  if (src === "bebederos") return ctx.tramo === "traspatio" ? [] : [pt * 2, pt * 2 + 1];
  if (src === "comederos") return ctx.tramo === "traspatio" ? [] : [galponDePunto(plan, pt)];
  return [pt];
}
const galponDeUnidad = (ind, ctx, i) => { const src = ind.m.src, plan = ctx.plan;
  if (src === "aves") return ubicarAve(plan, i).galpon;
  if (src === "bebederos") return ctx.tramo === "traspatio" ? 0 : galponDePunto(plan, Math.floor(i / 2));
  if (src === "comederos") return ctx.tramo === "traspatio" ? 0 : i;
  return galponDePunto(plan, i); };
/* Recursos del punto (Ilustración 3): cama, bebedero y nidal más cercanos a cada punto. Se guardan por punto:
   porPunto[pt] = { v: [valores], mismo: índice del punto con el mismo recurso | null, nohay: true si no hay en el galpón }.
   «mismo» no vuelve a contar el recurso; «nohay» cuenta 0 (Tablas 7, 9 y 14: no hay bebederos / suministro / nidales = 0). */
const PUNTO_FLEX = ["PR02", "PR05", "PR10"];
const MAX_POR_PUNTO = { PR02: 1, PR05: 4, PR10: 1 };
const esFlexPunto = (ind, ctx) => PUNTO_FLEX.includes(ind.code) && ctx.plan && !(ind.m.src === "bebederos" && ctx.tramo === "traspatio");
/** Convierte el registro anterior por casillas (units) al registro por punto. */
function porPuntoDe(ind, r, ctx) {
  if (Array.isArray(r.porPunto)) return r.porPunto;
  const u = r.units || [], n = ctx.plan.puntos;
  if (!u.length) return [];
  return Array.from({ length: n }, (_, pt) => { const v = (ind.m.src === "bebederos" ? [u[pt * 2], u[pt * 2 + 1]] : [u[pt]]).filter((x) => x != null);
    return v.length ? { v, mismo: null, nohay: false } : null; });
}
const puntoListo = (e) => !!e && (e.mismo != null || e.nohay || (Array.isArray(e.v) && e.v.length > 0 && e.v.every((x) => x != null)));

/* ---------------- reglas por porcentaje (p = porcentaje calculado, x = casilla adicional) ---------------- */
const RULES = {
  PR03: (p) => (p >= 80 ? 100 : p >= 40 ? 55 : 0),                               // Tabla 7 (con bebederos; «no hay bebederos» = 0 se trata aparte)
  PA01: (p) => (p <= 40 ? 100 : p <= 60 ? 55 : 0),                                // Tabla 17
  PA02: (p) => (p <= 40 ? 100 : p < 60 ? 55 : 0),                                 // Tabla 18: «≥ 60 %» = 0
  PA10: (p) => (p < 12 ? 100 : p < 14 ? 55 : 0),                                  // Tabla 26: < 12 = 100; de 12 a menos de 14 = 55; ≥ 14 = 0
  GR02: (p) => (p >= 100 ? 100 : p >= 80 ? 55 : 0),                               // Tabla 41
  GR03: (p) => (p >= 100 ? 100 : p >= 80 ? 55 : p >= 60 ? 20 : 0),                // Tablas 42 y 43
  GR05: (p) => (p <= 0 ? 100 : p < 20 ? 55 : p <= 40 ? 20 : 0),                   // Tabla 44 (ver erratas: los niveles 55 y 20 están invertidos en la norma)
  GA01: (p, x) => (p <= 0 ? 100 : p <= 15 && x ? 55 : p <= 20 || x ? 20 : 0),     // Tabla 47
  GA02: (p) => (p >= 100 ? 100 : p >= 60 ? 55 : 0),                               // Tabla 48 (p = % con plumaje adecuado)
  GA03: (p, x) => (p <= 0 ? 100 : x ? (p < 20 ? 55 : 20) : p < 20 ? 20 : 0),      // Tabla 49
  GA04: (p, x) => (p <= 0 ? 100 : x ? (p <= 10 ? 55 : 20) : p <= 10 ? 20 : 0),    // Tablas 50 y 53
  GA05: (p, x) => (p <= 0 ? 100 : p <= 6 ? (x ? 55 : 20) : p <= 8 ? 20 : x ? 20 : 0), // Tabla 51 (sin lesiones = 100 aunque no se marque la casilla)
  GA06: (p) => (p < 3 ? 100 : p <= 6 ? 55 : p <= 8 ? 20 : 0),                     // Tablas 52 y 55
  GA08: (p) => (p < 5 ? 100 : p <= 8 ? 55 : p <= 10 ? 20 : 0),                    // Tabla 54
  GA10: (p) => (p >= 70 ? 100 : p >= 50 ? 55 : 0),                                // Tabla 56
  GG05: (p, x) => (p > 80 ? 100 : x && p >= 50 ? 55 : x && p >= 20 ? 20 : 0),     // Tabla 61
  GG07: (p, x) => (p <= 3 ? (x ? 100 : 55) : p <= 5 ? 20 : 0)                     // Tabla 63
};
/* Reglas automáticas: el nivel sale de las condiciones observadas (descripción de cada tabla). a = respuestas, t = tramo */
const AUTO = {
  PR01: (a) => (!a[0] ? 0 : a[1] && a[2] && a[3] ? 100 : 55),
  PR04: (a) => exceso(a), PR08: (a) => exceso(a),
  /* 6.1.6: el protocolo de tratamiento y sus registros solo se exigen con 200 aves o más. En traspatio se califica
     por la fuente y el agua que se ofrece: limpia y apta = 100; sucia = 0. */
  PR06: (a, t) => (t === "traspatio" ? (a[2] ? 100 : 0) : !a[0] || !a[1] || !a[2] ? 0 : a[3] ? 100 : 55),
  PR09: (a, t) => (!a[0] || !a[1] ? 0 : t === "traspatio" || a[2] ? 100 : 55),
  PR12: (a) => { if (!a[0]) return 0; if (a[1] === undefined || a[1] === "") return null; if (+a[1] < 10) return 0; return a[2] && a[3] && !a[4] ? 100 : 55; },
  GR01: (a) => (!a[0] || !a[2] || !a[3] ? 0 : a[1] ? 100 : 55)
};
/** 6.1.4 y 6.1.8: exceso de aves por bebedero (o comedero) sobre lo declarado por la granja. */
function exceso(a) {
  const aves = +a[0], rec = +a[1], dec = +a[2];
  if (!aves || !dec) return null;
  if (a[1] === "" || a[1] == null) return null;
  if (rec === 0) return 0;                                   // sin bebederos o comederos: hay competencia segura
  const ex = ((aves / rec - dec) / dec) * 100;
  return ex <= 30 ? (a[3] ? 55 : 100) : a[3] ? 0 : 55;
}
/* 6.1.11: densidad máxima (kg/m²) según el peso de las aves. Entre dos pesos de la tabla se interpola de forma lineal;
   por debajo de 1,5 kg se usa 17 kg/m² (el valor más exigente) y por encima de 4,5 kg, 24 kg/m². */
const DENS = [[1.5, 17], [2, 18], [2.5, 20], [3, 21], [3.5, 22], [4, 23], [4.5, 24]];
function densidadMaxima(w) {
  if (w <= DENS[0][0]) return { max: DENS[0][1], desde: DENS[0], hasta: DENS[0] };
  const ult = DENS[DENS.length - 1];
  if (w >= ult[0]) return { max: ult[1], desde: ult, hasta: ult };
  for (let i = 0; i < DENS.length - 1; i++) {
    const [w0, d0] = DENS[i], [w1, d1] = DENS[i + 1];
    if (w >= w0 && w <= w1) return { max: d0 + ((w - w0) / (w1 - w0)) * (d1 - d0), desde: DENS[i], hasta: DENS[i + 1] };
  }
}
const BPUMV = ["No usa sustancias prohibidas por el ICA", "Usa promotores de crecimiento solo si el registro ICA lo autoriza",
  "Todos los medicamentos tienen registro ICA", "No hay medicamentos vencidos", "Almacena y aplica según el rotulado del producto",
  "Agujas y equipos en buen estado", "Área de almacenamiento limpia",
  "Antimicrobianos y biológicos solo con prescripción de MV o MVZ con matrícula vigente", "Lleva registro de tratamientos veterinarios"];
const BPUMV_MIN = [0, 2, 3, 7, 8];

/** El inspector indica en el nidal (6.1.10) si la finca produce huevo: habilita el nidal y la escala de huevo de la
 *  condición corporal (Tabla 28). Queda guardado en la finca para las próximas visitas. */
function marcarHuevo(ev, huevo) {
  const e = FINCAS.find((f) => f.id === ev.finca).especies.find((x) => x.sp === ev.sp);
  e.proposito = huevo ? "Huevo" : "Carne";
  if (ev.estado === "Programada") ev.estado = "En proceso";
  log(`Propósito de la finca: ${e.proposito.toLowerCase()} (${ev.id})`); guardar();
}
function contexto(ev) {
  const f = FINCAS.find((x) => x.id === ev.finca);
  const e = f.especies.find((x) => x.sp === ev.sp);
  // aves de cada especie confirmadas en la apertura; el tramo y la muestra se calculan con las de la especie inspeccionada
  const pobDe = (x) => (ev.pobEsp && ev.pobEsp[x.sp] != null ? +ev.pobEsp[x.sp] : f.especies.length === 1 && ev.pobConfirmada != null ? ev.pobConfirmada : poblacionEspecie(x));
  const pobFinca = ev.pobEsp && Object.keys(ev.pobEsp).length ? f.especies.reduce((t, x) => t + pobDe(x), 0) : ev.pobConfirmada ?? poblacion(f);
  const nEsp = pobDe(e), pob = nEsp;   // el tramo y la muestra se calculan por especie
  const ap = ev.apertura || {};
  return { f, e, pob, pobFinca, nEsp, tramo: tramo(pob), plan: planMuestreo(pob, e.conCorral !== false, nEsp, { puntos: ap.puntosSC, avesPunto: ap.avesPuntoSC }), ap };
}
function aplica(ind, ctx) {
  if (!ind.trasp && ctx.tramo === "traspatio") return "No se evalúa en traspatio (menos de 200 aves).";
  const a = ind.app || {};
  if (a.proposito && !String(ctx.e.proposito).toLowerCase().includes(a.proposito)) return "Solo aplica a producción de huevo.";
  if (a.permanencia && !ctx.e.permanencia) return "Solo aplica si los patos permanecen todo el tiempo en corral o galpón.";
  if (a.cama && ctx.e.cama === false) return "No se evalúa en corral nocturno con piso de cemento, madera o tierra.";
  if (a.sistema && !a.sistema.includes(ctx.e.sistema)) return "Solo aplica a sistemas intensivos y semi-intensivos.";
  return null;
}
/** Unidades a registrar en los indicadores por unidad.
 *  Bebederos (6.1.5): 2 por punto (la norma pide de 2 a 4 por punto); en traspatio, todos los del predio.
 *  Comederos (6.1.7): uno por punto; en traspatio, todos los del predio. */
function nUnidades(ind, ctx) {
  const p = ctx.plan, src = ind.m.src, ap = ctx.ap || {};
  if (src === "aves") return p.aves;
  if (src === "bebederos") return ctx.tramo === "traspatio" ? Math.max(1, +ap.bebederos || 2) : p.puntos * 2;
  if (src === "comederos") return ctx.tramo === "traspatio" ? Math.max(1, +ap.comederos || 2) : Math.max(1, p.corrales);   // una vez por galpón
  return p.puntos;
}
const esHuevo = (prop) => { const s = String(prop).toLowerCase(); return s.includes("huevo") && !s.includes("carne"); };
/** Tablas 27 (carne) y 28 (huevo). La Tabla 28 escribe «5 punto» para la CC 4: es 55 (la escala solo usa 0, 55 y 100). */
function ccNivel(s, prop) {
  if (esHuevo(prop)) return s === 2 || s === 3 ? 100 : s === 4 ? 55 : 0;
  return s === 3 || s === 4 ? 100 : s === 2 ? 55 : 0;
}
/** Calcula el puntaje de un indicador: {score, done, det, dist, pct} */
function calcular(ind, r, ctx) {
  r = r || {};
  const m = ind.m;
  if (m.kind === "auto") {
    if (!r.rev) return { score: null, done: false, det: "" };
    if (porGalponAuto(ind, ctx)) {
      /* Con 2 galpones, las condiciones se observan en cada uno y el indicador es el promedio (decisión del equipo; igual que en aves de corral). */
      const ag = r.auxG || [r.aux || {}, r.aux || {}], lvs = ag.map((a) => AUTO[ind.code](a || {}, ctx.tramo));
      if (lvs.some((v) => v == null)) return { score: null, done: false, det: "Complete los datos de los dos galpones." };
      const sc = (lvs[0] + lvs[1]) / 2;
      return { score: sc, done: true, porGalpon: lvs, det: `Galpón 1: ${lvs[0]} · Galpón 2: ${lvs[1]} → promedio (${lvs[0]} + ${lvs[1]}) ÷ 2 = ${fmt(sc)}` };
    }
    const a = r.aux || {}, lv = AUTO[ind.code](a, ctx.tramo);
    if (lv == null) return { score: null, done: false, det: "Complete los datos para calcular." };
    let det = "Calculado con las condiciones observadas";
    if (ind.code === "PR04" || ind.code === "PR08") {
      const rec = ind.code === "PR04" ? "bebedero" : "comedero";
      if (+a[1] === 0) det = `No hay ${rec}s: 0 puntos`;
      else { const x = +a[0] / +a[1], ex = ((x - +a[2]) / +a[2]) * 100;
        det = `${fmt(+a[0], 0)} ÷ ${fmt(+a[1], 0)} = ${fmt(x)} aves por ${rec}; declarado ${fmt(+a[2])}; exceso = (${fmt(x)} − ${fmt(+a[2])}) ÷ ${fmt(+a[2])} × 100 = ${fmt(ex)} %${ex <= 30 ? " (≤ 30 %)" : " (> 30 %)"}${a[3] ? " · con competencia" : " · sin competencia"}`; }
    }
    if (ind.code === "PR06" && ctx.tramo === "traspatio") det = a[2] ? "Traspatio: fuente y agua limpias y aptas (no se exige protocolo)" : "Traspatio: el agua que se ofrece está sucia o no es apta";
    if (ind.code === "PR12") det = a[0] ? `Profundidad ${fmt(+a[1])} cm${+a[1] >= 10 ? " (≥ 10 cm)" : " (menos de 10 cm: no permite nadar)"} · ${a[2] && a[3] ? "con rampas de ingreso y salida" : "falta alguna rampa"}${a[4] ? " · con encharcamiento" : " · sin encharcamiento"}` : "No existe un lugar para nadar";
    return { score: lv, done: true, det };
  }
  if (m.kind === "direct" || m.kind === "radio") {
    const lv = m.kind === "radio" ? (r.opt != null ? m.opts[r.opt][1] : null) : r.level;
    return { score: lv ?? null, done: lv != null, det: lv != null ? "Nivel según la opción observada en la tabla" : "" };
  }
  if (m.kind === "units" && esFlexPunto(ind, ctx)) {
    const pp = porPuntoDe(ind, r, ctx), n = ctx.plan.puntos, vals = [], porG = [[], []];
    let listos = 0, compartidos = 0, sinRecurso = 0;
    for (let pt = 0; pt < n; pt++) { const e = pp[pt]; if (!puntoListo(e)) continue; listos++;
      if (e.mismo != null) { compartidos++; continue; }
      const vs = e.nohay ? [0] : e.v; if (e.nohay) sinRecurso++;
      vs.forEach((v) => { vals.push(v); porG[galponDePunto(ctx.plan, pt)].push(v); }); }
    const dist = {}; vals.forEach((v) => (dist[v] = (dist[v] || 0) + 1));
    const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : listos === n && n ? null : null;
    const partes = Object.keys(dist).map(Number).sort((a, b) => b - a).map((k) => `${dist[k]} × ${k}`).join(" + ");
    const porGalpon = ctx.plan.corrales === 2 ? porG.map((a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)) : null;
    return { score, done: listos === n && vals.length > 0, dist, n, hechas: listos, porGalpon,
      det: vals.length ? `(${partes}) ÷ ${vals.length} = ${fmt(score)} · ${listos} de ${n} puntos${compartidos ? ` · ${compartidos} comparte${compartidos > 1 ? "n" : ""} recurso con otro punto` : ""}${sinRecurso ? ` · ${sinRecurso} sin recurso (0)` : ""}` : "" };
  }
  if (m.kind === "units" || m.kind === "cc") {
    const n = nUnidades(ind, ctx), u = (r.units || []).slice(0, n);
    const vals = u.filter((x) => x != null).map((x) => (m.kind === "cc" ? ccNivel(x, ctx.e.proposito) : x));
    const dist = {}; vals.forEach((v) => (dist[v] = (dist[v] || 0) + 1));
    const suma = vals.reduce((a, b) => a + b, 0);
    const score = vals.length ? suma / vals.length : null;
    const partes = Object.keys(dist).map(Number).sort((a, b) => b - a).map((k) => `${dist[k]} × ${k}`).join(" + ");
    const det = vals.length ? `(${partes}) ÷ ${vals.length} ${m.unit}${vals.length > 1 ? "s" : ""} = ${fmt(score)}` : "";
    let porGalpon = null;
    if (ctx.plan && ctx.plan.corrales === 2) {
      const sum = [0, 0], cnt = [0, 0];
      u.forEach((x, i) => { if (x == null) return; const g = galponDeUnidad(ind, ctx, i), v = m.kind === "cc" ? ccNivel(x, ctx.e.proposito) : x; sum[g] += v; cnt[g]++; });
      porGalpon = [0, 1].map((g) => (cnt[g] ? sum[g] / cnt[g] : null));
    }
    return { score, done: vals.length >= n, det, dist, n, hechas: vals.length, porGalpon };
  }
  if (m.kind === "pct") {
    if (m.rule === "PR03" && r.total !== "" && r.total != null && +r.total === 0) return { score: 0, done: true, pct: null, det: "No hay bebederos: 0 puntos (Tabla 7)" };
    const t = +r.total, p = +r.part;
    if (!t || r.part === "" || r.part == null || p > t || p < 0) return { score: null, done: false, det: p > t ? "La cantidad no puede ser mayor que el total." : "" };
    const pct = (p / t) * 100, lv = RULES[m.rule](pct, !!r.extra);
    let porGalpon = null, pctGalpon = null;
    if (Array.isArray(r.g) && ctx.plan && ctx.plan.corrales === 2) {
      pctGalpon = r.g.map((x) => (x && +x.total ? (+x.part / +x.total) * 100 : null));
      porGalpon = pctGalpon.map((q) => (q == null ? null : RULES[m.rule](q, !!r.extra)));
    }
    return { score: lv, done: true, pct, porGalpon, pctGalpon, det: `${p} ÷ ${t} × 100 = ${fmt(pct)} %${pctGalpon ? ` (galpón 1: ${fmt(pctGalpon[0])} % · galpón 2: ${fmt(pctGalpon[1])} %)` : ""}` };
  }
  if (m.kind === "density") {
    const a = +r.aves, w = +r.peso, s = +r.area;
    if (!a || !w || !s) return { score: null, done: false, det: "" };
    const d = (a * w) / s, ref = densidadMaxima(w);
    const tramoTxt = ref.desde === ref.hasta ? `${fmt(ref.desde[0])} kg → ${ref.desde[1]} kg/m²` : `interpolado entre ${fmt(ref.desde[0])} kg (${ref.desde[1]}) y ${fmt(ref.hasta[0])} kg (${ref.hasta[1]})`;
    return { score: d <= ref.max + 1e-9 ? 100 : 0, done: true, dens: d, max: ref.max, ref,
      det: `${a} aves × ${fmt(w, 2)} kg ÷ ${s} m² = ${fmt(d, 2)} kg/m² · máximo ${fmt(ref.max, 2)} kg/m² (${tramoTxt})` };
  }
  if (m.kind === "bpumv") {
    const c = r.checks || [];
    if (!r.revisado) return { score: null, done: false, det: "" };
    const todas = BPUMV.every((_, i) => c[i]);
    const lv = todas ? 100 : m.mode === "pato" && BPUMV_MIN.every((i) => c[i]) ? 55 : 0;
    return { score: lv, done: true, det: `${c.filter(Boolean).length} de ${BPUMV.length} prácticas se cumplen${!todas && m.mode === "pato" ? (lv === 55 ? " · cumple el mínimo de la Tabla 38" : " · no cumple el mínimo de la Tabla 38") : ""}` };
  }
  if (m.kind === "doc") {
    if (!r.estado) return { score: null, done: false, det: "" };
    const req = ["legible", "sinCorr", "firmado", "contenido"].concat(m.prof ? ["matricula"] : []);
    const ok = r.estado === "Válido" && req.every((k) => r[k]);
    return { score: ok ? 100 : 0, done: true, pend: r.estado === "Pendiente", det: r.estado === "Pendiente" ? "Pendiente: cuenta 0 hasta que se entregue (1 día hábil)" : ok ? "Cumple todos los requisitos" : "No cumple algún requisito" };
  }
  return { score: null, done: false };
}
function lista(ev) { return NORMA.filter((i) => i.sp === ev.sp); }
/** Indicadores por condiciones que se observan en cada galpón cuando hay 2 (alojamiento, bebederos y comederos por ave, confort térmico, pocetas). */
const GALPON_AUTO = [];   // v0.16: las condiciones (6.1.1, 6.1.4, 6.1.8, 6.1.9, 6.1.12) califican el predio en un solo bloque
const porGalponAuto = (ind, ctx) => GALPON_AUTO.includes(ind.code) && ctx.plan && ctx.plan.corrales === 2;
/** Conteo por galpón para jadeo y amontonamiento (6.2.1 y 6.2.2): se observa en el centro de cada galpón y se suman los conteos. */
const GALPON_PCT = ["PA01", "PA02"];
/** Alertas por galpón: el puntaje de la finca es el promedio de los galpones, pero se avisa cuando un galpón queda en un nivel
 *  más bajo que el de la finca o más de 10 puntos por debajo, para que el problema no quede escondido en el promedio. */
const bandaNivel = (s) => (s >= 90 ? 3 : s >= 50 ? 2 : s >= 20 ? 1 : 0);
/** Alerta de galpón: más de 10 puntos por debajo de la finca, o en un nivel más bajo con al menos 5 puntos de diferencia (evita alertas por décimas). */
const esAlertaGalpon = (s, finca) => s != null && finca != null && (s < finca - 10 - 1e-9 || (bandaNivel(s) < bandaNivel(finca) && s < finca - 5 - 1e-9));
function alertasGalpon(ev) {
  const ctx = contexto(ev), out = [];
  if (ctx.plan.corrales !== 2) return out;
  lista(ev).forEach((ind) => {
    if (aplica(ind, ctx)) return;
    const c = calcular(ind, ev.resp[ind.code], ctx);
    if (!c.done || c.score == null || !c.porGalpon) return;
    c.porGalpon.forEach((s, g) => { if (esAlertaGalpon(s, c.score))
      out.push({ ind, galpon: g, score: s, finca: c.score, pct: c.pctGalpon ? c.pctGalpon[g] : null }); });
  });
  return out;
}
/** Resultado (5.4): puntaje de cada medida = promedio simple de sus indicadores aplicables y calificados;
 *  total = Σ peso (Tabla 1) × puntaje de la medida, redondeado a 1 decimal; nivel según la Tabla 2. */
function resultado(ev) {
  const ctx = contexto(ev), pesos = PESOS[ctx.tramo];
  const g = { MBR: [], MBA: [], MBG: [] }, filas = [], aplican = { MBR: 0, MBA: 0, MBG: 0 };
  let pend = 0, provisional = false;
  lista(ev).forEach((ind) => {
    const na = aplica(ind, ctx);
    if (na) return;
    aplican[ind.g]++;
    const c = calcular(ind, ev.resp[ind.code], ctx);
    if (c.pend) provisional = true;
    if (c.done && c.score != null) { g[ind.g].push(c.score); filas.push({ ind, score: c.score }); } else pend++;
  });
  const med = {}, aporte = {};
  Object.keys(g).forEach((k) => (med[k] = g[k].length ? g[k].reduce((a, b) => a + b, 0) / g[k].length : null));
  let total = 0;
  Object.keys(pesos).forEach((k) => { aporte[k] = pesos[k] * (med[k] ?? 0); total += aporte[k]; });
  total = redondear1(total);
  return { ctx, pesos, med, aporte, total, filas, pend, aplican, n: { MBR: g.MBR.length, MBA: g.MBA.length, MBG: g.MBG.length }, provisional, completo: pend === 0, nivel: clasificar(total) };
}
function avance(ev) {
  const ctx = contexto(ev); let ap = 0, hechos = 0;
  lista(ev).forEach((ind) => { if (aplica(ind, ctx)) return; ap++; if (calcular(ind, ev.resp[ind.code], ctx).done) hechos++; });
  return { ap, hechos, pct: ap ? Math.round((hechos / ap) * 100) : 0 };
}
