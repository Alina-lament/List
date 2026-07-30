import { randomUUID } from 'crypto'
import type { AppDatabase } from '../index'
import type { List } from '@shared/types'

export interface ListRepository {
  getAll(): List[]
  getById(id: string): List | undefined
  create(name: string, color?: string, icon?: string): List
  update(id: string, patch: { name?: string; color?: string; icon?: string }): List
  reorder(ids: string[]): void
  remove(id: string): void
}

export function createListRepository(db: AppDatabase): ListRepository {
  return {
    getAll() {
      return db.prepare('SELECT * FROM lists ORDER BY sort_order').all() as List[]
    },

    getById(id) {
      return db.prepare('SELECT * FROM lists WHERE id = ?').get(id) as List | undefined
    },

    create(name, color, icon) {
      const id = randomUUID()
      const now = new Date().toISOString()
      const next = (
        db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM lists').get() as {
          next: number
        }
      ).next
      db.prepare(
        'INSERT INTO lists (id, name, color, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(id, name, color ?? '#6366f1', icon ?? '', next, now, now)
      return db.prepare('SELECT * FROM lists WHERE id = ?').get(id) as List
    },

    update(id, patch) {
      const sets: string[] = []
      const values: unknown[] = []
      if (patch.name !== undefined) {
        sets.push('name = ?')
        values.push(patch.name)
      }
      if (patch.color !== undefined) {
        sets.push('color = ?')
        values.push(patch.color)
      }
      if (patch.icon !== undefined) {
        sets.push('icon = ?')
        values.push(patch.icon)
      }
      sets.push('updated_at = ?')
      values.push(new Date().toISOString(), id)
      db.prepare(`UPDATE lists SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return db.prepare('SELECT * FROM lists WHERE id = ?').get(id) as List
    },

    reorder(ids) {
      const stmt = db.prepare('UPDATE lists SET sort_order = ? WHERE id = ?')
      db.transaction(() => {
        ids.forEach((id, index) => stmt.run(index, id))
      })()
    },

    remove(id) {
      db.prepare('DELETE FROM lists WHERE id = ?').run(id)
    },
  }
}
