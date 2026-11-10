/**
 * Reglas del registro de finca y de la persona responsable (CU-04, RN-175, RN-176), migradas del prototipo.
 * Las usan el formulario de Angular (para avisar mientras se escribe) y la API (que es la que decide).
 */
import type { Especie } from './tipos.js';
import { tramo } from './reglas.js';

export type TipoDocumento = 'CC' | 'CE' | 'NIT' | 'PAS' | 'PPT';
export const TIPOS_DOCUMENTO: ReadonlyArray<{ codigo: TipoDocumento; nombre: string }> = [
  { codigo: 'CC', nombre: 'Cédula de ciudadanía' },
  { codigo: 'CE', nombre: 'Cédula de extranjería' },
  { codigo: 'NIT', nombre: 'NIT' },
  { codigo: 'PAS', nombre: 'Pasaporte' },
  { codigo: 'PPT', nombre: 'Permiso por protección temporal (PPT)' },
];
const FORMATO_DOC: Record<TipoDocumento, [RegExp, string]> = {
  CC: [/^\d{5,10}$/, 'de 5 a 10 dígitos'],
  CE: [/^\d{6,10}$/, 'de 6 a 10 dígitos'],
  NIT: [/^\d{9}-?\d$/, 'de 9 dígitos y el dígito de verificación (ej.: 900123456-7)'],
  PAS: [/^[A-Z0-9]{5,12}$/, 'de 5 a 12 letras o números'],
  PPT: [/^\d{6,10}$/, 'de 6 a 10 dígitos'],
};
export const ESPECIES: ReadonlyArray<{ codigo: Especie; nombre: string; plural: string }> = [
  { codigo: 'pato', nombre: 'Patos', plural: 'patos' },
  { codigo: 'ganso', nombre: 'Gansos', plural: 'gansos' },
];

export const limpiarDocumento = (tipo: string, v: unknown) =>
  String(v ?? '').trim().toUpperCase().replace(tipo === 'NIT' ? /[.\s]/g : /[.\s-]/g, '');
export const limpiarTelefono = (v: unknown) => String(v ?? '').replace(/[\s()+-]/g, '').replace(/^57(?=\d{10}$)/, '');
export const limpiarNombre = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ');

export interface PersonaResponsable {
  nombre: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  correo?: string | null;
  telefono: string;
  autorizaDatos: boolean;
}
export interface EspecieRegistro { especie: Especie; numeroAves: number }
export interface RegistroFinca {
  nombre: string;
  departamento: string;   // código DANE de 2 dígitos
  municipio: string;
  vereda?: string | null;
  especies: EspecieRegistro[];
  persona: PersonaResponsable;
}
export type Errores = Record<string, string>;

/** Valida la persona responsable. En traspatio (todas las especies con menos de 200 aves) el correo es opcional (RN-50). */
export function validarPersona(p: Partial<PersonaResponsable> | undefined, traspatio: boolean): Errores {
  const e: Errores = {};
  const nombre = limpiarNombre(p?.nombre);
  if (nombre.length < 5 || !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(nombre) || nombre.split(' ').length < 2)
    e['persona.nombre'] = 'Escriba nombre y apellido (solo letras).';
  const tipo = p?.tipoDocumento as TipoDocumento;
  if (!FORMATO_DOC[tipo]) e['persona.tipoDocumento'] = 'Seleccione el tipo de documento.';
  else if (!FORMATO_DOC[tipo][0].test(limpiarDocumento(tipo, p?.numeroDocumento)))
    e['persona.numeroDocumento'] = `El número de ${TIPOS_DOCUMENTO.find((t) => t.codigo === tipo)!.nombre.toLowerCase()} debe tener ${FORMATO_DOC[tipo][1]}.`;
  const correo = String(p?.correo ?? '').trim();
  if (!correo && !traspatio) e['persona.correo'] = 'El correo es obligatorio en fincas comerciales (200 aves o más).';
  else if (correo && !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(correo)) e['persona.correo'] = 'Escriba un correo válido (ej.: nombre@correo.co).';
  if (!/^(3\d{9}|60\d{8})$/.test(limpiarTelefono(p?.telefono)))
    e['persona.telefono'] = 'Escriba un celular de 10 dígitos (3XX XXX XXXX) o un fijo con indicativo (60X XXX XXXX).';
  if (p?.autorizaDatos !== true) e['persona.autorizaDatos'] = 'Se necesita la autorización de tratamiento de datos (Ley 1581 de 2012).';
  return e;
}

/** La finca es de traspatio cuando ninguna especie llega a 200 aves (el correo pasa a ser opcional). */
export const esTraspatio = (especies: EspecieRegistro[]) =>
  especies.length > 0 && especies.every((s) => tramo(s.numeroAves) === 'traspatio');

/** Valida el registro completo (CU-04). Devuelve { campo: mensaje }; vacío si está bien. */
export function validarRegistroFinca(r: Partial<RegistroFinca> | undefined): Errores {
  const e: Errores = {};
  const nombre = limpiarNombre(r?.nombre);
  if (nombre.length < 3 || nombre.length > 120) e['nombre'] = 'Escriba el nombre de la finca (de 3 a 120 caracteres).';
  if (!/^\d{2}$/.test(String(r?.departamento ?? ''))) e['departamento'] = 'Seleccione el departamento.';
  const mpio = limpiarNombre(r?.municipio);
  if (mpio.length < 3 || mpio.length > 80) e['municipio'] = 'Escriba el municipio.';
  if (r?.vereda && limpiarNombre(r.vereda).length > 80) e['vereda'] = 'La vereda no puede pasar de 80 caracteres.';
  const esp = Array.isArray(r?.especies) ? r!.especies : [];
  const codigos = esp.map((s) => s?.especie);
  if (!esp.length) e['especies'] = 'Marque al menos una especie.';
  else if (codigos.some((c) => c !== 'pato' && c !== 'ganso') || new Set(codigos).size !== codigos.length)
    e['especies'] = 'Las especies deben ser patos y/o gansos, sin repetir.';
  else
    for (const s of esp)
      if (!Number.isInteger(s.numeroAves) || s.numeroAves < 1 || s.numeroAves > 1_000_000)
        e[`especies.${s.especie}`] = `Escriba el número de ${s.especie === 'pato' ? 'patos' : 'gansos'} (1 o más).`;
  Object.assign(e, validarPersona(r?.persona, esTraspatio(esp)));
  return e;
}
