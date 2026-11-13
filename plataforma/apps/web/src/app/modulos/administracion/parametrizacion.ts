import { Component, inject, signal } from '@angular/core';
import { INDICADORES, PESOS, type Especie, type Medida } from '@eba/norma';
import { Asistente } from '../../nucleo/asistente';
import { Datos } from '../../nucleo/datos';
import { Migas } from '../../nucleo/migas';

/**
 * Parametrización (CU-25): versiones de la lista de chequeo por especie, pesos por tramo y estado del asistente con IA.
 * La clave de la IA vive solo en el .env del servidor (GEMINI_API_KEY): aquí no se escribe ni se muestra.
 */
@Component({
  selector: 'app-parametrizacion',
  template: `
<div class="encabezado"><div><h1>Parametrización de la lista de chequeo</h1><p>Versiones por especie. Una versión publicada no se modifica: los cambios se hacen en una versión nueva y las evaluaciones cerradas conservan la suya.</p></div></div>
<section class="panel"><table class="tabla"><thead><tr><th>Especie</th><th>Versión</th><th>Estado</th><th class="num">Recursos</th><th class="num">Animal</th><th class="num">Gestión</th><th class="num">Total</th></tr></thead><tbody>
  @for (f of filas; track f.sp) { <tr><td><b>{{ f.nombre }}</b></td><td>1.0</td><td><span class="etiqueta e-ok">Publicada</span></td><td class="num">{{ f.MBR }}</td><td class="num">{{ f.MBA }}</td><td class="num">{{ f.MBG }}</td><td class="num"><b>{{ f.total }}</b></td></tr> }
</tbody></table></section>
<section class="panel"><h3>Pesos por tramo</h3><table class="tabla"><thead><tr><th>Tramo</th><th class="num">Animal</th><th class="num">Recursos</th><th class="num">Gestión</th></tr></thead><tbody>
  <tr><td>Comercial (200 aves o más)</td><td class="num">{{ pct(PESOS.comercial.MBA) }}</td><td class="num">{{ pct(PESOS.comercial.MBR) }}</td><td class="num">{{ pct(PESOS.comercial.MBG) }}</td></tr>
  <tr><td>Traspatio</td><td class="num">{{ pct(PESOS.traspatio.MBA) }}</td><td class="num">{{ pct(PESOS.traspatio.MBR) }}</td><td class="num">{{ pct(PESOS.traspatio.MBG) }}</td></tr></tbody></table></section>
<section class="panel" id="cfgAsis"><h3>Asistente de la norma (IA)</h3>
  @if (asis.servidor()?.disponible) {
    <p style="margin-top:0"><span class="etiqueta e-ok">Activo</span> El asistente responde con <b>Gemini</b> (modelo <code>{{ asis.servidor()!.modelo }}</code>) desde el servidor de la plataforma, para todos los perfiles.</p>
  } @else {
    <p style="margin-top:0"><span class="etiqueta e-gris">Modo local</span> El asistente responde sin conexión con el texto de la norma y los datos de la plataforma.</p>
  }
  <p class="muted">La clave está en el archivo <code>.env</code> del servidor (GEMINI_API_KEY) y nunca llega al navegador. Antes de enviar cada pregunta, el servidor quita nombres de personas y fincas, documentos, correos y teléfonos. Para activar la IA o cambiar el modelo, edite GEMINI_API_KEY o GEMINI_MODELO en el <code>.env</code> y reinicie la API. Si Gemini no responde, el asistente contesta en modo local con el texto de la norma.</p>
  @if (asis.servidor()?.disponible) {
    <div class="acciones" style="justify-content:flex-start"><button type="button" class="btn btn-sec" [disabled]="probando()" (click)="probar()">Probar conexión</button></div>
    <p class="muted" style="font-size:13px" role="status">{{ resultado() }}</p>
  }
</section>`,
})
export class Parametrizacion {
  protected readonly asis = inject(Asistente);
  private readonly datos = inject(Datos);
  protected readonly PESOS = PESOS;
  protected readonly probando = signal(false);
  protected readonly resultado = signal('');
  protected readonly filas = (['pato', 'ganso'] as Especie[]).map((sp) => {
    const l = INDICADORES.filter((i) => i.sp === sp), n = (g: Medida) => l.filter((i) => i.g === g).length;
    return { sp, nombre: sp === 'pato' ? 'Patos' : 'Gansos', MBR: n('MBR'), MBA: n('MBA'), MBG: n('MBG'), total: l.length };
  });
  protected pct(p: number): string { return `${Math.round(p * 100)} %`; }
  constructor() { inject(Migas).niveles.set([{ texto: 'Parametrización' }]); }

  protected async probar(): Promise<void> {
    this.probando.set(true); this.resultado.set('Probando…');
    try {
      const t = await this.asis.preguntarIA('Responda solo: conexión correcta.', { f: null }, [], this.asis.motor().promptAsistente({ f: null, especies: ['pato', 'ganso'] }, ''));
      this.resultado.set('✔ Conexión correcta. Respuesta: ' + t.slice(0, 120));
      void this.datos.registrar('Prueba de conexión del asistente con IA');
    } catch (e) { this.resultado.set('✖ No se pudo conectar: ' + (e as Error).message); }
    this.probando.set(false);
  }
}
