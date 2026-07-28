import { app, dialog, ipcMain, nativeImage, shell } from 'electron'
import { IpcChannels } from '@shared/ipc'
import type { CreateExceptionInput, CreateTaskInput, UpdateTaskInput } from '@shared/types'
import type { ListRepository } from '../db/repositories/listRepo'
import type { TagRepository } from '../db/repositories/tagRepo'
import type { TaskRepository } from '../db/repositories/taskRepo'
import type { SettingsRepository } from '../db/repositories/settingsRepo'
import { join } from 'path'
import { readdirSync, readFileSync, copyFileSync, existsSync, mkdirSync } from 'fs'

export interface Repositories {
  tasks: TaskRepository
  lists: ListRepository
  tags: TagRepository
  settings: SettingsRepository
}

export function registerIpcHandlers(repos: Repositories): void {
  const { tasks, lists, tags, settings } = repos

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

  // ── Settings ──
  ipcMain.handle(IpcChannels.settingsGetAll, () => settings.getAll())
  ipcMain.handle(IpcChannels.settingsUpdate, (_e, key: string, value: string) =>
    settings.set(key, value),
  )

  // ── File dialogs ──
  ipcMain.handle(IpcChannels.dialogOpenImageFile, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // ── Icons ──
  const iconsDir = join(__dirname, '..', '..', 'icons')
  if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true })

  ipcMain.handle(IpcChannels.iconsGetFolder, () => iconsDir)
  ipcMain.handle(IpcChannels.iconsList, () => {
    if (!existsSync(iconsDir)) return []
    return readdirSync(iconsDir).filter((f) =>
      /\.(ico|png|jpg|jpeg|svg)$/i.test(f),
    )
  })
  ipcMain.handle(IpcChannels.iconsOpenFolder, () => shell.openPath(iconsDir))
  ipcMain.handle(IpcChannels.iconsSetApp, (_e, iconPath: string) => {
    const win = require('electron').BrowserWindow.getAllWindows()[0]
    if (win) {
      const img = nativeImage.createFromPath(iconPath)
      win.setIcon(img)
    }
  })

  ipcMain.handle(IpcChannels.iconsGetDataUrl, (_e, fileName: string) => {
    const filePath = join(iconsDir, fileName)
    if (!existsSync(filePath)) return ''
    const buf = readFileSync(filePath)
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'png'
    const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'ico' ? 'image/x-icon' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
    return `data:${mime};base64,${buf.toString('base64')}`
  })

  // ── Background image ──
  const bgDir = join(app.getPath('userData'), 'backgrounds')
  if (!existsSync(bgDir)) mkdirSync(bgDir, { recursive: true })

  ipcMain.handle(IpcChannels.bgSetImage, (_e, filePath: string) => {
    const ext = filePath.split('.').pop() ?? 'jpg'
    const dest = join(bgDir, `bg.${ext}`)
    copyFileSync(filePath, dest)
    return dest
  })
  ipcMain.handle(IpcChannels.bgGetImagePath, () => {
    if (!existsSync(bgDir)) return null
    const files = readdirSync(bgDir).filter((f) => /^bg\./.test(f))
    return files.length > 0 ? join(bgDir, files[0]) : null
  })
  ipcMain.handle(IpcChannels.bgClearImage, () => {
    if (existsSync(bgDir)) {
      const files = readdirSync(bgDir).filter((f) => /^bg\./.test(f))
      for (const f of files) {
        const { unlinkSync } = require('fs')
        unlinkSync(join(bgDir, f))
      }
    }
  })
}
