import { useEffect, useState } from 'react'
import type { Task } from '@shared/types'
import type { CalendarTaskInstance } from '@/types/calendar'
import { api } from '@/lib/api'
import { formatMonthTitle, getMonthGrid } from '@/lib/date-utils'
import { Button } from '@/components/ui/Button'
import { useCalendarStore } from '../store'
import { CalendarCell } from './CalendarCell'
import { TaskFormDialog } from '@/features/tasks/components/TaskFormDialog'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

type DialogState =
  | { mode: 'edit'; task: Task }
  | { mode: 'create'; date: string }
  | null

export function CalendarView() {
  const { year, month, instancesByDate, loading, shiftMonth, goToday, fetchMonth } =
    useCalendarStore()
  const [dialog, setDialog] = useState<DialogState>(null)

  useEffect(() => {
    void fetchMonth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grid = getMonthGrid(year, month)

  async function handleToggle(instance: CalendarTaskInstance) {
    const completed = !instance.is_completed
    if (instance.is_recurring_instance) {
      await api.createTaskException({
        task_id: instance.task_id,
        exception_date: instance.date,
        action: 'modified',
        is_completed: completed ? 1 : 0,
      })
    } else {
      await api.setTaskCompleted(instance.task_id, completed)
    }
    await fetchMonth()
  }

  async function handleEdit(instance: CalendarTaskInstance) {
    const task = await api.getTaskById(instance.task_id)
    if (task) setDialog({ mode: 'edit', task })
  }

  function closeDialog() {
    setDialog(null)
    void fetchMonth()
  }

  return (
    <div className="flex h-full flex-col px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Button onClick={() => shiftMonth(-1)} aria-label="上一月">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        <h2 className="min-w-40 text-center text-xl font-bold tracking-wide text-ink">
          {formatMonthTitle(year, month)}
        </h2>
        <Button onClick={() => shiftMonth(1)} aria-label="下一月">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        <Button onClick={goToday} className="ml-2">
          今天
        </Button>
        {loading && <span className="ml-auto text-xs text-ink-3">加载中…</span>}
      </div>

      {/* 网格：纯白底 + 中灰线，标题行亮灰底 */}
      <div className="grid flex-1 grid-cols-7 grid-rows-[auto_repeat(6,1fr)] overflow-hidden rounded-lg border border-canvas-3 bg-canvas shadow-card">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-b border-r border-canvas-3 bg-canvas-2 py-1.5 text-center text-xs font-bold text-ink-2"
          >
            {d}
          </div>
        ))}
        {grid.map((date) => (
          <CalendarCell
            key={date}
            date={date}
            year={year}
            month={month}
            instances={instancesByDate[date] ?? []}
            onToggleInstance={handleToggle}
            onEditInstance={handleEdit}
            onCreateAt={(d) => setDialog({ mode: 'create', date: d })}
          />
        ))}
      </div>

      <TaskFormDialog
        open={dialog !== null}
        onClose={closeDialog}
        task={dialog?.mode === 'edit' ? dialog.task : null}
        defaultDueDate={dialog?.mode === 'create' ? dialog.date : null}
      />
    </div>
  )
}
