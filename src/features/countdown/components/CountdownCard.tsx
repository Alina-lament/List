import { useEffect, useState } from 'react'
import type { Countdown } from '@shared/types'
import { todayKey } from '@/lib/date-utils'
import { api } from '@/lib/api'

export interface CountdownCardProps {
  countdown: Countdown
  onClick: () => void
}

function daysUntil(targetDate: string): number {
  const today = new Date(todayKey())
  const target = new Date(targetDate)
  const diff = target.getTime() - today.getTime()
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

export function CountdownCard({ countdown, onClick }: CountdownCardProps) {
  const [bgUrl, setBgUrl] = useState<string | null>(null)
  const remaining = daysUntil(countdown.target_date)

  useEffect(() => {
    if (!countdown.bg_image_path) {
      setBgUrl(null)
      return
    }
    let mounted = true
    api.getCountdownBgDataUrl(countdown.id)
      .then((url) => {
        if (mounted) setBgUrl(url)
      })
      .catch(() => {
        if (mounted) setBgUrl(null)
      })
    return () => {
      mounted = false
    }
  }, [countdown.id, countdown.bg_image_path])

  const label = remaining === 0 ? '今天' : remaining > 0 ? `还有 ${remaining} 天` : `已过去 ${Math.abs(remaining)} 天`

  return (
    <button
      onClick={onClick}
      className="group relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-2xl border border-canvas-3 bg-white p-4 text-left shadow-card transition-all hover:shadow-card-lg"
    >
      {bgUrl && (
        <img
          src={bgUrl}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40 transition-opacity group-hover:opacity-50"
        />
      )}
      <div className="relative z-10">
        <h3 className="line-clamp-2 text-base font-bold text-ink">{countdown.title}</h3>
        <p className="mt-1 text-xs text-ink-3">{countdown.target_date}</p>
      </div>
      <div className="relative z-10 flex items-end justify-between">
        <span className={`text-3xl font-extrabold tracking-tight ${remaining === 0 ? 'text-royal' : remaining < 0 ? 'text-ink-3' : 'text-ink'}`}>
          {remaining === 0 ? '今天' : Math.abs(remaining)}
        </span>
        <span className="mb-1 text-[11px] font-medium text-ink-3">{label}</span>
      </div>
    </button>
  )
}
