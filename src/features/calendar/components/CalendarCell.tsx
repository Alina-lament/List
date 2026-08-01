import { memo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { CalendarTaskInstance } from '@/types/calendar'
import type { DailyCompletion, DailyRoutine } from '@shared/types'
import { isCurrentMonth, isToday } from '@/lib/date-utils'
import { CalendarTaskBlock } from './CalendarTaskBlock'

const MAX_VISIBLE = 5

interface Props {
  date: string
  year: number
  month: number
  instances: CalendarTaskInstance[]
  dailyEntries: { routine: DailyRoutine; item: { id: string; title: string; target_count: number } }[]
  dailyCompletions: DailyCompletion[]
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
  dailyEntries,
  dailyCompletions,
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
      <div className="flex flex-1 flex-col p-1.5">
        {/* 日期号 */}
        <div className="mb-1 flex justify-end shrink-0">
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

        {/* 任务列表 — 占据剩余空间 */}
        <div className="min-h-0 flex-1 space-y-1">
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

        {/* 每日任务 — 固定在底部，同水平线 */}
        <div className="shrink-0 border-t border-canvas-3 pt-1" style={{ minHeight: dailyEntries.length > 0 ? undefined : 0 }}>
          <div className="space-y-0.5">
            {dailyEntries.map(({ routine: r, item }) => {
              const comp = dailyCompletions.find(
                (c) => c.routine_id === r.id && c.date === date && (r.items.length > 0 ? c.item_id === item.id : !c.item_id),
              )
              const c = comp?.count ?? 0
              const done = c >= item.target_count
              return (
                <div
                  key={`${r.id}-${item.id}`}
                  className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-[9px] ${
                    done ? 'bg-emerald-50 text-emerald-700' : c > 0 ? 'bg-amber-50 text-amber-700' : 'bg-canvas-2 text-ink-3'
                  }`}
                  title={`${r.title} › ${item.title}: ${c}/${item.target_count}`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-sm ${
                    done ? 'bg-emerald-400' : c > 0 ? 'bg-amber-300' : 'bg-canvas-3'
                  }`} />
                  <span className="truncate">{item.title}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
})