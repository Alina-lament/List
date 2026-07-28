import { randomUUID } from 'crypto'
import type { AppDatabase } from '../index'
import type {
  CreateExceptionInput,
  CreateTaskInput,
  DueReminder,
  Task,
  TaskException,
  TasksByRangeResult,
  UpdateTaskInput,
} from '@shared/types'

export interface TaskRepository {
  getByDateRange(start: string, end: string): TasksByRangeResult
  getByList(listId: string): Task[]
  getById(id: string): Task | undefined
  create(input: CreateTaskInput): Task
  update(id: string, patch: UpdateTaskInput): Task
  updateDueDate(id: string, dueDate: string | null): void
  reorder(listId: string, taskIds: string[]): void
  setCompleted(id: string, completed: boolean): void
  remove(id: string): void
  createException(input: CreateExceptionInput): TaskException
  findDueReminders(nowLocal: string, today: string): DueReminder[]
  markReminded(taskId: string, atIso: string): void
}

const TASK_COLUMNS = `id, list_id, title, description, is_completed, due_date, due_time,
  priority, sort_order, is_recurring, rrule, rrule_end_date, reminder_minutes,
  last_reminded_at, parent_task_id, created_at, updated_at`

const UPDATABLE_FIELDS = [
  'list_id',
  'title',
  'description',
  'is_completed',
  'due_date',
  'due_time',
  'priority',
  'is_recurring',
  'rrule',
  'rrule_end_date',
  'reminder_minutes',
  'parent_task_id',
] as const

export function createTaskRepository(db: AppDatabase): TaskRepository {
  function getById(id: string): Task | undefined {
    return db.prepare(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ?`).get(id) as Task | undefined
  }

  function replaceTags(taskId: string, tagIds: string[]): void {
    db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId)
    const insert = db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)')
    for (const tagId of tagIds) insert.run(taskId, tagId)
  }

  return {
    getById,

    getByDateRange(start, end) {
      const nonRecurring = db
        .prepare(
          `SELECT ${TASK_COLUMNS} FROM tasks
           WHERE due_date BETWEEN ? AND ? AND is_recurring = 0
           ORDER BY due_date, priority DESC, sort_order`,
        )
        .all(start, end) as Task[]

      const recurring = db
        .prepare(
          `SELECT ${TASK_COLUMNS} FROM tasks
           WHERE is_recurring = 1 AND is_completed = 0
             AND (rrule_end_date IS NULL OR rrule_end_date >= ?)
             AND (due_date IS NULL OR due_date <= ?)`,
        )
        .all(start, end) as Task[]

      const exceptions = db
        .prepare('SELECT * FROM task_exceptions WHERE exception_date BETWEEN ? AND ?')
        .all(start, end) as TaskException[]

      const lists = db.prepare('SELECT * FROM lists ORDER BY sort_order').all()
      const tags = db.prepare('SELECT * FROM tags ORDER BY name').all()
      const taskTags = db.prepare('SELECT * FROM task_tags').all()

      return { nonRecurring, recurring, exceptions, lists, tags, taskTags } as TasksByRangeResult
    },

    getByList(listId) {
      return db
        .prepare(
          `SELECT ${TASK_COLUMNS} FROM tasks WHERE list_id = ?
           ORDER BY is_completed, sort_order`,
        )
        .all(listId) as Task[]
    },

    create(input) {
      const id = randomUUID()
      const now = new Date().toISOString()
      const nextOrder = (
        db
          .prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM tasks WHERE list_id = ?')
          .get(input.list_id) as { next: number }
      ).next

      db.transaction(() => {
        db.prepare(
          `INSERT INTO tasks (
             id, list_id, title, description, is_completed, due_date, due_time,
             priority, sort_order, is_recurring, rrule, rrule_end_date,
             reminder_minutes, last_reminded_at, parent_task_id, created_at, updated_at
           ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
        ).run(
          id,
          input.list_id,
          input.title,
          input.description ?? '',
          input.due_date ?? null,
          input.due_time ?? null,
          input.priority ?? 0,
          nextOrder,
          input.is_recurring ?? 0,
          input.rrule ?? null,
          input.rrule_end_date ?? null,
          input.reminder_minutes ?? null,
          input.parent_task_id ?? null,
          now,
          now,
        )
        if (input.tag_ids?.length) replaceTags(id, input.tag_ids)
      })()

      return getById(id)!
    },

    update(id, patch) {
      const sets: string[] = []
      const values: unknown[] = []
      for (const field of UPDATABLE_FIELDS) {
        if (field in patch) {
          sets.push(`${field} = ?`)
          values.push(patch[field as keyof UpdateTaskInput])
        }
      }
      const now = new Date().toISOString()

      db.transaction(() => {
        if (sets.length > 0) {
          sets.push('updated_at = ?')
          values.push(now, id)
          const result = db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values)
          if (result.changes === 0) throw new Error(`Task not found: ${id}`)
        }
        if (patch.tag_ids) replaceTags(id, patch.tag_ids)
      })()

      const task = getById(id)
      if (!task) throw new Error(`Task not found: ${id}`)
      return task
    },

    updateDueDate(id, dueDate) {
      db.prepare('UPDATE tasks SET due_date = ?, updated_at = ? WHERE id = ?').run(
        dueDate,
        new Date().toISOString(),
        id,
      )
    },

    reorder(listId, taskIds) {
      const stmt = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ? AND list_id = ?')
      db.transaction(() => {
        taskIds.forEach((taskId, index) => stmt.run(index, taskId, listId))
      })()
    },

    setCompleted(id, completed) {
      db.prepare('UPDATE tasks SET is_completed = ?, updated_at = ? WHERE id = ?').run(
        completed ? 1 : 0,
        new Date().toISOString(),
        id,
      )
    },

    remove(id) {
      db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    },

    createException(input) {
      const id = randomUUID()
      const now = new Date().toISOString()
      db.prepare(
        `INSERT INTO task_exceptions (
           id, task_id, exception_date, action, title, description,
           is_completed, due_time, priority, reminder_minutes, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(task_id, exception_date) DO UPDATE SET
           action = excluded.action,
           title = excluded.title,
           description = excluded.description,
           is_completed = excluded.is_completed,
           due_time = excluded.due_time,
           priority = excluded.priority,
           reminder_minutes = excluded.reminder_minutes`,
      ).run(
        id,
        input.task_id,
        input.exception_date,
        input.action,
        input.title ?? null,
        input.description ?? null,
        input.is_completed ?? null,
        input.due_time ?? null,
        input.priority ?? null,
        input.reminder_minutes ?? null,
        now,
      )
      return db
        .prepare('SELECT * FROM task_exceptions WHERE task_id = ? AND exception_date = ?')
        .get(input.task_id, input.exception_date) as TaskException
    },

    findDueReminders(nowLocal, today) {
      return db
        .prepare(
          `SELECT id AS task_id, title, due_date, due_time, reminder_minutes
           FROM tasks
           WHERE reminder_minutes IS NOT NULL
             AND due_date = ?
             AND due_time IS NOT NULL
             AND is_completed = 0
             AND is_recurring = 0
             AND strftime('%Y-%m-%dT%H:%M:%S', due_date || 'T' || due_time || ':00', '-' || reminder_minutes || ' minutes') <= ?
             AND last_reminded_at IS NULL`,
        )
        .all(today, nowLocal) as DueReminder[]
    },

    markReminded(taskId, atIso) {
      db.prepare('UPDATE tasks SET last_reminded_at = ? WHERE id = ?').run(atIso, taskId)
    },
  }
}
