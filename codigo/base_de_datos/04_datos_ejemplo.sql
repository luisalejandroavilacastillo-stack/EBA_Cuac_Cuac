-- =============================================================================
-- EBA Patos y Gansos · ICA — Datos de ejemplo (los mismos del prototipo)
-- Usuarios ficticios, cuatro fincas y tres evaluaciones:
--   EVA-2026-00051 · Granja La Esperanza · patos · FINALIZADA (resultado calculado en la base de datos)
--   EVA-2026-00088 · Granja La Esperanza · patos · EN_PROCESO (puntajes calculados por el prototipo)
--   EVA-2026-00091 · Granja Santa Clara  · gansos · PROGRAMADA
-- Las contraseñas son marcadores: en la aplicación se guardan con argon2id.
-- =============================================================================
SET search_path TO eba;
BEGIN;

-- ---------------------------------------------------------------- usuarios
INSERT INTO usuario (tipo_documento, numero_documento, nombres, apellidos, correo, telefono, municipio, vereda, estado, autoriza_datos, fecha_autorizacion, debe_cambiar_contrasena) VALUES
  ('CC', '80765432',   'Andrés Felipe',  'Rojas Medina',        'a.rojas@ica.gov.co',     '3001112233', '11001', NULL,         'ACTIVO', true, now(), false),
  ('CC', '52114780',   'Carolina Andrea','Ruiz Beltrán',        'c.ruiz@ica.gov.co',      '3002223344', '11001', NULL,         'ACTIVO', true, now(), false),
  ('CC', '40023118',   'Luz Marina',     'Cárdenas Pinzón',     'l.cardenas@ica.gov.co',  '3103334455', '15001', NULL,         'ACTIVO', true, now(), false),
  ('CC', '1110456789', 'Camilo Andrés',  'Peña Rincón',         'c.pena@ica.gov.co',      '3154445566', '73001', NULL,         'ACTIVO', true, now(), false),
  ('CC', '91234567',   'Hernán Darío',   'Mejía Ortiz',         'h.mejia@correo.co',      '3175556677', '68406', 'La Puente',  'ACTIVO', true, now(), false),
  ('CC', '39556120',   'Marta Elena',    'Ruiz',                'm.ruiz@correo.co',       '3186667788', '25290', 'Bermejal',   'ACTIVO', true, now(), false),
  ('CC', '20556871',   'Rosa Elena',     'Quintero de Ávila',   NULL,                     '3127778899', '25513', 'San Isidro', 'ACTIVO', true, now(), false),
  ('CC', '91456123',   'Jorge Iván',     'Salazar Gómez',       'j.salazar@vet.co',       '3168889900', '68001', NULL,         'ACTIVO', true, now(), false),
  ('CC', '52884120',   'Daniela',        'Torres Bermúdez',     'd.torres@uni.edu.co',    '3019990011', '11001', NULL,         'ACTIVO', true, now(), false),
  ('CC', '79331002',   'Pedro',          'Gil Ramírez',         'p.gil@ica.gov.co',       '3140001122', '73001', NULL,         'ACTIVO', true, now(), false);
-- Usuario con historial: no se elimina, se inactiva con motivo (RN-22)
UPDATE usuario SET estado = 'INACTIVO', motivo_estado = 'Retiro de la entidad', fecha_estado = now() WHERE numero_documento = '79331002';

INSERT INTO credencial (usuario_id, hash_contrasena, fecha_expiracion, es_temporal)
SELECT id, '$argon2id$v=19$m=65536,t=3,p=4$ZGVtbw$marcador-de-ejemplo', now() + interval '90 days', false FROM usuario;

INSERT INTO usuario_rol (usuario_id, rol_id)
SELECT u.id, r.id FROM usuario u JOIN rol r ON (u.numero_documento, r.codigo) IN (
  ('80765432', 'ADMIN'), ('52114780', 'ADMIN_METODOLOGIA'), ('40023118', 'COORDINADOR'), ('1110456789', 'INSPECTOR'),
  ('91234567', 'PRODUCTOR_COMERCIAL'), ('39556120', 'PRODUCTOR_COMERCIAL'), ('20556871', 'PRODUCTOR_TRASPATIO'),
  ('91456123', 'RESPONSABLE_TECNICO'), ('52884120', 'CONSULTOR'), ('79331002', 'INSPECTOR'));

INSERT INTO perfil_ica (usuario_id, cargo, seccional_id)
SELECT u.id, x.cargo, s.id FROM usuario u
JOIN (VALUES ('80765432', 'Profesional de TI', 'SEC-68'), ('52114780', 'Profesional técnica', 'SEC-25'),
             ('40023118', 'Coordinadora de seccional', 'SEC-15'), ('1110456789', 'Inspector de campo', 'SEC-68'),
             ('79331002', 'Inspector de campo', 'SEC-73')) AS x(doc, cargo, sec) ON x.doc = u.numero_documento
JOIN seccional s ON s.codigo = x.sec;
INSERT INTO perfil_profesional (usuario_id, profesion, numero_matricula, vigencia_matricula)
SELECT id, 'MV'::profesion, 'COMVEZCOL-12873', DATE '2027-08-31' FROM usuario WHERE numero_documento = '1110456789'
UNION ALL SELECT id, 'MVZ'::profesion, 'COMVEZCOL-09412', DATE '2026-11-10' FROM usuario WHERE numero_documento = '91456123';
INSERT INTO perfil_productor (usuario_id, tipo_productor, acceso_plataforma, registrado_por)
SELECT u.id, x.t::tipo_productor, x.acc, CASE WHEN x.asist THEN (SELECT id FROM usuario WHERE numero_documento = '1110456789') END
  FROM usuario u JOIN (VALUES ('91234567', 'COMERCIAL', true, false), ('39556120', 'COMERCIAL', true, false),
                              ('20556871', 'TRASPATIO', false, true)) AS x(doc, t, acc, asist) ON x.doc = u.numero_documento;
INSERT INTO perfil_consultor (usuario_id, entidad, alcance, fecha_vencimiento_acceso)
SELECT id, 'Universidad (grupo de bienestar animal)', 'Datos agregados de patos y gansos', '2027-06-30' FROM usuario WHERE numero_documento = '52884120';

-- ---------------------------------------------------------------- fincas
INSERT INTO finca (codigo, nombre, tenencia, telefono, encargado, area_total_ha, estado, motivo_estado) VALUES
  ('FIN-2026-00417', 'Granja La Esperanza', 'PROPIA',    '3175556677', 'Luis Pérez',  6.2, 'ACTIVA',   NULL),
  ('FIN-2026-00431', 'Granja Santa Clara',  'PROPIA',    '3186667788', 'Marta Ruiz',  9.0, 'ACTIVA',   NULL),
  ('FIN-2025-00198', 'Finca San Isidro',    'PROPIA',    '3127778899', NULL,          0.5, 'ACTIVA',   NULL),
  ('FIN-2025-00211', 'Lote Vega',           'ARRENDADA', '3175556677', NULL,          3.0, 'INACTIVA', 'Cese de producción');

INSERT INTO ubicacion_finca (finca_id, municipio, vereda, direccion, latitud, longitud, precision_m, fuente)
SELECT f.id, x.mpio, x.vereda, x.dir, x.lat, x.lon, x.pre, x.fuente FROM finca f JOIN (VALUES
  ('FIN-2026-00417', '68406', 'La Puente',  'Km 4 vía Lebrija - Girón, entrada por la escuela', 7.112540, -73.218330, 8.0, 'GPS'),
  ('FIN-2026-00431', '25290', 'Bermejal',   'Vereda Bermejal, a 2 km del puente',                4.337120, -74.364810, 12.0, 'GPS'),
  ('FIN-2025-00198', '25513', 'San Isidro', 'Casa azul junto a la capilla',                      NULL, NULL, NULL, NULL),
  ('FIN-2025-00211', '68406', 'Vega Alta',  'Lote contiguo a la quebrada',                       NULL, NULL, NULL, NULL)
) AS x(cod, mpio, vereda, dir, lat, lon, pre, fuente) ON x.cod = f.codigo;

INSERT INTO asignacion_finca (finca_id, usuario_id, tipo)
SELECT f.id, u.id, x.tipo::tipo_vinculo FROM finca f JOIN (VALUES
  ('FIN-2026-00417', '91234567', 'PROPIETARIO'), ('FIN-2026-00417', '91456123', 'RESPONSABLE_TECNICO'),
  ('FIN-2026-00431', '39556120', 'PROPIETARIO'), ('FIN-2025-00198', '20556871', 'PROPIETARIO'),
  ('FIN-2025-00211', '91234567', 'PROPIETARIO')) AS x(cod, doc, tipo) ON x.cod = f.codigo
JOIN usuario u ON u.numero_documento = x.doc;

INSERT INTO instalacion (finca_id, tipo, nombre, especie_id, area_util_m2, uso, piso, profundidad_cm)
SELECT f.id, x.t::tipo_instalacion, x.n, (SELECT id FROM especie WHERE nombre = 'pato'), x.a, x.u, x.p, x.prof
  FROM finca f JOIN (VALUES ('GALPON', 'Galpón 1', 320.0, 'PERMANENTE', 'CAMA', NULL), ('GALPON', 'Galpón 2', 300.0, 'PERMANENTE', 'CAMA', NULL),
                            ('POCETA', 'Poceta 1', NULL, NULL, NULL, 25.0), ('POCETA', 'Poceta 2', NULL, NULL, NULL, 15.0))
       AS x(t, n, a, u, p, prof) ON f.codigo = 'FIN-2026-00417';

INSERT INTO finca_especie (finca_id, especie_id, proposito_principal, otros_propositos, sistema, con_corral, permanencia_corral, tipo_bebedero)
SELECT f.id, e.id, x.prop, x.otros::varchar(20)[], x.sis, x.corral, x.perm, x.beb FROM finca f JOIN (VALUES
  ('FIN-2026-00417', 'pato',  'CARNE', '{}',         NULL,             true,  true,  'AUTOMATIZADO'),
  ('FIN-2026-00431', 'ganso', 'CARNE', '{PLUMAS}',   'SEMI_INTENSIVO', true,  NULL,  NULL),
  ('FIN-2025-00198', 'pato',  'HUEVO', '{}',         NULL,             false, false, 'ARTESANAL'),
  ('FIN-2025-00198', 'ganso', 'CARNE', '{}',         'EXTENSIVO',      false, NULL,  NULL),
  ('FIN-2025-00211', 'pato',  'CARNE', '{}',         NULL,             true,  true,  NULL)
) AS x(cod, esp, prop, otros, sis, corral, perm, beb) ON x.cod = f.codigo
JOIN especie e ON e.nombre = x.esp;

INSERT INTO inventario_corte (finca_especie_id, fecha_corte, verificado_en_visita, motivo)
SELECT fe.id, '2026-10-01', false, 'REGISTRO' FROM finca_especie fe;
INSERT INTO detalle_inventario (corte_id, categoria_etaria_id, cantidad, edad_semanas, peso_promedio_kg)
SELECT ic.id, ce.id, x.n, x.edad, x.peso
  FROM inventario_corte ic
  JOIN finca_especie fe ON fe.id = ic.finca_especie_id
  JOIN finca f   ON f.id = fe.finca_id
  JOIN especie e ON e.id = fe.especie_id
  JOIN (VALUES ('FIN-2026-00417', 'pato',  'Engorde',       820, 6,  2.5), ('FIN-2026-00417', 'pato', 'Reproductores', 27, 40, 3.1),
               ('FIN-2026-00431', 'ganso', 'Engorde',       220, 14, 4.2), ('FIN-2026-00431', 'ganso', 'Reproductores', 40, 60, 5.1),
               ('FIN-2025-00198', 'pato',  'Ponedoras',     18,  30, 2.2), ('FIN-2025-00198', 'ganso', 'Adultos',        9, 50, 5.0),
               ('FIN-2025-00211', 'pato',  'Engorde',       0,   0,  NULL))
       AS x(cod, esp, cat, n, edad, peso) ON x.cod = f.codigo AND x.esp = e.nombre
  JOIN categoria_etaria ce ON ce.especie_id = e.id AND ce.nombre = x.cat;

-- ---------------------------------------------------------------- evaluaciones
CREATE TEMP VIEW _fe AS
SELECT fe.id, f.codigo AS finca, e.nombre AS especie FROM finca_especie fe JOIN finca f ON f.id = fe.finca_id JOIN especie e ON e.id = fe.especie_id;
CREATE TEMP VIEW _ver AS
SELECT v.id, e.nombre AS especie FROM version_metodologia v JOIN especie e ON e.id = v.especie_id WHERE v.estado = 'PUBLICADA';

INSERT INTO evaluacion (codigo, finca_especie_id, version_id, inspector_id, corte_id, fecha_visita)
SELECT x.cod, fe.id, v.id, (SELECT id FROM usuario WHERE numero_documento = '1110456789'),
       (SELECT id FROM inventario_corte WHERE finca_especie_id = fe.id), x.fecha::timestamptz
  FROM (VALUES ('EVA-2026-00051', 'FIN-2026-00417', 'pato',  '2026-04-14 07:30-05'),
               ('EVA-2026-00091', 'FIN-2026-00431', 'ganso', '2026-10-17 07:00-05')) AS x(cod, finca, esp, fecha)
  JOIN _fe fe ON fe.finca = x.finca AND fe.especie = x.esp
  JOIN _ver v ON v.especie = x.esp
 ORDER BY x.cod;

-- EVA-2026-00051: visita de abril, finalizada con resultado definitivo
UPDATE evaluacion SET estado = 'EN_PROCESO', tramo = 'COMERCIAL', pesos = '{"MBA": 0.60, "MBR": 0.25, "MBG": 0.15}', poblacion_total = 847,
       hora_inicio = '2026-04-14 07:30-05', persona_atiende = 'Luis Pérez (mayordomo)'
 WHERE codigo = 'EVA-2026-00051';
INSERT INTO indicador_evaluado (evaluacion_id, indicador_id, aplica, motivo_no_aplica, puntaje, estado)
SELECT ev.id, i.id, x.aplica, x.motivo, x.puntaje,
       CASE WHEN NOT x.aplica THEN 'NO_APLICA' WHEN x.puntaje IS NULL THEN 'PENDIENTE' ELSE 'CALIFICADO' END::estado_indicador
  FROM evaluacion ev JOIN indicador i ON i.version_id = ev.version_id
  JOIN (VALUES
    ('PR01', true, NULL, 100),
    ('PR02', true, NULL, 91),
    ('PR03', true, NULL, 100),
    ('PR04', true, NULL, 55),
    ('PR05', true, NULL, 86),
    ('PR06', true, NULL, 100),
    ('PR07', true, NULL, 86.5),
    ('PR08', true, NULL, 55),
    ('PR09', true, NULL, 55),
    ('PR10', false, 'Solo aplica a producción de huevo.', NULL),
    ('PR11', true, NULL, 100),
    ('PR12', true, NULL, 100),
    ('PA01', true, NULL, 0),
    ('PA02', true, NULL, 100),
    ('PA03', true, NULL, 95.5),
    ('PA04', true, NULL, 95.5),
    ('PA05', true, NULL, 95.5),
    ('PA06', true, NULL, 95.5),
    ('PA07', true, NULL, 100),
    ('PA08', true, NULL, 95.5),
    ('PA09', true, NULL, 100),
    ('PA10', true, NULL, 100),
    ('PA11', true, NULL, 100),
    ('PG01', true, NULL, 100),
    ('PG02', true, NULL, 100),
    ('PG03', true, NULL, 100),
    ('PG04', true, NULL, 0),
    ('PG05', true, NULL, 0),
    ('PG06', true, NULL, 0),
    ('PG07', true, NULL, 100),
    ('PG08', true, NULL, 100),
    ('PG09', true, NULL, 100),
    ('PG10', true, NULL, 0)
  ) AS x(codigo, aplica, motivo, puntaje) ON x.codigo = i.codigo
 WHERE ev.codigo = 'EVA-2026-00051';

INSERT INTO observacion (evaluacion_id, indicador_evaluado_id, nivel, tipo, texto, autor_id)
SELECT ie.evaluacion_id, ie.id, 'INDICADOR', 'HALLAZGO', 'Ventiladores apagados en el galpón 2; 74 de 120 aves con jadeo.', e.inspector_id
  FROM indicador_evaluado ie JOIN evaluacion e ON e.id = ie.evaluacion_id JOIN indicador i ON i.id = ie.indicador_id
 WHERE e.codigo = 'EVA-2026-00051' AND i.codigo = 'PA01';
UPDATE evaluacion SET estado = 'FINALIZADA', fecha_finalizacion = '2026-04-14 12:40-05',
       observacion_general = 'Se socializó el resultado con el encargado.'
 WHERE codigo = 'EVA-2026-00051';
SELECT fn_calcular_resultado((SELECT id FROM evaluacion WHERE codigo = 'EVA-2026-00051'), 'DEFINITIVO');

INSERT INTO plan_mejora (evaluacion_id, fecha_acuerdo)
SELECT id, '2026-04-14' FROM evaluacion WHERE codigo = 'EVA-2026-00051';
INSERT INTO accion_mejora (plan_id, indicador_evaluado_id, accion, responsable, plazo, prioridad)
SELECT pm.id, ie.id,
       CASE i.codigo WHEN 'PA01' THEN 'Instalar ventiladores y mallas de sombra en el galpón 2'
                     WHEN 'PG04' THEN 'Elaborar el POE de bienestar animal firmado por el responsable técnico'
                     WHEN 'PG05' THEN 'Actualizar el plan sanitario con la firma del responsable técnico'
                     WHEN 'PG06' THEN 'Escribir el protocolo de sacrificio humanitario'
                     WHEN 'PG10' THEN 'Retirar medicamentos vencidos y llevar registro de tratamientos'
                     ELSE 'Corregir lo observado en ' || i.nombre END,
       CASE WHEN d.codigo = 'MBG' THEN 'Responsable técnico' ELSE 'Encargado de galpón' END,
       DATE '2026-04-14' + CASE WHEN ie.puntaje = 0 THEN 60 ELSE 120 END,
       CASE WHEN ie.puntaje = 0 AND d.codigo = 'MBA' THEN 'ALTA' WHEN ie.puntaje = 0 THEN 'MEDIA' ELSE 'BAJA' END::prioridad
  FROM plan_mejora pm
  JOIN indicador_evaluado ie ON ie.evaluacion_id = pm.evaluacion_id AND ie.aplica AND ie.puntaje < 100
  JOIN indicador i ON i.id = ie.indicador_id
  JOIN criterio c  ON c.id = i.criterio_id
  JOIN dimension d ON d.id = c.dimension_id
 WHERE pm.evaluacion_id = (SELECT id FROM evaluacion WHERE codigo = 'EVA-2026-00051');

INSERT INTO reporte (tipo, evaluacion_id, version_resultado, generado_por, sin_datos_personales)
SELECT 'PDF_RESULTADO', id, 1, inspector_id, false FROM evaluacion WHERE codigo = 'EVA-2026-00051';

-- EVA-2026-00088: visita de octubre, en proceso (mismos puntajes del prototipo)
INSERT INTO evaluacion (codigo, finca_especie_id, version_id, inspector_id, corte_id, fecha_visita)
SELECT 'EVA-2026-00088', fe.id, v.id, (SELECT id FROM usuario WHERE numero_documento = '1110456789'),
       (SELECT id FROM inventario_corte WHERE finca_especie_id = fe.id), '2026-10-15 07:10-05'
  FROM _fe fe JOIN _ver v ON v.especie = fe.especie WHERE fe.finca = 'FIN-2026-00417' AND fe.especie = 'pato';
UPDATE evaluacion SET estado = 'EN_PROCESO', tramo = 'COMERCIAL', pesos = '{"MBA": 0.60, "MBR": 0.25, "MBG": 0.15}', poblacion_total = 812,
       hora_inicio = '2026-10-15 07:10-05', persona_atiende = 'Luis Pérez (mayordomo)'
 WHERE codigo = 'EVA-2026-00088';
INSERT INTO indicador_evaluado (evaluacion_id, indicador_id, aplica, motivo_no_aplica, puntaje, estado)
SELECT ev.id, i.id, x.aplica, x.motivo, x.puntaje,
       CASE WHEN NOT x.aplica THEN 'NO_APLICA' WHEN x.puntaje IS NULL THEN 'PENDIENTE' ELSE 'CALIFICADO' END::estado_indicador
  FROM evaluacion ev JOIN indicador i ON i.version_id = ev.version_id
  JOIN (VALUES
    ('PR01', true, NULL, 100),
    ('PR02', true, NULL, 91),
    ('PR03', true, NULL, 100),
    ('PR04', true, NULL, 55),
    ('PR05', true, NULL, 86),
    ('PR06', true, NULL, 100),
    ('PR07', true, NULL, 86.5),
    ('PR08', true, NULL, 55),
    ('PR09', true, NULL, 55),
    ('PR10', false, 'Solo aplica a producción de huevo.', NULL),
    ('PR11', true, NULL, NULL),
    ('PR12', true, NULL, 100),
    ('PA01', true, NULL, 0),
    ('PA02', true, NULL, 100),
    ('PA03', true, NULL, 95.5),
    ('PA04', true, NULL, 95.5),
    ('PA05', true, NULL, 95.5),
    ('PA06', true, NULL, 95.5),
    ('PA07', true, NULL, 100),
    ('PA08', true, NULL, 95.5),
    ('PA09', true, NULL, 100),
    ('PA10', true, NULL, 100),
    ('PA11', true, NULL, NULL),
    ('PG01', true, NULL, 100),
    ('PG02', true, NULL, 100),
    ('PG03', true, NULL, 100),
    ('PG04', true, NULL, 0),
    ('PG05', true, NULL, 0),
    ('PG06', true, NULL, 0),
    ('PG07', true, NULL, 100),
    ('PG08', true, NULL, 100),
    ('PG09', true, NULL, NULL),
    ('PG10', true, NULL, 0)
  ) AS x(codigo, aplica, motivo, puntaje) ON x.codigo = i.codigo
 WHERE ev.codigo = 'EVA-2026-00088';

INSERT INTO plan_muestreo (evaluacion_id, con_corral, corrales, puntos_por_corral, tamano_muestra)
SELECT id, true, 2, 5, 10 FROM evaluacion WHERE codigo = 'EVA-2026-00088';
INSERT INTO punto_muestreo (evaluacion_id, corral, numero)
SELECT e.id, c, n FROM evaluacion e, generate_series(1, 2) c, generate_series(1, 5) n WHERE e.codigo = 'EVA-2026-00088';
INSERT INTO guardado_parcial (evaluacion_id, fecha_hora_dispositivo, usuario_id, seccion, avance, origen)
SELECT id, now(), inspector_id, 'ANIMALES_MBA', 88.0, 'AUTOMATICO' FROM evaluacion WHERE codigo = 'EVA-2026-00088';

-- Documento PG06 pendiente: cuenta 0 y tiene 1 día hábil para entregarse
INSERT INTO evidencia (evaluacion_id, indicador_evaluado_id, tipo, url, tamano_mb, fecha_captura, hash_sha256, autor_id)
SELECT e.id, ie.id, 'PDF', 'pendiente://PG06', 0.01, now(), repeat('0', 64), e.inspector_id
  FROM evaluacion e JOIN indicador_evaluado ie ON ie.evaluacion_id = e.id JOIN indicador i ON i.id = ie.indicador_id
 WHERE e.codigo = 'EVA-2026-00088' AND i.codigo = 'PG06';
INSERT INTO documento_soporte (evidencia_id, estado, fecha_limite)
SELECT ev.id, 'PENDIENTE', '2026-12-31 23:59-05' FROM evidencia ev WHERE ev.url = 'pendiente://PG06';

-- Notificación enviada por correo al productor (las demás se calculan en v_pendientes)
INSERT INTO notificacion (usuario_id, tipo, mensaje, enlace, vence, canal)
SELECT u.id, 'VISITA_PROGRAMADA', 'Visita programada a Granja Santa Clara el 17/10/2026 a las 7:00', '#/eval/EVA-2026-00091', '2026-10-17 07:00-05', 'CORREO'
  FROM usuario u WHERE numero_documento = '39556120';

INSERT INTO registro_auditoria (actor_id, accion, entidad, id_entidad, valor_anterior, valor_nuevo, motivo)
SELECT id, 'INACTIVAR', 'finca', 'FIN-2025-00211', '{"estado": "ACTIVA"}', '{"estado": "INACTIVA"}', 'Cese de producción'
  FROM usuario WHERE numero_documento = '91234567';

COMMIT;
