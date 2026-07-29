import { useEffect, useRef } from 'react'

interface JournalEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function JournalEditor({ value, onChange, className = '' }: JournalEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Tab 键插入两个空格
  useEffect(() => {
    const el = ref.current
    if (!el) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !el) return
      e.preventDefault()
      const start = el.selectionStart
      const end = el.selectionEnd
      const before = el.value.slice(0, start)
      const after = el.value.slice(end)
      const insert = '  '
      el.value = before + insert + after
      el.selectionStart = el.selectionEnd = start + insert.length
      onChange(el.value)
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [onChange])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="记录今天的心情与故事…支持 Markdown 语法"
      spellCheck={false}
      className={`h-full w-full resize-none bg-transparent px-5 py-4 text-sm leading-relaxed text-ink placeholder:text-ink-4 focus:outline-none ${className}`}
    />
  )
}
