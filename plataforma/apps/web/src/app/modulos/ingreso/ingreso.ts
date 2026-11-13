import { Component, ElementRef, OnDestroy, inject, signal, viewChildren } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { mensajeDeError } from '../../nucleo/interceptores';
import { Sesion } from '../../nucleo/sesion';
import { MarcaIngreso } from './marca';

type Paso = 'datos' | 'codigo' | 'recuperar' | 'recuperado';

const MOTIVOS: Record<string, string> = {
  inactividad: 'La sesión se cerró por 15 minutos de inactividad. Ingrese de nuevo.',
  vencida: 'Su sesión terminó. Ingrese de nuevo.',
};

/**
 * Ingreso real (CU-01 y CU-02): correo y contraseña → código de 6 dígitos enviado al correo → sesión.
 * La contraseña se valida en el servidor (cifrada con scrypt) y nunca se guarda en el navegador.
 * Sitio público: los mensajes no revelan si un correo está registrado.
 */
@Component({
  selector: 'app-ingreso',
  imports: [FormsModule, MarcaIngreso],
  templateUrl: './ingreso.html',
})
export class Ingreso implements OnDestroy {
  private readonly sesion = inject(Sesion);
  private readonly router = inject(Router);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly paso = signal<Paso>('datos');
  protected readonly error = signal('');
  protected readonly info = signal(MOTIVOS[this.params.get('motivo') ?? ''] ?? '');
  protected readonly enviando = signal(false);
  protected readonly verClave = signal(false);
  protected readonly correo = signal('');
  protected readonly clave = signal('');
  protected readonly correoOculto = signal('');
  protected readonly minutos = signal(10);
  protected readonly esperaReenvio = signal(0);
  private desafio = '';
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private readonly digitos = viewChildren<ElementRef<HTMLInputElement>>('digito');

  ngOnDestroy(): void { if (this.temporizador) clearInterval(this.temporizador); }

  protected async continuar(): Promise<void> {
    this.error.set(''); this.info.set('');
    const correo = this.correo().trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(correo)) { this.error.set('Escriba un correo válido.'); return; }
    if (!this.clave()) { this.error.set('Escriba su contraseña.'); return; }
    this.enviando.set(true);
    try {
      const d = await this.sesion.ingresar(correo, this.clave());
      this.desafio = d.desafio; this.correoOculto.set(d.correo); this.minutos.set(d.minutos);
      this.clave.set('');
      this.paso.set('codigo');
      this.contarReenvio(30);
      setTimeout(() => this.digitos()[0]?.nativeElement.focus());
    } catch (e) {
      this.error.set(e instanceof HttpErrorResponse ? mensajeDeError(e) : 'No se pudo ingresar.');
    } finally { this.enviando.set(false); }
  }

  protected alEscribir(i: number, e: Event): void {
    const inp = e.target as HTMLInputElement;
    inp.value = inp.value.replace(/\D/g, '').slice(-1);
    if (inp.value) this.digitos()[i + 1]?.nativeElement.focus();
    if (this.digitos().every((d) => d.nativeElement.value)) void this.verificar();
  }
  protected retroceso(i: number, e: KeyboardEvent): void {
    if (e.key === 'Backspace' && !(e.target as HTMLInputElement).value) this.digitos()[i - 1]?.nativeElement.focus();
  }
  /** Pegar el código completo desde el correo. */
  protected pegar(e: ClipboardEvent): void {
    const t = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
    if (t.length < 2) return;
    e.preventDefault();
    this.digitos().forEach((d, i) => (d.nativeElement.value = t[i] ?? ''));
    if (t.length === 6) void this.verificar(); else this.digitos()[t.length]?.nativeElement.focus();
  }

  protected async verificar(): Promise<void> {
    if (this.enviando()) return;
    const c = this.digitos().map((d) => d.nativeElement.value).join('');
    if (c.length !== 6) { this.error.set('Escriba los 6 dígitos del código.'); return; }
    this.error.set(''); this.enviando.set(true);
    try {
      await this.sesion.verificar(this.desafio, c);
      const v = this.params.get('volver');
      void this.router.navigateByUrl(v && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/ingreso') ? v : '/inicio');
    } catch (e) {
      this.digitos().forEach((d) => (d.nativeElement.value = ''));
      this.digitos()[0]?.nativeElement.focus();
      if (e instanceof HttpErrorResponse && (e.error as { detalles?: { reiniciar?: boolean } })?.detalles?.reiniciar) { this.regresar(); }
      this.error.set(e instanceof HttpErrorResponse ? mensajeDeError(e) : 'No se pudo verificar el código.');
    } finally { this.enviando.set(false); }
  }

  protected async reenviar(): Promise<void> {
    this.error.set('');
    try {
      await this.sesion.reenviarCodigo(this.desafio);
      this.info.set('Le enviamos un código nuevo. El anterior ya no sirve.');
      this.contarReenvio(60);
    } catch (e) { this.error.set(e instanceof HttpErrorResponse ? mensajeDeError(e) : 'No se pudo reenviar.'); }
  }

  protected irARecuperar(): void { this.error.set(''); this.info.set(''); this.paso.set('recuperar'); }

  protected async recuperar(): Promise<void> {
    this.error.set('');
    const correo = this.correo().trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(correo)) { this.error.set('Escriba un correo válido.'); return; }
    this.enviando.set(true);
    try { await this.sesion.recuperar(correo); this.paso.set('recuperado'); }
    catch (e) { this.error.set(e instanceof HttpErrorResponse ? mensajeDeError(e) : 'No se pudo enviar.'); }
    finally { this.enviando.set(false); }
  }

  protected regresar(): void { this.paso.set('datos'); this.error.set(''); this.info.set(''); this.desafio = ''; }

  private contarReenvio(s: number): void {
    this.esperaReenvio.set(s);
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = setInterval(() => { this.esperaReenvio.update((v) => Math.max(0, v - 1)); if (!this.esperaReenvio() && this.temporizador) clearInterval(this.temporizador); }, 1000);
  }
}
