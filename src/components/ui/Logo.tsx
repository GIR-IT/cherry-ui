export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <defs>
        <linearGradient id="cherry-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fb7185" />
          <stop offset="1" stopColor="#be123c" />
        </linearGradient>
      </defs>
      <rect width="34" height="34" rx="10" fill="url(#cherry-logo)" />
      <g transform="translate(7 7) scale(0.8333)">
        <path
          d="M7.5,15 C8.5,10 11,6 15.5,3.5 M16.5,13 C16.5,9.5 16,6 15.5,3.5"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M15.5,3.5 C17.5,1.8 20.5,2 22,3.5 C20,5.2 17.5,5.2 15.5,3.5 Z" fill="#ffe4e6" />
        <circle cx="7.25" cy="18.25" r="4.75" fill="#fff" />
        <circle cx="16.75" cy="16.25" r="4.75" fill="#fff" fillOpacity="0.85" />
      </g>
    </svg>
  );
}
