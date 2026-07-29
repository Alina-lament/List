import { create } from 'zustand'
import { api } from '@/lib/api'
import { DEFAULT_SETTINGS } from '@shared/types'

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
  // 图标
  appIconPath: string | null
  // 品牌
  brandName: string
  brandImageUrl: string | null  // data URL，启动时加载
  // 日历
  scrollSensitivity: number
  // 操作状态
  loading: boolean
  // 动作
  init(): Promise<void>
  updateColor(key: string, value: string): Promise<void>
  setBgImage(path: string): Promise<void>
  updateBgSetting(key: string, value: string | number): Promise<void>
  clearBgImage(): Promise<void>
  setAppIcon(iconPath: string): Promise<void>
  setBrandName(name: string): Promise<void>
  setBrandImage(filePath: string): Promise<void>
  clearBrandImage(): Promise<void>
  applyPreset(name: string): Promise<void>
  resetDefaults(): Promise<void>
}

function getDefault(key: string): string {
  return DEFAULT_SETTINGS[key] ?? ''
}

function parseMap(rows: { key: string; value: string }[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value
  return map
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
  bgOpacity: Number(getDefault('bgOpacity')) || 30,
  bgBlur: Number(getDefault('bgBlur')) || 0,
  bgScale: (getDefault('bgScale') as 'cover') || 'cover',
  appIconPath: null,
  brandName: getDefault('brandName'),
  brandImageUrl: null,
  scrollSensitivity: Number(getDefault('scrollSensitivity')) || 200,
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
        bgOpacity: Number(map.bgOpacity) || 30,
        bgBlur: Number(map.bgBlur) || 0,
        bgScale: (map.bgScale as 'cover' | 'contain' | 'fill') || 'cover',
        appIconPath: map.appIconPath || null,
        brandName: map.brandName || getDefault('brandName'),
        scrollSensitivity: Number(map.scrollSensitivity) || 200,
        bgImagePath: await api.getBgImagePath(),
        bgImageDataUrl: await api.getBgImageDataUrl(),
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
      if (['bgImagePath', 'bgOpacity', 'bgBlur', 'bgScale', 'appIconPath', 'scrollSensitivity'].includes(key)) continue
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
    })
  },
}))
