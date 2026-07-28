import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipc'
import type { CreateExceptionInput, CreateTaskInput, UpdateTaskInput } from '@shared/types'
import type { ListRepository } from '../db/repositories/listRepo'
import type { TagRepository } from '../db/repositories/tagRepo'
import type { TaskRepository } from '../db/repositories/taskRepo'

export interface Repositories {
  tasks: TaskRepository
  lists: ListRepository
  tags: TagRepository
}

export function registerIpcHandlers(repos: Repositories): void {
  const { tasks, lists, tags } = repos

  ipcMain.handle(IpcChannels.tasksGetByDateRange, (_e, start: string, end: string) =>
    tasks.getByDateRange(start, end),
  )
  ipcMain.handle(IpcChannels.tasksGetByList, (_e, listId: string) => tasks.getByList(listId))
  ipcMain.handle(IpcChannels.tasksGetById, (_e, id: string) => tasks.getById(id) ?? null)
  ipcMain.handle(IpcChannels.tasksCreate, (_e, input: CreateTaskInput) => tasks.create(input))
  ipcMain.handle(IpcChannels.tasksUpdate, (_e, id: string, patch: UpdateTaskInput) =>
    tasks.update(id, patch),
  )
  ipcMain.handle(IpcChannels.tasksUpdateDueDate, (_e, id: string, dueDate: string | null) =>
    tasks.updateDueDate(id, dueDate),
  )
  ipcMain.handle(IpcChannels.tasksReorder, (_e, listId: string, taskIds: string[]) =>
    tasks.reorder(listId, taskIds),
  )
  ipcMain.handle(IpcChannels.tasksSetCompleted, (_e, id: string, completed: boolean) =>
    tasks.setCompleted(id, completed),
  )
  ipcMain.handle(IpcChannels.tasksDelete, (_e, id: string) => tasks.remove(id))
  ipcMain.handle(IpcChannels.tasksCreateException, (_e, input: CreateExceptionInput) =>
    tasks.createException(input),
  )

  ipcMain.handle(IpcChannels.listsGetAll, () => lists.getAll())
  ipcMain.handle(IpcChannels.listsCreate, (_e, name: string, color?: string) =>
    lists.create(name, color),
  )
  ipcMain.handle(IpcChannels.listsUpdate, (_e, id: string, patch: { name?: string; color?: string }) =>
    lists.update(id, patch),
  )
  ipcMain.handle(IpcChannels.listsDelete, (_e, id: string) => lists.remove(id))
  ipcMain.handle(IpcChannels.listsReorder, (_e, ids: string[]) => lists.reorder(ids))

  ipcMain.handle(IpcChannels.tagsGetAll, () => tags.getAll())
  ipcMain.handle(IpcChannels.tagsGetAllTaskTags, () => tags.getAllTaskTags())
  ipcMain.handle(IpcChannels.tagsCreate, (_e, name: string, color?: string) =>
    tags.create(name, color),
  )
  ipcMain.handle(IpcChannels.tagsDelete, (_e, id: string) => tags.remove(id))
  ipcMain.handle(IpcChannels.tagsAddToTask, (_e, taskId: string, tagId: string) =>
    tags.addToTask(taskId, tagId),
  )
  ipcMain.handle(IpcChannels.tagsRemoveFromTask, (_e, taskId: string, tagId: string) =>
    tags.removeFromTask(taskId, tagId),
  )
}
