import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Sesion } from '../nucleo/sesion';

/** Pantalla de acceso no autorizado (igual a sinPermiso() del prototipo). */
@Component({
  selector: 'app-sin-permiso',
  imports: [RouterLink],
  template: `
    <div class="panel bloqueo"><div class="icono">🔒</div>
      <h2>No tiene permiso para ver esta sección</h2>
      <p class="muted" style="max-width:52ch;margin:10px auto 18px">Su perfil ({{ sesion.nombrePerfil() }}) no incluye {{ modulo() ? '«' + modulo() + '»' : 'esta sección' }}.</p>
      <a class="btn btn-primario" routerLink="/inicio">Volver al inicio</a>
    </div>`,
})
export class SinPermiso {
  protected readonly sesion = inject(Sesion);
  protected readonly modulo = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map((q) => q.get('modulo'))));
}
