import { ReactNode, useEffect, useState } from 'react'
import { useTasksStore } from '@/features/tasks/store'
import { Button } from '@/components/ui/Button'
import { TaskFormDialog } from '@/features/tasks/components/TaskFormDialog'
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
  const { lists, selectedTaskId, tasksByList, view, updateTask } = useTasksStore()
  const { sidebarWidth, setSidebarWidth, saveSidebarWidth, init: initLayout } = useLayoutStore()
  const [showCreate, setShowCreate] = useState(false)

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
      {/* 背景图片层：覆盖整个 AppShell，位于 Sidebar/主内容区之下。
          当没有设置背景图时 background-image 为 none，此时显示父级 bg-canvas。 */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: 'var(--bg-image)',
          backgroundSize: 'var(--bg-scale)',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 'var(--bg-opacity)',
          filter: 'blur(var(--bg-blur))',
        }}
      />
      <div className="relative z-[1] flex h-full w-full">
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
        <main className="flex min-w-0 flex-1 flex-col">
        {/* 顶栏：右侧新建任务（每日视图有自己的新建按钮，不显示此按钮） */}
        {view !== 'daily' && (
          <div className="flex items-center justify-end border-b border-canvas-3 bg-canvas/85 backdrop-blur-md px-6 py-3">
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} disabled={lists.length === 0}>
              + 新建任务
            </Button>
          </div>
        )}
        <div className="min-h-0 flex-1">{children}</div>
      </main>

        <TaskFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          task={null}
          defaultListId={null}
        />
      </div>
    </div>
  )
}
