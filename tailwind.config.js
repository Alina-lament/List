/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 明亮高对比色板：纯白底 + 近黑文字 + 钴蓝强调
        canvas: '#ffffff',        // 纯白主背景
        'canvas-2': '#f1f5f9',    // 亮灰次级区块
        'canvas-3': '#e2e8f0',    // 中灰分隔/边线/激活态底
        ink: '#0b1220',           // 近黑主文
        'ink-2': '#334155',       // 深灰次文
        'ink-3': '#64748b',       // 中灰辅文
        'ink-4': '#94a3b8',       // 浅灰禁用/占位
        royal: {
          DEFAULT: '#2563eb',     // 钴蓝（强调/今日/激活/主按钮）
          dark: '#1d4ed8',        // 深钴蓝（hover）
          light: '#3b82f6',       // 亮钴蓝
          50: '#eff6ff',          // 极浅钴蓝（选中底）
        },
        // 优先级三色：高对比、色相区分明显
        prihigh: '#ef4444',       // 亮红（高优先级）
        primed: '#f59e0b',        // 亮橙（中优先级）
        prilow: '#10b981',        // 亮绿（低优先级）
      },
      fontFamily: {
        sans: ['"Inter"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,18,32,0.06), 0 0 0 1px rgba(11,18,32,0.06)',
        'card-lg': '0 8px 24px rgba(11,18,32,0.12), 0 0 0 1px rgba(11,18,32,0.08)',
      },
    },
  },
  plugins: [],
}