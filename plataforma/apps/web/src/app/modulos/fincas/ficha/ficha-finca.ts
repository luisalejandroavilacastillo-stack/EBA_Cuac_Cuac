import { Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { Api, Finca } from '../../../nucleo/api';
import { miles, nombreEspecie, nombreTramo } from '../../../compartido/formato';

interface Estado { cargando: boolean; finca: Finca | null; error: string }

/** Ficha de la finca (CU-05): datos, especies con tramo, pesos y muestra prevista, y persona responsable enmascarada. */
@Component({
  selector: 'app-ficha-finca',
  imports: [RouterLink],
  templateUrl: './ficha-finca.html',
  styleUrl: './ficha-finca.scss',
})
export class FichaFinca {
  private readonly api = inject(Api);
  /** Parámetros de la ruta (withComponentInputBinding). */
  readonly codigo = input.required<string>();
  readonly nueva = input<string>();

  protected readonly estado = toSignal(
    toObservable(this.codigo).pipe(
      switchMap((c) => this.api.finca(c).pipe(
        map((finca): Estado => ({ cargando: false, finca, error: '' })),
        catchError((e) => of<Estado>({ cargando: false, finca: null, error: e?.status === 404 ? 'La finca no existe.' : e?.error?.error ?? 'No se pudo conectar con la API.' })),
        startWith<Estado>({ cargando: true, finca: null, error: '' }),
      )),
    ),
    { initialValue: { cargando: true, finca: null, error: '' } as Estado },
  );
  protected readonly nombreEspecie = nombreEspecie;
  protected readonly nombreTramo = nombreTramo;
  protected readonly miles = miles;
  protected pct = (n: number) => Math.round(n * 100);
}
