import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '@shared/api'
import { IpcChannels } from '@shared/ipc'
import type { CreateExceptionInput, CreateTaskInput, UpdateTaskInput } from '@shared/types'

const api: Api = {
  getTasksByDateRange: (start, end) =>
    ipcRenderer.invoke(IpcChannels.tasksGetByDateRange, start, end),
  getTasksByList: (listId) => ipcRenderer.invoke(IpcChannels.tasksGetByList, listId),
  getTaskById: (id) => ipcRenderer.invoke(IpcChannels.tasksGetById, id),
  createTask: (input: CreateTaskInput) => ipcRenderer.invoke(IpcChannels.tasksCreate, input),
  updateTask: (id, patch: UpdateTaskInput) =>
    ipcRenderer.invoke(IpcChannels.tasksUpdate, id, patch),
  updateTaskDueDate: (id, dueDate) =>
    ipcRenderer.invoke(IpcChannels.tasksUpdateDueDate, id, dueDate),
  reorderTasks: (listId, taskIds) =>
    ipcRenderer.invoke(IpcChannels.tasksReorder, listId, taskIds),
  setTaskCompleted: (id, completed) =>
    ipcRenderer.invoke(IpcChannels.tasksSetCompleted, id, completed),
  deleteTask: (id) => ipcRenderer.invoke(IpcChannels.tasksDelete, id),
  createTaskException: (input: CreateExceptionInput) =>
    ipcRenderer.invoke(IpcChannels.tasksCreateException, input),

  getLists: () => ipcRenderer.invoke(IpcChannels.listsGetAll),
  createList: (name, color) => ipcRenderer.invoke(IpcChannels.listsCreate, name, color),
  updateList: (id, patch) => ipcRenderer.invoke(IpcChannels.listsUpdate, id, patch),
  deleteList: (id) => ipcRenderer.invoke(IpcChannels.listsDelete, id),
  reorderLists: (ids) => ipcRenderer.invoke(IpcChannels.listsReorder, ids),

  getTags: () => ipcRenderer.invoke(IpcChannels.tagsGetAll),
  getAllTaskTags: () => ipcRenderer.invoke(IpcChannels.tagsGetAllTaskTags),
  createTag: (name, color) => ipcRenderer.invoke(IpcChannels.tagsCreate, name, color),
  deleteTag: (id) => ipcRenderer.invoke(IpcChannels.tagsDelete, id),
  addTagToTask: (taskId, tagId) => ipcRenderer.invoke(IpcChannels.tagsAddToTask, taskId, tagId),
  removeTagFromTask: (taskId, tagId) =>
    ipcRenderer.invoke(IpcChannels.tagsRemoveFromTask, taskId, tagId),

  // Settings
  getAllSettings: () => ipcRenderer.invoke(IpcChannels.settingsGetAll),
  updateSetting: (key, value) => ipcRenderer.invoke(IpcChannels.settingsUpdate, key, value),

  // File dialogs
  openImageFileDialog: () => ipcRenderer.invoke(IpcChannels.dialogOpenImageFile),

  // Icons
  getIconsFolder: () => ipcRenderer.invoke(IpcChannels.iconsGetFolder),
  listIcons: () => ipcRenderer.invoke(IpcChannels.iconsList),
  openIconsFolder: () => ipcRenderer.invoke(IpcChannels.iconsOpenFolder),
  setWindowIcon: (iconPath) => ipcRenderer.invoke(IpcChannels.iconsSetApp, iconPath),

  // Background image
  setBgImage: (filePath) => ipcRenderer.invoke(IpcChannels.bgSetImage, filePath),
  getBgImagePath: () => ipcRenderer.invoke(IpcChannels.bgGetImagePath),
  clearBgImage: () => ipcRenderer.invoke(IpcChannels.bgClearImage),
}

contextBridge.exposeInMainWorld('api', api)
