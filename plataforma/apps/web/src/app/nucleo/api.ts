import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { Especie, RegistroFinca, TipoDocumento, Tramo } from '@eba/norma';
import { environment } from '../../environments/environment';

/** Respuesta de GET /api/salud. */
export interface Salud {
  estado: string;
  servicio: string;
  version: string;
  entorno: string;
  baseDeDatos: { estado: string; version?: string; motivo?: string };
  asistenteIA: string;
  hora: string;
}

/** Respuesta de POST /api/norma/resultado. */
export interface ResultadoNorma { tramo: string; puntaje: number; nivel: string }

export interface Catalogos {
  departamentos: { codigo: string; nombre: string }[];
  especies: { codigo: Especie; nombre: string; plural: string }[];
  tiposDocumento: { codigo: TipoDocumento; nombre: string }[];
}

export interface EspecieFinca {
  especie: Especie;
  numeroAves: number;
  tramo: Tramo;
  proposito?: string;
  sistema?: string;
  conCorral?: boolean;
  pesos?: { MBA: number; MBR: number; MBG: number };
  muestra?: string;
}

export interface Finca {
  codigo: string;
  nombre: string;
  departamento: { codigo: string; nombre: string };
  municipio: string;
  vereda: string | null;
  estado: 'ACTIVA' | 'INACTIVA';
  creadoEn: string;
  totalAves: number;
  especies: EspecieFinca[];
  responsable: {
    nombre: string; tipoDocumento?: string; numeroDocumento?: string;
    correo?: string | null; telefono?: string; autorizaDatos?: boolean;
  };
}

/** Error que devuelve la API: { error, detalles?: { campos } }. */
export interface ErrorApi { error: string; detalles?: { campos?: Record<string, string> } }

/** Acceso a la API Express. La dirección sale de environments/ (proxy en desarrollo, /api detrás de Nginx en Docker). */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  salud(): Observable<Salud> {
    return this.http.get<Salud>(`${this.url}/salud`);
  }

  resultado(aves: number, medidas: { MBA: number; MBR: number; MBG: number }): Observable<ResultadoNorma> {
    return this.http.post<ResultadoNorma>(`${this.url}/norma/resultado`, { aves, medidas });
  }

  catalogos(): Observable<Catalogos> {
    return this.http.get<Catalogos>(`${this.url}/catalogos`);
  }

  fincas(filtro: { q?: string; estado?: string } = {}): Observable<{ total: number; fincas: Finca[] }> {
    let params = new HttpParams();
    if (filtro.q) params = params.set('q', filtro.q);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    return this.http.get<{ total: number; fincas: Finca[] }>(`${this.url}/fincas`, { params });
  }

  finca(codigo: string): Observable<Finca> {
    return this.http.get<Finca>(`${this.url}/fincas/${encodeURIComponent(codigo)}`);
  }

  registrarFinca(r: RegistroFinca): Observable<Finca> {
    return this.http.post<Finca>(`${this.url}/fincas`, r);
  }
}
