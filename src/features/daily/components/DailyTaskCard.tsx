import { memo, useMemo } from 'react'
import type { DailyCompletion, DailyRoutine } from '@shared/types'

interface Props {
  routine: DailyRoutine
  completions: DailyCompletion[]  // 今天的全部完成记录
  onCheck: (routineId: string, itemId?: string | null) => void
  onUncheck: (routineId: string, itemId?: string | null) => void
  onEdit: (routine: DailyRoutine) => void
}

/** 渲染一行复选框 */
function CheckRow({
  count,
  target,
  onCheck,
  onUncheck,
}: {
  count: number; target: number
  onCheck: () => void; onUncheck: () => void
}) {
  const boxes: React.ReactNode[] = []
  for (let i = 0; i < target; i++) {
    const checked = i < count
    boxes.push(
      <button
        key={i}
        onClick={(e) => {
          e.stopPropagation()
          if (checked) { if (i === count - 1) onUncheck() }
          else onCheck()
        }}
        className={`h-6 w-6 shrink-0 rounded-[5px] border-2 transition-all duration-150 ${
          checked ? 'border-emerald-500 bg-emerald-500 cursor-pointer hover:border-emerald-600' : 'border-canvas-3 hover:border-emerald-400'
        }`}
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="mx-auto">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>,
    )
  }
  return <div className="flex shrink-0 flex-wrap gap-1.5">{boxes}</div>
}

export const DailyTaskCard = memo(function DailyTaskCard({ routine, completions, onCheck, onUncheck, onEdit }: Props) {
  const hasItems = routine.items.length > 0

  const activeToday = useMemo(() => {
    if (!routine.active) return false
    const days = JSON.parse(routine.days_of_week || '[]') as number[]
    if (days.length === 0) return true
    return days.includes(new Date().getDay())
  }, [routine.active, routine.days_of_week])

  // 周几标签
  const dayLabels = useMemo(() => {
    const days = JSON.parse(routine.days_of_week || '[]') as number[]
    if (days.length === 0) return '每天'
    const names = ['日', '一', '二', '三', '四', '五', '六']
    return '周' + days.map((d: number) => names[d]).join('')
  }, [routine.days_of_week])

  // 获取某个 item 的完成计数
  function itemCount(itemId?: string | null) {
    return completions.find((c) =>
      c.routine_id === routine.id && (itemId ? c.item_id === itemId : !c.item_id),
    )?.count ?? 0
  }

  // 整体完成状态
  const allDone = useMemo(() => {
    if (hasItems) {
      if (routine.items.length === 0) return false
      return routine.items.every((it) => itemCount(it.id) >= it.target_count)
    }
    return itemCount() >= routine.target_count
  }, [routine, completions])

  return (
    <div
      onClick={() => onEdit(routine)}
      className={`group cursor-pointer rounded-xl border px-4 py-3.5 transition-all duration-150 hover:shadow-card ${
        allDone ? 'border-emerald-200 bg-emerald-50/50'
          : !activeToday ? 'border-canvas-3 bg-canvas-2 opacity-60'
          : 'border-transparent bg-white hover:border-canvas-3'
      }`}
    >
      {/* 标题行 */}
      <div className="flex items-center justify-between gap-2">
        <h3 className={`truncate text-sm font-semibold ${allDone ? 'text-emerald-700' : 'text-ink'}`}>
          {routine.title}
        </h3>
        <span className={`shrink-0 text-[10px] ${activeToday ? 'text-ink-3' : 'text-ink-4'}`}>
          {dayLabels}
        </span>
      </div>
      {routine.description && (
        <p className="mt-0.5 text-xs text-ink-3">{routine.description}</p>
      )}

      {/* 子项列表 or 单一复选框 */}
      {hasItems ? (
        <div className="mt-2 space-y-2">
          {routine.items.map((item) => {
            const c = itemCount(item.id)
            const done = c >= item.target_count
            return (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className={`text-xs ${done ? 'text-emerald-600 line-through' : 'text-ink-2'}`}>
                    {item.title}
                  </span>
                  <span className="ml-2 text-[10px] text-ink-4">{c}/{item.target_count}</span>
                  {c > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onUncheck(routine.id, item.id) }}
                      className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ink/10 text-[9px] font-bold text-ink-3 hover:bg-ink/20"
                    >−</button>
                  )}
                </div>
                <CheckRow
                  count={c}
                  target={item.target_count}
                  onCheck={() => onCheck(routine.id, item.id)}
                  onUncheck={() => onUncheck(routine.id, item.id)}
                />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] text-ink-4">
            {itemCount()}/{routine.target_count}
            {itemCount() > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onUncheck(routine.id) }}
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-ink/10 text-[10px] font-bold text-ink-3 hover:bg-ink/20"
              >−</button>
            )}
          </span>
          <CheckRow
            count={itemCount()}
            target={routine.target_count}
            onCheck={() => onCheck(routine.id)}
            onUncheck={() => onUncheck(routine.id)}
          />
        </div>
      )}

      {allDone && (
        <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          ✓ 完成
        </span>
      )}
    </div>
  )
})
