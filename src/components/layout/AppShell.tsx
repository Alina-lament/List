import { ReactNode, useState } from 'react'
import { useTasksStore } from '@/features/tasks/store'
import { Button } from '@/components/ui/Button'
import { TaskFormDialog } from '@/features/tasks/components/TaskFormDialog'
import { Sidebar } from './Sidebar'

const VIEW_TITLE: Record<string, string> = {
  list: '清单',
  calendar: '日历',
}

export function AppShell({ children }: { children: ReactNode }) {
  const { view, selectedListId } = useTasksStore()
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="flex h-full bg-canvas">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        {/* 顶栏：左侧当前视图标题，右侧新建任务 */}
        <div className="flex items-center justify-between border-b border-canvas-3/70 bg-canvas/80 backdrop-blur-sm px-6 py-3">
          <h1 className="text-sm font-semibold tracking-tight text-ink">{VIEW_TITLE[view]}</h1>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} disabled={!selectedListId}>
            + 新建任务
          </Button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </main>

      <TaskFormDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        task={null}
        defaultListId={selectedListId}
      />
    </div>
  )
}