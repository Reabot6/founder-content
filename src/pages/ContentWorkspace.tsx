import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Copy, FileText, Microphone, VideoCamera, ListChecks, ArrowCounterClockwise, Question, FloppyDisk, Sparkle } from '@phosphor-icons/react';
import { Link } from 'wouter';
import { z } from 'zod';
import { ApiError, demoDrafts, formatLabel, getJob, isDemo, platforms, startGeneration, startRepurpose, type ContentFormat, type DraftRecord, type Platform, type JobResponse } from '@/lib/content-api';
import { Notice, LoadingLine } from '@/components/StatusNote';
import { PageHeading } from '@/components/AppShell';
import type { FounderProfile, WorkspaceProject, WorkspaceSkill } from '@/lib/workspace-store';

const formatIcons = { written_post: FileText, short_video: VideoCamera, long_video: Microphone, talking_points: ListChecks };
const formatOptions: { value: ContentFormat; label: string; hint: string }[] = [
  { value: 'written_post', label: 'Written post', hint: 'A clear, considered social post' },
  { value: 'short_video', label: 'Short video', hint: 'A concise spoken script' },
  { value: 'long_video', label: 'Long video', hint: 'A structured longer script' },
  { value: 'talking_points', label: 'Talking points', hint: 'A flexible outline to speak from' },
];

export function ContentWorkspace({ mode, drafts, onDraft, profile, projects, skills: availableSkills, workspaceProject }: { mode: 'create' | 'repurpose'; drafts: DraftRecord[]; onDraft: (draft: DraftRecord) => void; profile: FounderProfile; projects: WorkspaceProject[]; skills: WorkspaceSkill[]; workspaceProject?: WorkspaceProject }) {
  const [topic, setTopic] = useState('');
  const [objective, setObjective] = useState('');
  const [format, setFormat] = useState<ContentFormat>('written_post');
  const [platform, setPlatform] = useState<Platform>('LinkedIn');
  const [project, setProject] = useState(workspaceProject?.id ?? '');
  const [importedProjectIds, setImportedProjectIds] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [sourceId, setSourceId] = useState(() => new URLSearchParams(window.location.search).get('source') ?? '');
  const [activeDraftId, setActiveDraftId] = useState('');
  const [jobId, setJobId] = useState('');
  const [jobStarted, setJobStarted] = useState<number | null>(null);
  const [localError, setLocalError] = useState('');
  const [completed, setCompleted] = useState<Extract<JobResponse, { status: 'completed' }>['data'] | null>(null);

  const sourceDrafts = isDemo ? [...demoDrafts, ...drafts] : drafts;
  const selectedSource = sourceDrafts.find((draft) => draft.id === sourceId);
  const selectedProject = workspaceProject ?? projects.find((item) => item.id === project);
  const importedProjects = projects.filter((item) => importedProjectIds.includes(item.id) && item.id !== selectedProject?.id);
  const contextFor = (item: WorkspaceProject) => [item.name, item.website && `Website: ${item.website}`, item.description, item.voice && `Startup-specific voice: ${item.voice}`, ...(item.documents ?? []).map((doc) => `Source: ${doc.name}\n${doc.text}`)].filter(Boolean).join('\n\n');
  const combinedProjectContext = [selectedProject, ...importedProjects].filter((item): item is WorkspaceProject => Boolean(item)).map(contextFor).join('\n\n--- Imported startup context ---\n\n').slice(0, 60_000);
  const selectedSkillInstructions = availableSkills.filter((item) => skills.includes(item.id)).map((item) => `${item.name}: ${item.instructions}`);
  const founderContext = Object.fromEntries(Object.entries(profile).filter(([key, value]) => key !== 'company' && key !== 'companyDescription' && value.trim())) as Record<string, string>;
  const requestMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'create') {
        const valid = z.object({ topic: z.string().trim().min(8, 'Add a little more detail to your idea.'), objective: z.string().trim().min(3, 'Add an objective to guide the draft.') }).safeParse({ topic, objective });
        if (!valid.success) throw new ApiError(valid.error.issues[0]?.message ?? 'Check your inputs.', 'INVALID_PAYLOAD', false);
        return startGeneration({
          topic: valid.data.topic,
          content_format: format,
          platform,
          objective: valid.data.objective,
          skill_version_ids: [],
          founder_context: founderContext,
          ...(selectedProject ? { project_id: selectedProject.id, project_context: combinedProjectContext } : {}),
          ...(selectedSkillInstructions.length ? { custom_skill_instructions: selectedSkillInstructions } : {}),
        });
      }
      if (!selectedSource) throw new ApiError('Choose a source draft before continuing.', 'INVALID_PAYLOAD', false);
      if (!selectedSource.demo && !isDemo && !selectedSource.id.startsWith('live-')) {
        throw new ApiError('This source is not available to the live service.', 'INVALID_PAYLOAD', false);
      }
      if (!objective.trim()) throw new ApiError('Add an objective for this adaptation.', 'INVALID_PAYLOAD', false);
      return startRepurpose({
        parent_content_id: selectedSource.id.replace(/^live-/, ''),
        target_format: format,
        target_platform: platform,
        objective: objective.trim(),
        skill_version_ids: [],
        founder_context: founderContext,
        ...(selectedProject ? { project_id: selectedProject.id, project_context: combinedProjectContext } : {}),
        ...(selectedSkillInstructions.length ? { custom_skill_instructions: selectedSkillInstructions } : {}),
      });
    },
    onSuccess: (result) => {
      setLocalError('');
      setCompleted(null);
      setJobStarted(Date.now());
      setJobId(result.job_id);
    },
    onError: (error: Error) => setLocalError(error.message),
  });

  const jobQuery = useQuery({
    queryKey: ['content-job', jobId],
    queryFn: () => getJob(jobId),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      if (!jobStarted || Date.now() - jobStarted > 180_000) return false;
      const state = query.state.data;
      return state && state.status !== 'processing' ? false : 2500;
    },
    retry: (failureCount, error) => error instanceof ApiError ? error.retryable && failureCount < 2 : failureCount < 2,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 6000),
  });

  useEffect(() => {
    const value = jobQuery.data;
    if (!value || value.status !== 'completed') return;
    const record: DraftRecord = {
      id: `${isDemo ? 'demo-' : 'live-'}${value.data.content_id}`,
      title: topic.trim() || (selectedSource ? `Adaptation of ${selectedSource.title}` : 'Generated draft'),
      format: value.data.content_format,
      platform,
      text: value.data.draft_content,
      demo: isDemo,
      updatedAt: new Date().toISOString(),
      ...(workspaceProject ? { workspaceId: workspaceProject.id } : {}),
      ...(!workspaceProject && selectedProject ? { workspaceId: selectedProject.id } : {}),
    };
    onDraft(record);
    setActiveDraftId(record.id);
    setCompleted(value.data);
  }, [jobQuery.data, onDraft, platform, selectedSource, topic, workspaceProject]);

  const timedOut = Boolean(jobId && jobStarted && Date.now() - jobStarted >= 180_000 && !completed && jobQuery.data?.status === 'processing');
  const jobError = jobQuery.data?.status === 'error' ? jobQuery.data.error.message : '';
  const loading = requestMutation.isPending || (Boolean(jobId) && !completed && !jobError && !timedOut && !jobQuery.isError);

  function retryRequest() {
    setJobId('');
    setJobStarted(null);
    setCompleted(null);
    setLocalError('');
    requestMutation.mutate();
  }

  return <div className="page-wrap">
    <PageHeading kicker={mode === 'create' ? 'New generation' : 'Intentional adaptation'} title={mode === 'create' ? 'Give the idea a shape.' : 'Carry the idea forward.'} description={mode === 'create' ? 'Start with something you have actually seen, learned, or changed your mind about.' : 'Keep the original idea. Change the delivery with purpose.'} />
    {isDemo && <div className="mb-6"><Notice testId="notice-demo">Demo mode is on. Results use local sample data and are not generated by a production model.</Notice></div>}
    {mode === 'repurpose' && !sourceDrafts.length && <div className="mb-6"><Notice testId="notice-no-source">Your library is empty. Create a draft first, then come back to adapt it.</Notice></div>}
    {completed ? <ResultEditor
      content={completed.draft_content}
      format={completed.content_format}
      platform={platform}
      evaluator={completed.evaluator_result}
      appliedSkills={completed.applied_skill_versions}
      demo={isDemo}
      onSave={(text) => { const draft = drafts.find((item) => item.id === activeDraftId); if (draft) onDraft({ ...draft, text, updatedAt: new Date().toISOString() }); }}
      onNew={() => { setJobId(''); setCompleted(null); setJobStarted(null); setLocalError(''); setActiveDraftId(''); }}
      onBack={() => { setJobId(''); setCompleted(null); setJobStarted(null); setActiveDraftId(''); }}
    /> : <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(270px,.72fr)]">
      <form className="panel p-5 sm:p-7" onSubmit={(event) => { event.preventDefault(); setLocalError(''); requestMutation.mutate(); }} data-testid={`form-${mode}`}>
        {mode === 'repurpose' && <section className="mb-7">
          <div className="mb-3 flex items-center justify-between"><label className="label mb-0" htmlFor="source-select">Source content</label><span className="eyebrow">Saved drafts</span></div>
          {sourceDrafts.length ? <select id="source-select" className="field" value={sourceId} onChange={(e) => setSourceId(e.target.value)} data-testid="select-source">
            <option value="">Choose a draft</option>
            {sourceDrafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.title} · {formatLabel(draft.format)}</option>)}
          </select> : <div className="border p-4 text-sm text-muted-foreground">Generate your first draft to use it as a source here.</div>}
          {selectedSource && <div className="mt-3 border-l-2 pl-4 py-1" style={{ borderColor: 'hsl(var(--ring))' }}>
            <div className="eyebrow mb-1">{selectedSource.platform} / {formatLabel(selectedSource.format)}</div>
            <p className="max-h-64 overflow-y-auto whitespace-pre-line pr-2 text-sm leading-6 text-muted-foreground" data-testid="text-source-preview">{selectedSource.text}</p>
          </div>}
        </section>}
        {mode === 'create' && <>
          <div className="mb-6">
            <label htmlFor="topic" className="label">What are you thinking about?</label>
            <textarea id="topic" rows={4} className="field resize-y leading-6" placeholder="A real moment, lesson, opinion, or question…" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-topic" required minLength={8} />
            <p className="mt-2 text-xs text-muted-foreground">Specific details help preserve your point of view. Avoid adding anything you cannot stand behind.</p>
            {selectedProject && (selectedProject.documents?.length ?? 0) > 0 && <button type="button" className="mt-3 inline-flex min-h-9 items-center gap-2 border px-3 text-xs hover:bg-muted" onClick={() => { setTopic(`Find a useful, specific post idea in ${selectedProject.name}'s source library. Choose one concrete insight and write an original post grounded in the uploaded material.`); setObjective(`Turn a useful insight from ${selectedProject.name}'s source documents into a clear, founder-led social post.`); }}><Sparkle size={15} />Use my sources as the starting point</button>}
          </div>
          <div className="mb-6 grid gap-5 sm:grid-cols-2 form-columns">
            {!workspaceProject && <div><label htmlFor="project" className="label">Write about <span className="font-normal text-muted-foreground">(optional)</span></label>
              <select className="field" id="project" value={project} onChange={(e) => setProject(e.target.value)} data-testid="select-project">
                <option value="">Me as a founder</option>
                {projects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
              </select>
              {!projects.length && <p className="mt-1.5 text-xs text-muted-foreground">You can add startups later from <Link href="/projects" className="underline">Startups</Link>.</p>}
            </div>}
            {workspaceProject && <div className="flex items-end"><div className="w-full border-l-2 py-1 pl-3" style={{ borderColor: 'hsl(var(--ring))' }}><span className="eyebrow">Writing about</span><div className="mt-1 text-sm font-medium">{workspaceProject.name}</div></div></div>}
            <div><label htmlFor="platform" className="label">Platform</label><select className="field" id="platform" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} data-testid="select-platform">
              {platforms.map((item) => <option value={item} key={item}>{item}</option>)}
            </select></div>
          </div>
          {workspaceProject && projects.length > 1 && <details className="mb-6 border px-4"><summary className="flex min-h-11 cursor-pointer items-center text-sm">Use context from another startup <span className="ml-2 text-xs text-muted-foreground">(optional)</span></summary><div className="grid gap-2 border-t py-3 sm:grid-cols-2" style={{ borderColor: 'hsl(var(--border))' }}>{projects.filter((item) => item.id !== workspaceProject.id).map((item) => <label key={item.id} className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" checked={importedProjectIds.includes(item.id)} onChange={(event) => setImportedProjectIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />{item.name}</label>)}</div><p className="pb-3 text-xs text-muted-foreground">Selected context and source text will be included with this draft request.</p></details>}
        </>}
        <div className="mb-6">
          <div className="label mb-3">Format</div>
          <div className="grid grid-cols-2 gap-2">
          {formatOptions.map(({ value, label, hint }) => { const Icon = formatIcons[value]; return <button type="button" key={value} onClick={() => setFormat(value)} aria-pressed={format === value} className="button-press flex min-h-[77px] items-start gap-3 border p-3 text-left" style={{ borderColor: format === value ? 'hsl(var(--foreground))' : 'hsl(var(--border))', background: format === value ? 'hsl(var(--muted))' : 'hsl(var(--card))' }} data-testid={`button-format-${value}`}>
              <Icon size={19} weight="regular" className="mt-0.5 shrink-0" /><span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{hint}</span></span>
            </button>; })}
          </div>
        </div>
        {mode === 'repurpose' && <div className="mb-6"><label htmlFor="platform" className="label">Target platform</label><select className="field" id="platform" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} data-testid="select-platform">{platforms.map((item) => <option key={item}>{item}</option>)}</select></div>}
        <div className="mb-6">
          <label className="label" htmlFor="objective">What should this piece do?</label>
          <input id="objective" className="field" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="e.g. Share a lesson with other early-stage founders" data-testid="input-objective" required />
        </div>
        <section className="mb-6 border-t pt-5" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center justify-between"><div><div className="text-sm font-medium">Writing skills</div><div className="mt-1 text-xs text-muted-foreground">Use your saved frameworks for this draft.</div></div><Question size={18} weight="regular" className="text-muted-foreground" aria-hidden="true" /></div>
          {availableSkills.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{availableSkills.map((skill) => <label key={skill.id} className="flex min-h-10 items-center gap-2 rounded border px-3 text-sm"><input type="checkbox" checked={skills.includes(skill.id)} onChange={(e) => setSkills((current) => e.target.checked ? [...current, skill.id] : current.filter((id) => id !== skill.id))} />{skill.name}</label>)}</div> : <Link href="/skills" className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm underline decoration-border underline-offset-4">Add a writing skill <ArrowRight size={14} /></Link>}
          {selectedSkillInstructions.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Selected instructions will be included with this request.</p>}
        </section>
        {localError && <div className="mb-4"><Notice kind="error" testId="error-request">{localError} {requestMutation.error instanceof ApiError && requestMutation.error.retryable && <span> You can try again; your inputs are preserved.</span>}</Notice></div>}
        {jobError && <div className="mb-4"><Notice kind="error" testId="error-job">{jobError} {jobQuery.data?.status === 'error' && jobQuery.data.error.retryable ? 'Retrying is available.' : ''}</Notice></div>}
        {jobQuery.isError && <div className="mb-4"><Notice kind="error" testId="error-poll">{jobQuery.error.message} Your form is still here.</Notice></div>}
        {timedOut && <div className="mb-4"><Notice kind="error" testId="error-timeout">This job has not returned a final result yet. Polling stopped after three minutes. Your inputs are still here.</Notice></div>}
        {loading && <div className="mb-4"><LoadingLine label={jobQuery.data?.status === 'processing' ? jobQuery.data.data.message : 'Waiting for the content service…'} /></div>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="button-press inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50" disabled={loading || (mode === 'repurpose' && !selectedSource)} data-testid={`button-submit-${mode}`}>
            {loading ? 'Working…' : mode === 'create' ? 'Create draft' : 'Adapt this draft'} {!loading && <ArrowRight size={15} />}
          </button>
          {(jobError || jobQuery.isError || timedOut) && <button type="button" className="button-press inline-flex min-h-11 items-center gap-2 border px-4 text-sm" onClick={retryRequest} data-testid="button-retry"><ArrowCounterClockwise size={16} weight="regular" /> Try again</button>}
          <span className="text-[11px] text-muted-foreground">Draft only. Nothing is published.</span>
        </div>
      </form>
      <aside className="grid gap-4">
        <div className="border-l-2 pl-5 py-1" style={{ borderColor: '#9eae9d' }}>
          <div className="eyebrow mb-2">A useful starting point</div>
          <p className="serif text-[25px] leading-[1.2]">Specificity is a form of credibility.</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Name the moment. Say what surprised you. The system can help shape it, but the original insight has to be yours.</p>
        </div>
        <div className="panel p-5">
          <div className="eyebrow mb-3">The workflow</div>
          <ol className="grid gap-3 text-sm">
            <li className="flex gap-3"><span className="mono text-xs text-muted-foreground">01</span><span>Bring a real idea or source draft.</span></li>
            <li className="flex gap-3"><span className="mono text-xs text-muted-foreground">02</span><span>Choose a format and a clear objective.</span></li>
            <li className="flex gap-3"><span className="mono text-xs text-muted-foreground">03</span><span>Review and save. Your draft stays in your library.</span></li>
          </ol>
        </div>
        <Link href="/settings" className="flex items-center justify-between border p-4 text-sm hover:bg-muted" data-testid="link-add-context">
          <span><span className="block font-medium">Your founder context</span><span className="mt-1 block text-xs text-muted-foreground">Included with each generation request</span></span><ArrowRight size={16} weight="regular" />
        </Link>
      </aside>
    </div>}
  </div>;
}

function ResultEditor({ content, format, platform, evaluator, appliedSkills, demo, onNew, onBack, onSave }: {
  content: string; format: ContentFormat; platform: Platform; evaluator: { status: string; confidence_score?: number; reasoning?: string }; appliedSkills: string[]; demo: boolean; onNew: () => void; onBack: () => void; onSave: (text: string) => void;
}) {
  const [draft, setDraft] = useState(content);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return <section className="max-w-4xl" data-testid="section-result">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'hsl(var(--border))' }}>
      <div><div className="eyebrow mb-2">Draft / not published</div><div className="flex items-center gap-2 text-sm"><span>{formatLabel(format)}</span><span className="text-muted-foreground">·</span><span>{platform}</span><span className="ml-1 rounded-sm px-2 py-1 text-[10px] uppercase tracking-wider" style={{ background: '#eef2ea', color: '#546750' }}>Draft</span></div></div>
      <button type="button" className="button-press flex h-10 items-center gap-2 border px-3 text-sm" onClick={copyDraft} data-testid="button-copy">{copied ? <Check size={16} weight="regular" /> : <Copy size={16} weight="regular" />}{copied ? 'Copied' : 'Copy draft'}</button>
    </div>
    {demo && <div className="mb-5"><Notice testId="notice-demo-result">Demonstration output. A production model was not used.</Notice></div>}
    <label htmlFor="draft-editor" className="label">Review and edit</label>
    <textarea id="draft-editor" className="field min-h-[380px] resize-y whitespace-pre-wrap px-5 py-5 font-serif text-[17px] leading-[1.8] sm:px-8 sm:py-7 sm:text-lg" value={draft} onChange={(e) => { setDraft(e.target.value); setSaved(false); }} data-testid="input-draft-editor" />
    <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" className="button-press inline-flex min-h-10 items-center gap-2 border px-3 text-sm" onClick={() => { onSave(draft); setSaved(true); }}><FloppyDisk size={16} />Save edits</button>{saved && <span role="status" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Check size={15} />Saved to this device</span>}<span className="text-xs text-muted-foreground">Private draft · not published</span></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className="panel p-4"><div className="eyebrow mb-2">Evaluator</div><div className="text-sm font-medium" data-testid="text-evaluator-status">{evaluator.status}</div>{typeof evaluator.confidence_score === 'number' && <div className="mt-1 text-xs text-muted-foreground">Confidence: {Math.round(evaluator.confidence_score * 100)}%</div>}{evaluator.reasoning && <p className="mt-2 text-xs leading-5 text-muted-foreground">{evaluator.reasoning}</p>}</div>
      <div className="panel p-4"><div className="eyebrow mb-2">Applied skills</div>{appliedSkills.length ? <p className="text-xs text-muted-foreground">{appliedSkills.join(', ')}</p> : <p className="text-xs text-muted-foreground">{demo ? 'No local skills were selected.' : 'No applied skill versions returned.'}</p>}</div>
    </div>
    <div className="mt-7 flex flex-wrap gap-3">
      <button className="button-press min-h-10 border px-4 text-sm" onClick={onBack} data-testid="button-back-to-form">Back to form</button>
      <button className="button-press flex min-h-10 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground" onClick={onNew} data-testid="button-new-draft">Start another draft <ArrowRight size={15} weight="regular" /></button>
      <Link href="/repurpose" className="button-press flex min-h-10 items-center gap-2 px-3 text-sm underline decoration-border underline-offset-4" data-testid="link-repurpose-result">Repurpose this idea <ArrowRight size={15} weight="regular" /></Link>
    </div>
  </section>;
}
