-- =============================================================================
-- EBA Patos y Gansos · ICA — Catálogos iniciales
-- Roles, permisos, política de contraseña, ubicación (muestra de DIVIPOLA),
-- especies, categorías etarias, catálogos de apoyo y festivos 2026.
-- =============================================================================
SET search_path TO eba;
BEGIN;

INSERT INTO politica_contrasena (id) VALUES (1);

-- Roles: de la guía a la norma (Portada del libro del administrador)
INSERT INTO rol (codigo, nombre, descripcion, ambito, es_rol_sistema, requiere_matricula) VALUES
  ('ADMIN',               'Administrador del sistema',        'Gestiona usuarios, roles, accesos y catálogos.',                           'ICA',     true,  false),
  ('ADMIN_METODOLOGIA',   'Administradora de la metodología', 'Mantiene las versiones de la norma, escalas y reglas de cálculo.',        'ICA',     true,  false),
  ('COORDINADOR',         'Coordinador / Supervisor ICA',     'Programa visitas y hace seguimiento a la seccional (5.5).',               'ICA',     true,  false),
  ('INSPECTOR',           'Inspector ICA (evaluador)',        'Ejecuta las fases I a IV de la visita y registra lo observado.',          'ICA',     true,  true),
  ('PRODUCTOR_COMERCIAL', 'Productor comercial',              'Finca con 200 aves o más: carga documentos y consulta resultados.',       'EXTERNO', true,  false),
  ('PRODUCTOR_TRASPATIO', 'Productor de traspatio',           'Finca con menos de 200 aves: sin inspección documental (5; Tabla 1).',    'EXTERNO', true,  false),
  ('RESPONSABLE_TECNICO', 'Responsable técnico (MV, MVZ, Z)', 'Firma POE, plan sanitario y protocolos con matrícula vigente (5.5).',     'EXTERNO', true,  true),
  ('CONSULTOR',           'Consultor externo',                'Consulta datos agregados y anónimos con acceso a término.',              'EXTERNO', true,  false);

INSERT INTO permiso (codigo, modulo, accion, descripcion) VALUES
  ('inicio.consultar',        'inicio',       'CONSULTAR',   'Tablero de inicio'),
  ('fincas.consultar',        'fincas',       'CONSULTAR',   'Ver fincas (según alcance)'),
  ('fincas.crear',            'fincas',       'CREAR',       'Registrar fincas'),
  ('fincas.editar',           'fincas',       'EDITAR',      'Editar fincas, ubicación, especies e inventario'),
  ('fincas.inactivar',        'fincas',       'INACTIVAR',   'Inactivar o eliminar fincas sin historial'),
  ('evaluaciones.consultar',  'evaluaciones', 'CONSULTAR',   'Ver evaluaciones y resultados'),
  ('evaluaciones.crear',      'evaluaciones', 'CREAR',       'Programar evaluaciones'),
  ('evaluaciones.editar',     'evaluaciones', 'EDITAR',      'Diligenciar y finalizar evaluaciones'),
  ('evaluaciones.anular',     'evaluaciones', 'INACTIVAR',   'Anular evaluaciones con motivo'),
  ('reportes.exportar',       'reportes',     'EXPORTAR',    'Descargar PDF y exportar CSV'),
  ('usuarios.administrar',    'usuarios',     'ADMINISTRAR', 'Crear, editar, inactivar usuarios y asignar roles'),
  ('parametros.administrar',  'parametros',   'ADMINISTRAR', 'Versiones de la metodología y catálogos'),
  ('bitacora.consultar',      'bitacora',     'CONSULTAR',   'Consultar la bitácora'),
  ('ayuda.consultar',         'ayuda',        'CONSULTAR',   'Ayuda de la norma'),
  ('cuenta.editar',           'cuenta',       'EDITAR',      'Mi cuenta y sesiones');

-- Permisos por rol (igual a PERMISOS del prototipo, ampliado a los ocho roles)
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r JOIN permiso p ON
  (r.codigo = 'ADMIN'               AND p.modulo IN ('inicio', 'usuarios', 'parametros', 'bitacora', 'ayuda', 'cuenta', 'reportes'))
  OR (r.codigo = 'ADMIN_METODOLOGIA' AND p.modulo IN ('inicio', 'parametros', 'ayuda', 'cuenta'))
  OR (r.codigo = 'COORDINADOR'       AND p.modulo IN ('inicio', 'fincas', 'evaluaciones', 'reportes', 'bitacora', 'ayuda', 'cuenta'))
  OR (r.codigo = 'INSPECTOR'         AND (p.modulo IN ('inicio', 'fincas', 'reportes', 'ayuda', 'cuenta')
                                          OR p.codigo IN ('evaluaciones.consultar', 'evaluaciones.editar', 'evaluaciones.crear')))
  OR (r.codigo IN ('PRODUCTOR_COMERCIAL', 'PRODUCTOR_TRASPATIO')
                                     AND p.codigo IN ('inicio.consultar', 'fincas.consultar', 'fincas.crear', 'fincas.editar',
                                                      'evaluaciones.consultar', 'ayuda.consultar', 'cuenta.editar'))
  OR (r.codigo = 'RESPONSABLE_TECNICO' AND p.codigo IN ('inicio.consultar', 'fincas.consultar', 'evaluaciones.consultar', 'ayuda.consultar', 'cuenta.editar'))
  OR (r.codigo = 'CONSULTOR'         AND p.codigo IN ('inicio.consultar', 'reportes.exportar', 'ayuda.consultar', 'cuenta.editar'));

-- Ubicación: muestra de DIVIPOLA (DANE). En producción se carga el catálogo completo.
INSERT INTO departamento (codigo_dane, nombre) VALUES
  ('11', 'Bogotá D.C.'), ('15', 'Boyacá'), ('25', 'Cundinamarca'), ('68', 'Santander'), ('73', 'Tolima');
INSERT INTO municipio (codigo_dane, departamento, nombre) VALUES
  ('11001', '11', 'Bogotá D.C.'), ('15001', '15', 'Tunja'),
  ('25290', '25', 'Fusagasugá'), ('25513', '25', 'Pacho'),
  ('68001', '68', 'Bucaramanga'), ('68406', '68', 'Lebrija'), ('73001', '73', 'Ibagué');
INSERT INTO seccional (codigo, nombre, departamento) VALUES
  ('SEC-68', 'Seccional Santander', '68'), ('SEC-25', 'Seccional Cundinamarca', '25'),
  ('SEC-73', 'Seccional Tolima', '73'), ('SEC-15', 'Seccional Boyacá', '15');

-- Especies de la norma (capítulos 6 y 7): no se editan desde catálogos (RN-148)
INSERT INTO especie (nombre, nombre_cientifico) VALUES
  ('pato',  'Anas platyrhynchos domesticus / Cairina moschata'),
  ('ganso', 'Anser anser domesticus');

INSERT INTO categoria_etaria (especie_id, nombre, orden)
SELECT e.id, c.nombre, c.orden FROM especie e
JOIN (VALUES ('pato', 'Cría', 1), ('pato', 'Engorde', 2), ('pato', 'Ponedoras', 3), ('pato', 'Reproductores', 4),
             ('ganso', 'Cría', 1), ('ganso', 'Engorde', 2), ('ganso', 'Adultos', 3), ('ganso', 'Reproductores', 4))
  AS c(especie, nombre, orden) ON c.especie = e.nombre;

-- Catálogos de apoyo (RF35)
INSERT INTO catalogo (codigo, nombre, editable) VALUES
  ('TIPO_PRODUCTOR',    'Tipos de productor',      false),
  ('SISTEMA',           'Sistemas productivos',    true),
  ('PROPOSITO',         'Propósitos productivos',  true),
  ('MOTIVO_INACTIVAR',  'Motivos de inactivación', true),
  ('ESTADO_EVALUACION', 'Estados de evaluación',   false);
INSERT INTO item_catalogo (catalogo_id, codigo, nombre, orden)
SELECT c.id, i.codigo, i.nombre, i.orden FROM catalogo c JOIN (VALUES
  ('TIPO_PRODUCTOR', 'COMERCIAL', 'Comercial (200 aves o más)', 1), ('TIPO_PRODUCTOR', 'TRASPATIO', 'Traspatio (menos de 200 aves)', 2),
  ('SISTEMA', 'INTENSIVO', 'Intensivo', 1), ('SISTEMA', 'SEMI_INTENSIVO', 'Semi-intensivo', 2), ('SISTEMA', 'EXTENSIVO', 'Extensivo', 3),
  ('PROPOSITO', 'CARNE', 'Carne', 1), ('PROPOSITO', 'HUEVO', 'Huevo', 2), ('PROPOSITO', 'CRIA', 'Cría', 3),
  ('PROPOSITO', 'PLUMAS', 'Plumas', 4), ('PROPOSITO', 'HIGADO_GRASO', 'Hígado graso', 5),
  ('MOTIVO_INACTIVAR', 'VENTA', 'Venta de la finca', 1), ('MOTIVO_INACTIVAR', 'CESE', 'Cese de producción', 2),
  ('MOTIVO_INACTIVAR', 'SANITARIO', 'Cierre sanitario', 3), ('MOTIVO_INACTIVAR', 'OTRO', 'Otro', 4),
  ('ESTADO_EVALUACION', 'PROGRAMADA', 'Programada', 1), ('ESTADO_EVALUACION', 'EN_PROCESO', 'En proceso', 2),
  ('ESTADO_EVALUACION', 'FINALIZADA', 'Finalizada', 3), ('ESTADO_EVALUACION', 'ANULADA', 'Anulada', 4)
) AS i(catalogo, codigo, nombre, orden) ON i.catalogo = c.codigo;

-- Festivos de Colombia 2026 (plazo de 1 día hábil, 5.5 Fase IV)
INSERT INTO festivo (fecha, nombre) VALUES
  ('2026-01-01', 'Año Nuevo'), ('2026-01-12', 'Reyes Magos'), ('2026-03-23', 'San José'),
  ('2026-04-02', 'Jueves Santo'), ('2026-04-03', 'Viernes Santo'), ('2026-05-01', 'Día del Trabajo'),
  ('2026-05-18', 'Ascensión del Señor'), ('2026-06-08', 'Corpus Christi'), ('2026-06-15', 'Sagrado Corazón'),
  ('2026-06-29', 'San Pedro y San Pablo'), ('2026-07-20', 'Independencia'), ('2026-08-07', 'Batalla de Boyacá'),
  ('2026-08-17', 'Asunción de la Virgen'), ('2026-10-12', 'Día de la Raza'), ('2026-11-02', 'Todos los Santos'),
  ('2026-11-16', 'Independencia de Cartagena'), ('2026-12-08', 'Inmaculada Concepción'), ('2026-12-25', 'Navidad');

COMMIT;
