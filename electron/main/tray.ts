import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

let tray: Tray | null = null

/** 解析适用于当前运行环境的托盘图标路径 */
export function getTrayIconPath(customIconPath?: string | null): string {
  if (customIconPath && existsSync(customIconPath)) {
    return customIconPath
  }

  const packagedPath = join(process.resourcesPath, 'build', 'tray.ico')
  const devPath = join(app.getAppPath(), 'build', 'tray.ico')

  if (app.isPackaged && existsSync(packagedPath)) return packagedPath
  if (!app.isPackaged && existsSync(devPath)) return devPath

  // 兜底：复用任务栏图标文件，避免托盘为空
  const fallback = join(app.getAppPath(), 'data', 'icons', 'app-taskbar.ico')
  if (existsSync(fallback)) return fallback

  return ''
}

/** 创建系统托盘；重复调用会返回已有实例 */
export function createTray(
  win: BrowserWindow,
  onQuit: () => void,
  customIconPath?: string | null,
): Tray {
  if (tray) return tray

  const iconPath = getTrayIconPath(customIconPath)
  const icon =
    iconPath && existsSync(iconPath)
      ? nativeImage.createFromPath(iconPath)
      : nativeImage.createEmpty()

  if (iconPath && icon.isEmpty()) {
    console.warn('[tray] 托盘图标加载失败:', iconPath)
  }

  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示 YoungLife',
      click: () => {
        if (win.isDestroyed()) return
        if (win.isMinimized()) win.restore()
        win.show()
        win.focus()
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: onQuit,
    },
  ])

  tray.setToolTip('YoungLife')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (win.isDestroyed()) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  })

  tray.on('double-click', () => {
    if (win.isDestroyed()) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  })

  return tray
}

/** 销毁托盘实例 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
