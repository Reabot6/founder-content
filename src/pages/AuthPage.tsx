import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Key } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { authConfigured, isDemo } from '@/lib/content-api';
import { Notice } from '@/components/StatusNote';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password';

export function AuthPage({ mode }: { mode: AuthMode }) {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!authConfigured || !supabase) {
      setError('Supabase Auth is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-in.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'forgot-password') {
        const response = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (response.error) throw response.error;
        setMessage('If there is an account for that email, Supabase will send a password reset link.');
        return;
      }
      if (mode === 'reset-password') {
        const response = await supabase.auth.updateUser({ password });
        if (response.error) throw response.error;
        setMessage('Your password has been updated. You can continue to your workspace.');
        setLocation('/');
        return;
      }
      const response = mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName.trim() }, emailRedirectTo: `${window.location.origin}/` } });
      if (response.error) throw response.error;
      if (mode === 'sign-up' && !response.data.session) {
        setMessage('Check your email for a confirmation link. Your account is not active until you confirm.');
      } else setLocation('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication could not be completed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }
  return <main className="grid min-h-[100dvh] lg:grid-cols-[minmax(300px,.88fr)_1.12fr]">
    <section className="flex flex-col justify-between border-r p-7 sm:p-12 lg:p-14" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
      <Link href="/" className="flex items-center gap-3" data-testid="link-auth-brand"><img src="/logo.svg" alt="" className="h-9 w-9" /><span className="text-sm font-semibold">Fieldnotes · Founder Studio</span></Link>
      <div className="my-16 max-w-md"><div className="eyebrow mb-4">A private content workspace</div><h1 className="serif text-5xl leading-[1.04] tracking-[-.03em]">Keep the thinking yours.</h1><p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">Work from real context. Shape original posts and spoken scripts. Adapt an idea on purpose.</p></div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Key size={16} weight="regular" />Your password is handled by Supabase Auth.</div>
    </section>
    <section className="flex items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="mb-9 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground" data-testid="link-auth-back"><ArrowLeft size={14} /> Back to workspace</Link>
        <div className="eyebrow mb-3">{mode === 'sign-in' ? 'Welcome back' : mode === 'sign-up' ? 'Create your private workspace' : mode === 'forgot-password' ? 'Account recovery' : 'Choose a new password'}</div>
        <h2 className="serif text-4xl tracking-[-.025em]">{mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : mode === 'forgot-password' ? 'Reset password' : 'Update password'}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{mode === 'sign-in' ? 'Use the account associated with your founder workspace.' : mode === 'sign-up' ? 'Your account gives you a private place for your context and drafts.' : mode === 'forgot-password' ? 'We’ll email you a secure link to choose a new password.' : 'Set a new password for your founder workspace.'}</p>
        {isDemo ? <div className="mt-6"><Notice testId="notice-auth-demo">Demo mode is enabled. No authentication is required to explore local examples. This does not create or authenticate an account.</Notice><Link href="/" className="button-press mt-4 inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground" data-testid="link-continue-demo">Continue in demo <ArrowRight size={15} /></Link></div>
          : !authConfigured && <div className="mt-6"><Notice kind="error" testId="notice-auth-missing">Authentication is unavailable until the required Supabase environment values are configured.</Notice><div className="mt-3 rounded-sm border p-3"><div className="eyebrow">Required public environment</div><code className="mt-2 block text-xs leading-6">VITE_SUPABASE_URL<br />VITE_SUPABASE_ANON_KEY</code><p className="mt-2 text-xs leading-5 text-muted-foreground">Use the public anon key only. Never expose a service-role key.</p></div></div>}
        {error && <div className="mt-5"><Notice kind="error" testId="error-auth">{error}</Notice></div>}
        {message && <div className="mt-5"><Notice kind="success" testId="status-auth">{message}</Notice></div>}
        {!isDemo && <form className="mt-7 grid gap-4" onSubmit={submit} data-testid={`form-${mode}`}>
          {mode === 'sign-up' && <div><label htmlFor="full-name" className="label">Name</label><input id="full-name" className="field" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required data-testid="input-name" /></div>}
          {mode !== 'reset-password' && <div><label htmlFor="email" className="label">Email</label><input id="email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required data-testid="input-email" /></div>}
          {mode !== 'forgot-password' && <div><label htmlFor="password" className="label">{mode === 'reset-password' ? 'New password' : 'Password'}</label><input id="password" className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required data-testid="input-password" /><p className="mt-1.5 text-[11px] text-muted-foreground">At least 8 characters.</p></div>}
          <button className="button-press mt-2 flex min-h-11 items-center justify-center gap-2 bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50" disabled={submitting || !authConfigured} data-testid={`button-submit-${mode}`}>{submitting ? 'Working…' : mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : mode === 'forgot-password' ? 'Send reset link' : 'Update password'} {!submitting && <ArrowRight size={15} />}</button>
        </form>}
        {!isDemo && mode === 'sign-in' && <p className="mt-4 text-center text-sm"><Link className="text-muted-foreground underline decoration-border underline-offset-4" href="/forgot-password">Forgot password?</Link></p>}
        {!isDemo && (mode === 'sign-in' || mode === 'sign-up') && <p className="mt-6 text-center text-sm text-muted-foreground">{mode === 'sign-in' ? 'New to the workspace?' : 'Already have an account?'}{' '}<Link className="font-medium text-foreground underline decoration-border underline-offset-4" href={mode === 'sign-in' ? '/sign-up' : '/sign-in'} data-testid="link-auth-switch">{mode === 'sign-in' ? 'Create an account' : 'Sign in'}</Link></p>}
        {!isDemo && (mode === 'forgot-password' || mode === 'reset-password') && <p className="mt-6 text-center text-sm text-muted-foreground"><Link className="font-medium text-foreground underline decoration-border underline-offset-4" href="/sign-in">Back to sign in</Link></p>}
        <p className="mt-8 border-t pt-5 text-center text-[11px] leading-5 text-muted-foreground" style={{ borderColor: 'hsl(var(--border))' }}>No publishing integration. No promise of persistence where the server API does not support it.</p>
      </div>
    </section>
  </main>;
}
