// 现代明亮预设色板
const PRESET_COLORS = [
  '#4f6ef7', // 靛蓝
  '#06b6d4', // 青色
  '#22c55e', // 翠绿
  '#f59e0b', // 琥珀
  '#f43f5e', // 玫红
  '#ec4899', // 粉红
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
          className={`h-7 w-7 rounded-full shadow-sm transition-all duration-150 hover:scale-110 ${
            value === color ? 'ring-2 ring-ink ring-offset-2 ring-offset-white' : ''
          }`}
          style={{ backgroundColor: color }}
          aria-label={color}
        />
      ))}
    </div>
  )
}