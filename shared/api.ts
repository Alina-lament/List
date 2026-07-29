import type {
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
  UpdateDailyRoutineInput,
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

  // Settings
  getAllSettings(): Promise<SettingsRow[]>
  updateSetting(key: string, value: string): Promise<SettingsRow>

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
  incrementDailyCompletion(routineId: string, date: string, itemId?: string | null): Promise<DailyCompletion>
  decrementDailyCompletion(routineId: string, date: string, itemId?: string | null): Promise<DailyCompletion>

  // Journal
  getJournalByDate(date: string): Promise<JournalEntry | null>
  getJournalsByDateRange(start: string, end: string): Promise<JournalEntry[]>
  saveJournal(date: string, content: string): Promise<JournalEntry>
  deleteJournal(date: string): Promise<void>
  getJournalLastYear(date: string): Promise<JournalEntry | null>
  getJournalMarkedDates(start: string, end: string): Promise<string[]>
}
