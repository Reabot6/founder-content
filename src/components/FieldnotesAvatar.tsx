import { useId, useState } from 'react';

const tips = [
  'Start with a real moment. I’ll help you shape it into a post.',
  'Pick a writing skill to give your next draft a little more you.',
  'Your drafts stay private until you decide what to do with them.',
];

export function FieldnotesAvatar({ size = 56 }: { size?: number }) {
  const [tipIndex, setTipIndex] = useState(-1);
  const gradientId = useId().replace(/:/g, '');
  const toggleTip = () => setTipIndex((current) => current < 0 ? 0 : (current + 1) % tips.length);

  return <div className="fieldnotes-mascot-wrap" style={{ width: size, height: size }}>
    <button
      type="button"
      className="fieldnotes-mascot"
      aria-label={tipIndex < 0 ? 'Ask your Fieldnotes companion for a tip' : 'Show another Fieldnotes tip'}
      aria-expanded={tipIndex >= 0}
      aria-describedby={tipIndex >= 0 ? 'fieldnotes-mascot-tip' : undefined}
      onClick={toggleTip}
    >
      <svg viewBox="0 0 96 96" aria-hidden="true" fill="none">
        <defs>
          <linearGradient id={`${gradientId}-shell`} x1="20" y1="10" x2="77" y2="88" gradientUnits="userSpaceOnUse">
            <stop stopColor="#627A67" /><stop offset=".38" stopColor="#334A39" /><stop offset="1" stopColor="#1E2D24" />
          </linearGradient>
          <linearGradient id={`${gradientId}-face`} x1="29" y1="25" x2="65" y2="69" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFEF7" /><stop offset="1" stopColor="#E8E3D6" />
          </linearGradient>
          <linearGradient id={`${gradientId}-gold`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#F4D594" /><stop offset="1" stopColor="#B77A34" />
          </linearGradient>
          <radialGradient id={`${gradientId}-shine`} cx="0" cy="0" r="1" gradientTransform="matrix(24 25 -29 28 29 21)" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity=".42" /><stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <filter id={`${gradientId}-shadow`} x="9" y="10" width="82" height="84" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        <ellipse cx="49" cy="86" rx="27" ry="5" fill="#17251B" fillOpacity=".17" filter={`url(#${gradientId}-shadow)`} />
        {/* Little leaf antenna: a nod to a growing idea. */}
        <path d="M47 18C40 10 42 4 52 5c5 1 7 5 7 10-5 1-9 2-12 3Z" fill={`url(#${gradientId}-gold)`} />
        <path d="M48 15c2-3 5-5 8-7" stroke="#FFF5D9" strokeOpacity=".8" strokeWidth="1.5" strokeLinecap="round" />

        {/* Soft side pads and rounded, shaded shell give the character depth. */}
        <ellipse cx="18" cy="51" rx="6" ry="10" fill="#293B2E" />
        <ellipse cx="78" cy="51" rx="6" ry="10" fill="#293B2E" />
        <path d="M48 15c-18 0-31 12-31 31v19c0 15 12 25 31 25s31-10 31-25V46c0-19-13-31-31-31Z" fill={`url(#${gradientId}-shell)`} stroke="#1B2A20" strokeWidth="2" />
        <path d="M22 47c0-16 10-27 25-27 9 0 17 4 22 12-6-4-14-6-23-4-12 2-19 12-20 25v18c-3-4-4-9-4-15V47Z" fill={`url(#${gradientId}-shine)`} />
        <path d="M29 37c0-8 7-14 16-14h7c9 0 16 6 16 14v24c0 10-7 17-17 17h-5c-10 0-17-7-17-17V37Z" fill={`url(#${gradientId}-face)`} stroke="#DCD6C8" strokeWidth="1.5" />
        <path d="M32 31c3-3 7-5 13-5h7c5 0 9 2 12 5" stroke="white" strokeOpacity=".9" strokeWidth="2" strokeLinecap="round" />

        {/* Expressive eyes blink gently. */}
        <g className="fieldnotes-mascot-eyes" fill="#293A2D">
          <ellipse cx="41" cy="47" rx="3.1" ry="4.2" />
          <ellipse cx="56" cy="47" rx="3.1" ry="4.2" />
          <circle cx="42" cy="45.5" r="1" fill="white" />
          <circle cx="57" cy="45.5" r="1" fill="white" />
        </g>
        <path d="M43 57c3 4 8 4 11 0" stroke="#526B55" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="34" cy="55" rx="3.4" ry="2" fill="#D99076" fillOpacity=".35" />
        <ellipse cx="63" cy="55" rx="3.4" ry="2" fill="#D99076" fillOpacity=".35" />

        {/* A tiny notebook badge. */}
        <circle cx="48" cy="73" r="5.5" fill={`url(#${gradientId}-gold)`} />
        <rect x="46.5" y="70.5" width="3" height="5" rx=".5" fill="#FFF8E8" />
        <path d="M47.2 72h1.6m-1.6 1.2h1.6" stroke="#A8773E" strokeWidth=".6" strokeLinecap="round" />
        <path d="M22 64c0 12 10 20 26 20" stroke="white" strokeOpacity=".14" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="fieldnotes-mascot-hover" aria-hidden="true">Click for a quick tip</span>
    </button>
    {tipIndex >= 0 && <div className="fieldnotes-mascot-tip" id="fieldnotes-mascot-tip" role="status" aria-live="polite">
      <span className="fieldnotes-mascot-tip-label">A little nudge</span>
      <span>{tips[tipIndex]}</span>
      <button type="button" onClick={() => setTipIndex(-1)} aria-label="Dismiss tip" className="fieldnotes-mascot-dismiss">×</button>
    </div>}
  </div>;
}
