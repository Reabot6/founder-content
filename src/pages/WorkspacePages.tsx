import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, MagnifyingGlass, FolderSimple, Shapes, UserCircle, FileText, ClockCounterClockwise, FloppyDisk } from '@phosphor-icons/react';
import { PageHeading } from '@/components/AppShell';
import { Notice } from '@/components/StatusNote';
import { demoDrafts, formatLabel, formats, isDemo, type DraftRecord } from '@/lib/content-api';

export function HomePage({ drafts }: { drafts: DraftRecord[] }) {
  const recent = isDemo ? [...drafts, ...demoDrafts] : drafts;
  return <div className="page-wrap">
    <div className="mb-12 grid gap-9 lg:grid-cols-[1.4fr_.6fr] lg:items-end">
      <div><div className="eyebrow mb-4">Your ideas, in your voice</div><h1 className="serif max-w-[700px] text-[45px] leading-[1.02] tracking-[-.03em] sm:text-[66px]" data-testid="heading-home">Good content starts<br className="hidden sm:block" /> with real context.</h1>
        <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">A private writing space for what you have learned, the company you are building, and the point of view only you can bring.</p>
        <div className="mt-7 flex flex-wrap gap-3"><Link href="/create" className="button-press inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground" data-testid="button-home-create">Start with an idea <ArrowRight size={16} weight="regular" /></Link><Link href="/repurpose" className="button-press inline-flex min-h-11 items-center gap-2 border px-4 text-sm" data-testid="button-home-repurpose">Adapt a draft <ArrowRight size={16} weight="regular" /></Link></div>
      </div>
      <div className="border-l pl-5 py-1 lg:ml-auto lg:max-w-[255px]" style={{ borderColor: 'hsl(var(--border))' }}><div className="eyebrow mb-3">A note on the work</div><p className="serif text-[22px] leading-[1.2]">The system can shape your words. The thinking stays yours.</p><Link href="/settings" className="mt-4 inline-flex items-center gap-2 text-xs underline decoration-border underline-offset-4" data-testid="link-home-profile">Add founder context <ArrowRight size={14} weight="regular" /></Link></div>
    </div>
    <div className="grid gap-7 lg:grid-cols-[1.15fr_.85fr]">
      <section>
        <div className="mb-4 flex items-end justify-between border-b pb-3" style={{ borderColor: 'hsl(var(--border))' }}><div><div className="eyebrow">Your workspace</div><h2 className="serif mt-1 text-2xl">Pick up where you left off</h2></div><Link href="/library" className="text-xs underline decoration-border underline-offset-4" data-testid="link-home-library">Open library</Link></div>
        {recent.length ? <div className="grid">{recent.slice(0, 5).map((draft, index) => <Link key={draft.id} href="/library" className="flex items-center justify-between gap-4 border-b py-4 hover:bg-muted/40" style={{ borderColor: 'hsl(var(--border))' }} data-testid={`row-recent-${draft.id}`}>
          <div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center border" style={{ background: index === 0 ? '#edf3ec' : 'hsl(var(--card))' }}><FileText size={17} weight="regular" /></div><div className="min-w-0"><div className="truncate text-sm font-medium">{draft.title}</div><div className="mt-1 text-xs text-muted-foreground">{formatLabel(draft.format)} · {draft.platform} · Draft</div></div></div><ArrowRight size={16} weight="regular" className="shrink-0 text-muted-foreground" />
        </Link>)}</div> : <div className="border border-dashed p-7"><div className="eyebrow mb-2">A fresh page</div><p className="serif text-xl">Nothing here yet.</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Drafts created during this session appear here. They are not saved between sessions.</p><Link href="/create" className="mt-4 inline-flex items-center gap-2 text-sm underline decoration-border underline-offset-4" data-testid="link-empty-create">Create your first draft <ArrowRight size={15} weight="regular" /></Link></div>}
      </section>
      <section className="panel p-5 sm:p-6">
        <div className="eyebrow mb-3">Build your context</div><h2 className="serif text-2xl">Better source material.<br />More useful drafts.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Keep the company, your experience, and your writing preferences close to the work.</p>
        <div className="mt-5 grid border-t" style={{ borderColor: 'hsl(var(--border))' }}>
          {[{ href: '/projects', label: 'Projects', copy: 'Products, work, and milestones', icon: FolderSimple }, { href: '/skills', label: 'Skills', copy: 'Reusable writing frameworks', icon: Shapes }, { href: '/settings', label: 'Founder profile', copy: 'Background, beliefs, and voice', icon: UserCircle }].map(({ href, label, copy, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 border-b py-3" style={{ borderColor: 'hsl(var(--border))' }} data-testid={`link-context-${href.slice(1)}-home`}>
            <Icon size={19} weight="regular" className="text-muted-foreground" /><span className="flex-1"><span className="block text-sm font-medium">{label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{copy}</span></span><ArrowRight size={15} weight="regular" />
          </Link>)}
        </div>
      </section>
    </div>
  </div>;
}

export function LibraryPage({ drafts }: { drafts: DraftRecord[] }) {
  const entries = isDemo ? [...drafts, ...demoDrafts] : drafts;
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const filtered = useMemo(() => entries.filter((draft) => (formatFilter === 'all' || draft.format === formatFilter) && (platformFilter === 'all' || draft.platform === platformFilter) && `${draft.title} ${draft.text} ${draft.platform}`.toLowerCase().includes(query.trim().toLowerCase())), [entries, formatFilter, platformFilter, query]);
  return <div className="page-wrap">
    <PageHeading kicker="Content memory" title="Library" description="A searchable inventory of drafts available in this browser session." />
    <p className="mb-5 max-w-3xl text-sm leading-6 text-muted-foreground">{isDemo ? 'Includes one clearly labeled local example. Nothing here is account content.' : 'Only drafts created during this session are available. There is no server-side content history.'}</p>
    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
      <label className="relative flex-1"><span className="sr-only">Search drafts</span><MagnifyingGlass size={17} weight="regular" className="absolute left-3 top-3 text-muted-foreground" /><input className="field pl-9" type="search" placeholder="Search title, platform, or words" value={query} onChange={(event) => setQuery(event.target.value)} data-testid="input-library-search" /></label>
      <label><span className="sr-only">Filter by format</span><select className="field sm:w-[185px]" value={formatFilter} onChange={(event) => setFormatFilter(event.target.value)} data-testid="select-library-format"><option value="all">All formats</option>{formats.map((format) => <option value={format} key={format}>{formatLabel(format)}</option>)}</select></label>
      <label><span className="sr-only">Filter by platform</span><select className="field sm:w-[160px]" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} data-testid="select-library-platform"><option value="all">All platforms</option>{['LinkedIn', 'X', 'TikTok', 'Instagram', 'YouTube'].map((platform) => <option value={platform} key={platform}>{platform}</option>)}</select></label>
    </div>
    <div className="mb-3 flex items-center justify-between"><span className="eyebrow">{filtered.length} {filtered.length === 1 ? 'draft' : 'drafts'}</span><span className="eyebrow">Status · Draft</span></div>
    {filtered.length ? <div className="grid gap-3">{filtered.map((draft) => <article key={draft.id} className="panel p-5 sm:p-6" data-testid={`card-library-${draft.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="eyebrow">{formatLabel(draft.format)} · {draft.platform}</div><span className="rounded-sm bg-[#eef2ea] px-2 py-1 text-[10px] uppercase tracking-wider text-[#546750]">Draft</span></div>
      <h2 className="serif mt-3 text-2xl">{draft.title}</h2><p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{draft.text}</p>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground"><ClockCounterClockwise size={14} weight="regular" />Not published · {draft.demo ? 'Local example' : 'Current session'}</div>
    </article>)}</div> : <div className="border border-dashed px-5 py-12 text-center" data-testid="empty-library"><div className="mx-auto grid h-10 w-10 place-items-center border"><MagnifyingGlass size={18} weight="regular" /></div><h2 className="serif mt-4 text-2xl">{entries.length ? 'No matching drafts' : 'No drafts to show'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{entries.length ? 'Try a different search or filter.' : 'Create a draft to see it here. Drafts are held in the current session only.'}</p>{!entries.length && <Link href="/create" className="mt-5 inline-flex items-center gap-2 text-sm underline decoration-border underline-offset-4" data-testid="link-library-create">Create a draft <ArrowRight size={15} weight="regular" /></Link>}</div>}
  </div>;
}

const foundation = {
  projects: { title: 'Projects', kicker: 'Business memory', icon: FolderSimple, intro: 'Give your ideas a real home. Projects can hold the products, customers, milestones, and open questions that make a founder’s content specific.', sections: ['Business and product context', 'Customer stories and evidence', 'Milestones and current priorities'] },
  skills: { title: 'Skills', kicker: 'Reusable frameworks', icon: Shapes, intro: 'Keep techniques separate from your voice. Build a small library of frameworks you choose to apply to future drafts.', sections: ['Story structure and openings', 'Clear technical explanations', 'Spoken-script frameworks'] },
} as const;

export function FoundationPage({ page }: { page: 'projects' | 'skills' }) {
  const data = foundation[page];
  const Icon = data.icon;
  return <div className="page-wrap">
    <PageHeading kicker={data.kicker} title={data.title} description={data.intro} />
    <div className="grid gap-7 lg:grid-cols-[.9fr_1.1fr]">
      <section className="panel p-6 sm:p-8">
        <div className="grid h-10 w-10 place-items-center border bg-[#edf3ec]"><Icon size={20} weight="regular" /></div>
        <div className="eyebrow mt-6">An honest foundation</div>
        <h2 className="serif mt-2 text-3xl leading-tight">Memory should be<br />deliberate and yours.</h2>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">This area is a product foundation only. Nothing here is saved or sent to the server yet.</p>
        <div className="mt-6"><Notice testId={`notice-${page}-not-persisted`}>Projects and skill persistence are not available. No records or IDs are fabricated.</Notice></div>
      </section>
      <section><div className="eyebrow mb-4">What belongs here</div><div className="grid">{data.sections.map((section, index) => <div key={section} className="flex gap-4 border-b py-4" style={{ borderColor: 'hsl(var(--border))' }} data-testid={`item-${page}-${index}`}><span className="mono text-[11px] text-muted-foreground">0{index + 1}</span><div><div className="text-sm font-medium">{section}</div><div className="mt-1 text-xs text-muted-foreground">A clear, factual record—reviewed by you.</div></div></div>)}</div></section>
    </div>
  </div>;
}

type FounderProfile = {
  name: string;
  role: string;
  company: string;
  companyDescription: string;
  background: string;
  audience: string;
  pointOfView: string;
  voice: string;
  topics: string;
  avoid: string;
};
const profileKey = 'founder-studio-profile-v1';
const emptyProfile: FounderProfile = { name: '', role: '', company: '', companyDescription: '', background: '', audience: '', pointOfView: '', voice: '', topics: '', avoid: '' };

function readProfile(): FounderProfile {
  try {
    const raw = localStorage.getItem(profileKey);
    return raw ? { ...emptyProfile, ...JSON.parse(raw) as Partial<FounderProfile> } : emptyProfile;
  } catch {
    return emptyProfile;
  }
}

export function SettingsPage() {
  const [profile, setProfile] = useState<FounderProfile>(readProfile);
  const [saved, setSaved] = useState(false);
  const [storageError, setStorageError] = useState(false);
  function update(field: keyof FounderProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
    setSaved(false);
    setStorageError(false);
  }
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      localStorage.setItem(profileKey, JSON.stringify(profile));
      setSaved(true);
      setStorageError(false);
    } catch {
      setSaved(false);
      setStorageError(true);
    }
  }
  function clearProfile() {
    try {
      localStorage.removeItem(profileKey);
      setProfile(emptyProfile);
      setSaved(true);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  return <div className="page-wrap">
    <PageHeading kicker="Your context" title="Founder profile" description="A considered record of who you are, what you are building, and how you want to sound." />
    <div className="mb-7 max-w-3xl"><Notice testId="notice-profile-local">Your profile is saved on this device only. It is not sent to the server or included in content requests.</Notice></div>
    <form className="max-w-4xl" onSubmit={save} data-testid="form-founder-profile">
      <section className="mb-8 border-b pb-7" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="mb-5"><div className="eyebrow mb-2">01 / Identity & company</div><h2 className="serif text-2xl">The person behind the work</h2></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" value={profile.name} onChange={(value) => update('name', value)} placeholder="How you introduce yourself" testId="input-profile-name" />
          <Field label="Role" value={profile.role} onChange={(value) => update('role', value)} placeholder="Founder, builder, operator…" testId="input-profile-role" />
          <Field label="Company" value={profile.company} onChange={(value) => update('company', value)} placeholder="Company name" testId="input-profile-company" />
          <Field label="What the company does" value={profile.companyDescription} onChange={(value) => update('companyDescription', value)} placeholder="A plain-language description" testId="input-profile-company-description" />
        </div>
      </section>
      <section className="mb-8 border-b pb-7" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="mb-5"><div className="eyebrow mb-2">02 / Experience & audience</div><h2 className="serif text-2xl">The context you have earned</h2></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextAreaField label="Background and experience" value={profile.background} onChange={(value) => update('background', value)} placeholder="What have you built, learned, or lived through that shapes your perspective?" testId="input-profile-background" />
          <TextAreaField label="Who you want to reach" value={profile.audience} onChange={(value) => update('audience', value)} placeholder="People you hope your writing helps or challenges" testId="input-profile-audience" />
        </div>
      </section>
      <section className="mb-8 border-b pb-7" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="mb-5"><div className="eyebrow mb-2">03 / Point of view</div><h2 className="serif text-2xl">What you believe</h2></div>
        <TextAreaField label="Beliefs, principles, and opinions" value={profile.pointOfView} onChange={(value) => update('pointOfView', value)} placeholder="What do you believe about your work that you can explain with examples?" testId="input-profile-point-of-view" />
      </section>
      <section className="mb-8 border-b pb-7" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="mb-5"><div className="eyebrow mb-2">04 / Writing voice</div><h2 className="serif text-2xl">How you want to sound</h2></div>
        <TextAreaField label="Voice and writing preferences" value={profile.voice} onChange={(value) => update('voice', value)} placeholder="For example: direct, reflective, specific; short paragraphs; no false certainty." testId="input-profile-voice" />
      </section>
      <section className="mb-8">
        <div className="mb-5"><div className="eyebrow mb-2">05 / Editorial boundaries</div><h2 className="serif text-2xl">Topics to return to—and avoid</h2></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextAreaField label="Topics you care about" value={profile.topics} onChange={(value) => update('topics', value)} placeholder="Themes, problems, and ideas worth revisiting" testId="input-profile-topics" />
          <TextAreaField label="Topics or claims to avoid" value={profile.avoid} onChange={(value) => update('avoid', value)} placeholder="Sensitive subjects, private details, or claims you will not make" testId="input-profile-avoid" />
        </div>
      </section>
      {storageError && <div className="mb-4"><Notice kind="error" testId="error-profile-save">This browser could not save the profile. Check local storage permissions and try again.</Notice></div>}
      {saved && !storageError && <div className="mb-4"><Notice kind="success" testId="status-profile-saved">Profile saved on this device.</Notice></div>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="button-press inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground" type="submit" data-testid="button-save-profile"><FloppyDisk size={17} weight="regular" />Save profile</button>
        <button className="button-press min-h-11 border px-4 text-sm" type="button" onClick={clearProfile} data-testid="button-clear-profile">Clear profile</button>
        <span className="text-xs text-muted-foreground">Stored locally in this browser.</span>
      </div>
    </form>
  </div>;
}

function Field({ label, value, onChange, placeholder, testId }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; testId: string }) {
  return <label className="block"><span className="label">{label}</span><input className="field" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} data-testid={testId} /></label>;
}

function TextAreaField({ label, value, onChange, placeholder, testId }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; testId: string }) {
  return <label className="block"><span className="label">{label}</span><textarea className="field min-h-28 resize-y leading-6" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} data-testid={testId} /></label>;
}
