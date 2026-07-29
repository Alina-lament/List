import dayjs from 'dayjs'

interface JournalCalendarProps {
  year: number
  month: number
  selectedDate: string
  markedDates: Set<string>
  onSelect: (date: string) => void
  onChangeMonth: (year: number, month: number) => void
}

const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日']

export function JournalCalendar({ year, month, selectedDate, markedDates, onSelect, onChangeMonth }: JournalCalendarProps) {
  const first = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
  const startDow = (first.day() + 6) % 7 // Mon=0
  const daysInMonth = first.daysInMonth()
  const today = dayjs().format('YYYY-MM-DD')

  const cells: { day: number; key: string }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, key })
  }

  function changeMonth(delta: number) {
    const next = first.add(delta, 'month')
    onChangeMonth(next.year(), next.month() + 1)
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    if (e.deltaY > 0) {
      changeMonth(1)
    } else if (e.deltaY < 0) {
      changeMonth(-1)
    }
  }

  return (
    <div className="w-full" onWheel={handleWheel}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <select
            value={year}
            onChange={(e) => onChangeMonth(Number(e.target.value), month)}
            className="rounded-lg bg-canvas-2/70 px-2 py-1 text-xs font-medium text-ink ring-1 ring-canvas-3/40 focus:outline-none"
          >
            {Array.from({ length: 21 }, (_, i) => dayjs().year() - 10 + i).map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => onChangeMonth(year, Number(e.target.value))}
            className="rounded-lg bg-canvas-2/70 px-2 py-1 text-xs font-medium text-ink ring-1 ring-canvas-3/40 focus:outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => changeMonth(-1)}
            className="rounded-lg p-1 text-ink-3 transition-colors hover:bg-canvas-2 hover:text-ink"
            aria-label="上一月"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => changeMonth(1)}
            className="rounded-lg p-1 text-ink-3 transition-colors hover:bg-canvas-2 hover:text-ink"
            aria-label="下一月"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-ink-3">
        {WEEK_DAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {cells.map(({ day, key }) => {
          const selected = key === selectedDate
          const marked = markedDates.has(key)
          const isToday = key === today
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-2xl text-[12px] font-medium transition-all duration-150 ${
                selected
                  ? 'bg-royal text-white shadow-sm'
                  : isToday
                    ? 'bg-royal-50 text-royal'
                    : 'text-ink-2 hover:bg-canvas-2'
              }`}
            >
              {day}
              {marked && !selected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-royal" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
