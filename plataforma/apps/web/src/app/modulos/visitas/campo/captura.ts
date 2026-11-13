import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  BPUMV, DESDE_RECORRIDO_G, GALPON_PCT, INDICADOR, calcular, ccNivel, contexto, esAlertaGalpon, esFlexPunto, fmt, galponDePunto, lugarUnidad,
  nUnidades, porPuntoDe, puntoListo, type Evaluacion, type Finca, type Respuesta,
} from '@eba/norma';
import { COL, HtmlPipe, bandaReglaSVG, barraH, colorPuntaje, columnas, densidadSVG, esc } from '../../../compartido/graficas';
import { fechaCorta } from '../../../compartido/flujo-ui';
import { Datos } from '../../../nucleo/datos';
import { Notificaciones } from '../../../nucleo/notificaciones';
import { Trabajo } from '../../../nucleo/trabajo';

const REQ_DOC: [string, string][] = [['legible', 'Legible'], ['sinCorr', 'Sin correcciones ni agregados'], ['firmado', 'Firmado por el responsable'], ['contenido', 'Tiene el contenido que pide la norma']];
const ESTADOS_DOC = ['Válido', 'No válido', 'Pendiente', 'No presentado'];
const PREDIO = ['PR01', 'PR04', 'PR08', 'PR09', 'PR12'];

/**
 * Captura y cálculo de un indicador (montarCaptura del prototipo): la usa la pantalla del indicador y la ventana flotante
 * del recorrido. Cada cambio se guarda de inmediato en la copia de trabajo de la visita.
 */
@Component({
  selector: 'app-captura',
  imports: [HtmlPipe, RouterLink, NgTemplateOutlet],
  templateUrl: './captura.html',
  host: { class: 'ficha-cuerpo' },
})
export class Captura {
  readonly ev = input.required<Evaluacion>();
  readonly code = input.required<string>();
  readonly finca = input.required<Finca>();
  private readonly trabajo = inject(Trabajo);
  private readonly datos = inject(Datos);
  private readonly notas = inject(Notificaciones);

  protected readonly COL = COL;
  protected readonly BPUMV = BPUMV;
  protected readonly ESTADOS_DOC = ESTADOS_DOC;
  protected readonly CC = [1, 2, 3, 4, 5];
  protected readonly fmt = fmt;

  protected readonly ind = computed(() => INDICADOR[this.code()]);
  protected readonly m = computed(() => this.ind().m);
  private readonly t = computed(() => this.trabajo.tick());
  protected readonly ctx = computed(() => { this.t(); return contexto(this.ev(), this.finca()); }, { equal: () => false });
  protected readonly ed = computed(() => { this.t(); return this.datos.flujo().puedeEvaluar(this.ev()); });
  /** Respuesta del indicador (se crea vacía si no existe). */
  protected get r(): Respuesta { const ev = this.ev(); return (ev.resp[this.code()] ??= {}); }
  protected readonly calc = computed(() => { this.t(); return calcular(this.ind(), this.r, this.ctx()); }, { equal: () => false });

  /** Tipo de captura que corresponde (igual que el prototipo). */
  protected readonly tipo = computed(() => {
    const ind = this.ind(), m = ind.m, ctx = this.ctx(), ev = this.ev(), r = this.r;
    if (m.kind === 'auto' || m.kind === 'radio' || m.kind === 'density' || m.kind === 'bpumv' || m.kind === 'doc' || m.kind === 'direct') return m.kind;
    if (m.kind === 'units' && esFlexPunto(ind, ctx)) return 'flex';
    if (m.kind === 'units' || m.kind === 'cc') return 'units';
    if (m.kind === 'pct' && GALPON_PCT.includes(ind.code) && ctx.plan.corrales === 2) return 'pctGalpon';
    if (m.kind === 'pct' && ev.sp === 'ganso' && DESDE_RECORRIDO_G.includes(ind.code) && ev['rg'] && r['rg']) return 'pctRecorrido';
    return 'pct';
  });

  constructor() {
    // valores iniciales que el prototipo deja escritos al abrir el indicador (densidad y muestra de gansos)
    effect(() => {
      const code = this.code(), ev = this.ev();
      untracked(() => {
        const ind = INDICADOR[code], ctx = contexto(ev, this.finca()), r = (ev.resp[code] ??= {});
        if (ind.m.kind === 'density' && r['aves'] == null) {
          const inv = ctx.e.inventario, aves = inv.reduce((s, c) => s + (+c.n || 0), 0);
          const peso = inv.length ? inv.reduce((s, c) => s + (c.peso ?? 0) * c.n, 0) / Math.max(1, aves) : 0;
          r['aves'] = ctx.nEsp || aves; r['peso'] = Math.round(peso * 100) / 100;
        }
        const mg = this.muestraGanso();
        if (mg && this.datos.flujo().puedeEvaluar(ev) && (r['total'] == null || r['total'] === '')) r['total'] = mg;
        this.cur.set(r['cur'] ?? null);
      });
    });
  }

  private cambio(): void { this.trabajo.cambio(this.ev()); }

  /* ---------------- escala ---------------- */
  protected readonly escala = computed(() => this.ind().escala.map(([p, t], j) => ({ p, t, j, c: COL[p] })));
  protected readonly kEscala = computed(() => Math.min(this.ind().escala.length, 4));
  protected nivelAuto(p: number): boolean { const s = this.calc().score; return s === p; }
  protected nivelSel(p: number, j: number): boolean { const r = this.r; return r['level'] === p && (r['j'] == null || r['j'] === j); }
  protected elegirNivel(p: number, j: number): void {
    if (!this.ed()) return;
    const r = this.r, m = this.m();
    if (m.kind === 'direct') { r['level'] = p; r['j'] = j; }
    if (m.kind === 'units') this.ponerUnidad(p);
    this.cambio();
  }

  /* ---------------- auto, radio, bpumv, doc ---------------- */
  protected auxVal(j: number): unknown { return this.r['aux']?.[j]; }
  protected aux(j: number, v: unknown): void { const r = this.r; r['aux'] = r['aux'] || {}; r['aux'][j] = v; r['rev'] = true; this.cambio(); }
  protected readonly avisoPredio = computed(() => this.ctx().plan.corrales >= 1 && PREDIO.includes(this.code()));
  protected opcion(j: number): void { this.r['opt'] = j; this.cambio(); }
  protected bp(j: number, v: boolean): void { const r = this.r; r['checks'] = r['checks'] || []; r['checks'][j] = v; r['revisado'] = true; this.cambio(); }
  protected readonly reqDoc = computed(() => REQ_DOC.concat(this.m().prof ? [['matricula', 'Firmado por MV, MVZ o Z con matrícula COMVEZCOL vigente']] : []));
  protected campo(k: string, v: unknown): void { this.r[k] = v; this.cambio(); }
  protected archivo(input: HTMLInputElement): void {
    const fl = input.files?.[0]; if (!fl) return;
    if (fl.size > 20e6) { this.notas.error('El archivo supera 20 MB.'); input.value = ''; return; }
    this.r['archivo'] = fl.name; this.cambio();
  }
  protected evidencia(input: HTMLInputElement): void {
    const fl = input.files?.[0]; if (!fl) return;
    if (fl.size > 50e6) { this.notas.error('El archivo supera el tamaño permitido.'); return; }
    const h = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    this.r['evid'] = (this.r['evid'] || []).concat(`${fl.name} · ${h}`);
    void this.datos.registrar(`Evidencia en ${this.code()}: ${fl.name}`);
    this.cambio();
  }

  /* ---------------- unidades y condición corporal ---------------- */
  protected readonly cur = signal<number | null>(null);
  protected readonly n = computed(() => nUnidades(this.ind(), this.ctx()));
  protected readonly unidades = computed(() => {
    this.t();
    const n = this.n(), u: (number | null)[] = (this.r['units'] || []).slice(0, n), m = this.m(), ctx = this.ctx(), cur = this.cur() ?? u.findIndex((x) => x == null);
    const idx = cur < 0 ? (u.length < n ? u.length : -1) : cur;
    return {
      idx,
      lista: Array.from({ length: n }, (_, i) => {
        const v = u[i] ?? null, lv = v == null ? null : m.kind === 'cc' ? ccNivel(v, ctx.e.proposito) : v, lugar = lugarUnidad(this.ind(), ctx, i);
        return { i, v, c: lv == null ? 'transparent' : COL[lv], lugar, txt: m.kind === 'cc' && v != null ? String(v) : String(i + 1) };
      }),
    };
  }, { equal: () => false });
  protected readonly textoUnidad = computed(() => {
    const { idx } = this.unidades(), n = this.n(), u = this.m().unit || 'unidad';
    return idx >= 0 ? `${u[0].toUpperCase() + u.slice(1)} ${idx + 1} de ${n}` : `Las ${n} unidades están calificadas`;
  });
  protected readonly ayudaUnidades = computed(() => {
    const m = this.m(), ctx = this.ctx(), n = this.n(), p = ctx.plan;
    if (m.unit === 'ave' || m.kind === 'cc') return `Muestra de ${n} aves según el plan de muestreo (${p.corrales ? p.corrales + ' galpón(es), ' : ''}${p.puntos} punto(s)).`;
    if (m.unit === 'bebedero') return ctx.tramo === 'traspatio' ? `Traspatio: todos los bebederos del predio (${n}, dato de la apertura).` : `2 bebederos por punto × ${p.puntos} puntos = ${n}.`;
    if (m.unit === 'comedero') return ctx.tramo === 'traspatio' ? `Traspatio: todos los comederos del predio (${n}, dato de la apertura).` : `1 comedero por punto × ${p.puntos} puntos = ${n}.`;
    return `Uno por punto de muestreo: ${n}.`;
  });
  protected readonly ccOpciones = computed(() => this.CC.map((s) => ({ s, nv: ccNivel(s, this.ctx().e.proposito) })));
  protected readonly escalaHuevo = computed(() => { const p = String(this.ctx().e.proposito).toLowerCase(); return p.includes('huevo') && !p.includes('carne'); });
  protected elegirUnidad(i: number): void { this.cur.set(i); this.r['cur'] = i; }
  protected ponerUnidad(v: number): void {
    if (!this.ed()) return;
    const r = this.r, n = this.n(); r['units'] = (r['units'] || []).slice(0, n);
    const i = this.cur() ?? r['units'].findIndex((x: unknown) => x == null), idx = i < 0 ? r['units'].length : i;
    if (idx >= n) return;
    r['units'][idx] = v; r['last'] = v; r['cur'] = null; this.cur.set(null);
    this.cambio();
  }
  protected resto(): void {
    const r = this.r, n = this.n(), v = r['last'] ?? (this.m().kind === 'cc' ? 3 : 100);
    r['units'] = (r['units'] || []).slice(0, n);
    for (let i = 0; i < n; i++) if (r['units'][i] == null) r['units'][i] = v;
    this.cambio();
  }

  /* ---------------- recursos por punto (cama, bebedero, nidal) ---------------- */
  protected readonly puntosFlex = computed(() => {
    this.t();
    const ctx = this.ctx(), pp = porPuntoDe(this.ind(), this.r, ctx), plan = ctx.plan;
    const nom = (p: number) => (plan.corrales === 2 ? `Galpón ${galponDePunto(plan, p) + 1} · P${(p % plan.puntosCorral) + 1}` : `Punto ${p + 1}`);
    return Array.from({ length: plan.puntos }, (_, p) => {
      const e = pp[p];
      const txt = !puntoListo(e) ? '<span class="muted">Pendiente</span>' : e.mismo != null ? `Es el mismo de ${esc(nom(e.mismo).split(' · ').pop())}`
        : e.nohay ? '<b style="color:var(--rojo)">No hay en el galpón · 0</b>' : (e.v || []).map((v) => `<b>${v}</b>`).join(' · ');
      return { nombre: nom(p), txt };
    });
  }, { equal: () => false });

  /* ---------------- porcentajes ---------------- */
  protected gv(g: number, k: 'total' | 'part'): string { const r = this.r; return Array.isArray(r['g']) && r['g'][g] ? r['g'][g][k] ?? '' : ''; }
  protected pg(g: number, k: 'total' | 'part', v: string): void {
    const r = this.r; r['g'] = Array.isArray(r['g']) ? r['g'] : [{}, {}]; r['g'][g] = r['g'][g] || {}; r['g'][g][k] = v;
    const gs = r['g'] as { total?: string; part?: string }[];
    const tot = gs.reduce((a, x) => a + (+(x?.total ?? 0) || 0), 0), par = gs.reduce((a, x) => a + (+(x?.part ?? 0) || 0), 0);
    const lleno = gs.every((x) => x && x.total !== undefined && x.total !== '' && x.part !== undefined && x.part !== '');
    r['total'] = lleno ? tot : ''; r['part'] = lleno ? par : '';
    this.cambio();
  }
  protected readonly muestraGanso = computed(() => (this.ev().sp === 'ganso' && /^Gansos evaluados/.test(this.m().total || '') ? this.ctx().plan.aves : null));
  protected readonly avisoMuestra = computed(() => {
    this.t(); const mg = this.muestraGanso(), v = this.r['total'];
    return mg && v !== '' && v != null && +v !== mg ? `La muestra de esta finca es de ${mg} gansos (Tabla 3). Verifique el número.` : '';
  });
  protected readonly tratAnimal = computed(() => ['GA01', 'GA03'].includes(this.code()));
  protected readonly tratDoc = computed(() => ['GA04', 'GA07'].includes(this.code()));

  /* ---------------- cálculo y gráfica ---------------- */
  protected readonly colorCalc = computed(() => { const s = this.calc().score; return s == null ? 'var(--linea)' : colorPuntaje(s); });
  protected readonly grafica = computed(() => {
    const ind = this.ind(), m = ind.m, c = this.calc(), r = this.r, ev = this.ev();
    if (m.kind === 'units' || m.kind === 'cc') {
      const lv = m.kind === 'cc' ? [100, 55, 0] : ind.escala.map((x) => x[0]).filter((v, i, a) => a.indexOf(v) === i);
      const u = m.unit || '';
      return `<div class="barras">${lv.map((p) => barraH(`Nivel ${p}`, c.dist?.[p] || 0, Math.max(1, c.n ?? 0), String(c.dist?.[p] || 0), COL[p])).join('')}</div>`
        + `<p class="muted" style="font-size:12px;margin-top:6px">${c.hechas || 0} de ${c.n} ${u === 'ave' ? 'aves calificadas' : (/[aeiou]$/.test(u) ? u + 's' : u + 'es') + ' calificados'}</p>`;
    }
    if (m.kind === 'pct') return (c.pct != null ? `<div class="barras">${barraH(esc(m.part!.split('(')[0]), c.pct, 100, fmt(c.pct) + ' %', this.colorCalc())}</div>` : '') + bandaReglaSVG(ind);
    if (m.kind === 'density') return densidadSVG(c.dens != null ? +r['peso'] : null, c.dens ?? null);
    const prev = this.datos.evals().filter((e) => e.id !== ev.id && e.finca === ev.finca && e.sp === ev.sp && e.estado === 'Finalizada')
      .map((e) => [fechaCorta(e.fecha), calcular(ind, e.resp[ind.code], contexto(e, this.finca())).score] as [string, number | null]).filter((x): x is [string, number] => x[1] != null);
    const h = prev.concat(c.score != null ? [['Hoy', c.score]] : []);
    return h.length > 1 ? columnas(h) : '<p class="muted" style="font-size:13px">No hay evaluaciones finalizadas anteriores de esta finca para comparar este indicador.</p>';
  });
  protected readonly anterior = computed(() => {
    const ant = this.ev()['anterior'] as { id: string; fecha: string; scores: Record<string, number | null> } | undefined; if (!ant) return null;
    const a = ant.scores[this.code()], sc = this.calc().score, d = a == null || sc == null ? null : sc - a;
    const cambio = d == null ? (a == null && sc != null ? ' · <b>completado en esta visita</b>' : '') : d > 0 ? ` · <b style="color:var(--campo)">sube ${fmt(d)}</b>` : d < 0 ? ` · <b style="color:var(--rojo)">baja ${fmt(-d)}</b>` : ' · sin cambio';
    return `Visita anterior (${esc(ant.id)}, ${fechaCorta(ant.fecha)}): <b>${a == null ? 'sin calificar' : fmt(a) + ' puntos'}</b>${cambio}`;
  });
  protected readonly galpones = computed(() => {
    const c = this.calc(), sc = c.score; if (!c.porGalpon || this.ctx().plan.corrales !== 2) return null;
    const html = [0, 1].map((g) => { const v = c.porGalpon![g], al = esAlertaGalpon(v, sc ?? null);
      return barraH(`Galpón ${g + 1}${al ? ' ⚠' : ''}`, v ?? 0, 100, v == null ? '—' : fmt(v) + (c.pctGalpon && c.pctGalpon[g] != null ? ` (${fmt(c.pctGalpon[g])} %)` : ''), v == null ? 'var(--linea)' : colorPuntaje(v)); }).join('');
    return { html, alerta: c.porGalpon.some((v) => esAlertaGalpon(v, sc ?? null)) };
  });

  /* ---------------- observación ---------------- */
  protected obs(): string { return this.ev().obs[this.code()] || ''; }
  protected ponerObs(v: string): void { this.ev().obs[this.code()] = v; this.cambio(); }
  protected evidencias(): string { return (this.r['evid'] || []).join(', '); }
}
