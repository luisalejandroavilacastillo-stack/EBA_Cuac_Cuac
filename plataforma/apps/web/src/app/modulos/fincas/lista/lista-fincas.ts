import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, of, startWith, switchMap, map } from 'rxjs';
import { Api, Finca } from '../../../nucleo/api';
import { miles, nombreEspecie, nombreTramo } from '../../../compartido/formato';

/** Listado de fincas con búsqueda y filtro por estado (CU-05). */
@Component({
  selector: 'app-lista-fincas',
  imports: [RouterLink],
  templateUrl: './lista-fincas.html',
  styleUrl: './lista-fincas.scss',
})
export class ListaFincas {
  private readonly api = inject(Api);
  private readonly filtro$ = new Subject<void>();
  protected q = '';
  protected estado = '';
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly fincas = signal<Finca[]>([]);
  protected readonly nombreEspecie = nombreEspecie;
  protected readonly nombreTramo = nombreTramo;
  protected readonly miles = miles;

  constructor() {
    this.filtro$.pipe(
      startWith(undefined),
      debounceTime(250),
      switchMap(() => {
        this.cargando.set(true);
        return this.api.fincas({ q: this.q.trim(), estado: this.estado }).pipe(
          map((r) => ({ fincas: r.fincas, error: '' })),
          catchError((e) => of({ fincas: [] as Finca[], error: e?.error?.error ?? 'No se pudo conectar con la API.' })),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe((r) => {
      this.fincas.set(r.fincas);
      this.error.set(r.error);
      this.cargando.set(false);
    });
  }

  protected buscar(q: string) { this.q = q; this.filtro$.next(); }
  protected filtrarEstado(e: string) { this.estado = e; this.filtro$.next(); }
}
