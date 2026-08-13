import { useEffect } from 'react'
import { PomodoroPanel } from './PomodoroPanel'
import { PomodoroOverview } from './PomodoroOverview'
import { useTasksStore } from '@/features/tasks/store'

export function PomodoroView() {
  const { init: initTasks, lists } = useTasksStore()

  useEffect(() => {
    // 确保任务列表已加载，供概览中的任务名称查询以及任务选择器使用
    if (lists.length === 0) {
      void initTasks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-full flex-1 items-stretch justify-center gap-5 overflow-hidden px-5 py-5">
        <div className="h-full w-full max-w-xl shrink-0">
          <PomodoroPanel />
        </div>
        <div className="h-full w-80 shrink-0">
          <PomodoroOverview />
        </div>
      </div>
    </div>
  )
}
