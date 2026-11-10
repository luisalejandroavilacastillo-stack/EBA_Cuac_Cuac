/* EBA Cuac Cuac — js/ui/boton-asistente.js
   Botón flotante del asistente: acceso fijo en la esquina inferior derecha, desde cualquier sección.
   Solo cambia la forma de llegar al asistente: abre la vista existente (#/asistente, vistas/asistente.js)
   y le pasa la evaluación o la finca que el usuario está mirando, si la hay. No duplica la lógica del asistente. */
"use strict";

const ICONO_ASISTENTE = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
  <path d="M6 7.5A3.5 3.5 0 0 1 9.5 4h13A3.5 3.5 0 0 1 26 7.5v9a3.5 3.5 0 0 1-3.5 3.5H14l-6 5v-5.2A3.5 3.5 0 0 1 6 16.5z" fill="currentColor" opacity=".18"/>
  <path d="M6 7.5A3.5 3.5 0 0 1 9.5 4h13A3.5 3.5 0 0 1 26 7.5v9a3.5 3.5 0 0 1-3.5 3.5H14l-6 5v-5.2A3.5 3.5 0 0 1 6 16.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  <circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="20" cy="12" r="1.6" fill="currentColor"/>
  <path d="M12.5 15.5c1.9 1.4 5.1 1.4 7 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M27.5 2.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" fill="var(--cosecha)"/></svg>`;

/** Dirección del asistente según dónde está el usuario: evaluación → esa evaluación; ficha de finca → esa finca. */
function destinoAsistente() {
  const h = (location.hash || "").slice(2).split("/");
  if (h[0] === "eval" && h[1]) return `#/asistente/${h[1]}`;
  if (h[0] === "finca" && h[1]) return `#/asistente/${h[1]}`;
  return "#/asistente";
}
/** Muestra u oculta el botón según la sesión, el permiso y la sección actual. */
function actualizarBotonAsistente() {
  let b = document.getElementById("fab-asistente");
  const sec = (location.hash || "").slice(2).split("/")[0];
  const visible = !!(typeof SES !== "undefined" && SES && puede("asistente") && sec !== "asistente" && document.querySelector(".app") && !document.getElementById("asis-panel"));
  if (!(typeof SES !== "undefined" && SES && puede("asistente")) && typeof cerrarAsistenteFlotante === "function" && document.getElementById("asis-panel")) cerrarAsistenteFlotante();
  document.body.classList.toggle("con-fab", visible);
  if (!visible) { if (b) b.hidden = true; return; }
  if (!b) {
    b = document.createElement("a");
    b.id = "fab-asistente"; b.className = "fab-asistente";
    b.setAttribute("aria-label", "Abrir el asistente virtual de bienestar animal");
    b.innerHTML = `<span class="fab-icono">${ICONO_ASISTENTE}</span><span class="fab-texto"><b>¿Necesitas ayuda?</b><small>Asistente virtual</small></span>`;
    // abre la ventana flotante del asistente sin salir de la pantalla (el enlace queda para abrir la vista completa)
    b.addEventListener("click", (e) => { if (typeof abrirAsistenteFlotante !== "function" || e.ctrlKey || e.metaKey) return; e.preventDefault(); abrirAsistenteFlotante(); actualizarBotonAsistente(); });
    document.body.appendChild(b);
  }
  b.href = destinoAsistente();
  b.hidden = false;
}
// Se actualiza cada vez que cambia la pantalla (navegación, cambio de rol, cierre de sesión).
window.addEventListener("hashchange", actualizarBotonAsistente);
new MutationObserver(actualizarBotonAsistente).observe(raiz, { childList: true });
actualizarBotonAsistente();
