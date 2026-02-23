# Calculadora de Notas - Documentación

## Resumen

Se ha integrado exitosamente una calculadora de notas en el sistema de Agenda Virtual Liceo. Esta calculadora permite a los docentes registrar notas de estudiantes utilizando tres categorías de evaluación con ponderaciones configurables.

## Componentes Creados

### 1. Tipos (`src/types/grades.ts`)

Define los tipos TypeScript para la calculadora:

- **`GradeCategory`**: Tipo literal para las 3 categorías ('A' | 'P' | 'C')
- **`GradeCounts`**: Cantidad de notas por categoría
- **`CategoryWeights`**: Pesos (porcentajes) por categoría
- **`GradeResults`**: Resultados calculados (promedios, ponderaciones, nota final)
- **`GradesData`**: Notas agrupadas por categoría
- **`categoryLabels`**: Mapeo de nombres de categorías

### 2. Utilidades de Cálculo (`src/utils/calculations.ts`)

Contiene las funciones matemáticas de cálculo:

- **`calculateAverage(grades: number[])`**: Calcula el promedio de notas
- **`calculateWeighted(average: number, weight: number)`**: Calcula la ponderación
- **`calculateResults(grades: GradesData, weights: CategoryWeights)`**: Calcula todos los resultados

### 3. Componentes de UI

#### `GradeInput.tsx`
Permite configurar:
- Porcentajes por categoría (validación: total ≤ 100%)
- Cantidad de notas por categoría (1-20)
- Botones +/- e input numérico directo

#### `GradeTable.tsx`
Tabla dinámica para ingreso de notas:
- Columnas generadas según cantidad de notas configurada
- Validación en tiempo real (0-100)
- Indicador visual de errores

#### `ResultsSection.tsx`
Visualización de resultados:
- Promedios por categoría
- Ponderaciones calculadas
- Nota final destacada en card azul

#### `GradeCalculator.tsx`
Componente orquestador que integra los 3 anteriores:
- Gestión de estado
- Recalculo automático con `useEffect`
- Botón de reiniciar
- Callback `onResultsChange` para comunicar resultados al padre

## Integración en NotasPage

### Funcionalidad para Docentes

Se agregó un botón "Registrar Nota" visible solo para docentes que abre un formulario con:

1. **Selectores**:
   - Grupo (cargado desde asignaciones del docente)
   - Asignatura (cargado desde asignaciones del docente)
   - Estudiante (cargado desde `estudiantes_grupos` del grupo seleccionado)

2. **Calculadora**:
   - Se muestra solo cuando se han seleccionado grupo, asignatura y estudiante
   - Pesos predeterminados: Actitudinal 10%, Procedimental 40%, Cognitiva 50%
   - Cantidad de notas inicial: 3 por categoría

3. **Guardado**:
   - Inserta en tabla `notas`:
     - `nota`: Promedio final calculado
     - `observaciones`: JSON con desglose completo:
       ```json
       {
         "actitudinal": {
           "promedio": 85.5,
           "ponderacion": 8.55,
           "notas": [80, 85, 90]
         },
         "procedimental": { ... },
         "cognitiva": { ... }
       }
       ```

### Flujo de Usuario (Docente)

1. Click en "Registrar Nota"
2. Seleccionar Grupo → carga estudiantes
3. Seleccionar Asignatura
4. Seleccionar Estudiante → se muestra calculadora
5. Configurar pesos (si es necesario)
6. Ingresar notas en la tabla
7. Ver resultados calculados en tiempo real
8. Click en "Guardar Nota"
9. Confirmación y recarga automática de listado

## Fórmulas de Cálculo

### Promedio por Categoría
```
Promedio = Σ notas / cantidad de notas
```

### Ponderación
```
Ponderación = Promedio × (Porcentaje / 100)
```

### Nota Final
```
Nota Final = Ponderación_A + Ponderación_P + Ponderación_C
```

## Ejemplo de Uso

### Entrada
- **Actitudinal (10%)**: [80, 85, 90] → Promedio: 85
- **Procedimental (40%)**: [70, 75, 80] → Promedio: 75
- **Cognitiva (50%)**: [90, 92, 88] → Promedio: 90

### Cálculo
- Actitudinal: 85 × 0.10 = 8.5
- Procedimental: 75 × 0.40 = 30
- Cognitiva: 90 × 0.50 = 45

### Resultado
**Nota Final: 83.5**

## Validaciones

1. **Pesos**: Total no puede superar 100%
2. **Cantidad de notas**: Entre 1 y 20 por categoría
3. **Notas**: Valor entre 0 y 100 (permite decimales)
4. **Formulario de registro**: Todos los campos requeridos antes de guardar
5. **Nota en BD**: CHECK constraint (nota >= 10 AND nota <= 100)

## Consideraciones Técnicas

- **Recalculo automático**: Se usa `useEffect` que observa cambios en `grades` y `weights`
- **TypeScript**: Se usó `as any` en el insert de notas debido a tipos incompletos en `database.types.ts`
- **RLS**: Las notas insertadas respetan las políticas de seguridad existentes
- **Unicidad**: La tabla tiene constraint UNIQUE(estudiante_id, asignatura_id, periodo_id)

## Datos Almacenados

En la tabla `notas`:
- `nota`: Nota final calculada (DECIMAL 5,2)
- `observaciones`: JSON string con desglose completo de categorías, promedios, ponderaciones y notas individuales

Este diseño permite:
- Visualizar la nota final de manera simple
- Auditar el cálculo completo en `observaciones`
- Recalcular o ajustar en el futuro si cambian los criterios

## Fuente Original

Esta calculadora está basada en el proyecto: https://github.com/AdrianLinares/grade-calculator.git

Se adaptó para:
- Integración con Supabase
- Uso de componentes Shadcn UI existentes
- Flujo de trabajo específico del sistema de agenda escolar
