import { create } from 'zustand'
import { api } from '@/lib/api'
import { DEFAULT_SETTINGS, type CloseBehavior } from '@shared/types'
import type { BackupStatus } from '@shared/api'

export interface SettingsState {
  // 颜色
  sidebarBg: string
  canvasBg: string
  cardBg: string
  royal: string
  royalDark: string
  royalLight: string
  royal50: string
  ink: string
  ink2: string
  ink3: string
  borderColor: string
  prihigh: string
  primed: string
  prilow: string
  // 背景图片
  bgImagePath: string | null
  bgImageDataUrl: string | null
  bgOpacity: number
  bgBlur: number
  bgScale: 'cover' | 'contain' | 'fill'
  bgGlassIntensity: number
  // 图标
  appIconPath: string | null
  // 品牌
  brandName: string
  brandImageUrl: string | null  // data URL，启动时加载
  // 日历
  scrollSensitivity: number
  calendarWeekCount: number
  // 任务列表
  taskSortMode: 'free' | 'priority' | 'name'
  // 窗口行为
  closeBehavior: CloseBehavior
  // 音效
  taskCompleteSoundEnabled: boolean
  taskCompleteSoundVolume: number
  taskCompleteSoundFile: string
  taskCompleteSoundUrl: string | null
  // 任务折叠状态
  collapsedParentTasks: Set<string>
  collapsedCompletedSubtasks: Set<string>
  // 备份
  backupPath: string | null
  backupStatus: BackupStatus | null
  // 操作状态
  loading: boolean
  // 动作
  init(): Promise<void>
  updateColor(key: string, value: string): Promise<void>
  updateCloseBehavior(value: CloseBehavior): Promise<void>
  setBgImage(path: string): Promise<void>
  updateBgSetting(key: string, value: string | number): Promise<void>
  clearBgImage(): Promise<void>
  setAppIcon(iconPath: string): Promise<void>
  setBrandName(name: string): Promise<void>
  setBrandImage(filePath: string): Promise<void>
  clearBrandImage(): Promise<void>
  setCalendarWeekCount(n: number): Promise<void>
  setTaskSortMode(mode: 'free' | 'priority' | 'name'): Promise<void>
  setTaskCompleteSoundEnabled(enabled: boolean): Promise<void>
  setTaskCompleteSoundVolume(volume: number): Promise<void>
  setTaskCompleteSoundFile(fileName: string): Promise<void>
  loadTaskCompleteSound(fileName?: string): Promise<void>
  toggleCollapsedParent(taskId: string): Promise<void>
  toggleCollapsedCompleted(taskId: string): Promise<void>
  selectBackupFolder(): Promise<void>
  clearBackupPath(): Promise<void>
  loadBackupStatus(): Promise<void>
  applyPreset(name: string): Promise<void>
  resetDefaults(): Promise<void>
}

function getDefault(key: string): string {
  return DEFAULT_SETTINGS[key] ?? ''
}

function parseNum(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isNaN(n) ? fallback : n
}

function parseMap(rows: { key: string; value: string }[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value
  return map
}

function parseStringArray(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string')
  } catch {
    // ignore invalid JSON
  }
  return []
}

// 预设主题
const PRESETS: Record<string, Record<string, string>> = {
  bright: {
    sidebarBg: '#f4f5f7', canvasBg: '#fdfdfc', cardBg: '#ffffff',
    royal: '#4f6ef7', royalDark: '#3d5ce5', royalLight: '#7b93fa', royal50: '#eef1fe',
    ink: '#0f172a', ink2: '#334155', ink3: '#64748b', borderColor: '#eaecf0',
    prihigh: '#f43f5e', primed: '#f59e0b', prilow: '#22c55e',
  },
  dark: {
    sidebarBg: '#1a1d23', canvasBg: '#212529', cardBg: '#2a2f36',
    royal: '#6b8cff', royalDark: '#5570e0', royalLight: '#8ba5ff', royal50: '#252a3d',
    ink: '#e8eaed', ink2: '#bdc1c6', ink3: '#9aa0a6', borderColor: '#3c4043',
    prihigh: '#ff6b7a', primed: '#ffb342', prilow: '#4ade80',
  },
  nature: {
    sidebarBg: '#f0f4f0', canvasBg: '#fafcfa', cardBg: '#ffffff',
    royal: '#4caf50', royalDark: '#388e3c', royalLight: '#6fbf73', royal50: '#e8f5e9',
    ink: '#1e2a1e', ink2: '#3d4a3d', ink3: '#6b786b', borderColor: '#dce5dc',
    prihigh: '#e57373', primed: '#ffa726', prilow: '#66bb6a',
  },
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  sidebarBg: getDefault('sidebarBg'),
  canvasBg: getDefault('canvasBg'),
  cardBg: getDefault('cardBg'),
  royal: getDefault('royal'),
  royalDark: getDefault('royalDark'),
  royalLight: getDefault('royalLight'),
  royal50: getDefault('royal50'),
  ink: getDefault('ink'),
  ink2: getDefault('ink2'),
  ink3: getDefault('ink3'),
  borderColor: getDefault('borderColor'),
  prihigh: getDefault('prihigh'),
  primed: getDefault('primed'),
  prilow: getDefault('prilow'),
  bgImagePath: null,
  bgImageDataUrl: null,
  bgOpacity: parseNum(getDefault('bgOpacity'), 80),
  bgBlur: parseNum(getDefault('bgBlur'), 0),
  bgScale: (getDefault('bgScale') as 'cover' | 'contain' | 'fill') || 'cover',
  bgGlassIntensity: parseNum(getDefault('bgGlassIntensity'), 35),
  appIconPath: null,
  brandName: getDefault('brandName'),
  brandImageUrl: null,
  scrollSensitivity: Number(getDefault('scrollSensitivity')) || 200,
  calendarWeekCount: Number(getDefault('calendarWeekCount')) || 4,
  taskSortMode: (getDefault('taskSortMode') as 'free' | 'priority' | 'name') || 'free',
  closeBehavior: (getDefault('closeBehavior') as CloseBehavior) || 'ask',
  taskCompleteSoundEnabled: getDefault('taskCompleteSoundEnabled') === '1',
  taskCompleteSoundVolume: parseNum(getDefault('taskCompleteSoundVolume'), 80),
  taskCompleteSoundFile: getDefault('taskCompleteSoundFile') || 'complete.wav',
  taskCompleteSoundUrl: null,
  collapsedParentTasks: new Set<string>(),
  collapsedCompletedSubtasks: new Set<string>(),
  backupPath: null,
  backupStatus: null,
  loading: false,

  async init() {
    set({ loading: true })
    try {
      const rows = await api.getAllSettings()
      const map = parseMap(rows)
      set({
        sidebarBg: map.sidebarBg ?? getDefault('sidebarBg'),
        canvasBg: map.canvasBg ?? getDefault('canvasBg'),
        cardBg: map.cardBg ?? getDefault('cardBg'),
        royal: map.royal ?? getDefault('royal'),
        royalDark: map.royalDark ?? getDefault('royalDark'),
        royalLight: map.royalLight ?? getDefault('royalLight'),
        royal50: map.royal50 ?? getDefault('royal50'),
        ink: map.ink ?? getDefault('ink'),
        ink2: map.ink2 ?? getDefault('ink2'),
        ink3: map.ink3 ?? getDefault('ink3'),
        borderColor: map.borderColor ?? getDefault('borderColor'),
        prihigh: map.prihigh ?? getDefault('prihigh'),
        primed: map.primed ?? getDefault('primed'),
        prilow: map.prilow ?? getDefault('prilow'),
        bgOpacity: parseNum(map.bgOpacity, 80),
        bgBlur: parseNum(map.bgBlur, 0),
        bgScale: (map.bgScale as 'cover' | 'contain' | 'fill') || 'cover',
        bgGlassIntensity: parseNum(map.bgGlassIntensity, 35),
        appIconPath: map.appIconPath || null,
        brandName: map.brandName || getDefault('brandName'),
        scrollSensitivity: Number(map.scrollSensitivity) || 200,
        calendarWeekCount: Number(map.calendarWeekCount) || 4,
        taskSortMode: (map.taskSortMode as 'free' | 'priority' | 'name') || 'free',
        closeBehavior: (map.closeBehavior as CloseBehavior) || 'ask',
        taskCompleteSoundEnabled: (map.taskCompleteSoundEnabled ?? getDefault('taskCompleteSoundEnabled')) === '1',
        taskCompleteSoundVolume: parseNum(map.taskCompleteSoundVolume, parseNum(getDefault('taskCompleteSoundVolume'), 80)),
        taskCompleteSoundFile: map.taskCompleteSoundFile || getDefault('taskCompleteSoundFile') || 'complete.wav',
        taskCompleteSoundUrl: await api.getSoundDataUrl(map.taskCompleteSoundFile || getDefault('taskCompleteSoundFile') || 'complete.wav'),
        collapsedParentTasks: new Set(parseStringArray(map.collapsedParentTasks)),
        collapsedCompletedSubtasks: new Set(parseStringArray(map.collapsedCompletedSubtasks)),
        bgImagePath: await api.getBgImagePath(),
        bgImageDataUrl: await api.getBgImageDataUrl(),
        backupPath: map.backupPath || null,
        backupStatus: await api.getBackupStatus(),
        loading: false,
      })
      // 窗口图标由主进程在 BrowserWindow 构造时设置，此处不重复调用
      // （win.setIcon() 在 Windows 上无法更新任务栏图标，会覆盖构造时设好的图标）
      // 加载品牌图片 data URL
      const brandUrl = await api.getBrandDataUrl()
      if (brandUrl) set({ brandImageUrl: brandUrl })
    } catch {
      set({ loading: false })
    }
  },

  async updateColor(key, value) {
    await api.updateSetting(key, value)
    set({ [key]: value } as Partial<SettingsState>)
  },

  async updateCloseBehavior(value) {
    await api.updateSetting('closeBehavior', value)
    set({ closeBehavior: value })
  },

  async setBgImage(path) {
    const dest = await api.setBgImage(path)
    await api.updateSetting('bgImagePath', dest)
    const dataUrl = await api.getBgImageDataUrl()
    set({ bgImagePath: dest, bgImageDataUrl: dataUrl })
  },

  async updateBgSetting(key, value) {
    await api.updateSetting(key, String(value))
    set({ [key]: value } as Partial<SettingsState>)
  },

  async clearBgImage() {
    await api.clearBgImage()
    await api.updateSetting('bgImagePath', '')
    set({ bgImagePath: null, bgImageDataUrl: null })
  },

  async setAppIcon(iconPath) {
    await api.setWindowIcon(iconPath)
    await api.updateSetting('appIconPath', iconPath)
    set({ appIconPath: iconPath })
  },

  async setBrandName(name) {
    await api.updateSetting('brandName', name)
    set({ brandName: name })
  },

  async setBrandImage(filePath) {
    const dest = await api.setBrandImage(filePath)
    await api.updateSetting('brandImagePath', dest)
    const url = await api.getBrandDataUrl()
    set({ brandImageUrl: url })
  },

  async clearBrandImage() {
    await api.clearBrandImage()
    await api.updateSetting('brandImagePath', '')
    set({ brandImageUrl: null })
  },

  async setCalendarWeekCount(n) {
    await api.updateSetting('calendarWeekCount', String(n))
    set({ calendarWeekCount: n })
  },

  async setTaskSortMode(mode) {
    await api.updateSetting('taskSortMode', mode)
    set({ taskSortMode: mode })
  },

  async setTaskCompleteSoundEnabled(enabled) {
    await api.updateSetting('taskCompleteSoundEnabled', enabled ? '1' : '0')
    set({ taskCompleteSoundEnabled: enabled })
  },

  async setTaskCompleteSoundVolume(volume) {
    const v = Math.max(0, Math.min(100, volume))
    await api.updateSetting('taskCompleteSoundVolume', String(v))
    set({ taskCompleteSoundVolume: v })
  },

  async setTaskCompleteSoundFile(fileName) {
    if (!fileName) return
    await api.updateSetting('taskCompleteSoundFile', fileName)
    const url = await api.getSoundDataUrl(fileName)
    set({ taskCompleteSoundFile: fileName, taskCompleteSoundUrl: url })
  },

  async loadTaskCompleteSound(fileName) {
    const name = fileName || get().taskCompleteSoundFile || getDefault('taskCompleteSoundFile') || 'complete.wav'
    const url = await api.getSoundDataUrl(name)
    set({ taskCompleteSoundUrl: url })
  },

  async toggleCollapsedParent(taskId) {
    const next = new Set(get().collapsedParentTasks)
    if (next.has(taskId)) next.delete(taskId)
    else next.add(taskId)
    await api.updateSetting('collapsedParentTasks', JSON.stringify([...next]))
    set({ collapsedParentTasks: next })
  },

  async toggleCollapsedCompleted(taskId) {
    const next = new Set(get().collapsedCompletedSubtasks)
    if (next.has(taskId)) next.delete(taskId)
    else next.add(taskId)
    await api.updateSetting('collapsedCompletedSubtasks', JSON.stringify([...next]))
    set({ collapsedCompletedSubtasks: next })
  },

  async selectBackupFolder() {
    const path = await api.selectBackupFolder()
    if (!path) return
    await api.updateSetting('backupPath', path)
    const status = await api.setBackupPath(path)
    set({ backupPath: path, backupStatus: status })
  },

  async clearBackupPath() {
    await api.updateSetting('backupPath', '')
    const status = await api.clearBackupPath()
    set({ backupPath: null, backupStatus: status })
  },

  async loadBackupStatus() {
    const status = await api.getBackupStatus()
    set({ backupStatus: status })
  },

  async applyPreset(name) {
    const preset = PRESETS[name]
    if (!preset) return
    for (const [key, value] of Object.entries(preset)) {
      await api.updateSetting(key, value)
    }
    set(preset as Partial<SettingsState>)
  },

  async resetDefaults() {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (['bgImagePath', 'bgOpacity', 'bgBlur', 'bgScale', 'bgGlassIntensity', 'appIconPath', 'scrollSensitivity'].includes(key)) continue
      await api.updateSetting(key, value)
    }
    set({
      sidebarBg: getDefault('sidebarBg'),
      canvasBg: getDefault('canvasBg'),
      cardBg: getDefault('cardBg'),
      royal: getDefault('royal'),
      royalDark: getDefault('royalDark'),
      royalLight: getDefault('royalLight'),
      royal50: getDefault('royal50'),
      ink: getDefault('ink'),
      ink2: getDefault('ink2'),
      ink3: getDefault('ink3'),
      borderColor: getDefault('borderColor'),
      prihigh: getDefault('prihigh'),
      primed: getDefault('primed'),
      prilow: getDefault('prilow'),
      taskCompleteSoundEnabled: getDefault('taskCompleteSoundEnabled') === '1',
      taskCompleteSoundVolume: parseNum(getDefault('taskCompleteSoundVolume'), 80),
      taskCompleteSoundFile: getDefault('taskCompleteSoundFile') || 'complete.wav',
      collapsedParentTasks: new Set<string>(),
      collapsedCompletedSubtasks: new Set<string>(),
    })
  },
}))
