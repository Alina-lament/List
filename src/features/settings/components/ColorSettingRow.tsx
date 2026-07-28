import { ColorPicker } from '@/components/ui/ColorPicker'

interface ColorSettingRowProps {
  label: string
  value: string
  onChange: (color: string) => void
}

export function ColorSettingRow({ label, value, onChange }: ColorSettingRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-xs ring-1 ring-ink/5 transition-all hover:shadow-card">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="flex items-center gap-3">
        <span
          className="h-7 w-7 rounded-lg border border-canvas-3 shadow-sm"
          style={{ backgroundColor: value }}
        />
        <ColorPicker value={value} onChange={onChange} />
      </div>
    </div>
  )
}
