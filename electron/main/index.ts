import { app, BrowserWindow, dialog, nativeImage, shell } from 'electron'
import { join } from 'path'
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import type { CloseBehavior } from '@shared/types'
import { createTray, destroyTray } from './tray'
import { initDatabase } from './db'
import { createCountdownRepository } from './db/repositories/countdownRepo'
import { createDailyRepository } from './db/repositories/dailyRepo'
import { createJournalRepository } from './db/repositories/journalRepo'
import { createListRepository } from './db/repositories/listRepo'
import { createTagRepository } from './db/repositories/tagRepo'
import { createTaskRepository } from './db/repositories/taskRepo'
import { createSettingsRepository } from './db/repositories/settingsRepo'
import { registerIpcHandlers } from './ipc'
import { ensureDefaultSounds } from './sounds'
import { startReminderScheduler } from './reminders/scheduler'
import { createBackupService, type BackupService } from './backup'
import {
  APP_USER_MODEL_ID,
  applyStartupTaskbarIcon,
  readTaskbarState,
} from './iconSync'

function getDataRoot(): string {
  if (app.isPackaged) {
    return app.getPath('userData')
  }
  return join(app.getAppPath(), 'data')
}

/** 从旧安装目录迁移数据到 %APPDATA% */
function migrateOldData(newRoot: string): void {
  if (!app.isPackaged) return
  const exeDir = require('path').dirname(app.getPath('exe'))
  const oldRoot = join(exeDir, 'data')
  if (!existsSync(oldRoot)) return   // 没有旧数据
  if (existsSync(join(newRoot, 'db', 'younglife.db'))) return  // 新位置已有数据
  try {
    copyDirRecursive(oldRoot, newRoot)
  } catch { /* 迁移失败不阻塞启动 */ }
}

function copyDirRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

// 必须在 app.whenReady 前调用，让 Windows 用 AUMID 关联任务栏图标与快捷方式。
// 如果用户之前设置过自定义图标，读取上次保存的 AUMID，保证重启后任务栏图标一致。
// 如果图标文件已不存在，回退到默认 AUMID，避免残留无效身份。
if (process.platform === 'win32') {
  const state = readTaskbarState()
  const hasValidIcon = state.iconPath && existsSync(state.iconPath)
  const aumid = hasValidIcon ? state.aumid || APP_USER_MODEL_ID : APP_USER_MODEL_ID
  app.setAppUserModelId(aumid)
}

let mainWindow: BrowserWindow | null = null
let isQuitting = false
let backupService: BackupService | null = null

// 单实例锁：必须在 app.whenReady() 之前请求
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  console.log('[main] 已有实例在运行，退出当前进程')
  app.quit()
  process.exit(0)
} else {
  app.on('second-instance', () => {
    console.log('[main] 收到第二次启动请求，聚焦现有窗口')
    const win = mainWindow
    if (!win || win.isDestroyed()) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  })
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function createWindow(iconPath?: string | null): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    // Windows 任务栏图标必须在构造函数传入，win.setIcon() 只能改标题栏
    icon: iconPath ? nativeImage.createFromPath(iconPath) : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.on('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  const dataRoot = getDataRoot()

  // 首次启动时从旧安装目录迁移数据到 %APPDATA%
  migrateOldData(dataRoot)

  ensureDir(join(dataRoot, 'db'))
  ensureDir(join(dataRoot, 'icons'))
  ensureDir(join(dataRoot, 'icons', 'lists'))
  ensureDir(join(dataRoot, 'backgrounds'))
  ensureDir(join(dataRoot, 'brand'))
  ensureDir(join(dataRoot, 'countdowns'))
  ensureDefaultSounds(dataRoot)

  const dbPath = join(dataRoot, 'db', 'younglife.db')
  const db = initDatabase(dbPath)

  backupService = createBackupService(db, dataRoot)
  const tasks = createTaskRepository(db)
  const lists = createListRepository(db)
  const tags = createTagRepository(db)
  const settings = createSettingsRepository(db)
  const daily = createDailyRepository(db)
  const journal = createJournalRepository(db)
  const countdowns = createCountdownRepository(db)

  // 如果用户已设置备份路径，启动时初始化并执行一次全量同步
  const backupPathSetting = settings.get('backupPath')
  if (backupPathSetting?.value) {
    backupService.setPath(backupPathSetting.value).catch((err) => {
      console.error('[main] 初始化备份路径失败:', err)
    })
  }

  registerIpcHandlers({ tasks, lists, tags, settings, daily, journal, countdowns, dataRoot, backupService })
  startReminderScheduler(tasks)

  // 迁移后修正图标路径（从旧安装目录 → 新 userData 目录）
  if (app.isPackaged) {
    const oldRoot = join(require('path').dirname(app.getPath('exe')), 'data')
    const iconSetting = settings.get('appIconPath')
    if (iconSetting?.value && iconSetting.value.startsWith(oldRoot)) {
      const rel = iconSetting.value.slice(oldRoot.length).replace(/^[/\\]/, '')
      const newIconPath = join(dataRoot, rel)
      if (existsSync(newIconPath)) {
        settings.set('appIconPath', newIconPath)
      }
    }
  }

  // 读取保存的窗口图标，在窗口显示前设置
  let savedIcon: string | null = settings.get('appIconPath')?.value || null
  if (savedIcon && !existsSync(savedIcon)) {
    const fileName = require('path').basename(savedIcon)
    const found = join(dataRoot, 'icons', fileName)
    if (existsSync(found)) {
      settings.set('appIconPath', found)
      savedIcon = found
    } else {
      savedIcon = null
    }
  }
  mainWindow = createWindow(savedIcon)

  // 即使从 EXE 直接启动（没有关联快捷方式），也显式设置窗口的 RelaunchIconResource
  // 与 AppUserModelID，确保任务栏按钮使用用户自定义图标。
  if (process.platform === 'win32' && app.isPackaged && savedIcon) {
    applyStartupTaskbarIcon(mainWindow, savedIcon, dataRoot)
  }

  // 系统关机或从托盘退出时直接放行，不再询问
  app.on('before-quit', async () => {
    isQuitting = true
    destroyTray()
    // 等待进行中的数据库备份完成，避免退出时备份文件损坏
    if (backupService) {
      await backupService.waitForRunningBackup(3000).catch(() => {})
    }
  })

  // 根据用户设置处理窗口关闭行为
  mainWindow.on('close', (event) => {
    if (isQuitting || !mainWindow) return

    const rawBehavior = settings.get('closeBehavior')?.value
    const behavior: CloseBehavior =
      rawBehavior === 'quit' || rawBehavior === 'tray' ? rawBehavior : 'ask'

    if (behavior === 'quit') {
      destroyTray()
      return
    }

    if (behavior === 'tray') {
      event.preventDefault()
      mainWindow.hide()
      createTray(
        mainWindow,
        () => {
          isQuitting = true
          app.quit()
        },
        savedIcon,
      )
      return
    }

    // behavior === 'ask'：询问用户并可选记住选择
    event.preventDefault()

    dialog
      .showMessageBox(mainWindow, {
        type: 'question',
        title: '关闭 YoungLife',
        message: '您希望退出应用，还是最小化到系统托盘继续运行？',
        buttons: ['退出应用', '最小化到托盘', '取消'],
        defaultId: 1,
        cancelId: 2,
        checkboxLabel: '记住我的选择',
        noLink: true,
      })
      .then(({ response, checkboxChecked }) => {
        if (!mainWindow || response === 2) return
        const choice: CloseBehavior = response === 0 ? 'quit' : 'tray'

        if (checkboxChecked) {
          settings.set('closeBehavior', choice)
        }

        if (choice === 'quit') {
          isQuitting = true
          destroyTray()
          mainWindow.destroy()
        } else {
          mainWindow.hide()
          createTray(
            mainWindow,
            () => {
              isQuitting = true
              app.quit()
            },
            savedIcon,
          )
        }
      })
  })

  app.on('activate', () => {
    const existing = mainWindow ?? BrowserWindow.getAllWindows()[0]
    if (existing && !existing.isDestroyed()) {
      if (existing.isMinimized()) existing.restore()
      existing.show()
      existing.focus()
      return
    }

    const icon = settings.get('appIconPath')?.value || null
    const win = createWindow(icon && existsSync(icon) ? icon : null)
    mainWindow = win
    if (process.platform === 'win32' && app.isPackaged && icon && existsSync(icon)) {
      applyStartupTaskbarIcon(win, icon, dataRoot)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
