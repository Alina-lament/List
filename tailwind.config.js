/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── 明亮现代色板：清新白底 + 柔和灰阶 + 靛蓝强调 ──
        canvas: '#fdfdfc',        // 暖白主背景
        'canvas-2': '#f4f5f7',    // 次级区块（侧栏/面板），柔和浅灰
        'canvas-3': '#eaecf0',    // 分隔线/边框，精致灰
        'canvas-4': '#d4d7de',    // 深色边框（hover/聚焦）
        ink: '#0f172a',           // 富黑主文
        'ink-2': '#334155',       // 深灰次文
        'ink-3': '#64748b',       // 中灰辅文
        'ink-4': '#94a3b8',       // 浅灰禁用/占位
        royal: {
          DEFAULT: '#4f6ef7',     // 明亮靛蓝（强调/激活/主按钮）
          dark: '#3d5ce5',        // 深靛蓝（hover）
          light: '#7b93fa',       // 亮靛蓝
          50: '#eef1fe',          // 极浅靛蓝（选中底）
        },
        // 优先级三色：现代高饱和
        prihigh: '#f43f5e',       // 玫红（高优先级）
        primed: '#f59e0b',        // 琥珀（中优先级）
        prilow: '#22c55e',        // 翠绿（低优先级）
      },
      fontFamily: {
        sans: ['"Inter"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(15,23,42,0.04)',
        card: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        'card-lg': '0 4px 16px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.04)',
        'card-xl': '0 12px 40px rgba(15,23,42,0.12), 0 0 0 1px rgba(15,23,42,0.06)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}