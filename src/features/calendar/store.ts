import { create } from 'zustand'
import type { CalendarTaskInstance } from '@/types/calendar'
import { api } from '@/lib/api'
import { expandInstances } from '@/lib/rrule-expand'
import { getMonthGrid, shiftMonth } from '@/lib/date-utils'

interface CalendarState {
  year: number
  month: number
  weekCount: 1 | 2 | 4
  instancesByDate: Record<string, CalendarTaskInstance[]>
  loaded: boolean
  loading: boolean

  setMonth(year: number, month: number): void
  shiftMonth(delta: number): void
  goToday(): void
  setWeekCount(n: 1 | 2 | 4): void
  fetchMonth(): Promise<void>
  refreshIfLoaded(): Promise<void>
}

const now = new Date()

export const useCalendarStore = create<CalendarState>()((set, get) => ({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  weekCount: 4,
  instancesByDate: {},
  loaded: false,
  loading: false,

  setMonth(year, month) {
    set({ year, month })
    void get().fetchMonth()
  },

  shiftMonth(delta) {
    const { year, month, setMonth } = get()
    const next = shiftMonth(year, month, delta)
    setMonth(next.year, next.month)
  },

  goToday() {
    const d = new Date()
    get().setMonth(d.getFullYear(), d.getMonth() + 1)
  },

  setWeekCount(n) {
    set({ weekCount: n })
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
