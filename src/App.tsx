import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter, Link } from 'wouter';
import { AppShell } from '@/components/AppShell';
import { authConfigured, demoDrafts, isDemo, type DraftRecord } from '@/lib/content-api';
import { emptyWorkspace, readWorkspace, writeWorkspace, type WorkspaceData } from '@/lib/workspace-store';
import { supabase } from '@/lib/supabase';
import { loadWorkspaceFromSupabase, mergeLocalAndRemote, persistWorkspaceToSupabase } from '@/lib/workspace-persistence';
import type { Session } from '@supabase/supabase-js';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 0, refetchOnWindowFocus: false } } });

const NotFound = lazy(() => import('@/pages/not-found'));
const AuthPage = lazy(() => import('@/pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const ContentWorkspace = lazy(() => import('@/pages/ContentWorkspace').then((module) => ({ default: module.ContentWorkspace })));
const HomePage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.HomePage })));
const FounderWorkspacePage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.FounderWorkspacePage })));
const LibraryPage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.LibraryPage })));
const DraftDetailPage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.DraftDetailPage })));
const FoundationPage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.FoundationPage })));
const SettingsPage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.SettingsPage })));
const OnboardingPage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.OnboardingPage })));
const BillingPage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.BillingPage })));
const StartupWorkspacePage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.StartupWorkspacePage })));

function Router({ workspace, updateWorkspace, sessionReady, signedIn, workspaceReady, persistenceError, theme, onToggleTheme }: {
  workspace: WorkspaceData;
  updateWorkspace: (update: (current: WorkspaceData) => WorkspaceData) => void;
  sessionReady: boolean;
  signedIn: boolean;
  workspaceReady: boolean;
  persistenceError: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  const addDraft = useCallback((draft: DraftRecord) => updateWorkspace((current) => ({ ...current, drafts: [draft, ...current.drafts.filter((item) => item.id !== draft.id)] })), [updateWorkspace]);
  const saveDraft = useCallback((draft: DraftRecord) => updateWorkspace((current) => ({ ...current, drafts: [{ ...draft, updatedAt: new Date().toISOString() }, ...current.drafts.filter((item) => item.id !== draft.id)] })), [updateWorkspace]);
  const privateProps = { sessionReady, signedIn, workspaceReady, persistenceError, onboardingComplete: workspace.onboardingComplete, accountType: workspace.accountType, theme, onToggleTheme };
  return <RoutedErrorBoundary>
    <Suspense fallback={<div className="grid min-h-[70dvh] place-items-center p-6"><div className="w-full max-w-xl space-y-4" role="status" aria-label="Loading workspace"><div className="h-3 w-1/3 animate-pulse bg-muted" /><div className="h-10 w-3/4 animate-pulse bg-muted" /><div className="h-32 animate-pulse bg-muted" /></div></div>}>
    <Switch>
      <Route path="/sign-in" component={() => <AuthPage mode="sign-in" />} />
      <Route path="/sign-up" component={() => <AuthPage mode="sign-up" />} />
      <Route path="/forgot-password" component={() => <AuthPage mode="forgot-password" />} />
      <Route path="/reset-password" component={() => <AuthPage mode="reset-password" />} />
      <Route path="/onboarding" component={() => <PrivatePage {...privateProps}><OnboardingPage profile={workspace.profile} onProfile={(profile) => updateWorkspace((current) => ({ ...current, profile }))} onComplete={(accountType) => updateWorkspace((current) => ({ ...current, accountType, onboardingComplete: true }))} /></PrivatePage>} />
      <Route path="/" component={() => <PrivatePage {...privateProps}><HomePage accountType={workspace.accountType} profile={workspace.profile} projects={workspace.projects} skills={workspace.skills} /></PrivatePage>} />
      <Route path="/founder" component={() => <PrivatePage {...privateProps}><FounderWorkspacePage drafts={workspace.drafts.filter((draft) => !draft.workspaceId || draft.workspaceId === 'founder')} profile={workspace.profile} /></PrivatePage>} />
      <Route path="/create" component={() => { const project = workspace.projects.find((item) => item.id === new URLSearchParams(window.location.search).get('startup')); const drafts = project ? workspace.drafts.filter((draft) => draft.workspaceId === project.id) : workspace.drafts.filter((draft) => !draft.workspaceId || draft.workspaceId === 'founder'); return <PrivatePage {...privateProps}><ContentWorkspace mode="create" drafts={drafts} onDraft={addDraft} profile={workspace.profile} projects={workspace.projects} skills={workspace.skills} workspaceProject={project} founderWorkspace={!project} /></PrivatePage>; }} />
      <Route path="/repurpose" component={() => { const project = workspace.projects.find((item) => item.id === new URLSearchParams(window.location.search).get('startup')); const drafts = project ? workspace.drafts.filter((draft) => draft.workspaceId === project.id) : workspace.drafts.filter((draft) => !draft.workspaceId || draft.workspaceId === 'founder'); return <PrivatePage {...privateProps}><ContentWorkspace mode="repurpose" drafts={drafts} onDraft={addDraft} profile={workspace.profile} projects={workspace.projects} skills={workspace.skills} workspaceProject={project} founderWorkspace={!project} /></PrivatePage>; }} />
      <Route path="/library" component={() => { const params = new URLSearchParams(window.location.search); const startupId = params.get('startup'); const workspaceId = startupId ?? (params.get('workspace') === 'founder' ? 'founder' : undefined); const drafts = workspace.drafts.filter((draft) => workspaceId === 'founder' ? !draft.workspaceId || draft.workspaceId === 'founder' : workspaceId ? draft.workspaceId === workspaceId : true); return <PrivatePage {...privateProps}><LibraryPage drafts={drafts} workspaceId={workspaceId} /></PrivatePage>; }} />
      <Route path="/draft/:draftId" component={({ params }) => <PrivatePage {...privateProps}><DraftDetailPage draft={[...workspace.drafts, ...(isDemo ? demoDrafts : [])].find((item) => item.id === decodeURIComponent(params.draftId))} onSave={saveDraft} /></PrivatePage>} />
      <Route path="/projects" component={() => <PrivatePage {...privateProps}><FoundationPage page="projects" projects={workspace.projects} skills={workspace.skills} onProjects={(projects) => updateWorkspace((current) => ({ ...current, projects }))} onSkills={(skills) => updateWorkspace((current) => ({ ...current, skills }))} /></PrivatePage>} />
      <Route path="/startups/:startupId" component={({ params }) => { const project = workspace.projects.find((item) => item.id === decodeURIComponent(params.startupId)); return <PrivatePage {...privateProps}>{project ? <StartupWorkspacePage project={project} projects={workspace.projects} drafts={workspace.drafts.filter((draft) => draft.workspaceId === project.id)} profile={workspace.profile} skills={workspace.skills} onProject={(next) => updateWorkspace((current) => ({ ...current, projects: current.projects.map((item) => item.id === next.id ? next : item) }))} onProjects={(projects) => updateWorkspace((current) => ({ ...current, projects }))} onDraft={addDraft} /> : <div className="page-wrap"><h1 className="serif text-4xl">Startup not found</h1><Link href="/projects" className="mt-4 inline-flex underline">Back to startups</Link></div>}</PrivatePage>; }} />
      <Route path="/skills" component={() => <PrivatePage {...privateProps}><FoundationPage page="skills" projects={workspace.projects} skills={workspace.skills} onProjects={(projects) => updateWorkspace((current) => ({ ...current, projects }))} onSkills={(skills) => updateWorkspace((current) => ({ ...current, skills }))} /></PrivatePage>} />
      <Route path="/profile" component={() => <PrivatePage {...privateProps}><SettingsPage profile={workspace.profile} onChange={(profile) => updateWorkspace((current) => ({ ...current, profile }))} /></PrivatePage>} />
      <Route path="/settings" component={() => <PrivatePage {...privateProps}><SettingsPage profile={workspace.profile} onChange={(profile) => updateWorkspace((current) => ({ ...current, profile }))} /></PrivatePage>} />
      <Route path="/billing" component={() => <PrivatePage {...privateProps}><BillingPage accountType={workspace.accountType} onAccountType={(accountType) => updateWorkspace((current) => ({ ...current, accountType }))} /></PrivatePage>} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  </RoutedErrorBoundary>;
}

function PrivatePage({ children, sessionReady, signedIn, workspaceReady, persistenceError, onboardingComplete, accountType, theme, onToggleTheme }: {
  children: ReactNode; sessionReady: boolean; signedIn: boolean; workspaceReady: boolean; persistenceError: string; onboardingComplete: boolean; accountType: WorkspaceData['accountType'];
  theme: 'light' | 'dark'; onToggleTheme: () => void;
}) {
  const [location] = useLocation();
  if (authConfigured && !isDemo && !sessionReady) return <div className="grid min-h-[70dvh] place-items-center"><div className="w-64 space-y-3" aria-label="Loading session"><div className="h-3 animate-pulse bg-muted" /><div className="h-3 w-3/4 animate-pulse bg-muted" /><div className="h-28 animate-pulse bg-muted" /></div></div>;
  if (!isDemo && !authConfigured) return <main className="grid min-h-[70dvh] place-items-center p-6"><div className="max-w-lg"><div className="eyebrow mb-3">Workspace setup</div><h1 className="serif text-4xl">Connect Supabase to continue.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">This deployment was built without the Supabase environment variables, so it can’t create accounts, restore sessions, or securely save your work. Add the public project URL and anon key in Vercel, then redeploy.</p><div className="mt-5 border p-4 text-xs leading-6"><code>VITE_SUPABASE_URL</code><br /><code>VITE_SUPABASE_ANON_KEY</code><br /><code>VITE_DEMO_MODE=false</code></div><p className="mt-4 text-xs leading-5 text-muted-foreground">After configuration, return here to sign in or create an account. Do not add a service-role key to the frontend.</p></div></main>;
  if (authConfigured && !isDemo && !signedIn) return <main className="grid min-h-[70dvh] place-items-center p-6"><div className="max-w-md"><div className="eyebrow mb-3">Private workspace</div><h1 className="serif text-4xl">Welcome to Fieldnotes.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Sign in to return to your private workspace, or create an account to get started.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/sign-in" className="button-press inline-flex min-h-10 items-center bg-primary px-4 text-sm text-primary-foreground" data-testid="link-gate-sign-in">Sign in</Link><Link href="/sign-up" className="button-press inline-flex min-h-10 items-center border px-4 text-sm" data-testid="link-gate-sign-up">Create account</Link></div></div></main>;
  if (authConfigured && !isDemo && signedIn && !workspaceReady) return <div className="grid min-h-[70dvh] place-items-center"><div className="w-64 space-y-3" role="status" aria-label="Loading your cloud workspace"><div className="h-3 animate-pulse bg-muted" /><div className="h-3 w-3/4 animate-pulse bg-muted" /><div className="h-28 animate-pulse bg-muted" /></div></div>;
  if ((!onboardingComplete || !accountType) && location !== '/onboarding') return <Redirect to="/onboarding" />;
  if (onboardingComplete && accountType && location === '/onboarding') return <Redirect to="/" />;
  if (onboardingComplete && accountType === 'founder' && (location === '/projects' || location.startsWith('/startups/'))) return <Redirect to="/billing" />;
  if (location === '/onboarding') return <>{children}</>;
  return <AppShell theme={theme} onToggleTheme={onToggleTheme} accountType={accountType} persistenceError={persistenceError}>{children}</AppShell>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const [ownerId, setOwnerId] = useState(isDemo ? 'demo' : 'local');
  const [workspace, setWorkspace] = useState<WorkspaceData>(() => readWorkspace(isDemo ? 'demo' : 'local'));
  const workspaceRef = useRef(workspace);
  const [sessionReady, setSessionReady] = useState(!authConfigured || isDemo);
  const [signedIn, setSignedIn] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(!authConfigured || isDemo);
  const [persistenceError, setPersistenceError] = useState('');
  const remoteWorkspaceRef = useRef<WorkspaceData>(emptyWorkspace);
  const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve());
  const persistenceTimerRef = useRef<number | undefined>(undefined);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem('fieldnotes-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });

  const updateWorkspace = useCallback((update: (current: WorkspaceData) => WorkspaceData) => {
    const current = workspaceRef.current;
    const next = update(current);
    const oldSkills = new Map(current.skills.map((skill) => [skill.id, skill]));
    next.skills = next.skills.map((skill) => {
      const old = oldSkills.get(skill.id);
      if (!old) return { ...skill, versionId: skill.versionId ?? crypto.randomUUID(), versionNumber: skill.versionNumber ?? 1 };
      if (old.instructions !== skill.instructions) return { ...skill, versionId: crypto.randomUUID(), versionNumber: old.versionId ? (old.versionNumber ?? 1) + 1 : old.versionNumber ?? skill.versionNumber ?? 1 };
      return { ...skill, versionId: old.versionId ?? skill.versionId, versionNumber: old.versionNumber ?? skill.versionNumber };
    });
    workspaceRef.current = next;
    setWorkspace(next);
    writeWorkspace(ownerId, next);
  }, [ownerId]);

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    workspaceRef.current = readWorkspace(ownerId);
    setWorkspace(workspaceRef.current);
  }, [ownerId]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem('fieldnotes-theme', theme); } catch { /* Theme still applies for this session. */ }
  }, [theme]);

  useEffect(() => {
    if (!supabase || isDemo) {
      setSessionReady(true);
      setWorkspaceReady(true);
      return;
    }
    let alive = true;
    let hydrationId = 0;
    const hydrateSession = async (session: Session | null) => {
      const currentHydration = ++hydrationId;
      setSessionReady(true);
      setSignedIn(Boolean(session));
      if (!session) {
        const local = readWorkspace('local');
        setOwnerId('local');
        workspaceRef.current = local;
        remoteWorkspaceRef.current = emptyWorkspace;
        setWorkspace(local);
        setWorkspaceReady(true);
        setPersistenceError('');
        return;
      }
      setWorkspaceReady(false);
      const userId = session.user.id;
      const local = readWorkspace(userId);
      setOwnerId(userId);
      try {
        const metadataName = session.user.user_metadata?.full_name;
        const result = await loadWorkspaceFromSupabase(userId, typeof metadataName === 'string' ? metadataName : '');
        if (!alive || currentHydration !== hydrationId) return;
        const next = mergeLocalAndRemote(local, result.workspace, result.hadRemoteData);
        remoteWorkspaceRef.current = result.workspace;
        workspaceRef.current = next;
        setWorkspace(next);
        setPersistenceError('');
      } catch (error) {
        if (!alive || currentHydration !== hydrationId) return;
        remoteWorkspaceRef.current = emptyWorkspace;
        workspaceRef.current = local;
        setWorkspace(local);
        setPersistenceError(error instanceof Error ? error.message : 'Your cloud workspace could not be loaded.');
      } finally {
        if (alive && currentHydration === hydrationId) setWorkspaceReady(true);
      }
    };
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => { void hydrateSession(session); }, 0);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Supabase session check failed.');
      if (alive) void hydrateSession(data.session);
    });
    return () => {
      alive = false;
      hydrationId++;
      listener.subscription.unsubscribe();
      window.clearTimeout(persistenceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (authConfigured && !isDemo && signedIn && !workspaceReady) return;
    writeWorkspace(ownerId, workspace);
    if (!authConfigured || isDemo || !signedIn || !workspaceReady || !supabase) return;
    window.clearTimeout(persistenceTimerRef.current);
    persistenceTimerRef.current = window.setTimeout(() => {
      const userId = ownerId;
      const snapshot = workspaceRef.current;
      persistenceQueueRef.current = persistenceQueueRef.current.then(async () => {
        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        if (data.session?.user.id !== userId) return;
        try {
          const saved = await persistWorkspaceToSupabase(userId, snapshot, remoteWorkspaceRef.current);
          remoteWorkspaceRef.current = saved;
          setPersistenceError('');
        } catch (error) {
          setPersistenceError(error instanceof Error ? error.message : 'Cloud sync failed. Your changes remain saved on this device.');
        }
      });
    }, 700);
    return () => window.clearTimeout(persistenceTimerRef.current);
  }, [workspace, ownerId, signedIn, workspaceReady]);

  return <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router workspace={workspace} updateWorkspace={updateWorkspace} sessionReady={sessionReady} signedIn={signedIn} workspaceReady={workspaceReady} persistenceError={persistenceError} theme={theme} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  </QueryClientProvider>;
}

export default App;
