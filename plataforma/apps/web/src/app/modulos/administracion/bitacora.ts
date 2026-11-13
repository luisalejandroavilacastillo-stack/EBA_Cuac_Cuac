import { Component, computed, inject } from '@angular/core';
import { Datos } from '../../nucleo/datos';
import { Migas } from '../../nucleo/migas';

/** Bitácora de acciones (CU-26): lo que se hace en la plataforma, en orden inverso al registro (la última primero). Nadie puede editarla ni borrarla. */
@Component({
  selector: 'app-bitacora',
  template: `
<div class="encabezado"><div><h1>Bitácora de acciones</h1><p>Registro de lo que se hace en la plataforma. Nadie puede editarla ni borrarla.</p></div></div>
<section class="panel"><div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th></tr></thead><tbody>
  @for (b of filas(); track b.h) { <tr><td class="nowrap">{{ b.cuando }}</td><td>{{ b.u }}</td><td>{{ b.a }}</td></tr> }
  @empty { <tr><td colspan="3" class="muted">Sin registros todavía.</td></tr> }
</tbody></table></div></section>`,
})
export class Bitacora {
  private readonly datos = inject(Datos);
  protected readonly filas = computed(() => [...this.datos.bitacora()].reverse().map((b) => {
    const d = new Date(b.t);
    return { ...b, cuando: `${d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` };
  }));
  constructor() { inject(Migas).niveles.set([{ texto: 'Bitácora' }]); }
}
