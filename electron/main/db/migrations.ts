import type { AppDatabase } from './index'

const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE lists (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        color       TEXT DEFAULT '#6366f1',
        sort_order  INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );

      CREATE TABLE tasks (
        id               TEXT PRIMARY KEY,
        list_id          TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        title            TEXT NOT NULL,
        description      TEXT DEFAULT '',
        is_completed     INTEGER NOT NULL DEFAULT 0,
        due_date         TEXT,
        due_time         TEXT,
        priority         INTEGER NOT NULL DEFAULT 0,
        sort_order       INTEGER NOT NULL DEFAULT 0,
        is_recurring     INTEGER NOT NULL DEFAULT 0,
        rrule            TEXT,
        rrule_end_date   TEXT,
        reminder_minutes INTEGER,
        last_reminded_at TEXT,
        parent_task_id   TEXT REFERENCES tasks(id) ON DELETE SET NULL,
        created_at       TEXT NOT NULL,
        updated_at       TEXT NOT NULL
      );

      CREATE TABLE task_exceptions (
        id               TEXT PRIMARY KEY,
        task_id          TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        exception_date   TEXT NOT NULL,
        action           TEXT NOT NULL CHECK(action IN ('modified','deleted')),
        title            TEXT,
        description      TEXT,
        is_completed     INTEGER,
        due_time         TEXT,
        priority         INTEGER,
        reminder_minutes INTEGER,
        created_at       TEXT NOT NULL,
        UNIQUE(task_id, exception_date)
      );

      CREATE TABLE tags (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        color      TEXT NOT NULL DEFAULT '#6366f1',
        created_at TEXT NOT NULL
      );

      CREATE TABLE task_tags (
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, tag_id)
      ) WITHOUT ROWID;

      CREATE INDEX idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX idx_tasks_list_completed ON tasks(list_id, is_completed);
      CREATE INDEX idx_tasks_list_sort ON tasks(list_id, sort_order);
      CREATE INDEX idx_tasks_recurring ON tasks(is_recurring) WHERE is_recurring = 1;
      CREATE INDEX idx_exceptions_task_date ON task_exceptions(task_id, exception_date);
      CREATE INDEX idx_task_tags_tag_id ON task_tags(tag_id);
      CREATE INDEX idx_tasks_reminder ON tasks(reminder_minutes, last_reminded_at)
        WHERE reminder_minutes IS NOT NULL;
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      INSERT INTO settings (key, value, updated_at) VALUES
        ('sidebarBg',   '#f4f5f7', datetime('now')),
        ('canvasBg',    '#fdfdfc', datetime('now')),
        ('cardBg',      '#ffffff', datetime('now')),
        ('royal',       '#4f6ef7', datetime('now')),
        ('royalDark',   '#3d5ce5', datetime('now')),
        ('royalLight',  '#7b93fa', datetime('now')),
        ('royal50',     '#eef1fe', datetime('now')),
        ('ink',         '#0f172a', datetime('now')),
        ('ink2',        '#334155', datetime('now')),
        ('ink3',        '#64748b', datetime('now')),
        ('borderColor', '#eaecf0', datetime('now')),
        ('prihigh',     '#f43f5e', datetime('now')),
        ('primed',      '#f59e0b', datetime('now')),
        ('prilow',      '#22c55e', datetime('now')),
        ('bgImagePath', '',        datetime('now')),
        ('bgOpacity',   '30',      datetime('now')),
        ('bgBlur',      '0',       datetime('now')),
        ('bgScale',     'cover',   datetime('now')),
        ('appIconPath', '',        datetime('now'));
    `,
  },
]

export function runMigrations(db: AppDatabase): void {
  const current = db.pragma('user_version', { simple: true }) as number
  for (const migration of MIGRATIONS) {
    if (migration.version > current) {
      db.transaction(() => {
        db.exec(migration.sql)
        db.pragma(`user_version = ${migration.version}`)
      })()
    }
  }
}
