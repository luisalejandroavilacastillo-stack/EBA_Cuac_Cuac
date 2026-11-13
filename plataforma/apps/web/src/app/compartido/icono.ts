import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/** Iconos del menú, los mismos del prototipo (js/ui/iconos.js). Son constantes del código, no contenido del usuario. */
const ICONOS: Record<string, string> = {
  inicio: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  fincas: '<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-5h6v5"/>',
  evaluaciones: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  reportes: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  usuarios: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 1 0 0-6M22 21c0-3-2-5-5-5.5"/>',
  parametros: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  bitacora: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  asistente: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 10h.01M12 10h.01M15.5 10h.01"/>',
  ayuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h0"/>',
  cuenta: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  campana: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>',
};

@Component({
  selector: 'app-icono',
  template: `<span class="icono-svg" aria-hidden="true" [innerHTML]="svg()"></span>`,
  styles: `:host { display: inline-flex; } .icono-svg { display: inline-flex; } .icono-svg ::ng-deep svg { width: 20px; height: 20px; }`,
})
export class Icono {
  readonly nombre = input.required<string>();
  private readonly san = inject(DomSanitizer);
  protected readonly svg = computed(() =>
    this.san.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONOS[this.nombre()] ?? ''}</svg>`));
}
