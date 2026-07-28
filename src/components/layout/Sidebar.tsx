import { useState } from 'react'
import { useTasksStore, type ViewMode } from '@/features/tasks/store'
import { ColorPicker } from '@/components/ui/ColorPicker'

const VIEW_TABS: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
  {
    key: 'list',
    label: '清单',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" />
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
]

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
    <aside className="flex w-60 shrink-0 flex-col border-r border-canvas-3 bg-canvas-2 backdrop-blur-sm">
      {/* 品牌区 */}
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-royal to-royal-dark text-base font-bold text-white shadow-xs">
          Y
        </span>
        <span className="text-base font-bold tracking-tight text-ink">YoungLife</span>
      </div>

      {/* 视图切换 */}
      <nav className="px-3 pt-1">
        <div className="space-y-0.5">
          {VIEW_TABS.map((tab) => {
            const active = view === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
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

      <div className="mx-4 mt-3 border-t border-canvas-3" />

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {/* 清单分组标题 */}
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-[11px] font-semibold tracking-widest text-ink-3 uppercase">清单</span>
          <button
            className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-white/70 hover:text-ink"
            onClick={() => setAddingList(true)}
            aria-label="新建清单"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-0.5">
          {lists.map((list) => {
            const selected = list.id === selectedListId
            return (
              <div
                key={list.id}
                className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-all duration-150 ${
                  selected
                    ? 'bg-white text-ink font-medium shadow-card ring-1 ring-ink/5'
                    : 'text-ink-2 hover:bg-white/60 hover:text-ink'
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full shadow-sm"
                  style={{ backgroundColor: list.color }}
                />
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
            <div className="mb-2 mt-5 flex items-center justify-between border-t border-canvas-3 pt-4 px-2">
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
    </aside>
  )
}