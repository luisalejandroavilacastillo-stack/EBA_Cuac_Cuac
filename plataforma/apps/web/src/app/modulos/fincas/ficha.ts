import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  COLOR_PROCESO, fmt, nombreEspecie, nombreEstadoVisita, planMuestreoVisita, poblacion, poblacionEspecie, tramo, tramoFinca, tramosTexto,
  type Evaluacion, type Finca, type Titular,
} from '@eba/norma';
import { Evolucion, LineaFlujo, fechaCorta } from '../../compartido/flujo-ui';
import { Datos } from '../../nucleo/datos';
import { EnlaceVisita } from '../../compartido/enlace-visita';
import { Dialogo } from '../../nucleo/dialogo';
import { Notificaciones } from '../../nucleo/notificaciones';
import { Sesion } from '../../nucleo/sesion';
import { Migas } from '../../nucleo/migas';
import { CamposTitular, enmascara, enmascaraC, enmascaraTel, formatoTel, limpiarTitular, titularVacio, validarTitular } from './titular';

const MOTIVOS_INACTIVAR = ['Cese de producción', 'Venta de la finca', 'Cierre sanitario'];

/** Ficha de la finca (CU-05): evaluación por especie, datos, persona responsable, historial y población. Igual a vFinca() del prototipo. */
@Component({
  selector: 'app-ficha-finca',
  imports: [FormsModule, RouterLink, LineaFlujo, Evolucion, CamposTitular, EnlaceVisita],
  templateUrl: './ficha.html',
})
export class FichaFinca {
  /** Llega de la ruta /fincas/:id. */
  readonly id = input.required<string>();
  protected readonly datos = inject(Datos);
  protected readonly sesion = inject(Sesion);
  private readonly avisos = inject(Notificaciones);
  private readonly dialogo = inject(Dialogo);
  private readonly router = inject(Router);
  protected readonly fmt = fmt;
  protected readonly fecha = fechaCorta;
  protected readonly nombreEspecie = nombreEspecie;
  protected readonly etqEstado = nombreEstadoVisita;
  protected readonly colorProceso = COLOR_PROCESO;
  protected readonly enmascara = enmascara;
  protected readonly enmascaraC = enmascaraC;
  protected readonly enmascaraTel = enmascaraTel;
  protected readonly formatoTel = formatoTel;
  protected readonly motivos = MOTIVOS_INACTIVAR;
  private readonly migas = inject(Migas);
  constructor() {
    effect(() => { const f = this.f(); this.migas.niveles.set([{ texto: 'Fincas', ruta: '/fincas' }, { texto: f?.nombre ?? 'Finca' }]); });
  }

  protected readonly flujo = computed(() => this.datos.flujo());
  protected readonly f = computed(() => this.datos.finca(this.id()));
  /** El productor solo ve sus fincas; el inspector, las que le asignaron. */
  protected readonly permitida = computed(() => !!this.f() && this.flujo().fincasVisibles().some((x) => x.id === this.id()));
  protected readonly gestor = computed(() => this.flujo().esGestor);
  protected readonly editaTitular = computed(() => this.gestor() || (this.sesion.perfil() === 'productor' && this.f()?.productor === this.sesion.usuario()?.nombre));
  protected readonly traspatio = computed(() => !!this.f() && tramoFinca(this.f()!) !== 'comercial');
  protected readonly lineas = computed(() => (this.f() ? this.flujo().estadosFinca(this.f()!) : []));
  protected readonly evs = computed(() => this.datos.evals().filter((e) => e.finca === this.id()));
  protected readonly resumen = computed(() => {
    const f = this.f(); if (!f) return null;
    return {
      aves: poblacion(f), tramo: f.especies.length > 1 ? tramosTexto(f) : tramoFinca(f) === 'comercial' ? 'Comercial' : 'Traspatio',
      especies: f.especies.map((e) => nombreEspecie(e.sp)).join(' y '),
      explicacion: f.especies.map((e) => { const ne = poblacionEspecie(e), t = tramo(ne), pl = planMuestreoVisita(ne, e.conCorral !== false, ne);
        return { titulo: `${nombreEspecie(e.sp)} (${ne} aves) · ${t === 'comercial' ? 'comercial' : 'traspatio'}:`,
          texto: t === 'comercial' ? 'se evalúan recursos, animales y gestión documental (animal 60 %, recursos 25 %, gestión 15 %).' : 'se evalúan recursos y animales, sin documentos (animal 70 %, recursos 30 %).',
          muestra: `Muestra prevista: ${pl.texto}.` }; }),
    };
  });
  /** Historial por especie: procesos con sus visitas, gráfica y tendencia. */
  protected readonly historial = computed(() => {
    const f = this.f(), flujo = this.flujo(); if (!f) return [];
    return f.especies.map((e) => {
      const procs = flujo.procesosDe(f.id, e.sp).map((st) => ({
        st, final: st.final ? fmt(flujo.resultado(st.final).total) : '',
        visitas: st.visitas.filter((x) => flujo.enHistorial(x)).map((x) => this.filaVisita(x)),
      }));
      const fins = flujo.historicoFinalizadas(f.id, e.sp), totales = fins.map((x) => flujo.resultado(x).total);
      const puntos = fins.map((x) => { const r = flujo.resultado(x); return [`${x.fecha.slice(8, 10)}/${x.fecha.slice(5, 7)}/${x.fecha.slice(2, 4)}`, r.total, r.provisional] as [string, number, boolean]; });
      return { sp: e.sp, procs, puntos, tendencia: this.tendencia(totales) };
    });
  });

  private filaVisita(x: Evaluacion) {
    const flujo = this.flujo(), prod = flujo.esProductor, oculto = x.estado === 'Programada' || (prod && x.estado !== 'Finalizada'), r = oculto ? null : flujo.resultado(x);
    const puede = flujo.puedeVerEval(x), evaluar = flujo.puedeEvaluar(x);
    return { x, nombre: flujo.nombreVisita(x), fecha: fechaCorta(x.fecha), estado: nombreEstadoVisita(x.estado), constancia: x.constancia?.codigo ?? '',
      inspector: x.estado === 'Finalizada' || prod ? '' : this.datos.nombreUsuario(x.inspector),
      puntaje: r ? fmt(r.total) : '—', nivel: r ? r.nivel[0] : '—',
      boton: puede ? { texto: x.estado === 'Finalizada' ? 'Ver resultados' : evaluar ? 'Abrir' : 'Ver', paso: evaluar ? '' : 'resultado' } : null };
  }
  private tendencia(t: number[]) {
    if (!t.length) return null;
    if (t.length < 2) return { clase: '', flecha: '', texto: `Una evaluación finalizada (${fmt(t[0])} puntos). La tendencia aparece desde la segunda.` };
    const d = t[t.length - 1] - t[t.length - 2], d0 = t[t.length - 1] - t[0];
    const txt = (v: number) => (Math.abs(v) < 0.05 ? 'se mantiene' : v > 0 ? `mejora ${fmt(v)}` : `disminuye ${fmt(-v)}`);
    return { clase: Math.abs(d) < 0.05 ? '' : d > 0 ? 'sube' : 'baja', flecha: Math.abs(d) < 0.05 ? '→' : d > 0 ? '↑' : '↓',
      texto: `Frente a la evaluación anterior ${txt(d)} puntos${t.length > 2 ? ` · frente a la primera, ${txt(d0)}` : ''}.` };
  }

  /* ---------------- Persona responsable ---------------- */
  protected readonly verCompleto = signal(false);
  protected readonly editandoT = signal(false);
  protected readonly titular = signal<Titular>(titularVacio());
  protected readonly errT = signal<Record<string, string>>({});
  protected async mostrarCompleto(): Promise<void> {
    const f = this.f()!; this.verCompleto.set(true);
    await this.datos.registrar(`Consulta de datos personales de ${f.titular!.nombre} (${f.nombre})`);
  }
  protected abrirTitular(): void {
    this.titular.set(this.f()!.titular ? { ...titularVacio(), ...this.f()!.titular! } : titularVacio());
    this.errT.set({}); this.editandoT.set(true);
  }
  protected async guardarTitular(): Promise<void> {
    const f = this.f()!, traspatio = tramoFinca(f) !== 'comercial', e = validarTitular(this.titular(), traspatio);
    this.errT.set(e); if (Object.keys(e).length) return;
    const t = limpiarTitular(this.titular()), antes = f.titular?.nombre ?? null;
    const nueva: Finca = { ...f, titular: t, ...(this.sesion.perfil() !== 'productor' ? { productor: t.nombre } : {}) };
    if (await this.guardar(nueva)) {
      await this.datos.registrar(`Actualización de la persona responsable de ${f.nombre}${antes && antes !== t.nombre ? ` (antes: ${antes})` : ''}`);
      this.editandoT.set(false); this.avisos.ok('Datos de la persona guardados.');
    }
  }

  /* ---------------- Población (el coordinador o el administrador actualizan las cantidades) ---------------- */
  private espera: ReturnType<typeof setTimeout> | null = null;
  protected cambiarCantidad(k: number, j: number, valor: string): void {
    const f = this.f()!, n = Math.max(0, +valor || 0);
    const nueva: Finca = { ...f, especies: f.especies.map((e, a) => (a !== k ? e : { ...e, inventario: e.inventario.map((c, b) => (b !== j ? c : { ...c, n })) })) };
    if (this.espera) clearTimeout(this.espera);
    this.espera = setTimeout(() => void this.guardar(nueva), 700);
  }

  /* ---------------- Eliminar, inactivar o reactivar ---------------- */
  protected readonly bajando = signal(false);
  protected readonly motivo = signal(MOTIVOS_INACTIVAR[0]);
  protected async baja(): Promise<void> {
    const f = this.f()!;
    if (this.evs().length) { this.motivo.set(MOTIVOS_INACTIVAR[0]); this.bajando.set(true); return; }
    if (!(await this.dialogo.confirmar({ titulo: `¿Eliminar ${f.nombre}?`, mensaje: 'La finca no tiene evaluaciones ni documentos. Se eliminará y quedará una copia en la bitácora.', aceptar: 'Eliminar', peligro: true }))) return;
    try {
      await this.datos.eliminarFinca(f.id);
      await this.datos.registrar(`Eliminación de ${f.nombre} (sin historial)`);
      this.avisos.ok('Finca eliminada.');
      void this.router.navigate(['/fincas']);
    } catch { /* el mensaje lo muestra el interceptor */ }
  }
  protected async inactivar(): Promise<void> {
    const f = this.f()!;
    if (await this.guardar({ ...f, estado: 'INACTIVA' })) {
      await this.datos.registrar(`Inactivación de ${f.nombre}: ${this.motivo()}`);
      this.bajando.set(false); this.avisos.ok('Finca inactivada. Su historial se conserva.');
    }
  }
  protected async reactivar(): Promise<void> {
    const f = this.f()!;
    if (await this.guardar({ ...f, estado: 'ACTIVA' })) await this.datos.registrar(`Reactivación de ${f.nombre}`);
  }

  private async guardar(f: Finca): Promise<boolean> {
    try { await this.datos.guardarFinca(f); return true; } catch { return false; }
  }
}
