import { beforeEach, describe, expect, it } from 'vitest'
import { createDatabase, type AppDatabase } from './index'
import { createListRepository, type ListRepository } from './repositories/listRepo'
import { createTagRepository, type TagRepository } from './repositories/tagRepo'
import { createTaskRepository, type TaskRepository } from './repositories/taskRepo'

let db: AppDatabase
let lists: ListRepository
let tasks: TaskRepository
let tags: TagRepository
let listId: string

beforeEach(() => {
  db = createDatabase(':memory:')
  lists = createListRepository(db)
  tasks = createTaskRepository(db)
  tags = createTagRepository(db)
  listId = lists.create('默认清单').id
})

describe('listRepo', () => {
  it('创建并按 sort_order 返回清单', () => {
    const b = lists.create('工作')
    const a = lists.create('生活')
    expect(lists.getAll().map((l) => l.name)).toEqual(['默认清单', '工作', '生活'])
    lists.reorder([a.id, listId, b.id])
    expect(lists.getAll().map((l) => l.name)).toEqual(['生活', '默认清单', '工作'])
  })

  it('更新名称和颜色', () => {
    lists.update(listId, { name: '改名', color: '#ff0000' })
    const list = lists.getAll()[0]
    expect(list.name).toBe('改名')
    expect(list.color).toBe('#ff0000')
  })

  it('删除清单级联删除任务', () => {
    const task = tasks.create({ list_id: listId, title: '任务' })
    lists.remove(listId)
    expect(tasks.getById(task.id)).toBeUndefined()
  })
})

describe('taskRepo CRUD', () => {
  it('创建任务并自动生成 sort_order', () => {
    const t1 = tasks.create({ list_id: listId, title: '任务1' })
    const t2 = tasks.create({ list_id: listId, title: '任务2' })
    expect(t1.sort_order).toBe(0)
    expect(t2.sort_order).toBe(1)
    expect(t1.is_completed).toBe(0)
    expect(t1.priority).toBe(0)
  })

  it('更新任务字段', () => {
    const task = tasks.create({ list_id: listId, title: '原标题' })
    const updated = tasks.update(task.id, {
      title: '新标题',
      priority: 3,
      due_date: '2026-08-15',
    })
    expect(updated.title).toBe('新标题')
    expect(updated.priority).toBe(3)
    expect(updated.due_date).toBe('2026-08-15')
    expect(updated.updated_at >= task.updated_at).toBe(true)
  })

  it('更新不存在任务抛错', () => {
    expect(() => tasks.update('missing-id', { title: 'x' })).toThrow()
  })

  it('reorder 持久化排序', () => {
    const t1 = tasks.create({ list_id: listId, title: 'A' })
    const t2 = tasks.create({ list_id: listId, title: 'B' })
    const t3 = tasks.create({ list_id: listId, title: 'C' })
    tasks.reorder(listId, [t3.id, t1.id, t2.id])
    expect(tasks.getByList(listId).map((t) => t.title)).toEqual(['C', 'A', 'B'])
  })

  it('setCompleted 切换完成状态', () => {
    const task = tasks.create({ list_id: listId, title: '任务' })
    tasks.setCompleted(task.id, true)
    expect(tasks.getById(task.id)!.is_completed).toBe(1)
  })
})

describe('taskRepo.getByDateRange', () => {
  it('返回范围内非重复任务，按优先级降序', () => {
    tasks.create({ list_id: listId, title: '范围内低', due_date: '2026-08-10', priority: 1 })
    tasks.create({ list_id: listId, title: '范围内高', due_date: '2026-08-10', priority: 3 })
    tasks.create({ list_id: listId, title: '范围外', due_date: '2026-09-10' })
    tasks.create({ list_id: listId, title: '无日期' })

    const result = tasks.getByDateRange('2026-08-01', '2026-08-31')
    expect(result.nonRecurring.map((t) => t.title)).toEqual(['范围内高', '范围内低'])
  })

  it('重复任务模板按结束/开始日期过滤', () => {
    tasks.create({
      list_id: listId,
      title: '有效的重复',
      due_date: '2026-07-01',
      is_recurring: 1,
      rrule: 'FREQ=DAILY',
    })
    tasks.create({
      list_id: listId,
      title: '已结束的重复',
      due_date: '2026-07-01',
      is_recurring: 1,
      rrule: 'FREQ=DAILY',
      rrule_end_date: '2026-07-31',
    })
    tasks.create({
      list_id: listId,
      title: '未开始的重复',
      due_date: '2026-09-01',
      is_recurring: 1,
      rrule: 'FREQ=DAILY',
    })
    const completed = tasks.create({
      list_id: listId,
      title: '已完成的重复模板',
      due_date: '2026-07-01',
      is_recurring: 1,
      rrule: 'FREQ=DAILY',
    })
    tasks.setCompleted(completed.id, true)

    const result = tasks.getByDateRange('2026-08-01', '2026-08-31')
    expect(result.recurring.map((t) => t.title)).toEqual(['有效的重复'])
  })

  it('返回范围内例外', () => {
    const task = tasks.create({
      list_id: listId,
      title: '重复任务',
      due_date: '2026-07-01',
      is_recurring: 1,
      rrule: 'FREQ=DAILY',
    })
    tasks.createException({ task_id: task.id, exception_date: '2026-08-05', action: 'deleted' })
    tasks.createException({ task_id: task.id, exception_date: '2026-09-05', action: 'deleted' })

    const result = tasks.getByDateRange('2026-08-01', '2026-08-31')
    expect(result.exceptions).toHaveLength(1)
    expect(result.exceptions[0].exception_date).toBe('2026-08-05')
  })

  it('createException 对同一天幂等（upsert）', () => {
    const task = tasks.create({
      list_id: listId,
      title: '重复任务',
      is_recurring: 1,
      rrule: 'FREQ=DAILY',
    })
    tasks.createException({ task_id: task.id, exception_date: '2026-08-05', action: 'deleted' })
    tasks.createException({
      task_id: task.id,
      exception_date: '2026-08-05',
      action: 'modified',
      title: '改名',
    })
    const result = tasks.getByDateRange('2026-08-01', '2026-08-31')
    expect(result.exceptions).toHaveLength(1)
    expect(result.exceptions[0].action).toBe('modified')
    expect(result.exceptions[0].title).toBe('改名')
  })
})

describe('taskRepo 提醒', () => {
  it('找到到点未提醒的任务，标记后不再返回', () => {
    tasks.create({
      list_id: listId,
      title: '到点提醒',
      due_date: '2026-08-10',
      due_time: '14:30',
      reminder_minutes: 15,
    })
    tasks.create({
      list_id: listId,
      title: '未到点',
      due_date: '2026-08-10',
      due_time: '18:00',
      reminder_minutes: 15,
    })
    const doneTask = tasks.create({
      list_id: listId,
      title: '已完成不提醒',
      due_date: '2026-08-10',
      due_time: '14:30',
      reminder_minutes: 15,
    })
    tasks.setCompleted(doneTask.id, true)

    const due = tasks.findDueReminders('2026-08-10T14:20:00', '2026-08-10')
    expect(due.map((r) => r.title)).toEqual(['到点提醒'])

    tasks.markReminded(due[0].task_id, '2026-08-10T14:20:00')
    expect(tasks.findDueReminders('2026-08-10T14:25:00', '2026-08-10')).toHaveLength(0)
  })
})

describe('tagRepo', () => {
  it('创建标签并关联到任务', () => {
    const tag = tags.create('重要', '#ff0000')
    const task = tasks.create({ list_id: listId, title: '任务', tag_ids: [tag.id] })
    expect(tags.getForTask(task.id).map((t) => t.name)).toEqual(['重要'])

    tags.removeFromTask(task.id, tag.id)
    expect(tags.getForTask(task.id)).toHaveLength(0)
  })

  it('update 替换任务标签集', () => {
    const t1 = tags.create('A')
    const t2 = tags.create('B')
    const task = tasks.create({ list_id: listId, title: '任务', tag_ids: [t1.id] })
    tasks.update(task.id, { tag_ids: [t2.id] })
    expect(tags.getForTask(task.id).map((t) => t.name)).toEqual(['B'])
  })
})
