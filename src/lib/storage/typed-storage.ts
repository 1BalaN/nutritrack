type StorageAdapter = {
  getString: (key: string) => string | undefined
  getBoolean: (key: string) => boolean | undefined
  getNumber: (key: string) => number | undefined
  set: (key: string, value: boolean | string | number) => void
  remove: (key: string) => void
  clearAll: () => void
}

function createMemoryAdapter(): StorageAdapter {
  const memory = new Map<string, string>()

  return {
    getString: (key) => memory.get(key),
    getBoolean: (key) => {
      const value = memory.get(key)
      if (value === undefined) return undefined
      return value === 'true'
    },
    getNumber: (key) => {
      const value = memory.get(key)
      if (value === undefined) return undefined
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : undefined
    },
    set: (key, value) => memory.set(key, String(value)),
    remove: (key) => {
      memory.delete(key)
    },
    clearAll: () => {
      memory.clear()
    },
  }
}

function createStorageAdapter(): StorageAdapter {
  try {
    // Lazy require prevents crash in Expo Go when Nitro modules are unavailable.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv') as {
      createMMKV: (config: { id: string }) => StorageAdapter
    }
    return createMMKV({ id: 'nutritrack-storage' })
  } catch {
    return createMemoryAdapter()
  }
}

const mmkv = createStorageAdapter()

function getJson<T>(key: string, fallback: T): T {
  try {
    const raw = mmkv.getString(key)
    if (raw === undefined) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function setJson<T>(key: string, value: T): void {
  mmkv.set(key, JSON.stringify(value))
}

function getString(key: string): string | undefined {
  return mmkv.getString(key)
}

function setString(key: string, value: string): void {
  mmkv.set(key, value)
}

function getBoolean(key: string, fallback = false): boolean {
  return mmkv.getBoolean(key) ?? fallback
}

function setBoolean(key: string, value: boolean): void {
  mmkv.set(key, value)
}

function getNumber(key: string, fallback = 0): number {
  return mmkv.getNumber(key) ?? fallback
}

function setNumber(key: string, value: number): void {
  mmkv.set(key, value)
}

function remove(key: string): void {
  mmkv.remove(key)
}

function clearAll(): void {
  mmkv.clearAll()
}

export const typedStorage = {
  getJson,
  setJson,
  getString,
  setString,
  getBoolean,
  setBoolean,
  getNumber,
  setNumber,
  remove,
  clearAll,
  /** Direct access to the underlying MMKV instance when needed */
  raw: mmkv,
}
