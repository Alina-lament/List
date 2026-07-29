import { randomUUID } from 'crypto'
import type { AppDatabase } from '../index'
import type { JournalEntry } from '@shared/types'

export interface JournalRepository {
  getByDate(date: string): JournalEntry | null
  getByDateRange(start: string, end: string): JournalEntry[]
  save(date: string, content: string): JournalEntry
  remove(date: string): void
  getLastYear(date: string): JournalEntry | null
  getMarkedDates(start: string, end: string): string[]
}

const SELECT_JOURNAL = 'SELECT * FROM journals WHERE id = ?'

export function createJournalRepository(db: AppDatabase): JournalRepository {
  return {
    getByDate(date) {
      return (db.prepare('SELECT * FROM journals WHERE date = ?').get(date) as JournalEntry | undefined) ?? null
    },

    getByDateRange(start, end) {
      return db.prepare('SELECT * FROM journals WHERE date >= ? AND date <= ? ORDER BY date DESC').all(start, end) as JournalEntry[]
    },

    save(date, content) {
      const now = new Date().toISOString()
      const existing = db.prepare('SELECT * FROM journals WHERE date = ?').get(date) as JournalEntry | undefined

      if (existing) {
        db.prepare('UPDATE journals SET content = ?, updated_at = ? WHERE id = ?').run(content, now, existing.id)
        return db.prepare(SELECT_JOURNAL).get(existing.id) as JournalEntry
      }

      const id = randomUUID()
      db.prepare('INSERT INTO journals (id, date, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        id,
        date,
        content,
        now,
        now,
      )
      return db.prepare(SELECT_JOURNAL).get(id) as JournalEntry
    },

    remove(date) {
      db.prepare('DELETE FROM journals WHERE date = ?').run(date)
    },

    getLastYear(date) {
      const d = new Date(date)
      d.setFullYear(d.getFullYear() - 1)
      const lastYear = d.toISOString().slice(0, 10)
      return (db.prepare('SELECT * FROM journals WHERE date = ?').get(lastYear) as JournalEntry | undefined) ?? null
    },

    getMarkedDates(start, end) {
      const rows = db.prepare('SELECT date FROM journals WHERE date >= ? AND date <= ?').all(start, end) as { date: string }[]
      return rows.map((r) => r.date)
    },
  }
}
