import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Capas } from './compartido/capas';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Capas],
  template: '<router-outlet /><app-capas />',
})
export class App {}
