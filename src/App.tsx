import { useEffect, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { Task } from '@shared/types'
import type { CalendarTaskInstance } from '@/types/calendar'
import { api } from '@/lib/api'
import { AppShell } from '@/components/layout/AppShell'
import { TaskListView } from '@/features/tasks/components/TaskListView'
import { CalendarView } from '@/features/calendar/components/CalendarView'
import { DailyView } from '@/features/daily/components/DailyView'
import { JournalView } from '@/features/journal/components/JournalView'
import { CountdownView } from '@/features/countdown/components/CountdownView'
import { useTasksStore } from '@/features/tasks/store'
import { useCalendarStore } from '@/features/calendar/store'
import { useDailyStore } from '@/features/daily/store'
import { useCountdownStore } from '@/features/countdown/store'
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
        await tasksStore.updateTaskDueDate(activeData.task.id, date)
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
        } else {
          await tasksStore.updateTaskDueDate(instance.task_id, date)
        }
        await calendarStore.fetchMonth()
      }
      return
    }

    // 清单内拖拽排序
    if (activeData?.type === 'task' && overId.startsWith('task:')) {
      const activeTask = activeData.task
      const overTaskId = overId.slice(5)
      if (activeTask.id === overTaskId) return

      const listId = activeTask.list_id
      const actives = (tasksStore.tasksByList[listId] ?? []).filter((t) => !t.is_completed)
      const oldIndex = actives.findIndex((t) => t.id === activeTask.id)
      const newIndex = actives.findIndex((t) => t.id === overTaskId)
      if (oldIndex < 0 || newIndex < 0) return
      await tasksStore.reorderTasks(
        listId,
        arrayMove(actives, oldIndex, newIndex).map((t) => t.id),
      )
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
      onDragEnd={(e) => void handleDragEnd(e)}
      onDragCancel={() => setActiveDrag(null)}
    >
      <AppShell>
        {view === 'list' ? (
          <TaskListView />
        ) : view === 'calendar' ? (
          <CalendarView />
        ) : view === 'daily' ? (
          <DailyView />
        ) : view === 'journal' ? (
          <JournalView />
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
