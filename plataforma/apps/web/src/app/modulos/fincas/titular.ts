import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TIPOS_DOCUMENTO, type Titular } from '@eba/norma';

/* Persona responsable de la finca (productor o propietario), con las mismas reglas del prototipo (validarTitular). */
const FORMATO_DOC: Record<string, [RegExp, string]> = {
  CC: [/^\d{5,10}$/, 'de 5 a 10 dígitos'], CE: [/^\d{6,10}$/, 'de 6 a 10 dígitos'], NIT: [/^\d{9}-?\d$/, 'de 9 dígitos y el dígito de verificación (ej.: 900123456-7)'],
  PAS: [/^[A-Z0-9]{5,12}$/, 'de 5 a 12 letras o números'], PPT: [/^\d{6,10}$/, 'de 6 a 10 dígitos'],
};
export const limpiaDoc = (t: string, v: unknown) => String(v || '').trim().toUpperCase().replace(t === 'NIT' ? /[.\s]/g : /[.\s-]/g, '');
export const limpiaTel = (v: unknown) => String(v || '').replace(/[\s()+-]/g, '').replace(/^57(?=\d{10}$)/, '');
export const nombreTipoDoc = (t: string) => TIPOS_DOCUMENTO.find((x) => x.codigo === t)?.nombre ?? t;
export const enmascara = (d: string) => (!d || d === '—' ? '—' : '•••' + String(d).slice(-3));
export const enmascaraC = (c: string) => (!c || c === '—' ? '—' : c.replace(/^(.).*(@.*)$/, '$1•••$2'));
export const enmascaraTel = (t?: string) => (t ? '••• ••• ' + String(t).slice(-4) : '—');
export const formatoTel = (t?: string) => (t ? String(t).replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3') : '—');

export const titularVacio = (): Titular => ({ nombre: '', tipoDoc: 'CC', doc: '', correo: '', tel: '', autoriza: false });

/** Errores por campo (vacío si todo está bien). traspatio = menos de 200 aves: el correo es opcional (HU-25, RN-50). */
export function validarTitular(t: Titular, traspatio: boolean): Record<string, string> {
  const e: Record<string, string> = {}, nombre = (t.nombre || '').trim();
  if (nombre.length < 5 || !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(nombre) || nombre.split(/\s+/).length < 2) e['nombre'] = 'Escriba nombre y apellido (solo letras).';
  if (!FORMATO_DOC[t.tipoDoc]) e['tipoDoc'] = 'Seleccione el tipo de documento.';
  else if (!FORMATO_DOC[t.tipoDoc][0].test(limpiaDoc(t.tipoDoc, t.doc))) e['doc'] = `El número de ${nombreTipoDoc(t.tipoDoc).toLowerCase()} debe tener ${FORMATO_DOC[t.tipoDoc][1]}.`;
  const correo = String(t.correo || '').trim();
  if (!correo && !traspatio) e['correo'] = 'El correo es obligatorio en fincas comerciales (200 aves o más).';
  else if (correo && !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(correo)) e['correo'] = 'Escriba un correo válido (ej.: nombre@correo.co).';
  if (!/^(3\d{9}|60\d{8})$/.test(limpiaTel(t.tel))) e['tel'] = 'Escriba un celular de 10 dígitos (3XX XXX XXXX) o un fijo con indicativo (60X XXX XXXX).';
  if (!t.autoriza) e['autoriza'] = 'Se necesita la autorización de tratamiento de datos (Ley 1581 de 2012).';
  return e;
}
/** Titular limpio para guardar. */
export const limpiarTitular = (t: Titular): Titular => ({
  nombre: t.nombre.trim().replace(/\s+/g, ' '), tipoDoc: t.tipoDoc, doc: limpiaDoc(t.tipoDoc, t.doc), correo: String(t.correo || '').trim().toLowerCase(), tel: limpiaTel(t.tel), autoriza: !!t.autoriza,
});

/** Campos de la persona responsable (registro y edición). */
@Component({
  selector: 'app-campos-titular',
  imports: [FormsModule],
  template: `
<fieldset class="grupo-campos"><legend>Persona responsable (productor o propietario)</legend>
  <div class="campo"><label for="tn">Nombre completo</label><input id="tn" name="tn" autocomplete="name" [ngModel]="t().nombre" (ngModelChange)="cambiar('nombre', $event)"><span class="error-campo">{{ errores()['nombre'] }}</span></div>
  <div class="fila"><div class="campo"><label for="tt">Tipo de documento</label>
      <select id="tt" name="tt" [ngModel]="t().tipoDoc" (ngModelChange)="cambiar('tipoDoc', $event)">@for (x of tipos; track x.codigo) { <option [value]="x.codigo">{{ x.nombre }}</option> }</select>
      <span class="error-campo">{{ errores()['tipoDoc'] }}</span></div>
    <div class="campo"><label for="td">Número de documento</label><input id="td" name="td" inputmode="numeric" [ngModel]="t().doc" (ngModelChange)="cambiar('doc', $event)"><span class="error-campo">{{ errores()['doc'] }}</span></div></div>
  <div class="fila"><div class="campo"><label for="tc">Correo electrónico @if (traspatio()) { <span class="muted">(opcional en traspatio)</span> }</label>
      <input id="tc" name="tc" type="email" autocomplete="email" [ngModel]="t().correo" (ngModelChange)="cambiar('correo', $event)">
      @if (traspatio()) { <span class="ayuda-campo">Sin correo, la persona no entra a la plataforma: el inspector la atiende y le avisa por teléfono.</span> }
      <span class="error-campo">{{ errores()['correo'] }}</span></div>
    <div class="campo"><label for="tf">Teléfono</label><input id="tf" name="tf" type="tel" inputmode="tel" autocomplete="tel" placeholder="3XX XXX XXXX" [ngModel]="t().tel" (ngModelChange)="cambiar('tel', $event)"><span class="error-campo">{{ errores()['tel'] }}</span></div></div>
  <label class="chk"><input type="checkbox" name="ta" [ngModel]="t().autoriza" (ngModelChange)="cambiar('autoriza', $event)">La persona autoriza el tratamiento de sus datos personales según la Ley 1581 de 2012.</label>
  <span class="error-campo">{{ errores()['autoriza'] }}</span>
</fieldset>`,
})
export class CamposTitular {
  readonly t = model.required<Titular>();
  readonly errores = input<Record<string, string>>({});
  readonly traspatio = input(false);
  protected readonly tipos = TIPOS_DOCUMENTO;
  protected cambiar<K extends keyof Titular>(k: K, v: Titular[K]) { this.t.update((x) => ({ ...x, [k]: v })); }
}
