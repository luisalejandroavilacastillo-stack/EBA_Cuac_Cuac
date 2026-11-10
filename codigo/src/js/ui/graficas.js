/* EBA Patos y Gansos · ICA — js/ui/graficas.js
   Gráficas en SVG (sin librerías): esquema de muestreo, densidad, pesos, clasificación, evolución y bandas de las escalas. */
"use strict";

const C_NIVEL = { 100: "var(--campo)", 55: "var(--cosecha)", 20: "var(--ocre)", 0: "var(--rojo)" };
const svgTxt = (x, y, t, o = {}) => `<text x="${x}" y="${y}" style="font-size:${o.s || 11}px;font-weight:${o.w || 700};fill:${o.c || "var(--gris)"}" text-anchor="${o.a || "middle"}"${o.b ? ' dominant-baseline="middle"' : ""}>${t}</text>`;
const figura = (svg, pie) => `<figure class="grafica">${svg}${pie ? `<figcaption>${pie}</figcaption>` : ""}</figure>`;

/** Ilustración 2 (5.6): galpones con sus puntos de muestreo; sin corral, puntos donde estén las aves. */
function muestreoSVG(p, actual, estados) {   // actual = índice global del punto resaltado; estados = "pend" | "proceso" | "hecho" por punto (opcionales)
  /* Color de cada punto: sin estados, el esquema clásico (actual amarillo); con estados, el avance real del recorrido. */
  const est = (i) => { const e = estados && estados[i], esA = i === actual;
    if (!estados) return { f: esA ? "var(--cosecha)" : "var(--campo)", t: esA ? "var(--tinta)" : "#fff", st: esA ? "stroke:var(--tinta);stroke-width:2" : "", r: esA ? 14 : 11 };
    const base = e === "hecho" ? { f: "var(--campo)", t: "#fff" } : e === "proceso" ? { f: "var(--cosecha)", t: "var(--tinta)" } : { f: "#fff", t: "var(--gris)" };
    return { ...base, st: esA ? "stroke:var(--tinta);stroke-width:3" : e === "hecho" || e === "proceso" ? "" : "stroke:#B9C3B4;stroke-width:2", r: esA ? 14 : 11 }; };
  if (!p.corrales) {
    const pos = [[70, 60], [200, 40], [320, 75]].slice(0, p.puntos);
    return figura(`<svg viewBox="0 0 400 130" role="img" aria-label="Puntos de inspección sin corral">
      <rect x="6" y="6" width="388" height="118" rx="14" style="fill:#F7FAF2;stroke:var(--siembra);stroke-width:2;stroke-dasharray:6 5"/>
      ${pos.map(([x, y], i) => { const c = estados ? est(i) : { f: i === actual ? "var(--cosecha)" : "var(--semilla)", t: "#fff", st: "" }; return `<circle cx="${x}" cy="${y}" r="13" style="fill:${c.f};${c.st}"/>${svgTxt(x, y + 1, i + 1, { c: c.t, s: 12, b: 1 })}
        ${Array.from({ length: p.avesPunto || 3 }, (_, k) => `<circle cx="${x - 22 + k * 11}" cy="${y + 30}" r="4" style="fill:var(--cosecha)"/>`).join("")}`; }).join("")}
      ${svgTxt(200, 118, "Predio sin corral · cada punto es donde están las aves y sus recursos", { s: 10 })}</svg>`,
      `Sin corral: ${p.puntos} punto(s) con ${p.avesPunto} aves cada uno (puntos amarillos = aves de la muestra).`);
  }
  const uno = (ox, n, k) => { const off = (k - 1) * n;
    const W = 170, H = 110, pts = n === 5 ? [[18, 18], [W - 18, 18], [W / 2, H / 2], [18, H - 18], [W - 18, H - 18]] : [[22, 22], [W / 2, H / 2], [W - 22, H - 22]];
    return `<g transform="translate(${ox},10)"><rect width="${W}" height="${H}" rx="8" style="fill:#fff;stroke:var(--semilla);stroke-width:2"/>
      <rect x="${W / 2 - 22}" y="${H - 4}" width="44" height="8" rx="2" style="fill:var(--cosecha)"/>
      ${pts.map(([x, y], i) => { const c = est(off + i); return `<circle cx="${x}" cy="${y}" r="${c.r}" style="fill:${c.f};${c.st}"/>${svgTxt(x, y + 1, i + 1, { c: c.t, s: 11, b: 1 })}`; }).join("")}
      ${svgTxt(W / 2, H + 22, `Galpón o corral ${k}`, { s: 11 })}</g>`;
  };
  const dos = p.corrales === 2;
  return figura(`<svg viewBox="0 0 ${dos ? 400 : 210} 150" role="img" aria-label="Esquema de puntos de muestreo">${uno(dos ? 10 : 20, p.puntosCorral, 1)}${dos ? uno(220, p.puntosCorral, 2) : ""}</svg>`,
    `Ilustración 2 (5.6): ${p.puntosCorral} puntos por galpón, en los extremos y el centro, empezando por la entrada más cercana (franja amarilla). Muestra: ${p.aves} aves, ${p.avesPunto} por punto.`);
}

/** Tabla de densidad de 6.1.11 como gráfica: densidad máxima según el peso; el punto es la medición actual. */
function densidadSVG(w, d) {
  const X0 = 46, X1 = 384, Y0 = 170, Y1 = 14, wMin = 1, wMax = 5, dMin = 10, dMax = 30;
  const x = (v) => X0 + ((v - wMin) / (wMax - wMin)) * (X1 - X0), y = (v) => Y0 - ((Math.min(dMax, v) - dMin) / (dMax - dMin)) * (Y0 - Y1);
  const curva = [[wMin, 17]].concat(DENS, [[wMax, 24]]);
  const linea = curva.map(([a, b]) => `${x(a).toFixed(1)},${y(b).toFixed(1)}`).join(" ");
  const area = `${x(wMin)},${y(dMin)} ${linea} ${x(wMax)},${y(dMin)}`;
  const ok = w && d ? d <= densidadMaxima(w).max + 1e-9 : null;
  const ticksX = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5], ticksY = [10, 15, 20, 25, 30];
  return figura(`<svg viewBox="0 0 400 200" role="img" aria-label="Densidad máxima según el peso de las aves">
    ${ticksY.map((t) => `<line x1="${X0}" x2="${X1}" y1="${y(t)}" y2="${y(t)}" style="stroke:#E7ECE3"/>${svgTxt(X0 - 6, y(t) + 4, t, { a: "end", s: 10, w: 600 })}`).join("")}
    ${ticksX.map((t) => svgTxt(x(t), Y0 + 15, String(t).replace(".", ","), { s: 10, w: 600 })).join("")}
    <polygon points="${area}" style="fill:rgba(4,140,56,.10)"/>
    <polyline points="${linea}" style="fill:none;stroke:var(--campo);stroke-width:2.5"/>
    ${DENS.map(([a, b]) => `<circle cx="${x(a)}" cy="${y(b)}" r="3.5" style="fill:var(--campo)"/>`).join("")}
    ${ok != null ? `<circle cx="${x(Math.max(wMin, Math.min(wMax, w)))}" cy="${y(d)}" r="7" style="fill:${ok ? "var(--campo)" : "var(--rojo)"};stroke:#fff;stroke-width:2"/>
      ${svgTxt(x(Math.max(wMin, Math.min(wMax, w))), y(d) - 12, `${fmt(d, 1)} kg/m²`, { c: ok ? "var(--campo)" : "var(--rojo)", s: 11, w: 900 })}` : ""}
    ${svgTxt((X0 + X1) / 2, 198, "Peso promedio de las aves (kg)", { s: 10 })}
    <text transform="translate(11,${(Y0 + Y1) / 2}) rotate(-90)" style="font-size:10px;font-weight:700;fill:var(--gris)" text-anchor="middle">Densidad (kg/m²)</text></svg>`,
    "Zona verde = dentro de la escala (100 puntos). Por encima de la línea = fuera de la escala (0 puntos). Fuente: tabla de 6.1.11, adaptada de Duck Standards 2022.");
}

/** Tabla 1: pesos por tramo en barras apiladas (etiqueta del tramo arriba de cada barra). */
function pesosSVG() {
  const filas = [["Comercial (200 aves o más)", PESOS.comercial], ["Traspatio (menos de 200 aves)", PESOS.traspatio]];
  const col = { MBA: "var(--campo)", MBR: "var(--siembra)", MBG: "var(--cosecha)" }, nom = { MBA: "MBA", MBR: "MBR", MBG: "MBG" };
  return figura(`<svg viewBox="0 0 400 124" role="img" aria-label="Pesos de la Tabla 1">${filas.map(([t, p], i) => {
    let x = 10; const y = 20 + i * 54;
    return svgTxt(10, y - 6, t, { a: "start", s: 11, c: "var(--tinta)" }) + ["MBA", "MBR", "MBG"].filter((g) => p[g] > 0).map((g) => { const w = p[g] * 380, s = `<rect x="${x}" y="${y}" width="${w - 2}" height="26" rx="4" style="fill:${col[g]}"/>${svgTxt(x + w / 2, y + 17, `${nom[g]} ${Math.round(p[g] * 100)} %`, { c: g === "MBG" ? "var(--tinta)" : "#fff", s: 11, w: 800 })}`; x += w; return s; }).join("");
  }).join("")}</svg>`, "Tabla 1 · Peso de cada grupo de medidas en la calificación final (MBA animal, MBR recursos, MBG gestión).");
}

/** Tabla 2: banda de clasificación con un marcador opcional. */
function escalaSVG(total) {
  const X0 = 10, X1 = 390, x = (v) => X0 + (v / 100) * (X1 - X0);
  const seg = [[0, 50, "Bajo", "var(--rojo)"], [50, 75, "Medio", "#A8A600"], [75, 90, "Alto", "var(--siembra)"], [90, 100, "Exc.", "var(--campo)"]];
  return figura(`<svg viewBox="0 0 400 78" role="img" aria-label="Clasificación de la Tabla 2">
    ${seg.map(([a, b, t, c]) => `<rect x="${x(a)}" y="18" width="${x(b) - x(a) - 1}" height="22" style="fill:${c}"/>${svgTxt((x(a) + x(b)) / 2, 33, t, { c: "#fff", s: 10, w: 900 })}`).join("")}
    ${[0, 50, 75, 90, 100].map((v) => svgTxt(x(v), 56, v, { s: 10, w: 700 })).join("")}
    ${total != null ? `<path d="M${x(total)} 16 l-6 -10 h12 z" style="fill:var(--tinta)"/>${svgTxt(Math.min(345, Math.max(45, x(total))), 74, `Puntaje ${fmt(total)}`, { c: "var(--tinta)", s: 11, w: 900 })}` : ""}</svg>`,
    "Tabla 2 · Excelente ≥ 90 · Alto ≥ 75 y < 90 · Medio ≥ 50 y < 75 · Bajo < 50.");
}

/** Evolución del puntaje total de una finca (historial real de evaluaciones). */
function evolucionSVG(puntos) {
  if (!puntos.length) return '<p class="muted">Todavía no hay evaluaciones para graficar.</p>';
  const X0 = 36, X1 = 384, Y0 = 150, Y1 = 12, n = puntos.length;
  const x = (i) => (n === 1 ? (X0 + X1) / 2 : X0 + 22 + (i / (n - 1)) * (X1 - X0 - 40)), y = (v) => Y0 - (v / 100) * (Y0 - Y1);
  const bandas = [[0, 50, "rgba(138,52,49,.07)"], [50, 75, "rgba(168,166,0,.08)"], [75, 90, "rgba(134,179,39,.10)"], [90, 100, "rgba(4,140,56,.12)"]];
  return figura(`<svg viewBox="0 0 400 178" role="img" aria-label="Evolución del puntaje">
    ${bandas.map(([a, b, c]) => `<rect x="${X0}" y="${y(b)}" width="${X1 - X0}" height="${y(a) - y(b)}" style="fill:${c}"/>`).join("")}
    ${[0, 50, 75, 90, 100].map((v) => svgTxt(X0 - 6, y(v) + 4, v, { a: "end", s: 9, w: 600 })).join("")}
    ${n > 1 ? `<polyline points="${puntos.map((p, i) => `${x(i)},${y(p[1])}`).join(" ")}" style="fill:none;stroke:var(--semilla);stroke-width:2.5"/>` : ""}
    ${puntos.map(([l, v, prov], i) => `<circle cx="${x(i)}" cy="${y(v)}" r="5.5" style="fill:${clasificar(v)[1]};stroke:#fff;stroke-width:2"><title>${l}: ${fmt(v)} puntos · ${clasificar(v)[0]}${prov ? " (provisional)" : ""}</title></circle>${svgTxt(x(i), y(v) < 26 ? y(v) + 20 : y(v) - 10, fmt(v) + (prov ? "*" : ""), { c: "var(--tinta)", s: 10, w: 900 })}${svgTxt(Math.min(x(i), 398 - esc(l).length * 2.8), 170, esc(l), { s: 10, w: 600 })}`).join("")}</svg>`,
    "Bandas de color = niveles de la Tabla 2. * resultado preliminar o provisional.");
}

/** Banda de una escala por porcentaje: recorre 0–100 % con la regla del indicador y pinta el nivel que corresponde. */
function bandaReglaSVG(ind) {
  const m = ind.m; if (m.kind !== "pct" || !RULES[m.rule]) return "";
  const conX = !!m.extra, filas = conX ? [[true, "Con «" + m.extra.toLowerCase() + "»"], [false, "Sin esa condición"]] : [[false, ""]];
  const X0 = conX ? 130 : 14, X1 = 382, x = (v) => X0 + (v / 100) * (X1 - X0);
  const tramo = (cx) => { const segs = []; let ini = 0, lv = RULES[m.rule](0, cx);
    for (let v = 0.25; v <= 100.001; v += 0.25) { const l = RULES[m.rule](v, cx); if (l !== lv) { segs.push([ini, v, lv]); ini = v; lv = l; } }
    segs.push([ini, 100, lv]); return segs; };
  const H = 24, alto = filas.length * (H + 8) + 26;
  return figura(`<svg viewBox="0 0 400 ${alto}" role="img" aria-label="Niveles según el porcentaje">${filas.map(([cx, t], i) => {
    const y = 4 + i * (H + 8);
    return (t ? svgTxt(X0 - 6, y + 16, t.length > 26 ? t.slice(0, 25) + "…" : t, { a: "end", s: 9 }) : "") + tramo(cx).map(([a, b, lv]) => `<rect x="${x(a)}" y="${y}" width="${Math.max(1, x(b) - x(a) - 1)}" height="${H}" style="fill:${C_NIVEL[lv]}"><title>${fmt(a)} % a ${fmt(b)} %: ${lv} puntos</title></rect>${x(b) - x(a) > 22 ? svgTxt((x(a) + x(b)) / 2, y + 16, lv, { c: lv === 55 ? "var(--tinta)" : "#fff", s: 10, w: 900 }) : ""}`).join("");
  }).join("")}${[0, 20, 40, 60, 80, 100].map((v) => svgTxt(x(v), alto - 6, v + " %", { s: 9, w: 600 })).join("")}</svg>`,
    `Puntos que da cada porcentaje (${esc(m.part.toLowerCase())} ÷ ${esc(m.total.toLowerCase())}).`);
}

/** Ilustración 4 (6.1.12): esquema de pocetas, estanques o lagos. */
function pocetaSVG() {
  return figura(`<svg viewBox="0 0 400 130" role="img" aria-label="Esquema de poceta con rampas">
    <path d="M10 40 H130 L190 112 H300 L360 40 H390" style="fill:none;stroke:var(--tierra);stroke-width:2.5"/>
    <path d="M118 40 L180 112 H310 L372 40 Z" style="fill:rgba(40,90,90,.18)"/>
    <line x1="118" y1="40" x2="372" y2="40" style="stroke:var(--azul);stroke-width:2;stroke-dasharray:6 4"/>
    ${svgTxt(245, 30, "Superficie del agua", { c: "var(--azul)", s: 11 })}
    <line x1="245" y1="44" x2="245" y2="108" style="stroke:var(--tinta);stroke-width:1.5"/><path d="M245 44 l-4 7 h8 z M245 108 l-4 -7 h8 z" style="fill:var(--tinta)"/>
    ${svgTxt(252, 80, "≥ 10 cm", { a: "start", c: "var(--tinta)", s: 12, w: 900 })}
    ${svgTxt(150, 92, "Rampa de ingreso", { s: 10 })}${svgTxt(342, 92, "Rampa de salida", { s: 10 })}</svg>`,
    "Ilustración 4 (6.1.12): profundidad mínima de 10 cm, rampas de ingreso y salida y drenaje que evite encharcamientos.");
}
