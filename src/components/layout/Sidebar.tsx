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
  const [newListColor, setNewListColor] = useState('#2563eb')
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
    <aside className="flex w-60 shrink-0 flex-col border-r border-canvas-3 bg-canvas-2/60">
      {/* 品牌区：钴蓝方块 + 近黑标题，高对比 */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-royal text-base font-bold text-white">
          Y
        </span>
        <span className="text-base font-bold tracking-wide text-ink">YoungLife</span>
      </div>

      <div className="mx-3 border-t border-canvas-3" />

      {/* 视图切换：竖排，选中钴蓝填充 */}
      <nav className="px-3 pt-3">
        <div className="space-y-1">
          {VIEW_TABS.map((tab) => {
            const active = view === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-royal text-white shadow-sm'
                    : 'text-ink-2 hover:bg-canvas-3/60'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="mx-3 mt-3 border-t border-canvas-3" />

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {/* 清单分组标题 */}
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-bold tracking-widest text-ink-3">清单</span>
          <button
            className="rounded-md p-1 text-ink-3 transition-colors hover:bg-canvas-3 hover:text-ink"
            onClick={() => setAddingList(true)}
            aria-label="新建清单"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-1">
          {lists.map((list) => {
            const selected = list.id === selectedListId
            return (
              <div
                key={list.id}
                className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  selected ? 'bg-royal-50 text-royal-dark' : 'text-ink-2 hover:bg-canvas-3/60'
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${selected ? 'ring-2 ring-royal/30 ring-offset-1 ring-offset-canvas-2' : ''}`}
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
                    className="w-full rounded-md border border-royal bg-canvas px-1.5 py-0.5 text-sm text-ink focus:outline-none"
                  />
                ) : (
                  <>
                    <button
                      className={`flex-1 truncate text-left ${selected ? 'font-semibold' : ''}`}
                      onClick={() => selectList(list.id)}
                    >
                      {list.name}
                    </button>
                    {/* 选中态左侧钴蓝竖条 */}
                    {selected && <span className="h-5 w-1 rounded-full bg-royal" />}
                    <button
                      className="hidden shrink-0 text-xs text-ink-3 hover:text-ink group-hover:block"
                      onClick={() => {
                        setRenamingId(list.id)
                        setRenameValue(list.name)
                      }}
                      aria-label="重命名"
                    >
                      ✎
                    </button>
                    <button
                      className="hidden shrink-0 text-xs text-ink-3 hover:text-prihigh group-hover:block"
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
          <div className="mt-2 space-y-2.5 rounded-lg border border-canvas-3 bg-canvas p-2.5 shadow-card">
            <input
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitNewList()
                if (e.key === 'Escape') setAddingList(false)
              }}
              placeholder="清单名称"
              className="w-full rounded-md border border-canvas-3 bg-canvas px-2 py-1.5 text-sm text-ink placeholder:text-ink-4 focus:border-royal focus:outline-none"
            />
            <ColorPicker value={newListColor} onChange={setNewListColor} />
            <div className="flex justify-end gap-1.5">
              <button
                className="rounded-md px-2.5 py-1 text-xs text-ink-3 hover:bg-canvas-2"
                onClick={() => setAddingList(false)}
              >
                取消
              </button>
              <button
                className="rounded-md bg-royal px-2.5 py-1 text-xs font-medium text-white hover:bg-royal-dark"
                onClick={submitNewList}
              >
                创建
              </button>
            </div>
          </div>
        )}

        {/* 标签分组标题 */}
        <div className="mb-2 mt-6 flex items-center justify-between border-t border-canvas-3 pt-4 px-1">
          <span className="text-xs font-bold tracking-widest text-ink-3">标签</span>
          <button
            className="rounded-md p-1 text-ink-3 transition-colors hover:bg-canvas-3 hover:text-ink"
            onClick={() => setAddingTag(true)}
            aria-label="新建标签"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 px-1">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="group inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-white"
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
              className="w-20 rounded-md border border-canvas-3 bg-canvas px-2 py-0.5 text-xs text-ink placeholder:text-ink-4 focus:border-royal focus:outline-none"
            />
          )}
        </div>
      </div>
    </aside>
  )
}