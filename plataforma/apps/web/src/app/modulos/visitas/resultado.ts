import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  COLOR_FLUJO, COLOR_PROCESO, CRITERIO_CUMPLE, INDICADOR, MAX_SEGUIMIENTOS, SEGUIMIENTOS_BASE, alertasGalpon, aplica, calcular, cambiosFrenteAnterior, constanciaVigente,
  fechaSugeridaSeguimiento, fmt, indicadoresDe, nombreEstadoVisita, type Evaluacion, type Medida,
} from '@eba/norma';
import { EscalaNivel, Evolucion, fechaCorta } from '../../compartido/flujo-ui';
import { EnlaceVisita } from '../../compartido/enlace-visita';
import { Acciones } from '../../nucleo/acciones';
import { Trabajo } from '../../nucleo/trabajo';
import { PantallaVisita } from './base';

const MEDIDA: Record<Medida, string> = { MBR: 'Medidas basadas en los recursos', MBA: 'Medidas basadas en el animal', MBG: 'Medidas basadas en la gestión' };
const NOMBRE_MEDIDA: Record<Medida, string> = { MBA: 'Animal', MBR: 'Recursos', MBG: 'Gestión' };
const COLOR_MEDIDA: Record<Medida, string> = { MBA: 'var(--campo)', MBR: 'var(--siembra)', MBG: 'var(--cosecha)' };
const TXT_REV: Record<string, string> = { Enviada: 'Enviada a aprobación', Reenviada: 'Reenviada corregida', Devuelta: 'Devuelta al inspector', Aprobada: 'Aprobada' };
interface Revision { accion: string; por: string; fecha: string; obs?: string }

/**
 * Resultado de la visita (5.4): puntaje, detalle del cálculo, galpones, seguimiento, diagnóstico y plan de mejora;
 * revisión del coordinador (aprobar o devolver) y constancia. Igual a vResultado() del prototipo v0.25.
 */
@Component({
  selector: 'app-resultado',
  imports: [FormsModule, RouterLink, EscalaNivel, Evolucion, EnlaceVisita],
  templateUrl: './resultado.html',
})
export class Resultado extends PantallaVisita {
  protected readonly titulo = 'Resultado';
  protected readonly acc = inject(Acciones);
  private readonly trabajo = inject(Trabajo);
  protected readonly fmt = fmt;
  protected readonly fecha = fechaCorta;
  protected readonly medidas: Medida[] = ['MBA', 'MBR', 'MBG'];
  protected readonly MEDIDA = MEDIDA;
  protected readonly NOMBRE_MEDIDA = NOMBRE_MEDIDA;
  protected readonly COLOR_MEDIDA = COLOR_MEDIDA;
  protected readonly colorProceso = COLOR_PROCESO;
  protected readonly MAX = MAX_SEGUIMIENTOS;
  protected readonly BASE = SEGUIMIENTOS_BASE;
  protected readonly CRITERIO = CRITERIO_CUMPLE;
  protected readonly nombreUsuario = (k?: string | null) => this.datos.nombreUsuario(k);

  protected readonly r = computed(() => (this.ev() && this.f() ? this.flujo().resultado(this.ev()!) : null));
  protected readonly productor = computed(() => this.flujo().esProductor);
  protected readonly coordinador = computed(() => this.sesion.perfil() === 'coordinador');
  protected readonly puedeEvaluar = computed(() => !!this.ev() && this.flujo().puedeEvaluar(this.ev()!));
  protected readonly puedeAsistente = computed(() => this.sesion.puede('asistente'));
  protected readonly ver = computed(() => (this.ev() ? this.flujo().verificarCumplimiento(this.ev()!) : null));
  protected readonly st = computed(() => (this.ev() ? this.flujo().estadoProceso(this.ev()!.proceso) : null));

  /** Diagnóstico: fortalezas (100), oportunidades (entre 0 y 100) e incumplimientos (0). */
  protected readonly diag = computed(() => {
    const r = this.r(), ev = this.ev(); if (!r || !ev) return null;
    const fila = (x: { ind: { code: string; num: string; name: string }; score: number }) => ({ texto: `${x.ind.num} ${x.ind.name}`, puntaje: fmt(x.score), obs: ev.obs?.[x.ind.code] ?? '' });
    const inc = r.filas.filter((x) => x.score === 0);
    return { fort: r.filas.filter((x) => x.score >= 100).map(fila), opo: r.filas.filter((x) => x.score > 0 && x.score < 100).map(fila),
      inc: inc.slice().sort((a, b) => r.pesos[b.ind.g] - r.pesos[a.ind.g]).map(fila) };
  });
  protected readonly dosGalpones = computed(() => this.r()?.ctx.plan.corrales === 2);
  protected readonly alertas = computed(() => (this.ev() && this.f() ? alertasGalpon(this.ev()!, this.f()!) : []));
  protected readonly galpones = computed(() => {
    const ev = this.ev(), r = this.r(); if (!ev || !r || !this.dosGalpones()) return [];
    const al = this.alertas(), es = (code: string, g: number) => al.some((a) => a.ind.code === code && a.galpon === g);
    return indicadoresDe(ev.sp).filter((i) => !aplica(i, r.ctx)).map((i) => ({ i, c: calcular(i, ev.resp[i.code], r.ctx) })).filter((x) => x.c.done && x.c.porGalpon)
      .map((x) => ({ texto: `${x.i.num} ${x.i.name}`, finca: fmt(x.c.score),
        celdas: [0, 1].map((g) => ({ v: x.c.porGalpon![g] == null ? '—' : fmt(x.c.porGalpon![g]), pct: x.c.pctGalpon ? fmt(x.c.pctGalpon[g]) : '', alerta: es(x.i.code, g) })) }));
  });
  protected readonly alertasTexto = computed(() => this.alertas().map((a) => ({ titulo: `Galpón ${a.galpon + 1} · ${a.ind.num} ${a.ind.name}`, code: a.ind.code,
    texto: `${fmt(a.score)}${a.pct != null ? ` (${fmt(a.pct)} %)` : ''} frente a ${fmt(a.finca)} de la finca`, obs: this.ev()!.obs?.[a.ind.code] ?? '' })));

  /** Revisión del coordinador. */
  protected readonly revisiones = computed(() => ((this.ev()?.['revision'] as Revision[] | undefined) ?? []));
  protected readonly ultimaRev = (accion?: string) => this.revisiones().filter((x) => !accion || x.accion === accion).slice(-1)[0] ?? null;
  protected readonly txtRev = TXT_REV;
  protected readonly propuesta = computed(() => {
    const ev = this.ev(), ver = this.ver(), st = this.st(); if (!ev || !ver || !st || ev.estado !== 'Pendiente de aprobación' || ver.cumple) return '';
    const sig = (ev.visita || 0) + 1;
    return sig <= st.max ? `Seguimiento ${sig} de ${st.max} propuesto por el inspector para el ${ev['segFecha'] ? fechaCorta(ev['segFecha'] as string) : '—'}. Se programa al aprobar.`
      : `Es el último seguimiento del proceso: al aprobar, podrá decidir si lo amplía a ${MAX_SEGUIMIENTOS}.`;
  });

  /** Constancia vigente o plan de mejora (productor). */
  protected readonly constancia = computed(() => { const c = this.ev()?.constancia; return c ? { ...c, vigente: constanciaVigente(c) } : null; });
  protected readonly planProductor = computed(() => {
    const ev = this.ev(); if (!ev || ev.estado !== 'Finalizada' || ev.constancia || !this.productor()) return null;
    const prog = this.datos.evals().find((e) => e.proceso === ev.proceso && e.estado === 'Programada');
    return { proxima: prog ? fechaCorta(prog.fecha) : '', acciones: Object.entries(ev.plan || {}).filter(([, p]) => p && p.accion)
      .map(([code, p]) => ({ texto: INDICADOR[code] ? `${INDICADOR[code].num} ${INDICADOR[code].name}` : code, accion: p.accion!, plazo: p.plazo ? fechaCorta(p.plazo) : '' })) };
  });

  /** Seguimiento y continuidad del proceso. */
  protected readonly seguimiento = computed(() => {
    const ev = this.ev(), st = this.st(), flujo = this.flujo(); if (!ev || !st) return null;
    const v = this.productor() ? st.visitas.filter((e) => ['Finalizada', 'Programada'].includes(e.estado)) : st.visitas.filter((e) => flujo.enHistorial(e) || e.estado === 'Programada');
    const filas = v.map((e, k) => { const r = flujo.resultado(e), prev = k ? flujo.resultado(v[k - 1]).total : null, d = prev == null || e.estado === 'Programada' ? null : r.total - prev;
      const ve = e.estado === 'Finalizada' ? flujo.verificarCumplimiento(e) : null, prog = e.estado === 'Programada';
      return { e, actual: e === ev, nombre: flujo.nombreVisita(e), fecha: fechaCorta(e.fecha), estado: nombreEstadoVisita(e.estado), color: COLOR_FLUJO[nombreEstadoVisita(e.estado) as keyof typeof COLOR_FLUJO] || 'e-info',
        med: this.medidas.map((g) => (r.pesos[g] > 0 ? fmt(r.med[g]) : '—')), total: prog ? '—' : fmt(r.total), nivel: prog ? '—' : r.nivel[0],
        cambio: d == null ? null : { txt: `${d > 0 ? '+' : ''}${fmt(d)}`, color: d > 0 ? 'var(--campo)' : d < 0 ? 'var(--rojo)' : 'var(--gris)' }, cumple: ve ? ve.cumple : null,
        paso: e.estado === 'Finalizada' ? 'resultado' : '' }; });
    const puntos = v.filter((e) => e.estado !== 'Programada').map((e) => { const r = flujo.resultado(e); return [flujo.nombreCorto(e), r.total, e.estado !== 'Finalizada' || r.provisional] as [string, number, boolean]; });
    const gestor = flujo.esGestor;
    const prog = st.abierta && st.abierta.estado === 'Programada' && st.abierta.visita > 0 ? st.abierta : null;
    const esUltima = st.ultima === ev || (!!prog && st.visitas[st.visitas.indexOf(prog) - 1] === ev);
    const final = st.final ? { total: fmt(flujo.resultado(st.final).total), nivel: flujo.resultado(st.final).nivel[0], nombre: flujo.nombreVisita(st.final), id: st.final.id, fecha: fechaCorta(st.final.fecha), otra: st.final !== ev } : null;
    return { st, filas, puntos, final, prog, progNombre: prog ? flujo.nombreVisita(prog) : '', progFecha: prog ? fechaCorta(prog.fecha) : '', progVencido: !!prog && prog.fecha < new Date().toISOString().slice(0, 10),
      puedeReprog: !!prog && (gestor || (this.sesion.perfil() === 'inspector' && prog.inspector === this.sesion.usuario()?.clave)),
      asignarSeg: gestor && esUltima && st.puedeSeguimiento, ampliar: gestor && esUltima && !st.puedeSeguimiento && st.puedeAmpliar, nuevo: gestor && esUltima && st.cerrado && st.puedeNuevo,
      ampliacion: st.ampliacion ? { por: st.ampliacion.por, fecha: fechaCorta(st.ampliacion.fecha), motivo: st.ampliacion.motivo } : null,
      cambios: this.f() ? cambiosFrenteAnterior(ev, this.f()!) : null };
  });

  /** Plan de mejora: lo diligencia el inspector con el productor en campo. */
  protected readonly planFilas = computed(() => {
    const r = this.r(), ev = this.ev(); if (!r || !ev) return [];
    return r.filas.filter((x) => x.score > 0 && x.score < 100).concat(r.filas.filter((x) => x.score === 0))
      .map((x) => ({ code: x.ind.code, texto: x.ind.name, num: x.ind.num, p: ev.plan?.[x.ind.code] ?? {} }));
  });
  /** El plan de mejora lo acuerda el inspector con el productor: se guarda en la copia de trabajo de la visita (también sin señal). */
  protected cambiarPlan(code: string, k: string, v: string): void {
    const ev = this.trabajo.copia(this.id()); if (!ev) return;
    ev.plan = { ...(ev.plan ?? {}) }; ev.plan[code] = { ...(ev.plan[code] ?? {}), [k]: v };
    this.trabajo.cambio(ev);
  }

  /* ---------------- Ventanas: devolver, aprobar, ampliar ---------------- */
  protected readonly ventana = signal<'devolver' | 'aprobar' | 'ampliar' | null>(null);
  protected readonly obs = signal('');
  protected readonly segFecha = signal('');
  protected readonly segInspector = signal('');
  protected readonly error = signal('');
  protected readonly guardando = signal(false);
  protected readonly inspectores = computed(() => this.datos.inspectores());
  protected readonly hoy = new Date().toISOString().slice(0, 10);
  protected readonly aprobacion = computed(() => {
    const ev = this.ev(), ver = this.ver(), st = this.st(); if (!ev || !ver || !st) return null;
    const sig = (ev.visita || 0) + 1, sigue = !ver.cumple && sig <= st.max;
    return { sig, max: st.max, sigue, cumple: ver.cumple, motivos: ver.motivos.join(' · '), propuesta: !!ev['segFecha'] };
  });
  protected abrir(v: 'devolver' | 'aprobar' | 'ampliar'): void {
    const ev = this.ev()!; this.error.set(''); this.obs.set('');
    if (v === 'aprobar') {
      const s = ev['segFecha'] as string | undefined;
      this.segFecha.set(s && s >= this.hoy ? s : fechaSugeridaSeguimiento(ev).fecha);
      this.segInspector.set(ev.inspector);
    }
    this.ventana.set(v);
  }
  protected async confirmar(): Promise<void> {
    const ev = this.ev()!, v = this.ventana(); this.guardando.set(true); this.error.set('');
    const e = v === 'devolver' ? await this.acc.devolver(ev, this.obs())
      : v === 'aprobar' ? await this.acc.aprobar(ev, this.aprobacion()!.sigue ? this.segFecha() : null, this.aprobacion()!.sigue ? this.segInspector() : null)
      : await this.acc.ampliar(ev, this.obs());
    this.guardando.set(false);
    if (e) this.error.set(e); else this.ventana.set(null);
  }
  protected imprimir(): void { window.print(); }
}
