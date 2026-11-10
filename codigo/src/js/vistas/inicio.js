/* EBA Patos y Gansos · ICA — js/vistas/inicio.js
   Tablero (dashboard) de inicio por perfil y cálculo de pendientes (notificaciones). */
"use strict";

/* ==========================================================================
   Inicio · dashboard por rol
   ========================================================================== */
function pendientesDe() {
  const u = USUARIOS[SES.rol];
  const fincasVisibles = SES.rol === "productor" ? FINCAS.filter((f) => f.productor === u.nombre) : FINCAS;
  const evs = EVALS.filter((e) => fincasVisibles.some((f) => f.id === e.finca));
  const pendientes = [];
  evs.forEach((e) => {
    const f = FINCAS.find((x) => x.id === e.finca), a = avance(e);
    if (e.estado === "Programada") pendientes.push([`Visita programada · ${f.nombre}`, fecha(new Date(e.fecha + "T07:00")), "e-info", `#/eval/${e.id}`, "visita"]);
    if (e.estado === "En proceso") pendientes.push([`Completar evaluación ${e.id} (${a.pct} %)`, "Hoy", "e-alerta", `#/eval/${e.id}/${pasoContinuar(e)}`, "eval"]);
    const r = resultado(e);
    r.filas.filter((x) => x.score === 0 && x.ind.g === "MBA" && !e.obs[x.ind.code]).forEach((x) => pendientes.push([`Observación del hallazgo ${x.ind.num} ${x.ind.name}`, "Antes de cerrar", "e-alerta", `#/eval/${e.id}/${x.ind.code}`, "obs"]));
    lista(e).filter((i) => i.m.kind === "doc" && e.resp[i.code]?.estado === "Pendiente").forEach((i) => pendientes.push([`Documento pendiente: ${i.name}`, "1 día hábil tras el cierre", "e-medio", `#/eval/${e.id}/${i.code}`, "doc"]));
  });
  return { pendientes, evs, fincasVisibles };
}
/* ==========================================================================
   Tablero (dashboard) por perfil: todo se calcula con los datos guardados en el momento de abrirlo.
   ========================================================================== */
const PERIODO_INICIO = { v: "anio" };
const PERIODOS = [["30", "Últimos 30 días"], ["anio", "Este año"], ["todo", "Todo"]];
/** ¿La fecha (AAAA-MM-DD) entra en el periodo elegido? */
function enPeriodo(f, per) {
  if (!f || per === "todo") return true;
  const d = new Date(f + "T07:00"), h = hoy();
  if (per === "anio") return d.getFullYear() === h.getFullYear();
  return (h - d) / 864e5 <= 30;
}
/** Día hábil siguiente (lunes a viernes) a una fecha ISO. */
function diaHabilSiguiente(iso) { const d = new Date(iso); do { d.setDate(d.getDate() + 1); } while ([0, 6].includes(d.getDay())); return d; }
/* Colores de los estados en las gráficas del tablero (validados para daltonismo; siempre con etiqueta y número). */
const COLOR_EST_GRAF = { "Por iniciar": "#3E7CB1", "En proceso": "#C99A06", Finalizada: "#048C38", "Seguimiento programado": "#7A5AA6" };

/** Tarjeta de indicador del tablero: valor grande, etiqueta y detalle; opcionalmente con enlace. */
const tarjetaKPI = (v, l, det, c, attrs) => `<${attrs ? "button type=\"button\"" : "div"} class="kpi kpi-tab ${attrs ? "kpi-btn" : ""}" style="--c:${c}" ${attrs || ""}><div class="v">${v}</div><div class="l">${l}</div>${det ? `<div class="det">${det}</div>` : ""}${attrs ? '<span class="ver">Ver en Fincas ›</span>' : ""}</${attrs ? "button" : "div"}>`;
/** Barras horizontales etiquetadas (cada fila con nombre y valor; el color nunca va solo). */
const barrasTab = (filas, max, fmtV) => `<div class="barras-tab">${filas.map(([l, v, c, extra]) => `<div class="bt-fila" title="${esc(l)}: ${fmtV ? fmtV(v) : v}"><span class="bt-l">${l}</span><span class="bt-pista"><i style="width:${max ? Math.max(v > 0 ? 3 : 0, (v / max) * 100) : 0}%;background:${c}"></i></span><b>${fmtV ? fmtV(v) : v}</b>${extra || ""}</div>`).join("")}</div>`;
const vacioTab = (t) => `<p class="vacio-tab">${t}</p>`;

function vInicio() {
  const rol = SES.rol, u = USUARIOS[rol], productor = rol === "productor", coord = rol === "coordinador" || rol === "admin", admin = rol === "admin";
  const per = PERIODO_INICIO.v;
  const fs = fincasVisibles(), activas = fs.filter((f) => f.estado === "ACTIVA"), n = contarEstados(fs);
  const pares = activas.flatMap(estadosFinca);
  const comerciales = activas.filter((f) => tramoFinca(f) === "comercial").length;
  const evsVis = EVALS.filter((e) => fs.some((f) => f.id === e.finca) && e.estado !== "Anulada");
  const finPer = evsVis.filter((e) => e.estado === "Finalizada" && enPeriodo(e.fecha, coord ? per : "todo"));
  const rfPer = finPer.map((e) => ({ e, r: resultado(e) }));
  const prom = rfPer.length ? rfPer.reduce((a, x) => a + x.r.total, 0) / rfPer.length : null;
  const cumplen = finPer.filter((e) => verificarCumplimiento(e).cumple).length;
  // Tareas pendientes: lo que falta completar dentro de las inspecciones. Cada tarea: [qué falta, detalle, finca · especie, etiqueta, clase, urgencia]
  // urgencia: 0 vencido · 1 antes de cerrar · 2 galpón con alerta · 3 documento en plazo · 4 decisión del coordinador
  const atender = [], hoyD = new Date(new Date().toDateString());
  const quien = (e) => `${FINCAS.find((f) => f.id === e.finca)?.nombre || e.finca} · ${nombreSp(e.sp)}`;
  const diasA = (d) => Math.round((new Date(d.toDateString()) - hoyD) / 864e5);
  evsVis.filter((e) => e.estado !== "Programada").forEach((e) => {
    resultado(e).filas.filter((x) => x.score === 0 && x.ind.g === "MBA" && !(e.obs[x.ind.code] || "").trim())
      .forEach((x) => atender.push(["Falta observación", `${x.ind.num} ${x.ind.name} (indicador en 0)`, quien(e), "Antes de cerrar", "e-alerta", 1]));
    lista(e).filter((i) => i.m.kind === "doc" && e.resp[i.code]?.estado === "Pendiente").forEach((i) => {
      if (e.estado !== "Finalizada" || !e.finalizada) { atender.push(["Falta documento", i.name, quien(e), "1 día hábil tras el cierre", "e-medio", 3]); return; }
      const d = diasA(diaHabilSiguiente(e.finalizada));
      atender.push(["Falta documento", i.name, quien(e), d < 0 ? `Vencido hace ${plural(-d, "día", "días")}` : d === 0 ? "Vence hoy" : d === 1 ? "Vence mañana" : `Vence el ${fecha(diaHabilSiguiente(e.finalizada))}`, d <= 0 ? "e-alerta" : "e-medio", d < 0 ? 0 : 3]);
    });
    if (!productor) alertasGalpon(e).filter((a) => !(e.obs[a.ind.code] || "").trim())
      .forEach((a) => atender.push(["Falta observación", `${a.ind.num} ${a.ind.name}, galpón ${a.galpon + 1} por debajo de la finca`, quien(e), "Galpón con alerta", "e-alerta", 2]));
  });
  if (coord) pares.filter((s) => s.proc && s.proc.puedeAmpliar).forEach((s) => atender.push(["Decidir ampliación", `Proceso ${s.proc.id}: usó ${s.proc.max} seguimientos sin cumplir`, `${s.f.nombre} · ${nombreSp(s.sp)}`, "Decisión del coordinador", "e-medio", 4]));
  atender.sort((a, b) => a[5] - b[5]);
  const MAXA = 6;
  const listaAtender = atender.length ? `<ul class="lista-atender lista-tareas">${atender.slice(0, MAXA).map(([q, d, w, t, c]) => `<li><span><b>${esc(q)}:</b> ${esc(d)}<span class="tarea-pie"><small class="muted">${esc(w)}</small><span class="etiqueta ${c}">${esc(t)}</span></span></span></li>`).join("")}</ul>${atender.length > MAXA ? `<p class="texto-chico muted" style="margin:8px 0 0">y ${atender.length - MAXA} más (ver Notificaciones).</p>` : ""}` : vacioTab("Nada pendiente por ahora.");

  // tarjetas comunes
  const kFincas = tarjetaKPI(activas.length, productor ? "Mis fincas activas" : "Fincas activas", `${fs.length - activas.length ? `${fs.length - activas.length} inactiva${fs.length - activas.length > 1 ? "s" : ""} · ` : ""}${comerciales} comercial${comerciales === 1 ? "" : "es"} · ${activas.length - comerciales} traspatio`, "var(--semilla)");
  const kEstado = (e, t) => tarjetaKPI(n[e], t, `${activas.length ? Math.round((n[e] / activas.length) * 100) : 0} % de las fincas activas`, COLOR_EST_GRAF[e]);
  const panelEstado = `<section class="panel"><h3>Estado de las evaluaciones</h3>
    <div class="barra-apilada" role="img" aria-label="${ESTADOS_FLUJO.map((e) => `${e}: ${pares.filter((s) => s.estado === e).length}`).join(", ")}">${ESTADOS_FLUJO.map((e) => { const v = pares.filter((s) => s.estado === e).length; return v ? `<i style="flex:${v};background:${COLOR_EST_GRAF[e]}" title="${e}: ${v}"></i>` : ""; }).join("")}</div>
    <div class="leyenda-tab">${ESTADOS_FLUJO.map((e) => `<div class="item-ley"><i style="background:${COLOR_EST_GRAF[e]}"></i>${e} <b>${pares.filter((s) => s.estado === e).length}</b></div>`).join("")}</div>
    <p class="muted texto-chico" style="margin:8px 0 0">Por finca y especie activa (${pares.length}).</p></section>`;
  const ultimosPares = pares.filter((s) => s.ultimaFin && enPeriodo(s.ultimaFin.fecha, coord ? per : "todo"));
  const niveles = { Excelente: 0, Alto: 0, Medio: 0, Bajo: 0 }; ultimosPares.forEach((s) => niveles[resultado(s.ultimaFin).nivel[0]]++);
  const panelNivel = `<section class="panel"><h3>Nivel actual de las fincas</h3>${ultimosPares.length ? barrasTab(NIVELES.map(([k, , c]) => [k, niveles[k], c]), Math.max(1, ...Object.values(niveles)))
    + `<p class="muted texto-chico" style="margin:8px 0 0">Último resultado finalizado de cada finca y especie (${ultimosPares.length}) · Tabla 2.</p>` : vacioTab("Aún no hay evaluaciones finalizadas.")}</section>`;

  let html, kpis;
  const sub = productor ? (fs.length ? `Estado del bienestar animal en ${fs.length === 1 ? esc(fs[0].nombre) : `sus ${fs.length} fincas`}.` : "Todavía no tiene fincas registradas.")
    : coord ? `Resumen de la seccional · ${PERIODOS.find(([k]) => k === per)[1].toLowerCase()} · actualizado a las ${hora()}` : `Su trabajo de campo · actualizado a las ${hora()}`;
  const selPer = coord ? `<label class="selector-periodo"><span>Periodo</span><select id="periodo">${PERIODOS.map(([k, t]) => `<option value="${k}" ${k === per ? "selected" : ""}>${t}</option>`).join("")}</select></label>` : "";
  const cabecera = `<div class="encabezado"><div><h1>Hola, ${esc(u.nombre.split(" ")[0])}</h1><p>${sub}</p></div><div class="acciones-encabezado">${selPer}</div></div>`;

  if (productor) {
    const tarjetas = fs.flatMap((f) => estadosFinca(f).map((s) => { const seg = s.estado === "Seguimiento programado", evR = seg ? s.ultimaFin : s.ev;
      const r = evR && evR.estado !== "Programada" ? resultado(evR) : null, a = evR ? avance(evR) : null;
      return `<section class="panel tarjeta-finca"><div class="tf-cab"><div><h3>${esc(f.nombre)}</h3><span class="muted texto-chico">${nombreSp(s.sp)} · ${esc(f.mpio)}</span></div>${etiquetaFlujo(s)}</div>
        ${r && (s.estado === "Finalizada" || seg || a.hechos) ? `<div class="tf-puntaje"><b style="color:${r.nivel[1]}">${fmt(r.total)}</b><span>${r.nivel[0]}<br><small class="muted">${s.estado === "Finalizada" || seg ? (r.provisional ? "Provisional: hay documentos pendientes" : "Resultado de la última visita") : `Preliminar · ${a.pct} % evaluado`}</small></span></div>`
          : `<p class="muted">${s.estado === "En proceso" ? "Visita en curso: aún no hay indicadores calificados." : s.abierta ? `Visita programada para el ${fecha(new Date(s.abierta.fecha + "T07:00"))}.` : "Aún no tiene evaluaciones."}</p>`}
        ${seg ? `<p class="texto-chico" style="margin:0"><b>Próxima visita:</b> ${nombreVisita(s.abierta)} · ${fecha(new Date(s.abierta.fecha + "T07:00"))}</p>` : ""}
        ${s.proc ? `<p class="texto-chico" style="margin:0">Proceso ${esc(s.proc.id)} · ${s.proc.estado}${s.proc.estado === "Cumplido" ? "" : ` · seguimientos ${s.proc.usados} de ${s.proc.max}`}</p>` : ""}
        </section>`; })).join("");
    const ult = pares.filter((s) => s.ultimaFin).map((s) => ({ s, r: resultado(s.ultimaFin) })).sort((a, b) => b.s.ultimaFin.fecha.localeCompare(a.s.ultimaFin.fecha))[0];
    const planUlt = ult ? ult.s.ultimaFin.plan || {} : {};
    const mejorar = ult ? ult.r.filas.filter((x) => x.score < 100).sort((a, b) => a.score - b.score || (planUlt[b.ind.code]?.accion ? 1 : 0) - (planUlt[a.ind.code]?.accion ? 1 : 0)).slice(0, 3) : [];
    const f0 = fs[0], suyas = f0 ? EVALS.filter((x) => x.finca === f0.id && x.estado === "Finalizada").sort((a, b) => a.fecha.localeCompare(b.fecha)) : [];
    const hist = suyas.map((x) => { const rx = resultado(x); return [`${nombreCorto(x)} · ${nombreSp(x.sp)}`, rx.total, rx.provisional]; });
    kpis = `<div class="kpis-tab">${kFincas}${tarjetaKPI(ult ? fmt(ult.r.total) : "—", "Último puntaje", ult ? `${ult.r.nivel[0]} · ${esc(ult.s.f.nombre)}` : "Sin evaluaciones finalizadas", ult ? ult.r.nivel[1] : "var(--linea)")}${tarjetaKPI(atender.length, "Pendientes", atender.length ? "Documentos u observaciones" : "Nada por atender", atender.length ? "var(--rojo)" : "var(--campo)")}</div>`;
    html = `${cabecera}${kpis}
      <div class="rejilla r-3 tarjetas-finca" style="margin-top:18px">${tarjetas || '<section class="panel"><p class="muted">Registre su finca para empezar.</p></section>'}</div>
      <div class="rejilla r-3 filas-tab"><section class="panel"><h3>Lo que debe mejorar</h3>${mejorar.length ? `<ul class="lista-mejorar">${mejorar.map((x) => { const pl = (ult.s.ultimaFin.plan || {})[x.ind.code] || {};
          return `<li><div><b>${x.ind.num} ${esc(x.ind.name)}</b><span class="puntaje-chico" style="color:${x.score === 0 ? "var(--rojo)" : "inherit"}">${fmt(x.score)}</span></div><small>${pl.accion ? `Acción acordada: ${esc(pl.accion)}${pl.plazo ? ` · plazo ${fecha(new Date(pl.plazo + "T07:00"))}` : ""}` : "Sin acción registrada en el plan de mejora."}</small></li>`; }).join("")}</ul>` : vacioTab(ult ? "Todos los indicadores calificados están en 100." : "Aparece cuando haya una evaluación finalizada.")}</section>
        <section class="panel"><h3>Evolución${f0 ? ` de ${esc(f0.nombre)}` : ""}</h3>${hist.length > 1 ? evolucionSVG(hist) : vacioTab("La evolución aparece cuando hay dos inspecciones finalizadas.")}</section>
        <section class="panel"><h3>Lo que debe atender${atender.length ? ` · ${atender.length}` : ""}</h3>${listaAtender}</section></div>`;
  } else if (coord) {
    const procs = [...new Set(evsVis.map((e) => e.proceso))].map((pid) => estadoProceso(pid)).filter((st) => st.finca && activas.some((f) => f.id === st.finca));
    const cuentaProc = (e) => procs.filter((st) => st.estado === e).length;
    const promMed = (sp, g) => { const v = rfPer.filter((x) => x.e.sp === sp && x.r.pesos[g] > 0 && x.r.med[g] != null).map((x) => x.r.med[g]); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const sps = [...new Set(rfPer.map((x) => x.e.sp))];
    const crit = criteriosReporte(finPer).atencion;
    kpis = `<div class="kpis-tab">${kFincas}${tarjetaKPI(finPer.length, "Evaluaciones finalizadas", `${evsVis.filter((e) => e.estado !== "Finalizada").length} abiertas ahora`, "var(--campo)")}
      ${tarjetaKPI(prom == null ? "—" : fmt(prom), "Puntaje promedio", prom == null ? "Sin evaluaciones finalizadas" : `Nivel ${clasificar(prom)[0]} · ${finPer.length} evaluaciones`, prom == null ? "var(--linea)" : clasificar(prom)[1])}
      ${tarjetaKPI(finPer.length ? `${cumplen}<small> de ${finPer.length}</small>` : "—", "Cumplen los criterios", "≥ 90, sin ceros ni pendientes", "var(--azul)")}</div>`;
    const usuarios = admin ? (() => { const roles = {}; USUARIOS_LISTA.forEach((x) => { const k = /inspector/i.test(x.r) ? "Inspector" : /coordinador/i.test(x.r) ? "Coordinador" : /productor/i.test(x.r) ? "Productor" : /admin/i.test(x.r) ? "Administrador" : x.r; roles[k] = roles[k] || { a: 0, i: 0 }; x.e === "Activo" ? roles[k].a++ : roles[k].i++; });
      const act = USUARIOS_LISTA.filter((x) => x.e === "Activo").length;
      return `<section class="panel"><div class="panel-cab"><h3>Usuarios</h3></div><p class="cifra-panel"><b>${act}</b> activos de ${USUARIOS_LISTA.length}</p>
        ${barrasTab(Object.entries(roles).map(([k, v]) => [k, v.a, "var(--semilla)", v.i ? `<small class="muted">+${v.i} no activo${v.i > 1 ? "s" : ""}</small>` : ""]), Math.max(1, ...Object.values(roles).map((v) => v.a)))}</section>`; })() : "";
    const actividad = admin ? `<section class="panel"><div class="panel-cab"><h3>Actividad reciente</h3></div>${BITACORA.length ? `<ul class="lista-actividad">${BITACORA.slice(-5).reverse().map((b) => `<li><b>${esc(b.a)}</b><small>${esc(b.u)} · ${fecha(new Date(b.t))} ${hora(new Date(b.t))}</small></li>`).join("")}</ul>` : vacioTab("Aún no hay acciones registradas.")}</section>` : "";
    html = `${cabecera}${kpis}
      <div class="rejilla r-3 filas-tab">${panelEstado}${panelNivel}
        <section class="panel"><h3>Procesos de seguimiento</h3>${procs.length ? barrasTab([["En curso", cuentaProc("En curso"), COLOR_EST_GRAF["En proceso"]], ["Seguimiento programado", cuentaProc("Seguimiento programado"), COLOR_EST_GRAF["Seguimiento programado"]], ["En seguimiento", cuentaProc("En seguimiento"), "#3E7CB1"], ["Cumplidos", cuentaProc("Cumplido"), "var(--campo)"], ["Requieren ampliación", cuentaProc("Requiere ampliación"), "var(--ocre)"], ["Cerrados sin cumplir", cuentaProc("Cerrado sin cumplir"), "var(--rojo)"]], Math.max(1, procs.length))
          + `<p class="muted texto-chico" style="margin:8px 0 0">${procs.length} proceso${procs.length > 1 ? "s" : ""}: visita inicial y hasta ${SEGUIMIENTOS_BASE} seguimientos (ampliables a ${MAX_SEGUIMIENTOS}).</p>` : vacioTab("Aún no hay procesos.")}</section></div>
      <div class="rejilla r-3 filas-tab"><section class="panel"><h3>Promedio por medida</h3>${sps.length ? barrasTab(sps.flatMap((sp) => [["MBR", "recursos"], ["MBA", "animal"], ["MBG", "gestión"]].map(([g, t]) => [`${nombreSp(sp)} · ${t}`, promMed(sp, g)]).filter((x) => x[1] != null).map(([l, v]) => [l, v, clasificar(v)[1]])), 100, (v) => fmt(v))
          + '<p class="muted texto-chico" style="margin:8px 0 0">Evaluaciones finalizadas del periodo. En traspatio no se evalúa la gestión.</p>' : vacioTab("Sin evaluaciones finalizadas en el periodo.")}</section>
        <section class="panel"><div class="panel-cab"><h3>Criterios que requieren atención</h3></div>${crit.length ? `<ul class="lista-criterios">${crit.map((x) => `<li><span>${x.ind.num} ${esc(x.ind.name)}<small class="muted"> · ${nombreSp(x.ind.sp)}</small></span><b style="color:${clasificar(x.prom)[1]}">${fmt(x.prom)}</b></li>`).join("")}</ul>` : vacioTab(finPer.length ? "Todos los indicadores promedian 90 o más." : "Sin evaluaciones finalizadas en el periodo.")}</section>
        <section class="panel"><h3>Alertas${atender.length ? ` · ${atender.length}` : ""}</h3>${listaAtender}</section></div>
      ${admin ? `<div class="rejilla r-2 filas-tab">${usuarios}${actividad}</div>` : ""}`;
  } else {
    // Mi trabajo: una sola lista de lo que el inspector tiene por evaluar, en orden de prioridad
    const hoyISO = new Date().toISOString().slice(0, 10);
    const vencida = (s) => s.abierta && s.abierta.estado === "Programada" && s.abierta.fecha < hoyISO;
    const prioridad = (s) => (vencida(s) ? 0 : s.estado === "En proceso" ? 1 : s.abierta ? 2 : s.estado === "Por iniciar" ? 3 : 4);
    const trabajo = pares.filter((s) => s.estado === "En proceso" || s.estado === "Por iniciar" || s.estado === "Seguimiento programado" || (s.secundaria && s.proc && s.proc.puedeSeguimiento))
      .sort((a, b) => prioridad(a) - prioridad(b) || (a.abierta && b.abierta ? a.abierta.fecha.localeCompare(b.abierta.fecha) : 0) || (prioridad(a) === 1 ? avance(b.ev).pct - avance(a.ev).pct : 0));
    const diasVencida = (s) => Math.round((new Date(hoyISO + "T12:00") - new Date(s.abierta.fecha + "T12:00")) / 864e5);
    const itemTrabajo = (s) => `<div class="trabajo-item${vencida(s) ? " vencida" : ""}"><div class="ti-cab"><b class="enlace-finca">${esc(s.f.nombre)}</b><span class="muted texto-chico">${esc(s.f.mpio)}</span>${vencida(s) ? `<span class="etiqueta e-alerta">Vencida hace ${plural(diasVencida(s), "día", "días")}</span>` : ""}</div>${lineaFlujo(s, false)}</div>`;
    const MAXT = 8;
    const ultimos = evsVis.filter((e) => e.estado === "Finalizada").sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);
    kpis = `<div class="kpis-tab">${kFincas}${kEstado("Por iniciar", "Por iniciar")}${kEstado("En proceso", "En proceso")}${kEstado("Finalizada", "Finalizadas")}${kEstado("Seguimiento programado", "Seguimientos programados")}</div>`;
    html = `${cabecera}${kpis}
      <div class="rejilla r-21 filas-tab"><section class="panel"><h3>Mi trabajo${trabajo.length ? ` · ${trabajo.length}` : ""}</h3>${trabajo.length ? `<div class="lista-trabajo">${trabajo.slice(0, MAXT).map(itemTrabajo).join("")}</div>${trabajo.length > MAXT ? `<p class="texto-chico muted" style="margin:8px 0 0">y ${trabajo.length - MAXT} más en Fincas.</p>` : ""}` : vacioTab("No tiene inspecciones en proceso, programadas ni por iniciar.")}</section>
        <section class="panel"><h3>Tareas pendientes${atender.length ? ` · ${atender.length}` : ""}</h3>${listaAtender}</section></div>
      <div class="rejilla r-2 filas-tab"><section class="panel"><h3>Mis últimos resultados</h3>${ultimos.length ? barrasTab(ultimos.map((e) => { const r = resultado(e); return [`${esc(FINCAS.find((f) => f.id === e.finca)?.nombre || e.finca)} <small class="muted">${nombreSp(e.sp)} · ${fecha(new Date(e.fecha + "T07:00"))}</small>`, r.total, r.nivel[1], `<small class="nivel-tab">${r.nivel[0]}</small>`]; }), 100, (v) => fmt(v)) : vacioTab("Aún no hay evaluaciones finalizadas.")}</section>
        ${panelNivel}</div>`;
  }
  shell("inicio", "<b>Inicio</b>", html);
  const ps = raiz.querySelector("#periodo"); if (ps) ps.onchange = () => { PERIODO_INICIO.v = ps.value; vInicio(); };
}
/* Tiempo real: si los datos cambian en otra pestaña o ventana, el tablero se vuelve a calcular. */
window.addEventListener("storage", (e) => { if (e.key && e.key.startsWith("eba7.") && SES && (location.hash || "").startsWith("#/inicio") && !capas.innerHTML) {
  try { FINCAS = store.get("fincas", FINCAS); EVALS = store.get("evals", EVALS); BITACORA = store.get("bitacora", BITACORA); PROCESOS = store.get("procesos", PROCESOS); } catch (x) { } vInicio(); } });
