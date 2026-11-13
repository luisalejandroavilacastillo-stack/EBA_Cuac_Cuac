import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { INDICADOR, nombreEspecie, puede } from '@eba/norma';
import { Asistente, type Mensaje } from '../nucleo/asistente';
import { Datos } from '../nucleo/datos';
import { Sesion } from '../nucleo/sesion';
import { HtmlPipe, esc } from './graficas';

export const ICONO_ASISTENTE = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
  <path d="M6 7.5A3.5 3.5 0 0 1 9.5 4h13A3.5 3.5 0 0 1 26 7.5v9a3.5 3.5 0 0 1-3.5 3.5H14l-6 5v-5.2A3.5 3.5 0 0 1 6 16.5z" fill="currentColor" opacity=".18"/>
  <path d="M6 7.5A3.5 3.5 0 0 1 9.5 4h13A3.5 3.5 0 0 1 26 7.5v9a3.5 3.5 0 0 1-3.5 3.5H14l-6 5v-5.2A3.5 3.5 0 0 1 6 16.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  <circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="20" cy="12" r="1.6" fill="currentColor"/>
  <path d="M12.5 15.5c1.9 1.4 5.1 1.4 7 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M27.5 2.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" fill="var(--cosecha)"/></svg>`;
const NOMBRE_ROL: Record<string, string> = { inspector: 'Inspector', coordinador: 'Coordinador', admin: 'Administrador', productor: 'Productor' };

/** Formato de un mensaje: el del usuario como texto; el del asistente con Markdown mínimo y seguro. */
export const htmlMensaje = (m: Mensaje, md: (t: string) => string) =>
  `${m.rol === 'u' ? `<p>${esc(m.texto)}</p>` : md(m.texto)}${m.rol === 'a' && m.nota ? `<span class="fuente">${esc(m.nota)}</span>` : ''}`;

/**
 * Botón «¿Necesitas ayuda?» y ventana flotante del asistente (asistente_norma.js del prototipo): toma el contexto de la
 * pantalla (evaluación, indicador abierto o finca) y responde sin sacar al usuario de lo que está haciendo.
 */
@Component({
  selector: 'app-asistente-flotante',
  imports: [HtmlPipe],
  host: { '(document:keydown.escape)': 'asis.abierto.set(false)' },
  template: `
@if (visibleBoton()) {
  <a class="fab-asistente" [href]="href()" aria-label="Abrir el asistente virtual de bienestar animal" (click)="abrir($event)">
    <span class="fab-icono" [innerHTML]="icono | html"></span><span class="fab-texto"><b>¿Necesitas ayuda?</b><small>Asistente virtual</small></span></a>
}
@if (asis.abierto() && cx(); as c) {
  <aside class="asis-panel" role="dialog" aria-label="Asistente de la norma">
    <header class="ap-cab"><span class="ap-ico" [innerHTML]="icono | html"></span><div><b>Asistente de la norma ICA</b><small>{{ rol() }} · {{ asis.nombreModo() }}</small></div>
      <button type="button" class="ap-cerrar" aria-label="Cerrar el asistente" (click)="asis.abierto.set(false)">✕</button></header>
    <p class="ap-ctx" [innerHTML]="ctxTxt() | html"></p>
    <div class="chat-msgs ap-msgs" #msgs aria-live="polite">
      @for (m of mensajes(); track $index) { <div class="msg" [class.msg-u]="m.rol === 'u'" [class.msg-a]="m.rol === 'a'" [innerHTML]="html(m) | html"></div> }
      @if (ocupado()) { <div class="msg msg-a msg-escribiendo">El asistente está escribiendo…</div> }
    </div>
    <div class="chat-sug ap-sug">@for (s of sugerencias(); track s) { <button type="button" (click)="enviar(s)">{{ s }}</button> }</div>
    <form class="chat-form ap-form" (submit)="$event.preventDefault(); enviar(pregunta.value); pregunta.value = ''">
      <label class="sr" for="apQ">Escriba su pregunta</label>
      <textarea #pregunta id="apQ" rows="2" maxlength="800" [placeholder]="tecnico() ? 'Ej.: ¿cómo califico la cama si está húmeda solo junto al bebedero?' : 'Ej.: ¿qué debo mejorar primero?'"
        (keydown.enter)="tecla($any($event), pregunta)"></textarea>
      <button class="btn btn-primario" [disabled]="ocupado()">Enviar</button></form>
    <p class="aviso-asis">Responde solo sobre la norma del ICA y cita de dónde sale. Es orientativo: no reemplaza el criterio del inspector ni la revisión de un médico veterinario.</p>
  </aside>
}`,
})
export class AsistenteFlotante {
  protected readonly asis = inject(Asistente);
  private readonly datos = inject(Datos);
  private readonly sesion = inject(Sesion);
  private readonly router = inject(Router);
  private readonly caja = viewChild<ElementRef<HTMLElement>>('msgs');
  protected readonly icono = ICONO_ASISTENTE;
  protected readonly ocupado = signal(false);
  private readonly version = signal(0);

  private readonly url = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url), startWith(this.router.url)), { initialValue: this.router.url });
  private readonly partes = computed(() => this.url().split('?')[0].split('/').filter(Boolean));
  protected readonly visibleBoton = computed(() => { const u = this.sesion.usuario(); return !!u && puede(u.perfil, 'asistente') && this.partes()[0] !== 'asistente' && !this.asis.abierto(); });
  protected readonly rol = computed(() => NOMBRE_ROL[this.sesion.usuario()?.perfil ?? ''] ?? '');
  protected readonly tecnico = computed(() => this.asis.motor().esTecnico());
  private readonly location = inject(Location);
  /** Dirección de la página completa del asistente (para abrirla en otra pestaña); el clic normal abre la ventana flotante. */
  protected readonly href = computed(() => { const p = this.partes();
    return this.location.prepareExternalUrl((p[0] === 'visitas' || p[0] === 'fincas') && p[1] ? `/asistente/${p[1]}` : '/asistente'); });

  /** Finca, evaluación e indicador de la pantalla actual (contextoPantalla del prototipo). */
  protected readonly cx = computed(() => {
    const m = this.asis.motor(), p = this.partes(), fs = m.fincasAsistente(), productor = this.sesion.usuario()?.perfil === 'productor';
    let ev = null, f = null, foco = null;
    if (p[0] === 'visitas' && p[1]) {
      ev = this.datos.evals().find((e) => e.id === p[1]) ?? null; if (ev && !fs.some((x: { id: string }) => x.id === ev!.finca)) ev = null;
      if (ev) { f = this.datos.finca(ev.finca) ?? null; const i = p[2] ? INDICADOR[p[2]] : null; if (i && i.sp === ev.sp) foco = i; }
    } else if ((p[0] === 'fincas' || p[0] === 'asistente') && p[1]) f = fs.find((x: { id: string }) => x.id === p[1]) ?? null;
    if (!f && productor) f = fs.find((x: { id: string }) => m.evaluacionPorDefecto(x.id)) ?? fs[0] ?? null;
    if (f && !ev && productor) ev = m.evaluacionPorDefecto(f.id);
    const cx = f ? m.contextoAsistente(f, ev) : { f: null, ev: null, especies: ['pato', 'ganso'] };
    cx.foco = foco; cx.recorrido = p[2] === 'recorrido';
    return cx;
  });
  private readonly clave = computed(() => { const c = this.cx(); return `${this.sesion.usuario()?.perfil}|${c.ev ? c.ev.id : c.f ? c.f.id : 'general'}`; });
  protected readonly mensajes = computed(() => { this.version(); return [...this.asis.conversacion(this.clave(), () => this.asis.motor().bienvenida(this.cx()))]; });
  protected readonly sugerencias = computed(() => this.asis.motor().sugerenciasRol(this.cx()) as string[]);
  protected readonly ctxTxt = computed(() => {
    const c = this.cx();
    return c.foco ? `Indicador <b>${c.foco.num} ${esc(c.foco.name)}</b> · ${esc(c.ev.id)}` : c.ev ? `Evaluación <b>${esc(c.ev.id)}</b> · ${esc(c.f.nombre)} · ${nombreEspecie(c.ev.sp)}` : c.f ? `Finca <b>${esc(c.f.nombre)}</b>` : 'Preguntas generales de la norma';
  });
  protected html(m: Mensaje): string { return htmlMensaje(m, this.asis.motor().mdSeguro); }

  constructor() {
    effect(() => { document.body.classList.toggle('con-fab', this.visibleBoton()); document.body.classList.toggle('con-asis', this.asis.abierto()); });
    effect(() => { this.mensajes(); this.ocupado(); const c = this.caja()?.nativeElement; if (c) setTimeout(() => (c.scrollTop = c.scrollHeight)); });
  }

  protected tecla(e: KeyboardEvent, ta: HTMLTextAreaElement): void { if (e.shiftKey) return; e.preventDefault(); void this.enviar(ta.value); ta.value = ''; }
  protected abrir(e: MouseEvent): void { if (e.ctrlKey || e.metaKey) return; e.preventDefault(); this.asis.abierto.set(true); setTimeout(() => document.getElementById('apQ')?.focus(), 50); }

  protected async enviar(q: string): Promise<void> {
    q = String(q || '').trim(); if (!q || this.ocupado()) return;
    this.ocupado.set(true);
    const c = this.cx(), conv = this.asis.conversacion(this.clave(), () => this.asis.motor().bienvenida(c));
    const p = this.asis.responder(conv, q, c, 'Respuesta generada con IA a partir de la norma. Verifique con la ficha del indicador.',
      'Respuesta con el texto de la norma y los datos de la plataforma.', 'No se pudo conectar con la IA. Respondí con el texto de la norma',
      `Consulta al asistente (${this.rol() || this.sesion.usuario()?.perfil})${c.ev ? ` sobre ${c.ev.id}` : ''}`);
    this.version.update((n) => n + 1);
    await p;
    this.ocupado.set(false); this.version.update((n) => n + 1);
  }
}
