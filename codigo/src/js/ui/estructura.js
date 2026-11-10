/* EBA Patos y Gansos · ICA — js/ui/estructura.js
   Estructura común: menú lateral, barra superior, notificaciones y control de permisos. */
"use strict";

/* ==========================================================================
   Estructura de la aplicación
   ========================================================================== */
/** extra = botones propios de la pantalla en la barra superior (p. ej., «Listado por indicador»). */
function shell(sec, ruta, contenido, extra) {
  const u = USUARIOS[SES.rol];
  const pend = pendientesDe().pendientes, nPend = pend.length;
  const nav = NAV.filter(([k]) => PERMISOS[SES.rol].includes(k) || ["parametros", "usuarios"].includes(k)).map(([k, t]) => {
    const ok = puede(k);
    return `<li><a href="#/${k}" ${sec === k ? 'aria-current="page"' : ""} class="${ok ? "" : "bloqueado"}">${IC[k]}<span>${t}</span>${ok ? "" : ' <span class="sr">(sin permiso)</span>🔒'}</a></li>`;
  }).join("");
  raiz.innerHTML = `<div class="app">
    <nav class="rail" id="rail" aria-label="Módulos"><div class="rail-logo"><img src="img/logo-eba-blanco.svg" alt="EBA Cuac Cuac · Bienestar animal en patos y gansos"></div>
      <ul class="nav">${nav}</ul>
      <div class="rail-pie"><strong>${esc(u.nombre)}</strong>${esc(u.rol)}<br><button class="btn btn-sec btn-chico" id="salir" style="margin-top:10px">Cerrar sesión</button></div>
      <div class="rail-franja" aria-hidden="true"></div></nav>
    <div class="principal">
      <header class="barra"><button class="btn btn-sec btn-chico menu-movil" id="menu" aria-controls="rail">Menú</button>
        <div class="ruta">${ruta}</div>
        <div class="notif"><button class="btn-notif" id="notif-btn" aria-expanded="false" aria-controls="notif-panel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg><span class="txt">Notificaciones</span>${nPend ? `<span class="burbuja">${nPend}</span>` : ""}</button>
          <div class="notif-panel" id="notif-panel" hidden><div class="notif-cab"><b>Pendientes</b><span class="muted">${nPend} por atender</span></div>
          ${nPend ? pend.map(([t, v, c, h]) => `<a class="notif-item" href="${h}"><span class="punto" style="--c:${c === "e-alerta" ? "var(--rojo)" : c === "e-medio" ? "var(--cosecha)" : "var(--azul)"}"></span><span><b>${esc(t)}</b><small>${esc(v)}</small></span></a>`).join("") : '<p class="muted" style="padding:14px 16px;margin:0">No tiene pendientes.</p>'}
          <a class="notif-pie" href="#/inicio">Ver todo en el inicio</a></div></div>${extra || ""}</header>
      <main class="contenido" id="contenido">${contenido}</main><div class="pie" aria-hidden="true"></div></div></div>`;
  raiz.querySelector("#salir").onclick = () => cerrarSesion();
  const nb = raiz.querySelector("#notif-btn"), np = raiz.querySelector("#notif-panel");
  nb.onclick = (e) => { e.stopPropagation(); const abrir = np.hidden; np.hidden = !abrir; nb.setAttribute("aria-expanded", abrir); };
  if (!window.__notif) { window.__notif = true; document.addEventListener("click", (e) => { const p = document.getElementById("notif-panel"); if (p && !p.hidden && !e.target.closest(".notif")) { p.hidden = true; document.getElementById("notif-btn").setAttribute("aria-expanded", "false"); } }); }
  raiz.querySelector("#menu").onclick = () => raiz.querySelector("#rail").classList.toggle("abierto");
  return raiz.querySelector("#contenido");
}
/** Ruta de navegación de una evaluación: Fincas / finca / evaluación / pantalla actual. */
function migasEval(ev, actual) {
  const f = FINCAS.find((x) => x.id === ev.finca);
  return `<a href="#/fincas">Fincas</a> / <a href="#/finca/${ev.finca}">${esc(f ? f.nombre : ev.finca)}</a> / ${actual ? `<a href="#/eval/${ev.id}">${ev.id} · ${nombreSp(ev.sp)}</a> / <b>${actual}</b>` : `<b>${ev.id}</b>`}`;
}
function sinPermiso(sec) {
  log(`Intento de acceso sin permiso a «${sec}»`);
  shell(sec, "Acceso no autorizado", `<div class="panel bloqueo"><div class="icono">🔒</div><h2>No tiene permiso para ver esta sección</h2>
    <p class="muted" style="max-width:52ch;margin:10px auto 18px">Su perfil (${esc(USUARIOS[SES.rol].rol)}) no incluye esta sección. El intento quedó registrado en la bitácora.</p>
    <a class="btn btn-primario" href="#/inicio">Volver al inicio</a></div>`);
}
const kpi = (v, l, c) => `<div class="kpi" style="--c:${c}"><div class="v">${v}</div><div class="l">${l}</div></div>`;
const barraH = (l, v, max, txt, c) => `<div class="barra-h"><span>${l}</span><div class="pista"><div class="relleno" style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%;--c:${c}"></div></div><b>${txt}</b></div>`;
const columnas = (items, max) => `<div class="columnas">${items.map(([l, v, c]) => `<div class="columna"><b>${fmt(v)}</b><div class="c" style="height:${(v / max) * 100}%;--c:${c}"></div></div>`).join("")}</div><div class="leyenda-col">${items.map(([l]) => `<span>${l}</span>`).join("")}</div>`;
