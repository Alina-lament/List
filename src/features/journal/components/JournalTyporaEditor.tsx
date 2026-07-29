import { useEffect, useRef, useState } from 'react'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import './journal-typora-editor.css'

interface JournalTyporaEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

export function JournalTyporaEditor({ value, onChange, className = '' }: JournalTyporaEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const vditorRef = useRef<Vditor | null>(null)
  const initialValueRef = useRef(value)
  const isInternalChangeRef = useRef(false)
  const [ready, setReady] = useState(false)

  // 预加载中文 i18n，避免 Vditor 再去请求 CDN
  useEffect(() => {
    let mounted = true
    loadScript('./vditor/dist/js/i18n/zh_CN.js')
      .then(() => {
        if (mounted) setReady(true)
      })
      .catch(() => {
        // i18n 加载失败不影响编辑器初始化，只是提示语言为英文
        if (mounted) setReady(true)
      })
    return () => {
      mounted = false
    }
  }, [])

  // 初始化 Vditor（仅一次）
  useEffect(() => {
    if (!ready) return
    const el = containerRef.current
    if (!el || vditorRef.current) return

    const vditor = new Vditor(el, {
      mode: 'ir',
      theme: 'classic',
      icon: 'material',
      lang: 'zh_CN',
      // 使用本地静态资源，避免打包后无法访问 unpkg CDN
      cdn: './vditor',
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
  }, [ready, onChange])

  // 当外部 value 变化且不是由编辑器自身触发时，同步内容
  useEffect(() => {
    const vditor = vditorRef.current
    if (!vditor || isInternalChangeRef.current) return
    const current = vditor.getValue()
    if (current === value) return
    vditor.setValue(value)
  }, [value])

  if (!ready) {
    return (
      <div className={`flex h-full w-full items-center justify-center text-sm text-ink-3 ${className}`}>
        编辑器加载中…
      </div>
    )
  }

  return <div ref={containerRef} className={`h-full w-full overflow-hidden ${className}`} />
}
