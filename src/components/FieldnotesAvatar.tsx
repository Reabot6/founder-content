export function FieldnotesAvatar({ size = 56 }: { size?: number }) {
  return <div className="fieldnotes-avatar" role="img" aria-label="Fieldnotes writing companion" style={{ width: size, height: size }}>
    <svg viewBox="0 0 64 64" aria-hidden="true" fill="none">
      <path d="M32 6c13 0 23 9 23 22v16c0 8-6 14-14 14H23c-8 0-14-6-14-14V28C9 15 19 6 32 6Z" fill="#28342C" />
      <path d="M18 26c0-8 6-14 14-14s14 6 14 14v19c0 5-4 9-9 9H27c-5 0-9-4-9-9V26Z" fill="#F7F4EC" />
      <circle cx="27" cy="32" r="2.5" fill="#28342C" /><circle cx="37" cy="32" r="2.5" fill="#28342C" />
      <path d="M27 40c3 3 7 3 10 0" stroke="#28342C" strokeWidth="2" strokeLinecap="round" />
      <path d="m49 10 4-4m-1 9 6-1" stroke="#C79B59" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="48" cy="48" r="4" fill="#C79B59" />
    </svg>
  </div>;
}
