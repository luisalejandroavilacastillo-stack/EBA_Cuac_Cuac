// Genera src/motor/indicadores.ts a partir de los datos de la norma del prototipo (una sola fuente de verdad mientras conviven).
// Uso (desde la raíz): node packages/norma/herramientas/generar_indicadores.cjs
const fs = require('fs'), vm = require('vm'), path = require('path');
const raiz = path.join(__dirname, '..', '..', '..');
const src = fs.readFileSync(path.join(raiz, 'apps/prototipo/js/datos/norma.js'), 'utf8');
const c = {}; vm.createContext(c); vm.runInContext(src + ';this.N=NORMA;', c);
const out = '/**\n * Indicadores de la norma: Metodología para evaluar el bienestar animal en patos y gansos, ICA v1.0 (2024).\n * GENERADO desde apps/prototipo/js/datos/norma.js (herramienta: packages/norma/herramientas/generar_indicadores.cjs). No editar a mano.\n */\nimport type { Indicador } from \'./modelo.js\';\n\nexport const INDICADORES: readonly Indicador[] = ' + JSON.stringify(c.N, null, 1) + ' as unknown as Indicador[];\n';
fs.writeFileSync(path.join(__dirname, '..', 'src/motor/indicadores.ts'), out);
console.log(`${c.N.length} indicadores`);

// Textos de la norma (descripción de cada numeral), páginas y erratas/interpretaciones del equipo.
const txt = fs.readFileSync(path.join(raiz, 'apps/prototipo/js/datos/norma_textos.js'), 'utf8');
const pag = fs.readFileSync(path.join(raiz, 'apps/prototipo/js/datos/norma_paginas.js'), 'utf8');
const ayu = fs.readFileSync(path.join(raiz, 'apps/prototipo/js/vistas/ayuda.js'), 'utf8');
const errSrc = ayu.slice(ayu.indexOf('const ERRATAS'), ayu.indexOf('];', ayu.indexOf('const ERRATAS')) + 2);
const c2 = {}; vm.createContext(c2); vm.runInContext(txt + pag + errSrc + ';this.D=DESC_NORMA;this.P=PAG_NORMA;this.E=ERRATAS;', c2);
fs.writeFileSync(path.join(__dirname, '..', 'src/motor/textos.ts'), '/**\n * Textos de la Metodología ICA v1.0 (2024): descripción de cada numeral, página de cada numeral o tabla, y\n * aclaraciones del equipo donde la norma es ambigua o tiene erratas. GENERADO desde el prototipo; no editar a mano.\n */\n'
  + 'export const DESC_NORMA: Readonly<Record<string, string>> = ' + JSON.stringify(c2.D, null, 1) + ';\n\n'
  + 'export const PAG_NORMA: Readonly<Record<string, number>> = ' + JSON.stringify(c2.P) + ';\n\n'
  + '/** [sección, lo que dice la norma, decisión del equipo] */\nexport const ERRATAS: readonly (readonly [string, string, string])[] = ' + JSON.stringify(c2.E, null, 1) + ';\n');
console.log(`${Object.keys(c2.D).length} descripciones, ${c2.E.length} aclaraciones`);
