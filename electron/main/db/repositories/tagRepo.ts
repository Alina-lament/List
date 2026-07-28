import { randomUUID } from 'crypto'
import type { AppDatabase } from '../index'
import type { Tag, TaskTag } from '@shared/types'

export interface TagRepository {
  getAll(): Tag[]
  getAllTaskTags(): TaskTag[]
  create(name: string, color?: string): Tag
  remove(id: string): void
  addToTask(taskId: string, tagId: string): void
  removeFromTask(taskId: string, tagId: string): void
  getForTask(taskId: string): Tag[]
}

export function createTagRepository(db: AppDatabase): TagRepository {
  return {
    getAll() {
      return db.prepare('SELECT * FROM tags ORDER BY name').all() as Tag[]
    },

    getAllTaskTags() {
      return db.prepare('SELECT * FROM task_tags').all() as TaskTag[]
    },

    create(name, color) {
      const id = randomUUID()
      db.prepare('INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)').run(
        id,
        name,
        color ?? '#6366f1',
        new Date().toISOString(),
      )
      return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag
    },

    remove(id) {
      db.prepare('DELETE FROM tags WHERE id = ?').run(id)
    },

    addToTask(taskId, tagId) {
      db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(taskId, tagId)
    },

    removeFromTask(taskId, tagId) {
      db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?').run(taskId, tagId)
    },

    getForTask(taskId) {
      return db
        .prepare(
          'SELECT t.* FROM tags t JOIN task_tags tt ON tt.tag_id = t.id WHERE tt.task_id = ? ORDER BY t.name',
        )
        .all(taskId) as Tag[]
    },
  }
}
