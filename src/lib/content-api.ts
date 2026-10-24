import { z } from 'zod';
import { supabase } from './supabase';

export const formats = ['written_post', 'short_video', 'long_video', 'talking_points'] as const;
export type ContentFormat = (typeof formats)[number];
export const platforms = ['LinkedIn', 'X', 'TikTok', 'Instagram', 'YouTube'] as const;
export type Platform = (typeof platforms)[number];

const acceptedSchema = z.object({
  status: z.literal('accepted'),
  data: z.object({ job_id: z.string().min(1), message: z.string() }),
});
const jobSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('processing'), data: z.object({ message: z.string() }) }),
  z.object({
    status: z.literal('completed'),
    data: z.object({
      content_id: z.string().min(1),
      content_format: z.enum(formats),
      draft_content: z.string(),
      applied_skill_versions: z.array(z.string()),
      evaluator_result: z.object({
        status: z.string(),
        confidence_score: z.number().optional(),
        reasoning: z.string().optional(),
      }),
    }),
  }),
  z.object({ status: z.literal('error'), error: z.object({ code: z.string(), message: z.string(), retryable: z.boolean() }) }),
]);
export type CompletedJob = z.infer<typeof jobSchema> & { status: 'completed' };
export type JobResponse = z.infer<typeof jobSchema>;
export type DraftRecord = { id: string; title: string; format: ContentFormat; platform: Platform; text: string; demo?: boolean; updatedAt?: string };

export class ApiError extends Error {
  retryable: boolean;
  code: string;
  constructor(message: string, code = 'REQUEST_FAILED', retryable = true) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

export const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
export const authConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

const demoJobs = new Map<string, { started: number; format: ContentFormat; topic: string }>();
let demoCounter = 0;

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!isDemo && !token) throw new ApiError('Your session has expired. Sign in again to continue.', 'AUTH_REQUIRED', false);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function requestJson(path: string, init: RequestInit): Promise<unknown> {
  const headers = await authHeaders();
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...headers, ...init.headers },
    });
  } catch {
    throw new ApiError("We couldn't reach the content service. Your inputs are still here. Check your connection and try again.");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = z.object({ status: z.literal('error'), error: z.object({ code: z.string(), message: z.string(), retryable: z.boolean() }) }).safeParse(body);
    if (parsed.success) throw new ApiError(parsed.data.error.message, parsed.data.error.code, parsed.data.error.retryable);
    throw new ApiError(`The content service returned an unexpected response (${response.status}).`);
  }
  return body;
}

export async function startGeneration(payload: {
  topic: string; content_format: ContentFormat; platform: Platform; objective: string;
  skill_version_ids: string[]; project_id?: string; founder_context?: Record<string, string>;
  project_context?: string; custom_skill_instructions?: string[];
}): Promise<{ job_id: string; message: string }> {
  if (isDemo) {
    const job_id = `demo-job-${++demoCounter}`;
    demoJobs.set(job_id, { started: Date.now(), format: payload.content_format, topic: payload.topic });
    return { job_id, message: 'Demo request queued. No production model was used.' };
  }
  const body = await requestJson('/api/content/generate', {
    method: 'POST',
    body: JSON.stringify({ request_type: 'new_generation', payload }),
  });
  const parsed = acceptedSchema.safeParse(body);
  if (!parsed.success) throw new ApiError('The content service returned an invalid job response.', 'INVALID_RESPONSE', false);
  return parsed.data.data;
}

export async function startRepurpose(payload: {
  parent_content_id: string; target_format: ContentFormat; target_platform: Platform;
  objective: string; skill_version_ids: string[]; founder_context?: Record<string, string>;
  custom_skill_instructions?: string[];
}): Promise<{ job_id: string; message: string }> {
  if (isDemo) {
    const job_id = `demo-job-${++demoCounter}`;
    demoJobs.set(job_id, { started: Date.now(), format: payload.target_format, topic: 'A deliberate adaptation of an existing idea' });
    return { job_id, message: 'Demo adaptation queued. No production model was used.' };
  }
  const body = await requestJson('/api/content/repurpose', {
    method: 'POST',
    body: JSON.stringify({ request_type: 'repurpose', payload }),
  });
  const parsed = acceptedSchema.safeParse(body);
  if (!parsed.success) throw new ApiError('The content service returned an invalid job response.', 'INVALID_RESPONSE', false);
  return parsed.data.data;
}

export async function getJob(jobId: string): Promise<JobResponse> {
  if (isDemo) {
    const job = demoJobs.get(jobId);
    if (!job) return { status: 'error', error: { code: 'NOT_FOUND', message: 'This demo job is no longer available.', retryable: false } };
    if (Date.now() - job.started < 1700) return { status: 'processing', data: { message: 'The demo lifecycle is still processing.' } };
    return {
      status: 'completed',
      data: {
        content_id: `demo-content-${jobId}`,
        content_format: job.format,
        draft_content: `[Opening]\n${job.topic} is not just a content problem. It is a context problem.\n\n[The idea]\nThe strongest founder content starts with something you have actually learned, noticed, or changed your mind about. Start with the specific moment. Then explain what it changed in how you work.\n\n[Close]\nWhat is one lesson from building your business that you wish you had written down sooner?`,
        applied_skill_versions: [],
        evaluator_result: { status: 'demo result', reasoning: 'This is a local demonstration only; no production evaluation was run.' },
      },
    };
  }
  const body = await requestJson(`/api/content/job?job_id=${encodeURIComponent(jobId)}`, { method: 'GET' });
  const parsed = jobSchema.safeParse(body);
  if (!parsed.success) throw new ApiError('The content service returned an invalid job status.', 'INVALID_RESPONSE', false);
  return parsed.data;
}

export async function startBillingCheckout(planId: string): Promise<{ checkout_url: string }> {
  const body = await requestJson('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: planId,
      success_url: `${window.location.origin}/billing?checkout=success`,
      cancel_url: `${window.location.origin}/billing?checkout=cancelled`,
    }),
  });
  const parsed = z.object({ status: z.literal('accepted'), data: z.object({ checkout_url: z.string().url() }) }).safeParse(body);
  if (!parsed.success) throw new ApiError('Secure checkout is not connected yet. No payment was taken.', 'CHECKOUT_UNAVAILABLE', false);
  const checkoutUrl = new URL(parsed.data.data.checkout_url);
  if (checkoutUrl.protocol !== 'https:' || !/(^|\.)stripe\.com$/i.test(checkoutUrl.hostname)) {
    throw new ApiError('The checkout service returned an invalid payment link.', 'INVALID_CHECKOUT_URL', false);
  }
  return { checkout_url: checkoutUrl.toString() };
}

export const demoDrafts: DraftRecord[] = [{
  id: 'fixture-founder-story',
  title: 'The cost of context switching',
  format: 'written_post',
  platform: 'LinkedIn',
  text: 'The hardest part of building a company is not always the big decision. It is the small decisions you have to make again because nobody wrote down the last one.\n\nA little context, captured at the right moment, compounds.',
  demo: true,
}];

export function formatLabel(format: ContentFormat): string {
  return ({ written_post: 'Written post', short_video: 'Short video', long_video: 'Long video', talking_points: 'Talking points' })[format];
}
