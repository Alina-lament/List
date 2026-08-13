import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import type { DailyRoutine } from '@shared/types'
import { Button } from '@/components/ui/Button'
import { useDailyStore } from '../store'
import { useTasksStore } from '@/features/tasks/store'
import { DailyTaskCard } from './DailyTaskCard'
import { DailyRoutineEditor } from './DailyRoutineEditor'
import { DailyCalendar, isRoutineActiveOnDate } from './DailyCalendar'
import { todayKey } from '@/lib/date-utils'

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function DailyView() {
  const {
    routines,
    completions,
    loading,
    currentDate,
    increment,
    decrement,
    loadCompletionsByRange,
    goDate,
    goPrevDay,
    goNextDay,
    goToday,
  } = useDailyStore()
  const { lists, selectedListId } = useTasksStore()
  const [editing, setEditing] = useState<DailyRoutine | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [calMonth, setCalMonth] = useState(() => ({ y: dayjs().year(), m: dayjs().month() + 1 }))

  const today = todayKey()
  const isToday = currentDate === today

  // 加载当前月份（及前后少量缓冲）的完成情况
  useEffect(() => {
    const first = dayjs(`${calMonth.y}-${String(calMonth.m).padStart(2, '0')}-01`)
    const start = first.subtract(7, 'day').format('YYYY-MM-DD')
    const end = first.endOf('month').add(7, 'day').format('YYYY-MM-DD')
    void loadCompletionsByRange(start, end)
  }, [calMonth.y, calMonth.m, loadCompletionsByRange])

  // 选中日期变化时，底部日历同步到对应月份
  useEffect(() => {
    const y = dayjs(currentDate).year()
    const m = dayjs(currentDate).month() + 1
    setCalMonth((c) => (c.y === y && c.m === m ? c : { y, m }))
  }, [currentDate])

  // 选中日期应显示的 routines（按选中清单过滤）
  const activeRoutines = useMemo(() => {
    return routines.filter((r) => {
      if (selectedListId && r.list_id !== selectedListId) return false
      return isRoutineActiveOnDate(r, currentDate)
    })
  }, [routines, selectedListId, currentDate])

  // 完成统计
  const stats = useMemo(() => {
    const total = activeRoutines.length
    const completed = activeRoutines.filter((r) => {
      const comp = completions.find((c) => c.routine_id === r.id && c.date === currentDate)
      return comp && comp.count >= r.target_count
    }).length
    return { total, completed }
  }, [activeRoutines, completions, currentDate])

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

      {/* 日期导航条 */}
      <div className="flex items-center justify-center gap-3 border-b border-canvas-3 px-5 py-2">
        <button
          onClick={() => void goPrevDay()}
          aria-label="前一天"
          className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-canvas-2 hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="min-w-[170px] text-center text-sm font-semibold text-ink">
          {dayjs(currentDate).format('YYYY年M月D日')}
          <span className="ml-1.5 text-xs font-normal text-ink-3">{WEEKDAY_NAMES[dayjs(currentDate).day()]}</span>
        </span>
        <button
          onClick={() => void goNextDay()}
          aria-label="后一天"
          className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-canvas-2 hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {!isToday && (
          <>
            <button
              onClick={() => void goToday()}
              className="rounded-lg bg-canvas-2 px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:bg-canvas-3 hover:text-ink"
            >
              回到今天
            </button>
            {currentDate < today && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                历史日期
              </span>
            )}
          </>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-6">
          <DailyCalendar
            routines={routines.filter((r) => !r.is_archived)}
            completions={completions}
            year={calMonth.y}
            month={calMonth.m}
            selectedDate={currentDate}
            onSelectDate={(date) => void goDate(date)}
            onChangeMonth={(y, m) => setCalMonth({ y, m })}
          />
        </div>

        {activeRoutines.length === 0 ? (
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
                : isToday
                  ? '今天没有需要执行的任务'
                  : '该日期没有需要执行的任务'}
            </p>
            {routines.length === 0 && (
              <Button variant="primary" size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
                创建第一个每日任务
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activeRoutines.map((routine) => (
              <DailyTaskCard
                key={routine.id}
                routine={routine}
                completions={completions}
                date={currentDate}
                onCheck={(id, itemId) => void increment(id, itemId)}
                onUncheck={(id, itemId) => void decrement(id, itemId)}
                onEdit={setEditing}
              />
            ))}
          </div>
        )}

        {/* 未激活的 routines */}
        {routines.filter((r) => (!selectedListId || r.list_id === selectedListId) && !r.is_archived && !isRoutineActiveOnDate(r, currentDate)).length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">其他日期的任务</p>
            <div className="space-y-2 opacity-60">
              {routines
                .filter((r) => (!selectedListId || r.list_id === selectedListId) && !r.is_archived && !isRoutineActiveOnDate(r, currentDate))
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
