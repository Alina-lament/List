import { useEffect, type ReactNode } from 'react'
import { useSettingsStore } from '../store'

const CSS_VAR_MAP: Record<string, string> = {
  sidebarBg: '--color-sidebar-bg',
  canvasBg: '--color-canvas-bg',
  cardBg: '--color-card-bg',
  royal: '--color-royal',
  royalDark: '--color-royal-dark',
  royalLight: '--color-royal-light',
  royal50: '--color-royal-50',
  ink: '--color-ink',
  ink2: '--color-ink-2',
  ink3: '--color-ink-3',
  borderColor: '--color-border',
  prihigh: '--color-prihigh',
  primed: '--color-primed',
  prilow: '--color-prilow',
}

function hexToRgb(hex: string): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 3 && normalized.length !== 6) return '255, 255, 255'
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return '255, 255, 255'
  return `${r}, ${g}, ${b}`
}

function applyVariables(root: HTMLElement, state: Record<string, unknown>) {
  for (const [storeKey, cssVar] of Object.entries(CSS_VAR_MAP)) {
    root.style.setProperty(cssVar, String(state[storeKey] ?? ''))
  }
  // 同步设置 canvas/sidebar/card 的 RGB 分量，供动态透明度使用
  root.style.setProperty('--color-canvas-bg-rgb', hexToRgb(String(state.canvasBg ?? '#fdfdfc')))
  root.style.setProperty('--color-sidebar-bg-rgb', hexToRgb(String(state.sidebarBg ?? '#f4f5f7')))
  root.style.setProperty('--color-card-bg-rgb', hexToRgb(String(state.cardBg ?? '#ffffff')))

  // 背景图片相关样式已改为 AppShell/Sidebar 直接读取 store，避免 CSS 变量在
  // inline style 中不生效的问题。
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const store = useSettingsStore()

  // 初始化：从 DB 加载设置
  useEffect(() => {
    void store.init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 任何设置变更 → 重新注入 CSS Variables
  useEffect(() => {
    const root = document.documentElement
    applyVariables(root, store as unknown as Record<string, unknown>)
  })

  return (
    <>
      {/* 背景图片由 AppShell 负责渲染，确保位于应用内容底层而不是被 body/AppShell 的
          背景色遮住。此处只注入 CSS 变量供 AppShell 使用。 */}
      {children}
    </>
  )
}
