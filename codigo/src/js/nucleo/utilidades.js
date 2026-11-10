/* EBA Patos y Gansos · ICA — js/nucleo/utilidades.js
   Utilidades: escape de HTML, formatos de número y fecha, almacenamiento local y constantes de la norma. */
"use strict";

// NORMA (los 58 indicadores) viene de js/datos/norma.js
const raiz = document.getElementById("raiz");
const capas = document.getElementById("capas");

/* ---------------- utilidades ---------------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COL = { 100: "var(--n100)", 55: "var(--n55)", 20: "var(--n20)", 0: "var(--n0)" };
const fmt = (v, d = 1) => (v == null || isNaN(v) ? "—" : Number(v).toFixed(d).replace(".", ",").replace(/,0$/, ""));
const hoy = () => new Date();
const hora = (d = hoy()) => d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
const fecha = (d = hoy()) => d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
const store = {
  get(k, d) { try { const v = localStorage.getItem("eba7." + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("eba7." + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento: se trabaja en memoria */ } },
  clear() { try { Object.keys(localStorage).filter((k) => k.startsWith("eba7.")).forEach((k) => localStorage.removeItem(k)); } catch (e) { } }
};
const IND = Object.fromEntries(NORMA.map((i) => [i.code, i]));
const MEDIDA = { MBR: "Medidas basadas en los recursos", MBA: "Medidas basadas en el animal", MBG: "Medidas basadas en la gestión" };
const CAP = { pato: { MBR: "6.1", MBA: "6.2", MBG: "6.3" }, ganso: { MBR: "7.1", MBA: "7.2", MBG: "7.3" } };
