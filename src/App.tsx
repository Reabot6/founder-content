import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter, Link } from 'wouter';
import { AppShell } from '@/components/AppShell';
import { authConfigured, demoDrafts, isDemo, type DraftRecord } from '@/lib/content-api';
import { readWorkspace, writeWorkspace, type WorkspaceData } from '@/lib/workspace-store';
import { supabase } from '@/lib/supabase';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 0, refetchOnWindowFocus: false } } });

const NotFound = lazy(() => import('@/pages/not-found'));
const AuthPage = lazy(() => import('@/pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const ContentWorkspace = lazy(() => import('@/pages/ContentWorkspace').then((module) => ({ default: module.ContentWorkspace })));
const HomePage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.HomePage })));
const LibraryPage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.LibraryPage })));
const DraftDetailPage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.DraftDetailPage })));
const FoundationPage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.FoundationPage })));
const SettingsPage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.SettingsPage })));
const OnboardingPage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.OnboardingPage })));
const BillingPage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.BillingPage })));
const StartupWorkspacePage = lazy(() => import('@/pages/WorkspacePages').then((module) => ({ default: module.StartupWorkspacePage })));

function Router({ workspace, updateWorkspace, sessionReady, signedIn, theme, onToggleTheme }: {
  workspace: WorkspaceData;
  updateWorkspace: (update: (current: WorkspaceData) => WorkspaceData) => void;
  sessionReady: boolean;
  signedIn: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  const addDraft = useCallback((draft: DraftRecord) => updateWorkspace((current) => ({ ...current, drafts: [draft, ...current.drafts.filter((item) => item.id !== draft.id)] })), [updateWorkspace]);
  const saveDraft = useCallback((draft: DraftRecord) => updateWorkspace((current) => ({ ...current, drafts: [{ ...draft, updatedAt: new Date().toISOString() }, ...current.drafts.filter((item) => item.id !== draft.id)] })), [updateWorkspace]);
  const privateProps = { sessionReady, signedIn, onboardingComplete: workspace.onboardingComplete, theme, onToggleTheme };
  return <RoutedErrorBoundary>
    <Suspense fallback={<div className="grid min-h-[70dvh] place-items-center p-6"><div className="w-full max-w-xl space-y-4" role="status" aria-label="Loading workspace"><div className="h-3 w-1/3 animate-pulse bg-muted" /><div className="h-10 w-3/4 animate-pulse bg-muted" /><div className="h-32 animate-pulse bg-muted" /></div></div>}>
    <Switch>
      <Route path="/sign-in" component={() => <AuthPage mode="sign-in" />} />
      <Route path="/sign-up" component={() => <AuthPage mode="sign-up" />} />
      <Route path="/onboarding" component={() => <PrivatePage {...privateProps}><OnboardingPage profile={workspace.profile} onProfile={(profile) => updateWorkspace((current) => ({ ...current, profile }))} projects={workspace.projects} onProjects={(projects) => updateWorkspace((current) => ({ ...current, projects }))} onComplete={() => updateWorkspace((current) => ({ ...current, onboardingComplete: true }))} /></PrivatePage>} />
      <Route path="/" component={() => <PrivatePage {...privateProps}><HomePage drafts={workspace.drafts} profile={workspace.profile} projects={workspace.projects} skills={workspace.skills} /></PrivatePage>} />
      <Route path="/create" component={() => { const project = workspace.projects.find((item) => item.id === new URLSearchParams(window.location.search).get('startup')); return <PrivatePage {...privateProps}><ContentWorkspace mode="create" drafts={workspace.drafts} onDraft={addDraft} profile={workspace.profile} projects={workspace.projects} skills={workspace.skills} workspaceProject={project} /></PrivatePage>; }} />
      <Route path="/repurpose" component={() => { const project = workspace.projects.find((item) => item.id === new URLSearchParams(window.location.search).get('startup')); const drafts = project ? workspace.drafts.filter((draft) => draft.workspaceId === project.id) : workspace.drafts; return <PrivatePage {...privateProps}><ContentWorkspace mode="repurpose" drafts={drafts} onDraft={addDraft} profile={workspace.profile} projects={workspace.projects} skills={workspace.skills} workspaceProject={project} /></PrivatePage>; }} />
      <Route path="/library" component={() => <PrivatePage {...privateProps}><LibraryPage drafts={workspace.drafts} /></PrivatePage>} />
      <Route path="/draft/:draftId" component={({ params }) => <PrivatePage {...privateProps}><DraftDetailPage draft={[...workspace.drafts, ...(isDemo ? demoDrafts : [])].find((item) => item.id === decodeURIComponent(params.draftId))} onSave={saveDraft} /></PrivatePage>} />
      <Route path="/projects" component={() => <PrivatePage {...privateProps}><FoundationPage page="projects" projects={workspace.projects} skills={workspace.skills} onProjects={(projects) => updateWorkspace((current) => ({ ...current, projects }))} onSkills={(skills) => updateWorkspace((current) => ({ ...current, skills }))} /></PrivatePage>} />
      <Route path="/startups/:startupId" component={({ params }) => { const project = workspace.projects.find((item) => item.id === decodeURIComponent(params.startupId)); return <PrivatePage {...privateProps}>{project ? <StartupWorkspacePage project={project} projects={workspace.projects} drafts={workspace.drafts.filter((draft) => draft.workspaceId === project.id)} profile={workspace.profile} skills={workspace.skills} onProject={(next) => updateWorkspace((current) => ({ ...current, projects: current.projects.map((item) => item.id === next.id ? next : item) }))} onProjects={(projects) => updateWorkspace((current) => ({ ...current, projects }))} onDraft={addDraft} /> : <div className="page-wrap"><h1 className="serif text-4xl">Startup not found</h1><Link href="/projects" className="mt-4 inline-flex underline">Back to startups</Link></div>}</PrivatePage>; }} />
      <Route path="/skills" component={() => <PrivatePage {...privateProps}><FoundationPage page="skills" projects={workspace.projects} skills={workspace.skills} onProjects={(projects) => updateWorkspace((current) => ({ ...current, projects }))} onSkills={(skills) => updateWorkspace((current) => ({ ...current, skills }))} /></PrivatePage>} />
      <Route path="/profile" component={() => <PrivatePage {...privateProps}><SettingsPage profile={workspace.profile} onChange={(profile) => updateWorkspace((current) => ({ ...current, profile }))} /></PrivatePage>} />
      <Route path="/settings" component={() => <PrivatePage {...privateProps}><SettingsPage profile={workspace.profile} onChange={(profile) => updateWorkspace((current) => ({ ...current, profile }))} /></PrivatePage>} />
      <Route path="/billing" component={() => <PrivatePage {...privateProps}><BillingPage /></PrivatePage>} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  </RoutedErrorBoundary>;
}

function PrivatePage({ children, sessionReady, signedIn, onboardingComplete, theme, onToggleTheme }: {
  children: ReactNode; sessionReady: boolean; signedIn: boolean; onboardingComplete: boolean;
  theme: 'light' | 'dark'; onToggleTheme: () => void;
}) {
  const [location] = useLocation();
  if (authConfigured && !isDemo && !sessionReady) return <div className="grid min-h-[70dvh] place-items-center"><div className="w-64 space-y-3" aria-label="Loading session"><div className="h-3 animate-pulse bg-muted" /><div className="h-3 w-3/4 animate-pulse bg-muted" /><div className="h-28 animate-pulse bg-muted" /></div></div>;
  if (authConfigured && !isDemo && !signedIn) return <main className="grid min-h-[70dvh] place-items-center p-6"><div className="max-w-md"><div className="eyebrow mb-3">Private workspace</div><h1 className="serif text-4xl">Sign in to continue.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Your founder workspace is private. Sign in with Supabase Auth to use live content requests.</p><Link href="/sign-in" className="button-press mt-5 inline-flex min-h-10 items-center bg-primary px-4 text-sm text-primary-foreground" data-testid="link-gate-sign-in">Go to sign in</Link></div></main>;
  if (!onboardingComplete && location !== '/onboarding') return <Redirect to="/onboarding" />;
  if (onboardingComplete && location === '/onboarding') return <Redirect to="/" />;
  return <AppShell theme={theme} onToggleTheme={onToggleTheme}>{children}</AppShell>;
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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem('fieldnotes-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });

  const updateWorkspace = useCallback((update: (current: WorkspaceData) => WorkspaceData) => {
    const next = update(workspaceRef.current);
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
      return;
    }
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      setSignedIn(Boolean(data.session));
      setOwnerId(data.session?.user.id ?? 'local');
      setSessionReady(true);
      if (error) console.error('Supabase session check failed.');
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      setOwnerId(session?.user.id ?? 'local');
      setSessionReady(true);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router workspace={workspace} updateWorkspace={updateWorkspace} sessionReady={sessionReady} signedIn={signedIn} theme={theme} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  </QueryClientProvider>;
}

export default App;
