/* EBA Patos y Gansos · ICA — js/vistas/administracion.js
   Usuarios, parametrización, bitácora y Mi cuenta (Reportes está en reportes.js). */
"use strict";

/* ==========================================================================
   Reportes, ayuda, administración y cuenta
   ========================================================================== */
/* Reportes: ver js/vistas/reportes.js */
const enmascara = (d) => (d === "—" ? "—" : "•••" + String(d).slice(-3));
const enmascaraC = (c) => (c === "—" ? "—" : c.replace(/^(.).*(@.*)$/, "$1•••$2"));
function vUsuarios() {
  const filas = USUARIOS_LISTA.map((x, i) => `<tr><td><b>${esc(x.n)}</b></td><td>${esc(x.r)}</td><td>${enmascara(x.d)}</td><td>${enmascaraC(x.c)}</td>
    <td><span class="etiqueta ${x.e === "Activo" ? "e-ok" : x.e === "Inactivo" ? "e-gris" : "e-medio"}">${x.e}</span></td><td class="num"><button class="btn btn-sec btn-chico" data-u="${i}">${x.e === "Inactivo" ? "Reactivar" : "Eliminar o inactivar"}</button></td></tr>`).join("");
  shell("usuarios", "<b>Usuarios</b>", `<div class="encabezado"><div><h1>Usuarios</h1><p>Un usuario solo se elimina si no tiene historial; si lo tiene, se inactiva y se conserva todo. Los documentos y correos se muestran enmascarados.</p></div></div>
    <section class="panel"><div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Nombre</th><th>Rol</th><th>Documento</th><th>Correo</th><th>Estado</th><th></th></tr></thead><tbody>${filas}</tbody></table></div></section>`);
  raiz.querySelectorAll("[data-u]").forEach((b) => (b.onclick = () => { const x = USUARIOS_LISTA[+b.dataset.u];
    if (x.e === "Inactivo") { x.e = "Activo"; log(`Reactivación del usuario ${x.n}`); return vUsuarios(); }
    if (x.h > 0) modal(`<h3>No se puede eliminar a ${esc(x.n)}</h3><p>Tiene ${x.h} registros (evaluaciones, actas o accesos). Puede inactivarlo y se conservará todo el historial.</p>
      <div class="acciones"><button class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-peligro" data-i>Inactivar</button></div>`, (c) => { c.querySelector("[data-c]").onclick = cerrarCapas;
      c.querySelector("[data-i]").onclick = () => { x.e = "Inactivo"; log(`Inactivación del usuario ${x.n}`); cerrarCapas(); toast("Usuario inactivado."); vUsuarios(); }; });
    else modal(`<h3>¿Eliminar a ${esc(x.n)}?</h3><p>No tiene historial. Se eliminará y quedará una copia en la bitácora.</p><div class="acciones"><button class="btn btn-sec" data-c>Cancelar</button><button class="btn btn-peligro" data-e>Eliminar</button></div>`, (c) => {
      c.querySelector("[data-c]").onclick = cerrarCapas; c.querySelector("[data-e]").onclick = () => { USUARIOS_LISTA.splice(+b.dataset.u, 1); log(`Eliminación del usuario ${x.n} (sin historial)`); cerrarCapas(); toast("Usuario eliminado."); vUsuarios(); }; }); }));
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
  const u = USUARIOS[SES.rol];
  shell("cuenta", "<b>Mi cuenta y seguridad</b>", `<div class="encabezado"><div><h1>Mi cuenta y seguridad</h1><p>${esc(u.nombre)} · ${esc(u.rol)}</p></div></div>
    <div class="rejilla r-2"><section class="panel"><h3>Acceso</h3><table class="tabla"><tbody>
      <tr><td>Correo</td><td>${enmascaraC(u.correo)}</td></tr><tr><td>Documento</td><td>${enmascara(u.doc)}</td></tr>
      <tr><td>Verificación en dos pasos</td><td><span class="etiqueta e-ok">Activa</span></td></tr><tr><td>Inicio de esta sesión</td><td>${hora(new Date(SES.desde))}</td></tr>
      <tr><td>Cierre por inactividad</td><td>15 minutos · quedan <b id="t-sesion">15:00</b></td></tr></tbody></table></section>
    <section class="panel"><h3>Sesiones activas</h3><table class="tabla"><tbody><tr><td>Este navegador</td><td><span class="etiqueta e-ok">Actual</span></td></tr><tr><td>Tableta Android · Ibagué</td><td><button class="btn btn-sec btn-chico" id="otra">Cerrar</button></td></tr></tbody></table>
      <div class="acciones" style="justify-content:flex-start"><button class="btn btn-sec" id="aviso">Probar el aviso de inactividad</button><button class="btn btn-sec" id="reset">Restablecer datos de ejemplo</button></div></section></div>`);
  raiz.querySelector("#otra").onclick = (e) => { e.target.closest("tr").remove(); log("Cierre de otra sesión activa"); toast("Sesión cerrada en el otro dispositivo."); };
  raiz.querySelector("#aviso").onclick = () => { restante = 61; };
  raiz.querySelector("#reset").onclick = () => { store.clear(); FINCAS = JSON.parse(JSON.stringify(FINCAS0)); PROCESOS = {}; EVALS = sembrar(); BITACORA = []; USUARIOS_LISTA = store.get("usuarios", null) || USUARIOS_LISTA; guardar(); toast("Datos de ejemplo restablecidos."); };
}
