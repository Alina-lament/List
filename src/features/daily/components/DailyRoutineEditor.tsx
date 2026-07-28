import { useEffect, useState } from 'react'
import type { DailyRoutine } from '@shared/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { useTasksStore } from '@/features/tasks/store'
import { useDailyStore } from '../store'

const DAY_OPTIONS = [
  { value: 0, label: '日' },
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
]

interface Props {
  open: boolean
  onClose: () => void
  routine: DailyRoutine | null
}

export function DailyRoutineEditor({ open, onClose, routine }: Props) {
  const { lists } = useTasksStore()
  const { createRoutine, updateRoutine, deleteRoutine } = useDailyStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetCount, setTargetCount] = useState(1)
  const [listId, setListId] = useState('')
  const [priority, setPriority] = useState<0 | 1 | 2 | 3>(0)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily')
  const [items, setItems] = useState<{ title: string; target_count: number }[]>([])

  useEffect(() => {
    if (!open) return
    setTitle(routine?.title ?? '')
    setDescription(routine?.description ?? '')
    setTargetCount(routine?.target_count ?? 1)
    setListId(routine?.list_id ?? lists[0]?.id ?? '')
    setPriority(routine?.priority ?? 0)
    if (routine) {
      const dw = JSON.parse(routine.days_of_week || '[]') as number[]
      setDaysOfWeek(dw)
      setFrequency(dw.length === 0 ? 'daily' : 'weekly')
      setItems(routine.items.map((it) => ({ title: it.title, target_count: it.target_count })))
    } else {
      setDaysOfWeek([])
      setFrequency('daily')
      setItems([])
    }
  }, [open, routine, lists])

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    )
  }

  async function handleSave() {
    if (!title.trim() || !listId) return
    const dw = frequency === 'daily' ? '[]' : JSON.stringify(daysOfWeek)
    if (routine) {
      await updateRoutine(routine.id, {
        title: title.trim(),
        description,
        target_count: items.length > 0 ? 1 : targetCount,
        list_id: listId,
        priority,
        days_of_week: dw,
        items: items.length > 0 ? items : undefined,
      })
    } else {
      await createRoutine({
        title: title.trim(),
        description,
        target_count: items.length > 0 ? 1 : targetCount,
        list_id: listId,
        priority,
        days_of_week: dw,
        items: items.length > 0 ? items : undefined,
      })
    }
    onClose()
  }

  async function handleDelete() {
    if (!routine || !window.confirm(`删除每日任务「${routine.title}」？`)) return
    await deleteRoutine(routine.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={routine ? '编辑每日任务' : '新建每日任务'}
      footer={
        <>
          {routine && (
            <Button variant="danger" onClick={handleDelete} className="mr-auto">
              删除
            </Button>
          )}
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={handleSave} disabled={!title.trim()}>
            保存
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="标题">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="每天做什么？" />
        </Field>
        <Field label="描述">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="每日次数">
            <Select value={targetCount} onChange={(e) => setTargetCount(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n} 次</option>
              ))}
            </Select>
          </Field>
          <Field label="所属清单">
            <Select value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="优先级">
            <Select value={priority} onChange={(e) => setPriority(Number(e.target.value) as 0 | 1 | 2 | 3)}>
              <option value={0}>无</option>
              <option value={1}>低</option>
              <option value={2}>中</option>
              <option value={3}>高</option>
            </Select>
          </Field>
        </div>

        <Field label="频率">
          <div className="flex gap-2">
            <Button
              variant={frequency === 'daily' ? 'primary' : undefined}
              size="sm"
              onClick={() => setFrequency('daily')}
            >
              每天
            </Button>
            <Button
              variant={frequency === 'weekly' ? 'primary' : undefined}
              size="sm"
              onClick={() => setFrequency('weekly')}
            >
              每周
            </Button>
          </div>
        </Field>

        {frequency === 'weekly' && (
          <Field label="选择星期">
            <div className="flex flex-wrap gap-1.5">
              {DAY_OPTIONS.map((d) => {
                const active = daysOfWeek.includes(d.value)
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`h-8 w-8 rounded-lg text-xs font-medium transition-all duration-150 ${
                      active
                        ? 'bg-royal text-white shadow-sm'
                        : 'bg-canvas-2 text-ink-2 hover:bg-canvas-3'
                    }`}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </Field>
        )}

        {/* 子任务 */}
        <Field label={items.length > 0 ? '子任务（每个单独计数）' : '子任务（可选，添加后次数字段失效）'}>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={item.title}
                  onChange={(e) => {
                    const next = [...items]
                    next[i] = { ...next[i], title: e.target.value }
                    setItems(next)
                  }}
                  placeholder="子任务名"
                  className="flex-1 rounded-lg border border-canvas-3 bg-canvas px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-4 focus:border-royal focus:outline-none"
                />
                <select
                  value={item.target_count}
                  onChange={(e) => {
                    const next = [...items]
                    next[i] = { ...next[i], target_count: Number(e.target.value) }
                    setItems(next)
                  }}
                  className="w-16 rounded-lg border border-canvas-3 bg-canvas px-1 py-1.5 text-sm text-ink focus:border-royal focus:outline-none"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}次</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                  className="shrink-0 text-ink-3 hover:text-prihigh transition-colors"
                >×</button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems([...items, { title: '', target_count: 1 }])}
              className="text-xs font-medium text-royal hover:text-royal-dark transition-colors"
            >
              + 添加子任务
            </button>
          </div>
        </Field>
      </div>
    </Modal>
  )
}
