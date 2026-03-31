# Referencia Rápida — Agenda Virtual Liceo

## Comandos de Desarrollo

```bash
pnpm install        # Instalar dependencias
pnpm dev            # Servidor desarrollo (http://localhost:5173)
pnpm build          # Build producción
pnpm lint           # ESLint
pnpm preview        # Preview del build
```

## Skills de Claude Code

```
/skill nueva-pagina           # Crear página nueva
/skill nueva-migracion        # Crear migración SQL
/skill nuevo-componente-ui    # Crear componente UI
/skill revisar-cambios        # Revisar cambios pre-commit
/skill fix-rls-policy         # Corregir políticas RLS
/skill analizar-query-supabase # Analizar queries
```

## Agentes Especializados

Invocar agentes para tareas específicas:

```
# Para migraciones SQL
/agente migraciones --prompt "Crear tabla X con RLS"

# Para componentes UI
/agente componentes --prompt "Crear componente Y"

# Para páginas completas
/agente paginas --prompt "Crear página Z"

# Para code review
/agente review --prompt "Revisar cambios en archivo W"
```

## Atajos de Copilot

- `Ctrl+Enter` — Aceptar sugerencia completa
- `Tab` — Aceptar palabra siguiente
- `Ctrl+K` — Abrir chat de Copilot
- `/` — Activar instrucciones inline

## Patrones Comunes

### Carga de Datos
```typescript
const [data, setData] = useState<T[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const loadData = useCallback(async () => {
  if (!profile) return
  setLoading(true)
  setError(null)
  try {
    const { data, error } = await withTimeout(
      supabase.from('tabla').select('*'),
      15000,
      'Tiempo de espera agotado'
    )
    if (error) throw error
    setData(data || [])
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error desconocido')
  } finally {
    setLoading(false)
  }
}, [profile])

useEffect(() => {
  if (profile) void loadData()
}, [loadData, profile])
```

### Guardar Datos
```typescript
const [saving, setSaving] = useState(false)

const handleSave = async () => {
  if (!validación) { setError('mensaje'); return }
  setSaving(true)
  setError(null)
  setSuccess(null)
  try {
    const { error } = await withTimeout(
      (supabase as any).from('tabla').insert(payload),
      15000,
      'Tiempo de espera agotado'
    )
    if (error) throw error
    setSuccess('Guardado correctamente')
    await loadData()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error al guardar')
  } finally {
    setSaving(false)
  }
}
```

### Filtros Encadenados
```typescript
useEffect(() => {
  setSelectedAsignatura('')
  setSelectedEstudiante('')
  if (selectedGrupo) loadAsignaturasForGrupo()
}, [selectedGrupo])
```

### Formulario Desplegable
```typescript
const [formOpen, setFormOpen] = useState(false)

<Button onClick={() => setFormOpen(prev => !prev)}>
  {formOpen ? 'Ocultar formulario' : 'Registrar X'}
</Button>
{formOpen && <Card>...</Card>}
```

## Códigos de Error Supabase

| Código | Significado | Solución |
|--------|-------------|----------|
| `42501` | Privilegios insuficientes | Verificar RLS y permisos |
| `23505` | Violación unique | Verificar duplicados antes de insert |
| `23503` | Violación foreign key | Verificar IDs existen |
| `23502` | Violación not null | Verificar campos required |
| `42P01` | Tabla no existe | Verificar nombre de tabla |
| `42703` | Columna no existe | Verificar nombre de columna |

## Checklist Pre-Commit

- [ ] `pnpm lint` pasa sin errores
- [ ] `pnpm tsc --noEmit` pasa sin errores
- [ ] Todas las queries usan `withTimeout`
- [ ] Loading/Error/Success states presentes
- [ ] No `<form>` HTML
- [ ] No estilos inline
- [ ] Filtrado por rol correcto
- [ ] Tipos TypeScript correctos

## Recursos

- `CLAUDE.md` — Documentación completa
- `AGENTS.md` — Guía de agentes y skills
- `.github/copilot-instructions.md` — Instrucciones para Copilot
- `.cursor/rules/` — Reglas contextuales
- `.claude/skills/` — Skills de Claude Code
