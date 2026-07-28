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
  onSelectWeek?: () => void
  isWeekSelected?: boolean
}

export const CalendarCell = memo(function CalendarCell({
  date,
  year,
  month,
  instances,
  onToggleInstance,
  onEditInstance,
  onCreateAt,
  onSelectWeek,
  isWeekSelected,
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
      className={`relative min-h-[100px] border-b border-r border-canvas-3 transition-all duration-150 ${
        isOver
          ? 'bg-royal-50 ring-2 ring-inset ring-royal'
          : inMonth
            ? 'bg-white hover:bg-canvas-2'
            : 'bg-canvas-2'
      }`}
      title="双击新建任务"
    >
      {/* 周选择指示条 */}
      {onSelectWeek && (
        <button
          onClick={(e) => { e.stopPropagation(); onSelectWeek() }}
          className={`absolute left-0 top-0 bottom-0 w-1 cursor-pointer transition-colors ${
            isWeekSelected ? 'bg-royal' : 'bg-transparent hover:bg-royal-50'
          }`}
          title={isWeekSelected ? '取消选择本周' : '选择本周'}
        />
      )}
      <div className="p-1.5">
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
    </div>
  )
})