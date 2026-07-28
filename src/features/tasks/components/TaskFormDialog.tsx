import { useEffect, useState } from 'react'
import type { Task } from '@shared/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { RecurrenceRuleEditor, type RecurrenceValue } from '@/features/recurring/RecurrenceRuleEditor'
import { useTasksStore } from '../store'

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

export interface TaskFormDialogProps {
  open: boolean
  onClose: () => void
  /** 编辑已有任务时传入；新建时为 null */
  task: Task | null
  /** 新建时的初始清单与日期 */
  defaultListId?: string | null
  defaultDueDate?: string | null
}

export function TaskFormDialog({ open, onClose, task, defaultListId, defaultDueDate }: TaskFormDialogProps) {
  const { lists, tags, createTask, updateTask, deleteTask, selectedListId } = useTasksStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [listId, setListId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<0 | 1 | 2 | 3>(0)
  const [reminder, setReminder] = useState('')
  const [recurrence, setRecurrence] = useState<RecurrenceValue>({ rrule: null, rrule_end_date: null })
  const [tagIds, setTagIds] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setListId(task?.list_id ?? defaultListId ?? selectedListId ?? lists[0]?.id ?? '')
    setDueDate(task?.due_date ?? defaultDueDate ?? '')
    setDueTime(task?.due_time ?? '')
    setPriority(task?.priority ?? 0)
    setReminder(task?.reminder_minutes != null ? String(task.reminder_minutes) : '')
    setRecurrence({ rrule: task?.rrule ?? null, rrule_end_date: task?.rrule_end_date ?? null })
    setTagIds(task ? (useTasksStore.getState().taskTags[task.id] ?? []) : [])
  }, [open, task, defaultListId, defaultDueDate, selectedListId, lists])

  async function handleSave() {
    if (!title.trim() || !listId) return
    const common = {
      title: title.trim(),
      description,
      due_date: dueDate || null,
      due_time: dueTime || null,
      priority,
      reminder_minutes: reminder === '' ? null : Number(reminder),
      is_recurring: (recurrence.rrule ? 1 : 0) as 0 | 1,
      rrule: recurrence.rrule,
      rrule_end_date: recurrence.rrule_end_date,
      tag_ids: tagIds,
    }
    if (task) {
      await updateTask(task.id, { list_id: listId, ...common })
    } else {
      await createTask({ list_id: listId, ...common })
    }
    onClose()
  }

  async function handleDelete() {
    if (!task) return
    await deleteTask(task.id, task.list_id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? '编辑任务' : '新建任务'}
      footer={
        <>
          {task && (
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
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="要做什么？"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </Field>
        <Field label="描述">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="清单">
            <Select value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="优先级">
            <Select value={priority} onChange={(e) => setPriority(Number(e.target.value) as 0 | 1 | 2 | 3)}>
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="日期">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="时间">
            <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </Field>
          <Field label="提醒">
            <Select value={reminder} onChange={(e) => setReminder(e.target.value)}>
              {REMINDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <RecurrenceRuleEditor
          key={task?.id ?? 'new'}
          value={recurrence}
          onChange={setRecurrence}
          startDate={dueDate || null}
        />

        {tags.length > 0 && (
          <Field label="标签">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const active = tagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      active ? 'border-transparent text-white' : 'hover:bg-canvas-2'
                    }`}
                    style={
                      active
                        ? { backgroundColor: tag.color }
                        : { borderColor: tag.color, color: tag.color }
                    }
                    onClick={() =>
                      setTagIds((ids) =>
                        active ? ids.filter((x) => x !== tag.id) : [...ids, tag.id],
                      )
                    }
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </Field>
        )}
      </div>
    </Modal>
  )
}
