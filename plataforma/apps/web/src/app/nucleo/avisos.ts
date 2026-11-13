import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { SIN_MENSAJE } from './contexto';
import { Sesion } from './sesion';

export interface Aviso { id: string; para: string; t: string; txt: string; href: string; leido: boolean; tipo?: string }

/** Avisos dentro de la aplicación (RN-207), los mismos que ve el prototipo. El administrador no recibe los de aprobar. */
@Injectable({ providedIn: 'root' })
export class Avisos {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(Sesion);
  private readonly todos = signal<{ version: number; datos: Aviso }[]>([]);
  readonly mios = computed(() => {
    const u = this.sesion.usuario();
    if (!u) return [];
    return this.todos().map((r) => r.datos).filter((a) => !a.leido && (a.para === u.clave || a.para === u.perfil || (u.perfil === 'admin' && a.para === 'coordinador' && a.tipo !== 'aprobar')))
      .sort((a, b) => b.t.localeCompare(a.t));
  });

  constructor() {
    effect(() => { if (this.sesion.usuario()) void this.cargar(); });
  }

  async cargar(): Promise<void> {
    const r = await firstValueFrom(this.http.get<{ colecciones: { avisos?: { id: string; version: number; datos: Aviso }[] } }>(`${environment.apiUrl}/sincronizacion`,
      { context: new HttpContext().set(SIN_MENSAJE, true) })).catch(() => null);
    if (r) this.todos.set(r.colecciones.avisos ?? []);
  }

  async marcarLeido(id: string): Promise<void> {
    const r = this.todos().find((x) => x.datos.id === id);
    if (!r) return;
    const datos = { ...r.datos, leido: true };
    await firstValueFrom(this.http.put(`${environment.apiUrl}/sincronizacion/avisos/${encodeURIComponent(id)}`, { version: r.version, datos },
      { context: new HttpContext().set(SIN_MENSAJE, true) })).catch(() => null);
    await this.cargar();
  }
}
