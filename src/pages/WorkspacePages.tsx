import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, MagnifyingGlass, FolderSimple, Shapes, UserCircle, FileText, ClockCounterClockwise, FloppyDisk, Plus, Trash, PencilSimple, Copy, Check, Sparkle, CheckCircle } from '@phosphor-icons/react';
import { PageHeading } from '@/components/AppShell';
import { Notice } from '@/components/StatusNote';
import { ApiError, demoDrafts, formatLabel, formats, isDemo, platforms, startBillingCheckout, type DraftRecord } from '@/lib/content-api';
import { emptyProfile, type FounderProfile, type WorkspaceProject, type WorkspaceSkill } from '@/lib/workspace-store';

export function HomePage({ drafts, profile }: { drafts: DraftRecord[]; profile: FounderProfile }) {
  const recent = (isDemo ? [...drafts, ...demoDrafts] : drafts).slice().sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')).slice(0, 5);
  const profileReady = [profile.name, profile.company, profile.voice, profile.audience].filter(Boolean).length;
  return <div className="page-wrap">
    <div className="mb-12 grid gap-9 lg:grid-cols-[1.4fr_.6fr] lg:items-end">
      <div><div className="eyebrow mb-4">Your ideas, in your voice</div><h1 className="serif max-w-[700px] text-[45px] leading-[1.02] tracking-[-.03em] sm:text-[66px]">Good content starts<br className="hidden sm:block" /> with real context.</h1>
        <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">Turn what you know into original posts and scripts. Review the draft, make it yours, and keep moving.</p>
        <div className="mt-7 flex flex-wrap gap-3"><Link href="/create" className="button-press inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground">Start with an idea <ArrowRight size={16} /></Link><Link href="/repurpose" className="button-press inline-flex min-h-11 items-center gap-2 border px-4 text-sm">Adapt a draft <ArrowRight size={16} /></Link></div>
      </div>
      <Link href="/settings" className="panel p-5 hover:bg-muted/40" aria-label="Complete founder profile">
        <div className="flex items-start justify-between"><span className="eyebrow">Your context</span><span className="mono text-xs">{profileReady}/4</span></div><p className="serif mt-3 text-xl">{profileReady === 4 ? 'Your voice is ready to guide a draft.' : 'Add a little context once. Use it every time.'}</p><div className="mt-4 h-1.5 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${profileReady * 25}%` }} /></div>
      </Link>
    </div>
    <div className="grid gap-7 lg:grid-cols-[1.15fr_.85fr]">
      <section>
        <div className="mb-4 flex items-end justify-between border-b pb-3" style={{ borderColor: 'hsl(var(--border))' }}><div><div className="eyebrow">Your workspace</div><h2 className="serif mt-1 text-2xl">Recent drafts</h2></div><Link href="/library" className="text-sm underline decoration-border underline-offset-4">View all</Link></div>
        {recent.length ? <div className="grid">{recent.map((draft, index) => <Link key={draft.id} href={`/draft/${encodeURIComponent(draft.id)}`} className="flex items-center justify-between gap-4 border-b py-4 hover:bg-muted/40" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center border" style={{ background: index === 0 ? '#edf3ec' : 'hsl(var(--card))' }}><FileText size={18} /></div><div className="min-w-0"><div className="truncate text-sm font-medium">{draft.title}</div><div className="mt-1 text-xs text-muted-foreground">{formatLabel(draft.format)} · {draft.platform} · Draft</div></div></div><ArrowRight size={16} className="shrink-0 text-muted-foreground" />
        </Link>)}</div> : <div className="border border-dashed p-7"><div className="eyebrow mb-2">A fresh page</div><p className="serif text-xl">Nothing to pick up yet.</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Your drafts save on this device and stay here when you come back.</p><Link href="/create" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm underline decoration-border underline-offset-4">Create your first draft <ArrowRight size={15} /></Link></div>}
      </section>
      <section className="panel p-5 sm:p-6">
        <div className="eyebrow mb-3">Keep it moving</div><h2 className="serif text-2xl">A little context goes a long way.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Set up your voice, project facts, and writing frameworks once. They’ll be ready when you create.</p>
        <div className="mt-5 grid border-t" style={{ borderColor: 'hsl(var(--border))' }}>
          {[{ href: '/projects', label: 'Projects', copy: 'Products, customers, milestones', icon: FolderSimple }, { href: '/skills', label: 'Writing skills', copy: 'Frameworks you want to reuse', icon: Shapes }, { href: '/settings', label: 'Founder profile', copy: 'Experience, audience, and voice', icon: UserCircle }].map(({ href, label, copy, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 border-b py-3" style={{ borderColor: 'hsl(var(--border))' }}>
            <Icon size={19} className="text-muted-foreground" /><span className="flex-1"><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{copy}</span></span><ArrowRight size={15} />
          </Link>)}
        </div>
      </section>
    </div>
  </div>;
}

export function LibraryPage({ drafts }: { drafts: DraftRecord[] }) {
  const entries = isDemo ? [...drafts, ...demoDrafts.filter((fixture) => !drafts.some((draft) => draft.id === fixture.id))] : drafts;
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const filtered = useMemo(() => entries.filter((draft) => (formatFilter === 'all' || draft.format === formatFilter) && (platformFilter === 'all' || draft.platform === platformFilter) && `${draft.title} ${draft.text} ${draft.platform}`.toLowerCase().includes(query.trim().toLowerCase())), [entries, formatFilter, platformFilter, query]);
  return <div className="page-wrap">
    <PageHeading kicker="Your content" title="Draft library" description="Every draft you’ve made, ready to pick up or adapt." />
    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
      <label className="relative flex-1"><span className="sr-only">Search drafts</span><MagnifyingGlass size={17} className="absolute left-3 top-3 text-muted-foreground" /><input className="field pl-9" type="search" placeholder="Search your drafts" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label><span className="sr-only">Filter by format</span><select className="field sm:w-[185px]" value={formatFilter} onChange={(event) => setFormatFilter(event.target.value)}><option value="all">All formats</option>{formats.map((format) => <option value={format} key={format}>{formatLabel(format)}</option>)}</select></label>
      <label><span className="sr-only">Filter by platform</span><select className="field sm:w-[160px]" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}><option value="all">All platforms</option>{platforms.map((platform) => <option value={platform} key={platform}>{platform}</option>)}</select></label>
    </div>
    <div className="mb-3 flex items-center justify-between"><span className="eyebrow">{filtered.length} {filtered.length === 1 ? 'draft' : 'drafts'}</span><Link href="/create" className="inline-flex min-h-10 items-center gap-2 text-sm underline decoration-border underline-offset-4"><Plus size={16} />New draft</Link></div>
    {filtered.length ? <div className="grid gap-3">{filtered.map((draft) => <article key={draft.id} className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="eyebrow">{formatLabel(draft.format)} · {draft.platform}</div><span className="rounded-sm bg-[#eef2ea] px-2 py-1 text-[11px] uppercase tracking-wider text-[#546750]">Draft</span></div>
      <h2 className="serif mt-3 text-2xl">{draft.title}</h2><p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{draft.text}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs text-muted-foreground"><ClockCounterClockwise size={15} />Saved on this device{draft.updatedAt ? ` · ${new Date(draft.updatedAt).toLocaleDateString()}` : ''}</span><div className="flex gap-2"><Link href={`/repurpose?source=${encodeURIComponent(draft.id)}`} className="button-press inline-flex min-h-10 items-center gap-2 border px-3 text-sm">Adapt</Link><Link href={`/draft/${encodeURIComponent(draft.id)}`} className="button-press inline-flex min-h-10 items-center gap-2 bg-primary px-3 text-sm text-primary-foreground">Open draft <ArrowRight size={15} /></Link></div></div>
    </article>)}</div> : <div className="border border-dashed px-5 py-12 text-center"><div className="mx-auto grid h-10 w-10 place-items-center border"><MagnifyingGlass size={18} /></div><h2 className="serif mt-4 text-2xl">{entries.length ? 'No drafts match those filters' : 'Your library is ready when you are'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{entries.length ? 'Clear a filter or try another search.' : 'Create a draft and it will be saved here on this device.'}</p>{!entries.length && <Link href="/create" className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm underline decoration-border underline-offset-4">Start a draft <ArrowRight size={15} /></Link>}</div>}
  </div>;
}

export function DraftDetailPage({ draft, onSave }: { draft?: DraftRecord; onSave: (draft: DraftRecord) => void }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!draft) return <div className="page-wrap"><PageHeading title="Draft not found" description="This draft may have been removed from this browser." /><Link href="/library" className="inline-flex min-h-10 items-center gap-2 underline">Back to library <ArrowRight size={15} /></Link></div>;
  const save = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); onSave(draft); setSaved(true); };
  return <div className="page-wrap max-w-5xl">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Link href="/library" className="inline-flex min-h-10 items-center gap-2 text-sm underline decoration-border underline-offset-4">← Library</Link><div className="flex gap-2"><button className="button-press inline-flex min-h-10 items-center gap-2 border px-3 text-sm" onClick={async () => { try { await navigator.clipboard.writeText(draft.text); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); } }}><Copy size={16} />{copied ? 'Copied' : 'Copy'}</button><Link href={`/repurpose?source=${encodeURIComponent(draft.id)}`} className="button-press inline-flex min-h-10 items-center gap-2 border px-3 text-sm">Adapt this idea <ArrowRight size={15} /></Link></div></div>
    <PageHeading kicker={`${formatLabel(draft.format)} · ${draft.platform}`} title="Review your draft" description="Edits save on this device. You can come back to them later." />
    <form onSubmit={save}>
      <label className="label" htmlFor="draft-title">Draft title</label><input id="draft-title" className="field mb-5 text-lg" value={draft.title} onChange={(event) => { setSaved(false); onSave({ ...draft, title: event.target.value }); }} />
      <label className="label" htmlFor="draft-content">Your content</label><textarea id="draft-content" className="field min-h-[52vh] resize-y px-5 py-5 font-serif text-lg leading-[1.8] sm:px-8" value={draft.text} onChange={(event) => { setSaved(false); onSave({ ...draft, text: event.target.value }); }} />
      <div className="mt-4 flex flex-wrap items-center gap-3"><button type="submit" className="button-press inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground"><FloppyDisk size={17} />Save draft</button>{saved && <span role="status" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Check size={16} />Saved on this device</span>}<span className="text-xs text-muted-foreground">Private draft · not published</span></div>
    </form>
  </div>;
}

type FoundationProps = { page: 'projects' | 'skills'; projects: WorkspaceProject[]; skills: WorkspaceSkill[]; onProjects: (items: WorkspaceProject[]) => void; onSkills: (items: WorkspaceSkill[]) => void };
export function FoundationPage({ page, projects, skills, onProjects, onSkills }: FoundationProps) {
  const isProjects = page === 'projects';
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState('');
  const rows = isProjects ? projects : skills;
  const saveItem = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (isProjects) {
      const item: WorkspaceProject = { id: editingId || crypto.randomUUID(), name: name.trim(), description: description.trim() };
      onProjects(editingId ? projects.map((project) => project.id === editingId ? item : project) : [item, ...projects]);
    } else {
      const item: WorkspaceSkill = { id: editingId || crypto.randomUUID(), name: name.trim(), instructions: description.trim() };
      onSkills(editingId ? skills.map((skill) => skill.id === editingId ? item : skill) : [item, ...skills]);
    }
    setName(''); setDescription(''); setEditingId('');
  };
  const editItem = (id: string, itemName: string, itemDescription: string) => { setEditingId(id); setName(itemName); setDescription(itemDescription); document.getElementById('context-name')?.focus(); };
  const deleteItem = (id: string, label: string) => {
    if (!window.confirm(`Delete “${label}” from this device?`)) return;
    if (isProjects) onProjects(projects.filter((item) => item.id !== id)); else onSkills(skills.filter((item) => item.id !== id));
    if (editingId === id) { setEditingId(''); setName(''); setDescription(''); }
  };
  return <div className="page-wrap">
    <PageHeading kicker={isProjects ? 'Business memory' : 'Reusable frameworks'} title={isProjects ? 'Projects' : 'Writing skills'} description={isProjects ? 'Keep product and customer context handy so drafts stay grounded in the work.' : 'Save writing techniques you want to bring into future drafts.'} />
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <form className="panel p-5 sm:p-6" onSubmit={saveItem}>
        <div className="eyebrow mb-2">{editingId ? 'Edit details' : isProjects ? 'Add a project' : 'Add a writing skill'}</div>
        <label className="label mt-4" htmlFor="context-name">{isProjects ? 'Project name' : 'Skill name'}</label><input id="context-name" className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder={isProjects ? 'e.g. Northstar Studio' : 'e.g. Clear openings'} required />
        <label className="label mt-4" htmlFor="context-description">{isProjects ? 'Useful context' : 'Instructions to apply'}</label><textarea id="context-description" className="field min-h-32 resize-y leading-6" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={isProjects ? 'What it does, who it helps, current priorities…' : 'Describe the technique in a few practical sentences…'} required />
        <div className="mt-4 flex gap-2"><button className="button-press inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground" type="submit"><Plus size={16} />{editingId ? 'Save changes' : 'Save on this device'}</button>{editingId && <button type="button" className="min-h-11 border px-3 text-sm" onClick={() => { setEditingId(''); setName(''); setDescription(''); }}>Cancel</button>}</div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">Available to your workspace on this device. You can edit or remove it at any time.</p>
      </form>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="serif text-2xl">{isProjects ? 'Your projects' : 'Your skills'}</h2><span className="eyebrow">{rows.length} saved</span></div>
        {rows.length ? <div className="grid gap-3">{rows.map((row) => { const label = isProjects ? (row as WorkspaceProject).name : (row as WorkspaceSkill).name; const copy = isProjects ? (row as WorkspaceProject).description : (row as WorkspaceSkill).instructions; return <article key={row.id} className="panel p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium">{label}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{copy}</p></div><div className="flex shrink-0 gap-1"><button className="grid h-9 w-9 place-items-center rounded border hover:bg-muted" onClick={() => editItem(row.id, label, copy)} aria-label={`Edit ${label}`}><PencilSimple size={16} /></button><button className="grid h-9 w-9 place-items-center rounded border hover:bg-muted" onClick={() => deleteItem(row.id, label)} aria-label={`Delete ${label}`}><Trash size={16} /></button></div></div></article>; })}</div> : <div className="border border-dashed p-8 text-center"><div className="serif text-xl">{isProjects ? 'No projects yet' : 'No writing skills yet'}</div><p className="mt-2 text-sm leading-6 text-muted-foreground">{isProjects ? 'Add the product, customer, or milestone details you return to often.' : 'Add a framework to guide tone, structure, or storytelling.'}</p></div>}
      </section>
    </div>
  </div>;
}

export function SettingsPage({ profile, onChange }: { profile: FounderProfile; onChange: (profile: FounderProfile) => void }) {
  const [saved, setSaved] = useState(false);
  const update = (field: keyof FounderProfile, value: string) => { onChange({ ...profile, [field]: value }); setSaved(false); };
  const clearProfile = () => {
    if (!window.confirm('Clear your founder profile from this device? Your drafts will stay.')) return;
    onChange(emptyProfile); setSaved(true);
  };
  const sections: { kicker: string; title: string; fields: { key: keyof FounderProfile; label: string; placeholder: string; long?: boolean }[] }[] = [
    { kicker: '01 / Identity & company', title: 'The person behind the work', fields: [{ key: 'name', label: 'Name', placeholder: 'How you introduce yourself' }, { key: 'role', label: 'Role', placeholder: 'Founder, builder, operator…' }, { key: 'company', label: 'Company', placeholder: 'Company name' }, { key: 'companyDescription', label: 'What the company does', placeholder: 'A plain-language description' }] },
    { kicker: '02 / Experience & audience', title: 'The context you have earned', fields: [{ key: 'background', label: 'Background and experience', placeholder: 'What have you built, learned, or lived through?', long: true }, { key: 'audience', label: 'Who you want to reach', placeholder: 'People your writing should help or challenge', long: true }] },
    { kicker: '03 / Point of view', title: 'What you believe', fields: [{ key: 'pointOfView', label: 'Beliefs, principles, and opinions', placeholder: 'What do you believe about your work? Include examples.', long: true }] },
    { kicker: '04 / Writing voice', title: 'How you want to sound', fields: [{ key: 'voice', label: 'Voice and writing preferences', placeholder: 'For example: direct, reflective, specific; short paragraphs; no false certainty.', long: true }] },
    { kicker: '05 / Editorial boundaries', title: 'Topics to return to—and avoid', fields: [{ key: 'topics', label: 'Topics you care about', placeholder: 'Themes, problems, and ideas worth revisiting', long: true }, { key: 'avoid', label: 'Topics or claims to avoid', placeholder: 'Sensitive subjects, private details, or claims you will not make', long: true }] },
  ];
  return <div className="page-wrap">
    <PageHeading kicker="Your context" title="Founder profile" description="Set this up once. We’ll include it as context whenever you create or adapt a draft." />
    <div className="mb-7 max-w-3xl"><Notice testId="notice-profile-local">Saved on this device and included with your content requests. Backend account sync can be added when the profile endpoint is available.</Notice></div>
    <form className="max-w-4xl" onSubmit={(event) => { event.preventDefault(); setSaved(true); }}>
      {sections.map((section) => <section key={section.kicker} className="mb-8 border-b pb-7" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="mb-5"><div className="eyebrow mb-2">{section.kicker}</div><h2 className="serif text-2xl">{section.title}</h2></div>
        <div className="grid gap-5 sm:grid-cols-2">{section.fields.map((field) => <label key={field.key} className={`block ${field.long ? 'sm:col-span-2' : ''}`}><span className="label">{field.label}</span>{field.long ? <textarea className="field min-h-28 resize-y leading-6" value={profile[field.key]} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} /> : <input className="field" value={profile[field.key]} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} />}</label>)}</div>
      </section>)}
      {saved && <div className="mb-4"><Notice kind="success" testId="status-profile-saved">Profile saved on this device.</Notice></div>}
      <div className="flex flex-wrap items-center gap-3"><button className="button-press inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground" type="submit"><FloppyDisk size={17} />Save profile</button><button className="button-press min-h-11 border px-4 text-sm" type="button" onClick={clearProfile}>Clear profile</button><span className="text-xs text-muted-foreground">Changes are saved as you type.</span></div>
    </form>
  </div>;
}

export function OnboardingPage({ profile, onProfile, projects, onProjects, onComplete }: { profile: FounderProfile; onProfile: (profile: FounderProfile) => void; projects: WorkspaceProject[]; onProjects: (projects: WorkspaceProject[]) => void; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [workingContext, setWorkingContext] = useState(profile);
  const finish = (skipProject = false) => {
    onProfile(workingContext);
    if (!skipProject && projectName.trim()) onProjects([{ id: crypto.randomUUID(), name: projectName.trim(), description: projectDescription.trim() }, ...projects]);
    onComplete();
  };
  return <div className="page-wrap min-h-[80dvh] grid place-items-center">
    <section className="panel w-full max-w-2xl p-6 sm:p-10">
      <div className="mb-6 flex items-center justify-between"><span className="eyebrow">A quick setup · {step + 1} of 3</span><button onClick={() => finish(true)} className="min-h-10 px-2 text-sm text-muted-foreground underline decoration-border underline-offset-4">Skip setup</button></div>
      <div className="mb-7 flex gap-2" aria-label={`Step ${step + 1} of 3`}>{[0, 1, 2].map((item) => <div key={item} className={`h-1.5 flex-1 rounded ${item <= step ? 'bg-primary' : 'bg-muted'}`} />)}</div>
      {step === 0 && <><div className="grid h-11 w-11 place-items-center rounded-full bg-accent"><UserCircle size={23} /></div><h1 className="serif mt-5 text-4xl">Let’s make this sound like you.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">A few details help ground your drafts. You can skip anything and add more later.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><OnboardField label="What should we call you?" value={workingContext.name} onChange={(name) => setWorkingContext({ ...workingContext, name })} placeholder="Your name" /><OnboardField label="What are you building?" value={workingContext.company} onChange={(company) => setWorkingContext({ ...workingContext, company })} placeholder="Company or project" /><OnboardField label="Who do you help?" value={workingContext.audience} onChange={(audience) => setWorkingContext({ ...workingContext, audience })} placeholder="Your audience" /><OnboardField label="How should your writing feel?" value={workingContext.voice} onChange={(voice) => setWorkingContext({ ...workingContext, voice })} placeholder="Direct, warm, specific…" /></div><button className="button-press mt-7 inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground" onClick={() => setStep(1)}>Continue <ArrowRight size={15} /></button></>}
      {step === 1 && <><div className="grid h-11 w-11 place-items-center rounded-full bg-accent"><FolderSimple size={23} /></div><h1 className="serif mt-5 text-4xl">What are you working on?</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Add one project for sharper drafts. Skip if you’d rather start writing now.</p><div className="mt-6 grid gap-4"><OnboardField label="Project or product" value={projectName} onChange={setProjectName} placeholder="e.g. Launching our first product" /><label><span className="label">Useful context</span><textarea className="field min-h-28" value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} placeholder="What it does, who it helps, what’s happening now…" /></label></div><div className="mt-7 flex flex-wrap gap-3"><button className="button-press inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground" onClick={() => setStep(2)}>Continue <ArrowRight size={15} /></button><button className="min-h-11 px-3 text-sm underline decoration-border underline-offset-4" onClick={() => setStep(2)}>Skip this step</button></div></>}
      {step === 2 && <><div className="grid h-11 w-11 place-items-center rounded-full bg-accent"><Sparkle size={23} /></div><h1 className="serif mt-5 text-4xl">You’re ready to get back to work.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Your profile and project details will be included as context when you generate. You can change them any time.</p><div className="mt-6 grid gap-3 text-sm"><div className="flex items-center gap-2"><CheckCircle size={18} className="text-emerald-700" /> Your workspace saves on this device</div><div className="flex items-center gap-2"><CheckCircle size={18} className="text-emerald-700" /> Nothing publishes without your action</div><div className="flex items-center gap-2"><CheckCircle size={18} className="text-emerald-700" /> Your context stays editable</div></div><button className="button-press mt-7 inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground" onClick={() => finish()}>Go to my workspace <ArrowRight size={15} /></button></>}
    </section>
  </div>;
}

function OnboardField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label><span className="label">{label}</span><input className="field" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

const plans = [
  { id: 'beta_monthly', name: 'Early adopter', price: 39, detail: 'For the first 20 founders', featured: true, bullets: ['Founder voice and context', 'Create and adapt drafts', 'Share feedback that shapes the product', 'Optional testimonial, with your permission'] },
  { id: 'founder_monthly', name: 'Founder', price: 59, detail: 'Standard monthly plan', featured: false, bullets: ['Everything in Early adopter', 'Priority access to new workflows', 'Content history and reusable skills', 'Cancel any time'] },
];

export function BillingPage() {
  const [selected, setSelected] = useState('beta_monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(() => {
    const status = new URLSearchParams(window.location.search).get('checkout');
    return status === 'success' ? 'Checkout returned successfully. Your plan will appear once subscription sync is connected.' : status === 'cancelled' ? 'Checkout was cancelled. No payment was taken.' : '';
  });
  async function checkout() {
    setLoading(true); setError(''); setMessage('');
    try {
      const result = await startBillingCheckout(selected);
      window.location.assign(result.checkout_url);
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : null;
      setError(apiError?.code === 'CHECKOUT_UNAVAILABLE' || Boolean(apiError?.message.includes('unexpected response'))
        ? 'Secure checkout is not connected yet. No payment was taken. Your selected plan is saved here.'
        : cause instanceof Error ? cause.message : 'Checkout could not be started. No payment was taken.');
    } finally { setLoading(false); }
  }
  return <div className="page-wrap">
    <PageHeading kicker="Simple monthly pricing" title="More time for the work only you can do." description="A useful content partner should cost less than hiring one—and give you back time every week." />
    {message && <div className="mb-5 max-w-3xl"><Notice kind="success">{message}</Notice></div>}
    {error && <div className="mb-5 max-w-3xl"><Notice kind="error">{error}</Notice></div>}
    <div className="grid items-stretch gap-4 lg:grid-cols-2">{plans.map((plan) => <button key={plan.id} onClick={() => setSelected(plan.id)} aria-pressed={selected === plan.id} className="panel relative flex h-full flex-col p-6 text-left transition sm:p-8" style={{ borderColor: selected === plan.id ? 'hsl(var(--ring))' : 'hsl(var(--border))', boxShadow: selected === plan.id ? '0 0 0 2px hsl(var(--ring) / .22)' : undefined }}>
      {plan.featured && <span className="absolute right-5 top-5 rounded-full bg-accent px-3 py-1 text-[11px] font-medium">First 20 members</span>}
      <span className="eyebrow">{plan.name}</span><div className="mt-5 flex items-baseline gap-2"><span className="serif text-5xl">${plan.price}</span><span className="text-sm text-muted-foreground">/ month</span></div><p className="mt-2 text-sm text-muted-foreground">{plan.detail}</p>
      <div className="mt-6 grid gap-3">{plan.bullets.map((bullet) => <span key={bullet} className="flex items-start gap-2 text-sm"><CheckCircle size={17} className="mt-0.5 shrink-0 text-emerald-700" />{bullet}</span>)}</div>
      <span className="mt-auto pt-7 text-xs text-muted-foreground">{selected === plan.id ? 'Selected plan' : 'Select this plan'} · cancel any time</span>
    </button>)}</div>
    <div className="mt-6 flex flex-wrap items-center gap-4"><button className="button-press inline-flex min-h-12 items-center gap-2 bg-primary px-5 text-sm text-primary-foreground disabled:opacity-50" disabled={loading} onClick={checkout}>{loading ? 'Connecting to checkout…' : 'Continue to secure checkout'} <ArrowRight size={16} /></button><span className="text-xs text-muted-foreground">You’ll review the subscription before paying. No charge until checkout is confirmed.</span></div>
    <p className="mt-4 text-xs text-muted-foreground">Early adopter pricing is for the first 20 members who share product feedback. Any public testimonial is optional and shared only with your permission; final plan terms will be shown at checkout.</p>
  </div>;
}
