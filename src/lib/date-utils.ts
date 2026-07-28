export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Date → 'YYYY-MM-DD'（本地时区） */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 'YYYY-MM-DD' → 本地零点 Date */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return dateKey(new Date())
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = (year * 12 + (month - 1)) + delta
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
}

/** 返回覆盖整月的 6×7 = 42 天网格（周一起始）的 dateKey 数组 */
export function getMonthGrid(year: number, month: number): string[] {
  const first = new Date(year, month - 1, 1)
  // 周一为一周起点：Mon=0 ... Sun=6
  const startOffset = (first.getDay() + 6) % 7
  const gridStart = new Date(year, month - 1, 1 - startOffset)
  const days: string[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    days.push(dateKey(d))
  }
  return days
}

export function formatMonthTitle(year: number, month: number): string {
  return `${year}年${month}月`
}

export function isToday(key: string): boolean {
  return key === todayKey()
}

export function isCurrentMonth(key: string, year: number, month: number): boolean {
  const [y, m] = key.split('-').map(Number)
  return y === year && m === month
}

export function formatLocalDateTime(d: Date): string {
  return `${dateKey(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}
