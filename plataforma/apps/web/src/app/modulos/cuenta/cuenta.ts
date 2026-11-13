import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReglasClave, reglasClave } from '../../compartido/reglas-clave';
import { camposConError } from '../../nucleo/interceptores';
import { Notificaciones } from '../../nucleo/notificaciones';
import { Sesion } from '../../nucleo/sesion';

/** Mi cuenta y seguridad (CU-03): datos de acceso y cambio de contraseña. */
@Component({
  selector: 'app-cuenta',
  imports: [FormsModule, DatePipe, ReglasClave],
  template: `
<div class="encabezado"><div><h1>Mi cuenta y seguridad</h1><p>Sus datos de acceso. Para cambiar el nombre, el correo o el perfil, comuníquese con el administrador.</p></div></div>
@if (sesion.usuario(); as u) {
  <div class="grid-2">
    <section class="panel"><h3>Datos de acceso</h3>
      <dl class="datos-cuenta">
        <dt>Nombre</dt><dd>{{ u.nombre }}</dd>
        <dt>Perfil</dt><dd>{{ u.rol }}</dd>
        <dt>Correo</dt><dd>{{ u.correo }}</dd>
        <dt>Último ingreso</dt><dd>{{ u.ultimoIngreso ? (u.ultimoIngreso | date: 'd/MM/yyyy h:mm a') : '—' }}</dd>
      </dl>
      <p class="muted chico">Ingreso con contraseña y código de 6 dígitos al correo. La sesión se cierra tras 15 minutos sin uso.</p>
    </section>
    <section class="panel"><h3>Cambiar contraseña</h3>
      <form novalidate (ngSubmit)="cambiar()">
        <div class="campo"><label for="ca">Contraseña actual</label>
          <input id="ca" name="ca" type="password" autocomplete="current-password" [ngModel]="actual()" (ngModelChange)="actual.set($event)"><span class="error-campo">{{ errores()['actual'] }}</span></div>
        <div class="campo"><label for="cn">Contraseña nueva</label>
          <input id="cn" name="cn" type="password" autocomplete="new-password" [ngModel]="nueva()" (ngModelChange)="nueva.set($event)">
          <app-reglas-clave [clave]="nueva()" [confirmacion]="confirmacion()" /><span class="error-campo">{{ errores()['nueva'] }}</span></div>
        <div class="campo"><label for="cc">Repita la contraseña nueva</label>
          <input id="cc" name="cc" type="password" autocomplete="new-password" [ngModel]="confirmacion()" (ngModelChange)="confirmacion.set($event)"></div>
        <button class="btn btn-primario" [disabled]="guardando()">Cambiar contraseña</button>
      </form>
    </section>
  </div>
}`,
  styles: `.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; align-items: start; }
    .datos-cuenta { display: grid; grid-template-columns: max-content 1fr; gap: 8px 16px; margin: 12px 0 16px; }
    .datos-cuenta dt { color: var(--gris); font-weight: 700; } .datos-cuenta dd { margin: 0; overflow-wrap: anywhere; }`,
})
export class Cuenta {
  protected readonly sesion = inject(Sesion);
  private readonly http = inject(HttpClient);
  private readonly avisos = inject(Notificaciones);
  protected readonly actual = signal('');
  protected readonly nueva = signal('');
  protected readonly confirmacion = signal('');
  protected readonly errores = signal<Record<string, string>>({});
  protected readonly guardando = signal(false);

  protected async cambiar(): Promise<void> {
    this.errores.set({});
    if (!this.actual()) { this.errores.set({ actual: 'Escriba su contraseña actual.' }); return; }
    const falta = reglasClave(this.nueva(), this.confirmacion()).find((r) => !r.cumple);
    if (falta) { this.errores.set({ nueva: `Falta: ${falta.texto.toLowerCase()}.` }); return; }
    this.guardando.set(true);
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/cambiar-clave`, { actual: this.actual(), nueva: this.nueva() }));
      this.actual.set(''); this.nueva.set(''); this.confirmacion.set('');
      this.avisos.ok('Contraseña actualizada. Úsela la próxima vez que ingrese.');
    } catch (e) { this.errores.set(camposConError(e)); }
    finally { this.guardando.set(false); }
  }
}
