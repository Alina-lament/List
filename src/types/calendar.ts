import type { Tag } from '@shared/types'

export interface CalendarTaskInstance {
  instance_id: string
  task_id: string
  date: string
  title: string
  description: string
  is_completed: boolean
  due_time: string | null
  priority: 0 | 1 | 2 | 3
  list_id: string
  list_color: string
  tags: Tag[]
  is_recurring_instance: boolean
  reminder_minutes: number | null
  is_range_instance: boolean
  range_start: string | null
  range_end: string | null
}
