import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, MagnifyingGlass, FolderSimple, Shapes, UserCircle, FileText, ClockCounterClockwise, FloppyDisk, Plus, Trash, PencilSimple, Copy, Check, Sparkle, CheckCircle, Buildings, Globe, UploadSimple, NotePencil, ArrowsLeftRight, Books, CreditCard } from '@phosphor-icons/react';
import { PageHeading } from '@/components/AppShell';
import { Notice } from '@/components/StatusNote';
import { ApiError, demoDrafts, formatLabel, formats, isDemo, platforms, startBillingCheckout, type DraftRecord } from '@/lib/content-api';
import { emptyProfile, type FounderProfile, type WorkspaceDocument, type WorkspaceProject, type WorkspaceSkill } from '@/lib/workspace-store';
import { ContentWorkspace } from './ContentWorkspace';
import { FieldnotesAvatar } from '@/components/FieldnotesAvatar';

export function HomePage({ profile, projects, skills, accountType }: { profile: FounderProfile; projects: WorkspaceProject[]; skills: WorkspaceSkill[]; accountType: 'founder' | 'founder_plus_startups' | null }) {
  const tiles = [
    ...(accountType === 'founder_plus_startups' ? [{ href: '/projects', label: 'Startups', detail: `${projects.length} workspaces`, icon: Buildings }] : []),
    { href: '/skills', label: 'Shared skills', detail: `${skills.length} saved`, icon: Shapes },
    { href: '/settings', label: 'Founder profile', detail: profile.name || 'Add your context', icon: UserCircle },
    { href: '/billing', label: 'Plan & billing', detail: accountType === 'founder_plus_startups' ? 'Founder + startups' : 'Manage your plan', icon: CreditCard },
  ];
  return <div className="page-wrap max-w-5xl">
    <div className="mb-10 flex items-center gap-4"><FieldnotesAvatar size={58} /><div><div className="eyebrow mb-2">Fieldnotes</div><h1 className="serif text-4xl leading-tight sm:text-5xl">{accountType === 'founder_plus_startups' ? 'Your workspaces.' : 'Your writing space.'}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{accountType === 'founder_plus_startups' ? 'Choose where you want to write. Each workspace keeps its own drafts and context.' : 'A quiet place for your ideas. Add your voice and context whenever you need it.'}</p></div></div>
    <section aria-label="Build context"><div className="eyebrow mb-3">Build context</div><div className="grid gap-3 sm:grid-cols-2">{tiles.map(({ href, label, detail, icon: Icon }) => <Link key={href} href={href} className="panel flex min-h-24 items-center gap-4 px-5 py-4 transition hover:bg-muted/40"><span className="grid h-11 w-11 shrink-0 place-items-center border"><Icon size={20} /></span><span className="min-w-0 flex-1"><span className="block font-medium">{label}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{detail}</span></span><ArrowRight size={16} className="text-muted-foreground" /></Link>)}</div></section>
    <section className="mt-10" aria-label="Writing workspaces"><div className="mb-3 flex items-center justify-between"><div className="eyebrow">Your writing spaces</div><Link href="/founder" className="text-xs underline decoration-border underline-offset-4">Open Founder workspace</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Link href="/founder" className="panel min-h-32 p-5 hover:bg-muted/40"><div className="flex items-center justify-between"><span className="eyebrow">Personal</span><ArrowRight size={16} /></div><h2 className="serif mt-4 text-xl">Founder</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Write in your own voice, outside any startup.</p></Link>
      {accountType === 'founder_plus_startups' && projects.map((project) => <Link key={project.id} href={`/startups/${encodeURIComponent(project.id)}`} className="panel min-h-32 p-5 hover:bg-muted/40"><div className="flex items-center justify-between"><span className="eyebrow">Startup</span><ArrowRight size={16} /></div><h2 className="serif mt-4 text-xl">{project.name}</h2><p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">{project.description || 'Open to write and manage context.'}</p></Link>)}
    </div></section>
  </div>;
}

export function FounderWorkspacePage({ drafts, profile }: { drafts: DraftRecord[]; profile: FounderProfile }) {
  const recent = (isDemo ? [...drafts, ...demoDrafts.filter((fixture) => !drafts.some((draft) => draft.id === fixture.id))] : drafts).slice().sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')).slice(0, 4);
  const actions = [
    { href: '/create?workspace=founder', title: 'Create', detail: 'Start from an idea, lesson, or point of view.', icon: NotePencil },
    { href: '/repurpose?workspace=founder', title: 'Repurpose', detail: 'Adapt a founder draft for another format.', icon: ArrowsLeftRight },
    { href: '/library?workspace=founder', title: 'Content library', detail: 'Return to personal drafts and keep editing.', icon: Books },
  ];
  return <div className="page-wrap max-w-5xl"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div className="flex items-center gap-4"><FieldnotesAvatar size={62} /><div><div className="eyebrow">Personal workspace</div><h1 className="serif mt-2 text-4xl">{profile.name ? `${profile.name}'s voice.` : 'Founder workspace.'}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Your posts live here, separate from your startup workspaces.</p></div></div><Link href="/settings" className="inline-flex min-h-10 items-center gap-2 border px-3 text-sm"><UserCircle size={16} />Edit founder context</Link></div>
    <div className="grid gap-3 md:grid-cols-3">{actions.map(({ href, title, detail, icon: Icon }) => <Link key={title} href={href} className="panel min-h-36 p-5 hover:bg-muted/40"><div className="flex items-center justify-between"><Icon size={20} /><ArrowRight size={16} /></div><h2 className="serif mt-5 text-xl">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></Link>)}</div>
    <section className="mt-10"><div className="mb-3 flex items-center justify-between"><div><div className="eyebrow">Personal drafts</div><h2 className="serif mt-1 text-2xl">Pick up where you left off</h2></div><Link href="/library?workspace=founder" className="text-sm underline decoration-border underline-offset-4">View library</Link></div>{recent.length ? <div className="grid">{recent.map((draft) => <Link key={draft.id} href={`/draft/${encodeURIComponent(draft.id)}`} className="flex items-center justify-between gap-4 border-b py-4 hover:bg-muted/40"><span className="min-w-0"><span className="block truncate text-sm font-medium">{draft.title}</span><span className="mt-1 block text-xs text-muted-foreground">{formatLabel(draft.format)} · {draft.platform}</span></span><ArrowRight size={16} /></Link>)}</div> : <div className="border border-dashed p-6"><p className="serif text-xl">Your personal drafts will appear here.</p><p className="mt-2 text-sm text-muted-foreground">Start with an idea above. Drafts remain private until you choose to use them.</p></div>}</section>
  </div>;
}

export function LibraryPage({ drafts, workspaceId }: { drafts: DraftRecord[]; workspaceId?: string }) {
  const entries = isDemo && (!workspaceId || workspaceId === 'founder') ? [...drafts, ...demoDrafts.filter((fixture) => !drafts.some((draft) => draft.id === fixture.id))] : drafts;
  const workspaceQuery = workspaceId === 'founder' ? '?workspace=founder' : workspaceId ? `?startup=${encodeURIComponent(workspaceId)}` : '';
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
    <div className="mb-3 flex items-center justify-between"><span className="eyebrow">{filtered.length} {filtered.length === 1 ? 'draft' : 'drafts'}</span><Link href={`/create${workspaceQuery}`} className="inline-flex min-h-10 items-center gap-2 text-sm underline decoration-border underline-offset-4"><Plus size={16} />New draft</Link></div>
    {filtered.length ? <div className="grid gap-3">{filtered.map((draft) => <article key={draft.id} className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="eyebrow">{formatLabel(draft.format)} · {draft.platform}</div><span className="rounded-sm bg-[#eef2ea] px-2 py-1 text-[11px] uppercase tracking-wider text-[#546750]">Draft</span></div>
      <h2 className="serif mt-3 text-2xl">{draft.title}</h2><p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{draft.text}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs text-muted-foreground"><ClockCounterClockwise size={15} />Saved on this device{draft.updatedAt ? ` · ${new Date(draft.updatedAt).toLocaleDateString()}` : ''}</span><div className="flex gap-2"><Link href={`/repurpose${workspaceQuery ? `${workspaceQuery}&` : '?'}source=${encodeURIComponent(draft.id)}`} className="button-press inline-flex min-h-10 items-center gap-2 border px-3 text-sm">Adapt</Link><Link href={`/draft/${encodeURIComponent(draft.id)}`} className="button-press inline-flex min-h-10 items-center gap-2 bg-primary px-3 text-sm text-primary-foreground">Open draft <ArrowRight size={15} /></Link></div></div>
    </article>)}</div> : <div className="border border-dashed px-5 py-12 text-center"><div className="mx-auto grid h-10 w-10 place-items-center border"><MagnifyingGlass size={18} /></div><h2 className="serif mt-4 text-2xl">{entries.length ? 'No drafts match those filters' : 'Your library is ready when you are'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{entries.length ? 'Clear a filter or try another search.' : 'Create a draft and it will be saved here on this device.'}</p>{!entries.length && <Link href={`/create${workspaceQuery}`} className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm underline decoration-border underline-offset-4">Start a draft <ArrowRight size={15} /></Link>}</div>}
  </div>;
}

export function DraftDetailPage({ draft, onSave }: { draft?: DraftRecord; onSave: (draft: DraftRecord) => void }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!draft) return <div className="page-wrap"><PageHeading title="Draft not found" description="This draft may have been removed from this browser." /><Link href="/library" className="inline-flex min-h-10 items-center gap-2 underline">Back to library <ArrowRight size={15} /></Link></div>;
  const workspaceQuery = draft.workspaceId === 'founder' || !draft.workspaceId ? '?workspace=founder' : `?startup=${encodeURIComponent(draft.workspaceId)}`;
  const save = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); onSave(draft); setSaved(true); };
  return <div className="page-wrap max-w-5xl">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Link href={`/library${workspaceQuery}`} className="inline-flex min-h-10 items-center gap-2 text-sm underline decoration-border underline-offset-4">← Library</Link><div className="flex gap-2"><button className="button-press inline-flex min-h-10 items-center gap-2 border px-3 text-sm" onClick={async () => { try { await navigator.clipboard.writeText(draft.text); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); } }}><Copy size={16} />{copied ? 'Copied' : 'Copy'}</button><Link href={`/repurpose${workspaceQuery}&source=${encodeURIComponent(draft.id)}`} className="button-press inline-flex min-h-10 items-center gap-2 border px-3 text-sm">Adapt this idea <ArrowRight size={15} /></Link></div></div>
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
      const item: WorkspaceProject = { id: editingId || crypto.randomUUID(), name: name.trim(), description: '' };
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
  if (isProjects) return <div className="page-wrap">
    <PageHeading kicker="Your companies" title="Startups" description="Each startup gets its own place for context, voice, sources, and drafts. Add a name now; fill in the details when you open it." />
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(280px,.65fr)_minmax(0,1.35fr)]">
      <form className="panel p-5 sm:p-6" onSubmit={saveItem}><div className="eyebrow mb-2">New workspace</div><label className="label mt-4" htmlFor="context-name">Startup name</label><input id="context-name" className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Northstar" required /><button className="button-press mt-4 inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground" type="submit"><Plus size={16} />Add startup</button><p className="mt-3 text-xs leading-5 text-muted-foreground">No setup form yet. You can add the website, product context, sources, and voice inside its workspace.</p></form>
      <section><div className="mb-3 flex items-center justify-between"><h2 className="serif text-2xl">Your startups</h2><span className="eyebrow">{projects.length} {projects.length === 1 ? 'workspace' : 'workspaces'}</span></div>{projects.length ? <div className="grid gap-3 sm:grid-cols-2">{projects.map((project) => <Link key={project.id} href={`/startups/${encodeURIComponent(project.id)}`} className="panel p-5 hover:bg-muted/40"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center border"><Buildings size={19} /></span><ArrowRight size={16} /></div><h3 className="serif mt-4 text-xl">{project.name}</h3><p className="mt-1 text-xs text-muted-foreground">{project.website || 'Context not added yet'}</p><span className="mt-4 inline-flex items-center gap-1 text-xs underline underline-offset-4">Open workspace <ArrowRight size={13} /></span></Link>)}</div> : <div className="border border-dashed p-8 text-center"><div className="serif text-xl">No startup workspaces yet</div><p className="mt-2 text-sm text-muted-foreground">Add a name to get started. Founder-only writing stays available from Home.</p></div>}</section>
    </div>
  </div>;
  return <div className="page-wrap">
    <PageHeading kicker="Reusable frameworks" title="Shared skills" description="Create writing guidance once and choose it in any founder or startup workspace." />
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <form className="panel p-5 sm:p-6" onSubmit={saveItem}>
        <div className="eyebrow mb-2">{editingId ? 'Edit details' : isProjects ? 'Add a project' : 'Add a writing skill'}</div>
        <label className="label mt-4" htmlFor="context-name">{isProjects ? 'Project name' : 'Skill name'}</label><input id="context-name" className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder={isProjects ? 'e.g. Northstar Studio' : 'e.g. Clear openings'} required />
        <label className="label mt-4" htmlFor="context-description">Instructions to apply</label><textarea id="context-description" className="field min-h-32 resize-y leading-6" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the technique in a few practical sentences…" required />
        <label className="mt-4 block"><span className="label">Import a text file <span className="font-normal text-muted-foreground">(optional)</span></span><input className="field h-auto py-2" type="file" accept=".txt,.md,.csv,text/plain,text/markdown" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 100_000) { window.alert('Choose a text file under 100 KB.'); return; } const text = await file.text(); setDescription((current) => current ? `${current}\n\n${text}` : text); if (!name) setName(file.name.replace(/\.[^.]+$/, '')); }} /><span className="mt-1 block text-xs text-muted-foreground">Text is added to the instructions so you can shape it into a reusable skill. Video transcription needs backend support.</span></label>
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

export function StartupWorkspacePage({ project, projects, drafts, profile, skills, onProject, onProjects, onDraft }: { project: WorkspaceProject; projects: WorkspaceProject[]; drafts: DraftRecord[]; profile: FounderProfile; skills: WorkspaceSkill[]; onProject: (project: WorkspaceProject) => void; onProjects: (projects: WorkspaceProject[]) => void; onDraft: (draft: DraftRecord) => void }) {
  const [notice, setNotice] = useState('');
  const documents = project.documents ?? [];
  const update = (patch: Partial<WorkspaceProject>) => onProject({ ...project, ...patch });
  async function addDocument(file?: File) {
    if (!file) return;
    if (file.size > 100_000) { setNotice('For now, add text or Markdown files under 100 KB.'); return; }
    if (!/\.(txt|md|csv)$/i.test(file.name)) { setNotice('This first version can read .txt, .md, and .csv files. PDF and video processing needs the backend ingestion flow.'); return; }
    const text = await file.text();
    const document: WorkspaceDocument = { id: crypto.randomUUID(), name: file.name, text: text.slice(0, 40_000), addedAt: new Date().toISOString() };
    update({ documents: [...documents, document] }); setNotice(`${file.name} added to this device’s source library.`);
  }
  function removeDocument(id: string) { update({ documents: documents.filter((item) => item.id !== id) }); }
  function removeStartup() {
    if (!window.confirm(`Delete the ${project.name} workspace from this device? Its saved drafts remain in your library.`)) return;
    onProjects(projects.filter((item) => item.id !== project.id)); window.location.assign('/projects');
  }
  return <div className="page-wrap max-w-6xl">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><div className="eyebrow">Startup workspace</div><h1 className="serif mt-2 text-4xl">{project.name}</h1></div><Link href="/projects" className="inline-flex min-h-10 items-center gap-2 px-2 text-sm underline decoration-border underline-offset-4">All startups</Link></div>
    <nav className="mb-7 flex flex-wrap gap-2 border-b pb-4" aria-label={`${project.name} workspace`}><Link href={`/create?startup=${encodeURIComponent(project.id)}`} className="button-press inline-flex min-h-10 items-center gap-2 border px-3 text-sm"><NotePencil size={16} />Create</Link><Link href={`/repurpose?startup=${encodeURIComponent(project.id)}`} className="button-press inline-flex min-h-10 items-center gap-2 border px-3 text-sm"><ArrowsLeftRight size={16} />Repurpose</Link><Link href={`/library?startup=${encodeURIComponent(project.id)}`} className="button-press inline-flex min-h-10 items-center gap-2 border px-3 text-sm"><Books size={16} />Content library</Link></nav>
    <details className="panel mb-7 group">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden"><span><span className="block text-sm font-medium">Startup context & voice</span><span className="mt-1 block text-xs text-muted-foreground">{project.website || 'Add a website, product details, and this startup’s voice'}</span></span><PencilSimple size={17} /></summary>
      <div className="grid gap-5 border-t p-5 sm:grid-cols-2" style={{ borderColor: 'hsl(var(--border))' }}>
        <label><span className="label">Startup name</span><input className="field" value={project.name} onChange={(event) => update({ name: event.target.value })} /></label>
        <label><span className="label">Website</span><input className="field" type="url" value={project.website ?? ''} onChange={(event) => update({ website: event.target.value })} placeholder="https://example.com" /><span className="mt-1 block text-xs text-muted-foreground">Website crawling will connect when the backend source-ingestion endpoint is ready.</span></label>
        <label className="sm:col-span-2"><span className="label">What does this product do?</span><textarea className="field min-h-24" value={project.description} onChange={(event) => update({ description: event.target.value })} placeholder="Who it helps, the problem it solves, current priorities…" /></label>
        <label className="sm:col-span-2"><span className="label">Voice for this startup</span><textarea className="field min-h-24" value={project.voice ?? ''} onChange={(event) => update({ voice: event.target.value })} placeholder="For this product, sound more technical, playful, direct…" /><span className="mt-1 block text-xs text-muted-foreground">Overrides or refines your founder voice for this product.</span></label>
        <div className="sm:col-span-2"><div className="mb-2 flex items-center justify-between"><div><div className="text-sm font-medium">Source library</div><div className="mt-1 text-xs text-muted-foreground">Documents can ground drafts in product details and real material.</div></div><label className="button-press inline-flex min-h-10 cursor-pointer items-center gap-2 border px-3 text-sm"><UploadSimple size={16} />Add text file<input className="sr-only" type="file" accept=".txt,.md,.csv,text/plain,text/markdown" onChange={(event) => { void addDocument(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label></div>
          {documents.length ? <div className="grid gap-2">{documents.map((doc) => <div key={doc.id} className="flex items-center gap-3 border px-3 py-2"><FileText size={16} /><span className="min-w-0 flex-1 truncate text-sm">{doc.name}</span><button className="text-xs underline" onClick={() => removeDocument(doc.id)}>Remove</button></div>)}</div> : <div className="border border-dashed px-4 py-5 text-sm text-muted-foreground">No source files yet. Add a small text or Markdown file; its contents stay on this device and inform draft requests.</div>}
          {notice && <p role="status" className="mt-2 text-xs text-muted-foreground">{notice}</p>}
        </div>
        <div className="flex items-center justify-between sm:col-span-2"><p className="text-xs text-muted-foreground">Changes save automatically on this device.</p><button className="text-xs text-destructive underline" type="button" onClick={removeStartup}>Delete startup</button></div>
      </div>
    </details>
    <ContentWorkspace mode="create" drafts={drafts} onDraft={onDraft} profile={profile} projects={projects} skills={skills} workspaceProject={project} />
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
    { kicker: '01 / Identity', title: 'The person behind the work', fields: [{ key: 'name', label: 'Name', placeholder: 'How you introduce yourself' }, { key: 'role', label: 'Role', placeholder: 'Founder, builder, operator…' }] },
    { kicker: '02 / Experience & audience', title: 'The context you have earned', fields: [{ key: 'background', label: 'Background and experience', placeholder: 'What have you built, learned, or lived through?', long: true }, { key: 'audience', label: 'Who you want to reach', placeholder: 'People your writing should help or challenge', long: true }] },
    { kicker: '03 / Point of view', title: 'What you believe', fields: [{ key: 'pointOfView', label: 'Beliefs, principles, and opinions', placeholder: 'What do you believe about your work? Include examples.', long: true }] },
    { kicker: '04 / Writing voice', title: 'How you want to sound', fields: [{ key: 'voice', label: 'Voice and writing preferences', placeholder: 'For example: direct, reflective, specific; short paragraphs; no false certainty.', long: true }] },
    { kicker: '05 / Editorial boundaries', title: 'Topics to return to—and avoid', fields: [{ key: 'topics', label: 'Topics you care about', placeholder: 'Themes, problems, and ideas worth revisiting', long: true }, { key: 'avoid', label: 'Topics or claims to avoid', placeholder: 'Sensitive subjects, private details, or claims you will not make', long: true }] },
    { kicker: '06 / Public profiles', title: 'Where people can find your work', fields: [{ key: 'linkedin', label: 'LinkedIn profile', placeholder: 'https://linkedin.com/in/you' }, { key: 'x', label: 'X profile', placeholder: 'https://x.com/you' }, { key: 'website', label: 'Personal website', placeholder: 'https://your-site.com' }] },
  ];
  return <div className="page-wrap">
    <PageHeading kicker="Your context" title="Founder profile" description="Set this up once. We’ll include it as context whenever you create or adapt a draft." />
    <div className="mb-7 max-w-3xl"><Notice testId="notice-profile-local">Saved on this device and included with your content requests. Backend account sync can be added when the profile endpoint is available.</Notice></div>
    <form className="max-w-4xl" onSubmit={(event) => { event.preventDefault(); setSaved(true); }}>
      {sections.map((section, sectionIndex) => <details key={section.kicker} className="mb-3 border px-5" open={sectionIndex === 0}>
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden"><span><span className="eyebrow">{section.kicker}</span><span className="serif mt-1 block text-xl">{section.title}</span></span><span className="text-sm text-muted-foreground">{sectionIndex === 0 ? 'Core' : 'Optional'}</span></summary>
        <div className="grid gap-5 border-t pb-6 pt-5 sm:grid-cols-2" style={{ borderColor: 'hsl(var(--border))' }}>{section.fields.map((field) => <label key={field.key} className={`block ${field.long ? 'sm:col-span-2' : ''}`}><span className="label">{field.label}</span>{field.long ? <textarea className="field min-h-28 resize-y leading-6" value={profile[field.key]} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} /> : <input className="field" value={profile[field.key]} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} />}</label>)}</div>
      </details>)}
      {saved && <div className="mb-4"><Notice kind="success" testId="status-profile-saved">Profile saved on this device.</Notice></div>}
      <div className="flex flex-wrap items-center gap-3"><button className="button-press inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground" type="submit"><FloppyDisk size={17} />Save profile</button><button className="button-press min-h-11 border px-4 text-sm" type="button" onClick={clearProfile}>Clear profile</button><span className="text-xs text-muted-foreground">Changes are saved as you type.</span></div>
    </form>
  </div>;
}

export function OnboardingPage({ profile, onProfile, onComplete }: { profile: FounderProfile; onProfile: (profile: FounderProfile) => void; onComplete: (accountType: 'founder' | 'founder_plus_startups') => void }) {
  const [name, setName] = useState(profile.name);
  const [hasStartup, setHasStartup] = useState(false);
  function finish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    onProfile({ ...profile, name: cleanName });
    onComplete(hasStartup ? 'founder_plus_startups' : 'founder');
  }
  return <div className="page-wrap grid min-h-[80dvh] place-items-center">
    <form className="panel w-full max-w-lg p-6 sm:p-9" onSubmit={finish}>
      <img src="/logo.svg" alt="" className="mb-6 h-10 w-10" />
      <div className="eyebrow">A quick setup</div><h1 className="serif mt-2 text-4xl">Make this yours.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">A couple of details to set up your workspace. Add context whenever it becomes useful.</p>
      <label className="mt-6 block"><span className="label">Your name</span><input autoComplete="given-name" required autoFocus className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Onimisi" /></label>
      <label className="mt-4 flex cursor-pointer items-start gap-3 border p-4">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={hasStartup} onChange={(event) => setHasStartup(event.target.checked)} />
        <span><span className="block text-sm font-medium">I have a startup I want to create content for</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Startup workspaces will appear when you need them. You can also just write as a founder.</span></span>
      </label>
      <button type="submit" className="button-press mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-primary px-4 text-sm text-primary-foreground">See my workspace <ArrowRight size={15} /></button>
      <p className="mt-4 text-center text-xs text-muted-foreground">Private drafts. No setup marathon. You can add your voice and sources later.</p>
    </form>
  </div>;
}

const plans = [
  { id: 'beta_monthly', name: 'Early adopter', price: 29, detail: 'Up to 2 startup workspaces · first 20 founders', featured: true, bullets: ['Founder voice plus startup-specific context', 'Shared skills across workspaces', 'Draft from your source library', 'Feedback shapes the product; testimonials are optional'] },
  { id: 'founder_plus_2_monthly', name: 'Founder + 2 startups', price: 39, detail: 'Up to 2 startup workspaces', featured: false, bullets: ['Personal founder writing workspace', 'Startup context, voice, and draft library', 'Reusable shared skills', 'Cancel any time'] },
  { id: 'portfolio_monthly', name: 'Portfolio', price: 75, detail: 'Up to 5 startup workspaces', featured: false, bullets: ['Everything in Founder', 'Separate source libraries and voices', 'Import context across startups', 'Built for multi-product founders'] },
];

export function BillingPage({ accountType, onAccountType }: { accountType: 'founder' | 'founder_plus_startups' | null; onAccountType: (type: 'founder' | 'founder_plus_startups') => void }) {
  const [selected, setSelected] = useState(accountType === 'founder' ? 'founder_only_monthly' : 'beta_monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(() => {
    const status = new URLSearchParams(window.location.search).get('checkout');
    return status === 'success' ? 'Checkout returned successfully. Your plan will appear once subscription sync is connected.' : status === 'cancelled' ? 'Checkout was cancelled. No payment was taken.' : '';
  });
  const selectedAccountType = accountType ?? 'founder';
  async function checkout() {
    setLoading(true); setError(''); setMessage('');
    try {
      const result = await startBillingCheckout(selected, selectedAccountType);
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
    <section className="mb-7"><div className="eyebrow mb-3">Choose your account setup</div><div className="grid gap-3 md:grid-cols-2"><button type="button" aria-pressed={selectedAccountType === 'founder'} onClick={() => { onAccountType('founder'); setSelected('founder_only_monthly'); }} className="panel p-4 text-left" style={{ borderColor: selectedAccountType === 'founder' ? 'hsl(var(--ring))' : 'hsl(var(--border))' }}><span className="font-medium">Founder workspace · $15/month</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Keep a personal writing space for your own voice.</span></button><button type="button" aria-pressed={selectedAccountType === 'founder_plus_startups'} onClick={() => { onAccountType('founder_plus_startups'); setSelected((current) => current === 'founder_only_monthly' ? 'beta_monthly' : current); }} className="panel p-4 text-left" style={{ borderColor: selectedAccountType === 'founder_plus_startups' ? 'hsl(var(--ring))' : 'hsl(var(--border))' }}><span className="font-medium">Founder + Startups <span className="ml-1 rounded-full bg-accent px-2 py-1 text-[10px]">5% off</span></span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Keep personal posts separate and add a capacity plan for your products.</span></button></div></section>
    {selectedAccountType === 'founder' ? <div className="panel max-w-2xl p-6 sm:p-8"><div className="eyebrow mb-2">Founder plan</div><h2 className="serif text-3xl">A focused space for your ideas.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Create and refine personal founder content with your voice and reusable skills.</p><div className="mt-5 flex items-baseline gap-2"><span className="serif text-5xl">$15</span><span className="text-sm text-muted-foreground">/ month</span></div><button disabled={loading} onClick={checkout} className="button-press mt-5 inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground">{loading ? 'Connecting to checkout…' : 'Continue to secure checkout'} <ArrowRight size={15} /></button><p className="mt-3 text-xs text-muted-foreground">Want startup workspaces too? Choose Founder + Startups to see capacity plans.</p></div> : <>
    <div className="mb-3 flex items-end justify-between"><div><div className="eyebrow">Startup capacity</div><h2 className="serif mt-1 text-2xl">Choose a plan</h2></div><span className="text-xs font-medium text-emerald-700">5% bundle discount applied</span></div>
    <div className="grid items-stretch gap-4 lg:grid-cols-3">{plans.map((plan) => { const regularBundle = 15 + plan.price; const discountedPrice = Math.round(regularBundle * 0.95 * 100) / 100; return <button key={plan.id} onClick={() => setSelected(plan.id)} aria-pressed={selected === plan.id} className="panel relative flex h-full flex-col p-6 text-left transition sm:p-8" style={{ borderColor: selected === plan.id ? 'hsl(var(--ring))' : 'hsl(var(--border))', boxShadow: selected === plan.id ? '0 0 0 2px hsl(var(--ring) / .22)' : undefined }}>
      {plan.featured && <span className="absolute right-5 top-5 rounded-full bg-accent px-3 py-1 text-[11px] font-medium">First 20 members</span>}
      <span className="eyebrow">{plan.name}</span><div className="mt-5 flex items-baseline gap-2"><span className="serif text-5xl">${discountedPrice.toFixed(2)}</span><span className="text-sm text-muted-foreground">/ month</span></div><p className="mt-2 text-sm text-muted-foreground">${15} Founder + ${plan.price} startup plan · normally ${regularBundle}</p><p className="mt-1 text-xs font-medium text-emerald-700">5% off your combined monthly plan</p><p className="mt-2 text-sm text-muted-foreground">{plan.detail}</p>
      <div className="mt-6 grid gap-3">{plan.bullets.map((bullet) => <span key={bullet} className="flex items-start gap-2 text-sm"><CheckCircle size={17} className="mt-0.5 shrink-0 text-emerald-700" />{bullet}</span>)}</div>
      <span className="mt-auto pt-7 text-xs text-muted-foreground">{selected === plan.id ? 'Selected plan' : 'Select this plan'} · cancel any time</span>
    </button>; })}</div>
    <div className="mt-5 border border-dashed p-4 text-sm"><span className="font-medium">More than five startups?</span><span className="ml-2 text-muted-foreground">We’ll offer custom pricing for larger portfolios. Custom billing setup is not connected yet.</span></div>
    <div className="mt-6 flex flex-wrap items-center gap-4"><button className="button-press inline-flex min-h-12 items-center gap-2 bg-primary px-5 text-sm text-primary-foreground disabled:opacity-50" disabled={loading} onClick={checkout}>{loading ? 'Connecting to checkout…' : 'Continue to secure checkout'} <ArrowRight size={16} /></button><span className="text-xs text-muted-foreground">You’ll review the subscription before paying. No charge until checkout is confirmed.</span></div>
    <p className="mt-4 text-xs text-muted-foreground">Early adopter pricing is for the first 20 members who share product feedback. Any public testimonial is optional and shared only with your permission; final plan terms will be shown at checkout.</p></>}
  </div>;
}
