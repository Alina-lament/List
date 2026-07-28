import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@shared/types'
import { todayKey } from '@/lib/date-utils'

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
  sortable?: boolean
  variant?: 'default' | 'overdue'
  /** 全清单视图时显示清单信息 */
  listColor?: string
  listName?: string
}

export const TaskItem = memo(function TaskItem({
  task,
  tagNames,
  selected = false,
  onToggle,
  onEdit,
  onSelect,
  sortable = true,
  variant = 'default',
  listColor,
  listName,
}: TaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task:${task.id}`,
    disabled: !sortable,
    data: { type: 'task', task },
  })

  const completed = Boolean(task.is_completed)
  const today = todayKey()
  const isToday = !completed && task.due_date === today
  const isOverdue = variant === 'overdue' || (!completed && task.due_date !== null && task.due_date < today)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => onSelect?.(task.id)}
      onDoubleClick={() => onEdit(task)}
      onContextMenu={(e) => { e.preventDefault(); onEdit(task) }}
      className={`group flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-150 ${
        selected
          ? 'border-royal bg-royal-50 shadow-card'
          : isOverdue
            ? 'border-l-[3px] border-l-prihigh border-transparent bg-red-50/40 hover:border-canvas-3 hover:border-l-prihigh'
            : 'border-transparent bg-white hover:border-canvas-3 hover:shadow-card'
      } ${isDragging ? 'opacity-40 shadow-lg' : ''}`}
    >
      {sortable && (
        <span
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab touch-none text-ink-4 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="拖拽排序"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
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
      {listColor && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: listColor }}
          title={listName}
        />
      )}
      <span
        className={`flex-1 truncate text-left text-sm ${
          completed ? 'text-ink-4 line-through' : 'text-ink'
        }`}
      >
        {task.title}
      </span>
      {task.is_recurring === 1 && <RecurrenceIcon />}
      <PriorityFlag priority={task.priority} />
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