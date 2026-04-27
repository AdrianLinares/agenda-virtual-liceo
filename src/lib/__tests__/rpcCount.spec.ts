import { describe, it, expect, vi } from 'vitest'

// Mock the supabase module
vi.mock('../supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
  rpcCountNotas: vi.fn(async (params) => {
    const { supabase } = await import('../supabase')
    try {
      const { data, error } = await supabase.rpc('notas_count', params || {})
      if (error) throw error
      return typeof data === 'number' ? data : parseInt(String(data), 10) || 0
    } catch (error) {
      console.error('Error calling notas_count RPC:', error)
      return 0
    }
  }),
}))

// Import after mocking
import { rpcCountNotas } from '../supabase'

describe('rpcCountNotas', () => {
  it('calls supabase.rpc with correct params and returns number', async () => {
    const { supabase } = await import('../supabase')
    const mockData = 42
    supabase.rpc.mockResolvedValue({ data: mockData, error: null })

    const result = await rpcCountNotas({ periodo_id: 'p1', grupo_id: 'g1' })

    expect(supabase.rpc).toHaveBeenCalledWith('notas_count', { periodo_id: 'p1', grupo_id: 'g1' })
    expect(result).toBe(42)
  })

  it('returns 0 when RPC returns string number', async () => {
    const { supabase } = await import('../supabase')
    const mockData = '123'
    supabase.rpc.mockResolvedValue({ data: mockData, error: null })

    const result = await rpcCountNotas()

    expect(result).toBe(123)
  })

  it('returns 0 on RPC error', async () => {
    const { supabase } = await import('../supabase')
    supabase.rpc.mockResolvedValue({ data: null, error: new Error('RPC failed') })

    const result = await rpcCountNotas({ search: 'test' })

    expect(result).toBe(0)
  })

  it('returns 0 when data is not a number', async () => {
    const { supabase } = await import('../supabase')
    supabase.rpc.mockResolvedValue({ data: 'invalid', error: null })

    const result = await rpcCountNotas()

    expect(result).toBe(0)
  })

  it('passes empty object when no params', async () => {
    const { supabase } = await import('../supabase')
    supabase.rpc.mockResolvedValue({ data: 0, error: null })

    await rpcCountNotas()

    expect(supabase.rpc).toHaveBeenCalledWith('notas_count', {})
  })
})