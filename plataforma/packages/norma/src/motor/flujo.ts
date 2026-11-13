/**
 * Flujo de trabajo por finca y especie, procesos de seguimiento y cumplimiento.
 * Traducción de apps/prototipo/js/norma/flujo.js y seguimiento.js (v0.25). Todo se calcula con lo guardado; nada se marca a mano.
 * Uso: const flujo = new Flujo({ fincas, evals, procesos }, { rol, clave }); flujo.estadoEspecie(finca, 'pato').
 */
import type { Especie, EstadoEspecie, EstadoProceso, EstadoProductor, Rol } from '../tipos.js';
import { CRITERIO_CUMPLE, MAX_SEGUIMIENTOS, SEGUIMIENTOS_BASE } from '../reglas.js';
import { ESTADOS_ESPECIE, ESTADOS_PRODUCTOR, esAbierta } from '../perfiles.js';
import { aplica, avance, calcular, contexto, fmt, indicadoresDe, resultado, type Resultado } from './calculo.js';
import type { Constancia, Evaluacion, Finca, Proceso } from './modelo.js';

export interface DatosFlujo { fincas: Finca[]; evals: Evaluacion[]; procesos: Record<string, Proceso> }
export interface Observador { rol: Rol | null; clave: string | null; nombre?: string | null }

export interface InfoProceso {
  id: string; visitas: Evaluacion[]; ultima: Evaluacion; finca: string; sp: Especie; usados: number; max: number; restantes: number;
  abierta: Evaluacion | undefined; estado: EstadoProceso; cumplido: boolean; visitaCumple: Evaluacion | undefined;
  cerrado: boolean; completo: boolean; puedeAmpliar: boolean; ampliacion: Proceso['ampliado'];
  puedeSeguimiento: boolean; puedeNuevo: boolean; final: Evaluacion | null;
}

/** Acción que corresponde al perfil en una línea finca · especie. */
export interface AccionFlujo {
  texto: string;
  sec?: boolean;
  /** Ruta de la visita (#/eval/…); hasta los módulos 3 a 5, se abre en el prototipo. */
  eval?: { id: string; paso: string };
  asignar?: string;      // «FIN-…|pato»
  reasignar?: string;    // id de la visita
  reprog?: string;       // id de la visita
}

export interface EstadoLinea {
  f: Finca; sp: Especie; evs: Evaluacion[]; abierta: Evaluacion | undefined; ultimaFin: Evaluacion | undefined; proc: InfoProceso | null;
  ev: Evaluacion | null; estado: EstadoEspecie; principal: AccionFlujo | null; secundaria: AccionFlujo | null; nota?: string;
}

export const COLOR_FLUJO: Record<EstadoEspecie | EstadoProductor, string> = {
  'Por asignar': 'e-gris', Asignada: 'e-info', 'En proceso': 'e-medio', Devuelta: 'e-alerta', 'Pendiente de aprobación': 'e-rev', Aprobada: 'e-ok', 'Seguimiento programado': 'e-seg',
  'Sin programar': 'e-gris', 'En evaluación': 'e-medio', 'En revisión del ICA': 'e-rev', 'Plan de mejora': 'e-seg', Certificada: 'e-ok', 'Constancia vencida': 'e-gris',
};
/** Colores de las gráficas del tablero (validados para daltonismo; siempre con etiqueta y número). */
export const COLOR_GRAFICA: Record<EstadoEspecie | EstadoProductor, string> = {
  'Por asignar': '#8A9488', Asignada: '#3E7CB1', 'En proceso': '#C99A06', Devuelta: '#C0392B', 'Pendiente de aprobación': '#D9822B', Aprobada: '#048C38', 'Seguimiento programado': '#7A5AA6',
  'Sin programar': '#8A9488', 'En evaluación': '#C99A06', 'En revisión del ICA': '#D9822B', 'Plan de mejora': '#7A5AA6', Certificada: '#048C38', 'Constancia vencida': '#8A9488',
};
export const COLOR_PROCESO: Record<EstadoProceso, string> = {
  'Seguimiento programado': 'e-seg', Cumplido: 'e-ok', 'En seguimiento': 'e-info', 'En curso': 'e-medio', 'Requiere ampliación': 'e-medio', 'Cerrado sin cumplir': 'e-alerta',
};
const VISTA_PRODUCTOR: Partial<Record<EstadoEspecie, EstadoProductor>> = {
  'Por asignar': 'Sin programar', Asignada: 'En evaluación', 'En proceso': 'En evaluación', Devuelta: 'En evaluación',
  'Pendiente de aprobación': 'En revisión del ICA', 'Seguimiento programado': 'Plan de mejora',
};

export const nombreEspecie = (sp: Especie) => (sp === 'pato' ? 'Patos' : 'Gansos');
export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
export const hoyISO = () => new Date().toISOString().slice(0, 10);
export const constanciaVigente = (c: Constancia | null | undefined) => !!c && hoyISO() <= c.vence;

export class Flujo {
  private readonly cache = new Map<string, Resultado>();
  private readonly fincaPorId: Map<string, Finca>;

  constructor(readonly datos: DatosFlujo, readonly yo: Observador) {
    this.fincaPorId = new Map(datos.fincas.map((f) => [f.id, f]));
  }

  get esProductor() { return this.yo.rol === 'productor'; }
  get esGestor() { return this.yo.rol === 'coordinador' || this.yo.rol === 'admin'; }
  finca(id: string) { return this.fincaPorId.get(id); }

  /** Resultado de una visita (se guarda en memoria mientras no cambien los datos). */
  resultado(ev: Evaluacion): Resultado {
    let r = this.cache.get(ev.id);
    if (!r) { r = resultado(ev, this.finca(ev.finca)!); this.cache.set(ev.id, r); }
    return r;
  }
  avance(ev: Evaluacion) { return avance(ev, this.finca(ev.finca)!); }

  /** Cumple = puntaje ≥ 90, sin indicadores en 0, sin pendientes ni documentos por entregar. */
  verificarCumplimiento(ev: Evaluacion): { cumple: boolean; motivos: string[]; r: Resultado } {
    const r = this.resultado(ev), motivos: string[] = [];
    if (r.total < CRITERIO_CUMPLE.puntajeMin) motivos.push(`Puntaje ${fmt(r.total)}: se requiere ${CRITERIO_CUMPLE.puntajeMin} o más (nivel Excelente)`);
    const ceros = r.filas.filter((x) => x.score === 0);
    if (CRITERIO_CUMPLE.sinCeros && ceros.length) motivos.push(`${ceros.length} indicador${ceros.length > 1 ? 'es' : ''} en 0: ${ceros.map((x) => x.ind.num).join(', ')}`);
    if (CRITERIO_CUMPLE.sinPendientes && r.pend) motivos.push(`${r.pend} indicador${r.pend > 1 ? 'es' : ''} sin calificar`);
    if (CRITERIO_CUMPLE.sinPendientes && r.provisional) motivos.push('Documentos pendientes de entrega');
    return { cumple: !motivos.length, motivos, r };
  }

  /* ---------------- procesos de seguimiento ---------------- */
  maxSeguimientos(pid: string) { return this.datos.procesos[pid]?.ampliado ? MAX_SEGUIMIENTOS : SEGUIMIENTOS_BASE; }
  nombreVisita(ev: Evaluacion) { return ev.visita ? `Seguimiento ${ev.visita} de ${this.maxSeguimientos(ev.proceso)}` : 'Visita inicial'; }
  nombreCorto(ev: Evaluacion) { return ev.visita ? `Seg. ${ev.visita}` : 'Inicial'; }
  visitasProceso(pid: string) { return this.datos.evals.filter((e) => e.proceso === pid && e.estado !== 'Anulada').sort((a, b) => a.visita - b.visita); }

  estadoProceso(pid: string): InfoProceso {
    const v = this.visitasProceso(pid), ultima = v[v.length - 1], max = this.maxSeguimientos(pid);
    const usados = Math.max(0, ...v.map((e) => e.visita || 0));
    const abierta = v.find((e) => e.estado !== 'Finalizada');
    const otraAbierta = this.datos.evals.some((e) => e.finca === ultima.finca && e.sp === ultima.sp && esAbierta(e.estado));
    const visitaCumple = v.find((e) => e.estado === 'Finalizada' && this.verificarCumplimiento(e).cumple);
    const agotado = usados >= max, puedeAmpliar = !visitaCumple && !abierta && agotado && max < MAX_SEGUIMIENTOS;
    const estado: EstadoProceso = visitaCumple ? 'Cumplido' : abierta ? (abierta.estado === 'Programada' && abierta.visita > 0 ? 'Seguimiento programado' : 'En curso')
      : agotado ? (puedeAmpliar ? 'Requiere ampliación' : 'Cerrado sin cumplir') : 'En seguimiento';
    return { id: pid, visitas: v, ultima, finca: ultima.finca, sp: ultima.sp, usados, max, restantes: max - usados, abierta, estado,
      cumplido: !!visitaCumple, visitaCumple, cerrado: estado === 'Cumplido' || estado === 'Cerrado sin cumplir',
      completo: agotado, puedeAmpliar, ampliacion: this.datos.procesos[pid]?.ampliado,
      puedeSeguimiento: !visitaCumple && !abierta && !otraAbierta && ultima.estado === 'Finalizada' && usados < max,
      puedeNuevo: !otraAbierta && (estado === 'Cumplido' || estado === 'Cerrado sin cumplir' || estado === 'Requiere ampliación'),
      final: estado === 'Cumplido' || estado === 'Cerrado sin cumplir' ? ultima : null };
  }
  /** Procesos de una finca y especie (el más reciente primero). */
  procesosDe(fincaId: string, sp?: Especie): InfoProceso[] {
    const ids = [...new Set(this.datos.evals.filter((e) => e.finca === fincaId && (!sp || e.sp === sp)).map((e) => e.proceso))];
    return ids.map((pid) => this.estadoProceso(pid)).sort((a, b) => (b.ultima.fecha || '').localeCompare(a.ultima.fecha || ''));
  }

  /* ---------------- estado por finca y especie ---------------- */
  /** Visitas de una finca y especie, la más reciente primero (las anuladas no cuentan). */
  evaluacionesDe(fincaId: string, sp: Especie) {
    return this.datos.evals.filter((e) => e.finca === fincaId && e.sp === sp && e.estado !== 'Anulada')
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.visita || 0) - (a.visita || 0));
  }
  /** Indicadores aplicables que aún no tienen calificación, en el orden de la norma. */
  pendientesEval(ev: Evaluacion) {
    const ctx = contexto(ev, this.finca(ev.finca)!);
    return indicadoresDe(ev.sp).filter((i) => !aplica(i, ctx) && !calcular(i, ev.resp[i.code], ctx).done);
  }
  /** Paso lógico para continuar una visita: apertura si falta, luego el primer indicador pendiente y, si no queda, el cierre. */
  pasoContinuar(ev: Evaluacion): string {
    if (!['Programada', 'En proceso', 'Devuelta'].includes(ev.estado)) return 'resultado';
    if (!ev.apertura || !ev.apertura.atiende) return 'apertura';
    return this.pendientesEval(ev)[0]?.code ?? 'cierre';
  }

  /** Estado de la evaluación de una finca para una especie y la acción que corresponde a quien mira (v0.25). */
  estadoEspecie(f: Finca, sp: Especie): EstadoLinea {
    const evs = this.evaluacionesDe(f.id, sp), abierta = evs.find((e) => esAbierta(e.estado));
    const ultimaFin = evs.find((e) => e.estado === 'Finalizada'), proc = this.procesosDe(f.id, sp)[0] ?? null;
    const rol = this.yo.rol, activa = f.estado === 'ACTIVA', mia = !!abierta && abierta.inspector === this.yo.clave;
    const out: EstadoLinea = { f, sp, evs, abierta, ultimaFin, proc, ev: abierta || ultimaFin || null, estado: 'Por asignar', principal: null, secundaria: null };
    const ver = (e: Evaluacion, t?: string): AccionFlujo => ({ texto: t || 'Ver resultados', eval: { id: e.id, paso: 'resultado' } });
    if (abierta) out.estado = abierta.estado === 'Programada' ? (abierta.visita > 0 && ultimaFin ? 'Seguimiento programado' : 'Asignada')
      : abierta.estado === 'Pendiente de aprobación' ? 'Pendiente de aprobación' : abierta.estado === 'Devuelta' ? 'Devuelta' : 'En proceso';
    else out.estado = ultimaFin ? 'Aprobada' : 'Por asignar';
    if (rol === 'inspector') {
      if (abierta && mia && activa && abierta.estado === 'Programada' && abierta.visita > 0) out.secundaria = { texto: 'Reprogramar', reprog: abierta.id };
      if (abierta && mia && activa) out.principal = abierta.estado === 'Programada' ? { texto: abierta.visita > 0 ? 'Iniciar seguimiento' : 'Iniciar inspección', eval: { id: abierta.id, paso: '' } }
        : abierta.estado === 'En proceso' ? { texto: 'Continuar inspección', eval: { id: abierta.id, paso: this.pasoContinuar(abierta) } }
        : abierta.estado === 'Devuelta' ? { texto: 'Corregir y reenviar', eval: { id: abierta.id, paso: 'cierre' } }
        : { ...ver(abierta, 'Ver lo enviado'), sec: true };
      else if (abierta && !mia) out.nota = 'Asignada a otro inspector';
      else if (ultimaFin) out.principal = { ...ver(ultimaFin), sec: true };
    } else if (rol === 'coordinador' || rol === 'admin') {
      if (out.estado === 'Por asignar') out.principal = activa ? { texto: 'Asignar inspector', asignar: `${f.id}|${sp}` } : null;
      else if (out.estado === 'Pendiente de aprobación') out.principal = rol === 'coordinador' ? ver(abierta!, 'Revisar y aprobar') : { ...ver(abierta!, 'Ver lo enviado'), sec: true };
      else if (out.estado === 'Asignada' || out.estado === 'Seguimiento programado') out.principal = activa ? { texto: 'Reasignar', reasignar: abierta!.id, sec: true } : null;
      else if (abierta) out.principal = { ...ver(abierta, 'Ver avance'), sec: true };
      else {
        out.principal = { ...ver(ultimaFin!), sec: true };
        if (activa && proc && proc.puedeSeguimiento) out.secundaria = { texto: `Asignar seguimiento ${proc.usados + 1} de ${proc.max}`, asignar: `${f.id}|${sp}` };
        else if (activa && proc && proc.puedeNuevo) out.secundaria = { texto: 'Asignar nueva inspección', asignar: `${f.id}|${sp}` };
      }
    } else if (ultimaFin) out.principal = { ...ver(ultimaFin), sec: true };
    return out;
  }
  estadosFinca(f: Finca) { return f.especies.map((e) => this.estadoEspecie(f, e.sp)); }

  /** Texto del estado según quien mira: el productor ve una versión simple y no ve avances hasta que el ICA aprueba. */
  textoFlujo(s: EstadoLinea): EstadoEspecie | EstadoProductor {
    if (!this.esProductor) return s.estado;
    if (s.estado === 'Aprobada') { const c = s.ultimaFin?.constancia; return c ? (constanciaVigente(c) ? 'Certificada' : 'Constancia vencida') : 'Plan de mejora'; }
    return VISTA_PRODUCTOR[s.estado] ?? (s.estado as EstadoProductor);
  }
  estadosLista(): readonly (EstadoEspecie | EstadoProductor)[] { return this.esProductor ? ESTADOS_PRODUCTOR : ESTADOS_ESPECIE; }

  /** Fincas que ve quien mira: el productor, las suyas; el inspector, las que tienen una visita asignada a él; el resto, todas. */
  fincasVisibles(): Finca[] {
    const { rol, clave, nombre } = this.yo;
    if (!rol) return [];
    if (rol === 'productor') return this.datos.fincas.filter((f) => f.productor === nombre);
    if (rol === 'inspector') return this.datos.fincas.filter((f) => this.datos.evals.some((e) => e.finca === f.id && e.inspector === clave && e.estado !== 'Anulada'));
    return this.datos.fincas;
  }
  /** Conteo de fincas activas por estado (una finca con patos y gansos cuenta en cada estado de sus especies). */
  contarEstados(fs: Finca[]): Record<string, number> {
    const n: Record<string, number> = Object.fromEntries(this.estadosLista().map((e) => [e, 0]));
    fs.filter((f) => f.estado === 'ACTIVA').forEach((f) => new Set(this.estadosFinca(f).map((s) => this.textoFlujo(s))).forEach((e) => n[e]++));
    return n;
  }

  /** ¿Quien mira puede diligenciar esta visita? Solo el inspector asignado y mientras no esté enviada ni aprobada. */
  puedeEvaluar(ev: Evaluacion) { return this.yo.rol === 'inspector' && ev.inspector === this.yo.clave && ['Programada', 'En proceso', 'Devuelta'].includes(ev.estado); }
  /** ¿Puede ver el detalle? El productor solo lo aprobado; el inspector, lo suyo y lo aprobado de sus fincas. */
  puedeVerEval(ev: Evaluacion): boolean {
    const { rol, clave } = this.yo;
    if (!rol) return false;
    const suya = () => this.fincasVisibles().some((f) => f.id === ev.finca);
    if (rol === 'productor') return ev.estado === 'Finalizada' && suya();
    if (rol === 'inspector') return ev.inspector === clave || (ev.estado === 'Finalizada' && suya());
    return true;
  }
  /** Historial: el inspector ve sus visitas y las aprobadas de otros inspectores (no las ajenas en curso). */
  enHistorial(e: Evaluacion) { return this.yo.rol !== 'inspector' || e.inspector === this.yo.clave || e.estado === 'Finalizada'; }

  /** Evaluaciones finalizadas de una finca y especie en orden cronológico. */
  historicoFinalizadas(fid: string, sp: Especie) {
    return this.datos.evals.filter((x) => x.finca === fid && x.sp === sp && x.estado === 'Finalizada')
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.visita || 0) - (b.visita || 0));
  }

  /** Indicadores con promedio bajo 90 en las visitas finalizadas (los 5 que más requieren atención). */
  criteriosAtencion(finalizadas: Evaluacion[]) {
    const m: Record<string, { ind: Resultado['filas'][number]['ind']; n: number; suma: number; ceros: number }> = {};
    finalizadas.forEach((e) => this.resultado(e).filas.forEach(({ ind, score }) => {
      const x = (m[ind.code] ??= { ind, n: 0, suma: 0, ceros: 0 }); x.n++; x.suma += score; if (score === 0) x.ceros++;
    }));
    const porNum = (a: { ind: { num: string } }, b: { ind: { num: string } }) => a.ind.num.localeCompare(b.ind.num, 'es', { numeric: true });
    return Object.values(m).map((x) => ({ ...x, prom: x.suma / x.n })).filter((x) => x.prom < 90)
      .sort((a, b) => a.prom - b.prom || b.ceros - a.ceros || porNum(a, b)).slice(0, 5);
  }
}
