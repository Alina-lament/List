import { randomUUID } from 'crypto'
import type { AppDatabase } from '../index'
import type { CreateDailyRoutineInput, DailyCompletion, DailyRoutine, DailyRoutineItem, UpdateDailyRoutineInput } from '@shared/types'

const SELECT_ROUTINE = 'SELECT * FROM daily_routines WHERE id = ?'
const SELECT_COMPLETION = 'SELECT * FROM daily_completions WHERE id = ?'
const SELECT_ITEMS = 'SELECT * FROM daily_routine_items WHERE routine_id = ? ORDER BY sort_order'

export interface DailyRepository {
  getAll(): DailyRoutine[]
  create(input: CreateDailyRoutineInput): DailyRoutine
  update(id: string, patch: UpdateDailyRoutineInput): DailyRoutine
  remove(id: string): void
  getCompletions(date: string): DailyCompletion[]
  getCompletionsByRange(start: string, end: string): DailyCompletion[]
  increment(routineId: string, date: string, itemId?: string | null): DailyCompletion
  decrement(routineId: string, date: string, itemId?: string | null): DailyCompletion
}

/** 将 raw routine 行与它的 items 组合为完整 DailyRoutine */
function attachItems(db: AppDatabase, routine: Record<string, unknown>): DailyRoutine {
  const items = db.prepare(SELECT_ITEMS).all(routine.id as string) as DailyRoutineItem[]
  return { ...routine, items } as unknown as DailyRoutine
}

export function createDailyRepository(db: AppDatabase): DailyRepository {
  return {
    getAll() {
      const rows = db.prepare('SELECT * FROM daily_routines ORDER BY sort_order, created_at').all() as Record<string, unknown>[]
      return rows.map((r) => attachItems(db, r))
    },

    create(input) {
      const now = new Date().toISOString()
      const id = randomUUID()
      const txn = db.transaction(() => {
        db.prepare(
          `INSERT INTO daily_routines (id, title, description, target_count, list_id, priority, days_of_week, start_date, end_date, is_archived, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM daily_routines), ?, ?)`,
        ).run(id, input.title, input.description ?? '', input.target_count ?? 1, input.list_id, input.priority ?? 0, input.days_of_week ?? '[]', input.start_date ?? null, input.end_date ?? null, 0, now, now)

        // 创建子项
        if (input.items && input.items.length > 0) {
          const insertItem = db.prepare(
            'INSERT INTO daily_routine_items (id, routine_id, title, target_count, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          )
          input.items.forEach((item, i) => {
            insertItem.run(randomUUID(), id, item.title, item.target_count, i, now, now)
          })
        }

        return id
      })
      const routineId = txn()
      const row = db.prepare(SELECT_ROUTINE).get(routineId) as Record<string, unknown>
      return attachItems(db, row)
    },

    update(id, patch) {
      const sets: string[] = []
      const values: unknown[] = []
      const allowed: (keyof UpdateDailyRoutineInput)[] = ['title', 'description', 'target_count', 'list_id', 'priority', 'active', 'days_of_week', 'start_date', 'end_date', 'is_archived']
      for (const key of allowed) {
        if (patch[key] !== undefined) {
          sets.push(`${key} = ?`)
          values.push(patch[key])
        }
      }
      const txn = db.transaction(() => {
        if (sets.length > 0) {
          sets.push("updated_at = ?")
          values.push(new Date().toISOString())
          values.push(id)
          db.prepare(`UPDATE daily_routines SET ${sets.join(', ')} WHERE id = ?`).run(...values)
        }
        // 替换子项：删旧插新
        if (patch.items !== undefined) {
          db.prepare('DELETE FROM daily_routine_items WHERE routine_id = ?').run(id)
          if (patch.items.length > 0) {
            const now = new Date().toISOString()
            const insert = db.prepare(
              'INSERT INTO daily_routine_items (id, routine_id, title, target_count, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            )
            patch.items.forEach((item, i) => {
              insert.run(randomUUID(), id, item.title, item.target_count, i, now, now)
            })
          }
        }
      })
      txn()
      const row = db.prepare(SELECT_ROUTINE).get(id) as Record<string, unknown>
      return attachItems(db, row)
    },

    remove(id) {
      db.prepare('DELETE FROM daily_routines WHERE id = ?').run(id)
    },

    getCompletions(date) {
      return db.prepare('SELECT * FROM daily_completions WHERE date = ?').all(date) as DailyCompletion[]
    },

    getCompletionsByRange(start, end) {
      return db
        .prepare('SELECT * FROM daily_completions WHERE date >= ? AND date <= ?')
        .all(start, end) as DailyCompletion[]
    },

    increment(routineId, date, itemId) {
      const whereItem = itemId
        ? 'routine_id = ? AND item_id = ? AND date = ?'
        : 'routine_id = ? AND item_id IS NULL AND date = ?'
      const params = itemId ? [routineId, itemId, date] : [routineId, date]
      const existing = db
        .prepare(`SELECT * FROM daily_completions WHERE ${whereItem}`)
        .get(...params) as DailyCompletion | undefined

      if (existing) {
        db.prepare('UPDATE daily_completions SET count = count + 1 WHERE id = ?').run(existing.id)
        return db.prepare(SELECT_COMPLETION).get(existing.id) as DailyCompletion
      } else {
        const id = randomUUID()
        db.prepare(
          'INSERT INTO daily_completions (id, routine_id, item_id, date, count) VALUES (?, ?, ?, ?, 1)',
        ).run(id, routineId, itemId ?? null, date)
        return db.prepare(SELECT_COMPLETION).get(id) as DailyCompletion
      }
    },

    decrement(routineId, date, itemId) {
      const whereItem = itemId
        ? 'routine_id = ? AND item_id = ? AND date = ?'
        : 'routine_id = ? AND item_id IS NULL AND date = ?'
      const params = itemId ? [routineId, itemId, date] : [routineId, date]
      const existing = db
        .prepare(`SELECT * FROM daily_completions WHERE ${whereItem}`)
        .get(...params) as DailyCompletion | undefined

      if (!existing || existing.count <= 0) {
        if (!existing) {
          const id = randomUUID()
          db.prepare('INSERT OR IGNORE INTO daily_completions (id, routine_id, item_id, date, count) VALUES (?, ?, ?, ?, 0)').run(id, routineId, itemId ?? null, date)
        }
        return (db.prepare(`SELECT * FROM daily_completions WHERE ${whereItem}`).get(...params) ?? {
          id: '', routine_id: routineId, item_id: itemId ?? null, date, count: 0,
        }) as DailyCompletion
      }
      db.prepare('UPDATE daily_completions SET count = count - 1 WHERE id = ?').run(existing.id)
      return db.prepare(SELECT_COMPLETION).get(existing.id) as DailyCompletion
    },
  }
}
