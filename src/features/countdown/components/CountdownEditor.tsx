import { useEffect, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import type { Countdown } from '@shared/types'
import { api } from '@/lib/api'
import { todayKey } from '@/lib/date-utils'

export interface CountdownEditorProps {
  open: boolean
  onClose: () => void
  countdown: Countdown | null
  onSave: (data: { title: string; target_date: string; interval_days: number | null; bg_image_path?: string | null }) => Promise<void>
  onDelete?: () => void
}

export function CountdownEditor({ open, onClose, countdown, onSave, onDelete }: CountdownEditorProps) {
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [intervalDays, setIntervalDays] = useState('')
  const [bgImagePath, setBgImagePath] = useState<string | null>(null)
  const [bgPreview, setBgPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (countdown) {
      setTitle(countdown.title)
      setTargetDate(countdown.target_date)
      setIntervalDays(countdown.interval_days?.toString() ?? '')
      setBgImagePath(countdown.bg_image_path ?? null)
      if (countdown.bg_image_path) {
        void api.getCountdownBgDataUrl(countdown.id).then((url) => setBgPreview(url))
      } else {
        setBgPreview(null)
      }
    } else {
      setTitle('')
      setTargetDate(todayKey())
      setIntervalDays('')
      setBgImagePath(null)
      setBgPreview(null)
    }
  }, [open, countdown])

  async function handleSubmit() {
    const name = title.trim()
    if (!name || !targetDate) return
    setSubmitting(true)
    try {
      await onSave({
        title: name,
        target_date: targetDate,
        interval_days: intervalDays ? Number(intervalDays) : null,
        bg_image_path: bgImagePath,
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBgUpload() {
    if (!countdown) return
    const path = await api.openImageFileDialog()
    if (!path) return
    const updated = await api.setCountdownBg(countdown.id, path)
    setBgImagePath(updated.bg_image_path)
    const url = await api.getCountdownBgDataUrl(countdown.id)
    setBgPreview(url)
  }

  async function handleBgClear() {
    if (!countdown) return
    await api.updateCountdown(countdown.id, { bg_image_path: null })
    setBgImagePath(null)
    setBgPreview(null)
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card-xl ring-1 ring-ink/5">
          <DialogTitle className="mb-5 text-xl font-bold text-ink">
            {countdown ? '编辑倒数日' : '新建倒数日'}
          </DialogTitle>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-3">标题</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：生日、纪念日、项目截止"
                className="w-full rounded-xl border border-canvas-3 bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal-50/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-3">目标日期</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-xl border border-canvas-3 bg-canvas px-3 py-2 text-sm text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal-50/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-3">重复间隔（天，留空不重复）</label>
              <input
                type="number"
                min={1}
                value={intervalDays}
                onChange={(e) => setIntervalDays(e.target.value)}
                placeholder="例如：365"
                className="w-full rounded-xl border border-canvas-3 bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal-50/50"
              />
            </div>

            {countdown && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-3">背景图</label>
                <div className="flex items-center gap-3">
                  {bgPreview ? (
                    <div className="relative h-16 w-28 overflow-hidden rounded-xl border border-canvas-3">
                      <img src={bgPreview} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => void handleBgClear()}
                        className="absolute right-1 top-1 rounded bg-ink/60 px-1.5 py-0.5 text-[10px] text-white hover:bg-ink/80"
                      >
                        清除
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-16 w-28 items-center justify-center rounded-xl border border-dashed border-canvas-3 bg-canvas text-xs text-ink-4">
                      无背景
                    </div>
                  )}
                  <button
                    onClick={() => void handleBgUpload()}
                    className="rounded-lg bg-royal px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-royal-dark"
                  >
                    上传图片
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            {countdown && onDelete && (
              <button
                onClick={() => { onDelete(); onClose() }}
                className="mr-auto rounded-lg px-3 py-2 text-sm font-medium text-prihigh transition-colors hover:bg-red-50"
              >
                删除
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-3 transition-colors hover:bg-canvas-2"
            >
              取消
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={!title.trim() || !targetDate || submitting}
              className="rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-royal-dark disabled:opacity-40"
            >
              {countdown ? '保存' : '创建'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
