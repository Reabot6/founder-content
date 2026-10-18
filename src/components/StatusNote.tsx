import { type ReactNode } from 'react';
import { WarningCircle, Check, Info, CircleNotch } from '@phosphor-icons/react';

export function Notice({ kind = 'info', children, testId }: { kind?: 'info' | 'error' | 'success'; children: ReactNode; testId?: string }) {
  const Icon = kind === 'error' ? WarningCircle : kind === 'success' ? Check : Info;
  return <div role={kind === 'error' ? 'alert' : 'status'} className="flex gap-2.5 border px-3.5 py-3 text-sm leading-5" style={{ borderColor: kind === 'error' ? '#e6c2bd' : kind === 'success' ? '#cadbcb' : 'hsl(var(--border))', background: kind === 'error' ? '#fbefed' : kind === 'success' ? '#eef5ee' : 'hsl(var(--card))', color: kind === 'error' ? '#80342c' : kind === 'success' ? '#385f3d' : 'hsl(var(--muted-foreground))' }} data-testid={testId}>
    <Icon size={17} weight="regular" className="mt-0.5 shrink-0" aria-hidden="true" /><div>{children}</div>
  </div>;
}

export function LoadingLine({ label }: { label: string }) {
  return <div role="status" className="flex items-center gap-3 border-y py-4 text-sm text-muted-foreground" data-testid="status-loading">
    <CircleNotch size={18} weight="regular" className="animate-spin" aria-hidden="true" />{label}
  </div>;
}
