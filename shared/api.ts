import type {
  Countdown,
  CreateCountdownInput,
  CreateDailyRoutineInput,
  CreateExceptionInput,
  CreateTaskInput,
  DailyCompletion,
  DailyRoutine,
  DailyRoutineItem,
  JournalEntry,
  List,
  SettingsRow,
  Tag,
  Task,
  TaskException,
  TaskTag,
  TasksByRangeResult,
  UpdateCountdownInput,
  UpdateDailyRoutineInput,
  UpdateTaskInput,
} from './types'

export interface BackupStatus {
  enabled: boolean
  path: string | null
  lastError: string | null
  lastSuccessAt: string | null
  isRunning: boolean
}

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
  createList(name: string, color?: string, icon?: string): Promise<List>
  updateList(id: string, patch: { name?: string; color?: string; icon?: string }): Promise<List>
  deleteList(id: string): Promise<void>
  reorderLists(ids: string[]): Promise<void>
  setListIcon(listId: string, filePath: string): Promise<string>
  getListIconDataUrl(listId: string): Promise<string | null>
  listBuiltinIcons(): Promise<{ name: string; content: string }[]>

  getTags(): Promise<Tag[]>
  getAllTaskTags(): Promise<TaskTag[]>
  createTag(name: string, color?: string): Promise<Tag>
  deleteTag(id: string): Promise<void>
  addTagToTask(taskId: string, tagId: string): Promise<void>
  removeTagFromTask(taskId: string, tagId: string): Promise<void>

  // Settings
  getAllSettings(): Promise<SettingsRow[]>
  updateSetting(key: string, value: string): Promise<SettingsRow>

  // Backup
  selectBackupFolder(): Promise<string | null>
  getBackupStatus(): Promise<BackupStatus>
  setBackupPath(path: string): Promise<BackupStatus>
  clearBackupPath(): Promise<BackupStatus>

  // File dialogs
  openImageFileDialog(): Promise<string | null>

  // Icons
  getIconsFolder(): Promise<string>
  listIcons(): Promise<string[]>
  openIconsFolder(): Promise<void>
  setWindowIcon(iconPath: string): Promise<void>
  getIconDataUrl(fileName: string): Promise<string>

  // Background image
  setBgImage(filePath: string): Promise<string>
  getBgImagePath(): Promise<string | null>
  getBgImageDataUrl(): Promise<string | null>
  clearBgImage(): Promise<void>

  // Sounds
  getSoundsFolder(): Promise<string>
  listSounds(): Promise<string[]>
  getSoundDataUrl(fileName: string): Promise<string>

  // Brand
  setBrandImage(filePath: string): Promise<string>
  getBrandDataUrl(): Promise<string | null>
  clearBrandImage(): Promise<void>

  // Daily routines
  getDailyRoutines(): Promise<DailyRoutine[]>
  createDailyRoutine(input: CreateDailyRoutineInput): Promise<DailyRoutine>
  updateDailyRoutine(id: string, patch: UpdateDailyRoutineInput): Promise<DailyRoutine>
  deleteDailyRoutine(id: string): Promise<void>
  getDailyCompletions(date: string): Promise<DailyCompletion[]>
  getDailyCompletionsByRange(start: string, end: string): Promise<DailyCompletion[]>
  incrementDailyCompletion(routineId: string, date: string, itemId?: string | null): Promise<DailyCompletion>
  decrementDailyCompletion(routineId: string, date: string, itemId?: string | null): Promise<DailyCompletion>

  // Journal
  getJournalByDate(date: string): Promise<JournalEntry | null>
  getJournalsByDateRange(start: string, end: string): Promise<JournalEntry[]>
  saveJournal(date: string, content: string): Promise<JournalEntry>
  deleteJournal(date: string): Promise<void>
  getJournalLastYear(date: string): Promise<JournalEntry | null>
  getJournalMarkedDates(start: string, end: string): Promise<string[]>

  // Countdowns
  getCountdowns(): Promise<Countdown[]>
  createCountdown(input: CreateCountdownInput): Promise<Countdown>
  updateCountdown(id: string, patch: UpdateCountdownInput): Promise<Countdown>
  deleteCountdown(id: string): Promise<void>
  advanceCountdowns(): Promise<void>
  setCountdownBg(id: string, filePath: string): Promise<Countdown>
  getCountdownBgDataUrl(id: string): Promise<string | null>
}
