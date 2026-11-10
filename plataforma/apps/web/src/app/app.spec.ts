import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { MENU } from './nucleo/menu';

describe('App', () => {
  it('se crea', async () => {
    await TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] }).compileComponents();
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('el productor no ve Reportes ni los módulos del administrador', () => {
    const vis = MENU.filter((o) => o.roles.includes('productor')).map((o) => o.ruta);
    expect(vis).not.toContain('reportes');
    expect(vis).not.toContain('usuarios');
    expect(vis).toContain('ayuda');
  });
});
