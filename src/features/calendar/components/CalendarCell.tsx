import { memo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { CalendarTaskInstance } from '@/types/calendar'
import { isCurrentMonth, isToday } from '@/lib/date-utils'
import { CalendarTaskBlock } from './CalendarTaskBlock'

const MAX_VISIBLE = 7

interface Props {
  date: string
  year: number
  month: number
  instances: CalendarTaskInstance[]
  onEditInstance: (instance: CalendarTaskInstance) => void
  onCreateAt: (date: string) => void
  onSelectWeek?: () => void
  isWeekSelected?: boolean
  weekNumber?: number
  showWeekNumber?: boolean
}

export const CalendarCell = memo(function CalendarCell({
  date,
  year,
  month,
  instances,
  onEditInstance,
  onCreateAt,
  onSelectWeek,
  isWeekSelected,
  weekNumber,
  showWeekNumber,
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
      className={`relative flex min-h-[120px] flex-col border-b border-r border-canvas-3 transition-all duration-150 ${
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
      <div className="flex flex-1 flex-col p-1">
        {/* 日期号 */}
        <div className="mb-0.5 flex shrink-0 items-start justify-between">
          <span
            className={`flex h-5 w-5 items-center justify-center text-[11px] font-bold transition-all ${
              today
                ? 'rounded-full bg-ink text-white shadow-sm'
                : inMonth
                  ? 'font-semibold text-ink'
                  : 'text-ink-4'
            }`}
          >
            {dayOfMonth}
          </span>
          {showWeekNumber && (
            <span className="text-[9px] text-ink-3">{weekNumber}周</span>
          )}
        </div>

        {/* 任务列表 — 占据剩余空间 */}
        <div className="min-h-0 flex-1 space-y-0.5">
          {visible.map((instance) => (
            <CalendarTaskBlock
              key={instance.instance_id}
              instance={instance}
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