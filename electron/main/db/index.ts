import Database from 'better-sqlite3'
import { runMigrations } from './migrations'

export type AppDatabase = Database.Database

export function createDatabase(dbPath: string): AppDatabase {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  db.pragma('cache_size = -8000')
  db.pragma('busy_timeout = 5000')
  runMigrations(db)
  return db
}

let instance: AppDatabase | null = null

export function initDatabase(dbPath: string): AppDatabase {
  instance = createDatabase(dbPath)
  return instance
}

export function getDatabase(): AppDatabase {
  if (!instance) throw new Error('Database not initialized. Call initDatabase first.')
  return instance
}
