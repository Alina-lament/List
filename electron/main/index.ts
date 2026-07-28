import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { initDatabase } from './db'
import { createListRepository } from './db/repositories/listRepo'
import { createTagRepository } from './db/repositories/tagRepo'
import { createTaskRepository } from './db/repositories/taskRepo'
import { createSettingsRepository } from './db/repositories/settingsRepo'
import { registerIpcHandlers } from './ipc'
import { startReminderScheduler } from './reminders/scheduler'

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
  const dbPath = join(app.getPath('userData'), 'younglife.db')
  const db = initDatabase(dbPath)

  const tasks = createTaskRepository(db)
  const lists = createListRepository(db)
  const tags = createTagRepository(db)
  const settings = createSettingsRepository(db)

  // 首次运行：播种一个默认清单
  if (lists.getAll().length === 0) {
    lists.create('默认清单')
  }

  registerIpcHandlers({ tasks, lists, tags, settings })
  startReminderScheduler(tasks)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
