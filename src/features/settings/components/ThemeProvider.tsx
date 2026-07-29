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

function applyVariables(root: HTMLElement, state: Record<string, unknown>) {
  for (const [storeKey, cssVar] of Object.entries(CSS_VAR_MAP)) {
    root.style.setProperty(cssVar, String(state[storeKey] ?? ''))
  }
  // background image
  const bgDataUrl = state.bgImageDataUrl as string | null | undefined
  const opacity = (Number(state.bgOpacity) || 0) / 100
  const blur = Number(state.bgBlur) || 0
  const scale = (state.bgScale as string) || 'cover'

  root.style.setProperty('--bg-opacity', String(opacity))
  root.style.setProperty('--bg-blur', `${blur}px`)
  root.style.setProperty('--bg-scale', scale)

  if (bgDataUrl) {
    root.style.setProperty('--bg-image', `url("${bgDataUrl}")`)
  } else {
    root.style.setProperty('--bg-image', 'none')
  }
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
