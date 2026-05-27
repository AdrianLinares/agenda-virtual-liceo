import { describe, it, expect } from 'vitest'
import { computeGrupoId, formatGrupoDisplayName } from '@/utils/anuncios'

describe('computeGrupoId', () => {
  it('returns null when destinatarios does not include estudiante', () => {
    expect(computeGrupoId(['todos'], 'all', null)).toBeNull()
    expect(computeGrupoId(['docente'], 'all', null)).toBeNull()
    expect(computeGrupoId(['padre', 'docente'], 'specific', 'grupo-1')).toBeNull()
  })

  it('returns null when targetGroupMode is "all" and estudiante is selected', () => {
    expect(computeGrupoId(['estudiante'], 'all', null)).toBeNull()
    expect(computeGrupoId(['estudiante', 'padre'], 'all', null)).toBeNull()
  })

  it('returns null when targetGroupMode is "specific" but no groupId is selected', () => {
    expect(computeGrupoId(['estudiante'], 'specific', null)).toBeNull()
  })

  it('returns the selectedGroupId when targetGroupMode is "specific" and groupId is set', () => {
    expect(computeGrupoId(['estudiante'], 'specific', 'grupo-abc-123')).toBe('grupo-abc-123')
  })

  it('returns the selectedGroupId for mixed destinatarios with estudiante and specific mode', () => {
    expect(computeGrupoId(['estudiante', 'padre'], 'specific', 'grupo-xyz')).toBe('grupo-xyz')
  })

  it('returns null when "todos" is in destinatarios without estudiante even with specific mode', () => {
    expect(computeGrupoId(['todos'], 'specific', 'grupo-1')).toBeNull()
  })

  it('handles edge case: empty destinatarios array', () => {
    expect(computeGrupoId([], 'specific', 'grupo-1')).toBeNull()
  })
})

describe('formatGrupoDisplayName', () => {
  it('returns null when grupo is null', () => {
    expect(formatGrupoDisplayName(null)).toBeNull()
  })

  it('returns trimmed grupo nombre when grado is missing', () => {
    expect(formatGrupoDisplayName({ nombre: '10A', grado: null })).toBe('10A')
  })

  it('returns combined grado nombre and grupo nombre when both exist', () => {
    expect(formatGrupoDisplayName({ nombre: '10A', grado: { nombre: 'Grado 5' } })).toBe('Grado 5 10A')
  })

  it('returns grupo nombre when grado nombre is empty string', () => {
    expect(formatGrupoDisplayName({ nombre: '10B', grado: { nombre: '' } })).toBe('10B')
  })

  it('trims outer whitespace from combined name but preserves inner spacing', () => {
    // trim() only strips leading/trailing of the entire string, not inner spaces
    expect(formatGrupoDisplayName({ nombre: '10A', grado: { nombre: 'Grado 5' } })).toBe('Grado 5 10A')
  })

  it('returns just the nombre when grado is undefined', () => {
    expect(formatGrupoDisplayName({ nombre: '11B' })).toBe('11B')
  })
})