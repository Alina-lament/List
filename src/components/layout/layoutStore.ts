import { create } from 'zustand'
import { api } from '@/lib/api'

export const SIDEBAR_WIDTH = { min: 180, max: 420, default: 240 }
export const DETAIL_WIDTH = { min: 300, max: 640, default: 384 }

interface LayoutState {
  sidebarWidth: number
  detailWidth: number
  showDetailCalendar: boolean
  init(): Promise<void>
  setSidebarWidth(width: number): void
  setDetailWidth(width: number): void
  setShowDetailCalendar(show: boolean): Promise<void>
  saveSidebarWidth(width: number): Promise<void>
  saveDetailWidth(width: number): Promise<void>
}

function parseWidth(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export const useLayoutStore = create<LayoutState>()((set) => ({
  sidebarWidth: SIDEBAR_WIDTH.default,
  detailWidth: DETAIL_WIDTH.default,
  showDetailCalendar: false,

  async init() {
    try {
      const rows = await api.getAllSettings()
      const map: Record<string, string> = {}
      for (const r of rows) map[r.key] = r.value
      set({
        sidebarWidth: parseWidth(map.sidebarWidth, SIDEBAR_WIDTH.default, SIDEBAR_WIDTH.min, SIDEBAR_WIDTH.max),
        detailWidth: parseWidth(map.detailWidth, DETAIL_WIDTH.default, DETAIL_WIDTH.min, DETAIL_WIDTH.max),
        showDetailCalendar: map.showDetailCalendar === 'true',
      })
    } catch {
      // 读取失败保持默认值
    }
  },

  setSidebarWidth(width) {
    set({ sidebarWidth: width })
  },
  setDetailWidth(width) {
    set({ detailWidth: width })
  },
  async setShowDetailCalendar(show) {
    set({ showDetailCalendar: show })
    await api.updateSetting('showDetailCalendar', String(show))
  },

  async saveSidebarWidth(width) {
    await api.updateSetting('sidebarWidth', String(width))
  },
  async saveDetailWidth(width) {
    await api.updateSetting('detailWidth', String(width))
  },
}))
