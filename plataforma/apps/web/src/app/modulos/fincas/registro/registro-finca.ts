import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import {
  Especie, Errores, RegistroFinca, TIPOS_DOCUMENTO, TipoDocumento, esTraspatio, planMuestreo, tramo, validarRegistroFinca,
} from '@eba/norma';
import { Api, Catalogos, ErrorApi } from '../../../nucleo/api';
import { miles, nombreEspecie, nombreTramo } from '../../../compartido/formato';

/**
 * Registro de finca (CU-04): datos de la finca, especies con su número de aves y persona responsable.
 * Igual que el prototipo v0.24: no pide datos de manejo; esos se observan en la visita.
 * Valida con las mismas reglas que la API (@eba/norma) y muestra los errores junto a cada campo.
 */
@Component({
  selector: 'app-registro-finca',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro-finca.html',
  styleUrl: './registro-finca.scss',
})
export class RegistroFincaPagina {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly catalogos = toSignal(this.api.catalogos().pipe(catchError(() => of(null as Catalogos | null))));
  protected readonly tiposDocumento = TIPOS_DOCUMENTO;
  protected readonly especiesForm: Especie[] = ['pato', 'ganso'];
  protected readonly nombreEspecie = nombreEspecie;
  protected readonly nombreTramo = nombreTramo;
  protected readonly miles = miles;

  protected readonly form = this.fb.group({
    nombre: '',
    departamento: '',
    municipio: '',
    vereda: '',
    pato: this.fb.group({ marcada: false, aves: this.fb.control<number | null>(null) }),
    ganso: this.fb.group({ marcada: false, aves: this.fb.control<number | null>(null) }),
    persona: this.fb.group({
      nombre: '',
      tipoDocumento: this.fb.control<TipoDocumento>('CC'),
      numeroDocumento: '',
      correo: '',
      telefono: '',
      autorizaDatos: false,
    }),
  });

  private readonly valor = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly errores = signal<Errores>({});
  protected readonly mensaje = signal('');
  protected readonly guardando = signal(false);
  private intentado = false;

  /** Especies marcadas con su número de aves, en el formato de la API. */
  private registro(): RegistroFinca {
    const v = this.form.getRawValue();
    return {
      nombre: v.nombre, departamento: v.departamento, municipio: v.municipio, vereda: v.vereda || null,
      especies: this.especiesForm.filter((e) => v[e].marcada).map((e) => ({ especie: e, numeroAves: Number(v[e].aves ?? 0) })),
      persona: { ...v.persona, correo: v.persona.correo || null },
    };
  }

  /** Tramo y muestra de cada especie, mientras se escribe (Tabla 3 y 5.6). */
  protected readonly resumen = computed(() => {
    this.valor();
    return this.registro().especies.filter((e) => e.numeroAves > 0).map((e) => ({
      ...e, tramo: tramo(e.numeroAves), muestra: planMuestreo(e.numeroAves, true).aves,
    }));
  });
  protected readonly correoOpcional = computed(() => { this.valor(); const r = this.registro(); return !r.especies.length || esTraspatio(r.especies); });

  constructor() {
    // Una especie desmarcada no lleva número; al marcarla, se habilita el campo.
    for (const e of this.especiesForm) {
      const g = this.form.controls[e];
      g.controls.aves.disable();
      g.controls.marcada.valueChanges.subscribe((m) => {
        if (m) g.controls.aves.enable(); else { g.controls.aves.setValue(null); g.controls.aves.disable(); }
      });
    }
    // Después del primer intento, los errores se actualizan mientras se corrige.
    this.form.valueChanges.subscribe(() => { if (this.intentado) this.errores.set(validarRegistroFinca(this.registro())); });
  }

  protected err(campo: string) { return this.errores()[campo] ?? ''; }

  protected guardar() {
    this.intentado = true;
    this.mensaje.set('');
    const r = this.registro();
    const e = validarRegistroFinca(r);
    this.errores.set(e);
    if (Object.keys(e).length) {
      this.mensaje.set('Revise los campos marcados.');
      queueMicrotask(() => document.querySelector<HTMLElement>('.con-error input, .con-error select')?.focus());
      return;
    }
    this.guardando.set(true);
    this.api.registrarFinca(r).subscribe({
      next: (f) => this.router.navigate(['/fincas', f.codigo], { queryParams: { nueva: 1 } }),
      error: (x: HttpErrorResponse) => {
        this.guardando.set(false);
        const cuerpo = x.error as ErrorApi | null;
        this.errores.set(cuerpo?.detalles?.campos ?? {});
        this.mensaje.set(x.status === 0 ? 'No se pudo conectar con la API. Revise que esté encendida.' : cuerpo?.error ?? 'No se pudo registrar la finca.');
      },
    });
  }
}
