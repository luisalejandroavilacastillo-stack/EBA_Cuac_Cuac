/* EBA Patos y Gansos · ICA — js/norma/flujo.js
   Flujo de trabajo por finca y especie: estado de la evaluación (Por iniciar · En proceso · Finalizada),
   acción que corresponde y siguiente indicador pendiente. Todo se calcula con lo guardado; nada se marca a mano. */
"use strict";

const ESTADOS_FLUJO = ["Por iniciar", "En proceso", "Finalizada", "Seguimiento programado"];
const COLOR_FLUJO = { "Por iniciar": "e-info", "En proceso": "e-medio", Finalizada: "e-ok", "Seguimiento programado": "e-seg" };
const nombreSp = (sp) => (sp === "pato" ? "Patos" : "Gansos");
/** «1 finca», «3 fincas». */
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/** Evaluaciones de una finca y especie, la más reciente primero (las anuladas no cuentan). */
function evaluacionesDe(fincaId, sp) {
  return EVALS.filter((e) => e.finca === fincaId && e.sp === sp && e.estado !== "Anulada")
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || (b.visita || 0) - (a.visita || 0));
}

/** Indicadores aplicables que aún no tienen calificación, en el orden de la norma. */
function pendientesEval(ev) {
  const ctx = contexto(ev);
  return lista(ev).filter((i) => !aplica(i, ctx) && !calcular(i, ev.resp[i.code], ctx).done);
}
/** Siguiente indicador pendiente después de «desde» (da la vuelta a la lista); null si no queda ninguno. */
function siguientePendiente(ev, desde) {
  const pend = pendientesEval(ev); if (!pend.length) return null;
  if (!desde) return pend[0].code;
  const todos = lista(ev), k = todos.findIndex((i) => i.code === desde);
  const despues = pend.find((i) => todos.indexOf(i) > k && i.code !== desde);
  return (despues || pend.find((i) => i.code !== desde) || null)?.code || null;
}
/** Paso lógico para continuar una evaluación: apertura si falta, luego el primer indicador pendiente y, si no queda, el cierre. */
function pasoContinuar(ev) {
  if (ev.estado === "Finalizada") return "resultado";
  if (!ev.apertura || !ev.apertura.atiende) return "apertura";
  return siguientePendiente(ev) || "cierre";
}
/** Destino del botón «Continuar evaluando lista de indicadores»: primer indicador pendiente o el cierre. */
const destinoLista = (ev) => `#/eval/${ev.id}/${siguientePendiente(ev) || "cierre"}`;

/** Estado de la evaluación de una finca para una especie.
 *  Por iniciar = sin evaluaciones o con una visita programada en la que aún no se registra nada (estado «Programada»).
 *  En proceso  = la visita abierta ya tiene registros (estado «En proceso»).
 *  Finalizada  = la última visita está finalizada. Cada visita nueva se crea aparte: el historial no se sobrescribe.
 *  Seguimiento programado = la última visita finalizó sin cumplir y el siguiente seguimiento ya tiene fecha (se crea al cerrar). */
function estadoEspecie(f, sp) {
  const evs = evaluacionesDe(f.id, sp), abierta = evs.find((e) => ["En proceso", "Programada"].includes(e.estado));
  const ultimaFin = evs.find((e) => e.estado === "Finalizada"), proc = procesosDe(f.id, sp)[0] || null;
  const opera = SES && SES.rol !== "productor" && f.estado === "ACTIVA";
  const out = { f, sp, evs, abierta, ultimaFin, proc, ev: abierta || ultimaFin || null, principal: null, secundaria: null };
  if (abierta && abierta.estado === "En proceso") {
    out.estado = "En proceso";
    out.principal = { texto: opera ? "Continuar inspección" : "Ver avance", href: `#/eval/${abierta.id}/${opera ? pasoContinuar(abierta) : "resultado"}` };
  } else if (abierta && abierta.visita > 0 && ultimaFin) {
    out.estado = "Seguimiento programado";
    out.principal = opera ? { texto: "Iniciar seguimiento", href: `#/eval/${abierta.id}` } : { texto: "Ver resultados", href: `#/eval/${ultimaFin.id}/resultado` };
  } else if (abierta) {
    out.estado = "Por iniciar";
    out.principal = opera ? { texto: "Nueva inspección", href: `#/eval/${abierta.id}` } : null;   // ya programada: abre esa visita (no crea otra)
  } else if (ultimaFin) {
    out.estado = "Finalizada";
    out.principal = { texto: "Ver resultados", href: `#/eval/${ultimaFin.id}/resultado` };
    if (opera && proc && proc.puedeSeguimiento) out.secundaria = { texto: `Programar seguimiento ${proc.usados + 1} de ${proc.max}`, nueva: `${f.id}|${sp}` };
    else if (opera && proc && proc.puedeNuevo) out.secundaria = { texto: "Nueva evaluación", nueva: `${f.id}|${sp}` };
  } else {
    out.estado = "Por iniciar";
    out.principal = opera ? { texto: "Nueva inspección", nueva: `${f.id}|${sp}` } : null;
  }
  return out;
}
/** Estados de todas las especies de la finca. */
const estadosFinca = (f) => f.especies.map((e) => estadoEspecie(f, e.sp));
/** Fincas que ve el usuario actual (el productor solo las suyas). */
const fincasVisibles = () => (SES && SES.rol === "productor" ? FINCAS.filter((f) => f.productor === USUARIOS[SES.rol].nombre) : FINCAS);
/** Conteo de fincas activas por estado (una finca con patos y gansos cuenta en cada estado que tenga alguna de sus especies).
 *  Las fincas inactivas no cuentan: no se programan visitas en ellas, aunque su historial se conserva. */
function contarEstados(fs) {
  const n = { "Por iniciar": 0, "En proceso": 0, Finalizada: 0, "Seguimiento programado": 0 };
  fs.filter((f) => f.estado === "ACTIVA").forEach((f) => new Set(estadosFinca(f).map((s) => s.estado)).forEach((e) => n[e]++));
  return n;
}
