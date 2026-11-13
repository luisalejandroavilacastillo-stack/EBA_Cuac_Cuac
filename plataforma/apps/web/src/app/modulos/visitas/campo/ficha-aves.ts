import { Component, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { BotonFicha, COL } from '../../../compartido/graficas';
import { Trabajo } from '../../../nucleo/trabajo';
import { plural } from './base';

export type ValorAve = number | string;
export interface FilaAve { code: string; nombre: string; ops: [ValorAve, string, number][]; val: ValorAve | null }
/** Lo que necesita la ficha del ave (la misma para patos y gansos). */
export interface OrigenAves {
  lugar: string; n: number; ed: boolean;
  filas(k: number): FilaAve[];
  set(k: number, code: string, v: ValorAve): void;
  /** Deja el ave sin hallazgos; con soloFaltantes no toca lo ya marcado. */
  normal(k: number, soloFaltantes: boolean): void;
  /** Hallazgos graves del punto que piden observación (patos). */
  observaciones?(): { code: string; nombre: string; valor: string }[];
  ponerObs?(code: string, v: string): void;
  puntoCompleto(): boolean; ultimoPunto: boolean;
  alCerrar(k: number): void; alTerminarPunto(): void;
}

/**
 * Ficha del ave (js/vistas/ficha_ave.js): un ave a la vez, un renglón por indicador, botones con texto y color
 * y «Sin hallazgos · siguiente ave». Todo se guarda al instante.
 */
@Component({
  selector: 'app-ficha-aves',
  imports: [BotonFicha],
  host: { '(document:keydown.escape)': 'cerrar()' },
  template: `
<div class="modal" role="dialog" aria-modal="true" [attr.aria-label]="'Aves de ' + o().lugar" (click)="$event.target === $event.currentTarget && cerrar()">
  <div class="modal-ancho modal-aves ficha-ave">
    <div class="modal-cab"><div class="cab-aves"><div><small class="muted">{{ o().lugar }}</small><h3>Ave {{ k() + 1 }} de {{ o().n }}</h3>
        <p class="info-ave">@if (res().est === 'hecho') { <b class="ok">✓ Completa</b> · @if (res().hall) { <b class="hall">{{ plural(res().hall, 'hallazgo', 'hallazgos') }}</b> } @else { sin hallazgos } }
          @else { <b>{{ res().hechos }} de {{ res().total }}</b> indicadores respondidos{{ res().hechos ? ' · faltan ' + (res().total - res().hechos) : '' }} }</p></div>
        <button type="button" class="btn btn-sec btn-chico" (click)="cerrar()">Cerrar</button></div>
      <div class="chips" role="tablist" aria-label="Aves del punto">@for (t of pestanas(); track t.j) {
        <button type="button" role="tab" class="chip-punto est-{{ t.est }}" [class.actual]="t.j === k()" [attr.aria-selected]="t.j === k()" [title]="t.title" (click)="irA(t.j)">{{ t.est === 'hecho' ? '✓ ' : '' }}Ave {{ t.j + 1 }}@if (t.hall) {<i class="punto-hall" aria-hidden="true"></i>}</button> }</div>
    </div>
    <div class="modal-cuerpo" #cuerpo>
      @if (o().ed && res().est !== 'hecho') {
        <div class="sin-hallazgos"><button type="button" class="btn btn-primario btn-grande" (click)="sinHallazgos()">{{ res().est === 'pend' ? '✓ Sin hallazgos' : '✓ Lo demás sin hallazgos' }}{{ ultima() ? '' : ' · siguiente ave' }}</button>
          <span class="muted texto-chico">{{ res().est === 'pend' ? 'Deja todo normal en esta ave. Si encuentra algo, márquelo primero en su renglón.' : 'Completa como normal solo los renglones sin respuesta.' }}</span></div>
      }
      @for (f of filas(); track f.code) {
        <div class="fila-campo fila-ave" [class.fila-falta]="f.val == null && res().est === 'proceso'">
          <div><b>{{ f.nombre }}</b> <app-btn-ficha [code]="f.code" />@if (f.val == null && res().est === 'proceso') { <span class="etiqueta-falta">Falta</span> }</div>
          <div class="niveles-campo n{{ f.ops.length }}">@for (op of f.ops; track op[0]) {
            <button type="button" class="nv" [class.sel]="f.val === op[0]" [style.--c]="COL[op[2]]" [disabled]="!o().ed" [attr.aria-pressed]="f.val === op[0]" (click)="poner(f.code, op[0])"><span>{{ op[1] }}</span></button> }</div>
        </div>
      }
      @if (obs().length) {
        <div class="obs-aves"><h4>Hallazgos graves en las aves de este punto</h4><p class="muted texto-chico">Describa lo observado (queda en la observación del indicador).</p>
          @for (x of obs(); track x.code) { <div class="campo"><label [for]="'ob_' + x.code">{{ x.nombre }}</label><textarea [id]="'ob_' + x.code" rows="2" [value]="x.valor" [disabled]="!o().ed" (input)="o().ponerObs?.(x.code, $any($event.target).value)"></textarea></div> }</div>
      }
    </div>
    <div class="acciones"><span class="guardado" style="margin-right:auto" role="status">{{ guardado() }}</span>
      <button type="button" class="btn btn-sec" [disabled]="k() === 0" (click)="irA(k() - 1)">← Ave anterior</button>
      @if (!ultima()) { <button type="button" class="btn btn-primario" (click)="irA(k() + 1)">Siguiente ave →</button> }
      @else if (completo()) { <button type="button" class="btn btn-primario" (click)="o().alTerminarPunto()">{{ o().ultimoPunto ? 'Recorrido completo · continuar' : 'Punto completo · siguiente punto →' }}</button> }
      @else { <button type="button" class="btn btn-primario" (click)="cerrar()">Volver al punto</button> }
    </div>
  </div>
</div>`,
})
export class FichaAves {
  readonly o = input.required<OrigenAves>();
  readonly k0 = input(0);
  /** Texto de «Guardado …» de la pantalla. */
  readonly guardado = input('');
  private readonly trabajo = inject(Trabajo);
  private readonly cuerpo = viewChild<ElementRef<HTMLElement>>('cuerpo');
  protected readonly COL = COL;
  protected readonly plural = plural;
  protected readonly k = signal(0);

  constructor() {
    effect(() => { const k0 = this.k0(); untracked(() => this.k.set(Math.min(Math.max(0, k0), this.o().n - 1))); });
  }

  private nivel(f: FilaAve) { const op = f.ops.find(([v]) => v === f.val); return op ? op[2] : 100; }
  private resumen(j: number) {
    const fs = this.o().filas(j), resp = fs.filter((f) => f.val != null), hall = resp.filter((f) => this.nivel(f) < 100);
    return { total: fs.length, hechos: resp.length, hall: hall.length, est: (resp.length === fs.length ? 'hecho' : resp.length ? 'proceso' : 'pend') as 'hecho' | 'proceso' | 'pend' };
  }
  protected readonly filas = computed(() => { this.trabajo.tick(); return this.o().filas(this.k()); }, { equal: () => false });
  protected readonly res = computed(() => { this.trabajo.tick(); return this.resumen(this.k()); }, { equal: () => false });
  protected readonly pestanas = computed(() => { this.trabajo.tick();
    return Array.from({ length: this.o().n }, (_, j) => { const s = this.resumen(j);
      return { j, est: s.est, hall: s.hall, title: `Ave ${j + 1}: ${s.est === 'hecho' ? 'completa' : s.est === 'proceso' ? 'a medias' : 'sin revisar'}${s.hall ? ` · ${plural(s.hall, 'hallazgo', 'hallazgos')}` : ''}` }; }); }, { equal: () => false });
  protected readonly obs = computed(() => { this.trabajo.tick(); return this.o().observaciones?.() ?? []; }, { equal: () => false });
  protected readonly ultima = computed(() => this.k() >= this.o().n - 1);
  protected readonly completo = computed(() => { this.trabajo.tick(); return this.o().puntoCompleto(); });

  protected irA(j: number): void { this.k.set(j); this.arriba(); }
  private arriba(): void { const c = this.cuerpo()?.nativeElement; if (c) c.scrollTop = 0; }
  protected cerrar(): void { this.o().alCerrar(this.k()); }
  protected poner(code: string, v: ValorAve): void { if (this.o().ed) this.o().set(this.k(), code, v); }
  protected sinHallazgos(): void {
    this.o().normal(this.k(), this.res().est !== 'pend');
    if (!this.ultima()) this.k.update((x) => x + 1);
    this.arriba();
  }
}
