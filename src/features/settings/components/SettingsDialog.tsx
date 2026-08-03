import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { useSettingsStore } from '../store'
import { ColorSettingRow } from './ColorSettingRow'
import { api } from '@/lib/api'
import type { CloseBehavior } from '@shared/types'

type TabKey = 'quick' | 'colors' | 'background' | 'icons' | 'backup'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'quick', label: '快捷设置', icon: '⚡' },
  { key: 'colors', label: '主题颜色', icon: '🎨' },
  { key: 'background', label: '背景图片', icon: '🖼️' },
  { key: 'icons', label: '图标设置', icon: '⭐' },
  { key: 'backup', label: '数据备份', icon: '💾' },
]

const COLOR_LABELS: Record<string, string> = {
  sidebarBg: '侧栏背景',
  canvasBg: '页面背景',
  cardBg: '卡片背景',
  royal: '强调色',
  royalDark: '强调深色',
  royalLight: '强调亮色',
  royal50: '选中底色',
  ink: '主文字',
  ink2: '次文字',
  ink3: '辅文字',
  borderColor: '边框色',
  prihigh: '高优先级',
  primed: '中优先级',
  prilow: '低优先级',
}

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const store = useSettingsStore()
  const [tab, setTab] = useState<TabKey>('quick')
  const [icons, setIcons] = useState<string[]>([])
  const [previewBg, setPreviewBg] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTab('quick')
    setPreviewBg(store.bgImagePath)
    void loadIcons()
  }, [open])

  async function loadIcons() {
    const list = await api.listIcons()
    setIcons(list)
  }

  async function handleSelectImage() {
    const filePath = await api.openImageFileDialog()
    if (filePath) {
      await store.setBgImage(filePath)
      setPreviewBg(filePath)
    }
  }

  async function handleClearBg() {
    await store.clearBgImage()
    setPreviewBg(null)
  }

  async function handleSelectIcon(fileName: string) {
    const folder = await api.getIconsFolder()
    const path = `${folder}\\${fileName}`
    await store.setAppIcon(path)
  }

  return (
    <Modal open={open} onClose={onClose} title="设置" width="max-w-xl">
      {/* 标签页切换 */}
      <div className="mb-5 flex gap-1 rounded-xl bg-canvas-2 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
              tab === t.key
                ? 'bg-white text-ink shadow-xs ring-1 ring-ink/5'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            <span className="mr-1.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* 标签页内容 */}
      {tab === 'quick' && <QuickTab />}

      {tab === 'colors' && <ColorsTab store={store} />}

      {tab === 'background' && (
        <BackgroundTab
          store={store}
          previewBg={previewBg}
          onSelectImage={handleSelectImage}
          onClearBg={handleClearBg}
        />
      )}

      {tab === 'icons' && (
        <IconsTab
          store={store}
          icons={icons}
          onSelectIcon={handleSelectIcon}
          onRefresh={loadIcons}
        />
      )}

      {tab === 'backup' && <BackupTab />}
    </Modal>
  )
}

// ── 快捷设置标签页（快捷键）──
function QuickTab() {
  const scrollSensitivity = useSettingsStore((s) => s.scrollSensitivity)
  const closeBehavior = useSettingsStore((s) => s.closeBehavior)
  const updateSetting = useSettingsStore((s) => s.updateColor)
  const updateCloseBehavior = useSettingsStore((s) => s.updateCloseBehavior)
  const taskCompleteSoundEnabled = useSettingsStore((s) => s.taskCompleteSoundEnabled)
  const taskCompleteSoundVolume = useSettingsStore((s) => s.taskCompleteSoundVolume)
  const taskCompleteSoundUrl = useSettingsStore((s) => s.taskCompleteSoundUrl)
  const setTaskCompleteSoundEnabled = useSettingsStore((s) => s.setTaskCompleteSoundEnabled)
  const setTaskCompleteSoundVolume = useSettingsStore((s) => s.setTaskCompleteSoundVolume)

  const CLOSE_BEHAVIOR_OPTIONS: { value: CloseBehavior; label: string }[] = [
    { value: 'ask', label: '每次询问' },
    { value: 'tray', label: '最小化到系统托盘' },
    { value: 'quit', label: '直接退出应用' },
  ]

  const SHORTCUTS = [
    { keys: 'Ctrl + 1', desc: '高优先级', color: '#f43f5e' },
    { keys: 'Ctrl + 2', desc: '中优先级', color: '#f59e0b' },
    { keys: 'Ctrl + 3', desc: '低优先级', color: '#22c55e' },
    { keys: 'Ctrl + 4', desc: '无优先级', color: '#94a3b8' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-ink-3 uppercase">任务优先级</h3>
        <p className="mb-3 text-xs text-ink-4">选中任务后，使用快捷键快速设置优先级</p>
        <div className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <div
              key={s.keys}
              className="flex items-center gap-3 rounded-xl border border-canvas-3 bg-white px-4 py-3"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="flex-1 text-sm font-medium text-ink">{s.desc}</span>
              <kbd className="rounded-lg bg-canvas-2 px-2.5 py-1 text-xs font-mono font-semibold text-ink-2 shadow-xs ring-1 ring-ink/5">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-canvas-3 pt-4">
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-ink-3 uppercase">任务完成音效</h3>
        <p className="mb-3 text-xs text-ink-4">勾选完成任务时播放提示音，音效文件位于数据文件夹 sounds 目录</p>
        <div className="rounded-xl border border-canvas-3 bg-white px-4 py-3">
          <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-ink transition-colors hover:text-ink-2">
            <input
              type="checkbox"
              checked={taskCompleteSoundEnabled}
              onChange={(e) => void setTaskCompleteSoundEnabled(e.target.checked)}
              className="accent-royal"
            />
            启用完成音效
          </label>
          <div className={`${taskCompleteSoundEnabled ? '' : 'pointer-events-none opacity-50'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-ink-3">音量</span>
              <span className="text-sm font-semibold text-ink">{taskCompleteSoundVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={taskCompleteSoundVolume}
              onChange={(e) => void setTaskCompleteSoundVolume(Number(e.target.value))}
              className="w-full accent-royal"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                if (!taskCompleteSoundUrl) return
                const audio = new Audio(taskCompleteSoundUrl)
                audio.volume = taskCompleteSoundVolume / 100
                void audio.play()
              }}
              disabled={!taskCompleteSoundEnabled || !taskCompleteSoundUrl}
              className="rounded-lg bg-canvas-2 px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:bg-canvas-3 hover:text-ink disabled:opacity-40"
            >
              ▶ 测试音效
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-canvas-3 pt-4">
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-ink-3 uppercase">日历滚轮</h3>
        <p className="mb-3 text-xs text-ink-4">滚轮滚动多少像素切换一个月份</p>
        <div className="rounded-xl border border-canvas-3 bg-white px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-ink-3">灵敏度</span>
            <span className="text-sm font-semibold text-ink">{scrollSensitivity}px</span>
          </div>
          <input
            type="range"
            min={50}
            max={500}
            step={10}
            value={scrollSensitivity}
            onChange={(e) => updateSetting('scrollSensitivity', e.target.value)}
            className="w-full accent-royal"
          />
          <div className="flex justify-between mt-0.5">
            <span className="text-[10px] text-ink-4">灵敏 (50px)</span>
            <span className="text-[10px] text-ink-4">迟钝 (500px)</span>
          </div>
        </div>
      </div>

      <div className="border-t border-canvas-3 pt-4">
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-ink-3 uppercase">关闭窗口时</h3>
        <p className="mb-3 text-xs text-ink-4">选择点击窗口关闭按钮后的默认行为</p>
        <div className="space-y-2">
          {CLOSE_BEHAVIOR_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink transition-colors hover:bg-canvas-2"
            >
              <input
                type="radio"
                name="closeBehavior"
                value={opt.value}
                checked={closeBehavior === opt.value}
                onChange={(e) => updateCloseBehavior(e.target.value as CloseBehavior)}
                className="accent-royal"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 主题颜色标签页 ──
function ColorsTab({ store }: { store: ReturnType<typeof useSettingsStore.getState> }) {
  return (
    <div className="space-y-3">
      {/* 预设主题 */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-ink-2">预设主题：</span>
        {[
          { name: 'bright', label: '☀️ 明亮' },
          { name: 'dark', label: '🌙 暗黑' },
          { name: 'nature', label: '🌿 自然' },
        ].map((p) => (
          <button
            key={p.name}
            onClick={() => store.applyPreset(p.name)}
            className="rounded-lg border border-canvas-3 px-3 py-1.5 text-xs font-medium text-ink-2 transition-all hover:bg-canvas-2 hover:shadow-xs"
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => store.resetDefaults()}
          className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-ink-3 hover:text-ink hover:bg-canvas-2 transition-colors"
        >
          重置默认
        </button>
      </div>

      <div className="space-y-2">
        {Object.entries(COLOR_LABELS).map(([key, label]) => (
          <ColorSettingRow
            key={key}
            label={label}
            value={String(store[key as keyof typeof store] ?? '')}
            onChange={(color) => store.updateColor(key, color)}
          />
        ))}
      </div>
    </div>
  )
}

// ── 背景图片标签页 ──
function BackgroundTab({
  store,
  previewBg,
  onSelectImage,
  onClearBg,
}: {
  store: ReturnType<typeof useSettingsStore.getState>
  previewBg: string | null
  onSelectImage: () => void
  onClearBg: () => void
}) {
  const [opacity, setOpacity] = useState(store.bgOpacity)
  const [blur, setBlur] = useState(store.bgBlur)
  const [scale, setScale] = useState(store.bgScale)
  const [glassIntensity, setGlassIntensity] = useState(store.bgGlassIntensity)

  useEffect(() => {
    setOpacity(store.bgOpacity)
    setBlur(store.bgBlur)
    setScale(store.bgScale)
    setGlassIntensity(store.bgGlassIntensity)
  }, [store.bgOpacity, store.bgBlur, store.bgScale, store.bgGlassIntensity])

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={onSelectImage}>
          选择图片
        </Button>
        {previewBg && (
          <Button variant="danger" size="sm" onClick={onClearBg}>
            清除背景
          </Button>
        )}
      </div>

      {previewBg && (
        <div className="overflow-hidden rounded-xl border border-canvas-3">
          <div
            className="h-32 w-full bg-gray-100"
            style={{
              backgroundImage: store.bgImageDataUrl ? `url("${store.bgImageDataUrl}")` : 'none',
              backgroundSize: scale,
              backgroundPosition: 'center',
              opacity: opacity / 100,
              filter: `blur(${blur}px)`,
            }}
          />
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-2">
            图片不透明度：{opacity}%
          </label>
          <input
            type="range"
            min={5}
            max={100}
            value={opacity}
            onChange={(e) => {
              setOpacity(Number(e.target.value))
              store.updateBgSetting('bgOpacity', e.target.value)
            }}
            className="w-full accent-royal"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-2">
            模糊度：{blur}px
          </label>
          <input
            type="range"
            min={0}
            max={30}
            value={blur}
            onChange={(e) => {
              setBlur(Number(e.target.value))
              store.updateBgSetting('bgBlur', e.target.value)
            }}
            className="w-full accent-royal"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-2">
            毛玻璃强度：{glassIntensity}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={glassIntensity}
            onChange={(e) => {
              setGlassIntensity(Number(e.target.value))
              store.updateBgSetting('bgGlassIntensity', e.target.value)
            }}
            className="w-full accent-royal"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-2">缩放模式</label>
          <Select
            value={scale}
            onChange={(e) => {
              const v = e.target.value as 'cover' | 'contain' | 'fill'
              setScale(v)
              store.updateBgSetting('bgScale', v)
            }}
          >
            <option value="cover">填充（保持比例）</option>
            <option value="contain">适应（完整显示）</option>
            <option value="fill">拉伸（填满区域）</option>
          </Select>
        </div>
      </div>
      {!previewBg && (
        <p className="text-xs text-ink-4">选择一张图片作为应用背景，支持 PNG / JPG / WebP 格式</p>
      )}
    </div>
  )
}

// ── 当前图标显示 ──
function CurrentIconDisplay({ iconPath }: { iconPath: string }) {
  const [dataUrl, setDataUrl] = useState('')
  const fileName = iconPath.split(/[\\/]/).pop() ?? ''

  useEffect(() => {
    void api.getIconDataUrl(fileName).then(setDataUrl)
  }, [iconPath, fileName])

  return (
    <div className="flex items-center gap-3 text-sm text-ink-2">
      <span className="shrink-0">当前：</span>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="当前图标"
          className="h-8 w-8 rounded-lg object-contain ring-1 ring-ink/5"
        />
      ) : (
        <span className="text-lg">🖼️</span>
      )}
      <span className="font-medium text-ink">{fileName}</span>
    </div>
  )
}

// ── 图标设置标签页 ──
function IconsTab({
  store,
  icons,
  onSelectIcon,
  onRefresh,
}: {
  store: ReturnType<typeof useSettingsStore.getState>
  icons: string[]
  onSelectIcon: (fileName: string) => void
  onRefresh: () => void
}) {
  const [icoFolder, setIcoFolder] = useState('')
  const [iconDataUrls, setIconDataUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    void api.getIconsFolder().then(setIcoFolder)
  }, [])

  useEffect(() => {
    // 加载所有图标的数据 URL
    void Promise.all(
      icons.map(async (file) => {
        const url = await api.getIconDataUrl(file)
        return { file, url }
      }),
    ).then((results) => {
      const map: Record<string, string> = {}
      for (const { file, url } of results) {
        if (url) map[file] = url
      }
      setIconDataUrls(map)
    })
  }, [icons])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={() => api.openIconsFolder()}>
          📂 打开图标文件夹
        </Button>
        <Button size="sm" onClick={onRefresh}>
          🔄 刷新
        </Button>
      </div>

      <p className="text-xs text-ink-4">
        将 .ico / .png 图标文件放入以下文件夹，即可在此选择：
      </p>
      <p className="break-all rounded-lg bg-canvas-2 px-3 py-2 text-xs font-mono text-ink-3">
        {icoFolder || '加载中…'}
      </p>

      {store.appIconPath && (
        <CurrentIconDisplay iconPath={store.appIconPath} />
      )}

      {icons.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-4">暂无图标文件，请将图标放入上述文件夹后刷新</p>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {icons.map((file) => {
            const selected = store.appIconPath?.endsWith(file)
            const dataUrl = iconDataUrls[file]
            return (
              <button
                key={file}
                onClick={() => onSelectIcon(file)}
                title={file}
                className={`flex items-center justify-center rounded-xl border p-3 transition-all hover:shadow-card ${
                  selected
                    ? 'border-royal bg-royal-50 ring-2 ring-royal-50/50'
                    : 'border-canvas-3 hover:border-canvas-4'
                }`}
              >
                {dataUrl ? (
                  <img src={dataUrl} alt={file} className="h-10 w-10 object-contain" />
                ) : (
                  <span className="h-10 w-10 flex items-center justify-center text-lg">🖼️</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 数据备份标签页 ──
function BackupTab() {
  const store = useSettingsStore()

  useEffect(() => {
    const id = setInterval(() => {
      void store.loadBackupStatus()
    }, 3000)
    return () => clearInterval(id)
  }, [store])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-ink-3 uppercase">备份位置</h3>
        <p className="text-xs text-ink-4">
          选择文件夹后，所有数据修改（任务、日记、习惯、图片、音效等）会自动同步到该位置
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={() => void store.selectBackupFolder()}>
          选择备份文件夹
        </Button>
        {store.backupPath && (
          <Button variant="danger" size="sm" onClick={() => void store.clearBackupPath()}>
            清除备份
          </Button>
        )}
      </div>

      {store.backupPath ? (
        <p className="break-all rounded-lg bg-canvas-2 px-3 py-2 text-xs font-mono text-ink-3">
          {store.backupPath}
        </p>
      ) : (
        <p className="text-xs text-ink-4">未启用自动备份</p>
      )}

      {store.backupStatus && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-ink-3">状态：</span>
            <span className={store.backupStatus.isRunning ? 'text-royal' : store.backupStatus.lastError ? 'text-red-500' : 'text-emerald-600'}>
              {store.backupStatus.isRunning ? '备份中…' : store.backupStatus.lastError ? '上次失败' : '正常'}
            </span>
          </div>
          {store.backupStatus.lastSuccessAt && (
            <div className="text-ink-3">
              上次成功：{new Date(store.backupStatus.lastSuccessAt).toLocaleString()}
            </div>
          )}
          {store.backupStatus.lastError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-red-600">
              失败原因：{store.backupStatus.lastError}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
