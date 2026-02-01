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

## 📚 Documentación Completa

- **README.md** - Documentación completa del proyecto
- **SUPABASE_SETUP.md** - Guía detallada de configuración de Supabase

## 🎯 Módulos Disponibles

El proyecto incluye la estructura base para:

- ✅ Dashboard Principal
- ✅ Sistema de Autenticación con Roles
- ✅ Layout Responsivo
- ⏳ Boletines de Notas (por implementar)
- ⏳ Registro de Asistencia (por implementar)
- ⏳ Notas Parciales (por implementar)
- ⏳ Anuncios (por implementar)
- ⏳ Mensajes (por implementar)
- ⏳ Calendario (por implementar)
- ⏳ Permisos y Excusas (por implementar)
- ⏳ Seguimiento (por implementar)
- ⏳ Horarios (por implementar)
- ⏳ Citaciones (por implementar)
- ⏳ Administración (por implementar)

## 🛠️ Stack Tecnológico

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + Shadcn-ui
- **Backend**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth con RLS
- **State**: Zustand

## 💡 Próximos Pasos

1. Implementar los módulos restantes
2. Agregar validaciones de formularios
3. Implementar sistema de notificaciones
4. Agregar tests
5. Optimizar rendimiento

## 📞 ¿Necesitas Ayuda?

Revisa la documentación completa en `README.md`
