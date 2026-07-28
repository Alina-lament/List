import { Notification } from 'electron'
import type { TaskRepository } from '../db/repositories/taskRepo'

function formatLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function startReminderScheduler(tasks: TaskRepository): void {
  const check = () => {
    const now = new Date()
    const nowLocal = formatLocal(now)
    const today = nowLocal.slice(0, 10)
    const due = tasks.findDueReminders(nowLocal, today)
    for (const reminder of due) {
      new Notification({
        title: '任务提醒',
        body: `${reminder.title}\n截止 ${reminder.due_time}`,
      }).show()
      tasks.markReminded(reminder.task_id, nowLocal)
    }
  }

  check()
  setInterval(check, 60_000)
}
