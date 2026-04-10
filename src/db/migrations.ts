import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { useEffect, useState } from 'react'
import { db, sqlite } from './client'
import { seedProducts } from './seed'
import migrations from '../../drizzle/migrations'

export function useDatabaseMigrations() {
  const state = useMigrations(db, migrations)
  const [repairDone, setRepairDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function runPostMigrationTasks() {
      if (!state.success) return

      // Backward compatibility for already-installed DBs that may have missed m0002.
      const columns = new Set(
        (
          sqlite.getAllSync("PRAGMA table_info('products')") as Array<{
            name?: string
          }>
        )
          .map((row) => row.name)
          .filter(Boolean)
      )

      try {
        if (!columns.has('fatsecret_id')) {
          sqlite.execSync('ALTER TABLE products ADD COLUMN fatsecret_id text;')
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[db] add fatsecret_id failed:', err)
      }

      try {
        if (!columns.has('cached_at')) {
          sqlite.execSync('ALTER TABLE products ADD COLUMN cached_at integer;')
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[db] add cached_at failed:', err)
      }

      try {
        await seedProducts()
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[db] seed failed:', err)
      }

      if (!cancelled) setRepairDone(true)
    }

    if (state.success) {
      void runPostMigrationTasks()
    }

    return () => {
      cancelled = true
    }
  }, [state.success])

  return {
    ...state,
    success: state.success && repairDone,
  }
}
