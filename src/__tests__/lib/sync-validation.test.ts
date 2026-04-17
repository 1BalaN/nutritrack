import { parseSyncPayload, validateSyncPayload } from '@/lib/sync-validation'

describe('sync-validation', () => {
  it('parses payload JSON', () => {
    const parsed = parseSyncPayload('{"id":"1","updatedAt":123}')
    expect(parsed.id).toBe('1')
    expect(parsed.updatedAt).toBe(123)
  })

  it('accepts valid update payload', () => {
    expect(() =>
      validateSyncPayload('product', 'update', { id: 'p1', updatedAt: 123, name: 'Eggs' })
    ).not.toThrow()
  })

  it('accepts delete payload without id in body', () => {
    expect(() => validateSyncPayload('product', 'delete', { updatedAt: 123 })).not.toThrow()
  })

  it('rejects missing id for non-delete operations', () => {
    expect(() => validateSyncPayload('meal_entry', 'create', { updatedAt: 123 })).toThrow(
      /Invalid payload id/
    )
  })

  it('rejects invalid updatedAt for non-delete operations', () => {
    expect(() => validateSyncPayload('recipe', 'update', { id: 'r1', updatedAt: NaN })).toThrow(
      /Invalid payload updatedAt/
    )
  })
})
