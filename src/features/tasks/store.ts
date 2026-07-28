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
  _reqId: number

  init(): Promise<void>
  setView(view: ViewMode): void
  selectList(id: string): Promise<void>
  selectAllLists(): Promise<void>
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
  /** 获取「待定」清单 ID（无日期任务的默认存放处） */
  getPendingListId(): string | null
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
  _reqId: 0,

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
      // 确保「待定」清单存在（无日期任务默认存放）
      const pendingList = lists.find((l) => l.name === '待定')
      let pendingId: string
      if (!pendingList) {
        pendingId = (await api.createList('待定', '#9ca3af')).id
        lists.push({ id: pendingId, name: '待定', color: '#9ca3af', sort_order: -1, created_at: '', updated_at: '' })
      } else {
        pendingId = pendingList.id
      }
      let selectedListId = get().selectedListId
      if (!lists.some((l) => l.id === selectedListId)) {
        selectedListId = null // 默认显示全部清单
      }
      set({ lists, tags, taskTags, selectedListId, loading: false })
      // 始终加载全部清单的数据，供「今日」视图跨清单展示
      if (lists.length > 0) {
        await get().selectAllLists()
      }
    } catch (e) {
      set({ loading: false, error: `初始化失败：${String(e)}` })
    }
  },

  setView(view) {
    set({ view })
    if (view === 'list') {
      void get().selectAllLists()
    }
  },

  async selectList(id) {
    const reqId = get()._reqId + 1
    // 同步立即更新选中高亮，异步加载任务数据
    set({ selectedListId: id, selectedTaskId: null, _reqId: reqId })
    try {
      const tasks = await api.getTasksByList(id)
      if (get()._reqId !== reqId) return
      set((s) => ({
        tasksByList: { ...s.tasksByList, [id]: tasks },
      }))
    } catch {
      // 数据加载失败，但选中高亮已更新
    }
  },

  async selectAllLists() {
    // 先同步清除选中；递增请求 ID 以忽略旧回包
    const reqId = get()._reqId + 1
    set({ selectedListId: null, selectedTaskId: null, _reqId: reqId })
    const { lists } = get()
    const results = await Promise.all(lists.map((l) => api.getTasksByList(l.id)))
    if (get()._reqId !== reqId) return // 已被更新的请求覆盖
    const tasksByList: Record<string, Task[]> = {}
    lists.forEach((l, i) => { tasksByList[l.id] = results[i] })
    set((s) => ({
      tasksByList: { ...s.tasksByList, ...tasksByList },
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

  getPendingListId() {
    return get().lists.find((l) => l.name === '待定')?.id ?? null
  },
}))
