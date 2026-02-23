# Instrucciones de Prueba - Calculadora de Notas

## Requisitos Previos

1. Usuario con rol **docente** en el sistema
2. Al menos una asignación en `asignaciones_docentes` para ese docente
3. Estudiantes registrados en el grupo asignado (tabla `estudiantes_grupos`)
4. Periodo académico activo en la tabla `periodos`

## Pasos para Probar

### 1. Iniciar el servidor de desarrollo

```bash
npm run dev
```

### 2. Iniciar sesión como docente

- Email: (usar un usuario con rol docente)
- Contraseña: (contraseña del usuario)

### 3. Navegar a "Notas Parciales"

Hacer click en el menú lateral y seleccionar "Notas Parciales"

### 4. Registrar una nueva nota

1. Click en el botón **"Registrar Nota"** (esquina superior derecha)
2. Se abrirá un formulario con:
   - Selector de **Grupo**
   - Selector de **Asignatura**
   - Selector de **Estudiante**

### 5. Completar selecciones

1. **Seleccionar Grupo**: Debe mostrar solo los grupos asignados al docente
2. **Seleccionar Asignatura**: Debe mostrar solo las asignaturas asignadas al docente
3. **Seleccionar Estudiante**: Al seleccionar un grupo, debe cargar los estudiantes de ese grupo

### 6. Usar la calculadora

Una vez seleccionados todos los campos, aparecerá la calculadora:

#### Configuración de categorías (opcional)

- **Actitudinal**: Por defecto 10%
- **Procedimental**: Por defecto 40%
- **Cognitiva**: Por defecto 50%

Puede ajustar:
- Los porcentajes (validará que el total no supere 100%)
- La cantidad de notas por categoría (botones +/- o input directo)

#### Ingresar notas

1. En la tabla, ingresar valores entre 0 y 100 en cada celda
2. Los promedios y ponderaciones se calculan automáticamente
3. La nota final se muestra en el banner azul

### 7. Guardar la nota

1. Click en **"Guardar Nota"**
2. Debe aparecer un alert "Nota guardada exitosamente"
3. El formulario se cierra automáticamente
4. La nueva nota debe aparecer en el listado de notas

### 8. Verificar la nota guardada

En el listado de notas debe aparecer:
- La nota final calculada
- El nombre del estudiante
- La asignatura y grupo
- Fecha de creación

## Validaciones a Verificar

### En la configuración
- ✅ No permite que el total de porcentajes supere 100%
- ✅ Cantidad de notas entre 1 y 20
- ✅ Indicador visual cuando el total es > 100% (rojo)

### En el ingreso de notas
- ✅ Solo permite números y punto decimal
- ✅ Muestra icono de alerta si el valor es inválido (< 0 o > 100)
- ✅ Los cálculos se actualizan en tiempo real

### En el guardado
- ✅ Valida que todos los campos estén completos
- ✅ Valida que se hayan calculado las notas
- ✅ Muestra indicador de carga mientras guarda
- ✅ Recarga automáticamente el listado de notas

## Casos de Prueba Específicos

### Caso 1: Nota perfecta
- Actitudinal (10%): [100, 100, 100] → 100 × 0.10 = 10
- Procedimental (40%): [100, 100, 100] → 100 × 0.40 = 40
- Cognitiva (50%): [100, 100, 100] → 100 × 0.50 = 50
- **Resultado esperado: 100.00**

### Caso 2: Nota mixta
- Actitudinal (10%): [80, 85, 90] → 85 × 0.10 = 8.5
- Procedimental (40%): [70, 75, 80] → 75 × 0.40 = 30
- Cognitiva (50%): [90, 92, 88] → 90 × 0.50 = 45
- **Resultado esperado: 83.50**

### Caso 3: Diferentes cantidades de notas
- Actitudinal (10%): [90] (1 nota) → 90 × 0.10 = 9
- Procedimental (40%): [80, 85] (2 notas) → 82.5 × 0.40 = 33
- Cognitiva (50%): [95, 90, 92, 88] (4 notas) → 91.25 × 0.50 = 45.63
- **Resultado esperado: 87.63**

### Caso 4: Pesos personalizados
- Actitudinal (20%): [80, 90] → 85 × 0.20 = 17
- Procedimental (30%): [70, 75] → 72.5 × 0.30 = 21.75
- Cognitiva (50%): [90, 95] → 92.5 × 0.50 = 46.25
- **Resultado esperado: 85.00**

## Verificación en Base de Datos

Puede verificar los datos guardados ejecutando en Supabase SQL Editor:

```sql
-- Ver la última nota registrada
SELECT 
  n.*,
  e.nombre_completo as estudiante,
  a.nombre as asignatura,
  g.nombre as grupo
FROM notas n
JOIN profiles e ON n.estudiante_id = e.id
JOIN asignaturas a ON n.asignatura_id = a.id
JOIN grupos g ON n.grupo_id = g.id
ORDER BY n.created_at DESC
LIMIT 1;

-- Ver el desglose en observaciones (formato JSON)
SELECT 
  nota,
  observaciones::json
FROM notas
ORDER BY created_at DESC
LIMIT 1;
```

## Posibles Errores

### Error: "No hay grupos o asignaturas disponibles"
**Causa**: El docente no tiene asignaciones en `asignaciones_docentes`
**Solución**: Crear asignaciones en el panel de administración (Asignaturas tab)

### Error: "No hay estudiantes en el grupo"
**Causa**: No hay registros en `estudiantes_grupos` para ese grupo
**Solución**: Asignar estudiantes al grupo desde el panel de administración

### Error: "new row violates check constraint"
**Causa**: La nota final es menor a 10
**Solución**: Ajustar las notas para que el promedio final sea ≥ 10

### Error: "duplicate key value violates unique constraint"
**Causa**: Ya existe una nota para ese estudiante/asignatura/periodo
**Solución**: Eliminar la nota existente primero o cambiar de estudiante/asignatura/periodo

## Botón de Reiniciar

El botón "Reiniciar" en la calculadora:
- Limpia todas las notas ingresadas
- Mantiene la configuración de pesos y cantidad de notas
- Útil para empezar desde cero sin cerrar el formulario

## Botón Cancelar

El botón "Cancelar" en el formulario:
- Cierra el formulario completo
- Limpia todas las selecciones
- Regresa a la vista normal de notas
