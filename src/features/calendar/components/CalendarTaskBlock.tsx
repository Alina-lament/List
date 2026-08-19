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

/** 'YYYY-MM-DD' 相差天数（b - a） */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
}

/**
 * 长期任务轨道：按已完成子任务比例计算本日段内的填充宽度，
 * 使整条横条跨天呈现连续的渐进填充
 */
function trackFillRatio(instance: CalendarTaskInstance): number {
  const total = instance.child_total ?? 0
  if (!total || !instance.range_start || !instance.range_end) return 0
  const progress = (instance.child_completed ?? 0) / total
  const days = daysBetween(instance.range_start, instance.range_end) + 1
  const dayIdx = Math.max(0, Math.min(days - 1, daysBetween(instance.range_start, instance.date)))
  const before = dayIdx / days
  const after = (dayIdx + 1) / days
  const width = Math.min(Math.max(progress - before, 0), after - before) / (after - before)
  return Math.max(0, Math.min(1, width))
}

interface Props {
  instance: CalendarTaskInstance
  onEdit: (instance: CalendarTaskInstance) => void
  /** 点击子任务节点时打开对应子任务 */
  onEditNode?: (taskId: string) => void
}

export const CalendarTaskBlock = memo(function CalendarTaskBlock({ instance, onEdit, onEditNode }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `cal:${instance.instance_id}`,
    data: { type: 'calendar-instance', instance },
  })

  const isRange = instance.is_range_instance
  const isRangeStart = isRange && instance.date === instance.range_start
  const isRangeEnd = isRange && instance.date === instance.range_end
  const isTrack = isRange && (instance.child_total ?? 0) > 0

  const rangeClasses = isRange
    ? `${isRangeStart ? 'rounded-r-none -mr-[7px]' : ''} ${isRangeEnd ? 'rounded-l-none -ml-[7px]' : ''} ${!isRangeStart && !isRangeEnd ? 'rounded-none -mx-[7px]' : ''}`
    : 'rounded-lg'

  const bg = listTint(instance.list_color, instance.is_completed)
  const fillRatio = isTrack ? trackFillRatio(instance) : 0
  const nodes = instance.child_nodes ?? []

  return (
    <div
      ref={setNodeRef}
      onDoubleClick={() => onEdit(instance)}
      style={{
        transform: CSS.Translate.toString(transform),
        borderLeftColor: !isRange || isRangeStart ? instance.list_color : 'transparent',
        backgroundColor: bg,
      }}
      className={`group relative flex min-h-[10px] items-center gap-1 border-l-[3px] px-1.5 py-0.5 text-left text-[10px] shadow-xs transition-all duration-150 hover:shadow-card ${
        isDragging ? 'opacity-30' : ''
      } ${rangeClasses}`}
    >
      {/* 长期任务轨道的进度填充 */}
      {isTrack && fillRatio > 0 && (
        <span
          className="pointer-events-none absolute inset-y-0 left-0 rounded-l-[3px]"
          style={{
            width: `${fillRatio * 100}%`,
            backgroundColor: `color-mix(in srgb, ${instance.list_color} 45%, white)`,
          }}
          aria-hidden="true"
        />
      )}

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
        className={`relative min-w-0 flex-1 truncate text-left font-medium ${
          instance.is_completed ? 'text-ink-4 line-through' : 'text-ink'
        } ${!isRange || isRangeStart ? '' : 'invisible'}`}
        title={instance.title}
      >
        {instance.title}
      </button>
      {/* 长期任务进度（起点段显示） */}
      {isTrack && isRangeStart && (
        <span
          className="relative shrink-0 rounded-full bg-white/75 px-1 text-[9px] font-semibold tabular-nums"
          style={{ color: instance.list_color }}
          title={`子任务 ${instance.child_completed}/${instance.child_total}`}
        >
          {instance.child_completed}/{instance.child_total}
        </span>
      )}
      {/* 当天到期的子任务节点：实心=已完成，空心=未完成 */}
      {nodes.map((n) => (
        <button
          key={n.task_id}
          onClick={(e) => {
            e.stopPropagation()
            if (onEditNode) onEditNode(n.task_id)
          }}
          className={`relative h-2 w-2 shrink-0 rounded-full border ${n.is_completed ? '' : 'bg-white hover:scale-125'} transition-transform`}
          style={{
            borderColor: instance.list_color,
            backgroundColor: n.is_completed ? instance.list_color : undefined,
          }}
          title={`${n.is_completed ? '✓ ' : ''}${n.title}${n.due_time ? ` ${n.due_time.slice(0, 5)}` : ''}`}
          aria-label={`子任务：${n.title}`}
        />
      ))}
      {instance.due_time && !isTrack && (
        <span className="relative shrink-0 text-[10px] text-ink-3">{instance.due_time.slice(0, 5)}</span>
      )}
      {(!isRange || isRangeStart) && instance.is_recurring_instance && <RecurrenceIcon />}
    </div>
  )
})
