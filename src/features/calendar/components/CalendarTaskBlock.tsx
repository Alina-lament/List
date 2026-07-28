import { memo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { CalendarTaskInstance } from '@/types/calendar'
import { RecurrenceIcon } from '@/features/tasks/components/TaskItem'

interface Props {
  instance: CalendarTaskInstance
  onToggle: (instance: CalendarTaskInstance) => void
  onEdit: (instance: CalendarTaskInstance) => void
}

export const CalendarTaskBlock = memo(function CalendarTaskBlock({ instance, onToggle, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `cal:${instance.instance_id}`,
    data: { type: 'calendar-instance', instance },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        borderLeftColor: instance.list_color,
      }}
      className={`group flex items-center gap-1.5 rounded-md border-l-[3px] bg-canvas-2/70 px-1.5 py-1 text-left text-xs transition-colors hover:bg-canvas-3/60 ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none"
        aria-label="拖拽改期"
      />
      <input
        type="checkbox"
        checked={instance.is_completed}
        onChange={() => onToggle(instance)}
        className="h-3 w-3 shrink-0 cursor-pointer rounded border-canvas-3"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={() => onEdit(instance)}
        className={`truncate font-medium ${
          instance.is_completed ? 'text-ink-4 line-through' : 'text-ink'
        }`}
        title={instance.title}
      >
        {instance.due_time ? `${instance.due_time} ` : ''}
        {instance.title}
      </button>
      {instance.is_recurring_instance && <RecurrenceIcon />}
    </div>
  )
})