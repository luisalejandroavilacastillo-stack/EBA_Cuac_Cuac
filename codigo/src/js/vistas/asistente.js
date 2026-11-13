/* EBA Cuac Cuac — js/vistas/asistente.js
   Asistente para el productor: responde dudas sobre su evaluación, su plan de mejora y el bienestar de sus patos y gansos.
   Funciona en dos modos:
   · Local (sin conexión): arma la respuesta con los datos de la evaluación y los textos de la norma.
   · IA: envía la pregunta y el resumen de la evaluación a la API de Mensajes de Claude (directa o por un servidor intermedio).
     Si la conexión falla, responde en modo local. Nunca se envían documento, correo ni teléfono de la persona. */
"use strict";

/* ---------------- configuración (la define el administrador en Parametrización) ---------------- */
const ASIS_MODELOS = [["claude-sonnet-5-5", "Claude Sonnet 5.5 (equilibrado)"], ["claude-haiku-5-5", "Claude Haiku 5.5 (rápido y económico)"], ["claude-opus-5-5", "Claude Opus 5.5 (más capaz)"]];
const ASIS_CFG_DEF = { modo: "local", endpoint: "https://api.anthropic.com/v1/messages", modelo: "claude-sonnet-5-5", clave: "", maxTokens: 900 };
/** Configuración vigente. Si el servidor de la plataforma tiene Gemini configurado (GEMINI_API_KEY en el .env), se usa ese. */
const iaServidor = () => (window.EBA_BD && window.EBA_BD.asistenteServidor && window.EBA_BD.asistenteServidor.disponible ? window.EBA_BD.asistenteServidor : null);
const cfgAsistente = () => {
  const c = Object.assign({}, ASIS_CFG_DEF, store.get("asistente", {})), s = iaServidor();
  if (s) Object.assign(c, { modo: "gemini", modelo: s.modelo, clave: "", endpoint: "/api/asistente" });
  return c;
};
const nombreModo = (m) => ({ local: "Modo local (sin conexión)", claude: "IA · Claude (conexión directa)", proxy: "IA · Claude (servidor intermedio)", gemini: "IA · Gemini (servidor de la plataforma)" })[m] || m;
let CHAT = {};   // conversaciones de esta sesión, por evaluación

/* ---------------- consejos prácticos por indicador (orientativos; complementan la escala de la norma) ---------------- */
const CONSEJOS = {
  PR01: ["Revise que el refugio proteja de lluvia, sol y depredadores, sobre todo en la noche.", "Mantenga el piso seco y permita la entrada de aire fresco y luz natural.", "Programe limpieza y desinfección periódica del alojamiento."],
  PR02: ["Retire la cama húmeda o compactada, sobre todo alrededor de los bebederos.", "Agregue material seco (viruta, cascarilla) y remuévalo para que no forme costra.", "Revise goteras y derrames de los bebederos, que son la causa más común de cama mojada."],
  PR03: ["Lave los bebederos a diario para que no se forme lama.", "Ajuste la altura al lomo de las aves para evitar derrames.", "Cambie los bebederos rotos o con bordes que puedan lastimar."],
  PR04: ["Cuente cuántas aves hay por bebedero y agregue bebederos si hay competencia.", "Distribúyalos para que ninguna ave tenga que caminar mucho para tomar agua."],
  PR05: ["Verifique que todos los bebederos tengan agua en todo momento, incluso en las horas de más calor.", "En bebederos automáticos, revise presión y flujo; en los artesanales, el llenado frecuente."],
  PR06: ["Mantenga limpios los tanques y fuentes de agua y protéjalos de la contaminación.", "Tenga un protocolo escrito de tratamiento del agua (por ejemplo, cloración) y regístrelo."],
  PR07: ["Ponga los comederos a una altura en que las aves coman cómodas.", "Límpielos con frecuencia y cambie los rotos."],
  PR08: ["Revise cuántas aves hay por comedero y agregue comederos si hay competencia o aves desplazadas."],
  PR09: ["Revise que ventiladores, cortinas, sombra o calefacción funcionen y estén descritos en el POE.", "En horas de calor, revise el jadeo de las aves: es la señal de que el confort térmico no es suficiente."],
  PR10: ["Ofrezca nidales individuales o colectivos en buen estado y con cama limpia."],
  PR11: ["Calcule la densidad: kilos de aves por metro cuadrado útil. Si supera el máximo para el peso de sus aves, reduzca la cantidad o amplíe el área."],
  PR12: ["Los patos necesitan agua para nadar o al menos sumergir la cabeza: una poceta de 10 cm o más de profundidad, con rampas de entrada y salida.", "Cambie el agua con frecuencia y mantenga limpio el borde."],
  PA01: ["El jadeo indica calor. Mejore la ventilación, dé sombra y agua fresca en las horas de más temperatura.", "Evite manejar o mover las aves en las horas de calor.", "Revise la densidad: muchas aves en poco espacio aumentan el calor."],
  PA02: ["El amontonamiento suele indicar frío, corrientes de aire o miedo.", "Revise cortinas y fuentes de calor, sobre todo en la noche y con aves jóvenes."],
  PA03: ["Las lesiones de quilla se relacionan con golpes, perchas o pisos inadecuados y con la nutrición. Consulte al médico veterinario sobre la dieta y revise las instalaciones."],
  PA04: ["La podo dermatitis se previene con cama seca y limpia y pisos sin asperezas.", "Revise las aves afectadas con su médico veterinario para el tratamiento."],
  PA05: ["Revise pisos, mallas y rejillas que puedan atrapar o lastimar los dedos."],
  PA06: ["Busque bordes cortantes, clavos o mallas rotas en el galpón.", "Si hay picoteo entre aves, revise densidad, luz y alimentación con su médico veterinario."],
  PA07: ["El plumaje sucio se relaciona con falta de agua para bañarse y con cama húmeda.", "Asegure acceso a agua para el baño (pocetas) y cama seca."],
  PA08: ["Las secreciones de ojos y nariz pueden indicar enfermedad o mala calidad del aire (amoníaco, polvo). Mejore la ventilación y consulte al médico veterinario."],
  PA09: ["Revise comederos y bebederos que puedan lastimar el pico; consulte al médico veterinario si ve lesiones."],
  PA10: ["Lleve un registro diario de las aves muertas y la causa probable.", "Si la mortalidad sube de forma repentina, avise de inmediato a su médico veterinario."],
  PA11: ["Ajuste la ración a la etapa y propósito (carne o huevo) con un zootecnista o médico veterinario.", "Revise que todas las aves alcancen el comedero sin competencia."],
  PG01: ["Haga un análisis fisicoquímico y microbiológico del agua en un laboratorio y guarde el informe."],
  PG02: ["Guarde la etiqueta o factura del alimento, que muestre que es de una planta registrada ante el ICA y acorde a la etapa."],
  PG03: ["Tenga por escrito el plan sanitario para prevenir y controlar enfermedades, firmado por el médico veterinario."],
  PG04: ["El POE de bienestar animal debe incluir como mínimo vacunación, densidades, manejo de enfermos y prácticas para reducir el estrés, y estar firmado."],
  PG05: ["Incluya en el POE qué hacer en emergencias de calor o frío: equipos, insumos y responsables."],
  PG06: ["Escriba el programa de luz y oscuridad de 24 horas de su granja y qué hacer si cambia."],
  PG07: ["Todo el personal que maneja aves debe tener el certificado del curso de bienestar animal."],
  PG08: ["El protocolo de sacrificio humanitario debe decir el método, el procedimiento, los criterios y estar firmado por un MV o MVZ."],
  PG09: ["Si el sacrificio lo hace personal que no es MV ni MVZ, todos deben tener el certificado de capacitación."],
  PG10: ["Use solo medicamentos con registro ICA, con fórmula del médico veterinario, y anote cada tratamiento y su tiempo de retiro."],
  GR01: ["Ofrezca alimento en buen estado y una dieta balanceada por un zootecnista o nutricionista."],
  GR02: ["Todos los gansos deben tener agua limpia disponible todo el tiempo."],
  GR03: ["Mantenga los comederos limpios, en buen estado y sin partes que puedan lastimar."],
  GR04: ["Mantenga los bebederos limpios, en buen estado y sin partes que puedan lastimar."],
  GR05: ["Retire del galpón o potrero alambres, plásticos, vidrios y otros objetos peligrosos."],
  GR06: ["Los gansos necesitan acceso permanente a un estanque, lago o espejo de agua limpio."],
  GR07: ["Revise que las instalaciones protejan del sol, la lluvia, el viento y los depredadores."],
  GA01: ["Separe y trate a los gansos con heridas con indicación del médico veterinario.", "Busque la causa: objetos cortantes, peleas o depredadores."],
  GA02: ["El plumaje en mal estado se relaciona con falta de agua para bañarse, parásitos o nutrición. Consulte al médico veterinario."],
  GA03: ["Mantenga pisos y potreros sin barro permanente ni superficies ásperas; trate las patas afectadas con el médico veterinario."],
  GA04: ["La diarrea puede venir del agua, el alimento o una enfermedad. Revise el agua y consulte al médico veterinario."],
  GA05: ["Revise objetos o comederos que puedan lastimar el pico; consulte al médico veterinario si hay lesiones."],
  GA06: ["Revise los gansos cojos con el médico veterinario y el estado de los pisos y potreros."],
  GA07: ["Las secreciones de los ojos pueden indicar infección o falta de agua para limpiarse. Consulte al médico veterinario."],
  GA08: ["Las peleas aumentan con poco espacio, pocos comederos o grupos mezclados. Revise densidad y recursos."],
  GA09: ["Maneje a los gansos con calma, sin gritos ni persecuciones, para que no le tengan miedo a las personas."],
  GA10: ["Dé espacio, agua para nadar y pastoreo: favorecen los comportamientos positivos (acicalarse, bañarse, explorar)."],
  GG01: ["Escriba un plan de contingencia para inundaciones, sequías u otros desastres y practíquelo con el personal."],
  GG02: ["Tenga el plan sanitario firmado por el MV o MVZ y registre su aplicación."],
  GG03: ["Registre cada sacrificio: fecha, causa y método."],
  GG04: ["Identifique a los gansos con brazaletes, nombres o microchips (o deje constancia si no se identifican)."],
  GG05: ["Más del 80 % del personal debe certificar su capacitación en bienestar animal."],
  GG06: ["Use solo medicamentos con registro ICA, con fórmula del médico veterinario, y anote cada tratamiento."],
  GG07: ["Lleve registros escritos de mortalidad; si supera el 3 %, revise las causas con el médico veterinario."],
  GG08: ["El protocolo de sacrificio debe tener método, procedimiento y criterios, y estar firmado por un MV o MVZ con matrícula."]
};
/** Palabras con las que el productor suele nombrar cada indicador. */
const SINONIMOS = {
  PR01: "alojamiento refugio techo galpon casa", PR02: "cama viruta cascarilla piso humedo", PR03: "bebedero bebederos integridad lama", PR04: "aves por bebedero cuantos bebederos",
  PR05: "agua suministro llenado presion", PR06: "calidad del agua tanque cloro potable", PR07: "comedero comederos", PR08: "aves por comedero cuantos comederos",
  PR09: "confort termico ventilador ventilacion calor frio cortinas", PR10: "nidal nidales nido nidos", PR11: "densidad espacio hacinamiento metro cuadrado", PR12: "poceta pocetas estanque nadar piscina banarse",
  PA01: "jadeo jadean calor respiran boca abierta", PA02: "amontonamiento amontonan acurrucan frio", PA03: "quilla pecho hueso", PA04: "podo dermatitis patas almohadilla plantar",
  PA05: "dedos", PA06: "piel heridas lesiones rasguños", PA07: "plumaje plumas sucias suciedad", PA08: "ojos nariz secreciones oculo nasal", PA09: "pico",
  PA10: "mortalidad muertes muertos murieron mueren", PA11: "condicion corporal flaco flacos gordo peso", PG01: "analisis agua laboratorio", PG02: "alimento concentrado alimentacion",
  PG03: "plan sanitario vigilancia vacunas", PG04: "poe procedimiento operativo", PG05: "emergencias termicas", PG06: "iluminacion luz oscuridad", PG07: "capacitacion curso bienestar",
  PG08: "sacrificio eutanasia protocolo", PG09: "capacitacion sacrificio eutanasia", PG10: "medicamentos bpumv antibioticos retiro",
  GR01: "alimento alimentacion comida", GR02: "agua acceso", GR03: "comederos limpieza", GR04: "bebederos limpieza", GR05: "limpieza potrero objetos", GR06: "estanque lago agua nadar",
  GR07: "proteccion clima depredadores", GA01: "heridas lesiones", GA02: "plumaje plumas", GA03: "podo dermatitis patas", GA04: "diarrea", GA05: "pico", GA06: "cojos cojera cojean",
  GA07: "ojos secreciones conjuntivitis", GA08: "agresiones peleas picotean pelean", GA09: "miedo humano interaccion", GA10: "comportamientos positivos", GG01: "contingencia desastres",
  GG02: "plan sanitario", GG03: "registro sacrificios", GG04: "identificacion brazaletes microchip", GG05: "capacitacion personal", GG06: "medicamentos", GG07: "mortalidad muertes registros", GG08: "sacrificio protocolo"
};
const sinTildes = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const PALABRAS_VACIAS = new Set("de del la las el los y o en a por para con sin que como mi mis su sus un una al es se lo le me hay mas muy cual cuales donde porque".split(" "));

/* ---------------- contexto: lo que el asistente sabe de la evaluación ---------------- */
function evaluacionesDeFinca(fid) {
  return EVALS.filter((e) => e.finca === fid && e.estado !== "Programada" && e.estado !== "Anulada").sort((a, b) => b.fecha.localeCompare(a.fecha));
}
function fincasAsistente() {
  const u = yo();
  return SES.rol === "productor" ? FINCAS.filter((f) => f.productor === u.nombre) : FINCAS;
}
/** Evaluación por defecto: la última finalizada de la finca; si no hay, la última registrada. */
function evaluacionPorDefecto(fid) {
  const l = evaluacionesDeFinca(fid);
  return l.find((e) => e.estado === "Finalizada") || l[0] || null;
}
function contextoAsistente(f, ev) {
  const cx = { f, ev, especies: f.especies.map((e) => e.sp) };
  if (!ev) return cx;
  const r = resultado(ev), ctx = r.ctx;
  cx.r = r; cx.ctx = ctx; cx.sp = ev.sp;
  cx.indicadores = lista(ev).filter((i) => !aplica(i, ctx)).map((ind) => {
    const c = calcular(ind, ev.resp[ind.code], ctx);
    return { ind, score: c.done ? c.score : null, det: c.det || "", obs: (ev.obs || {})[ind.code] || "", plan: (ev.plan || {})[ind.code] || null, porGalpon: c.porGalpon || null };
  });
  const n = r.n;
  cx.ganancia = (x) => (x.score == null || !n[x.ind.g] ? 0 : (r.pesos[x.ind.g] * (100 - x.score)) / n[x.ind.g]);
  cx.hallazgos = cx.indicadores.filter((x) => x.score === 0).sort((a, b) => cx.ganancia(b) - cx.ganancia(a));
  cx.mejorables = cx.indicadores.filter((x) => x.score != null && x.score < 100).sort((a, b) => cx.ganancia(b) - cx.ganancia(a));
  cx.pendientes = cx.indicadores.filter((x) => x.score == null);
  cx.alertas = alertasGalpon(ev);
  cx.plan = Object.entries(ev.plan || {}).filter(([, p]) => p && (p.accion || p.plazo)).map(([code, p]) => ({ ind: NORMA.find((i) => i.code === code), p }));
  cx.proceso = ev.proceso ? estadoProceso(ev.proceso) : null;
  cx.cambios = cambiosFrenteAnterior(ev);
  return cx;
}
const diasHasta = (iso) => { if (!iso) return null; const h = new Date(); h.setHours(0, 0, 0, 0); return Math.round((new Date(iso + "T00:00") - h) / 864e5); };
const textoPlazo = (iso) => { const d = diasHasta(iso); if (d == null) return "sin fecha"; const f = fecha(new Date(iso + "T07:00")); return d < 0 ? `${f} (venció hace ${-d} día${d === -1 ? "" : "s"})` : d === 0 ? `${f} (hoy)` : `${f} (faltan ${d} día${d === 1 ? "" : "s"})`; };
const nivelEscala = (ind, s) => { const e = (ind.escala || []).find(([v]) => v === s); return e ? e[1] : null; };
const primeraFrase = (t, n) => { const fr = String(t || "").split(/(?<=\.)\s+/).slice(0, n || 2).join(" "); return fr.length > 420 ? fr.slice(0, 417) + "…" : fr; };
const nombreEsp = (sp) => (sp === "pato" ? "patos" : "gansos");

/** Resumen en texto plano de la evaluación (para la IA). Sin datos personales del productor. */
function resumenContexto(cx) {
  const f = cx.f, L = [];
  L.push(`Finca: ${f.nombre} (${f.mpio}, ${f.depto}). Especies: ${cx.especies.map(nombreEsp).join(" y ")}. Aves: ${poblacion(f)}.`);
  if (!cx.ev) { L.push("La finca todavía no tiene evaluaciones registradas en la plataforma."); return L.join("\n"); }
  const r = cx.r, ev = cx.ev;
  L.push(`Evaluación ${ev.id} de ${nombreEsp(ev.sp)}, ${nombreVisita(ev)}, fecha ${ev.fecha}, estado ${ev.estado}${r.provisional ? " (resultado provisional por documentos pendientes)" : ""}.`);
  L.push(`Tramo: ${r.ctx.tramo} (${r.ctx.tramo === "comercial" ? "200 aves o más" : "menos de 200 aves"}). Pesos de la Tabla 1: ${Object.entries(r.pesos).filter(([, p]) => p).map(([k, p]) => `${{ MBA: "animal", MBR: "recursos", MBG: "gestión" }[k]} ${Math.round(p * 100)} %`).join(", ")}.`);
  L.push(`Puntaje total: ${fmt(r.total)} · nivel ${r.nivel[0]} (Tabla 2: Excelente ≥ 90, Alto ≥ 75, Medio ≥ 50, Bajo < 50).`);
  L.push(`Puntaje por medida: ${Object.keys(r.pesos).filter((k) => r.pesos[k]).map((k) => `${{ MBA: "animal", MBR: "recursos", MBG: "gestión" }[k]} ${r.med[k] == null ? "sin datos" : fmt(r.med[k])}`).join(", ")}.`);
  L.push("Indicadores por debajo de 100 (numeral, nombre, puntaje, lo que pide la norma para 100, observación del inspector):");
  cx.mejorables.forEach((x) => L.push(`- ${x.ind.num} ${x.ind.name}: ${fmt(x.score)} puntos. Para 100: ${x.ind.escala && x.ind.escala[0] ? x.ind.escala[0][1] : "—"}${x.obs ? ` Observación: ${x.obs}` : ""}${x.det ? ` Cálculo: ${x.det}` : ""}`));
  if (!cx.mejorables.length) L.push("- Ninguno: todos los indicadores calificados están en 100.");
  if (cx.pendientes.length) L.push(`Indicadores sin calificar: ${cx.pendientes.map((x) => `${x.ind.num} ${x.ind.name}`).join("; ")}.`);
  if (cx.alertas.length) L.push(`Alertas por galpón: ${cx.alertas.map((a) => `${a.ind.num} ${a.ind.name}, galpón ${a.galpon + 1} con ${fmt(a.score)} frente a ${fmt(a.finca)} de la finca`).join("; ")}.`);
  if (cx.plan.length) { L.push("Plan de mejora acordado:"); cx.plan.forEach(({ ind, p }) => L.push(`- ${ind ? ind.num + " " + ind.name : "—"}: ${p.accion || "(sin acción escrita)"}; responsable ${p.resp || "—"}; plazo ${p.plazo || "—"}${p.galpon ? `; ${p.galpon}` : ""}.`)); }
  if (ev.obsGeneral) L.push(`Observación general del inspector: ${ev.obsGeneral}`);
  if (cx.proceso) { const st = cx.proceso; L.push(`Proceso ${st.id}: estado ${st.estado}; seguimientos usados ${st.usados} de ${st.max}. Criterio para cerrar el proceso por cumplimiento: puntaje de 90 o más, ningún indicador en 0 y sin información pendiente.${st.verificacion && !st.verificacion.cumple ? ` Le falta: ${st.verificacion.motivos.join("; ")}.` : ""}`); }
  if (cx.cambios) L.push(`Frente a la visita anterior: mejoraron ${cx.cambios.mejoro.length} indicadores, empeoraron ${cx.cambios.empeoro.length}, iguales ${cx.cambios.igual}.`);
  return L.join("\n");
}
function promptSistema(cx) {
  return `Eres el asistente de bienestar animal de la plataforma EBA Cuac Cuac, que aplica la "Metodología para evaluar el bienestar animal en patos y gansos" del ICA (Colombia, versión 1.0 de 2024).
Hablas con el productor dueño o responsable de la finca. Tu trabajo es explicarle su evaluación, su plan de mejora y resolver dudas prácticas sobre el bienestar de sus patos y gansos.
Reglas:
- Responde en español de Colombia, con palabras sencillas, frases cortas y trato respetuoso de "usted". Máximo unas 180 palabras salvo que pida más detalle.
- Básate en los datos de la evaluación que aparecen abajo y en la norma. Cita el numeral cuando hables de un indicador (por ejemplo, 6.2.1 Jadeo). Si un dato no está en la evaluación, dilo; no inventes puntajes, fechas ni observaciones.
- Puedes dar recomendaciones generales de manejo (agua, cama, ventilación, densidad, limpieza, registros, documentos), pero no des diagnósticos definitivos, ni nombres de medicamentos, ni dosis. Para enfermedad, tratamientos o muertes, recomienda consultar a un médico veterinario (MV o MVZ). Si describe muchas muertes repentinas o signos de una enfermedad de control oficial, dile que avise de inmediato a su veterinario y a la oficina local del ICA.
- No cambies ni prometas cambiar la calificación: la califica el inspector del ICA en la visita.
- Usa listas cortas con guiones cuando des pasos. Puedes usar **negrita** para lo más importante.

Datos de la evaluación del productor:
${resumenContexto(cx)}`;
}

/* ---------------- motor local (sin conexión) ---------------- */
function buscarIndicadores(q, cx) {
  const sp = cx.sp ? [cx.sp] : cx.especies, nq = sinTildes(q);
  const num = nq.match(/\b([67])\.([123])\.(\d{1,2})\b/);
  if (num) { const i = NORMA.find((x) => x.num === num[0] && sp.includes(x.sp)); if (i) return [i]; }
  const pal = nq.replace(/[^a-z0-9ñ\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !PALABRAS_VACIAS.has(w));
  if (!pal.length) return [];
  const puntaje = NORMA.filter((i) => sp.includes(i.sp)).map((i) => {
    const texto = " " + sinTildes(i.name + " " + (SINONIMOS[i.code] || "")).replace(/[^a-z0-9ñ\s]/g, " ") + " ";
    let s = 0; pal.forEach((w) => { if (texto.includes(" " + w + " ")) s += 2; else if (w.length > 4 && texto.includes(" " + w.slice(0, -1))) s += 1; });
    return [i, s];
  }).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
  if (!puntaje.length) return [];
  const top = puntaje[0][1];
  return puntaje.filter(([, s]) => s >= top && s >= 2).slice(0, 2).map(([i]) => i);
}
function explicarIndicador(ind, cx) {
  const x = cx.indicadores && cx.indicadores.find((y) => y.ind.code === ind.code), L = [];
  L.push(`**${ind.num} ${ind.name}** (${{ MBA: "medida del animal", MBR: "medida de recursos", MBG: "medida de gestión" }[ind.g]})`);
  if (!cx.ev) L.push("Su finca todavía no tiene una evaluación registrada; le explico lo que pide la norma.");
  else if (!x) L.push(`Este indicador no aplica en su evaluación ${cx.ev.id}${ind.cond ? ` (${ind.cond.charAt(0).toLowerCase() + ind.cond.slice(1)})` : ""}.`);
  else if (x.score == null) L.push(`En la evaluación ${cx.ev.id} todavía no tiene calificación.`);
  else {
    const t = nivelEscala(ind, x.score);
    L.push(`En su evaluación del ${fecha(new Date(cx.ev.fecha + "T07:00"))} obtuvo **${fmt(x.score)} puntos**${t ? `: ${t.charAt(0).toLowerCase() + t.slice(1).replace(/\.\s*$/, "")}` : x.score < 100 ? " (promedio de lo observado en las aves o unidades revisadas)" : ""}.`);
    if (x.obs) L.push(`El inspector anotó: «${x.obs}»`);
    if (x.porGalpon) L.push(`Por galpón: ${x.porGalpon.map((s, g) => `galpón ${g + 1}: ${fmt(s)}`).join(" · ")}.`);
  }
  if (DESC_NORMA[ind.num]) L.push(`Qué revisa la norma: ${primeraFrase(DESC_NORMA[ind.num], 2)}`);
  if (ind.escala && ind.escala[0] && (!x || x.score == null || x.score < 100)) L.push(`Para obtener 100 puntos: ${ind.escala[0][1]}`);
  if (CONSEJOS[ind.code] && (!x || x.score == null || x.score < 100)) L.push("Qué puede hacer:\n" + CONSEJOS[ind.code].map((c) => "- " + c).join("\n"));
  if (x && x.plan && x.plan.accion) L.push(`En su plan de mejora quedó: ${x.plan.accion}${x.plan.resp ? ` (responsable: ${x.plan.resp})` : ""}${x.plan.plazo ? `, plazo ${textoPlazo(x.plan.plazo)}` : ""}.`);
  if (x && x.score != null && x.score < 100 && cx.ganancia(x) > 0) L.push(`Si este indicador llega a 100, su puntaje total sube cerca de ${fmt(cx.ganancia(x))} puntos.`);
  return L.join("\n\n");
}
const RE_SALUD = /(enferm|medicament|dosis|antibiot|vacun|diagnost|virus|bacteria|parasit|desparasit|remedio|curar|tratar)/;
const RE_URGENTE = /(muchas?\s+(aves|patos|gansos)?\s*muert|se\s+(me\s+)?(estan\s+)?muriendo|murieron\s+muchas?|muerte\s+(subita|repentina)|de\s+repente\s+se\s+murieron)/;
const AVISO_VET = "Para enfermedades, tratamientos o medicamentos, consulte a su médico veterinario (MV o MVZ): el asistente no reemplaza su revisión.";
function responderLocal(q, cx) {
  const nq = sinTildes(q), ev = cx.ev, r = cx.r;
  if (RE_URGENTE.test(nq)) return `**Esto puede ser urgente.** Si se le están muriendo muchas aves de forma repentina:\n- Llame hoy mismo a su médico veterinario.\n- Avise a la oficina local del ICA: algunas enfermedades de las aves son de control oficial.\n- Separe las aves enfermas, no venda ni mueva aves y anote cuántas mueren cada día.\n\n${AVISO_VET}`;
  if (/^(hola|buenos|buenas|saludos)/.test(nq.trim())) return `Hola. Soy el asistente de bienestar animal de EBA Cuac Cuac. Puedo explicarle ${ev ? `su evaluación ${ev.id}, ` : ""}qué significa cada indicador, qué le conviene corregir primero y cómo va su plan de mejora. ¿Qué duda tiene?`;
  if (/(gracias|muy amable)/.test(nq)) return "Con gusto. Si tiene otra duda sobre sus aves o su evaluación, escríbame.";
  const inds = /(plan de mejora|mi plan\b|compromisos?)/.test(nq) ? [] : buscarIndicadores(q, cx);
  const quiere = (re) => re.test(nq);
  if (!ev && !inds.length) return `Su finca ${cx.f.nombre} todavía no tiene evaluaciones registradas. Puedo explicarle lo que revisa la norma: pregúnteme por un tema, por ejemplo «¿qué revisan del agua?» o «¿cómo evitar el jadeo?».`;
  if (quiere(/(puntaje|puntos|nivel|calificacion|califico|resultado|nota|como me fue|como voy|que significa)/) && !inds.length) {
    const med = Object.keys(r.pesos).filter((k) => r.pesos[k]).map((k) => `- ${{ MBA: "Medidas del animal", MBR: "Recursos", MBG: "Gestión (documentos)" }[k]}: ${r.med[k] == null ? "sin datos" : fmt(r.med[k])} puntos × ${Math.round(r.pesos[k] * 100)} % = ${fmt(r.aporte[k])}`).join("\n");
    return `En la evaluación ${ev.id} (${nombreVisita(ev).toLowerCase()}, ${fecha(new Date(ev.fecha + "T07:00"))}) su finca obtuvo **${fmt(r.total)} puntos: nivel ${r.nivel[0]}**${r.provisional ? " (provisional: hay documentos pendientes)" : ""}.\n\nEl puntaje sale de tres partes, cada una con su peso según la Tabla 1 de la norma:\n${med}\n\nNiveles (Tabla 2): Excelente 90 o más · Alto 75 a 89,9 · Medio 50 a 74,9 · Bajo menos de 50.${cx.hallazgos.length ? `\n\nTiene ${cx.hallazgos.length} indicador${cx.hallazgos.length > 1 ? "es" : ""} en 0. Pregúnteme «¿qué corrijo primero?» y le digo por dónde empezar.` : ""}`;
  }
  if (!inds.length && quiere(/(primero|priorid|corregir|corrijo|mejorar|mejoro|subir|que hago|que debo|recomend|cumplir|consejo)/)) {
    if (!cx.mejorables.length) return `Todos los indicadores calificados de la evaluación ${ev.id} están en 100. Mantenga las prácticas actuales${cx.pendientes.length ? ` y complete lo pendiente: ${cx.pendientes.map((x) => x.ind.num).join(", ")}` : ""}.`;
    const top = cx.mejorables.slice(0, 4);
    return `Le conviene empezar por lo que más sube su puntaje:\n${top.map((x) => `- **${x.ind.num} ${x.ind.name}** (${fmt(x.score)} puntos): ${CONSEJOS[x.ind.code] ? CONSEJOS[x.ind.code][0] : x.ind.escala[0][1]} Puede sumar cerca de ${fmt(cx.ganancia(x))} puntos.`).join("\n")}\n\n${cx.hallazgos.length ? "Para cerrar el proceso, además de llegar a 90 puntos, ningún indicador puede quedar en 0." : "Pregúnteme por cualquiera de ellos para ver qué pide la norma."}`;
  }
  if (!inds.length && quiere(/(plan|compromiso|plazo|acciones|accion|tarea)/)) {
    if (!cx.plan.length) return `En la evaluación ${ev.id} no hay acciones escritas en el plan de mejora. Puede pedírselas al inspector o preguntarme «¿qué corrijo primero?».`;
    return `Su plan de mejora (${ev.id}):\n${cx.plan.map(({ ind, p }) => `- **${ind ? ind.num + " " + ind.name : "—"}**${p.galpon ? ` (${p.galpon})` : ""}: ${p.accion || "acción sin escribir"} · responsable: ${p.resp || "—"} · plazo: ${textoPlazo(p.plazo)}`).join("\n")}\n\nEn la próxima visita el inspector revisará si estas acciones se cumplieron.`;
  }
  if (!inds.length && quiere(/(seguimiento|visita|proxima|proceso|cerrar|cierre|cuando vuelven|cuantas)/)) {
    const st = cx.proceso; if (!st) return "Esta evaluación no está asociada a un proceso de seguimiento.";
    const falta = st.verificacion && !st.verificacion.cumple ? `\n\nPara cerrar por cumplimiento le falta:\n${st.verificacion.motivos.map((m) => "- " + m).join("\n")}` : "";
    return `Su proceso **${st.id}** está **${st.estado.toLowerCase()}**. Lleva ${st.usados} de ${st.max} seguimientos.\n\nEl proceso se cierra solo cuando una visita cumple: 90 puntos o más, ningún indicador en 0 y nada pendiente. Si no cumple, se programan hasta ${SEGUIMIENTOS_BASE} seguimientos, que el coordinador puede ampliar a ${MAX_SEGUIMIENTOS} con un motivo.${falta}`;
  }
  if (!inds.length && quiere(/galpon/)) {
    if (!cx.alertas.length) return r.ctx.plan.corrales === 2 ? "No hay alertas por galpón: los dos galpones quedaron parecidos en todos los indicadores." : "En su finca se evaluó un solo galpón o corral.";
    return `Alertas por galpón (un galpón quedó bastante por debajo del promedio de la finca):\n${cx.alertas.map((a) => `- **${a.ind.num} ${a.ind.name}**: galpón ${a.galpon + 1} con ${fmt(a.score)} puntos frente a ${fmt(a.finca)} de la finca.`).join("\n")}\n\nConviene revisar primero ese galpón.`;
  }
  if (inds.length) return inds.map((i) => explicarIndicador(i, cx)).join("\n\n---\n\n") + (RE_SALUD.test(nq) ? "\n\n" + AVISO_VET : "");
  if (RE_SALUD.test(nq)) return AVISO_VET + " Si me dice qué observa en las aves (por ejemplo, diarrea, cojera, ojos con secreción), le explico qué revisa la norma y qué medidas de manejo ayudan.";
  return `No encontré ese tema en su evaluación. Puedo ayudarle con:\n- Qué significa su puntaje.\n- Qué corregir primero.\n- Un indicador en particular (por ejemplo «jadeo», «cama», «bebederos» o «6.2.10»).\n- Su plan de mejora y el proceso de seguimiento.`;
}

/* ---------------- conexión con la IA (API de Mensajes de Claude) ---------------- */
async function preguntarIA(q, cx, historial) {
  const cfg = cfgAsistente();
  const mensajes = historial.filter((m) => !m.error).slice(-12).map((m) => ({ role: m.rol === "u" ? "user" : "assistant", content: m.texto }));
  while (mensajes.length && mensajes[0].role !== "user") mensajes.shift();
  mensajes.push({ role: "user", content: q });
  const cuerpo = { model: cfg.modelo, max_tokens: +cfg.maxTokens || 900, system: typeof promptAsistente === "function" ? promptAsistente(cx, q) : promptSistema(cx), messages: mensajes };
  const cab = { "content-type": "application/json" };
  // El servidor cambia los nombres de fincas por «[finca]» antes de enviarlos; aquí se devuelve el nombre real.
  if (cfg.modo === "gemini") return preguntarServidor(cuerpo).then((t) => t.replace(/\[finca\]/g, cx && cx.f ? cx.f.nombre : "la finca"));
  if (cfg.modo === "claude") {
    if (!cfg.clave) throw new Error("falta la clave de la API");
    Object.assign(cab, { "x-api-key": cfg.clave, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" });
  }
  const url = cfg.modo === "claude" ? ASIS_CFG_DEF.endpoint : cfg.endpoint;
  if (!url) throw new Error("falta la dirección del servidor");
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch(url, { method: "POST", headers: cab, body: JSON.stringify(cuerpo), signal: ctrl.signal });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((datos.error && (datos.error.message || datos.error.type)) || `error ${res.status}`);
    const texto = Array.isArray(datos.content) ? datos.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim() : String(datos.text || datos.respuesta || "").trim();
    if (!texto) throw new Error("respuesta vacía");
    return texto;
  } catch (e) { throw new Error(e.name === "AbortError" ? "la IA tardó demasiado en responder" : e.message || "sin conexión"); }
  finally { clearTimeout(t); }
}

/** Gemini por medio de la API de la plataforma: la clave queda en el servidor y allí se quitan los datos personales. */
async function preguntarServidor(cuerpo) {
  let res;
  try {
    res = await fetch("/api/asistente", { method: "POST", headers: { "content-type": "application/json" }, cache: "no-store",
      body: JSON.stringify({ sistema: cuerpo.system, mensajes: cuerpo.messages, maxTokens: cuerpo.max_tokens }), signal: AbortSignal.timeout(45000) });
  } catch (e) { throw new Error(e.name === "TimeoutError" ? "la IA tardó demasiado en responder" : "sin conexión con el servidor"); }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.error || `error ${res.status}`);
  if (!datos.texto) throw new Error("respuesta vacía");
  return datos.texto;
}

/* ---------------- formato de las respuestas (Markdown mínimo y seguro) ---------------- */
function mdSeguro(t) {
  const lin = esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").split(/\n/);
  let html = "", enLista = false;
  lin.forEach((l) => {
    const li = l.match(/^\s*[-•*]\s+(.*)$/);
    if (li) { if (!enLista) { html += "<ul>"; enLista = true; } html += `<li>${li[1]}</li>`; return; }
    if (enLista) { html += "</ul>"; enLista = false; }
    if (/^\s*-{3,}\s*$/.test(l)) html += "<hr>"; else if (l.trim()) html += `<p>${l}</p>`;
  });
  return html + (enLista ? "</ul>" : "");
}

/* ---------------- vista ---------------- */
function sugerencias(cx) {
  if (!cx.ev) return ["¿Qué revisa la norma del agua?", "¿Cómo evito el jadeo por calor?", "¿Qué documentos me van a pedir?"];
  const s = ["¿Qué significa mi puntaje?", "¿Qué debo corregir primero?"];
  cx.mejorables.slice(0, 2).forEach((x) => s.push(`¿Cómo mejoro «${x.ind.name.split(/[(,]/)[0].trim().toLowerCase()}»?`));
  if (cx.plan.length) s.push("¿Qué dice mi plan de mejora?");
  if (cx.proceso) s.push("¿Cuándo se cierra mi proceso?");
  if (cx.alertas.length) s.push("¿Qué pasa con mis galpones?");
  return s.slice(0, 6);
}
function panelContexto(cx) {
  if (!cx.ev) return `<p class="muted">La finca no tiene evaluaciones registradas todavía. El asistente puede explicarle lo que revisa la norma.</p>`;
  const r = cx.r, ev = cx.ev;
  const li = (x) => `<li><b>${x.ind.num}</b> ${esc(x.ind.name)} · ${fmt(x.score)}</li>`;
  return `<div class="asis-puntaje"><b style="color:${r.nivel[1]}">${fmt(r.total)}</b><span class="etiqueta" style="background:${r.nivel[1]};color:#fff">${r.nivel[0]}</span></div>
    <p class="muted" style="font-size:13px;margin:0 0 8px">${esc(ev.id)} · ${nombreVisita(ev)} · ${fecha(new Date(ev.fecha + "T07:00"))} · ${ev.estado}${r.provisional ? " · provisional" : ""}</p>
    ${cx.hallazgos.length ? `<h4 style="margin:12px 0 0">Indicadores en 0</h4><ul>${cx.hallazgos.slice(0, 6).map(li).join("")}</ul>` : ""}
    ${cx.mejorables.filter((x) => x.score > 0).length ? `<h4 style="margin:12px 0 0">Por mejorar</h4><ul>${cx.mejorables.filter((x) => x.score > 0).slice(0, 5).map(li).join("")}</ul>` : ""}
    ${cx.alertas.length ? `<h4 style="margin:12px 0 0">Alertas por galpón</h4><ul>${cx.alertas.map((a) => `<li>⚠ <b>${a.ind.num}</b> galpón ${a.galpon + 1}: ${fmt(a.score)}</li>`).join("")}</ul>` : ""}
    ${cx.plan.length ? `<h4 style="margin:12px 0 0">Plan de mejora</h4><ul>${cx.plan.map(({ ind, p }) => `<li><b>${ind ? ind.num : ""}</b> ${esc(p.accion || "—")}${p.plazo ? `<br><span class="muted" style="font-size:12px">${textoPlazo(p.plazo)}</span>` : ""}</li>`).join("")}</ul>` : ""}
    ${cx.proceso ? `<p style="font-size:13px;margin:12px 0 0">Proceso ${esc(cx.proceso.id)}: <span class="etiqueta ${COLOR_ESTADO_PROC[cx.proceso.estado]}">${cx.proceso.estado}</span> · ${cx.proceso.usados} de ${cx.proceso.max} seguimientos</p>` : ""}
    <a class="btn btn-sec btn-chico" style="margin-top:12px" href="#/eval/${ev.id}${ev.estado === "Finalizada" ? "/resultado" : ""}">Ver la evaluación</a>`;
}
function vAsistente(evId) {
  const fs = fincasAsistente();
  if (!fs.length) return shell("asistente", "<b>Asistente</b>", `<div class="encabezado"><div><h1>Asistente de bienestar animal</h1></div></div><section class="panel"><p class="muted">No tiene fincas asociadas.</p></section>`);
  // La dirección puede traer una evaluación (#/asistente/EVA-…) o una finca (#/asistente/FIN-…)
  let ev = null, f = null;
  if (evId && evId.startsWith("FIN-")) f = fs.find((x) => x.id === evId) || null;
  else if (evId) { ev = EVALS.find((e) => e.id === evId) || null; if (ev && (!fs.some((x) => x.id === ev.finca) || ev.estado === "Programada")) ev = null; }
  if (ev) f = fs.find((x) => x.id === ev.finca);
  if (!f) f = fs.find((x) => evaluacionPorDefecto(x.id)) || fs[0];
  if (!ev) ev = evaluacionPorDefecto(f.id);
  const cx = contextoAsistente(f, ev), cfg = cfgAsistente(), clave = ev ? ev.id : f.id;
  const conv = (CHAT[clave] = CHAT[clave] || [{ rol: "a", texto: `Hola. Soy el asistente de bienestar animal. ${ev ? `Tengo a la mano su evaluación **${ev.id}** de ${nombreEsp(ev.sp)} (${fmt(cx.r.total)} puntos, nivel ${cx.r.nivel[0]}) y su plan de mejora.` : `Su finca ${f.nombre} todavía no tiene evaluaciones; puedo explicarle lo que revisa la norma.`} Escriba su duda o elija una pregunta.`, fuente: "local" }]);
  const evs = evaluacionesDeFinca(f.id);
  shell("asistente", "<b>Asistente</b>", `<div class="encabezado"><div><h1>Asistente de bienestar animal</h1><p>Resuelve dudas sobre su evaluación, su plan de mejora y el cuidado de sus patos y gansos según la norma del ICA.</p></div></div>
    <div class="asis"><section class="panel asis-ctx"><h3>Lo que consulta el asistente</h3>
      <div class="campo"><label for="asF">Finca</label><select id="asF">${fs.map((x) => `<option value="${x.id}" ${x.id === f.id ? "selected" : ""}>${esc(x.nombre)}</option>`).join("")}</select></div>
      ${evs.length ? `<div class="campo"><label for="asE">Evaluación</label><select id="asE">${evs.map((x) => `<option value="${x.id}" ${ev && x.id === ev.id ? "selected" : ""}>${x.id} · ${nombreVisita(x)} · ${x.estado}</option>`).join("")}</select></div>` : ""}
      ${panelContexto(cx)}</section>
    <section class="panel chat" aria-label="Conversación con el asistente"><div class="chat-cab"><b>Conversación</b><span class="etiqueta ${cfg.modo === "local" ? "e-gris" : "e-info"}" id="asModo">${nombreModo(cfg.modo)}</span></div>
      <div class="chat-msgs" id="msgs" aria-live="polite"></div>
      <div class="chat-sug" id="sug">${sugerencias(cx).map((s) => `<button type="button" data-q="${esc(s)}">${esc(s)}</button>`).join("")}</div>
      <form class="chat-form" id="asForm"><label class="sr" for="asQ">Escriba su pregunta</label><textarea id="asQ" rows="2" maxlength="800" placeholder="Ej.: ¿por qué me calificaron bajo el jadeo?"></textarea><button class="btn btn-primario" id="asEnviar">Enviar</button></form>
      <p class="aviso-asis">Las respuestas son orientativas y se basan en su evaluación y en la norma. No reemplazan la visita del inspector ni la revisión de un médico veterinario.</p></section></div>`);
  const caja = raiz.querySelector("#msgs");
  const pinta = () => { caja.innerHTML = conv.map((m) => `<div class="msg ${m.rol === "u" ? "msg-u" : "msg-a"}">${m.rol === "u" ? `<p>${esc(m.texto)}</p>` : mdSeguro(m.texto)}${m.rol === "a" && m.nota ? `<span class="fuente">${esc(m.nota)}</span>` : ""}</div>`).join(""); caja.scrollTop = caja.scrollHeight; };
  pinta();
  let ocupado = false;
  const enviar = async (q) => {
    q = String(q || "").trim(); if (!q || ocupado) return;
    ocupado = true; raiz.querySelector("#asEnviar").disabled = true;
    const previo = conv.slice(1);
    conv.push({ rol: "u", texto: q }); pinta();
    const c = cfgAsistente();
    if (c.modo === "local") conv.push({ rol: "a", texto: typeof responderAsistente === "function" ? responderAsistente(q, cx) : responderLocal(q, cx), fuente: "local", nota: "Respuesta con los datos de su evaluación y la norma." });
    else if (c.modo !== "gemini" && typeof dentroDeTema === "function" && !dentroDeTema(q, cx)) conv.push({ rol: "a", texto: FUERA_DE_TEMA, fuente: "local" });
    else {
      caja.insertAdjacentHTML("beforeend", '<div class="msg msg-a msg-escribiendo" id="escr">El asistente está escribiendo…</div>'); caja.scrollTop = caja.scrollHeight;
      try { conv.push({ rol: "a", texto: await preguntarIA(q, cx, previo), fuente: "ia", nota: "Respuesta generada con IA a partir de su evaluación. Verifique con el inspector o su veterinario." }); }
      catch (e) { conv.push({ rol: "a", texto: responderLocal(q, cx), fuente: "local", error: true, nota: `No se pudo conectar con la IA (${e.message}). Respondí con los datos de su evaluación.` }); }
    }
    log(`Consulta al asistente${ev ? ` sobre ${ev.id}` : ` (${f.nombre})`}`);
    ocupado = false; const b = raiz.querySelector("#asEnviar"); if (b) b.disabled = false; pinta();
  };
  const ta = raiz.querySelector("#asQ");
  raiz.querySelector("#asForm").onsubmit = (e) => { e.preventDefault(); const q = ta.value; ta.value = ""; enviar(q); };
  ta.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); raiz.querySelector("#asForm").requestSubmit(); } };
  raiz.querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => enviar(b.dataset.q)));
  raiz.querySelector("#asF").onchange = (e) => (location.hash = `#/asistente/${e.target.value}`);
  const se = raiz.querySelector("#asE"); if (se) se.onchange = () => (location.hash = `#/asistente/${se.value}`);
}

/* ---------------- configuración en Parametrización (administrador) ---------------- */
function panelConfigAsistente() {
  const c = cfgAsistente(), srv = iaServidor();
  if (srv) return `<section class="panel" id="cfgAsis"><h3>Asistente de la norma (IA)</h3>
    <p style="margin-top:0"><span class="etiqueta e-ok">Activo</span> El asistente responde con <b>Gemini</b> (modelo <code>${esc(srv.modelo)}</code>) desde el servidor de la plataforma, para todos los perfiles.</p>
    <p class="muted">La clave está en el archivo <code>.env</code> del servidor (GEMINI_API_KEY) y nunca llega al navegador. Antes de enviar cada pregunta, el servidor quita nombres de personas y fincas, documentos, correos y teléfonos. Para cambiar el modelo, edite GEMINI_MODELO en el <code>.env</code> y reinicie la API. Si Gemini no responde, el asistente contesta en modo local con el texto de la norma.</p>
    <div class="acciones" style="justify-content:flex-start"><button class="btn btn-sec" id="cfProbar">Probar conexión</button></div>
    <p class="muted" id="cfRes" style="font-size:13px"></p></section>`;
  return `<section class="panel" id="cfgAsis"><h3>Asistente de la norma (IA)</h3>
    <p class="muted" style="margin-top:0">El asistente está en todos los perfiles y responde solo sobre la norma del ICA y las evaluaciones. En modo local no usa internet. Con IA, envía la pregunta y el resumen de la evaluación (sin documento, correo ni teléfono) a la API de Mensajes de Claude.</p>
    <div class="fila"><div class="campo"><label for="cfMod">Modo</label><select id="cfMod">
      <option value="local" ${c.modo === "local" ? "selected" : ""}>Local, sin conexión</option>
      <option value="proxy" ${c.modo === "proxy" ? "selected" : ""}>IA por servidor intermedio (recomendado en producción)</option>
      <option value="claude" ${c.modo === "claude" ? "selected" : ""}>IA con conexión directa a Claude (solo pruebas)</option></select></div>
    <div class="campo"><label for="cfMdl">Modelo</label><select id="cfMdl">${ASIS_MODELOS.map(([k, n]) => `<option value="${k}" ${c.modelo === k ? "selected" : ""}>${n}</option>`).join("")}</select></div></div>
    <div class="campo" id="cfEndC"><label for="cfEnd">Dirección del servidor intermedio</label><input id="cfEnd" type="url" placeholder="https://servidor-del-proyecto/api/asistente" value="${esc(c.modo === "proxy" ? c.endpoint : c.endpoint === ASIS_CFG_DEF.endpoint ? "" : c.endpoint)}">
      <span class="ayuda-campo">El servidor recibe el mismo cuerpo de la API de Mensajes y agrega la clave. Así la clave no queda en el navegador.</span></div>
    <div class="campo" id="cfClvC"><label for="cfClv">Clave de la API de Claude</label><input id="cfClv" type="password" autocomplete="off" placeholder="${c.clave ? "Guardada · escriba otra para cambiarla" : "sk-ant-…"}">
      <span class="ayuda-campo">⚠ Solo para pruebas del prototipo: la clave se guarda únicamente en este navegador y cualquiera con acceso a él podría verla. En producción use el servidor intermedio. La clave se crea en la consola de Claude (platform.claude.com).</span></div>
    <span class="error-campo" id="cfErr"></span>
    <div class="acciones" style="justify-content:flex-start"><button class="btn btn-primario" id="cfGuardar">Guardar</button><button class="btn btn-sec" id="cfProbar">Probar conexión</button>${c.clave ? '<button class="btn btn-sec" id="cfBorrar">Borrar clave</button>' : ""}</div>
    <p class="muted" id="cfRes" style="font-size:13px"></p></section>`;
}
function enlazarConfigAsistente(rerender) {
  const q = (s) => raiz.querySelector(s); if (!q("#cfgAsis")) return;
  if (!q("#cfMod")) {                                          // Gemini configurado en el servidor
    q("#cfProbar").onclick = async () => { q("#cfRes").textContent = "Probando…";
      try { const t = await preguntarIA("Responda solo: conexión correcta.", { f: null, especies: ["pato", "ganso"] }, []); q("#cfRes").textContent = "✔ Conexión correcta. Respuesta: " + t.slice(0, 120); }
      catch (e) { q("#cfRes").textContent = "✖ No se pudo conectar: " + e.message; } };
    return;
  }
  const vis = () => { const m = q("#cfMod").value; q("#cfEndC").style.display = m === "proxy" ? "" : "none"; q("#cfClvC").style.display = m === "claude" ? "" : "none"; q("#cfMdl").disabled = m === "local"; };
  vis(); q("#cfMod").onchange = vis;
  const leer = () => {
    const c = cfgAsistente(), m = q("#cfMod").value, nueva = q("#cfClv").value.trim(), end = q("#cfEnd").value.trim();
    if (m === "proxy" && !/^https:\/\/[^\s]+$/.test(end)) return { error: "Escriba la dirección https del servidor intermedio." };
    if (m === "claude" && !nueva && !c.clave) return { error: "Escriba la clave de la API." };
    if (m === "claude" && nueva && !/^sk-ant-[\w-]{20,}$/.test(nueva)) return { error: "La clave no tiene el formato esperado (empieza por sk-ant-)." };
    return { cfg: { modo: m, modelo: q("#cfMdl").value, endpoint: m === "proxy" ? end : ASIS_CFG_DEF.endpoint, clave: nueva || c.clave, maxTokens: c.maxTokens } };
  };
  q("#cfGuardar").onclick = () => { const l = leer(); q("#cfErr").textContent = l.error || ""; if (l.error) return;
    store.set("asistente", l.cfg); log(`Configuración del asistente: ${nombreModo(l.cfg.modo)}${l.cfg.modo !== "local" ? ` · ${l.cfg.modelo}` : ""}`); toast("Configuración del asistente guardada."); rerender(); };
  q("#cfProbar").onclick = async () => { const l = leer(); q("#cfErr").textContent = l.error || ""; if (l.error) return;
    if (l.cfg.modo === "local") { q("#cfRes").textContent = "Modo local: no necesita conexión."; return; }
    const antes = store.get("asistente", {}); store.set("asistente", l.cfg); q("#cfRes").textContent = "Probando…";
    try { const t = await preguntarIA("Responda solo: conexión correcta.", { f: { nombre: "Prueba", mpio: "—", depto: "—", especies: [] }, especies: [] }, []); q("#cfRes").textContent = "✔ Conexión correcta. Respuesta: " + t.slice(0, 120); }
    catch (e) { q("#cfRes").textContent = "✖ No se pudo conectar: " + e.message + ". Revise la clave, la dirección o la red (el navegador puede bloquear la conexión directa)."; }
    finally { store.set("asistente", antes); } };
  const b = q("#cfBorrar"); if (b) b.onclick = () => { const c = cfgAsistente(); c.clave = ""; if (c.modo === "claude") c.modo = "local"; store.set("asistente", c); log("Se borró la clave del asistente"); toast("Clave borrada."); rerender(); };
}
