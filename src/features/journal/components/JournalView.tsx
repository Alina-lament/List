import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { useJournalStore } from '../store'
import { JournalEditor } from './JournalEditor'
import { JournalPreview } from './JournalPreview'
import { JournalCalendar } from './JournalCalendar'
import { LastYearPanel } from './LastYearPanel'

const MODE_LABELS = {
  edit: '编辑',
  preview: '预览',
  split: '分屏',
}

export function JournalView() {
  const {
    currentDate,
    content,
    lastYearEntry,
    markedDates,
    loading,
    saving,
    mode,
    error,
    init,
    setContent,
    setMode,
    goPrevDay,
    goNextDay,
    goToday,
    goDate,
    loadMarkedDates,
    clearError,
  } = useJournalStore()

  const [calMonth, setCalMonth] = useState(() => {
    const d = dayjs(currentDate)
    return { year: d.year(), month: d.month() + 1 }
  })

  useEffect(() => {
    void init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const d = dayjs(currentDate)
    setCalMonth({ year: d.year(), month: d.month() + 1 })
    void loadMarkedDates(d.year(), d.month() + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey || e.metaKey) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        void goPrevDay()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        void goNextDay()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goPrevDay, goNextDay])

  async function handleSelectDate(date: string) {
    await goDate(date)
  }

  function handleChangeMonth(year: number, month: number) {
    setCalMonth({ year, month })
    void loadMarkedDates(year, month)
  }

  const showEditor = mode === 'edit' || mode === 'split'
  const showPreview = mode === 'preview' || mode === 'split'

  return (
    <div className="flex h-full flex-col">
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => void goPrevDay()}
            className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-canvas-2 hover:text-ink"
            aria-label="前一天"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="min-w-[120px] text-center text-sm font-semibold text-ink">
            {dayjs(currentDate).format('YYYY年M月D日')}
          </span>
          <button
            onClick={() => void goNextDay()}
            className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-canvas-2 hover:text-ink"
            aria-label="后一天"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => void goToday()}
            className="ml-2 rounded-lg bg-canvas-2 px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:bg-canvas-3 hover:text-ink"
          >
            今天
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-canvas-2/70 p-1 ring-1 ring-canvas-3/40">
          {(Object.keys(MODE_LABELS) as Array<keyof typeof MODE_LABELS>).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                mode === m ? 'bg-white text-ink shadow-xs' : 'text-ink-3 hover:text-ink'
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        {/* 编辑/预览区 */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white/70 shadow-card ring-1 ring-white/40 backdrop-blur-sm">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-ink-3">加载中…</div>
          ) : (
            <div className="flex min-h-0 flex-1">
              {showEditor && (
                <div className={`flex min-h-0 flex-col ${showPreview ? 'w-1/2 border-r border-canvas-3/30' : 'w-full'}`}>
                  <div className="flex items-center justify-between border-b border-canvas-3/30 px-4 py-2">
                    <span className="text-xs font-medium text-ink-3">编辑</span>
                    {saving && <span className="text-[10px] text-ink-4">保存中…</span>}
                  </div>
                  <div className="min-h-0 flex-1">
                    <JournalEditor value={content} onChange={setContent} className="h-full" />
                  </div>
                </div>
              )}
              {showPreview && (
                <div className={`flex min-h-0 flex-col ${showEditor ? 'w-1/2' : 'w-full'}`}>
                  <div className="border-b border-canvas-3/30 px-4 py-2 text-xs font-medium text-ink-3">预览</div>
                  <div className="min-h-0 flex-1">
                    <JournalPreview content={content} className="h-full" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧导航 */}
        <div className="flex w-64 shrink-0 flex-col gap-4">
          <div className="rounded-2xl bg-white/70 p-4 shadow-card ring-1 ring-white/40 backdrop-blur-sm">
            <JournalCalendar
              year={calMonth.year}
              month={calMonth.month}
              selectedDate={currentDate}
              markedDates={markedDates}
              onSelect={(date) => void handleSelectDate(date)}
              onChangeMonth={handleChangeMonth}
            />
          </div>
          <LastYearPanel entry={lastYearEntry} currentDate={currentDate} />
        </div>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-prihigh px-4 py-2 text-sm font-medium text-white shadow-card-lg">
          {error}
          <button onClick={clearError} className="font-bold">
            ×
          </button>
        </div>
      )}
    </div>
  )
}
