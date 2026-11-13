import { Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { INDICADOR, fmt, nombreEspecie, poblacion, tramo, type Medida } from '@eba/norma';
import { HtmlPipe, barraH, evolucionSVG } from '../../compartido/graficas';
import { LineaFlujo, fechaCorta } from '../../compartido/flujo-ui';
import { Datos } from '../../nucleo/datos';
import { Migas } from '../../nucleo/migas';
import { compararVisitas, medidas } from './calculos';

const NOMBRE: Record<Medida, string> = { MBA: 'Animal', MBR: 'Recursos', MBG: 'Gestión' };
const COLOR: Record<Medida, string> = { MBA: 'var(--campo)', MBR: 'var(--siembra)', MBG: 'var(--cosecha)' };

/** Informe de una finca (vInformeFinca del prototipo): estado por especie, último resultado, por mejorar, plan de mejora e historial. */
@Component({
  selector: 'app-informe-finca',
  imports: [RouterLink, HtmlPipe, LineaFlujo],
  templateUrl: './informe.html',
})
export class InformeFinca {
  readonly id = input.required<string>();
  private readonly datos = inject(Datos);
  private readonly router = inject(Router);
  private readonly migas = inject(Migas);
  protected readonly fmt = fmt;
  protected readonly fechaCorta = fechaCorta;
  protected readonly INDICADOR = INDICADOR;
  protected readonly hoy = fechaCorta(new Date().toISOString());
  private registrado = '';

  protected readonly f = computed(() => this.datos.flujo().fincasVisibles().find((x) => x.id === this.id()));
  protected readonly pob = computed(() => (this.f() ? poblacion(this.f()!) : 0));
  protected readonly bloques = computed(() => {
    const f = this.f(), fl = this.datos.flujo(); if (!f) return [];
    return f.especies.map((esp) => {
      const s = fl.estadoEspecie(f, esp.sp), evs = fl.evaluacionesDe(f.id, esp.sp).filter((e) => e.estado !== 'Programada'), ev = s.ultimaFin ?? evs[0];
      const base = { sp: esp.sp, titulo: `${nombreEspecie(esp.sp)} · ${esp.proposito ?? ''}`, s };
      if (!ev) return { ...base, ev: null };
      const r = fl.resultado(ev), mejorar = r.filas.filter((x) => x.score < 100).sort((a, b) => a.score - b.score);
      const plan = Object.entries(ev.plan || {}).filter(([, v]) => v && (v.accion || '').trim());
      const c = compararVisitas(fl, this.datos.evals(), f.id, esp.sp);
      const puntos = c.visitas.map((e) => { const rr = fl.resultado(e); return [fl.nombreCorto(e), rr.total, rr.provisional] as [string, number, boolean]; });
      const gs = (['MBA', 'MBR', 'MBG'] as Medida[]).filter((g) => r.pesos[g] > 0);
      return { ...base, ev, r, mejorar, plan, nombreVisita: fl.nombreVisita(ev),
        barras: gs.map((g) => barraH(`${NOMBRE[g]} · ${r.pesos[g] * 100} %`, r.med[g] ?? 0, 100, fmt(r.med[g]), COLOR[g])).join(''),
        resumen: `${r.filas.filter((x) => x.score >= 100).length} indicadores en 100 · ${r.filas.filter((x) => x.score > 0 && x.score < 100).length} por mejorar · ${r.filas.filter((x) => x.score === 0).length} en 0${r.pend ? ` · ${r.pend} sin calificar` : ''}.`,
        evolucion: puntos.length > 1 ? evolucionSVG(puntos) : '',
        historial: fl.evaluacionesDe(f.id, esp.sp).map((e) => { const rr = fl.resultado(e); return { e, r: rr, pr: e.estado === 'Programada', med: medidas(rr), nombre: fl.nombreVisita(e) }; }) };
    });
  });

  constructor() {
    effect(() => {
      if (this.datos.cargando()) return;
      const f = this.f();
      if (!f) { void this.router.navigate(['/reportes'], { replaceUrl: true }); return; }
      this.migas.niveles.set([{ texto: 'Reportes', ruta: '/reportes' }, { texto: `Informe · ${f.nombre}` }]);
      if (this.registrado !== f.id) { this.registrado = f.id; void this.datos.registrar(`Consulta del informe de ${f.nombre}`); }
    });
  }
  protected tramoTxt(): string { return tramo(this.pob()) === 'comercial' ? 'Comercial' : 'Traspatio'; }
  protected imprimir(): void { window.print(); }
}
