import { memo, useEffect, useMemo, useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { CalendarTaskInstance } from '@/types/calendar'
import { useCalendarStore } from '../store'
import { useLayoutStore } from '@/components/layout/layoutStore'
import { useTasksStore } from '@/features/tasks/store'
import { useSettingsStore } from '@/features/settings/store'
import { formatMonthTitle, getMonthGrid, gridToWeeks, isCurrentMonth, isToday } from '@/lib/date-utils'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const PRIORITY_BG: Record<number, string> = {
  0: 'rgba(241, 245, 249, 0.80)',
  1: 'rgba(34, 197, 94, 0.16)',
  2: 'rgba(245, 158, 11, 0.20)',
  3: 'rgba(244, 63, 94, 0.16)',
}

interface MiniCalendarTaskBlockProps {
  instance: CalendarTaskInstance
}

const MiniCalendarTaskBlock = memo(function MiniCalendarTaskBlock({ instance }: MiniCalendarTaskBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `mini-cal:${instance.instance_id}`,
    data: { type: 'calendar-instance', instance },
  })

  const bg = instance.is_completed
    ? 'rgba(203, 213, 225, 0.40)'
    : `color-mix(in srgb, ${instance.list_color} 22%, white)`

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`mb-1.5 cursor-grab truncate rounded-md px-1.5 py-1 text-[11px] leading-snug shadow-xs ${
        isDragging ? 'opacity-40' : ''
      } ${instance.is_completed ? 'text-ink-4 line-through' : 'text-ink'}`}
      style={{
        transform: CSS.Translate.toString(transform),
        backgroundColor: bg,
        borderLeft: `3px solid ${instance.list_color}`,
      }}
      title={instance.title}
    >
      {instance.due_time && (
        <span className="mr-1 text-[10px] opacity-70">{instance.due_time.slice(0, 5)}</span>
      )}
      {instance.title}
    </div>
  )
})

interface CellProps {
  date: string
  year: number
  month: number
  instances: CalendarTaskInstance[]
}

const MiniCalendarCell = memo(function MiniCalendarCell({ date, year, month, instances }: CellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell:${date}`, data: { date } })
  const inMonth = isCurrentMonth(date, year, month)
  const today = isToday(date)
  const dayOfMonth = Number(date.slice(8, 10))

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[100px] flex-col border-b border-r border-canvas-3 p-1.5 transition-all ${
        isOver ? 'bg-royal-50 ring-2 ring-inset ring-royal' : inMonth ? 'bg-white' : 'bg-canvas-2/50'
      }`}
    >
      <div className="mb-1 flex justify-end">
        <span
          className={`flex h-6 w-6 items-center justify-center text-xs font-bold ${
            today ? 'rounded-full bg-royal text-white' : inMonth ? 'text-ink' : 'text-ink-4'
          }`}
        >
          {dayOfMonth}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        {instances.slice(0, 4).map((instance) => (
          <MiniCalendarTaskBlock key={instance.instance_id} instance={instance} />
        ))}
        {instances.length > 4 && (
          <div className="px-1 text-[10px] font-medium text-ink-3">+{instances.length - 4}</div>
        )}
      </div>
    </div>
  )
})

export function MiniCalendar() {
  const { year, month, weekCount, instancesByDate, loading, shiftMonth, goToday, setWeekCount, fetchMonth } =
    useCalendarStore()
  const { selectedListId } = useTasksStore()
  const { calendarWeekCount, setCalendarWeekCount } = useSettingsStore()
  const setShowDetailCalendar = useLayoutStore((s) => s.setShowDetailCalendar)
  const [mounted, setMounted] = useState(false)

  // 启动时加载并同步设置中的周数
  useEffect(() => {
    setMounted(true)
    if ([1, 2, 4].includes(calendarWeekCount)) {
      setWeekCount(calendarWeekCount as 1 | 2 | 4)
    }
    void fetchMonth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grid = useMemo(() => getMonthGrid(year, month), [year, month])
  const weeks = useMemo(() => gridToWeeks(grid), [grid])

  const filteredInstancesByDate = useMemo(() => {
    const filtered: Record<string, CalendarTaskInstance[]> = {}
    for (const [date, arr] of Object.entries(instancesByDate)) {
      filtered[date] = arr.filter((i) => (!selectedListId || i.list_id === selectedListId) && !i.is_completed)
    }
    return filtered
  }, [instancesByDate, selectedListId])

  const visibleWeeks = weeks.filter((w) => w.some((d) => isCurrentMonth(d, year, month)))
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayWeekIdx = visibleWeeks.findIndex((w) => w.includes(todayKey))
  const rawStart = todayWeekIdx >= 0 ? todayWeekIdx : 0
  const startIdx = Math.max(0, Math.min(rawStart, visibleWeeks.length - weekCount))
  const displayWeeks = visibleWeeks.slice(startIdx, startIdx + weekCount)

  if (!mounted) return null

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftMonth(-1)}
            className="rounded-lg p-1 text-ink-3 transition-colors hover:bg-canvas-2"
            aria-label="上月"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="min-w-[110px] text-center text-base font-bold text-ink">
            {formatMonthTitle(year, month)}
          </span>
          <button
            onClick={() => shiftMonth(1)}
            className="rounded-lg p-1 text-ink-3 transition-colors hover:bg-canvas-2"
            aria-label="下月"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToday()}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-ink-3 transition-colors hover:bg-canvas-2"
          >
            今天
          </button>
          <div className="flex items-center rounded-lg border border-canvas-3 bg-canvas-2 p-0.5">
            {([1, 2, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => {
                  setWeekCount(n)
                  void setCalendarWeekCount(n)
                }}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                  weekCount === n
                    ? 'bg-white text-ink shadow-xs ring-1 ring-ink/5'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                {n}周
              </button>
            ))}
          </div>
          <button
            onClick={() => void setShowDetailCalendar(false)}
            className="rounded-lg p-1 text-ink-3 transition-colors hover:bg-canvas-2"
            aria-label="关闭日历"
            title="关闭日历"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {loading && <div className="mb-2 text-[11px] text-ink-3">加载中…</div>}

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-canvas-3 bg-canvas-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-ink-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid flex-1 grid-cols-7" style={{ gridTemplateRows: `repeat(${displayWeeks.length}, minmax(100px, 1fr))` }}>
        {displayWeeks.map((weekDays) => (
          <div key={weekDays[0]} className="contents">
            {weekDays.map((date) => (
              <MiniCalendarCell
                key={date}
                date={date}
                year={year}
                month={month}
                instances={filteredInstancesByDate[date] ?? []}
              />
            ))}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-ink-3">
        拖动任务到日期格可改期；从任务列表拖入可快速设置日期。
      </p>
    </div>
  )
}
