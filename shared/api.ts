import type {
  CreateExceptionInput,
  CreateTaskInput,
  List,
  Tag,
  Task,
  TaskException,
  TaskTag,
  TasksByRangeResult,
  UpdateTaskInput,
} from './types'

export interface Api {
  getTasksByDateRange(start: string, end: string): Promise<TasksByRangeResult>
  getTasksByList(listId: string): Promise<Task[]>
  getTaskById(id: string): Promise<Task | null>
  createTask(input: CreateTaskInput): Promise<Task>
  updateTask(id: string, patch: UpdateTaskInput): Promise<Task>
  updateTaskDueDate(id: string, dueDate: string | null): Promise<void>
  reorderTasks(listId: string, taskIds: string[]): Promise<void>
  setTaskCompleted(id: string, completed: boolean): Promise<void>
  deleteTask(id: string): Promise<void>
  createTaskException(input: CreateExceptionInput): Promise<TaskException>

  getLists(): Promise<List[]>
  createList(name: string, color?: string): Promise<List>
  updateList(id: string, patch: { name?: string; color?: string }): Promise<List>
  deleteList(id: string): Promise<void>
  reorderLists(ids: string[]): Promise<void>

  getTags(): Promise<Tag[]>
  getAllTaskTags(): Promise<TaskTag[]>
  createTag(name: string, color?: string): Promise<Tag>
  deleteTag(id: string): Promise<void>
  addTagToTask(taskId: string, tagId: string): Promise<void>
  removeTagFromTask(taskId: string, tagId: string): Promise<void>
}
