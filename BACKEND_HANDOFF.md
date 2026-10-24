# Fieldnotes backend integration handoff

This is the implementation handoff for connecting the Fieldnotes frontend to the Supabase + Railway/n8n backend. It records what the frontend does today, the contracts it already calls, and the backend work still needed before inviting founders to rely on it.

## 1. Current integration at a glance

| Area | Frontend status | Backend status / work needed |
| --- | --- | --- |
| Sign up and sign in | Calls Supabase Auth directly using email/password. | Configure Supabase Auth, confirmation and redirect URLs, password recovery, and production site URLs. No custom auth webhook is used. |
| Authenticated API calls | Sends the current Supabase access token as `Authorization: Bearer <JWT>`. | Verify the JWT server-side and derive the user ID from its `sub` claim. Never accept a client-supplied owner ID as authority. |
| Content generation | Calls the generate webhook, receives a job ID, polls, and renders the completed draft. | Replace mock responses with the real async workflow; persist jobs/results and return the documented schemas. |
| Repurposing | Calls the repurpose webhook with the selected source content ID. | Confirm the source draft belongs to the authenticated user and is eligible for repurposing. |
| Founder/startup profile, workspaces, skills, source files, drafts | Stored in per-user browser `localStorage`; no server sync. | Add authenticated persistence APIs and migrate the frontend to them before founders expect cross-device storage. |
| Billing | Calls a checkout webhook and validates the returned Stripe URL. | Implement the current plan IDs, trusted server-side pricing/discounts, Stripe webhook sync, entitlements, and subscription management. |
| Automatic publishing, scraping, and video transcription | Not implemented. | Separate integrations are required; do not imply these happen yet. |

The Railway origin currently configured for production is `https://heroic-wonder-production-0ffd.up.railway.app`. Local development uses `VITE_API_BASE_URL` as the Vite proxy target. Production uses the fixed rewrites in `vercel.json`. Browser requests are same-origin under `/api/...`; Vercel/Vite forward them to the Railway webhooks.

## 2. Signup, login, and first-run flow

### Signup

1. The founder visits `/sign-up` and enters name, email, and a password of at least 8 characters.
2. The frontend calls Supabase `auth.signUp({ email, password, options: { data: { full_name } } })` directly.
3. If email confirmation is enabled and Supabase returns no session, the UI tells the founder to confirm their email. They are not treated as signed in yet.
4. After confirmation, Supabase redirects back to the configured app URL. The founder signs in if a session was not established automatically.
5. Once a session exists, the frontend routes to `/` and requires onboarding if no local onboarding record exists.

### Login and session

1. `/sign-in` calls Supabase `auth.signInWithPassword` directly.
2. `App.tsx` reads `auth.getSession()` during startup and subscribes to `onAuthStateChange`.
3. On an authenticated session, the workspace is keyed locally by the Supabase user ID. On sign-out, the app returns to a local unauthenticated state.
4. `src/lib/content-api.ts` reads the current Supabase session for each API request. It sends the access token in the Authorization header. If no token is present outside demo mode, the request fails with `AUTH_REQUIRED`.

### Onboarding

Onboarding is intentionally short: the founder supplies a display name and checks whether they have a startup. This is not a server request today. It saves `profile.name`, `accountType` (`founder` or `founder_plus_startups`), and `onboardingComplete` in browser local storage. It does not create a startup record; the founder adds a startup by name later from the Startups page.

After onboarding, a founder-only account sees personal writing and shared context tools. Startup navigation is hidden unless the startup checkbox was selected; direct startup routes redirect to billing for founder-only accounts. A selected account type is only frontend state today and is not proof of paid entitlement. The backend must enforce entitlement independently.

### Auth/profile bootstrap recommended for backend

- Create/ensure a `profiles` row on signup using an auth trigger or an idempotent authenticated `GET /api/me` bootstrap endpoint.
- Store the Supabase `user_id`, canonical display name, onboarding state, account mode, and timestamps server-side.
- The display name may start from Supabase `user_metadata.full_name`; allow later profile edits to update the canonical row.
- Apply RLS to all user-owned records. Derive `user_id` from the verified JWT for every read/write.
- Preserve confirmation-required behavior and add password reset UX/redirect configuration before public launch.

## 3. Content generation contract

The frontend calls same-origin `POST /api/content/generate`; Vite rewrites it to `POST /webhook/generate-content` in development and Vercel does the equivalent in production.

### Request headers

```http
Authorization: Bearer <Supabase access token>
Content-Type: application/json
```

### Request body

```json
{
  "request_type": "new_generation",
  "payload": {
    "topic": "The hidden cost of building custom internal tools",
    "content_format": "short_video",
    "platform": "TikTok",
    "objective": "Highlight the maintenance burden",
    "skill_version_ids": [],
    "founder_context": {
      "name": "Onimisi",
      "role": "Founder",
      "pointOfView": "..."
    },
    "project_id": "startup UUID when in a startup workspace",
    "project_context": "Startup details, voice, website, selected imported startup context, and source text",
    "custom_skill_instructions": ["Clear openings: ..."]
  }
}
```

Fields actually sent by the UI:

- Required: `topic`, `content_format`, `platform`, `objective`, `skill_version_ids`.
- `skill_version_ids` is currently an empty array even when a local skill is selected. Selected skill instructions are sent in `custom_skill_instructions`. These local skill IDs are not backend version IDs yet; implement server-backed skills/version IDs and update the frontend before treating them as canonical.
- `founder_context` contains non-empty founder-profile fields, excluding the legacy `company` and `companyDescription` fields.
- For startup content, `project_id` is the active startup's ID. `project_context` is assembled from the active startup and any additionally selected startup contexts. The additional startup IDs are not separately sent in the current contract.
- `custom_skill_instructions` is omitted if no skills are selected.

Accepted content formats: `written_post`, `short_video`, `long_video`, `talking_points`.

Accepted platforms: `LinkedIn`, `X`, `TikTok`, `Instagram`, `YouTube`.

### Synchronous accepted response

Return HTTP `202` with this JSON shape:

```json
{
  "status": "accepted",
  "data": {
    "job_id": "job UUID",
    "message": "Content generation queued."
  }
}
```

The frontend validates `status`, `job_id`, and `message`. Create a durable job record owned by the JWT user before returning. The UI begins polling as soon as it receives `job_id`.

## 4. Repurpose contract

The frontend calls same-origin `POST /api/content/repurpose`, rewritten to `/webhook/repurpose-content`.

```json
{
  "request_type": "repurpose",
  "payload": {
    "parent_content_id": "source content UUID",
    "target_format": "long_video",
    "target_platform": "YouTube",
    "objective": "Expand into an educational script",
    "skill_version_ids": [],
    "founder_context": { "name": "Onimisi" },
    "project_id": "optional active startup UUID",
    "project_context": "optional startup/source context",
    "custom_skill_instructions": ["...optional selected skill instructions..."]
  }
}
```

Return the same `202 accepted` envelope as generation. The backend must verify that `parent_content_id` belongs to this user and return a useful standardized error if it does not. The UI sends the source's backend `content_id` (it removes its local `live-` prefix). Demo/local drafts cannot be repurposed through the live backend.

## 5. Job polling and completion

The frontend calls `GET /api/content/job?job_id=<encoded-id>`, rewritten to `GET /webhook/job-status?job_id=...`, every 2.5 seconds. Polling stops on a terminal response or after 3 minutes. Network/API retries are limited; the UI retains the form inputs on errors.

### Processing

```json
{
  "status": "processing",
  "data": { "message": "Evaluator approved. Generation in progress..." }
}
```

### Completed

```json
{
  "status": "completed",
  "data": {
    "content_id": "persisted content UUID",
    "content_format": "short_video",
    "draft_content": "[Hook] ...",
    "applied_skill_versions": [],
    "evaluator_result": {
      "status": "safe",
      "confidence_score": 0.94,
      "reasoning": "..."
    }
  }
}
```

`content_format` must be one of the four frontend enum values. `applied_skill_versions` must be an array of strings. Evaluator `status` is a string; `confidence_score` and `reasoning` are optional. The frontend saves the completed content as a local draft and displays the evaluator fields. Return a stable, persisted `content_id` so the draft can later be synced, opened, or repurposed.

### Terminal job error

The job endpoint can return the standardized error envelope (HTTP 200 with `status: error`) or a non-2xx response with the same envelope. The frontend understands either form. It expects `code`, `message`, and boolean `retryable`.

## 6. Error response contract

For request failures, use a 4xx/5xx status and:

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "Human-readable explanation.",
    "retryable": false
  }
}
```

Useful codes include `AUTH_REQUIRED`, `INVALID_PAYLOAD`, `NOT_FOUND`, `OWNERSHIP_VIOLATION`, `EVALUATOR_BLOCK`, `RATE_LIMITED`, and `INTERNAL_ERROR`. Keep validation/auth/ownership/evaluator errors non-retryable; use `retryable: true` only when retrying the same request is reasonable. `requestJson` parses this envelope for all non-2xx responses; an unrecognized body is shown as an unexpected service response.

## 7. Billing and subscriptions

The frontend calls same-origin `POST /api/billing/checkout`, rewritten to `/webhook/billing-checkout`, with the user's JWT:

```json
{
  "plan_id": "founder_only_monthly",
  "account_type": "founder",
  "bundle_discount_percent": 0,
  "success_url": "https://<app-origin>/billing?checkout=success",
  "cancel_url": "https://<app-origin>/billing?checkout=cancelled"
}
```

For Founder + Startups, `account_type` is `founder_plus_startups` and the client sends `bundle_discount_percent: 5`. Never trust client-sent price or discount values. Resolve plan IDs and eligibility on the server, compute the amount from trusted configuration, and let Stripe create the checkout session.

| Plan ID | What it includes | Monthly amount shown |
| --- | --- | ---: |
| `founder_only_monthly` | Founder workspace | $15.00 |
| `beta_monthly` | Founder + up to 2 startups; first 20 founders | $41.80 total ($15 founder + $29 startup, then 5% off) |
| `founder_plus_2_monthly` | Founder + up to 2 startups | $51.30 total ($15 + $39, then 5% off) |
| `portfolio_monthly` | Founder + up to 5 startups | $85.50 total ($15 + $75, then 5% off) |

The client accepts only an `https://*.stripe.com` checkout URL in this response:

```json
{
  "status": "accepted",
  "data": { "checkout_url": "https://checkout.stripe.com/..." }
}
```

The success/cancel query string is only a UI message. It is not proof of payment. Implement Stripe webhook verification and subscription state sync; grant account entitlements only from verified server-side subscription status. Provide startup-count checks on startup create/update and a customer portal/cancel flow. The beta tier eligibility/first-20 limit must also be decided server-side. More than five startups is currently a contact/custom-plan message with no self-serve checkout.

## 8. Persistence APIs needed before founders rely on the app

The current `WorkspaceData` lives entirely in `localStorage` under a key scoped to the current Supabase user. Draft edits also save locally. Local browser data does not sync between browsers/devices and may be lost if browser storage is cleared. No API currently uploads files or stores these records.

Recommended authenticated API surface (the exact route naming can be aligned with the backend):

| Resource | Required operations |
| --- | --- |
| Founder profile/onboarding | Read and upsert founder name, social URLs, background, audience, point of view, voice, topics, and avoid-list; persist onboarding completion and account mode. |
| Startup workspaces | List/create/read/update/archive/delete a startup; enforce subscription capacity server-side. Startup create starts with name; website, description, per-startup voice are edited inside that workspace. |
| Workspace sources | Upload/list/delete source documents, associate them with a founder or startup, store file metadata and extracted text securely. Current browser accepts `.txt`, `.md`, `.csv` files up to 100 KB (per document text is capped at 40 KB); PDF and video transcription are not implemented. |
| Shared writing skills | List/create/read/update/delete skills and immutable skill versions; accept source text and return the saved canonical version ID. Current UI supports typed instructions or appended `.txt`, `.md`, `.csv` under 100 KB; it does not call AI to transform the source into a skill yet. |
| Content/drafts | Persist generated results and user edits; list/get/update/delete drafts; scope all queries to the user and workspace; return stable content IDs for repurpose. |
| Jobs | Create authenticated jobs and provide status/result endpoint; support idempotency or duplicate-submission protection for client retries. |
| Billing/account | Checkout, Stripe webhooks, subscription state, entitlement queries, customer portal, invoice/payment status. |

Use Supabase RLS (or equivalent API-side ownership checks) on every user-owned table. Suggested records include `profiles`, `startup_workspaces`, `workspace_sources`, `skills`, `skill_versions`, `content_items`, `content_jobs`, and `subscriptions`. Store files in private object storage and issue short-lived signed URLs when needed; do not put service-role credentials in the frontend. Keep source extraction/model calls on trusted backend infrastructure.

## 9. Frontend/backend differences to resolve together

1. **Skills:** the API shape has `skill_version_ids`, but the frontend currently sends `[]` and sends selected skill text as `custom_skill_instructions`. Once the backend exposes persisted skill versions, update the frontend to send their IDs (and decide whether to keep the text field as a compatibility path).
2. **IDs and project context:** current startup records are browser-generated IDs, not server UUIDs. The backend must own canonical startup IDs. Once startup CRUD is connected, replace local IDs with response IDs. For cross-startup context import, today the frontend concatenates selected context into `project_context`; consider adding an explicit `imported_project_ids` array and backend authorization for those IDs.
3. **Draft durability:** generation completion is saved to local storage after polling. Connect the completed result to a draft upsert/list API before promising cross-device library access.
4. **Checkout activation:** current frontend selection can set `accountType` locally before checkout. The API/backend must enforce plan entitlement and startup capacity regardless of this value; ideally return/refresh authoritative entitlements after Stripe confirms payment.
5. **Session refresh/expiry:** expired tokens should return the standardized 401 error. Supabase client refreshes sessions; frontend shows a sign-in-again message if there is no usable token.
6. **Source ingestion and publishing:** website URLs are only context text at present; the browser does not crawl them. Uploaded video, PDFs, automatic posting, and auto-post scheduling need distinct backend workflows, permission controls, and product UI before they can be advertised.

## 10. Local and production routing

- Local API base is `VITE_API_BASE_URL` in `.env.local`; `vite.config.ts` proxies the four same-origin `/api/...` routes to the corresponding Railway webhook paths.
- Production API routes are configured in `vercel.json` and currently point at the Railway origin above. Keep these in sync when the Railway service URL changes.
- The job route rewrite must preserve/forward the incoming `job_id` query parameter.
- Forward the `Authorization` header through Vercel and Vite proxies; confirm this in a deployed smoke check.
- Supabase frontend variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is public. Service-role, Stripe secret, webhook signing secret, model provider keys, and n8n credentials stay in backend/Vercel server environment only.
- `VITE_DEMO_MODE=true` bypasses authentication and API calls for local demonstrations. Keep it false in production.

## 11. Integration and launch checklist

- [ ] Configure Supabase email confirmation, production redirect URL, password recovery, and session policies.
- [ ] Create profile bootstrap and authenticated profile/workspace persistence APIs with ownership enforcement/RLS.
- [ ] Implement generation and repurpose workflows that return `202 accepted` with durable job IDs.
- [ ] Implement status polling with the exact processing/completed/error shapes above; verify `job_id` belongs to the JWT user.
- [ ] Persist content results, edited drafts, and source references; make repurpose ownership checks use those persisted records.
- [ ] Decide and implement canonical skill version IDs, then connect selected skills to them.
- [ ] Configure server-owned Stripe prices and the founder/startup bundle math; implement webhook-driven entitlements and startup limits.
- [ ] Confirm Vercel rewrites forward auth headers and query strings to Railway; smoke-check all four production routes.
- [ ] Test user A cannot read or mutate user B's profile, startups, sources, skills, jobs, content, or billing records.
- [ ] Decide what “auto post” means (draft suggestion vs scheduled publishing), connect social accounts with explicit consent, and keep generated content as draft until the founder approves publishing.
- [ ] Provide a founder-facing privacy/data retention statement and support path before outreach.

## 12. Files to reference in this repository

- `src/pages/AuthPage.tsx` — Supabase signup/sign-in UI.
- `src/App.tsx` — session listener, onboarding gate, route/workspace scoping.
- `src/lib/supabase.ts` — Supabase client construction.
- `src/lib/content-api.ts` — JWT headers, request/error schemas, content endpoints, billing checkout.
- `src/pages/ContentWorkspace.tsx` — generation/repurpose payload construction, polling, result/draft handling.
- `src/lib/workspace-store.ts` — current local data model and storage behavior.
- `src/pages/WorkspacePages.tsx` — onboarding, profile, skills, startup workspace, and billing UI.
- `vite.config.ts` — local API proxy routes.
- `vercel.json` — production rewrites to Railway.
