// @ts-nocheck — traducción literal del motor del asistente del prototipo v0.25 (js/vistas/asistente.js y asistente_norma.js).
// Se conserva el código tal cual para que responda igual; la prueba pruebas/prueba_asistente_m6.py compara las respuestas
// con las del prototipo. Las dependencias (datos, cálculo y textos de la norma) llegan en «env».
/**
 * Motor del asistente de la norma: arma el contexto de una evaluación, responde sin conexión (modo local),
 * prepara las instrucciones para la IA y da formato seguro a las respuestas (Markdown mínimo, sin HTML del usuario).
 * Nunca incluye documento, correo ni teléfono de las personas.
 */
export interface EntornoAsistente {
  NORMA; IND; EVALS; FINCAS; rol: string; yoNombre: string;
  resultado; lista; aplica; calcular; alertasGalpon; estadoProceso; cambiosFrenteAnterior; nombreVisita; poblacion; nombreSp;
  fecha; fmt; esc; DESC_NORMA; PAG_NORMA; MAX_SEGUIMIENTOS; SEGUIMIENTOS_BASE; COLOR_ESTADO_PROC;
}
import type { Especie, Evaluacion, Finca } from '@eba/norma';
/** Contexto de la conversación (finca, evaluación, resultado, hallazgos, plan…), tal como lo arma el prototipo. */
export type Cx = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export interface MotorAsistente {
  contextoAsistente(f: Finca, ev: Evaluacion | null): Cx;
  evaluacionesDeFinca(fid: string): Evaluacion[];
  fincasAsistente(): Finca[];
  evaluacionPorDefecto(fid: string): Evaluacion | null;
  responderLocal(q: string, cx: Cx): string;
  responderAsistente(q: string, cx: Cx): string;
  respuestaPendientes(q: string, cx: Cx): string;
  contextoDePregunta(q: string, cx: Cx): Cx;
  dentroDeTema(q: string, cx: Cx): boolean;
  promptAsistente(cx: Cx, q: string): string;
  promptSistema(cx: Cx): string;
  mdSeguro(t: string): string;
  sugerencias(cx: Cx): string[];
  sugerenciasRol(cx: Cx): string[];
  bienvenida(cx: Cx): string;
  nombreEsp(sp: Especie): string;
  textoPlazo(iso: string): string;
  esTecnico(): boolean;
  FUERA_DE_TEMA: string;
  NOMBRE_ROL_ASIS: Record<string, string>;
}

export function crearMotorAsistente(env: EntornoAsistente): MotorAsistente {
  const { NORMA, IND, EVALS, FINCAS, resultado, lista, aplica, calcular, alertasGalpon, estadoProceso, cambiosFrenteAnterior, nombreVisita, poblacion, nombreSp,
    fecha, fmt, esc, DESC_NORMA, PAG_NORMA, MAX_SEGUIMIENTOS, SEGUIMIENTOS_BASE, COLOR_ESTADO_PROC } = env;
  const SES = { rol: env.rol };
  const yo = () => ({ nombre: env.yoNombre });
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
  const RE_DOMINIO = /\b(pato|ganso|aves?\b|bienestar|ica\b|norma|metodolog|indicador|galpon|corral|finca|granja|predio|lote|evalu|pendiente|falta|inspecc|visita|puntaje|calific|escala|nivel|plan de mejora|mejorar|corregir|muestra|punto|recurso|animal|tabla|numeral|documento|seguimiento|productor|inspector|cama|agua|bebeder|comeder|nidal|jadeo|plumaje|pico|diarrea|cojo|herida|mortalidad|densidad|alimento|veterinari|sacrificio|vacun|enferm|medicament)/;
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
    const pend = respuestaPendientes(q, cx); if (pend) return pend;
    if (esTecnico()) return responderTecnico(q, cx);
    if (!dentroDeTema(q, cx)) return FUERA_DE_TEMA;
    return responderLocal(q, cx);
  }
  /** «¿Qué falta por evaluar?»: indicadores sin calificar de la evaluación en contexto. */
  function respuestaPendientes(q, cx) {
    if (!cx.ev || !/(falta|pendiente|sin calificar|me queda|queda por|por evaluar|por calificar)/.test(sinTildes(q))) return "";
    const ev = cx.ev, pend = cx.pendientes || [];
    if (ev.estado === "Finalizada") return `La evaluación **${ev.id}** de ${cx.f.nombre} (${nombreSp(ev.sp).toLowerCase()}) ya está finalizada: no tiene indicadores pendientes.`;
    if (!pend.length) return `En la evaluación **${ev.id}** de ${cx.f.nombre} (${nombreSp(ev.sp).toLowerCase()}) ya están calificados todos los indicadores. Falta el **cierre**: revisar el plan de mejora, las firmas y finalizar.`;
    return `En la evaluación **${ev.id}** de ${cx.f.nombre} (${nombreSp(ev.sp).toLowerCase()}, ${ev.estado.toLowerCase()}) faltan **${pend.length} indicador${pend.length === 1 ? "" : "es"}** por calificar:\n` +
      pend.slice(0, 15).map((x) => `- ${x.ind.num} ${x.ind.name}`).join("\n") + (pend.length > 15 ? `\n- … y ${pend.length - 15} más` : "") +
      "\nPuede ir directo con el botón «Siguiente pendiente» de la evaluación.";
  }
  /** Si la pregunta nombra una finca (o su código, o el de una evaluación), el asistente responde con los datos de esa finca. */
  function contextoDePregunta(q, cx) {
    const nq = sinTildes(q), fs = fincasAsistente();
    const ev0 = EVALS.find((e) => nq.includes(sinTildes(e.id)) && fs.some((f) => f.id === e.finca)) || null;
    const nombre = (x) => sinTildes(x.nombre).replace(/^(granja|finca|hacienda|lote|predio)\s+/, "");
    const f = ev0 ? FINCAS.find((x) => x.id === ev0.finca)
      : fs.find((x) => nq.includes(sinTildes(x.id)) || (sinTildes(x.nombre).length >= 4 && nq.includes(sinTildes(x.nombre)))) || fs.find((x) => nombre(x).length >= 4 && nq.includes(nombre(x)));
    if (!f || (cx.f && cx.f.id === f.id && !ev0)) return cx;
    const evs = evaluacionesDeFinca(f.id);
    const ev = ev0 || evs.find((e) => e.estado === "En proceso") || evs.find((e) => e.estado === "Programada") || evaluacionPorDefecto(f.id);
    const nuevo = contextoAsistente(f, ev); nuevo.foco = null; nuevo.mencionada = true;
    return nuevo;
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

  return { contextoAsistente, evaluacionesDeFinca, fincasAsistente, evaluacionPorDefecto, responderLocal, responderAsistente, respuestaPendientes,
    contextoDePregunta, dentroDeTema, promptAsistente, promptSistema, mdSeguro, sugerencias, sugerenciasRol, bienvenida,
    nombreEsp, textoPlazo, esTecnico, FUERA_DE_TEMA, NOMBRE_ROL_ASIS };
}
