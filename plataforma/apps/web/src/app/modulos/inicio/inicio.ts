import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith } from 'rxjs';
import { NIVELES, PESOS, clasificar, planMuestreo, puntajeTotal, tramo } from '@eba/norma';
import { environment } from '../../../environments/environment';
import { Api, ResultadoNorma, Salud } from '../../nucleo/api';

interface EstadoApi { cargando: boolean; salud: Salud | null }

/** Inicio temporal: comprueba la conexión con la API y que el navegador y el servidor calculan igual. */
@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {
  private readonly api = inject(Api);
  protected readonly apiUrl = environment.apiUrl;
  protected readonly estado = toSignal(
    this.api.salud().pipe(
      map((salud): EstadoApi => ({ cargando: false, salud })),
      catchError(() => of<EstadoApi>({ cargando: false, salud: null })),
      startWith<EstadoApi>({ cargando: true, salud: null }),
    ),
    { requireSync: true },
  );

  // Mismo caso calculado en el navegador y en el servidor.
  protected readonly caso = { aves: 320, medidas: { MBA: 80, MBR: 90, MBG: 70 } };
  protected readonly local = (() => {
    const t = tramo(this.caso.aves), p = puntajeTotal(this.caso.medidas, t);
    return { tramo: t, puntaje: p, nivel: clasificar(p) };
  })();
  protected readonly servidor = toSignal(
    this.api.resultado(this.caso.aves, this.caso.medidas).pipe(catchError(() => of<ResultadoNorma | null>(null))),
  );

  protected readonly niveles = NIVELES;
  protected readonly pesos = PESOS.comercial;
  protected readonly ejemplo = planMuestreo(this.caso.aves, true);
}
