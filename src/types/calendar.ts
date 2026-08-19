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
  /** 长期任务（时间段型父任务）的子任务总数 */
  child_total?: number
  /** 已完成的子任务数 */
  child_completed?: number
  /** 当天到期的子任务节点 */
  child_nodes?: CalendarChildNode[]
}

export interface CalendarChildNode {
  task_id: string
  title: string
  is_completed: boolean
  due_time: string | null
}
