import { useEffect, useRef, useState } from 'react'
import type { Task } from '@shared/types'
import { useTasksStore } from '../store'
import { PRIORITY_COLORS } from './TaskItem'
import { parseDateKey, todayKey, pad2 } from '@/lib/date-utils'
import dayjs from 'dayjs'

const PRIORITY_OPTIONS = [
  { value: 3, label: '高' },
  { value: 2, label: '中' },
  { value: 1, label: '低' },
  { value: 0, label: '无优先级' },
] as const

function FlagIcon({ priority, size = 14 }: { priority: number; size?: number }) {
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

export interface ContextMenuState {
  x: number
  y: number
  task: Task
}

type SubPanel = 'priority' | 'date' | 'list' | 'subtask' | null

export function TaskContextMenu({
  menu,
  onClose,
}: {
  menu: ContextMenuState
  onClose: () => void
}) {
  const { lists, updateTask, updateTaskDueDate, createTask } = useTasksStore()
  const [subPanel, setSubPanel] = useState<SubPanel>(null)
  const [calMonth, setCalMonth] = useState(() => ({ y: dayjs().year(), m: dayjs().month() + 1 }))
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const subtaskInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid the same right-click that opened the menu from closing it
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  // Adjust position so menu doesn't overflow viewport
  const adjustPos = () => {
    const w = 180 // estimated menu width
    const h = subPanel ? 320 : 150 // estimated menu height
    let x = menu.x
    let y = menu.y
    if (x + w > window.innerWidth) x = window.innerWidth - w - 8
    if (y + h > window.innerHeight) y = window.innerHeight - h - 8
    if (x < 0) x = 8
    if (y < 0) y = 8
    return { left: x, top: y }
  }

  const task = menu.task
  const dueDate = task.due_date ?? ''
  const today = todayKey()

  async function handleAddSubtask() {
    const title = subtaskTitle.trim()
    if (!title) return
    await createTask({
      list_id: task.list_id,
      title,
      parent_task_id: task.id,
    })
    setSubtaskTitle('')
    onClose()
  }

  // Auto-focus subtask input when subpanel opens
  useEffect(() => {
    if (subPanel === 'subtask') {
      setTimeout(() => subtaskInputRef.current?.focus(), 50)
    }
  }, [subPanel])

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] w-[180px] overflow-hidden rounded-xl border border-canvas-3 bg-white py-1 shadow-card-xl"
      style={adjustPos()}
    >
      {/* 优先级 */}
      <div className="relative">
        <button
          onClick={() => setSubPanel(subPanel === 'priority' ? null : 'priority')}
          className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-ink-2 transition-colors hover:bg-canvas-2"
        >
          <FlagIcon priority={task.priority} size={14} />
          <span>{PRIORITY_OPTIONS.find((o) => o.value === task.priority)?.label ?? '优先级'}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto shrink-0 text-ink-3">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {subPanel === 'priority' && (
          <div className="border-t border-canvas-3 bg-canvas-2 py-0.5">
            {PRIORITY_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  void updateTask(task.id, { priority: o.value as 0 | 1 | 2 | 3 })
                  onClose()
                }}
                className={`flex w-full items-center gap-2 px-4 py-1.5 text-[13px] transition-colors hover:bg-canvas-3 ${
                  task.priority === o.value ? 'font-medium text-royal' : 'text-ink-2'
                }`}
              >
                <FlagIcon priority={o.value} size={12} />
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 设置日期 */}
      <div className="relative">
        <button
          onClick={() => setSubPanel(subPanel === 'date' ? null : 'date')}
          className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-ink-2 transition-colors hover:bg-canvas-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink-3">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
          </svg>
          <span className="truncate">{dueDate ? dueDate.slice(5) : '设置日期'}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto shrink-0 text-ink-3">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {subPanel === 'date' && (
          <div className="border-t border-canvas-3 bg-canvas-2 p-3">
            {/* 月份导航 */}
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={() => setCalMonth((c) => (c.m === 1 ? { y: c.y - 1, m: 12 } : { y: c.y, m: c.m - 1 }))}
                className="rounded p-0.5 text-ink-3 hover:bg-canvas-3 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="text-[12px] font-semibold text-ink">{calMonth.y}/{calMonth.m}</span>
              <button
                onClick={() => setCalMonth((c) => (c.m === 12 ? { y: c.y + 1, m: 1 } : { y: c.y, m: c.m + 1 }))}
                className="rounded p-0.5 text-ink-3 hover:bg-canvas-3 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            {/* 星期头 */}
            <div className="mb-0.5 grid grid-cols-7 text-center text-[9px] font-medium text-ink-4">
              {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            {/* 日历 */}
            <div className="grid grid-cols-7 text-center">
              {(() => {
                const first = dayjs(`${calMonth.y}-${pad2(calMonth.m)}-01`)
                const startDow = (first.day() + 6) % 7
                const daysInMonth = first.daysInMonth()
                const cells: React.ReactNode[] = []
                for (let i = 0; i < startDow; i++) cells.push(<div key={`e${i}`} />)
                for (let d = 1; d <= daysInMonth; d++) {
                  const key = `${calMonth.y}-${pad2(calMonth.m)}-${pad2(d)}`
                  const isToday = key === today
                  const isSel = key === dueDate
                  cells.push(
                    <button
                      key={key}
                      onClick={() => {
                        void updateTaskDueDate(task.id, key)
                        onClose()
                      }}
                      className={`mx-auto my-0.5 flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-medium transition-all duration-150 ${
                        isSel
                          ? 'bg-royal text-white shadow-sm'
                          : isToday
                            ? 'bg-royal-50 text-royal'
                            : 'text-ink-2 hover:bg-canvas-3'
                      }`}
                    >
                      {d}
                    </button>
                  )
                }
                return cells
              })()}
            </div>
            {dueDate && (
              <button
                onClick={() => {
                  void updateTaskDueDate(task.id, null)
                  onClose()
                }}
                className="mt-2 w-full rounded-lg py-1 text-[12px] font-medium text-ink-3 transition-colors hover:bg-canvas-3 hover:text-prihigh"
              >
                清除日期
              </button>
            )}
          </div>
        )}
      </div>

      {/* 移动到清单 */}
      <div className="relative">
        <button
          onClick={() => setSubPanel(subPanel === 'list' ? null : 'list')}
          className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-ink-2 transition-colors hover:bg-canvas-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink-3">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07L12 5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07L12 19" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="truncate">{lists.find((l) => l.id === task.list_id)?.name ?? '移动'}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto shrink-0 text-ink-3">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {subPanel === 'list' && (
          <div className="max-h-40 overflow-y-auto border-t border-canvas-3 bg-canvas-2 py-0.5">
            {lists.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  void updateTask(task.id, { list_id: l.id })
                  onClose()
                }}
                className={`flex w-full items-center gap-2 px-4 py-1.5 text-[13px] transition-colors hover:bg-canvas-3 ${
                  l.id === task.list_id ? 'font-medium text-royal' : 'text-ink-2'
                }`}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="truncate">{l.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 添加子任务 */}
      <div className="relative border-t border-canvas-3">
        {subPanel === 'subtask' ? (
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <input
              ref={subtaskInputRef}
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddSubtask()
                if (e.key === 'Escape') { setSubPanel(null); setSubtaskTitle('') }
              }}
              placeholder="输入子任务名称…"
              className="min-w-0 flex-1 rounded-md border border-canvas-3 bg-white px-2 py-1 text-[13px] text-ink-2 placeholder:text-ink-4 focus:border-royal focus:outline-none"
            />
            <button
              onClick={() => void handleAddSubtask()}
              disabled={!subtaskTitle.trim()}
              className="shrink-0 rounded-md bg-royal px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-royal-dark disabled:opacity-40"
            >
              添加
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setSubPanel('subtask')
              setSubtaskTitle('')
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-ink-2 transition-colors hover:bg-canvas-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink-3">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>添加子任务</span>
          </button>
        )}
      </div>
    </div>
  )
}
