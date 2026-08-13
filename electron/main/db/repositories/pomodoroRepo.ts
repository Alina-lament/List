import { randomUUID } from 'crypto'
import type { AppDatabase } from '../index'
import type { PomodoroRecord, CreatePomodoroInput, PomodoroStats } from '@shared/types'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface PomodoroRepository {
  create(input: CreatePomodoroInput): PomodoroRecord
  remove(id: string): void
  getByTaskId(taskId: string): PomodoroRecord[]
  getTodayRecords(): PomodoroRecord[]
  getRecentRecords(limit?: number): PomodoroRecord[]
  getTotalStats(): { count: number; totalSeconds: number }
  getStatsByTaskIds(taskIds: string[]): Record<string, PomodoroStats>
}

export function createPomodoroRepository(db: AppDatabase): PomodoroRepository {
  return {
    create(input) {
      const id = randomUUID()
      const now = new Date().toISOString()
      db.prepare(
        `INSERT INTO pomodoro_records (id, task_id, duration_seconds, started_at, completed_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        input.task_id ?? null,
        input.duration_seconds,
        input.started_at ?? null,
        input.completed_at ?? now,
        now,
      )
      return db.prepare('SELECT * FROM pomodoro_records WHERE id = ?').get(id) as PomodoroRecord
    },

    remove(id) {
      db.prepare('DELETE FROM pomodoro_records WHERE id = ?').run(id)
    },

    getByTaskId(taskId) {
      return db
        .prepare('SELECT * FROM pomodoro_records WHERE task_id = ? ORDER BY completed_at DESC')
        .all(taskId) as PomodoroRecord[]
    },

    getTodayRecords() {
      const today = todayKey()
      return db
        .prepare("SELECT * FROM pomodoro_records WHERE date(completed_at) = ? ORDER BY completed_at DESC")
        .all(today) as PomodoroRecord[]
    },

    getRecentRecords(limit = 100) {
      return db
        .prepare('SELECT * FROM pomodoro_records ORDER BY completed_at DESC LIMIT ?')
        .all(limit) as PomodoroRecord[]
    },

    getTotalStats() {
      const row = db
        .prepare('SELECT COUNT(*) AS count, COALESCE(SUM(duration_seconds), 0) AS total_seconds FROM pomodoro_records')
        .get() as { count: number; total_seconds: number } | undefined
      return {
        count: row?.count ?? 0,
        totalSeconds: row?.total_seconds ?? 0,
      }
    },

    getStatsByTaskIds(taskIds) {
      const stats: Record<string, PomodoroStats> = {}
      if (taskIds.length === 0) return stats
      const placeholders = taskIds.map(() => '?').join(',')
      const rows = db
        .prepare(
          `SELECT task_id, COUNT(*) AS count, COALESCE(SUM(duration_seconds), 0) AS total_seconds
           FROM pomodoro_records
           WHERE task_id IN (${placeholders})
           GROUP BY task_id`,
        )
        .all(...taskIds) as { task_id: string; count: number; total_seconds: number }[]
      for (const taskId of taskIds) {
        stats[taskId] = { count: 0, totalSeconds: 0 }
      }
      for (const row of rows) {
        stats[row.task_id] = { count: row.count, totalSeconds: row.total_seconds }
      }
      return stats
    },
  }
}
