# 📚 Agenda Virtual - Liceo Ángel de la Guarda

Plataforma completa de gestión académica desarrollada con React, TypeScript, Vite, Tailwind CSS, Shadcn-ui y Supabase PostgreSQL.

## 🎯 Características Principales

- ✅ **Sistema de autenticación basado en roles** (Administrador, Administrativo, Docente, Estudiante, Padre/Acudiente)
- ✅ **Dashboard personalizado** según el rol del usuario
- ✅ **Gestión académica completa**: boletines, notas, asistencias
- ✅ **Sistema de comunicación**: mensajes internos (con firma institucional), anuncios y notificaciones por correo
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

El enum `user_role` define cinco roles: `administrador`, `administrativo`, `docente`, `estudiante` y `padre`.

Solo dos rutas aplican restricción de rol en el router (`src/App.tsx`): `/dashboard/boletines` y `/dashboard/admin`, ambas restringidas a `administrador`. El resto de los módulos usa `ProtectedRoute` y controla el alcance de los datos mediante RLS y filtros por rol dentro de la página.

| Módulo | Ruta | Acceso |
| --- | --- | --- |
| Inicio | `/` | Público |
| Login, recuperar y restablecer contraseña | `/login`, `/recuperar-contrasena`, `/restablecer-contrasena` | Público |
| Dashboard | `/dashboard` | Autenticado |
| Boletines | `/dashboard/boletines` | Solo `administrador` |
| Asistencia | `/dashboard/asistencia` | Autenticado, datos filtrados por rol |
| Notas | `/dashboard/notas` | Autenticado, datos filtrados por rol |
| Anuncios | `/dashboard/anuncios` | Autenticado, visibles por rol o destinatario |
| Mensajes | `/dashboard/mensajes` | Autenticado, con destinatarios restringidos por rol |
| Calendario | `/dashboard/calendario` | Autenticado |
| Permisos | `/dashboard/permisos` | Autenticado |
| Seguimiento | `/dashboard/seguimiento` | Autenticado |
| Horarios | `/dashboard/horarios` | Autenticado |
| Citaciones | `/dashboard/citaciones` | Autenticado |
| Administración | `/dashboard/admin` | Solo `administrador` |
| Cambiar contraseña | `/dashboard/cambiar-contrasena` | Autenticado |

### Administrador
- Acceso completo a todos los módulos
- Gestión de usuarios, roles y carga masiva
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
- Mensajería solo con docentes

### Padre/Acudiente
- Acceso completo a la información del estudiante asociado
- Solicitud de permisos en nombre del estudiante
- Comunicación con docentes, administrativos y administradores

### Quién puede enviar mensajes a quién

Definido en `allowedRecipientRoles` (`src/pages/MensajesPage.tsx`). Cualquier otro rol no tiene restricción adicional:

| Rol del remitente | Destinatarios permitidos |
| --- | --- |
| `estudiante` | `docente` |
| `padre` | `docente`, `administrativo`, `administrador` |
| Resto de roles | Sin restricción por rol |

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
│   │   ├── admin-api.ts     # Wrapper de la Edge Function manage-users
│   │   ├── async-utils.ts   # Helpers async (withTimeout, etc.)
│   │   ├── telemetry.ts     # Telemetría
│   │   └── utils.ts         # Utilidades
│   ├── pages/               # 17 páginas/vistas (ver tabla de rutas arriba)
│   ├── utils/               # Lógica pura testeable (unitaria)
│   │   ├── message-signature.ts  # Composición de la firma institucional
│   │   ├── grade-order.ts        # Orden de grados y grupos
│   │   ├── anuncios.ts           # Utilidades de anuncios
│   │   ├── driveLinks.ts         # Validación de enlaces de Drive
│   │   ├── normalizeEmail.ts     # Normalización de email
│   │   └── calculations.ts
│   ├── types/
│   │   └── database.types.ts # Tipos de TypeScript para la BD (Row/Insert/Update)
│   ├── styles/
│   │   └── globals.css      # Estilos globales
│   ├── App.tsx              # Componente principal con rutas
│   └── main.tsx             # Punto de entrada
├── e2e/                     # Specs de Playwright
├── migrations/              # Migraciones SQL incrementales (aplicar en orden)
├── cloudflare/              # Workers de Cloudflare
├── supabase/functions/      # Edge Functions (Deno)
├── docs/testing/            # Documentación de testing
├── public/                  # Archivos estáticos
├── supabase-schema.sql      # Schema canónico de la BD (para instalaciones nuevas)
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

> `supabase-schema.sql` es el schema canónico para instalaciones nuevas. Las instalaciones existentes deben aplicar los archivos de `migrations/` en orden cronológico; al agregar una columna hay que actualizar ambos lugares.

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
6. Panel de administración para gestión de usuarios, carga masiva y títulos profesionales.
7. Firma institucional en mensajes internos.
8. Notificaciones por correo de mensajes internos.

Cambios relevantes recientes:

1. Firma institucional en mensajes, derivada del perfil del remitente y congelada al enviar.
2. Notificaciones por correo: nueva plantilla, remitente identificado y cabeceras anti-respuesta.
3. Paginación de la bandeja de mensajes con filtros por fecha y por contraparte.
4. Migración de despliegue a Cloudflare Pages con redirect SPA en `public/_redirects`.
5. Sesión de autenticación con expiración al cerrar navegador/pestaña (`sessionStorage`).
6. Ruta `/login` disponible siempre (sin auto-redirect por sesión activa).
7. Endurecimiento de control de acceso para `/dashboard/admin`.
8. Mejora de dependencias: `jspdf` actualizado y override de `dompurify`.

### Verificación local

```bash
pnpm lint          # ESLint, los warnings fallan el build
pnpm build         # typecheck (tsc) + bundle de Vite
pnpm run test:ci   # Vitest, suite autoritativa
```

Estado actual: `pnpm run test:ci` con 135 tests en 22 archivos.

Playwright (`pnpm run test:e2e`) requiere una instancia real de Supabase con `supabase-schema.sql` aplicado. No corre contra la suite unitaria.

### Migraciones aplicadas

`migrations/` se aplica en orden cronológico contra Supabase. Las más recientes:

- `20260930_mensajes_firma_titulo_profesional.sql` — `profiles.titulo_profesional` y `mensajes.firma`.
- `20260930_email_queue_remitente_fields.sql` — `remitente_nombre` y `remitente_email` en la cola de correos.

## ✍️ Firma Institucional en Mensajes

Los mensajes enviados por docentes, administrativos y administradores llevan una firma bajo el cuerpo, derivada del perfil del remitente:

```text
Ximena Patricia Ávila Díaz
Lic. Ciencias Naturales y Educación Ambiental
```

La firma se compone en `buildMessageSignature` (`src/utils/message-signature.ts`), una función pura y testeable, y se aplica en `MensajesPage` antes del envío. Se guarda en la columna `mensajes.firma` y se renderiza aparte de `contenido`.

Características:

- **Por remitente, no global**: cada mensaje lleva la firma de quien lo envía.
- **Roles con firma**: `docente`, `administrativo` y `administrador`.
- **Gestionada por el admin**: el título profesional se carga en el panel de administración. No hay autoedición por parte del usuario.
- **Congelada al enviar**: si después cambia el título, los mensajes ya enviados conservan la firma original.
- **Degradación limpia**: sin título profesional, la firma es solo el nombre. Los espacios y saltos de línea sobrantes se colapsan para que el bloque ocupe siempre dos líneas.
- **Separada de `contenido`**: el texto del autor queda intacto y las respuestas no arrastran la firma del remitente original al citar.

Ejemplo SQL para cargarla directamente:

```sql
UPDATE profiles
SET titulo_profesional = 'Lic. Ciencias Naturales y Educación Ambiental'
WHERE email = 'docente@liceoag.com';
```

## ✅ Checklist de Despliegue en Cloudflare Pages

1. Variables de entorno en Cloudflare Pages (Production y Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (No incluir claves de servicio en Pages)
2. Build command: `pnpm build`
3. Publish directory: `dist`
4. Deploy command en Pages: **vacío** (no usar `wrangler deploy` para frontend).
5. Confirmar que exista `public/_redirects` con `/* /index.html 200`.
6. Aplicar migraciones SQL pendientes de `migrations/` en Supabase. Si agregaste una columna, actualizar también `supabase-schema.sql` y `src/types/database.types.ts`.
7. Si agregaste una columna, actualizar también `supabase-schema.sql` y `src/types/database.types.ts`.
8. Validar login, navegación por rutas internas y permisos por rol.

> El CLI de Supabase (`supabase`) no es necesario para aplicar migraciones en este proyecto: se pueden aplicar desde el SQL Editor de Supabase o vía MCP.

## 📧 Notificaciones por Correo para Mensajes

La notificación por correo de mensajes internos se procesa con Google Workspace Gmail API desde la Edge Function `send-message-emails`.

> **El correo NO es un canal de respuesta.** Es una notificación unidireccional desde un buzón compartido. No se emite `Reply-To` a propósito y el asunto real del mensaje no se expone en el correo: si se hiciera, los destinatarios responderían al buzón de notificaciones y esas respuestas nunca llegarían al docente. El botón del correo dice "Leer y responder" y lleva a la Agenda Virtual, que es el único lugar donde el flujo de respuesta queda registrado.

Checklist de secretos en Supabase para producción:

1. `CRON_SECRET` (obligatorio en producción para autorizar el worker)
2. `APP_ENV=production`
3. `APP_BASE_URL=https://tu-dominio`
4. `EMAIL_FROM=Agenda Virtual <notificaciones@tu-dominio>` (opcional, con fallback al usuario impersonado)
5. `EMAIL_NOTIFICATIONS_DRY_RUN=false`
6. `EMAIL_NOTIFICATIONS_BATCH_SIZE=20`
7. `EMAIL_NOTIFICATIONS_MAX_ATTEMPTS=5`

El campo `mensajes.firma` guarda la firma institucional del remitente (nombre y título profesional) congelada en el momento del envío. Se renderiza debajo del cuerpo del mensaje y no forma parte de `contenido`, de modo que el texto del autor queda intacto y las respuestas no arrastran la firma del remitente original. Los mensajes históricos tienen `firma = NULL` porque la columna solo se puebla al enviar.

El título profesional de cada usuario lo carga un administrador desde el panel de administración (pestaña Usuarios → Editar). Solo aplica a los roles `docente`, `administrativo` y `administrador`; para estudiantes y padres la columna se ignora. Ver más detalle en la sección de firma institucional.

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
