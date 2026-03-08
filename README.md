# 📚 Agenda Virtual - Liceo Ángel de la Guarda

Plataforma completa de gestión académica desarrollada con React, TypeScript, Vite, Tailwind CSS, Shadcn-ui y Supabase PostgreSQL.

## 🎯 Características Principales

- ✅ **Sistema de autenticación basado en roles** (Administrador, Administrativo, Docente, Estudiante, Padre/Acudiente)
- ✅ **Dashboard personalizado** según el rol del usuario
- ✅ **Gestión académica completa**: boletines, notas, asistencias
- ✅ **Sistema de comunicación**: mensajes internos y anuncios
- ✅ **Calendario de eventos** y recordatorios
- ✅ **Seguimiento estudiantil** académico y disciplinario
- ✅ **Gestión de permisos y excusas**
- ✅ **Horarios de clase** y citaciones
- ✅ **Políticas de seguridad RLS** (Row Level Security) en Supabase

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** con TypeScript
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework de utilidades CSS
- **Shadcn-ui** - Componentes UI de alta calidad
- **React Router DOM** - Navegación
- **Zustand** - Estado global
- **Lucide React** - Iconos

### Backend
- **Supabase** - Backend as a Service
- **PostgreSQL** - Base de datos
- **Row Level Security (RLS)** - Seguridad a nivel de fila

## 📋 Prerequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (v18 o superior)
- **pnpm** (recomendado) o npm
- Una cuenta en **Supabase** (gratis en https://supabase.com)

## 🚀 Instalación y Configuración

### 1. Clonar o descargar el proyecto

```bash
cd agenda-virtual-liceo
```

### 2. Instalar dependencias

```bash
pnpm install
# o
npm install
```

### 3. Configurar Supabase

#### 3.1. Crear un proyecto en Supabase

1. Ve a https://supabase.com
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Espera a que el proyecto se inicialice (toma unos 2 minutos)

#### 3.2. Ejecutar el schema de la base de datos

1. En tu proyecto de Supabase, ve a **SQL Editor**
2. Crea una nueva query
3. Copia y pega todo el contenido del archivo `supabase-schema.sql` (ubicado en la raíz del proyecto)
4. Ejecuta la query (botón "Run" o Ctrl+Enter)

Este script creará:
- Todas las tablas necesarias
- Enums para tipos de datos
- Índices para optimización
- Políticas RLS (Row Level Security)
- Datos de ejemplo (grados, asignaturas, periodos)

#### 3.3. Obtener las credenciales de Supabase

1. Ve a **Settings** > **API** en tu proyecto de Supabase
2. Copia:
   - **Project URL**
   - **anon/public key**

### 4. Configurar variables de entorno

1. Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

2. Edita el archivo `.env` y agrega tus credenciales:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
```

### 5. Crear usuarios de prueba

Para poder iniciar sesión, necesitas crear usuarios en Supabase:

#### Opción A: Usando el SQL Editor de Supabase

Ejecuta este SQL para crear un usuario administrador de prueba:

```sql
-- Primero, crea el usuario en auth.users (esto lo hace Supabase automáticamente al registrarse)
-- Para testing, puedes crear usuarios manualmente:

-- Insertar en la tabla profiles (el trigger de Supabase creará el usuario auth)
-- Nota: Primero debes crear el usuario desde la UI de Supabase Authentication

-- 1. Ve a Authentication > Users en Supabase
-- 2. Haz clic en "Add user" > "Create new user"
-- 3. Agrega email y contraseña (ej: admin@liceo.com / Admin123!)
-- 4. Luego ejecuta esto para actualizar el perfil:

UPDATE profiles 
SET 
  rol = 'administrador',
  nombre_completo = 'Administrador Sistema',
  activo = true
WHERE email = 'admin@liceo.com';
```

#### Opción B: Crear usuarios desde la UI de Supabase

1. Ve a **Authentication** > **Users**
2. Clic en **Add user** > **Create new user**
3. Ingresa:
   - Email: `admin@liceoag.com`
   - Password: `Admin123!`
   - Confirmar password
4. Guarda el usuario
5. Ejecuta el UPDATE de arriba para asignar el rol

### 6. Ejecutar el proyecto

```bash
pnpm dev
# o
npm run dev
```

El proyecto estará disponible en `http://localhost:5173`

### Comportamiento de sesión

- La autenticación usa `sessionStorage`.
- La sesión permanece activa mientras el navegador/pestaña siga abierto.
- Al cerrar el navegador (o la pestaña), la sesión se elimina y se debe iniciar sesión nuevamente.

## 👤 Usuarios de Prueba Sugeridos

Te recomendamos crear estos usuarios de prueba:

```
Administrador:
- Email: administrativo@liceoag.com
- Password: Adminintrativo123!
- Rol: administrativo

Docente:
- Email: docente@liceoag.com
- Password: Docente123!
- Rol: docente

Estudiante:
- Email: estudiante@liceoag.com
- Password: Estudiante123!
- Rol: estudiante

Padre:
- Email: padre@liceoag.com
- Password: Padre123!
- Rol: padre
```

Recuerda ejecutar el UPDATE para asignar los roles después de crear cada usuario.

## 📥 Carga Masiva De Usuarios (Excel/CSV)

El panel de administración incluye una opción para crear usuarios en lote desde la pestaña **Usuarios**.

Formato recomendado de columnas (encabezados en la primera fila):

```text
email,nombre_completo,rol,password,telefono,direccion
```

Reglas:

- Obligatorios por fila: `email`, `nombre_completo`, `rol`
- `rol` debe ser uno de: `administrador`, `administrativo`, `docente`, `estudiante`, `padre`
- `password` puede venir por fila o definirse una contraseña por defecto en la UI
- Contraseña mínima: 6 caracteres
- Máximo por lote: 500 usuarios
- Soporta archivos `.xlsx`, `.xls` y `.csv`

Ejemplo:

```csv
email,nombre_completo,rol,password,telefono,direccion
estudiante1@liceoag.com,Mariana Perez,estudiante,Estud123!,3001112233,Cra 10 # 12-30
padre1@liceoag.com,Carlos Perez,padre,,3005557788,Cra 10 # 12-30
```

En el ejemplo anterior, el segundo usuario usará la contraseña por defecto configurada en la carga masiva.

Tambien puedes usar la plantilla incluida en el repositorio: `usuarios_batch_template.csv`.
Si solo vas a registrar estudiantes y padres, usa: `usuarios_batch_estudiantes_padres_template.csv`.
Versiones vacias (solo encabezados) para produccion: `usuarios_batch_template_empty.csv` y `usuarios_batch_estudiantes_padres_template_empty.csv`.

## 📱 Roles y Permisos

### Administrador
- Acceso completo a todos los módulos
- Gestión de usuarios y roles
- Configuración del sistema

### Administrativo
- Creación de boletines
- Gestión académica
- Aprobación de permisos

### Docente
- Registro de asistencia
- Ingreso de notas
- Creación de anuncios
- Comunicación con estudiantes y padres

### Estudiante
- Consulta de notas y boletines
- Visualización de asistencia
- Solicitud de permisos
- Mensajería con docentes

### Padre/Acudiente
- Acceso completo a la información del estudiante asociado
- Solicitud de permisos en nombre del estudiante
- Comunicación con docentes y administrativos

## 🗂️ Estructura del Proyecto

```
agenda-virtual-liceo/
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes Shadcn-ui
│   │   ├── layout/          # Layouts (Dashboard, etc.)
│   │   ├── auth/            # Componentes de autenticación
│   │   └── dashboard/       # Componentes específicos del dashboard
│   ├── lib/
│   │   ├── supabase.ts      # Cliente de Supabase
│   │   ├── auth-store.ts    # Estado global de autenticación
│   │   └── utils.ts         # Utilidades
│   ├── pages/               # Páginas/Vistas
│   │   ├── LoginPage.tsx
│   │   └── DashboardPage.tsx
│   ├── types/
│   │   └── database.types.ts # Tipos de TypeScript para la BD
│   ├── styles/
│   │   └── globals.css      # Estilos globales
│   ├── App.tsx              # Componente principal con rutas
│   └── main.tsx             # Punto de entrada
├── public/                  # Archivos estáticos
├── supabase-schema.sql      # Schema completo de la base de datos
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 🔒 Seguridad

El proyecto implementa Row Level Security (RLS) en Supabase para garantizar que:

- Los usuarios solo puedan ver sus propios datos
- Los padres solo vean información de sus hijos asociados
- Los docentes solo accedan a datos de sus grupos asignados
- Los administradores tengan control total

## 📝 Próximos Pasos

El proyecto ya cuenta con módulos funcionales de gestión académica y comunicación.

Mejoras recientes implementadas:

1. **Boletines** - Acceso restringido únicamente a rol `administrador` (ruta y navegación)
2. **Anuncios** - Destinatarios con checkboxes múltiples y formulario desplegable
3. **Calendario** - Vista de próximos eventos (sin pasados) y formulario desplegable de creación
4. **Permisos y Excusas** - Formulario “Solicitar permiso” desplegable
5. **Seguimiento** - Formulario “Registrar seguimiento” desplegable
6. **Citaciones** - Formulario “Programar citación” desplegable
7. **Asistencia** - Formulario desplegable y optimización para registro continuo
8. **RLS Anuncios** - Migración para corregir permisos de borrado en entornos existentes

### Migraciones recientes recomendadas

Si tu entorno ya está desplegado, aplica también las migraciones de la carpeta `migrations/`, especialmente:

- `20260301_fix_anuncios_delete_policy.sql`

## 📧 Notificaciones por Correo para Mensajes

Se dejó preparada una infraestructura base (apagada por defecto) para notificar por correo cuando se envían mensajes internos.

Revisa la guía de activación en [MENSAJES_EMAIL_NOTIFICACIONES.md](MENSAJES_EMAIL_NOTIFICACIONES.md).
9. **Horarios** - Visualización de horarios de clase
10. **Citaciones** - Programación y seguimiento
11. **Panel de Administración** - Gestión de usuarios y roles

## 🤝 Contribuir

Este es un proyecto educativo. Si encuentras errores o tienes sugerencias:

1. Crea un issue
2. Haz un fork del proyecto
3. Crea una rama para tu feature
4. Haz commit de tus cambios
5. Haz push a la rama
6. Abre un Pull Request

## 📄 Licencia

Este proyecto es de uso educativo. Siéntete libre de usarlo y modificarlo según tus necesidades.

## 📞 Soporte

Si tienes problemas con la configuración:

1. Verifica que las variables de entorno estén correctamente configuradas
2. Asegúrate de que el schema SQL se ejecutó sin errores
3. Revisa que los usuarios tengan los roles correctos asignados
4. Consulta la documentación de Supabase: https://supabase.com/docs

---

Desarrollado con ❤️ para el Liceo Ángel de la Guarda
