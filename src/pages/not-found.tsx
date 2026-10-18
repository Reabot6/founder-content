import { Link } from 'wouter';
import { ArrowLeft, WarningCircle } from '@phosphor-icons/react';

export default function NotFound() {
  return <main className="grid min-h-[100dvh] place-items-center px-6 py-12">
    <section className="w-full max-w-lg border bg-card p-7 sm:p-10">
      <div className="eyebrow flex items-center gap-2"><WarningCircle size={17} weight="regular" /> Page not found</div>
      <h1 className="serif mt-5 text-4xl">This page is not here.</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">The address may have changed, or the page may not be part of this workspace.</p>
      <Link href="/" className="button-press mt-7 inline-flex min-h-10 items-center gap-2 border px-3 text-sm" data-testid="link-not-found-home"><ArrowLeft size={16} weight="regular" />Return to your workspace</Link>
    </section>
  </main>;
}
