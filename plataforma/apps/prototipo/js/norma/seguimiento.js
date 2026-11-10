/* EBA Patos y Gansos · ICA — js/norma/seguimiento.js
   Procesos de evaluación y visitas de seguimiento.
   - Un proceso empieza con la visita inicial (visita 0) de una finca y una especie.
   - Al finalizar cada visita se valida el cumplimiento (CRITERIO_CUMPLE). Si cumple, el proceso queda «Cumplido» y no pide más seguimientos.
   - Si no cumple, se programan hasta SEGUIMIENTOS_BASE (3) seguimientos; el coordinador o el administrador puede ampliar
     hasta MAX_SEGUIMIENTOS (5) con un motivo. Agotados, el proceso queda «Cerrado sin cumplir».
   - El resultado final del proceso es el de su última visita.
   - Cada seguimiento retoma la última evaluación finalizada: copia lo registrado y el inspector actualiza lo que cambió.
   - Las evaluaciones finalizadas no se modifican: quedan como histórico.
   - Agotados los seguimientos (o cuando se decida), se inicia un proceso nuevo, desde cero o retomando la última evaluación. */
"use strict";

const SEGUIMIENTOS_BASE = 3, MAX_SEGUIMIENTOS = 5;
/** Criterio de cumplimiento (decisión del equipo): nivel Excelente (Tabla 2), ningún indicador en 0 y sin información pendiente. */
const CRITERIO_CUMPLE = { puntajeMin: 90, sinCeros: true, sinPendientes: true };
const maxSeguimientos = (pid) => (PROCESOS[pid] && PROCESOS[pid].ampliado ? MAX_SEGUIMIENTOS : SEGUIMIENTOS_BASE);
/** Verifica si una visita cumple. Devuelve { cumple, motivos[] } con lo que le falta. */
function verificarCumplimiento(ev) {
  const r = resultado(ev), motivos = [];
  if (r.total < CRITERIO_CUMPLE.puntajeMin) motivos.push(`Puntaje ${fmt(r.total)}: se requiere ${CRITERIO_CUMPLE.puntajeMin} o más (nivel Excelente)`);
  const ceros = r.filas.filter((x) => x.score === 0);
  if (CRITERIO_CUMPLE.sinCeros && ceros.length) motivos.push(`${ceros.length} indicador${ceros.length > 1 ? "es" : ""} en 0: ${ceros.map((x) => x.ind.num).join(", ")}`);
  if (CRITERIO_CUMPLE.sinPendientes && r.pend) motivos.push(`${r.pend} indicador${r.pend > 1 ? "es" : ""} sin calificar`);
  if (CRITERIO_CUMPLE.sinPendientes && r.provisional) motivos.push("Documentos pendientes de entrega");
  return { cumple: !motivos.length, motivos, r };
}
const copia = (x) => JSON.parse(JSON.stringify(x ?? {}));
const nombreVisita = (ev) => (ev.visita ? `Seguimiento ${ev.visita} de ${maxSeguimientos(ev.proceso)}` : "Visita inicial");
const nombreCorto = (ev) => (ev.visita ? `Seg. ${ev.visita}` : "Inicial");

/** Las evaluaciones guardadas antes de esta versión quedan como visita inicial de su propio proceso. */
function migrarProcesos() {
  (EVALS || []).forEach((e) => { if (!e.proceso) { e.proceso = "PRC-" + e.id.replace(/^EVA-/, ""); e.visita = 0; } });
}
function nuevoIdProceso() {
  const anio = new Date().getFullYear(), usados = new Set(EVALS.map((e) => e.proceso));
  let n = usados.size + 1, id;
  do { id = `PRC-${anio}-${String(n++).padStart(4, "0")}`; } while (usados.has(id));
  return id;
}
function nuevoIdEvaluacion() {
  const usados = new Set(EVALS.map((e) => e.id));
  let n = 100 + EVALS.length, id;
  do { id = `EVA-${new Date().getFullYear()}-${String(n++).padStart(5, "0")}`; } while (usados.has(id));
  return id;
}
/** Visitas de un proceso, en orden. */
const visitasProceso = (pid) => EVALS.filter((e) => e.proceso === pid && e.estado !== "Anulada").sort((a, b) => a.visita - b.visita);
/** Procesos de una finca y especie (el más reciente primero). */
function procesosDe(fincaId, sp) {
  const ids = [...new Set(EVALS.filter((e) => e.finca === fincaId && (!sp || e.sp === sp)).map((e) => e.proceso))];
  return ids.map((pid) => estadoProceso(pid)).sort((a, b) => (b.ultima.fecha || "").localeCompare(a.ultima.fecha || ""));
}
/** Estado de un proceso: visitas, cumplimiento, seguimientos usados y acciones posibles.
 *  estado: «En curso» (visita abierta) · «En seguimiento» (puede programar el siguiente) · «Cumplido» · «Requiere ampliación» · «Cerrado sin cumplir». */
function estadoProceso(pid) {
  const v = visitasProceso(pid), ultima = v[v.length - 1], max = maxSeguimientos(pid);
  const usados = Math.max(0, ...v.map((e) => e.visita || 0));
  const abierta = v.find((e) => e.estado !== "Finalizada");
  const otraAbierta = EVALS.some((e) => e.finca === ultima.finca && e.sp === ultima.sp && ["En proceso", "Programada"].includes(e.estado));
  const visitaCumple = v.find((e) => e.estado === "Finalizada" && verificarCumplimiento(e).cumple);
  const ver = ultima.estado === "Finalizada" ? verificarCumplimiento(ultima) : null;
  const agotado = usados >= max, puedeAmpliar = !visitaCumple && !abierta && agotado && max < MAX_SEGUIMIENTOS;
  const estado = visitaCumple ? "Cumplido" : abierta ? (abierta.estado === "Programada" && abierta.visita > 0 ? "Seguimiento programado" : "En curso") : agotado ? (puedeAmpliar ? "Requiere ampliación" : "Cerrado sin cumplir") : "En seguimiento";
  return { id: pid, visitas: v, ultima, finca: ultima.finca, sp: ultima.sp, usados, max, restantes: max - usados, abierta, estado,
    cumplido: !!visitaCumple, visitaCumple, verificacion: ver, cerrado: estado === "Cumplido" || estado === "Cerrado sin cumplir",
    completo: agotado, puedeAmpliar, ampliacion: PROCESOS[pid] && PROCESOS[pid].ampliado,
    puedeSeguimiento: !visitaCumple && !abierta && !otraAbierta && ultima.estado === "Finalizada" && usados < max,
    puedeNuevo: !otraAbierta && (estado === "Cumplido" || estado === "Cerrado sin cumplir" || estado === "Requiere ampliación"),
    final: estado === "Cumplido" || estado === "Cerrado sin cumplir" ? ultima : null };
}
/** Amplía el proceso de 3 a 5 seguimientos (coordinador o administrador, con motivo). */
function ampliarProceso(pid, motivo) {
  const st = estadoProceso(pid);
  if (!st.puedeAmpliar) return { error: "El proceso no requiere ampliación." };
  if (!String(motivo || "").trim()) return { error: "Escriba el motivo de la ampliación." };
  PROCESOS[pid] = Object.assign({}, PROCESOS[pid], { ampliado: { motivo: String(motivo).trim(), por: USUARIOS[SES.rol].nombre, fecha: new Date().toISOString() } });
  log(`Ampliación del proceso ${pid} a ${MAX_SEGUIMIENTOS} seguimientos: ${motivo}`); guardar();
  return { ok: true };
}
/** Fecha sugerida para el siguiente seguimiento: el día siguiente al plazo más lejano del plan de mejora;
 *  sin plazos, 30 días después de hoy. Devuelve { fecha, plazoMax, accion } (plazoMax/accion: la acción de plazo más lejano). */
function fechaSugeridaSeguimiento(ev) {
  const hoyISO = new Date().toISOString().slice(0, 10), mas = (iso, d) => { const x = new Date(iso + "T12:00"); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
  const plazos = Object.entries(ev.plan || {}).filter(([, v]) => v && v.plazo).sort((a, b) => b[1].plazo.localeCompare(a[1].plazo));
  if (!plazos.length) return { fecha: mas(hoyISO, 30), plazoMax: null, accion: null };
  const [code, v] = plazos[0], f = mas(v.plazo, 1);
  return { fecha: f < hoyISO ? mas(hoyISO, 1) : f, plazoMax: v.plazo, accion: IND[code] ? `${IND[code].num} ${IND[code].name}` : code };
}
/** Aviso (no bloquea) cuando la visita queda antes del plazo más lejano del plan de mejora. */
function avisoFechaSeguimiento(ev, fechaISO) {
  const s = fechaSugeridaSeguimiento(ev);
  return s.plazoMax && fechaISO && fechaISO <= s.plazoMax ? `La visita queda antes de que venza la acción ${s.accion} (plazo ${fecha(new Date(s.plazoMax + "T07:00"))}). Puede continuar si así se acordó con el productor.` : "";
}
/** Programa el siguiente seguimiento del proceso con la fecha indicada (al cerrar sin cumplir o al ampliar). */
function programarSeguimiento(pid, fechaISO) {
  const r = crearSeguimiento(pid); if (r.error) return r;
  r.ev.fecha = fechaISO || r.ev.fecha; log(`${nombreVisita(r.ev)} programado para el ${r.ev.fecha} (${r.ev.id})`); guardar();
  return r;
}
/** Cambia la fecha de un seguimiento programado que aún no se ha iniciado. */
function reprogramarSeguimiento(ev, fechaISO) {
  if (!ev || ev.estado !== "Programada") return { error: "Solo se puede reprogramar una visita que aún no se ha iniciado." };
  if (!fechaISO) return { error: "Indique la nueva fecha." };
  if (fechaISO < new Date().toISOString().slice(0, 10)) return { error: "La fecha no puede ser anterior a hoy." };
  const antes = ev.fecha; ev.fecha = fechaISO; log(`Reprogramación de ${ev.id}: ${antes} → ${fechaISO}`); guardar();
  return { ok: true };
}
/** Foto de la evaluación base para comparar: puntaje de cada indicador y total. */
function fotoEvaluacion(base) {
  const r = resultado(base), sc = {};
  lista(base).forEach((i) => { const c = calcular(i, base.resp[i.code], r.ctx); sc[i.code] = c.done ? c.score : null; });
  return { id: base.id, fecha: base.fecha, visita: base.visita || 0, total: r.total, med: r.med, scores: sc };
}
function evaluacionDesde(base, extra) {
  const hoyISO = new Date().toISOString().slice(0, 10);
  return Object.assign({ id: nuevoIdEvaluacion(), finca: base.finca, sp: base.sp, fecha: hoyISO, inspector: base.inspector || "inspector", estado: "Programada",
    apertura: { atiende: base.apertura?.atiende || "", bebederos: base.apertura?.bebederos, comederos: base.apertura?.comederos, puntosSC: base.apertura?.puntosSC, avesPuntoSC: base.apertura?.avesPuntoSC },
    pobConfirmada: base.pobConfirmada ?? null, pobEsp: base.pobEsp ? copia(base.pobEsp) : undefined, resp: copia(base.resp), obs: copia(base.obs), firmas: {}, plan: copia(base.plan), guardado: null,
    anterior: fotoEvaluacion(base), base: base.id }, extra);
}
/** Crea la visita de seguimiento siguiente: retoma todo lo registrado en la última evaluación finalizada del proceso. */
function crearSeguimiento(pid) {
  const st = estadoProceso(pid);
  if (!st.puedeSeguimiento) return { error: st.cumplido ? "La finca ya cumple: el proceso está cerrado y no requiere más seguimientos."
    : st.puedeAmpliar ? `Se usaron los ${st.max} seguimientos programados: el coordinador puede ampliar a ${MAX_SEGUIMIENTOS}.`
    : st.completo ? `El proceso ya usó sus ${st.max} seguimientos.` : "La última visita del proceso debe estar finalizada y no puede haber otra evaluación abierta de esta finca y especie." };
  const ev = evaluacionDesde(st.ultima, { proceso: pid, visita: st.usados + 1 });
  EVALS.push(ev); log(`Visita de seguimiento ${ev.visita} de ${st.max} (${ev.id}) del proceso ${pid}, retomando ${st.ultima.id}`); guardar();
  return { ev };
}
/** Inicia un proceso nuevo para una finca y especie, desde cero o retomando una evaluación anterior (que queda en el histórico). */
function crearProceso(fincaId, sp, retomarId, fecha) {
  if (EVALS.some((e) => e.finca === fincaId && e.sp === sp && ["En proceso", "Programada"].includes(e.estado))) return { error: "Ya hay una evaluación abierta para esta finca y especie." };
  const pid = nuevoIdProceso(), base = retomarId && EVALS.find((e) => e.id === retomarId);
  const ev = base ? evaluacionDesde(base, { proceso: pid, visita: 0, fecha: fecha || new Date().toISOString().slice(0, 10) })
    : { id: nuevoIdEvaluacion(), finca: fincaId, sp, fecha: fecha || new Date().toISOString().slice(0, 10), inspector: "inspector", estado: "Programada", apertura: {}, pobConfirmada: null, resp: {}, obs: {}, firmas: {}, guardado: null, proceso: pid, visita: 0 };
  EVALS.push(ev); log(`Nuevo proceso ${pid} (${ev.id})${base ? ` retomando ${base.id}` : " desde cero"}`); guardar();
  return { ev };
}
/** Cambios de cada indicador frente a la visita anterior. */
function cambiosFrenteAnterior(ev) {
  if (!ev.anterior) return null;
  const ctx = contexto(ev), out = { mejoro: [], empeoro: [], completado: [], igual: 0, pendiente: [] };
  lista(ev).forEach((i) => {
    if (aplica(i, ctx)) return;
    const c = calcular(i, ev.resp[i.code], ctx), antes = ev.anterior.scores[i.code], ahora = c.done ? c.score : null;
    if (ahora == null) { out.pendiente.push(i); return; }
    if (antes == null) out.completado.push([i, ahora]);
    else if (ahora > antes + 1e-9) out.mejoro.push([i, antes, ahora]);
    else if (ahora < antes - 1e-9) out.empeoro.push([i, antes, ahora]);
    else out.igual++;
  });
  return out;
}
