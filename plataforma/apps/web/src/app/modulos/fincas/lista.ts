import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { COLOR_FLUJO, nombreEspecie, poblacion, tramo, type Especie, type Finca, type Titular } from '@eba/norma';
import { AccionFlujoBoton } from '../../compartido/flujo-ui';
import { Datos } from '../../nucleo/datos';
import { camposConError } from '../../nucleo/interceptores';
import { Notificaciones } from '../../nucleo/notificaciones';
import { Sesion } from '../../nucleo/sesion';
import { CamposTitular, enmascara, limpiarTitular, titularVacio, validarTitular } from './titular';

const sinTildes = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/** Lo que el coordinador dejó buscado o filtrado se conserva al volver de una ficha (como en el prototipo). */
const FILTRO = { q: '', estado: '' };

/**
 * Fincas (CU-04, CU-05): centro de trabajo con el estado de cada evaluación por especie y la acción que corresponde al perfil.
 * Igual a vFincas() del prototipo v0.25. Registran fincas el coordinador y el administrador.
 */
@Component({
  selector: 'app-lista-fincas',
  imports: [FormsModule, RouterLink, AccionFlujoBoton, CamposTitular],
  templateUrl: './lista.html',
})
export class ListaFincas {
  protected readonly datos = inject(Datos);
  protected readonly sesion = inject(Sesion);
  private readonly avisos = inject(Notificaciones);
  protected readonly color = COLOR_FLUJO;
  protected readonly nombreEspecie = nombreEspecie;
  protected readonly enmascara = enmascara;
  protected readonly poblacion = poblacion;
  protected readonly tramo = tramo;

  protected readonly q = signal(FILTRO.q);
  protected readonly estado = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('estado') ?? FILTRO.estado);
  protected readonly flujo = computed(() => this.datos.flujo());
  protected readonly rol = computed(() => this.sesion.perfil());
  protected readonly gestor = computed(() => this.flujo().esGestor);
  protected readonly fs = computed(() => this.flujo().fincasVisibles());
  protected readonly conteo = computed(() => this.flujo().contarEstados(this.fs()));
  protected readonly filas = computed(() => {
    FILTRO.q = this.q(); FILTRO.estado = this.estado();
    const q = sinTildes(this.q().trim()), est = this.estado(), flujo = this.flujo();
    return this.fs().filter((f) => (!q || sinTildes(f.nombre).includes(q)) && (!est || (f.estado === 'ACTIVA' && flujo.estadosFinca(f).some((s) => flujo.textoFlujo(s) === est))))
      .map((f) => ({ f, aves: poblacion(f), estados: flujo.estadosFinca(f).map((s) => ({ s, texto: flujo.textoFlujo(s), inspector: s.abierta && !flujo.esProductor && s.estado !== 'Por asignar' ? this.datos.nombreUsuario(s.abierta.inspector) : '' })) }));
  });
  protected readonly titulo = computed(() => (this.rol() === 'productor' ? 'Mis fincas' : this.rol() === 'inspector' ? 'Mis fincas asignadas' : 'Fincas'));
  protected readonly intro = computed(() => (this.rol() === 'productor' ? 'Aquí ve, por especie, el estado de su inspección. El resultado aparece cuando el coordinador del ICA lo aprueba.'
    : this.rol() === 'inspector' ? 'Solo aparecen las fincas que el coordinador le asignó. Diligencie la visita y finalícela: el coordinador la revisa y la aprueba.'
    : 'Asigne cada inspección a un inspector y apruebe o devuelva las que le envían.'));

  /* ---------------- Registrar finca (coordinador y administrador) ---------------- */
  protected readonly especiesReg: Especie[] = ['pato', 'ganso'];
  protected readonly registrando = signal(false);
  protected readonly nf = signal({ nombre: '', depto: '', mpio: '', especies: { pato: { si: false, n: null as number | null }, ganso: { si: false, n: null as number | null } } });
  protected readonly titular = signal<Titular>(titularVacio());
  protected readonly errT = signal<Record<string, string>>({});
  protected readonly errF = signal('');
  protected readonly guardando = signal(false);
  protected readonly departamentos = computed(() => this.datos.departamentos().length ? this.datos.departamentos() : ['Boyacá', 'Cundinamarca', 'Santander', 'Tolima']);
  protected readonly marcadas = computed(() => (['pato', 'ganso'] as Especie[]).filter((sp) => this.nf().especies[sp].si));
  protected readonly totalAves = computed(() => this.marcadas().reduce((t, sp) => t + (+(this.nf().especies[sp].n ?? 0) || 0), 0));
  protected readonly traspatioReg = computed(() => this.totalAves() > 0 && !this.marcadas().some((sp) => tramo(+(this.nf().especies[sp].n ?? 0) || 0) === 'comercial'));
  protected readonly textoTramo = computed(() => {
    const m = this.marcadas(), n = this.totalAves(), tr = this.traspatioReg();
    if (!m.length) return { clase: '', html: 'Marque una o las dos especies y escriba cuántas aves hay.', sub: '' };
    if (!n) return { clase: '', html: 'Escriba cuántas aves hay de cada especie.', sub: '' };
    if (m.length === 1) return { clase: tr ? 't-trasp' : 't-com', html: `${n} aves · ${tr ? 'Traspatio' : 'Comercial'}`, sub: `${tr ? 'menos de 200 aves' : '200 aves o más'} (Tabla 3)` };
    return { clase: tr ? 't-trasp' : 't-com', html: m.map((sp) => { const k = +(this.nf().especies[sp].n ?? 0) || 0; return `${nombreEspecie(sp)}: ${k} · ${tramo(k) === 'comercial' ? 'Comercial' : 'Traspatio'}`; }).join('  ·  '), sub: 'Cada especie se evalúa con su propio número (Tabla 3).' };
  });

  protected abrirRegistro(): void {
    this.nf.set({ nombre: '', depto: '', mpio: '', especies: { pato: { si: false, n: null }, ganso: { si: false, n: null } } });
    this.titular.set(titularVacio()); this.errT.set({}); this.errF.set(''); this.registrando.set(true);
    setTimeout(() => document.getElementById('fn1')?.focus());
  }
  protected cambiarF(k: 'nombre' | 'depto' | 'mpio', v: string): void { this.nf.update((x) => ({ ...x, [k]: v })); }
  protected cambiarEsp(sp: Especie, k: 'si' | 'n', v: boolean | number | null): void {
    this.nf.update((x) => ({ ...x, especies: { ...x.especies, [sp]: { ...x.especies[sp], [k]: v, ...(k === 'si' && !v ? { n: null } : {}) } } }));
    if (k === 'si' && v) setTimeout(() => document.getElementById(`f${sp}_n`)?.focus());
  }

  protected async registrar(): Promise<void> {
    const x = this.nf(), sps = this.marcadas();
    if (!x.nombre.trim() || !x.mpio.trim() || !x.depto) { this.errF.set('Complete el nombre de la finca, el departamento y el municipio.'); return; }
    if (!sps.length) { this.errF.set('Marque al menos una especie.'); return; }
    if (sps.some((sp) => !(+(x.especies[sp].n ?? 0) > 0))) { this.errF.set('Escriba el número de aves de cada especie marcada.'); return; }
    const e = validarTitular(this.titular(), tramo(this.totalAves()) !== 'comercial');
    this.errT.set(e);
    if (Object.keys(e).length) { this.errF.set('Revise los datos de la persona responsable.'); return; }
    this.errF.set('');
    const t = limpiarTitular(this.titular());
    const anio = new Date().getFullYear(), usados = new Set(this.datos.fincas().map((f) => f.id));
    let k = this.datos.fincas().filter((f) => f.id.startsWith(`FIN-${anio}-`)).length + 1, id: string;
    do { id = `FIN-${anio}-${String(k++).padStart(5, '0')}`; } while (usados.has(id));
    const finca: Finca = {
      id, nombre: x.nombre.trim(), productor: t.nombre, titular: t, depto: x.depto, mpio: x.mpio.trim(), vereda: '', estado: 'ACTIVA', area: 0,
      // propósito, sistema e instalaciones no se piden al registrar: en la visita el inspector marca «No aplica» donde corresponda
      especies: sps.map((sp) => ({ sp, proposito: 'Carne', sistema: 'Semi-intensivo', conCorral: true, ...(sp === 'pato' ? { permanencia: true, cama: true } : {}),
        inventario: [{ cat: 'General', n: +(x.especies[sp].n ?? 0), edad: 0, peso: 0 }] })),
    };
    this.guardando.set(true);
    try {
      await this.datos.guardarFinca(finca);
      await this.datos.registrar(`Registro de la finca ${finca.nombre}`);
      this.registrando.set(false);
      this.avisos.ok(`Finca registrada (${tramo(this.totalAves()) === 'comercial' ? 'comercial' : 'traspatio'}) a nombre de ${t.nombre}.`);
      this.q.set(''); this.estado.set('');
    } catch (err) {
      const c = camposConError(err);
      if (Object.keys(c).length) this.errF.set(Object.values(c)[0]);
    } finally { this.guardando.set(false); }
  }
}
