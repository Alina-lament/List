import { ReactNode, useEffect } from 'react'
import { useTasksStore } from '@/features/tasks/store'
import { useSettingsStore } from '@/features/settings/store'
import { ResizeHandle } from './ResizeHandle'
import { SIDEBAR_WIDTH, useLayoutStore } from './layoutStore'
import { Sidebar } from './Sidebar'

/** 快捷键映射：Ctrl+数字 → 优先级 */
const PRIORITY_SHORTCUTS: Record<string, number> = {
  '1': 3,
  '2': 2,
  '3': 1,
  '4': 0,
}

export function AppShell({ children }: { children: ReactNode }) {
  const { selectedTaskId, tasksByList, updateTask } = useTasksStore()
  const { sidebarWidth, setSidebarWidth, saveSidebarWidth, init: initLayout } = useLayoutStore()
  const { bgImageDataUrl, bgOpacity, bgBlur, bgScale, bgGlassIntensity } = useSettingsStore()

  useEffect(() => {
    void initLayout()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 快捷键：Ctrl+数字设置选中任务的优先级
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey || e.metaKey) return
      const priority = PRIORITY_SHORTCUTS[e.key]
      if (priority === undefined) return
      if (!selectedTaskId) return

      const task = Object.values(tasksByList).flat().find((t) => t.id === selectedTaskId)
      if (!task || task.priority === priority) return

      e.preventDefault()
      void updateTask(selectedTaskId, { priority: priority as 0 | 1 | 2 | 3 })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedTaskId, tasksByList, updateTask])

  return (
    <div className="relative flex h-full overflow-hidden bg-canvas">
      {/* 背景图片层：覆盖整个 AppShell，位于 Sidebar/主内容区之下。 */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: bgImageDataUrl ? `url("${bgImageDataUrl}")` : 'none',
          backgroundSize: bgScale,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: bgOpacity / 100,
          filter: `blur(${bgBlur}px)`,
        }}
      />
      {/* 统一毛玻璃层：在图片和 UI 之间营造整体磨砂质感 */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          backgroundColor: `rgba(var(--color-canvas-bg-rgb), ${bgGlassIntensity / 100})`,
          backdropFilter: `blur(${(bgGlassIntensity / 100) * 24}px)`,
        }}
      />
      <div className="relative z-[2] flex h-full w-full gap-3 p-3">
        <Sidebar />
        <ResizeHandle
          direction="right"
          width={sidebarWidth}
          min={SIDEBAR_WIDTH.min}
          max={SIDEBAR_WIDTH.max}
          defaultWidth={SIDEBAR_WIDTH.default}
          onChange={setSidebarWidth}
          onCommit={(w) => void saveSidebarWidth(w)}
        />
        <main
          className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl shadow-card-lg ring-1 ring-white/40"
          style={{
            backgroundColor: `rgba(var(--color-card-bg-rgb), ${0.55 + (bgGlassIntensity / 100) * 0.32})`,
            backdropFilter: `blur(${(bgGlassIntensity / 100) * 14}px)`,
          }}
        >
          <div className="min-h-0 flex-1">{children}</div>
        </main>

      </div>
    </div>
  )
}
