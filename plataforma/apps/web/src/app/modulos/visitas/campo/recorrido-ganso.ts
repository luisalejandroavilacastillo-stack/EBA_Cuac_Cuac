import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  INDICADOR, NOV_GANSO, OPS_NOV, TRAT_GANSO, aplica, derivarGansos, galponDePunto, rgDe, valorNov,
  type Ganso, type PuntoGanso, type RecorridoGanso as DatosRecorridoG, type ValorNov,
} from '@eba/norma';
import { BotonFicha, COL, HtmlPipe, muestreoSVG } from '../../../compartido/graficas';
import { Notificaciones } from '../../../nucleo/notificaciones';
import { PantallaCampo, plural } from './base';
import { FichaAves, type OrigenAves } from './ficha-aves';

type Est = 'pend' | 'proceso' | 'hecho';
const TXT_EST: Record<Est, string> = { pend: 'pendiente', proceso: 'en proceso', hecho: 'evaluado' };
const VACIO: DatosRecorridoG = { aves: {}, pts: {}, gal: {}, trat: {} };

/**
 * Recorrido de gansos por galpón, punto y ganso (5.6 y numeral 7): el inspector marca ganso por ganso solo lo que encuentra
 * y el sistema cuenta y llena los indicadores (evaluados y con novedad), así que el cálculo de las tablas no cambia.
 */
@Component({
  selector: 'app-recorrido-ganso',
  imports: [RouterLink, HtmlPipe, BotonFicha, FichaAves],
  templateUrl: './recorrido-ganso.html',
})
export class RecorridoGanso extends PantallaCampo {
  readonly pt = input<string>();
  protected readonly titulo = 'Recorrido por puntos';
  private readonly avisos = inject(Notificaciones);
  protected readonly COL = COL;
  protected readonly TXT_EST = TXT_EST;
  protected readonly avesAbiertas = signal<number | null>(null);

  protected readonly plan = computed(() => this.ctx()?.plan ?? null);
  protected readonly punto = computed(() => { const p = this.plan(); return p ? Math.min(p.puntos - 1, Math.max(0, +(this.pt() ?? 0) || 0)) : 0; });
  private aplicaInd(c: string): boolean { const ctx = this.ctx(); return !!INDICADOR[c] && !!ctx && !aplica(INDICADOR[c], ctx); }
  /** Lo registrado (sin crearlo: se crea al primer cambio). */
  private get rg(): DatosRecorridoG { return (this.copia()?.['rg'] as DatosRecorridoG | undefined) ?? VACIO; }
  private nAves(p: number): number { return this.plan()?.reparto[p] || 0; }
  /** Gansos del punto (completa la lista con gansos sin revisar). */
  private avesDe(p: number): Ganso[] {
    const l = this.rg.aves[p] || [], n = this.nAves(p);
    return l.length >= n ? l : l.concat(Array.from({ length: n - l.length }, () => ({ m: {}, ok: false })));
  }
  private avesParaEditar(p: number): Ganso[] {
    const rg = rgDe(this.copia()!), l = (rg.aves[p] ??= []);
    while (l.length < this.nAves(p)) l.push({ m: {}, ok: false });
    return l;
  }
  private ptD(p: number): PuntoGanso { return (rgDe(this.copia()!).pts[p] ??= { agua: null, com: null, beb: null }); }
  private estadoPunto(p: number): Est {
    const rg = this.rg, x = rg.pts[p], algo = this.avesDe(p).some((a) => a.ok || Object.keys(a.m || {}).length) || Object.values(x || {}).some((v) => v != null);
    const recursos = !!x && x.agua != null && x.com != null && x.beb != null, gal = rg.gal[galponDePunto(this.plan()!, p)] != null;
    return recursos && this.avesDe(p).every((a) => a.ok) && gal ? 'hecho' : algo ? 'proceso' : 'pend';
  }
  protected nombrePunto(p: number): string { const plan = this.plan()!; return plan.corrales === 2 ? `Galpón ${galponDePunto(plan, p) + 1} · Punto ${(p % plan.puntosCorral) + 1}` : plan.corrales === 1 ? `Corral · Punto ${p + 1}` : `Punto ${p + 1}`; }
  private corto(p: number): string { const plan = this.plan()!; return `P${(plan.corrales === 2 ? p % plan.puntosCorral : p) + 1}`; }
  protected readonly novAplican = computed(() => { this.ctx(); return NOV_GANSO.filter((n) => this.aplicaInd(n.code)); });

  protected readonly vista = computed(() => {
    const ev = this.copia(), ctx = this.ctx(), plan = this.plan(); if (!ev || !ctx || !plan) return null;
    const pt = this.punto(), gal = galponDePunto(plan, pt), rg = this.rg, x = rg.pts[pt] ?? { agua: null, com: null, beb: null };
    const estados = Array.from({ length: plan.puntos }, (_, p) => this.estadoPunto(p));
    const ptsGal = Array.from({ length: plan.puntos }, (_, p) => p).filter((p) => galponDePunto(plan, p) === gal);
    const fila = (code: string, campo: keyof PuntoGanso, titulo: string, sub: string, si: string, no: string) => (this.aplicaInd(code)
      ? { code, campo, num: INDICADOR[code].num, titulo, sub, val: x[campo], ops: [[true, si, 100], [false, no, 0]] as [boolean, string, number][], igual: this.ed() && x[campo] != null && ptsGal.length > 1 } : null);
    const recursos = [fila('GR03', 'com', 'Comedero', 'El más cercano al punto', 'Buen estado y limpio', 'Dañado, sucio o con riesgo'),
      fila('GR04', 'beb', 'Bebedero', 'El más cercano al punto', 'Buen estado y limpio', 'Dañado, sucio o con riesgo'),
      fila('GR02', 'agua', 'Acceso al agua', `Los ${this.nAves(pt)} gansos del punto`, 'Tienen acceso permanente', 'No tienen acceso')].filter((r): r is NonNullable<typeof r> => !!r);
    const primeroDelGalpon = pt === 0 || galponDePunto(plan, pt - 1) !== gal;
    const galpon = this.aplicaInd('GR05') && primeroDelGalpon ? { num: INDICADOR['GR05'].num, titulo: plan.corrales === 2 ? `Galpón ${gal + 1}` : 'Galpón o potrero', val: rg.gal[gal] ?? null } : null;
    const lst = this.avesDe(pt), nov = this.novAplican();
    const estG = (a: Ganso): Est => (a.ok ? 'hecho' : Object.keys(a.m).length || Object.keys(a.n || {}).length ? 'proceso' : 'pend');
    const aves = lst.map((a, k) => { const e = estG(a), h = nov.filter((n) => a.m[n.code]).length, resp = nov.filter((n) => valorNov(a, n.code) != null).length;
      return { k, est: e, ok: a.ok, h, texto: a.ok ? (h ? plural(h, 'hallazgo', 'hallazgos') : 'Sin hallazgos') : e === 'proceso' ? `${resp} de ${nov.length}` : 'Sin revisar' }; });
    // tratamiento: solo para las novedades encontradas (se calcula sobre una copia para no tocar la visita al mirar)
    const prueba = structuredClone(ev); derivarGansos(prueba, ctx.f);
    const trat = Object.keys(TRAT_GANSO).filter((c) => this.aplicaInd(c) && +((prueba.resp[c] || {})['part'] ?? 0) > 0)
      .map((c) => ({ code: c, texto: `${INDICADOR[c].num} · hay evidencia de tratamiento de ${TRAT_GANSO[c]} (${prueba.resp[c]['part']} de ${prueba.resp[c]['total']} gansos)`, val: !!rg.trat[c] }));
    return {
      pt, gal, recursos, galpon, aves, trat, sig: lst.findIndex((a) => !a.ok), revisadas: lst.filter((a) => a.ok).length, total: lst.length,
      algunaEmpezada: aves.some((a) => a.est !== 'pend'), hechos: estados.filter((e) => e === 'hecho').length, ultimo: pt === plan.puntos - 1,
      grafica: muestreoSVG(plan, pt, estados),
      chips: estados.map((est, p) => ({ p, est, galpon: plan.corrales === 2 && p % plan.puntosCorral === 0 ? galponDePunto(plan, p) + 1 : 0, corto: this.corto(p), aves: this.nAves(p), title: `${this.nombrePunto(p)}: ${TXT_EST[est]}` })),
    };
  }, { equal: () => false });

  /* ---------------- acciones ---------------- */
  /** Cambio en el recorrido: pasa lo registrado a los indicadores y guarda. */
  private listo(): void { const ev = this.copia(), f = this.f(); if (!ev || !f) return; derivarGansos(ev, f); this.cambio(); }
  protected irPunto(p: number): void { void this.router.navigate(['/visitas', this.id(), 'recorrido', String(p)], { replaceUrl: true }); }
  protected siguiente(): void { const v = this.vista(); if (!v) return; if (!v.ultimo) this.irPunto(v.pt + 1); else this.ir(this.destinoLista()); }
  protected recurso(campo: keyof PuntoGanso, v: boolean): void { this.ptD(this.punto())[campo] = v; this.listo(); }
  protected igual(campo: keyof PuntoGanso): void {
    const plan = this.plan()!, pt = this.punto(), gal = galponDePunto(plan, pt), v = this.ptD(pt)[campo];
    const pts = Array.from({ length: plan.puntos }, (_, p) => p).filter((p) => galponDePunto(plan, p) === gal);
    pts.forEach((p) => (this.ptD(p)[campo] = v));
    this.listo(); this.avisos.info(`Se copió a los ${pts.length} puntos del galpón; cambie solo el que sea distinto.`);
  }
  protected galpon(v: boolean): void { rgDe(this.copia()!).gal[this.vista()!.gal] = v; this.listo(); }
  protected tratamiento(code: string, v: boolean): void { rgDe(this.copia()!).trat[code] = v; this.listo(); }
  protected restoSinHallazgos(): void { this.avesParaEditar(this.punto()).forEach((a) => (a.ok = true)); this.listo(); this.avisos.info('Aves del punto completas: solo se llenó lo que faltaba.'); }

  /** Datos para la ficha del ave de este punto. */
  protected readonly origen = computed<OrigenAves | null>(() => {
    const plan = this.plan(); if (!plan) return null;
    const pt = this.punto(), ultimoPunto = pt === plan.puntos - 1, nov = this.novAplican();
    return {
      lugar: this.nombrePunto(pt), n: this.nAves(pt), ed: this.ed(), ultimoPunto,
      filas: (k) => { const a = this.avesDe(pt)[k];
        return nov.map((n) => ({ code: n.code, nombre: `${INDICADOR[n.code].num} ${n.txt}`, val: a ? valorNov(a, n.code) : null, ops: (n.ops || OPS_NOV) as [ValorNov, string, number][] })); },
      set: (k, code, v) => { const a = this.avesParaEditar(pt)[k]; a.n = a.n || {};
        if (v === 'no') { delete a.m[code]; a.n[code] = true; } else { a.m[code] = code === 'GA05' ? (v as ValorNov) : true; delete a.n[code]; }
        a.ok = nov.every((n) => valorNov({ ...a, ok: false }, n.code) != null); this.listo(); },
      normal: (k, solo) => { const a = this.avesParaEditar(pt)[k]; if (!solo) a.m = {};
        a.n = Object.fromEntries(nov.filter((n) => !a.m[n.code]).map((n) => [n.code, true])); a.ok = true; this.listo(); },
      puntoCompleto: () => this.estadoPunto(pt) === 'hecho',
      alCerrar: () => { this.avesAbiertas.set(null); },
      alTerminarPunto: () => { this.avesAbiertas.set(null); if (ultimoPunto) this.ir(this.destinoLista()); else this.irPunto(pt + 1); },
    };
  });
}
