import { useMemo } from 'react'
import { usePomodoroStore, formatDuration } from '../store'
import { useTasksStore } from '@/features/tasks/store'
import { useSettingsStore } from '@/features/settings/store'
import { TomatoIcon } from './TomatoIcon'

function formatTimeRange(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return '--:-- - --:--'
  const start = new Date(startedAt)
  const end = new Date(completedAt)
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${fmt(start)} - ${fmt(end)}`
}

function formatDateGroup(dateStr: string | null): string {
  if (!dateStr) return '未知日期'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '未知日期'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function isSameDay(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

function formatStatDuration(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function PomodoroOverview() {
  const { todayRecords, historyRecords, totalStats, deleteRecord } = usePomodoroStore()
  const { tasksByList } = useTasksStore()
  const tomatoImageDataUrl = useSettingsStore((s) => s.tomatoImageDataUrl)

  const taskMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const tasks of Object.values(tasksByList)) {
      for (const task of tasks) {
        map.set(task.id, task.title)
      }
    }
    return map
  }, [tasksByList])

  const todayMinutes = useMemo(
    () => Math.round(todayRecords.reduce((sum, r) => sum + r.duration_seconds, 0) / 60),
    [todayRecords],
  )

  const groupedRecords = useMemo(() => {
    const groups: { date: string; records: typeof historyRecords }[] = []
    for (const record of historyRecords) {
      const date = record.completed_at ?? record.started_at ?? record.created_at
      const last = groups[groups.length - 1]
      if (last && isSameDay(last.date, date)) {
        last.records.push(record)
      } else {
        groups.push({ date, records: [record] })
      }
    }
    return groups
  }, [historyRecords])

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-card">
      {/* 概览 */}
      <h3 className="mb-4 text-base font-bold text-ink">概览</h3>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-canvas-2 p-4">
          <div className="text-xs text-ink-3">今日番茄</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{todayRecords.length}</div>
        </div>
        <div className="rounded-xl bg-canvas-2 p-4">
          <div className="text-xs text-ink-3">今日专注时长</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{formatDuration(todayMinutes)}</div>
        </div>
        <div className="rounded-xl bg-canvas-2 p-4">
          <div className="text-xs text-ink-3">总番茄</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{totalStats.count}</div>
        </div>
        <div className="rounded-xl bg-canvas-2 p-4">
          <div className="text-xs text-ink-3">总专注时长</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{formatStatDuration(totalStats.totalSeconds)}</div>
        </div>
      </div>

      {/* 专注记录 */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-ink">专注记录</h3>
        <div className="flex items-center gap-1">
          <button className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-canvas-2 hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
          <button className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-canvas-2 hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
              <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
              <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {groupedRecords.length === 0 ? (
          <div className="py-10 text-center text-xs text-ink-3">暂无专注记录</div>
        ) : (
          <div className="space-y-5">
            {groupedRecords.map((group) => (
              <div key={group.date}>
                <div className="mb-2 text-xs font-medium text-ink-3">{formatDateGroup(group.date)}</div>
                <div className="space-y-3">
                  {group.records.map((record) => (
                    <div key={record.id} className="group flex items-start gap-3">
                      <div className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true">
                        {tomatoImageDataUrl ? (
                          <img src={tomatoImageDataUrl} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <TomatoIcon />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-ink-3">{formatTimeRange(record.started_at, record.completed_at)}</div>
                        <div className="mt-0.5 truncate text-sm text-ink">
                          {record.task_id ? taskMap.get(record.task_id) ?? '未知任务' : '未关联任务'}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-ink-3">
                        {formatDuration(Math.round(record.duration_seconds / 60))}
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm('删除这条专注记录？')) void deleteRecord(record.id)
                        }}
                        title="删除记录"
                        aria-label="删除记录"
                        className="mt-0.5 shrink-0 rounded-lg p-1 text-ink-3 transition-colors hover:bg-red-50 hover:text-prihigh"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18" strokeLinecap="round" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
