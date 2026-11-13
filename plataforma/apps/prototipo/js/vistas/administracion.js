/* EBA Patos y Gansos · ICA — js/vistas/administracion.js
   Usuarios, parametrización, bitácora y Mi cuenta (Reportes está en reportes.js). */
"use strict";

/* ==========================================================================
   Reportes, ayuda, administración y cuenta
   ========================================================================== */
/* Reportes: ver js/vistas/reportes.js */
const enmascara = (d) => (d === "—" ? "—" : "•••" + String(d).slice(-3));
const enmascaraC = (c) => (c === "—" ? "—" : c.replace(/^(.).*(@.*)$/, "$1•••$2"));
/* ---- Usuarios (solo el administrador): crear, editar, asignar el perfil, inactivar o eliminar ---- */
/** Historial de un usuario: visitas a su cargo, fincas a su nombre y acciones en la bitácora. Con historial no se elimina. */
function historialUsuario(k) {
  const x = USUARIOS[k];
  return EVALS.filter((e) => e.inspector === k || (e.revision || []).some((r) => r.por === k)).length
    + FINCAS.filter((f) => f.productor === x.nombre).length + BITACORA.filter((b) => b.u === x.nombre).length;
}
/** Visitas sin aprobar a cargo de un inspector (hay que reasignarlas antes de inactivarlo o cambiarle el perfil). */
const visitasAbiertasDe = (k) => EVALS.filter((e) => e.inspector === k && esAbierta(e));
/** Vincula al productor con las fincas cuya persona responsable tiene su mismo documento. Devuelve cuántas. */
function vincularFincas(x) {
  const fs = FINCAS.filter((f) => f.titular && limpiaDoc(f.titular.tipoDoc, f.titular.doc) === x.doc);
  fs.forEach((f) => (f.productor = x.nombre));
  return fs.length;
}
const FILTRO_USU = { perfil: "", q: "" };
/** Acceso a la plataforma (lo calcula el servidor): la persona crea su contraseña con el enlace del correo. */
const CLASE_ACCESO = { "Activa": "e-ok", "Pendiente de activación": "e-medio", "Enlace vencido": "e-alerta", "Sin enlace": "e-gris" };
const puedeEnviarEnlace = (x) => window.EBA_BD && window.EBA_BD.modo === "bd" && x.estado === "Activo" && x.activacion && x.activacion !== "Activa";
async function enviarEnlace(k, boton) {
  const x = USUARIOS[k]; boton.disabled = true;
  const r = await window.EBA_BD.api("POST", `/usuarios/${encodeURIComponent(k)}/enlace`).catch(() => ({ estado: 0, j: null }));
  if (r.estado === 200) { x.activacion = "Pendiente de activación"; log(`Envío del enlace de activación a ${x.nombre}`); toast(`Enlace enviado a ${enmascaraC(x.correo)}. Vence en 48 horas; el anterior ya no sirve.`); return vUsuarios(); }
  boton.disabled = false; toast((r.j && r.j.error) || "No se pudo enviar el enlace. Intente de nuevo.");
}
function vUsuarios() {
  const lista_ = Object.entries(USUARIOS).sort((a, b) => ORDEN_PERFILES.indexOf(a[1].perfil) - ORDEN_PERFILES.indexOf(b[1].perfil) || a[1].nombre.localeCompare(b[1].nombre));
  shell("usuarios", "<b>Usuarios</b>", `<div class="encabezado"><div><h1>Usuarios</h1><p>Cree las cuentas y asigne el perfil de cada persona. No se asigna contraseña: cada persona la crea con el enlace que le llega al correo. Un usuario con historial no se elimina: se inactiva y se conserva todo. Los documentos y correos se muestran enmascarados.</p></div>
    <button class="btn btn-primario" id="nuevoU">Crear usuario</button></div>
    <section class="panel"><div class="barra-filtros"><div class="buscar"><label class="sr" for="qu">Buscar usuario</label><input id="qu" type="search" placeholder="Buscar por nombre o correo" value="${esc(FILTRO_USU.q)}" autocomplete="off"></div>
      <label class="filtro-estado"><span class="sr">Filtrar por perfil</span><select id="fu"><option value="">Todos los perfiles (${lista_.length})</option>${ORDEN_PERFILES.map((k) => `<option value="${k}" ${FILTRO_USU.perfil === k ? "selected" : ""}>${PERFILES[k]} (${lista_.filter(([, x]) => x.perfil === k).length})</option>`).join("")}</select></label></div>
    <div class="envoltura-tabla"><table class="tabla tabla-usuarios"><thead><tr><th>Nombre</th><th>Perfil</th><th>Documento</th><th>Correo</th><th>Estado</th><th>Acceso</th><th class="num">Acciones</th></tr></thead><tbody id="filasU"></tbody></table></div></section>`);
  const pinta = () => { const q = FILTRO_USU.q.trim().toLowerCase();
    const filas = lista_.filter(([, x]) => (!FILTRO_USU.perfil || x.perfil === FILTRO_USU.perfil) && (!q || x.nombre.toLowerCase().includes(q) || x.correo.toLowerCase().includes(q)));
    raiz.querySelector("#filasU").innerHTML = filas.map(([k, x]) => `<tr data-usuario="${k}"><td><b>${esc(x.nombre)}</b>${k === yoClave() ? ' <span class="etiqueta e-info">Usted</span>' : ""}</td><td>${esc(x.rol)}</td><td>${esc(x.tipoDoc || "")} ${enmascara(x.doc)}</td><td>${enmascaraC(x.correo)}</td>
      <td><span class="etiqueta ${x.estado === "Activo" ? "e-ok" : "e-gris"}">${x.estado}</span></td>
      <td>${x.activacion ? `<span class="etiqueta ${CLASE_ACCESO[x.activacion] || "e-gris"}">${x.activacion}</span>` : '<span class="muted">—</span>'}${puedeEnviarEnlace(x) ? `<br><button class="btn btn-fantasma btn-chico" data-enlace="${k}">${x.activacion === "Sin enlace" ? "Enviar enlace" : "Reenviar enlace"}</button>` : ""}</td>
      <td class="num acciones-fila"><button class="btn btn-sec btn-chico" data-editar="${k}">Editar</button>${k === yoClave() ? "" : ` <button class="btn btn-sec btn-chico" data-baja="${k}">${x.estado === "Inactivo" ? "Reactivar" : "Eliminar o inactivar"}</button>`}</td></tr>`).join("")
      || '<tr><td colspan="7" class="muted">No hay usuarios que coincidan.</td></tr>';
    raiz.querySelectorAll("[data-editar]").forEach((b) => (b.onclick = () => abrirUsuario(b.dataset.editar)));
    raiz.querySelectorAll("[data-baja]").forEach((b) => (b.onclick = () => bajaUsuario(b.dataset.baja)));
    raiz.querySelectorAll("[data-enlace]").forEach((b) => (b.onclick = () => enviarEnlace(b.dataset.enlace, b))); };
  raiz.querySelector("#qu").oninput = (e) => { FILTRO_USU.q = e.target.value; pinta(); };
  raiz.querySelector("#fu").onchange = (e) => { FILTRO_USU.perfil = e.target.value; pinta(); };
  raiz.querySelector("#nuevoU").onclick = () => abrirUsuario(null);
  pinta();
}
/** Ventana para crear (k = null) o editar un usuario. */
function abrirUsuario(k) {
  const x = k ? USUARIOS[k] : { tipoDoc: "CC", perfil: "inspector" }, propio = k === yoClave();
  modal(`<div class="modal-cab"><h3>${k ? `Editar usuario · ${esc(x.nombre)}` : "Crear usuario"}</h3><p class="muted">${k ? "Los cambios de perfil quedan en la bitácora." : "No se asigna contraseña: la persona recibe en su correo un enlace (válido 48 horas) para crear la suya."}</p></div>
    <form id="fu1" novalidate><div class="modal-cuerpo">
    <div class="campo"><label for="tn">Nombre completo</label><input id="tn" autocomplete="off" value="${esc(x.nombre || "")}"><span class="error-campo" data-err="nombre"></span></div>
    <div class="fila"><div class="campo"><label for="tt">Tipo de documento</label><select id="tt">${TIPOS_DOC.map(([t, n]) => `<option value="${t}" ${x.tipoDoc === t ? "selected" : ""}>${n}</option>`).join("")}</select><span class="error-campo" data-err="tipoDoc"></span></div>
      <div class="campo"><label for="td">Número de documento</label><input id="td" inputmode="numeric" value="${esc(x.doc || "")}"><span class="error-campo" data-err="doc"></span></div></div>
    <div class="fila"><div class="campo"><label for="tc">Correo electrónico</label><input id="tc" type="email" autocomplete="off" value="${esc(x.correo || "")}"><span class="error-campo" data-err="correo"></span></div>
      <div class="campo"><label for="tf">Teléfono</label><input id="tf" type="tel" inputmode="tel" placeholder="3XX XXX XXXX" value="${esc(x.tel || "")}"><span class="error-campo" data-err="tel"></span></div></div>
    <div class="campo"><label for="tp">Perfil</label><select id="tp" ${propio ? "disabled" : ""}>${ORDEN_PERFILES.map((p) => `<option value="${p}" ${x.perfil === p ? "selected" : ""}>${PERFILES[p]}</option>`).join("")}</select>
      <span class="ayuda-campo" id="tpAyuda"></span><span class="error-campo" data-err="perfil"></span></div>
    </div><div class="acciones"><button type="button" class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-primario">${k ? "Guardar cambios" : "Crear usuario"}</button></div></form>`, (c) => {
    c.querySelector(".modal > div").classList.add("modal-medio"); c.querySelector("[data-c]").onclick = cerrarCapas;
    const AYUDA = { admin: "Gestiona los usuarios y consulta todo el sistema (no evalúa ni aprueba).", coordinador: "Registra fincas, asigna inspecciones y las aprueba o devuelve.",
      inspector: "Ve solo las fincas que le asignan, hace la visita y la finaliza.", productor: "Ve sus fincas y los resultados aprobados. Se vincula con las fincas que tengan su mismo documento." };
    const sel = c.querySelector("#tp"), ay = () => (c.querySelector("#tpAyuda").textContent = propio ? "No puede cambiar su propio perfil." : AYUDA[sel.value]); sel.onchange = ay; ay();
    c.querySelector("#fu1").onsubmit = (ev) => { ev.preventDefault();
      const v = (id) => c.querySelector(id).value;
      const t = { nombre: v("#tn").trim().replace(/\s+/g, " "), tipoDoc: v("#tt"), doc: v("#td"), correo: v("#tc").trim().toLowerCase(), tel: v("#tf"), autoriza: true, perfil: propio ? x.perfil : sel.value };
      const e = validarTitular(t, false);
      if (!t.correo) e.correo = "El correo es obligatorio: con él la persona entra a la plataforma.";
      const docL = limpiaDoc(t.tipoDoc, t.doc);
      Object.entries(USUARIOS).forEach(([k2, o]) => { if (k2 === k) return;
        if (t.correo && o.correo.toLowerCase() === t.correo) e.correo = `Ese correo ya lo usa ${o.nombre}.`;
        if (!e.doc && o.doc === docL && o.tipoDoc === t.tipoDoc) e.doc = `Ese documento ya está registrado a nombre de ${o.nombre}.`; });
      if (k && x.perfil === "inspector" && t.perfil !== "inspector" && visitasAbiertasDe(k).length) e.perfil = `Tiene ${plural(visitasAbiertasDe(k).length, "visita sin aprobar", "visitas sin aprobar")}: el coordinador debe reasignarlas antes de cambiar el perfil.`;
      c.querySelectorAll("[data-err]").forEach((s) => (s.textContent = e[s.dataset.err] || ""));
      if (Object.keys(e).length) return;
      const datos = { nombre: t.nombre, tipoDoc: t.tipoDoc, doc: docL, correo: t.correo, tel: limpiaTel(t.tel), perfil: t.perfil };
      let msg;
      if (!k) {
        const nk = "u_" + Date.now().toString(36);
        USUARIOS[nk] = completarUsuario(Object.assign(datos, { estado: "Activo", creado: { por: yoClave(), fecha: new Date().toISOString() } }));
        if (window.EBA_BD && window.EBA_BD.modo === "bd") USUARIOS[nk].activacion = "Pendiente de activación";   // el servidor envía el enlace al guardarlo
        const n = datos.perfil === "productor" ? vincularFincas(USUARIOS[nk]) : 0;
        log(`Creación del usuario ${datos.nombre} con perfil ${PERFILES[datos.perfil]}${n ? ` (vinculado a ${plural(n, "finca", "fincas")})` : ""}`);
        msg = `Usuario creado: ${datos.nombre} (${PERFILES[datos.perfil]}). Le llegará al correo el enlace para crear su contraseña.${datos.perfil === "productor" ? n ? ` Quedó vinculado a ${plural(n, "finca", "fincas")} con su documento.` : " Aún no tiene fincas con su documento." : ""}`;
      } else {
        const antes = Object.assign({}, x);
        Object.assign(x, datos); completarUsuario(x);
        if (antes.nombre !== x.nombre) FINCAS.filter((f) => f.productor === antes.nombre).forEach((f) => (f.productor = x.nombre));
        const n = x.perfil === "productor" ? vincularFincas(x) : 0;
        log(`Edición del usuario ${x.nombre}${antes.perfil !== x.perfil ? `: perfil ${PERFILES[antes.perfil]} → ${PERFILES[x.perfil]}` : ""}`);
        msg = `Cambios guardados${antes.perfil !== x.perfil ? `: ahora es ${PERFILES[x.perfil]}` : ""}${n ? ` · ${plural(n, "finca vinculada", "fincas vinculadas")}` : ""}.`;
      }
      guardar(); cerrarCapas(); toast(msg); vUsuarios(); };
  });
}
/** Eliminar (sin historial), inactivar (con historial) o reactivar un usuario. */
function bajaUsuario(k) {
  const x = USUARIOS[k]; if (!x || k === yoClave()) return;
  if (x.estado === "Inactivo") { x.estado = "Activo"; log(`Reactivación del usuario ${x.nombre}`); guardar(); toast("Usuario reactivado."); return vUsuarios(); }
  const abiertas = visitasAbiertasDe(k);
  if (abiertas.length) return modal(`<h3>Primero reasigne sus visitas</h3><p>${esc(x.nombre)} tiene ${plural(abiertas.length, "visita sin aprobar", "visitas sin aprobar")} (${abiertas.map((e) => e.id).join(", ")}). El coordinador debe reasignarlas a otro inspector antes de inactivarlo.</p>
    <div class="acciones"><button class="btn btn-primario" data-c>Entendido</button></div>`, (c) => (c.querySelector("[data-c]").onclick = cerrarCapas));
  const h = historialUsuario(k);
  if (h > 0) modal(`<h3>No se puede eliminar a ${esc(x.nombre)}</h3><p>Tiene ${h} registros (visitas, fincas o acciones). Puede inactivarlo: no podrá entrar ni recibir asignaciones, y se conserva todo el historial.</p>
    <div class="acciones"><button class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-peligro" data-i>Inactivar</button></div>`, (c) => { c.querySelector("[data-c]").onclick = cerrarCapas;
    c.querySelector("[data-i]").onclick = () => { x.estado = "Inactivo"; log(`Inactivación del usuario ${x.nombre}`); guardar(); cerrarCapas(); toast("Usuario inactivado."); vUsuarios(); }; });
  else modal(`<h3>¿Eliminar a ${esc(x.nombre)}?</h3><p>No tiene historial. Se eliminará y quedará constancia en la bitácora.</p><div class="acciones"><button class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-peligro" data-e>Eliminar</button></div>`, (c) => {
    c.querySelector("[data-c]").onclick = cerrarCapas;
    c.querySelector("[data-e]").onclick = () => { delete USUARIOS[k]; log(`Eliminación del usuario ${x.nombre} (sin historial)`); guardar(); cerrarCapas(); toast("Usuario eliminado."); vUsuarios(); }; });
}
function vParametros() {
  const fila = (sp) => { const l = NORMA.filter((i) => i.sp === sp); return `<tr><td><b>${sp === "pato" ? "Patos" : "Gansos"}</b></td><td>1.0</td><td><span class="etiqueta e-ok">Publicada</span></td><td class="num">${l.filter((i) => i.g === "MBR").length}</td><td class="num">${l.filter((i) => i.g === "MBA").length}</td><td class="num">${l.filter((i) => i.g === "MBG").length}</td><td class="num"><b>${l.length}</b></td></tr>`; };
  shell("parametros", "<b>Parametrización</b>", `<div class="encabezado"><div><h1>Parametrización de la lista de chequeo</h1><p>Versiones por especie. Una versión publicada no se modifica: los cambios se hacen en una versión nueva y las evaluaciones cerradas conservan la suya.</p></div></div>
    <section class="panel"><table class="tabla"><thead><tr><th>Especie</th><th>Versión</th><th>Estado</th><th class="num">Recursos</th><th class="num">Animal</th><th class="num">Gestión</th><th class="num">Total</th></tr></thead><tbody>${fila("pato")}${fila("ganso")}</tbody></table></section>
    <section class="panel"><h3>Pesos por tramo</h3><table class="tabla"><thead><tr><th>Tramo</th><th class="num">Animal</th><th class="num">Recursos</th><th class="num">Gestión</th></tr></thead><tbody><tr><td>Comercial (200 aves o más)</td><td class="num">60 %</td><td class="num">25 %</td><td class="num">15 %</td></tr><tr><td>Traspatio</td><td class="num">70 %</td><td class="num">30 %</td><td class="num">0 %</td></tr></tbody></table></section>${panelConfigAsistente()}`);
  enlazarConfigAsistente(vParametros);
}
function vBitacora() {
  const filas = BITACORA.slice().reverse().map((b) => `<tr><td>${fecha(new Date(b.t))} ${hora(new Date(b.t))}</td><td>${esc(b.u)}</td><td>${esc(b.a)}</td></tr>`).join("");
  shell("bitacora", "<b>Bitácora</b>", `<div class="encabezado"><div><h1>Bitácora de acciones</h1><p>Registro de lo que se hace en la plataforma. Nadie puede editarla ni borrarla.</p></div></div>
    <section class="panel"><div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th></tr></thead><tbody>${filas || '<tr><td colspan="3" class="muted">Sin registros todavía.</td></tr>'}</tbody></table></div></section>`);
}
function vCuenta() {
  const u = yo();
  shell("cuenta", "<b>Mi cuenta y seguridad</b>", `<div class="encabezado"><div><h1>Mi cuenta y seguridad</h1><p>${esc(u.nombre)} · ${esc(u.rol)}</p></div></div>
    <div class="rejilla r-2"><section class="panel"><h3>Acceso</h3><table class="tabla"><tbody>
      <tr><td>Correo</td><td>${enmascaraC(u.correo)}</td></tr><tr><td>Documento</td><td>${enmascara(u.doc)}</td></tr>
      <tr><td>Verificación en dos pasos</td><td><span class="etiqueta e-ok">Activa</span></td></tr><tr><td>Inicio de esta sesión</td><td>${hora(new Date(SES.desde))}</td></tr>
      <tr><td>Cierre por inactividad</td><td>15 minutos · quedan <b id="t-sesion">15:00</b></td></tr></tbody></table></section>
    <section class="panel"><h3>Sesiones activas</h3><table class="tabla"><tbody><tr><td>Este navegador</td><td><span class="etiqueta e-ok">Actual</span></td></tr><tr><td>Tableta Android · Ibagué</td><td><button class="btn btn-sec btn-chico" id="otra">Cerrar</button></td></tr></tbody></table>
      <div class="acciones" style="justify-content:flex-start"><button class="btn btn-sec" id="aviso">Probar el aviso de inactividad</button>${window.EBA_BD && window.EBA_BD.datosEjemplo === false ? "" : '<button class="btn btn-sec" id="reset">Restablecer datos de ejemplo</button>'}</div></section></div>`);
  raiz.querySelector("#otra").onclick = (e) => { e.target.closest("tr").remove(); log("Cierre de otra sesión activa"); toast("Sesión cerrada en el otro dispositivo."); };
  raiz.querySelector("#aviso").onclick = () => { restante = 61; };
  const btnReset = raiz.querySelector("#reset");
  if (btnReset) btnReset.onclick = () => { store.clear(); FINCAS = JSON.parse(JSON.stringify(FINCAS0)); PROCESOS = {}; EVALS = sembrar(); BITACORA = []; Object.keys(USUARIOS).forEach((k) => delete USUARIOS[k]); Object.assign(USUARIOS, JSON.parse(JSON.stringify(USUARIOS0))); Object.values(USUARIOS).forEach(completarUsuario); AVISOS = []; guardar(); toast("Datos de ejemplo restablecidos."); };
}
