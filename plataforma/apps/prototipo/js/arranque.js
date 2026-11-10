/* EBA Patos y Gansos · ICA — js/arranque.js
   Arranque conectado a la base de datos:
   1) pide a la API todos los datos guardados en MariaDB (GET /api/sincronizacion);
   2) los deja listos donde la aplicación los lee (almacenamiento del navegador);
   3) carga los scripts de la aplicación en orden.
   Si la API no responde (por ejemplo, al abrir el archivo sin Docker), la aplicación funciona solo en el navegador. */
"use strict";
(function () {
  const SCRIPTS = [
    "js/datos/norma.js",
    "js/datos/norma_textos.js",
    "js/nucleo/utilidades.js",
    "js/nucleo/conexion.js",
    "js/datos/ejemplo.js",
    "js/norma/calculo.js",
    "js/norma/seguimiento.js",
    "js/norma/flujo.js",
    "js/datos/semilla.js",
    "js/nucleo/sesion.js",
    "js/ui/capas.js",
    "js/ui/iconos.js",
    "js/ui/graficas.js",
    "js/vistas/ingreso.js",
    "js/ui/estructura.js",
    "js/vistas/inicio.js",
    "js/vistas/fincas.js",
    "js/vistas/evaluaciones.js",
    "js/vistas/indicador.js",
    "js/vistas/recorrido.js",
    "js/vistas/recorrido_ganso.js",
    "js/vistas/resultado.js",
    "js/vistas/asistente.js",
    "js/datos/norma_paginas.js",
    "js/vistas/asistente_norma.js",
    "js/vistas/reportes.js",
    "js/vistas/administracion.js",
    "js/vistas/ayuda.js",
    "js/app.js",
    "js/ui/boton-asistente.js"
  ];
  const LS = (k) => "eba7." + k;
  const escribir = (k, v) => { try { localStorage.setItem(LS(k), JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const hayLocal = () => { try { return localStorage.getItem(LS("fincas")) !== null || localStorage.getItem(LS("evals")) !== null; } catch (e) { return false; } };
  const limpiar = () => { try { ["fincas", "evals", "bitacora", "usuarios", "procesos"].forEach((k) => localStorage.removeItem(LS(k))); } catch (e) { } };

  /** Estado de la conexión, compartido con js/nucleo/conexion.js. */
  window.EBA_BD = { modo: "navegador", inicial: null, importar: false, datosEjemplo: true };

  function cargarScripts() {
    SCRIPTS.forEach((src, i) => {
      const s = document.createElement("script");
      s.src = src; s.async = false;                       // se ejecutan en el orden de la lista
      if (i === SCRIPTS.length - 1) s.onload = () => window.EBA_BD.iniciar && window.EBA_BD.iniciar();
      document.body.appendChild(s);
    });
  }

  const control = new AbortController();
  setTimeout(() => control.abort(), 5000);   // si la API no responde en 5 s, se trabaja en el navegador
  fetch("/api/sincronizacion", { cache: "no-store", signal: control.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
    .then((d) => {
      const B = window.EBA_BD;
      B.modo = "bd"; B.inicial = d; B.datosEjemplo = d.datosEjemplo; B.asistenteServidor = d.asistente || null; B.departamentos = (d.catalogos && d.catalogos.departamentos) || null;
      if (d.vacio) {
        if (hayLocal()) B.importar = true;                 // la base está vacía: se sube lo que ya había en este navegador
        else if (d.datosEjemplo) limpiar();                // desarrollo: la aplicación crea sus datos de ejemplo y se suben
        else { escribir("fincas", []); escribir("evals", []); escribir("usuarios", []); escribir("procesos", {}); escribir("bitacora", []); }
      } else {
        const c = d.colecciones;
        escribir("fincas", c.fincas.map((r) => r.datos));
        escribir("evals", c.evals.map((r) => r.datos));
        escribir("usuarios", c.usuarios.map((r) => r.datos));
        escribir("procesos", Object.fromEntries(c.procesos.map((r) => [r.id, r.datos])));
        escribir("bitacora", d.bitacora);
      }
    })
    .catch((e) => { console.warn("EBA: sin conexión con la API; se trabaja solo en este navegador.", e && e.message); })
    .finally(cargarScripts);
})();
