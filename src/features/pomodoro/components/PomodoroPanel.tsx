import { useEffect, useMemo, useRef, useState } from 'react'
import { usePomodoroStore, type PomodoroMode } from '../store'
import { useTasksStore } from '@/features/tasks/store'
import { useSettingsStore } from '@/features/settings/store'
import { todayKey } from '@/lib/date-utils'

const PRESETS = [15, 25, 45, 60]

type TaskTab = 'today' | 'list'

function formatTime(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60)
  const s = Math.max(0, totalSeconds) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function TomatoMark({ completed, imageUrl }: { completed: boolean; imageUrl?: string | null }) {
  return (
    <div
      className={`relative h-24 w-24 shrink-0 transition-transform duration-500 ${
        completed ? 'tomato-pop scale-110' : 'opacity-90'
      }`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full object-contain" />
      ) : (
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="tomatoRipe" cx="35%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#ff8a7d" />
            <stop offset="55%" stopColor="#f0524d" />
            <stop offset="100%" stopColor="#c22f32" />
          </radialGradient>
        </defs>
        <rect x="56" y="20" width="8" height="16" rx="4" fill="#6b7c3a" />
        <path d="M60 32c-5-12-19-16-27-10 8 0 15 3 20 10z" fill="#4c9f54" />
        <path d="M60 31c3-13 16-19 26-13-9 1-16 5-20 12z" fill="#58b45f" />
        <path d="M60 33c8-9 21-8 27-1-9-1-16 0-21 4z" fill="#4c9f54" />
        <path d="M60 33c-8-7-19-5-25 2 7-3 14-2 20 1z" fill="#58b45f" />
        <path
          d="M60 40c-28 1-38 24-23 36 9 8 37 8 46 0 15-12 5-35-23-36z"
          fill={completed ? 'url(#tomatoRipe)' : '#f9c2bc'}
          stroke={completed ? '#c22f32' : '#f0a6a0'}
          strokeWidth="1.5"
        />
        {!completed && (
          <g>
            <circle cx="52" cy="66" r="9" fill="#ffffff" opacity="0.45" />
            <path d="M72 62v8M68 66h8" stroke="#e58f88" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
        {completed && (
          <g>
            <circle cx="48" cy="60" r="2.4" fill="#7f1d1d" />
            <circle cx="72" cy="60" r="2.4" fill="#7f1d1d" />
            <path d="M46 70c5 5 23 5 28 0" fill="none" stroke="#7f1d1d" strokeWidth="2.4" strokeLinecap="round" />
            <ellipse cx="38" cy="48" rx="7" ry="11" fill="#ffffff" opacity="0.4" transform="rotate(-18 38 48)" />
          </g>
        )}
        </svg>
      )}
      {completed && (
        <div className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-prilow text-white shadow-md">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  )
}

export function PomodoroPanel() {
  const {
    mode,
    isRunning,
    durationMinutes,
    totalSeconds,
    remainingSeconds,
    selectedTaskId,
    stopwatchElapsed,
    lastCompletedAt,
    init,
    setMode,
    setDuration,
    setSelectedTaskId,
    startTimer,
    pauseTimer,
    resetTimer,
    completeTimer,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
    completeStopwatch,
  } = usePomodoroStore()

  const { lists, tasksByList, init: initTasks } = useTasksStore()
  const tomatoImageDataUrl = useSettingsStore((s) => s.tomatoImageDataUrl)
  const [customDuration, setCustomDuration] = useState(String(durationMinutes))
  const [showDurationMenu, setShowDurationMenu] = useState(false)

  // 任务选择器状态
  const [showTaskSelector, setShowTaskSelector] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [taskTab, setTaskTab] = useState<TaskTab>('today')
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const taskSelectorRef = useRef<HTMLDivElement>(null)

  // 时间编辑
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [timeInput, setTimeInput] = useState(String(Math.floor(remainingSeconds / 60)))

  useEffect(() => {
    void init()
    if (lists.length === 0) {
      void initTasks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setCustomDuration(String(durationMinutes))
  }, [durationMinutes])

  useEffect(() => {
    if (!isEditingTime) {
      setTimeInput(String(Math.floor(remainingSeconds / 60)))
    }
  }, [remainingSeconds, isEditingTime])

  // 点击外部关闭任务选择器
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (taskSelectorRef.current && !taskSelectorRef.current.contains(e.target as Node)) {
        setShowTaskSelector(false)
      }
    }
    if (showTaskSelector) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTaskSelector])

  const allTasks = useMemo(() => {
    const arr = Object.values(tasksByList).flat()
    const map = new Map(arr.map((t) => [t.id, t]))
    return Array.from(map.values())
      .filter((t) => t.is_completed === 0)
      .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  }, [tasksByList])

  const selectedTask = useMemo(
    () => allTasks.find((t) => t.id === selectedTaskId),
    [allTasks, selectedTaskId],
  )

  const today = todayKey()
  const todayTasks = useMemo(() => {
    return allTasks.filter(
      (t) => t.due_date === today || t.start_date === today,
    )
  }, [allTasks, today])

  const listTasks = useMemo(() => {
    if (!selectedListId) return []
    return (tasksByList[selectedListId] ?? [])
      .filter((t) => t.is_completed === 0)
      .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  }, [tasksByList, selectedListId])

  const filteredTasks = useMemo(() => {
    const source = taskTab === 'today' ? todayTasks : listTasks
    if (!taskSearch.trim()) return source
    const query = taskSearch.trim().toLowerCase()
    return source.filter((t) => t.title.toLowerCase().includes(query))
  }, [taskTab, todayTasks, listTasks, taskSearch])

  const progress =
    mode === 'countdown' && totalSeconds > 0
      ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100
      : 0

  const displaySeconds = mode === 'countdown' ? remainingSeconds : stopwatchElapsed
  const justCompleted = lastCompletedAt !== null && !isRunning

  function handleCustomBlur() {
    const n = Number(customDuration)
    if (Number.isFinite(n) && n > 0) {
      setDuration(n)
    } else {
      setCustomDuration(String(durationMinutes))
    }
  }

  function startEditingTime() {
    if (mode !== 'countdown' || isRunning) return
    setIsEditingTime(true)
    setTimeInput(String(Math.floor(remainingSeconds / 60)))
  }

  function commitTimeInput() {
    const n = Number(timeInput)
    if (Number.isFinite(n) && n > 0 && n <= 180) {
      setDuration(n)
    }
    setIsEditingTime(false)
  }

  function cancelTimeInput() {
    setIsEditingTime(false)
    setTimeInput(String(Math.floor(remainingSeconds / 60)))
  }

  function handleModeChange(next: PomodoroMode) {
    if (isRunning) return
    setMode(next)
  }

  function handlePrimaryAction() {
    if (mode === 'countdown') {
      if (isRunning) pauseTimer()
      else startTimer()
    } else {
      if (isRunning) pauseStopwatch()
      else startStopwatch()
    }
  }

  function handleComplete() {
    if (mode === 'countdown') {
      void completeTimer(true)
    } else {
      void completeStopwatch()
    }
  }

  function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId)
    setShowTaskSelector(false)
    setTaskSearch('')
  }

  function handleClearTask() {
    setSelectedTaskId(null)
    setShowTaskSelector(false)
    setTaskSearch('')
  }

  function openTaskSelector() {
    if (isRunning) return
    setShowTaskSelector(true)
    setTaskSearch('')
    // 默认选中第一个非今日清单（若当前在清单标签且无选中）
    if (taskTab === 'list' && !selectedListId && lists.length > 0) {
      const first = lists.find((l) => l.name !== '今日')
      setSelectedListId(first?.id ?? lists[0]?.id ?? null)
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-card">
      {/* 头部 */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-ink">番茄专注</h2>
          <div className="flex items-center rounded-full bg-canvas-2 p-1">
            <button
              onClick={() => handleModeChange('countdown')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                mode === 'countdown'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              番茄计时
            </button>
            <button
              onClick={() => handleModeChange('stopwatch')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                mode === 'stopwatch'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              正计时
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowDurationMenu((v) => !v)}
            className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-canvas-2 hover:text-ink"
            title="选择专注时长"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
          <button className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-canvas-2 hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
              <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
              <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      </div>

      {/* 时长快捷菜单 */}
      {showDurationMenu && mode === 'countdown' && (
        <div className="mb-4 rounded-xl border border-canvas-3 bg-canvas p-3 text-xs text-ink-2">
          <div className="mb-2 font-medium text-ink">选择时长</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => {
                  setDuration(m)
                  setShowDurationMenu(false)
                }}
                disabled={isRunning}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  durationMinutes === m
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-white text-ink-2 hover:bg-canvas-3'
                }`}
              >
                {m} 分钟
              </button>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={180}
                value={customDuration}
                disabled={isRunning}
                onChange={(e) => setCustomDuration(e.target.value)}
                onBlur={handleCustomBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomBlur()
                    setShowDurationMenu(false)
                  }
                }}
                className="w-14 rounded-lg border border-canvas-3 bg-white px-2 py-1 text-center text-xs text-ink focus:border-amber-400 focus:outline-none disabled:opacity-50"
              />
              <span className="text-xs text-ink-3">分钟</span>
            </div>
          </div>
        </div>
      )}

      {/* 专注主题 / 任务选择器 */}
      <div className="relative mb-6 self-center" ref={taskSelectorRef}>
        <button
          onClick={openTaskSelector}
          disabled={isRunning}
          className="flex items-center gap-1 rounded-full bg-canvas-2 px-4 py-1.5 text-sm text-ink transition-colors hover:bg-canvas-3 disabled:opacity-50"
        >
          {selectedTask ? (
            <span className="max-w-[240px] truncate">{selectedTask.title}</span>
          ) : (
            <span className="text-ink-3">专注</span>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {showTaskSelector && (
          <div className="absolute left-1/2 top-full z-20 mt-2 w-80 -translate-x-1/2 rounded-xl border border-canvas-3 bg-white p-3 shadow-lg">
            {/* 搜索框 */}
            <div className="relative mb-3">
              <svg
                className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                type="text"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="搜索任务"
                autoFocus
                className="w-full rounded-lg border border-canvas-3 bg-canvas py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-ink-3 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* 标签切换 */}
            <div className="mb-3 flex items-center gap-2 border-b border-canvas-3 pb-2">
              <button
                onClick={() => setTaskTab('today')}
                className={`text-xs font-medium transition-colors ${
                  taskTab === 'today' ? 'text-ink' : 'text-ink-3 hover:text-ink'
                }`}
              >
                今日
              </button>
              <button
                onClick={() => {
                  setTaskTab('list')
                  if (!selectedListId && lists.length > 0) {
                    const first = lists.find((l) => l.name !== '今日')
                    setSelectedListId(first?.id ?? lists[0]?.id ?? null)
                  }
                }}
                className={`text-xs font-medium transition-colors ${
                  taskTab === 'list' ? 'text-ink' : 'text-ink-3 hover:text-ink'
                }`}
              >
                清单
              </button>
            </div>

            {/* 清单选择（仅在清单标签下） */}
            {taskTab === 'list' && (
              <div className="mb-3">
                <select
                  value={selectedListId ?? ''}
                  onChange={(e) => setSelectedListId(e.target.value || null)}
                  className="w-full rounded-lg border border-canvas-3 bg-canvas px-2.5 py-1.5 text-xs text-ink focus:border-amber-400 focus:outline-none"
                >
                  <option value="">选择清单</option>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 任务列表 */}
            <div className="max-h-56 overflow-y-auto">
              {filteredTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-ink-3">
                  {taskTab === 'today' ? '今日没有任务' : '该清单没有任务'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleSelectTask(task.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                        selectedTaskId === task.id
                          ? 'bg-amber-50 text-amber-700'
                          : 'text-ink hover:bg-canvas-2'
                      }`}
                    >
                      <span className="truncate">{task.title}</span>
                      {selectedTaskId === task.id && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 清除选择 */}
            {selectedTaskId && (
              <div className="mt-2 border-t border-canvas-3 pt-2">
                <button
                  onClick={handleClearTask}
                  className="w-full rounded-lg py-1.5 text-xs text-ink-3 transition-colors hover:bg-canvas-2 hover:text-ink"
                >
                  清除选择
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 大圆环计时器 */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative flex h-64 w-64 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#e5e7eb" strokeWidth="1.5" />
            {mode === 'countdown' && (
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke={justCompleted ? '#ef4444' : '#1f2937'}
                strokeWidth="1.5"
                strokeDasharray={`${progress * 2.89} 289`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <TomatoMark key={lastCompletedAt ?? 'idle'} completed={justCompleted} imageUrl={tomatoImageDataUrl} />
            {isEditingTime ? (
              <input
                type="number"
                min={1}
                max={180}
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                onBlur={commitTimeInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTimeInput()
                  if (e.key === 'Escape') cancelTimeInput()
                }}
                autoFocus
                className="w-32 bg-transparent text-center text-5xl font-light tracking-tight text-ink focus:outline-none"
              />
            ) : (
              <button
                onClick={startEditingTime}
                disabled={mode !== 'countdown' || isRunning}
                className="text-5xl font-light tracking-tight text-ink transition-opacity hover:opacity-70 disabled:cursor-default disabled:opacity-100"
                title={mode === 'countdown' && !isRunning ? '点击输入分钟数' : ''}
              >
                {formatTime(displaySeconds)}
              </button>
            )}
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="mt-10 flex items-center gap-4">
          <button
            onClick={handlePrimaryAction}
            className="min-w-[120px] rounded-full bg-ink px-8 py-3 text-sm font-medium text-white shadow-md transition-transform hover:scale-105 active:scale-95"
          >
            {isRunning ? '暂停' : '开始'}
          </button>
          {isRunning && (
            <button
              onClick={handleComplete}
              className="rounded-full border border-canvas-3 bg-white px-6 py-3 text-sm font-medium text-ink-2 transition-colors hover:bg-canvas-2"
            >
              完成
            </button>
          )}
          {!isRunning && (justCompleted || (displaySeconds > 0 && displaySeconds !== totalSeconds)) && (
            <button
              onClick={mode === 'countdown' ? resetTimer : resetStopwatch}
              className="rounded-full border border-canvas-3 bg-white px-6 py-3 text-sm font-medium text-ink-2 transition-colors hover:bg-canvas-2"
            >
              重置
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
