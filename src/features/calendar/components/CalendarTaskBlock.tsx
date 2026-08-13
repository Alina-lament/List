import { memo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { CalendarTaskInstance } from '@/types/calendar'
import { RecurrenceIcon } from '@/features/tasks/components/TaskItem'

function listTint(color: string, completed: boolean): string {
  return completed
    ? 'rgba(203, 213, 225, 0.40)'
    : `color-mix(in srgb, ${color} 20%, white)`
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

  const bg = listTint(instance.list_color, instance.is_completed)

  return (
    <div
      ref={setNodeRef}
      onDoubleClick={() => onEdit(instance)}
      style={{
        transform: CSS.Translate.toString(transform),
        borderLeftColor: !isRange || isRangeStart ? instance.list_color : 'transparent',
        backgroundColor: bg,
      }}
      className={`group flex min-h-[10px] items-center gap-1 border-l-[3px] px-1.5 py-0.5 text-left text-[10px] shadow-xs transition-all duration-150 hover:shadow-card ${
        isDragging ? 'opacity-30' : ''
      } ${rangeClasses}`}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-0.5 text-ink-4 opacity-0 transition-colors hover:bg-canvas-2/70 group-hover:opacity-100"
        aria-label="拖拽改期"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
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
        {instance.title}
      </button>
      {instance.due_time && (
        <span className="shrink-0 text-[10px] text-ink-3">{instance.due_time.slice(0, 5)}</span>
      )}
      {(!isRange || isRangeStart) && instance.is_recurring_instance && <RecurrenceIcon />}
    </div>
  )
})
