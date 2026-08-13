export function TomatoIcon({ className = 'h-full w-full' }: { className?: string }) {
  return (
    <svg viewBox="30 10 68 70" className={className} aria-hidden="true">
      <rect x="56" y="20" width="8" height="16" rx="4" fill="#6b7c3a" />
      <path d="M60 32c-5-12-19-16-27-10 8 0 15 3 20 10z" fill="#4c9f54" />
      <path d="M60 31c3-13 16-19 26-13-9 1-16 5-20 12z" fill="#58b45f" />
      <path d="M60 33c8-9 21-8 27-1-9-1-16 0-21 4z" fill="#4c9f54" />
      <path d="M60 33c-8-7-19-5-25 2 7-3 14-2 20 1z" fill="#58b45f" />
      <path d="M60 40c-28 1-38 24-23 36 9 8 37 8 46 0 15-12 5-35-23-36z" fill="#f0524d" stroke="#c22f32" strokeWidth="1.5" />
      <ellipse cx="38" cy="48" rx="7" ry="11" fill="#ffffff" opacity="0.4" transform="rotate(-18 38 48)" />
    </svg>
  )
}
