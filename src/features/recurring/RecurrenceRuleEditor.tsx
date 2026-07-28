import { useMemo, useState } from 'react'
import { RRule } from 'rrule'
import { Field, Input, Select } from '@/components/ui/Input'
import { previewRRule } from '@/lib/rrule-expand'
import { todayKey } from '@/lib/date-utils'

export interface RecurrenceValue {
  rrule: string | null
  rrule_end_date: string | null
}

type Freq = 'none' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
type EndMode = 'never' | 'date' | 'count'

const WEEKDAYS = [
  { label: '一', rrule: 'MO' },
  { label: '二', rrule: 'TU' },
  { label: '三', rrule: 'WE' },
  { label: '四', rrule: 'TH' },
  { label: '五', rrule: 'FR' },
  { label: '六', rrule: 'SA' },
  { label: '日', rrule: 'SU' },
]

export function parseRecurrence(rrule: string | null, endDate: string | null): RecurrenceValue & {
  freq: Freq
  interval: number
  byDays: string[]
  endMode: EndMode
  count: number
} {
  const base = {
    rrule,
    rrule_end_date: endDate,
    freq: 'none' as Freq,
    interval: 1,
    byDays: [] as string[],
    endMode: (endDate ? 'date' : 'never') as EndMode,
    count: 10,
  }
  if (!rrule) return base
  try {
    const opts = RRule.parseString(rrule)
    const freq =
      opts.freq === RRule.DAILY
        ? 'DAILY'
        : opts.freq === RRule.WEEKLY
          ? 'WEEKLY'
          : opts.freq === RRule.MONTHLY
            ? 'MONTHLY'
            : 'none'
    const rawByWeekday = opts.byweekday
    const weekdayArr = Array.isArray(rawByWeekday) ? rawByWeekday : rawByWeekday != null ? [rawByWeekday] : []
    const byDays = weekdayArr
      .map((w) => (typeof w === 'number' ? WEEKDAYS[w]?.rrule : String(w)))
      .filter((s): s is string => Boolean(s && s.length === 2))
    return {
      ...base,
      freq,
      interval: opts.interval ?? 1,
      byDays,
      endMode: opts.count ? 'count' : endDate ? 'date' : 'never',
      count: opts.count ?? 10,
    }
  } catch {
    return base
  }
}

export function RecurrenceRuleEditor({
  value,
  onChange,
  startDate,
}: {
  value: RecurrenceValue
  onChange: (v: RecurrenceValue) => void
  startDate: string | null
}) {
  const parsed = useMemo(
    () => parseRecurrence(value.rrule, value.rrule_end_date),
    [value.rrule, value.rrule_end_date],
  )
  const [freq, setFreq] = useState<Freq>(parsed.freq)
  const [interval, setInterval_] = useState(parsed.interval)
  const [byDays, setByDays] = useState<string[]>(parsed.byDays)
  const [endMode, setEndMode] = useState<EndMode>(parsed.endMode)
  const [endDate, setEndDate] = useState(value.rrule_end_date ?? '')
  const [count, setCount] = useState(parsed.count)

  function emit(next: {
    freq?: Freq
    interval?: number
    byDays?: string[]
    endMode?: EndMode
    endDate?: string
    count?: number
  }) {
    const f = next.freq ?? freq
    const i = next.interval ?? interval
    const days = next.byDays ?? byDays
    const em = next.endMode ?? endMode
    const ed = next.endDate ?? endDate
    const c = next.count ?? count

    if (f === 'none') {
      onChange({ rrule: null, rrule_end_date: null })
      return
    }
    const parts = [`FREQ=${f}`]
    if (i > 1) parts.push(`INTERVAL=${i}`)
    if (f === 'WEEKLY' && days.length > 0) parts.push(`BYDAY=${days.join(',')}`)
    if (em === 'count') parts.push(`COUNT=${c}`)
    onChange({ rrule: parts.join(';'), rrule_end_date: em === 'date' && ed ? ed : null })
  }

  const preview = value.rrule ? previewRRule(value.rrule, startDate ?? todayKey()) : []

  return (
    <div className="space-y-2.5 rounded-xl border border-canvas-3 bg-canvas-2/50 p-3.5">
      <Field label="重复">
        <Select
          value={freq}
          onChange={(e) => {
            const f = e.target.value as Freq
            setFreq(f)
            emit({ freq: f })
          }}
        >
          <option value="none">不重复</option>
          <option value="DAILY">每天</option>
          <option value="WEEKLY">每周</option>
          <option value="MONTHLY">每月</option>
        </Select>
      </Field>

      {freq !== 'none' && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-3">每</span>
            <Input
              type="number"
              min={1}
              max={99}
              value={interval}
              className="w-16"
              onChange={(e) => {
                const i = Math.max(1, Number(e.target.value) || 1)
                setInterval_(i)
                emit({ interval: i })
              }}
            />
            <span className="text-xs text-ink-3">
              {freq === 'DAILY' ? '天' : freq === 'WEEKLY' ? '周' : '个月'}
            </span>
          </div>

          {freq === 'WEEKLY' && (
            <div className="flex gap-1">
              {WEEKDAYS.map((d) => {
                const active = byDays.includes(d.rrule)
                return (
                  <button
                    key={d.rrule}
                    type="button"
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      active
                        ? 'bg-royal text-white shadow-sm'
                        : 'bg-white text-ink-2 hover:bg-canvas-2 shadow-xs'
                    }`}
                    onClick={() => {
                      const days = active
                        ? byDays.filter((x) => x !== d.rrule)
                        : [...byDays, d.rrule]
                      setByDays(days)
                      emit({ byDays: days })
                    }}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-ink-3">
            <span>结束</span>
            <Select
              value={endMode}
              className="w-auto"
              onChange={(e) => {
                const em = e.target.value as EndMode
                setEndMode(em)
                emit({ endMode: em })
              }}
            >
              <option value="never">永不</option>
              <option value="date">按日期</option>
              <option value="count">按次数</option>
            </Select>
            {endMode === 'date' && (
              <Input
                type="date"
                value={endDate}
                className="w-auto"
                onChange={(e) => {
                  setEndDate(e.target.value)
                  emit({ endDate: e.target.value })
                }}
              />
            )}
            {endMode === 'count' && (
              <>
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={count}
                  className="w-16"
                  onChange={(e) => {
                    const c = Math.max(1, Number(e.target.value) || 1)
                    setCount(c)
                    emit({ count: c })
                  }}
                />
                <span>次</span>
              </>
            )}
          </div>

          {preview.length > 0 && (
            <p className="text-xs text-ink-3">预览：{preview.join('、')} …</p>
          )}
        </>
      )}
    </div>
  )
}
