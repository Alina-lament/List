import { randomUUID } from 'crypto'
import type { AppDatabase } from '../index'
import type { Countdown, CreateCountdownInput, UpdateCountdownInput } from '@shared/types'

export interface CountdownRepository {
  getAll(): Countdown[]
  create(input: CreateCountdownInput): Countdown
  update(id: string, patch: UpdateCountdownInput): Countdown
  remove(id: string): void
  advance(): void
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function createCountdownRepository(db: AppDatabase): CountdownRepository {
  return {
    getAll() {
      return db
        .prepare('SELECT * FROM countdowns ORDER BY target_date, created_at')
        .all() as Countdown[]
    },

    create(input) {
      const id = randomUUID()
      const now = new Date().toISOString()
      db.prepare(
        `INSERT INTO countdowns (id, title, target_date, bg_image_path, interval_days, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        input.title,
        input.target_date,
        input.bg_image_path ?? null,
        input.interval_days ?? null,
        0,
        now,
        now,
      )
      return db.prepare('SELECT * FROM countdowns WHERE id = ?').get(id) as Countdown
    },

    update(id, patch) {
      const sets: string[] = []
      const values: unknown[] = []
      if (patch.title !== undefined) {
        sets.push('title = ?')
        values.push(patch.title)
      }
      if (patch.target_date !== undefined) {
        sets.push('target_date = ?')
        values.push(patch.target_date)
      }
      if (patch.bg_image_path !== undefined) {
        sets.push('bg_image_path = ?')
        values.push(patch.bg_image_path)
      }
      if (patch.interval_days !== undefined) {
        sets.push('interval_days = ?')
        values.push(patch.interval_days)
      }
      sets.push('updated_at = ?')
      values.push(new Date().toISOString(), id)
      db.prepare(`UPDATE countdowns SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return db.prepare('SELECT * FROM countdowns WHERE id = ?').get(id) as Countdown
    },

    remove(id) {
      db.prepare('DELETE FROM countdowns WHERE id = ?').run(id)
    },

    advance() {
      const today = todayKey()
      const active = db
        .prepare('SELECT * FROM countdowns WHERE is_archived = 0 AND interval_days IS NOT NULL AND interval_days > 0')
        .all() as Countdown[]

      for (const c of active) {
        if (c.target_date >= today) continue

        const passedDates: string[] = []
        let nextDate = c.target_date
        while (nextDate < today) {
          passedDates.push(nextDate)
          nextDate = addDays(nextDate, c.interval_days!)
        }

        if (passedDates.length === 0) continue

        const now = new Date().toISOString()
        // 将已过去的日期归档为独立记录
        for (const date of passedDates) {
          db.prepare(
            `INSERT INTO countdowns (id, title, target_date, bg_image_path, interval_days, is_archived, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            randomUUID(),
            c.title,
            date,
            c.bg_image_path,
            c.interval_days,
            1,
            now,
            now,
          )
        }

        // 更新原记录到下一个未来日期
        db.prepare('UPDATE countdowns SET target_date = ?, updated_at = ? WHERE id = ?').run(
          nextDate,
          now,
          c.id,
        )
      }
    },
  }
}
