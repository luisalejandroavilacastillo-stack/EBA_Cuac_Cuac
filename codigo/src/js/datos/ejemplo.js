/* EBA Patos y Gansos · ICA — js/datos/ejemplo.js
   Datos de ejemplo (usuarios, permisos por rol, fincas) y persistencia en el navegador. */
"use strict";

/* ---------------- datos de ejemplo ---------------- */
const USUARIOS = {
  inspector: { nombre: "Camilo Andrés Peña", rol: "Inspector ICA", correo: "c.pena@ica.gov.co", doc: "1.110.456.789", ini: "CP" },
  coordinador: { nombre: "Luz Marina Cárdenas", rol: "Coordinadora ICA", correo: "l.cardenas@ica.gov.co", doc: "40.023.118", ini: "LC" },
  productor: { nombre: "Hernán Darío Mejía", rol: "Productor", correo: "h.mejia@correo.co", doc: "91.234.567", ini: "HM" },
  admin: { nombre: "Andrés Felipe Rojas", rol: "Administrador", correo: "a.rojas@ica.gov.co", doc: "80.765.432", ini: "AR" }
};
const PERMISOS = {
  inspector: ["inicio", "fincas", "evaluaciones", "reportes", "asistente", "ayuda", "cuenta"],
  coordinador: ["inicio", "fincas", "evaluaciones", "reportes", "asistente", "ayuda", "cuenta"],
  productor: ["inicio", "fincas", "evaluaciones", "asistente", "ayuda", "cuenta"],
  /* El administrador ve y opera todos los módulos (RN-140: «administrador (todo)»). */
  admin: ["inicio", "fincas", "evaluaciones", "reportes", "asistente", "usuarios", "parametros", "bitacora", "ayuda", "cuenta"]
};
const FINCAS0 = [
  { id: "FIN-2026-00417", nombre: "Granja La Esperanza", productor: "Hernán Darío Mejía", titular: { nombre: "Hernán Darío Mejía", tipoDoc: "CC", doc: "91234567", correo: "h.mejia@correo.co", tel: "3154827710", autoriza: true }, depto: "Santander", mpio: "Lebrija", vereda: "La Puente", estado: "ACTIVA",
    especies: [{ sp: "pato", proposito: "Carne", conCorral: true, permanencia: true, cama: true, bebedero: "Automatizado",
      inventario: [{ cat: "Engorde", n: 820, edad: 6, peso: 2.5 }, { cat: "Reproductores", n: 27, edad: 40, peso: 3.1 }] }], area: 620 },
  { id: "FIN-2026-00431", nombre: "Granja Santa Clara", productor: "Marta Elena Ruiz", titular: { nombre: "Marta Elena Ruiz", tipoDoc: "CC", doc: "39567204", correo: "m.ruiz@correo.co", tel: "3106671290", autoriza: true }, depto: "Cundinamarca", mpio: "Fusagasugá", vereda: "Bermejal", estado: "ACTIVA",
    especies: [{ sp: "ganso", proposito: "Carne y plumas", sistema: "Semi-intensivo", conCorral: true,
      inventario: [{ cat: "Engorde", n: 220, edad: 14, peso: 4.2 }, { cat: "Reproductores", n: 40, edad: 60, peso: 5.1 }] }], area: 900 },
  { id: "FIN-2025-00198", nombre: "Finca San Isidro", productor: "Rosa Elena Quintero", titular: { nombre: "Rosa Elena Quintero", tipoDoc: "CC", doc: "20556871", correo: "rosa.quintero@correo.co", tel: "3127705518", autoriza: true }, depto: "Cundinamarca", mpio: "Pacho", vereda: "San Isidro", estado: "ACTIVA",
    especies: [{ sp: "pato", proposito: "Huevo", conCorral: false, permanencia: false, cama: false, bebedero: "Artesanal", inventario: [{ cat: "Ponedoras", n: 18, edad: 30, peso: 2.2 }] },
               { sp: "ganso", proposito: "Carne", sistema: "Extensivo", conCorral: false, inventario: [{ cat: "Adultos", n: 9, edad: 50, peso: 5 }] }], area: 0 },
  { id: "FIN-2025-00211", nombre: "Lote Vega", productor: "Hernán Darío Mejía", titular: { nombre: "Hernán Darío Mejía", tipoDoc: "CC", doc: "91234567", correo: "h.mejia@correo.co", tel: "3154827710", autoriza: true }, depto: "Santander", mpio: "Lebrija", vereda: "Vega Alta", estado: "INACTIVA",
    especies: [{ sp: "pato", proposito: "Carne", conCorral: true, permanencia: true, cama: true, inventario: [{ cat: "Engorde", n: 0, edad: 0, peso: 0 }] }], area: 300 }
];
const HIST = {};   // sin registros anteriores al sistema: las gráficas usan solo inspecciones finalizadas

let FINCAS = store.get("fincas", null) || JSON.parse(JSON.stringify(FINCAS0));
let EVALS = store.get("evals", null);
let BITACORA = store.get("bitacora", []);
let PROCESOS = store.get("procesos", {});   // ampliaciones de seguimiento por proceso: { PRC-…: { ampliado: {motivo, por, fecha} } }
let USUARIOS_LISTA = store.get("usuarios", null) || [
  { n: "Camilo Andrés Peña", r: "Inspector ICA", d: "1.110.456.789", c: "c.pena@ica.gov.co", e: "Activo", h: 14 },
  { n: "Luz Marina Cárdenas", r: "Coordinadora ICA", d: "40.023.118", c: "l.cardenas@ica.gov.co", e: "Activo", h: 38 },
  { n: "Hernán Darío Mejía", r: "Productor", d: "91.234.567", c: "h.mejia@correo.co", e: "Activo", h: 3 },
  { n: "Rosa Elena Quintero", r: "Productora de traspatio", d: "20.556.871", c: "—", e: "Activo", h: 1 },
  { n: "Pedro Gil Ramírez", r: "Inspector ICA", d: "79.331.002", c: "p.gil@ica.gov.co", e: "Inactivo", h: 9 },
  { n: "Ana Lucía Díaz", r: "Consultora externa", d: "52.884.120", c: "a.diaz@uni.edu.co", e: "Pendiente", h: 0 }
];
const guardar = () => { store.set("fincas", FINCAS); store.set("evals", EVALS); store.set("bitacora", BITACORA.slice(-200)); store.set("usuarios", USUARIOS_LISTA); store.set("procesos", PROCESOS); };
const log = (accion) => { BITACORA.push({ t: new Date().toISOString(), u: SES ? USUARIOS[SES.rol].nombre : "—", a: accion }); guardar(); };
