import { randomUUID } from 'expo-crypto'

export const generateId = (): string => randomUUID()

export const now = (): number => Date.now()

export const todayIso = (): string => new Date().toISOString().split('T')[0]
