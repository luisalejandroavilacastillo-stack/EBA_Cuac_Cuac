import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { aplica, avisoFechaSeguimiento, esAbierta, fechaLarga, fmt, indicadoresDe, nombreEspecie, nombreEstadoVisita, tramoEspecie, tramosTexto, MAX_SEGUIMIENTOS, type Especie } from '@eba/norma';
import { Acciones, type TipoVisita } from '../nucleo/acciones';
import { Datos } from '../nucleo/datos';

const hoy = () => new Date().toISOString().slice(0, 10);

/**
 * Ventanas del flujo de visitas, iguales a las del prototipo: «Asignar inspección», «Reasignar» y «Reprogramar».
 * Se abren desde cualquier pantalla con el servicio Acciones (asignando, reasignando, reprogramando).
 */
@Component({
  selector: 'app-ventanas-visita',
  imports: [FormsModule],
  template: `
@if (acc.asignando()) {
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titAs" (keydown.escape)="acc.asignando.set(null)">
    <div class="modal-medio">
      <div class="modal-cab"><h3 id="titAs">Asignar inspección</h3><p class="muted">Elija el inspector y la fecha acordada con el productor. Si la finca ya tiene un proceso, la visita puede ser de seguimiento y retoma lo registrado en la última evaluación.</p></div>
      <form novalidate (ngSubmit)="asignar()"><div class="modal-cuerpo">
        <div class="campo"><label for="ne1">Finca y especie</label>
          <select id="ne1" name="ne1" [ngModel]="acc.asignando()" (ngModelChange)="acc.asignando.set($event)">@for (o of opciones(); track o.v) { <option [value]="o.v">{{ o.t }}</option> }</select></div>
        <div class="campo"><label>Tipo de visita</label>
          @if (prev(); as p) {
            @if (p.abierta) {
              <p class="etiqueta e-medio">Ya hay una visita sin aprobar ({{ p.abierta.id }} · {{ p.abiertaTxt }}).@if (p.abierta.estado === 'Programada') { <a href="" (click)="$event.preventDefault(); reasignarDesde(p.abierta.id)">Reasignarla</a> }</p>
            } @else {
              @if (p.aviso) { <p [class]="p.avisoClase" style="margin-bottom:8px">{{ p.aviso }}</p> }
              @for (t of p.tipos; track t.k) { <label class="chk"><input type="radio" name="tipo" [value]="t.k" [checked]="tipo() === t.k" (change)="tipo.set(t.k)"><span><b>{{ t.titulo }}</b>{{ t.texto }}</span></label> }
            }
          }
        </div>
        <div class="fila fila-3">
          <div class="campo"><label for="ne2">Fecha de la visita</label><input id="ne2" name="ne2" type="date" [min]="hoy" [ngModel]="fecha()" (ngModelChange)="fecha.set($event)"></div>
          <div class="campo"><label for="ne3">Hora</label><input id="ne3" name="ne3" type="time" value="07:00"></div>
          <div class="campo"><label for="ne4">Inspector</label><select id="ne4" name="ne4" [ngModel]="inspector()" (ngModelChange)="inspector.set($event)">@for (i of inspectores(); track i[0]) { <option [value]="i[0]">{{ i[1] }}</option> }</select></div>
        </div>
        @if (prev(); as p) { <div class="aplica"><span>📋</span><span>{{ p.resumen }}<br><b>{{ p.tramos }}</b> (el tramo y la muestra se calculan por especie, Tabla 3).</span></div> }
        <span class="error-campo" role="alert">{{ error() }}</span></div>
        <div class="acciones"><button type="button" class="btn btn-sec" (click)="acc.asignando.set(null)">Cancelar</button>
          <button class="btn btn-primario" [disabled]="!!prev()?.abierta || guardando()">Crear evaluación</button></div>
      </form>
    </div>
  </div>
}

@if (reasig(); as r) {
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titRe" (keydown.escape)="acc.reasignando.set(null)">
    <div>
      <div class="modal-cab"><h3 id="titRe">Reasignar {{ r.nombreVisita.toLowerCase() }}</h3><p class="muted">{{ r.finca }} · {{ r.especie }} · {{ r.ev.id }} · hoy la tiene {{ r.actual }}</p></div>
      <div class="modal-cuerpo"><div class="fila">
        <div class="campo"><label for="raI">Inspector</label><select id="raI" [ngModel]="inspector()" (ngModelChange)="inspector.set($event)">@for (i of inspectores(); track i[0]) { <option [value]="i[0]">{{ i[1] }}</option> }</select></div>
        <div class="campo"><label for="raF">Fecha de la visita</label><input type="date" id="raF" [min]="hoy" [ngModel]="fecha()" (ngModelChange)="fecha.set($event)" [disabled]="!r.noIniciada">
          @if (!r.noIniciada) { <span class="ayuda-campo">La visita ya empezó: se conserva la fecha y lo registrado.</span> }</div>
      </div><span class="error-campo" role="alert">{{ error() }}</span></div>
      <div class="acciones"><button type="button" class="btn btn-sec" (click)="acc.reasignando.set(null)">Cancelar</button><button type="button" class="btn btn-primario" [disabled]="guardando()" (click)="reasignar()">Guardar</button></div>
    </div>
  </div>
}

@if (reprog(); as r) {
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titRp" (keydown.escape)="acc.reprogramando.set(null)">
    <div>
      <div class="modal-cab"><h3 id="titRp">Reprogramar {{ r.nombreVisita.toLowerCase() }}</h3><p class="muted">{{ r.finca }} · {{ r.especie }} · fecha actual {{ r.fechaActual }}</p></div>
      <div class="modal-cuerpo">
        <div class="campo"><label for="rpF">Nueva fecha de la visita</label><input type="date" id="rpF" [min]="hoy" [ngModel]="fecha()" (ngModelChange)="fecha.set($event)"><span class="aviso-seg">{{ avisoReprog() }}</span></div>
        <div class="campo"><label for="rpM">Motivo</label><input id="rpM" placeholder="Ej.: el productor pidió otra fecha; vía cerrada por lluvias" [ngModel]="motivo()" (ngModelChange)="motivo.set($event)"></div>
        <span class="error-campo" role="alert">{{ error() }}</span></div>
      <div class="acciones"><button type="button" class="btn btn-sec" (click)="acc.reprogramando.set(null)">Cancelar</button><button type="button" class="btn btn-primario" [disabled]="guardando()" (click)="reprogramarGuardar()">Guardar fecha</button></div>
    </div>
  </div>
}`,
})
export class VentanasVisita {
  protected readonly acc = inject(Acciones);
  private readonly datos = inject(Datos);
  protected readonly hoy = hoy();
  protected readonly tipo = signal<TipoVisita>('cero');
  protected readonly fecha = signal(hoy());
  protected readonly inspector = signal('');
  protected readonly motivo = signal('');
  protected readonly error = signal('');
  protected readonly guardando = signal(false);
  private ultima = ''; private ultimaRe = ''; private ultimaRp = '';
  protected readonly inspectores = computed(() => this.datos.inspectores());

  protected readonly opciones = computed(() => this.datos.fincas().filter((f) => f.estado === 'ACTIVA')
    .flatMap((f) => f.especies.map((e) => ({ v: `${f.id}|${e.sp}`, t: `${f.nombre} · ${nombreEspecie(e.sp)}` }))));

  /** Explicación y opciones de la finca y especie elegidas (igual al prototipo). */
  protected readonly prev = computed(() => {
    const v = this.acc.asignando(); if (!v) return null;
    const [fid, sp] = v.split('|') as [string, Especie], f = this.datos.finca(fid); if (!f) return null;
    const flujo = this.datos.flujo(), e = f.especies.find((x) => x.sp === sp)!, t = tramoEspecie(e);
    const ind = indicadoresDe(sp), ok = ind.filter((i) => !aplica(i, { e, tramo: t, f } as never)).length;
    const procs = flujo.procesosDe(fid, sp), abierta = this.datos.evals().find((x) => x.finca === fid && x.sp === sp && esAbierta(x.estado));
    const ult = procs[0], ultFin = this.datos.evals().filter((x) => x.finca === fid && x.sp === sp && x.estado === 'Finalizada').sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
    const tipos: { k: TipoVisita; titulo: string; texto: string }[] = [];
    if (ult && ult.puedeSeguimiento) tipos.push({ k: 'seg', titulo: `Visita de seguimiento ${ult.usados + 1} de ${ult.max}`, texto: ` del proceso ${ult.id}: retoma ${ult.ultima.id} (${fechaLarga(ult.ultima.fecha)}, ${fmt(flujo.resultado(ult.ultima).total)} puntos) para mejorar el puntaje o completar lo que faltó.` });
    if (ultFin) tipos.push({ k: 'retoma', titulo: 'Nuevo proceso retomando la última evaluación', texto: ` (${ultFin.id}): copia lo registrado como punto de partida; la evaluación anterior queda en el histórico.` });
    tipos.push({ k: 'cero', titulo: 'Nuevo proceso desde cero', texto: ': lista de chequeo vacía.' });
    const aviso = ult && ult.cumplido ? { t: `El proceso ${ult.id} está cumplido (${flujo.nombreVisita(ult.visitaCumple!)}): no requiere seguimientos. Si se necesita, inicie un proceso nuevo.`, c: 'etiqueta e-ok' }
      : ult && ult.puedeAmpliar ? { t: `El proceso ${ult.id} usó sus ${ult.max} seguimientos sin cumplir: el coordinador puede ampliarlo a ${MAX_SEGUIMIENTOS} desde el resultado de la última visita.`, c: 'etiqueta e-medio' }
      : ult && ult.completo ? { t: `El proceso ${ult.id} se cerró sin cumplir: se inicia un proceso nuevo.`, c: 'muted' } : null;
    return { abierta, abiertaTxt: abierta ? `${flujo.nombreVisita(abierta)} · ${nombreEstadoVisita(abierta.estado).toLowerCase()} · ${this.datos.nombreUsuario(abierta.inspector)}` : '',
      tipos, aviso: aviso?.t ?? '', avisoClase: aviso?.c ?? '', tramos: tramosTexto(f),
      resumen: `${ind.length} indicadores de ${sp === 'pato' ? 'patos (numeral 6)' : 'gansos (numeral 7)'}; aplican ${ok} para esta finca (${t}).` };
  });

  protected readonly reasig = computed(() => {
    const id = this.acc.reasignando(), ev = id ? this.datos.evals().find((e) => e.id === id) : null; if (!ev) return null;
    return { ev, nombreVisita: this.datos.flujo().nombreVisita(ev), finca: this.datos.finca(ev.finca)?.nombre ?? '', especie: nombreEspecie(ev.sp), actual: this.datos.nombreUsuario(ev.inspector), noIniciada: ev.estado === 'Programada' };
  });
  protected readonly reprog = computed(() => {
    const id = this.acc.reprogramando(), ev = id ? this.datos.evals().find((e) => e.id === id) : null; if (!ev) return null;
    return { ev, nombreVisita: this.datos.flujo().nombreVisita(ev), finca: this.datos.finca(ev.finca)?.nombre ?? '', especie: nombreEspecie(ev.sp), fechaActual: fechaLarga(ev.fecha) };
  });
  protected readonly avisoReprog = computed(() => {
    const r = this.reprog(); if (!r) return '';
    const base = this.datos.evals().find((e) => e.id === r.ev['base']) ?? r.ev;
    return avisoFechaSeguimiento(base, this.fecha());
  });

  constructor() {
    // Al abrir o cambiar la finca: primer tipo de visita y, por defecto, el inspector que ya conoce la finca.
    effect(() => {
      const p = this.prev(), v = this.acc.asignando(); if (!v) { this.ultima = ''; return; }
      if (v === this.ultima) return;   // los datos se recargan cada 15 s: no se pierde lo que la persona eligió
      this.ultima = v; this.error.set(''); this.fecha.set(hoy());
      if (p?.tipos.length) this.tipo.set(p.tipos[0].k);
      const [fid, sp] = v.split('|');
      const ult = this.datos.evals().filter((x) => x.finca === fid && x.sp === sp).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0];
      const ins = this.datos.inspectores();
      this.inspector.set(ult && ins.some(([k]) => k === ult.inspector) ? ult.inspector : ins[0]?.[0] ?? '');
    });
    effect(() => { const r = this.reasig(); if (r && r.ev.id !== this.ultimaRe) { this.ultimaRe = r.ev.id; this.error.set(''); this.inspector.set(r.ev.inspector); this.fecha.set(r.ev.fecha); } });
    effect(() => { const r = this.reprog(); if (r && r.ev.id !== this.ultimaRp) { this.ultimaRp = r.ev.id; this.error.set(''); this.fecha.set(r.ev.fecha); this.motivo.set(''); } });
  }

  protected reasignarDesde(id: string) { this.acc.asignando.set(null); this.acc.reasignando.set(id); }

  protected async asignar() {
    const [fid, sp] = this.acc.asignando()!.split('|') as [string, Especie];
    await this.correr(() => this.acc.asignar(fid, sp, this.tipo(), this.fecha(), this.inspector()), () => this.acc.asignando.set(null));
  }
  protected async reasignar() { await this.correr(() => this.acc.reasignar(this.acc.reasignando()!, this.inspector(), this.fecha()), () => { this.acc.reasignando.set(null); this.ultimaRe = ''; }); }
  protected async reprogramarGuardar() { await this.correr(() => this.acc.reprogramar(this.acc.reprogramando()!, this.fecha(), this.motivo()), () => { this.acc.reprogramando.set(null); this.ultimaRp = ''; }); }

  private async correr(f: () => Promise<string | null>, cerrar: () => void) {
    this.guardando.set(true); this.error.set('');
    const e = await f();
    this.guardando.set(false);
    if (e) this.error.set(e); else cerrar();
  }
}
