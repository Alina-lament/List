import { useEffect, useRef, useState } from 'react'
import { useTasksStore, type ViewMode } from '@/features/tasks/store'
import { useSettingsStore } from '@/features/settings/store'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { SettingsDialog } from '@/features/settings/components/SettingsDialog'
import { useLayoutStore } from './layoutStore'
import { api } from '@/lib/api'
import { ListIconPicker } from '@/features/lists/components/ListIconPicker'
import type { List } from '@shared/types'

const VIEW_TABS: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
  {
    key: 'list',
    label: '今日',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'calendar',
    label: '日历',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'daily',
    label: '每日',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'journal',
    label: '日记',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="10 9 9 9 8 9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'countdown',
    label: '倒数日',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

function ListIcon({ list, size = 16 }: { list: List; size?: number }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!list.icon) {
      setUrl(null)
      return
    }
    let mounted = true
    api.getListIconDataUrl(list.id).then((dataUrl) => {
      if (mounted) setUrl(dataUrl)
    })
    return () => { mounted = false }
  }, [list.id, list.icon])

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className="shrink-0 rounded-full shadow-sm"
      style={{ width: size * 0.75, height: size * 0.75, backgroundColor: list.color }}
    />
  )
}

export function Sidebar() {
  const {
    lists,
    tags,
    selectedListId,
    selectList,
    createList,
    renameList,
    deleteList,
    createTag,
    deleteTag,
    view,
    setView,
  } = useTasksStore()

  const [addingList, setAddingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState('#4f6ef7')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [listsExpanded, setListsExpanded] = useState(true)
  const [iconPickerId, setIconPickerId] = useState<string | null>(null)
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth)
  const narrow = sidebarWidth < 210
  const { brandName, brandImageUrl, setBrandName, setBrandImage, clearBrandImage, bgGlassIntensity } = useSettingsStore()
  const [editingBrand, setEditingBrand] = useState(false)
  const [brandDraft, setBrandDraft] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleBrandImageClick() {
    const path = await api.openImageFileDialog()
    if (path) await setBrandImage(path)
  }

  function startEditingBrand() {
    setBrandDraft(brandName)
    setEditingBrand(true)
  }

  function commitBrand() {
    const name = brandDraft.trim()
    if (name && name !== brandName) {
      void setBrandName(name)
    }
    setEditingBrand(false)
  }

  async function submitNewList() {
    const name = newListName.trim()
    if (!name) return
    setNewListName('')
    setAddingList(false)
    await createList(name, newListColor)
  }

  async function submitRename() {
    const name = renameValue.trim()
    if (renamingId && name) await renameList(renamingId, name)
    setRenamingId(null)
  }

  async function submitNewTag() {
    const name = newTagName.trim()
    if (!name) return
    setNewTagName('')
    setAddingTag(false)
    await createTag(name)
  }

  return (
    <aside
      className="flex min-w-0 shrink-0 flex-col rounded-2xl shadow-card-lg ring-1 ring-white/40"
      style={{
        width: sidebarWidth,
        backgroundColor: `rgba(var(--color-sidebar-bg-rgb), ${0.1 + (bgGlassIntensity / 100) * 0.65})`,
        backdropFilter: `blur(${(bgGlassIntensity / 100) * 24}px)`,
      }}
    >
      {/* 品牌区 */}
      <div className="flex items-center gap-3 px-5 py-4">
        {/* 品牌图片：可点击更换 */}
        <button
          onClick={handleBrandImageClick}
          onContextMenu={(e) => { e.preventDefault(); void clearBrandImage() }}
          className="group relative h-9 w-9 shrink-0 overflow-hidden rounded-xl shadow-xs transition-shadow hover:shadow-card"
          title="点击更换图片 / 右键清除"
        >
          {brandImageUrl ? (
            <img src={brandImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-royal to-royal-dark text-base font-bold text-white">
              {brandName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-ink/40 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            更换
          </span>
        </button>

        {/* 品牌名称：可点击编辑 */}
        {!narrow && (
          editingBrand ? (
            <input
              value={brandDraft}
              onChange={(e) => setBrandDraft(e.target.value)}
              onBlur={commitBrand}
              onKeyDown={(e) => { if (e.key === 'Enter') commitBrand(); if (e.key === 'Escape') setEditingBrand(false) }}
              className="min-w-0 flex-1 bg-transparent text-base font-bold text-ink outline-none"
              autoFocus
            />
          ) : (
            <span
              onClick={startEditingBrand}
              className="cursor-pointer truncate text-base font-bold tracking-tight text-ink hover:text-royal transition-colors"
              title="点击编辑名称"
            >
              {brandName}
            </span>
          )
        )}
      </div>

      {/* 视图切换 */}
      <nav className="px-3 pt-1">
        <div className="space-y-0.5">
          {VIEW_TABS.map((tab) => {
            const active = view === tab.key
            const bright = active && selectedListId === null
            return (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  bright
                    ? 'bg-white text-ink shadow-card ring-1 ring-ink/5'
                    : 'text-ink-2 hover:bg-white/60 hover:text-ink'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="mx-5 mt-3 h-px bg-canvas-3/40" />

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div
          className="mb-2 flex cursor-pointer items-center justify-between rounded-lg px-2 py-1 transition-colors hover:bg-white/40"
          onClick={() => setListsExpanded((v) => !v)}
        >
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3 transition-colors hover:text-ink">
            <span className={`inline-block transition-transform ${listsExpanded ? 'rotate-90' : ''}`}>▸</span>
            清单
          </span>
          <button
            className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-white/70 hover:text-ink"
            onClick={(e) => { e.stopPropagation(); setAddingList(true) }}
            aria-label="新建清单"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {listsExpanded && (
          <div className="space-y-0.5">
            {lists.map((list) => {
              const selected = list.id === selectedListId
              const showPicker = iconPickerId === list.id
              return (
                <div
                  key={list.id}
                  className={`group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-all duration-150 ${
                    selected
                      ? 'bg-white text-ink font-medium shadow-card ring-1 ring-ink/5'
                      : 'text-ink-2 hover:bg-white/60 hover:text-ink'
                  }`}
                >
                  <button
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-canvas-2"
                    onClick={(e) => { e.stopPropagation(); setIconPickerId(showPicker ? null : list.id) }}
                    title="点击更换图标"
                  >
                    <ListIcon list={list} size={16} />
                  </button>
                  {showPicker && (
                    <div className="absolute left-8 top-8 z-30">
                      <ListIconPicker listId={list.id} onClose={() => setIconPickerId(null)} />
                    </div>
                  )}
                  {renamingId === list.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={submitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename()
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      className="w-full rounded-lg border border-royal bg-canvas px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-royal-50/50"
                    />
                  ) : (
                    <>
                      <button
                        className="flex-1 truncate text-left"
                        onClick={() => selectList(list.id)}
                      >
                        {list.name}
                      </button>
                      <button
                        className="hidden shrink-0 rounded p-0.5 text-xs text-ink-3 hover:text-ink group-hover:block"
                        onClick={() => {
                          setRenamingId(list.id)
                          setRenameValue(list.name)
                        }}
                        aria-label="重命名"
                      >
                        ✎
                      </button>
                      <button
                        className="hidden shrink-0 rounded p-0.5 text-xs text-ink-3 hover:text-prihigh group-hover:block"
                        onClick={() => {
                          if (window.confirm(`删除清单「${list.name}」及其所有任务？`)) {
                            void deleteList(list.id)
                          }
                        }}
                        aria-label="删除"
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {addingList && (
          <div className="mt-2 space-y-2.5 rounded-xl border border-canvas-3 bg-white p-3 shadow-card">
            <input
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitNewList()
                if (e.key === 'Escape') setAddingList(false)
              }}
              placeholder="清单名称"
              className="w-full rounded-lg border border-canvas-3 bg-canvas px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-4 focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal-50/50"
            />
            <ColorPicker value={newListColor} onChange={setNewListColor} />
            <div className="flex justify-end gap-2">
              <button
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-3 hover:bg-canvas-2 transition-colors"
                onClick={() => setAddingList(false)}
              >
                取消
              </button>
              <button
                className="rounded-lg bg-royal px-3 py-1.5 text-xs font-medium text-white hover:bg-royal-dark transition-colors shadow-xs"
                onClick={submitNewList}
              >
                创建
              </button>
            </div>
          </div>
        )}

        {/* 标签分组 */}
        {tags.length > 0 && (
          <>
            <div className="relative mb-2 mt-5 flex items-center justify-end pt-4 px-2">
              <div className="absolute left-5 right-5 top-0 h-px bg-canvas-3/40" />
              <span className="text-[11px] font-semibold tracking-widest text-ink-3 uppercase">标签</span>
              <button
                className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-white/70 hover:text-ink"
                onClick={() => setAddingTag(true)}
                aria-label="新建标签"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 px-2">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="group inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-white shadow-sm"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  <button
                    className="hidden text-white/70 hover:text-white group-hover:inline"
                    onClick={() => void deleteTag(tag.id)}
                    aria-label={`删除标签 ${tag.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {addingTag && (
                <input
                  autoFocus
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onBlur={submitNewTag}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitNewTag()
                    if (e.key === 'Escape') setAddingTag(false)
                  }}
                  placeholder="标签名"
                  className="w-20 rounded-lg border border-canvas-3 bg-white px-2.5 py-1 text-xs text-ink placeholder:text-ink-4 focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal-50/50"
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* 底部设置按钮 */}
      <div className="relative px-3 py-2.5">
        <div className="absolute inset-x-3 top-0 h-px bg-canvas-3/40" />
        <button
          onClick={() => setShowSettings(true)}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 transition-all duration-150 hover:bg-white/60 hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          设置
        </button>
      </div>

      <SettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </aside>
  )
}