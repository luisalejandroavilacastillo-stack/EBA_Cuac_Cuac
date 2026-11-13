import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { constanciaVigente, fmt } from '@eba/norma';
import { fechaCorta } from '../../compartido/flujo-ui';
import { PantallaVisita } from './base';

/** Constancia de cumplimiento lista para imprimir o guardar como PDF (igual a vConstancia() del prototipo). */
@Component({
  selector: 'app-constancia',
  imports: [RouterLink],
  template: `
@if (datos.cargando() || !ev()) { <p class="muted">Cargando…</p> }
@else if (!permitida()) { <div class="panel bloqueo"><div class="icono">🔒</div><h2>No tiene permiso para ver esta visita</h2><a class="btn btn-primario" routerLink="/fincas">Volver a fincas</a></div> }
@else if (!c()) {
  <div class="panel bloqueo"><div class="icono">📄</div><h2>Esta visita no tiene constancia de cumplimiento</h2><a class="btn btn-primario" [routerLink]="['/visitas', id(), 'resultado']">Ver resultado</a></div>
} @else {
  @let k = c()!; @let e = ev()!;
  <div class="encabezado no-imprimir"><div><h1>Constancia de cumplimiento</h1><p>{{ k.vigente ? 'Vigente' : 'Vencida' }} · use «Descargar o imprimir» y elija «Guardar como PDF».</p></div>
    <div style="display:flex;gap:8px"><a class="btn btn-sec" [routerLink]="['/visitas', e.id, 'resultado']">Ver resultado</a><button type="button" class="btn btn-primario" (click)="imprimir()">Descargar o imprimir</button></div></div>
  <article class="constancia" [class.vencida]="!k.vigente"><header><div class="c-marca">EBA <b>Cuac Cuac</b><small>Bienestar animal · patos y gansos</small></div><div class="c-cod"><small>Código</small><b>{{ k.codigo }}</b><small>Verificación {{ k.verificacion }}</small></div></header>
    <h1>Constancia de cumplimiento de bienestar animal</h1>
    <p class="c-intro">Se hace constar que la unidad productiva descrita cumple los criterios de bienestar animal para <b>{{ especie().toLowerCase() }}</b> de la metodología de evaluación, según la visita aprobada por el ICA.</p>
    <dl class="c-datos">
      <div><dt>Finca</dt><dd>{{ f()?.nombre }} · {{ f()?.id }}</dd></div><div><dt>Ubicación</dt><dd>{{ f()?.vereda ? f()?.vereda + ', ' : '' }}{{ f()?.mpio }}, {{ f()?.depto }}</dd></div>
      <div><dt>Titular</dt><dd>{{ f()?.productor }}</dd></div><div><dt>Especie y propósito</dt><dd>{{ especie() }} · {{ d().proposito }} · {{ d().tramo }}</dd></div>
      <div><dt>Visita</dt><dd>{{ flujo().nombreVisita(e) }} · {{ fecha(e.fecha) }} · {{ e.id }}</dd></div><div><dt>Resultado</dt><dd><b>{{ d().total }}</b> de 100 · {{ d().nivel }}</dd></div>
      <div><dt>Inspector</dt><dd>{{ datos.nombreUsuario(e.inspector) }}</dd></div><div><dt>Aprobó</dt><dd>{{ datos.nombreUsuario(d().aprobo) }} · Coordinador ICA{{ d().aprobada ? ' · ' + fecha(d().aprobada) : '' }}</dd></div>
      <div><dt>Emitida</dt><dd>{{ fecha(k.emitida) }}</dd></div><div><dt>Vigente hasta</dt><dd><b>{{ fecha(k.vence) }}</b>@if (!k.vigente) { <span class="etiqueta e-gris">Vencida</span> }</dd></div>
    </dl>
    <p class="c-nota">Criterios: puntaje de 90 o más (nivel Excelente), ningún indicador en 0 y ningún pendiente. La constancia se refiere a la especie y a la fecha de la visita indicadas; una nueva visita que no cumpla no la anula, pero al vencer se requiere una nueva inspección.</p>
    <footer><span>Documento generado por EBA Cuac Cuac</span><span>{{ k.codigo }} · {{ k.verificacion }}</span></footer></article>
}`,
})
export class Constancia extends PantallaVisita {
  protected readonly titulo = 'Constancia';
  protected readonly fecha = fechaCorta;
  protected readonly c = computed(() => { const c = this.ev()?.constancia; return c ? { ...c, vigente: constanciaVigente(c) } : null; });
  protected readonly d = computed(() => {
    const ev = this.ev()!, r = this.flujo().resultado(ev), apr = (ev['aprobada'] as { por?: string; fecha?: string } | undefined) ?? {};
    return { proposito: r.ctx.e.proposito ?? '', tramo: r.ctx.tramo === 'traspatio' ? 'Traspatio' : 'Comercial', total: fmt(r.total), nivel: r.nivel[0], aprobo: apr.por ?? null, aprobada: apr.fecha ?? '' };
  });
  protected async imprimir() { await this.datos.registrar(`Descarga de la constancia ${this.c()!.codigo}`); window.print(); }
}
