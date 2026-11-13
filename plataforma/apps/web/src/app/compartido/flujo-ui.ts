import { Component, computed, inject, input } from '@angular/core';
import { COLOR_FLUJO, constanciaVigente, fmt, hoyISO, nivelDe, nombreEspecie, type AccionFlujo, type EstadoLinea } from '@eba/norma';
import { Datos } from '../nucleo/datos';
import { Acciones } from '../nucleo/acciones';
import { EnlaceVisita } from './enlace-visita';

export const fechaCorta = (iso: string | null | undefined) => (iso ? new Date(iso.length === 10 ? iso + 'T07:00' : iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

/** Botón de una acción del flujo: abre la visita, o las ventanas de asignar, reasignar o reprogramar. */
@Component({
  selector: 'app-accion-flujo',
  imports: [EnlaceVisita],
  template: `@let a = accion();
    @if (a.eval) { <app-enlace-visita [id]="a.eval.id" [paso]="a.eval.paso" [clase]="clase()">{{ a.texto }}</app-enlace-visita> }
    @else { <button type="button" [class]="clase()" (click)="abrir()">{{ a.texto }}</button> }`,
  styles: `:host { display: contents; }`,
})
export class AccionFlujoBoton {
  readonly accion = input.required<AccionFlujo>();
  readonly finca = input.required<string>();
  readonly secundaria = input(false);
  private readonly acc = inject(Acciones);
  protected readonly clase = computed(() => 'btn btn-chico btn-accion ' + (this.secundaria() || this.accion().sec ? 'btn-sec' : 'btn-primario'));
  protected abrir() {
    const a = this.accion();
    if (a.asignar) this.acc.asignando.set(a.asignar);
    else if (a.reasignar) this.acc.reasignando.set(a.reasignar);
    else if (a.reprog) this.acc.reprogramando.set(a.reprog);
  }
}

/** Etiqueta del estado según quien mira (en una finca inactiva sin visita aprobada: «Finca inactiva»). */
@Component({
  selector: 'app-etiqueta-flujo',
  template: `@if (inactiva()) { <span class="etiqueta e-gris">Finca inactiva</span> } @else { <span [class]="'etiqueta ' + clase()">{{ texto() }}</span> }`,
  styles: `:host { display: contents; }`,
})
export class EtiquetaFlujo {
  readonly s = input.required<EstadoLinea>();
  private readonly datos = inject(Datos);
  protected readonly inactiva = computed(() => this.s().f.estado !== 'ACTIVA' && this.s().estado !== 'Aprobada');
  protected readonly texto = computed(() => this.datos.flujo().textoFlujo(this.s()));
  protected readonly clase = computed(() => COLOR_FLUJO[this.texto()]);
}

interface Detalle {
  tipo: 'productor' | 'avance' | 'preliminar' | 'seguimiento' | 'asignada' | 'sin' | 'aprobada';
  visita?: string; texto?: string; quien?: string; hechos?: number; ap?: number; pct?: number; total?: string; nivel?: string; fecha?: string;
  vencido?: boolean; provisional?: boolean; constancia?: string; vigente?: boolean; proceso?: string;
}

/** Línea de una especie: estado, detalle (inspector, avance, fecha o puntaje) y la acción que corresponde al perfil. */
@Component({
  selector: 'app-linea-flujo',
  imports: [EtiquetaFlujo, AccionFlujoBoton],
  template: `
<div class="flujo-linea" [attr.data-estado]="texto()">
  <span class="flujo-sp">{{ especie() }}</span><app-etiqueta-flujo [s]="s()" />
  <span class="flujo-det">
    @switch (d().tipo) {
      @case ('productor') { <span>{{ d().visita }} · {{ d().texto }}</span> }
      @case ('avance') {
        @if (d().hechos) { <span class="mini-avance" [title]="d().hechos + ' de ' + d().ap + ' indicadores calificados'"><i [style.width.%]="d().pct"></i></span> }
        <span>{{ d().visita }} · <b>{{ d().pct }} %</b>@if (d().quien) { · <span class="muted">{{ d().quien }}</span> }</span>
      }
      @case ('preliminar') { <span>{{ d().visita }} · preliminar <b>{{ d().total }}</b> {{ d().nivel }}@if (d().quien) { · <span class="muted">{{ d().quien }}</span> }</span> }
      @case ('seguimiento') {
        <span>{{ d().visita }} · {{ d().fecha }}@if (d().vencido) { <span class="etiqueta e-alerta">Vencido</span> }@if (d().quien) { · <span class="muted">{{ d().quien }}</span> }
          · <span class="muted">último resultado {{ d().total }} {{ d().nivel }}</span></span>
      }
      @case ('asignada') { <span>{{ d().visita }} · {{ d().fecha }}@if (d().quien) { · <span class="muted">{{ d().quien }}</span> }</span> }
      @case ('sin') { <span class="muted">{{ d().texto }}</span> }
      @default {
        <span>@if (d().constancia) { <span [class]="'etiqueta ' + (d().vigente ? 'e-ok' : 'e-gris')" [title]="'Constancia ' + d().constancia">✔ {{ d().vigente ? 'Certificada' : 'Constancia vencida' }}</span> }
          <b>{{ d().total }}</b> · {{ d().nivel }}{{ d().provisional ? ' (provisional)' : '' }} · {{ d().fecha }}@if (d().proceso) { · <span class="muted">{{ d().proceso }}</span> }</span>
      }
    }
  </span>
  @if (conAcciones()) {
    <span class="flujo-acc">
      @if (s().f.estado !== 'ACTIVA' && !s().principal) { <span class="accion-texto">Finca inactiva</span> }
      @else if (!s().principal) { <span class="accion-texto">{{ s().nota || (productor() && s().abierta ? 'En manos del ICA' : '—') }}</span> }
      @else {
        <app-accion-flujo [accion]="s().principal!" [finca]="s().f.id" />
        @if (s().secundaria) { <app-accion-flujo [accion]="s().secundaria!" [finca]="s().f.id" [secundaria]="true" /> }
      }
    </span>
  }
</div>`,
  styles: `:host { display: contents; }`,
})
export class LineaFlujo {
  readonly s = input.required<EstadoLinea>();
  readonly conAcciones = input(true);
  private readonly datos = inject(Datos);
  protected readonly especie = computed(() => nombreEspecie(this.s().sp));
  protected readonly texto = computed(() => this.datos.flujo().textoFlujo(this.s()));
  protected readonly productor = computed(() => this.datos.flujo().esProductor);
  /** Detalle de la línea (mismas reglas que lineaFlujo() del prototipo). */
  protected readonly d = computed((): Detalle => {
    const s = this.s(), flujo = this.datos.flujo(), ab = s.abierta, prod = flujo.esProductor;
    const quien = ab && !prod ? this.datos.nombreUsuario(ab.inspector) : '';
    if (prod && ab && s.estado !== 'Seguimiento programado')
      return { tipo: 'productor', visita: flujo.nombreVisita(ab), texto: s.estado === 'Pendiente de aprobación' ? 'el ICA revisa el resultado antes de publicarlo' : `visita del ${fechaCorta(ab.fecha)}` };
    if ((s.estado === 'En proceso' || s.estado === 'Devuelta') && ab) { const a = flujo.avance(ab); return { tipo: 'avance', visita: flujo.nombreVisita(ab), ...a, quien }; }
    if (s.estado === 'Pendiente de aprobación' && ab) { const r = flujo.resultado(ab); return { tipo: 'preliminar', visita: flujo.nombreVisita(ab), total: fmt(r.total), nivel: r.nivel[0], quien }; }
    if (s.estado === 'Seguimiento programado' && ab && s.ultimaFin) { const r = flujo.resultado(s.ultimaFin);
      return { tipo: 'seguimiento', visita: flujo.nombreVisita(ab), fecha: fechaCorta(ab.fecha), vencido: ab.fecha < hoyISO(), quien, total: fmt(r.total), nivel: r.nivel[0] }; }
    if (s.estado === 'Asignada' && ab) return { tipo: 'asignada', visita: flujo.nombreVisita(ab), fecha: fechaCorta(ab.fecha), quien };
    if (s.estado === 'Por asignar' || !s.ev) return { tipo: 'sin', texto: s.ultimaFin ? 'Sin visita programada' : 'Sin evaluaciones' };
    const ev = s.ev, r = flujo.resultado(ev), c = ev.constancia, p = s.proc;
    return { tipo: 'aprobada', total: fmt(r.total), nivel: r.nivel[0], provisional: r.provisional, fecha: fechaCorta(ev.fecha), constancia: c?.codigo ?? '',
      vigente: constanciaVigente(c), proceso: p ? (p.estado === 'En seguimiento' ? `seguimientos ${p.usados} de ${p.max}` : p.estado.toLowerCase()) : '' };
  });
}

/** Barras horizontales etiquetadas (cada fila con nombre y valor; el color nunca va solo). */
@Component({
  selector: 'app-barras',
  template: `<div class="barras-tab">@for (b of filas(); track b.l) {
    <div class="bt-fila" [title]="b.l + ': ' + valor(b.v)"><span class="bt-l">{{ b.l }}@if (b.sub) { <small class="muted"> {{ b.sub }}</small> }</span>
      <span class="bt-pista"><i [style.width.%]="ancho(b.v)" [style.background]="b.c"></i></span><b>{{ valor(b.v) }}</b>@if (b.extra) { <small [class]="b.extraClase || 'muted'">{{ b.extra }}</small> }</div>
  }</div>`,
})
export class Barras {
  readonly filas = input.required<{ l: string; v: number; c: string; sub?: string; extra?: string; extraClase?: string }[]>();
  readonly max = input(0);
  readonly decimales = input(false);
  protected valor = (v: number) => (this.decimales() ? fmt(v) : String(v));
  protected ancho(v: number) { const m = this.max() || Math.max(1, ...this.filas().map((f) => f.v)); return m ? Math.max(v > 0 ? 3 : 0, (v / m) * 100) : 0; }
}

/** Evolución del puntaje total (bandas de color = niveles de la Tabla 2). */
@Component({
  selector: 'app-evolucion',
  template: `
<figure class="grafica"><svg viewBox="0 0 400 178" role="img" aria-label="Evolución del puntaje">
  @for (b of bandas; track b[0]) { <rect [attr.x]="X0" [attr.y]="y(b[1])" [attr.width]="X1 - X0" [attr.height]="y(b[0]) - y(b[1])" [style.fill]="b[2]" /> }
  @for (v of [0, 50, 75, 90, 100]; track v) { <text [attr.x]="X0 - 6" [attr.y]="y(v) + 4" text-anchor="end" style="font-size:9px;font-weight:600;fill:var(--gris)">{{ v }}</text> }
  @if (puntos().length > 1) { <polyline [attr.points]="linea()" style="fill:none;stroke:var(--semilla);stroke-width:2.5" /> }
  @for (p of puntos(); track $index) {
    <circle [attr.cx]="x($index)" [attr.cy]="y(p[1])" r="5.5" [style.fill]="color(p[1])" style="stroke:#fff;stroke-width:2"><title>{{ p[0] }}: {{ txt(p[1]) }} puntos · {{ nivel(p[1]) }}{{ p[2] ? ' (provisional)' : '' }}</title></circle>
    <text [attr.x]="x($index)" [attr.y]="y(p[1]) < 26 ? y(p[1]) + 20 : y(p[1]) - 10" text-anchor="middle" style="font-size:10px;font-weight:900;fill:var(--tinta)">{{ txt(p[1]) }}{{ p[2] ? '*' : '' }}</text>
    <text [attr.x]="x($index)" y="170" text-anchor="middle" style="font-size:10px;font-weight:600;fill:var(--gris)">{{ p[0] }}</text>
  }
</svg><figcaption>Bandas de color = niveles de la Tabla 2. * resultado preliminar o provisional.</figcaption></figure>`,
})
export class Evolucion {
  /** [etiqueta, puntaje, provisional] */
  readonly puntos = input.required<[string, number, boolean][]>();
  protected readonly X0 = 36; protected readonly X1 = 384;
  protected readonly bandas: [number, number, string][] = [[0, 50, 'rgba(138,52,49,.07)'], [50, 75, 'rgba(168,166,0,.08)'], [75, 90, 'rgba(134,179,39,.10)'], [90, 100, 'rgba(4,140,56,.12)']];
  protected x = (i: number) => { const n = this.puntos().length; return n === 1 ? (this.X0 + this.X1) / 2 : this.X0 + 22 + (i / (n - 1)) * (this.X1 - this.X0 - 40); };
  protected y = (v: number) => 150 - (v / 100) * (150 - 12);
  protected linea = computed(() => this.puntos().map((p, i) => `${this.x(i)},${this.y(p[1])}`).join(' '));
  protected color = (v: number) => nivelDe(v)[1];
  protected nivel = (v: number) => nivelDe(v)[0];
  protected txt = (v: number) => fmt(v);
}

/** Escala de la Tabla 2 con la marca del puntaje. */
@Component({
  selector: 'app-escala-nivel',
  template: `
<figure class="grafica"><svg viewBox="0 0 400 78" role="img" aria-label="Clasificación de la Tabla 2">
  @for (s of seg; track s[2]) { <rect [attr.x]="x(s[0])" y="18" [attr.width]="x(s[1]) - x(s[0]) - 1" height="22" [style.fill]="s[3]" />
    <text [attr.x]="(x(s[0]) + x(s[1])) / 2" y="33" text-anchor="middle" style="font-size:10px;font-weight:900;fill:#fff">{{ s[2] }}</text> }
  @for (v of [0, 50, 75, 90, 100]; track v) { <text [attr.x]="x(v)" y="56" text-anchor="middle" style="font-size:10px;font-weight:700;fill:var(--gris)">{{ v }}</text> }
  @if (total() != null) {
    <path [attr.d]="'M' + x(total()!) + ' 16 l-6 -10 h12 z'" style="fill:var(--tinta)" />
    <text [attr.x]="marca()" y="74" text-anchor="middle" style="font-size:11px;font-weight:900;fill:var(--tinta)">Puntaje {{ txt() }}</text>
  }
</svg><figcaption>Tabla 2 · Excelente ≥ 90 · Alto ≥ 75 y &lt; 90 · Medio ≥ 50 y &lt; 75 · Bajo &lt; 50.</figcaption></figure>`,
})
export class EscalaNivel {
  readonly total = input<number | null>(null);
  protected readonly seg: [number, number, string, string][] = [[0, 50, 'Bajo', 'var(--rojo)'], [50, 75, 'Medio', '#A8A600'], [75, 90, 'Alto', 'var(--siembra)'], [90, 100, 'Exc.', 'var(--campo)']];
  protected x = (v: number) => 10 + (v / 100) * 380;
  protected marca = computed(() => Math.min(345, Math.max(45, this.x(this.total() ?? 0))));
  protected txt = computed(() => fmt(this.total()));
}
