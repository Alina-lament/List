import { create } from 'zustand'
import type { CalendarTaskInstance } from '@/types/calendar'
import { api } from '@/lib/api'
import { expandInstances } from '@/lib/rrule-expand'
import { getMonthGrid, shiftMonth, gridToWeeks, isCurrentMonth, dateKey } from '@/lib/date-utils'

interface CalendarState {
  year: number
  month: number
  weekCount: 1 | 2 | 4
  startWeekOffset: number
  showFullMonth: boolean
  instancesByDate: Record<string, CalendarTaskInstance[]>
  loaded: boolean
  loading: boolean

  setMonth(year: number, month: number): void
  shiftMonth(delta: number): void
  goToday(): void
  setWeekCount(n: 1 | 2 | 4): void
  setShowFullMonth(v: boolean): void
  shiftWeeks(delta: number): void
  fetchMonth(): Promise<void>
  refreshIfLoaded(): Promise<void>
}

const now = new Date()
const initialGrid = getMonthGrid(now.getFullYear(), now.getMonth() + 1)
const initialWeeks = gridToWeeks(initialGrid)
const initialVisibleWeeks = initialWeeks.filter((w) => w.some((d) => isCurrentMonth(d, now.getFullYear(), now.getMonth() + 1)))
const todayIdx = initialVisibleWeeks.findIndex((w) => w.includes(dateKey(now)))

export const useCalendarStore = create<CalendarState>()((set, get) => ({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  weekCount: 4,
  startWeekOffset: Math.max(0, todayIdx),
  showFullMonth: false,
  instancesByDate: {},
  loaded: false,
  loading: false,

  setMonth(year, month) {
    set({ year, month, startWeekOffset: 0 })
    void get().fetchMonth()
  },

  shiftMonth(delta) {
    const { year, month, setMonth } = get()
    const next = shiftMonth(year, month, delta)
    setMonth(next.year, next.month)
  },

  goToday() {
    const d = new Date()
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const grid = getMonthGrid(y, m)
    const weeks = gridToWeeks(grid)
    const visibleWeeks = weeks.filter((w) => w.some((day) => isCurrentMonth(day, y, m)))
    const idx = visibleWeeks.findIndex((w) => w.includes(dateKey(d)))
    set({ year: y, month: m, startWeekOffset: Math.max(0, idx), showFullMonth: get().showFullMonth })
    void get().fetchMonth()
  },

  setWeekCount(n) {
    set({ weekCount: n })
  },

  setShowFullMonth(v) {
    set({ showFullMonth: v, startWeekOffset: 0 })
  },

  shiftWeeks(delta) {
    const { year, month, startWeekOffset, weekCount, showFullMonth, fetchMonth } = get()
    if (showFullMonth) {
      const { shiftMonth } = get()
      shiftMonth(delta > 0 ? 1 : -1)
      set({ startWeekOffset: 0 })
      return
    }
    const step = weekCount
    const grid = getMonthGrid(year, month)
    const weeks = gridToWeeks(grid)
    const visibleWeeks = weeks.filter((w) => w.some((d) => isCurrentMonth(d, year, month)))
    const nextOffset = startWeekOffset + delta
    if (nextOffset < 0) {
      const prev = shiftMonth(year, month, -1)
      const prevGrid = getMonthGrid(prev.year, prev.month)
      const prevWeeks = gridToWeeks(prevGrid).filter((w) => w.some((d) => isCurrentMonth(d, prev.year, prev.month)))
      const prevOffset = Math.max(0, prevWeeks.length - step)
      set({ year: prev.year, month: prev.month, startWeekOffset: prevOffset })
      void fetchMonth()
    } else if (nextOffset > visibleWeeks.length - step) {
      const next = shiftMonth(year, month, 1)
      set({ year: next.year, month: next.month, startWeekOffset: 0 })
      void fetchMonth()
    } else {
      set({ startWeekOffset: nextOffset })
    }
  },

  async fetchMonth() {
    const { year, month } = get()
    const grid = getMonthGrid(year, month)
    set({ loading: true })
    try {
      const data = await api.getTasksByDateRange(grid[0], grid[grid.length - 1])
      set({ instancesByDate: expandInstances(data, grid[0], grid[grid.length - 1]), loaded: true, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  async refreshIfLoaded() {
    if (get().loaded) await get().fetchMonth()
  },
}))
