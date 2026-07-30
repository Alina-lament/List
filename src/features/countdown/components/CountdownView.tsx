import { useEffect, useState } from 'react'
import type { Countdown } from '@shared/types'
import { Button } from '@/components/ui/Button'
import { useCountdownStore } from '../store'
import { CountdownCard } from './CountdownCard'
import { CountdownEditor } from './CountdownEditor'

export function CountdownView() {
  const { countdowns, loading, init, create, update, delete: remove } = useCountdownStore()
  const [editing, setEditing] = useState<Countdown | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    void init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const active = countdowns.filter((c) => c.is_archived === 0)

  async function handleSave(data: { title: string; target_date: string; interval_days: number | null; bg_image_path?: string | null }) {
    if (editing) {
      await update(editing.id, {
        title: data.title,
        target_date: data.target_date,
        interval_days: data.interval_days,
        bg_image_path: data.bg_image_path ?? null,
      })
    } else {
      await create({
        title: data.title,
        target_date: data.target_date,
        interval_days: data.interval_days,
        bg_image_path: data.bg_image_path ?? null,
      })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-4 shadow-sm">
        <h2 className="text-lg font-bold text-ink">倒数日</h2>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          + 新建倒数日
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-3">加载中…</div>
        ) : active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 rounded-2xl bg-white p-4 shadow-xs ring-1 ring-ink/5">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-3">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink-2">暂无倒数日</p>
            <p className="mt-1 text-xs text-ink-4">创建生日、纪念日或重要日子的倒计时</p>
            <Button variant="primary" size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
              创建第一个倒数日
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {active.map((c) => (
              <CountdownCard key={c.id} countdown={c} onClick={() => setEditing(c)} />
            ))}
          </div>
        )}
      </div>

      <CountdownEditor
        open={showCreate || editing !== null}
        onClose={() => { setShowCreate(false); setEditing(null) }}
        countdown={editing}
        onSave={handleSave}
        onDelete={editing ? () => void remove(editing.id) : undefined}
      />
    </div>
  )
}
