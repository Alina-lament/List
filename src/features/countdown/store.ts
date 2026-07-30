import { create } from 'zustand'
import type { Countdown, CreateCountdownInput, UpdateCountdownInput } from '@shared/types'
import { api } from '@/lib/api'

interface CountdownState {
  countdowns: Countdown[]
  loading: boolean
  error: string | null

  init(): Promise<void>
  create(input: CreateCountdownInput): Promise<Countdown>
  update(id: string, patch: UpdateCountdownInput): Promise<void>
  delete(id: string): Promise<void>
  setBg(id: string, filePath: string): Promise<void>
  clearError(): void
}

export const useCountdownStore = create<CountdownState>()((set, get) => ({
  countdowns: [],
  loading: false,
  error: null,

  async init() {
    set({ loading: true, error: null })
    try {
      await api.advanceCountdowns()
      const countdowns = await api.getCountdowns()
      set({ countdowns, loading: false })
    } catch (e) {
      set({ loading: false, error: `加载倒数日失败：${String(e)}` })
    }
  },

  async create(input) {
    const countdown = await api.createCountdown(input)
    set((s) => ({ countdowns: [...s.countdowns, countdown] }))
    return countdown
  },

  async update(id, patch) {
    const updated = await api.updateCountdown(id, patch)
    set((s) => ({
      countdowns: s.countdowns.map((c) => (c.id === id ? updated : c)),
    }))
  },

  async delete(id) {
    await api.deleteCountdown(id)
    set((s) => ({
      countdowns: s.countdowns.filter((c) => c.id !== id),
    }))
  },

  async setBg(id, filePath) {
    const updated = await api.setCountdownBg(id, filePath)
    set((s) => ({
      countdowns: s.countdowns.map((c) => (c.id === id ? updated : c)),
    }))
  },

  clearError() {
    set({ error: null })
  },
}))
