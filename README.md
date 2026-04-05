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
   - **Project URL** (VITE_SUPABASE_URL)
   - **anon/public key** (VITE_SUPABASE_ANON_KEY)

Notas adicionales de secretos (servidor/cron):

- `SUPABASE_SERVICE_ROLE_KEY` (service role): sólo para uso en funciones de servidor/edge. Nunca exponer al cliente.
- `SUPABASE_CRON_SECRET` o `CRON_SECRET`: secreto usado para autorizar el worker/cron que ejecuta notificaciones por correo.

Dónde configurar:

- Variables de frontend (prefijo VITE_) en Cloudflare Pages: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
- Secrets de Supabase y Supabase Functions: SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET.
- Cloudflare Workers / wrangler: configurar secrets en el dashboard de Cloudflare o mediante `wrangler secret put` para claves de Gmail u otros.

### 4. Configurar variables de entorno

1. Copia el archivo `.env.example` a `.env` (para desarrollo local):

```bash
cp .env.example .env
```

2. Edita el archivo `.env` y agrega tus credenciales:

```env
# Frontend (prefijo VITE_ para que Vite lo inyecte en build)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui

# (Opcional) variables usadas por funciones/cron - NO agregar estas al código cliente
# SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
# SUPABASE_CRON_SECRET=tu_cron_secret_aqui
```

### 5. Crear usuarios de prueba

Para poder iniciar sesión, necesitas crear usuarios en Supabase:

#### Opción A: Usando el SQL Editor de Supabase

Ejecuta este SQL para crear un usuario administrador de prueba:

```sql
-- Después de crear el usuario vía Authentication > Users, asigna el rol en profiles
UPDATE profiles
SET
  rol = 'administrador',
  nombre_completo = 'Administrador Sistema',
  activo = true
WHERE email = 'admin@liceoag.com';
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

### 6. Ejecutar el proyecto (desarrollo local)

```bash
pnpm dev
# o
npm run dev
```

El proyecto estará disponible en `http://localhost:5173` (puerto por defecto de Vite).

Si necesitas crear un build para producción localmente:

```bash
pnpm build
pnpm preview
```

### Comportamiento de sesión

- La autenticación usa `sessionStorage`.
- La sesión permanece activa mientras el navegador/pestaña siga abierto.
- Al cerrar el navegador (o la pestaña), la sesión se elimina y se debe iniciar sesión nuevamente.

## 👤 Usuarios de Prueba Sugeridos

Te recomendamos crear estos usuarios de prueba (ejemplos). NOTA DE SEGURIDAD: no subas credenciales reales al repositorio ni uses contraseñas triviales en entornos públicos. Usa contraseñas seguras en producción.

```text
Administrador:
  Email: administrativo@liceoag.com
  Password: AdminIntr4t1vo!2026
  Rol: administrativo

Docente:
  Email: docente@liceoag.com
  Password: Docente!2026
  Rol: docente

Estudiante:
  Email: estudiante@liceoag.com
  Password: Estud!ante2026
  Rol: estudiante

Padre:
  Email: padre@liceoag.com
  Password: Padre!2026
  Rol: padre
```

Recuerda ejecutar el UPDATE para asignar los roles después de crear cada usuario.

## 📥 Carga Masiva De Usuarios (Pegar Desde Excel)

El panel de administración incluye una opción para crear usuarios en lote desde la pestaña **Usuarios**.

Formato de columnas esperado (encabezados en la primera fila):

```text
email,nombre_completo,rol,password,telefono,direccion
```

Reglas:

- Obligatorios por fila: `email`, `nombre_completo`, `rol`
- `rol` debe ser uno de: `administrador`, `administrativo`, `docente`, `estudiante`, `padre`
- `password` puede venir por fila o definirse una contraseña por defecto en la UI
- Contraseña mínima: 6 caracteres
- Máximo por lote: 500 usuarios
- El ingreso se hace pegando filas desde Excel/Google Sheets en la interfaz

Ejemplo (filas en hoja de cálculo):

```text
email,nombre_completo,rol,password,telefono,direccion
estudiante1@liceoag.com,Mariana Perez,estudiante,Estud123!,3001112233,Cra 10 # 12-30
padre1@liceoag.com,Carlos Perez,padre,,3005557788,Cra 10 # 12-30
```

En el ejemplo anterior, el segundo usuario usará la contraseña por defecto configurada en la carga masiva.

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

Notas operativas y de seguridad:

- Nunca subas archivos `.env` ni claves al repositorio. Añade `.env` a tu `.gitignore` si usas otro nombre local.
- Variables sensibles y secretos que requieren configuración:
  - En Supabase Functions: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (o `SUPABASE_CRON_SECRET`) y variables de Gmail (si aplica).
  - En Cloudflare Workers: credenciales para Gmail/Google (service account JSON o refresh token) y `SUPABASE_CRON_SECRET` como secret de Worker.
  - En GitHub Actions / CI: configurar secrets `CLOUDFLARE_WORKER_URL`, `SUPABASE_CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, etc.

- Carpetas que normalmente contienen código que usa secretos: `supabase/functions/` y `cloudflare/workers/`.

- En producción, sólo exponer en el frontend las variables con prefijo `VITE_` (anon/public). Las claves de servicio y secretos deben permanecer en el servidor/entorno de funciones.

## 🚀 Estado Actual del Proyecto

Módulos operativos en producción:

1. Autenticación con roles y recuperación/restablecimiento de contraseña.
2. Dashboard por rol.
3. Boletines (acceso restringido a administradores).
4. Asistencia, notas, anuncios, mensajes y calendario.
5. Permisos/excusas, seguimiento, horarios y citaciones.
6. Panel de administración para gestión de usuarios.

Cambios relevantes recientes:

1. Migración de despliegue a Cloudflare Pages con redirect SPA en `public/_redirects`.
2. Sesión de autenticación con expiración al cerrar navegador/pestaña (`sessionStorage`).
3. Ruta `/login` disponible siempre (sin auto-redirect por sesión activa).
4. Endurecimiento de control de acceso para `/dashboard/admin`.
5. Mejora de dependencias: `jspdf` actualizado y override de `dompurify`.

## ✅ Checklist de Despliegue en Cloudflare Pages

1. Variables de entorno en Cloudflare Pages (Production y Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (No incluir claves de servicio en Pages)
2. Build command: `pnpm build`
3. Publish directory: `dist`
4. Deploy command en Pages: **vacío** (no usar `wrangler deploy` para frontend).
5. Confirmar que exista `public/_redirects` con `/* /index.html 200`.
6. Aplicar migraciones SQL pendientes de `migrations/` en Supabase.
7. Validar login, navegación por rutas internas y permisos por rol.

## 📧 Notificaciones por Correo para Mensajes

La notificación por correo de mensajes internos se procesa con Google Workspace Gmail API desde la Edge Function `send-message-emails`.

Checklist de secretos en Supabase para producción:

1. `CRON_SECRET` (obligatorio en producción para autorizar el worker)
2. `APP_ENV=production`
3. `APP_BASE_URL=https://tu-dominio`
4. `EMAIL_FROM=Agenda Virtual <notificaciones@tu-dominio>` (opcional, con fallback al usuario impersonado)
5. `EMAIL_NOTIFICATIONS_DRY_RUN=false`
6. `EMAIL_NOTIFICATIONS_BATCH_SIZE=20`
7. `EMAIL_NOTIFICATIONS_MAX_ATTEMPTS=5`

Autenticación Gmail (elige un modo):

1. Modo service account
   - `GOOGLE_WORKSPACE_AUTH_MODE=service_account`
   - `GOOGLE_WORKSPACE_CLIENT_EMAIL=service-account@proyecto.iam.gserviceaccount.com`
   - `GOOGLE_WORKSPACE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...`
   - `GOOGLE_WORKSPACE_IMPERSONATED_USER=notificaciones@tu-dominio`
   - `GOOGLE_WORKSPACE_SCOPE=https://www.googleapis.com/auth/gmail.send`
2. Modo refresh token
   - `GOOGLE_WORKSPACE_AUTH_MODE=refresh_token`
   - `GOOGLE_OAUTH_CLIENT_ID=...`
   - `GOOGLE_OAUTH_CLIENT_SECRET=...`
   - `GOOGLE_OAUTH_REFRESH_TOKEN=...`
   - `GOOGLE_WORKSPACE_IMPERSONATED_USER=notificaciones@tu-dominio`

Checklist de activación:

1. Desplegar `send-message-emails` en Supabase Functions.
2. Activar el flag `mensajes_email_notificaciones` en base de datos.
3. Desplegar el worker de Cloudflare con `wrangler deploy --config wrangler.worker.toml`.
4. Configurar en GitHub Actions los secrets `CLOUDFLARE_WORKER_URL` y `SUPABASE_CRON_SECRET`.

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

### Primeros pasos para desarrolladores (rápido)

1. Clona el repositorio: `git clone <url>`
2. Entra a la carpeta: `cd agenda-virtual-liceo`
3. Instala dependencias: `pnpm install` (o `npm install`)
4. Crea un proyecto en Supabase y copia `supabase-schema.sql` a SQL Editor; ejecuta el script.
5. Configura variables locales copiando `.env.example` a `.env` y rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
6. Crea un usuario admin en Supabase (Authentication > Users) y asigna rol en `profiles` con un `UPDATE`.
7. Arranca el frontend: `pnpm dev` y abre `http://localhost:5173`.

Si necesitas trabajar con funciones server/cron, añade `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET` en el dashboard de Supabase Functions o en tus secrets de CI/Cloudflare.
