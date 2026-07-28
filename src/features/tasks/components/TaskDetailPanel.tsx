import { useEffect, useMemo, useState } from 'react'
import { useTasksStore } from '../store'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { RecurrenceRuleEditor, type RecurrenceValue } from '@/features/recurring/RecurrenceRuleEditor'
import { PriorityFlag } from './TaskItem'

const PRIORITY_OPTIONS = [
  { value: 0, label: '无优先级' },
  { value: 1, label: '低' },
  { value: 2, label: '中' },
  { value: 3, label: '高' },
]

const REMINDER_OPTIONS = [
  { value: '', label: '不提醒' },
  { value: '0', label: '准时' },
  { value: '5', label: '提前 5 分钟' },
  { value: '15', label: '提前 15 分钟' },
  { value: '30', label: '提前 30 分钟' },
  { value: '60', label: '提前 1 小时' },
  { value: '1440', label: '提前 1 天' },
]

const PRIORITY_LABEL: Record<number, string> = { 0: '无优先级', 1: '低', 2: '中', 3: '高' }

/** 单个任务详情面板：就地编辑当前选中的任务内容 */
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
    if (!selectedListId || !selectedTaskId) return null
    return (tasksByList[selectedListId] ?? []).find((t) => t.id === selectedTaskId) ?? null
  }, [tasksByList, selectedListId, selectedTaskId])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [listId, setListId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<0 | 1 | 2 | 3>(0)
  const [reminder, setReminder] = useState('')
  const [recurrence, setRecurrence] = useState<RecurrenceValue>({ rrule: null, rrule_end_date: null })
  const [tagIds, setTagIds] = useState<string[]>([])

  // 任务切换时同步本地编辑态
  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description)
    setListId(task.list_id)
    setDueDate(task.due_date ?? '')
    setDueTime(task.due_time ?? '')
    setPriority(task.priority)
    setReminder(task.reminder_minutes != null ? String(task.reminder_minutes) : '')
    setRecurrence({ rrule: task.rrule, rrule_end_date: task.rrule_end_date })
    setTagIds(taskTags[task.id] ?? [])
  }, [task?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) {
    return (
      <aside className="flex w-80 shrink-0 flex-col items-center justify-center border-l border-canvas-3 bg-canvas-2/40 px-6 text-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-ink-4">
          <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-sm font-medium text-ink-3">未选择任务</p>
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

  const listColor = lists.find((l) => l.id === listId)?.color ?? '#64748b'

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-canvas-3 bg-canvas-2/40">
      {/* 头部：所属清单色条 + 标题输入 + 完成勾选 */}
      <div className="border-b border-canvas-3 px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-medium text-ink-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: listColor }} />
            {lists.find((l) => l.id === listId)?.name ?? '清单'}
          </span>
          <button
            onClick={() => toggleTask(task)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              task.is_completed
                ? 'bg-royal/10 text-royal-dark'
                : 'bg-canvas-3/60 text-ink-2 hover:bg-canvas-3'
            }`}
          >
            {task.is_completed ? '✓ 已完成' : '标记完成'}
          </button>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== task.title && commit({ title: title.trim() })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          className={`w-full bg-transparent text-lg font-bold text-ink focus:outline-none ${
            task.is_completed ? 'text-ink-4 line-through' : ''
          }`}
        />
      </div>

      <div className="flex-1 space-y-4 px-5 py-4">
        <Field label="描述">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== task.description && commit({ description })}
            placeholder="添加备注…"
          />
        </Field>

        <Field label="所属清单">
          <Select
            value={listId}
            onChange={(e) => {
              const v = e.target.value
              setListId(v)
              void commit({ list_id: v })
            }}
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="日期">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              onBlur={() => {
                const v = dueDate || null
                if (v !== task.due_date) void commit({ due_date: v })
              }}
            />
          </Field>
          <Field label="时间">
            <Input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              onBlur={() => {
                const v = dueTime || null
                if (v !== task.due_time) void commit({ due_time: v })
              }}
            />
          </Field>
        </div>

        <Field label="优先级">
          <Select
            value={priority}
            onChange={(e) => {
              const v = Number(e.target.value) as 0 | 1 | 2 | 3
              setPriority(v)
              void commit({ priority: v })
            }}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-3">
            <PriorityFlag priority={priority} />
            当前：{PRIORITY_LABEL[priority]}
          </div>
        </Field>

        <Field label="提醒">
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
        </Field>

        <div>
          <span className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-3">重复</span>
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

        {tags.length > 0 && (
          <div>
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-3">标签</span>
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
                    className={`rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      active ? 'border-transparent text-white' : 'hover:bg-canvas-2'
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

        <div className="border-t border-canvas-3 pt-3 text-[11px] text-ink-4">
          创建于 {task.created_at.slice(0, 10)}
          {task.updated_at !== task.created_at && ` · 更新于 ${task.updated_at.slice(0, 10)}`}
        </div>
      </div>

      {/* 底部：删除 */}
      <div className="border-t border-canvas-3 px-5 py-3">
        <Button variant="danger" size="sm" onClick={handleDelete} className="w-full">
          删除任务
        </Button>
      </div>
    </aside>
  )
}