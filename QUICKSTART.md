# 🚀 Guía Rápida de Inicio

## Inicio Rápido en 5 Pasos

### 1️⃣ Instalar Dependencias

```bash
cd agenda-virtual-liceo
pnpm install
```

### 2️⃣ Configurar Supabase

1. Crea una cuenta en [Supabase](https://supabase.com)
2. Crea un nuevo proyecto
3. Sigue la guía en `SUPABASE_SETUP.md` para configurar la base de datos

### 3️⃣ Configurar Variables de Entorno

```bash
cp .env.example .env
```

Edita `.env` y agrega tus credenciales de Supabase.

### 4️⃣ Ejecutar el Proyecto

```bash
pnpm dev
```

Abre [http://localhost:5173](http://localhost:5173)

### 5️⃣ Iniciar Sesión

Usa las credenciales del usuario administrador que creaste:

```
Email: admin@liceo.com
Password: Admin123! (o la que hayas configurado)
```

Nota:
- La sesión se conserva solo mientras la pestaña/navegador permanezca abierto.
- Al cerrar navegador o pestaña, se solicitará inicio de sesión nuevamente.

## 📚 Documentación Completa

- **README.md** - Documentación completa del proyecto
- **SUPABASE_SETUP.md** - Guía detallada de configuración de Supabase

## 🎯 Módulos Disponibles

El proyecto incluye módulos funcionales de:

- ✅ Dashboard Principal
- ✅ Sistema de Autenticación con Roles
- ✅ Layout Responsivo
- ✅ Boletines de Notas (acceso solo administrador)
- ✅ Registro de Asistencia
- ✅ Notas Parciales
- ✅ Anuncios
- ✅ Mensajes
- ✅ Calendario
- ✅ Permisos y Excusas
- ✅ Seguimiento
- ✅ Horarios
- ✅ Citaciones
- ✅ Administración

### Nota de despliegue (importante)

Si ya tenías una base de datos configurada previamente, aplica las migraciones más recientes en `migrations/` para alinear políticas RLS y comportamiento de módulos.

Para Cloudflare Pages:
- Build command: `pnpm build`
- Publish directory: `dist`
- Se requiere redirect SPA (ya incluido en `public/_redirects`).
- Si usas cron para notificaciones de correo, desplegar `cloudflare/workers/run-email-worker.js` con `wrangler deploy --config wrangler.worker.toml`.

## 🛠️ Stack Tecnológico

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + Shadcn-ui
- **Backend**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth con RLS
- **State**: Zustand

## 💡 Próximos Pasos

1. Ejecutar migraciones pendientes en entornos existentes
2. Agregar tests de regresión para permisos por rol
3. Fortalecer validaciones de formularios y UX de errores
4. Implementar notificaciones más ricas en UI
5. Optimizar rendimiento en listados grandes

## 📞 ¿Necesitas Ayuda?

Revisa la documentación completa en `README.md`
