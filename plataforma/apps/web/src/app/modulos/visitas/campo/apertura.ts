import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { aplica, contexto, fechaLarga, fmt, indicadoresDe, nombreEspecie, poblacionEspecie, type Especie } from '@eba/norma';
import { HtmlPipe, muestreoSVG } from '../../../compartido/graficas';
import { Notificaciones } from '../../../nucleo/notificaciones';
import { PantallaCampo } from './base';

/** Apertura de la visita (5.5): datos de quien atiende, aves de cada especie el día de la visita y plan de muestreo (5.6, Tabla 3). */
@Component({
  selector: 'app-apertura',
  imports: [RouterLink, HtmlPipe],
  templateUrl: './apertura.html',
})
export class Apertura extends PantallaCampo {
  protected readonly titulo = 'Apertura y muestreo';
  private readonly avisos = inject(Notificaciones);
  protected readonly fmt = fmt;
  protected readonly fechaLarga = fechaLarga;
  protected readonly nombreEspecie = nombreEspecie;

  protected readonly ap = computed(() => this.copia()?.apertura ?? {});
  protected readonly anterior = computed(() => this.copia()?.['anterior'] as { id: string; fecha: string; total: number } | undefined);
  protected readonly nombreVisita = computed(() => (this.copia() ? this.flujo().nombreVisita(this.copia()!) : ''));
  /** Especies de la finca (la que se inspecciona primero) con las aves de cada una el día de la visita. */
  protected readonly especies = computed(() => {
    const ev = this.copia(), f = this.f(), ctx = this.ctx(); if (!ev || !f || !ctx) return [];
    const sps = [ev.sp, ...f.especies.map((x) => x.sp).filter((s) => s !== ev.sp)];
    return sps.map((sp) => ({ sp, actual: sp === ev.sp,
      n: ev.pobEsp && ev.pobEsp[sp] != null ? ev.pobEsp[sp]! : sp === ev.sp ? ctx.nEsp : poblacionEspecie(f.especies.find((x) => x.sp === sp)!) }));
  });
  protected readonly mixta = computed(() => this.especies().length > 1);
  protected readonly noAplican = computed(() => { const ev = this.copia(), ctx = this.ctx(); if (!ev || !ctx) return [];
    return indicadoresDe(ev.sp).map((i) => ({ i, motivo: aplica(i, ctx) })).filter((x) => !!x.motivo); });
  protected readonly grafica = computed(() => (this.ctx() ? muestreoSVG(this.ctx()!.plan) : ''));

  /**
   * Igual que el prototipo, cualquier cambio en la apertura guarda todos sus datos con su valor actual:
   * hora, persona que atiende, ingreso, puntos y aves por punto (sin corral), bebederos y comederos (traspatio)
   * y las aves de cada especie.
   */
  private aplicar(cambios: Record<string, string | number>, pob?: [Especie, number]): void {
    const ev = this.copia(), f = this.f(), ctx = this.ctx(); if (!ev || !f || !ctx) return;
    this.tramoVisto ??= ctx.tramo;
    const ap: Record<string, unknown> = { hora: '', atiende: '', ingreso: '', ...ev.apertura, ...cambios };
    if (ctx.e.conCorral === false) {
      ap['puntosSC'] = Math.min(3, Math.max(1, +(ap['puntosSC'] ?? ctx.plan.puntos) || 1));
      ap['avesPuntoSC'] = Math.min(5, Math.max(2, +(ap['avesPuntoSC'] ?? ctx.plan.avesPunto) || 2));
    }
    if (ctx.tramo === 'traspatio' && ev.sp === 'pato') {
      ap['bebederos'] = Math.max(1, +(ap['bebederos'] ?? 2) || 1);
      ap['comederos'] = Math.max(1, +(ap['comederos'] ?? 2) || 1);
    }
    ev.apertura = ap as typeof ev.apertura;
    ev.pobEsp = Object.fromEntries(this.especies().map((x) => [x.sp, x.n]));
    if (pob) ev.pobEsp[pob[0]] = pob[1];
    ev.pobConfirmada = Object.values(ev.pobEsp).reduce((t, n) => t + (n ?? 0), 0);
    this.cambio();
  }
  protected campo(k: string, v: string): void { this.aplicar({ [k]: v }); }
  private tramoVisto: string | null = null;
  protected poblacion(sp: Especie, v: string, fin: boolean): void {
    this.aplicar({}, [sp, +v || 0]);
    const ev = this.copia(), f = this.f();
    if (fin && ev && f) {
      if (contexto(ev, f).tramo !== this.tramoVisto) this.avisos.info('Cambió el tramo de la finca: se actualizan los indicadores que aplican.');
      this.tramoVisto = null;
    }
  }
}
