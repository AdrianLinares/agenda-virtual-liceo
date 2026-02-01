# 🔧 Guía de Configuración de Supabase

## Paso 1: Crear las Enumeraciones (Enums)

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
CREATE TYPE user_role AS ENUM ('administrador', 'administrativo', 'docente', 'estudiante', 'padre');
CREATE TYPE asistencia_estado AS ENUM ('presente', 'ausente', 'tarde', 'excusa');
CREATE TYPE permiso_estado AS ENUM ('pendiente', 'aprobado', 'rechazado');
CREATE TYPE mensaje_estado AS ENUM ('enviado', 'leido', 'archivado');
```

## Paso 2: Crear Tabla de Perfiles

```sql
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

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Política: Los administradores pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND rol = 'administrador'
        )
    );
```

## Paso 3: Crear Trigger para auto-crear perfil

```sql
-- Función para crear perfil automáticamente al registrarse
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

-- Trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

## Paso 4: Crear Datos Básicos

```sql
-- Grados
CREATE TABLE grados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    nivel TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Asignaturas
CREATE TABLE asignaturas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    codigo TEXT UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Periodos académicos 2026
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

INSERT INTO periodos (nombre, numero, año_academico, fecha_inicio, fecha_fin) VALUES
    ('Primer Periodo', 1, 2026, '2026-02-01', '2026-04-30'),
    ('Segundo Periodo', 2, 2026, '2026-05-01', '2026-08-30'),
    ('Tercer Periodo', 3, 2026, '2026-09-01', '2026-11-30');

-- Habilitar RLS en tablas básicas
ALTER TABLE grados ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública
CREATE POLICY "Public read grados" ON grados FOR SELECT USING (true);
CREATE POLICY "Public read asignaturas" ON asignaturas FOR SELECT USING (true);
CREATE POLICY "Public read periodos" ON periodos FOR SELECT USING (true);
```

## Paso 5: Crear Usuario Administrador

1. En Supabase, ve a **Authentication** > **Users**
2. Clic en **Add user** > **Create new user**
3. Ingresa:
   - Email: `admin@liceo.com`
   - Password: `Admin123!` (o la que prefieras)
4. Haz clic en **Create user**

5. Luego ejecuta este SQL para asignar el rol:

```sql
UPDATE profiles 
SET 
  rol = 'administrador',
  nombre_completo = 'Administrador Sistema',
  activo = true
WHERE email = 'admin@liceo.com';
```

## ✅ Verificación

Para verificar que todo está configurado correctamente:

```sql
-- Ver todos los usuarios
SELECT * FROM profiles;

-- Ver grados
SELECT * FROM grados;

-- Ver asignaturas  
SELECT * FROM asignaturas;

-- Ver periodos
SELECT * FROM periodos;
```

## 🔐 Configuración del Archivo .env

Después de completar la configuración de Supabase:

1. Ve a **Settings** > **API** en tu proyecto de Supabase
2. Copia el **Project URL** y el **anon public key**
3. Créa un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-aqui
```

## 📝 Próximos Pasos

Una vez configurado lo básico, puedes:

1. Crear más usuarios de prueba (docentes, estudiantes, padres)
2. Crear las tablas adicionales según las necesites (grupos, notas, asistencias, etc.)
3. Implementar las políticas RLS para cada tabla

## 💡 Nota Importante

Este es un setup mínimo para que puedas comenzar a usar la aplicación. Las tablas completas del schema están en el archivo `supabase-schema.sql`, pero pueden ser agregadas progresivamente según las necesites para cada módulo.
