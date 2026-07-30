import { useMemo, useState } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Task } from '@shared/types'
import { useTasksStore } from '../store'
import { TaskItem, PRIORITY_COLORS } from './TaskItem'
import { TaskFormDialog } from './TaskFormDialog'
import { TaskDetailPanel } from './TaskDetailPanel'
import { TaskContextMenu, type ContextMenuState } from './TaskContextMenu'
import { ResizeHandle } from '@/components/layout/ResizeHandle'
import { DETAIL_WIDTH, useLayoutStore } from '@/components/layout/layoutStore'
import { todayKey, pad2 } from '@/lib/date-utils'
import { useDailyStore } from '@/features/daily/store'
import { DailyTaskCard } from '@/features/daily/components/DailyTaskCard'
import dayjs from 'dayjs'

export function TaskListView() {
  const {
    lists,
    tasksByList,
    selectedListId,
    selectedTaskId,
    tags,
    taskTags,
    createTask,
    toggleTask,
    selectTask,
  } = useTasksStore()
  const [quickTitle, setQuickTitle] = useState('')
  const [quickDate, setQuickDate] = useState('')
  const [quickTime, setQuickTime] = useState('')
  const [quickPriority, setQuickPriority] = useState<0 | 1 | 2 | 3>(0)
  const [quickPanel, setQuickPanel] = useState<'date' | 'priority' | null>(null)
  const [timePanel, setTimePanel] = useState<'hour' | 'min' | null>(null)
  const [calMonth, setCalMonth] = useState(() => ({ y: dayjs().year(), m: dayjs().month() + 1 }))
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<-1 | 0 | 1 | 2 | 3>(-1)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const { detailWidth, setDetailWidth, saveDetailWidth } = useLayoutStore()
  const {
    routines: dailyRoutines,
    completions: dailyCompletions,
    increment: dailyIncrement,
    decrement: dailyDecrement,
  } = useDailyStore()

  // 「今日」视图：selectedListId 为 null 时跨全部清单，选中具体清单时仅显示该清单
  const isAllView = selectedListId === null
  const list = selectedListId ? lists.find((l) => l.id === selectedListId) ?? null : null

  // 清单 ID → 颜色/名称 映射
  const listMeta = useMemo(() => {
    const map: Record<string, { color: string; name: string }> = {}
    for (const l of lists) map[l.id] = { color: l.color, name: l.name }
    return map
  }, [lists])

  const tasks = useMemo(() => {
    const source = selectedListId
      ? (tasksByList[selectedListId] ?? [])
      : Object.values(tasksByList).flat()
    return source.filter((t) => {
      if (priorityFilter !== -1 && t.priority !== priorityFilter) return false
      if (tagFilter && !(taskTags[t.id] ?? []).includes(tagFilter)) return false
      return true
    })
  }, [tasksByList, selectedListId, priorityFilter, tagFilter, taskTags])
  const active = useMemo(() => tasks.filter((t) => !t.is_completed), [tasks])
  const completed = useMemo(() => tasks.filter((t) => t.is_completed), [tasks])

  // 子任务按父任务分组（仅针对活跃任务）
  const subtasksByParent = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of active) {
      if (t.parent_task_id) {
        (map[t.parent_task_id] ??= []).push(t)
      }
    }
    return map
  }, [active])

  // 将活跃任务分组：今日 → 将来/无日期 → 过期（排除子任务，子任务在父任务下方显示）
  const today = todayKey()
  const { todayActive, upcomingActive, overdueActive } = useMemo(() => {
    const todayList: Task[] = []
    const upcoming: Task[] = []
    const overdue: Task[] = []
    for (const t of active) {
      if (t.parent_task_id) continue // 子任务不独立显示
      if (t.due_date === today) {
        todayList.push(t)
      } else if (t.due_date && t.due_date < today) {
        overdue.push(t)
      } else {
        upcoming.push(t)
      }
    }
    return { todayActive: todayList, upcomingActive: upcoming, overdueActive: overdue }
  }, [active])

  const tagNamesByTask = useMemo(() => {
    const byId = new Map(tags.map((t) => [t.id, t.name]))
    const map: Record<string, string[]> = {}
    for (const task of tasks) {
      map[task.id] = (taskTags[task.id] ?? []).map((id) => byId.get(id)).filter(Boolean) as string[]
    }
    return map
  }, [tasks, tags, taskTags])

  // 找「待定」清单 ID
  const pendingListId = useMemo(
    () => lists.find((l) => l.name === '待定')?.id ?? null,
    [lists],
  )

  async function handleQuickAdd() {
    const title = quickTitle.trim()
    if (!title) return
    // 无日期 → 始终待定；有日期 → 选中清单或第一个非待定清单
    const hasDate = quickDate !== ''
    const targetListId = hasDate
      ? (selectedListId ?? lists.find((l) => l.name !== '待定')?.id ?? lists[0]?.id)
      : (pendingListId ?? lists[0]?.id)
    if (!targetListId) return
    setQuickTitle('')
    setQuickDate('')
    setQuickTime('')
    setQuickPriority(0)
    setQuickPanel(null)
    await createTask({
      list_id: targetListId,
      title,
      due_date: quickDate || null,
      due_time: quickTime || null,
      priority: quickPriority,
    })
  }

  function clearQuickDate() {
    setQuickDate('')
    setQuickTime('')
    setQuickPanel(null)
  }

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

  if (lists.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-3">
        请先在左侧创建一个清单
      </div>
    )
  }

  // 传递给 TaskItem 的通用 props 工厂
  function taskItemProps(task: Task, extra?: { variant?: 'default' | 'overdue'; isSubtask?: boolean }) {
    const meta = listMeta[task.list_id]
    return {
      task,
      tagNames: tagNamesByTask[task.id] ?? [],
      selected: task.id === selectedTaskId,
      onToggle: toggleTask,
      onEdit: setEditingTask,
      onSelect: selectTask,
      onContextMenu: (e: React.MouseEvent, t: Task) => {
        e.preventDefault()
        // 菜单显示在鼠标右侧，避免遮挡当前任务
        setContextMenu({ x: e.clientX + 8, y: e.clientY, task: t })
      },
      variant: (extra?.variant ?? 'default') as 'default' | 'overdue',
      listColor: isAllView ? meta?.color : undefined,
      listName: isAllView ? meta?.name : undefined,
      isSubtask: extra?.isSubtask ?? false,
    }
  }

  /** 渲染一条任务及其子任务 */
  function renderTaskWithSubtasks(task: Task, extra?: { variant?: 'default' | 'overdue'; sortable?: boolean }) {
    const subtasks = subtasksByParent[task.id] ?? []
    const sortable = extra?.sortable ?? true
    return (
      <div key={task.id}>
        <TaskItem key={task.id} {...taskItemProps(task, extra)} sortable={sortable} />
        {subtasks.length > 0 && (
          <div className="mt-1 space-y-1">
            {subtasks.map((sub) => (
              <TaskItem key={sub.id} {...taskItemProps(sub, { ...extra, isSubtask: true })} sortable={false} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full w-full">
      {/* 左：任务列表 */}
      <div className="flex min-w-0 flex-1 flex-col px-5 py-5">
        {/* 快速添加栏 */}
        <div className="mb-3">
          {(quickPanel || timePanel) && <div className="fixed inset-0 z-10" onClick={() => { setQuickPanel(null); setTimePanel(null) }} />}
          <div className="rounded-xl bg-canvas-2/80 ring-1 ring-canvas-3/40 transition-all duration-150 focus-within:bg-white focus-within:ring-3 focus-within:ring-royal-50/50 hover:ring-canvas-4">
            <input
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              placeholder="添加任务，按回车创建…"
              className="w-full bg-transparent px-4 py-2.5 text-sm text-ink placeholder:text-ink-4 focus:outline-none"
            />
            {/* 下方小按钮栏 */}
            <div className="flex items-center gap-1 border-t border-canvas-3/30 px-2 py-1.5">
              {/* 日期按钮 */}
              <div className="relative">
                <button
                  onClick={() => setQuickPanel(quickPanel === 'date' ? null : 'date')}
                  aria-label="设置日期"
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] transition-colors hover:bg-white/80 ${
                    quickDate ? 'text-royal font-medium' : 'text-ink-3'
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                  </svg>
                  {quickDate ? quickDate.slice(5) : '日期'}
                </button>
                {quickPanel === 'date' && (
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
                        const startDow = (first.day() + 6) % 7 // Mon=0
                        const daysInMonth = first.daysInMonth()
                        const today = todayKey()
                        const cells: React.ReactNode[] = []
                        for (let i = 0; i < startDow; i++) cells.push(<div key={`e${i}`} />)
                        for (let d = 1; d <= daysInMonth; d++) {
                          const key = `${calMonth.y}-${pad2(calMonth.m)}-${pad2(d)}`
                          const isToday = key === today
                          const isSel = key === quickDate
                          cells.push(
                            <button key={key}
                              onClick={() => { setQuickDate(key); setQuickPanel(null) }}
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
                            {quickTime ? quickTime.slice(0, 5) : '--:--'}
                          </button>
                          {timePanel === 'hour' && (
                            <div className="absolute left-0 top-full z-20 mt-1 w-full max-h-40 overflow-y-auto rounded-2xl border border-canvas-3 bg-white py-1 shadow-card-xl">
                              <button onClick={() => { setQuickTime(''); setTimePanel(null) }}
                                className="w-full px-3 py-1.5 text-center text-sm text-ink-3 hover:bg-canvas-2">--:--</button>
                              {Array.from({length: 24}, (_, h) => (
                                <button key={h}
                                  onClick={() => { setQuickTime(`${pad2(h)}:00`); setTimePanel(null) }}
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
                            onClick={() => quickTime && setTimePanel(timePanel === 'min' ? null : 'min')}
                            disabled={!quickTime}
                            className="w-full rounded-2xl border border-canvas-3 bg-canvas px-2.5 py-2 text-center text-sm text-ink hover:border-canvas-4 transition-colors disabled:opacity-40">
                            {quickTime ? quickTime.slice(-2) : '--'}
                          </button>
                          {timePanel === 'min' && (
                            <div className="absolute left-0 top-full z-20 mt-1 w-full max-h-36 overflow-y-auto rounded-2xl border border-canvas-3 bg-white py-1 shadow-card-xl">
                              {['00','15','30','45'].map(m => (
                                <button key={m}
                                  onClick={() => {
                                    const h = quickTime ? quickTime.slice(0, 2) : pad2(new Date().getHours())
                                    setQuickTime(`${h}:${m}`)
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
                      <button onClick={clearQuickDate} className="rounded-xl px-3 py-1.5 text-xs font-medium text-ink-3 transition-colors hover:bg-canvas-2 hover:text-prihigh">清除</button>
                      <button onClick={() => setQuickPanel(null)} className="rounded-xl bg-royal px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-royal-dark">完成</button>
                    </div>
                  </div>
                )}
              </div>

              {/* 优先级按钮 */}
              <div className="relative">
                <button
                  onClick={() => setQuickPanel(quickPanel === 'priority' ? null : 'priority')}
                  aria-label="设置优先级"
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] transition-colors hover:bg-white/80 ${
                    quickPriority > 0 ? 'text-royal font-medium' : 'text-ink-3'
                  }`}
                >
                  <FlagIcon priority={quickPriority} size={12} />
                  {quickPriority === 3 ? '高' : quickPriority === 2 ? '中' : quickPriority === 1 ? '低' : '优先级'}
                </button>
                {quickPanel === 'priority' && (
                  <div className="absolute left-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-canvas-3 bg-white py-1 shadow-card-xl">
                    {([3, 2, 1, 0] as const).map((v) => (
                      <button key={v}
                        onClick={() => { setQuickPriority(v); setQuickPanel(null) }}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-[13px] transition-colors hover:bg-canvas-2 ${quickPriority === v ? 'font-medium text-royal' : 'text-ink-2'}`}>
                        <FlagIcon priority={v} size={12} />
                        {v === 3 ? '高' : v === 2 ? '中' : v === 1 ? '低' : '无优先级'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 text-xs">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(Number(e.target.value) as -1 | 0 | 1 | 2 | 3)}
            className="rounded-lg bg-white/80 px-2.5 py-1.5 text-xs text-ink-2 ring-1 ring-canvas-3/40 focus:border-royal focus:outline-none"
          >
            <option value={-1}>全部优先级</option>
            <option value={3}>🔴 高</option>
            <option value={2}>🟠 中</option>
            <option value={1}>🟢 低</option>
            <option value={0}>无</option>
          </select>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all duration-150 ${
                    tagFilter === tag.id
                      ? 'text-white shadow-sm'
                      : 'bg-canvas-2 text-ink-2 hover:bg-canvas-3'
                  }`}
                  style={tagFilter === tag.id ? { backgroundColor: tag.color } : undefined}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {active.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-4">✨ 暂无待办任务</p>
          ) : !isAllView ? (
            /* 具体清单视图：显示全部活跃任务（含无日期） */
            <SortableContext items={active.map((t) => `task:${t.id}`)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {active.filter((t) => !t.parent_task_id).map((task) => (
                  renderTaskWithSubtasks(task)
                ))}
              </div>
            </SortableContext>
          ) : todayActive.length === 0 && overdueActive.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-4">
              ✨ 今天没有到期的任务
            </p>
          ) : (
            <>
              {/* 今日任务 */}
              {todayActive.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-royal">今天</h3>
                  <SortableContext items={todayActive.map((t) => `task:${t.id}`)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {todayActive.map((task) => renderTaskWithSubtasks(task))}
                    </div>
                  </SortableContext>
                </div>
              )}

              {/* 过期未完成 — 标红放在下处 */}
              {overdueActive.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-prihigh">
                    过期未完成 · {overdueActive.length}
                  </h3>
                  <SortableContext items={overdueActive.map((t) => `task:${t.id}`)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {overdueActive.map((task) => renderTaskWithSubtasks(task, { variant: 'overdue' }))}
                    </div>
                  </SortableContext>
                </div>
              )}
            </>
          )}

          {completed.length > 0 && (
            <div className="relative mt-6">
              <div className="absolute inset-x-0 -top-3 h-px bg-canvas-3/40" />
              <button
                className="mb-3 flex items-center gap-1.5 text-xs font-medium text-ink-3 hover:text-ink transition-colors"
                onClick={() => setShowCompleted((v) => !v)}
              >
                <span className={`inline-block transition-transform ${showCompleted ? 'rotate-90' : ''}`}>▸</span>
                已完成 {completed.length}
              </button>
              <div className="space-y-2">
                {showCompleted &&
                  completed.filter((t) => !t.parent_task_id).map((task) =>
                    renderTaskWithSubtasks(task, { sortable: false })
                  )}
              </div>
            </div>
          )}

          {/* 每日任务区域 */}
          {(() => {
            const today = todayKey()
            const todayDow = new Date().getDay()
            const todaysDaily = dailyRoutines.filter((r) => {
              if (!r.active) return false
              const days = JSON.parse(r.days_of_week || '[]') as number[]
              if (days.length === 0) return true
              return days.includes(todayDow)
            })
            if (todaysDaily.length === 0) return null
            return (
              <div className="relative mt-6 pt-4">
                <div className="absolute inset-x-0 top-0 h-px bg-canvas-3/40" />
                <h3 className="mb-3 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">每日打卡</h3>
                <div className="space-y-2">
                  {todaysDaily.map((routine) => (
                    <DailyTaskCard
                      key={routine.id}
                      routine={routine}
                      completions={dailyCompletions}
                      onCheck={(id, itemId) => void dailyIncrement(id, itemId)}
                      onUncheck={(id, itemId) => void dailyDecrement(id, itemId)}
                      onEdit={() => {}}
                    />
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* 右：单任务详情面板（可拖拽调节宽度） */}
      <ResizeHandle
        direction="left"
        width={detailWidth}
        min={DETAIL_WIDTH.min}
        max={DETAIL_WIDTH.max}
        defaultWidth={DETAIL_WIDTH.default}
        onChange={setDetailWidth}
        onCommit={(w) => void saveDetailWidth(w)}
      />
      <TaskDetailPanel
        onEditTask={() => {
          const id = selectedTaskId
          if (!id) return
          const t = tasks.find((x) => x.id === id)
          if (t) setEditingTask(t)
        }}
      />

      <TaskFormDialog
        open={editingTask !== null}
        onClose={() => setEditingTask(null)}
        task={editingTask}
      />

      {/* 右键快捷菜单 */}
      {contextMenu && (
        <TaskContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
