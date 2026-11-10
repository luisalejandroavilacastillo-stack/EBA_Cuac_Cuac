/* Pruebas unitarias del motor de cálculo frente a las tablas de la norma (sin navegador).
   Uso:  node pruebas/prueba_calculo.js
   Carga los mismos archivos del prototipo en un contexto aislado y verifica umbrales, muestreo, densidad,
   condición corporal, reglas por condiciones, documentos, ponderación (Tabla 1), redondeo y clasificación (Tabla 2). */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = path.join(__dirname, "..", "src", "js");
const ctx = vm.createContext({ console, document: { getElementById: () => ({}) }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, Object, JSON, Math, Number, String, Array });
["datos/norma.js", "datos/norma_textos.js", "nucleo/utilidades.js", "datos/ejemplo.js", "norma/calculo.js"].forEach((f) =>
  vm.runInContext(fs.readFileSync(path.join(SRC, f), "utf8").replace(/^const (\w+) =/gm, "var $1 =").replace(/^let (\w+) =/gm, "var $1 =").replace(/^function (\w+)/gm, "var $1 = function $1"), ctx, { filename: f }));
const R = (code) => vm.runInContext(code, ctx);

let ok = 0, mal = 0;
const igual = (nombre, obtenido, esperado) => {
  const b = JSON.stringify(obtenido) === JSON.stringify(esperado);
  b ? ok++ : mal++;
  if (!b) console.log(`  FALLA ${nombre}: ${JSON.stringify(obtenido)} (esperado ${JSON.stringify(esperado)})`);
};
const regla = (r, p, x) => R(`RULES.${r}(${p}, ${!!x})`);
const sec = (t) => console.log("· " + t);

sec("Datos de la norma");
igual("58 indicadores", R("NORMA.length"), 58);
igual("33 de patos", R("NORMA.filter(i=>i.sp==='pato').length"), 33);
igual("25 de gansos", R("NORMA.filter(i=>i.sp==='ganso').length"), 25);
igual("Descripción de la norma para los 58", R("NORMA.every(i=>!!DESC_NORMA[i.num])"), true);
igual("Tabla 9: el peor nivel de 6.1.5 vale 0", R("IND.PR05.escala.map(e=>e[0])"), [100, 55, 0]);

sec("Tramo y Tabla 1");
igual("199 aves = traspatio", R("tramo(199)"), "traspatio");
igual("200 aves = comercial", R("tramo(200)"), "comercial");
igual("Pesos comerciales suman 1", R("Math.round((PESOS.comercial.MBA+PESOS.comercial.MBR+PESOS.comercial.MBG)*1000)"), 1000);
igual("Pesos de traspatio suman 1", R("Math.round((PESOS.traspatio.MBA+PESOS.traspatio.MBR)*1000)"), 1000);

sec("Tabla 2 y redondeo (RN-121)");
[[90, "Excelente"], [89.9, "Alto"], [75, "Alto"], [74.9, "Medio"], [50, "Medio"], [49.9, "Bajo"], [0, "Bajo"]].forEach(([v, n]) => igual(`${v} → ${n}`, R(`clasificar(${v})[0]`), n));
igual("89,95 redondea a 90", R("redondear1(89.95)"), 90);
igual("0,6×88,25 + 0,25×93 + 0,15×91,5 = 89,925 → 89,9", R("redondear1(0.6*88.25+0.25*93+0.15*91.5)"), 89.9);
igual("74,95 redondea a 75", R("redondear1(74.95)"), 75);
igual("Traspatio 0,7×80,5 + 0,3×62 = 74,95 → 75 (Alto; antes 74,9 Medio)", R("redondear1(0.7*80.5+0.3*62)"), 75);

sec("Muestreo (5.6 y Tabla 3)");
igual("Menos de 200 con corral: 1 × 3 × 5 = 15", R("(p=>[p.corrales,p.puntosCorral,p.avesPunto,p.aves])(planMuestreo(150,true))"), [1, 3, 5, 15]);
igual("200 o más: 2 × 5 × 5 = 50", R("(p=>[p.corrales,p.puntos,p.avesPunto,p.aves])(planMuestreo(812,true))"), [2, 10, 5, 50]);
igual("25 aves por galpón", R("planMuestreo(812,true).avesGalpon"), [25, 25]);
igual("Exactamente 200 aves: 50 aves", R("planMuestreo(200,true).aves"), 50);
igual("Reparto de 10 patos en 3 puntos: 4, 3 y 3", R("planMuestreo(100,true,10).reparto"), [4, 3, 3]);
igual("Ave 27 está en el galpón 2, punto 1, ave 2", R("(u=>[u.galpon,u.punto,u.ave])(ubicarAve(planMuestreo(812,true),26))"), [1, 5, 1]);
igual("Unidades de aves del punto 3", R("unidadesDePunto(IND.PA03,{plan:planMuestreo(812,true),tramo:'comercial'},2)"), [10, 11, 12, 13, 14]);
igual("199 usa la fila de menos de 200 (mismo corte que el tramo)", R("planMuestreo(199,true).corrales"), 1);
igual("Sin corral por defecto 3 × 3", R("(p=>[p.puntos,p.avesPunto,p.aves])(planMuestreo(40,false))"), [3, 3, 9]);
igual("Sin corral respeta límites 1–3 y 2–5", R("(p=>[p.puntos,p.avesPunto])(planMuestreo(40,false,null,{puntos:7,avesPunto:9}))"), [3, 5]);
igual("La muestra no supera las aves de la especie", R("planMuestreo(250,true,6).aves"), 6);
igual("Traspatio con 4 patos: se evalúan los 4", R("planMuestreo(4,true,4).aves"), 4);
igual("Cada punto tiene a lo sumo 5 aves", R("planMuestreo(812,true,812).reparto.every(x=>x===5)"), true);

sec("Reglas por porcentaje");
const casos = {
  PR03: [[100, 100], [80, 100], [79.9, 55], [40, 55], [39, 0]],
  PA01: [[0, 100], [40, 100], [40.1, 55], [60, 55], [60.1, 0]],
  PA02: [[40, 100], [41, 55], [59.9, 55], [60, 0]],
  PA10: [[6.19, 100], [11.99, 100], [12, 55], [13.9, 55], [14, 0], [20, 0]],
  GR02: [[100, 100], [80, 55], [79, 0]],
  GR03: [[100, 100], [85, 55], [80, 55], [70, 20], [60, 20], [59, 0]],
  GR05: [[0, 100], [10, 55], [20, 20], [40, 20], [41, 0]],
  GA02: [[100, 100], [60, 55], [59, 0]],
  GA06: [[0, 100], [2.9, 100], [3, 55], [6, 55], [7, 20], [8, 20], [9, 0]],
  GA08: [[4, 100], [5, 55], [8, 55], [9, 20], [10, 20], [11, 0]],
  GA10: [[100, 100], [70, 100], [69, 55], [50, 55], [49, 0]]
};
Object.entries(casos).forEach(([r, l]) => l.forEach(([p, e]) => igual(`${r} ${p} %`, regla(r, p), e)));
// reglas con condición adicional
[[0, false, 100], [10, true, 55], [10, false, 20], [18, true, 20], [18, false, 20], [25, true, 20], [25, false, 0]].forEach(([p, x, e]) => igual(`GA01 ${p} % trat=${x}`, regla("GA01", p, x), e));
[[0, false, 100], [15, true, 55], [15, false, 20], [30, true, 20], [30, false, 0]].forEach(([p, x, e]) => igual(`GA03 ${p} % trat=${x}`, regla("GA03", p, x), e));
[[0, false, 100], [10, true, 55], [10, false, 20], [15, true, 20], [15, false, 0]].forEach(([p, x, e]) => igual(`GA04 ${p} % trat=${x}`, regla("GA04", p, x), e));
[[0, false, 100], [0, true, 100], [5, true, 55], [5, false, 20], [7, false, 20], [10, false, 0]].forEach(([p, x, e]) => igual(`GA05 ${p} % func=${x}`, regla("GA05", p, x), e));
[[90, false, 100], [60, true, 55], [60, false, 0], [30, true, 20], [10, true, 0]].forEach(([p, x, e]) => igual(`GG05 ${p} % conoc=${x}`, regla("GG05", p, x), e));
[[2, true, 100], [3, false, 55], [4, true, 20], [6, true, 0]].forEach(([p, x, e]) => igual(`GG07 ${p} % reg=${x}`, regla("GG07", p, x), e));

sec("Reglas por condiciones");
igual("6.1.1 todo", R("AUTO.PR01({0:1,1:1,2:1,3:1})"), 100);
igual("6.1.1 sin equipamiento", R("AUTO.PR01({0:1,1:0,2:1,3:1})"), 55);
igual("6.1.1 sin alojamiento", R("AUTO.PR01({0:0})"), 0);
igual("6.1.4 exceso 0 % sin competencia", R("AUTO.PR04({0:600,1:30,2:20,3:false})"), 100);
igual("6.1.4 exceso 35 % sin competencia", R("AUTO.PR04({0:812,1:30,2:20,3:false})"), 55);
igual("6.1.4 exceso 35 % con competencia", R("AUTO.PR04({0:812,1:30,2:20,3:true})"), 0);
igual("6.1.4 sin bebederos", R("AUTO.PR04({0:50,1:0,2:20,3:false})"), 0);
igual("6.1.6 comercial completo", R("AUTO.PR06({0:1,1:1,2:1,3:1},'comercial')"), 100);
igual("6.1.6 comercial sin protocolo", R("AUTO.PR06({0:1,1:1,2:1,3:0},'comercial')"), 55);
igual("6.1.6 comercial sin registros", R("AUTO.PR06({0:1,1:0,2:1,3:1},'comercial')"), 0);
igual("6.1.6 traspatio con agua limpia (sin registros)", R("AUTO.PR06({0:0,1:0,2:1},'traspatio')"), 100);
igual("6.1.6 traspatio con agua sucia", R("AUTO.PR06({0:1,1:1,2:0},'traspatio')"), 0);
igual("6.1.9 sin POE en comercial", R("AUTO.PR09({0:1,1:1,2:0},'comercial')"), 55);
igual("6.1.9 traspatio funcional", R("AUTO.PR09({0:1,1:1,2:0},'traspatio')"), 100);
igual("6.1.12 completo", R("AUTO.PR12({0:1,1:15,2:1,3:1,4:0})"), 100);
igual("6.1.12 menos de 10 cm", R("AUTO.PR12({0:1,1:8,2:1,3:1,4:0})"), 0);
igual("6.1.12 con encharcamiento", R("AUTO.PR12({0:1,1:12,2:1,3:1,4:1})"), 55);

sec("Densidad (6.1.11)");
igual("Máximo para 2,5 kg", R("densidadMaxima(2.5).max"), 20);
igual("Máximo para 2,2 kg (interpolado)", R("Math.round(densidadMaxima(2.2).max*100)/100"), 18.8);
igual("Máximo para 1 kg", R("densidadMaxima(1).max"), 17);
igual("Máximo para 6 kg", R("densidadMaxima(6).max"), 24);
const dens = (a, w, s) => R(`calcular(IND.PR11, {aves:${a},peso:${w},area:${s}}, {}).score`);
igual("820 × 2,2 ÷ 100 = 18,04 → 100", dens(820, 2.2, 100), 100);
igual("1,74 kg y 17,3 kg/m² → 100 (antes 0 por redondear a 1,5 kg)", dens(1000, 1.74, 100.6), 100);
igual("820 × 2,5 ÷ 100 = 20,5 → 0", dens(820, 2.5, 100), 0);

sec("Condición corporal (Tablas 27 y 28)");
igual("Carne 1..5", R("[1,2,3,4,5].map(s=>ccNivel(s,'Carne'))"), [0, 55, 100, 100, 0]);
igual("Huevo 1..5", R("[1,2,3,4,5].map(s=>ccNivel(s,'Huevo'))"), [0, 100, 100, 55, 0]);

sec("Indicadores por unidad y por porcentaje");
igual("Promedio de 4×100 + 1×55", R("calcular(IND.PA03,{units:[100,100,100,100,55]},{plan:{aves:5,puntos:3},tramo:'traspatio',ap:{},e:{}}).score"), 91);
igual("6.1.3 sin bebederos = 0", R("calcular(IND.PR03,{total:'0',part:''},{}).score"), 0);
igual("6.1.3 17 de 20", R("calcular(IND.PR03,{total:20,part:17},{}).score"), 100);
igual("Parte mayor que el total no califica", R("calcular(IND.PA01,{total:10,part:12},{}).done"), false);
igual("Traspatio: bebederos = los del predio", R("nUnidades(IND.PR05,{plan:planMuestreo(30,true,30),tramo:'traspatio',ap:{bebederos:4}})"), 4);
igual("Comercial: 2 bebederos por punto", R("nUnidades(IND.PR05,{plan:planMuestreo(812,true,812),tramo:'comercial',ap:{}})"), 20);

sec("Promedio por galpón (2 galpones)");
R("var CTX2 = { plan: planMuestreo(812,true,812), tramo: 'comercial', ap: {}, e: { proposito: 'Carne' } }");
igual("Podo dermatitis: galpón 1 = 100, galpón 2 = 75,4, finca = 87,7", R(`(() => { const u = Array(25).fill(100).concat(Array(15).fill(100), Array(7).fill(55), Array(3).fill(0));
  const c = calcular(IND.PA04, { units: u }, CTX2); return [c.porGalpon.map(v => Math.round(v * 10) / 10), Math.round(c.score * 10) / 10]; })()`), [[100, 75.4], 87.7]);
igual("Jadeo: (2 + 74) ÷ 240 = 31,7 % → 100; galpón 2 = 61,7 % → 0", R(`(() => { const c = calcular(IND.PA01, { total: 240, part: 76, g: [{ total: 120, part: 2 }, { total: 120, part: 74 }] }, CTX2); return [c.score, c.porGalpon]; })()`), [100, [100, 0]]);
igual("Pocetas califica el predio en un solo bloque", R(`calcular(IND.PR12, { rev: true, aux: { 0: 1, 1: 15, 2: 1, 3: 0 } }, CTX2).score`), 55);
sec("Recursos más cercanos al punto");
igual("Comederos: una calificación por galpón", R("nUnidades(IND.PR07, CTX2)"), 2);
igual("Cama por punto: 10 muestras, una en 55", R(`calcular(IND.PR02, { porPunto: Array.from({ length: 10 }, (_, p) => ({ v: [p === 3 ? 55 : 100], mismo: null, nohay: false })) }, CTX2).score`), 95.5);
igual("Bebedero compartido no se cuenta dos veces", R(`(() => { const pp = Array.from({ length: 10 }, () => ({ v: [100], mismo: null, nohay: false })); pp[1] = { v: [], mismo: 0, nohay: false }; pp[0].v = [55];
  const c = calcular(IND.PR05, { porPunto: pp }, CTX2); return [c.done, Math.round(c.score * 10) / 10]; })()`), [true, 95]);
igual("Bebedero adicional cercano entra al promedio", R(`(() => { const pp = Array.from({ length: 10 }, () => ({ v: [100], mismo: null, nohay: false })); pp[2].v = [100, 0];
  return Math.round(calcular(IND.PR05, { porPunto: pp }, CTX2).score * 10) / 10; })()`), 90.9);
igual("No hay nidales en el galpón 2 = 0 por punto", R(`(() => { const pp = Array.from({ length: 10 }, (_, p) => (p < 5 ? { v: [100], mismo: null, nohay: false } : { v: [], mismo: null, nohay: true }));
  const c = calcular(IND.PR10, { porPunto: pp }, CTX2); return [c.score, c.porGalpon]; })()`), [50, [100, 0]]);
igual("Punto sin registrar deja el indicador pendiente", R(`calcular(IND.PR02, { porPunto: [{ v: [100] }] }, CTX2).done`), false);
igual("Registro anterior por casillas se convierte por punto", R(`calcular(IND.PR05, { units: Array(20).fill(100) }, CTX2).score`), 100);
igual("Sin datos por galpón se usan las condiciones comunes", R(`calcular(IND.PR01, { rev: true, aux: { 0: 1, 1: 1, 2: 1, 3: 1 } }, CTX2).score`), 100);
igual("Alerta: banda de nivel", R("[bandaNivel(95), bandaNivel(75), bandaNivel(30), bandaNivel(0)]"), [3, 2, 1, 0]);

sec("Documentos y BPUMV");
igual("Documento válido con requisitos", R("calcular(IND.PG04,{estado:'Válido',legible:1,sinCorr:1,firmado:1,contenido:1,matricula:1},{}).score"), 100);
igual("Documento sin matrícula", R("calcular(IND.PG04,{estado:'Válido',legible:1,sinCorr:1,firmado:1,contenido:1},{}).score"), 0);
igual("Documento pendiente cuenta 0", R("calcular(IND.PG01,{estado:'Pendiente'},{}).score"), 0);
igual("BPUMV patos mínimo = 55", R("calcular(IND.PG10,{revisado:1,checks:[1,0,1,1,0,0,0,1,1]},{}).score"), 55);
igual("BPUMV gansos incompleto = 0", R("calcular(IND.GG06,{revisado:1,checks:[1,0,1,1,0,0,0,1,1]},{}).score"), 0);

console.log(`\n${ok} pruebas correctas, ${mal} fallas`);
process.exit(mal ? 1 : 0);
