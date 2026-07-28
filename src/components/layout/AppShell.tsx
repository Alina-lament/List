import { ReactNode, useState } from 'react'
import { useTasksStore } from '@/features/tasks/store'
import { Button } from '@/components/ui/Button'
import { TaskFormDialog } from '@/features/tasks/components/TaskFormDialog'
import { SettingsDialog } from '@/features/settings/components/SettingsDialog'
import { Sidebar } from './Sidebar'

const VIEW_TITLE: Record<string, string> = {
  list: '清单',
  calendar: '日历',
}

export function AppShell({ children }: { children: ReactNode }) {
  const { view, selectedListId } = useTasksStore()
  const [showCreate, setShowCreate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="flex h-full bg-canvas">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        {/* 顶栏：左侧当前视图标题，中间齿轮，右侧新建任务 */}
        <div className="flex items-center justify-between border-b border-canvas-3 bg-canvas backdrop-blur-sm px-6 py-3">
          <h1 className="text-sm font-semibold tracking-tight text-ink">{VIEW_TITLE[view]}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-xl p-2 text-ink-3 transition-all hover:bg-canvas-2 hover:text-ink"
              aria-label="设置"
              title="设置"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} disabled={!selectedListId}>
              + 新建任务
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </main>

      <TaskFormDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        task={null}
        defaultListId={selectedListId}
      />

      <SettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}