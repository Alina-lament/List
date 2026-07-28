import { useEffect, useRef, useState } from 'react'
import { useCalendarStore } from '@/features/calendar/store'
import { dateKey } from '@/lib/date-utils'

interface Toast {
  id: string
  title: string
  time: string
}

/** 应用内提醒 toast：主进程系统通知的冗余通道（通知权限被拒时兜底） */
export function useReminderToasts(): { toasts: Toast[]; dismiss: (id: string) => void } {
  const [toasts, setToasts] = useState<Toast[]>([])
  const shownRef = useRef(new Set<string>())

  useEffect(() => {
    // 未打开过日历视图时主动拉取一次，保证 toast 有数据源
    const initial = useCalendarStore.getState()
    if (!initial.loaded) void initial.fetchMonth()

    const check = () => {
      const { instancesByDate } = useCalendarStore.getState()
      if (Object.keys(instancesByDate).length === 0) return

      const now = new Date()
      const today = dateKey(now)
      const nowMinutes = now.getHours() * 60 + now.getMinutes()

      for (const instance of instancesByDate[today] ?? []) {
        if (instance.is_completed) continue
        if (instance.reminder_minutes == null || !instance.due_time) continue
        const [h, m] = instance.due_time.split(':').map(Number)
        const remindAt = h * 60 + m - instance.reminder_minutes
        if (nowMinutes < remindAt) continue

        const key = instance.instance_id
        if (shownRef.current.has(key)) continue
        shownRef.current.add(key)

        const toast: Toast = { id: key, title: instance.title, time: instance.due_time }
        setToasts((prev) => [...prev, toast])
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== key))
        }, 10_000)
      }
    }

    check()
    const timer = setInterval(check, 30_000)
    return () => clearInterval(timer)
  }, [])

  return {
    toasts,
    dismiss: (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
  }
}

export function ReminderToastHost() {
  const { toasts, dismiss } = useReminderToasts()
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 rounded-lg bg-ink px-4 py-2.5 text-sm text-white shadow-card-lg"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-royal-light"
          >
            <path
              d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            <span className="font-semibold text-royal-light">提醒：</span>
            {t.title}
            <span className="ml-2 text-xs text-ink-4">{t.time}</span>
          </span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-ink-4 transition-colors hover:text-white"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
