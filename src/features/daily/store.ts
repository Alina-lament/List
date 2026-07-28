import { create } from 'zustand'
import type { CreateDailyRoutineInput, DailyCompletion, DailyRoutine, UpdateDailyRoutineInput } from '@shared/types'
import { api } from '@/lib/api'
import { todayKey } from '@/lib/date-utils'

interface DailyState {
  routines: DailyRoutine[]
  completions: DailyCompletion[]
  loading: boolean
  error: string | null

  init(): Promise<void>
  createRoutine(input: CreateDailyRoutineInput): Promise<DailyRoutine>
  updateRoutine(id: string, patch: UpdateDailyRoutineInput): Promise<void>
  deleteRoutine(id: string): Promise<void>
  increment(routineId: string, itemId?: string | null): Promise<void>
  decrement(routineId: string, itemId?: string | null): Promise<void>
  clearError(): void
}

export const useDailyStore = create<DailyState>()((set, get) => ({
  routines: [],
  completions: [],
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

  async increment(routineId, itemId) {
    const state = get()
    const routine = state.routines.find((r) => r.id === routineId)
    const maxCount = itemId
      ? (routine?.items.find((it) => it.id === itemId)?.target_count ?? Infinity)
      : (routine?.target_count ?? Infinity)
    const date = todayKey()
    const prev = state.completions.find((c) =>
      c.routine_id === routineId && c.date === date && (itemId ? c.item_id === itemId : !c.item_id),
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
          { id: `opt-${routineId}-${itemId ?? 'r'}`, routine_id: routineId, item_id: itemId ?? null, date, count: 1 },
        ],
      }))
    }
    try {
      const completion = await api.incrementDailyCompletion(routineId, date, itemId)
      set((s) => ({
        completions: s.completions.map((c) =>
          c.routine_id === routineId && c.date === date && (itemId ? c.item_id === itemId : !c.item_id)
            ? { ...completion, count: Math.min(completion.count, maxCount) }
            : c,
        ),
      }))
    } catch (e) {
      set({ completions: get().completions, error: `打卡失败：${String(e)}` })
    }
  },

  async decrement(routineId, itemId) {
    const date = todayKey()
    const prev = get().completions.find((c) =>
      c.routine_id === routineId && c.date === date && (itemId ? c.item_id === itemId : !c.item_id),
    )
    if (!prev || prev.count <= 0) return
    // 乐观更新
    set((s) => ({
      completions: s.completions.map((c) =>
        c.id === prev.id ? { ...c, count: Math.max(0, c.count - 1) } : c,
      ),
    }))
    try {
      const completion = await api.decrementDailyCompletion(routineId, date, itemId)
      set((s) => ({
        completions: s.completions.map((c) =>
          c.routine_id === routineId && c.date === date && (itemId ? c.item_id === itemId : !c.item_id)
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
