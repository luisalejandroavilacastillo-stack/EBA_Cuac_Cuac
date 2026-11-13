/* EBA Patos y Gansos · ICA — js/nucleo/conexion.js
   Conexión con la base de datos (MariaDB) a través de la API.

   La aplicación sigue trabajando igual: lee y escribe sus listas FINCAS, EVALS, USUARIOS (cuentas con perfil), PROCESOS, AVISOS y BITACORA
   y llama a guardar(). Este archivo detecta qué registros cambiaron y los envía a la API, uno por uno, con su versión:
     · si otra persona modificó el mismo registro, la API lo rechaza (409) y aquí se carga la versión más reciente;
     · si la API no responde, se reintenta solo y se muestra un aviso;
     · cada 15 segundos se revisa si otra persona hizo cambios y, en pantallas de consulta, se actualizan.
   Los datos del asistente (incluida su clave) no se envían: se quedan en este navegador. */
"use strict";

(function () {
  const B = window.EBA_BD || (window.EBA_BD = { modo: "navegador" });
  const API = "/api/sincronizacion";
  const ORDEN = ["fincas", "procesos", "usuarios", "evals", "avisos"];   // las fincas primero: las evaluaciones las referencian
  const CLAVES = new Set(["fincas", "evals", "bitacora", "cuentas", "procesos", "avisos"]);   // claves del almacenamiento que se sincronizan

  /** Huella corta de una entrada de la bitácora (para no repetirla). */
  function huella(e) {
    const s = `${e.t}|${e.u}|${e.a}`;
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822519); }
    return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
  }

  /* ------------------------------------------------ lo último que se sabe que está en la base */
  const foto = { fincas: new Map(), evals: new Map(), usuarios: new Map(), procesos: new Map(), avisos: new Map() };
  let bitacoraEnBd = new Set();
  let sello = null;

  function tomarFoto(d) {
    for (const col of ORDEN) {
      foto[col] = new Map((d.colecciones[col] || []).map((r) => [r.id, { version: r.version, json: JSON.stringify(col === "usuarios" ? completarUsuario(r.datos) : r.datos) }]));
    }
    bitacoraEnBd = new Set((d.bitacora || []).map((e) => e.h));
    sello = d.sello;
  }

  /** Registros actuales de la aplicación: [id, objeto]. */
  function registros(col) {
    if (col === "fincas") return (FINCAS || []).map((f) => [f.id, f]);
    if (col === "evals") return (EVALS || []).map((e) => [e.id, e]);
    if (col === "usuarios") return Object.entries(USUARIOS || {});
    if (col === "avisos") return (AVISOS || []).map((a) => [a.id, a]);
    return Object.entries(PROCESOS || {});
  }

  /** Reemplaza (o quita, si «datos» es null) un registro en las listas de la aplicación. */
  function ponerRegistro(col, id, datos) {
    const reemplazar = (lista, igual) => {
      const i = lista.findIndex(igual);
      if (datos == null) { if (i >= 0) lista.splice(i, 1); } else if (i >= 0) lista[i] = datos; else lista.push(datos);
    };
    if (col === "fincas") reemplazar(FINCAS, (f) => f.id === id);
    else if (col === "evals") reemplazar(EVALS, (e) => e.id === id);
    else if (col === "usuarios") { if (datos == null) delete USUARIOS[id]; else USUARIOS[id] = completarUsuario(datos); }
    else if (col === "avisos") reemplazar(AVISOS, (a) => a.id === id);
    else if (datos == null) delete PROCESOS[id]; else PROCESOS[id] = datos;
  }

  /* ------------------------------------------------ escritura local sin disparar otra sincronización */
  let setOriginal = null;
  function escribirLocal() {
    if (!setOriginal) return;
    setOriginal("fincas", FINCAS); setOriginal("evals", EVALS); setOriginal("bitacora", BITACORA.slice(-300));
    setOriginal("cuentas", USUARIOS); setOriginal("procesos", PROCESOS); setOriginal("avisos", AVISOS.slice(-100));
  }

  /* ------------------------------------------------ aviso en pantalla */
  function aviso(texto, tipo) {
    let el = document.getElementById("eba-bd");
    if (!texto) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("div"); el.id = "eba-bd"; el.setAttribute("role", "status");
      el.style.cssText = "position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:120;max-width:min(560px,calc(100vw - 32px));padding:10px 14px;border-radius:10px;font:600 13px/1.4 'Nunito Sans',Arial,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.18)";
      document.body.appendChild(el);
    }
    el.style.background = tipo === "error" ? "#8a3431" : "#745e35";
    el.style.color = "#fff";
    el.textContent = texto;
  }

  /* ------------------------------------------------ llamadas a la API */
  function usuarioActual() {
    try { return typeof SES !== "undefined" && SES && yo() ? yo().nombre : ""; } catch (e) { return ""; }
  }
  function rolActual() {
    try { return typeof SES !== "undefined" && SES ? SES.rol : ""; } catch (e) { return ""; }
  }
  async function pedir(metodo, ruta, cuerpo) {
    const r = await fetch(API + ruta, {
      method: metodo, cache: "no-store",
      headers: Object.assign({ "X-EBA-Usuario": encodeURIComponent(usuarioActual()), "X-EBA-Rol": rolActual(), "X-EBA-Clave": (typeof SES !== "undefined" && SES && yoClave()) || "" }, cuerpo ? { "Content-Type": "application/json" } : {}),
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    let j = null; try { j = await r.json(); } catch (e) { }
    return { estado: r.status, j };
  }

  /* ------------------------------------------------ envío de cambios */
  let enCurso = false, otraVez = false, temporizador = null, conflictos = 0, ultimoError = "";

  function programar(ms) {
    clearTimeout(temporizador);
    temporizador = setTimeout(sincronizar, ms == null ? 400 : ms);
  }

  /** ¿Hay algo en la aplicación que todavía no está en la base? */
  function hayPendientes() {
    for (const col of ORDEN) {
      const vistos = new Set();
      for (const [id, d] of registros(col)) { vistos.add(id); const f = foto[col].get(id); if (!f || f.json !== JSON.stringify(d)) return true; }
      for (const id of foto[col].keys()) if (!vistos.has(id)) return true;
    }
    return (BITACORA || []).some((e) => !e.h || !bitacoraEnBd.has(e.h));
  }

  async function sincronizar() {
    if (B.modo !== "bd") return;
    if (enCurso) { otraVez = true; return; }
    enCurso = true; let reintentar = 0;
    try {
      // 1) Crear y actualizar
      for (const col of ORDEN) {
        for (const [id, datos] of registros(col)) {
          const json = JSON.stringify(datos), f = foto[col].get(id);
          if (f && f.json === json) continue;
          const r = await pedir("PUT", `/${col}/${encodeURIComponent(id)}`, { version: f ? f.version : null, datos });
          if (r.estado === 200) foto[col].set(id, { version: r.j.version, json });
          else if (r.estado === 409) resolverConflicto(col, id, r.j);
          else if (r.estado === 422) reintentar = reintentar || 5000;
          else if (r.estado === 403) { ponerRegistro(col, id, f ? JSON.parse(f.json) : null); conflictos++; if (typeof toast === "function") toast((r.j && r.j.error) || "No tiene permiso para esta acción."); }
          else throw new Error((r.j && r.j.error) || "HTTP " + r.estado);
        }
      }
      // 2) Eliminar lo que la aplicación quitó (en orden inverso: primero las evaluaciones)
      for (const col of ORDEN.slice().reverse()) {
        const actuales = new Set(registros(col).map(([id]) => id));
        for (const [id, f] of [...foto[col].entries()]) {
          if (actuales.has(id)) continue;
          const r = await pedir("DELETE", `/${col}/${encodeURIComponent(id)}?version=${f.version}`);
          if (r.estado === 204) foto[col].delete(id);
          else if (r.estado === 409) resolverConflicto(col, id, r.j);
          else throw new Error((r.j && r.j.error) || "HTTP " + r.estado);
        }
      }
      // 3) Bitácora: solo se agregan entradas
      const nuevas = (BITACORA || []).filter((e) => { if (!e.h) e.h = huella(e); return !bitacoraEnBd.has(e.h); });
      if (nuevas.length) {
        const r = await pedir("POST", "/bitacora", { entradas: nuevas });
        if (r.estado !== 200) throw new Error((r.j && r.j.error) || "HTTP " + r.estado);
        nuevas.forEach((e) => bitacoraEnBd.add(e.h));
      }
      if (ultimoError) { ultimoError = ""; aviso(""); }
      if (conflictos) {
        conflictos = 0; escribirLocal();
        if (typeof toast === "function") toast("Otra persona hizo cambios al mismo tiempo: se cargó la versión más reciente.");
        if (rutaSegura() && !hayCapa()) render();
      }
      if (reintentar) programar(reintentar);
    } catch (e) {
      ultimoError = e.message || "sin conexión";
      aviso(`No se pudo guardar en la base de datos (${ultimoError}). Se reintentará automáticamente; no cierre esta ventana.`, "error");
      programar(10000);
    } finally {
      enCurso = false;
      if (otraVez) { otraVez = false; programar(50); }
    }
  }

  function resolverConflicto(col, id, j) {
    const actual = j && j.detalles ? j.detalles.actual : null;
    ponerRegistro(col, id, actual ? actual.datos : null);
    if (actual) foto[col].set(id, { version: actual.version, json: JSON.stringify(actual.datos) }); else foto[col].delete(id);
    conflictos++;
  }

  /* ------------------------------------------------ cambios hechos por otras personas */
  const hayCapa = () => { const c = document.getElementById("capas"); return !!(c && c.innerHTML.trim()); };
  /** Pantallas de consulta donde se puede refrescar sin perder lo que la persona está escribiendo. */
  function rutaSegura() {
    const h = location.hash || "";
    return h === "" || /^#\/(inicio|fincas|reportes|usuarios|bitacora|ingreso|codigo)?$/.test(h) || /^#\/finca\/[^/]+$/.test(h);
  }

  function aplicarTodo(d) {
    const c = d.colecciones;
    FINCAS = c.fincas.map((r) => r.datos);
    EVALS = c.evals.map((r) => r.datos);
    if (c.usuarios.length) { Object.keys(USUARIOS).forEach((k) => delete USUARIOS[k]); c.usuarios.forEach((r) => { USUARIOS[r.id] = completarUsuario(r.datos); }); }
    AVISOS = (c.avisos || []).map((r) => r.datos);
    PROCESOS = Object.fromEntries(c.procesos.map((r) => [r.id, r.datos]));
    BITACORA = d.bitacora;
    tomarFoto(d);
    escribirLocal();
  }

  async function revisarCambios() {
    if (B.modo !== "bd" || document.hidden || enCurso || hayCapa() || !rutaSegura()) return;
    try {
      const s = await pedir("GET", "/sello");
      if (s.estado !== 200 || s.j.sello === sello || hayPendientes()) return;
      const d = await pedir("GET", "");
      if (d.estado !== 200 || enCurso || hayCapa() || !rutaSegura() || hayPendientes()) return;
      aplicarTodo(d.j);
      render();
    } catch (e) { /* se intenta en la próxima revisión */ }
  }

  /* ------------------------------------------------ arranque */
  // Cada vez que la aplicación guarda una de sus listas, se programa el envío a la base.
  if (typeof store !== "undefined") {
    setOriginal = store.set.bind(store);
    store.set = function (k, v) { setOriginal(k, v); if (B.modo === "bd" && CLAVES.has(k)) programar(); };
  }

  /** Se llama cuando terminaron de cargar todos los scripts (js/arranque.js). */
  B.iniciar = function () {
    if (B.modo !== "bd") {
      aviso("Sin conexión con la base de datos: lo que haga se guarda solo en este navegador. Encienda la API (Docker) y recargue la página.", "aviso");
      return;
    }
    if (B.importar || B.inicial.vacio) {
      foto.fincas = new Map(); foto.evals = new Map(); foto.usuarios = new Map(); foto.procesos = new Map(); foto.avisos = new Map();
      bitacoraEnBd = new Set(); sello = B.inicial.sello;
    } else {
      tomarFoto(B.inicial);
    }
    B.inicial = null;
    sincronizar();                                             // sube lo nuevo (datos de ejemplo o lo que había en el navegador)
    setInterval(revisarCambios, 15000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) revisarCambios(); });
    window.addEventListener("beforeunload", (e) => { if (enCurso || hayPendientes()) { e.preventDefault(); e.returnValue = ""; } });
  };
  B.sincronizar = sincronizar;
  /** Otras rutas de la API (p. ej. /usuarios/:clave/enlace). Devuelve { estado, j }. */
  B.api = async (metodo, ruta, cuerpo) => {
    const x = await fetch("/api" + ruta, {
      method: metodo, cache: "no-store",
      headers: Object.assign({ "X-EBA-Usuario": encodeURIComponent(usuarioActual()), "X-EBA-Rol": rolActual(), "X-EBA-Clave": (typeof SES !== "undefined" && SES && yoClave()) || "" }, cuerpo ? { "Content-Type": "application/json" } : {}),
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    let j = null; try { j = await x.json(); } catch (e) { }
    return { estado: x.status, j };
  };
  B.hayPendientes = () => B.modo === "bd" && hayPendientes();
})();
