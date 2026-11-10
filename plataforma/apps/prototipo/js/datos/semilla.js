/* EBA Patos y Gansos · ICA — js/datos/semilla.js
   Evaluaciones de ejemplo: un proceso de Granja La Esperanza con su visita inicial (finalizada, histórico)
   y la visita de seguimiento 1 (en proceso), más una evaluación de gansos programada. */
"use strict";

/** Llena una evaluación con valores de ejemplo. bueno = probabilidad de 100 en las unidades; salta = indicadores sin registrar. */
function rellenarEjemplo(ev, semillaN, bueno, salta, ajustes) {
  const ctx = contexto(ev);
  const rnd = (seed) => { let x = seed; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); };
  lista(ev).forEach((ind, k) => {
    if (aplica(ind, ctx) || salta.includes(ind.code)) return;
    const m = ind.m, R = rnd(k + semillaN);
    if (m.kind === "auto") ev.resp[ind.code] = { rev: true, aux: Object.assign({ PR01: { 0: true, 1: true, 2: true, 3: true }, PR04: { 0: 812, 1: 30, 2: 20, 3: false },
      PR08: { 0: 812, 1: 25, 2: 24, 3: false }, PR06: { 0: true, 1: true, 2: true, 3: true }, PR09: { 0: true, 1: true, 2: false },
      PR12: { 0: true, 1: 15, 2: true, 3: true, 4: false }, GR01: { 0: true, 1: true, 2: true, 3: true } }, ajustes.auto || {})[ind.code] };
    if (m.kind === "units") ev.resp[ind.code] = { units: Array.from({ length: nUnidades(ind, ctx) }, () => (R() < bueno ? 100 : R() < 0.9 ? 55 : 0)) };
    if (m.kind === "cc") ev.resp[ind.code] = { units: Array.from({ length: nUnidades(ind, ctx) }, () => [3, 3, 4, 2, 3][Math.floor(R() * 5)]) };
    if (m.kind === "density") ev.resp[ind.code] = ajustes.density || { aves: 812, peso: 2.48, area: 100 };
    if (m.kind === "pct") ev.resp[ind.code] = Object.assign({ PR03: { total: 20, part: 17 }, PA01: { total: 120, part: 74 }, PA02: { total: 120, part: 12 }, PA10: { total: 5040, part: 312 } }, ajustes.pct || {})[ind.code];
    if (m.kind === "doc") ev.resp[ind.code] = (ajustes.doc || {})[ind.code] || { estado: "Válido", legible: true, sinCorr: true, firmado: true, contenido: true, matricula: true };
    if (m.kind === "bpumv") ev.resp[ind.code] = { revisado: true, checks: ajustes.bpumv || [true, true, true, true, true, false, true, false, false] };
  });
}
function sembrar() {
  const noValido = { estado: "No válido", legible: true, sinCorr: true, firmado: false, contenido: true };
  // Visita inicial del proceso (abril de 2026): finalizada y conservada como histórico
  const ev0 = { id: "EVA-2026-00072", finca: "FIN-2026-00417", sp: "pato", fecha: "2026-04-20", inspector: "inspector", estado: "Finalizada", finalizada: "2026-04-20T15:30:00",
    proceso: "PRC-2026-0001", visita: 0, apertura: { hora: "07:30", atiende: "Luis Pérez (mayordomo)", ingreso: "08:10" }, pobConfirmada: 790, resp: {}, obs: {},
    firmas: { productor: "Hernán Darío Mejía", inspector: "Camilo Andrés Peña" }, guardado: "2026-04-20T15:30:00", obsGeneral: "Primera visita del proceso. Se acuerda plan de mejora en ventilación y documentos del POE." };
  EVALS = [ev0];
  rellenarEjemplo(ev0, 31, 0.62, [], { auto: { PR09: { 0: true, 1: false, 2: false }, PR04: { 0: 790, 1: 24, 2: 20, 3: true } },
    pct: { PA01: { total: 240, part: 121, g: [{ total: 120, part: 40 }, { total: 120, part: 81 }] }, PA02: { total: 240, part: 12, g: [{ total: 120, part: 5 }, { total: 120, part: 7 }] }, PA10: { total: 5040, part: 640 } },
    doc: { PG04: noValido, PG05: noValido, PG06: { estado: "No presentado" }, PG07: noValido, PG09: { estado: "No presentado" } }, bpumv: [true, false, true, true, false, false, true, true, false] });
  ev0.obs.PA01 = "Galpón 1: 40 de 120 aves con jadeo; galpón 2: 81 de 120, sin ventilación.";
  ev0.obs.PA10 = "Mortalidad acumulada de 12,7 % en los últimos 5 ciclos.";
  ev0.plan = { PA01: { accion: "Instalar ventiladores en el galpón 2", resp: "Hernán Mejía", plazo: "2026-07-30" }, PG04: { accion: "POE firmado por el MVZ", resp: "Hernán Mejía", plazo: "2026-06-30" } };

  // Visita de seguimiento 1 (octubre de 2026): retoma la visita inicial; el inspector actualiza lo que cambió
  const ev = { id: "EVA-2026-00088", finca: "FIN-2026-00417", sp: "pato", fecha: "2026-10-15", inspector: "inspector", estado: "En proceso",
    proceso: "PRC-2026-0001", visita: 1, base: ev0.id, apertura: { hora: "07:10", atiende: "Luis Pérez (mayordomo)", ingreso: "08:00" }, pobConfirmada: 812,
    resp: {}, obs: {}, firmas: {}, guardado: null, plan: JSON.parse(JSON.stringify(ev0.plan)) };
  ev.anterior = fotoEvaluacion(ev0);
  EVALS.push(ev);
  rellenarEjemplo(ev, 7, 0.78, ["PR11", "PG09", "PA11"], {
    pct: { PA01: { total: 240, part: 80, g: [{ total: 120, part: 6 }, { total: 120, part: 74 }] }, PA02: { total: 240, part: 12, g: [{ total: 120, part: 4 }, { total: 120, part: 8 }] } },
    doc: { PG04: noValido, PG05: noValido, PG06: { estado: "Pendiente" } } });
  ev.obs.PA01 = "Galpón 1 mejoró con ventiladores (6 de 120). Galpón 2: ventiladores apagados, 74 de 120 aves con jadeo.";

  const ev2 = { id: "EVA-2026-00091", finca: "FIN-2026-00431", sp: "ganso", fecha: "2026-10-17", inspector: "inspector", estado: "Programada",
    proceso: "PRC-2026-0002", visita: 0, apertura: {}, pobConfirmada: null, resp: {}, obs: {}, firmas: {}, guardado: null };
  EVALS.push(ev2);

  // Finca de traspatio que cumplió todos los criterios en la visita inicial: el proceso se cerró sin seguimientos
  const ev3 = { id: "EVA-2026-00065", finca: "FIN-2025-00198", sp: "pato", fecha: "2026-09-10", inspector: "inspector", estado: "Finalizada", finalizada: "2026-09-10T11:20:00",
    proceso: "PRC-2026-0003", visita: 0, apertura: { hora: "08:00", atiende: "Rosa Elena Quintero", ingreso: "08:20", bebederos: 3, comederos: 2 }, pobConfirmada: 27, resp: {}, obs: {},
    firmas: { productor: "Rosa Elena Quintero", inspector: "Camilo Andrés Peña" }, guardado: "2026-09-10T11:20:00", obsGeneral: "Patio limpio, aves con buen plumaje y acceso al estanque." };
  EVALS.push(ev3);
  rellenarEjemplo(ev3, 5, 1, [], { auto: { PR04: { 0: 18, 1: 3, 2: 6, 3: false }, PR08: { 0: 18, 1: 2, 2: 9, 3: false }, PR09: { 0: true, 1: true, 2: true } },
    pct: { PA02: { total: 18, part: 0 } }, density: { aves: 18, peso: 2.2, area: 12 } });
  return EVALS;
}
if (!EVALS) { EVALS = []; EVALS = sembrar(); guardar(); }
migrarProcesos();
