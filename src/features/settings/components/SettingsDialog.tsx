import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { useSettingsStore } from '../store'
import { ColorSettingRow } from './ColorSettingRow'
import { api } from '@/lib/api'

type TabKey = 'colors' | 'background' | 'icons'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'colors', label: '主题颜色', icon: '🎨' },
  { key: 'background', label: '背景图片', icon: '🖼️' },
  { key: 'icons', label: '图标设置', icon: '⭐' },
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
  const [tab, setTab] = useState<TabKey>('colors')
  const [icons, setIcons] = useState<string[]>([])
  const [previewBg, setPreviewBg] = useState<string | null>(null)

  // 打开时同步状态并加载图标列表
  useEffect(() => {
    if (!open) return
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
    const path = `${folder}\\${fileName}`.replace(/\\/g, '\\\\')
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
      {tab === 'colors' && (
        <ColorsTab store={store} />
      )}

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
    </Modal>
  )
}

// ── 主题颜色标签页 ──
function ColorsTab({ store }: { store: ReturnType<typeof useSettingsStore.getState> & typeof store }) {
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
  store: ReturnType<typeof useSettingsStore.getState> & typeof store
  previewBg: string | null
  onSelectImage: () => void
  onClearBg: () => void
}) {
  const [opacity, setOpacity] = useState(store.bgOpacity)
  const [blur, setBlur] = useState(store.bgBlur)
  const [scale, setScale] = useState(store.bgScale)

  useEffect(() => {
    setOpacity(store.bgOpacity)
    setBlur(store.bgBlur)
    setScale(store.bgScale)
  }, [store.bgOpacity, store.bgBlur, store.bgScale])

  return (
    <div className="space-y-4">
      {/* 选择按钮 */}
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

      {/* 预览 */}
      {previewBg && (
        <div className="overflow-hidden rounded-xl border border-canvas-3">
          <div
            className="h-32 w-full bg-gray-100"
            style={{
              backgroundImage: `url("file:///${previewBg.replace(/\\/g, '/')}")`,
              backgroundSize: scale,
              backgroundPosition: 'center',
              opacity: opacity / 100,
              filter: `blur(${blur}px)`,
            }}
          />
        </div>
      )}

      {/* 调节滑块 */}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-2">
            透明度：{opacity}%
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

// ── 图标设置标签页 ──
function IconsTab({
  store,
  icons,
  onSelectIcon,
  onRefresh,
}: {
  store: ReturnType<typeof useSettingsStore.getState> & typeof store
  icons: string[]
  onSelectIcon: (fileName: string) => void
  onRefresh: () => void
}) {
  const [icoFolder, setIcoFolder] = useState('')

  useEffect(() => {
    void api.getIconsFolder().then(setIcoFolder)
  }, [])

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
        <div className="flex items-center gap-2 text-sm text-ink-2">
          <span>当前：</span>
          <span className="font-medium text-ink">{store.appIconPath.split(/[\\/]/).pop()}</span>
        </div>
      )}

      {icons.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-4">暂无图标文件，请将图标放入上述文件夹后刷新</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {icons.map((file) => {
            const selected = store.appIconPath?.endsWith(file)
            return (
              <button
                key={file}
                onClick={() => onSelectIcon(file)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-all hover:shadow-card ${
                  selected
                    ? 'border-royal bg-royal-50 ring-2 ring-royal-50/50'
                    : 'border-canvas-3 hover:border-canvas-4'
                }`}
              >
                <span className="text-2xl">🖼️</span>
                <span className="truncate text-center text-[10px] font-medium text-ink-2">
                  {file}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
