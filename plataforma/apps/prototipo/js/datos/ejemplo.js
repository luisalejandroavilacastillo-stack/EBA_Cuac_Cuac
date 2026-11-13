/* EBA Patos y Gansos · ICA — js/datos/ejemplo.js
   Datos de ejemplo (usuarios, permisos por rol, fincas) y persistencia en el navegador. */
"use strict";

/* ---------------- datos de ejemplo ---------------- */
/* Usuarios de demostración. La clave es el usuario; «perfil» es el rol que define los permisos (v0.25):
   - admin: gestiona usuarios y ve todo el sistema en solo lectura (no evalúa ni aprueba).
   - coordinador: registra fincas, asigna cada inspección a un inspector y aprueba o devuelve lo que el inspector finaliza.
   - inspector: solo ve las fincas que le asignaron; diligencia la visita en campo y la finaliza (queda «Pendiente de aprobación»).
   - productor: ve solo sus fincas y el resultado cuando el coordinador lo aprueba. */
/* Nombre visible de cada perfil: es el mismo para hombres y mujeres (decisión del 11 de noviembre de 2026). */
const PERFILES = { admin: "Administrador", coordinador: "Coordinador ICA", inspector: "Inspector ICA", productor: "Productor" };
const ORDEN_PERFILES = ["inspector", "coordinador", "productor", "admin"];
const USUARIOS0 = {
  inspector: { nombre: "Camilo Andrés Peña", perfil: "inspector", correo: "c.pena@ica.gov.co", tipoDoc: "CC", doc: "1110456789", tel: "3104456789", estado: "Activo" },
  inspector2: { nombre: "Diana Marcela Ortiz", perfil: "inspector", correo: "d.ortiz@ica.gov.co", tipoDoc: "CC", doc: "1098334120", tel: "3123341200", estado: "Activo" },
  coordinador: { nombre: "Luz Marina Cárdenas", perfil: "coordinador", correo: "l.cardenas@ica.gov.co", tipoDoc: "CC", doc: "40023118", tel: "3150231180", estado: "Activo" },
  productor: { nombre: "Hernán Darío Mejía", perfil: "productor", correo: "h.mejia@correo.co", tipoDoc: "CC", doc: "91234567", tel: "3154827710", estado: "Activo" },
  admin: { nombre: "Andrés Felipe Rojas", perfil: "admin", correo: "a.rojas@ica.gov.co", tipoDoc: "CC", doc: "80765432", tel: "3007654321", estado: "Activo" },
  u_rquintero: { nombre: "Rosa Elena Quintero", perfil: "productor", correo: "rosa.quintero@correo.co", tipoDoc: "CC", doc: "20556871", tel: "3127705518", estado: "Activo" },
  u_pgil: { nombre: "Pedro Gil Ramírez", perfil: "inspector", correo: "p.gil@ica.gov.co", tipoDoc: "CC", doc: "79331002", tel: "3017331002", estado: "Inactivo" }
};
/** Cuentas de usuario (las crea, edita e inactiva el administrador). La clave es el identificador interno. */
const USUARIOS = (typeof store !== "undefined" && store.get("cuentas", null)) || JSON.parse(JSON.stringify(USUARIOS0));
/** Completa los campos derivados: nombre del perfil e iniciales. */
function completarUsuario(x) { x.rol = PERFILES[x.perfil] || x.perfil; x.ini = x.nombre.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase(); x.estado = x.estado || "Activo"; return x; }
Object.values(USUARIOS).forEach(completarUsuario);
/** Usuario de la sesión actual (SES.u es la clave del usuario; SES.rol, su perfil). */
const yoClave = () => (SES ? SES.u || SES.rol : null);
const yo = () => (SES ? USUARIOS[yoClave()] : null);
/** Inspectores disponibles para asignar: [[clave, usuario], …]. */
const inspectores = () => Object.entries(USUARIOS).filter(([, x]) => x.perfil === "inspector" && x.estado === "Activo");
/** Nombre del inspector de una evaluación (guarda la clave del usuario). */
const nombreInspector = (k) => (USUARIOS[k] ? USUARIOS[k].nombre : k || "Sin asignar");
/** Estados de una visita que aún no está aprobada (cuentan como «abierta»: no se puede crear otra para la misma finca y especie). */
const ESTADOS_ABIERTOS = ["Programada", "En proceso", "Devuelta", "Pendiente de aprobación"];
const esAbierta = (e) => ESTADOS_ABIERTOS.includes(e.estado);
/** Nombre visible del estado de una visita: la finalizada es la que el coordinador aprobó. */
const etqEstadoEv = (e) => ({ Programada: "Asignada", Finalizada: "Aprobada" })[e] || e;
const PERMISOS = {
  inspector: ["inicio", "fincas", "evaluaciones", "reportes", "asistente", "ayuda", "cuenta"],
  coordinador: ["inicio", "fincas", "evaluaciones", "reportes", "asistente", "ayuda", "cuenta"],
  productor: ["inicio", "fincas", "evaluaciones", "asistente", "ayuda", "cuenta"],
  /* El administrador tiene todos los permisos (usuarios, fincas, asignación y seguimientos) menos aprobar o devolver inspecciones, que es solo del coordinador. */
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
let PROCESOS = store.get("procesos", {});
let AVISOS = store.get("avisos", []);       // avisos dentro de la aplicación: { id, para (usuario o perfil), t, txt, href, leido }   // ampliaciones de seguimiento por proceso: { PRC-…: { ampliado: {motivo, por, fecha} } }

const guardar = () => { store.set("fincas", FINCAS); store.set("evals", EVALS); store.set("bitacora", BITACORA.slice(-200)); store.set("cuentas", USUARIOS); store.set("procesos", PROCESOS); store.set("avisos", AVISOS.slice(-100)); };
const log = (accion) => { BITACORA.push({ t: new Date().toISOString(), u: SES ? yo().nombre : "—", a: accion }); guardar(); };
/** Deja un aviso para un usuario (clave) o para todos los de un perfil ("coordinador"). */
function avisar(para, txt, href, tipo) {
  AVISOS.push({ id: "AV-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), para, t: new Date().toISOString(), txt, href: href || "#/inicio", leido: false, tipo: tipo || "" }); guardar();
}
/** Avisos sin leer del usuario actual (los dirigidos a él o a su perfil). */
const misAvisos = () => (SES ? AVISOS.filter((a) => !a.leido && (a.para === yoClave() || a.para === SES.rol || (SES.rol === "admin" && a.para === "coordinador" && a.tipo !== "aprobar"))) : []);   // aprobar es solo del coordinador
