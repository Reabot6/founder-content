import { type ReactNode } from 'react';
import { Link } from 'wouter';
import { useLocation } from 'wouter';
import { House, NotePencil, ArrowsLeftRight, Books, FolderSimple, Shapes, UserCircle, SignOut, Sun, Moon, CreditCard } from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { isDemo, authConfigured } from '@/lib/content-api';
import { supabase } from '@/lib/supabase';

const links = [
  { href: '/', label: 'Home', icon: House },
  { href: '/create', label: 'Create', icon: NotePencil },
  { href: '/repurpose', label: 'Repurpose', icon: ArrowsLeftRight },
  { href: '/library', label: 'Content library', icon: Books },
];
const workspaceLinks = [
  { href: '/projects', label: 'Projects', icon: FolderSimple },
  { href: '/skills', label: 'Skills', icon: Shapes },
  { href: '/settings', label: 'Founder profile', icon: UserCircle },
];

function NavLinks({ close }: { close?: () => void }) {
  const [location] = useLocation();
  return <>{links.map(({ href, label, icon: Icon }) => (
    <Link key={href} href={href} className="sidebar-link" aria-current={location === href ? 'page' : undefined} onClick={close} data-testid={`link-${href.slice(1) || 'home'}`}>
      <Icon size={18} weight="regular" aria-hidden="true" /><span>{label}</span>
    </Link>
  ))}</>;
}

export function AppShell({ children, theme, onToggleTheme }: { children: ReactNode; theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  const [location] = useLocation();
  const reducedMotion = useReducedMotion();
  const title = [...links, ...workspaceLinks].find((item) => item.href === location || (location === '/profile' && item.href === '/settings'))?.label ?? 'Workspace';
  async function signOut() {
    if (supabase) await supabase.auth.signOut();
  }
  return <div className="shell-grid">
    <aside className="desktop-sidebar" style={{ borderRight: '1px solid hsl(var(--border))', padding: '24px 15px', background: 'hsl(var(--sidebar))', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100dvh' }}>
      <Link href="/" className="flex items-center gap-3 px-3 mb-10" data-testid="link-brand">
        <img src="/logo.svg" alt="" className="h-9 w-9" />
        <span><span className="block text-sm font-semibold tracking-tight">Fieldnotes</span><span className="eyebrow" style={{ fontSize: 9 }}>FOUNDER STUDIO</span></span>
      </Link>
      <div className="eyebrow px-3 mb-2">Workspace</div>
      <nav className="grid gap-1"><NavLinks /></nav>
      <div className="eyebrow px-3 mb-2 mt-8">Your context</div>
      <div className="grid gap-1">
        {workspaceLinks.map(({ href, label, icon: Icon }) => <NavItem key={href} href={href} label={label} icon={<Icon size={18} weight="regular" />} active={location === href || (location === '/profile' && href === '/settings')} />)}
      </div>
      <div className="mt-auto">
        <Link href="/billing" className="sidebar-link mb-2" data-testid="link-billing"><CreditCard size={18} weight="regular" /><span>Plan & billing</span></Link>
        <Link href="/settings" className="mb-3 block border-t px-3 pt-4 text-xs leading-5 text-muted-foreground hover:text-foreground">Your experience and voice shape every draft.</Link>
        {authConfigured && <button className="sidebar-link w-full button-press" onClick={signOut} data-testid="button-sign-out"><SignOut size={17} weight="regular" /> Sign out</button>}
      </div>
    </aside>
    <main style={{ minWidth: 0 }}>
      <header className="flex h-[60px] items-center justify-between border-b px-7 md:px-10" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--background) / .92)' }}>
        <div className="eyebrow hidden sm:block">FOUNDER / {title.toUpperCase()}</div>
        <div className="sm:hidden text-sm font-semibold">Fieldnotes</div>
        <div className="flex items-center gap-2 sm:gap-3">
          {isDemo && <span className="rounded-sm border px-2 py-1 text-[10px] font-semibold uppercase tracking-[.08em]" style={{ borderColor: '#d7c49b', color: '#795b25', background: '#f7f0df' }} data-testid="status-demo">Demo mode</span>}
          <span className="hidden text-xs text-muted-foreground md:inline">A private place for your point of view</span>
          <Link href="/billing" className="hidden rounded-sm border px-3 py-2 text-xs font-medium hover:bg-muted sm:inline-flex" data-testid="link-header-billing">Plans</Link>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-sm border hover:bg-muted" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} data-testid="button-theme-toggle">
            {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
          </button>
        </div>
      </header>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={location} className="route-screen" initial={reducedMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -3 }} transition={{ duration: reducedMotion ? 0 : 0.19, ease: 'easeOut' }}>
          {children}
        </motion.div>
      </AnimatePresence>
    </main>
    <nav className="mobile-nav" aria-label="Primary navigation">
      {[...links.slice(0, 4), workspaceLinks[2], { href: '/billing', label: 'Plans', icon: CreditCard }].map(({ href, label, icon: Icon }) => <MobileItem key={href} href={href} label={label} icon={<Icon size={19} weight="regular" />} active={location === href || (location === '/profile' && href === '/settings')} />)}
    </nav>
  </div>;
}

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: ReactNode; active: boolean }) {
  return <Link href={href} className="sidebar-link" aria-current={active ? 'page' : undefined} data-testid={`link-${href.slice(1)}`}>{icon}<span>{label}</span></Link>;
}
function MobileItem({ href, label, icon, active }: { href: string; label: string; icon: ReactNode; active: boolean }) {
  const mobileLabel = label === 'Content library' ? 'Library' : label === 'Founder profile' ? 'Profile' : label;
  return <Link href={href} aria-current={active ? 'page' : undefined} data-testid={`mobile-link-${href.slice(1)}`}>{icon}<span>{mobileLabel}</span></Link>;
}

export function PageHeading({ kicker, title, description, action }: { kicker?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
    <div>{kicker && <div className="eyebrow mb-3">{kicker}</div>}<h1 className="serif text-4xl leading-[1.05] tracking-[-.025em] sm:text-[48px]" data-testid="heading-page">{title}</h1>{description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>
    {action}
  </div>;
}
