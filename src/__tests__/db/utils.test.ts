jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-1234'),
}))

import { generateId, now, todayIso } from '@/db/utils'

describe('todayIso', () => {
  it('returns ISO date string (YYYY-MM-DD)', () => {
    const result = todayIso()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('matches current date', () => {
    const expected = new Date().toISOString().split('T')[0]
    expect(todayIso()).toBe(expected)
  })
})

describe('generateId', () => {
  it('returns mocked UUID', () => {
    expect(generateId()).toBe('test-uuid-1234')
  })
})

describe('now', () => {
  it('returns a number', () => {
    expect(typeof now()).toBe('number')
  })

  it('is close to Date.now()', () => {
    const before = Date.now()
    const result = now()
    const after = Date.now()
    expect(result).toBeGreaterThanOrEqual(before)
    expect(result).toBeLessThanOrEqual(after)
  })
})
