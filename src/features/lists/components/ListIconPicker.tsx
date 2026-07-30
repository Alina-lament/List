import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useTasksStore } from '@/features/tasks/store'

export interface ListIconPickerProps {
  listId: string
  onClose: () => void
}

export function ListIconPicker({ listId, onClose }: ListIconPickerProps) {
  const { setListIconFromBuiltin, updateListIcon, clearListIcon } = useTasksStore()
  const [builtins, setBuiltins] = useState<{ name: string; content: string }[]>([])
  const [loading, setLoading] = useState(true)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true
    api.listBuiltinIcons()
      .then((icons) => {
        if (mounted) {
          setBuiltins(icons)
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  // 点击外部关闭
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  async function handleUpload() {
    const path = await api.openImageFileDialog()
    if (path) {
      await updateListIcon(listId, path)
      onClose()
    }
  }

  async function handleSelect(name: string) {
    await setListIconFromBuiltin(listId, name)
    onClose()
  }

  async function handleClear() {
    await clearListIcon(listId)
    onClose()
  }

  return (
    <div
      ref={wrapperRef}
      className="w-44 rounded-xl border border-canvas-3 bg-white p-2.5 shadow-card-xl"
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-3">选择图标</p>
      {loading ? (
        <div className="py-3 text-center text-xs text-ink-4">加载中…</div>
      ) : builtins.length === 0 ? (
        <div className="py-3 text-center text-xs text-ink-4">暂无内置图标</div>
      ) : (
        <div className="grid grid-cols-5 gap-1">
          {builtins.map((b) => (
            <button
              key={b.name}
              onClick={() => void handleSelect(b.name)}
              title={b.name}
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-canvas-2"
              dangerouslySetInnerHTML={{ __html: b.content }}
            />
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-1.5 border-t border-canvas-3 pt-2">
        <button
          onClick={() => void handleUpload()}
          className="flex flex-1 items-center justify-center gap-1 rounded-md bg-royal px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-royal-dark"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          上传
        </button>
        <button
          onClick={() => void handleClear()}
          className="rounded-md px-2 py-1 text-[10px] font-medium text-ink-3 transition-colors hover:bg-canvas-2 hover:text-prihigh"
        >
          清除
        </button>
      </div>
    </div>
  )
}
