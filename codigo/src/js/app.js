/* EBA Patos y Gansos · ICA — js/app.js
   Enrutador: decide qué vista mostrar según la dirección (#/...) y el rol. */
"use strict";

/* ==========================================================================
   Enrutador
   ========================================================================== */
function render() {
  const h = (location.hash || "#/ingreso").slice(2).split("/");
  if (!SES) {
    try { const s = JSON.parse(sessionStorage.getItem("eba.ses")); if (s && USUARIOS[s.u || s.rol] && USUARIOS[s.u || s.rol].estado === "Activo") { SES = Object.assign({ u: s.rol }, s); clearInterval(reloj); reloj = setInterval(tic, 1000); } } catch (e) { }
  }
  if (!SES) return vIngreso(h[0] === "codigo" ? "codigo" : h[0] === "recuperar" ? "recuperar" : null);
  cerrarCapas(); window.scrollTo(0, 0);
  const sec = h[0];
  const mapa = { eval: "evaluaciones", finca: "fincas" };
  const s = mapa[sec] || sec;
  if (["ingreso", "codigo", "recuperar", ""].includes(sec)) { location.hash = "#/inicio"; return; }
  if (!puede(s)) return sinPermiso(s);
  if (sec === "inicio") return vInicio();
  if (sec === "fincas") return vFincas();
  if (sec === "finca") return vFinca(h[1]);
  // Las evaluaciones se gestionan desde Fincas: la dirección antigua lleva allí (la de «nueva» abre la ventana de creación).
  if (sec === "evaluaciones") { if (h[1] === "nueva") return vNueva(); location.replace("#/fincas"); return; }
  if (sec === "eval") {
    const ev = EVALS.find((e) => e.id === h[1]); if (!ev) { location.replace("#/fincas"); return; }
    // v0.25: el productor solo ve visitas aprobadas; el inspector, solo las asignadas a él.
    if (!puedeVerEval(ev)) { if (SES.rol === "productor") { toast("El resultado se publica cuando el coordinador del ICA aprueba la inspección."); location.replace(`#/finca/${ev.finca}`); return; } return sinPermiso("evaluaciones"); }
    if (!h[2] || h[2] === "apertura") return vApertura(ev);
    if (h[2] === "cierre") return vCierre(ev);
    if (h[2] === "resultado") return vResultado(ev);
    if (h[2] === "constancia") return vConstancia(ev);
    if (h[2] === "recorrido") return ev.sp === "pato" ? vRecorrido(ev, h[3], h[4]) : vRecorridoGanso(ev, h[3]);
    return vIndicador(ev, h[2]);
  }
  if (sec === "reportes") return h[1] === "finca" ? vInformeFinca(h[2]) : vReportes();
  if (sec === "asistente") return vAsistente(h[1]);
  if (sec === "ayuda") return vAyuda(h[1]);
  if (sec === "usuarios") return vUsuarios();
  if (sec === "parametros") return vParametros();
  if (sec === "bitacora") return vBitacora();
  if (sec === "cuenta") return vCuenta();
  location.hash = "#/inicio";
}
window.addEventListener("hashchange", render);
render();
