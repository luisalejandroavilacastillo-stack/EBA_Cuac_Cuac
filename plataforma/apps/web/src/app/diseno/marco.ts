import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { Rol } from '@eba/norma';
import { MENU } from '../nucleo/menu';

/** Marco de la aplicación: menú lateral con los colores del ICA y el contenido de cada módulo. */
@Component({
  selector: 'app-marco',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './marco.html',
  styleUrl: './marco.scss',
})
export class Marco {
  /** Mientras no hay ingreso real, el rol se elige aquí para ver el menú de cada perfil. */
  protected readonly rol = signal<Rol>('inspector');
  protected readonly roles: { valor: Rol; texto: string }[] = [
    { valor: 'inspector', texto: 'Inspector ICA' }, { valor: 'coordinador', texto: 'Coordinador ICA' },
    { valor: 'productor', texto: 'Productor' }, { valor: 'admin', texto: 'Administrador' },
  ];
  protected opciones() { return MENU.filter((o) => o.roles.includes(this.rol())); }
  protected cambiarRol(v: string) { this.rol.set(v as Rol); }
}
