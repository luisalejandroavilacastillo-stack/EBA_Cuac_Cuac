/* Pruebas del flujo de trabajo por finca (v0.25: asignar · evaluar · finalizar · aprobar o devolver), acción que
   corresponde, siguiente indicador pendiente y conteos. Sin navegador.
   Uso:  node pruebas/prueba_flujo.js */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = path.join(__dirname, "..", "src", "js");
const ctx = vm.createContext({ console, document: { getElementById: () => ({}) }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, sessionStorage: { getItem: () => null, setItem() {} }, Object, JSON, Math, Number, String, Array, Date, Intl, Set, RegExp });
["datos/norma.js", "datos/norma_textos.js", "nucleo/utilidades.js", "datos/ejemplo.js", "norma/calculo.js", "norma/seguimiento.js", "norma/flujo.js", "datos/semilla.js", "vistas/reportes.js"].forEach((f) =>
  vm.runInContext(fs.readFileSync(path.join(SRC, f), "utf8").replace(/^const (\w+) =/gm, "var $1 =").replace(/^let (\w+) =/gm, "var $1 =").replace(/^function (\w+)/gm, "var $1 = function $1"), ctx, { filename: f }));
const R = (code) => vm.runInContext(code, ctx);
R("var SES = { rol: 'inspector', u: 'inspector' }; var log = () => {}; var guardar = () => {}");
let ok = 0, mal = 0;
const igual = (n, o, e) => { const b = JSON.stringify(o) === JSON.stringify(e); b ? ok++ : mal++; if (!b) console.log(`  FALLA ${n}: ${JSON.stringify(o)} (esperado ${JSON.stringify(e)})`); };
const sec = (t) => console.log("· " + t);
const E = (fid, sp) => R(`(() => { const s = estadoEspecie(FINCAS.find(f => f.id === '${fid}'), '${sp}'); return [s.estado, s.principal && s.principal.texto, s.secundaria && s.secundaria.texto]; })()`);

sec("Estado calculado con los datos guardados");
igual("Inspector · Esperanza patos: su seguimiento en proceso", E("FIN-2026-00417", "pato"), ["En proceso", "Continuar inspección", null]);
igual("Inspector · Santa Clara gansos: asignada a otra inspectora, sin acción", E("FIN-2026-00431", "ganso"), ["Asignada", null, null]);
igual("Inspector · San Isidro patos: aprobada", E("FIN-2025-00198", "pato"), ["Aprobada", "Ver resultados", null]);
igual("Inspector · San Isidro gansos: sin asignar, no crea visitas", E("FIN-2025-00198", "ganso"), ["Por asignar", null, null]);
igual("Inspector: solo ve las fincas con visitas asignadas a él", R("fincasVisibles().map(f => f.id)"), ["FIN-2026-00417", "FIN-2025-00198"]);
R("SES = { rol: 'inspector', u: 'inspector2' }");
igual("Inspectora 2 · Santa Clara gansos: «Iniciar inspección»", E("FIN-2026-00431", "ganso"), ["Asignada", "Iniciar inspección", null]);
igual("Inspectora 2: solo ve Santa Clara", R("fincasVisibles().map(f => f.id)"), ["FIN-2026-00431"]);
R("SES = { rol: 'coordinador', u: 'coordinador' }");
igual("Coordinador · San Isidro gansos: «Asignar inspector»", E("FIN-2025-00198", "ganso"), ["Por asignar", "Asignar inspector", null]);
igual("Coordinador · Santa Clara: «Reasignar»", E("FIN-2026-00431", "ganso"), ["Asignada", "Reasignar", null]);
igual("Coordinador · San Isidro patos cumplido: nueva inspección", E("FIN-2025-00198", "pato"), ["Aprobada", "Ver resultados", "Asignar nueva inspección"]);
igual("Coordinador · finca inactiva: no asigna", E("FIN-2025-00211", "pato"), ["Por asignar", null, null]);
igual("Coordinador: ve todas las fincas", R("fincasVisibles().length"), 4);
igual("Conteo por estado (las inactivas no cuentan)", R("contarEstados(FINCAS)"), { "Por asignar": 1, Asignada: 1, "En proceso": 1, Devuelta: 0, "Pendiente de aprobación": 0, Aprobada: 1, "Seguimiento programado": 0 });
R("SES = { rol: 'admin', u: 'admin' }");
igual("Administrador: todos los permisos del coordinador (asignar)", E("FIN-2025-00198", "ganso"), ["Por asignar", "Asignar inspector", null]);
igual("Administrador: «Reasignar» una visita asignada", E("FIN-2026-00431", "ganso").slice(0, 2), ["Asignada", "Reasignar"]);
R("var e88p = EVALS.find(e => e.id === 'EVA-2026-00088'); e88p.estado = 'Pendiente de aprobación'");
igual("Administrador no aprueba: ve «Ver lo enviado»", E("FIN-2026-00417", "pato").slice(0, 2), ["Pendiente de aprobación", "Ver lo enviado"]);
R("AVISOS = []; avisar('coordinador', 'Inspección por aprobar', '#/', 'aprobar'); avisar('coordinador', 'Seguimiento reprogramado', '#/')");
igual("Al administrador no le llegan los avisos de aprobar", R("misAvisos().map(a => a.txt)"), ["Seguimiento reprogramado"]);
R("SES = { rol: 'coordinador', u: 'coordinador' }");
igual("Al coordinador sí", R("misAvisos().length"), 2);
R("e88p.estado = 'En proceso'; AVISOS = []; SES = { rol: 'admin', u: 'admin' }");
igual("Administrador no diligencia visitas", R("puedeEvaluar(EVALS.find(e => e.id === 'EVA-2026-00088'))"), false);
R("SES = { rol: 'inspector', u: 'inspector' }");

sec("«Continuar» lleva al paso lógico");
igual("Con apertura hecha: primer indicador pendiente", R("pasoContinuar(EVALS.find(e => e.id === 'EVA-2026-00088'))"), R("pendientesEval(EVALS.find(e => e.id === 'EVA-2026-00088'))[0].code"));
igual("Pendientes de EVA-2026-00088 = aplicables − calificados", R("(() => { const e = EVALS.find(x => x.id === 'EVA-2026-00088'), a = avance(e); return pendientesEval(e).length === a.ap - a.hechos; })()"), true);
igual("Finalizada: va al resultado", R("pasoContinuar(EVALS.find(e => e.id === 'EVA-2026-00065'))"), "resultado");
igual("Destino del botón de la lista", R("destinoLista(EVALS.find(e => e.id === 'EVA-2026-00088'))"), R("'#/eval/EVA-2026-00088/' + pendientesEval(EVALS.find(e => e.id === 'EVA-2026-00088'))[0].code"));

sec("Siguiente pendiente");
const pend = R("pendientesEval(EVALS.find(e => e.id === 'EVA-2026-00088')).map(i => i.code)");
igual("Desde el inicio: el primero", R("siguientePendiente(EVALS.find(e => e.id === 'EVA-2026-00088'))"), pend[0]);
igual("Desde el primero: el segundo", R(`siguientePendiente(EVALS.find(e => e.id === 'EVA-2026-00088'), '${pend[0]}')`), pend[1]);
igual("Desde el último: vuelve al primero", R(`siguientePendiente(EVALS.find(e => e.id === 'EVA-2026-00088'), '${pend[pend.length - 1]}')`), pend[0]);
igual("Sin pendientes: null", R("siguientePendiente(EVALS.find(e => e.id === 'EVA-2026-00065'))"), null);

sec("Una visita nueva no sobrescribe el historial");
R("var antes = JSON.stringify(EVALS.find(e => e.id === 'EVA-2026-00065')); var r = crearProceso('FIN-2025-00198', 'ganso', null, '2026-11-02')");
igual("Se crea una visita programada aparte", [R("r.ev.estado"), R("r.ev.sp"), R("EVALS.includes(r.ev)")], ["Programada", "ganso", true]);
igual("La evaluación finalizada de patos no cambia", R("JSON.stringify(EVALS.find(e => e.id === 'EVA-2026-00065')) === antes"), true);
igual("La visita queda asignada al inspector indicado", [R("r.ev.inspector"), R("r.ev.asignacion.inspector")], ["inspector", "inspector"]);
igual("Gansos queda «Asignada» con «Iniciar inspección»", E("FIN-2025-00198", "ganso"), ["Asignada", "Iniciar inspección", null]);
R("r.ev.estado = 'En proceso'");
igual("Con registros pasa a En proceso", E("FIN-2025-00198", "ganso"), ["En proceso", "Continuar inspección", null]);
igual("Sin apertura, «Continuar» va a la apertura", R("pasoContinuar(r.ev)"), "apertura");
igual("No se puede abrir otra visita de la misma finca y especie", R("crearProceso('FIN-2025-00198', 'ganso').error"), "Ya hay una evaluación abierta para esta finca y especie.");

sec("Seguimiento programado al cerrar sin cumplir");
R("var e72 = EVALS.find(e => e.id === 'EVA-2026-00072'), plan72 = JSON.stringify(e72.plan || {})");
igual("Sin plazos en el plan: 30 días", R("(() => { e72.plan = {}; const d = new Date(); d.setDate(d.getDate() + 30); return fechaSugeridaSeguimiento(e72).fecha === d.toISOString().slice(0, 10); })()"), true);
R("e72.plan = { PA03: { accion: 'Ajustar', plazo: '2099-01-10' }, PA05: { accion: 'Otro', plazo: '2099-02-20' } }");
igual("Con plazos: día siguiente al más lejano", R("fechaSugeridaSeguimiento(e72).fecha"), "2099-02-21");
igual("Aviso si la visita queda antes del último plazo", R("avisoFechaSeguimiento(e72, '2099-02-01').length > 0"), true);
igual("Sin aviso si queda después", R("avisoFechaSeguimiento(e72, '2099-03-01')"), "");
R("e72.plan = JSON.parse(plan72)");
R("var e88b = EVALS.find(e => e.id === 'EVA-2026-00088'), est88b = e88b.estado; e88b.estado = 'Finalizada'; var sg = programarSeguimiento(e88b.proceso, '2099-05-04')");
igual("Se crea el siguiente seguimiento con la fecha indicada", [R("sg.ev.visita"), R("sg.ev.fecha"), R("sg.ev.estado")], [2, "2099-05-04", "Programada"]);
igual("La finca queda en «Seguimiento programado» con «Iniciar seguimiento» y «Reprogramar»", E("FIN-2026-00417", "pato"), ["Seguimiento programado", "Iniciar seguimiento", "Reprogramar"]);
igual("El proceso queda en «Seguimiento programado»", R("estadoProceso(e88b.proceso).estado"), "Seguimiento programado");
igual("Reprogramar cambia la fecha", [R("reprogramarSeguimiento(sg.ev, '2099-06-01').ok"), R("sg.ev.fecha")], [true, "2099-06-01"]);
igual("No se reprograma a una fecha pasada", R("!!reprogramarSeguimiento(sg.ev, '2000-01-01').error"), true);
R("SES = { rol: 'productor', u: 'productor' }");
igual("Productor: ve el resultado de la visita aprobada", E("FIN-2026-00417", "pato").slice(1), ["Ver resultados", null]);
R("SES = { rol: 'inspector', u: 'inspector' }; EVALS.splice(EVALS.indexOf(sg.ev), 1); e88b.estado = est88b");

sec("Finca mixta: aves por especie y total");
R("var FM = { id: 'FIN-T-MIX', nombre: 'Mixta', estado: 'ACTIVA', especies: [{ sp: 'pato', conCorral: true, inventario: [{ n: 200 }] }, { sp: 'ganso', conCorral: true, inventario: [{ n: 100 }] }] }; FINCAS.push(FM)");
R("var EVM = { id: 'EVA-T-MIX', finca: 'FIN-T-MIX', sp: 'ganso', apertura: {}, resp: {}, obs: {} }");
igual("Cada especie con su número: 100 gansos = traspatio, muestra de 15 (finca: 300 aves)", R("(() => { const c = contexto(EVM); return [c.pobFinca, c.nEsp, c.tramo, c.plan.aves]; })()"), [300, 100, "traspatio", 15]);
igual("Los 200 patos de la misma finca: comercial, muestra de 50", R("(() => { const c = contexto(Object.assign({}, EVM, { sp: 'pato' })); return [c.nEsp, c.tramo, c.plan.aves]; })()"), [200, "comercial", 50]);
igual("Gansos en traspatio: la gestión (7.3) no aplica", R("!!aplica(IND.GG01, contexto(EVM))"), true);
igual("Finca con alguna especie comercial cuenta como comercial", R("tramoFinca(FM)"), "comercial");
R("EVM.pobEsp = { pato: 150, ganso: 40 }");
igual("Confirmadas en la apertura: 150 patos y 40 gansos → gansos traspatio con 15 de muestra", R("(() => { const c = contexto(EVM); return [c.pobFinca, c.nEsp, c.tramo, c.plan.aves]; })()"), [190, 40, "traspatio", 15]);
R("FINCAS.splice(FINCAS.indexOf(FM), 1)");

sec("Productor: solo consulta");
R("SES = { rol: 'productor', u: 'productor' }");
igual("En proceso: lo ve como «En evaluación» y solo el último resultado aprobado", [R("textoFlujo(estadoEspecie(FINCAS.find(f => f.id === 'FIN-2026-00417'), 'pato'))"), E("FIN-2026-00417", "pato")[1]], ["En evaluación", "Ver resultados"]);
igual("No puede abrir una visita sin aprobar", R("puedeVerEval(EVALS.find(e => e.id === 'EVA-2026-00088'))"), false);
igual("Sí puede abrir la visita aprobada de su finca", R("puedeVerEval(EVALS.find(e => e.id === 'EVA-2026-00072'))"), true);
igual("Solo ve sus fincas", R("fincasVisibles().map(f => f.id)"), ["FIN-2026-00417", "FIN-2025-00211"]);
R("SES = { rol: 'inspector', u: 'inspector' }");

sec("Finalizar, devolver y aprobar");
R("var e88f = EVALS.find(e => e.id === 'EVA-2026-00088'), copia88 = JSON.stringify(e88f)");
R("e88f.estado = 'Pendiente de aprobación'");
igual("Finalizada por el inspector: «Pendiente de aprobación» y ya no la edita", [E("FIN-2026-00417", "pato")[0], R("puedeEvaluar(e88f)")], ["Pendiente de aprobación", false]);
igual("Pendiente: el proceso sigue abierto (no se crea otra visita)", R("crearProceso('FIN-2026-00417', 'pato').error"), "Ya hay una evaluación abierta para esta finca y especie.");
R("SES = { rol: 'coordinador', u: 'coordinador' }");
igual("Coordinador: «Revisar y aprobar»", E("FIN-2026-00417", "pato").slice(0, 2), ["Pendiente de aprobación", "Revisar y aprobar"]);
igual("Coordinador no modifica calificaciones", R("puedeEvaluar(e88f)"), false);
R("SES = { rol: 'productor', u: 'productor' }");
igual("Productor: «En revisión del ICA»", R("textoFlujo(estadoEspecie(FINCAS.find(f => f.id === 'FIN-2026-00417'), 'pato'))"), "En revisión del ICA");
R("SES = { rol: 'inspector', u: 'inspector' }; e88f.estado = 'Devuelta'");
igual("Devuelta: el inspector la corrige y reenvía", [E("FIN-2026-00417", "pato").slice(0, 2), R("puedeEvaluar(e88f)")], [["Devuelta", "Corregir y reenviar"], true]);
R("e88f.estado = 'Finalizada'; var sgA = programarSeguimiento(e88f.proceso, '2099-03-01', 'inspector2')");
igual("Al aprobar sin cumplir: seguimiento asignado al inspector elegido", [R("sgA.ev.visita"), R("sgA.ev.inspector"), R("sgA.ev.fecha")], [2, "inspector2", "2099-03-01"]);
igual("El inspector anterior ya no tiene acción sobre ese seguimiento", E("FIN-2026-00417", "pato"), ["Seguimiento programado", null, null]);
R("SES = { rol: 'inspector', u: 'inspector2' }");
igual("Historial: la inspectora del seguimiento ve la visita aprobada de Camilo", R("puedeVerEval(EVALS.find(e => e.id === 'EVA-2026-00072'))"), true);
igual("…pero no las visitas de otros en curso", R("(() => { const e = EVALS.find(x => x.id === 'EVA-2026-00072'); const est = e.estado; e.estado = 'En proceso'; const r = puedeVerEval(e); e.estado = est; return r; })()"), false);
igual("El inspector del seguimiento puede iniciarlo o reprogramarlo", E("FIN-2026-00417", "pato"), ["Seguimiento programado", "Iniciar seguimiento", "Reprogramar"]);
igual("Reprogramar exige motivo", R("reprogramarSeguimiento(sgA.ev, '2099-03-05', '').error"), "Escriba el motivo de la reprogramación.");
igual("Reprogramar con motivo queda en el historial", [R("reprogramarSeguimiento(sgA.ev, '2099-03-05', 'Vía cerrada por lluvias').ok"), R("sgA.ev.reprogramaciones[0].motivo"), R("sgA.ev.reprogramaciones[0].por")], [true, "Vía cerrada por lluvias", "inspector2"]);
R("SES = { rol: 'inspector', u: 'inspector' }");
R("EVALS.splice(EVALS.indexOf(sgA.ev), 1); Object.assign(e88f, JSON.parse(copia88))");

sec("Reportes con datos reales");
igual("Filtro por finca", R("datosReporte({ finca: 'FIN-2026-00417' }).map(e => e.id)"), ["EVA-2026-00088", "EVA-2026-00072"]);
igual("Filtro por visita de seguimiento", R("datosReporte({ visita: 'seg' }).map(e => e.id)"), ["EVA-2026-00088"]);
igual("Filtro por fechas", R("datosReporte({ desde: '2026-09-01', hasta: '2026-09-30' }).map(e => e.id)"), ["EVA-2026-00065"]);
igual("Comparación: solo cuenta inspecciones finalizadas", R("compararVisitas('FIN-2026-00417', 'pato').visitas.map(e => e.id)"), ["EVA-2026-00072"]);
igual("Sin datos de ejemplo anteriores al sistema", R("Object.keys(HIST).length"), 0);
R("var e88 = EVALS.find(e => e.id === 'EVA-2026-00088'), est88 = e88.estado; e88.estado = 'Finalizada'");
igual("Al finalizar la segunda inspección aparece la comparación", R("compararVisitas('FIN-2026-00417', 'pato').visitas.length"), 2);
R("e88.estado = est88");
igual("Comparación sin historial", R("compararVisitas('FIN-2025-00198', 'pato').cambios"), null);
igual("Criterios: los que requieren atención tienen promedio < 90", R("criteriosReporte(EVALS.filter(e => e.estado === 'Finalizada')).atencion.every(x => x.prom < 90)"), true);
igual("Criterios: los de mayor cumplimiento tienen promedio ≥ 90", R("criteriosReporte(EVALS.filter(e => e.estado === 'Finalizada')).mejores.every(x => x.prom >= 90)"), true);

sec("Constancia de cumplimiento");
R("SES = { rol: 'productor', u: 'u_rquintero' }");
igual("La visita que cumple trae su constancia (semilla)", R("EVALS.find(e => e.id === 'EVA-2026-00065').constancia.codigo"), "CER-2026-00001");
igual("El productor ve «Certificada»", R("textoFlujo(estadoEspecie(FINCAS.find(f => f.id === 'FIN-2025-00198'), 'pato'))"), "Certificada");
R("var cv = EVALS.find(e => e.id === 'EVA-2026-00065').constancia, venceAntes = cv.vence; cv.vence = '2020-01-01'");
igual("Vencida al pasar la vigencia", R("textoFlujo(estadoEspecie(FINCAS.find(f => f.id === 'FIN-2025-00198'), 'pato'))"), "Constancia vencida");
R("cv.vence = venceAntes; var cn = emitirConstancia(JSON.parse(JSON.stringify(EVALS.find(e => e.id === 'EVA-2026-00065'))))");
igual("Código consecutivo y verificación", [R("/^CER-\\d{4}-\\d{5}$/.test(cn.codigo)"), R("/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(cn.verificacion)")], [true, true]);
igual("Lleva el puntaje y el nivel con que se emitió", [R("typeof cn.puntaje === 'number'"), R("cn.nivel")], [true, R("resultado(EVALS.find(e => e.id === 'EVA-2026-00065')).nivel[0]")]);
igual("Vigencia de un año", R("(new Date(cn.vence) - new Date(cn.emitida.slice(0, 10))) / 86400000 > 360"), true);

console.log(`\n${ok} pruebas correctas, ${mal} fallas`);
process.exit(mal ? 1 : 0);