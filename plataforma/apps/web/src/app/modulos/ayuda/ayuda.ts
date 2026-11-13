import { Component, ElementRef, afterRenderEffect, computed, effect, inject, input, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { INDICADOR, INDICADORES, PESOS, fmt, nivelDe, redondear1, type Especie, type Medida, type Tramo } from '@eba/norma';
import { HtmlPipe, escalaSVG, fichaHTML } from '../../compartido/graficas';
import { Datos } from '../../nucleo/datos';
import { Migas } from '../../nucleo/migas';
import { SECC_AYUDA, seccionesAyuda } from './secciones';

const MEDIDA: Record<Medida, string> = { MBR: 'Medidas basadas en los recursos', MBA: 'Medidas basadas en el animal', MBG: 'Medidas basadas en la gestión' };
const CAP = { pato: { MBR: '6.1', MBA: '6.2', MBG: '6.3' }, ganso: { MBR: '7.1', MBA: '7.2', MBG: '7.3' } } as const;

/** Centro de ayuda de la norma (vAyuda del prototipo): secciones, fichas de los 58 indicadores y calculadora del puntaje. */
@Component({
  selector: 'app-ayuda',
  imports: [RouterLink, HtmlPipe],
  templateUrl: './ayuda.html',
})
export class Ayuda {
  readonly clave = input<string>();
  private readonly datos = inject(Datos);
  private readonly router = inject(Router);
  private readonly migas = inject(Migas);
  protected readonly SECC = SECC_AYUDA;
  protected readonly PDF = 'norma/Metodologia-EBA-Patos-y-Gansos-ICA-2024.pdf';

  protected readonly ind = computed(() => (this.clave() ? INDICADOR[this.clave()!] : undefined));
  protected readonly sec = computed(() => (this.ind() ? null : SECC_AYUDA.some(([k]) => k === this.clave()) ? this.clave()! : 'norma'));
  private readonly secciones = computed(() => seccionesAyuda({ evals: this.datos.evals(), finca: (id) => this.datos.finca(id) }));
  protected readonly cuerpo = computed(() => { const i = this.ind(); return i ? fichaHTML(i) : this.secciones()[this.sec()!](); });
  protected readonly grupos = computed(() => (['pato', 'ganso'] as Especie[]).map((sp) => ({
    sp, titulo: sp === 'pato' ? 'Patos' : 'Gansos',
    medidas: (['MBR', 'MBA', 'MBG'] as Medida[]).map((g) => ({ titulo: `${CAP[sp][g]} · ${MEDIDA[g]}`, items: INDICADORES.filter((i) => i.sp === sp && i.g === g) })),
  })));

  /** Calculadora de la sección «Cálculo» (está dentro del texto de la sección): se recalcula con cada cambio. */
  private readonly caja = viewChild<ElementRef<HTMLElement>>('caja');
  protected calculadora(): void {
    const c = this.caja()?.nativeElement, out = c?.querySelector<HTMLElement>('#cOut'); if (!c || !out) return;
    const val = (id: string) => c.querySelector<HTMLInputElement | HTMLSelectElement>('#' + id)?.value ?? '';
    const t = (val('cTr') || 'comercial') as Tramo, p = PESOS[t], v: Record<Medida, number> = { MBA: +val('cA') || 0, MBR: +val('cR') || 0, MBG: +val('cG') || 0 };
    const g = c.querySelector<HTMLInputElement>('#cG'); if (g) g.disabled = t === 'traspatio';
    const gs = (['MBA', 'MBR', 'MBG'] as Medida[]).filter((k) => p[k] > 0), total = redondear1(gs.reduce((s, k) => s + p[k] * v[k], 0));
    out.innerHTML = `<div class="formula-grande">${gs.map((k) => `${String(p[k]).replace('.', ',')} × ${fmt(v[k])}`).join(' + ')} = <b>${fmt(total)}</b> → <b>${nivelDe(total)[0]}</b></div>${escalaSVG(total)}`;
  }

  constructor() {
    afterRenderEffect(() => { this.cuerpo(); this.calculadora(); });
    effect(() => {
      const i = this.ind(), s = this.sec();
      this.migas.niveles.set([{ texto: 'Ayuda de la norma', ruta: '/ayuda' }, { texto: i ? `${i.num} ${i.name}` : SECC_AYUDA.find(([k]) => k === s)![1] }]);
    });
  }

  /** Los enlaces dentro del texto («ayuda/PA03») se abren sin recargar la página. */
  protected enlace(e: MouseEvent): void {
    const a = (e.target as HTMLElement).closest('a'), h = a?.getAttribute('href');
    if (h && h.startsWith('ayuda/')) { e.preventDefault(); void this.router.navigateByUrl('/' + h); }
  }
}
