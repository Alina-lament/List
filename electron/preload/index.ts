import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '@shared/api'
import { IpcChannels } from '@shared/ipc'
import type { Countdown, CreateCountdownInput, CreateDailyRoutineInput, CreateExceptionInput, CreatePomodoroInput, CreateTaskInput, UpdateCountdownInput, UpdateDailyRoutineInput, UpdateTaskInput } from '@shared/types'

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
  createList: (name, color, icon) => ipcRenderer.invoke(IpcChannels.listsCreate, name, color, icon),
  updateList: (id, patch) => ipcRenderer.invoke(IpcChannels.listsUpdate, id, patch),
  deleteList: (id) => ipcRenderer.invoke(IpcChannels.listsDelete, id),
  reorderLists: (ids) => ipcRenderer.invoke(IpcChannels.listsReorder, ids),
  setListIcon: (listId, filePath) => ipcRenderer.invoke(IpcChannels.listsSetIcon, listId, filePath),
  getListIconDataUrl: (listId) => ipcRenderer.invoke(IpcChannels.listsGetIconDataUrl, listId),
  listBuiltinIcons: () => ipcRenderer.invoke(IpcChannels.listsListBuiltinIcons),

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

  // Backup
  selectBackupFolder: () => ipcRenderer.invoke(IpcChannels.backupSelectFolder),
  getBackupStatus: () => ipcRenderer.invoke(IpcChannels.backupGetStatus),
  setBackupPath: (path: string) => ipcRenderer.invoke(IpcChannels.backupSetPath, path),
  clearBackupPath: () => ipcRenderer.invoke(IpcChannels.backupClearPath),

  // File dialogs
  openImageFileDialog: () => ipcRenderer.invoke(IpcChannels.dialogOpenImageFile),

  // Icons
  getIconsFolder: () => ipcRenderer.invoke(IpcChannels.iconsGetFolder),
  listIcons: () => ipcRenderer.invoke(IpcChannels.iconsList),
  openIconsFolder: () => ipcRenderer.invoke(IpcChannels.iconsOpenFolder),
  setWindowIcon: (iconPath) => ipcRenderer.invoke(IpcChannels.iconsSetApp, iconPath),
  getIconDataUrl: (fileName) => ipcRenderer.invoke(IpcChannels.iconsGetDataUrl, fileName),

  // Background image
  setBgImage: (filePath) => ipcRenderer.invoke(IpcChannels.bgSetImage, filePath),
  getBgImagePath: () => ipcRenderer.invoke(IpcChannels.bgGetImagePath),
  getBgImageDataUrl: () => ipcRenderer.invoke(IpcChannels.bgGetImageDataUrl),
  clearBgImage: () => ipcRenderer.invoke(IpcChannels.bgClearImage),

  // Sounds
  getSoundsFolder: () => ipcRenderer.invoke(IpcChannels.soundsGetFolder),
  listSounds: () => ipcRenderer.invoke(IpcChannels.soundsList),
  getSoundDataUrl: (fileName) => ipcRenderer.invoke(IpcChannels.soundsGetDataUrl, fileName),

  // Tomato style
  getTomatoImagesFolder: () => ipcRenderer.invoke(IpcChannels.tomatoesGetFolder),
  listTomatoImages: () => ipcRenderer.invoke(IpcChannels.tomatoesList),
  openTomatoImagesFolder: () => ipcRenderer.invoke(IpcChannels.tomatoesOpenFolder),
  setTomatoImage: (filePath) => ipcRenderer.invoke(IpcChannels.tomatoesSetImage, filePath),
  getTomatoImageDataUrl: (fileName) => ipcRenderer.invoke(IpcChannels.tomatoesGetDataUrl, fileName),

  // Brand
  setBrandImage: (filePath) => ipcRenderer.invoke(IpcChannels.brandSetImage, filePath),
  getBrandDataUrl: () => ipcRenderer.invoke(IpcChannels.brandGetDataUrl),
  clearBrandImage: () => ipcRenderer.invoke(IpcChannels.brandClearImage),

  // Daily routines
  getDailyRoutines: () => ipcRenderer.invoke(IpcChannels.dailyGetAll),
  createDailyRoutine: (input: CreateDailyRoutineInput) =>
    ipcRenderer.invoke(IpcChannels.dailyCreate, input),
  updateDailyRoutine: (id, patch: UpdateDailyRoutineInput) =>
    ipcRenderer.invoke(IpcChannels.dailyUpdate, id, patch),
  deleteDailyRoutine: (id) => ipcRenderer.invoke(IpcChannels.dailyDelete, id),
  getDailyCompletions: (date) => ipcRenderer.invoke(IpcChannels.dailyGetCompletions, date),
  getDailyCompletionsByRange: (start, end) => ipcRenderer.invoke(IpcChannels.dailyGetCompletionsByRange, start, end),
  incrementDailyCompletion: (routineId, date, itemId) =>
    ipcRenderer.invoke(IpcChannels.dailyIncrement, routineId, date, itemId),
  decrementDailyCompletion: (routineId, date, itemId) =>
    ipcRenderer.invoke(IpcChannels.dailyDecrement, routineId, date, itemId),

  // Journal
  getJournalByDate: (date) => ipcRenderer.invoke(IpcChannels.journalGetByDate, date),
  getJournalsByDateRange: (start, end) => ipcRenderer.invoke(IpcChannels.journalGetByDateRange, start, end),
  saveJournal: (date, content) => ipcRenderer.invoke(IpcChannels.journalSave, date, content),
  deleteJournal: (date) => ipcRenderer.invoke(IpcChannels.journalDelete, date),
  getJournalLastYear: (date) => ipcRenderer.invoke(IpcChannels.journalGetLastYear, date),
  getJournalMarkedDates: (start, end) => ipcRenderer.invoke(IpcChannels.journalGetMarkedDates, start, end),

  // Countdowns
  getCountdowns: () => ipcRenderer.invoke(IpcChannels.countdownGetAll),
  createCountdown: (input: CreateCountdownInput) => ipcRenderer.invoke(IpcChannels.countdownCreate, input),
  updateCountdown: (id, patch: UpdateCountdownInput) => ipcRenderer.invoke(IpcChannels.countdownUpdate, id, patch),
  deleteCountdown: (id) => ipcRenderer.invoke(IpcChannels.countdownDelete, id),
  advanceCountdowns: () => ipcRenderer.invoke(IpcChannels.countdownAdvance),
  setCountdownBg: (id, filePath) => ipcRenderer.invoke(IpcChannels.countdownSetBg, id, filePath),
  getCountdownBgDataUrl: (id) => ipcRenderer.invoke(IpcChannels.countdownGetBgDataUrl, id),

  // Pomodoro
  createPomodoroRecord: (input: CreatePomodoroInput) => ipcRenderer.invoke(IpcChannels.pomodoroCreateRecord, input),
  deletePomodoroRecord: (id: string) => ipcRenderer.invoke(IpcChannels.pomodoroDeleteRecord, id),
  getTodayPomodoroRecords: () => ipcRenderer.invoke(IpcChannels.pomodoroGetTodayRecords),
  getRecentPomodoroRecords: (limit?: number) => ipcRenderer.invoke(IpcChannels.pomodoroGetRecentRecords, limit),
  getTotalPomodoroStats: () => ipcRenderer.invoke(IpcChannels.pomodoroGetTotalStats),
  getPomodoroStatsByTaskIds: (taskIds) => ipcRenderer.invoke(IpcChannels.pomodoroGetStatsByTaskIds, taskIds),
  pomodoroNotify: (title, body) => ipcRenderer.invoke(IpcChannels.pomodoroNotify, title, body),
}

contextBridge.exposeInMainWorld('api', api)
