/* EBA Patos y Gansos · ICA — js/nucleo/sesion.js
   Sesión: inicio, cierre, cierre por inactividad (15 minutos) y bloqueo. */
"use strict";

/* ---------------- sesión y seguridad ---------------- */
const LIMITE = 15 * 60; // segundos de inactividad
let SES = null, restante = LIMITE, reloj = null, intentos = 0, bloqueoHasta = 0, rolElegido = "inspector", usuarioIngreso = null;   // perfil elegido y usuario que pasó la contraseña
/** k = clave del usuario de demostración; el perfil (rol) sale de USUARIOS[k].perfil. */
function iniciarSesion(k) {
  SES = { rol: (USUARIOS[k] && USUARIOS[k].perfil) || k, u: k, desde: new Date().toISOString() }; restante = LIMITE;
  try { sessionStorage.setItem("eba.ses", JSON.stringify(SES)); } catch (e) { }
  log("Inicio de sesión con verificación en dos pasos");
  clearInterval(reloj); reloj = setInterval(tic, 1000);
  location.hash = "#/inicio"; render();
}
function cerrarSesion(motivo) {
  if (SES) log(motivo || "Cierre de sesión");
  SES = null; clearInterval(reloj);
  try { sessionStorage.removeItem("eba.ses"); } catch (e) { }
  cerrarCapas(); location.hash = "#/ingreso"; render();
  if (motivo) toast(motivo);
}
function tic() {
  restante--;
  const t = document.querySelector("#t-sesion");
  if (t) t.textContent = `${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, "0")}`;
  if (restante === 60) modalSesion();
  if (restante <= 0) cerrarSesion("La sesión se cerró por inactividad. Lo diligenciado quedó guardado.");
}
["click", "keydown", "input", "touchstart"].forEach((t) => document.addEventListener(t, () => { if (SES && restante > 60) restante = LIMITE; }, { passive: true }));
const puede = (sec) => SES && PERMISOS[SES.rol].includes(sec);
