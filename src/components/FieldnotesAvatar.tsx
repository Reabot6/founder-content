import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';

type HelpItem = { question: string; answer: string; href: string; link: string; startupOnly?: boolean };
const helpItems: HelpItem[] = [
  { question: 'Where do I start writing?', answer: 'Open your Founder workspace for personal posts, or choose a startup to write in that product’s voice.', href: '/founder', link: 'Open Founder workspace' },
  { question: 'How do I make a post?', answer: 'Start with a real lesson, opinion, or moment. Choose a format and platform, then tell Fieldnotes what the post should do.', href: '/create?workspace=founder', link: 'Create a founder post' },
  { question: 'Can I adapt a draft for another platform?', answer: 'Yes. Repurpose a saved draft by choosing its source, target format, platform, and what you want the new version to accomplish.', href: '/repurpose?workspace=founder', link: 'Repurpose a draft' },
  { question: 'Where do I add a startup?', answer: 'Create a startup with its name first. Add website, product context, voice, and source files inside its workspace.', href: '/projects', link: 'Open startups', startupOnly: true },
  { question: 'How do writing skills work?', answer: 'Skills are reusable writing guidance. Add a structure, tone, or storytelling approach once and choose it when you draft.', href: '/skills', link: 'Manage shared skills' },
  { question: 'Where are my drafts?', answer: 'Open your content library to find drafts and continue editing. Drafts are not published automatically.', href: '/library?workspace=founder', link: 'Open your library' },
  { question: 'Can I change my voice?', answer: 'Add your founder background, point of view, audience, and voice in your profile. Each startup can also have its own voice.', href: '/settings', link: 'Edit founder profile' },
  { question: 'What happens to my drafts?', answer: 'You can edit and reuse them in your library. Right now, drafts are saved in this browser and are not shared between devices.', href: '/library?workspace=founder', link: 'Open your library' },
  { question: 'Will a post publish automatically?', answer: 'No. Fieldnotes creates drafts for you to review. Nothing is published without your action.', href: '/founder', link: 'Go to my workspace' },
];

type Mood = 'idle' | 'curious' | 'thinking' | 'happy';
const interactiveSelector = 'a, button, input, textarea, select, summary, [role="button"], [contenteditable="true"]';

export function FieldnotesAvatar({ size = 58, accountType }: { size?: number; accountType: 'founder' | 'founder_plus_startups' | null }) {
  const [path] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState('');
  const [mood, setMood] = useState<Mood>('idle');
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const gradientId = useId().replace(/:/g, '');
  const mascotButton = useRef<HTMLButtonElement>(null);
  const dock = () => ({ x: Math.max(10, window.innerWidth - size - 22), y: Math.max(10, window.innerHeight - size - (window.matchMedia('(max-width: 760px)').matches ? 92 : 22)) });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(pointer: coarse)').matches) return;
    let settleTimer = 0;
    let frame = 0;
    const resetToDock = () => setPosition(dock());
    const resetToDefaultDock = () => setPosition(null);
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || isOpen) return;
      const target = event.target;
      if (target instanceof Element) {
        if (target.closest('.fieldnotes-mascot-wrap')) return;
        if (target.closest(interactiveSelector)) { setPosition(dock()); return; }
      }
      window.clearTimeout(settleTimer);
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const x = Math.max(10, Math.min(event.clientX + 24, window.innerWidth - size - 10));
        const y = Math.max(10, Math.min(event.clientY + 24, window.innerHeight - size - 92));
        setPosition({ x, y });
      });
      settleTimer = window.setTimeout(resetToDock, 1100);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', resetToDock, { passive: true });
    window.addEventListener('resize', resetToDefaultDock);
    window.addEventListener('blur', resetToDock);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', resetToDock);
      window.removeEventListener('blur', resetToDock);
      window.removeEventListener('resize', resetToDefaultDock);
      window.clearTimeout(settleTimer);
      window.cancelAnimationFrame(frame);
    };
  }, [isOpen, size]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false); setQuery(''); setExpandedQuestion(''); setMood('idle');
      window.requestAnimationFrame(() => mascotButton.current?.focus());
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('.fieldnotes-mascot-wrap')) {
        setIsOpen(false); setQuery(''); setExpandedQuestion(''); setMood('idle');
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOnOutsideClick);
    return () => { window.removeEventListener('keydown', closeOnEscape); window.removeEventListener('pointerdown', closeOnOutsideClick); };
  }, [isOpen]);

  const filteredItems = helpItems.filter((item) => {
    if (item.startupOnly && accountType !== 'founder_plus_startups') return false;
    return `${item.question} ${item.answer}`.toLowerCase().includes(query.trim().toLowerCase());
  });
  const contextualHref = (href: string) => {
    if (href === '/create?workspace=founder' && path.startsWith('/startups/')) return `/create?startup=${encodeURIComponent(path.split('/')[2])}`;
    if (href === '/repurpose?workspace=founder' && path.startsWith('/startups/')) return `/repurpose?startup=${encodeURIComponent(path.split('/')[2])}`;
    if (href === '/library?workspace=founder' && path.startsWith('/startups/')) return `/library?startup=${encodeURIComponent(path.split('/')[2])}`;
    if (href === '/settings' && path.startsWith('/startups/')) return `/startups/${encodeURIComponent(path.split('/')[2])}`;
    if (href === '/projects' && accountType !== 'founder_plus_startups') return '/billing';
    return href;
  };
  function toggleHelp() {
    const opening = !isOpen;
    setIsOpen(opening);
    setPosition(opening ? dock() : null);
    setMood(opening ? 'curious' : 'idle');
    if (!opening) { setQuery(''); setExpandedQuestion(''); }
  }

  return <div className={`fieldnotes-mascot-wrap${position ? ' is-following' : ''}`} style={{ width: size, height: size, left: position?.x ?? undefined, top: position?.y ?? undefined }}>
    <button
      type="button"
      ref={mascotButton}
      className={`fieldnotes-mascot mood-${mood}`}
      aria-label={isOpen ? 'Close Fieldnotes help' : 'Open Fieldnotes help and find something'}
      aria-expanded={isOpen}
      aria-controls={isOpen ? 'fieldnotes-help-panel' : undefined}
      onClick={toggleHelp}
      onPointerEnter={() => { if (!isOpen) setMood('curious'); }}
      onPointerLeave={() => { if (!isOpen) setMood('idle'); }}
      onFocus={() => { setPosition(dock()); if (!isOpen) setMood('curious'); }}
      onBlur={() => { if (!isOpen) setMood('idle'); }}
    >
      <svg viewBox="0 0 96 96" aria-hidden="true" fill="none">
        <defs>
          <linearGradient id={`${gradientId}-shell`} x1="20" y1="10" x2="77" y2="88" gradientUnits="userSpaceOnUse"><stop stopColor="#718B73" /><stop offset=".38" stopColor="#344B39" /><stop offset="1" stopColor="#1B2B21" /></linearGradient>
          <linearGradient id={`${gradientId}-face`} x1="29" y1="25" x2="65" y2="69" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFEF7" /><stop offset="1" stopColor="#E6E0D2" /></linearGradient>
          <linearGradient id={`${gradientId}-gold`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#F4D594" /><stop offset="1" stopColor="#B77A34" /></linearGradient>
          <radialGradient id={`${gradientId}-shine`} cx="0" cy="0" r="1" gradientTransform="matrix(24 25 -29 28 29 21)" gradientUnits="userSpaceOnUse"><stop stopColor="white" stopOpacity=".42" /><stop offset="1" stopColor="white" stopOpacity="0" /></radialGradient>
          <filter id={`${gradientId}-shadow`} x="9" y="10" width="82" height="84" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        <ellipse cx="49" cy="86" rx="27" ry="5" fill="#17251B" fillOpacity=".17" filter={`url(#${gradientId}-shadow)`} />
        <path className="fieldnotes-mascot-leaf" d="M47 18C40 10 42 4 52 5c5 1 7 5 7 10-5 1-9 2-12 3Z" fill={`url(#${gradientId}-gold)`} />
        <path d="M48 15c2-3 5-5 8-7" stroke="#FFF5D9" strokeOpacity=".8" strokeWidth="1.5" strokeLinecap="round" />
        <ellipse cx="18" cy="51" rx="6" ry="10" fill="#293B2E" /><ellipse cx="78" cy="51" rx="6" ry="10" fill="#293B2E" />
        <path d="M48 15c-18 0-31 12-31 31v19c0 15 12 25 31 25s31-10 31-25V46c0-19-13-31-31-31Z" fill={`url(#${gradientId}-shell)`} stroke="#1B2A20" strokeWidth="2" />
        <path d="M22 47c0-16 10-27 25-27 9 0 17 4 22 12-6-4-14-6-23-4-12 2-19 12-20 25v18c-3-4-4-9-4-15V47Z" fill={`url(#${gradientId}-shine)`} />
        <path d="M29 37c0-8 7-14 16-14h7c9 0 16 6 16 14v24c0 10-7 17-17 17h-5c-10 0-17-7-17-17V37Z" fill={`url(#${gradientId}-face)`} stroke="#DCD6C8" strokeWidth="1.5" />
        <path d="M32 31c3-3 7-5 13-5h7c5 0 9 2 12 5" stroke="white" strokeOpacity=".9" strokeWidth="2" strokeLinecap="round" />
        <g className="fieldnotes-mascot-eyes" fill="#293A2D"><ellipse cx="41" cy="47" rx="3.1" ry="4.2" /><ellipse cx="56" cy="47" rx="3.1" ry="4.2" /><circle cx="42" cy="45.5" r="1" fill="white" /><circle cx="57" cy="45.5" r="1" fill="white" /></g>
        {mood === 'curious' && <path d="m37 39 5-1m9 1 5 1" stroke="#526B55" strokeWidth="1.5" strokeLinecap="round" />}
        {mood === 'thinking' ? <path d="M43 59c3-3 8-3 11 0" stroke="#526B55" strokeWidth="2" strokeLinecap="round" /> : mood === 'happy' ? <path d="M42 55c3 7 9 7 12 0" stroke="#526B55" strokeWidth="2.2" strokeLinecap="round" /> : <path d="M43 57c3 4 8 4 11 0" stroke="#526B55" strokeWidth="2" strokeLinecap="round" />}
        <ellipse cx="34" cy="55" rx="3.4" ry="2" fill="#D99076" fillOpacity={mood === 'happy' ? '.62' : '.35'} /><ellipse cx="63" cy="55" rx="3.4" ry="2" fill="#D99076" fillOpacity={mood === 'happy' ? '.62' : '.35'} />
        <circle cx="48" cy="73" r="5.5" fill={`url(#${gradientId}-gold)`} /><rect x="46.5" y="70.5" width="3" height="5" rx=".5" fill="#FFF8E8" /><path d="M47.2 72h1.6m-1.6 1.2h1.6" stroke="#A8773E" strokeWidth=".6" strokeLinecap="round" />
        <path d="M22 64c0 12 10 20 26 20" stroke="white" strokeOpacity=".14" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="fieldnotes-mascot-hover" aria-hidden="true">Find a feature · ask me</span>
    </button>
    {isOpen && <section className="fieldnotes-help-panel" id="fieldnotes-help-panel" aria-label="Fieldnotes help">
      <div className="fieldnotes-help-heading"><div><span className="fieldnotes-mascot-tip-label">Your Fieldnotes guide</span><h2 className="serif mt-1 text-xl">What can I help you find?</h2></div><button type="button" className="fieldnotes-mascot-dismiss" onClick={toggleHelp} aria-label="Close help">×</button></div>
      <label className="fieldnotes-help-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></svg><span className="sr-only">Search help topics</span><input value={query} onChange={(event) => { setQuery(event.target.value); setMood(event.target.value ? 'thinking' : 'curious'); setExpandedQuestion(''); }} placeholder="Search features or ask a question" /></label>
      <div className="fieldnotes-help-list" role="list">
        {filteredItems.length ? filteredItems.map((item) => <article className="fieldnotes-help-item" key={item.question} role="listitem">
          <button type="button" className="fieldnotes-help-question" aria-expanded={expandedQuestion === item.question} onClick={() => { setExpandedQuestion((current) => current === item.question ? '' : item.question); setMood('happy'); }}>{item.question}<span aria-hidden="true">{expandedQuestion === item.question ? '−' : '+'}</span></button>
          {expandedQuestion === item.question && <div className="fieldnotes-help-answer"><p>{item.answer}</p><Link href={contextualHref(item.href)} onClick={() => { setIsOpen(false); setQuery(''); setMood('happy'); }}>{item.link} <span aria-hidden="true">→</span></Link></div>}
        </article>) : <p className="fieldnotes-help-empty">I couldn’t find that yet. Try “drafts”, “skills”, or “startup”.</p>}
      </div>
      <div className="fieldnotes-help-footer">I’ll stay out of your way while you work.</div>
    </section>}
  </div>;
}
