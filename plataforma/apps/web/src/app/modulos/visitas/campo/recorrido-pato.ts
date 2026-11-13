import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CC_TXT, CORTO, IND_AVE, INDICADOR, MAX_POR_PUNTO, PUNTO_FLEX, aplica, calcular, ccNivel, esFlexPunto, fmt, galponDePunto, nUnidades,
  porPuntoDe, puntoListo, unidadesDePunto, type Indicador, type PuntoRecurso, type Respuesta,
} from '@eba/norma';
import { BotonFicha, COL, HtmlPipe, muestreoSVG } from '../../../compartido/graficas';
import { Notificaciones } from '../../../nucleo/notificaciones';
import { PantallaCampo, plural } from './base';
import { FichaAves, type OrigenAves } from './ficha-aves';
import { IndicadorFlotante } from './indicador-flotante';

type Est = 'pend' | 'proceso' | 'hecho';
const TXT_EST: Record<Est, string> = { pend: 'pendiente', proceso: 'en proceso', hecho: 'evaluado' };
const UNIDAD_TXT: Record<string, string> = { PR02: 'Puñado de cama', PR05: 'Bebedero', PR10: 'Nidal' };

/**
 * Recorrido de campo de patos por galpón, punto y ave (5.6, Ilustraciones 2 y 3): en cada punto, los recursos más cercanos
 * y, ave por ave, los indicadores del animal. Lo registrado queda en los mismos indicadores, así que el cálculo no cambia.
 */
@Component({
  selector: 'app-recorrido-pato',
  imports: [RouterLink, HtmlPipe, BotonFicha, FichaAves, IndicadorFlotante],
  templateUrl: './recorrido-pato.html',
})
export class RecorridoPato extends PantallaCampo {
  readonly pt = input<string>();
  readonly av = input<string>();
  protected readonly titulo = 'Recorrido por puntos';
  private readonly avisos = inject(Notificaciones);
  protected readonly COL = COL;
  protected readonly TXT_EST = TXT_EST;
  protected readonly fmt = fmt;
  protected readonly plural = plural;
  protected readonly flotante = signal<string | null>(null);
  protected readonly avesAbiertas = signal<number | null>(null);

  protected readonly plan = computed(() => this.ctx()?.plan ?? null);
  protected readonly punto = computed(() => { const p = this.plan(); return p ? Math.min(p.puntos - 1, Math.max(0, +(this.pt() ?? 0) || 0)) : 0; });
  protected readonly nAves = computed(() => this.plan()?.reparto[this.punto()] ?? 0);
  private aplicaInd(c: string): boolean { const ev = this.copia(), ctx = this.ctx(); return !!INDICADOR[c] && !!ev && INDICADOR[c].sp === ev.sp && !!ctx && !aplica(INDICADOR[c], ctx); }
  protected readonly indAve = computed(() => { this.ctx(); return IND_AVE.filter((c) => this.aplicaInd(c)).map((c) => INDICADOR[c]); });
  protected readonly flex = computed(() => { const ctx = this.ctx(); return ctx ? PUNTO_FLEX.filter((c) => this.aplicaInd(c)).map((c) => INDICADOR[c]).filter((i) => esFlexPunto(i, ctx)) : []; });
  protected readonly comedero = computed(() => (this.aplicaInd('PR07') && this.ctx()?.tramo !== 'traspatio' ? INDICADOR['PR07'] : null));
  protected readonly gal = computed(() => (this.plan() ? galponDePunto(this.plan()!, this.punto()) : 0));
  private readonly ptsGal = computed(() => { const plan = this.plan(); return plan ? Array.from({ length: plan.puntos }, (_, p) => p).filter((p) => galponDePunto(plan, p) === this.gal()) : []; });

  /* ---------------- acceso a las respuestas ---------------- */
  private resp(code: string): Respuesta {
    const ev = this.copia()!, r = (ev.resp[code] ??= {}), n = nUnidades(INDICADOR[code], this.ctx()!);
    r['units'] = (r['units'] || []).slice(0, n); while (r['units'].length < n) r['units'].push(null);
    return r;
  }
  private valor(code: string, i: number): number | null { const r = this.copia()?.resp[code]; return r?.['units']?.[i] ?? null; }
  /** Lista por punto de un recurso (cama, bebedero, nidal); con p, la entrada de ese punto (la crea si falta). */
  private entradas(code: string): (PuntoRecurso | null)[] {
    const ev = this.copia()!, ctx = this.ctx()!, r = (ev.resp[code] ??= {});
    if (!Array.isArray(r['porPunto'])) r['porPunto'] = porPuntoDe(INDICADOR[code], r, ctx).slice();
    while (r['porPunto'].length < ctx.plan.puntos) r['porPunto'].push(null);
    return r['porPunto'];
  }
  private entrada(code: string, p: number): PuntoRecurso & { v: (number | null)[] } {
    const pp = this.entradas(code); if (!pp[p]) pp[p] = { v: [null], mismo: null, nohay: false };
    return pp[p] as PuntoRecurso & { v: (number | null)[] };
  }
  private porPuntoGuardado(i: Indicador): (PuntoRecurso | null)[] {
    const r = this.copia()?.resp[i.code]; return (r && (r['porPunto'] || porPuntoDe(i, r, this.ctx()!))) || [];
  }
  private idxAve(k: number, pt = this.punto()): number { return unidadesDePunto(INDICADOR['PA03'], this.ctx()!, pt)[k]; }

  /* ---------------- estado de puntos y aves ---------------- */
  private puntoCompleto(p: number): boolean {
    const ctx = this.ctx()!;
    return this.indAve().every((i) => unidadesDePunto(i, ctx, p).every((u) => this.valor(i.code, u) != null))
      && this.flex().every((i) => puntoListo(this.porPuntoGuardado(i)[p]))
      && (!this.comedero() || this.valor('PR07', galponDePunto(ctx.plan, p)) != null);
  }
  private conDato(p: number): boolean {
    const ctx = this.ctx()!;
    return this.indAve().some((i) => unidadesDePunto(i, ctx, p).some((u) => this.valor(i.code, u) != null))
      || this.flex().some((i) => { const e = this.porPuntoGuardado(i)[p]; return !!e && (e.mismo != null || !!e.nohay || (e.v || []).some((x) => x != null)); });
  }
  private estadoPunto(p: number): Est { return this.puntoCompleto(p) ? 'hecho' : this.conDato(p) ? 'proceso' : 'pend'; }
  private estadoAve(k: number): Est {
    const iA = this.idxAve(k), ind = this.indAve();
    return ind.every((i) => this.valor(i.code, iA) != null) ? 'hecho' : ind.some((i) => this.valor(i.code, iA) != null) ? 'proceso' : 'pend';
  }
  protected nombrePunto(p: number): string { const plan = this.plan()!; return plan.corrales === 2 ? `Galpón ${galponDePunto(plan, p) + 1} · Punto ${(p % plan.puntosCorral) + 1}` : plan.corrales === 1 ? `Corral · Punto ${p + 1}` : `Punto ${p + 1}`; }
  protected corto(p: number): string { const plan = this.plan()!; return `P${(plan.corrales === 2 ? p % plan.puntosCorral : p) + 1}`; }

  protected readonly vista = computed(() => {
    const ev = this.copia(), ctx = this.ctx(), plan = this.plan(); if (!ev || !ctx || !plan) return null;
    const pt = this.punto(), nAves = this.nAves();
    const estados = Array.from({ length: plan.puntos }, (_, p) => this.estadoPunto(p));
    const chips = estados.map((est, p) => ({ p, est, galpon: plan.corrales === 2 && p % plan.puntosCorral === 0 ? galponDePunto(plan, p) + 1 : 0,
      corto: this.corto(p), aves: plan.reparto[p], title: `${this.nombrePunto(p)}: ${TXT_EST[est]}` }));
    const estAves = Array.from({ length: nAves }, (_, k) => this.estadoAve(k));
    const hall = (code: string, v: number | null) => v != null && (code === 'PA11' ? ccNivel(v, ctx.e.proposito) : v) < 100;
    const aves = estAves.map((est, k) => { const iA = this.idxAve(k), ind = this.indAve();
      const h = ind.filter((i) => hall(i.code, this.valor(i.code, iA))).length, hechos = ind.filter((i) => this.valor(i.code, iA) != null).length;
      return { k, est, h, texto: est === 'hecho' ? (h ? plural(h, 'hallazgo', 'hallazgos') : 'Sin hallazgos') : est === 'proceso' ? `${hechos} de ${ind.length}` : 'Sin revisar' }; });
    const sigAve = estAves.findIndex((e) => e !== 'hecho');
    const previos = ['PA01', 'PA02'].filter((c) => this.aplicaInd(c)).map((c) => { const i = INDICADOR[c], k = calcular(i, ev.resp[c], ctx);
      return { code: c, title: `${i.num} ${i.name}`, texto: `${k.done ? '✓ ' : ''}${i.name}${k.done ? ` · ${fmt(k.score)}` : ''}` }; });
    return {
      pt, nAves, chips, aves, sigAve, previos,
      hechos: estados.filter((e) => e === 'hecho').length,
      avesHechas: estAves.filter((e) => e === 'hecho').length, avesMedias: estAves.filter((e) => e === 'proceso').length,
      grafica: muestreoSVG(plan, pt, estados), recursos: this.recursos(), cerosRec: this.cerosRecursos(), ultimo: pt === plan.puntos - 1,
      bebTraspatio: ctx.tramo === 'traspatio' && this.aplicaInd('PR05'),
    };
  }, { equal: () => false });

  /* ---------------- recursos del punto ---------------- */
  private opc(code: string): [number, string, number][] {
    const ctx = this.ctx()!;
    return code === 'PA11' ? [1, 2, 3, 4, 5].map((s) => [s, `${s} · ${CC_TXT[s]}`, ccNivel(s, ctx.e.proposito)] as [number, string, number])
      : INDICADOR[code].escala.map(([p]) => [p, CORTO[code]?.[p] || '', p] as [number, string, number]).filter((x, k, a) => a.findIndex((y) => y[0] === x[0]) === k);
  }
  private recursos() {
    const pt = this.punto(), ed = this.ed(), ptsGal = this.ptsGal();
    const flex = this.flex().map((i) => {
      const code = i.code, guard = this.porPuntoGuardado(i), e = (guard[pt] as PuntoRecurso | null) ?? { v: [null], mismo: null, nohay: false };
      const compartible = code !== 'PR02', v = e.v ?? [null];
      const anteriores = ptsGal.filter((p) => p < pt && (() => { const x = guard[p]; return !!x && x.mismo == null && !x.nohay; })());
      return { i, code, unidad: UNIDAD_TXT[code], mismo: e.mismo ?? null, nohay: !!e.nohay, v, ops: this.opc(code),
        mismoTxt: e.mismo != null ? this.corto(e.mismo) : '',
        agregar: ed && e.mismo == null && !e.nohay && code === 'PR05' && v.length < MAX_POR_PUNTO['PR05'],
        igual: ed && e.mismo == null && !e.nohay && v.every((x) => x != null) && ptsGal.length > 1,
        anteriores: compartible && e.mismo == null && !e.nohay ? anteriores.map((p) => ({ p, t: this.corto(p) })) : [],
        noHay: ed && compartible && e.mismo == null && !e.nohay };
    });
    const com = this.comedero();
    return { flex, comedero: com ? { ops: this.opc('PR07'), val: this.valor('PR07', this.gal()), donde: this.plan()!.corrales === 2 ? `galpón (galpón ${this.gal() + 1})` : 'galpón o corral' } : null };
  }
  /** Hallazgos en 0 que piden observación: recursos del punto y aves del punto. */
  private enCero(i: Indicador): boolean {
    const pt = this.punto(), ctx = this.ctx()!;
    if (this.flex().includes(i)) { const e = this.copia()?.resp[i.code]?.['porPunto']?.[pt] as PuntoRecurso | undefined; return !!e && (!!e.nohay || (e.mismo == null && (e.v || []).includes(0))); }
    if (i.code === 'PR07') return this.valor('PR07', this.gal()) === 0;
    return unidadesDePunto(i, ctx, pt).some((u) => { const v = this.valor(i.code, u); return i.code === 'PA11' ? v != null && ccNivel(v, ctx.e.proposito) === 0 : v === 0; });
  }
  private cerosRecursos() {
    const lst = this.flex().concat(this.comedero() ? [this.comedero()!] : []).filter((i) => this.enCero(i));
    return lst.map((i) => ({ code: i.code, nombre: `${i.num} ${i.name}`, valor: this.copia()?.obs[i.code] || '' }));
  }

  /* ---------------- acciones ---------------- */
  protected irPunto(p: number, a = 0): void { void this.router.navigate(['/visitas', this.id(), 'recorrido', String(p), String(a)], { replaceUrl: true }); }
  protected siguiente(): void { const v = this.vista(); if (!v) return; if (!v.ultimo) this.irPunto(v.pt + 1); else this.ir(this.destinoLista()); }
  protected ponerFlex(code: string, k: number, v: number): void { const e = this.entrada(code, this.punto()); e.v[k] = v; e.mismo = null; e.nohay = false; this.cambio(); }
  protected agregar(code: string): void { this.entrada(code, this.punto()).v.push(null); this.cambio(); }
  protected quitar(code: string, k: number): void { this.entrada(code, this.punto()).v.splice(k, 1); this.cambio(); }
  protected deshacer(code: string): void { this.entradas(code)[this.punto()] = { v: [null], mismo: null, nohay: false }; this.cambio(); }
  protected mismo(code: string, valor: string): void { if (valor === '') return; const e = this.entrada(code, this.punto()); e.mismo = +valor; e.nohay = false; this.cambio(); }
  protected noHay(code: string): void { const pp = this.entradas(code); this.ptsGal().forEach((p) => (pp[p] = { v: [], mismo: null, nohay: true })); this.cambio(); }
  protected igual(code: string): void {
    const pp = this.entradas(code), e = this.entrada(code, this.punto()), pts = this.ptsGal();
    pts.forEach((p) => { if (p !== this.punto()) pp[p] = { v: e.v.slice(), mismo: null, nohay: false }; });
    this.avisos.info(`Se copió a los ${pts.length} puntos del galpón; cambie solo el que sea distinto.`);
    this.cambio();
  }
  protected comederoNivel(v: number): void { this.resp('PR07')['units'][this.gal()] = v; this.cambio(); }
  protected ponerObs(code: string, v: string): void { const ev = this.copia(); if (!ev) return; ev.obs[code] = v; this.cambio(); }
  private normalAve(k: number, soloFaltantes: boolean): void {
    const iA = this.idxAve(k);
    this.indAve().forEach((i) => { if (!soloFaltantes || this.valor(i.code, iA) == null) this.resp(i.code)['units'][iA] = i.code === 'PA11' ? 3 : 100; });
  }
  protected restoSinHallazgos(): void {
    for (let k = 0; k < this.nAves(); k++) this.normalAve(k, true);
    this.cambio(); this.avisos.info('Aves del punto completas: solo se llenó lo que faltaba.');
  }

  /** Datos para la ficha del ave de este punto. */
  protected readonly origen = computed<OrigenAves | null>(() => {
    const plan = this.plan(), ctx = this.ctx(); if (!plan || !ctx) return null;
    const pt = this.punto(), ed = this.ed(), ultimoPunto = pt === plan.puntos - 1;
    return {
      lugar: this.nombrePunto(pt), n: this.nAves(), ed, ultimoPunto,
      filas: (k) => this.indAve().map((i) => ({ code: i.code, nombre: `${i.num} ${i.name}`, val: this.valor(i.code, this.idxAve(k)), ops: this.opc(i.code) })),
      set: (k, code, v) => { this.resp(code)['units'][this.idxAve(k)] = +v; this.cambio(); },
      normal: (k, solo) => { this.normalAve(k, solo); this.cambio(); },
      observaciones: () => this.indAve().filter((i) => this.enCero(i)).map((i) => ({ code: i.code, nombre: `${i.num} ${i.name}`, valor: this.copia()?.obs[i.code] || '' })),
      ponerObs: (code, v) => this.ponerObs(code, v),
      puntoCompleto: () => this.puntoCompleto(pt),
      alCerrar: (k) => { this.avesAbiertas.set(null); this.irPunto(pt, k); },
      alTerminarPunto: () => { this.avesAbiertas.set(null); if (ultimoPunto) this.ir(this.destinoLista()); else this.irPunto(pt + 1); },
    };
  });
}
