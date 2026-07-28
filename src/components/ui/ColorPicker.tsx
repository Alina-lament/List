// 明亮高对比预设色板：饱和度高、区分明显
const PRESET_COLORS = [
  '#2563eb', // 钴蓝
  '#0891b2', // 青蓝
  '#10b981', // 亮绿
  '#f59e0b', // 亮橙
  '#ef4444', // 亮红
  '#ec4899', // 玫红
  '#8b5cf6', // 紫罗兰
  '#64748b', // 石板灰
]

export function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="flex gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
            value === color ? 'ring-2 ring-ink ring-offset-2 ring-offset-canvas' : ''
          }`}
          style={{ backgroundColor: color }}
          aria-label={color}
        />
      ))}
    </div>
  )
}