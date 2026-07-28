export interface List {
  id: string
  name: string
  color: string
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
  priority?: 0 | 1 | 2 | 3
  is_recurring?: 0 | 1
  rrule?: string | null
  rrule_end_date?: string | null
  reminder_minutes?: number | null
  tag_ids?: string[]
}

export interface UpdateTaskInput {
  list_id?: string
  title?: string
  description?: string
  is_completed?: 0 | 1
  due_date?: string | null
  due_time?: string | null
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
export interface SettingsRow {
  key: string
  value: string
  updated_at: string
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
  bgOpacity: '30',
  bgBlur: '0',
  bgScale: 'cover',
  appIconPath: '',
  sidebarWidth: '240',
  detailWidth: '384',
  scrollSensitivity: '200',
}
