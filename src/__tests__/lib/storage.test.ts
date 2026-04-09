jest.mock('@/lib/storage/typed-storage', () => ({
  typedStorage: {
    getJson: jest.fn(),
    setJson: jest.fn(),
    getString: jest.fn(),
    setString: jest.fn(),
    getBoolean: jest.fn(),
    setBoolean: jest.fn(),
    getNumber: jest.fn(),
    setNumber: jest.fn(),
    remove: jest.fn(),
    clearAll: jest.fn(),
  },
}))

import { appStorage } from '@/lib/storage/app-storage'

beforeEach(() => {
  jest.clearAllMocks()
})

function getMockTypedStorage() {
  return (
    jest.requireMock('@/lib/storage/typed-storage') as {
      typedStorage: {
        getJson: jest.Mock
        setJson: jest.Mock
        getString: jest.Mock
        setString: jest.Mock
        getBoolean: jest.Mock
        setBoolean: jest.Mock
        getNumber: jest.Mock
        setNumber: jest.Mock
        remove: jest.Mock
        clearAll: jest.Mock
      }
    }
  ).typedStorage
}

describe('appStorage.lastUsedProducts', () => {
  it('returns [] when empty', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getJson.mockReturnValue([])
    expect(appStorage.getLastUsedProducts()).toEqual([])
  })

  it('returns parsed array', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getJson.mockReturnValue(['p1', 'p2'])
    expect(appStorage.getLastUsedProducts()).toEqual(['p1', 'p2'])
  })

  it('returns [] on invalid JSON', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getJson.mockReturnValue([])
    expect(appStorage.getLastUsedProducts()).toEqual([])
  })

  it('addLastUsedProduct prepends and deduplicates', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getJson.mockReturnValue(['p2', 'p3'])
    appStorage.addLastUsedProduct('p2')
    expect(mockTypedStorage.setJson).toHaveBeenCalledWith('last_used_products', ['p2', 'p3'])
  })

  it('addLastUsedProduct adds new product at front', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getJson.mockReturnValue(['p2', 'p3'])
    appStorage.addLastUsedProduct('p1')
    expect(mockTypedStorage.setJson).toHaveBeenCalledWith('last_used_products', ['p1', 'p2', 'p3'])
  })

  it('limits to 15 entries', () => {
    const mockTypedStorage = getMockTypedStorage()
    const existing = Array.from({ length: 15 }, (_, i) => `p${i}`)
    mockTypedStorage.getJson.mockReturnValue(existing)
    appStorage.addLastUsedProduct('new')
    const saved = mockTypedStorage.setJson.mock.calls[0][1] as string[]
    expect(saved).toHaveLength(15)
    expect(saved[0]).toBe('new')
  })
})

describe('appStorage.theme', () => {
  it('returns system by default', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getString.mockReturnValue(undefined)
    expect(appStorage.getTheme()).toBe('system')
  })

  it('returns stored valid theme', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getString.mockReturnValue('dark')
    expect(appStorage.getTheme()).toBe('dark')
  })

  it('returns system for invalid value', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getString.mockReturnValue('invalid')
    expect(appStorage.getTheme()).toBe('system')
  })

  it('sets theme', () => {
    const mockTypedStorage = getMockTypedStorage()
    appStorage.setTheme('light')
    expect(mockTypedStorage.setString).toHaveBeenCalledWith('theme', 'light')
  })
})

describe('appStorage.onboarding', () => {
  it('returns false by default', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getBoolean.mockReturnValue(false)
    expect(appStorage.isOnboardingCompleted()).toBe(false)
  })

  it('returns true when set', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getBoolean.mockReturnValue(true)
    expect(appStorage.isOnboardingCompleted()).toBe(true)
  })

  it('sets onboarding completed', () => {
    const mockTypedStorage = getMockTypedStorage()
    appStorage.setOnboardingCompleted(true)
    expect(mockTypedStorage.setBoolean).toHaveBeenCalledWith('onboarding_completed', true)
  })
})

describe('appStorage.analyticsPeriod', () => {
  it('returns 7d by default', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getString.mockReturnValue(undefined)
    expect(appStorage.getAnalyticsPeriod()).toBe('7d')
  })

  it('returns stored valid period', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getString.mockReturnValue('30d')
    expect(appStorage.getAnalyticsPeriod()).toBe('30d')
  })
})

describe('appStorage.sync', () => {
  it('sync enabled by default', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getBoolean.mockReturnValue(true)
    expect(appStorage.isSyncEnabled()).toBe(true)
  })

  it('returns null lastSyncedAt when not set', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getNumber.mockReturnValue(0)
    expect(appStorage.getLastSyncedAt()).toBeNull()
  })

  it('returns timestamp when set', () => {
    const mockTypedStorage = getMockTypedStorage()
    mockTypedStorage.getNumber.mockReturnValue(1700000000000)
    expect(appStorage.getLastSyncedAt()).toBe(1700000000000)
  })
})
