import { app, BrowserWindow, nativeImage, shell } from 'electron'
import { join, basename, extname } from 'path'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'

export const APP_USER_MODEL_ID = 'com.younglife.app'

/** 生成 ICO 所需的常见 Windows 尺寸 */
const WINDOWS_ICON_SIZES = [16, 24, 32, 48, 64, 128, 256]

/** 任务栏刷新按钮时的等待时间（ms） */
const TASKBAR_REFRESH_DELAY_MS = 250

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

/**
 * 将一组 PNG 缓冲区编码为 Windows ICO 文件。
 * Windows 任务栏/快捷方式使用 ICO 格式最稳定，单尺寸 ICO 在高 DPI 下会模糊。
 */
function encodeWindowsIcon(entries: { size: number; png: Buffer }[]): Buffer {
  const headerSize = 6
  const entrySize = 16
  const directory = Buffer.alloc(headerSize + entrySize * entries.length)

  directory.writeUInt16LE(0, 0) // Reserved
  directory.writeUInt16LE(1, 2) // Type: icon
  directory.writeUInt16LE(entries.length, 4) // Count

  let imageOffset = directory.length
  const images: Buffer[] = []

  for (const [index, entry] of entries.entries()) {
    const offset = headerSize + index * entrySize
    const sizeByte = entry.size === 256 ? 0 : entry.size

    directory.writeUInt8(sizeByte, offset) // Width
    directory.writeUInt8(sizeByte, offset + 1) // Height
    directory.writeUInt8(0, offset + 2) // Colors
    directory.writeUInt8(0, offset + 3) // Reserved
    directory.writeUInt16LE(1, offset + 4) // Color planes
    directory.writeUInt16LE(32, offset + 6) // Bits per pixel
    directory.writeUInt32LE(entry.png.length, offset + 8)
    directory.writeUInt32LE(imageOffset, offset + 12)

    imageOffset += entry.png.length
    images.push(entry.png)
  }

  return Buffer.concat([directory, ...images])
}

/**
 * 把任意图片转成多尺寸 Windows ICO，保存到 data/icons 下。
 * 返回 ICO 的绝对路径。Windows 任务栏/快捷方式直接指向 ICO 最可靠。
 *
 * 每个源图标生成一个独立的 ICO 文件名，避免 Windows 按文件路径缓存旧图标内容。
 */
export function ensureWindowsIco(sourcePath: string, dataRoot: string): string {
  ensureDir(join(dataRoot, 'icons'))

  const hash = createHash('sha256').update(basename(sourcePath)).digest('hex').slice(0, 8)
  const baseNameWithoutExt = basename(sourcePath, extname(sourcePath))
  const destFileName = `taskbar-${baseNameWithoutExt}-${hash}.ico`
  const destPath = join(dataRoot, 'icons', destFileName)

  // 如果已经存在，直接复用，避免重复生成
  if (existsSync(destPath)) {
    console.log('[iconSync] 复用已存在的 ICO:', destPath)
    return destPath
  }

  const sourceExt = extname(sourcePath).toLowerCase()
  if (sourceExt === '.ico' && existsSync(sourcePath)) {
    writeFileSync(destPath, readFileSync(sourcePath))
    return destPath
  }

  console.log('[iconSync] 从源图标生成 ICO:', sourcePath, '->', destPath)
  const image = nativeImage.createFromPath(sourcePath)
  if (image.isEmpty()) {
    throw new Error(`[iconSync] 无法从 ${sourcePath} 创建 nativeImage，请检查文件格式是否受支持。`)
  }
  const entries = WINDOWS_ICON_SIZES.map((size) => ({
    size,
    png: image.resize({ width: size, height: size, quality: 'best' }).toPNG(),
  }))
  writeFileSync(destPath, encodeWindowsIcon(entries))
  return destPath
}

interface TaskbarState {
  iconPath?: string
  aumid?: string
}

function getTaskbarStatePath(): string {
  return join(app.getPath('userData'), 'taskbar-state.json')
}

/**
 * 读取保存的任务栏状态（当前图标路径与对应的 AUMID）。
 * 该文件在 app.whenReady 之前就需要能被读取，用于设置进程级 AUMID。
 */
export function readTaskbarState(): TaskbarState {
  try {
    const path = getTaskbarStatePath()
    if (!existsSync(path)) return {}
    const raw = readFileSync(path, 'utf8')
    return JSON.parse(raw) as TaskbarState
  } catch {
    return {}
  }
}

/**
 * 写入任务栏状态。
 */
export function writeTaskbarState(state: TaskbarState): void {
  try {
    writeFileSync(getTaskbarStatePath(), JSON.stringify(state, null, 2))
  } catch (err) {
    console.error('[iconSync] 写入 taskbar-state.json 失败:', err)
  }
}

/**
 * 根据图标文件名生成稳定的 AUMID。
 *
 * Windows 会用 AUMID 作为任务栏分组/图标的身份标识。同一个 AUMID 的运行中按钮
 * 会顽固地缓存 EXE 图标，因此换图标时必须改用新的 AUMID，才能让任务栏显示新图标。
 */
export function deriveAumidFromIcon(iconPath: string): string {
  const hash = createHash('sha256').update(basename(iconPath)).digest('hex').slice(0, 12)
  return `${APP_USER_MODEL_ID}.brand.${hash}`
}

/**
 * 获取开始菜单快捷方式目录。
 */
function getStartMenuProgramsDir(): string {
  return join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'YoungLife')
}

/**
 * 获取任务栏固定快捷方式目录。
 */
function getTaskbarPinnedDir(): string {
  return join(app.getPath('appData'), 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'TaskBar')
}

/**
 * 写单个快捷方式的图标与 AUMID。
 */
function writeShortcut(
  shortcutPath: string,
  target: string,
  iconPath: string | null,
  aumid: string,
): void {
  const details: Electron.ShortcutDetails = {
    target,
    appUserModelId: aumid,
  }
  if (iconPath && existsSync(iconPath)) {
    details.icon = iconPath
    details.iconIndex = 0
  }

  if (existsSync(shortcutPath)) {
    shell.writeShortcutLink(shortcutPath, 'update', details)
  } else {
    shell.writeShortcutLink(shortcutPath, 'create', details)
  }
}

/**
 * 更新开始菜单快捷方式的图标与 AUMID。
 */
export function syncStartMenuShortcut(iconPath: string | null, aumid: string): void {
  if (process.platform !== 'win32' || !app.isPackaged) return
  try {
    const programsDir = getStartMenuProgramsDir()
    ensureDir(programsDir)
    const shortcutPath = join(programsDir, 'YoungLife.lnk')
    writeShortcut(shortcutPath, process.execPath, iconPath, aumid)
  } catch (err) {
    console.error('[iconSync] 更新开始菜单快捷方式失败:', err)
  }
}

/**
 * 更新任务栏已固定快捷方式的图标与 AUMID。
 *
 * 如果用户把应用固定到了任务栏，Windows 会优先使用固定快捷方式的图标，
 * 只改开始菜单快捷方式无法覆盖它。
 */
export function syncPinnedTaskbarShortcut(iconPath: string | null, aumid: string): void {
  if (process.platform !== 'win32' || !app.isPackaged) return
  try {
    const pinnedDir = getTaskbarPinnedDir()
    if (!existsSync(pinnedDir)) return

    const files = readdirSync(pinnedDir).filter((f) => f.toLowerCase().endsWith('.lnk'))
    for (const file of files) {
      try {
        const shortcutPath = join(pinnedDir, file)
        const details = shell.readShortcutLink(shortcutPath)
        // 匹配属于本应用的快捷方式（AUMID 以本应用为前缀，或目标路径匹配）
        const belongsToApp =
          (details.appUserModelId && details.appUserModelId.startsWith(APP_USER_MODEL_ID)) ||
          details.target?.toLowerCase() === process.execPath.toLowerCase()
        if (belongsToApp) {
          writeShortcut(shortcutPath, process.execPath, iconPath, aumid)
        }
      } catch {
        // 单个快捷方式读取失败时继续处理下一个
      }
    }
  } catch (err) {
    console.error('[iconSync] 更新任务栏固定快捷方式失败:', err)
  }
}

/**
 * 刷新运行中窗口在任务栏的图标。
 *
 * 通过 win.setAppDetails 设置窗口的 RelaunchIconResource 与 AppUserModelID。
 * 由于同一个 AUMID 会缓存 EXE 图标，这里使用与图标绑定的 AUMID，迫使 Windows
 * 把运行中窗口当作新的任务栏分组来渲染，从而显示新图标。
 */
export async function refreshWindowTaskbarIcon(
  win: BrowserWindow,
  icoPath: string,
  aumid: string,
): Promise<void> {
  if (process.platform !== 'win32' || !app.isPackaged) return
  if (win.isDestroyed()) return

  const refreshVisibleButton = win.isVisible() && typeof win.setSkipTaskbar === 'function'

  if (refreshVisibleButton) win.setSkipTaskbar(true)
  try {
    if (refreshVisibleButton) {
      await new Promise((resolve) => setTimeout(resolve, TASKBAR_REFRESH_DELAY_MS))
    }

    if (win.isDestroyed()) return

    // 先写入 RelaunchIconResource 等属性，最后写入 appId，
    // 让 Windows 把最终的 ID 写作为刷新事件触发点。
    win.setAppDetails({
      appIconPath: icoPath,
      appIconIndex: 0,
      relaunchCommand: process.execPath,
      relaunchDisplayName: app.getName(),
    })
    win.setAppDetails({ appId: aumid })

    if (refreshVisibleButton) {
      await new Promise((resolve) => setTimeout(resolve, TASKBAR_REFRESH_DELAY_MS))
    }
  } finally {
    if (refreshVisibleButton && !win.isDestroyed()) win.setSkipTaskbar(false)
  }
}

/**
 * 同步所有与 Windows 任务栏图标相关的状态。
 *
 * @param win 当前主窗口
 * @param sourcePath 用户选中的原始图标路径
 * @param dataRoot 应用数据根目录
 * @returns 生成的 ICO 路径与使用的 AUMID
 */
export async function syncTaskbarIcon(
  win: BrowserWindow,
  sourcePath: string,
  dataRoot: string,
): Promise<{ icoPath: string; aumid: string }> {
  const icoPath = ensureWindowsIco(sourcePath, dataRoot)
  const aumid = deriveAumidFromIcon(sourcePath)

  // 持久化当前图标对应的 AUMID，下次启动时进程级 AUMID 能保持一致
  writeTaskbarState({ iconPath: sourcePath, aumid })

  // 1. 同步开始菜单快捷方式
  syncStartMenuShortcut(icoPath, aumid)

  // 2. 同步任务栏固定快捷方式
  syncPinnedTaskbarShortcut(icoPath, aumid)

  // 3. 刷新运行中窗口的任务栏按钮（使用新 AUMID 强制新建任务栏分组）
  await refreshWindowTaskbarIcon(win, icoPath, aumid)

  console.log('[iconSync] 生成任务栏 ICO:', icoPath)
  console.log('[iconSync] 使用 AUMID:', aumid)

  return { icoPath, aumid }
}

/**
 * 在窗口创建时应用任务栏图标。
 *
 * 供启动和重新激活时使用：生成 ICO、持久化 AUMID、同步快捷方式，
 * 并在窗口 ready-to-show 时刷新任务栏按钮。
 */
export function applyStartupTaskbarIcon(
  win: BrowserWindow,
  iconPath: string,
  dataRoot: string,
): void {
  if (process.platform !== 'win32' || !app.isPackaged) return

  const icoPath = ensureWindowsIco(iconPath, dataRoot)
  const aumid = deriveAumidFromIcon(iconPath)

  console.log('[iconSync] 启动时生成任务栏 ICO:', icoPath)
  console.log('[iconSync] 启动时使用 AUMID:', aumid)

  writeTaskbarState({ iconPath, aumid })
  syncStartMenuShortcut(icoPath, aumid)
  syncPinnedTaskbarShortcut(icoPath, aumid)

  win.once('ready-to-show', () => {
    refreshWindowTaskbarIcon(win, icoPath, aumid).catch((err) =>
      console.error('[iconSync] 启动时刷新任务栏图标失败:', err),
    )
  })
}
