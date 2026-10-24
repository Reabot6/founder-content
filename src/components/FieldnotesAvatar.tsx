import { useEffect, useRef, useState } from 'react';
import { useRive } from '@rive-app/react-webgl2';
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
const riveAnimation: Record<Mood, string> = { idle: 'Idle', curious: 'Curious', thinking: 'Thinking', happy: 'Happy' };

export function FieldnotesAvatar({ size = 58, accountType }: { size?: number; accountType: 'founder' | 'founder_plus_startups' | null }) {
  const [path] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState('');
  const [mood, setMood] = useState<Mood>('idle');
  const [announcement, setAnnouncement] = useState('');
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const mascotButton = useRef<HTMLButtonElement>(null);
  const announcementTimer = useRef<number | undefined>(undefined);
  const { rive, RiveComponent } = useRive({ src: '/fieldnotes-mascot.riv', autoplay: false, artboard: 'Fieldnotes Mascot' }, { shouldResizeCanvasToContainer: true });

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!rive) return;
    rive.stop();
    if (!reducedMotion) rive.play(riveAnimation[mood]);
  }, [rive, mood, reducedMotion]);

  useEffect(() => {
    const onMascotEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ mood?: Mood; message?: string }>).detail;
      if (!detail?.mood) return;
      setMood(detail.mood);
      setAnnouncement(detail.message ?? '');
      window.clearTimeout(announcementTimer.current);
      if (detail.message) {
        announcementTimer.current = window.setTimeout(() => {
          setAnnouncement('');
          setMood(isOpen ? 'curious' : 'idle');
        }, 4200);
      }
    };
    window.addEventListener('fieldnotes:mascot', onMascotEvent);
    return () => {
      window.removeEventListener('fieldnotes:mascot', onMascotEvent);
      window.clearTimeout(announcementTimer.current);
    };
  }, [isOpen]);

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
    setMood(opening ? 'curious' : 'idle');
    setAnnouncement('');
    if (!opening) { setQuery(''); setExpandedQuestion(''); }
  }

  return <div className="fieldnotes-mascot-wrap" style={{ width: size, height: size }}>
    {announcement && <div className="fieldnotes-mascot-announcement" role="status">{announcement}</div>}
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
      onFocus={() => { if (!isOpen) setMood('curious'); }}
      onBlur={() => { if (!isOpen) setMood('idle'); }}
    >
      <span className="fieldnotes-mascot-art" aria-hidden="true"><RiveComponent /></span>
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
