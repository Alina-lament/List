import { useEffect, useRef } from 'react'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import './journal-typora-editor.css'

interface JournalTyporaEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function JournalTyporaEditor({ value, onChange, className = '' }: JournalTyporaEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const vditorRef = useRef<Vditor | null>(null)
  const initialValueRef = useRef(value)
  const isInternalChangeRef = useRef(false)

  // 初始化 Vditor（仅一次）
  useEffect(() => {
    const el = containerRef.current
    if (!el || vditorRef.current) return

    const vditor = new Vditor(el, {
      mode: 'ir',
      theme: 'classic',
      icon: 'material',
      value: initialValueRef.current,
      placeholder: '记录今天的心情与故事…',
      minHeight: 0,
      width: '100%',
      toolbar: [],
      toolbarConfig: { hide: true },
      cache: { enable: false },
      counter: { enable: false },
      resize: { enable: false },
      preview: { delay: 0 },
      input: (md) => {
        isInternalChangeRef.current = true
        onChange(md)
        // 重置标记，允许外部 value 在下一帧同步
        requestAnimationFrame(() => {
          isInternalChangeRef.current = false
        })
      },
      after: () => {
        // 初始化完成后确保高度占满父容器
        const editorEl = el.querySelector('.vditor') as HTMLElement | null
        if (editorEl) {
          editorEl.style.height = '100%'
          editorEl.style.border = 'none'
        }
        const textArea = el.querySelector('.vditor-ir__block[data-type="pre"]') as HTMLElement | null
        if (textArea) textArea.focus()
      },
    })

    vditorRef.current = vditor

    return () => {
      try {
        vditor.destroy()
      } catch {
        // ignore
      }
      vditorRef.current = null
    }
  }, [onChange])

  // 当外部 value 变化且不是由编辑器自身触发时，同步内容
  useEffect(() => {
    const vditor = vditorRef.current
    if (!vditor || isInternalChangeRef.current) return
    const current = vditor.getValue()
    if (current === value) return
    vditor.setValue(value)
  }, [value])

  return <div ref={containerRef} className={`h-full w-full overflow-hidden ${className}`} />
}
