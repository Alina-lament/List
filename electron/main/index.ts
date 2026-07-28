import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { initDatabase } from './db'
import { createDailyRepository } from './db/repositories/dailyRepo'
import { createListRepository } from './db/repositories/listRepo'
import { createTagRepository } from './db/repositories/tagRepo'
import { createTaskRepository } from './db/repositories/taskRepo'
import { createSettingsRepository } from './db/repositories/settingsRepo'
import { registerIpcHandlers } from './ipc'
import { startReminderScheduler } from './reminders/scheduler'

function getDataRoot(): string {
  if (app.isPackaged) {
    return join(require('path').dirname(app.getPath('exe')), 'data')
  }
  return join(app.getAppPath(), 'data')
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
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
}

app.whenReady().then(() => {
  const dataRoot = getDataRoot()
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

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
