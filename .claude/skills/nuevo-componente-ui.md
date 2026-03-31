---
name: nuevo-componente-ui
description: Crear componente UI reutilizable siguiendo patrón Shadcn
type: skill
---

# Skill: Nuevo Componente UI

Crear componentes UI reutilizables siguiendo el patrón Shadcn del proyecto.

## Ubicación

- Componentes genéricos: `src/components/ui/`
- Componentes específicos: `src/components/{feature}/`

## Patrón de componente Shadcn

```typescript
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// 1. Definir variantes con class-variance-authority
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

// 2. Definir interfaz de props
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

// 3. Componente con forwardRef
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

## Componente simple (sin variantes)

```typescript
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  // props adicionales
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'

export { Card }
```

## Utilidades requeridas

`src/lib/utils.ts` debe tener:
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Convenciones

- Usar `React.forwardRef` para todos los componentes UI
- Usar `cn()` para combinar clases condicionales
- Exportar el componente como default y variantes/helpers como named exports
- Usar CSS variables de Tailwind: `bg-primary`, `text-muted-foreground`, etc.
- Nunca usar estilos inline `style={{}}`

## Verificaciones

- [ ] forwardRef para acceso al elemento DOM
- [ ] cn() para combinación de clases
- [ ] Variantes definidas con cva si aplica
- [ ] Props tipadas con interfaz explícita
- [ ] displayName definido
