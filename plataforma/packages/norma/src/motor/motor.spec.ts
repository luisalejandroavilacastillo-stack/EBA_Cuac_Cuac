/**
 * El motor traducido a TypeScript debe dar exactamente lo mismo que el prototipo v0.25.
 * Se ejecuta el código del prototipo (apps/prototipo/js) en una caja aislada con las mismas visitas y se comparan:
 * resultado, avance, cumplimiento, procesos y estado por finca y especie para los cuatro perfiles.
 * Además de las visitas de ejemplo, se generan variantes (en proceso, por aprobar, devuelta, inactiva) para cubrir el flujo.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import path from 'node:path';
import type { Rol } from '../tipos.js';
import { avance, resultado } from './calculo.js';
import { Flujo } from './flujo.js';
import { derivarGansos, siguientePendiente } from './campo.js';
import type { Evaluacion, Finca } from './modelo.js';
import ejemplo from './pruebas/datos_ejemplo.json' with { type: 'json' };

const aqui = path.dirname(fileURLToPath(import.meta.url));
const proto = (f: string) => readFileSync(path.join(aqui, '../../../../apps/prototipo/js', f), 'utf8');

function prototipo(fincas: Finca[], evals: Evaluacion[], usuarios: Record<string, { nombre: string; perfil: string }>) {
  const caja: Record<string, unknown> = { DATOS: JSON.parse(JSON.stringify({ fincas, evals, usuarios })) };
  vm.createContext(caja);
  vm.runInContext(`
    var FINCAS = DATOS.fincas, EVALS = DATOS.evals, PROCESOS = {}, SES = null, USUARIOS = DATOS.usuarios;
    const fmt = (v, d = 1) => (v == null || isNaN(v) ? "—" : Number(v).toFixed(d).replace(".", ",").replace(/,0$/, ""));
    const fecha = (d) => d.toISOString().slice(0, 10);
    const log = () => {}, guardar = () => {};
    const yoClave = () => (SES ? SES.u || SES.rol : null);
    const yo = () => (SES ? USUARIOS[yoClave()] : null);
    const ESTADOS_ABIERTOS = ["Programada", "En proceso", "Pendiente de aprobación", "Devuelta"];
    const esAbierta = (e) => ESTADOS_ABIERTOS.includes(e.estado);
    ${proto('datos/norma.js')}
    const IND = Object.fromEntries(NORMA.map((i) => [i.code, i]));
    ${proto('norma/calculo.js')}
    ${proto('norma/seguimiento.js')}
    ${proto('norma/flujo.js')}
    ${proto('vistas/recorrido_ganso.js')}
    this.api = { derivarGansos, siguientePendiente, resultado, avance, verificarCumplimiento, estadoEspecie, textoFlujo, fincasVisibles, contarEstados, procesosDe,
      entrar: (rol, u) => { SES = rol ? { rol, u } : null; } };
  `, caja);
  return caja['api'] as Record<string, (...a: unknown[]) => unknown> & { entrar: (rol: string | null, u?: string) => void };
}

/** Visitas de ejemplo + variantes para cubrir todos los estados del flujo. */
function datosPrueba() {
  const d = JSON.parse(JSON.stringify(ejemplo)) as { fincas: Finca[]; evals: Evaluacion[]; usuarios: Record<string, { nombre: string; perfil: string }> };
  const base = d.evals.find((e) => e.estado === 'Finalizada')!;
  const otra = d.fincas.find((f) => !d.evals.some((e) => e.finca === f.id && esAbiertaLocal(e)))!;
  const variante = (id: string, cambios: Partial<Evaluacion>) => d.evals.push({ ...JSON.parse(JSON.stringify(base)), id, ...cambios } as Evaluacion);
  variante('EVA-2099-00001', { estado: 'En proceso', finca: otra.id, proceso: 'PRC-T1', visita: 0, inspector: 'inspector2' });
  variante('EVA-2099-00002', { estado: 'Pendiente de aprobación', proceso: 'PRC-T2', visita: 0, finca: d.fincas[2].id, sp: d.fincas[2].especies[0].sp });
  variante('EVA-2099-00003', { estado: 'Devuelta', proceso: 'PRC-T3', visita: 1, finca: d.fincas[3].id, sp: d.fincas[3].especies[0].sp });
  // una visita con respuestas a medias (pendientes y documentos pendientes)
  const media = JSON.parse(JSON.stringify(base)) as Evaluacion;
  Object.keys(media.resp).slice(0, 6).forEach((k) => delete media.resp[k]);
  Object.values(media.resp).forEach((r) => { if (r && r['estado'] === 'Válido') r['estado'] = 'Pendiente'; });
  d.evals.push({ ...media, id: 'EVA-2099-00004', estado: 'Finalizada', proceso: 'PRC-T4', visita: 0, fecha: '2026-01-02' });
  d.fincas[1] = { ...d.fincas[1], estado: 'INACTIVA' };
  // finca sin visitas (Por asignar) y finca con solo una visita aprobada que no cumple (seguimiento por asignar)
  const nueva = (id: string) => { const f = { ...JSON.parse(JSON.stringify(d.fincas[0])), id, estado: 'ACTIVA' } as Finca; d.fincas.push(f); return f; };
  nueva('FIN-2099-00001');
  const fb = nueva('FIN-2099-00002'), baja = d.evals.find((e) => e.estado === 'Finalizada' && e.id !== base.id) ?? base;
  d.evals.push({ ...JSON.parse(JSON.stringify(baja)), id: 'EVA-2099-00005', finca: fb.id, sp: fb.especies[0].sp, proceso: 'PRC-T5', visita: 0, constancia: null } as Evaluacion);
  const fc = nueva('FIN-2099-00003');
  d.evals.push({ ...JSON.parse(JSON.stringify(base)), id: 'EVA-2099-00006', finca: fc.id, sp: fc.especies[0].sp, proceso: 'PRC-T6', visita: 0 } as Evaluacion);
  return d;
}
const esAbiertaLocal = (e: Evaluacion) => ['Programada', 'En proceso', 'Pendiente de aprobación', 'Devuelta'].includes(e.estado);

/** Quita referencias circulares y funciones para comparar como datos. */
const plano = (x: unknown) => JSON.parse(JSON.stringify(x, (k, v) => (k === 'ctx' || k === 'f' || k === 'evs' || k === 'visitas' ? undefined : v)));

describe('Motor de la visita = prototipo v0.25', () => {
  const d = datosPrueba();
  const p = prototipo(d.fincas, d.evals, d.usuarios);
  const finca = (id: string) => d.fincas.find((f) => f.id === id)!;

  it('resultado y avance de cada visita', () => {
    expect(d.evals.length).toBeGreaterThan(8);
    for (const ev of d.evals) {
      const r = resultado(ev, finca(ev.finca)), rp = p.resultado(ev) as { total: number; med: unknown; pend: number; provisional: boolean; nivel: unknown[]; filas: { ind: { code: string }; score: number }[] };
      expect({ total: r.total, med: r.med, pend: r.pend, provisional: r.provisional, nivel: r.nivel[0] }, ev.id)
        .toEqual({ total: rp.total, med: rp.med, pend: rp.pend, provisional: rp.provisional, nivel: rp.nivel[0] });
      expect(r.filas.map((x) => [x.ind.code, x.score]), ev.id).toEqual(rp.filas.map((x) => [x.ind.code, x.score]));
      expect(avance(ev, finca(ev.finca)), ev.id).toEqual(p.avance(ev));
    }
  });

  const perfiles: [Rol | null, string | undefined][] = [['coordinador', 'coordinador'], ['admin', 'admin'], ['inspector', 'inspector'], ['inspector', 'inspector2'], ['productor', 'productor'], [null, undefined]];
  it.each(perfiles)('estado por finca y especie, conteos y procesos (%s %s)', (rol, clave) => {
    p.entrar(rol, clave);
    const f = new Flujo({ fincas: d.fincas, evals: d.evals, procesos: {} }, { rol, clave: clave ?? null, nombre: clave ? d.usuarios[clave]?.nombre : null });
    for (const ev of d.evals) expect(f.verificarCumplimiento(ev).motivos, ev.id).toEqual((p.verificarCumplimiento(ev) as { motivos: string[] }).motivos);
    expect(f.fincasVisibles().map((x) => x.id)).toEqual((p.fincasVisibles() as Finca[]).map((x) => x.id));
    expect(f.contarEstados(d.fincas)).toEqual(p.contarEstados(d.fincas));
    for (const fi of d.fincas) for (const e of fi.especies) {
      const a = f.estadoEspecie(fi, e.sp), b = p.estadoEspecie(fi, e.sp) as Record<string, unknown>;
      const msg = `${fi.id} ${e.sp}`;
      expect(a.estado, msg).toBe(b['estado']);
      expect(f.textoFlujo(a), msg).toBe(p.textoFlujo(b));
      expect(a.nota, msg).toBe(b['nota']);
      expect(a.abierta?.id, msg).toBe((b['abierta'] as Evaluacion | undefined)?.id);
      expect(a.ultimaFin?.id, msg).toBe((b['ultimaFin'] as Evaluacion | undefined)?.id);
      const accion = (x: unknown) => { const o = x as Record<string, unknown> | null; if (!o) return null;
        return { texto: o['texto'], sec: !!o['sec'], asignar: o['asignar'], reasignar: o['reasignar'], reprog: o['reprog'],
          ruta: o['eval'] ? `#/eval/${(o['eval'] as { id: string; paso: string }).id}${(o['eval'] as { paso: string }).paso ? '/' + (o['eval'] as { paso: string }).paso : ''}` : o['href'] }; };
      expect(accion(a.principal), msg).toEqual(accion(b['principal']));
      expect(accion(a.secundaria), msg).toEqual(accion(b['secundaria']));
      expect(plano(f.procesosDe(fi.id, e.sp)).map((x: Record<string, unknown>) => [x['id'], x['estado'], x['usados'], x['max'], x['puedeSeguimiento'], x['puedeNuevo']]), msg)
        .toEqual(plano(p.procesosDe(fi.id, e.sp)).map((x: Record<string, unknown>) => [x['id'], x['estado'], x['usados'], x['max'], x['puedeSeguimiento'], x['puedeNuevo']]));
    }
  });

  it('recorrido de gansos y siguiente pendiente', () => {
    let semilla = 7; const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
    const fg = d.fincas.find((x) => x.especies.some((e) => e.sp === 'ganso'))!;
    const baseG = d.evals.find((e) => e.sp === 'ganso') ?? d.evals[0];
    for (let caso = 0; caso < 12; caso++) {
      const ev = { ...JSON.parse(JSON.stringify(baseG)), id: 'EVA-2099-1' + caso, finca: fg.id, sp: 'ganso', resp: {}, obs: {} } as Evaluacion;
      const aves: Record<string, unknown[]> = {}, pts: Record<string, unknown> = {};
      for (let pt = 0; pt < 6; pt++) {
        aves[pt] = Array.from({ length: 5 }, () => ({ ok: azar() > 0.2, m: Object.fromEntries(['GA01', 'GA02', 'GA03', 'GA04', 'GA06', 'GA07'].filter(() => azar() > 0.7).map((c) => [c, true])
          .concat(azar() > 0.6 ? [['GA05', azar() > 0.5 ? 's' : 'f']] : [])) }));
        pts[pt] = { agua: azar() > 0.5, com: azar() > 0.3 ? azar() > 0.5 : null, beb: azar() > 0.5 };
      }
      ev['rg'] = { aves, pts, gal: { 0: azar() > 0.5, 1: azar() > 0.5 }, trat: { GA01: azar() > 0.5, GA04: true } };
      const otra = JSON.parse(JSON.stringify(ev));
      derivarGansos(ev, fg); p.derivarGansos(otra);
      expect(ev.resp, String(caso)).toEqual(otra.resp);
      expect(resultado(ev, fg).total).toBe((p.resultado(otra) as { total: number }).total);
      for (const desde of [undefined, 'GR01', 'GA03', 'GB03']) expect(siguientePendiente(ev, fg, desde)).toBe(p.siguientePendiente(otra, desde));
    }
  });
});
