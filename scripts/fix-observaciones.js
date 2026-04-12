#!/usr/bin/env node

/**
 * Backfill helper: detect and normalize malformed `notas.observaciones` values.
 *
 * Usage:
 *   - Dry run (no writes):
 *       SUPABASE_URL="https://<project>.supabase.co" SUPABASE_ANON_KEY="<anon-or-publishable-key>" node scripts/fix-observaciones.js
 *
 *   - Apply updates (writes to DB, explicit opt-in required):
 *       SUPABASE_URL="https://<project>.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<service-role>" node scripts/fix-observaciones.js --apply
 *
 * Notes:
 *   - `--apply` requires SUPABASE_SERVICE_ROLE_KEY.
 *   - Dry run reports rows that can be normalized and rows that need manual inspection.
 */

import { createClient } from '@supabase/supabase-js'

const tryParseJson = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const stripOuterQuotes = (value) => {
  if (typeof value !== 'string' || value.length < 2) {
    return value
  }

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }

  return value
}

export const normalizeObservacionesValue = (rawValue) => {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    return {
      normalized: null,
      reason: 'manual_inspection_required',
    }
  }

  const directParsed = tryParseJson(rawValue)
  if (typeof directParsed === 'string') {
    const secondPass = tryParseJson(directParsed)
    if (secondPass && typeof secondPass === 'object' && !Array.isArray(secondPass)) {
      return {
        normalized: JSON.stringify(secondPass),
        reason: 'parsed_json_object',
      }
    }
  }

  if (directParsed && typeof directParsed === 'object' && !Array.isArray(directParsed)) {
    return {
      normalized: JSON.stringify(directParsed),
      reason: 'parsed_json_object',
    }
  }

  const withoutOuterQuotes = stripOuterQuotes(rawValue)
  const reparsed = tryParseJson(withoutOuterQuotes)
  if (typeof reparsed === 'string') {
    const secondPass = tryParseJson(reparsed)
    if (secondPass && typeof secondPass === 'object' && !Array.isArray(secondPass)) {
      return {
        normalized: JSON.stringify(secondPass),
        reason: 'parsed_after_outer_quote_strip',
      }
    }
  }

  if (reparsed && typeof reparsed === 'object' && !Array.isArray(reparsed)) {
    return {
      normalized: JSON.stringify(reparsed),
      reason: 'parsed_after_outer_quote_strip',
    }
  }

  return {
    normalized: null,
    reason: 'manual_inspection_required',
  }
}

export const collectObservacionesNormalizationReport = (rows) => {
  const toUpdate = []
  const manualReview = []

  for (const row of rows) {
    if (row.observaciones == null) {
      continue
    }

    const { normalized, reason } = normalizeObservacionesValue(row.observaciones)

    if (normalized === null) {
      manualReview.push({
        id: row.id,
        original: row.observaciones,
        reason,
      })
      continue
    }

    if (normalized !== row.observaciones) {
      toUpdate.push({
        id: row.id,
        original: row.observaciones,
        normalized,
        reason,
      })
    }
  }

  return {
    totalRows: rows.length,
    toUpdate,
    manualReview,
  }
}

const readEnv = (name) => process.env[name] || ''

const createSupabaseClient = ({ applyMode }) => {
  const supabaseUrl = readEnv('SUPABASE_URL')

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable.')
  }

  if (applyMode) {
    const serviceRole = readEnv('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceRole) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for --apply mode.')
    }

    return createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    })
  }

  const fallbackKey = readEnv('SUPABASE_ANON_KEY')
  if (!fallbackKey) {
    throw new Error('Missing SUPABASE_ANON_KEY for dry-run mode.')
  }

  return createClient(supabaseUrl, fallbackKey, {
    auth: { persistSession: false },
  })
}

const run = async ({ applyMode }) => {
  const supabase = createSupabaseClient({ applyMode })

  const { data, error } = await supabase
    .from('notas')
    .select('id, observaciones')
    .not('observaciones', 'is', null)

  if (error) {
    throw new Error(`Failed to load notas: ${error.message}`)
  }

  const rows = data || []
  const report = collectObservacionesNormalizationReport(rows)

  console.log('[fix-observaciones] mode:', applyMode ? 'APPLY' : 'DRY-RUN')
  console.log('[fix-observaciones] rows scanned:', report.totalRows)
  console.log('[fix-observaciones] rows to normalize:', report.toUpdate.length)
  console.log('[fix-observaciones] rows for manual review:', report.manualReview.length)

  if (report.toUpdate.length > 0) {
    console.log('\n[fix-observaciones] Proposed updates:')
    for (const row of report.toUpdate) {
      console.log(`- id=${row.id}`)
      console.log(`  original:   ${row.original}`)
      console.log(`  normalized: ${row.normalized}`)
      console.log(`  reason:     ${row.reason}`)
    }
  }

  if (report.manualReview.length > 0) {
    console.log('\n[fix-observaciones] Manual inspection required:')
    for (const row of report.manualReview) {
      console.log(`- id=${row.id}`)
      console.log(`  original: ${row.original}`)
      console.log(`  reason:   ${row.reason}`)
    }
  }

  if (!applyMode || report.toUpdate.length === 0) {
    return
  }

  for (const row of report.toUpdate) {
    const { error: updateError } = await supabase
      .from('notas')
      .update({ observaciones: row.normalized })
      .eq('id', row.id)

    if (updateError) {
      throw new Error(`Failed to update nota ${row.id}: ${updateError.message}`)
    }
  }

  console.log('\n[fix-observaciones] Applied updates:', report.toUpdate.length)
}

const isDirectExecution = (() => {
  const currentPath = new URL(import.meta.url).pathname
  const entryPath = process.argv[1]
  return entryPath ? currentPath.endsWith(entryPath) : false
})()

if (isDirectExecution) {
  const applyMode = process.argv.includes('--apply')

  run({ applyMode }).catch((error) => {
    console.error('[fix-observaciones] ERROR:', error.message)
    process.exitCode = 1
  })
}
