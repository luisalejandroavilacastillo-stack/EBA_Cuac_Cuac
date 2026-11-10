/* EBA Patos y Gansos · ICA — js/vistas/fincas.js
   Fincas: centro de trabajo con el estado de cada evaluación, registro, ficha, historial, inventario, eliminar o inactivar. */
"use strict";

/* ---- persona responsable de la finca (productor o propietario) ---- */
const TIPOS_DOC = [["CC", "Cédula de ciudadanía"], ["CE", "Cédula de extranjería"], ["NIT", "NIT"], ["PAS", "Pasaporte"], ["PPT", "Permiso por protección temporal (PPT)"]];
const nombreTipoDoc = (t) => (TIPOS_DOC.find(([k]) => k === t) || [t, t])[1];
/** Formato del número según el tipo de documento: CC 5 a 10 dígitos, CE 6 a 10, NIT 9 dígitos y dígito de verificación, pasaporte 5 a 12 letras o números, PPT 6 a 10. */
const FORMATO_DOC = { CC: [/^\d{5,10}$/, "de 5 a 10 dígitos"], CE: [/^\d{6,10}$/, "de 6 a 10 dígitos"], NIT: [/^\d{9}-?\d$/, "de 9 dígitos y el dígito de verificación (ej.: 900123456-7)"],
  PAS: [/^[A-Z0-9]{5,12}$/, "de 5 a 12 letras o números"], PPT: [/^\d{6,10}$/, "de 6 a 10 dígitos"] };
const limpiaDoc = (t, v) => String(v || "").trim().toUpperCase().replace(t === "NIT" ? /[.\s]/g : /[.\s-]/g, "");
const limpiaTel = (v) => String(v || "").replace(/[\s()+-]/g, "").replace(/^57(?=\d{10}$)/, "");
/** Valida los datos de la persona; devuelve { campo: mensaje } con los errores (vacío si todo está bien). */
/** Valida los datos de la persona. traspatio = finca con menos de 200 aves: el correo es opcional (HU-25, RN-50). */
function validarTitular(t, traspatio) {
  const e = {};
  if (!t.nombre || t.nombre.trim().length < 5 || !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(t.nombre.trim()) || t.nombre.trim().split(/\s+/).length < 2) e.nombre = "Escriba nombre y apellido (solo letras).";
  if (!FORMATO_DOC[t.tipoDoc]) e.tipoDoc = "Seleccione el tipo de documento.";
  else if (!FORMATO_DOC[t.tipoDoc][0].test(limpiaDoc(t.tipoDoc, t.doc))) e.doc = `El número de ${nombreTipoDoc(t.tipoDoc).toLowerCase()} debe tener ${FORMATO_DOC[t.tipoDoc][1]}.`;
  const correo = String(t.correo || "").trim();
  if (!correo && !traspatio) e.correo = "El correo es obligatorio en fincas comerciales (200 aves o más).";
  else if (correo && !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(correo)) e.correo = "Escriba un correo válido (ej.: nombre@correo.co).";
  if (!/^(3\d{9}|60\d{8})$/.test(limpiaTel(t.tel))) e.tel = "Escriba un celular de 10 dígitos (3XX XXX XXXX) o un fijo con indicativo (60X XXX XXXX).";
  if (!t.autoriza) e.autoriza = "Se necesita la autorización de tratamiento de datos (Ley 1581 de 2012).";
  return e;
}
const enmascaraTel = (t) => (t ? "••• ••• " + String(t).slice(-4) : "—");
const formatoTel = (t) => (t ? String(t).replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3") : "—");
/** Campos del formulario de la persona (registro y edición). */
function camposTitular(t, traspatio) {
  t = t || {};
  return `<fieldset class="grupo-campos"><legend>Persona responsable (productor o propietario)</legend>
    <div class="campo"><label for="tn">Nombre completo</label><input id="tn" autocomplete="name" value="${esc(t.nombre || "")}" required><span class="error-campo" data-err="nombre"></span></div>
    <div class="fila"><div class="campo"><label for="tt">Tipo de documento</label><select id="tt">${TIPOS_DOC.map(([k, n]) => `<option value="${k}" ${t.tipoDoc === k ? "selected" : ""}>${n}</option>`).join("")}</select><span class="error-campo" data-err="tipoDoc"></span></div>
    <div class="campo"><label for="td">Número de documento</label><input id="td" inputmode="numeric" value="${esc(t.doc || "")}" required><span class="error-campo" data-err="doc"></span></div></div>
    <div class="fila"><div class="campo"><label for="tc">Correo electrónico <span class="muted" id="tcOpc"${traspatio ? "" : " hidden"}>(opcional en traspatio)</span></label><input id="tc" type="email" autocomplete="email" value="${esc(t.correo || "")}"><span class="ayuda-campo" id="tcAyuda"${traspatio ? "" : " hidden"}>Sin correo, la persona no entra a la plataforma: el inspector la atiende y le avisa por teléfono.</span><span class="error-campo" data-err="correo"></span></div>
    <div class="campo"><label for="tf">Teléfono</label><input id="tf" type="tel" inputmode="tel" autocomplete="tel" placeholder="3XX XXX XXXX" value="${esc(t.tel || "")}" required><span class="error-campo" data-err="tel"></span></div></div>
    <label class="chk"><input type="checkbox" id="ta" ${t.autoriza ? "checked" : ""}>La persona autoriza el tratamiento de sus datos personales según la Ley 1581 de 2012.</label><span class="error-campo" data-err="autoriza"></span></fieldset>`;
}
/** Lee y valida los campos de la persona; pinta los errores. Devuelve el titular limpio o null. */
function leerTitular(c, traspatio) {
  const v = (id) => c.querySelector(id).value;
  const t = { nombre: v("#tn").trim().replace(/\s+/g, " "), tipoDoc: v("#tt"), doc: v("#td"), correo: v("#tc").trim().toLowerCase(), tel: v("#tf"), autoriza: c.querySelector("#ta").checked };
  const e = validarTitular(t, traspatio);
  c.querySelectorAll("[data-err]").forEach((s) => (s.textContent = e[s.dataset.err] || ""));
  if (Object.keys(e).length) { const k = Object.keys(e)[0], id = { nombre: "#tn", tipoDoc: "#tt", doc: "#td", correo: "#tc", tel: "#tf", autoriza: "#ta" }[k]; c.querySelector(id).focus(); return null; }
  t.doc = limpiaDoc(t.tipoDoc, t.doc); t.tel = limpiaTel(t.tel);
  return t;
}
/** Panel de la ficha con los datos de la persona (enmascarados; se ven completos con un clic que queda en la bitácora). */
function panelTitular(f, completo) {
  const t = f.titular, editable = SES.rol !== "productor" || f.productor === USUARIOS[SES.rol].nombre;
  if (!t) return `<section class="panel" id="titular"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3>Persona responsable</h3>${editable ? '<button class="btn btn-sec btn-chico" id="editT">Completar datos</button>' : ""}</div><p class="muted">Faltan los datos de la persona responsable de la finca.</p></section>`;
  return `<section class="panel" id="titular"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3>Persona responsable</h3><div style="display:flex;gap:8px;flex-wrap:wrap">
    ${completo ? "" : '<button class="btn btn-sec btn-chico" id="verT">Ver datos completos</button>'}${editable ? '<button class="btn btn-sec btn-chico" id="editT">Editar</button>' : ""}</div></div>
    <dl class="datos-persona"><div><dt>Nombre</dt><dd>${esc(t.nombre)}</dd></div><div><dt>Documento</dt><dd>${esc(t.tipoDoc)} ${completo ? esc(t.doc) : enmascara(t.doc)}</dd></div>
    <div><dt>Correo</dt><dd>${!t.correo ? "Sin correo (traspatio)" : completo ? esc(t.correo) : enmascaraC(t.correo)}</dd></div><div><dt>Teléfono</dt><dd>${completo ? formatoTel(t.tel) : enmascaraTel(t.tel)}</dd></div></dl>
    <p class="muted" style="font-size:12px;margin:8px 0 0">Datos tratados según la Ley 1581 de 2012${t.autoriza ? " · autorización registrada" : ""}.</p></section>`;
}

/* ==========================================================================
   Fincas: centro de trabajo (estado de la evaluación, acciones, búsqueda y filtros)
   ========================================================================== */
/** Etiqueta del estado; en una finca inactiva sin evaluación finalizada se muestra «Finca inactiva» (no se programan visitas). */
const etiquetaFlujo = (s) => s.f.estado !== "ACTIVA" && s.estado !== "Finalizada" ? '<span class="etiqueta e-gris">Finca inactiva</span>' : `<span class="etiqueta ${COLOR_FLUJO[s.estado]}">${s.estado}</span>`;
/** Línea de una especie: estado calculado, detalle (avance, visita o puntaje) y la acción que corresponde. */
function lineaFlujo(s, conAcciones = true) {
  const ev = s.ev, a = ev ? avance(ev) : null;
  let det;
  if (s.estado === "En proceso") det = a.hechos ? `<span class="mini-avance" title="${a.hechos} de ${a.ap} indicadores calificados"><i style="width:${a.pct}%"></i></span><span>${nombreVisita(ev)} · <b>${a.pct} %</b></span>`
    : `<span>${nombreVisita(ev)} · apertura hecha · 0 de ${a.ap} indicadores</span>`;
  else if (s.estado === "Seguimiento programado") { const r = resultado(s.ultimaFin), venc = s.abierta.fecha < new Date().toISOString().slice(0, 10);
    det = `<span>${nombreVisita(s.abierta)} · ${fecha(new Date(s.abierta.fecha + "T07:00"))}${venc ? ' <span class="etiqueta e-alerta">Vencido</span>' : ""} · <span class="muted">último resultado ${fmt(r.total)} ${r.nivel[0]}</span></span>`; }
  else if (s.estado === "Por iniciar") det = s.abierta ? `<span>${nombreVisita(s.abierta)} programada · ${fecha(new Date(s.abierta.fecha + "T07:00"))}</span>` : `<span class="muted">Sin evaluaciones</span>`;
  else { const r = resultado(ev); det = `<span><b>${fmt(r.total)}</b> · ${r.nivel[0]}${r.provisional ? " (provisional)" : ""} · ${fecha(new Date(ev.fecha + "T07:00"))}${s.proc ? ` · <span class="muted">${s.proc.estado === "En seguimiento" ? `seguimientos ${s.proc.usados} de ${s.proc.max}` : s.proc.estado.toLowerCase()}</span>` : ""}</span>`; }
  const acc = !conAcciones ? "" : accionFlujo(s) + (s.estado === "Seguimiento programado" && SES.rol !== "productor" && s.f.estado === "ACTIVA" ? ` <button type="button" class="btn btn-sec btn-chico" data-reprog="${s.abierta.id}">Reprogramar</button>` : "");
  return `<div class="flujo-linea" data-estado="${s.estado}"><span class="flujo-sp">${nombreSp(s.sp)}</span>${etiquetaFlujo(s)}<span class="flujo-det">${det}</span>${conAcciones ? `<span class="flujo-acc">${acc}</span>` : ""}</div>`;
}
/** Acción de la columna Evaluación: una sola por especie según el estado. Seguimientos y procesos nuevos están dentro de «Ver resultados». */
function accionFlujo(s) {
  if (s.f.estado !== "ACTIVA") return '<span class="accion-texto">Finca inactiva</span>';
  if (!s.principal) return `<span class="accion-texto">${s.estado === "Por iniciar" ? "Pendiente de visita" : "—"}</span>`;
  const cls = `btn ${s.estado === "Finalizada" || (s.estado === "Seguimiento programado" && SES.rol === "productor") ? "btn-sec" : "btn-primario"} btn-chico btn-accion`;
  return s.principal.nueva ? `<button type="button" class="${cls}" data-nueva="${s.principal.nueva}">${s.principal.texto}</button>` : `<a class="${cls}" href="${s.principal.href}">${s.principal.texto}</a>`;
}
/** Conecta los botones que abren la ventana de nueva evaluación o seguimiento. */
const enlazarNueva = (cont) => cont.querySelectorAll("[data-nueva]").forEach((b) => (b.onclick = () => abrirNuevaEvaluacion(b.dataset.nueva)));

const FILTRO_FINCAS = { estado: "", q: "", scroll: 0, volver: false, ultima: null };
/** Departamentos del catálogo DIVIPOLA que está en la base de datos (llegan con los datos de la API).
    Sin conexión con la API se usan los cuatro del prototipo. */
function departamentosRegistro() {
  const bd = window.EBA_BD && window.EBA_BD.departamentos;
  return bd && bd.length ? bd : ["Boyacá", "Cundinamarca", "Santander", "Tolima"];
}
function vFincas(estadoInicial) {
  const u = USUARIOS[SES.rol], fs = fincasVisibles();
  if (estadoInicial != null) FILTRO_FINCAS.estado = estadoInicial;
  const n = contarEstados(fs);
  const opt = (k, t, v) => `<option value="${k}" ${FILTRO_FINCAS.estado === k ? "selected" : ""}>${t} (${v})</option>`;
  shell("fincas", "<b>Fincas</b>", `<div class="encabezado"><div><h1>${SES.rol === "productor" ? "Mis fincas" : "Fincas"}</h1><p>${SES.rol === "productor" ? "Sus fincas las registra el ICA (inspector, coordinador o administrador). Aquí ve, por especie, el estado de su inspección y sus resultados." : "Cada finca muestra, por especie, el estado de su inspección y la acción que sigue."}</p></div>
    ${SES.rol === "productor" ? "" : '<button class="btn btn-primario" id="nueva">Registrar finca</button>'}</div>
    <section class="panel"><div class="barra-filtros"><div class="buscar"><label class="sr" for="qf">Buscar finca</label><input id="qf" type="search" placeholder="Buscar por nombre de la finca" value="${esc(FILTRO_FINCAS.q)}" autocomplete="off"></div>
      <label class="filtro-estado"><span class="sr">Filtrar por estado</span><select id="fe">${opt("", "Todos los estados", fs.length)}${ESTADOS_FLUJO.map((e) => opt(e, e === "Finalizada" ? "Finalizadas" : e, n[e])).join("")}</select></label></div>
      <div class="envoltura-tabla"><table class="tabla tabla-fincas"><thead><tr><th>Finca</th><th>Responsable</th><th class="num">Aves</th><th>Especie</th><th>Estado</th><th class="col-eval">Evaluación</th></tr></thead></table></div></section>`);
  const pinta = () => {
    const q = FILTRO_FINCAS.q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const filas = fs.filter((f) => (!q || f.nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q)) && (!FILTRO_FINCAS.estado || (f.estado === "ACTIVA" && estadosFinca(f).some((s) => s.estado === FILTRO_FINCAS.estado))));
    const html = filas.length ? filas.map((f) => { const p = poblacion(f), est = estadosFinca(f), k = est.length;
      const fija = `<td data-l="Finca" rowspan="${k}" class="c-finca"><a class="enlace-finca" href="#/finca/${f.id}" data-ficha="${f.id}">${esc(f.nombre)}</a>${f.estado === "ACTIVA" ? "" : ' <span class="etiqueta e-gris">Inactiva</span>'}<span class="sub">${esc(f.mpio)}, ${esc(f.depto)} · ${f.id}</span></td>
        <td data-l="Responsable" rowspan="${k}">${f.titular ? `${esc(f.titular.nombre)}<span class="sub">${esc(f.titular.tipoDoc)} ${enmascara(f.titular.doc)}</span>` : '<span class="muted">Sin registrar</span>'}</td>
        <td data-l="Aves" rowspan="${k}" class="num">${p}<span class="sub">${tramo(p) === "comercial" ? "Comercial" : "Traspatio"}</span></td>`;
      return `<tbody class="grupo-finca ${f.estado === "ACTIVA" ? "" : "inactiva"} ${FILTRO_FINCAS.ultima === f.id ? "resaltada" : ""}" data-finca="${f.id}">${est.map((s, j) => `<tr>${j === 0 ? fija : ""}
        <td data-l="Especie" class="c-esp">${nombreSp(s.sp)}</td><td data-l="Estado"><span class="etiqueta ${COLOR_FLUJO[s.estado]}">${s.estado}</span></td><td data-l="Evaluación" class="col-eval">${accionFlujo(s)}</td></tr>`).join("")}</tbody>`; }).join("")
      : `<tbody><tr><td colspan="6"><p class="muted" style="margin:6px 0">No hay fincas que coincidan${FILTRO_FINCAS.q ? ` con «${esc(FILTRO_FINCAS.q)}»` : ""}${FILTRO_FINCAS.estado ? ` en estado «${FILTRO_FINCAS.estado}»` : ""}.</p></td></tr></tbody>`;
    /* un <tbody> por finca: las filas de sus especies quedan juntas */
    const tabla = raiz.querySelector(".tabla-fincas");
    tabla.querySelectorAll("tbody").forEach((t) => t.remove()); tabla.insertAdjacentHTML("beforeend", html);
    enlazarNueva(tabla);
    tabla.querySelectorAll("[data-ficha]").forEach((a) => a.addEventListener("click", () => { FILTRO_FINCAS.scroll = scrollY; FILTRO_FINCAS.ultima = a.dataset.ficha; }));
  };
  raiz.querySelector("#qf").oninput = (e) => { FILTRO_FINCAS.q = e.target.value; pinta(); };
  raiz.querySelector("#fe").onchange = (e) => { FILTRO_FINCAS.estado = e.target.value; pinta(); };
  pinta();
  if (FILTRO_FINCAS.volver) { FILTRO_FINCAS.volver = false; requestAnimationFrame(() => scrollTo(0, FILTRO_FINCAS.scroll || 0)); }
  else FILTRO_FINCAS.ultima = null;
  /* Solo el ICA registra fincas (decisión del 7 de noviembre de 2026: RN-51 y CU-04); el productor no ve el botón. */
  const btnNueva = raiz.querySelector("#nueva");
  if (btnNueva) btnNueva.onclick = () => modal(`<div class="modal-cab"><h3>Registrar finca</h3><p class="muted">La población total de patos y gansos define si la finca es de traspatio (menos de 200 aves) o comercial.</p></div><form id="fn" novalidate><div class="modal-cuerpo"><div class="form-2col">
    <fieldset class="grupo-campos"><legend>Datos de la finca</legend>
    <div class="campo"><label for="fn1">Nombre de la finca</label><input id="fn1" required></div>
    <div class="fila"><div class="campo"><label for="fn2">Departamento</label><select id="fn2"><option value="">Seleccione…</option>${departamentosRegistro().map((d) => `<option>${esc(d)}</option>`).join("")}</select></div>
    <div class="campo"><label for="fn3">Municipio</label><input id="fn3" required></div></div>
    <div class="campo"><span class="etq-campo">Especies y número de aves</span>
      <div class="especies-reg">${["pato", "ganso"].map((sp) => `<label class="esp-reg" data-sp="${sp}" for="fs_${sp}"><input type="checkbox" id="fs_${sp}"><span class="esp-nom">${nombreSp(sp)}</span>
        <input id="f${sp}_n" class="esp-num" type="number" min="1" disabled placeholder="—" aria-label="Número de ${sp === "pato" ? "patos" : "gansos"}"><span class="esp-und">aves</span></label>`).join("")}</div>
      <p class="tramo-reg" id="fnTramo">Marque una o las dos especies y escriba cuántas aves hay.</p></div></fieldset>
    ${camposTitular(SES.rol === "productor" ? { nombre: u.nombre, tipoDoc: "CC", doc: u.doc, correo: u.correo } : null)}</div>
    <span class="error-campo" id="fe"></span></div><div class="acciones"><button type="button" class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-primario">Registrar finca</button></div></form>`, (c) => {
    c.querySelector(".modal > div").classList.add("modal-ancho"); c.querySelector("[data-c]").onclick = cerrarCapas;
    const marcadas = () => ["pato", "ganso"].filter((sp) => c.querySelector("#fs_" + sp).checked);
    const total = () => marcadas().reduce((t, sp) => t + (+c.querySelector(`#f${sp}_n`).value || 0), 0);
    const actualiza = () => { const n = total(), m = marcadas(), tr = n > 0 && !m.some((sp) => tramo(+c.querySelector(`#f${sp}_n`).value || 0) === "comercial");
      c.querySelector("#tcOpc").hidden = !tr; c.querySelector("#tcAyuda").hidden = !tr;
      const el = c.querySelector("#fnTramo"); el.className = "tramo-reg" + (n ? (tr ? " t-trasp" : " t-com") : "");
      el.innerHTML = !m.length ? "Marque una o las dos especies y escriba cuántas aves hay." : !n ? "Escriba cuántas aves hay de cada especie." : m.length === 1 ? `<b>${n} aves · ${tr ? "Traspatio" : "Comercial"}</b> <span>${tr ? "menos de 200 aves" : "200 aves o más"} (Tabla 3)</span>`
        : `<b>${m.map((sp) => { const k = +c.querySelector(`#f${sp}_n`).value || 0; return `${nombreSp(sp)}: ${k} · ${tramo(k) === "comercial" ? "Comercial" : "Traspatio"}`; }).join("  ·  ")}</b> <span>Cada especie se evalúa con su propio número (Tabla 3).</span>`; };
    ["pato", "ganso"].forEach((sp) => { c.querySelector("#fs_" + sp).onchange = (e) => { const n = c.querySelector(`#f${sp}_n`); n.disabled = !e.target.checked; n.placeholder = e.target.checked ? "0" : "—"; if (!e.target.checked) n.value = ""; else n.focus();
        c.querySelector(`.esp-reg[data-sp="${sp}"]`).classList.toggle("activa", e.target.checked); actualiza(); };
      c.querySelector(`#f${sp}_n`).oninput = actualiza; });
    c.querySelector("#fn").onsubmit = (e) => { e.preventDefault();
      const nm = c.querySelector("#fn1").value.trim(), m = c.querySelector("#fn3").value.trim(), sps = marcadas(), a = total();
      if (!nm || !m || !c.querySelector("#fn2").value) { c.querySelector("#fe").textContent = "Complete el nombre de la finca, el departamento y el municipio."; return; }
      if (!sps.length) { c.querySelector("#fe").textContent = "Marque al menos una especie."; return; }
      if (sps.some((sp) => !(+c.querySelector(`#f${sp}_n`).value > 0))) { c.querySelector("#fe").textContent = "Escriba el número de aves de cada especie marcada."; return; }
      c.querySelector("#fe").textContent = "";
      const t = leerTitular(c, tramo(a) !== "comercial"); if (!t) { c.querySelector("#fe").textContent = "Revise los datos de la persona responsable."; return; }
      const anio = new Date().getFullYear(), usados = new Set(FINCAS.map((x) => x.id)); let k = FINCAS.filter((x) => x.id.startsWith(`FIN-${anio}-`)).length + 1, id;
      do { id = `FIN-${anio}-${String(k++).padStart(5, "0")}`; } while (usados.has(id));   // consecutivo del año (la base de datos rechaza un código repetido)
      FINCAS.push({ id, nombre: nm, productor: SES.rol === "productor" ? u.nombre : t.nombre, titular: t, depto: c.querySelector("#fn2").value, mpio: m, vereda: "", estado: "ACTIVA",
        // propósito, sistema e instalaciones no se piden al registrar: en la visita el inspector marca «No aplica» donde corresponda
        especies: sps.map((sp) => Object.assign({ sp, proposito: "Carne", sistema: "Semi-intensivo", conCorral: true }, sp === "pato" ? { permanencia: true, cama: true } : {}, { inventario: [{ cat: "General", n: +c.querySelector(`#f${sp}_n`).value, edad: 0, peso: 0 }] })), area: 0 });
      guardar(); log(`Registro de la finca ${nm}`); cerrarCapas(); toast(`Finca registrada (${tramo(a) === "comercial" ? "comercial" : "traspatio"}) a nombre de ${t.nombre}.`); vFincas(); };
  });
}
function vFinca(id, verCompleto) {
  const f = FINCAS.find((x) => x.id === id); if (!f) return vFincas();
  if (SES.rol === "productor" && f.productor !== USUARIOS[SES.rol].nombre) return sinPermiso("fincas");
  const evs = EVALS.filter((e) => e.finca === id);
  const esp = f.especies.map((e, k) => `<section class="panel"><h3>${nombreSp(e.sp)} · ${esc(e.proposito)}${e.sistema ? " · " + esc(e.sistema) : ""}</h3>
    <div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Categoría</th><th class="num">Cantidad</th><th class="num">Edad (semanas)</th><th class="num">Peso (kg)</th></tr></thead><tbody>
    ${e.inventario.map((c, j) => `<tr><td>${esc(c.cat)}</td><td class="num"><input aria-label="Cantidad ${esc(c.cat)}" type="number" min="0" value="${c.n}" data-k="${k}" data-j="${j}" class="entrada-num"></td><td class="num">${c.edad}</td><td class="num">${fmt(c.peso, 2)}</td></tr>`).join("")}</tbody></table></div></section>`).join("");
  const p = poblacion(f), puedeBaja = SES.rol !== "productor";
  shell("fincas", `<a href="#/fincas">Fincas</a> / <b>${esc(f.nombre)}</b>`, `<a class="volver" href="#/fincas" id="volverF">← Volver a fincas</a><div class="encabezado"><div><h1>${esc(f.nombre)} ${f.estado === "ACTIVA" ? "" : '<span class="etiqueta e-gris">Inactiva</span>'}</h1><p>${esc(f.vereda ? "Vereda " + f.vereda + ", " : "")}${esc(f.mpio)}, ${esc(f.depto)} · ${f.id}</p></div>
    ${puedeBaja ? `<div class="no-imprimir">${f.estado === "ACTIVA" ? '<button class="btn-texto btn-texto-peligro" id="baja">Eliminar o inactivar</button>' : '<button class="btn btn-sec" id="react">Reactivar</button>'}</div>` : ""}</div>
    <section class="panel panel-flujo"><h3>Evaluación</h3>${estadosFinca(f).map((s) => lineaFlujo(s)).join("")}</section>
    <div class="rejilla r-2"><section class="panel"><h3>Datos de la finca</h3><dl class="datos-persona datos-finca"><div><dt>Aves${f.especies.length > 1 ? " (patos + gansos)" : ""}</dt><dd id="pob">${p}</dd></div><div><dt>Tramo según la norma</dt><dd id="tr">${f.especies.length > 1 ? tramosTexto(f) : tramoFinca(f) === "comercial" ? "Comercial" : "Traspatio"}</dd></div>
      <div><dt>Especies</dt><dd>${f.especies.map((e) => nombreSp(e.sp)).join(" y ")}</dd></div><div><dt>Evaluaciones</dt><dd>${evs.length}</dd></div></dl><p id="expl" class="texto-chico"></p></section>
      ${panelTitular(f, verCompleto)}</div>
    ${historialFinca(f)}<h2 class="titulo-seccion">Población</h2><div class="rejilla ${f.especies.length > 1 ? "r-2" : ""}">${esp}</div>`);
  enlazarNueva(raiz); enlazarReprogramar(raiz, () => vFinca(id));
  raiz.querySelector("#volverF").onclick = () => { FILTRO_FINCAS.volver = true; FILTRO_FINCAS.ultima = id; };
  const vt = raiz.querySelector("#verT"); if (vt) vt.onclick = () => { log(`Consulta de datos personales de ${f.titular.nombre} (${f.nombre})`); vFinca(id, true); };
  const et = raiz.querySelector("#editT"); if (et) et.onclick = () => modal(`<div class="modal-cab"><h3>Persona responsable · ${esc(f.nombre)}</h3></div><form id="ft" novalidate><div class="modal-cuerpo">${camposTitular(f.titular, tramo(poblacion(f)) !== "comercial")}</div>
    <div class="acciones"><button type="button" class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-primario">Guardar</button></div></form>`, (c) => {
    c.querySelector(".modal > div").classList.add("modal-medio"); c.querySelector("[data-c]").onclick = cerrarCapas;
    c.querySelector("#ft").onsubmit = (e) => { e.preventDefault(); const t = leerTitular(c, tramoFinca(f) !== "comercial"); if (!t) return;
      const antes = f.titular ? f.titular.nombre : null; f.titular = t; if (SES.rol !== "productor") f.productor = t.nombre;
      guardar(); log(`Actualización de la persona responsable de ${f.nombre}${antes && antes !== t.nombre ? ` (antes: ${antes})` : ""}`); cerrarCapas(); toast("Datos de la persona guardados."); vFinca(id); };
  });
  const explica = () => { const n = poblacion(f);
    raiz.querySelector("#pob").textContent = n; raiz.querySelector("#tr").textContent = f.especies.length > 1 ? tramosTexto(f) : tramoFinca(f) === "comercial" ? "Comercial" : "Traspatio";
    raiz.querySelector("#expl").innerHTML = f.especies.map((e) => { const ne = poblacionEspecie(e), t = tramo(ne), pl = planMuestreo(ne, e.conCorral !== false, ne);
      return `<b>${nombreSp(e.sp)} (${ne} aves) · ${t === "comercial" ? "comercial" : "traspatio"}:</b> ${t === "comercial" ? "se evalúan recursos, animales y gestión documental (animal 60 %, recursos 25 %, gestión 15 %)." : "se evalúan recursos y animales, sin documentos (animal 70 %, recursos 30 %)."}<br><span class="muted">Muestra prevista: ${pl.texto}.</span>`; }).join("<br>"); };
  explica();
  raiz.querySelectorAll("[data-k]").forEach((inp) => (inp.oninput = () => { const v = Math.max(0, +inp.value || 0); f.especies[inp.dataset.k].inventario[inp.dataset.j].n = v; guardar(); explica(); }));
  const b = raiz.querySelector("#baja");
  if (b) b.onclick = () => {
    if (evs.length) modal(`<h3>No se puede eliminar esta finca</h3><p>Tiene ${evs.length} evaluación${evs.length > 1 ? "es" : ""} registrada${evs.length > 1 ? "s" : ""}. Para conservar el historial, puede inactivarla.</p>
      <div class="campo"><label for="mot">Motivo</label><select id="mot"><option>Cese de producción</option><option>Venta de la finca</option><option>Cierre sanitario</option></select></div>
      <div class="acciones"><button class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-peligro" data-i>Inactivar</button></div>`, (c) => {
      c.querySelector("[data-c]").onclick = cerrarCapas;
      c.querySelector("[data-i]").onclick = () => { f.estado = "INACTIVA"; guardar(); log(`Inactivación de ${f.nombre}: ${c.querySelector("#mot").value}`); cerrarCapas(); toast("Finca inactivada. Su historial se conserva."); vFinca(id); };
    });
    else modal(`<h3>¿Eliminar ${esc(f.nombre)}?</h3><p>La finca no tiene evaluaciones ni documentos. Se eliminará y quedará una copia en la bitácora.</p>
      <div class="acciones"><button class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-peligro" data-e>Eliminar</button></div>`, (c) => {
      c.querySelector("[data-c]").onclick = cerrarCapas;
      c.querySelector("[data-e]").onclick = () => { FINCAS = FINCAS.filter((x) => x.id !== id); guardar(); log(`Eliminación de ${f.nombre} (sin historial)`); cerrarCapas(); toast("Finca eliminada."); location.hash = "#/fincas"; };
    });
  };
  const re = raiz.querySelector("#react"); if (re) re.onclick = () => { f.estado = "ACTIVA"; guardar(); log(`Reactivación de ${f.nombre}`); vFinca(id); };
}

/** Evaluaciones finalizadas de una finca y especie en orden cronológico (fecha y, el mismo día, número de visita). */
const historicoFinalizadas = (fid, sp) => EVALS.filter((x) => x.finca === fid && x.sp === sp && x.estado === "Finalizada").sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.visita || 0) - (b.visita || 0));
/** Lectura de la tendencia: cambio de la última evaluación frente a la anterior y frente a la primera. */
function tendenciaHTML(fins) {
  const t = fins.map((x) => resultado(x).total);
  if (t.length < 2) return `<p class="tendencia">Una evaluación finalizada (${fmt(t[0])} puntos). La tendencia aparece desde la segunda.</p>`;
  const d = t[t.length - 1] - t[t.length - 2], d0 = t[t.length - 1] - t[0];
  const txt = (v) => (Math.abs(v) < 0.05 ? "se mantiene" : v > 0 ? `mejora ${fmt(v)}` : `disminuye ${fmt(-v)}`);
  return `<p class="tendencia ${Math.abs(d) < 0.05 ? "" : d > 0 ? "sube" : "baja"}">${Math.abs(d) < 0.05 ? "→" : d > 0 ? "↑" : "↓"} Frente a la evaluación anterior <b>${txt(d)}</b> puntos${t.length > 2 ? ` · frente a la primera, ${txt(d0)}` : ""}.</p>`;
}
/** Historial de la finca: procesos, visitas de seguimiento y registros anteriores al sistema. Cada visita conserva su resultado. */
function historialFinca(f) {
  return f.especies.map((e) => {
    const procs = procesosDe(f.id, e.sp);
    /* Gráfica histórica: solo evaluaciones finalizadas de esta finca y especie, en orden de fecha, con su propio puntaje guardado. */
    const fins = historicoFinalizadas(f.id, e.sp);
    const puntos = fins.map((x) => { const r = resultado(x); return [`${x.fecha.slice(8, 10)}/${x.fecha.slice(5, 7)}/${x.fecha.slice(2, 4)}`, r.total, r.provisional]; });
    const tablas = procs.map((st) => `<h4 class="titulo-proceso">${esc(st.id)} · ${st.usados} de ${st.max} seguimientos · <span class="etiqueta ${COLOR_ESTADO_PROC[st.estado]}">${st.estado}</span>${st.final ? ` · resultado final ${fmt(resultado(st.final).total)}` : ""}</h4>
      <div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Visita</th><th>Fecha</th><th>Estado</th><th class="num">Puntaje</th><th>Nivel</th><th></th></tr></thead><tbody>
      ${st.visitas.map((x) => { const r = resultado(x); return `<tr><td>${nombreVisita(x)}<br><span class="muted" style="font-size:12px">${x.id}</span></td><td>${fecha(new Date(x.fecha + "T07:00"))}</td><td>${x.estado}</td><td class="num">${x.estado === "Programada" ? "—" : fmt(r.total)}</td><td>${x.estado === "Programada" ? "—" : r.nivel[0]}</td>
        <td class="num"><a class="btn btn-sec btn-chico" href="#/eval/${x.id}${x.estado === "Finalizada" ? "/resultado" : ""}">${x.estado === "Finalizada" ? "Ver resultados" : "Abrir"}</a></td></tr>`; }).join("")}</tbody></table></div>`).join("");
    return `<section class="panel"><h3>Historial · ${nombreSp(e.sp)}</h3>
      <div class="rejilla r-hist"><div>${tablas || '<p class="muted">Sin evaluaciones en la plataforma.</p>'}</div><div class="hist-graf"><h4>Evolución de los puntajes</h4>${puntos.length ? evolucionSVG(puntos) + tendenciaHTML(fins) : '<p class="vacio-tab">Aún no hay resultados históricos disponibles: la gráfica aparece con la primera evaluación finalizada.</p>'}</div></div></section>`;
  }).join("");
}
