import { memo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { CalendarTaskInstance } from '@/types/calendar'
import { isCurrentMonth, isToday } from '@/lib/date-utils'
import { CalendarTaskBlock } from './CalendarTaskBlock'

const MAX_VISIBLE = 4

interface Props {
  date: string
  year: number
  month: number
  instances: CalendarTaskInstance[]
  onToggleInstance: (instance: CalendarTaskInstance) => void
  onEditInstance: (instance: CalendarTaskInstance) => void
  onCreateAt: (date: string) => void
}

export const CalendarCell = memo(function CalendarCell({
  date,
  year,
  month,
  instances,
  onToggleInstance,
  onEditInstance,
  onCreateAt,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell:${date}`, data: { date } })
  const dayOfMonth = Number(date.slice(8, 10))
  const inMonth = isCurrentMonth(date, year, month)
  const today = isToday(date)
  const visible = instances.slice(0, MAX_VISIBLE)
  const hiddenCount = instances.length - visible.length

  return (
    <div
      ref={setNodeRef}
      onDoubleClick={() => onCreateAt(date)}
      className={`min-h-[100px] border-b border-r border-canvas-3/60 p-1.5 transition-all duration-150 ${
        isOver
          ? 'bg-royal-50 ring-2 ring-inset ring-royal/40'
          : inMonth
            ? 'bg-white hover:bg-canvas-2/50'
            : 'bg-canvas-2/40'
      }`}
      title="双击新建任务"
    >
      <div className="mb-1 flex justify-end">
        <span
          className={`flex h-6 w-6 items-center justify-center text-xs font-bold transition-all ${
            today
              ? 'rounded-full bg-royal text-white shadow-sm'
              : inMonth
                ? 'font-semibold text-ink'
                : 'text-ink-4'
          }`}
        >
          {dayOfMonth}
        </span>
      </div>
      <div className="space-y-1">
        {visible.map((instance) => (
          <CalendarTaskBlock
            key={instance.instance_id}
            instance={instance}
            onToggle={onToggleInstance}
            onEdit={onEditInstance}
          />
        ))}
        {hiddenCount > 0 && (
          <div className="px-1 text-[10px] font-medium text-ink-3">+{hiddenCount} 更多</div>
        )}
      </div>
    </div>
  )
})