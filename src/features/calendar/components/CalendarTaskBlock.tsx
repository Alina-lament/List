import { memo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { CalendarTaskInstance } from '@/types/calendar'
import { RecurrenceIcon } from '@/features/tasks/components/TaskItem'

// 优先级底色（轻量透明，保证文字可读）
const PRIORITY_BG: Record<number, string> = {
  0: 'rgba(241, 245, 249, 0.80)', // 无优先级：浅灰
  1: 'rgba(34, 197, 94, 0.12)',   // 低
  2: 'rgba(245, 158, 11, 0.16)',  // 中
  3: 'rgba(244, 63, 94, 0.12)',   // 高
}

const PRIORITY_BG_COMPLETED: Record<number, string> = {
  0: 'rgba(203, 213, 225, 0.25)',
  1: 'rgba(34, 197, 94, 0.06)',
  2: 'rgba(245, 158, 11, 0.08)',
  3: 'rgba(244, 63, 94, 0.06)',
}

interface Props {
  instance: CalendarTaskInstance
  onEdit: (instance: CalendarTaskInstance) => void
}

export const CalendarTaskBlock = memo(function CalendarTaskBlock({ instance, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `cal:${instance.instance_id}`,
    data: { type: 'calendar-instance', instance },
  })

  const isRange = instance.is_range_instance
  const isRangeStart = isRange && instance.date === instance.range_start
  const isRangeEnd = isRange && instance.date === instance.range_end

  const rangeClasses = isRange
    ? `${isRangeStart ? 'rounded-r-none -mr-[7px]' : ''} ${isRangeEnd ? 'rounded-l-none -ml-[7px]' : ''} ${!isRangeStart && !isRangeEnd ? 'rounded-none -mx-[7px]' : ''}`
    : 'rounded-lg'

  const bg = instance.is_completed
    ? (PRIORITY_BG_COMPLETED[instance.priority] ?? PRIORITY_BG_COMPLETED[0])
    : (PRIORITY_BG[instance.priority] ?? PRIORITY_BG[0])

  return (
    <div
      ref={setNodeRef}
      onDoubleClick={() => onEdit(instance)}
      style={{
        transform: CSS.Translate.toString(transform),
        borderLeftColor: !isRange || isRangeStart ? instance.list_color : 'transparent',
        backgroundColor: bg,
      }}
      className={`group flex min-h-[22px] items-center gap-1.5 border-l-[3px] px-1.5 py-1 text-left text-xs shadow-xs transition-all duration-150 hover:shadow-card ${
        isDragging ? 'opacity-30' : ''
      } ${rangeClasses}`}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-0.5 text-ink-4 transition-colors hover:bg-canvas-2/70"
        aria-label="拖拽改期"
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
      <button
        onClick={() => onEdit(instance)}
        className={`min-w-0 flex-1 truncate text-left font-medium ${
          instance.is_completed ? 'text-ink-4 line-through' : 'text-ink'
        } ${!isRange || isRangeStart ? '' : 'invisible'}`}
        title={instance.title}
      >
        {instance.due_time && !isRange ? `${instance.due_time} ` : ''}
        {instance.title}
      </button>
      {isRange && instance.due_time && (
        <span className="shrink-0 text-[10px] text-ink-3">{instance.due_time.slice(0, 5)}</span>
      )}
      {(!isRange || isRangeStart) && instance.is_recurring_instance && <RecurrenceIcon />}
    </div>
  )
})
