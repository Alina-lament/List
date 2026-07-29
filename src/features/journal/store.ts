import { create } from 'zustand'
import type { JournalEntry } from '@shared/types'
import { api } from '@/lib/api'

interface JournalState {
  currentDate: string
  content: string
  lastYearEntry: JournalEntry | null
  markedDates: Set<string>
  loading: boolean
  saving: boolean
  saveTimer: ReturnType<typeof setTimeout> | null
  error: string | null

  init(): Promise<void>
  load(date: string): Promise<void>
  setContent(content: string): void
  save(): Promise<void>
  delete(): Promise<void>
  goDate(date: string): Promise<void>
  goPrevDay(): Promise<void>
  goNextDay(): Promise<void>
  goToday(): Promise<void>
  loadMarkedDates(year: number, month: number): Promise<void>
  clearError(): void
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function prevDay(date: string): string {
  const d = new Date(date)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function nextDay(date: string): string {
  const d = new Date(date)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
  return { start, end }
}

export const useJournalStore = create<JournalState>()((set, get) => ({
  currentDate: todayKey(),
  content: '',
  lastYearEntry: null,
  markedDates: new Set(),
  loading: false,
  saving: false,
  saveTimer: null,
  error: null,

  async init() {
    await get().load(todayKey())
  },

  async load(date) {
    set({ loading: true, error: null })
    try {
      const [entry, lastYear, markedRange] = await Promise.all([
        api.getJournalByDate(date),
        api.getJournalLastYear(date),
        api.getJournalMarkedDates(...Object.values(monthRange(new Date(date).getFullYear(), new Date(date).getMonth() + 1)) as [string, string]),
      ])
      const markedDates = new Set(get().markedDates)
      for (const d of markedRange) markedDates.add(d)
      set({
        currentDate: date,
        content: entry?.content ?? '',
        lastYearEntry: lastYear,
        markedDates,
        loading: false,
      })
    } catch (e) {
      set({ loading: false, error: `加载日记失败：${String(e)}` })
    }
  },

  setContent(content) {
    const { saveTimer, currentDate } = get()
    if (saveTimer) clearTimeout(saveTimer)
    const timer = setTimeout(() => {
      void get().save()
    }, 1200)
    set({ content, saveTimer: timer })
    // 有内容时立刻把当天标记为已记录，提升导航高亮响应
    if (content.trim()) {
      set((s) => {
        const markedDates = new Set(s.markedDates)
        markedDates.add(currentDate)
        return { markedDates }
      })
    }
  },

  async save() {
    const { currentDate, content, saveTimer } = get()
    if (saveTimer) clearTimeout(saveTimer)
    set({ saving: true, saveTimer: null })
    try {
      const entry = await api.saveJournal(currentDate, content)
      set((s) => {
        const markedDates = new Set(s.markedDates)
        if (content.trim()) markedDates.add(entry.date)
        else markedDates.delete(entry.date)
        return { saving: false, markedDates }
      })
    } catch (e) {
      set({ saving: false, error: `保存日记失败：${String(e)}` })
    }
  },

  async delete() {
    const { currentDate } = get()
    try {
      await api.deleteJournal(currentDate)
      set({ content: '', lastYearEntry: null })
      set((s) => {
        const markedDates = new Set(s.markedDates)
        markedDates.delete(currentDate)
        return { markedDates }
      })
    } catch (e) {
      set({ error: `删除日记失败：${String(e)}` })
    }
  },

  async goDate(date) {
    await get().save()
    await get().load(date)
  },

  async goPrevDay() {
    await get().goDate(prevDay(get().currentDate))
  },

  async goNextDay() {
    await get().goDate(nextDay(get().currentDate))
  },

  async goToday() {
    await get().goDate(todayKey())
  },

  async loadMarkedDates(year, month) {
    try {
      const { start, end } = monthRange(year, month)
      const dates = await api.getJournalMarkedDates(start, end)
      set((s) => {
        const markedDates = new Set(s.markedDates)
        for (const d of dates) markedDates.add(d)
        return { markedDates }
      })
    } catch {
      // 标记失败不影响主功能
    }
  },

  clearError() {
    set({ error: null })
  },
}))
