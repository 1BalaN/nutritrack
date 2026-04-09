import { createMMKV } from 'react-native-mmkv'

const mmkv = createMMKV({ id: 'nutritrack-storage' })

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
