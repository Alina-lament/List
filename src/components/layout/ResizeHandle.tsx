import { useCallback, useRef, useState } from 'react'

interface ResizeHandleProps {
  /** 'right'：面板在把手左边，向右拖变宽；'left'：面板在把手右边，向左拖变宽 */
  direction: 'left' | 'right'
  width: number
  min: number
  max: number
  defaultWidth: number
  /** 拖动过程中实时回调 */
  onChange: (width: number) => void
  /** 拖动结束（或双击重置）回调，用于持久化 */
  onCommit?: (width: number) => void
}

/** 竖直分隔条：拖拽调节相邻面板宽度，双击恢复默认 */
export function ResizeHandle({ direction, width, min, max, defaultWidth, onChange, onCommit }: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false)
  const startRef = useRef({ x: 0, width: 0 })

  const calcWidth = useCallback(
    (clientX: number) => {
      const dx = clientX - startRef.current.x
      const raw = direction === 'right' ? startRef.current.width + dx : startRef.current.width - dx
      return Math.min(max, Math.max(min, raw))
    },
    [direction, min, max],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      startRef.current = { x: e.clientX, width }
      const el = e.currentTarget
      el.setPointerCapture(e.pointerId)
      setDragging(true)
      document.body.style.cursor = 'col-resize'

      const onMove = (ev: PointerEvent) => onChange(calcWidth(ev.clientX))
      const onUp = (ev: PointerEvent) => {
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onUp)
        el.removeEventListener('pointercancel', onUp)
        setDragging(false)
        document.body.style.cursor = ''
        onCommit?.(calcWidth(ev.clientX))
      }
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onUp)
      el.addEventListener('pointercancel', onUp)
    },
    [width, calcWidth, onChange, onCommit],
  )

  const reset = useCallback(() => {
    onChange(defaultWidth)
    onCommit?.(defaultWidth)
  }, [defaultWidth, onChange, onCommit])

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="拖拽调整宽度，双击恢复默认"
      title="拖拽调整宽度，双击恢复默认"
      onPointerDown={handlePointerDown}
      onDoubleClick={reset}
      style={{ touchAction: 'none' }}
      className="group relative w-[5px] shrink-0 cursor-col-resize"
    >
      <div
        className={`absolute inset-y-0 left-1/2 -translate-x-1/2 transition-colors duration-150 ${
          dragging ? 'w-0.5 bg-royal' : 'w-px bg-canvas-3 group-hover:w-0.5 group-hover:bg-royal'
        }`}
      />
    </div>
  )
}
