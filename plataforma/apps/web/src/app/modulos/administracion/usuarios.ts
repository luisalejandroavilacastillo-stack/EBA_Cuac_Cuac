import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NOMBRE_PERFIL, TIPOS_DOCUMENTO, type Rol } from '@eba/norma';
import { environment } from '../../../environments/environment';
import { Dialogo } from '../../nucleo/dialogo';
import { SIN_MENSAJE } from '../../nucleo/contexto';
import { camposConError, mensajeDeError } from '../../nucleo/interceptores';
import { Notificaciones } from '../../nucleo/notificaciones';
import { Sesion, type Usuario } from '../../nucleo/sesion';

const CALLADO = () => ({ context: new HttpContext().set(SIN_MENSAJE, true) });
const ORDEN: Rol[] = ['admin', 'coordinador', 'inspector', 'productor'];
const AYUDA: Record<Rol, string> = {
  admin: 'Gestiona los usuarios y consulta todo el sistema (no evalúa ni aprueba).',
  coordinador: 'Registra fincas, asigna inspecciones y las aprueba o devuelve.',
  inspector: 'Ve solo las fincas que le asignan, hace la visita y la finaliza.',
  productor: 'Ve sus fincas y los resultados aprobados. Se vincula con las fincas que tengan su mismo documento.',
};
const ACCESO: Record<Usuario['activacion'], string> = {
  'Activa': 'e-ok', 'Pendiente de activación': 'e-medio', 'Enlace vencido': 'e-alerta', 'Sin enlace': 'e-gris',
};

interface Formulario { nombre: string; tipoDocumento: string; documento: string; correo: string; telefono: string; perfil: Rol }

/**
 * Usuarios (CU-24), solo el administrador. Las cuentas se crean sin contraseña: la persona recibe en su correo un
 * enlace de un solo uso (48 horas) para crearla. Documentos y correos se muestran enmascarados en la lista.
 */
@Component({
  selector: 'app-usuarios',
  imports: [FormsModule],
  templateUrl: './usuarios.html',
})
export class Usuarios {
  private readonly http = inject(HttpClient);
  private readonly avisos = inject(Notificaciones);
  private readonly dialogo = inject(Dialogo);
  protected readonly sesion = inject(Sesion);
  private readonly api = `${environment.apiUrl}/usuarios`;

  protected readonly perfiles = ORDEN.map((p) => ({ valor: p, texto: NOMBRE_PERFIL[p] }));
  protected readonly tipos = TIPOS_DOCUMENTO;
  protected readonly ayuda = AYUDA;
  protected readonly acceso = ACCESO;
  protected readonly lista = signal<Usuario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly q = signal('');
  protected readonly filtro = signal<Rol | ''>('');
  protected readonly filas = computed(() => {
    const q = this.q().trim().toLowerCase(), f = this.filtro();
    return this.lista().filter((u) => (!f || u.perfil === f) && (!q || u.nombre.toLowerCase().includes(q) || u.correo.includes(q)));
  });
  protected readonly cuenta = (p: Rol) => this.lista().filter((u) => u.perfil === p).length;

  /** Ventana de crear / editar. */
  protected readonly editando = signal<Usuario | 'nuevo' | null>(null);
  protected readonly form = signal<Formulario>(this.vacio());
  protected readonly errores = signal<Record<string, string>>({});
  protected readonly guardando = signal(false);

  constructor() { void this.cargar(); }

  protected async cargar(): Promise<void> {
    try { this.lista.set((await firstValueFrom(this.http.get<{ usuarios: Usuario[] }>(this.api))).usuarios); }
    finally { this.cargando.set(false); }
  }

  protected docOculto = (d: string) => (d ? '••••' + d.slice(-4) : '—');
  protected correoOculto = (c: string) => c.replace(/^(.)[^@]*(@.*)$/, '$1•••$2');
  protected esYo = (u: Usuario) => u.clave === this.sesion.usuario()?.clave;
  protected textoAcceso = (u: Usuario) => (u.bloqueada ? 'Bloqueada' : u.activacion);
  protected claseAcceso = (u: Usuario) => (u.bloqueada ? 'e-alerta' : ACCESO[u.activacion]);

  protected abrir(u: Usuario | null): void {
    this.errores.set({});
    this.form.set(u ? { nombre: u.nombre, tipoDocumento: u.tipoDocumento, documento: u.documento, correo: u.correo, telefono: u.telefono, perfil: u.perfil } : this.vacio());
    this.editando.set(u ?? 'nuevo');
    setTimeout(() => document.getElementById('un')?.focus());
  }
  protected cerrar(): void { this.editando.set(null); }
  protected cambiar<K extends keyof Formulario>(k: K, v: Formulario[K]): void { this.form.update((f) => ({ ...f, [k]: v })); }

  protected async guardar(): Promise<void> {
    const ed = this.editando();
    if (!ed || this.guardando()) return;
    this.errores.set({}); this.guardando.set(true);
    try {
      if (ed === 'nuevo') {
        const r = await firstValueFrom(this.http.post<{ usuario: Usuario; enlace: string; fincas: number }>(this.api, this.form(), CALLADO()));
        this.lista.update((l) => [...l, r.usuario]);
        const extra = r.usuario.perfil === 'productor' ? (r.fincas ? ` Quedó vinculado a ${r.fincas} finca${r.fincas > 1 ? 's' : ''} con su documento.` : ' Aún no tiene fincas con su documento.') : '';
        if (r.enlace === 'enviado') this.avisos.ok(`Usuario creado: ${r.usuario.nombre}. Le enviamos al correo el enlace para crear su contraseña (vence en 48 horas).${extra}`);
        else this.avisos.error(`Usuario creado, pero no se pudo enviar el correo. Use «Reenviar enlace» cuando el correo funcione.${extra}`);
      } else {
        const r = await firstValueFrom(this.http.patch<{ usuario: Usuario; enlace: string | null }>(`${this.api}/${ed.clave}`, { ...this.form(), version: ed.version }, CALLADO()));
        this.reemplazar(r.usuario);
        this.avisos.ok(`Cambios guardados${r.usuario.perfil !== ed.perfil ? `: ahora es ${NOMBRE_PERFIL[r.usuario.perfil]}` : ''}.${r.enlace === 'enviado' ? ' Se envió el enlace de activación al correo nuevo.' : ''}`);
      }
      this.cerrar();
    } catch (e) {
      // Los errores por campo se muestran junto a cada campo; los demás, como mensaje.
      this.errores.set(camposConError(e));
      if (!Object.keys(this.errores()).length && e instanceof HttpErrorResponse) {
        this.avisos.error(mensajeDeError(e));
        if (e.status === 409) { await this.cargar(); this.cerrar(); }
      }
    } finally { this.guardando.set(false); }
  }

  protected async enviarEnlace(u: Usuario): Promise<void> {
    const r = await firstValueFrom(this.http.post<{ usuario: Usuario }>(`${this.api}/${u.clave}/enlace`, {})).catch(() => null);
    if (!r) return;
    this.reemplazar(r.usuario);
    this.avisos.ok(`Enlace enviado a ${this.correoOculto(u.correo)}. Vence en 48 horas; el anterior ya no sirve.`);
  }

  protected async cambiarEstado(u: Usuario): Promise<void> {
    const inactivar = u.estado === 'Activo';
    if (inactivar && !(await this.dialogo.confirmar({
      titulo: `Inactivar a ${u.nombre}`, peligro: true, aceptar: 'Inactivar',
      mensaje: 'No podrá ingresar ni recibir asignaciones, y se cierran sus sesiones abiertas. Su historial se conserva y puede reactivarlo cuando quiera.',
    }))) return;
    const r = await firstValueFrom(this.http.post<{ usuario: Usuario }>(`${this.api}/${u.clave}/estado`, { estado: inactivar ? 'Inactivo' : 'Activo' })).catch(() => null);
    if (!r) return;
    this.reemplazar(r.usuario);
    this.cerrar();
    this.avisos.ok(inactivar ? 'Usuario inactivado.' : 'Usuario reactivado.');
  }

  protected async eliminar(u: Usuario): Promise<void> {
    if (!(await this.dialogo.confirmar({
      titulo: `Eliminar a ${u.nombre}`, peligro: true, aceptar: 'Eliminar',
      mensaje: 'Solo se eliminan cuentas sin historial (nunca ingresó ni tiene visitas). Esta acción no se puede deshacer.',
    }))) return;
    const ok = await firstValueFrom(this.http.delete(`${this.api}/${u.clave}`)).then(() => true).catch(() => false);
    if (!ok) return;
    this.lista.update((l) => l.filter((x) => x.clave !== u.clave));
    this.cerrar();
    this.avisos.ok('Usuario eliminado.');
  }

  private reemplazar(u: Usuario): void {
    this.lista.update((l) => l.map((x) => (x.clave === u.clave ? u : x)));
    this.sesion.actualizar(u);
  }
  private vacio(): Formulario { return { nombre: '', tipoDocumento: 'CC', documento: '', correo: '', telefono: '', perfil: 'inspector' }; }
}
