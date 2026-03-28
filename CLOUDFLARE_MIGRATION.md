# Migración de Netlify a Cloudflare

## Fecha: Marzo 2026

---

## Resumen de Cambios

| Componente | Antes (Netlify) | Después (Cloudflare) |
|---|---|---|
| Hosting SPA | `netlify.toml` + redirect `/*` | `public/_redirects` + `wrangler.toml` |
| Email Worker Cron | `netlify/functions/run-email-worker.js` | `cloudflare/workers/run-email-worker.js` |
| Config de build | `netlify.toml` | Dashboard de Cloudflare Pages |
| Secret cron | `SUPABASE_WORKER_URL` + `SUPABASE_CRON_SECRET` | `CLOUDFLARE_WORKER_URL` + `SUPABASE_CRON_SECRET` |

---

## Parte 1 — Cloudflare Pages (Frontend)

### 1.1 Crear el proyecto en Cloudflare Pages

1. Ir a [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages**
2. Conectar el repositorio de GitHub
3. Configurar el build:

   | Campo | Valor |
   |-------|-------|
   | Framework preset | None (o Vite) |
   | Build command | `pnpm build` |
   | Build output directory | `dist` |
   | Node.js version | 18 (o superior) |

4. En **Deploy command** dejar vacío.

> Importante: en Cloudflare Pages no debes usar `npx wrangler deploy` para el frontend. Pages publica automáticamente el directorio `dist` al terminar el build.

### 1.2 Variables de entorno en Pages

En **Settings → Environment variables** agregar para **Production** y **Preview**:

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `<anon-key>` |

> ⚠️ Las variables que usan `VITE_` deben estar presentes **en tiempo de build**, no en runtime. Cloudflare las inyecta correctamente si están definidas antes del build.

### 1.3 SPA Routing

El archivo `public/_redirects` ya incluye la regla:

```
/* /index.html 200
```

Esto reemplaza el redirect de `netlify.toml`. Cloudflare Pages lo detecta automáticamente.

### 1.4 Verificar que `netlify.toml` ya no aplica

El archivo `netlify.toml` puede dejarse en el repositorio sin efecto, o eliminarse. Cloudflare lo ignora.

---

## Parte 2 — Email Worker (Cron)

El email worker era una Netlify Scheduled Function. Se migra a un **Cloudflare Worker con Cron Trigger**.

### 2.1 Instalar Wrangler CLI

```bash
pnpm add -D wrangler
# o globalmente:
npm install -g wrangler
```

### 2.2 Autenticarse con Cloudflare

```bash
wrangler login
```

### 2.3 Desplegar el Worker

```bash
# Desplegar usando la config del worker (separada de Pages)
wrangler deploy --config wrangler.worker.toml
```

> Este comando es solo para el Worker de cron, no para desplegar el frontend en Pages.

### 2.4 Configurar las variables de entorno del Worker

En **Cloudflare Dashboard → Workers & Pages → agenda-virtual-email-worker → Settings → Variables and Secrets**:

| Variable | Tipo | Valor |
|----------|------|-------|
| `SUPABASE_PROJECT_REF` | Text | `mkjvprcsakvfqxplqolq` |
| `SUPABASE_CRON_SECRET` | Secret | `<mismo secret que en Supabase>` |
| `SUPABASE_FUNCTIONS_BASE_URL` | Text (opcional) | Solo si usas URL custom |

> El `SUPABASE_CRON_SECRET` debe coincidir con el que está configurado en los secrets de Supabase Edge Functions.

### 2.5 Verificar el Cron Trigger

En el Dashboard del Worker → **Triggers** → **Cron Triggers**, confirmar que aparece `* * * * *` (cada minuto).

Para probar manualmente:

```bash
curl -X POST https://agenda-virtual-email-worker.<subdominio>.workers.dev \
  -H "Authorization: Bearer <SUPABASE_CRON_SECRET>" \
  -H "Content-Type: application/json"
```

---

## Parte 3 — GitHub Actions

Actualizar el secret en GitHub:

| Secret antiguo (Netlify) | Secret nuevo (Cloudflare) |
|---|---|
| `SUPABASE_WORKER_URL` | `CLOUDFLARE_WORKER_URL` |
| `SUPABASE_CRON_SECRET` | `SUPABASE_CRON_SECRET` (sin cambio) |

El valor de `CLOUDFLARE_WORKER_URL` es la URL del Worker desplegado:
`https://agenda-virtual-email-worker.<tu-subdominio>.workers.dev`

---

## Parte 4 — Supabase Auth Redirect URLs

Si Supabase tiene configurada la URL de la aplicación para redirecciones de auth (recuperación de contraseña, email confirmation), actualizar:

1. **Supabase Dashboard → Authentication → URL Configuration**
2. Cambiar **Site URL** a `https://<tu-dominio>.pages.dev` (o tu dominio custom)
3. Agregar en **Redirect URLs**: `https://<tu-dominio>.pages.dev/**`

---

## Parte 5 — Dominio Personalizado (Opcional)

### En Cloudflare Pages:
1. **Pages → tu-proyecto → Custom domains → Set up a custom domain**
2. Seguir el wizard (si el dominio ya está en Cloudflare, se configura automáticamente)

### Actualizar después del dominio custom:
- `VITE_SUPABASE_URL` no cambia
- Supabase Auth → Site URL → actualizar al nuevo dominio
- `APP_BASE_URL` en secrets de Supabase (para emails de notificación)

### Si tu dominio está en Google (Google Domains / Squarespace DNS)

1. En Cloudflare Pages agrega el dominio exacto que usas en producción (por ejemplo `app.tudominio.com`).
2. En el wizard de Cloudflare copia los registros DNS sugeridos (normalmente `CNAME` del subdominio a `<tu-proyecto>.pages.dev`).
3. En el panel DNS del dominio en Google crea ese registro `CNAME` exactamente igual (mismo host y mismo target).
4. Si vas a usar dominio raíz (`tudominio.com`), crea los registros que indique Cloudflare para apex flattening o usa una redirección desde raíz al subdominio `www`/`app`.
5. Espera propagación DNS (normalmente minutos, hasta 24h en algunos casos).
6. Regresa a Cloudflare Pages y valida estado `Active` en el dominio custom.
7. En Supabase Auth actualiza:
  - `Site URL` = `https://<tu-dominio-custom>`
  - `Redirect URLs` = `https://<tu-dominio-custom>/**`
8. En secretos de Supabase Edge Functions actualiza `APP_BASE_URL=https://<tu-dominio-custom>`.
9. Ejecuta prueba end-to-end: login, recuperación de contraseña, y apertura directa de rutas internas (recarga en `/dashboard/...`).

> Recomendación: usa un subdominio dedicado (ej. `app.tudominio.com`) para evitar conflictos con otros servicios del dominio principal.

---

## Checklist de Migración

### Cloudflare Pages
- [ ] Proyecto creado y conectado al repositorio
- [ ] `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configuradas en Pages
- [ ] Primer deploy exitoso
- [ ] Verificar que las rutas internas no dan 404 al recargar
- [ ] Verificar login y navegación completa

### Email Worker
- [ ] `wrangler login` completado
- [ ] Worker desplegado con `wrangler deploy --config wrangler.worker.toml`
- [ ] Variables `SUPABASE_PROJECT_REF` y `SUPABASE_CRON_SECRET` configuradas en el Worker
- [ ] Cron Trigger visible en el Dashboard
- [ ] Prueba manual exitosa con `curl`

### GitHub Actions
- [ ] Secret `CLOUDFLARE_WORKER_URL` agregado en GitHub
- [ ] Workflow `.github/workflows/run-email-worker-cron.yml` actualizado
- [ ] `workflow_dispatch` manual funciona correctamente

### Supabase
- [ ] Site URL actualizada en Authentication settings
- [ ] Redirect URLs actualizadas
- [ ] `APP_BASE_URL` actualizado en secrets de Edge Functions

### Limpieza (opcional)
- [ ] Eliminar o archivar `netlify.toml` (puede mantenerse sin efecto)
- [ ] Eliminar `netlify/` si ya no se usa Netlify

---

## Notas Importantes

### Variables `VITE_` en Cloudflare Pages

Cloudflare Pages inyecta las variables de entorno **durante el build**, igual que Netlify. Las variables con prefijo `VITE_` son reemplazadas estáticamente en el bundle por Vite. Deben estar definidas en el Dashboard de Pages antes de hacer deploy.

### Previews en PRs

Cloudflare Pages crea previews automáticos por cada PR/branch, igual que Netlify. Las variables de entorno de Preview se configuran por separado en Settings → Environment variables → Preview.

### Cache y Build Cache

Cloudflare Pages soporta build cache automáticamente. No se necesita configuración adicional para `node_modules`.

### Compatibilidad con `pnpm`

Cloudflare Pages detecta `pnpm-lock.yaml` y usa pnpm automáticamente. No se necesita configuración adicional.

---

## Troubleshooting Rápido

### Error: `Missing entry-point to Worker script or to assets directory`

Si aparece durante el deploy de Pages y ves en logs `Executing user deploy command: npx wrangler deploy`, significa que configuraste un deploy command incorrecto para el frontend.

Solución:

1. En Cloudflare Pages, deja **Deploy command** vacío.
2. Mantén solo:
  - Build command: `pnpm build`
  - Build output directory: `dist`
3. Usa `wrangler deploy --config wrangler.worker.toml` únicamente para el Worker de cron.
