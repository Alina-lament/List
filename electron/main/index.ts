import { app, BrowserWindow, nativeImage, shell } from 'electron'
import { join } from 'path'
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { initDatabase } from './db'
import { createDailyRepository } from './db/repositories/dailyRepo'
import { createListRepository } from './db/repositories/listRepo'
import { createTagRepository } from './db/repositories/tagRepo'
import { createTaskRepository } from './db/repositories/taskRepo'
import { createSettingsRepository } from './db/repositories/settingsRepo'
import { registerIpcHandlers } from './ipc'
import { startReminderScheduler } from './reminders/scheduler'
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
  ensureDir(join(dataRoot, 'backgrounds'))
  ensureDir(join(dataRoot, 'brand'))

  const dbPath = join(dataRoot, 'db', 'younglife.db')
  const db = initDatabase(dbPath)

  const tasks = createTaskRepository(db)
  const lists = createListRepository(db)
  const tags = createTagRepository(db)
  const settings = createSettingsRepository(db)
  const daily = createDailyRepository(db)

  registerIpcHandlers({ tasks, lists, tags, settings, daily, dataRoot })
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
  const mainWindow = createWindow(savedIcon)

  // 即使从 EXE 直接启动（没有关联快捷方式），也显式设置窗口的 RelaunchIconResource
  // 与 AppUserModelID，确保任务栏按钮使用用户自定义图标。
  if (process.platform === 'win32' && app.isPackaged && savedIcon) {
    applyStartupTaskbarIcon(mainWindow, savedIcon, dataRoot)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const icon = settings.get('appIconPath')?.value || null
      const win = createWindow(icon && existsSync(icon) ? icon : null)
      if (process.platform === 'win32' && app.isPackaged && icon && existsSync(icon)) {
        applyStartupTaskbarIcon(win, icon, dataRoot)
      }
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
