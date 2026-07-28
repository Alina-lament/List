import { create } from 'zustand'
import type { CreateTaskInput, List, Tag, Task, UpdateTaskInput } from '@shared/types'
import { api } from '@/lib/api'

export type ViewMode = 'list' | 'calendar'

interface TasksState {
  lists: List[]
  tags: Tag[]
  taskTags: Record<string, string[]>
  tasksByList: Record<string, Task[]>
  selectedListId: string | null
  selectedTaskId: string | null
  view: ViewMode
  loading: boolean
  error: string | null

  init(): Promise<void>
  setView(view: ViewMode): void
  selectList(id: string): Promise<void>
  selectTask(id: string | null): void

  createList(name: string, color?: string): Promise<void>
  renameList(id: string, name: string): Promise<void>
  deleteList(id: string): Promise<void>

  createTask(input: CreateTaskInput): Promise<Task>
  updateTask(id: string, patch: UpdateTaskInput): Promise<void>
  toggleTask(task: Task): Promise<void>
  deleteTask(id: string, listId: string): Promise<void>
  updateTaskDueDate(id: string, dueDate: string | null): Promise<void>
  reorderTasks(listId: string, taskIds: string[]): Promise<void>

  createTag(name: string, color?: string): Promise<Tag>
  deleteTag(id: string): Promise<void>

  clearError(): void
}

function sortListTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) =>
    a.is_completed !== b.is_completed
      ? a.is_completed - b.is_completed
      : a.sort_order - b.sort_order,
  )
}

export const useTasksStore = create<TasksState>()((set, get) => ({
  lists: [],
  tags: [],
  taskTags: {},
  tasksByList: {},
  selectedListId: null,
  selectedTaskId: null,
  view: 'list',
  loading: false,
  error: null,

  async init() {
    set({ loading: true, error: null })
    try {
      const [lists, tags, taskTagRows] = await Promise.all([
        api.getLists(),
        api.getTags(),
        api.getAllTaskTags(),
      ])
      const taskTags: Record<string, string[]> = {}
      for (const row of taskTagRows) {
        ;(taskTags[row.task_id] ??= []).push(row.tag_id)
      }
      let selectedListId = get().selectedListId
      if (!selectedListId || !lists.some((l) => l.id === selectedListId)) {
        selectedListId = lists[0]?.id ?? null
      }
      set({ lists, tags, taskTags, selectedListId, loading: false })
      if (selectedListId) await get().selectList(selectedListId)
    } catch (e) {
      set({ loading: false, error: `初始化失败：${String(e)}` })
    }
  },

  setView(view) {
    set({ view })
  },

  async selectList(id) {
    const tasks = await api.getTasksByList(id)
    set((s) => ({
      selectedListId: id,
      tasksByList: { ...s.tasksByList, [id]: tasks },
      // 切换清单时清除任务选中（旧选中任务不属于新清单）
      selectedTaskId:
        s.selectedTaskId && tasks.some((t) => t.id === s.selectedTaskId)
          ? s.selectedTaskId
          : null,
    }))
  },

  selectTask(id) {
    set({ selectedTaskId: id })
  },

  async createList(name, color) {
    const list = await api.createList(name, color)
    set((s) => ({ lists: [...s.lists, list], selectedListId: list.id, tasksByList: { ...s.tasksByList, [list.id]: [] } }))
  },

  async renameList(id, name) {
    const updated = await api.updateList(id, { name })
    set((s) => ({ lists: s.lists.map((l) => (l.id === id ? updated : l)) }))
  },

  async deleteList(id) {
    await api.deleteList(id)
    set((s) => {
      const lists = s.lists.filter((l) => l.id !== id)
      const tasksByList = { ...s.tasksByList }
      delete tasksByList[id]
      return {
        lists,
        tasksByList,
        selectedListId: s.selectedListId === id ? lists[0]?.id ?? null : s.selectedListId,
        selectedTaskId:
          s.selectedTaskId && tasksByList[s.selectedListId ?? '']
            ? null
            : s.selectedTaskId,
      }
    })
    const { selectedListId } = get()
    if (selectedListId && !get().tasksByList[selectedListId]) {
      await get().selectList(selectedListId)
    }
  },

  async createTask(input) {
    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()
    const optimistic: Task = {
      id: tempId,
      list_id: input.list_id,
      title: input.title,
      description: input.description ?? '',
      is_completed: 0,
      due_date: input.due_date ?? null,
      due_time: input.due_time ?? null,
      priority: input.priority ?? 0,
      sort_order: (get().tasksByList[input.list_id]?.length ?? 0),
      is_recurring: input.is_recurring ?? 0,
      rrule: input.rrule ?? null,
      rrule_end_date: input.rrule_end_date ?? null,
      reminder_minutes: input.reminder_minutes ?? null,
      last_reminded_at: null,
      parent_task_id: null,
      created_at: now,
      updated_at: now,
    }
    set((s) => ({
      tasksByList: {
        ...s.tasksByList,
        [input.list_id]: [...(s.tasksByList[input.list_id] ?? []), optimistic],
      },
    }))
    try {
      const task = await api.createTask(input)
      set((s) => ({
        tasksByList: {
          ...s.tasksByList,
          [input.list_id]: (s.tasksByList[input.list_id] ?? []).map((t) =>
            t.id === tempId ? task : t,
          ),
        },
        taskTags: input.tag_ids ? { ...s.taskTags, [task.id]: input.tag_ids } : s.taskTags,
      }))
      return task
    } catch (e) {
      set((s) => ({
        tasksByList: {
          ...s.tasksByList,
          [input.list_id]: (s.tasksByList[input.list_id] ?? []).filter((t) => t.id !== tempId),
        },
        error: `创建任务失败：${String(e)}`,
      }))
      throw e
    }
  },

  async updateTask(id, patch) {
    const task = await api.updateTask(id, patch)
    set((s) => {
      const tasksByList = { ...s.tasksByList }
      for (const key of Object.keys(tasksByList)) {
        tasksByList[key] = tasksByList[key].filter((t) => t.id !== id)
      }
      // 仅在目标清单已加载过的情况下插入，避免污染未加载清单的缓存
      if (tasksByList[task.list_id]) {
        tasksByList[task.list_id] = sortListTasks([...tasksByList[task.list_id], task])
      }
      return {
        tasksByList,
        taskTags: patch.tag_ids ? { ...s.taskTags, [id]: patch.tag_ids } : s.taskTags,
      }
    })
  },

  async toggleTask(task) {
    const completed = !task.is_completed
    set((s) => ({
      tasksByList: {
        ...s.tasksByList,
        [task.list_id]: sortListTasks(
          (s.tasksByList[task.list_id] ?? []).map((t) =>
            t.id === task.id ? { ...t, is_completed: (completed ? 1 : 0) as 0 | 1 } : t,
          ),
        ),
      },
    }))
    try {
      await api.setTaskCompleted(task.id, completed)
    } catch (e) {
      set((s) => ({
        tasksByList: {
          ...s.tasksByList,
          [task.list_id]: sortListTasks(
            (s.tasksByList[task.list_id] ?? []).map((t) =>
              t.id === task.id ? { ...t, is_completed: task.is_completed } : t,
            ),
          ),
        },
        error: `更新失败：${String(e)}`,
      }))
    }
  },

  async deleteTask(id, listId) {
    const prev = get().tasksByList[listId] ?? []
    set((s) => ({
      tasksByList: { ...s.tasksByList, [listId]: prev.filter((t) => t.id !== id) },
      selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
    }))
    try {
      await api.deleteTask(id)
    } catch (e) {
      set((s) => ({ tasksByList: { ...s.tasksByList, [listId]: prev }, error: `删除失败：${String(e)}` }))
    }
  },

  async updateTaskDueDate(id, dueDate) {
    await api.updateTaskDueDate(id, dueDate)
    set((s) => {
      const tasksByList = { ...s.tasksByList }
      for (const key of Object.keys(tasksByList)) {
        tasksByList[key] = tasksByList[key].map((t) => (t.id === id ? { ...t, due_date: dueDate } : t))
      }
      return { tasksByList }
    })
  },

  async reorderTasks(listId, taskIds) {
    const prev = get().tasksByList[listId] ?? []
    const order = new Map(taskIds.map((id, i) => [id, i]))
    set((s) => ({
      tasksByList: {
        ...s.tasksByList,
        [listId]: sortListTasks(
          prev.map((t) => (order.has(t.id) ? { ...t, sort_order: order.get(t.id)! } : t)),
        ),
      },
    }))
    try {
      await api.reorderTasks(listId, taskIds)
    } catch (e) {
      set((s) => ({ tasksByList: { ...s.tasksByList, [listId]: prev }, error: `排序失败：${String(e)}` }))
    }
  },

  async createTag(name, color) {
    const tag = await api.createTag(name, color)
    set((s) => ({ tags: [...s.tags, tag].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')) }))
    return tag
  },

  async deleteTag(id) {
    await api.deleteTag(id)
    set((s) => {
      const taskTags: Record<string, string[]> = {}
      for (const [taskId, ids] of Object.entries(s.taskTags)) {
        taskTags[taskId] = ids.filter((x) => x !== id)
      }
      return { tags: s.tags.filter((t) => t.id !== id), taskTags }
    })
  },

  clearError() {
    set({ error: null })
  },
}))
