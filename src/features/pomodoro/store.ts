import { create } from 'zustand'
import type { PomodoroRecord } from '@shared/types'
import { api } from '@/lib/api'
import { playSoundFromDataUrl } from '@/lib/sound'
import { useSettingsStore } from '@/features/settings/store'
import { useTasksStore } from '@/features/tasks/store'

export type PomodoroMode = 'countdown' | 'stopwatch'

interface TotalStats {
  count: number
  totalSeconds: number
}

interface PomodoroState {
  mode: PomodoroMode
  isRunning: boolean
  durationMinutes: number
  totalSeconds: number
  remainingSeconds: number
  selectedTaskId: string | null
  todayRecords: PomodoroRecord[]
  historyRecords: PomodoroRecord[]
  totalStats: TotalStats
  timerEndAt: number | null
  lastCompletedAt: number | null
  // 正计时
  stopwatchStartAt: number | null
  stopwatchElapsed: number

  init(): Promise<void>
  loadHistory(): Promise<void>
  loadTotalStats(): Promise<void>
  setMode(mode: PomodoroMode): void
  setDuration(minutes: number): void
  setSelectedTaskId(taskId: string | null): void
  startTimer(): void
  pauseTimer(): void
  resetTimer(): void
  completeTimer(manual?: boolean): Promise<void>
  // 正计时
  startStopwatch(): void
  pauseStopwatch(): void
  resetStopwatch(): void
  completeStopwatch(): Promise<void>
  deleteRecord(id: string): Promise<void>

  _saveRecord(durationSeconds: number): Promise<PomodoroRecord | undefined>
}

let intervalId: number | null = null

function formatNowIso(): string {
  return new Date().toISOString()
}

function clearTimerInterval(): void {
  if (intervalId !== null) {
    window.clearInterval(intervalId)
    intervalId = null
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export const usePomodoroStore = create<PomodoroState>()((set, get) => ({
  mode: 'countdown',
  isRunning: false,
  durationMinutes: 25,
  totalSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  selectedTaskId: null,
  todayRecords: [],
  historyRecords: [],
  totalStats: { count: 0, totalSeconds: 0 },
  timerEndAt: null,
  lastCompletedAt: null,
  stopwatchStartAt: null,
  stopwatchElapsed: 0,

  async init() {
    const settingsDuration = useSettingsStore.getState().pomodoroWorkDuration
    const minutes = Number.isFinite(settingsDuration) && settingsDuration > 0 ? settingsDuration : 25
    const [records, stats, history] = await Promise.all([
      api.getTodayPomodoroRecords(),
      api.getTotalPomodoroStats(),
      api.getRecentPomodoroRecords(50),
    ])
    set({
      todayRecords: records,
      totalStats: stats,
      historyRecords: history,
    })
    // 仅当计时器处于未启动的初始状态时才应用设置时长；
    // 避免切换到其他功能再切回时，init() 重置正在倒计时/暂停中的剩余时间
    const { isRunning, remainingSeconds, totalSeconds } = get()
    if (!isRunning && remainingSeconds === totalSeconds) {
      set({
        durationMinutes: minutes,
        totalSeconds: minutes * 60,
        remainingSeconds: minutes * 60,
      })
    }
  },

  async loadHistory() {
    const history = await api.getRecentPomodoroRecords(50)
    set({ historyRecords: history })
  },

  async loadTotalStats() {
    const stats = await api.getTotalPomodoroStats()
    set({ totalStats: stats })
  },

  setMode(mode) {
    if (get().isRunning) return
    set({
      mode,
      isRunning: false,
      timerEndAt: null,
      lastCompletedAt: null,
      stopwatchStartAt: null,
      stopwatchElapsed: 0,
    })
    if (mode === 'countdown') {
      const { durationMinutes } = get()
      set({ totalSeconds: durationMinutes * 60, remainingSeconds: durationMinutes * 60 })
    }
  },

  setDuration(minutes) {
    if (get().isRunning || get().mode !== 'countdown') return
    const valid = Math.max(1, Math.min(180, minutes))
    set({
      durationMinutes: valid,
      totalSeconds: valid * 60,
      remainingSeconds: valid * 60,
      lastCompletedAt: null,
    })
  },

  setSelectedTaskId(taskId) {
    set({ selectedTaskId: taskId })
  },

  startTimer() {
    if (get().mode !== 'countdown' || get().isRunning) return
    const { remainingSeconds } = get()
    if (remainingSeconds <= 0) return
    const endAt = Date.now() + remainingSeconds * 1000
    set({ isRunning: true, timerEndAt: endAt, lastCompletedAt: null })
    intervalId = window.setInterval(() => {
      const state = get()
      if (!state.isRunning || state.timerEndAt === null || state.mode !== 'countdown') return
      const left = Math.ceil((state.timerEndAt - Date.now()) / 1000)
      if (left <= 0) {
        set({ remainingSeconds: 0 })
        void get().completeTimer(false)
      } else {
        set({ remainingSeconds: left })
      }
    }, 1000)
  },

  pauseTimer() {
    if (get().mode !== 'countdown') return
    clearTimerInterval()
    set({ isRunning: false, timerEndAt: null })
  },

  resetTimer() {
    if (get().mode !== 'countdown') return
    clearTimerInterval()
    const { durationMinutes } = get()
    set({
      isRunning: false,
      totalSeconds: durationMinutes * 60,
      remainingSeconds: durationMinutes * 60,
      timerEndAt: null,
      lastCompletedAt: null,
    })
  },

  async completeTimer(manual = false) {
    if (get().mode !== 'countdown') return
    clearTimerInterval()
    const state = get()
    if (state.remainingSeconds > 0 && !manual) {
      set({ remainingSeconds: 0 })
    }
    set({ isRunning: false, timerEndAt: null })

    const durationSeconds = state.totalSeconds - (manual ? state.remainingSeconds : 0)
    if (durationSeconds <= 0) return

    const record = await get()._saveRecord(durationSeconds)
    if (record) {
      set({ lastCompletedAt: Date.now() })
    }
  },

  startStopwatch() {
    if (get().mode !== 'stopwatch' || get().isRunning) return
    const startAt = Date.now() - get().stopwatchElapsed * 1000
    set({ isRunning: true, stopwatchStartAt: startAt, lastCompletedAt: null })
    intervalId = window.setInterval(() => {
      const state = get()
      if (!state.isRunning || state.stopwatchStartAt === null || state.mode !== 'stopwatch') return
      const elapsed = Math.floor((Date.now() - state.stopwatchStartAt) / 1000)
      set({ stopwatchElapsed: elapsed })
    }, 1000)
  },

  pauseStopwatch() {
    if (get().mode !== 'stopwatch') return
    clearTimerInterval()
    set({ isRunning: false, stopwatchStartAt: null })
  },

  resetStopwatch() {
    if (get().mode !== 'stopwatch') return
    clearTimerInterval()
    set({
      isRunning: false,
      stopwatchStartAt: null,
      stopwatchElapsed: 0,
      lastCompletedAt: null,
    })
  },

  async completeStopwatch() {
    if (get().mode !== 'stopwatch') return
    clearTimerInterval()
    const state = get()
    const durationSeconds = state.stopwatchElapsed
    set({ isRunning: false, stopwatchStartAt: null, stopwatchElapsed: 0 })
    if (durationSeconds <= 0) return
    const record = await get()._saveRecord(durationSeconds)
    if (record) {
      set({ lastCompletedAt: Date.now() })
    }
  },

  async deleteRecord(id) {
    const state = get()
    const record =
      state.historyRecords.find((r) => r.id === id) ??
      state.todayRecords.find((r) => r.id === id)
    await api.deletePomodoroRecord(id)
    const [todayRecords, historyRecords, totalStats] = await Promise.all([
      api.getTodayPomodoroRecords(),
      api.getRecentPomodoroRecords(50),
      api.getTotalPomodoroStats(),
    ])
    set({ todayRecords, historyRecords, totalStats })
    if (record?.task_id) {
      await useTasksStore.getState().refreshPomodoroStats([record.task_id])
    }
  },

  async _saveRecord(durationSeconds: number) {
    const completedAt = formatNowIso()
    const startedAt = new Date(Date.now() - durationSeconds * 1000).toISOString()
    const taskId = get().selectedTaskId

    try {
      const record = await api.createPomodoroRecord({
        task_id: taskId,
        duration_seconds: durationSeconds,
        started_at: startedAt,
        completed_at: completedAt,
      })

      // 刷新今日记录、历史记录与统计
      const [todayRecords, historyRecords, totalStats] = await Promise.all([
        api.getTodayPomodoroRecords(),
        api.getRecentPomodoroRecords(50),
        api.getTotalPomodoroStats(),
      ])
      set({ todayRecords, historyRecords, totalStats })

      // 刷新关联任务的统计
      if (taskId) {
        await useTasksStore.getState().refreshPomodoroStats([taskId])
      }

      // 系统通知
      const title = '番茄专注完成'
      const body = taskId
        ? `恭喜完成一次专注（${Math.round(durationSeconds / 60)} 分钟）`
        : '恭喜完成一次专注，休息一下吧'
      void api.pomodoroNotify(title, body)

      // 播放完成音效
      const { taskCompleteSoundEnabled, taskCompleteSoundVolume, taskCompleteSoundUrl } =
        useSettingsStore.getState()
      if (taskCompleteSoundEnabled && taskCompleteSoundUrl) {
        playSoundFromDataUrl(taskCompleteSoundUrl, taskCompleteSoundVolume / 100).catch(() => {})
      }

      return record
    } catch (e) {
      console.error('保存番茄记录失败:', e)
    }
  },
}))

export { formatDuration }
