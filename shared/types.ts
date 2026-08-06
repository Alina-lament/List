export interface List {
  id: string
  name: string
  color: string
  icon: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  list_id: string
  title: string
  description: string
  is_completed: 0 | 1
  due_date: string | null
  due_time: string | null
  start_date: string | null
  end_date: string | null
  priority: 0 | 1 | 2 | 3
  sort_order: number
  is_recurring: 0 | 1
  rrule: string | null
  rrule_end_date: string | null
  reminder_minutes: number | null
  last_reminded_at: string | null
  parent_task_id: string | null
  created_at: string
  updated_at: string
}

export interface Tag {
  id: string
  name: string
  color: string
  created_at: string
}

export interface TaskTag {
  task_id: string
  tag_id: string
}

export type ExceptionAction = 'modified' | 'deleted'

export interface TaskException {
  id: string
  task_id: string
  exception_date: string
  action: ExceptionAction
  title: string | null
  description: string | null
  is_completed: 0 | 1 | null
  due_time: string | null
  priority: 0 | 1 | 2 | 3 | null
  reminder_minutes: number | null
}

export interface CreateTaskInput {
  list_id: string
  title: string
  description?: string
  due_date?: string | null
  due_time?: string | null
  start_date?: string | null
  end_date?: string | null
  priority?: 0 | 1 | 2 | 3
  is_recurring?: 0 | 1
  rrule?: string | null
  rrule_end_date?: string | null
  reminder_minutes?: number | null
  parent_task_id?: string | null
  tag_ids?: string[]
}

export interface UpdateTaskInput {
  list_id?: string
  title?: string
  description?: string
  is_completed?: 0 | 1
  due_date?: string | null
  due_time?: string | null
  start_date?: string | null
  end_date?: string | null
  priority?: 0 | 1 | 2 | 3
  is_recurring?: 0 | 1
  rrule?: string | null
  rrule_end_date?: string | null
  reminder_minutes?: number | null
  tag_ids?: string[]
}

export interface CreateExceptionInput {
  task_id: string
  exception_date: string
  action: ExceptionAction
  title?: string | null
  description?: string | null
  is_completed?: 0 | 1 | null
  due_time?: string | null
  priority?: 0 | 1 | 2 | 3 | null
  reminder_minutes?: number | null
}

export interface TasksByRangeResult {
  nonRecurring: Task[]
  recurring: Task[]
  exceptions: TaskException[]
  lists: List[]
  tags: Tag[]
  taskTags: TaskTag[]
}

export interface DueReminder {
  task_id: string
  title: string
  due_date: string
  due_time: string
  reminder_minutes: number
}

// ── Settings ──
export type CloseBehavior = 'ask' | 'quit' | 'tray'

export interface SettingsRow {
  key: string
  value: string
  updated_at: string
}

// ── Daily Routines ──
export interface DailyRoutine {
  id: string
  title: string
  description: string
  target_count: number
  list_id: string
  priority: 0 | 1 | 2 | 3
  active: 0 | 1
  days_of_week: string // JSON array, e.g. "[1,2,3,4,5]" for weekdays; "[]" = every day
  start_date: string | null
  end_date: string | null
  is_archived: 0 | 1
  sort_order: number
  created_at: string
  updated_at: string
  items: DailyRoutineItem[]
}

export interface DailyCompletion {
  id: string
  routine_id: string
  item_id: string | null  // null = 直属于routine（无子项时）
  date: string // YYYY-MM-DD
  count: number
}

// ── Journal ──
export interface JournalEntry {
  id: string
  date: string // YYYY-MM-DD
  content: string
  created_at: string
  updated_at: string
}

export interface DailyRoutineItem {
  id: string
  routine_id: string
  title: string
  target_count: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreateDailyRoutineInput {
  title: string
  description?: string
  target_count?: number
  list_id: string
  priority?: 0 | 1 | 2 | 3
  days_of_week?: string
  start_date?: string | null
  end_date?: string | null
  items?: { title: string; target_count: number }[]
}

export interface UpdateDailyRoutineInput {
  title?: string
  description?: string
  target_count?: number
  list_id?: string
  priority?: 0 | 1 | 2 | 3
  active?: 0 | 1
  days_of_week?: string
  start_date?: string | null
  end_date?: string | null
  is_archived?: 0 | 1
  items?: { title: string; target_count: number }[]
}

// ── Countdowns ──
export interface Countdown {
  id: string
  title: string
  target_date: string // YYYY-MM-DD
  bg_image_path: string | null
  interval_days: number | null
  is_archived: 0 | 1
  created_at: string
  updated_at: string
}

export interface CreateCountdownInput {
  title: string
  target_date: string
  bg_image_path?: string | null
  interval_days?: number | null
}

export interface UpdateCountdownInput {
  title?: string
  target_date?: string
  bg_image_path?: string | null
  interval_days?: number | null
}

export const DEFAULT_SETTINGS: Record<string, string> = {
  sidebarBg: '#f4f5f7',
  canvasBg: '#fdfdfc',
  cardBg: '#ffffff',
  royal: '#4f6ef7',
  royalDark: '#3d5ce5',
  royalLight: '#7b93fa',
  royal50: '#eef1fe',
  ink: '#0f172a',
  ink2: '#334155',
  ink3: '#64748b',
  borderColor: '#eaecf0',
  prihigh: '#f43f5e',
  primed: '#f59e0b',
  prilow: '#22c55e',
  bgImagePath: '',
  bgOpacity: '80',
  bgBlur: '0',
  bgScale: 'cover',
  bgGlassIntensity: '35',
  appIconPath: '',
  brandName: 'YoungLife',
  brandImagePath: '',
  sidebarWidth: '240',
  detailWidth: '384',
  scrollSensitivity: '200',
  calendarWeekCount: '4',
  closeBehavior: 'ask',
  taskSortMode: 'free',
  taskCompleteSoundEnabled: '1',
  taskCompleteSoundVolume: '80',
  taskCompleteSoundFile: 'complete.wav',
  collapsedParentTasks: '[]',
  collapsedCompletedSubtasks: '[]',
  backupPath: '',
}
