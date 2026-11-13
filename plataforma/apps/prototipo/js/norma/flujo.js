/* EBA Patos y Gansos · ICA — js/norma/flujo.js
   Flujo de trabajo por finca y especie: estado de la evaluación (Por asignar · Asignada · En proceso · Devuelta · Pendiente de aprobación · Aprobada),
   acción que corresponde y siguiente indicador pendiente. Todo se calcula con lo guardado; nada se marca a mano. */
"use strict";

/* Estados por finca y especie (v0.25: el coordinador asigna, el inspector evalúa y finaliza, el coordinador aprueba o devuelve). */
const ESTADOS_FLUJO = ["Por asignar", "Asignada", "En proceso", "Devuelta", "Pendiente de aprobación", "Aprobada", "Seguimiento programado"];
/* El productor ve una versión simple: no ve avances ni puntajes hasta que el coordinador aprueba. */
/* Con la constancia (v0.25): si la última visita aprobada cumple, «Certificada»; si no cumple, «Plan de mejora» (hasta el siguiente seguimiento). */
const ESTADOS_PRODUCTOR = ["Sin programar", "En evaluación", "En revisión del ICA", "Plan de mejora", "Certificada", "Constancia vencida"];
const VISTA_PRODUCTOR = { "Por asignar": "Sin programar", Asignada: "En evaluación", "En proceso": "En evaluación", Devuelta: "En evaluación", "Pendiente de aprobación": "En revisión del ICA", "Seguimiento programado": "Plan de mejora" };
const COLOR_FLUJO = { "Por asignar": "e-gris", Asignada: "e-info", "En proceso": "e-medio", Devuelta: "e-alerta", "Pendiente de aprobación": "e-rev", Aprobada: "e-ok", "Seguimiento programado": "e-seg",
  "Sin programar": "e-gris", "En evaluación": "e-medio", "En revisión del ICA": "e-rev", "Plan de mejora": "e-seg", Certificada: "e-ok", "Constancia vencida": "e-gris" };
const esProductor = () => !!SES && SES.rol === "productor";
/** Coordinador o administrador: registran fincas, asignan, reasignan y gestionan los seguimientos. Aprobar o devolver es solo del coordinador. */
const esGestor = () => !!SES && ["coordinador", "admin"].includes(SES.rol);
/** Texto del estado según quién mira. */
function textoFlujo(s) {
  if (!esProductor()) return s.estado;
  if (s.estado === "Aprobada") { const c = s.ultimaFin && s.ultimaFin.constancia; return c ? (constanciaVigente(c) ? "Certificada" : "Constancia vencida") : "Plan de mejora"; }
  return VISTA_PRODUCTOR[s.estado] || s.estado;
}
/* ---- Constancia de cumplimiento: se emite al aprobar una visita en la que la finca cumple (una por especie, vigencia 1 año) ---- */
const VIGENCIA_CONSTANCIA_MESES = 12;
const constanciaVigente = (c) => !!c && new Date().toISOString().slice(0, 10) <= c.vence;
/** Emite la constancia de la visita aprobada (código consecutivo CER-AAAA-NNNNN y código de verificación). */
function emitirConstancia(ev) {
  if (ev.constancia) return ev.constancia;
  const hoy = new Date(), anio = hoy.getFullYear(), n = EVALS.filter((e) => e.constancia && e.constancia.codigo.startsWith(`CER-${anio}-`)).length + 1;
  const vence = new Date(hoy); vence.setMonth(vence.getMonth() + VIGENCIA_CONSTANCIA_MESES); vence.setDate(vence.getDate() - 1);
  const al = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", v = Array.from({ length: 8 }, () => al[Math.floor(Math.random() * al.length)]).join("");
  const r = resultado(ev);
  ev.constancia = { codigo: `CER-${anio}-${String(n).padStart(5, "0")}`, verificacion: `${v.slice(0, 4)}-${v.slice(4)}`, emitida: hoy.toISOString(), vence: vence.toISOString().slice(0, 10),
    puntaje: Math.round(r.total * 10) / 10, nivel: r.nivel[0] };
  return ev.constancia;
}
/** Lista de estados que se muestran al usuario actual (filtros y tablero). */
const estadosLista = () => (esProductor() ? ESTADOS_PRODUCTOR : ESTADOS_FLUJO);
/** ¿El usuario actual puede diligenciar esta visita? Solo el inspector asignado y mientras no esté enviada ni aprobada. */
const puedeEvaluar = (ev) => !!SES && SES.rol === "inspector" && ev.inspector === yoClave() && ["Programada", "En proceso", "Devuelta"].includes(ev.estado);
/** ¿El usuario actual puede ver el detalle de la visita? El productor solo cuando está aprobada; el inspector, solo las suyas. */
function puedeVerEval(ev) {
  if (!SES) return false;
  if (SES.rol === "productor") return ev.estado === "Finalizada" && fincasVisibles().some((f) => f.id === ev.finca);
  if (SES.rol === "inspector") return ev.inspector === yoClave() || (ev.estado === "Finalizada" && fincasVisibles().some((f) => f.id === ev.finca));
  return true;
}
/** Historial: el inspector ve sus visitas y las aprobadas de otros inspectores en las fincas que le asignaron (no las ajenas en curso). */
const enHistorial = (e) => !SES || SES.rol !== "inspector" || e.inspector === yoClave() || e.estado === "Finalizada";
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
  if (!["Programada", "En proceso", "Devuelta"].includes(ev.estado)) return "resultado";
  if (!ev.apertura || !ev.apertura.atiende) return "apertura";
  return siguientePendiente(ev) || "cierre";
}
/** Destino del botón «Continuar evaluando lista de indicadores»: primer indicador pendiente o el cierre. */
const destinoLista = (ev) => `#/eval/${ev.id}/${siguientePendiente(ev) || "cierre"}`;

/** Estado de la evaluación de una finca para una especie y la acción que corresponde al perfil.
 *  Por asignar = sin visita abierta ni aprobada · Asignada = el coordinador la asignó y aún no se registra nada (estado «Programada»)
 *  En proceso = el inspector ya registró algo · Devuelta = el coordinador la devolvió con una observación
 *  Pendiente de aprobación = el inspector la finalizó y espera al coordinador · Aprobada = el coordinador la aprobó (estado «Finalizada»)
 *  Seguimiento programado = la última visita aprobada no cumplió y el siguiente seguimiento ya tiene fecha e inspector. */
function estadoEspecie(f, sp) {
  const evs = evaluacionesDe(f.id, sp), abierta = evs.find(esAbierta);
  const ultimaFin = evs.find((e) => e.estado === "Finalizada"), proc = procesosDe(f.id, sp)[0] || null;
  const rol = SES ? SES.rol : null, activa = f.estado === "ACTIVA", mia = !!abierta && abierta.inspector === (SES && yoClave());
  const out = { f, sp, evs, abierta, ultimaFin, proc, ev: abierta || ultimaFin || null, principal: null, secundaria: null };
  const ver = (e, t) => ({ texto: t || "Ver resultados", href: `#/eval/${e.id}/resultado` });
  if (abierta) out.estado = abierta.estado === "Programada" ? (abierta.visita > 0 && ultimaFin ? "Seguimiento programado" : "Asignada")
    : abierta.estado === "Pendiente de aprobación" ? "Pendiente de aprobación" : abierta.estado === "Devuelta" ? "Devuelta" : "En proceso";
  else out.estado = ultimaFin ? "Aprobada" : "Por asignar";
  if (rol === "inspector") {
    if (abierta && mia && activa && abierta.estado === "Programada" && abierta.visita > 0) out.secundaria = { texto: "Reprogramar", reprog: abierta.id };
    if (abierta && mia && activa) out.principal = abierta.estado === "Programada" ? { texto: abierta.visita > 0 ? "Iniciar seguimiento" : "Iniciar inspección", href: `#/eval/${abierta.id}` }
      : abierta.estado === "En proceso" ? { texto: "Continuar inspección", href: `#/eval/${abierta.id}/${pasoContinuar(abierta)}` }
      : abierta.estado === "Devuelta" ? { texto: "Corregir y reenviar", href: `#/eval/${abierta.id}/cierre` }
      : Object.assign(ver(abierta, "Ver lo enviado"), { sec: true });
    else if (abierta && !mia) out.nota = "Asignada a otro inspector";
    else if (ultimaFin) out.principal = Object.assign(ver(ultimaFin), { sec: true });   // historial: también las aprobadas de otros inspectores
  } else if (rol === "coordinador" || rol === "admin") {
    if (out.estado === "Por asignar") out.principal = activa ? { texto: "Asignar inspector", asignar: `${f.id}|${sp}` } : null;
    else if (out.estado === "Pendiente de aprobación") out.principal = rol === "coordinador" ? ver(abierta, "Revisar y aprobar") : Object.assign(ver(abierta, "Ver lo enviado"), { sec: true });   // aprobar: solo el coordinador
    else if (out.estado === "Asignada" || out.estado === "Seguimiento programado") out.principal = activa ? { texto: "Reasignar", reasignar: abierta.id, sec: true } : null;
    else if (abierta) out.principal = Object.assign(ver(abierta, "Ver avance"), { sec: true });
    else {
      out.principal = Object.assign(ver(ultimaFin), { sec: true });
      if (activa && proc && proc.puedeSeguimiento) out.secundaria = { texto: `Asignar seguimiento ${proc.usados + 1} de ${proc.max}`, asignar: `${f.id}|${sp}` };
      else if (activa && proc && proc.puedeNuevo) out.secundaria = { texto: "Asignar nueva inspección", asignar: `${f.id}|${sp}` };
    }
  } else if (ultimaFin) out.principal = Object.assign(ver(ultimaFin), { sec: true });   // productor: solo lo aprobado
  return out;
}
/** Estados de todas las especies de la finca. */
const estadosFinca = (f) => f.especies.map((e) => estadoEspecie(f, e.sp));
/** Fincas que ve el usuario actual (el productor solo las suyas). */
/** Fincas que ve el usuario actual: el productor, las suyas; el inspector, las que tienen una visita asignada a él; el resto, todas. */
const fincasVisibles = () => (!SES ? [] : SES.rol === "productor" ? FINCAS.filter((f) => f.productor === yo().nombre)
  : SES.rol === "inspector" ? FINCAS.filter((f) => EVALS.some((e) => e.finca === f.id && e.inspector === yoClave() && e.estado !== "Anulada")) : FINCAS);
/** Conteo de fincas activas por estado (una finca con patos y gansos cuenta en cada estado que tenga alguna de sus especies).
 *  Las fincas inactivas no cuentan: no se programan visitas en ellas, aunque su historial se conserva. */
function contarEstados(fs) {
  const n = Object.fromEntries(estadosLista().map((e) => [e, 0]));
  fs.filter((f) => f.estado === "ACTIVA").forEach((f) => new Set(estadosFinca(f).map(textoFlujo)).forEach((e) => n[e]++));
  return n;
}
