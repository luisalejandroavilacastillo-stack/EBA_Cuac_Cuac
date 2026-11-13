import { Component, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { COLOR_PROCESO, fmt } from '@eba/norma';
import { htmlMensaje } from '../../compartido/asistente-flotante';
import { HtmlPipe } from '../../compartido/graficas';
import { fechaCorta } from '../../compartido/flujo-ui';
import { Asistente, type Mensaje } from '../../nucleo/asistente';
import { Datos } from '../../nucleo/datos';
import { Migas } from '../../nucleo/migas';

/** Asistente de bienestar animal en pantalla completa (vAsistente del prototipo): finca, evaluación, contexto y conversación. */
@Component({
  selector: 'app-pagina-asistente',
  imports: [HtmlPipe, RouterLink],
  templateUrl: './asistente.html',
})
export class PaginaAsistente {
  /** Evaluación (EVA-…) o finca (FIN-…). */
  readonly id = input<string>();
  protected readonly asis = inject(Asistente);
  private readonly datos = inject(Datos);
  private readonly router = inject(Router);
  private readonly caja = viewChild<ElementRef<HTMLElement>>('msgs');
  protected readonly fmt = fmt;
  protected readonly fechaCorta = fechaCorta;
  protected readonly COLOR_PROCESO = COLOR_PROCESO as Record<string, string>;
  protected readonly ocupado = signal(false);
  private readonly version = signal(0);

  protected readonly fincas = computed(() => this.asis.motor().fincasAsistente());
  protected readonly sel = computed(() => {
    const m = this.asis.motor(), fs = this.fincas(), id = this.id() ?? '';
    let ev = null, f = null;
    if (id.startsWith('FIN-')) f = fs.find((x) => x.id === id) ?? null;
    else if (id) { ev = this.datos.evals().find((e) => e.id === id) ?? null; if (ev && (!fs.some((x) => x.id === ev!.finca) || ev.estado === 'Programada')) ev = null; }
    if (ev) f = fs.find((x) => x.id === ev!.finca) ?? null;
    if (!f) f = fs.find((x) => m.evaluacionPorDefecto(x.id)) ?? fs[0] ?? null;
    if (f && !ev) ev = m.evaluacionPorDefecto(f.id);
    return { f, ev };
  });
  protected readonly cx = computed(() => { const { f, ev } = this.sel(); return f ? this.asis.motor().contextoAsistente(f, ev) : null; });
  protected readonly evals = computed(() => (this.sel().f ? this.asis.motor().evaluacionesDeFinca(this.sel().f!.id) : []));
  private readonly clave = computed(() => `pagina|${this.sel().ev?.id ?? this.sel().f?.id}`);
  private bienvenida(): string {
    const cx = this.cx()!, ev = this.sel().ev, f = this.sel().f!, m = this.asis.motor();
    return `Hola. Soy el asistente de bienestar animal. ${ev ? `Tengo a la mano su evaluación **${ev.id}** de ${m.nombreEsp(ev.sp)} (${fmt(cx.r.total)} puntos, nivel ${cx.r.nivel[0]}) y su plan de mejora.` : `Su finca ${f.nombre} todavía no tiene evaluaciones; puedo explicarle lo que revisa la norma.`} Escriba su duda o elija una pregunta.`;
  }
  protected readonly mensajes = computed(() => { this.version(); return this.cx() ? [...this.asis.conversacion(this.clave(), () => this.bienvenida())] : []; });
  protected readonly sugerencias = computed(() => (this.cx() ? (this.asis.motor().sugerencias(this.cx()) as string[]) : []));
  protected readonly positivo = (x: { score: number }) => x.score > 0;
  protected html(m: Mensaje): string { return htmlMensaje(m, this.asis.motor().mdSeguro); }
  protected plazo(iso: string): string { return this.asis.motor().textoPlazo(iso); }
  protected nombreVisita = (ev: Parameters<ReturnType<Datos['flujo']>['nombreVisita']>[0]) => this.datos.flujo().nombreVisita(ev);

  constructor() {
    inject(Migas).niveles.set([{ texto: 'Asistente' }]);
    effect(() => { this.mensajes(); this.ocupado(); const c = this.caja()?.nativeElement; if (c) setTimeout(() => (c.scrollTop = c.scrollHeight)); });
  }

  protected ir(id: string): void { void this.router.navigate(['/asistente', id]); }
  protected tecla(e: KeyboardEvent, ta: HTMLTextAreaElement): void { if (e.shiftKey) return; e.preventDefault(); void this.enviar(ta.value); ta.value = ''; }
  protected async enviar(q: string): Promise<void> {
    q = String(q || '').trim(); const cx = this.cx(); if (!q || this.ocupado() || !cx) return;
    this.ocupado.set(true);
    const { ev, f } = this.sel(), conv = this.asis.conversacion(this.clave(), () => this.bienvenida());
    const p = this.asis.responder(conv, q, cx, 'Respuesta generada con IA a partir de su evaluación. Verifique con el inspector o su veterinario.',
      'Respuesta con los datos de su evaluación y la norma.', 'No se pudo conectar con la IA. Respondí con los datos de su evaluación',
      `Consulta al asistente${ev ? ` sobre ${ev.id}` : ` (${f!.nombre})`}`);
    this.version.update((n) => n + 1);
    await p;
    this.ocupado.set(false); this.version.update((n) => n + 1);
  }
}
