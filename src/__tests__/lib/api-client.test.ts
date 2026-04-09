jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })),
    isAxiosError: (err: unknown) => Boolean((err as { isAxiosError?: boolean })?.isAxiosError),
  }

  return {
    __esModule: true,
    default: mockAxios,
  }
})

import { normalizeError } from '@/lib/api/client'

describe('normalizeError', () => {
  it('handles axios-like error with response', () => {
    const err = {
      isAxiosError: true,
      message: 'Request failed',
      code: 'ERR_BAD_REQUEST',
      response: { status: 404, data: { message: 'Not found' } },
    }
    const result = normalizeError(err)
    expect(result.status).toBe(404)
    expect(result.message).toBe('Not found')
    expect(result.isNetworkError).toBe(false)
  })

  it('handles axios-like network error (no response)', () => {
    const err = {
      isAxiosError: true,
      message: 'Network Error',
      code: 'ERR_NETWORK',
      response: undefined,
    }
    const result = normalizeError(err)
    expect(result.isNetworkError).toBe(true)
    expect(result.status).toBeNull()
  })

  it('handles generic Error', () => {
    const result = normalizeError(new Error('something went wrong'))
    expect(result.message).toBe('something went wrong')
    expect(result.status).toBeNull()
    expect(result.isNetworkError).toBe(false)
  })

  it('handles unknown error', () => {
    const result = normalizeError('oops')
    expect(result.message).toBe('Unknown error')
  })
})
