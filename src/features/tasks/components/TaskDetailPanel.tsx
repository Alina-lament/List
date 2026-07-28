import { useEffect, useMemo, useState } from 'react'
import { useTasksStore } from '../store'
import { Select } from '@/components/ui/Input'
import { RecurrenceRuleEditor, type RecurrenceValue } from '@/features/recurring/RecurrenceRuleEditor'
import { PRIORITY_COLORS } from './TaskItem'
import { parseDateKey, todayKey, pad2 } from '@/lib/date-utils'
import { useLayoutStore } from '@/components/layout/layoutStore'
import dayjs from 'dayjs'

const PRIORITY_OPTIONS = [
  { value: 3, label: '高' },
  { value: 2, label: '中' },
  { value: 1, label: '低' },
  { value: 0, label: '无优先级' },
] as const

const REMINDER_OPTIONS = [
  { value: '', label: '不提醒' },
  { value: '0', label: '准时' },
  { value: '5', label: '提前 5 分钟' },
  { value: '15', label: '提前 15 分钟' },
  { value: '30', label: '提前 30 分钟' },
  { value: '60', label: '提前 1 小时' },
  { value: '1440', label: '提前 1 天' },
]

type PanelKind = 'date' | 'priority' | 'more'

function FlagIcon({ priority, size = 16 }: { priority: number; size?: number }) {
  const color = PRIORITY_COLORS[priority]
  if (!color) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink-4">
        <path d="M6 3a1 1 0 0 0-1 1v17M7 5h10.382a1 1 0 0 1 .894 1.447L16.618 10l1.658 3.553A1 1 0 0 1 17.382 15H7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M6 3a1 1 0 0 0-1 1v17a1 1 0 1 0 2 0v-6h10.382a1 1 0 0 0 .894-1.447L16.618 10l1.658-3.553A1 1 0 0 0 17.382 5H7V4a1 1 0 0 0-1-1z" />
    </svg>
  )
}

/** 单个任务详情面板 */
export function TaskDetailPanel() {
  const {
    tasksByList,
    selectedListId,
    selectedTaskId,
    lists,
    tags,
    taskTags,
    updateTask,
    deleteTask,
    toggleTask,
    selectTask,
  } = useTasksStore()

  const task = useMemo(() => {
    if (!selectedTaskId) return null
    if (selectedListId) {
      return (tasksByList[selectedListId] ?? []).find((t) => t.id === selectedTaskId) ?? null
    }
    // 全部清单视图：跨所有清单查找
    for (const listTasks of Object.values(tasksByList)) {
      const found = listTasks.find((t) => t.id === selectedTaskId)
      if (found) return found
    }
    return null
  }, [tasksByList, selectedListId, selectedTaskId])

  const parentTask = useMemo(() => {
    if (!task?.parent_task_id) return null
    return (tasksByList[task.list_id] ?? []).find((t) => t.id === task.parent_task_id) ?? null
  }, [tasksByList, task])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<0 | 1 | 2 | 3>(0)
  const [reminder, setReminder] = useState('')
  const [recurrence, setRecurrence] = useState<RecurrenceValue>({ rrule: null, rrule_end_date: null })
  const [tagIds, setTagIds] = useState<string[]>([])
  const [panel, setPanel] = useState<PanelKind | null>(null)
  const [timePanel, setTimePanel] = useState<'hour' | 'min' | null>(null)
  const [calMonth, setCalMonth] = useState(() => ({ y: dayjs().year(), m: dayjs().month() + 1 }))
  const detailWidth = useLayoutStore((s) => s.detailWidth)

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description)
    setDueDate(task.due_date ?? '')
    setDueTime(task.due_time ?? '')
    setPriority(task.priority)
    setReminder(task.reminder_minutes != null ? String(task.reminder_minutes) : '')
    setRecurrence({ rrule: task.rrule, rrule_end_date: task.rrule_end_date })
    setTagIds(taskTags[task.id] ?? [])
    setPanel(null)
  }, [task?.id, task?.updated_at, taskTags[task?.id ?? '']?.join(',')])

  const overdueDays = useMemo(() => {
    if (!task?.due_date || task.is_completed) return 0
    const diff = parseDateKey(todayKey()).getTime() - parseDateKey(task.due_date).getTime()
    return diff > 0 ? Math.round(diff / 86400000) : 0
  }, [task?.due_date, task?.is_completed])

  if (!task) {
    return (
      <aside
        className="flex shrink-0 flex-col items-center justify-center bg-canvas-2 px-6 text-center"
        style={{ width: detailWidth }}
      >
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-xs ring-1 ring-ink/5">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-3">
            <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm font-medium text-ink-2">选择一个任务</p>
        <p className="mt-1 text-xs text-ink-4">点击左侧任务查看详情</p>
      </aside>
    )
  }

  async function commit(patch: Parameters<typeof updateTask>[1]) {
    if (!task) return
    await updateTask(task.id, patch)
  }

  async function handleDelete() {
    if (!task || !window.confirm(`删除任务「${task.title}」？`)) return
    selectTask(null)
    await deleteTask(task.id, task.list_id)
  }

  const listName = lists.find((l) => l.id === task.list_id)?.name ?? ''
  const completed = Boolean(task.is_completed)

  const dateLabel = (() => {
    if (!dueDate) return ''
    const [, m, d] = dueDate.split('-').map(Number)
    let s = `${m}月${d}日`
    if (dueTime) s += `, ${dueTime.slice(0, 5)}`
    if (overdueDays > 0) s += `, 已延期${overdueDays}天`
    return s
  })()

  function togglePanel(kind: PanelKind) {
    setPanel((p) => (p === kind ? null : kind))
  }

  return (
    <aside className="relative flex min-w-0 shrink-0 flex-col bg-white" style={{ width: detailWidth }}>
      {(panel || timePanel) && <div className="fixed inset-0 z-10" onClick={() => { setPanel(null); setTimePanel(null) }} />}

      {/* ====== 顶部：完成按钮 + 日期 + 优先级旗帜 ====== */}
      <div className="flex items-center gap-3 px-5 pt-5">
        {/* 完成按钮：黄色圆角方框，完成后变灰打勾 */}
        <button
          onClick={() => toggleTask(task)}
          aria-label={completed ? '撤销完成' : '标记完成'}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 transition-all duration-150 ${
            completed
              ? 'border-ink-4 bg-ink-4'
              : 'border-[#f5b73c] hover:bg-[#f5b73c]/15'
          }`}
        >
          {completed && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* 日期：红色字体（过期时），点击修改 */}
        <div className="relative min-w-0 flex-1">
          <button
            onClick={() => togglePanel('date')}
            className={`flex max-w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-[13px] transition-colors hover:bg-canvas-2 ${
              overdueDays > 0 ? 'font-medium text-prihigh' : dueDate ? 'text-ink-2' : 'text-ink-4'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
            </svg>
            <span className="truncate">{dateLabel || '设置日期'}</span>
          </button>

          {panel === 'date' && (
            <div className="absolute left-0 top-full z-20 mt-1 w-[272px] rounded-2xl border border-canvas-3 bg-white p-4 shadow-card-xl">
              {/* 月份导航 */}
              <div className="mb-3 flex items-center justify-between">
                <button onClick={() => setCalMonth((c) => c.m === 1 ? { y: c.y - 1, m: 12 } : { y: c.y, m: c.m - 1 })}
                  className="rounded-lg p-1 text-ink-3 hover:bg-canvas-2 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <span className="text-[13px] font-semibold text-ink">{calMonth.y}年{calMonth.m}月</span>
                <button onClick={() => setCalMonth((c) => c.m === 12 ? { y: c.y + 1, m: 1 } : { y: c.y, m: c.m + 1 })}
                  className="rounded-lg p-1 text-ink-3 hover:bg-canvas-2 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
              {/* 星期头 */}
              <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-ink-3">
                {['一','二','三','四','五','六','日'].map(d => <span key={d}>{d}</span>)}
              </div>
              {/* 日历格子 */}
              <div className="grid grid-cols-7 text-center">
                {(() => {
                  const first = dayjs(`${calMonth.y}-${pad2(calMonth.m)}-01`)
                  const startDow = (first.day() + 6) % 7
                  const daysInMonth = first.daysInMonth()
                  const today = todayKey()
                  const cells: React.ReactNode[] = []
                  for (let i = 0; i < startDow; i++) cells.push(<div key={`e${i}`} />)
                  for (let d = 1; d <= daysInMonth; d++) {
                    const key = `${calMonth.y}-${pad2(calMonth.m)}-${pad2(d)}`
                    const isToday = key === today
                    const isSel = key === dueDate
                    cells.push(
                      <button key={key}
                        onClick={() => { setDueDate(key); void commit({ due_date: key }) }}
                        className={`mx-auto my-0.5 flex h-8 w-8 items-center justify-center rounded-2xl text-[12px] font-medium transition-all duration-150
                          ${isSel ? 'bg-royal text-white shadow-sm' : isToday ? 'bg-royal-50 text-royal' : 'text-ink-2 hover:bg-canvas-2'}
                        `}>
                        {d}
                      </button>
                    )
                  }
                  return cells
                })()}
              </div>
              {/* 时间选择器 — 自定义下拉，始终向下 */}
              <div className="mt-3 flex items-center gap-2 border-t border-canvas-3 pt-3">
                <div className="flex items-center gap-1 flex-1">
                  {/* 时 */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => setTimePanel(timePanel === 'hour' ? null : 'hour')}
                      className="w-full rounded-2xl border border-canvas-3 bg-canvas px-2.5 py-2 text-center text-sm text-ink hover:border-canvas-4 transition-colors">
                      {dueTime ? dueTime.slice(0, 5) : '--:--'}
                    </button>
                    {timePanel === 'hour' && (
                      <div className="absolute left-0 top-full z-20 mt-1 w-full max-h-40 overflow-y-auto rounded-2xl border border-canvas-3 bg-white py-1 shadow-card-xl">
                        <button onClick={() => { setDueTime(''); void commit({ due_time: null }); setTimePanel(null) }}
                          className="w-full px-3 py-1.5 text-center text-sm text-ink-3 hover:bg-canvas-2">--:--</button>
                        {Array.from({length: 24}, (_, h) => (
                          <button key={h}
                            onClick={() => { setDueTime(`${pad2(h)}:00`); void commit({ due_time: `${pad2(h)}:00` }); setTimePanel(null) }}
                            className="w-full px-3 py-1.5 text-center text-sm text-ink-2 hover:bg-canvas-2">
                            {pad2(h)}:00
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-ink-3">:</span>
                  {/* 分 */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => dueTime && setTimePanel(timePanel === 'min' ? null : 'min')}
                      disabled={!dueTime}
                      className="w-full rounded-2xl border border-canvas-3 bg-canvas px-2.5 py-2 text-center text-sm text-ink hover:border-canvas-4 transition-colors disabled:opacity-40">
                      {dueTime ? dueTime.slice(-2) : '--'}
                    </button>
                    {timePanel === 'min' && (
                      <div className="absolute left-0 top-full z-20 mt-1 w-full max-h-36 overflow-y-auto rounded-2xl border border-canvas-3 bg-white py-1 shadow-card-xl">
                        {['00','15','30','45'].map(m => (
                          <button key={m}
                            onClick={() => {
                              const h = dueTime ? dueTime.slice(0, 2) : pad2(new Date().getHours())
                              const v = `${h}:${m}`
                              setDueTime(v)
                              void commit({ due_time: v })
                              setTimePanel(null)
                            }}
                            className="w-full px-3 py-1.5 text-center text-sm text-ink-2 hover:bg-canvas-2">
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-between">
                <button
                  onClick={() => {
                    setDueDate('')
                    setDueTime('')
                    void commit({ due_date: null, due_time: null })
                    setPanel(null)
                  }}
                  className="rounded-xl px-3 py-1.5 text-xs font-medium text-ink-3 transition-colors hover:bg-canvas-2 hover:text-prihigh"
                >清除日期</button>
                <button onClick={() => setPanel(null)}
                  className="rounded-xl bg-royal px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-royal-dark">完成</button>
              </div>
            </div>
          )}
        </div>

        {/* 优先级旗帜 */}
        <div className="relative shrink-0">
          <button
            onClick={() => togglePanel('priority')}
            aria-label="设置优先级"
            className="rounded-lg p-1 transition-colors hover:bg-canvas-2"
          >
            <FlagIcon priority={priority} size={17} />
          </button>

          {panel === 'priority' && (
            <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-canvas-3 bg-white py-1 shadow-card-xl">
              {PRIORITY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => {
                    setPriority(o.value)
                    void commit({ priority: o.value })
                    setPanel(null)
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-[13px] transition-colors hover:bg-canvas-2 ${
                    priority === o.value ? 'font-medium text-royal' : 'text-ink-2'
                  }`}
                >
                  <FlagIcon priority={o.value} size={14} />
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ====== 主任务（父任务） ====== */}
      <div className="mt-4 px-5">
        {parentTask ? (
          <button
            onClick={() => selectTask(parentTask.id)}
            className="group flex max-w-full items-center gap-0.5 text-[13px] text-ink-3 transition-colors hover:text-royal"
          >
            <span className="truncate" style={{ maxWidth: detailWidth - 100 }}>{parentTask.title}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <span className="flex max-w-full items-center gap-0.5 text-[13px] text-ink-3">
            <span className="truncate" style={{ maxWidth: detailWidth - 100 }}>{listName}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>

      {/* ====== 任务标题 ====== */}
      <div className="mt-1 flex items-start gap-2 px-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== task.title && commit({ title: title.trim() })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          className={`min-w-0 flex-1 bg-transparent text-lg font-bold text-ink placeholder:text-ink-4 focus:outline-none ${
            completed ? 'text-ink-4 line-through' : ''
          }`}
          placeholder="任务名称"
        />
      </div>

      {/* ====== 中部：描述 ====== */}
      <div className="mt-3 flex-1 overflow-y-auto px-5">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== task.description && commit({ description })}
          placeholder="添加描述…"
          className="h-full min-h-[120px] w-full resize-none bg-transparent text-sm leading-relaxed text-ink-2 placeholder:text-ink-4 focus:outline-none"
        />
      </div>

      {/* ====== 右下角：更多操作（三个点） ====== */}
      <div className="absolute bottom-3 right-3 z-20">
        <button
          onClick={() => togglePanel('more')}
          aria-label="更多设置"
          className={`rounded-lg p-1.5 transition-colors hover:bg-canvas-2 ${
            reminder || recurrence.rrule || tagIds.length > 0 ? 'text-royal' : 'text-ink-3'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>

        {panel === 'more' && (
          <div className="absolute bottom-full right-0 z-20 mb-1 w-64 overflow-y-auto rounded-xl border border-canvas-3 bg-white p-4 shadow-card-xl" style={{ maxHeight: 'min(70vh, 480px)', maxWidth: `min(256px, ${detailWidth - 24}px)` }}>
            <div className="space-y-3">
              {/* 所属清单 */}
              <div>
                <span className="mb-1 block text-[11px] font-semibold tracking-wide text-ink-3">所属清单</span>
                <div className="max-h-36 overflow-y-auto rounded-lg border border-canvas-3 py-0.5">
                  {lists.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        void commit({ list_id: l.id })
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-[13px] transition-colors hover:bg-canvas-2 ${
                        l.id === task.list_id ? 'font-medium text-royal' : 'text-ink-2'
                      }`}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
                      <span className="truncate">{l.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 提醒 */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold tracking-wide text-ink-3">提醒</label>
                <Select
                  value={reminder}
                  onChange={(e) => {
                    const v = e.target.value
                    setReminder(v)
                    void commit({ reminder_minutes: v === '' ? null : Number(v) })
                  }}
                >
                  {REMINDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* 重复 */}
              <div>
                <span className="mb-1 block text-[11px] font-semibold tracking-wide text-ink-3">重复</span>
                <RecurrenceRuleEditor
                  value={recurrence}
                  onChange={(v) => {
                    setRecurrence(v)
                    void commit({
                      is_recurring: (v.rrule ? 1 : 0) as 0 | 1,
                      rrule: v.rrule,
                      rrule_end_date: v.rrule_end_date,
                    })
                  }}
                  startDate={dueDate || null}
                />
              </div>

              {/* 标签 */}
              {tags.length > 0 && (
                <div>
                  <span className="mb-1 block text-[11px] font-semibold tracking-wide text-ink-3">标签</span>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => {
                      const active = tagIds.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          onClick={() => {
                            const next = active
                              ? tagIds.filter((x) => x !== tag.id)
                              : [...tagIds, tag.id]
                            setTagIds(next)
                            void commit({ tag_ids: next })
                          }}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-150 ${
                            active ? 'border-transparent text-white shadow-sm' : 'hover:bg-canvas-2'
                          }`}
                          style={
                            active
                              ? { backgroundColor: tag.color }
                              : { borderColor: tag.color, color: tag.color }
                          }
                        >
                          {tag.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 分隔线 + 保存 / 删除 */}
              <div className="flex items-center gap-2 border-t border-canvas-3 pt-2.5">
                <button
                  onClick={() => setPanel(null)}
                  className="flex-1 rounded-lg bg-royal px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-royal-dark"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setPanel(null)
                    void handleDelete()
                  }}
                  className="flex-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-prihigh transition-colors hover:bg-red-50"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
