import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Link } from 'wouter';
import { AppShell } from '@/components/AppShell';
import { AuthPage } from '@/pages/AuthPage';
import { ContentWorkspace } from '@/pages/ContentWorkspace';
import { FoundationPage, HomePage, LibraryPage, SettingsPage } from '@/pages/WorkspacePages';
import { authConfigured, isDemo, type DraftRecord } from '@/lib/content-api';
import { supabase } from '@/lib/supabase';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 0, refetchOnWindowFocus: false } },
});

function Router({ drafts, onDraft, sessionReady, signedIn }: { drafts: DraftRecord[]; onDraft: (draft: DraftRecord) => void; sessionReady: boolean; signedIn: boolean }) {
  return <RoutedErrorBoundary>
    <Switch>
      <Route path="/sign-in" component={() => <AuthPage mode="sign-in" />} />
      <Route path="/sign-up" component={() => <AuthPage mode="sign-up" />} />
      <Route path="/" component={() => <PrivatePage sessionReady={sessionReady} signedIn={signedIn}><HomePage drafts={drafts} /></PrivatePage>} />
      <Route path="/create" component={() => <PrivatePage sessionReady={sessionReady} signedIn={signedIn}><ContentWorkspace mode="create" drafts={drafts} onDraft={onDraft} /></PrivatePage>} />
      <Route path="/repurpose" component={() => <PrivatePage sessionReady={sessionReady} signedIn={signedIn}><ContentWorkspace mode="repurpose" drafts={drafts} onDraft={onDraft} /></PrivatePage>} />
      <Route path="/library" component={() => <PrivatePage sessionReady={sessionReady} signedIn={signedIn}><LibraryPage drafts={drafts} /></PrivatePage>} />
      <Route path="/projects" component={() => <PrivatePage sessionReady={sessionReady} signedIn={signedIn}><FoundationPage page="projects" /></PrivatePage>} />
      <Route path="/skills" component={() => <PrivatePage sessionReady={sessionReady} signedIn={signedIn}><FoundationPage page="skills" /></PrivatePage>} />
       <Route path="/profile" component={() => <PrivatePage sessionReady={sessionReady} signedIn={signedIn}><SettingsPage /></PrivatePage>} />
      <Route path="/settings" component={() => <PrivatePage sessionReady={sessionReady} signedIn={signedIn}><SettingsPage /></PrivatePage>} />
      <Route component={NotFound} />
    </Switch>
  </RoutedErrorBoundary>;
}

function PrivatePage({ children, sessionReady, signedIn }: { children: ReactNode; sessionReady: boolean; signedIn: boolean }) {
  if (authConfigured && !isDemo && !sessionReady) return <div className="grid min-h-[70dvh] place-items-center"><div className="w-64 space-y-3" aria-label="Loading session"><div className="h-3 animate-pulse bg-muted" /><div className="h-3 w-3/4 animate-pulse bg-muted" /><div className="h-28 animate-pulse bg-muted" /></div></div>;
  if (authConfigured && !isDemo && !signedIn) return <main className="grid min-h-[70dvh] place-items-center p-6"><div className="max-w-md"><div className="eyebrow mb-3">Private workspace</div><h1 className="serif text-4xl">Sign in to continue.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Your founder workspace is private. Sign in with Supabase Auth to use live content requests.</p><Link href="/sign-in" className="button-press mt-5 inline-flex min-h-10 items-center bg-primary px-4 text-sm text-primary-foreground" data-testid="link-gate-sign-in">Go to sign in</Link></div></main>;
  return <AppShell>{children}</AppShell>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [sessionReady, setSessionReady] = useState(!authConfigured || isDemo);
  const [signedIn, setSignedIn] = useState(false);
  const addDraft = useCallback((draft: DraftRecord) => {
    setDrafts((current) => current.some((item) => item.id === draft.id) ? current : [draft, ...current]);
  }, []);

  useEffect(() => {
    if (!supabase || isDemo) {
      setSessionReady(true);
      return;
    }
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      setSignedIn(Boolean(data.session));
      setSessionReady(true);
      if (error) console.error('Supabase session check failed.');
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
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
        <Router drafts={drafts} onDraft={addDraft} sessionReady={sessionReady} signedIn={signedIn} />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  </QueryClientProvider>;
}

export default App;
