import { Component, Injectable, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { fmt, nivelDe, nombreEspecie, type Evaluacion } from '@eba/norma';
import { HtmlPipe, barraH, evolucionSVG } from '../../compartido/graficas';
import { fechaCorta } from '../../compartido/flujo-ui';
import { Datos } from '../../nucleo/datos';
import { Migas } from '../../nucleo/migas';
import { compararVisitas, criteriosReporte, csvReporte, datosReporte, filtroVacio, medidas, type FiltroReporte } from './calculos';

/** Filtros del reporte: se conservan al ir a una visita y volver (como en el prototipo). */
@Injectable({ providedIn: 'root' })
export class FiltrosReporte { readonly filtro = signal<FiltroReporte>(filtroVacio()); readonly comparar = signal(''); }

const NIVELES: [string, string][] = [['Excelente', 'var(--campo)'], ['Alto', 'var(--siembra)'], ['Medio', 'var(--cosecha)'], ['Bajo', 'var(--rojo)']];
const MEDIDAS_GRAF: ['MBR' | 'MBA' | 'MBG', string, string][] = [['MBR', 'recursos', 'var(--siembra)'], ['MBA', 'animal', 'var(--campo)'], ['MBG', 'gestión', 'var(--cosecha)']];

/** Reportes (vReportes del prototipo): indicadores, niveles, medidas, criterios, comparación entre visitas, consulta por visita y CSV. */
@Component({
  selector: 'app-reportes',
  imports: [RouterLink, HtmlPipe, NgTemplateOutlet],
  templateUrl: './reportes.html',
})
export class Reportes {
  private readonly datos = inject(Datos);
  protected readonly f = inject(FiltrosReporte);
  protected readonly fmt = fmt;
  protected readonly fechaCorta = fechaCorta;
  protected readonly nombreEspecie = nombreEspecie;
  protected readonly flujo = computed(() => this.datos.flujo());
  protected readonly fincas = computed(() => this.flujo().fincasVisibles());

  protected readonly evs = computed(() => datosReporte(this.flujo(), this.datos.evals(), this.f.filtro()));
  protected readonly fin = computed(() => this.evs().filter((e) => e.estado === 'Finalizada'));
  protected readonly kpis = computed(() => {
    const fin = this.fin(), rf = fin.map((e) => this.flujo().resultado(e));
    const prom = rf.length ? rf.reduce((a, r) => a + r.total, 0) / rf.length : null;
    return { total: this.evs().length, fin: fin.length, abiertas: this.evs().length - fin.length, prom, color: prom == null ? 'var(--linea)' : nivelDe(prom)[1],
      cumplen: fin.filter((e) => this.flujo().verificarCumplimiento(e).cumple).length };
  });
  protected readonly graficaNiveles = computed(() => {
    const n: Record<string, number> = { Excelente: 0, Alto: 0, Medio: 0, Bajo: 0 };
    this.fin().forEach((e) => n[this.flujo().resultado(e).nivel[0]]++);
    return NIVELES.map(([k, c]) => barraH(k, n[k], Math.max(1, ...Object.values(n)), String(n[k]), c)).join('');
  });
  protected readonly graficaMedidas = computed(() => {
    const rf = this.fin().map((e) => ({ e, r: this.flujo().resultado(e) })), sps = [...new Set(this.fin().map((e) => e.sp))];
    return sps.flatMap((sp) => MEDIDAS_GRAF.map(([g, t, c]) => {
      const v = rf.filter((x) => x.e.sp === sp && x.r.pesos[g] > 0 && x.r.med[g] != null).map((x) => x.r.med[g]!);
      return v.length ? barraH(`${nombreEspecie(sp)} · ${t}`, v.reduce((a, b) => a + b, 0) / v.length, 100, fmt(v.reduce((a, b) => a + b, 0) / v.length), c) : '';
    })).join('');
  });
  protected readonly criterios = computed(() => criteriosReporte(this.flujo(), this.fin()));

  /* comparación entre visitas */
  protected readonly pares = computed(() => [...new Set(this.evs().map((e) => e.finca + '|' + e.sp))].map((p) => {
    const [fid, sp] = p.split('|') as [string, Evaluacion['sp']];
    return { p, nombre: `${this.datos.finca(fid)?.nombre ?? fid} · ${nombreEspecie(sp)}`, conDos: compararVisitas(this.flujo(), this.datos.evals(), fid, sp).visitas.length >= 2 };
  }));
  protected readonly parSel = computed(() => { const ps = this.pares(), c = this.f.comparar();
    return ps.some((x) => x.p === c) ? c : ps.find((x) => x.conDos)?.p ?? ps[0]?.p ?? ''; });
  protected readonly cmp = computed(() => {
    const par = this.parSel(); if (!par) return null;
    const [fid, sp] = par.split('|') as [string, Evaluacion['sp']], fl = this.flujo(), c = compararVisitas(fl, this.datos.evals(), fid, sp);
    if (c.visitas.length < 2) return { sin: c.visitas.length ? 'tiene una sola inspección finalizada' : 'no tiene inspecciones finalizadas' } as const;
    const filas = c.visitas.map((e, k) => { const r = fl.resultado(e), d = k ? r.total - fl.resultado(c.visitas[k - 1]).total : null;
      return { e, r, med: medidas(r), d, nombre: fl.nombreVisita(e) }; });
    const puntos = c.visitas.map((e) => { const r = fl.resultado(e); return [`${fl.nombreCorto(e)} ${e.fecha.slice(5, 7)}/${e.fecha.slice(2, 4)}`, r.total, r.provisional] as [string, number, boolean]; });
    return { filas, grafica: evolucionSVG(puntos), cambios: c.cambios!, a: c.a!, b: c.b! };
  });

  /* consulta por visita */
  protected readonly filas = computed(() => this.evs().map((e) => { const r = this.flujo().resultado(e);
    return { e, r, pr: e.estado === 'Programada', med: medidas(r), finca: this.datos.finca(e.finca)?.nombre ?? e.finca, visita: this.flujo().nombreVisita(e), avance: this.flujo().avance(e).pct }; }));

  constructor() { inject(Migas).niveles.set([{ texto: 'Reportes' }]); }

  protected poner<K extends keyof FiltroReporte>(k: K, v: string): void { this.f.filtro.update((x) => ({ ...x, [k]: v })); }
  protected limpiar(): void { this.f.filtro.set(filtroVacio()); }
  protected imprimir(): void { window.print(); }
  protected exportar(): void {
    const evs = this.evs(), blob = new Blob([csvReporte(this.flujo(), evs)], { type: 'text/csv' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'reporte_eba.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    void this.datos.registrar(`Exportación de reporte (${evs.length} evaluaciones, sin datos personales)`);
  }
}
