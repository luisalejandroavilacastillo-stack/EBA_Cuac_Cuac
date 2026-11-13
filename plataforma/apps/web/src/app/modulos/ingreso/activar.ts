import { Component, inject, input, signal, OnInit } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReglasClave, reglasClave } from '../../compartido/reglas-clave';
import { SIN_MENSAJE } from '../../nucleo/contexto';
import { camposConError, mensajeDeError } from '../../nucleo/interceptores';
import { MarcaIngreso } from './marca';

/**
 * Crear la contraseña con el enlace del correo: activar la cuenta (enlace de 48 horas, lo envía el administrador)
 * o restablecerla (enlace de 30 minutos, «¿Olvidó su contraseña?»). El enlace es de un solo uso.
 */
@Component({
  selector: 'app-activar',
  imports: [FormsModule, RouterLink, MarcaIngreso, ReglasClave],
  template: `
<main class="ingreso">
  <app-marca-ingreso />
  <section class="ingreso-form"><div class="tarjeta-ingreso"><img src="logo-eba-color.svg" alt="" style="width:260px;margin-bottom:22px">
    @switch (estado()) {
      @case ('cargando') { <p class="muted">Revisando el enlace…</p> }
      @case ('invalido') {
        <h2>El enlace no sirve</h2><p class="aviso-error" style="padding:10px 14px;border-radius:10px">{{ error() }}</p>
        <p class="muted">{{ tipo() === 'activacion' ? 'Pida al administrador que le envíe un enlace nuevo.' : 'Puede pedir uno nuevo desde «¿Olvidó su contraseña?».' }}</p>
        <a class="btn btn-primario" style="width:100%" routerLink="/ingreso">Ir al ingreso</a>
      }
      @case ('listo') {
        <h2>{{ tipo() === 'activacion' ? 'Cuenta activada' : 'Contraseña actualizada' }}</h2>
        <p>Ya puede ingresar con su correo y la contraseña que acaba de crear. Por seguridad, le pediremos un código que llegará a su correo.</p>
        <a class="btn btn-primario" style="width:100%" routerLink="/ingreso">Ingresar</a>
      }
      @default {
        <h2>{{ tipo() === 'activacion' ? 'Active su cuenta' : 'Cree una contraseña nueva' }}</h2>
        <p class="muted">Hola, {{ nombre() }}. {{ tipo() === 'activacion' ? 'Cree la contraseña con la que va a ingresar a la plataforma.' : 'Escriba su contraseña nueva.' }}
          Nadie del ICA le pedirá esta contraseña.</p>
        <form novalidate (ngSubmit)="guardar()">
          <div class="campo"><label for="nueva">Contraseña nueva</label>
            <input id="nueva" name="nueva" [type]="ver() ? 'text' : 'password'" autocomplete="new-password" [ngModel]="clave()" (ngModelChange)="clave.set($event)">
            <app-reglas-clave [clave]="clave()" [confirmacion]="confirmacion()" /></div>
          <div class="campo"><label for="confirmar">Repita la contraseña</label>
            <input id="confirmar" name="confirmar" [type]="ver() ? 'text' : 'password'" autocomplete="new-password" [ngModel]="confirmacion()" (ngModelChange)="confirmacion.set($event)">
            <span class="error-campo" role="alert">{{ error() }}</span></div>
          <label class="chk"><input type="checkbox" [checked]="ver()" (change)="ver.set(!ver())"> Mostrar las contraseñas</label>
          <button class="btn btn-primario" style="width:100%;margin-top:14px" [disabled]="enviando()">{{ tipo() === 'activacion' ? 'Activar mi cuenta' : 'Guardar contraseña' }}</button>
        </form>
      }
    }
    <p class="aviso-seguro">🔒 Conexión cifrada · Sus datos se tratan según la Ley 1581 de 2012.</p></div></section>
</main>`,
})
export class Activar implements OnInit {
  /** Llega de la ruta: activar/:token o restablecer/:token. */
  readonly token = input.required<string>();
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/auth/enlace`;
  protected readonly estado = signal<'cargando' | 'formulario' | 'invalido' | 'listo'>('cargando');
  protected readonly tipo = signal<'activacion' | 'recuperacion'>(location.pathname.includes('/restablecer/') ? 'recuperacion' : 'activacion');
  protected readonly nombre = signal('');
  protected readonly clave = signal('');
  protected readonly confirmacion = signal('');
  protected readonly ver = signal(false);
  protected readonly error = signal('');
  protected readonly enviando = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      const r = await firstValueFrom(this.http.get<{ tipo: 'activacion' | 'recuperacion'; nombre: string }>(`${this.api}/${encodeURIComponent(this.token())}`,
        { context: new HttpContext().set(SIN_MENSAJE, true) }));
      this.tipo.set(r.tipo); this.nombre.set(r.nombre); this.estado.set('formulario');
    } catch (e) {
      this.error.set(e instanceof HttpErrorResponse ? mensajeDeError(e) : 'El enlace no es válido.');
      this.estado.set('invalido');
    }
  }

  protected async guardar(): Promise<void> {
    this.error.set('');
    const falta = reglasClave(this.clave(), this.confirmacion()).find((r) => !r.cumple);
    if (falta) { this.error.set(`Falta: ${falta.texto.toLowerCase()}.`); return; }
    this.enviando.set(true);
    try {
      await firstValueFrom(this.http.post(`${this.api}/${encodeURIComponent(this.token())}`, { clave: this.clave() }, { context: new HttpContext().set(SIN_MENSAJE, true) }));
      this.clave.set(''); this.confirmacion.set('');
      this.estado.set('listo');
    } catch (e) {
      const c = camposConError(e), http = e instanceof HttpErrorResponse ? e : null;
      if (c['clave']) this.error.set(c['clave']);                              // la contraseña no cumple las reglas
      else {
        this.error.set(http ? mensajeDeError(http) : 'No se pudo guardar.');
        if (http && (http.status === 400 || http.status === 403)) this.estado.set('invalido');   // enlace vencido, usado o cuenta inactiva
      }
    } finally { this.enviando.set(false); }
  }
}
