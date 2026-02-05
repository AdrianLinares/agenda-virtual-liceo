-- =====================================================
-- AGENDA VIRTUAL LICEO - DATABASE SCHEMA COMPLETO
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('administrador', 'administrativo', 'docente', 'estudiante', 'padre');
CREATE TYPE asistencia_estado AS ENUM ('presente', 'ausente', 'tarde', 'excusa');
CREATE TYPE permiso_estado AS ENUM ('pendiente', 'aprobado', 'rechazado');
CREATE TYPE mensaje_estado AS ENUM ('enviado', 'leido', 'archivado');

-- =====================================================
-- TABLA DE PERFILES (Extiende auth.users)
-- =====================================================

CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol user_role NOT NULL,
    telefono TEXT,
    direccion TEXT,
    foto_url TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLAS DE ESTRUCTURA ACADÉMICA
-- =====================================================

-- Grados académicos (0°, 1°, 2°, 3°, etc.)
CREATE TABLE grados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    nivel TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grupos por grado (A, B, C)
CREATE TABLE grupos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grado_id UUID REFERENCES grados(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    año_academico INTEGER NOT NULL,
    director_grupo_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(grado_id, nombre, año_academico)
);

-- Asignaturas
CREATE TABLE asignaturas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    codigo TEXT UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relación estudiante-grupo
CREATE TABLE estudiantes_grupos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    estudiante_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
    año_academico INTEGER NOT NULL,
    estado TEXT DEFAULT 'activo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(estudiante_id, año_academico)
);

-- Relación padre-estudiante
CREATE TABLE padres_estudiantes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    padre_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    estudiante_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    parentesco TEXT NOT NULL,
    principal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(padre_id, estudiante_id)
);

-- Asignación docente-asignatura-grupo
CREATE TABLE asignaciones_docentes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    docente_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
    asignatura_id UUID REFERENCES asignaturas(id) ON DELETE CASCADE,
    año_academico INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(docente_id, grupo_id, asignatura_id, año_academico)
);

-- =====================================================
-- PERIODOS ACADÉMICOS
-- =====================================================

CREATE TABLE periodos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    numero INTEGER NOT NULL,
    año_academico INTEGER NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(numero, año_academico)
);

-- =====================================================
-- NOTAS Y EVALUACIONES
-- =====================================================

-- Notas parciales
CREATE TABLE notas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    estudiante_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    asignatura_id UUID REFERENCES asignaturas(id) ON DELETE CASCADE,
    periodo_id UUID REFERENCES periodos(id) ON DELETE CASCADE,
    grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
    docente_id UUID REFERENCES profiles(id),
    nota DECIMAL(5,2) NOT NULL CHECK (nota >= 10 AND nota <= 100),
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(estudiante_id, asignatura_id, periodo_id)
);

-- Boletines (consolidado por periodo)
CREATE TABLE boletines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    estudiante_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    periodo_id UUID REFERENCES periodos(id) ON DELETE CASCADE,
    grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
    promedio_general DECIMAL(5,2) CHECK (promedio_general IS NULL OR (promedio_general >= 10 AND promedio_general <= 100)),
    observaciones_generales TEXT,
    observaciones_director TEXT,
    fecha_generacion TIMESTAMPTZ DEFAULT NOW(),
    generado_por UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(estudiante_id, periodo_id)
);

-- =====================================================
-- ASISTENCIA
-- =====================================================

CREATE TABLE asistencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    estudiante_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    estado asistencia_estado NOT NULL,
    asignatura_id UUID REFERENCES asignaturas(id),
    observaciones TEXT,
    registrado_por UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(estudiante_id, fecha, asignatura_id)
);

-- =====================================================
-- HORARIOS
-- =====================================================

CREATE TABLE horarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
    asignatura_id UUID REFERENCES asignaturas(id) ON DELETE CASCADE,
    docente_id UUID REFERENCES profiles(id),
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 5),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    aula TEXT,
    año_academico INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(grupo_id, dia_semana, hora_inicio, año_academico)
);

-- =====================================================
-- COMUNICACIONES
-- =====================================================

-- Anuncios
CREATE TABLE anuncios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    autor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    destinatarios TEXT[],
    importante BOOLEAN DEFAULT false,
    fecha_publicacion TIMESTAMPTZ DEFAULT NOW(),
    fecha_expiracion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mensajes internos
CREATE TABLE mensajes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    remitente_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    destinatario_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    asunto TEXT NOT NULL,
    contenido TEXT NOT NULL,
    estado mensaje_estado DEFAULT 'enviado',
    leido_en TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PERMISOS Y EXCUSAS
-- =====================================================

CREATE TABLE permisos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    estudiante_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    motivo TEXT NOT NULL,
    descripcion TEXT,
    soporte_url TEXT,
    estado permiso_estado DEFAULT 'pendiente',
    solicitado_por UUID REFERENCES profiles(id),
    revisado_por UUID REFERENCES profiles(id),
    fecha_revision TIMESTAMPTZ,
    observaciones_revision TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SEGUIMIENTO
-- =====================================================

CREATE TABLE seguimientos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    estudiante_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    registrado_por UUID REFERENCES profiles(id),
    acciones_tomadas TEXT,
    requiere_seguimiento BOOLEAN DEFAULT false,
    fecha_seguimiento DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CITACIONES
-- =====================================================

CREATE TABLE citaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    estudiante_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    citado TEXT NOT NULL,
    motivo TEXT NOT NULL,
    descripcion TEXT,
    fecha_citacion TIMESTAMPTZ NOT NULL,
    lugar TEXT,
    creado_por UUID REFERENCES profiles(id),
    asistio BOOLEAN,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- EVENTOS Y CALENDARIO
-- =====================================================

CREATE TABLE eventos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ,
    todo_el_dia BOOLEAN DEFAULT false,
    lugar TEXT,
    destinatarios TEXT[],
    creado_por UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA RENDIMIENTO
-- =====================================================

CREATE INDEX idx_profiles_rol ON profiles(rol);
CREATE INDEX idx_profiles_activo ON profiles(activo);
CREATE INDEX idx_estudiantes_grupos_estudiante ON estudiantes_grupos(estudiante_id);
CREATE INDEX idx_estudiantes_grupos_grupo ON estudiantes_grupos(grupo_id);
CREATE INDEX idx_padres_estudiantes_padre ON padres_estudiantes(padre_id);
CREATE INDEX idx_padres_estudiantes_estudiante ON padres_estudiantes(estudiante_id);
CREATE INDEX idx_notas_estudiante ON notas(estudiante_id);
CREATE INDEX idx_notas_periodo ON notas(periodo_id);
CREATE INDEX idx_asistencias_estudiante ON asistencias(estudiante_id);
CREATE INDEX idx_asistencias_fecha ON asistencias(fecha);
CREATE INDEX idx_mensajes_destinatario ON mensajes(destinatario_id);
CREATE INDEX idx_mensajes_remitente ON mensajes(remitente_id);
CREATE INDEX idx_anuncios_fecha ON anuncios(fecha_publicacion);
CREATE INDEX idx_eventos_fecha ON eventos(fecha_inicio);

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notas_updated_at BEFORE UPDATE ON notas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para auto-crear perfil al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nombre_completo, rol)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
        COALESCE((NEW.raw_user_meta_data->>'rol')::user_role, 'estudiante')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auto-crear perfil
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FUNCIONES DE ROL (EVITAR RECURSIÓN EN RLS)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT rol FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT COALESCE(public.get_user_role() = 'administrador', false);
$$;

CREATE OR REPLACE FUNCTION public.is_docente()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT COALESCE(public.get_user_role() = 'docente', false);
$$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE grados ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudiantes_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE padres_estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones_docentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE boletines ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE anuncios ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE citaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA PROFILES
-- =====================================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Los administradores pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (public.is_admin());

-- Docentes pueden ver estudiantes de sus grupos
CREATE POLICY "Teachers view their students"
    ON profiles FOR SELECT
    USING (
        public.is_docente() AND (
            rol = 'estudiante' AND EXISTS (
                SELECT 1 FROM estudiantes_grupos eg
                JOIN asignaciones_docentes ad ON ad.grupo_id = eg.grupo_id
                WHERE eg.estudiante_id = profiles.id
                AND ad.docente_id = auth.uid()
            )
        )
    );

-- Padres pueden ver el perfil de sus hijos
CREATE POLICY "Parents view their children"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM padres_estudiantes
            WHERE padre_id = auth.uid() AND estudiante_id = profiles.id
        )
    );

-- Solo administradores pueden modificar perfiles
CREATE POLICY "Only admins modify profiles"
    ON profiles FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- =====================================================
-- POLÍTICAS PARA NOTAS
-- =====================================================

-- Estudiantes ven sus propias notas
CREATE POLICY "Students view own grades"
    ON notas FOR SELECT
    USING (estudiante_id = auth.uid());

-- Padres ven notas de sus hijos
CREATE POLICY "Parents view children grades"
    ON notas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM padres_estudiantes
            WHERE padre_id = auth.uid() AND estudiante_id = notas.estudiante_id
        )
    );

-- Docentes gestionan notas de sus asignaturas
CREATE POLICY "Teachers manage their subject grades"
    ON notas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM asignaciones_docentes
            WHERE docente_id = auth.uid()
            AND grupo_id = notas.grupo_id
            AND asignatura_id = notas.asignatura_id
        )
    );

-- Administrativos ven todas las notas
CREATE POLICY "Staff view all grades"
    ON notas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND rol IN ('administrador', 'administrativo')
        )
    );

-- =====================================================
-- POLÍTICAS PARA ASISTENCIAS
-- =====================================================

-- Estudiantes ven su propia asistencia
CREATE POLICY "Students view own attendance"
    ON asistencias FOR SELECT
    USING (estudiante_id = auth.uid());

-- Padres ven asistencia de sus hijos
CREATE POLICY "Parents view children attendance"
    ON asistencias FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM padres_estudiantes
            WHERE padre_id = auth.uid() AND estudiante_id = asistencias.estudiante_id
        )
    );

-- Docentes gestionan asistencia de sus grupos
CREATE POLICY "Teachers manage attendance"
    ON asistencias FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM asignaciones_docentes
            WHERE docente_id = auth.uid() AND grupo_id = asistencias.grupo_id
        )
    );

-- =====================================================
-- POLÍTICAS PARA MENSAJES
-- =====================================================

-- Ver mensajes propios (enviados o recibidos)
CREATE POLICY "View own messages"
    ON mensajes FOR SELECT
    USING (remitente_id = auth.uid() OR destinatario_id = auth.uid());

-- Enviar mensajes
CREATE POLICY "Send messages"
    ON mensajes FOR INSERT
    WITH CHECK (remitente_id = auth.uid());

-- Actualizar estado de mensajes recibidos
CREATE POLICY "Update received messages"
    ON mensajes FOR UPDATE
    USING (destinatario_id = auth.uid());

-- =====================================================
-- POLÍTICAS PARA ANUNCIOS
-- =====================================================

-- Todos ven anuncios activos
CREATE POLICY "View active announcements"
    ON anuncios FOR SELECT
    USING (fecha_expiracion IS NULL OR fecha_expiracion > NOW());

-- Docentes y administrativos crean anuncios
CREATE POLICY "Staff create announcements"
    ON anuncios FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND rol IN ('docente', 'administrativo', 'administrador')
        )
    );

-- Solo el autor modifica sus anuncios
CREATE POLICY "Author modifies own announcements"
    ON anuncios FOR UPDATE
    USING (autor_id = auth.uid());

CREATE POLICY "Author deletes own announcements"
    ON anuncios FOR DELETE
    USING (autor_id = auth.uid());

-- =====================================================
-- POLÍTICAS PARA PERMISOS
-- =====================================================

-- Ver permisos propios
CREATE POLICY "View own permissions"
    ON permisos FOR SELECT
    USING (
        estudiante_id = auth.uid() OR
        solicitado_por = auth.uid() OR
        EXISTS (
            SELECT 1 FROM padres_estudiantes
            WHERE padre_id = auth.uid() AND estudiante_id = permisos.estudiante_id
        )
    );

-- Crear permisos
CREATE POLICY "Create permissions"
    ON permisos FOR INSERT
    WITH CHECK (
        solicitado_por = auth.uid() AND (
            estudiante_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM padres_estudiantes
                WHERE padre_id = auth.uid() AND estudiante_id = permisos.estudiante_id
            )
        )
    );

-- Staff revisa permisos
CREATE POLICY "Staff review permissions"
    ON permisos FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND rol IN ('docente', 'administrativo', 'administrador')
        )
    );

-- =====================================================
-- POLÍTICAS PARA TABLAS DE ESTRUCTURA
-- =====================================================

-- Lectura pública de estructura académica
CREATE POLICY "Public read grados" ON grados FOR SELECT USING (true);
CREATE POLICY "Public read grupos" ON grupos FOR SELECT USING (true);
CREATE POLICY "Public read asignaturas" ON asignaturas FOR SELECT USING (true);
CREATE POLICY "Public read periodos" ON periodos FOR SELECT USING (true);
CREATE POLICY "Public read horarios" ON horarios FOR SELECT USING (true);
CREATE POLICY "Public read eventos" ON eventos FOR SELECT USING (true);

-- Solo admin modifica estructura
CREATE POLICY "Admin modify grados" ON grados FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('administrador', 'administrativo'))
);

CREATE POLICY "Admin modify grupos" ON grupos FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('administrador', 'administrativo'))
);

CREATE POLICY "Admin modify asignaturas" ON asignaturas FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('administrador', 'administrativo'))
);

CREATE POLICY "Admin modify periodos" ON periodos FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('administrador', 'administrativo'))
);

-- Lectura pública de relaciones
CREATE POLICY "Public read estudiantes_grupos" ON estudiantes_grupos FOR SELECT USING (true);
CREATE POLICY "Public read padres_estudiantes" ON padres_estudiantes FOR SELECT USING (true);
CREATE POLICY "Public read asignaciones_docentes" ON asignaciones_docentes FOR SELECT USING (true);

-- Admin modifica relaciones
CREATE POLICY "Admin modify estudiantes_grupos" ON estudiantes_grupos FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('administrador', 'administrativo'))
);

CREATE POLICY "Admin modify padres_estudiantes" ON padres_estudiantes FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('administrador', 'administrativo'))
);

CREATE POLICY "Admin modify asignaciones" ON asignaciones_docentes FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('administrador', 'administrativo'))
);

-- =====================================================
-- POLÍTICAS PARA BOLETINES
-- =====================================================

CREATE POLICY "Students view own boletines" ON boletines FOR SELECT
    USING (estudiante_id = auth.uid());

CREATE POLICY "Parents view children boletines" ON boletines FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM padres_estudiantes
            WHERE padre_id = auth.uid() AND estudiante_id = boletines.estudiante_id
        )
    );

CREATE POLICY "Staff manage boletines" ON boletines FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND rol IN ('administrador', 'administrativo')
        )
    );

-- =====================================================
-- POLÍTICAS PARA SEGUIMIENTOS
-- =====================================================

CREATE POLICY "Students view own seguimientos" ON seguimientos FOR SELECT
    USING (estudiante_id = auth.uid());

CREATE POLICY "Parents view children seguimientos" ON seguimientos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM padres_estudiantes
            WHERE padre_id = auth.uid() AND estudiante_id = seguimientos.estudiante_id
        )
    );

CREATE POLICY "Staff manage seguimientos" ON seguimientos FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND rol IN ('docente', 'administrativo', 'administrador')
        )
    );

-- =====================================================
-- POLÍTICAS PARA CITACIONES
-- =====================================================

CREATE POLICY "Students view own citaciones" ON citaciones FOR SELECT
    USING (estudiante_id = auth.uid());

CREATE POLICY "Parents view children citaciones" ON citaciones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM padres_estudiantes
            WHERE padre_id = auth.uid() AND estudiante_id = citaciones.estudiante_id
        )
    );

CREATE POLICY "Staff manage citaciones" ON citaciones FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND rol IN ('docente', 'administrativo', 'administrador')
        )
    );

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar grados
INSERT INTO grados (nombre, nivel) VALUES
    ('0°', 'Preescolar'),
    ('1°', 'Primaria'),
    ('2°', 'Primaria'),
    ('3°', 'Primaria'),
    ('4°', 'Primaria'),
    ('5°', 'Primaria'),
    ('6°', 'Secundaria'),
    ('7°', 'Secundaria'),
    ('8°', 'Secundaria'),
    ('9°', 'Secundaria'),
    ('10°', 'Secundaria'),
    ('11°', 'Secundaria');

-- Insertar asignaturas
INSERT INTO asignaturas (nombre, codigo) VALUES
    ('Matemáticas', 'MAT'),
    ('Contabilidad', 'CON'),
    ('Español', 'ESP'),
    ('Plan Lector', 'PLE'),
    ('Ciencias Naturales', 'CNA'),
    ('Biología', 'BIO'),
    ('Química', 'QUI'),
    ('Ciencias Sociales', 'CSO'),
    ('Democracia', 'DEM'),
    ('Geografía', 'GEO'),
    ('Historia', 'HIS'),
    ('Ciencias Políticas', 'CPO'),
    ('Filosofía', 'FIL'),
    ('Inglés', 'ING'),
    ('Educación Física', 'EFI'),
    ('Artes', 'ART'),
    ('Ética y Valores', 'ETI'),
    ('Religión', 'REL'),
    ('Tics', 'TIC');

-- Insertar periodos académicos 2026
INSERT INTO periodos (nombre, numero, año_academico, fecha_inicio, fecha_fin) VALUES
    ('Primer Periodo', 1, 2026, '2026-02-01', '2026-04-30'),
    ('Segundo Periodo', 2, 2026, '2026-05-01', '2026-08-30'),
    ('Tercer Periodo', 3, 2026, '2026-09-01', '2026-11-30');

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================