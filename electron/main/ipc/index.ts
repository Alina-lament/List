import { app, BrowserWindow, dialog, ipcMain, nativeImage, Notification, shell } from 'electron'
import { IpcChannels } from '@shared/ipc'
import type { Countdown, CreateCountdownInput, CreateDailyRoutineInput, CreateExceptionInput, CreatePomodoroInput, CreateTaskInput, UpdateCountdownInput, UpdateDailyRoutineInput, UpdateTaskInput } from '@shared/types'
import type { CountdownRepository } from '../db/repositories/countdownRepo'
import type { DailyRepository } from '../db/repositories/dailyRepo'
import type { JournalRepository } from '../db/repositories/journalRepo'
import type { ListRepository } from '../db/repositories/listRepo'
import type { PomodoroRepository } from '../db/repositories/pomodoroRepo'
import type { TagRepository } from '../db/repositories/tagRepo'
import type { TaskRepository } from '../db/repositories/taskRepo'
import type { SettingsRepository } from '../db/repositories/settingsRepo'
import { syncTaskbarIcon } from '../iconSync'
import { getSoundDataUrl, getSoundsFolder, listSounds } from '../sounds'
import type { BackupService } from '../backup'
import { extname, join } from 'path'
import { readdirSync, readFileSync, copyFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'

export interface Repositories {
  tasks: TaskRepository
  lists: ListRepository
  tags: TagRepository
  settings: SettingsRepository
  daily: DailyRepository
  journal: JournalRepository
  countdowns: CountdownRepository
  pomodoro: PomodoroRepository
  dataRoot: string
  backupService: BackupService
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export function registerIpcHandlers(repos: Repositories): void {
  const { tasks, lists, tags, settings, daily, journal, countdowns, pomodoro, dataRoot, backupService } = repos

  ipcMain.handle(IpcChannels.tasksGetByDateRange, (_e, start: string, end: string) =>
    tasks.getByDateRange(start, end),
  )
  ipcMain.handle(IpcChannels.tasksGetByList, (_e, listId: string) => tasks.getByList(listId))
  ipcMain.handle(IpcChannels.tasksGetById, (_e, id: string) => tasks.getById(id) ?? null)

  /** 长期任务联动：子任务全部完成时父任务自动完成，反之回退父任务完成态 */
  function syncParentCompletion(taskId: string): void {
    const task = tasks.getById(taskId)
    if (!task?.parent_task_id) return
    const parent = tasks.getById(task.parent_task_id)
    if (!parent) return
    const siblings = tasks.getByParentTaskId(parent.id)
    if (siblings.length === 0) return
    const allDone = siblings.every((s) => s.is_completed === 1)
    if (allDone && parent.is_completed === 0) tasks.setCompleted(parent.id, true)
    else if (!allDone && parent.is_completed === 1) tasks.setCompleted(parent.id, false)
  }

  /** 子任务日期超出时间段型父任务的规划区间时，自动延长父任务区间 */
  function expandParentRange(taskId: string): void {
    const task = tasks.getById(taskId)
    if (!task?.parent_task_id || !task.due_date) return
    const parent = tasks.getById(task.parent_task_id)
    if (!parent?.start_date || !parent.end_date) return
    const patch: { start_date?: string; end_date?: string } = {}
    if (task.due_date > parent.end_date) patch.end_date = task.due_date
    if (task.due_date < parent.start_date) patch.start_date = task.due_date
    if (patch.start_date || patch.end_date) tasks.update(parent.id, patch)
  }

  ipcMain.handle(IpcChannels.tasksCreate, (_e, input: CreateTaskInput) => {
    const task = tasks.create(input)
    expandParentRange(task.id)
    return task
  })
  ipcMain.handle(IpcChannels.tasksUpdate, (_e, id: string, patch: UpdateTaskInput) => {
    const task = tasks.update(id, patch)
    if (patch.due_date !== undefined) expandParentRange(id)
    if (patch.is_completed !== undefined) syncParentCompletion(id)
    return task
  })
  ipcMain.handle(IpcChannels.tasksUpdateDueDate, (_e, id: string, dueDate: string | null) => {
    tasks.updateDueDate(id, dueDate)
    if (dueDate) expandParentRange(id)
  })
  ipcMain.handle(IpcChannels.tasksReorder, (_e, listId: string, taskIds: string[]) =>
    tasks.reorder(listId, taskIds),
  )
  ipcMain.handle(IpcChannels.tasksSetCompleted, (_e, id: string, completed: boolean) => {
    tasks.setCompleted(id, completed)
    syncParentCompletion(id)
  })
  ipcMain.handle(IpcChannels.tasksDelete, (_e, id: string) => tasks.remove(id))
  ipcMain.handle(IpcChannels.tasksCreateException, (_e, input: CreateExceptionInput) =>
    tasks.createException(input),
  )

  ipcMain.handle(IpcChannels.listsGetAll, () => lists.getAll())
  ipcMain.handle(IpcChannels.listsCreate, (_e, name: string, color?: string, icon?: string) =>
    lists.create(name, color, icon),
  )
  ipcMain.handle(IpcChannels.listsUpdate, (_e, id: string, patch: { name?: string; color?: string; icon?: string }) =>
    lists.update(id, patch),
  )
  ipcMain.handle(IpcChannels.listsDelete, (_e, id: string) => lists.remove(id))
  ipcMain.handle(IpcChannels.listsReorder, (_e, ids: string[]) => lists.reorder(ids))

  // ── List icons ──
  const listIconsDir = join(dataRoot, 'icons', 'lists')
  const builtinIconsDir = app.isPackaged
    ? join(process.resourcesPath, 'build', 'list-icons')
    : join(app.getAppPath(), 'build', 'list-icons')

  function listIconFilePath(listId: string): string | null {
    const list = lists.getById(listId)
    if (!list || !list.icon) return null
    if (list.icon.startsWith('custom:')) {
      const fileName = list.icon.slice(7)
      return join(listIconsDir, fileName)
    }
    if (list.icon.startsWith('builtin:')) {
      const fileName = list.icon.slice(8)
      return join(builtinIconsDir, fileName)
    }
    return null
  }

  ipcMain.handle(IpcChannels.listsSetIcon, (_e, listId: string, filePath: string) => {
    ensureDir(listIconsDir)
    const ext = extname(filePath).toLowerCase() || '.png'
    const destName = `${listId}${ext}`
    const dest = join(listIconsDir, destName)
    // 移除该清单旧的自定义图标（避免同名残留）
    const oldFiles: string[] = []
    if (existsSync(listIconsDir)) {
      for (const f of readdirSync(listIconsDir)) {
        if (f.startsWith(`${listId}.`)) {
          unlinkSync(join(listIconsDir, f))
          oldFiles.push(`icons/lists/${f}`)
        }
      }
    }
    copyFileSync(filePath, dest)

    // 同步到备份
    Promise.resolve().then(async () => {
      for (const rel of oldFiles) await backupService.removeFile(rel).catch(() => {})
      await backupService.syncFile(`icons/lists/${destName}`).catch((err) => {
        console.error('[backup] listsSetIcon sync failed:', err)
      })
    })

    return dest
  })

  ipcMain.handle(IpcChannels.listsGetIconDataUrl, (_e, listId: string) => {
    const filePath = listIconFilePath(listId)
    if (!filePath || !existsSync(filePath)) return null
    const buf = readFileSync(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase() ?? 'png'
    const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'ico' ? 'image/x-icon' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
    return `data:${mime};base64,${buf.toString('base64')}`
  })

  ipcMain.handle(IpcChannels.listsListBuiltinIcons, () => {
    if (!existsSync(builtinIconsDir)) return []
    // 只接受 SVG 文本内容，避免目录中混入的二进制图片被内联渲染导致乱码
    const icons: { name: string; content: string }[] = []
    for (const f of readdirSync(builtinIconsDir)) {
      if (!/\.svg$/i.test(f)) continue
      try {
        const content = readFileSync(join(builtinIconsDir, f), 'utf-8')
        if (!content.trimStart().startsWith('<')) continue
        icons.push({ name: f, content })
      } catch (err) {
        console.error(`[lists] 读取内置图标失败 ${f}:`, err)
      }
    }
    return icons
  })

  /** 列出用户图标目录（data/icons/lists）中的图标，供清单图标选择 */
  ipcMain.handle(IpcChannels.listsListCustomIcons, () => {
    if (!existsSync(listIconsDir)) return []
    const imageExt = /\.(png|jpg|jpeg|webp|gif|svg|ico)$/i
    const results: { name: string; dataUrl: string }[] = []
    for (const f of readdirSync(listIconsDir)) {
      if (!imageExt.test(f)) continue
      try {
        const buf = readFileSync(join(listIconsDir, f))
        const ext = f.split('.').pop()?.toLowerCase() ?? 'png'
        const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'ico' ? 'image/x-icon' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
        results.push({ name: f, dataUrl: `data:${mime};base64,${buf.toString('base64')}` })
      } catch (err) {
        console.error(`[lists] 读取图标失败 ${f}:`, err)
      }
    }
    return results
  })

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
  ipcMain.handle(IpcChannels.settingsGet, (_e, key: string) => settings.get(key)?.value ?? null)
  ipcMain.handle(IpcChannels.settingsUpdate, (_e, key: string, value: string) =>
    settings.set(key, value),
  )

  // ── Backup ──
  ipcMain.handle(IpcChannels.backupSelectFolder, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择数据备份位置',
    })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle(IpcChannels.backupGetStatus, () => backupService.getStatus())
  ipcMain.handle(IpcChannels.backupSetPath, async (_e, path: string) => {
    await backupService.setPath(path)
    return backupService.getStatus()
  })
  ipcMain.handle(IpcChannels.backupClearPath, async () => {
    await backupService.setPath(null)
    return backupService.getStatus()
  })

  // ── Daily routines ──
  ipcMain.handle(IpcChannels.dailyGetAll, () => daily.getAll())
  ipcMain.handle(IpcChannels.dailyCreate, (_e, input: CreateDailyRoutineInput) =>
    daily.create(input),
  )
  ipcMain.handle(IpcChannels.dailyUpdate, (_e, id: string, patch: UpdateDailyRoutineInput) =>
    daily.update(id, patch),
  )
  ipcMain.handle(IpcChannels.dailyDelete, (_e, id: string) => daily.remove(id))
  ipcMain.handle(IpcChannels.dailyGetCompletions, (_e, date: string) =>
    daily.getCompletions(date),
  )
  ipcMain.handle(IpcChannels.dailyGetCompletionsByRange, (_e, start: string, end: string) =>
    daily.getCompletionsByRange(start, end),
  )
  ipcMain.handle(IpcChannels.dailyIncrement, (_e, routineId: string, date: string, itemId?: string | null) =>
    daily.increment(routineId, date, itemId),
  )
  ipcMain.handle(IpcChannels.dailyDecrement, (_e, routineId: string, date: string, itemId?: string | null) =>
    daily.decrement(routineId, date, itemId),
  )

  // ── Journal ──
  ipcMain.handle(IpcChannels.journalGetByDate, (_e, date: string) => journal.getByDate(date))
  ipcMain.handle(IpcChannels.journalGetByDateRange, (_e, start: string, end: string) =>
    journal.getByDateRange(start, end),
  )
  ipcMain.handle(IpcChannels.journalSave, (_e, date: string, content: string) => journal.save(date, content))
  ipcMain.handle(IpcChannels.journalDelete, (_e, date: string) => journal.remove(date))
  ipcMain.handle(IpcChannels.journalGetLastYear, (_e, date: string) => journal.getLastYear(date))
  ipcMain.handle(IpcChannels.journalGetMarkedDates, (_e, start: string, end: string) =>
    journal.getMarkedDates(start, end),
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
  const iconsDir = join(dataRoot, 'icons')

  ipcMain.handle(IpcChannels.iconsGetFolder, () => iconsDir)
  ipcMain.handle(IpcChannels.iconsList, () => {
    if (!existsSync(iconsDir)) return []
    return readdirSync(iconsDir).filter((f) =>
      /\.(ico|png|jpg|jpeg|svg)$/i.test(f) && f !== 'app-taskbar.ico',
    )
  })
  ipcMain.handle(IpcChannels.iconsOpenFolder, () => shell.openPath(iconsDir))
  ipcMain.handle(IpcChannels.iconsSetApp, (_e, iconPath: string) => {
    console.log('[ipc] iconsSetApp 收到图标路径:', iconPath)
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return

    // 窗口标题栏/Alt-Tab 图标使用原图即可，同步设置让前端立即得到反馈
    try {
      win.setIcon(nativeImage.createFromPath(iconPath))
    } catch (err) {
      console.error('[ipc] 设置窗口图标失败:', err)
    }

    // 任务栏图标需要额外处理：转换为 ICO、同步快捷方式、
    // 并通过 setAppDetails 设置 RelaunchIconResource。
    // 该过程包含 Explorer 刷新等待，放在后台执行，不阻塞前端保存设置。
    syncTaskbarIcon(win, iconPath, dataRoot)
      .then(() => {
        // 同步生成的任务栏图标到备份
        void backupService.syncDir('icons').catch((err) => {
          console.error('[backup] iconsSetApp sync failed:', err)
        })
      })
      .catch((err) => {
        console.error('[ipc] 同步任务栏图标失败:', err)
      })
  })

  ipcMain.handle(IpcChannels.iconsGetDataUrl, (_e, fileName: string) => {
    const filePath = join(iconsDir, fileName)
    if (!existsSync(filePath)) return ''
    const buf = readFileSync(filePath)
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'png'
    const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'ico' ? 'image/x-icon' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
    return `data:${mime};base64,${buf.toString('base64')}`
  })

  // ── Brand image ──
  const brandDir = join(dataRoot, 'brand')

  ipcMain.handle(IpcChannels.brandSetImage, (_e, filePath: string) => {
    const ext = filePath.split('.').pop() ?? 'png'
    const dest = join(brandDir, `logo.${ext}`)
    copyFileSync(filePath, dest)
    void backupService.syncDir('brand').catch((err) => {
      console.error('[backup] brandSetImage sync failed:', err)
    })
    return dest
  })
  ipcMain.handle(IpcChannels.brandGetDataUrl, () => {
    if (!existsSync(brandDir)) return null
    const files = readdirSync(brandDir).filter((f) => /^logo\./.test(f))
    if (files.length === 0) return null
    const filePath = join(brandDir, files[0])
    const buf = readFileSync(filePath)
    const ext = files[0].split('.').pop()?.toLowerCase() ?? 'png'
    const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
    return `data:${mime};base64,${buf.toString('base64')}`
  })
  ipcMain.handle(IpcChannels.brandClearImage, () => {
    if (existsSync(brandDir)) {
      const files = readdirSync(brandDir).filter((f) => /^logo\./.test(f))
      for (const f of files) {
        unlinkSync(join(brandDir, f))
        void backupService.removeFile(`brand/${f}`).catch(() => {})
      }
    }
  })

  // ── Background image ──
  const bgDir = join(dataRoot, 'backgrounds')

  ipcMain.handle(IpcChannels.bgSetImage, (_e, filePath: string) => {
    const ext = filePath.split('.').pop() ?? 'jpg'
    const dest = join(bgDir, `bg.${ext}`)
    copyFileSync(filePath, dest)
    void backupService.syncDir('backgrounds').catch((err) => {
      console.error('[backup] bgSetImage sync failed:', err)
    })
    return dest
  })
  ipcMain.handle(IpcChannels.bgGetImagePath, () => {
    if (!existsSync(bgDir)) return null
    const files = readdirSync(bgDir).filter((f) => /^bg\./.test(f))
    return files.length > 0 ? join(bgDir, files[0]) : null
  })
  ipcMain.handle(IpcChannels.bgGetImageDataUrl, () => {
    if (!existsSync(bgDir)) return null
    const files = readdirSync(bgDir).filter((f) => /^bg\./.test(f))
    if (files.length === 0) return null
    const filePath = join(bgDir, files[0])
    const buf = readFileSync(filePath)
    const ext = files[0].split('.').pop()?.toLowerCase() ?? 'jpg'
    const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
    return `data:${mime};base64,${buf.toString('base64')}`
  })
  ipcMain.handle(IpcChannels.bgClearImage, () => {
    if (existsSync(bgDir)) {
      const files = readdirSync(bgDir).filter((f) => /^bg\./.test(f))
      for (const f of files) {
        const { unlinkSync } = require('fs')
        unlinkSync(join(bgDir, f))
        void backupService.removeFile(`backgrounds/${f}`).catch(() => {})
      }
    }
  })

  // ── Sounds ──
  ipcMain.handle(IpcChannels.soundsGetFolder, () => getSoundsFolder(dataRoot))
  ipcMain.handle(IpcChannels.soundsList, () => listSounds(dataRoot))
  ipcMain.handle(IpcChannels.soundsGetDataUrl, (_e, fileName: string) => {
    const url = getSoundDataUrl(dataRoot, fileName)
    return url ?? ''
  })

  // ── Tomato style images ──
  const tomatoDir = join(dataRoot, 'tomatoes')

  ipcMain.handle(IpcChannels.tomatoesGetFolder, () => {
    ensureDir(tomatoDir)
    return tomatoDir
  })
  ipcMain.handle(IpcChannels.tomatoesList, () => {
    ensureDir(tomatoDir)
    return readdirSync(tomatoDir).filter((f) =>
      /\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(f),
    )
  })
  ipcMain.handle(IpcChannels.tomatoesOpenFolder, () => {
    ensureDir(tomatoDir)
    return shell.openPath(tomatoDir)
  })
  ipcMain.handle(IpcChannels.tomatoesSetImage, (_e, filePath: string) => {
    ensureDir(tomatoDir)
    const ext = extname(filePath).toLowerCase() || '.png'
    const base = filePath.split(/[\\/]/).pop()?.replace(/\.\w+$/, '') || 'tomato'
    const safeName = base.replace(/[^\w\u4e00-\u9fa5-]+/g, '-') || 'tomato'
    let destName = `${safeName}${ext}`
    let counter = 1
    while (existsSync(join(tomatoDir, destName))) {
      destName = `${safeName}-${counter}${ext}`
      counter += 1
    }
    copyFileSync(filePath, join(tomatoDir, destName))
    void backupService.syncDir('tomatoes').catch((err) => {
      console.error('[backup] tomatoesSetImage sync failed:', err)
    })
    return destName
  })
  ipcMain.handle(IpcChannels.tomatoesGetDataUrl, (_e, fileName: string) => {
    const filePath = join(tomatoDir, fileName)
    if (!existsSync(filePath)) return ''
    const buf = readFileSync(filePath)
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'png'
    const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'ico' ? 'image/x-icon' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
    return `data:${mime};base64,${buf.toString('base64')}`
  })

  // ── Countdowns ──
  const countdownBgDir = join(dataRoot, 'countdowns')

  ipcMain.handle(IpcChannels.countdownGetAll, () => countdowns.getAll())
  ipcMain.handle(IpcChannels.countdownCreate, (_e, input: CreateCountdownInput) =>
    countdowns.create(input),
  )
  ipcMain.handle(IpcChannels.countdownUpdate, (_e, id: string, patch: UpdateCountdownInput) =>
    countdowns.update(id, patch),
  )
  ipcMain.handle(IpcChannels.countdownDelete, (_e, id: string) => countdowns.remove(id))
  ipcMain.handle(IpcChannels.countdownAdvance, () => countdowns.advance())
  ipcMain.handle(IpcChannels.countdownSetBg, (_e, id: string, filePath: string) => {
    ensureDir(countdownBgDir)
    const ext = extname(filePath).toLowerCase() || '.jpg'
    const dest = join(countdownBgDir, `${id}${ext}`)
    // 移除旧背景图
    const oldFiles: string[] = []
    if (existsSync(countdownBgDir)) {
      for (const f of readdirSync(countdownBgDir)) {
        if (f.startsWith(`${id}.`)) {
          unlinkSync(join(countdownBgDir, f))
          oldFiles.push(`countdowns/${f}`)
        }
      }
    }
    copyFileSync(filePath, dest)

    const result = countdowns.update(id, { bg_image_path: dest }) as Countdown

    // 同步到备份
    Promise.resolve().then(async () => {
      for (const rel of oldFiles) await backupService.removeFile(rel).catch(() => {})
      await backupService.syncFile(`countdowns/${id}${ext}`).catch((err) => {
        console.error('[backup] countdownSetBg sync failed:', err)
      })
    })

    return result
  })
  ipcMain.handle(IpcChannels.countdownGetBgDataUrl, (_e, id: string) => {
    const all = countdowns.getAll()
    const c = all.find((x) => x.id === id)
    if (!c?.bg_image_path || !existsSync(c.bg_image_path)) return null
    const buf = readFileSync(c.bg_image_path)
    const ext = c.bg_image_path.split('.').pop()?.toLowerCase() ?? 'jpg'
    const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
    return `data:${mime};base64,${buf.toString('base64')}`
  })

  // ── Pomodoro ──
  ipcMain.handle(IpcChannels.pomodoroCreateRecord, (_e, input: CreatePomodoroInput) =>
    pomodoro.create(input),
  )
  ipcMain.handle(IpcChannels.pomodoroDeleteRecord, (_e, id: string) => pomodoro.remove(id))
  ipcMain.handle(IpcChannels.pomodoroGetTodayRecords, () => pomodoro.getTodayRecords())
  ipcMain.handle(IpcChannels.pomodoroGetRecentRecords, (_e, limit?: number) =>
    pomodoro.getRecentRecords(limit),
  )
  ipcMain.handle(IpcChannels.pomodoroGetTotalStats, () => pomodoro.getTotalStats())
  ipcMain.handle(IpcChannels.pomodoroGetStatsByTaskIds, (_e, taskIds: string[]) =>
    pomodoro.getStatsByTaskIds(taskIds),
  )
  ipcMain.handle(IpcChannels.pomodoroNotify, (_e, title: string, body: string) => {
    new Notification({ title, body, sound: true }).show()
  })
}
