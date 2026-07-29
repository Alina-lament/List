/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── CSS Variables 接管，带默认回退值 ──
        canvas: 'var(--color-canvas-bg, #fdfdfc)',
        'canvas-2': 'var(--color-sidebar-bg, #f4f5f7)',
        'canvas-3': 'var(--color-border, #eaecf0)',
        'canvas-4': '#d4d7de',
        ink: 'var(--color-ink, #0f172a)',
        'ink-2': 'var(--color-ink-2, #334155)',
        'ink-3': 'var(--color-ink-3, #64748b)',
        'ink-4': '#94a3b8',
        royal: {
          DEFAULT: 'var(--color-royal, #4f6ef7)',
          dark: 'var(--color-royal-dark, #3d5ce5)',
          light: 'var(--color-royal-light, #7b93fa)',
          50: 'var(--color-royal-50, #eef1fe)',
        },
        prihigh: 'var(--color-prihigh, #f43f5e)',
        primed: 'var(--color-primed, #f59e0b)',
        prilow: 'var(--color-prilow, #22c55e)',
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
  plugins: [require('@tailwindcss/typography')],
}