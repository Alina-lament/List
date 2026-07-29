import type { JournalEntry } from '@shared/types'
import dayjs from 'dayjs'
import { JournalPreview } from './JournalPreview'

interface LastYearPanelProps {
  entry: JournalEntry | null
  currentDate: string
}

export function LastYearPanel({ entry, currentDate }: LastYearPanelProps) {
  if (!entry) return null

  const lastYearDate = dayjs(currentDate).subtract(1, 'year').format('YYYY-MM-DD')

  return (
    <div className="rounded-2xl bg-white/60 p-4 shadow-card ring-1 ring-white/40 backdrop-blur-sm">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-2 uppercase">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 8v4l3 3M3 12a9 9 0 1 1 18 0 9 9 0 0 1-18 0" strokeLinecap="round" />
        </svg>
        去年今日 · {lastYearDate}
      </h3>
      <div className="max-h-48 overflow-y-auto rounded-xl bg-canvas-2/50 p-3">
        <JournalPreview content={entry.content} placeholder="去年今日没有内容" />
      </div>
    </div>
  )
}
