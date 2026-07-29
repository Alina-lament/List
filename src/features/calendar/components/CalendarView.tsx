import { useEffect, useMemo, useRef, useState } from 'react'
import type { Task } from '@shared/types'
import type { CalendarTaskInstance } from '@/types/calendar'
import { api } from '@/lib/api'
import { formatMonthTitle, getMonthGrid, getISOWeekNumber, gridToWeeks, isCurrentMonth } from '@/lib/date-utils'
import { Button } from '@/components/ui/Button'
import { useCalendarStore } from '../store'
import { useSettingsStore } from '@/features/settings/store'
import { useDailyStore } from '@/features/daily/store'
import { CalendarCell } from './CalendarCell'
import { CalendarTaskBlock } from './CalendarTaskBlock'
import { TaskFormDialog } from '@/features/tasks/components/TaskFormDialog'

const WEEKDAYS_FULL = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

type DialogState =
  | { mode: 'edit'; task: Task }
  | { mode: 'create'; date: string }
  | null

export function CalendarView() {
  const { year, month, weekCount, instancesByDate, loading, shiftMonth, goToday, setWeekCount, fetchMonth } =
    useCalendarStore()
  const { routines: dailyRoutines, completions: dailyCompletions } = useDailyStore()
  const [dialog, setDialog] = useState<DialogState>(null)
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null)
  const wheelAccum = useRef(0)

  useEffect(() => {
    void fetchMonth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 切换月份时清除周选择
  useEffect(() => {
    setSelectedWeekStart(null)
  }, [year, month])

  const grid = getMonthGrid(year, month)
  const weeks = gridToWeeks(grid)

  // 预计算每天活跃的每日任务
  const dailyByDate = useMemo(() => {
    const map: Record<string, { routine: typeof dailyRoutines[0]; item: { id: string; title: string; target_count: number } }[]> = {}
    if (dailyRoutines.length === 0) return map
    for (const date of grid) {
      const dayOfWeek = new Date(
        parseInt(date.slice(0, 4)), parseInt(date.slice(5, 7)) - 1, parseInt(date.slice(8, 10)),
      ).getDay()
      const entries: typeof map[string] = []
      for (const r of dailyRoutines) {
        if (!r.active) continue
        const days = JSON.parse(r.days_of_week || '[]') as number[]
        if (days.length > 0 && !days.includes(dayOfWeek)) continue
        const items = r.items.length > 0 ? r.items : [{ id: r.id, title: r.title, target_count: r.target_count }]
        for (const item of items) {
          entries.push({ routine: r, item })
        }
      }
      map[date] = entries
    }
    return map
  }, [grid, dailyRoutines])

  // 过滤掉完全不包含当前月份的周（首尾可能全部是其他月份）
  const visibleWeeks = weeks.filter((w) =>
    w.some((d) => isCurrentMonth(d, year, month)),
  )

  // 找到包含今天的周索引，确保至少显示 weekCount 周
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayWeekIdx = visibleWeeks.findIndex((w) => w.includes(todayKey))
  const rawStart = todayWeekIdx >= 0 ? todayWeekIdx : 0
  // 从后往前挪，保证至少有 weekCount 周可显示
  const startIdx = Math.max(0, Math.min(rawStart, visibleWeeks.length - weekCount))
  const displayWeeks = visibleWeeks.slice(startIdx, startIdx + weekCount)

  // 选中周的 7 天
  const selectedWeekDays = selectedWeekStart
    ? grid.slice(
        grid.indexOf(selectedWeekStart),
        grid.indexOf(selectedWeekStart) + 7,
      )
    : null

  function handleWheel(e: React.WheelEvent) {
    wheelAccum.current += e.deltaY
    const threshold = useSettingsStore.getState().scrollSensitivity
    if (wheelAccum.current >= threshold) {
      shiftMonth(1)
      wheelAccum.current = 0
    } else if (wheelAccum.current <= -threshold) {
      shiftMonth(-1)
      wheelAccum.current = 0
    }
  }

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
    <div className="flex h-full flex-col px-5 py-5" onWheel={handleWheel}>
      {/* 头部导航 */}
      <div className="mb-4 flex items-center gap-2">
        <Button onClick={() => shiftMonth(-1)} aria-label="上一月">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        <h2 className="min-w-40 text-center text-xl font-bold tracking-tight text-ink">
          {formatMonthTitle(year, month)}
        </h2>
        <Button onClick={() => shiftMonth(1)} aria-label="下一月">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        <Button variant="primary" size="sm" onClick={goToday} className="ml-2">
          今天
        </Button>
        {loading && <span className="text-xs text-ink-4">加载中…</span>}
        <div className="ml-auto flex items-center rounded-lg border border-canvas-3 bg-canvas-2 p-0.5">
          {([1, 2, 4] as const).map((n) => (
            <button
              key={n}
              onClick={() => {
                setWeekCount(n)
                setSelectedWeekStart(null)
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                weekCount === n
                  ? 'bg-white text-ink shadow-xs ring-1 ring-ink/5'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              {n}周
            </button>
          ))}
        </div>
        {selectedWeekStart && (
          <Button
            size="sm"
            onClick={() => setSelectedWeekStart(null)}
          >
            关闭周视图
          </Button>
        )}
      </div>

      {/* 日历网格 */}
      <div className={`grid grid-cols-7 overflow-hidden rounded-2xl border border-canvas-3 bg-white shadow-card ${selectedWeekStart ? '' : 'flex-1'}`} style={{ gridTemplateRows: `auto repeat(${displayWeeks.length}, 1fr)` }}>
        {/* 表头 */}
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-b border-r border-canvas-3 bg-canvas-2 py-2.5 text-center text-xs font-semibold text-ink-2 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}

        {/* 按周渲染 */}
        {displayWeeks.map((weekDays) => {
          const isSelected = selectedWeekStart === weekDays[0]
          return (
            <div key={weekDays[0]} className="contents">
              {weekDays.map((date) => (
                <CalendarCell
                  key={date}
                  date={date}
                  year={year}
                  month={month}
                  instances={instancesByDate[date] ?? []}
                  dailyEntries={dailyByDate[date] ?? []}
                  dailyCompletions={dailyCompletions}
                  onToggleInstance={handleToggle}
                  onEditInstance={handleEdit}
                  onCreateAt={(d) => setDialog({ mode: 'create', date: d })}
                  onSelectWeek={() =>
                    setSelectedWeekStart(isSelected ? null : weekDays[0])
                  }
                  isWeekSelected={isSelected}
                />
              ))}
            </div>
          )
        })}
      </div>

      {/* 周详情面板 */}
      {selectedWeekStart && selectedWeekDays && (
        <WeekDetail
          weekDays={selectedWeekDays}
          instancesByDate={instancesByDate}
          dailyByDate={dailyByDate}
          dailyCompletions={dailyCompletions}
          onToggleInstance={handleToggle}
          onEditInstance={handleEdit}
          onCreateAt={(d) => setDialog({ mode: 'create', date: d })}
        />
      )}

      <TaskFormDialog
        open={dialog !== null}
        onClose={closeDialog}
        task={dialog?.mode === 'edit' ? dialog.task : null}
        defaultDueDate={dialog?.mode === 'create' ? dialog.date : null}
      />
    </div>
  )
}

// ── 周详情组件 ──
function WeekDetail({
  weekDays,
  instancesByDate,
  dailyByDate,
  dailyCompletions,
  onToggleInstance,
  onEditInstance,
  onCreateAt,
}: {
  weekDays: string[]
  instancesByDate: Record<string, CalendarTaskInstance[]>
  dailyByDate: Record<string, { routine: import('@shared/types').DailyRoutine; item: { id: string; title: string; target_count: number } }[]>
  dailyCompletions: import('@shared/types').DailyCompletion[]
  onToggleInstance: (instance: CalendarTaskInstance) => void
  onEditInstance: (instance: CalendarTaskInstance) => void
  onCreateAt: (date: string) => void
}) {
  const weekNum = getISOWeekNumber(weekDays[0])
  const dayRange = `${weekDays[0].slice(5)} — ${weekDays[6].slice(5)}`

  return (
    <div className="mt-4 flex flex-1 flex-col overflow-hidden rounded-2xl border border-canvas-3 bg-white shadow-card">
      {/* 周详情头部 */}
      <div className="flex items-center gap-2 border-b border-canvas-3 bg-canvas-2 px-4 py-2.5">
        <span className="rounded-lg bg-royal px-2.5 py-0.5 text-xs font-bold text-white">
          第 {weekNum} 周
        </span>
        <span className="text-sm font-medium text-ink-2">
          {dayRange}
        </span>
      </div>

      {/* 7 列日视图 */}
      <div className="grid flex-1 grid-cols-7 overflow-hidden">
        {weekDays.map((date, idx) => {
          const instances = instancesByDate[date] ?? []
          const dayLabel = date.slice(8, 10)
          const weekday = WEEKDAYS_FULL[idx]
          return (
            <div
              key={date}
              onDoubleClick={() => onCreateAt(date)}
              className="flex flex-col border-r border-canvas-3 last:border-r-0 overflow-hidden"
            >
              {/* 日头 */}
              <div className="border-b border-canvas-3 bg-canvas-2 px-2 py-1.5 text-center">
                <div className="text-[10px] text-ink-3">{weekday}</div>
                <div className="text-sm font-bold text-ink">{dayLabel}</div>
                {instances.length > 0 && (
                  <div className="mt-0.5 text-[10px] text-ink-4">
                    {instances.length} 项
                  </div>
                )}
              </div>
              {/* 任务列表 */}
              <div className="flex-1 space-y-1 overflow-y-auto p-1.5">
                {instances.length === 0 ? (
                  <p className="px-1 py-4 text-center text-[10px] text-ink-4">
                    暂无
                  </p>
                ) : (
                  instances.map((instance) => (
                    <CalendarTaskBlock
                      key={instance.instance_id}
                      instance={instance}
                      onToggle={onToggleInstance}
                      onEdit={onEditInstance}
                    />
                  ))
                )}
                {/* 每日任务 */}
                {(() => {
                  const entries = dailyByDate[date] ?? []
                  if (entries.length === 0) return null
                  return (
                    <div className="mt-2 border-t border-canvas-3 pt-1">
                      {entries.map(({ routine: r, item }) => {
                        const comp = dailyCompletions.find(
                          (c) => c.routine_id === r.id && c.date === date && (r.items.length > 0 ? c.item_id === item.id : !c.item_id),
                        )
                        const c = comp?.count ?? 0
                        const done = c >= item.target_count
                        return (
                          <div key={`${r.id}-${item.id}`} className={`flex items-center gap-1 px-1 py-0.5 text-[10px] ${done ? 'text-ink-4 line-through' : 'text-ink-2'}`}>
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-sm ${done ? 'bg-emerald-400' : c > 0 ? 'bg-amber-300' : 'bg-canvas-3'}`} />
                            <span className="truncate">{item.title}</span>
                            <span className="shrink-0 text-ink-4">{c}/{item.target_count}</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
