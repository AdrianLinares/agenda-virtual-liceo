# Agentes y Skills — Agenda Virtual Liceo

Este proyecto incluye automatizaciones para Claude Code y GitHub Copilot para mejorar la eficiencia del desarrollo.

## Skills para Claude Code

Las skills son comandos reutilizables que automatizan tareas comunes.

### Ubicación

`.claude/skills/`

### Cómo usar

En Claude Code, ejecutar:
```
/skill nombre-skill
```

### Skills disponibles

| Skill | Descripción |
|-------|-------------|
| `/skill nueva-pagina` | Crear página con todos los patrones requeridos |
| `/skill nueva-migracion` | Crear migración SQL con patrón correcto |
| `/skill nuevo-componente-ui` | Crear componente UI patrón Shadcn |
| `/skill revisar-cambios` | Revisar cambios antes de commit |
| `/skill fix-rls-policy` | Diagnosticar y corregir políticas RLS |
| `/skill analizar-query-supabase` | Analizar y optimizar queries Supabase |

## Reglas para Cursor/Copilot

### Ubicación

`.cursor/rules/`

### Reglas activas

| Archivo | Aplica a | Propósito |
|---------|----------|-----------|
| `agenda-virtual-liceo.mdc` | `src/**/*.tsx,src/**/*.ts` | Convenciones de código TypeScript/React |
| `sql-migrations.mdc` | `migrations/*.sql,*.sql` | Reglas para migraciones SQL |

### Cómo funciona

Cursor lee automáticamente estas reglas cuando editas archivos que matchean los globs. Las reglas proporcionan:
- Convenciones obligatorias
- Patrones de código aprobados
- Anti-patrones a evitar
- Ejemplos de código correcto

## Agentes Especializados (Sugeridos)

Para tareas complejas, puedes invocar agentes especializados:

### Agente de Migraciones
```
/agente migraciones --prompt "Crear migración para nueva tabla X"
```

**Responsabilidades:**
- Crear tablas con estructura correcta
- Añadir índices para rendimiento
- Configurar políticas RLS por rol
- Incluir funciones SECURITY DEFINER si necesario

### Agente de Componentes
```
/agente componentes --prompt "Crear componente para listar X"
```

**Responsabilidades:**
- Seguir patrón Shadcn
- Usar clases Tailwind semánticas
- Incluir loading/error states
- Tipado TypeScript correcto

### Agente de Testing
```
/agente testing --prompt "Generar tests para página X"
```

**Responsabilidades:**
- Verificar patrones de estados
- Validar queries con timeout
- Confirmar filtrado por rol
- Revisar accesibilidad básica

## Configuración VS Code

El proyecto incluye configuración en `.vscode/settings.json`:

- GitHub Copilot habilitado para TS/TSX/SQL
- Format on save con Prettier
- ESLint fix on save
- Tailwind CSS IntelliSense
- TypeScript inlay hints configurados

## Comandos Útiles

```bash
# Desarrollo
pnpm dev          # Servidor local
pnpm build        # Build producción
pnpm lint         # ESLint
pnpm preview      # Preview build

# Skills (desde Claude Code)
/skill nueva-pagina
/skill nueva-migracion
/skill revisar-cambios
```

## Flujo de Trabajo Recomendado

### Nueva Feature

1. `/skill nueva-pagina` si es página nueva
2. `/skill nuevo-componente-ui` si necesita componentes
3. `/skill nueva-migracion` si cambia schema
4. `/skill revisar-cambios` antes de commit

### Fix de Bug

1. Identificar causa raíz
2. `/skill fix-rls-policy` si es error de RLS
3. `/skill analizar-query-supabase` si es error de query
4. `/skill revisar-cambios` antes de commit

### Code Review

1. `/skill revisar-cambios` para revisión automática
2. Verificar checklist generado
3. Corregir issues encontrados
4. Commit con mensaje descriptivo

## Contribuir Nuevas Skills

1. Crear archivo en `.claude/skills/nombre-skill.md`
2. Usar formato frontmatter:
   ```markdown
   ---
   name: nombre-skill
   description: Descripción corta
   type: skill
   ---
   ```
3. Documentar pasos claros y ejemplos
4. Agregar entrada en `.claude/MEMORY.md`

## Recursos Adicionales

- `CLAUDE.md` — Documentación completa del proyecto
- `.github/copilot-instructions.md` — Instrucciones para Copilot
- `.cursor/rules/` — Reglas contextuales para Cursor
