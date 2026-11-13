import { Component, input } from '@angular/core';

/** Mensaje cuando una lista no tiene datos. */
@Component({ selector: 'app-vacio', template: `<p class="vacio-tab">{{ texto() }}</p>` })
export class Vacio { readonly texto = input.required<string>(); }
