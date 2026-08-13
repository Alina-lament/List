import { create } from 'zustand'
import type { CreateDailyRoutineInput, DailyCompletion, DailyRoutine, UpdateDailyRoutineInput } from '@shared/types'
import { api } from '@/lib/api'
import { dateKey, parseDateKey, todayKey } from '@/lib/date-utils'

interface DailyState {
  routines: DailyRoutine[]
  completions: DailyCompletion[]
  currentDate: string
  loading: boolean
  error: string | null

  init(): Promise<void>
  createRoutine(input: CreateDailyRoutineInput): Promise<DailyRoutine>
  updateRoutine(id: string, patch: UpdateDailyRoutineInput): Promise<void>
  deleteRoutine(id: string): Promise<void>
  archiveRoutine(id: string): Promise<void>
  unarchiveRoutine(id: string): Promise<void>
  loadCompletionsByRange(start: string, end: string): Promise<void>
  loadCompletions(date: string): Promise<void>
  goDate(date: string): Promise<void>
  goPrevDay(): Promise<void>
  goNextDay(): Promise<void>
  goToday(): Promise<void>
  increment(routineId: string, itemId?: string | null, date?: string): Promise<void>
  decrement(routineId: string, itemId?: string | null, date?: string): Promise<void>
  clearError(): void
}

function completionKey(c: DailyCompletion): string {
  return `${c.routine_id}-${c.item_id ?? ''}-${c.date}`
}

/** 把新拉取的完成记录按 (routine_id, item_id, date) 合并进现有列表 */
function mergeCompletions(
  existing: DailyCompletion[],
  incoming: DailyCompletion[],
): DailyCompletion[] {
  const map = new Map(existing.map((c) => [completionKey(c), c]))
  for (const c of incoming) {
    map.set(completionKey(c), c)
  }
  return Array.from(map.values())
}

function prevDay(date: string): string {
  const d = parseDateKey(date)
  d.setDate(d.getDate() - 1)
  return dateKey(d)
}

function nextDay(date: string): string {
  const d = parseDateKey(date)
  d.setDate(d.getDate() + 1)
  return dateKey(d)
}

export const useDailyStore = create<DailyState>()((set, get) => ({
  routines: [],
  completions: [],
  currentDate: todayKey(),
  loading: false,
  error: null,

  async init() {
    set({ loading: true, error: null })
    try {
      const [routines, completions] = await Promise.all([
        api.getDailyRoutines(),
        api.getDailyCompletions(todayKey()),
      ])
      set({ routines, completions, loading: false })
    } catch (e) {
      set({ loading: false, error: `加载每日任务失败：${String(e)}` })
    }
  },

  async createRoutine(input) {
    const routine = await api.createDailyRoutine(input)
    set((s) => ({ routines: [...s.routines, routine] }))
    return routine
  },

  async updateRoutine(id, patch) {
    const updated = await api.updateDailyRoutine(id, patch)
    set((s) => ({
      routines: s.routines.map((r) => (r.id === id ? updated : r)),
    }))
  },

  async deleteRoutine(id) {
    await api.deleteDailyRoutine(id)
    set((s) => ({
      routines: s.routines.filter((r) => r.id !== id),
      completions: s.completions.filter((c) => c.routine_id !== id),
    }))
  },

  async archiveRoutine(id) {
    await api.updateDailyRoutine(id, { is_archived: 1 })
    set((s) => ({
      routines: s.routines.map((r) => (r.id === id ? { ...r, is_archived: 1 } : r)),
    }))
  },

  async unarchiveRoutine(id) {
    await api.updateDailyRoutine(id, { is_archived: 0 })
    set((s) => ({
      routines: s.routines.map((r) => (r.id === id ? { ...r, is_archived: 0 } : r)),
    }))
  },

  async loadCompletionsByRange(start, end) {
    try {
      const completions = await api.getDailyCompletionsByRange(start, end)
      set((s) => ({ completions: mergeCompletions(s.completions, completions) }))
    } catch (e) {
      set({ error: `加载完成情况失败：${String(e)}` })
    }
  },

  async loadCompletions(date) {
    try {
      const completions = await api.getDailyCompletions(date)
      set((s) => ({ completions: mergeCompletions(s.completions, completions) }))
    } catch (e) {
      set({ error: `加载完成情况失败：${String(e)}` })
    }
  },

  async goDate(date) {
    set({ currentDate: date })
    await get().loadCompletions(date)
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

  async increment(routineId, itemId, date) {
    const state = get()
    const routine = state.routines.find((r) => r.id === routineId)
    const maxCount = itemId
      ? (routine?.items.find((it) => it.id === itemId)?.target_count ?? Infinity)
      : (routine?.target_count ?? Infinity)
    const targetDate = date ?? state.currentDate
    const prev = state.completions.find((c) =>
      c.routine_id === routineId && c.date === targetDate && (itemId ? c.item_id === itemId : !c.item_id),
    )
    // 已达上限，不再增加
    if (prev && prev.count >= maxCount) return
    // 乐观更新
    if (prev) {
      set((s) => ({
        completions: s.completions.map((c) =>
          c.id === prev.id ? { ...c, count: Math.min(c.count + 1, maxCount) } : c,
        ),
      }))
    } else {
      set((s) => ({
        completions: [
          ...s.completions,
          { id: `opt-${routineId}-${itemId ?? 'r'}`, routine_id: routineId, item_id: itemId ?? null, date: targetDate, count: 1 },
        ],
      }))
    }
    try {
      const completion = await api.incrementDailyCompletion(routineId, targetDate, itemId)
      set((s) => ({
        completions: s.completions.map((c) =>
          c.routine_id === routineId && c.date === targetDate && (itemId ? c.item_id === itemId : !c.item_id)
            ? { ...completion, count: Math.min(completion.count, maxCount) }
            : c,
        ),
      }))
    } catch (e) {
      set({ completions: get().completions, error: `打卡失败：${String(e)}` })
    }
  },

  async decrement(routineId, itemId, date) {
    const targetDate = date ?? get().currentDate
    const prev = get().completions.find((c) =>
      c.routine_id === routineId && c.date === targetDate && (itemId ? c.item_id === itemId : !c.item_id),
    )
    if (!prev || prev.count <= 0) return
    // 乐观更新
    set((s) => ({
      completions: s.completions.map((c) =>
        c.id === prev.id ? { ...c, count: Math.max(0, c.count - 1) } : c,
      ),
    }))
    try {
      const completion = await api.decrementDailyCompletion(routineId, targetDate, itemId)
      set((s) => ({
        completions: s.completions.map((c) =>
          c.routine_id === routineId && c.date === targetDate && (itemId ? c.item_id === itemId : !c.item_id)
            ? { ...completion, count: Math.max(0, completion.count) }
            : c,
        ),
      }))
    } catch (e) {
      set({ completions: get().completions, error: `撤回失败：${String(e)}` })
    }
  },

  clearError() {
    set({ error: null })
  },
}))
