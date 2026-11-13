import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MAX_SEGUIMIENTOS, avisoFechaSeguimiento, faltantesCierre, fechaLarga, fechaSugeridaSeguimiento, hoyISO, type Evaluacion } from '@eba/norma';
import { fechaCorta } from '../../../compartido/flujo-ui';
import { Acciones } from '../../../nucleo/acciones';
import { PantallaCampo } from './base';

interface Revision { accion: string; por: string | null; fecha: string; obs: string }
type Firmas = { productor?: string; inspector?: string };

/** Cierre de la visita (5.5): lo que falta, firmas, observación general y fecha propuesta del seguimiento; luego se envía al coordinador. */
@Component({
  selector: 'app-cierre',
  imports: [RouterLink],
  templateUrl: './cierre.html',
})
export class Cierre extends PantallaCampo {
  protected readonly titulo = 'Cierre';
  private readonly acciones = inject(Acciones);
  protected readonly MAX = MAX_SEGUIMIENTOS;
  protected readonly fechaCorta = fechaCorta;
  protected readonly hoy = hoyISO();
  protected readonly enviando = signal(false);
  protected readonly error = signal('');

  /** Motor del flujo con la copia de trabajo (el resultado y el cumplimiento cambian con lo registrado). */
  private readonly flujoCampo = computed(() => { const ev = this.copia(); return ev ? this.datos.flujoCon(ev) : null; }, { equal: () => false });
  protected readonly r = computed(() => (this.copia() && this.flujoCampo() ? this.flujoCampo()!.resultado(this.copia()!) : null));
  protected readonly firmas = computed(() => (this.copia()?.['firmas'] ?? {}) as Firmas);
  protected readonly devuelta = computed(() => { const ev = this.copia(); if (ev?.estado !== 'Devuelta') return null;
    return ((ev['revision'] as Revision[] | undefined) || []).filter((x) => x.accion === 'Devuelta').slice(-1)[0] ?? null; });

  /** Seguimiento: si la visita no cumple y quedan seguimientos, el inspector propone la fecha (el coordinador la confirma). */
  protected readonly seg = computed(() => {
    const ev = this.copia(), fl = this.flujoCampo(); if (!ev || !fl) return null;
    const ver = fl.verificarCumplimiento(ev), st = fl.estadoProceso(ev.proceso), sig = (ev.visita || 0) + 1;
    const programa = this.ed() && !ver.cumple && sig <= st.max, sug = fechaSugeridaSeguimiento(ev);
    const fecha = (ev['segFecha'] as string | undefined) || (programa ? sug.fecha : '');
    return { programa, sig, max: st.max, motivos: ver.motivos, sug, fecha, ultimo: this.ed() && !ver.cumple && (ev.visita || 0) >= st.max,
      aviso: programa ? avisoFechaSeguimiento(ev, fecha) : '' };
  });
  protected readonly faltantes = computed(() => {
    const ev = this.copia(), f = this.f(); if (!ev || !f) return [];
    const falt = faltantesCierre(ev, f), s = this.seg();
    if (s?.programa && (!s.fecha || s.fecha < this.hoy)) falt.push(['Indique una fecha válida (hoy o posterior) para el seguimiento', null]);
    return falt;
  });
  protected readonly sugerencia = computed(() => { const s = this.seg()?.sug; if (!s) return '';
    return s.plazoMax ? `Sugerida: día siguiente al plazo más lejano del plan de mejora (${s.accion}, ${fechaLarga(s.plazoMax)}).`
      : 'El plan de mejora no tiene plazos: se sugieren 30 días. Puede acordar los plazos en el resultado.'; });

  protected firmar(quien: 'productor' | 'inspector'): void {
    const ev = this.copia(), f = this.f(); if (!ev || !f || !this.ed()) return;
    const firmas = { ...((ev['firmas'] ?? {}) as Firmas) };
    firmas[quien] = quien === 'inspector' ? this.datos.nombreUsuario(ev.inspector) : f.productor;
    ev['firmas'] = firmas; this.cambio();
  }
  protected obsGeneral(v: string): void { const ev = this.copia(); if (!ev) return; ev['obsGeneral'] = v; this.cambio(); }
  protected segFecha(v: string): void { const ev = this.copia(); if (!ev) return; ev['segFecha'] = v; this.cambio(); }

  protected async finalizar(): Promise<void> {
    const ev = this.copia(); if (!ev || this.faltantes().length || !this.ed()) return;
    // la fecha sugerida queda como propuesta si el inspector no la cambió (igual que el prototipo)
    const s = this.seg(); if (s?.programa && !ev['segFecha']) ev['segFecha'] = s.fecha;
    this.enviando.set(true); this.error.set('');
    const err = await this.acciones.finalizar(ev as Evaluacion);
    this.enviando.set(false);
    if (err) { this.error.set(err); return; }
    this.ir('resultado');
  }
}
