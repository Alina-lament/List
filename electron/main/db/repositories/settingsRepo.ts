import type { AppDatabase } from '../index'
import type { SettingsRow } from '@shared/types'

export interface SettingsRepository {
  getAll(): SettingsRow[]
  get(key: string): SettingsRow | undefined
  set(key: string, value: string): SettingsRow
}

export function createSettingsRepository(db: AppDatabase): SettingsRepository {
  return {
    getAll() {
      return db.prepare('SELECT key, value, updated_at FROM settings').all() as SettingsRow[]
    },

    get(key: string) {
      return db.prepare('SELECT key, value, updated_at FROM settings WHERE key = ?').get(key) as
        | SettingsRow
        | undefined
    },

    set(key: string, value: string) {
      const now = new Date().toISOString()
      db.transaction(() => {
        db.prepare(
          `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        ).run(key, value, now)
      })()
      return db.prepare('SELECT key, value, updated_at FROM settings WHERE key = ?').get(key) as SettingsRow
    },
  }
}
