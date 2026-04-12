import { describe, expect, it } from 'vitest'

import {
  collectObservacionesNormalizationReport,
  normalizeObservacionesValue,
} from '../../../scripts/fix-observaciones.js'

describe('fix-observaciones script helpers', () => {
  it('normaliza payload doble-stringify a JSON string canónico', () => {
    const payload = JSON.stringify(JSON.stringify({ actitudinal: { notas: [null, 80] } }))

    expect(normalizeObservacionesValue(payload)).toEqual({
      normalized: '{"actitudinal":{"notas":[null,80]}}',
      reason: 'parsed_json_object',
    })
  })

  it('reporta entradas no parseables para inspección manual', () => {
    expect(normalizeObservacionesValue('"actitudinal": {"notas": [80]}')).toEqual({
      normalized: null,
      reason: 'manual_inspection_required',
    })
  })

  it('genera reporte con cambios y pendientes manuales', () => {
    const report = collectObservacionesNormalizationReport([
      { id: '1', observaciones: JSON.stringify(JSON.stringify({ actitudinal: { notas: [80] } })) },
      { id: '2', observaciones: '"actitudinal": {"notas": [80]}' },
      { id: '3', observaciones: null },
    ])

    expect(report.toUpdate).toHaveLength(1)
    expect(report.toUpdate[0]).toMatchObject({ id: '1', normalized: '{"actitudinal":{"notas":[80]}}' })
    expect(report.manualReview).toHaveLength(1)
    expect(report.manualReview[0]).toMatchObject({ id: '2' })
  })
})
