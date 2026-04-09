import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { useEffect } from 'react'
import { db } from './client'
import { seedProducts } from './seed'
import migrations from '../../drizzle/migrations'

export function useDatabaseMigrations() {
  const state = useMigrations(db, migrations)

  useEffect(() => {
    if (state.success) {
      seedProducts().catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[db] seed failed:', err)
      })
    }
  }, [state.success])

  return state
}
