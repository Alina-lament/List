import { useMemo, useState } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Task } from '@shared/types'
import { useTasksStore } from '../store'
import { TaskItem } from './TaskItem'
import { TaskFormDialog } from './TaskFormDialog'
import { TaskDetailPanel } from './TaskDetailPanel'

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
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<-1 | 0 | 1 | 2 | 3>(-1)
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const list = lists.find((l) => l.id === selectedListId)
  const tasks = useMemo(() => {
    const all = selectedListId ? (tasksByList[selectedListId] ?? []) : []
    return all.filter((t) => {
      if (priorityFilter !== -1 && t.priority !== priorityFilter) return false
      if (tagFilter && !(taskTags[t.id] ?? []).includes(tagFilter)) return false
      return true
    })
  }, [tasksByList, selectedListId, priorityFilter, tagFilter, taskTags])
  const active = useMemo(() => tasks.filter((t) => !t.is_completed), [tasks])
  const completed = useMemo(() => tasks.filter((t) => t.is_completed), [tasks])

  const tagNamesByTask = useMemo(() => {
    const byId = new Map(tags.map((t) => [t.id, t.name]))
    const map: Record<string, string[]> = {}
    for (const task of tasks) {
      map[task.id] = (taskTags[task.id] ?? []).map((id) => byId.get(id)).filter(Boolean) as string[]
    }
    return map
  }, [tasks, tags, taskTags])

  async function handleQuickAdd() {
    const title = quickTitle.trim()
    if (!title || !selectedListId) return
    setQuickTitle('')
    await createTask({ list_id: selectedListId, title })
  }

  if (!list) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-3">
        请先在左侧创建一个清单
      </div>
    )
  }

  return (
    <div className="flex h-full w-full">
      {/* 左：任务列表 */}
      <div className="flex min-w-0 flex-1 flex-col px-8 py-6">
        {/* 清单标题 */}
        <div className="mb-5">
          <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-ink">
            <span className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ backgroundColor: list.color }} />
            {list.name}
          </h2>
        </div>

        <input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
          placeholder="添加任务，按回车创建…"
          className="mb-3 w-full rounded-xl border border-canvas-3 bg-canvas-2/50 px-4 py-2.5 text-sm text-ink placeholder:text-ink-4 transition-all duration-150 hover:border-canvas-4 focus:border-royal focus:bg-white focus:outline-none focus:ring-3 focus:ring-royal/20"
        />

        <div className="mb-4 flex items-center gap-2 text-xs">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(Number(e.target.value) as -1 | 0 | 1 | 2 | 3)}
            className="rounded-lg border border-canvas-3 bg-white px-2.5 py-1.5 text-xs text-ink-2 focus:border-royal focus:outline-none"
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
          <SortableContext items={active.map((t) => `task:${t.id}`)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {active.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  tagNames={tagNamesByTask[task.id] ?? []}
                  selected={task.id === selectedTaskId}
                  onToggle={toggleTask}
                  onEdit={setEditingTask}
                  onSelect={selectTask}
                />
              ))}
            </div>
          </SortableContext>

          {active.length === 0 && (
            <p className="py-16 text-center text-sm text-ink-4">✨ 暂无待办任务</p>
          )}

          {completed.length > 0 && (
            <div className="mt-6">
              <button
                className="mb-3 flex items-center gap-1.5 text-xs font-medium text-ink-3 hover:text-ink transition-colors"
                onClick={() => setShowCompleted((v) => !v)}
              >
                <span className={`inline-block transition-transform ${showCompleted ? 'rotate-90' : ''}`}>▸</span>
                已完成 {completed.length}
              </button>
              <div className="space-y-2">
                {showCompleted &&
                  completed.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      tagNames={tagNamesByTask[task.id] ?? []}
                      selected={task.id === selectedTaskId}
                      onToggle={toggleTask}
                      onEdit={setEditingTask}
                      onSelect={selectTask}
                      sortable={false}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右：单任务详情面板 */}
      <TaskDetailPanel />


      <TaskFormDialog
        open={editingTask !== null}
        onClose={() => setEditingTask(null)}
        task={editingTask}
      />
    </div>
  )
}
