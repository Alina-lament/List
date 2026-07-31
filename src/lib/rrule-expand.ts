import { RRule } from 'rrule'
import type { List, Tag, Task, TaskException, TasksByRangeResult, TaskTag } from '@shared/types'
import type { CalendarTaskInstance } from '@/types/calendar'
import { pad2 } from './date-utils'

/** 'YYYY-MM-DD' → UTC Date（避免本地时区导致 rrule 展开偏移） */
function utcDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

function exceptionKey(taskId: string, date: string): string {
  return `${taskId}|${date}`
}

function buildInstance(
  task: Task,
  date: string,
  isRecurringInstance: boolean,
  listsById: Map<string, List>,
  tagsByTask: Map<string, Tag[]>,
  override?: TaskException,
  rangeStart: string | null = null,
  rangeEnd: string | null = null,
): CalendarTaskInstance {
  return {
    instance_id: isRecurringInstance ? `${task.id}|${date}` : task.id,
    task_id: task.id,
    date,
    title: override?.title ?? task.title,
    description: override?.description ?? task.description,
    is_completed: Boolean(override?.is_completed ?? task.is_completed),
    due_time: override?.due_time ?? task.due_time,
    priority: override?.priority ?? task.priority,
    list_id: task.list_id,
    list_color: listsById.get(task.list_id)?.color ?? '#6366f1',
    tags: tagsByTask.get(task.id) ?? [],
    is_recurring_instance: isRecurringInstance,
    reminder_minutes: override?.reminder_minutes ?? task.reminder_minutes,
    is_range_instance: rangeStart !== null && rangeEnd !== null,
    range_start: rangeStart,
    range_end: rangeEnd,
  }
}

function sortInstances(a: CalendarTaskInstance, b: CalendarTaskInstance): number {
  // 时间段任务排在最上方，保证跨天显示时同一任务在每一天处于同一水平线
  if (a.is_range_instance !== b.is_range_instance) return a.is_range_instance ? -1 : 1

  // 非时间段任务：按完成状态、优先级、时间、名称排序
  if (!a.is_range_instance) {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
    if (a.priority !== b.priority) return b.priority - a.priority
    if ((a.due_time ?? '') !== (b.due_time ?? '')) {
      if (a.due_time === null) return 1
      if (b.due_time === null) return -1
      return a.due_time < b.due_time ? -1 : 1
    }
    return a.title.localeCompare(b.title, 'zh-CN')
  }

  // 时间段任务：按开始日期升序（越早开始越靠上）、优先级降序、名称排序
  if ((a.range_start ?? '') !== (b.range_start ?? '')) {
    return (a.range_start ?? '').localeCompare(b.range_start ?? '')
  }
  if (a.priority !== b.priority) return b.priority - a.priority
  return a.title.localeCompare(b.title, 'zh-CN')
}

/** 展开某日期范围内的所有任务实例（含重复任务），按 dateKey 分桶 */
export function expandInstances(
  data: TasksByRangeResult,
  start: string,
  end: string,
): Record<string, CalendarTaskInstance[]> {
  const listsById = new Map(data.lists.map((l) => [l.id, l]))
  const tagsById = new Map(data.tags.map((t) => [t.id, t]))
  const tagsByTask = new Map<string, Tag[]>()
  for (const tt of data.taskTags as TaskTag[]) {
    const tag = tagsById.get(tt.tag_id)
    if (!tag) continue
    const arr = tagsByTask.get(tt.task_id) ?? []
    arr.push(tag)
    tagsByTask.set(tt.task_id, arr)
  }
  const exceptions = new Map<string, TaskException>()
  for (const ex of data.exceptions) {
    exceptions.set(exceptionKey(ex.task_id, ex.exception_date), ex)
  }

  const byDate: Record<string, CalendarTaskInstance[]> = {}
  const push = (instance: CalendarTaskInstance) => {
    const arr = byDate[instance.date] ?? []
    arr.push(instance)
    byDate[instance.date] = arr
  }

  const rangeStart = utcDate(start)
  const rangeEnd = new Date(utcDate(end).getTime() + 24 * 60 * 60 * 1000 - 1)

  for (const task of data.nonRecurring) {
    // 优先按 start_date/end_date 展开为日期范围
    if (task.start_date && task.end_date) {
      const taskStart = utcDate(task.start_date)
      const taskEnd = utcDate(task.end_date)
      const effectiveStart = taskStart < rangeStart ? rangeStart : taskStart
      const effectiveEnd = taskEnd > rangeEnd ? rangeEnd : taskEnd
      if (effectiveStart > effectiveEnd) continue

      const d = new Date(effectiveStart.getTime())
      while (d <= effectiveEnd) {
        const key = toKey(d)
        const ex = exceptions.get(exceptionKey(task.id, key))
        if (ex?.action !== 'deleted') {
          push(buildInstance(task, key, false, listsById, tagsByTask, ex, task.start_date, task.end_date))
        }
        d.setUTCDate(d.getUTCDate() + 1)
      }
      continue
    }

    // 否则按 due_date 生成单日实例
    if (!task.due_date) continue
    const ex = exceptions.get(exceptionKey(task.id, task.due_date))
    if (ex?.action === 'deleted') continue
    push(buildInstance(task, task.due_date, false, listsById, tagsByTask, ex))
  }

  for (const task of data.recurring) {
    if (!task.rrule || !task.due_date) continue
    try {
      const options = RRule.parseString(task.rrule)
      options.dtstart = utcDate(task.due_date)
      if (task.rrule_end_date) {
        options.until = new Date(utcDate(task.rrule_end_date).getTime() + 24 * 60 * 60 * 1000 - 1)
      }
      const rule = new RRule(options)
      const dates = rule.between(rangeStart, rangeEnd, true)
      for (const d of dates) {
        const key = toKey(d)
        const ex = exceptions.get(exceptionKey(task.id, key))
        if (ex?.action === 'deleted') continue
        push(buildInstance(task, key, true, listsById, tagsByTask, ex))
      }
    } catch {
      // 无效 rrule 字符串：跳过该任务，不影响日历渲染
    }
  }

  for (const arr of Object.values(byDate)) arr.sort(sortInstances)
  return byDate
}

/** 生成 rrule 的可读预览日期（前 N 个） */
export function previewRRule(rrule: string, dtstartKey: string, count = 3): string[] {
  try {
    const options = RRule.parseString(rrule)
    options.dtstart = utcDate(dtstartKey)
    const rule = new RRule(options)
    return rule.all((_, i) => i < count).map(toKey)
  } catch {
    return []
  }
}
