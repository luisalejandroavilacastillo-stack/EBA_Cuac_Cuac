/* EBA Patos y Gansos · ICA — js/ui/capas.js
   Capas de interfaz: avisos, ventanas modales y cajón de ayuda de la norma. */
"use strict";

/* ---------------- capas: toast, modal, cajón de ayuda ---------------- */
function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.setAttribute("role", "status"); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
function cerrarCapas() { capas.innerHTML = ""; }
function modal(html, alAbrir) {
  capas.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div>${html}</div></div>`;
  capas.querySelector(".modal").addEventListener("click", (e) => { if (e.target.classList.contains("modal")) cerrarCapas(); });
  const f = capas.querySelector("button, input"); if (f) f.focus();
  alAbrir && alAbrir(capas);
}
function modalSesion() {
  modal(`<h3>Su sesión está por cerrarse</h3><p>Por seguridad, la sesión se cierra tras 15 minutos sin actividad. Lo diligenciado ya está guardado.</p>
    <div class="acciones"><button class="btn btn-sec" data-a="salir">Cerrar sesión</button><button class="btn btn-primario" data-a="seguir">Seguir trabajando</button></div>`, (c) => {
    c.querySelector('[data-a="salir"]').onclick = () => cerrarSesion("Cierre de sesión");
    c.querySelector('[data-a="seguir"]').onclick = () => { restante = LIMITE; cerrarCapas(); };
  });
}
/** Ficha de un indicador (RN-155): texto de la norma, datos de la ficha, cálculo, escala, gráfica y nota de interpretación.
 *  completa = true en el centro de ayuda (incluye ilustraciones grandes). */
function fichaHTML(ind, completa) {
  const esc_ = ind.escala.map(([p, t]) => `<tr style="--c:${COL[p]}"><td>${p}</td><td>${esc(t)}</td></tr>`).join("");
  const desc = (typeof DESC_NORMA !== "undefined" && DESC_NORMA[ind.num]) || "";
  let fig = "";
  if (ind.m.kind === "pct") fig = bandaReglaSVG(ind);
  if (ind.m.kind === "density") fig = densidadSVG(null, null);
  if (ind.code === "PA11") fig = `<img class="img-norma" src="img/norma/ilustracion5_condicion_corporal.png" alt="Ilustración 5: escala de condición corporal de 1 a 5"><p class="muted" style="font-size:12px">Ilustración 5 · Adaptado de University of Bristol 2020.</p>`;
  if (ind.code === "PR12") fig = pocetaSVG();
  if (/muestreo/i.test(ind.metodo) && ind.sp === "pato" && ind.m.kind === "units") fig += `<img class="img-norma" style="max-width:420px;margin-top:10px" src="img/norma/ilustracion3_punto_muestreo.png" alt="Ilustración 3: esquema del punto de muestreo"><p class="muted" style="font-size:12px">Ilustración 3 · Esquema del punto de muestreo (ICA 2024).</p>`;
  /* Interpretaciones del equipo (erratas de la norma, centro de ayuda) que afectan a este indicador: muestreo y varios galpones. */
  const interp = typeof ERRATAS === "undefined" ? [] : ERRATAS.filter(([sec]) => (sec === "5.6 y Tabla 3" && /con muestreo/i.test(ind.metodo))
    || (sec === "5.4 · Varios galpones" && ind.g !== "MBG" && !/^inspección documental/i.test(ind.metodo)));
  return `<p class="pregunta">${esc(ind.q)}</p>
    ${desc ? `<h3 style="margin:14px 0 6px">Descripción del indicador (texto de la norma)</h3><div class="texto-norma">${esc(desc)}</div>` : ""}
    <dl style="margin-top:16px"><dt>Numeral</dt><dd>${esc(ind.num)} · Tabla ${esc(ind.tabla)}</dd><dt>Medida</dt><dd>${ind.g} · ${MEDIDA[ind.g]}</dd>
    <dt>Grupo productivo</dt><dd>${esc(ind.prod)}</dd><dt>Método</dt><dd>${esc(ind.metodo)}</dd><dt>Unidad de muestreo</dt><dd>${esc(ind.unidad)}</dd>
    <dt>Cuándo aplica</dt><dd>${esc(ind.cond)}${ind.trasp ? "" : " · No se evalúa en traspatio (menos de 200 aves)"}</dd><dt>Cálculo</dt><dd>${esc(ind.formula)}</dd></dl>
    <h3 style="margin:6px 0 8px">Escala de calificación (Tabla ${esc(ind.tabla)})</h3><table class="tabla tabla-escala"><tbody>${esc_}</tbody></table>
    ${ind.nota ? `<div class="nota-norma"><b>Nota de interpretación:</b> ${esc(ind.nota)}</div>` : ""}
    ${interp.length ? `<h3 style="margin:16px 0 6px">Interpretación del equipo</h3>${interp.map(([sec, , res]) => `<div class="nota-norma nota-interp"><b>${esc(sec)}:</b> ${esc(res)}</div>`).join("")}<p class="muted" style="font-size:12px">Aclaraciones donde la norma es ambigua o tiene erratas.</p>` : ""}
    ${fig ? `<h3 style="margin:16px 0 4px">Gráfica</h3>${fig}` : ""}`;
}
/** Ficha del indicador que se está evaluando, en un panel lateral sobre la pantalla actual (también sobre una ventana
 *  flotante): no navega a otro módulo ni hace perder el avance. La norma completa solo está en «Ayuda de la norma». */
function fichaIndicador(code) {
  const ind = IND[code]; if (!ind) return;
  let capa = document.getElementById("capa-ficha");
  if (!capa) { capa = document.createElement("div"); capa.id = "capa-ficha"; document.body.appendChild(capa); }
  capa.innerHTML = `<div class="cajon cajon-ficha" role="dialog" aria-modal="true" aria-label="Ficha del indicador"><div class="velo"></div><aside>
    <div class="cajon-cab"><div><small>Ficha del indicador · ${ind.sp === "pato" ? "Patos" : "Gansos"} · ${ind.g}</small><h2>${esc(ind.num + " " + ind.name)}</h2></div>
    <button class="btn btn-sec btn-chico" data-xf>Cerrar</button></div><div class="cajon-cuerpo">${fichaHTML(ind)}</div></aside></div>`;
  const cerrar = () => { capa.innerHTML = ""; };
  capa.querySelectorAll("[data-xf], .velo").forEach((b) => (b.onclick = cerrar));
  capa.querySelector("[data-xf]").focus();
}
const ayuda = (code) => fichaIndicador(code);
/** Botón «?» que abre la ficha del indicador sin salir de la pantalla. */
const btnFicha = (code) => `<button type="button" class="btn-ficha no-imprimir" data-fichaind="${code}" title="Ficha del indicador" aria-label="Ficha del indicador ${IND[code] ? IND[code].num : ""}">?</button>`;
if (typeof document !== "undefined") {
  // botón «?» de ficha junto a cada indicador (recorrido, ventanas flotantes)
  document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-fichaind]"); if (!b) return; e.preventDefault(); e.stopPropagation(); fichaIndicador(b.dataset.fichaind); }, true);
  window.addEventListener("hashchange", () => { const c = document.getElementById("capa-ficha"); if (c) c.innerHTML = ""; });
  document.addEventListener("keydown", (e) => { const c = document.getElementById("capa-ficha"); if (e.key === "Escape" && c && c.innerHTML) { e.stopImmediatePropagation(); c.innerHTML = ""; } }, true);
}
