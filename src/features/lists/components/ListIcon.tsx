import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { List } from '@shared/types'

export function ListIcon({ list, size = 16 }: { list: List; size?: number }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!list.icon) {
      setUrl(null)
      return
    }
    let mounted = true
    api.getListIconDataUrl(list.id).then((dataUrl) => {
      if (mounted) setUrl(dataUrl)
    })
    return () => { mounted = false }
  }, [list.id, list.icon])

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className="shrink-0 rounded-full shadow-sm"
      style={{ width: size * 0.75, height: size * 0.75, backgroundColor: list.color }}
    />
  )
}
