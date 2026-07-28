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
  const { lists, selectedTaskId, tasksByList, updateTask } = useTasksStore()
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
    <div className="flex h-full bg-canvas">
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
        {/* 顶栏：右侧新建任务 */}
        <div className="flex items-center justify-end border-b border-canvas-3 bg-canvas backdrop-blur-sm px-6 py-3">
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} disabled={lists.length === 0}>
            + 新建任务
          </Button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </main>

      <TaskFormDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        task={null}
        defaultListId={null}
      />
    </div>
  )
}
