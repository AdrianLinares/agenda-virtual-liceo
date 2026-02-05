-- =====================================================
-- DATOS DE PRUEBA (ALINEADOS AL SCHEMA)
-- =====================================================
-- Requisitos:
-- 1) Crear los usuarios en Authentication > Users con estos emails
-- 2) Luego ejecutar este script en el SQL Editor
--
-- Este script NO crea usuarios en auth.users. Solo sincroniza profiles
-- y genera datos relacionados evitando conflictos de FK/UNIQUE.

BEGIN;

-- =====================================================
-- 1. SINCRONIZAR PROFILES CON auth.users
-- =====================================================
WITH expected_users AS (
	SELECT * FROM (VALUES
		('admin@liceo.edu','Carlos Rodríguez','administrador','3001234567','Calle 10 #20-30'),
		('secretaria@liceo.edu','María Fernández','administrativo','3009876543','Carrera 15 #25-40'),
		('coordinador@liceo.edu','Jorge Morales','administrativo','3005551234','Avenida 5 #12-15'),
		('jgomez@liceo.edu','Juan Gómez','docente','3101234567','Calle 20 #30-40'),
		('aperez@liceo.edu','Ana Pérez','docente','3107654321','Carrera 25 #15-20'),
		('lmartinez@liceo.edu','Luis Martínez','docente','3159876543','Calle 30 #40-50'),
		('csanchez@liceo.edu','Carmen Sánchez','docente','3134567890','Avenida 10 #5-15'),
		('rlopez@liceo.edu','Roberto López','docente','3145678901','Calle 35 #20-25'),
		('mgarcia@liceo.edu','Marta García','docente','3156789012','Carrera 40 #30-35'),
		('est01@liceo.edu','Andrés Castro','estudiante','3201234501','Calle 1 #2-3'),
		('est02@liceo.edu','Beatriz Díaz','estudiante','3201234502','Calle 2 #3-4'),
		('est03@liceo.edu','Carlos Méndez','estudiante','3201234503','Calle 3 #4-5'),
		('est04@liceo.edu','Diana Ruiz','estudiante','3201234504','Calle 4 #5-6'),
		('est05@liceo.edu','Eduardo Torres','estudiante','3201234505','Calle 5 #6-7'),
		('est06@liceo.edu','Fernanda Vargas','estudiante','3201234506','Calle 6 #7-8'),
		('est07@liceo.edu','Gabriel Herrera','estudiante','3201234507','Calle 7 #8-9'),
		('est08@liceo.edu','Helena Ortiz','estudiante','3201234508','Calle 8 #9-10'),
		('est09@liceo.edu','Ignacio Silva','estudiante','3201234509','Calle 9 #10-11'),
		('est10@liceo.edu','Julia Ramírez','estudiante','3201234510','Calle 10 #11-12'),
		('est11@liceo.edu','Kevin Navarro','estudiante','3201234511','Calle 11 #12-13'),
		('est12@liceo.edu','Laura Campos','estudiante','3201234512','Calle 12 #13-14'),
		('est13@liceo.edu','Miguel Rojas','estudiante','3201234513','Calle 13 #14-15'),
		('est14@liceo.edu','Natalia Vega','estudiante','3201234514','Calle 14 #15-16'),
		('est15@liceo.edu','Óscar Moreno','estudiante','3201234515','Calle 15 #16-17'),
		('padre01@gmail.com','Ricardo Castro','padre','3001111101','Calle 1 #2-3'),
		('madre01@gmail.com','Sandra Castro','padre','3001111102','Calle 1 #2-3'),
		('padre02@gmail.com','Pedro Díaz','padre','3001111103','Calle 2 #3-4'),
		('padre03@gmail.com','Antonio Méndez','padre','3001111104','Calle 3 #4-5'),
		('madre03@gmail.com','Patricia Méndez','padre','3001111105','Calle 3 #4-5'),
		('padre04@gmail.com','Fernando Ruiz','padre','3001111106','Calle 4 #5-6'),
		('padre06@gmail.com','Javier Vargas','padre','3001111107','Calle 6 #7-8'),
		('madre08@gmail.com','Claudia Ortiz','padre','3001111108','Calle 8 #9-10')
	) AS t(email, nombre, rol, telefono, direccion)
),
existing_users AS (
	SELECT u.id, u.email, e.nombre, e.rol, e.telefono, e.direccion
	FROM auth.users u
	JOIN expected_users e ON e.email = u.email
)
INSERT INTO profiles (id, email, nombre_completo, rol, telefono, direccion, activo)
SELECT id, email, nombre, rol::user_role, telefono, direccion, true
FROM existing_users
ON CONFLICT (id) DO UPDATE SET
	email = EXCLUDED.email,
	nombre_completo = EXCLUDED.nombre_completo,
	rol = EXCLUDED.rol,
	telefono = EXCLUDED.telefono,
	direccion = EXCLUDED.direccion,
	activo = EXCLUDED.activo;

-- =====================================================
-- 2. ESTRUCTURA ACADÉMICA (UPSERT)
-- =====================================================
INSERT INTO grados (nombre, nivel) VALUES
	('6°', 'Secundaria'),
	('7°', 'Secundaria'),
	('8°', 'Secundaria'),
	('9°', 'Secundaria'),
	('10°', 'Media'),
	('11°', 'Media')
ON CONFLICT (nombre) DO UPDATE SET nivel = EXCLUDED.nivel;

INSERT INTO asignaturas (nombre, codigo, descripcion) VALUES
	('Matemáticas', 'MAT', 'Matemáticas generales'),
	('Español', 'ESP', 'Lengua castellana'),
	('Inglés', 'ING', 'Idioma inglés'),
	('Ciencias Naturales', 'CN', 'Biología, Química y Física'),
	('Ciencias Sociales', 'CS', 'Historia y Geografía'),
	('Educación Física', 'EF', 'Deporte y actividad física'),
	('Artes', 'ART', 'Educación artística'),
	('Tecnología', 'TEC', 'Tecnología e informática'),
	('Ética y Valores', 'EV', 'Formación ética'),
	('Religión', 'REL', 'Educación religiosa')
ON CONFLICT (nombre) DO UPDATE SET
	codigo = EXCLUDED.codigo,
	descripcion = EXCLUDED.descripcion;

INSERT INTO periodos (nombre, numero, año_academico, fecha_inicio, fecha_fin) VALUES
	('Primer Periodo', 1, 2026, '2026-01-15', '2026-03-31'),
	('Segundo Periodo', 2, 2026, '2026-04-01', '2026-06-30'),
	('Tercer Periodo', 3, 2026, '2026-07-15', '2026-09-30'),
	('Cuarto Periodo', 4, 2026, '2026-10-01', '2026-11-30')
ON CONFLICT (numero, año_academico) DO UPDATE SET
	nombre = EXCLUDED.nombre,
	fecha_inicio = EXCLUDED.fecha_inicio,
	fecha_fin = EXCLUDED.fecha_fin;

-- =====================================================
-- 3. GRUPOS Y RELACIONES
-- =====================================================
WITH
g6 AS (SELECT id FROM grados WHERE nombre = '6°' LIMIT 1),
g7 AS (SELECT id FROM grados WHERE nombre = '7°' LIMIT 1),
g8 AS (SELECT id FROM grados WHERE nombre = '8°' LIMIT 1),
g9 AS (SELECT id FROM grados WHERE nombre = '9°' LIMIT 1),
d1 AS (SELECT id FROM profiles WHERE email = 'jgomez@liceo.edu' LIMIT 1),
d2 AS (SELECT id FROM profiles WHERE email = 'aperez@liceo.edu' LIMIT 1),
d3 AS (SELECT id FROM profiles WHERE email = 'lmartinez@liceo.edu' LIMIT 1),
d4 AS (SELECT id FROM profiles WHERE email = 'csanchez@liceo.edu' LIMIT 1)
INSERT INTO grupos (grado_id, nombre, año_academico, director_grupo_id)
SELECT g6.id, 'A', 2026, d1.id FROM g6 LEFT JOIN d1 ON true
UNION ALL
SELECT g7.id, 'A', 2026, d2.id FROM g7 LEFT JOIN d2 ON true
UNION ALL
SELECT g8.id, 'A', 2026, d3.id FROM g8 LEFT JOIN d3 ON true
UNION ALL
SELECT g9.id, 'A', 2026, d4.id FROM g9 LEFT JOIN d4 ON true
ON CONFLICT (grado_id, nombre, año_academico) DO UPDATE SET
	director_grupo_id = EXCLUDED.director_grupo_id;

-- Estudiantes en grupos
WITH
g6a AS (SELECT g.id FROM grupos g JOIN grados gr ON gr.id = g.grado_id WHERE gr.nombre = '6°' AND g.nombre = 'A' AND g.año_academico = 2026 LIMIT 1),
g7a AS (SELECT g.id FROM grupos g JOIN grados gr ON gr.id = g.grado_id WHERE gr.nombre = '7°' AND g.nombre = 'A' AND g.año_academico = 2026 LIMIT 1),
g8a AS (SELECT g.id FROM grupos g JOIN grados gr ON gr.id = g.grado_id WHERE gr.nombre = '8°' AND g.nombre = 'A' AND g.año_academico = 2026 LIMIT 1),
s1 AS (SELECT id FROM profiles WHERE email = 'est01@liceo.edu' LIMIT 1),
s2 AS (SELECT id FROM profiles WHERE email = 'est02@liceo.edu' LIMIT 1),
s3 AS (SELECT id FROM profiles WHERE email = 'est03@liceo.edu' LIMIT 1),
s4 AS (SELECT id FROM profiles WHERE email = 'est04@liceo.edu' LIMIT 1),
s5 AS (SELECT id FROM profiles WHERE email = 'est05@liceo.edu' LIMIT 1),
s6 AS (SELECT id FROM profiles WHERE email = 'est06@liceo.edu' LIMIT 1),
s7 AS (SELECT id FROM profiles WHERE email = 'est07@liceo.edu' LIMIT 1),
s8 AS (SELECT id FROM profiles WHERE email = 'est08@liceo.edu' LIMIT 1),
s9 AS (SELECT id FROM profiles WHERE email = 'est09@liceo.edu' LIMIT 1),
s10 AS (SELECT id FROM profiles WHERE email = 'est10@liceo.edu' LIMIT 1),
s11 AS (SELECT id FROM profiles WHERE email = 'est11@liceo.edu' LIMIT 1),
s12 AS (SELECT id FROM profiles WHERE email = 'est12@liceo.edu' LIMIT 1),
s13 AS (SELECT id FROM profiles WHERE email = 'est13@liceo.edu' LIMIT 1),
s14 AS (SELECT id FROM profiles WHERE email = 'est14@liceo.edu' LIMIT 1),
s15 AS (SELECT id FROM profiles WHERE email = 'est15@liceo.edu' LIMIT 1)
INSERT INTO estudiantes_grupos (estudiante_id, grupo_id, año_academico, estado)
SELECT s1.id, g6a.id, 2026, 'activo' FROM s1 JOIN g6a ON true
UNION ALL SELECT s2.id, g6a.id, 2026, 'activo' FROM s2 JOIN g6a ON true
UNION ALL SELECT s3.id, g6a.id, 2026, 'activo' FROM s3 JOIN g6a ON true
UNION ALL SELECT s4.id, g6a.id, 2026, 'activo' FROM s4 JOIN g6a ON true
UNION ALL SELECT s5.id, g6a.id, 2026, 'activo' FROM s5 JOIN g6a ON true
UNION ALL SELECT s6.id, g7a.id, 2026, 'activo' FROM s6 JOIN g7a ON true
UNION ALL SELECT s7.id, g7a.id, 2026, 'activo' FROM s7 JOIN g7a ON true
UNION ALL SELECT s8.id, g7a.id, 2026, 'activo' FROM s8 JOIN g7a ON true
UNION ALL SELECT s9.id, g7a.id, 2026, 'activo' FROM s9 JOIN g7a ON true
UNION ALL SELECT s10.id, g7a.id, 2026, 'activo' FROM s10 JOIN g7a ON true
UNION ALL SELECT s11.id, g8a.id, 2026, 'activo' FROM s11 JOIN g8a ON true
UNION ALL SELECT s12.id, g8a.id, 2026, 'activo' FROM s12 JOIN g8a ON true
UNION ALL SELECT s13.id, g8a.id, 2026, 'activo' FROM s13 JOIN g8a ON true
UNION ALL SELECT s14.id, g8a.id, 2026, 'activo' FROM s14 JOIN g8a ON true
UNION ALL SELECT s15.id, g8a.id, 2026, 'activo' FROM s15 JOIN g8a ON true
ON CONFLICT (estudiante_id, año_academico) DO UPDATE SET
	grupo_id = EXCLUDED.grupo_id,
	estado = EXCLUDED.estado;

-- Padres - estudiantes
WITH
p1 AS (SELECT id FROM profiles WHERE email = 'padre01@gmail.com' LIMIT 1),
p2 AS (SELECT id FROM profiles WHERE email = 'madre01@gmail.com' LIMIT 1),
p3 AS (SELECT id FROM profiles WHERE email = 'padre02@gmail.com' LIMIT 1),
p4 AS (SELECT id FROM profiles WHERE email = 'padre03@gmail.com' LIMIT 1),
p5 AS (SELECT id FROM profiles WHERE email = 'madre03@gmail.com' LIMIT 1),
p6 AS (SELECT id FROM profiles WHERE email = 'padre04@gmail.com' LIMIT 1),
p7 AS (SELECT id FROM profiles WHERE email = 'padre06@gmail.com' LIMIT 1),
p8 AS (SELECT id FROM profiles WHERE email = 'madre08@gmail.com' LIMIT 1),
s1 AS (SELECT id FROM profiles WHERE email = 'est01@liceo.edu' LIMIT 1),
s2 AS (SELECT id FROM profiles WHERE email = 'est02@liceo.edu' LIMIT 1),
s3 AS (SELECT id FROM profiles WHERE email = 'est03@liceo.edu' LIMIT 1),
s4 AS (SELECT id FROM profiles WHERE email = 'est04@liceo.edu' LIMIT 1),
s6 AS (SELECT id FROM profiles WHERE email = 'est06@liceo.edu' LIMIT 1),
s8 AS (SELECT id FROM profiles WHERE email = 'est08@liceo.edu' LIMIT 1)
INSERT INTO padres_estudiantes (padre_id, estudiante_id, parentesco, principal)
SELECT p1.id, s1.id, 'Padre', true FROM p1 JOIN s1 ON true
UNION ALL SELECT p2.id, s1.id, 'Madre', false FROM p2 JOIN s1 ON true
UNION ALL SELECT p3.id, s2.id, 'Padre', true FROM p3 JOIN s2 ON true
UNION ALL SELECT p4.id, s3.id, 'Padre', true FROM p4 JOIN s3 ON true
UNION ALL SELECT p5.id, s3.id, 'Madre', false FROM p5 JOIN s3 ON true
UNION ALL SELECT p6.id, s4.id, 'Padre', true FROM p6 JOIN s4 ON true
UNION ALL SELECT p7.id, s6.id, 'Padre', true FROM p7 JOIN s6 ON true
UNION ALL SELECT p8.id, s8.id, 'Madre', true FROM p8 JOIN s8 ON true
ON CONFLICT (padre_id, estudiante_id) DO UPDATE SET
	parentesco = EXCLUDED.parentesco,
	principal = EXCLUDED.principal;

-- Asignaciones docentes
WITH
g6a AS (SELECT g.id FROM grupos g JOIN grados gr ON gr.id = g.grado_id WHERE gr.nombre = '6°' AND g.nombre = 'A' AND g.año_academico = 2026 LIMIT 1),
g7a AS (SELECT g.id FROM grupos g JOIN grados gr ON gr.id = g.grado_id WHERE gr.nombre = '7°' AND g.nombre = 'A' AND g.año_academico = 2026 LIMIT 1),
g8a AS (SELECT g.id FROM grupos g JOIN grados gr ON gr.id = g.grado_id WHERE gr.nombre = '8°' AND g.nombre = 'A' AND g.año_academico = 2026 LIMIT 1),
mat AS (SELECT id FROM asignaturas WHERE nombre = 'Matemáticas' LIMIT 1),
esp AS (SELECT id FROM asignaturas WHERE nombre = 'Español' LIMIT 1),
ing AS (SELECT id FROM asignaturas WHERE nombre = 'Inglés' LIMIT 1),
cn AS (SELECT id FROM asignaturas WHERE nombre = 'Ciencias Naturales' LIMIT 1),
cs AS (SELECT id FROM asignaturas WHERE nombre = 'Ciencias Sociales' LIMIT 1),
d1 AS (SELECT id FROM profiles WHERE email = 'jgomez@liceo.edu' LIMIT 1),
d2 AS (SELECT id FROM profiles WHERE email = 'aperez@liceo.edu' LIMIT 1),
d3 AS (SELECT id FROM profiles WHERE email = 'lmartinez@liceo.edu' LIMIT 1),
d4 AS (SELECT id FROM profiles WHERE email = 'csanchez@liceo.edu' LIMIT 1),
d5 AS (SELECT id FROM profiles WHERE email = 'rlopez@liceo.edu' LIMIT 1)
INSERT INTO asignaciones_docentes (docente_id, grupo_id, asignatura_id, año_academico)
SELECT d1.id, g6a.id, mat.id, 2026 FROM d1 JOIN g6a ON true JOIN mat ON true
UNION ALL SELECT d1.id, g7a.id, mat.id, 2026 FROM d1 JOIN g7a ON true JOIN mat ON true
UNION ALL SELECT d1.id, g8a.id, mat.id, 2026 FROM d1 JOIN g8a ON true JOIN mat ON true
UNION ALL SELECT d2.id, g6a.id, esp.id, 2026 FROM d2 JOIN g6a ON true JOIN esp ON true
UNION ALL SELECT d2.id, g7a.id, esp.id, 2026 FROM d2 JOIN g7a ON true JOIN esp ON true
UNION ALL SELECT d2.id, g8a.id, esp.id, 2026 FROM d2 JOIN g8a ON true JOIN esp ON true
UNION ALL SELECT d3.id, g6a.id, ing.id, 2026 FROM d3 JOIN g6a ON true JOIN ing ON true
UNION ALL SELECT d3.id, g7a.id, ing.id, 2026 FROM d3 JOIN g7a ON true JOIN ing ON true
UNION ALL SELECT d3.id, g8a.id, ing.id, 2026 FROM d3 JOIN g8a ON true JOIN ing ON true
UNION ALL SELECT d4.id, g6a.id, cn.id, 2026 FROM d4 JOIN g6a ON true JOIN cn ON true
UNION ALL SELECT d4.id, g7a.id, cn.id, 2026 FROM d4 JOIN g7a ON true JOIN cn ON true
UNION ALL SELECT d4.id, g8a.id, cn.id, 2026 FROM d4 JOIN g8a ON true JOIN cn ON true
UNION ALL SELECT d5.id, g6a.id, cs.id, 2026 FROM d5 JOIN g6a ON true JOIN cs ON true
UNION ALL SELECT d5.id, g7a.id, cs.id, 2026 FROM d5 JOIN g7a ON true JOIN cs ON true
UNION ALL SELECT d5.id, g8a.id, cs.id, 2026 FROM d5 JOIN g8a ON true JOIN cs ON true
ON CONFLICT (docente_id, grupo_id, asignatura_id, año_academico) DO NOTHING;

-- =====================================================
-- 4. HORARIOS
-- =====================================================
WITH
g6a AS (SELECT g.id FROM grupos g JOIN grados gr ON gr.id = g.grado_id WHERE gr.nombre = '6°' AND g.nombre = 'A' AND g.año_academico = 2026 LIMIT 1),
mat AS (SELECT id FROM asignaturas WHERE nombre = 'Matemáticas' LIMIT 1),
esp AS (SELECT id FROM asignaturas WHERE nombre = 'Español' LIMIT 1),
ing AS (SELECT id FROM asignaturas WHERE nombre = 'Inglés' LIMIT 1),
cn AS (SELECT id FROM asignaturas WHERE nombre = 'Ciencias Naturales' LIMIT 1),
cs AS (SELECT id FROM asignaturas WHERE nombre = 'Ciencias Sociales' LIMIT 1),
ef AS (SELECT id FROM asignaturas WHERE nombre = 'Educación Física' LIMIT 1),
art AS (SELECT id FROM asignaturas WHERE nombre = 'Artes' LIMIT 1),
tec AS (SELECT id FROM asignaturas WHERE nombre = 'Tecnología' LIMIT 1),
et AS (SELECT id FROM asignaturas WHERE nombre = 'Ética y Valores' LIMIT 1),
rel AS (SELECT id FROM asignaturas WHERE nombre = 'Religión' LIMIT 1),
d1 AS (SELECT id FROM profiles WHERE email = 'jgomez@liceo.edu' LIMIT 1),
d2 AS (SELECT id FROM profiles WHERE email = 'aperez@liceo.edu' LIMIT 1),
d3 AS (SELECT id FROM profiles WHERE email = 'lmartinez@liceo.edu' LIMIT 1),
d4 AS (SELECT id FROM profiles WHERE email = 'csanchez@liceo.edu' LIMIT 1),
d5 AS (SELECT id FROM profiles WHERE email = 'rlopez@liceo.edu' LIMIT 1),
d6 AS (SELECT id FROM profiles WHERE email = 'mgarcia@liceo.edu' LIMIT 1)
INSERT INTO horarios (grupo_id, asignatura_id, docente_id, dia_semana, hora_inicio, hora_fin, aula, año_academico)
SELECT g6a.id, mat.id, d1.id, 1, '07:00'::time, '08:00'::time, 'Aula 601', 2026 FROM g6a JOIN mat ON true JOIN d1 ON true
UNION ALL SELECT g6a.id, esp.id, d2.id, 1, '08:00'::time, '09:00'::time, 'Aula 601', 2026 FROM g6a JOIN esp ON true JOIN d2 ON true
UNION ALL SELECT g6a.id, ing.id, d3.id, 1, '09:00'::time, '10:00'::time, 'Aula 601', 2026 FROM g6a JOIN ing ON true JOIN d3 ON true
UNION ALL SELECT g6a.id, cn.id, d4.id, 2, '07:00'::time, '08:00'::time, 'Aula 601', 2026 FROM g6a JOIN cn ON true JOIN d4 ON true
UNION ALL SELECT g6a.id, cs.id, d5.id, 2, '08:00'::time, '09:00'::time, 'Aula 601', 2026 FROM g6a JOIN cs ON true JOIN d5 ON true
UNION ALL SELECT g6a.id, ef.id, d6.id, 2, '09:00'::time, '10:00'::time, 'Cancha', 2026 FROM g6a JOIN ef ON true JOIN d6 ON true
UNION ALL SELECT g6a.id, mat.id, d1.id, 3, '07:00'::time, '08:00'::time, 'Aula 601', 2026 FROM g6a JOIN mat ON true JOIN d1 ON true
UNION ALL SELECT g6a.id, art.id, d2.id, 3, '08:00'::time, '09:00'::time, 'Aula Arte', 2026 FROM g6a JOIN art ON true JOIN d2 ON true
UNION ALL SELECT g6a.id, tec.id, d3.id, 4, '07:00'::time, '08:00'::time, 'Lab Sistemas', 2026 FROM g6a JOIN tec ON true JOIN d3 ON true
UNION ALL SELECT g6a.id, esp.id, d2.id, 4, '08:00'::time, '09:00'::time, 'Aula 601', 2026 FROM g6a JOIN esp ON true JOIN d2 ON true
UNION ALL SELECT g6a.id, et.id, d1.id, 5, '07:00'::time, '08:00'::time, 'Aula 601', 2026 FROM g6a JOIN et ON true JOIN d1 ON true
UNION ALL SELECT g6a.id, rel.id, d2.id, 5, '08:00'::time, '09:00'::time, 'Aula 601', 2026 FROM g6a JOIN rel ON true JOIN d2 ON true
ON CONFLICT (grupo_id, dia_semana, hora_inicio, año_academico) DO UPDATE SET
	asignatura_id = EXCLUDED.asignatura_id,
	docente_id = EXCLUDED.docente_id,
	hora_fin = EXCLUDED.hora_fin,
	aula = EXCLUDED.aula;

-- =====================================================
-- 5. NOTAS Y BOLETINES
-- =====================================================
WITH
g6a AS (SELECT g.id FROM grupos g JOIN grados gr ON gr.id = g.grado_id WHERE gr.nombre = '6°' AND g.nombre = 'A' AND g.año_academico = 2026 LIMIT 1),
p1 AS (SELECT id FROM periodos WHERE numero = 1 AND año_academico = 2026 LIMIT 1),
mat AS (SELECT id FROM asignaturas WHERE nombre = 'Matemáticas' LIMIT 1),
esp AS (SELECT id FROM asignaturas WHERE nombre = 'Español' LIMIT 1),
ing AS (SELECT id FROM asignaturas WHERE nombre = 'Inglés' LIMIT 1),
cn AS (SELECT id FROM asignaturas WHERE nombre = 'Ciencias Naturales' LIMIT 1),
cs AS (SELECT id FROM asignaturas WHERE nombre = 'Ciencias Sociales' LIMIT 1),
d1 AS (SELECT id FROM profiles WHERE email = 'jgomez@liceo.edu' LIMIT 1),
d2 AS (SELECT id FROM profiles WHERE email = 'aperez@liceo.edu' LIMIT 1),
d3 AS (SELECT id FROM profiles WHERE email = 'lmartinez@liceo.edu' LIMIT 1),
d4 AS (SELECT id FROM profiles WHERE email = 'csanchez@liceo.edu' LIMIT 1),
d5 AS (SELECT id FROM profiles WHERE email = 'rlopez@liceo.edu' LIMIT 1),
s1 AS (SELECT id FROM profiles WHERE email = 'est01@liceo.edu' LIMIT 1),
s2 AS (SELECT id FROM profiles WHERE email = 'est02@liceo.edu' LIMIT 1),
s3 AS (SELECT id FROM profiles WHERE email = 'est03@liceo.edu' LIMIT 1),
s4 AS (SELECT id FROM profiles WHERE email = 'est04@liceo.edu' LIMIT 1),
s5 AS (SELECT id FROM profiles WHERE email = 'est05@liceo.edu' LIMIT 1)
INSERT INTO notas (estudiante_id, asignatura_id, periodo_id, grupo_id, docente_id, nota, observaciones)
SELECT s1.id, mat.id, p1.id, g6a.id, d1.id, 85.5, 'Buen desempeño' FROM s1 JOIN mat ON true JOIN p1 ON true JOIN g6a ON true JOIN d1 ON true
UNION ALL SELECT s1.id, esp.id, p1.id, g6a.id, d2.id, 90.0, 'Excelente participación' FROM s1 JOIN esp ON true JOIN p1 ON true JOIN g6a ON true JOIN d2 ON true
UNION ALL SELECT s1.id, ing.id, p1.id, g6a.id, d3.id, 78.0, 'Debe practicar más' FROM s1 JOIN ing ON true JOIN p1 ON true JOIN g6a ON true JOIN d3 ON true
UNION ALL SELECT s1.id, cn.id, p1.id, g6a.id, d4.id, 88.0, 'Muy bien' FROM s1 JOIN cn ON true JOIN p1 ON true JOIN g6a ON true JOIN d4 ON true
UNION ALL SELECT s1.id, cs.id, p1.id, g6a.id, d5.id, 92.0, 'Sobresaliente' FROM s1 JOIN cs ON true JOIN p1 ON true JOIN g6a ON true JOIN d5 ON true
UNION ALL SELECT s2.id, mat.id, p1.id, g6a.id, d1.id, 95.0, 'Excelente estudiante' FROM s2 JOIN mat ON true JOIN p1 ON true JOIN g6a ON true JOIN d1 ON true
UNION ALL SELECT s2.id, esp.id, p1.id, g6a.id, d2.id, 93.0, 'Muy buena lectura' FROM s2 JOIN esp ON true JOIN p1 ON true JOIN g6a ON true JOIN d2 ON true
UNION ALL SELECT s2.id, ing.id, p1.id, g6a.id, d3.id, 91.0, 'Excelente pronunciación' FROM s2 JOIN ing ON true JOIN p1 ON true JOIN g6a ON true JOIN d3 ON true
UNION ALL SELECT s2.id, cn.id, p1.id, g6a.id, d4.id, 90.0, 'Muy aplicada' FROM s2 JOIN cn ON true JOIN p1 ON true JOIN g6a ON true JOIN d4 ON true
UNION ALL SELECT s2.id, cs.id, p1.id, g6a.id, d5.id, 94.0, 'Excelente análisis' FROM s2 JOIN cs ON true JOIN p1 ON true JOIN g6a ON true JOIN d5 ON true
UNION ALL SELECT s3.id, mat.id, p1.id, g6a.id, d1.id, 72.0, 'Necesita refuerzo' FROM s3 JOIN mat ON true JOIN p1 ON true JOIN g6a ON true JOIN d1 ON true
UNION ALL SELECT s3.id, esp.id, p1.id, g6a.id, d2.id, 75.0, 'Debe leer más' FROM s3 JOIN esp ON true JOIN p1 ON true JOIN g6a ON true JOIN d2 ON true
UNION ALL SELECT s3.id, ing.id, p1.id, g6a.id, d3.id, 70.0, 'Debe estudiar vocabulario' FROM s3 JOIN ing ON true JOIN p1 ON true JOIN g6a ON true JOIN d3 ON true
UNION ALL SELECT s3.id, cn.id, p1.id, g6a.id, d4.id, 78.0, 'Regular' FROM s3 JOIN cn ON true JOIN p1 ON true JOIN g6a ON true JOIN d4 ON true
UNION ALL SELECT s3.id, cs.id, p1.id, g6a.id, d5.id, 80.0, 'Aceptable' FROM s3 JOIN cs ON true JOIN p1 ON true JOIN g6a ON true JOIN d5 ON true
UNION ALL SELECT s4.id, mat.id, p1.id, g6a.id, d1.id, 88.0, NULL FROM s4 JOIN mat ON true JOIN p1 ON true JOIN g6a ON true JOIN d1 ON true
UNION ALL SELECT s4.id, esp.id, p1.id, g6a.id, d2.id, 86.0, NULL FROM s4 JOIN esp ON true JOIN p1 ON true JOIN g6a ON true JOIN d2 ON true
UNION ALL SELECT s5.id, mat.id, p1.id, g6a.id, d1.id, 82.0, NULL FROM s5 JOIN mat ON true JOIN p1 ON true JOIN g6a ON true JOIN d1 ON true
UNION ALL SELECT s5.id, esp.id, p1.id, g6a.id, d2.id, 84.0, NULL FROM s5 JOIN esp ON true JOIN p1 ON true JOIN g6a ON true JOIN d2 ON true
ON CONFLICT (estudiante_id, asignatura_id, periodo_id) DO UPDATE SET
	nota = EXCLUDED.nota,
	observaciones = EXCLUDED.observaciones,
	docente_id = EXCLUDED.docente_id,
	grupo_id = EXCLUDED.grupo_id;

WITH
g6a AS (SELECT g.id FROM grupos g JOIN grados gr ON gr.id = g.grado_id WHERE gr.nombre = '6°' AND g.nombre = 'A' AND g.año_academico = 2026 LIMIT 1),
p1 AS (SELECT id FROM periodos WHERE numero = 1 AND año_academico = 2026 LIMIT 1),
d1 AS (SELECT id FROM profiles WHERE email = 'jgomez@liceo.edu' LIMIT 1),
s1 AS (SELECT id FROM profiles WHERE email = 'est01@liceo.edu' LIMIT 1),
s2 AS (SELECT id FROM profiles WHERE email = 'est02@liceo.edu' LIMIT 1),
s3 AS (SELECT id FROM profiles WHERE email = 'est03@liceo.edu' LIMIT 1)
INSERT INTO boletines (estudiante_id, periodo_id, grupo_id, promedio_general, observaciones_generales, observaciones_director, generado_por)
SELECT s1.id, p1.id, g6a.id, 86.7, 'Buen estudiante, debe mejorar en inglés', 'Felicitaciones, continúe así', d1.id FROM s1 JOIN p1 ON true JOIN g6a ON true JOIN d1 ON true
UNION ALL SELECT s2.id, p1.id, g6a.id, 92.6, 'Estudiante sobresaliente', 'Excelente desempeño', d1.id FROM s2 JOIN p1 ON true JOIN g6a ON true JOIN d1 ON true
UNION ALL SELECT s3.id, p1.id, g6a.id, 75.0, 'Requiere apoyo académico en varias materias', 'Se recomienda refuerzo', d1.id FROM s3 JOIN p1 ON true JOIN g6a ON true JOIN d1 ON true
ON CONFLICT (estudiante_id, periodo_id) DO UPDATE SET
	promedio_general = EXCLUDED.promedio_general,
	observaciones_generales = EXCLUDED.observaciones_generales,
	observaciones_director = EXCLUDED.observaciones_director,
	generado_por = EXCLUDED.generado_por,
	grupo_id = EXCLUDED.grupo_id;

-- =====================================================
-- 6. ASISTENCIAS
-- =====================================================
WITH
g6a AS (SELECT g.id FROM grupos g JOIN grados gr ON gr.id = g.grado_id WHERE gr.nombre = '6°' AND g.nombre = 'A' AND g.año_academico = 2026 LIMIT 1),
d1 AS (SELECT id FROM profiles WHERE email = 'jgomez@liceo.edu' LIMIT 1),
s1 AS (SELECT id FROM profiles WHERE email = 'est01@liceo.edu' LIMIT 1),
s2 AS (SELECT id FROM profiles WHERE email = 'est02@liceo.edu' LIMIT 1),
s3 AS (SELECT id FROM profiles WHERE email = 'est03@liceo.edu' LIMIT 1),
s4 AS (SELECT id FROM profiles WHERE email = 'est04@liceo.edu' LIMIT 1)
INSERT INTO asistencias (estudiante_id, grupo_id, fecha, estado, observaciones, registrado_por)
SELECT s1.id, g6a.id, '2026-02-03'::date, 'presente'::asistencia_estado, NULL, d1.id FROM s1 JOIN g6a ON true JOIN d1 ON true
UNION ALL SELECT s1.id, g6a.id, '2026-01-31'::date, 'presente'::asistencia_estado, NULL, d1.id FROM s1 JOIN g6a ON true JOIN d1 ON true
UNION ALL SELECT s1.id, g6a.id, '2026-01-30'::date, 'presente'::asistencia_estado, NULL, d1.id FROM s1 JOIN g6a ON true JOIN d1 ON true
UNION ALL SELECT s2.id, g6a.id, '2026-01-31'::date, 'tarde'::asistencia_estado, 'Llegó 15 minutos tarde', d1.id FROM s2 JOIN g6a ON true JOIN d1 ON true
UNION ALL SELECT s3.id, g6a.id, '2026-01-30'::date, 'excusa'::asistencia_estado, 'Cita médica', d1.id FROM s3 JOIN g6a ON true JOIN d1 ON true
UNION ALL SELECT s4.id, g6a.id, '2026-01-31'::date, 'ausente'::asistencia_estado, 'Sin justificación', d1.id FROM s4 JOIN g6a ON true JOIN d1 ON true
ON CONFLICT (estudiante_id, fecha, asignatura_id) DO UPDATE SET
	estado = EXCLUDED.estado,
	observaciones = EXCLUDED.observaciones,
	registrado_por = EXCLUDED.registrado_por;

-- =====================================================
-- 7. ANUNCIOS, EVENTOS, MENSAJES
-- =====================================================
WITH
adm AS (SELECT id FROM profiles WHERE email = 'admin@liceo.edu' LIMIT 1),
sec AS (SELECT id FROM profiles WHERE email = 'secretaria@liceo.edu' LIMIT 1),
coord AS (SELECT id FROM profiles WHERE email = 'coordinador@liceo.edu' LIMIT 1),
d1 AS (SELECT id FROM profiles WHERE email = 'jgomez@liceo.edu' LIMIT 1),
d2 AS (SELECT id FROM profiles WHERE email = 'aperez@liceo.edu' LIMIT 1),
p1 AS (SELECT id FROM profiles WHERE email = 'padre01@gmail.com' LIMIT 1),
s2 AS (SELECT id FROM profiles WHERE email = 'est02@liceo.edu' LIMIT 1)
INSERT INTO anuncios (titulo, contenido, autor_id, destinatarios, importante, fecha_publicacion, fecha_expiracion)
SELECT 'Inicio del Año Escolar 2026', 'Les damos la bienvenida al año escolar 2026. Las clases inician el 15 de enero a las 7:00 AM.', sec.id, ARRAY['estudiante','padre','docente'], true, '2026-01-10 08:00:00'::timestamp, '2026-01-20 23:59:59'::timestamp FROM sec
UNION ALL SELECT 'Reunión de Padres de Familia', 'Se convoca a reunión de padres de familia el próximo viernes 7 de febrero a las 6:00 PM en el auditorio.', coord.id, ARRAY['padre'], true, '2026-02-01 09:00:00'::timestamp, '2026-02-07 23:59:59'::timestamp FROM coord
UNION ALL SELECT 'Taller de Matemáticas', 'Se realizará taller de refuerzo en matemáticas los días sábado de 8:00 AM a 10:00 AM.', d1.id, ARRAY['estudiante','padre'], false, '2026-01-28 10:00:00'::timestamp, '2026-03-31 23:59:59'::timestamp FROM d1
UNION ALL SELECT 'Día del Estudiante', 'Celebraremos el día del estudiante el viernes 21 de febrero con actividades recreativas.', sec.id, ARRAY['estudiante','padre','docente'], true, '2026-02-02 11:00:00'::timestamp, '2026-02-21 23:59:59'::timestamp FROM sec;

WITH
adm AS (SELECT id FROM profiles WHERE email = 'admin@liceo.edu' LIMIT 1),
coord AS (SELECT id FROM profiles WHERE email = 'coordinador@liceo.edu' LIMIT 1),
d1 AS (SELECT id FROM profiles WHERE email = 'jgomez@liceo.edu' LIMIT 1),
d4 AS (SELECT id FROM profiles WHERE email = 'csanchez@liceo.edu' LIMIT 1)
INSERT INTO eventos (titulo, descripcion, tipo, fecha_inicio, fecha_fin, todo_el_dia, lugar, destinatarios, creado_por)
SELECT 'Reunión de Padres 6° A', 'Reunión informativa sobre el rendimiento académico del primer periodo', 'Reunión', '2026-02-07 18:00:00'::timestamp, '2026-02-07 20:00:00'::timestamp, false, 'Auditorio Principal', ARRAY['padre'], d1.id FROM d1
UNION ALL SELECT 'Evaluación de Matemáticas', 'Evaluación del segundo corte - Álgebra básica', 'Evaluación', '2026-02-10 07:00:00'::timestamp, '2026-02-10 09:00:00'::timestamp, false, 'Aula 601', ARRAY['estudiante'], d1.id FROM d1
UNION ALL SELECT 'Día del Estudiante', 'Celebración con actividades recreativas y deportivas', 'Festivo', '2026-02-21 00:00:00'::timestamp, '2026-02-21 23:59:59'::timestamp, true, 'Instalaciones del Liceo', ARRAY['estudiante','docente','padre'], coord.id FROM coord
UNION ALL SELECT 'Semana Cultural', 'Actividades culturales, exposiciones y presentaciones artísticas', 'Cultural', '2026-03-10 00:00:00'::timestamp, '2026-03-14 23:59:59'::timestamp, true, 'Todo el colegio', ARRAY['estudiante','docente','padre'], coord.id FROM coord
UNION ALL SELECT 'Consejo Académico', 'Reunión mensual del consejo académico', 'Reunión', '2026-02-15 14:00:00'::timestamp, '2026-02-15 16:00:00'::timestamp, false, 'Sala de Profesores', ARRAY['docente','administrativo'], adm.id FROM adm
UNION ALL SELECT 'Feria de Ciencias', 'Exposición de proyectos científicos de los estudiantes', 'Académico', '2026-04-25 08:00:00'::timestamp, '2026-04-25 17:00:00'::timestamp, false, 'Patio Central', ARRAY['estudiante','padre','docente'], d4.id FROM d4;

WITH
coord AS (SELECT id FROM profiles WHERE email = 'coordinador@liceo.edu' LIMIT 1),
d1 AS (SELECT id FROM profiles WHERE email = 'jgomez@liceo.edu' LIMIT 1),
d2 AS (SELECT id FROM profiles WHERE email = 'aperez@liceo.edu' LIMIT 1),
p1 AS (SELECT id FROM profiles WHERE email = 'padre01@gmail.com' LIMIT 1),
s2 AS (SELECT id FROM profiles WHERE email = 'est02@liceo.edu' LIMIT 1),
s3 AS (SELECT id FROM profiles WHERE email = 'est03@liceo.edu' LIMIT 1),
adm AS (SELECT id FROM profiles WHERE email = 'admin@liceo.edu' LIMIT 1)
INSERT INTO mensajes (remitente_id, destinatario_id, asunto, contenido, estado, leido_en)
SELECT coord.id, d1.id, 'Recordatorio reunión', 'Recuerda la reunión de coordinación el viernes a las 2 PM.', 'leido'::mensaje_estado, '2026-02-02 10:30:00'::timestamp FROM coord JOIN d1 ON true
UNION ALL SELECT p1.id, d1.id, 'Consulta sobre calificaciones', 'Buenos días profesor, quisiera saber cómo va mi hijo Andrés en matemáticas. Gracias.', 'leido'::mensaje_estado, '2026-02-01 15:00:00'::timestamp FROM p1 JOIN d1 ON true
UNION ALL SELECT d1.id, p1.id, 'Re: Consulta sobre calificaciones', 'Buenas tardes, Andrés va muy bien. Tiene 85.5 en el primer periodo. Es aplicado y participativo.', 'leido'::mensaje_estado, '2026-02-01 16:45:00'::timestamp FROM d1 JOIN p1 ON true
UNION ALL SELECT d2.id, s2.id, 'Felicitaciones', 'Beatriz, felicitaciones por tu excelente desempeño en el último examen de español. ¡Sigue así!', 'leido'::mensaje_estado, '2026-02-02 14:20:00'::timestamp FROM d2 JOIN s2 ON true
UNION ALL SELECT adm.id, d1.id, 'Capacitación Docente', 'Se realizará capacitación sobre nuevas metodologías el sábado 8 de febrero. Asistencia obligatoria.', 'enviado'::mensaje_estado, NULL FROM adm JOIN d1 ON true
UNION ALL SELECT s3.id, d1.id, 'Duda sobre tarea', 'Profesor, tengo una duda sobre el ejercicio 5 de la página 42. ¿Podría explicármelo?', 'enviado'::mensaje_estado, NULL FROM s3 JOIN d1 ON true;

-- =====================================================
-- 8. PERMISOS, SEGUIMIENTOS, CITACIONES
-- =====================================================
WITH
s1 AS (SELECT id FROM profiles WHERE email = 'est01@liceo.edu' LIMIT 1),
s3 AS (SELECT id FROM profiles WHERE email = 'est03@liceo.edu' LIMIT 1),
s4 AS (SELECT id FROM profiles WHERE email = 'est04@liceo.edu' LIMIT 1),
s6 AS (SELECT id FROM profiles WHERE email = 'est06@liceo.edu' LIMIT 1),
s8 AS (SELECT id FROM profiles WHERE email = 'est08@liceo.edu' LIMIT 1),
p1 AS (SELECT id FROM profiles WHERE email = 'padre01@gmail.com' LIMIT 1),
p4 AS (SELECT id FROM profiles WHERE email = 'padre03@gmail.com' LIMIT 1),
p6 AS (SELECT id FROM profiles WHERE email = 'padre04@gmail.com' LIMIT 1),
p7 AS (SELECT id FROM profiles WHERE email = 'padre06@gmail.com' LIMIT 1),
p8 AS (SELECT id FROM profiles WHERE email = 'madre08@gmail.com' LIMIT 1),
coord AS (SELECT id FROM profiles WHERE email = 'coordinador@liceo.edu' LIMIT 1),
adm AS (SELECT id FROM profiles WHERE email = 'admin@liceo.edu' LIMIT 1)
INSERT INTO permisos (estudiante_id, tipo, fecha_inicio, fecha_fin, motivo, descripcion, estado, solicitado_por, revisado_por, fecha_revision, observaciones_revision)
SELECT s3.id, 'Cita Médica', '2026-01-30'::date, '2026-01-30'::date, 'Cita odontológica', 'El estudiante tiene cita con el odontólogo a las 9:00 AM', 'aprobado'::permiso_estado, p4.id, coord.id, '2026-01-29 14:00:00'::timestamp, 'Aprobado. Debe presentar certificado médico.' FROM s3 JOIN p4 ON true JOIN coord ON true
UNION ALL SELECT s1.id, 'Viaje Familiar', '2026-02-10'::date, '2026-02-12'::date, 'Viaje familiar', 'Viaje familiar fuera de la ciudad', 'pendiente'::permiso_estado, p1.id, NULL, NULL, NULL FROM s1 JOIN p1 ON true
UNION ALL SELECT s4.id, 'Personal', '2026-02-05'::date, '2026-02-05'::date, 'Asunto personal', 'Necesita el día por asunto personal', 'rechazado'::permiso_estado, p6.id, coord.id, '2026-02-03 10:00:00'::timestamp, 'No se justifica la ausencia. Hay evaluación importante ese día.' FROM s4 JOIN p6 ON true JOIN coord ON true
UNION ALL SELECT s6.id, 'Enfermedad', '2026-01-28'::date, '2026-01-29'::date, 'Gripe', 'El estudiante presenta síntomas de gripe', 'aprobado'::permiso_estado, p7.id, coord.id, '2026-01-28 08:30:00'::timestamp, 'Aprobado. Debe presentar incapacidad médica.' FROM s6 JOIN p7 ON true JOIN coord ON true
UNION ALL SELECT s8.id, 'Calamidad Familiar', '2026-02-01'::date, '2026-02-01'::date, 'Fallecimiento familiar', 'Fallecimiento de familiar cercano', 'aprobado'::permiso_estado, p8.id, adm.id, '2026-02-01 07:00:00'::timestamp, 'Aprobado. Nuestras condolencias a la familia.' FROM s8 JOIN p8 ON true JOIN adm ON true;

WITH
s2 AS (SELECT id FROM profiles WHERE email = 'est02@liceo.edu' LIMIT 1),
s3 AS (SELECT id FROM profiles WHERE email = 'est03@liceo.edu' LIMIT 1),
s4 AS (SELECT id FROM profiles WHERE email = 'est04@liceo.edu' LIMIT 1),
s7 AS (SELECT id FROM profiles WHERE email = 'est07@liceo.edu' LIMIT 1),
s11 AS (SELECT id FROM profiles WHERE email = 'est11@liceo.edu' LIMIT 1),
d1 AS (SELECT id FROM profiles WHERE email = 'jgomez@liceo.edu' LIMIT 1),
d5 AS (SELECT id FROM profiles WHERE email = 'rlopez@liceo.edu' LIMIT 1),
coord AS (SELECT id FROM profiles WHERE email = 'coordinador@liceo.edu' LIMIT 1)
INSERT INTO seguimientos (estudiante_id, tipo, titulo, descripcion, fecha_registro, registrado_por, acciones_tomadas, requiere_seguimiento, fecha_seguimiento)
SELECT s3.id, 'Académico', 'Bajo rendimiento en matemáticas', 'El estudiante Carlos Méndez presenta dificultades en matemáticas. Nota de 72 en el primer periodo.', '2026-01-25'::date, d1.id, 'Se recomendó inscripción en taller de refuerzo. Se citaron los padres.', true, '2026-02-15'::date FROM s3 JOIN d1 ON true
UNION ALL SELECT s7.id, 'Disciplinario', 'Comportamiento inadecuado en clase', 'Interrupciones constantes durante la clase de ciencias sociales.', '2026-01-29'::date, d5.id, 'Charla con el estudiante. Compromiso de mejora firmado.', true, '2026-02-10'::date FROM s7 JOIN d5 ON true
UNION ALL SELECT s2.id, 'Académico', 'Desempeño sobresaliente', 'Beatriz Díaz ha demostrado excelencia académica en todas las materias.', '2026-02-01'::date, d1.id, 'Reconocimiento en acto cívico. Se motivará para participar en olimpiadas académicas.', false, NULL FROM s2 JOIN d1 ON true
UNION ALL SELECT s11.id, 'Psicosocial', 'Dificultades de adaptación', 'El estudiante muestra timidez excesiva y dificultad para integrarse con compañeros.', '2026-01-20'::date, coord.id, 'Remitido a orientación escolar. Se programaron sesiones de apoyo.', true, '2026-03-01'::date FROM s11 JOIN coord ON true
UNION ALL SELECT s4.id, 'Asistencia', 'Ausencias frecuentes', 'La estudiante Diana Ruiz ha faltado 3 días en el último mes.', '2026-02-02'::date, d1.id, 'Se contactaron los padres. Informaron situación familiar temporal.', true, '2026-02-20'::date FROM s4 JOIN d1 ON true;

WITH
s1 AS (SELECT id FROM profiles WHERE email = 'est01@liceo.edu' LIMIT 1),
s2 AS (SELECT id FROM profiles WHERE email = 'est02@liceo.edu' LIMIT 1),
s3 AS (SELECT id FROM profiles WHERE email = 'est03@liceo.edu' LIMIT 1),
s7 AS (SELECT id FROM profiles WHERE email = 'est07@liceo.edu' LIMIT 1),
s11 AS (SELECT id FROM profiles WHERE email = 'est11@liceo.edu' LIMIT 1),
d1 AS (SELECT id FROM profiles WHERE email = 'jgomez@liceo.edu' LIMIT 1),
d2 AS (SELECT id FROM profiles WHERE email = 'aperez@liceo.edu' LIMIT 1),
coord AS (SELECT id FROM profiles WHERE email = 'coordinador@liceo.edu' LIMIT 1)
INSERT INTO citaciones (estudiante_id, citado, motivo, descripcion, fecha_citacion, lugar, creado_por, asistio, observaciones)
SELECT s3.id, 'Padre/Madre', 'Rendimiento académico', 'Hablar sobre el bajo rendimiento en matemáticas y estrategias de apoyo', '2026-01-26 15:00:00'::timestamp, 'Coordinación Académica', d1.id, true, 'Asistió el padre. Se comprometió a apoyar en casa con tareas. Se acordó seguimiento quincenal.' FROM s3 JOIN d1 ON true
UNION ALL SELECT s7.id, 'Acudiente', 'Comportamiento', 'Tratar situación disciplinaria del estudiante', '2026-01-30 16:00:00'::timestamp, 'Rectoría', coord.id, false, 'No asistió. Se enviará nueva citación por escrito.' FROM s7 JOIN coord ON true
UNION ALL SELECT s1.id, 'Padre/Madre', 'Solicitud de permiso', 'Revisar solicitud de permiso por viaje familiar', '2026-02-05 14:00:00'::timestamp, 'Coordinación', coord.id, NULL, NULL FROM s1 JOIN coord ON true
UNION ALL SELECT s2.id, 'Padre/Madre', 'Reconocimiento', 'Felicitar por el excelente desempeño académico de la estudiante', '2026-02-01 17:00:00'::timestamp, 'Dirección de Grupo', d2.id, true, 'Asistió la madre. Se entregó mención de honor.' FROM s2 JOIN d2 ON true
UNION ALL SELECT s11.id, 'Estudiante', 'Orientación', 'Sesión de orientación psicosocial', '2026-02-08 10:00:00'::timestamp, 'Orientación Escolar', coord.id, NULL, NULL FROM s11 JOIN coord ON true;

COMMIT;
