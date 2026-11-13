import { AsistenteFlotante } from '../compartido/asistente-flotante';
import { FichaIndicadorPanel } from '../compartido/graficas';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Icono } from '../compartido/icono';
import { Avisos } from '../nucleo/avisos';
import { Dialogo } from '../nucleo/dialogo';
import { menuDe } from '../nucleo/menu';
import { Sesion } from '../nucleo/sesion';
import { Migas } from '../nucleo/migas';
import { Datos, rutaDeAviso } from '../nucleo/datos';
import { VentanasVisita } from '../compartido/ventanas-visita';

/**
 * Marco de la aplicación: el mismo de shell() del prototipo.
 * Menú lateral según el perfil, nombre y cierre de sesión, barra con la ruta y los avisos.
 */
@Component({
  selector: 'app-marco',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono, VentanasVisita, FichaIndicadorPanel, AsistenteFlotante],
  templateUrl: './marco.html',
  styleUrl: './marco.scss',
})
export class Marco {
  protected readonly sesion = inject(Sesion);
  protected readonly avisos = inject(Avisos);
  protected readonly migas = inject(Migas);
  protected readonly datos = inject(Datos);
  private readonly dialogo = inject(Dialogo);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly opciones = computed(() => menuDe(this.sesion.perfil()));
  protected readonly menuAbierto = signal(false);
  protected readonly panelAbierto = signal(false);

  /** Título de la pantalla actual para la barra superior (title o data.titulo de la ruta más interna). */
  protected readonly titulo = toSignal(this.router.events.pipe(
    filter((e) => e instanceof NavigationEnd), startWith(null),
    map(() => {
      let r = this.ruta.snapshot;
      while (r.firstChild) r = r.firstChild;
      const t = (typeof r.routeConfig?.title === 'string' ? r.routeConfig.title : '') || (r.data['titulo'] as string) || '';
      this.menuAbierto.set(false); this.panelAbierto.set(false);
      return t.replace(/ · EBA$/, '');
    })), { initialValue: '' });

  constructor() {
    // Cada pantalla vuelve a poner su ruta de varios niveles (si la tiene).
    this.router.events.pipe(filter((e) => e instanceof NavigationStart), takeUntilDestroyed()).subscribe(() => this.migas.niveles.set(null));
  }

  protected alternarPanel(e: Event): void { e.stopPropagation(); this.panelAbierto.update((v) => !v); }

  @HostListener('document:click', ['$event'])
  protected fuera(e: Event): void {
    if (this.panelAbierto() && !(e.target as HTMLElement).closest('.notif')) this.panelAbierto.set(false);
  }
  @HostListener('document:keydown.escape')
  protected escape(): void { this.panelAbierto.set(false); this.menuAbierto.set(false); }

  protected abrirAviso(id: string, enlace: string): void {
    void this.avisos.marcarLeido(id);
    this.panelAbierto.set(false);
    // Los avisos guardan rutas con el formato del prototipo (#/finca/…, #/eval/…): se traducen a las de la plataforma.
    void this.router.navigateByUrl(rutaDeAviso(enlace));
  }

  protected async salir(): Promise<void> {
    if (!(await this.dialogo.confirmar({ titulo: 'Cerrar sesión', mensaje: '¿Desea cerrar la sesión?', aceptar: 'Cerrar sesión' }))) return;
    await this.sesion.cerrar();
    void this.router.navigateByUrl('/ingreso');
  }
}
