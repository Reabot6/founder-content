# Founder Content Studio

React, Vite, and TypeScript frontend for the Personal Content System MVP.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and public anon key.
3. Keep `VITE_API_BASE_URL` set to the Railway service URL. Vite proxies the frontend's `/api/content/*` requests to the matching n8n webhooks.
4. Run `npm run dev`.

`VITE_DEMO_MODE=true` uses local sample jobs and bypasses authentication. Turn it off for backend integration.

## Vercel deployment

Import this repository as a Vite project in Vercel and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project's environment variables. The checked-in `vercel.json` forwards the three content API routes to the Railway webhooks and sends frontend routes to `index.html` for client-side routing. This keeps browser API requests same-origin, so the browser does not need direct cross-origin access to Railway.

The public Supabase anon key is intended for browser use. Never add a Supabase service-role key, n8n credential, or model-provider key to a `VITE_` variable.

## Backend contract

The frontend expects:

- `POST /webhook/generate-content`
- `POST /webhook/repurpose-content`
- `GET /webhook/job-status?job_id=...`
- `POST /webhook/billing-checkout` (required to enable paid checkout)

Requests use `Authorization: Bearer <Supabase JWT>` and JSON bodies. Responses follow the accepted, processing, completed, and standardized error schemas documented in the Backend API Reference v1.0.

Generation and repurpose requests also send optional `founder_context`, `project_context`, and `custom_skill_instructions` fields. The n8n generation workflow must accept these fields to use locally saved profile, project, and skill context. Project and skill records, edited drafts, and profile data are currently saved per Supabase user in this browser's local storage; an authenticated profile/content API is required for cross-device sync.

The billing screen is ready to call `POST /webhook/billing-checkout` with `plan_id`, `success_url`, and `cancel_url`. It expects `{ "status": "accepted", "data": { "checkout_url": "https://..." } }`. Subscription confirmation, customer portal, and webhook-backed billing status still need backend endpoints before plans can be activated or managed.
