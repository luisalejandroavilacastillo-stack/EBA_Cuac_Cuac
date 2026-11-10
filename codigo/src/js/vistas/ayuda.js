/* EBA Patos y Gansos · ICA — js/vistas/ayuda.js
   Centro de ayuda de la norma: texto de la metodología, tablas 1 a 4 y 39, muestreo, cálculo paso a paso con calculadora,
   densidad, condición corporal, erratas e interpretaciones, y la ficha completa de cada indicador. */
"use strict";

const PDF_NORMA = "norma/Metodologia-EBA-Patos-y-Gansos-ICA-2024.pdf";
const SECC_AYUDA = [["norma", "La norma"], ["fases", "Fases de la visita"], ["muestreo", "Muestreo (Tabla 3)"], ["calculo", "Cálculo y clasificación"],
  ["indicadores", "Indicadores (Tablas 4 y 39)"], ["densidad", "Densidad (6.1.11)"], ["condicion", "Condición corporal"], ["erratas", "Erratas e interpretaciones"]];

/** Erratas e inconsistencias del documento y cómo las resuelve el prototipo. */
const ERRATAS = [
  ["2. Objetivo", "Dice «sistemas de producción porcícola».", "Es una errata heredada de otra metodología: el alcance es patos y gansos (Introducción y 1. Justificación)."],
  ["5, 5.3, 5.4, 5.6 y Tabla 1", "El corte entre traspatio y comercial aparece como «menos de 199», «199 o más», «más de 199», «menor a 200» y «≥ 299».", "Un solo corte en todo el prototipo: menos de 200 aves = traspatio; 200 o más = comercial (tramo, pesos, muestreo y medidas de gestión). El «≥ 299» de la Tabla 1 es una errata de «≥ 200»."],
  ["5.6 y Tabla 3", "La Tabla 3 da un «tamaño de la muestra» de 5 y 10, pero el texto de 5.6 dice «se evaluarán cinco (5) aves por punto» (con 2 galpones × 5 puntos serían 50).", "Decisión del equipo: siempre 5 aves por punto (texto de 5.6) y la Tabla 3 define galpones y puntos; su «tamaño de la muestra» es el mínimo (5.3 habla de «tamaño de muestra mínimo»). Con 200 o más: 2 galpones × 5 puntos × 5 aves = 50 (25 por galpón). Con menos de 200 y corral: 3 puntos × 5 aves = 15. Sin corral: de 1 a 3 puntos y de 2 a 5 aves por punto. Si la especie tiene menos aves, se evalúan todas, repartidas entre los puntos."],
  ["5.4 · Varios galpones", "No dice cómo se combinan dos galpones en un mismo indicador.", "El puntaje de la finca es uno solo. Las aves y recursos de los dos galpones cuentan igual (promedio); jadeo y amontonamiento suman los conteos; las condiciones del predio (alojamiento, bebederos y comederos por ave, confort térmico, pocetas) se califican una sola vez para todo el predio; cama, bebederos y nidales se registran en el recurso más cercano a cada punto y el comedero una vez por galpón. Si un galpón queda más de 10 puntos por debajo de la finca, o en un nivel más bajo con al menos 5 puntos de diferencia, el sistema muestra una alerta que exige observación."],
  ["5.4 Puntuación", "No dice cómo se combina cada indicador dentro de su grupo.", "Promedio simple de los indicadores aplicables (RN-90 y RN-120); los indicadores que no aplican no entran al promedio. Igual que en el prototipo de aves de corral."]
];

function vAyuda(clave) {
  const ind = clave && IND[clave];
  const sec = ind ? null : SECC_AYUDA.some(([k]) => k === clave) ? clave : "norma";
  const cap = (sp, g) => NORMA.filter((i) => i.sp === sp && i.g === g);
  const bloque = (sp) => ["MBR", "MBA", "MBG"].map((g) => `<div class="grupo-ind"><h4>${CAP[sp][g]} · ${MEDIDA[g]}</h4>${cap(sp, g).map((i) => `<button class="item-ind" data-c="${i.code}" ${i.code === clave ? 'aria-current="true"' : ""}><span class="punto" style="--c:${i.nota ? "var(--cosecha)" : "var(--siembra)"}"></span><span>${esc(i.name)}</span><span class="n">${i.num}</span></button>`).join("")}</div>`).join("");
  const tabs = `<nav class="ayuda-tabs" aria-label="Secciones de la ayuda">${SECC_AYUDA.map(([k, t]) => `<a href="#/ayuda/${k}" ${k === sec ? 'aria-current="page"' : ""}>${t}</a>`).join("")}</nav>`;
  const cuerpo = ind ? `<article class="ficha"><header class="ficha-cab"><div><div class="num">${ind.num} · Tabla ${esc(ind.tabla)} · ${ind.sp === "pato" ? "Patos" : "Gansos"} · ${ind.g}</div><h2>${esc(ind.name)}</h2></div>
      <a class="btn btn-sec btn-chico" href="${PDF_NORMA}" target="_blank" rel="noopener">Ver en el PDF</a></header><div class="cajon-cuerpo">${fichaHTML(ind, true)}</div></article>` : SECCIONES_AYUDA[sec]();
  shell("ayuda", `<a href="#/ayuda">Ayuda de la norma</a>${ind ? ` / <b>${ind.num} ${esc(ind.name)}</b>` : ` / <b>${SECC_AYUDA.find(([k]) => k === sec)[1]}</b>`}`,
    `<div class="encabezado"><div><h1>Ayuda de la norma</h1><p>Metodología para evaluar el bienestar animal en patos y gansos · ICA, versión 1.0 (2024). Texto, tablas, gráficas y la forma en que el prototipo calcula cada puntaje.</p></div>
      <a class="btn btn-primario" href="${PDF_NORMA}" target="_blank" rel="noopener">Abrir la norma (PDF)</a></div>${tabs}
    <div class="eval"><nav class="panel indice" aria-label="Fichas de los indicadores"><div class="indice-cab"><b>Fichas de los 58 indicadores</b><br><small>Patos (numeral 6) y gansos (numeral 7) · punto amarillo = tiene nota de interpretación</small></div>
      <div class="grupo-ind"><h4>Patos</h4></div>${bloque("pato")}<div class="grupo-ind"><h4>Gansos</h4></div>${bloque("ganso")}</nav>
    <div>${cuerpo}</div></div>`);
  raiz.querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => (location.hash = `#/ayuda/${b.dataset.c}`)));
  if (sec === "calculo") calculadoraAyuda();
}

const SECCIONES_AYUDA = {
  norma() {
    const n = (sp, g) => NORMA.filter((i) => i.sp === sp && i.g === g).length;
    return `<section class="panel"><h3>Objetivo y alcance</h3>
      <p class="texto-norma">Establecer los indicadores basados en el animal, basados en los recursos y basados en la gestión, teniendo como guía los marcos conceptuales de las 5 libertades y 5 dominios, cuya evaluación integral permitirá determinar el estado de bienestar […] y clasificar los predios utilizando una escala de 4 categorías: Excelente bienestar, alto, medio y bajo bienestar.</p>
      <p>Se aplica a patos (<i>Cairina moschata</i> y <i>Anas platyrhynchos domesticus</i>) y gansos (<i>Anser anser</i>, <i>Alopochen aegyptiaca</i>) en predios de producción primaria, en el marco del artículo 4 de la Resolución 204 de 2022 del MADR.</p></section>
    <div class="rejilla r-2"><section class="panel"><h3>Las cinco libertades</h3><ul style="margin:0;padding-left:18px"><li>Libre de hambre, sed y desnutrición</li><li>Libre de molestias físicas y térmicas</li><li>Libre de dolor, lesión y enfermedad</li><li>Libre de impedimentos de manifestar un comportamiento natural</li><li>Libre de temor y angustia</li></ul></section>
      <section class="panel"><h3>Grupos de medidas e indicadores</h3><table class="tabla"><thead><tr><th>Grupo</th><th class="num">Patos</th><th class="num">Gansos</th></tr></thead><tbody>
        ${["MBR", "MBA", "MBG"].map((g) => `<tr><td><b>${g}</b> · ${MEDIDA[g]}</td><td class="num">${n("pato", g)}</td><td class="num">${n("ganso", g)}</td></tr>`).join("")}
        <tr><td><b>Total</b></td><td class="num"><b>${NORMA.filter((i) => i.sp === "pato").length}</b></td><td class="num"><b>${NORMA.filter((i) => i.sp === "ganso").length}</b></td></tr></tbody></table>
        <p class="muted" style="margin-top:8px;font-size:13px">Con menos de 200 aves (traspatio) no se evalúan las medidas de gestión.</p></section></div>
    <div class="rejilla r-2"><section class="panel"><h3>Métodos de evaluación (5.3)</h3><table class="tabla"><tbody>
        <tr><td><b>Inspección documental</b></td><td>Solo con 200 aves o más. Procedimientos, registros y resultados de laboratorio; se complementa con entrevista.</td></tr>
        <tr><td><b>Visual sin muestreo</b></td><td>El evaluador verifica los requisitos mientras recorre galpones, corrales, pocetas y nidales.</td></tr>
        <tr><td><b>Visual con muestreo</b></td><td>Sobre una muestra representativa de animales o recursos, según la Tabla 3.</td></tr></tbody></table></section>
      <section class="panel"><h3>Puntuación de los indicadores (5.4)</h3>
        <p class="texto-norma">Cuando no se cumple con los indicadores mínimos del manual, se obtienen cero (0) puntos. Donde solo se evalúa el cumplimiento o incumplimiento, cero (0) puntos corresponden a incumplimiento y cien (100) puntos a cumplimiento. Para los indicadores cuantificables, se puede optar a los valores de cero (0), cincuenta y cinco (55) y cien (100) puntos.</p>
        <p class="muted" style="font-size:13px">En gansos varias tablas agregan un nivel de 20 puntos (Tablas 42 a 64).</p></section></div>`;
  },
  fases() {
    return `<section class="panel"><h3>Ilustración 1 · Etapas del proceso de evaluación (5.5)</h3><table class="tabla"><thead><tr><th>Fase</th><th>Qué se hace</th><th>En el prototipo</th></tr></thead><tbody>
      <tr><td><b>I · Apertura</b></td><td>Presentación del evaluador, entrevista corta, selección del corral (si hay) y datos generales del predio.</td><td>Pantalla «Apertura y muestreo»: persona que atiende, aves del día y plan de muestreo.</td></tr>
      <tr><td><b>II · Inspección</b></td><td>Observación del ambiente productivo y de los animales sin alterar su rutina, con técnicas que disminuyan el dolor y el estrés.</td><td>Una pantalla por numeral; el sistema calcula el nivel con lo observado.</td></tr>
      <tr><td><b>III · Inspección documental</b></td><td>Solo con 200 aves o más. Documentos legibles, sin correcciones ni agregados y firmados; si firma un MV, MVZ o Z, con matrícula COMVEZCOL vigente.</td><td>Indicadores MBG con estado del documento y requisitos.</td></tr>
      <tr><td><b>IV · Cierre</b></td><td>Cálculo de los indicadores, calificación final, socialización con el productor y copia de la forma oficial. Los documentos pendientes se entregan en 1 día hábil.</td><td>Cierre con validación y firmas; resultado provisional mientras haya documentos pendientes.</td></tr></tbody></table></section>
      <section class="panel"><h3>Seguimiento y continuidad (regla del proyecto)</h3><p>Cada finca y especie se evalúa por <b>procesos</b>. <b>Al finalizar cada visita el sistema verifica si la finca cumple</b>: puntaje de ${CRITERIO_CUMPLE.puntajeMin} o más (nivel Excelente), ningún indicador en 0 y sin información pendiente. Si cumple, el proceso queda <b>Cumplido</b>, no pide más seguimientos y su resultado final es el de esa visita. Si no cumple, se programan hasta <b>${SEGUIMIENTOS_BASE} visitas de seguimiento</b>; si al tercero aún no cumple, el coordinador o el administrador puede <b>ampliar a ${MAX_SEGUIMIENTOS}</b> dejando un motivo. Agotados, el proceso queda «Cerrado sin cumplir» con el resultado de la última visita.</p>
        <p>Cada seguimiento retoma lo registrado en la visita anterior; el inspector actualiza lo que cambió y cada indicador muestra el puntaje anterior. Las visitas finalizadas no se modifican y quedan en el histórico para ver la evolución de la finca.</p></section>
      <section class="panel"><h3>Conducta del evaluador</h3><p class="texto-norma">Todo el proceso debe realizarse en completa libertad y autonomía con respecto al personal de la granja o predio de traspatio, evitando dar explicaciones de los datos registrados u otros detalles del proceso de evaluación. Por lo tanto, el inspector no debe discutir ni entrar en polémica o controversia con el personal y debe mantener una actitud respetuosa, armónica, profesional y neutral.</p></section>`;
  },
  muestreo() {
    const p1 = planMuestreo(150, true), p2 = planMuestreo(800, true), p3 = planMuestreo(40, false);
    return `<section class="panel"><h3>Tabla 3 · Número de galpones o corrales a inspeccionar</h3><div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Población total de patos y gansos</th><th class="num">Galpones o corrales</th><th class="num">Puntos por galpón</th><th class="num">Tamaño de la muestra (Tabla 3)</th><th class="num">Aves por punto</th><th class="num">Aves que pide el prototipo</th></tr></thead><tbody>
      <tr><td>Menos de 200 (la norma escribe «menos de 199»)</td><td class="num">1</td><td class="num">3</td><td class="num">5 (mínimo)</td><td class="num">5</td><td class="num"><b>15</b></td></tr>
      <tr><td>200 o más (la norma escribe «199 o más»)</td><td class="num">2</td><td class="num">5</td><td class="num">10 (mínimo)</td><td class="num">5 (texto de 5.6)</td><td class="num"><b>50</b> (25 por galpón)</td></tr>
      <tr><td>Sin corral (cualquier población)</td><td class="num">—</td><td class="num">1 a 3</td><td class="num">—</td><td class="num">2 a 5</td><td class="num"><b>3 a 15</b></td></tr></tbody></table></div>
      <p class="muted" style="margin-top:8px;font-size:13px">Si la especie tiene menos aves que la muestra, se evalúan todas. Se priorizan las aves de mayor edad.</p></section>
    <div class="rejilla r-3"><section class="panel"><h3>Menos de 200 con corral</h3>${muestreoSVG(p1)}</section><section class="panel"><h3>200 o más</h3>${muestreoSVG(p2)}</section><section class="panel"><h3>Sin corral</h3>${muestreoSVG(p3)}</section></div>
    <div class="rejilla r-2"><section class="panel"><h3>Texto de la norma (5.6)</h3><p class="texto-norma">En caso que SI exista corral y se tengan más de 199 aves: se prioriza la selección de las aves de mayor edad. En cada corral se seleccionará cinco (5) puntos al azar, pero se recomienda seleccionar puntos de los extremos y en el centro del galpón […], iniciando el recorrido por la entrada más cercana del galpón. Se evaluarán de cinco (5) aves por punto.

En caso de que NO exista corral: se deben definir como mínimo entre 1 y 3 puntos de inspección […]. Se debe evaluar entre 2 a 5 aves por punto. Se debe priorizar la selección de las aves de mayor edad. Se deben evaluar todos los recursos que estén disponibles para proveer bienestar a las aves (instalaciones, comederos, bebederos, perchas, sombra, nidales).</p></section>
      <section class="panel"><h3>Ilustración 3 · Esquema del punto de muestreo</h3><img class="img-norma" src="img/norma/ilustracion3_punto_muestreo.png" alt="Ilustración 3 de la norma: desde el punto central se revisan bebedero, comedero, cama, pocetas y nidal">
        <p class="muted" style="font-size:12px;margin-top:6px">Fuente: ICA 2024. Desde cada punto se revisan los recursos más cercanos: bebedero, comedero, cama, poceta y nidal.</p>
        <table class="tabla" style="margin-top:10px"><thead><tr><th>Recurso</th><th>Cuántos se revisan</th></tr></thead><tbody>
        <tr><td>Bebederos (6.1.3 y 6.1.5)</td><td>2 a 4 más cercanos a cada punto (el prototipo pide 2); en traspatio, todos.</td></tr>
        <tr><td>Comederos (6.1.7)</td><td>El más cercano a cada punto; en traspatio, todos.</td></tr><tr><td>Cama (6.1.2) y nidal (6.1.10)</td><td>Uno por punto.</td></tr></tbody></table></section></div>`;
  },
  calculo() {
    const ej = EVALS.find((e) => e.sp === "pato" && e.estado !== "Programada");
    let ejemplo = "";
    if (ej) {
      const r = resultado(ej), gs = ["MBA", "MBR", "MBG"].filter((g) => r.pesos[g] > 0);
      ejemplo = `<section class="panel"><h3>Ejemplo con datos reales: ${ej.id}</h3><p class="muted">${esc(r.ctx.f.nombre)} · ${r.ctx.tramo} · ${r.pend ? `${r.pend} indicadores sin calificar (resultado preliminar)` : "todos los indicadores calificados"}</p>
        <div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Grupo</th><th class="num">Indicadores calificados</th><th class="num">Suma de puntajes</th><th class="num">Promedio del grupo</th><th class="num">Peso</th><th class="num">Aporte</th></tr></thead><tbody>
        ${gs.map((g) => { const f = r.filas.filter((x) => x.ind.g === g), s = f.reduce((a, x) => a + x.score, 0); return `<tr><td><b>${g}</b></td><td class="num">${f.length} de ${r.aplican[g]}</td><td class="num">${fmt(s)}</td><td class="num">${fmt(s)} ÷ ${f.length} = <b>${fmt(r.med[g], 2)}</b></td><td class="num">${r.pesos[g] * 100} %</td><td class="num">${fmt(r.med[g], 2)} × ${String(r.pesos[g]).replace(".", ",")} = <b>${fmt(r.aporte[g], 2)}</b></td></tr>`; }).join("")}
        <tr><td colspan="5"><b>Total</b> (redondeado a 1 decimal)</td><td class="num"><b>${fmt(r.total)}</b> · ${r.nivel[0]}</td></tr></tbody></table></div>${escalaSVG(r.total)}</section>`;
    }
    return `<section class="panel"><h3>Cómo se llega al puntaje final</h3>
      <div class="paso-calc"><span class="n">1</span><div><b>Puntaje de cada indicador (0 a 100)</b><p>Se toma de su tabla. Si se evalúa por unidades (aves, bebederos, puntos), es el promedio de las unidades: por ejemplo, 4 aves con 100 y 1 con 55 dan (4 × 100 + 1 × 55) ÷ 5 = 91.</p></div></div>
      <div class="paso-calc"><span class="n">2</span><div><b>Puntaje de cada grupo de medidas</b><div class="formula-grande">Puntaje MBx = (suma de los puntajes de sus indicadores aplicables) ÷ (número de indicadores aplicables)</div><p class="muted">Los indicadores que no aplican en la finca no entran al promedio.</p></div></div>
      <div class="paso-calc"><span class="n">3</span><div><b>Puntaje total con los pesos de la Tabla 1</b><div class="formula-grande">Comercial: Total = 0,60 × MBA + 0,25 × MBR + 0,15 × MBG<br>Traspatio: Total = 0,70 × MBA + 0,30 × MBR</div><p class="muted">Se redondea a 1 decimal (0,05 sube) antes de clasificar.</p></div></div>
      <div class="paso-calc" style="border:0"><span class="n">4</span><div><b>Nivel de bienestar con la Tabla 2</b><p>Excelente ≥ 90 · Alto ≥ 75 y &lt; 90 · Medio ≥ 50 y &lt; 75 · Bajo &lt; 50.</p></div></div></section>
    <div class="rejilla r-2"><section class="panel"><h3>Tabla 1 · Pesos</h3><table class="tabla"><thead><tr><th>Medidas</th><th class="num">200 aves o más</th><th class="num">Menos de 200</th></tr></thead><tbody>
        <tr><td>Basadas en el animal (MBA)</td><td class="num">60 %</td><td class="num">70 %</td></tr><tr><td>Basadas en los recursos (MBR)</td><td class="num">25 %</td><td class="num">30 %</td></tr><tr><td>Basadas en la gestión (MBG)</td><td class="num">15 %</td><td class="num">0 %</td></tr></tbody></table>${pesosSVG()}</section>
      <section class="panel"><h3>Tabla 2 · Clasificación final</h3><table class="tabla"><thead><tr><th>Nivel de bienestar animal</th><th class="num">Rango (%)</th></tr></thead><tbody>
        <tr><td>Excelente</td><td class="num">≥ 90</td></tr><tr><td>Alto</td><td class="num">≥ 75 y &lt; 90</td></tr><tr><td>Medio</td><td class="num">≥ 50 y &lt; 75</td></tr><tr><td>Bajo</td><td class="num">&lt; 50</td></tr></tbody></table>${escalaSVG(null)}</section></div>
    <section class="panel"><h3>Calculadora</h3><p class="muted">Escriba el promedio de cada grupo para ver el total y el nivel.</p>
      <div class="calc-demo"><div class="campo" style="margin:0"><label for="cTr">Tramo</label><select id="cTr"><option value="comercial">Comercial (200 o más)</option><option value="traspatio">Traspatio (menos de 200)</option></select></div>
        <div class="campo" style="margin:0"><label for="cA">MBA</label><input id="cA" type="number" min="0" max="100" step="0.1" value="80"></div>
        <div class="campo" style="margin:0"><label for="cR">MBR</label><input id="cR" type="number" min="0" max="100" step="0.1" value="70"></div>
        <div class="campo" style="margin:0"><label for="cG">MBG</label><input id="cG" type="number" min="0" max="100" step="0.1" value="60"></div></div>
      <div id="cOut" style="margin-top:12px"></div></section>${ejemplo}`;
  },
  indicadores() {
    const tabla = (sp) => `<div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Numeral</th><th>Indicador</th><th>Tabla</th><th>Método</th><th class="num">Huevo</th><th class="num">Carne</th><th>Traspatio</th></tr></thead><tbody>
      ${["MBR", "MBA", "MBG"].map((g) => `<tr><td colspan="7" style="background:var(--arena-claro);font-weight:900">${MEDIDA[g]} (${g})</td></tr>` + NORMA.filter((i) => i.sp === sp && i.g === g).map((i) => `<tr><td>${i.num}</td><td><a href="#/ayuda/${i.code}">${esc(i.name)}</a></td><td>${esc(i.tabla)}</td><td style="font-size:13px">${esc(i.metodo)}</td><td class="num">${i.app && i.app.proposito ? (i.app.proposito === "huevo" ? "SÍ" : "NO") : "SÍ"}</td><td class="num">${i.app && i.app.proposito === "huevo" ? "NO" : "SÍ"}</td><td>${i.trasp ? "Sí" : "No"}</td></tr>`).join("")).join("")}</tbody></table></div>`;
    return `<section class="panel"><h3>Tabla 4 · Indicadores para patos (numeral 6)</h3>${tabla("pato")}</section>
      <section class="panel"><h3>Tabla 39 · Indicadores para gansos (numeral 7)</h3><p class="muted" style="font-size:13px">La Tabla 39 se titula «aves patos», pero lista los indicadores de gansos. Aplican a todos los sistemas (cría, carne, huevo, plumas, hígado graso); 7.3.8 solo a intensivo y semi-intensivo.</p>${tabla("ganso")}</section>`;
  },
  densidad() {
    return `<div class="rejilla r-2"><section class="panel"><h3>Densidad de la población de patos según su peso</h3><table class="tabla"><thead><tr><th class="num">Peso de las aves (kg)</th><th class="num">Densidad máxima (kg/m²)</th><th class="num">Aves por m² equivalentes</th></tr></thead><tbody>
      ${DENS.map(([w, d]) => `<tr><td class="num">${fmt(w)}</td><td class="num"><b>${d}</b></td><td class="num">${fmt(d / w, 1)}</td></tr>`).join("")}</tbody></table>
      <p class="muted" style="font-size:12px;margin-top:6px">Fuente: Adaptado de Duck Standards © Assured Food Standards 2022 (numeral 6.1.11).</p>
      <div class="formula-grande">Densidad = número de aves × peso promedio (kg) ÷ área útil (m²)</div>
      <p>En pastoreo, el área útil es la suma del corral o galpón, los corrales exteriores y las pocetas. Si la densidad es menor o igual a la máxima para el peso: <b>100 puntos</b>; si es mayor: <b>0 puntos</b> (Tabla 15).</p>
      <p class="muted">Entre dos pesos de la tabla se interpola. Ejemplo: 2,2 kg → 18 + (2,2 − 2) ÷ 0,5 × (20 − 18) = 18,8 kg/m². 820 patos de 2,2 kg en 100 m² = 18,0 kg/m² → 100 puntos.</p></section>
      <section class="panel"><h3>Gráfica</h3>${densidadSVG(2.2, 18.04)}</section></div>`;
  },
  condicion() {
    return `<section class="panel"><h3>Ilustración 5 · Esquema de condición corporal</h3><img class="img-norma" src="img/norma/ilustracion5_condicion_corporal.png" alt="Ilustración 5: escala de condición corporal de 1 (delgado) a 5 (sobrepeso) según la forma de la quilla">
      <p class="muted" style="font-size:12px;margin-top:6px">Adaptado de: University of Bristol 2020.</p></section>
      <div class="rejilla r-2"><section class="panel"><h3>Tabla 27 · Carne</h3><table class="tabla tabla-escala"><tbody><tr style="--c:var(--n100)"><td>100</td><td>Puntuación 3 o 4</td></tr><tr style="--c:var(--n55)"><td>55</td><td>Puntuación 2</td></tr><tr style="--c:var(--n0)"><td>0</td><td>Puntuación 1 o 5</td></tr></tbody></table></section>
      <section class="panel"><h3>Tabla 28 · Huevo</h3><table class="tabla tabla-escala"><tbody><tr style="--c:var(--n100)"><td>100</td><td>Puntuación 2 o 3</td></tr><tr style="--c:var(--n55)"><td>55</td><td>Puntuación 4 (la norma escribe «5 punto»)</td></tr><tr style="--c:var(--n0)"><td>0</td><td>Puntuación 1 o 5</td></tr></tbody></table></section></div>
      <section class="panel"><h3>Cómo se califica</h3><p>Cada ave de la muestra se observa y se palpa sobre la quilla y recibe una puntuación de 1 a 5. La puntuación se convierte en puntos con la tabla del propósito productivo y el indicador es el promedio. Ejemplo (carne): aves con 3, 4, 3, 2 y 5 → 100, 100, 100, 55 y 0 → (300 + 55 + 0) ÷ 5 = 71.</p></section>`;
  },
  erratas() {
    const notas = NORMA.filter((i) => i.nota);
    return `<section class="panel"><h3>Erratas e interpretaciones aplicadas</h3><p class="muted">El documento tiene inconsistencias que cambian el cálculo. Esta tabla deja por escrito cómo las resuelve el prototipo, para validarlas con el ICA.</p>
      <div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Dónde</th><th>Qué dice la norma</th><th>Cómo lo aplica el prototipo</th></tr></thead><tbody>
      ${ERRATAS.map(([d, q, c]) => `<tr><td><b>${esc(d)}</b></td><td>${esc(q)}</td><td>${esc(c)}</td></tr>`).join("")}
      ${notas.map((i) => `<tr><td><a href="#/ayuda/${i.code}"><b>${i.num} · Tabla ${esc(i.tabla)}</b></a><br><span class="muted" style="font-size:12px">${esc(i.name)}</span></td><td colspan="2">${esc(i.nota)}</td></tr>`).join("")}
      <tr><td><b>6.1.6 · Tabla 10</b></td><td colspan="2">El protocolo de tratamiento del agua y sus registros solo se exigen con 200 aves o más. En traspatio se califica la fuente y el agua que se ofrece (limpia y apta = 100; sucia = 0); antes el traspatio quedaba en 0 por no tener registros.</td></tr>
      <tr><td><b>6.1.4 y 6.1.8 · Tablas 8 y 12</b></td><td colspan="2">«Entre 30 %» se entiende como un exceso de hasta el 30 % sobre el número de aves por bebedero o comedero que declara la granja. Si no hay bebederos o comederos, 0 puntos.</td></tr>
      <tr><td><b>7.2.5 · Tabla 51</b></td><td colspan="2">Sin gansos con lesiones en el pico = 100, aunque no se marque la casilla de funcionalidad (antes daba 20).</td></tr></tbody></table></div></section>`;
  }
};

function calculadoraAyuda() {
  const pinta = () => {
    const t = raiz.querySelector("#cTr").value, p = PESOS[t];
    const v = { MBA: +raiz.querySelector("#cA").value || 0, MBR: +raiz.querySelector("#cR").value || 0, MBG: +raiz.querySelector("#cG").value || 0 };
    raiz.querySelector("#cG").disabled = t === "traspatio";
    const total = redondear1(["MBA", "MBR", "MBG"].reduce((s, g) => s + p[g] * v[g], 0)), [niv] = clasificar(total);
    raiz.querySelector("#cOut").innerHTML = `<div class="formula-grande">${["MBA", "MBR", "MBG"].filter((g) => p[g] > 0).map((g) => `${String(p[g]).replace(".", ",")} × ${fmt(v[g])}`).join(" + ")} = <b>${fmt(total)}</b> → <b>${niv}</b></div>${escalaSVG(total)}`;
  };
  ["cTr", "cA", "cR", "cG"].forEach((id) => (raiz.querySelector("#" + id).oninput = pinta));
  pinta();
}
