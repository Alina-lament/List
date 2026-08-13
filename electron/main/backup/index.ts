import { access, constants, copyFile, mkdir, readdir, rm, stat, unlink } from 'fs/promises'
import { dirname, join, normalize, sep } from 'path'
import type { AppDatabase } from '../db'

export interface BackupStatus {
  enabled: boolean
  path: string | null
  lastError: string | null
  lastSuccessAt: string | null
  isRunning: boolean
}

export interface BackupService {
  setPath(path: string | null): Promise<void>
  getPath(): string | null
  getStatus(): BackupStatus
  syncFile(relativePath: string): Promise<void>
  syncDir(relativeDir: string): Promise<void>
  removeFile(relativePath: string): Promise<void>
  runFullSync(): Promise<void>
  waitForRunningBackup(timeoutMs?: number): Promise<void>
}

const BACKUP_DIRS = ['db', 'icons', 'backgrounds', 'brand', 'countdowns', 'sounds', 'tomatoes']
const DEBOUNCE_MS = 800
const POLL_INTERVAL_MS = 1000

interface DbFileStat {
  mtimeMs: number
  size: number
}

class BackupServiceImpl implements BackupService {
  private backupPath: string | null = null
  private dataRoot: string
  private db: AppDatabase
  private dbPath: string
  private lastError: string | null = null
  private lastSuccessAt: string | null = null
  private isRunning = false
  private databaseDirty = false
  private backupTimer: ReturnType<typeof setTimeout> | null = null
  private runningBackup: Promise<void> | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private lastDbStats: Map<string, DbFileStat> = new Map()

  constructor(db: AppDatabase, dataRoot: string) {
    this.db = db
    this.dataRoot = dataRoot
    this.dbPath = join(dataRoot, 'db', 'younglife.db')
  }

  private async checkDatabaseChanged(): Promise<void> {
    if (!this.backupPath) return

    const files = [
      this.dbPath,
      `${this.dbPath}-wal`,
      `${this.dbPath}-shm`,
    ]

    let changed = false
    for (const file of files) {
      let current: DbFileStat | null = null
      try {
        const s = await stat(file)
        current = { mtimeMs: s.mtimeMs, size: s.size }
      } catch {
        // 文件不存在（例如 WAL 已合并）
      }

      const previous = this.lastDbStats.get(file)
      if (!previous && current) {
        changed = true
      } else if (previous && current && (previous.mtimeMs !== current.mtimeMs || previous.size !== current.size)) {
        changed = true
      } else if (previous && !current) {
        changed = true
      }

      if (current) {
        this.lastDbStats.set(file, current)
      } else {
        this.lastDbStats.delete(file)
      }
    }

    if (changed) {
      this.onDatabaseChanged()
    }
  }

  private onDatabaseChanged(): void {
    if (!this.backupPath) return
    this.databaseDirty = true
    if (this.backupTimer) clearTimeout(this.backupTimer)
    this.backupTimer = setTimeout(() => {
      void this.flushDatabaseBackup()
    }, DEBOUNCE_MS)
  }

  private async flushDatabaseBackup(): Promise<void> {
    if (!this.databaseDirty || !this.backupPath) return
    this.databaseDirty = false

    if (this.runningBackup) {
      await this.runningBackup.catch(() => {
        // 忽略上一次备份的错误，下面会重新尝试
      })
    }

    this.runningBackup = this.performDatabaseBackup()
    await this.runningBackup.catch((err) => {
      this.recordError(err)
    })
    this.runningBackup = null

    // 备份期间又有新变更，立即再跑一次
    if (this.databaseDirty) {
      await this.flushDatabaseBackup()
    }
  }

  private async performDatabaseBackup(): Promise<void> {
    if (!this.backupPath) return
    const destDir = join(this.backupPath, 'db')
    await mkdir(destDir, { recursive: true })
    const destPath = join(destDir, 'younglife.db')

    this.isRunning = true
    try {
      await this.db.backup(destPath, {
        progress: ({ totalPages, remainingPages }) => {
          const done = totalPages - remainingPages
          console.log(`[backup] db ${done}/${totalPages}`)
        },
      })
      this.recordSuccess()
    } finally {
      this.isRunning = false
    }
  }

  private recordSuccess(): void {
    this.lastError = null
    this.lastSuccessAt = new Date().toISOString()
  }

  private recordError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err)
    this.lastError = message
    console.error('[backup]', message)
  }

  private validatePath(path: string): void {
    const normalizedDataRoot = normalize(this.dataRoot).toLowerCase()
    const normalizedPath = normalize(path).toLowerCase()

    if (normalizedPath === normalizedDataRoot) {
      throw new Error('备份路径不能与数据目录相同')
    }
    if (normalizedPath.startsWith(normalizedDataRoot + sep) || normalizedPath.startsWith(normalizedDataRoot + '/')) {
      throw new Error('备份路径不能位于数据目录内部')
    }
  }

  private async ensureWritable(path: string): Promise<void> {
    try {
      await access(path, constants.W_OK)
    } catch {
      await mkdir(path, { recursive: true })
    }
  }

  private startPolling(): void {
    if (this.pollTimer) return
    this.lastDbStats.clear()
    this.pollTimer = setInterval(() => {
      void this.checkDatabaseChanged()
    }, POLL_INTERVAL_MS)
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    this.lastDbStats.clear()
  }

  async setPath(path: string | null): Promise<void> {
    if (!path) {
      this.backupPath = null
      this.lastError = null
      this.stopPolling()
      return
    }

    this.validatePath(path)
    await this.ensureWritable(path)

    this.backupPath = path
    this.lastError = null
    this.startPolling()
    await this.runFullSync()
  }

  getPath(): string | null {
    return this.backupPath
  }

  getStatus(): BackupStatus {
    return {
      enabled: !!this.backupPath,
      path: this.backupPath,
      lastError: this.lastError,
      lastSuccessAt: this.lastSuccessAt,
      isRunning: this.isRunning || !!this.runningBackup,
    }
  }

  async syncFile(relativePath: string): Promise<void> {
    if (!this.backupPath) return
    const src = join(this.dataRoot, relativePath)
    const dest = join(this.backupPath, relativePath)

    try {
      await stat(src)
    } catch {
      // 源文件不存在，尝试删除备份中的对应文件
      await this.removeFile(relativePath).catch(() => {})
      return
    }

    await mkdir(dirname(dest), { recursive: true })
    await copyFile(src, dest)
    this.recordSuccess()
  }

  async syncDir(relativeDir: string): Promise<void> {
    if (!this.backupPath) return
    const srcDir = join(this.dataRoot, relativeDir)
    const destDir = join(this.backupPath, relativeDir)

    try {
      await access(srcDir, constants.R_OK)
    } catch {
      return
    }

    await mkdir(destDir, { recursive: true })
    const entries = await readdir(srcDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        await this.syncDir(join(relativeDir, entry.name))
      } else {
        await this.syncFile(join(relativeDir, entry.name))
      }
    }
  }

  async removeFile(relativePath: string): Promise<void> {
    if (!this.backupPath) return
    const dest = join(this.backupPath, relativePath)
    try {
      await unlink(dest)
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (code !== 'ENOENT') {
        this.recordError(err)
        throw err
      }
    }
  }

  async runFullSync(): Promise<void> {
    if (!this.backupPath) return
    console.log('[backup] 开始全量同步到', this.backupPath)

    // 先备份数据库（一致快照）
    await this.performDatabaseBackup()

    // 再同步文件资产
    for (const dir of BACKUP_DIRS) {
      if (dir === 'db') continue // 数据库已通过 backup() 处理
      await this.syncDir(dir)
    }

    // 清理备份中已不存在的文件/目录（可选，保持两边一致）
    await this.cleanupRemovedFiles()
    this.recordSuccess()
  }

  private async cleanupRemovedFiles(): Promise<void> {
    if (!this.backupPath) return
    for (const dir of BACKUP_DIRS) {
      const srcDir = join(this.dataRoot, dir)
      const destDir = join(this.backupPath, dir)
      try {
        await access(destDir, constants.R_OK)
      } catch {
        continue
      }

      const destEntries = await readdir(destDir, { withFileTypes: true })
      for (const entry of destEntries) {
        const srcPath = join(srcDir, entry.name)
        const destPath = join(destDir, entry.name)
        try {
          await access(srcPath)
        } catch {
          // 源端已不存在，删除备份端
          try {
            await rm(destPath, { recursive: true, force: true })
          } catch (err) {
            this.recordError(err)
          }
        }
      }
    }
  }

  async waitForRunningBackup(timeoutMs = 5000): Promise<void> {
    if (!this.runningBackup) return
    const timeout = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('等待备份完成超时')), timeoutMs)
    })
    await Promise.race([this.runningBackup, timeout]).catch(() => {})
  }
}

export function createBackupService(db: AppDatabase, dataRoot: string): BackupService {
  return new BackupServiceImpl(db, dataRoot)
}
