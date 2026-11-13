import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  COLOR_GRAFICA, COLOR_NIVEL, MAX_SEGUIMIENTOS, NOMBRE_PERFIL, SEGUIMIENTOS_BASE, constanciaVigente, fmt, indicadoresDe, alertasGalpon, nivelDe, nombreEspecie, plural, tramoFinca,
  type Evaluacion, type EstadoLinea, type Medida, type Nivel, type Rol,
} from '@eba/norma';
import { Barras, EtiquetaFlujo, Evolucion, LineaFlujo, fechaCorta } from '../../compartido/flujo-ui';
import { Datos } from '../../nucleo/datos';
import { EnlaceVisita } from '../../compartido/enlace-visita';
import { Sesion } from '../../nucleo/sesion';

type Periodo = '30' | 'anio' | 'todo';
const PERIODOS: [Periodo, string][] = [['30', 'Últimos 30 días'], ['anio', 'Este año'], ['todo', 'Todo']];
const ORDEN_PERFILES: Rol[] = ['admin', 'coordinador', 'inspector', 'productor'];
const NIVELES: Nivel[] = ['Excelente', 'Alto', 'Medio', 'Bajo'];

/** Tarea del tablero: [qué falta, detalle, finca · especie, etiqueta, clase, urgencia]. */
interface Tarea { que: string; detalle: string; donde: string; cuando: string; clase: string; urgencia: number }

function enPeriodo(f: string | undefined, per: Periodo) {
  if (!f || per === 'todo') return true;
  const d = new Date(f + 'T07:00'), h = new Date();
  if (per === 'anio') return d.getFullYear() === h.getFullYear();
  return (h.getTime() - d.getTime()) / 864e5 <= 30;
}
function diaHabilSiguiente(iso: string) { const d = new Date(iso); do { d.setDate(d.getDate() + 1); } while ([0, 6].includes(d.getDay())); return d; }

/**
 * Inicio (tablero) por perfil, igual que vInicio() del prototipo v0.25: todo se calcula con los datos guardados.
 * Coordinador: lo que espera su aprobación, lo devuelto y lo que falta asignar. Administrador: lo que falta asignar,
 * usuarios y actividad (no aprueba). Inspector: su trabajo en orden de prioridad. Productor: sus fincas, certificado o plan de mejora.
 */
@Component({
  selector: 'app-inicio',
  imports: [RouterLink, NgTemplateOutlet, EnlaceVisita, LineaFlujo, EtiquetaFlujo, Barras, Evolucion],
  templateUrl: './inicio.html',
})
export class Inicio {
  protected readonly sesion = inject(Sesion);
  protected readonly datos = inject(Datos);
  protected readonly periodos = PERIODOS;
  protected readonly periodo = signal<Periodo>('anio');
  protected readonly colores = COLOR_GRAFICA;
  protected readonly fmt = fmt;
  protected readonly fecha = fechaCorta;
  protected readonly nombreEspecie = nombreEspecie;
  protected readonly constanciaVigente = constanciaVigente;

  protected readonly rol = computed(() => this.sesion.perfil());
  protected readonly coord = computed(() => this.rol() === 'coordinador' || this.rol() === 'admin');
  protected readonly hora = computed(() => (this.datos.actualizado() ?? new Date()).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));

  /** Cálculo común del tablero. */
  protected readonly v = computed(() => {
    const flujo = this.datos.flujo(), rol = this.rol(), clave = this.sesion.usuario()?.clave, coord = this.coord(), productor = rol === 'productor';
    const per: Periodo = coord ? this.periodo() : 'todo';
    const fs = flujo.fincasVisibles(), activas = fs.filter((f) => f.estado === 'ACTIVA'), n = flujo.contarEstados(fs);
    const pares = activas.flatMap((f) => flujo.estadosFinca(f));
    const comerciales = activas.filter((f) => tramoFinca(f) === 'comercial').length;
    // El inspector solo ve sus visitas; el productor, solo las aprobadas.
    const evsVis = this.datos.evals().filter((e) => fs.some((f) => f.id === e.finca) && e.estado !== 'Anulada'
      && (rol !== 'inspector' || e.inspector === clave) && (rol !== 'productor' || e.estado === 'Finalizada'));
    const finPer = evsVis.filter((e) => e.estado === 'Finalizada' && enPeriodo(e.fecha, per));
    const rfPer = finPer.map((e) => ({ e, r: flujo.resultado(e) }));
    const prom = rfPer.length ? rfPer.reduce((a, x) => a + x.r.total, 0) / rfPer.length : null;
    const cumplen = finPer.filter((e) => flujo.verificarCumplimiento(e).cumple).length;

    // Tareas pendientes dentro de las inspecciones.
    const atender: Tarea[] = [], hoyD = new Date(new Date().toDateString());
    const quien = (e: Evaluacion) => `${this.datos.finca(e.finca)?.nombre || e.finca} · ${nombreEspecie(e.sp)}`;
    const diasA = (d: Date) => Math.round((new Date(d.toDateString()).getTime() - hoyD.getTime()) / 864e5);
    const docsPendientes = (e: Evaluacion) => indicadoresDe(e.sp).filter((i) => i.m.kind === 'doc' && e.resp[i.code]?.['estado'] === 'Pendiente');
    evsVis.filter((e) => e.estado !== 'Programada' && (productor || e.estado !== 'Finalizada' || docsPendientes(e).length)).forEach((e) => {
      flujo.resultado(e).filas.filter((x) => x.score === 0 && x.ind.g === 'MBA' && !(e.obs?.[x.ind.code] || '').trim())
        .forEach((x) => atender.push({ que: 'Falta observación', detalle: `${x.ind.num} ${x.ind.name} (indicador en 0)`, donde: quien(e), cuando: 'Antes de cerrar', clase: 'e-alerta', urgencia: 1 }));
      docsPendientes(e).forEach((i) => {
        if (e.estado !== 'Finalizada' || !e.finalizada) { atender.push({ que: 'Falta documento', detalle: i.name, donde: quien(e), cuando: '1 día hábil tras el cierre', clase: 'e-medio', urgencia: 3 }); return; }
        const lim = diaHabilSiguiente(e.finalizada), d = diasA(lim);
        atender.push({ que: 'Falta documento', detalle: i.name, donde: quien(e), cuando: d < 0 ? `Vencido hace ${plural(-d, 'día', 'días')}` : d === 0 ? 'Vence hoy' : d === 1 ? 'Vence mañana' : `Vence el ${fechaCorta(lim.toISOString())}`,
          clase: d <= 0 ? 'e-alerta' : 'e-medio', urgencia: d < 0 ? 0 : 3 });
      });
      if (!productor) alertasGalpon(e, this.datos.finca(e.finca)!).filter((a) => !(e.obs?.[a.ind.code] || '').trim())
        .forEach((a) => atender.push({ que: 'Falta observación', detalle: `${a.ind.num} ${a.ind.name}, galpón ${a.galpon + 1} por debajo de la finca`, donde: quien(e), cuando: 'Galpón con alerta', clase: 'e-alerta', urgencia: 2 }));
    });
    if (coord) pares.filter((s) => s.proc && s.proc.puedeAmpliar).forEach((s) => atender.push({ que: 'Decidir ampliación', detalle: `Proceso ${s.proc!.id}: usó ${s.proc!.max} seguimientos sin cumplir`, donde: `${s.f.nombre} · ${nombreEspecie(s.sp)}`, cuando: 'Decisión del coordinador', clase: 'e-medio', urgencia: 4 }));
    atender.sort((a, b) => a.urgencia - b.urgencia);

    // Paneles comunes
    const estados = flujo.estadosLista().map((e) => ({ e, v: pares.filter((s) => flujo.textoFlujo(s) === e).length, c: COLOR_GRAFICA[e] }));
    const ultimosPares = pares.filter((s) => s.ultimaFin && enPeriodo(s.ultimaFin.fecha, per));
    const niveles: Record<Nivel, number> = { Excelente: 0, Alto: 0, Medio: 0, Bajo: 0 };
    ultimosPares.forEach((s) => niveles[flujo.resultado(s.ultimaFin!).nivel[0]]++);
    const barrasNivel = NIVELES.map((k) => ({ l: k, v: niveles[k], c: COLOR_NIVEL[k] }));
    const inactivas = fs.length - activas.length;
    const kFincas = {
      v: String(activas.length), l: productor ? 'Mis fincas activas' : rol === 'inspector' ? 'Fincas asignadas' : 'Fincas activas',
      det: `${inactivas ? `${inactivas} inactiva${inactivas > 1 ? 's' : ''} · ` : ''}${comerciales} comercial${comerciales === 1 ? '' : 'es'} · ${activas.length - comerciales} traspatio`, c: 'var(--semilla)',
    };
    return { flujo, fs, activas, n, pares, evsVis, finPer, rfPer, prom, cumplen, atender, estados, ultimosPares, barrasNivel, kFincas };
  });

  /** Coordinador y administrador. */
  protected readonly gestion = computed(() => {
    if (!this.coord()) return null;
    const { flujo, evsVis, rfPer, finPer, pares, activas } = this.v(), admin = this.rol() === 'admin';
    const procs = [...new Set(evsVis.map((e) => e.proceso))].map((pid) => flujo.estadoProceso(pid)).filter((st) => st.finca && activas.some((f) => f.id === st.finca));
    const cuenta = (e: string) => procs.filter((st) => st.estado === e).length;
    const barrasProc = [['En curso', cuenta('En curso'), COLOR_GRAFICA['En proceso']], ['Seguimiento programado', cuenta('Seguimiento programado'), COLOR_GRAFICA['Seguimiento programado']],
      ['En seguimiento', cuenta('En seguimiento'), '#3E7CB1'], ['Cumplidos', cuenta('Cumplido'), 'var(--campo)'], ['Requieren ampliación', cuenta('Requiere ampliación'), 'var(--ocre)'],
      ['Cerrados sin cumplir', cuenta('Cerrado sin cumplir'), 'var(--rojo)']].map(([l, v, c]) => ({ l: l as string, v: v as number, c: c as string }));
    const sps = [...new Set(rfPer.map((x) => x.e.sp))];
    const promMed = (sp: string, g: Medida) => { const v = rfPer.filter((x) => x.e.sp === sp && x.r.pesos[g] > 0 && x.r.med[g] != null).map((x) => x.r.med[g]!); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const medidas = sps.flatMap((sp) => ([['MBR', 'recursos'], ['MBA', 'animal'], ['MBG', 'gestión']] as [Medida, string][]).map(([g, t]) => ({ l: `${nombreEspecie(sp)} · ${t}`, v: promMed(sp, g) })))
      .filter((x): x is { l: string; v: number } => x.v != null).map((x) => ({ ...x, c: nivelDe(x.v)[1] }));
    const criterios = flujo.criteriosAtencion(finPer).map((x) => ({ texto: `${x.ind.num} ${x.ind.name}`, sp: nombreEspecie(x.ind.sp), prom: fmt(x.prom), color: nivelDe(x.prom)[1] }));
    // Bandeja: el coordinador ve lo que espera su aprobación, lo devuelto y lo que falta asignar; el administrador, solo lo que falta asignar.
    const orden: Record<string, number> = admin ? { 'Por asignar': 0 } : { 'Pendiente de aprobación': 0, Devuelta: 1, 'Por asignar': 2 };
    const bandeja = pares.filter((s) => s.estado in orden).sort((a, b) => orden[a.estado] - orden[b.estado]);
    let usuarios = null, actividad = null;
    if (admin) {
      const todos = Object.values(this.datos.usuarios()), act = todos.filter((x) => x.estado === 'Activo').length;
      usuarios = { activos: act, total: todos.length, barras: ORDEN_PERFILES.map((p) => { const de = todos.filter((x) => x.perfil === p), ina = de.filter((x) => x.estado !== 'Activo').length;
        return { l: NOMBRE_PERFIL[p], v: de.length - ina, c: 'var(--semilla)', extra: ina ? `+${ina} inactivo${ina > 1 ? 's' : ''}` : '' }; }) };
      actividad = this.datos.bitacora().slice(-5).reverse();
    }
    return { admin, procs, barrasProc, medidas, criterios, bandeja, usuarios, actividad };
  });

  /** Inspector: «Mi trabajo» en orden de prioridad. */
  protected readonly inspector = computed(() => {
    if (this.rol() !== 'inspector') return null;
    const { flujo, pares, evsVis } = this.v(), clave = this.sesion.usuario()?.clave, hoy = new Date().toISOString().slice(0, 10);
    const vencida = (s: EstadoLinea) => !!s.abierta && s.abierta.estado === 'Programada' && s.abierta.fecha < hoy;
    const prioridad = (s: EstadoLinea) => (s.estado === 'Devuelta' || vencida(s) ? 0 : s.estado === 'En proceso' ? 1 : 2);
    const trabajo = pares.filter((s) => s.abierta && s.abierta.inspector === clave && ['Asignada', 'En proceso', 'Devuelta', 'Seguimiento programado'].includes(s.estado))
      .sort((a, b) => prioridad(a) - prioridad(b) || (a.abierta && b.abierta ? a.abierta.fecha.localeCompare(b.abierta.fecha) : 0) || (prioridad(a) === 1 ? flujo.avance(b.ev!).pct - flujo.avance(a.ev!).pct : 0))
      .map((s) => ({ s, vencida: vencida(s), dias: vencida(s) ? Math.round((new Date(hoy + 'T12:00').getTime() - new Date(s.abierta!.fecha + 'T12:00').getTime()) / 864e5) : 0 }));
    const mias = (e: string) => pares.filter((s) => s.estado === e && (!s.abierta || s.abierta.inspector === clave)).length;
    const kpis = [['Asignada', 'Asignadas', 'Por iniciar'], ['En proceso', 'En proceso', 'En campo'], ['Devuelta', 'Devueltas', 'Corregir y reenviar'], ['Pendiente de aprobación', 'Por aprobar', 'En revisión del coordinador']]
      .map(([e, l, det]) => ({ v: String(mias(e)), l, det, c: COLOR_GRAFICA[e as keyof typeof COLOR_GRAFICA] }));
    const ultimos = evsVis.filter((e) => e.estado === 'Finalizada').sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5)
      .map((e) => { const r = flujo.resultado(e); return { l: this.datos.finca(e.finca)?.nombre || e.finca, sub: `${nombreEspecie(e.sp)} · ${fechaCorta(e.fecha)}`, v: r.total, c: r.nivel[1], extra: r.nivel[0], extraClase: 'nivel-tab' }; });
    return { trabajo, kpis, ultimos };
  });

  /** Productor: tarjetas por finca y especie, lo que debe mejorar y la evolución. */
  protected readonly productor = computed(() => {
    if (this.rol() !== 'productor') return null;
    const { flujo, fs, pares, atender } = this.v();
    const tarjetas = fs.flatMap((f) => flujo.estadosFinca(f).map((s) => {
      const r = s.ultimaFin ? flujo.resultado(s.ultimaFin) : null, ab = s.abierta, seg = s.estado === 'Seguimiento programado';
      const msg = s.estado === 'Pendiente de aprobación' ? 'El ICA está revisando el resultado de la visita. Lo verá aquí cuando lo apruebe.'
        : ab && !seg ? `Visita del ${fechaCorta(ab.fecha)}: el resultado se publica cuando el ICA lo apruebe.` : 'Aún no tiene inspecciones programadas.';
      const c = s.ultimaFin?.constancia;
      return { s, r, msg, mostrarMsg: !r || (!!ab && !seg), proxima: seg && ab ? `${flujo.nombreVisita(ab)} · ${fechaCorta(ab.fecha)}` : '',
        proceso: s.proc && s.ultimaFin ? `Proceso ${s.proc.id}${s.proc.estado === 'Cumplido' ? ' · cumplido' : ` · seguimientos ${s.proc.usados} de ${s.proc.max}`}` : '',
        constancia: c ? `${c.codigo}` : '', vigente: constanciaVigente(c), vence: c ? fechaCorta(c.vence) : '', plan: !!s.ultimaFin && !c && !ab };
    }));
    const ult = pares.filter((s) => s.ultimaFin).map((s) => ({ s, r: flujo.resultado(s.ultimaFin!) })).sort((a, b) => b.s.ultimaFin!.fecha.localeCompare(a.s.ultimaFin!.fecha))[0];
    const plan = ult?.s.ultimaFin!.plan || {};
    const mejorar = ult ? ult.r.filas.filter((x) => x.score < 100).sort((a, b) => a.score - b.score || (plan[b.ind.code]?.accion ? 1 : 0) - (plan[a.ind.code]?.accion ? 1 : 0)).slice(0, 3)
      .map((x) => { const pl = plan[x.ind.code] || {}; return { texto: `${x.ind.num} ${x.ind.name}`, puntaje: fmt(x.score), cero: x.score === 0,
        accion: pl.accion ? `Acción acordada: ${pl.accion}${pl.plazo ? ` · plazo ${fechaCorta(pl.plazo)}` : ''}` : 'Sin acción registrada en el plan de mejora.' }; }) : [];
    const f0 = fs[0];
    const hist = f0 ? this.datos.evals().filter((x) => x.finca === f0.id && x.estado === 'Finalizada').sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((x) => { const rx = flujo.resultado(x); return [`${flujo.nombreCorto(x)} · ${nombreEspecie(x.sp)}`, rx.total, rx.provisional] as [string, number, boolean]; }) : [];
    const kpis = [this.v().kFincas,
      { v: ult ? fmt(ult.r.total) : '—', l: 'Último puntaje', det: ult ? `${ult.r.nivel[0]} · ${ult.s.f.nombre}` : 'Sin evaluaciones finalizadas', c: ult ? ult.r.nivel[1] : 'var(--linea)' },
      { v: String(atender.length), l: 'Pendientes', det: atender.length ? 'Documentos u observaciones' : 'Nada por atender', c: atender.length ? 'var(--rojo)' : 'var(--campo)' }];
    return { tarjetas, mejorar, hayUlt: !!ult, hist, f0: f0?.nombre ?? '', kpis };
  });

  protected readonly kpisGestion = computed((): { v: string; l: string; det: string; c: string; sub?: string }[] => {
    const { kFincas, finPer, evsVis, prom, cumplen } = this.v();
    return [kFincas,
      { v: String(finPer.length), l: 'Evaluaciones finalizadas', det: `${evsVis.filter((e) => e.estado !== 'Finalizada').length} abiertas ahora`, c: 'var(--campo)' },
      { v: prom == null ? '—' : fmt(prom), l: 'Puntaje promedio', det: prom == null ? 'Sin evaluaciones finalizadas' : `Nivel ${nivelDe(prom)[0]} · ${finPer.length} evaluaciones`, c: prom == null ? 'var(--linea)' : nivelDe(prom)[1] },
      { v: finPer.length ? String(cumplen) : '—', sub: finPer.length ? ` de ${finPer.length}` : '', l: 'Cumplen los criterios', det: '≥ 90, sin ceros ni pendientes', c: 'var(--azul)' }];
  });

  protected readonly subtitulo = computed(() => {
    const fs = this.v().fs;
    if (this.rol() === 'productor') return fs.length ? `Estado del bienestar animal en ${fs.length === 1 ? fs[0].nombre : `sus ${fs.length} fincas`}.` : 'Todavía no tiene fincas registradas.';
    if (this.coord()) return `Resumen de la seccional · ${PERIODOS.find(([k]) => k === this.periodo())![1].toLowerCase()} · actualizado a las ${this.hora()}`;
    return `Su trabajo de campo · actualizado a las ${this.hora()}`;
  });
  protected readonly etiquetaEstados = computed(() => this.v().estados.map((e) => `${e.e}: ${e.v}`).join(', '));
  protected readonly primerNombre = computed(() => (this.sesion.usuario()?.nombre ?? '').split(' ')[0]);
  protected readonly textosBase = { SEGUIMIENTOS_BASE, MAX_SEGUIMIENTOS };
  protected readonly MAXA = 6;
  protected readonly MAXT = 8;
}
