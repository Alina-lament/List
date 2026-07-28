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

/** 返回 ISO 8601 周数 (1-53) */
export function getISOWeekNumber(dateStr: string): number {
  const d = parseDateKey(dateStr)
  const temp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  // 调整为周四（ISO 周以周四所在年份为准）
  const dayNum = (temp.getUTCDay() + 6) % 7
  temp.setUTCDate(temp.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(temp.getUTCFullYear(), 0, 4))
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDay)
  const weekNum = Math.round(((temp.getTime() - firstThursday.getTime()) / 86400000) / 7) + 1
  return weekNum
}

/** 将 42 天网格按每 7 天拆分为周数组 */
export function gridToWeeks(grid: string[]): string[][] {
  const weeks: string[][] = []
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7))
  }
  return weeks
}
