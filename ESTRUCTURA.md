# 📁 Estructura del Proyecto

```
agenda-virtual-liceo/
│
├── 📄 README.md                    # Documentación completa
├── 📄 QUICKSTART.md                # Guía rápida de inicio
├── 📄 SUPABASE_SETUP.md            # Guía de configuración de Supabase
├── 📄 package.json                 # Dependencias y scripts
├── 📄 .env.example                 # Template de variables de entorno
├── 📄 .gitignore                   # Archivos ignorados por git
├── 📄 index.html                   # HTML principal
├── 📄 vite.config.ts               # Configuración de Vite
├── 📄 tailwind.config.js           # Configuración de Tailwind
├── 📄 postcss.config.js            # Configuración de PostCSS
├── 📄 tsconfig.json                # Configuración de TypeScript
├── 📄 tsconfig.node.json           # TypeScript para Node
├── 📄 supabase-schema.sql          # Schema SQL (parcial)
│
└── 📂 src/
    ├── 📄 main.tsx                 # Punto de entrada de la aplicación
    ├── 📄 App.tsx                  # Componente principal con rutas
    │
    ├── 📂 components/
    │   ├── 📂 ui/                  # Componentes de UI (Shadcn)
    │   │   ├── avatar.tsx
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   ├── input.tsx
    │   │   └── label.tsx
    │   │
    │   ├── 📂 layout/              # Layouts
    │   │   └── DashboardLayout.tsx # Layout principal del dashboard
    │   │
    │   ├── 📂 auth/                # Componentes de autenticación (vacío por ahora)
    │   └── 📂 dashboard/           # Componentes del dashboard (vacío por ahora)
    │
    ├── 📂 lib/
    │   ├── supabase.ts             # Cliente de Supabase
    │   ├── auth-store.ts           # Store de autenticación (Zustand)
    │   └── utils.ts                # Utilidades (función cn)
    │
    ├── 📂 pages/
    │   ├── LoginPage.tsx           # Página de login
    │   └── DashboardPage.tsx       # Página principal del dashboard
    │
    ├── 📂 types/
    │   └── database.types.ts       # Tipos de TypeScript para Supabase
    │
    ├── 📂 hooks/                   # Hooks personalizados (vacío por ahora)
    │
    └── 📂 styles/
        └── globals.css             # Estilos globales de Tailwind
```

## 🎯 Descripción de Carpetas Principales

### `/src/components`
Contiene todos los componentes reutilizables de React:
- **ui/**: Componentes de UI base (botones, inputs, cards, etc.) de Shadcn-ui
- **layout/**: Componentes de layout (DashboardLayout, etc.)
- **auth/**: Componentes relacionados con autenticación (por implementar)
- **dashboard/**: Componentes específicos del dashboard (por implementar)

### `/src/lib`
Contiene configuraciones y utilidades:
- **supabase.ts**: Cliente configurado de Supabase
- **auth-store.ts**: Estado global de autenticación usando Zustand
- **utils.ts**: Funciones utilitarias (como `cn` para clases CSS)

### `/src/pages`
Contiene las páginas/vistas principales:
- **LoginPage.tsx**: Página de inicio de sesión
- **DashboardPage.tsx**: Dashboard principal con resumen

### `/src/types`
Contiene definiciones de tipos de TypeScript:
- **database.types.ts**: Tipos generados desde el schema de Supabase

### `/src/styles`
Contiene archivos de estilos:
- **globals.css**: Estilos globales y configuración de Tailwind CSS

## 🔄 Flujo de la Aplicación

1. **main.tsx** → Punto de entrada, renderiza `<App />`
2. **App.tsx** → Configura rutas con React Router
3. **Rutas protegidas** → Verifican autenticación antes de renderizar
4. **DashboardLayout** → Proporciona estructura común (sidebar, header)
5. **Páginas** → Contenido específico de cada vista

## 🔐 Sistema de Autenticación

El flujo de autenticación funciona así:

1. Usuario ingresa credenciales en **LoginPage**
2. **auth-store.ts** (Zustand) maneja el estado de autenticación
3. **supabase.ts** se comunica con Supabase Auth
4. Políticas RLS en Supabase controlan acceso a datos
5. Rutas protegidas verifican `user` antes de renderizar

## 📦 Dependencias Principales

### Producción
- `react` - Librería UI
- `react-router-dom` - Navegación
- `@supabase/supabase-js` - Cliente de Supabase
- `zustand` - Estado global
- `lucide-react` - Iconos
- Componentes Radix UI (base de Shadcn)

### Desarrollo
- `vite` - Build tool
- `typescript` - Tipado estático
- `tailwindcss` - CSS utilities
- `eslint` - Linter

## 🚀 Scripts Disponibles

```bash
# Desarrollo
pnpm dev          # Inicia servidor de desarrollo

# Producción
pnpm build        # Construye para producción
pnpm preview      # Preview de build de producción

# Linting
pnpm lint         # Ejecuta ESLint
```

## 📝 Notas Importantes

1. Los archivos `.env` no se suben a git (están en .gitignore)
2. El schema SQL completo debe ejecutarse en Supabase
3. Los componentes UI son de Shadcn-ui y pueden extenderse
4. El sistema usa TypeScript estricto
5. Tailwind CSS está configurado con modo dark

## 🎨 Sistema de Diseño

- **Colores**: Definidos en `globals.css` con CSS variables
- **Componentes**: Shadcn-ui con Radix UI primitives
- **Tipografía**: System fonts por defecto
- **Iconos**: Lucide React
- **Responsive**: Mobile-first con Tailwind

## 🔜 Próximas Adiciones

Las siguientes carpetas/archivos se crearán según se implementen los módulos:

- `src/components/dashboard/` - Componentes del dashboard
- `src/components/notas/` - Componentes de notas
- `src/components/asistencia/` - Componentes de asistencia
- `src/hooks/` - Hooks personalizados
- `src/services/` - Servicios de API
- `src/utils/` - Utilidades adicionales
- Tests con Vitest
