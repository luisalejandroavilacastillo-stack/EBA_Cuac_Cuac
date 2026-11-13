import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import { menuDe } from './nucleo/menu';
import { mensajeDeError } from './nucleo/interceptores';
import { HttpErrorResponse } from '@angular/common/http';
import { Dialogo } from './nucleo/dialogo';

describe('App', () => {
  it('se crea', async () => {
    await TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });
});

describe('Menú por perfil', () => {
  const rutas = (p: Parameters<typeof menuDe>[0]) => menuDe(p).map((o) => o.ruta);
  it('el productor no ve Reportes ni los módulos del administrador', () => {
    expect(rutas('productor')).not.toContain('reportes');
    expect(rutas('productor')).not.toContain('usuarios');
    expect(rutas('productor')).toContain('ayuda');
  });
  it('solo el administrador ve Usuarios, Parametrización y Bitácora', () => {
    expect(rutas('admin')).toEqual(expect.arrayContaining(['usuarios', 'parametrizacion', 'bitacora']));
    for (const p of ['inspector', 'coordinador'] as const) expect(rutas(p)).not.toContain('usuarios');
  });
  it('sin sesión no hay menú', () => expect(menuDe(null)).toEqual([]));
});

describe('Mensajes de error de la API', () => {
  const e = (status: number) => mensajeDeError(new HttpErrorResponse({ status }));
  it('explica sin conexión, permiso y conflicto', () => {
    expect(e(0)).toMatch(/conexión/i);
    expect(e(403)).toMatch(/permiso/i);
    expect(e(409)).toMatch(/otra persona|cambi/i);
  });
});

describe('Diálogo de confirmación', () => {
  it('responde lo que elige el usuario', async () => {
    const d = new Dialogo();
    const p = d.confirmar({ titulo: 'x', mensaje: 'y' });
    d.abierto()!.responder(true);
    expect(await p).toBe(true);
    expect(d.abierto()).toBeNull();
  });
});

describe('Reglas de contraseña', () => {
  it('pide 10 caracteres, letras y números, y que coincidan', async () => {
    const { reglasClave } = await import('./compartido/reglas-clave');
    const cumple = (c: string, d: string) => reglasClave(c, d).map((r) => r.cumple);
    expect(cumple('corta1', 'corta1')).toEqual([false, true, true]);
    expect(cumple('solamenteletras', 'solamenteletras')).toEqual([true, false, true]);
    expect(cumple('Patos2026seguro', 'Patos2026segur')).toEqual([true, true, false]);
    expect(cumple('Patos2026seguro', 'Patos2026seguro')).toEqual([true, true, true]);
  });
});
