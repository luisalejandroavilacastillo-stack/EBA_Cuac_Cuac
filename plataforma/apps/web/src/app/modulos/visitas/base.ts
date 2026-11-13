import { Directive, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { nombreEspecie, type Evaluacion } from '@eba/norma';
import { Datos } from '../../nucleo/datos';
import { Migas } from '../../nucleo/migas';
import { Notificaciones } from '../../nucleo/notificaciones';
import { Sesion } from '../../nucleo/sesion';

/**
 * Base de las pantallas de una visita (/visitas/:id/…): busca la visita, revisa que quien mira pueda verla
 * (el productor solo lo aprobado; el inspector, lo suyo y lo aprobado de sus fincas) y arma la ruta de la barra superior.
 */
@Directive()
export abstract class PantallaVisita {
  /** Llega de la ruta. */
  readonly id = input.required<string>();
  protected readonly datos = inject(Datos);
  protected readonly sesion = inject(Sesion);
  protected readonly router = inject(Router);
  protected readonly notas = inject(Notificaciones);
  private readonly migas = inject(Migas);
  protected abstract readonly titulo: string;

  protected readonly flujo = computed(() => this.datos.flujo());
  protected readonly ev = computed<Evaluacion | undefined>(() => this.datos.evals().find((e) => e.id === this.id()));
  protected readonly f = computed(() => (this.ev() ? this.datos.finca(this.ev()!.finca) : undefined));
  protected readonly permitida = computed(() => !!this.ev() && this.flujo().puedeVerEval(this.ev()!));
  protected readonly especie = computed(() => (this.ev() ? nombreEspecie(this.ev()!.sp) : ''));

  constructor() {
    effect(() => {
      const ev = this.ev(), f = this.f();
      this.migas.niveles.set([{ texto: 'Fincas', ruta: '/fincas' }, { texto: f?.nombre ?? '…', ruta: f ? `/fincas/${f.id}` : undefined },
        { texto: ev ? `${ev.id} · ${nombreEspecie(ev.sp)}` : this.id() }, { texto: this.titulo }]);
    });
    effect(() => {
      if (this.datos.cargando()) return;
      const ev = this.ev();
      if (!ev) { void this.router.navigate(['/fincas']); return; }
      if (!this.permitida() && this.sesion.perfil() === 'productor') {
        this.notas.info('El resultado se publica cuando el coordinador del ICA aprueba la inspección.');
        void this.router.navigate(['/fincas', ev.finca]);
      }
    });
  }
}
