/* EBA Cuac Cuac — js/vistas/asistente_norma.js
   Asistente de la norma para todos los perfiles, en una ventana flotante que no saca al usuario de su pantalla.
   · Inspector: cómo se evalúa (método, muestra, escala, casos dudosos), según el indicador que tiene abierto.
   · Coordinador y administrador: la norma y los resultados de las evaluaciones, en lenguaje técnico.
   · Productor: su resultado, qué mejorar y cómo (motor de asistente.js).
   Solo responde sobre la metodología del ICA y el bienestar de patos y gansos, y cita numeral, tabla y página.
   Nunca envía documento, correo ni teléfono de las personas; la bitácora registra la consulta sin el texto. */
"use strict";

const FUERA_DE_TEMA = "Solo puedo ayudarle con la metodología del ICA para evaluar el bienestar animal en patos y gansos y con las evaluaciones de la plataforma. Pregúnteme, por ejemplo, cómo se evalúa un indicador, cómo se toma la muestra o qué significa un puntaje.";
const esTecnico = () => !!(typeof SES !== "undefined" && SES && SES.rol !== "productor");
const NOMBRE_ROL_ASIS = { inspector: "Inspector", coordinador: "Coordinador", admin: "Administrador", productor: "Productor" };
const pagDe = (k) => (typeof PAG_NORMA !== "undefined" && PAG_NORMA[k] ? `pág. ${PAG_NORMA[k]}` : "");
const citaInd = (i) => [i.num, i.tabla ? `Tabla ${i.tabla}` : "", pagDe(i.num)].filter(Boolean).join(" · ");

/* Temas generales de la norma (texto resumido de la Metodología ICA v1.0, 2024). */
const TEMAS_NORMA = [
  { id: "muestreo", re: /(muestra|muestreo|cuant[oa]s (aves|patos|gansos|puntos)|puntos? de (muestreo|inspeccion)|tabla 3|ilustracion 2|que aves (escojo|tomo|selecciono)|mayor edad)/,
    titulo: "Tamaño de la muestra", cita: "5.6, Tabla 3 e Ilustración 2 · págs. 14–15",
    texto: ["La muestra se toma igual en patos y gansos. En la plataforma se calcula con las aves de la especie que se inspecciona (en fincas mixtas, cada especie con su número; la Tabla 3 dice «población total de patos y gansos», por eso es una decisión del proyecto).",
      "- **Menos de 200 aves, con corral:** 1 galpón o corral, 3 puntos y 5 aves por punto (15 aves).",
      "- **200 aves o más:** 2 galpones o corrales, 5 puntos por galpón en los extremos y el centro (Ilustración 2), empezando por la entrada más cercana, y 5 aves por punto (50 aves).",
      "- **Sin corral (traspatio con aves sueltas):** se evalúan las aves y los recursos donde estén: de 1 a 3 puntos y de 2 a 5 aves por punto.",
      "- Se priorizan las aves de **mayor edad**. Si hay menos aves que la muestra, se evalúan todas."] },
  { id: "pesos", re: /(tabla 1|ponderaci|pesos? de (las|cada) medida|cuanto (vale|pesa) cada|porcentaje de cada medida|60\s*%|como se calcula el (puntaje|total|resultado))/,
    titulo: "Cálculo del puntaje total", cita: "Tabla 1 · pág. 12",
    texto: ["Cada indicador se califica de 0 a 100 con su tabla. Luego se promedian por grupo y se ponderan:",
      "- **Comercial (200 aves o más):** medidas del animal (MBA) 60 %, recursos (MBR) 25 %, gestión (MBG) 15 %.",
      "- **Traspatio (menos de 200 aves):** animal 70 %, recursos 30 %; la gestión no se evalúa.",
      "Los indicadores que no aplican en la finca no entran en el promedio."] },
  { id: "niveles", re: /(tabla 2|clasificaci|nivel (final|de bienestar|de la finca|total)|excelente|que significa (el|mi|este) (puntaje|resultado|nivel))/,
    titulo: "Niveles de bienestar", cita: "Tabla 2 · pág. 13",
    texto: ["- **Excelente:** 90 a 100 puntos.", "- **Alto:** 75 a 89,9.", "- **Medio:** 50 a 74,9.", "- **Bajo:** menos de 50."] },
  { id: "fases", re: /(fases?|etapas|como es la visita|pasos de la (visita|inspeccion)|apertura|cierre de la visita|orden de la (visita|inspeccion))/,
    titulo: "Fases de la visita", cita: "Fases I a IV · pág. 14",
    texto: ["- **Fase I · Apertura:** presentación, entrevista corta con quien atiende, tipo de sistema productivo y planeación.",
      "- **Fase II · Galpones y animales:** recursos y aves según la muestra, con movimientos suaves y sin ruidos para no alterar a las aves.",
      "- **Fase III · Documentos:** solo en fincas de 200 aves o más.",
      "- **Fase IV · Cierre:** se presentan los resultados y se deja la forma oficial. Los documentos pendientes se pueden entregar hasta 1 día hábil después."] },
  { id: "documentos", re: /(documento|documental|firmad|matricula|comvezcol|legible|pendiente de entrega|1 dia habil)/,
    titulo: "Revisión de documentos", cita: "Fase III y Fase IV · pág. 14",
    texto: ["Solo en fincas de 200 aves o más. Todo documento, físico o digital, debe ser:",
      "- **legible**, **sin correcciones ni agregados** y **firmado** por el responsable de la granja;",
      "- si la norma pide firma de MV, MVZ o zootecnista, con **matrícula vigente de COMVEZCOL**.",
      "Si un documento no se pudo verificar, el productor tiene **1 día hábil** después del cierre para entregarlo; si no llega, la calificación queda definitiva."] },
  { id: "traspatio", re: /(traspatio|menos de 200|finca pequena|pocas aves)/,
    titulo: "Fincas de traspatio", cita: "Tabla 1, Tabla 3 y 5.6 · págs. 12–15",
    texto: ["Una especie con menos de 200 aves en la finca se evalúa como traspatio (en fincas mixtas, cada especie por separado):",
      "- no se evalúan las medidas de gestión ni los documentos;", "- pesos: animal 70 %, recursos 30 %;",
      "- muestra de 15 aves con corral, o de 1 a 3 puntos con aves sueltas;", "- algunos indicadores no aplican (por ejemplo, la mortalidad de patos, 6.2.10)."] },
  { id: "seguimiento", re: /(seguimiento|proceso|cuando (se )?cierra|cumple la finca|cuantas visitas)/,
    titulo: "Seguimiento en la plataforma", cita: "Regla del proyecto (la norma no la define)",
    texto: ["La norma no fija seguimientos; esta es la regla de la plataforma:",
      "- La finca **cumple** con 90 puntos o más, ningún indicador en 0 y nada pendiente.",
      "- Si no cumple, al cerrar queda programado el siguiente seguimiento (hasta 3; el coordinador puede ampliar a 5).",
      "- Cada seguimiento retoma lo de la visita anterior y muestra qué mejoró o empeoró."] },
];
const RE_DOMINIO = /\b(pato|ganso|aves?\b|bienestar|ica\b|norma|metodolog|indicador|galpon|corral|finca|predio|evaluac|inspecc|visita|puntaje|calific|escala|nivel|plan de mejora|mejorar|corregir|muestra|punto|recurso|animal|tabla|numeral|documento|seguimiento|productor|inspector|cama|agua|bebeder|comeder|nidal|jadeo|plumaje|pico|diarrea|cojo|herida|mortalidad|densidad|alimento|veterinari|sacrificio|vacun|enferm|medicament)/;
const RE_REFERENCIA = /(este indicador|esto|aqui|esta escala|este nivel|como (lo )?califico|como se (evalua|califica|mide)|que (escala|nivel)|duda|no se si|caso|cuando es|se cuenta|cuenta como)/;
const RE_COMO = /(como se (evalua|califica|mide|cuenta|hace)|como (lo )?(evaluo|califico|mido|cuento)|metodo|que (reviso|miro|observo)|procedimiento)/;

/** ¿La pregunta trata de la norma o de la plataforma? */
function dentroDeTema(q, cx) {
  const nq = sinTildes(q);
  if (/^(hola|buenos|buenas|saludos|gracias|muy amable)/.test(nq.trim())) return true;
  if (RE_DOMINIO.test(nq) || TEMAS_NORMA.some((t) => t.re.test(nq))) return true;
  if (buscarIndicadores(q, cx).length) return true;
  return !!(cx.foco && RE_REFERENCIA.test(nq));
}
/** Ficha técnica de un indicador (para el inspector y el coordinador). */
function fichaTecnica(ind, cx, enfoque) {
  const L = [`**${ind.num} ${ind.name}** · ${{ MBA: "medida del animal", MBR: "medida de recursos", MBG: "medida de gestión" }[ind.g]} · ${[ind.tabla ? `Tabla ${ind.tabla}` : "", pagDe(ind.num)].filter(Boolean).join(" · ")}`];
  if (ind.q) L.push(`Pregunta: ${ind.q}`);
  const na = cx.ctx && cx.ev && cx.ev.sp === ind.sp ? aplica(ind, cx.ctx) : null;
  if (na) L.push(`En esta finca **no aplica**: ${na}`);
  L.push(`- **Método:** ${ind.metodo || "—"}${ind.unidad ? `. Unidad: ${ind.unidad}` : ""}.`);
  if (ind.cond) L.push(`- **Cuándo aplica:** ${ind.cond}.`);
  if (ind.prod) L.push(`- **Propósito:** ${ind.prod}.`);
  if (ind.formula) L.push(`- **Cálculo:** ${ind.formula}`);
  if (ind.escala && ind.escala.length) L.push(`**Escala${ind.tabla ? ` (Tabla ${ind.tabla})` : ""}:**\n${ind.escala.map(([p, t]) => `- **${p}:** ${t}`).join("\n")}`);
  if (ind.nota) L.push(`- **Interpretación de la plataforma:** ${ind.nota}`);
  if (enfoque !== "corto" && DESC_NORMA[ind.num]) L.push(`Lo que dice la norma: ${primeraFrase(DESC_NORMA[ind.num], 2)}`);
  if (cx.indicadores) { const x = cx.indicadores.find((y) => y.ind.code === ind.code);
    if (x) L.push(x.score == null ? `En la evaluación ${cx.ev.id} todavía no tiene calificación.` : `En la evaluación ${cx.ev.id}: **${fmt(x.score)} puntos**${x.det ? ` (${x.det})` : ""}.`); }
  if (/(duda|no se si|caso|entre dos|no esta claro)/.test(sinTildes(cx.q || ""))) L.push("Si el caso no encaja en ningún nivel de la tabla, califique el nivel más cercano y explique lo que vio en la **observación del indicador**: queda como soporte.");
  return L.join("\n");
}
/** Respuesta sin conexión para inspector, coordinador y administrador. */
function responderTecnico(q, cx) {
  const nq = sinTildes(q); cx.q = q;
  if (RE_URGENTE.test(nq)) return responderLocal(q, cx);
  if (/^(hola|buenos|buenas|saludos)/.test(nq.trim())) return `Hola. Soy el asistente de la norma del ICA. Puedo explicarle cómo se evalúa cualquier indicador, cómo se toma la muestra, cómo se calcula el puntaje o qué hacer en un caso dudoso${cx.foco ? `. Veo que está en **${cx.foco.num} ${cx.foco.name}**` : ""}.`;
  if (/(gracias|muy amable)/.test(nq)) return "Con gusto. Si tiene otra duda de la norma, escríbame.";
  if (!dentroDeTema(q, cx)) return FUERA_DE_TEMA;
  // si la pregunta nombra la especie, busca en esa especie aunque la evaluación abierta sea de la otra
  const spQ = /\bgansos?\b/.test(nq) && !/\bpatos?\b/.test(nq) ? "ganso" : /\bpatos?\b/.test(nq) && !/\bgansos?\b/.test(nq) ? "pato" : null;
  let inds = buscarIndicadores(q, spQ ? Object.assign({}, cx, { sp: spQ }) : cx);
  const tema = TEMAS_NORMA.find((t) => t.re.test(nq));
  if (!inds.length && !tema && cx.foco && (RE_REFERENCIA.test(nq) || RE_COMO.test(nq) || /(escala|nivel|punt|calific|aplica)/.test(nq))) inds = [cx.foco];
  if (tema && (!inds.length || !/\b[67]\.[123]\.\d/.test(nq))) return `**${tema.titulo}** (${tema.cita})\n\n${tema.texto.join("\n")}`;
  if (inds.length) return inds.map((i) => fichaTecnica(i, cx, inds.length > 1 ? "corto" : "")).join("\n\n---\n\n") + (RE_SALUD.test(nq) ? "\n\n" + AVISO_VET : "");
  if (cx.ev && /(puntaje|resultado|como (va|quedo)|nivel|en 0|hallazgo|pendiente|falta)/.test(nq)) {
    const r = cx.r;
    return `**${cx.ev.id}** · ${cx.f.nombre} · ${nombreEsp(cx.ev.sp)} · ${nombreVisita(cx.ev)} (${cx.ev.estado})\n- Puntaje: **${fmt(r.total)} · ${r.nivel[0]}**${r.provisional ? " (provisional)" : ""}\n- Por medida: ${Object.keys(r.pesos).filter((k) => r.pesos[k]).map((k) => `${k} ${r.med[k] == null ? "sin datos" : fmt(r.med[k])}`).join(" · ")}\n${cx.hallazgos.length ? `- En 0: ${cx.hallazgos.slice(0, 5).map((x) => `${x.ind.num} ${x.ind.name}`).join("; ")}\n` : ""}${cx.pendientes.length ? `- Sin calificar: ${cx.pendientes.length} indicadores` : "- Todos los indicadores que aplican están calificados."}`;
  }
  return `No encontré ese tema en la norma. Puedo ayudarle con:\n- Cómo se evalúa un indicador (escriba su nombre o numeral, por ejemplo «6.1.2» o «jadeo»).\n- La muestra (5.6 y Tabla 3), el cálculo del puntaje (Tabla 1) o los niveles (Tabla 2).\n- Las fases de la visita y la revisión de documentos.${cx.ev ? `\n- El resultado de la evaluación ${cx.ev.id}.` : ""}`;
}
/** Responde según el perfil (sin conexión). */
function responderAsistente(q, cx) {
  if (esTecnico()) return responderTecnico(q, cx);
  if (!dentroDeTema(q, cx)) return FUERA_DE_TEMA;
  return responderLocal(q, cx);
}
/** Conocimiento de la norma que se le pasa a la IA: temas generales y las fichas relacionadas con la pregunta. */
function conocimientoNorma(q, cx) {
  const sel = new Map();
  [cx.foco].concat(buscarIndicadores(q || "", cx), esTecnico() ? [] : (cx.mejorables || []).slice(0, 4).map((x) => x.ind)).filter(Boolean).forEach((i) => sel.set(i.code, i));
  const fichas = [...sel.values()].slice(0, 6).map((i) => [`## ${i.num} ${i.name} (${citaInd(i)})`, `Grupo: ${i.g}. Pregunta: ${i.q || "—"}. Método: ${i.metodo || "—"}. Unidad: ${i.unidad || "—"}.`,
    i.cond ? `Cuándo aplica: ${i.cond}.` : "", i.prod ? `Propósito: ${i.prod}.` : "", i.formula ? `Cálculo: ${i.formula}` : "",
    (i.escala || []).map(([p, t]) => `- ${p} puntos: ${t}`).join("\n"), i.nota ? `Interpretación de la plataforma: ${i.nota}` : "", DESC_NORMA[i.num] ? `Texto de la norma: ${DESC_NORMA[i.num]}` : ""].filter(Boolean).join("\n"));
  const sps = cx.sp ? [cx.sp] : cx.especies || ["pato", "ganso"];
  const indice = NORMA.filter((i) => sps.includes(i.sp)).map((i) => `${i.num} ${i.name} (${i.g}, ${pagDe(i.num)})`).join("; ");
  return `# Temas generales\n${TEMAS_NORMA.map((t) => `## ${t.titulo} (${t.cita})\n${t.texto.join("\n")}`).join("\n")}\n\n# Índice de indicadores\n${indice}\n\n# Fichas relacionadas con la pregunta\n${fichas.join("\n\n") || "(ninguna en particular)"}`;
}
/** Instrucciones de la IA según el perfil. */
function promptAsistente(cx, q) {
  const rol = SES ? SES.rol : "productor";
  const comunes = `Eres el asistente de la plataforma EBA Cuac Cuac, que aplica la "Metodología para evaluar el bienestar animal en patos y gansos" del ICA (Colombia, versión 1.0 de 2024).
Reglas:
- Responde SOLO sobre esa metodología, el bienestar de patos y gansos y las evaluaciones de la plataforma. Si te preguntan otra cosa, responde exactamente: "${FUERA_DE_TEMA}"
- Básate en el conocimiento de la norma y en los datos que aparecen abajo. Cita numeral, tabla y página (por ejemplo: 6.1.2 · Tabla 6 · pág. 18). Si algo no está en la norma, dilo; no inventes puntajes, rangos ni fechas.
- Si una tabla no cubre un caso, dilo con claridad, indica la interpretación de la plataforma si existe y recomienda dejarlo escrito en la observación del indicador.
- No des diagnósticos, nombres de medicamentos ni dosis: para enfermedad o tratamientos, remite al médico veterinario (MV o MVZ).
- No cambies ni prometas cambiar calificaciones.
- Español de Colombia, trato de "usted", frases cortas, listas con guiones cuando haya pasos; puedes usar **negrita**.`;
  const quien = rol === "inspector" ? `Hablas con un INSPECTOR del ICA que está haciendo la visita. Resuelve dudas de cómo aplicar la metodología: método, muestra, unidad, escala, cuándo aplica y casos dudosos. Sé preciso y técnico. Máximo unas 200 palabras.${cx.foco ? ` El inspector tiene abierto el indicador ${cx.foco.num} ${cx.foco.name}: si la pregunta no dice de qué indicador habla, se refiere a ese.` : ""}`
    : rol === "productor" ? "Hablas con el PRODUCTOR, dueño o responsable de la finca. Explícale su evaluación, qué mejorar primero y cómo hacerlo, con palabras sencillas. Máximo unas 180 palabras."
    : `Hablas con un ${rol === "admin" ? "ADMINISTRADOR" : "COORDINADOR"} del programa. Responde sobre la norma y los resultados de las evaluaciones con lenguaje técnico. Máximo unas 200 palabras.`;
  return `${comunes}\n${quien}\n\n${conocimientoNorma(q, cx)}\n\n# Datos de la evaluación\n${cx.f ? resumenContexto(cx) : "No hay una finca seleccionada: responde sobre la norma en general."}`;
}

/* ---------------- ventana flotante ---------------- */
/** Finca, evaluación e indicador de la pantalla actual. */
function contextoPantalla() {
  const h = (location.hash || "").slice(2).split("/"), fs = fincasAsistente();
  let ev = null, f = null, foco = null;
  if ((h[0] === "eval") && h[1]) { ev = EVALS.find((e) => e.id === h[1]) || null; if (ev && !fs.some((x) => x.id === ev.finca)) ev = null; if (ev) { f = FINCAS.find((x) => x.id === ev.finca); if (h[2] && IND[h[2]] && IND[h[2]].sp === ev.sp) foco = IND[h[2]]; } }
  else if ((h[0] === "finca" || h[0] === "asistente") && h[1]) { f = fs.find((x) => x.id === h[1]) || null; }
  if (!f && SES.rol === "productor") f = fs.find((x) => evaluacionPorDefecto(x.id)) || fs[0] || null;
  if (f && !ev && SES.rol === "productor") ev = evaluacionPorDefecto(f.id);
  const cx = f ? contextoAsistente(f, ev) : { f: null, ev: null, especies: ["pato", "ganso"] };
  cx.foco = foco; cx.recorrido = h[2] === "recorrido";
  return cx;
}
function sugerenciasRol(cx) {
  if (!esTecnico()) return sugerencias(cx);
  if (cx.foco) return ["¿Cómo se evalúa este indicador?", "¿Qué escala aplica?", "¿Qué hago si dudo entre dos niveles?", "¿Cuándo no aplica?"];
  if (cx.recorrido) return ["¿Cómo se toma la muestra?", "¿Qué aves escojo?", "¿Cómo se evalúa el jadeo?", "¿Qué pasa si no hay corral?"];
  const s = ["¿Cómo se toma la muestra?", "¿Cómo se calcula el puntaje total?", "¿Qué documentos se revisan?", "¿Qué cambia en traspatio?"];
  if (cx.ev) s.unshift(`¿Cómo va la evaluación ${cx.ev.id}?`);
  return s.slice(0, 5);
}
const bienvenida = (cx) => esTecnico()
  ? `Hola. Soy el asistente de la norma del ICA. Le ayudo con dudas de la metodología: cómo se evalúa un indicador, la muestra, la escala o un caso dudoso.${cx.foco ? ` Veo que está en **${cx.foco.num} ${cx.foco.name}**; pregúnteme lo que necesite.` : cx.ev ? ` Tengo a la mano la evaluación **${cx.ev.id}**.` : ""}`
  : `Hola. Soy el asistente de bienestar animal. ${cx.ev ? `Tengo a la mano su evaluación **${cx.ev.id}** (${fmt(cx.r.total)} puntos, nivel ${cx.r.nivel[0]}): puedo explicarle qué significa, qué mejorar primero y cómo hacerlo.` : "Puedo explicarle lo que revisa la norma del ICA y cómo cuidar el bienestar de sus patos y gansos."}`;

function abrirAsistenteFlotante() {
  let p = document.getElementById("asis-panel");
  if (p) { cerrarAsistenteFlotante(); return; }
  p = document.createElement("aside"); p.id = "asis-panel"; p.className = "asis-panel"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Asistente de la norma");
  document.body.appendChild(p); document.body.classList.add("con-asis");
  pintarAsistenteFlotante();
  setTimeout(() => { const t = p.querySelector("#apQ"); if (t) t.focus(); }, 50);
}
function cerrarAsistenteFlotante() {
  const p = document.getElementById("asis-panel"); if (p) p.remove();
  document.body.classList.remove("con-asis"); if (typeof actualizarBotonAsistente === "function") actualizarBotonAsistente();
}
function pintarAsistenteFlotante() {
  const p = document.getElementById("asis-panel"); if (!p || !SES) return;
  const cx = contextoPantalla(), cfg = cfgAsistente();
  const clave = `${SES.rol}|${cx.ev ? cx.ev.id : cx.f ? cx.f.id : "general"}`;
  const conv = (CHAT[clave] = CHAT[clave] || [{ rol: "a", texto: bienvenida(cx) }]);
  const ctxTxt = cx.foco ? `Indicador <b>${cx.foco.num} ${esc(cx.foco.name)}</b> · ${esc(cx.ev.id)}` : cx.ev ? `Evaluación <b>${esc(cx.ev.id)}</b> · ${esc(cx.f.nombre)} · ${nombreSp(cx.ev.sp)}` : cx.f ? `Finca <b>${esc(cx.f.nombre)}</b>` : "Preguntas generales de la norma";
  p.innerHTML = `<header class="ap-cab"><span class="ap-ico">${ICONO_ASISTENTE}</span><div><b>Asistente de la norma ICA</b><small>${NOMBRE_ROL_ASIS[SES.rol] || ""} · ${nombreModo(cfg.modo)}</small></div><button type="button" class="ap-cerrar" id="apCerrar" aria-label="Cerrar el asistente">✕</button></header>
    <p class="ap-ctx">${ctxTxt}</p>
    <div class="chat-msgs ap-msgs" id="apMsgs" aria-live="polite"></div>
    <div class="chat-sug ap-sug">${sugerenciasRol(cx).map((s) => `<button type="button" data-apq="${esc(s)}">${esc(s)}</button>`).join("")}</div>
    <form class="chat-form ap-form" id="apForm"><label class="sr" for="apQ">Escriba su pregunta</label><textarea id="apQ" rows="2" maxlength="800" placeholder="${esTecnico() ? "Ej.: ¿cómo califico la cama si está húmeda solo junto al bebedero?" : "Ej.: ¿qué debo mejorar primero?"}"></textarea><button class="btn btn-primario" id="apEnviar">Enviar</button></form>
    <p class="aviso-asis">Responde solo sobre la norma del ICA y cita de dónde sale. Es orientativo: no reemplaza el criterio del inspector ni la revisión de un médico veterinario.</p>`;
  const caja = p.querySelector("#apMsgs");
  const pinta = () => { caja.innerHTML = conv.map((m) => `<div class="msg ${m.rol === "u" ? "msg-u" : "msg-a"}">${m.rol === "u" ? `<p>${esc(m.texto)}</p>` : mdSeguro(m.texto)}${m.rol === "a" && m.nota ? `<span class="fuente">${esc(m.nota)}</span>` : ""}</div>`).join(""); caja.scrollTop = caja.scrollHeight; };
  pinta();
  let ocupado = false;
  const enviar = async (q) => {
    q = String(q || "").trim(); if (!q || ocupado) return;
    ocupado = true; p.querySelector("#apEnviar").disabled = true;
    const previo = conv.slice(1); conv.push({ rol: "u", texto: q }); pinta();
    const c = cfgAsistente();
    if (c.modo === "local") conv.push({ rol: "a", texto: responderAsistente(q, cx), fuente: "local", nota: "Respuesta con el texto de la norma y los datos de la plataforma." });
    else if (!dentroDeTema(q, cx)) conv.push({ rol: "a", texto: FUERA_DE_TEMA, fuente: "local" });
    else {
      caja.insertAdjacentHTML("beforeend", '<div class="msg msg-a msg-escribiendo">El asistente está escribiendo…</div>'); caja.scrollTop = caja.scrollHeight;
      try { conv.push({ rol: "a", texto: await preguntarIA(q, cx, previo), fuente: "ia", nota: "Respuesta generada con IA a partir de la norma. Verifique con la ficha del indicador." }); }
      catch (e) { conv.push({ rol: "a", texto: responderAsistente(q, cx), fuente: "local", error: true, nota: `No se pudo conectar con la IA (${e.message}). Respondí con el texto de la norma.` }); }
    }
    log(`Consulta al asistente (${NOMBRE_ROL_ASIS[SES.rol] || SES.rol})${cx.ev ? ` sobre ${cx.ev.id}` : ""}`);
    ocupado = false; const b = p.querySelector("#apEnviar"); if (b) b.disabled = false; pinta();
  };
  const ta = p.querySelector("#apQ");
  p.querySelector("#apForm").onsubmit = (e) => { e.preventDefault(); const q = ta.value; ta.value = ""; enviar(q); };
  ta.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); p.querySelector("#apForm").requestSubmit(); } };
  p.querySelectorAll("[data-apq]").forEach((b) => (b.onclick = () => enviar(b.dataset.apq)));
  p.querySelector("#apCerrar").onclick = cerrarAsistenteFlotante;
}
// Si el usuario cambia de pantalla con la ventana abierta, el asistente toma el nuevo contexto (por ejemplo, otro indicador).
if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => { if (document.getElementById("asis-panel")) { if (!SES) cerrarAsistenteFlotante(); else pintarAsistenteFlotante(); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.getElementById("asis-panel") && !document.querySelector("#capas .modal")) cerrarAsistenteFlotante(); });
}
