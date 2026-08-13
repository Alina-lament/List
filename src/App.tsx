import { useEffect, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { Task } from '@shared/types'
import type { CalendarTaskInstance } from '@/types/calendar'
import { api } from '@/lib/api'
import { parseDateKey } from '@/lib/date-utils'
import { AppShell } from '@/components/layout/AppShell'
import { TaskListView } from '@/features/tasks/components/TaskListView'
import { CalendarView } from '@/features/calendar/components/CalendarView'
import { DailyView } from '@/features/daily/components/DailyView'
import { JournalView } from '@/features/journal/components/JournalView'
import { CountdownView } from '@/features/countdown/components/CountdownView'
import { PomodoroView } from '@/features/pomodoro/components/PomodoroView'
import { useTasksStore } from '@/features/tasks/store'
import { useCalendarStore } from '@/features/calendar/store'
import { useDailyStore } from '@/features/daily/store'
import { useCountdownStore } from '@/features/countdown/store'
import { useSettingsStore } from '@/features/settings/store'
import { ReminderToastHost } from '@/features/reminders/ReminderToastHost'

type ActiveDrag =
  | { type: 'task'; task: Task }
  | { type: 'calendar-instance'; instance: CalendarTaskInstance }
  | null

export default function App() {
  const { init, view, error, clearError } = useTasksStore()
  const initDaily = useDailyStore((s) => s.init)
  const initCountdown = useCountdownStore((s) => s.init)
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    void init()
    void initDaily()
    void initCountdown()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleDragStart(event: DragStartEvent) {
    setActiveDrag((event.active.data.current as ActiveDrag) ?? null)
  }

  function shiftDateKey(key: string, deltaDays: number): string {
    const d = parseDateKey(key)
    d.setDate(d.getDate() + deltaDays)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function daysBetween(a: string, b: string): number {
    const diff = parseDateKey(b).getTime() - parseDateKey(a).getTime()
    return Math.round(diff / (24 * 60 * 60 * 1000))
  }

  /** 计算同清单内拖拽后的新顺序；跨清单或不符合条件时返回 null */
  function computeListReorder(activeTask: Task, overTaskId: string): { listId: string; newOrderIds: string[] } | null {
    const tasksStore = useTasksStore.getState()

    // 找到被放置的任务，跨清单不允许排序
    let overTask: Task | null = null
    for (const listTasks of Object.values(tasksStore.tasksByList)) {
      overTask = listTasks.find((t) => t.id === overTaskId) ?? null
      if (overTask) break
    }
    if (!overTask || overTask.list_id !== activeTask.list_id) return null

    const listId = activeTask.list_id
    const listTasks = tasksStore.tasksByList[listId] ?? []
    // 按当前 sort_order 排序，得到完整顺序
    const sortedListTasks = [...listTasks].sort((a, b) => a.sort_order - b.sort_order)
    // 可排序项：未完成的父任务
    const movableIds = sortedListTasks
      .filter((t) => !t.is_completed && !t.parent_task_id)
      .map((t) => t.id)

    const oldIndex = movableIds.indexOf(activeTask.id)
    const newIndex = movableIds.indexOf(overTaskId)
    if (oldIndex < 0 || newIndex < 0) return null
    const newMovableIds = arrayMove(movableIds, oldIndex, newIndex)

    // 把可排序项按新顺序塞回原来的位置，保持子任务/已完成任务位置不变
    let movableIdx = 0
    const newOrderIds = sortedListTasks.map((t) => {
      if (!t.is_completed && !t.parent_task_id) {
        return newMovableIds[movableIdx++]
      }
      return t.id
    })

    return { listId, newOrderIds }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeData = active.data.current as ActiveDrag
    const overId = String(over.id)
    if (activeData?.type !== 'task' || !overId.startsWith('task:')) return

    // 只有自由排序时才允许在任务列表内实时换位
    if (useSettingsStore.getState().taskSortMode !== 'free') return

    const activeTask = activeData.task
    const overTaskId = overId.slice(5)
    if (activeTask.id === overTaskId) return

    const result = computeListReorder(activeTask, overTaskId)
    if (!result) return

    // UI 滑动即确认位置变更，实时更新本地顺序（落轴时再持久化到数据库）
    useTasksStore.getState().reorderTasksLocal(result.listId, result.newOrderIds)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDrag(null)
    if (!over) return

    const activeData = active.data.current as ActiveDrag
    const overId = String(over.id)
    const tasksStore = useTasksStore.getState()
    const calendarStore = useCalendarStore.getState()

    // 拖到日历格 → 改期
    if (overId.startsWith('cell:')) {
      const date = (over.data.current as { date?: string } | undefined)?.date
      if (!date || !activeData) return

      if (activeData.type === 'task') {
        const task = activeData.task
        if (task.start_date && task.end_date) {
          // 时间段任务：以目标格为新开始日期，保持时长不变
          const delta = daysBetween(task.start_date, date)
          await tasksStore.updateTask(task.id, {
            start_date: date,
            end_date: shiftDateKey(task.end_date, delta),
            due_date: task.due_date ? shiftDateKey(task.due_date, delta) : null,
          })
        } else {
          await tasksStore.updateTaskDueDate(task.id, date)
        }
        await calendarStore.refreshIfLoaded()
      } else if (activeData.type === 'calendar-instance') {
        const instance = activeData.instance
        if (instance.date === date) return
        if (instance.is_recurring_instance) {
          // 重复任务单次实例：原日期删除该次，新日期生成独立任务
          await api.createTaskException({
            task_id: instance.task_id,
            exception_date: instance.date,
            action: 'deleted',
          })
          await tasksStore.createTask({
            list_id: instance.list_id,
            title: instance.title,
            description: instance.description,
            due_date: date,
            due_time: instance.due_time,
            priority: instance.priority,
            reminder_minutes: instance.reminder_minutes,
          })
        } else if (instance.is_range_instance && instance.range_start && instance.range_end) {
          // 范围任务：以目标格为新开始日期，保持时长不变
          const duration = daysBetween(instance.range_start, instance.range_end)
          const task = await api.getTaskById(instance.task_id)
          const dueOffset = task?.due_date ? daysBetween(instance.range_start, task.due_date) : null
          await tasksStore.updateTask(instance.task_id, {
            start_date: date,
            end_date: shiftDateKey(date, duration),
            due_date: dueOffset !== null ? shiftDateKey(date, dueOffset) : (task?.due_date ?? null),
          })
        } else {
          await tasksStore.updateTaskDueDate(instance.task_id, date)
        }
        await calendarStore.fetchMonth()
      }
      return
    }

    // 任务拖拽排序：仅在自由排序模式下生效；跨清单时将任务移动到目标清单并排序
    if (activeData?.type === 'task' && overId.startsWith('task:')) {
      if (useSettingsStore.getState().taskSortMode !== 'free') return

      const activeTask = activeData.task
      const overTaskId = overId.slice(5)
      if (activeTask.id === overTaskId) return

      // 找到被放置的任务
      let overTask: Task | null = null
      for (const listTasks of Object.values(tasksStore.tasksByList)) {
        overTask = listTasks.find((t) => t.id === overTaskId) ?? null
        if (overTask) break
      }
      if (!overTask) return

      if (overTask.list_id === activeTask.list_id) {
        // 同清单：handleDragOver 已实时更新本地顺序，落轴时持久化
        const result = computeListReorder(activeTask, overTaskId)
        if (!result) return
        await tasksStore.reorderTasks(result.listId, result.newOrderIds)
      } else {
        // 跨清单：将任务移动到目标清单，并插入到目标任务之后
        await tasksStore.moveTaskToListAndReorder(activeTask.id, overTask.list_id, overTask.id)
      }
    }
  }

  const overlayTitle =
    activeDrag?.type === 'task'
      ? activeDrag.task.title
      : activeDrag?.type === 'calendar-instance'
        ? activeDrag.instance.title
        : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={(e) => void handleDragOver(e)}
      onDragEnd={(e) => void handleDragEnd(e)}
      onDragCancel={() => setActiveDrag(null)}
    >
      <AppShell>
        {view === 'today' || view === 'list' ? (
          <TaskListView />
        ) : view === 'calendar' ? (
          <CalendarView />
        ) : view === 'daily' ? (
          <DailyView />
        ) : view === 'journal' ? (
          <JournalView />
        ) : view === 'pomodoro' ? (
          <PomodoroView />
        ) : (
          <CountdownView />
        )}
      </AppShell>
      <ReminderToastHost />

      <DragOverlay>
        {overlayTitle && (
          <div className="rounded-lg border border-royal bg-canvas px-3 py-1.5 text-sm font-medium text-ink shadow-card-lg">
            {overlayTitle}
          </div>
        )}
      </DragOverlay>

      {error && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-prihigh px-4 py-2 text-sm font-medium text-white shadow-card-lg">
          {error}
          <button onClick={clearError} className="font-bold">
            ×
          </button>
        </div>
      )}
    </DndContext>
  )
}
