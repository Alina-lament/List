import dayjs from 'dayjs'
import type { DailyCompletion, DailyRoutine } from '@shared/types'

interface Props {
  routines: DailyRoutine[]
  completions: DailyCompletion[]
  year: number
  month: number
  selectedDate: string
  onSelectDate: (date: string) => void
  onChangeMonth: (year: number, month: number) => void
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

export function isRoutineActiveOnDate(routine: DailyRoutine, date: string): boolean {
  if (routine.is_archived) return false
  if (!routine.active) return false
  if (routine.start_date && date < routine.start_date) return false
  if (routine.end_date && date > routine.end_date) return false
  const days = JSON.parse(routine.days_of_week || '[]') as number[]
  if (days.length === 0) return true
  const dow = dayjs(date).day()
  return days.includes(dow)
}

function completionFor(routine: DailyRoutine, date: string, completions: DailyCompletion[]): { count: number; target: number; done: boolean } {
  if (routine.items.length > 0) {
    let count = 0
    let target = 0
    let done = true
    for (const item of routine.items) {
      const c = completions.find(
        (c) => c.routine_id === routine.id && c.date === date && c.item_id === item.id,
      )?.count ?? 0
      count += c
      target += item.target_count
      if (c < item.target_count) done = false
    }
    return { count, target, done }
  }
  const count = completions.find((c) => c.routine_id === routine.id && c.date === date && !c.item_id)?.count ?? 0
  return { count, target: routine.target_count, done: count >= routine.target_count }
}

export function DailyCalendar({ routines, completions, year, month, selectedDate, onSelectDate, onChangeMonth }: Props) {
  const first = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
  const daysInMonth = first.daysInMonth()
  const today = dayjs().format('YYYY-MM-DD')

  const dates: string[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }

  return (
    <div className="rounded-2xl border border-canvas-3 bg-white p-5 shadow-card">
      {/* 月份导航 */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChangeMonth(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1)}
            className="rounded-xl p-2 text-ink-3 transition-colors hover:bg-canvas-2"
            aria-label="上个月"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="min-w-[120px] text-center text-base font-bold text-ink">
            {year}年{month}月
          </span>
          <button
            onClick={() => onChangeMonth(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1)}
            className="rounded-xl p-2 text-ink-3 transition-colors hover:bg-canvas-2"
            aria-label="下个月"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => {
            const d = dayjs()
            onChangeMonth(d.year(), d.month() + 1)
          }}
          className="rounded-xl bg-canvas-2 px-3.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-canvas-3 hover:text-ink"
        >
          今天
        </button>
      </div>

      {routines.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-4">暂无每日任务</p>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[900px]">
            {/* 日期表头 */}
            <div
              className="grid border-b border-canvas-3 pb-3"
              style={{ gridTemplateColumns: `200px repeat(${dates.length}, minmax(48px, 1fr))` }}
            >
              <div className="sticky left-0 bg-white px-3 text-sm font-bold text-ink">每日任务</div>
              {dates.map((date) => {
                const isToday = date === today
                const isSelected = date === selectedDate
                const dayNum = date.slice(8, 10)
                const weekday = WEEKDAYS[(dayjs(date).day() + 6) % 7]
                return (
                  <div
                    key={date}
                    className={`flex flex-col items-center justify-center gap-1 py-1 text-xs ${
                      isToday || isSelected ? 'font-bold text-royal' : 'text-ink-3'
                    }`}
                  >
                    <span>{weekday}</span>
                    <button
                      onClick={() => onSelectDate(date)}
                      title={`查看 ${date} 的完成情况`}
                      aria-label={`查看 ${date}`}
                      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                        isToday
                          ? 'bg-royal text-white shadow-sm hover:bg-royal/90'
                          : isSelected
                            ? 'text-royal ring-2 ring-royal hover:bg-royal-50'
                            : 'hover:bg-canvas-2'
                      }`}
                    >
                      {dayNum}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* 每个 routine 一行 */}
            <div className="mt-3 space-y-3">
              {routines.map((routine) => {
                const { count: monthCount, target: monthTarget } = dates.reduce(
                  (acc, date) => {
                    if (!isRoutineActiveOnDate(routine, date)) return acc
                    const { count, target } = completionFor(routine, date, completions)
                    return { count: acc.count + count, target: acc.target + target }
                  },
                  { count: 0, target: 0 },
                )
                const monthProgress = monthTarget > 0 ? Math.round((monthCount / monthTarget) * 100) : 0

                return (
                  <div
                    key={routine.id}
                    className="grid items-center"
                    style={{ gridTemplateColumns: `200px repeat(${dates.length}, minmax(48px, 1fr))` }}
                  >
                    <div className="sticky left-0 bg-white px-3 py-2">
                      <div className="truncate text-sm font-semibold text-ink" title={routine.title}>
                        {routine.title}
                      </div>
                      <div className="mt-1 text-xs text-ink-4">
                        本月 {monthCount}/{monthTarget} · {monthProgress}%
                      </div>
                    </div>
                    {dates.map((date) => {
                      const active = isRoutineActiveOnDate(routine, date)
                      if (!active) {
                        return (
                          <div key={date} className="flex h-12 items-center justify-center">
                            <span
                              className="h-2 w-2 rounded-full bg-canvas-2"
                              title="当日不活跃"
                            />
                          </div>
                        )
                      }
                      const { count, target, done } = completionFor(routine, date, completions)
                      const partial = count > 0 && !done
                      return (
                        <div key={date} className="flex h-12 items-center justify-center p-1">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-150 ${
                              done
                                ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                                : partial
                                  ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                  : 'bg-canvas-2 text-ink-4'
                            }`}
                            title={`${routine.title} · ${date} · ${count}/${target}`}
                          >
                            {done ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              `${count}/${target}`
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* 图例 */}
            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-canvas-3 pt-4 text-xs text-ink-3">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-100" />
                <span>已完成</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-50 ring-1 ring-amber-200" />
                <span>进行中</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-canvas-2" />
                <span>未开始</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-canvas-2" />
                <span>不活跃</span>
              </div>
              <span className="ml-auto text-ink-4">点击表头日期可查看并修改当天完成情况</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
