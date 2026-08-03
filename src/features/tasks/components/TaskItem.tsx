import { memo, useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { List, Task } from '@shared/types'
import { todayKey } from '@/lib/date-utils'
import { ListIcon } from '@/features/lists/components/ListIcon'

// 优先级三色：现代鲜明色相
export const PRIORITY_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#f59e0b',
  3: '#f43f5e',
}

export function PriorityFlag({ priority }: { priority: number }) {
  const color = PRIORITY_COLORS[priority]
  if (!color) return null
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={color} className="shrink-0">
      <path d="M6 3a1 1 0 0 0-1 1v17a1 1 0 1 0 2 0v-6h10.382a1 1 0 0 0 .894-1.447L16.618 10l1.658-3.553A1 1 0 0 0 17.382 5H7V4a1 1 0 0 0-1-1z" />
    </svg>
  )
}

export function RecurrenceIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      className="shrink-0 text-ink-3"
    >
      <path d="M17 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface TaskItemProps {
  task: Task
  tagNames: string[]
  selected?: boolean
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onSelect?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, task: Task) => void
  sortable?: boolean
  variant?: 'default' | 'overdue'
  /** 全清单视图时显示清单信息 */
  list?: List
  /** 子任务样式 */
  isSubtask?: boolean
  /** 是否处于行内标题编辑模式（由父级控制，如新建子任务时） */
  inlineEditing?: boolean
  /** 行内标题提交 */
  onInlineCommit?: (id: string, title: string) => void
  /** 子任务行内编辑时按回车，创建同级的下一个子任务 */
  onInlineCreateNext?: (parentTaskId: string, currentTaskId: string) => void
  /** 是否含有子任务（用于显示折叠按钮） */
  hasSubtasks?: boolean
  /** 子任务是否展开 */
  subtasksExpanded?: boolean
  /** 切换子任务展开/折叠 */
  onToggleSubtasks?: () => void
}

export const TaskItem = memo(function TaskItem({
  task,
  tagNames,
  selected = false,
  onToggle,
  onEdit,
  onSelect,
  onContextMenu,
  sortable = true,
  variant = 'default',
  list,
  isSubtask = false,
  inlineEditing = false,
  onInlineCommit,
  onInlineCreateNext,
  hasSubtasks = false,
  subtasksExpanded = true,
  onToggleSubtasks,
}: TaskItemProps) {
  const [draftTitle, setDraftTitle] = useState(task.title)
  const [selfEditing, setSelfEditing] = useState(false)
  const editing = inlineEditing || selfEditing
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setDraftTitle(task.title)
  }, [task.title])
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const completed = Boolean(task.is_completed)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task:${task.id}`,
    disabled: !sortable || isSubtask || completed || editing,
    data: { type: 'task', task },
  })

  const today = todayKey()
  const isToday = !completed && task.due_date === today
  const isOverdue = variant === 'overdue' || (!completed && task.due_date !== null && task.due_date < today)
  const priorityColor = PRIORITY_COLORS[task.priority]

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => onSelect?.(task.id)}
      onDoubleClick={() => onEdit(task)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, task) }}
      className={`group flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-150 ${
        isSubtask ? 'ml-8' : ''
      } ${
        selected
          ? 'border-royal bg-royal-50 shadow-card'
          : isOverdue
            ? 'border-l-[3px] border-l-prihigh border-transparent bg-red-50/40 hover:border-canvas-3 hover:border-l-prihigh'
            : isSubtask
              ? 'border-transparent bg-canvas-2 hover:border-canvas-3'
              : 'border-transparent bg-white hover:border-canvas-3 hover:shadow-card'
      } ${isDragging ? 'opacity-40 shadow-lg' : ''}`}
    >
      {/* 子任务折叠/展开按钮（最左侧） */}
      {hasSubtasks && onToggleSubtasks ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleSubtasks()
          }}
          className="shrink-0 -ml-1.5 rounded p-0.5 text-ink-3 transition-colors hover:bg-canvas-2 hover:text-ink"
          aria-label={subtasksExpanded ? '折叠子任务' : '展开子任务'}
          title={subtasksExpanded ? '折叠子任务' : '展开子任务'}
        >
          <span className={`inline-block transition-transform ${subtasksExpanded ? 'rotate-90' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
        </button>
      ) : (
        <span className="w-3 shrink-0" aria-hidden="true" />
      )}

      {/* 左侧优先级颜色条 */}
      <div
        className="w-1 self-stretch rounded-full"
        style={{ backgroundColor: priorityColor || '#e2e8f0' }}
        aria-hidden="true"
      />

      {sortable && !isSubtask && (
        <span
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab touch-none rounded-lg p-1.5 text-ink-4 transition-colors hover:bg-canvas-2"
          aria-label="拖拽改期/排序"
          title="拖拽到日历改期，或自由排序时调整顺序"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </span>
      )}

      <input
        type="checkbox"
        checked={completed}
        onChange={() => onToggle(task)}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-canvas-3"
      />

      <div className="min-w-0 flex-1 flex flex-col">
        {editing ? (
          <input
            ref={inputRef}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onInlineCommit?.(task.id, draftTitle)
                if (isSubtask && task.parent_task_id && onInlineCreateNext) {
                  onInlineCreateNext(task.parent_task_id, task.id)
                }
                setSelfEditing(false)
                e.currentTarget.blur()
              }
              if (e.key === 'Escape') {
                setDraftTitle(task.title)
                onInlineCommit?.(task.id, task.title)
                setSelfEditing(false)
                e.currentTarget.blur()
              }
            }}
            onBlur={() => {
              onInlineCommit?.(task.id, draftTitle)
              setSelfEditing(false)
            }}
            placeholder={isSubtask ? '子任务标题' : '任务标题'}
            className={`w-full rounded-md border border-royal/60 bg-white px-2 py-0.5 text-left outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 ${isSubtask ? 'text-[13px]' : 'text-sm'}`}
          />
        ) : (
          <span
            onClick={(e) => {
              e.stopPropagation()
              setSelfEditing(true)
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            className={`truncate text-left ${isSubtask ? 'text-[13px]' : 'text-sm'} ${
              completed ? 'text-ink-4 line-through' : task.title ? 'text-ink' : 'italic text-ink-4'
            }`}
          >
            {task.title || '（无标题）'}
          </span>
        )}
        {list && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-ink-3">
            <ListIcon list={list} size={12} />
            <span className="truncate">{list.name}</span>
          </div>
        )}
      </div>

      {task.is_recurring === 1 && <RecurrenceIcon />}
      {tagNames.map((name) => (
        <span key={name} className="rounded-lg bg-canvas-2 px-2 py-0.5 text-[10px] font-medium text-ink-2">
          {name}
        </span>
      ))}
      {task.due_date && (
        <span
          className={`shrink-0 text-xs ${
            isOverdue ? 'font-semibold text-prihigh' : isToday ? 'font-semibold text-royal' : 'text-ink-3'
          }`}
        >
          {isToday ? '今天' : task.due_date.slice(5)}
          {task.due_time ? ` ${task.due_time}` : ''}
        </span>
      )}
    </div>
  )
})
