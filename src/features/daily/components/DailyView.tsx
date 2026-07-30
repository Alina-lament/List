import { useMemo, useState } from 'react'
import type { DailyRoutine } from '@shared/types'
import { Button } from '@/components/ui/Button'
import { useDailyStore } from '../store'
import { useTasksStore } from '@/features/tasks/store'
import { DailyTaskCard } from './DailyTaskCard'
import { DailyRoutineEditor } from './DailyRoutineEditor'
import { todayKey } from '@/lib/date-utils'

export function DailyView() {
  const { routines, completions, loading, increment, decrement } = useDailyStore()
  const { lists, selectedListId } = useTasksStore()
  const [editing, setEditing] = useState<DailyRoutine | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const today = todayKey()

  // 今天应显示的 routines（按选中清单过滤）
  const todaysRoutines = useMemo(() => {
    const todayDow = new Date().getDay()
    return routines.filter((r) => {
      if (selectedListId && r.list_id !== selectedListId) return false
      if (!r.active) return false
      const days = JSON.parse(r.days_of_week || '[]') as number[]
      if (days.length === 0) return true
      return days.includes(todayDow)
    })
  }, [routines, selectedListId])

  // 完成统计
  const stats = useMemo(() => {
    const total = todaysRoutines.length
    const completed = todaysRoutines.filter((r) => {
      const comp = completions.find((c) => c.routine_id === r.id && c.date === today)
      return comp && comp.count >= r.target_count
    }).length
    return { total, completed }
  }, [todaysRoutines, completions, today])

  // 获取 routine 对应的清单名
  const listNames = useMemo(() => {
    const map = new Map(lists.map((l) => [l.id, l.name]))
    return (listId: string) => map.get(listId) ?? ''
  }, [lists])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-3">
        加载中…
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-5 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-ink">每日</h2>
          {stats.total > 0 && (
            <span className="text-xs text-ink-3">
              {stats.completed}/{stats.total} 已完成
            </span>
          )}
          {stats.total > 0 && stats.completed === stats.total && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
              🎉 全部完成
            </span>
          )}
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} disabled={lists.length === 0}>
          + 新建每日任务
        </Button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {todaysRoutines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 rounded-2xl bg-white p-4 shadow-xs ring-1 ring-ink/5">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-3">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink-2">暂无每日任务</p>
            <p className="mt-1 text-xs text-ink-4">
              {routines.length === 0
                ? '创建一个每日任务，比如「每天喝水 8 次」'
                : '今天没有需要执行的任务'}
            </p>
            {routines.length === 0 && (
              <Button variant="primary" size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
                创建第一个每日任务
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {todaysRoutines.map((routine) => (
              <DailyTaskCard
                key={routine.id}
                routine={routine}
                completions={completions}
                onCheck={(id, itemId) => void increment(id, itemId)}
                onUncheck={(id, itemId) => void decrement(id, itemId)}
                onEdit={setEditing}
              />
            ))}
          </div>
        )}

        {/* 未激活的 routines */}
        {routines.filter((r) => (!selectedListId || r.list_id === selectedListId) && !todaysRoutines.includes(r) && r.active).length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">其他日期的任务</p>
            <div className="space-y-2 opacity-60">
              {routines
                .filter((r) => (!selectedListId || r.list_id === selectedListId) && !todaysRoutines.includes(r) && r.active)
                .map((routine) => {
                  const days = JSON.parse(routine.days_of_week || '[]') as number[]
                  const names = ['日', '一', '二', '三', '四', '五', '六']
                  const label = days.length === 0 ? '每天' : '周' + days.map((d: number) => names[d]).join('')
                  return (
                    <div
                      key={routine.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg bg-canvas-2 px-4 py-2.5 text-xs text-ink-3"
                      onClick={() => setEditing(routine)}
                    >
                      <span>{routine.title}</span>
                      <span>{label} · {routine.target_count}次</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      <DailyRoutineEditor
        open={showCreate || editing !== null}
        onClose={() => { setShowCreate(false); setEditing(null) }}
        routine={editing}
      />
    </div>
  )
}
