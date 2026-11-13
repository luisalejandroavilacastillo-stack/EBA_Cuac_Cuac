/* EBA Patos y Gansos · ICA — js/vistas/ficha_ave.js
   Ficha del ave: la misma ventana para patos y gansos (v0.25). Un ave a la vez, un renglón por indicador,
   botones con texto y color (verde normal, amarillo intermedio, rojo grave) y un botón grande «Sin hallazgos · siguiente ave».
   Cada especie conserva lo que pide la norma: en patos cada indicador tiene sus niveles (6.2); en gansos se registra
   si el ganso tiene o no la novedad (7.2). Lo que cambia es solo la forma de llenarlo; el cálculo es el mismo. */
"use strict";

/**
 * Abre la ficha de las aves de un punto.
 * o = { lugar, n, k0, ed,
 *       filas(k) → [{ code, nombre, ops: [[valor, texto, nivel]], val }],   nivel 100 / 55 / 0 da el color
 *       set(k, code, valor), normal(k, soloFaltantes)  (deja el ave sin hallazgos; con soloFaltantes no toca lo ya marcado),
 *       extra(k) → html opcional bajo los renglones (observaciones), enlazarExtra(cont),
 *       puntoCompleto() → bool, ultimoPunto, alCerrar(k), alTerminarPunto() }
 */
function abrirFichaAves(o) {
  let k = Math.min(Math.max(0, o.k0 || 0), o.n - 1);
  const dis = o.ed ? "" : "disabled";
  const resumen = (j) => { const fs = o.filas(j), resp = fs.filter((f) => f.val != null), hall = resp.filter((f) => nivelDe(f) < 100);
    return { total: fs.length, hechos: resp.length, hall: hall.length, est: resp.length === fs.length ? "hecho" : resp.length ? "proceso" : "pend" }; };
  const nivelDe = (f) => { const op = f.ops.find(([v]) => v === f.val); return op ? op[2] : 100; };
  modal(`<div class="modal-cab"><div class="cab-aves"><div><small class="muted">${esc(o.lugar)}</small><h3 id="faTit"></h3><p id="faInfo" class="info-ave"></p></div>
      <button type="button" class="btn btn-sec btn-chico" id="faCerrar">Cerrar</button></div><div class="chips" id="faTabs" role="tablist" aria-label="Aves del punto"></div></div>
    <div class="modal-cuerpo" id="faCuerpo"></div><div class="acciones" id="faPie"></div>`, (c) => {
    const caja = c.querySelector(".modal > div"); caja.classList.add("modal-ancho", "modal-aves", "ficha-ave");
    caja.setAttribute("aria-label", `Aves de ${o.lugar}`);
    const cerrar = () => { cerrarCapas(); o.alCerrar(k); };
    c.querySelector("#faCerrar").onclick = cerrar;
    c.querySelector(".modal").addEventListener("click", (e) => { if (e.target.classList.contains("modal")) cerrar(); });
    const pinta = (arriba) => {
      const cuerpo = c.querySelector("#faCuerpo"), top = cuerpo.scrollTop, r = resumen(k), ultima = k >= o.n - 1;
      c.querySelector("#faTit").textContent = `Ave ${k + 1} de ${o.n}`;
      c.querySelector("#faInfo").innerHTML = r.est === "hecho" ? `<b class="ok">✓ Completa</b> · ${r.hall ? `<b class="hall">${plural(r.hall, "hallazgo", "hallazgos")}</b>` : "sin hallazgos"}`
        : `<b>${r.hechos} de ${r.total}</b> indicadores respondidos${r.hechos ? ` · faltan ${r.total - r.hechos}` : ""}`;
      c.querySelector("#faTabs").innerHTML = Array.from({ length: o.n }, (_, j) => { const s = resumen(j);
        return `<button type="button" role="tab" class="chip-punto est-${s.est} ${j === k ? "actual" : ""}" data-fa="${j}" aria-selected="${j === k}" title="Ave ${j + 1}: ${s.est === "hecho" ? "completa" : s.est === "proceso" ? "a medias" : "sin revisar"}${s.hall ? ` · ${plural(s.hall, "hallazgo", "hallazgos")}` : ""}">${s.est === "hecho" ? "✓ " : ""}Ave ${j + 1}${s.hall ? '<i class="punto-hall" aria-hidden="true"></i>' : ""}</button>`; }).join("");
      // Un solo botón rápido: sin respuestas deja normal toda el ave; a medias, solo completa lo que falta (no borra lo marcado).
      const sinTxt = r.est === "pend" ? "✓ Sin hallazgos" : "✓ Lo demás sin hallazgos", sigTxt = ultima ? "" : " · siguiente ave";
      cuerpo.innerHTML = `${o.ed && r.est !== "hecho" ? `<div class="sin-hallazgos"><button type="button" class="btn btn-primario btn-grande" id="faSin">${sinTxt}${sigTxt}</button><span class="muted texto-chico">${r.est === "pend" ? "Deja todo normal en esta ave. Si encuentra algo, márquelo primero en su renglón." : "Completa como normal solo los renglones sin respuesta."}</span></div>` : ""}
        ${o.filas(k).map((f) => `<div class="fila-campo fila-ave ${f.val == null && r.est === "proceso" ? "fila-falta" : ""}"><div><b>${esc(f.nombre)}</b> ${btnFicha(f.code)}${f.val == null && r.est === "proceso" ? ' <span class="etiqueta-falta">Falta</span>' : ""}</div>
          <div class="niveles-campo n${f.ops.length}">${f.ops.map(([v, t, nv]) => `<button type="button" class="nv ${f.val === v ? "sel" : ""}" style="--c:${COL[nv]}" data-fv="${f.code}|${v}" ${dis} aria-pressed="${f.val === v}"><span>${esc(t)}</span></button>`).join("")}</div></div>`).join("")}
        ${o.extra ? o.extra(k) : ""}`;
      c.querySelector("#faPie").innerHTML = `<span class="guardado" style="margin-right:auto">${o.guardado ? o.guardado() : ""}</span>
        <button type="button" class="btn btn-sec" id="faAnt" ${k === 0 ? "disabled" : ""}>← Ave anterior</button>
        ${!ultima ? `<button type="button" class="btn btn-primario" id="faSig">Siguiente ave →</button>`
          : o.puntoCompleto() ? `<button type="button" class="btn btn-primario" id="faFin" data-sig="1">${o.ultimoPunto ? "Recorrido completo · continuar" : "Punto completo · siguiente punto →"}</button>`
          : `<button type="button" class="btn btn-primario" id="faFin">Volver al punto</button>`}`;
      cuerpo.scrollTop = arriba ? 0 : top;
      c.querySelectorAll("[data-fa]").forEach((b) => (b.onclick = () => { k = +b.dataset.fa; pinta(true); }));
      c.querySelector("#faAnt").onclick = () => { k--; pinta(true); };
      const sg = c.querySelector("#faSig"); if (sg) sg.onclick = () => { k++; pinta(true); };
      const fin = c.querySelector("#faFin"); if (fin) fin.onclick = () => { if (!fin.dataset.sig) return cerrar(); cerrarCapas(); o.alTerminarPunto(); };
      if (!o.ed) return;
      c.querySelectorAll("[data-fv]").forEach((b) => (b.onclick = () => { const [code, v] = b.dataset.fv.split("|"); const f = o.filas(k).find((x) => x.code === code);
        const op = f.ops.find(([x]) => String(x) === v); o.set(k, code, op[0]); pinta(false); }));
      const fs = c.querySelector("#faSin"); if (fs) fs.onclick = () => { o.normal(k, r.est !== "pend"); if (!ultima) k++; pinta(true); };
      if (o.enlazarExtra) o.enlazarExtra(c);
    };
    pinta(true);
  });
}
