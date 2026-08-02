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
  {
    version: 3,
    sql: `
      CREATE TABLE daily_routines (
        id            TEXT PRIMARY KEY,
        title         TEXT NOT NULL,
        description   TEXT DEFAULT '',
        target_count  INTEGER DEFAULT 1,
        list_id       TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        priority      INTEGER DEFAULT 0,
        active        INTEGER DEFAULT 1,
        days_of_week  TEXT DEFAULT '[]',
        sort_order    INTEGER DEFAULT 0,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );

      CREATE TABLE daily_completions (
        id         TEXT PRIMARY KEY,
        routine_id TEXT NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
        date       TEXT NOT NULL,
        count      INTEGER DEFAULT 0,
        UNIQUE(routine_id, date)
      );

      CREATE INDEX idx_daily_completions_date ON daily_completions(date);
    `,
  },
  {
    version: 4,
    sql: `
      CREATE TABLE daily_routine_items (
        id           TEXT PRIMARY KEY,
        routine_id   TEXT NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
        title        TEXT NOT NULL,
        target_count INTEGER DEFAULT 1,
        sort_order   INTEGER DEFAULT 0,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );

      ALTER TABLE daily_completions ADD COLUMN item_id TEXT REFERENCES daily_routine_items(id) ON DELETE CASCADE;

      CREATE INDEX idx_daily_completions_item_date ON daily_completions(item_id, date);
    `,
  },
  {
    version: 5,
    sql: `
      CREATE TABLE journals (
        id         TEXT PRIMARY KEY,
        date       TEXT NOT NULL UNIQUE,
        content    TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_journals_date ON journals(date);
    `,
  },
  {
    version: 6,
    sql: `
      ALTER TABLE lists ADD COLUMN icon TEXT DEFAULT '';

      CREATE TABLE countdowns (
        id             TEXT PRIMARY KEY,
        title          TEXT NOT NULL,
        target_date    TEXT NOT NULL,
        bg_image_path  TEXT,
        interval_days  INTEGER,
        is_archived    INTEGER NOT NULL DEFAULT 0,
        created_at     TEXT NOT NULL,
        updated_at     TEXT NOT NULL
      );

      CREATE INDEX idx_countdowns_target_date ON countdowns(target_date);
      CREATE INDEX idx_countdowns_archived ON countdowns(is_archived);
    `,
  },
  {
    version: 7,
    sql: `
      ALTER TABLE tasks ADD COLUMN start_date TEXT;
      ALTER TABLE tasks ADD COLUMN end_date TEXT;

      CREATE INDEX idx_tasks_date_range ON tasks(start_date, end_date);
    `,
  },
  {
    version: 8,
    sql: `
      ALTER TABLE daily_routines ADD COLUMN start_date TEXT;
      ALTER TABLE daily_routines ADD COLUMN end_date TEXT;
      ALTER TABLE daily_routines ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;

      CREATE INDEX idx_daily_routines_dates ON daily_routines(start_date, end_date);
      CREATE INDEX idx_daily_routines_archived ON daily_routines(is_archived);
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
