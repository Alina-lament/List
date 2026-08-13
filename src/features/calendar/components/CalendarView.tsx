import { useEffect, useMemo, useRef, useState } from 'react'
import type { Task } from '@shared/types'
import type { CalendarTaskInstance } from '@/types/calendar'
import { api } from '@/lib/api'
import { formatMonthTitle, getMonthGrid, getISOWeekNumber, gridToWeeks, isCurrentMonth } from '@/lib/date-utils'
import { Button } from '@/components/ui/Button'
import { useCalendarStore } from '../store'
import { useSettingsStore } from '@/features/settings/store'
import { useTasksStore } from '@/features/tasks/store'
import { CalendarCell } from './CalendarCell'
import { CalendarTaskBlock } from './CalendarTaskBlock'
import { TaskFormDialog } from '@/features/tasks/components/TaskFormDialog'

const WEEKDAYS_FULL = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

type DialogState =
  | { mode: 'edit'; task: Task }
  | { mode: 'create'; date: string }
  | null

export function CalendarView() {
  const {
    year,
    month,
    weekCount,
    startWeekOffset,
    showFullMonth,
    instancesByDate,
    loading,
    shiftMonth,
    shiftWeeks,
    goToday,
    setWeekCount,
    setShowFullMonth,
    fetchMonth,
  } = useCalendarStore()
  const { selectedListId } = useTasksStore()
  const { calendarWeekCount, calendarShowFullMonth, setCalendarWeekCount, setCalendarShowFullMonth } = useSettingsStore()
  const [dialog, setDialog] = useState<DialogState>(null)
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null)
  const wheelAccum = useRef(0)

  // 启动时从设置恢复周数和整月选项
  useEffect(() => {
    if ([1, 2, 4].includes(calendarWeekCount)) {
      setWeekCount(calendarWeekCount as 1 | 2 | 4)
    }
    setShowFullMonth(calendarShowFullMonth)
    void fetchMonth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 设置变更时同步到日历本地状态
  useEffect(() => {
    setShowFullMonth(calendarShowFullMonth)
  }, [calendarShowFullMonth, setShowFullMonth])

  // 切换月份或滚动起始周时清除周选择
  useEffect(() => {
    setSelectedWeekStart(null)
  }, [year, month, startWeekOffset])

  const grid = getMonthGrid(year, month)
  const weeks = gridToWeeks(grid)

  // 按选中清单过滤任务实例，并排除已完成任务
  const filteredInstancesByDate = useMemo(() => {
    const filtered: Record<string, CalendarTaskInstance[]> = {}
    for (const [date, arr] of Object.entries(instancesByDate)) {
      filtered[date] = arr.filter((i) => (!selectedListId || i.list_id === selectedListId) && !i.is_completed)
    }
    return filtered
  }, [instancesByDate, selectedListId])



  // 过滤掉完全不包含当前月份的周（首尾可能全部是其他月份）
  const visibleWeeks = weeks.filter((w) =>
    w.some((d) => isCurrentMonth(d, year, month)),
  )

  // 整月模式显示全部含当月日期周；否则按起始偏移显示 weekCount 周
  const startIdx = showFullMonth
    ? 0
    : Math.max(0, Math.min(startWeekOffset, visibleWeeks.length - weekCount))
  const displayWeeks = showFullMonth ? visibleWeeks : visibleWeeks.slice(startIdx, startIdx + weekCount)

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
      shiftWeeks(showFullMonth ? 1 : weekCount)
      wheelAccum.current = 0
    } else if (wheelAccum.current <= -threshold) {
      shiftWeeks(showFullMonth ? -1 : -weekCount)
      wheelAccum.current = 0
    }
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
                void setCalendarWeekCount(n)
                if (showFullMonth) {
                  void setCalendarShowFullMonth(false)
                  setShowFullMonth(false)
                }
                setSelectedWeekStart(null)
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                weekCount === n && !showFullMonth
                  ? 'bg-white text-ink shadow-xs ring-1 ring-ink/5'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              {n}周
            </button>
          ))}
          <button
            onClick={() => {
              const next = !showFullMonth
              void setCalendarShowFullMonth(next)
              setShowFullMonth(next)
              setSelectedWeekStart(null)
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              showFullMonth
                ? 'bg-white text-ink shadow-xs ring-1 ring-ink/5'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            整月
          </button>
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
          const weekNum = getISOWeekNumber(weekDays[0])
          return (
            <div key={weekDays[0]} className="contents">
              {weekDays.map((date) => (
                <CalendarCell
                  key={date}
                  date={date}
                  year={year}
                  month={month}
                  instances={filteredInstancesByDate[date] ?? []}
                  onEditInstance={handleEdit}
                  onCreateAt={(d) => setDialog({ mode: 'create', date: d })}
                  onSelectWeek={() =>
                    setSelectedWeekStart(isSelected ? null : weekDays[0])
                  }
                  isWeekSelected={isSelected}
                  weekNumber={weekNum}
                  showWeekNumber={date === weekDays[0]}
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
          instancesByDate={filteredInstancesByDate}
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
  onEditInstance,
  onCreateAt,
}: {
  weekDays: string[]
  instancesByDate: Record<string, CalendarTaskInstance[]>
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
                      onEdit={onEditInstance}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
