import { useEffect, useState } from 'react'
import type { Task } from '@shared/types'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { RecurrenceRuleEditor, type RecurrenceValue } from '@/features/recurring/RecurrenceRuleEditor'
import { PRIORITY_COLORS } from './TaskItem'
import { useTasksStore } from '../store'
import { parseDateKey, todayKey, pad2 } from '@/lib/date-utils'
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

type PanelKind = 'date' | 'priority' | 'more' | 'list' | 'reminder' | null

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

export interface TaskFormDialogProps {
  open: boolean
  onClose: () => void
  /** 编辑已有任务时传入；新建时为 null */
  task: Task | null
  /** 新建时的初始清单与日期 */
  defaultListId?: string | null
  defaultDueDate?: string | null
}

export function TaskFormDialog({ open, onClose, task, defaultListId, defaultDueDate }: TaskFormDialogProps) {
  const { lists, tags, createTask, updateTask, deleteTask, toggleTask, selectedListId, taskTags } = useTasksStore()

  const pendingListId = lists.find((l) => l.name === '待定')?.id ?? null

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [listId, setListId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<0 | 1 | 2 | 3>(0)
  const [reminder, setReminder] = useState('')
  const [recurrence, setRecurrence] = useState<RecurrenceValue>({ rrule: null, rrule_end_date: null })
  const [tagIds, setTagIds] = useState<string[]>([])
  const [panel, setPanel] = useState<PanelKind>(null)
  const [timePanel, setTimePanel] = useState<'hour' | 'min' | null>(null)
  const [calMonth, setCalMonth] = useState(() => ({ y: dayjs().year(), m: dayjs().month() + 1 }))
  const completed = Boolean(task?.is_completed)

  useEffect(() => {
    if (!open) return
    if (task) {
      // 编辑模式：预填任务数据
      setTitle(task.title)
      setDescription(task.description)
      setListId(task.list_id)
      setDueDate(task.due_date ?? '')
      setDueTime(task.due_time ?? '')
      setPriority(task.priority)
      setReminder(task.reminder_minutes != null ? String(task.reminder_minutes) : '')
      setRecurrence({ rrule: task.rrule, rrule_end_date: task.rrule_end_date })
      setTagIds(taskTags[task.id] ?? [])
    } else {
      // 新建模式：清空
      setTitle('')
      setDescription('')
      // 新建：无日期 → 始终待定；有日期 → 传入清单或第一个非待定清单
      const hasDefaultDate = defaultDueDate !== undefined && defaultDueDate !== null && defaultDueDate !== ''
      setListId(
        defaultListId
        ?? (hasDefaultDate
          ? (selectedListId ?? lists.find((l) => l.name !== '待定')?.id ?? lists[0]?.id)
          : (pendingListId ?? lists[0]?.id))
        ?? '',
      )
      setDueDate(defaultDueDate ?? '')
      setDueTime('')
      setPriority(0)
      setReminder('')
      setRecurrence({ rrule: null, rrule_end_date: null })
      setTagIds([])
    }
    setPanel(null)
  }, [open, task, defaultListId, defaultDueDate, selectedListId, lists, taskTags])

  async function handleSave() {
    if (!title.trim() || !listId) return
    if (task) {
      await updateTask(task.id, {
        list_id: listId,
        title: title.trim(),
        description,
        due_date: dueDate || null,
        due_time: dueTime || null,
        priority,
        reminder_minutes: reminder === '' ? null : Number(reminder),
        is_recurring: (recurrence.rrule ? 1 : 0) as 0 | 1,
        rrule: recurrence.rrule,
        rrule_end_date: recurrence.rrule_end_date,
        tag_ids: tagIds,
      })
    } else {
      await createTask({
        list_id: listId,
        title: title.trim(),
        description,
        due_date: dueDate || null,
        due_time: dueTime || null,
        priority,
        reminder_minutes: reminder === '' ? null : Number(reminder),
        is_recurring: (recurrence.rrule ? 1 : 0) as 0 | 1,
        rrule: recurrence.rrule,
        rrule_end_date: recurrence.rrule_end_date,
        tag_ids: tagIds,
      })
    }
    onClose()
  }

  async function handleDelete() {
    if (!task || !window.confirm(`删除任务「${task.title}」？`)) return
    await deleteTask(task.id, task.list_id)
    onClose()
  }

  const overdueDays = (() => {
    if (!task?.due_date || completed) return 0
    const diff = parseDateKey(todayKey()).getTime() - parseDateKey(task.due_date).getTime()
    return diff > 0 ? Math.round(diff / 86400000) : 0
  })()

  const listName = lists.find((l) => l.id === listId)?.name ?? ''
  const dateLabel = (() => {
    if (!dueDate) return ''
    const [, m, d] = dueDate.split('-').map(Number)
    let s = `${m}月${d}日`
    if (dueTime) s += `, ${dueTime.slice(0, 5)}`
    if (overdueDays > 0) s += `, 已延期${overdueDays}天`
    return s
  })()

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="relative w-full max-w-2xl overflow-visible rounded-2xl bg-white shadow-card-xl ring-1 ring-ink/5">
          {(panel || timePanel) && <div className="fixed inset-0 z-10" onClick={() => { setPanel(null); setTimePanel(null) }} />}

          {/* ====== 标题栏 ====== */}
          <div className="flex items-center justify-between border-b border-canvas-3 px-6 py-5">
            <DialogTitle className="text-xl font-bold text-ink">
              {task ? '编辑任务' : '新建任务'}
            </DialogTitle>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-canvas-2 hover:text-ink"
              aria-label="关闭"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-5 pb-10">
            {/* ====== 顶部：完成按钮 + 日期 + 优先级（对齐 TaskDetailPanel 风格） ====== */}
            <div className="mb-4 flex items-center gap-3">
              {/* 编辑模式下显示完成按钮 */}
              {task && (
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
              )}

              {/* 日期选择 */}
              <div className="relative min-w-0 flex-1">
                <button
                  onClick={() => setPanel(panel === 'date' ? null : 'date')}
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
                    <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-ink-3">
                      {['一','二','三','四','五','六','日'].map(d => <span key={d}>{d}</span>)}
                    </div>
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
                              onClick={() => { setDueDate(key); setPanel(null) }}
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
                              <button onClick={() => { setDueTime(''); setTimePanel(null) }}
                                className="w-full px-3 py-1.5 text-center text-sm text-ink-3 hover:bg-canvas-2">--:--</button>
                              {Array.from({length: 24}, (_, h) => (
                                <button key={h}
                                  onClick={() => { setDueTime(`${pad2(h)}:00`); setTimePanel(null) }}
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
                                    setDueTime(`${h}:${m}`)
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
                      <button onClick={() => { setDueDate(''); setDueTime(''); setPanel(null) }}
                        className="rounded-xl px-3 py-1.5 text-xs font-medium text-ink-3 transition-colors hover:bg-canvas-2 hover:text-prihigh">清除日期</button>
                      <button onClick={() => setPanel(null)}
                        className="rounded-xl bg-royal px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-royal-dark">完成</button>
                    </div>
                  </div>
                )}
              </div>

              {/* 优先级旗帜 */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setPanel(panel === 'priority' ? null : 'priority')}
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
                        onClick={() => { setPriority(o.value); setPanel(null) }}
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

            {/* ====== 清单路径 ====== */}
            <div className="relative mb-1">
              <button
                onClick={() => setPanel(panel === 'list' ? null : 'list')}
                className="flex items-center gap-0.5 text-sm text-ink-3 transition-colors hover:text-royal"
              >
                <span>{listName}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 opacity-50">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {panel === 'list' && (
                <div className="absolute left-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-canvas-3 bg-white py-1 shadow-card-xl">
                  <div className="max-h-48 overflow-y-auto">
                    {lists.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => { setListId(l.id); setPanel(null); }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-[13px] transition-colors hover:bg-canvas-2 ${
                          l.id === listId ? 'font-medium text-royal' : 'text-ink-2'
                        }`}
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
                        <span className="truncate">{l.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ====== 任务标题 ====== */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className={`w-full bg-transparent text-2xl font-bold text-ink placeholder:text-ink-4 focus:outline-none ${
                completed ? 'text-ink-4 line-through' : ''
              }`}
              placeholder="任务名称"
              autoFocus
            />

            {/* ====== 描述 ====== */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加描述…"
              className="mt-4 h-[180px] w-full resize-none bg-transparent text-base leading-relaxed text-ink-2 placeholder:text-ink-4 focus:outline-none"
            />
          </div>

          {/* ====== 右下角：更多操作（三个点） ====== */}
          <div className="absolute bottom-3 right-3 z-20">
            <button
              onClick={() => setPanel(panel === 'more' ? null : 'more')}
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
              <div className="absolute bottom-full right-0 z-20 mb-1 w-40 overflow-hidden rounded-xl border border-canvas-3 bg-white py-1 shadow-card-xl">
                {/* 提醒 */}
                <button
                  onClick={() => { setPanel('reminder'); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-ink-2 transition-colors hover:bg-canvas-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink-3">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {REMINDER_OPTIONS.find(o => o.value === reminder)?.label ?? '提醒'}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto shrink-0 text-ink-3"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>

                {/* 分隔线 + 保存 / 删除 */}
                <div className="mt-0.5 border-t border-canvas-3 pt-0.5">
                  <button
                    onClick={() => { setPanel(null); handleSave(); }}
                    disabled={!title.trim() || !listId}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-medium text-royal transition-colors hover:bg-royal-50 disabled:opacity-40"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <path d="M17 21v-8H7v8M7 3v5h8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {task ? '保存' : '创建'}
                  </button>
                  {task && (
                    <button
                      onClick={() => { setPanel(null); handleDelete(); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-medium text-prihigh transition-colors hover:bg-red-50"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      删除
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 提醒选择子面板 */}
            {panel === 'reminder' && (
              <div className="absolute bottom-full right-0 z-20 mb-1 w-40 overflow-hidden rounded-xl border border-canvas-3 bg-white py-1 shadow-card-xl">
                {REMINDER_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => { setReminder(o.value); setPanel('more'); }}
                    className={`flex w-full items-center px-3 py-2 text-[13px] transition-colors hover:bg-canvas-2 ${
                      reminder === o.value ? 'font-medium text-royal' : 'text-ink-2'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
