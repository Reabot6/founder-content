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

Generation and repurpose requests also send optional `founder_context`, `project_id`, `project_context`, and `custom_skill_instructions` fields. `project_context` can include a startup's website URL, description, startup-specific voice, imported startup context, and text from uploaded `.txt`, `.md`, or `.csv` files. The n8n workflows must accept these optional fields and ground the generated content in them. The frontend does not crawl websites, transcribe videos, or publish posts automatically yet; these need source-ingestion and publishing integrations.

Founder profiles, startup workspaces, shared skills, source text, and edited drafts are currently saved per Supabase user in browser local storage. They do not sync across devices. Add authenticated profile, workspace, source-file, and draft endpoints before relying on server-side persistence. Uploaded source text is limited to small files and this browser's local storage quota.

Onboarding requires an account choice: `founder` or `founder_plus_startups`. The billing screen offers plan IDs `beta_monthly` ($29/month, up to two startups for the first 20 founders), `founder_monthly` ($39/month, up to two startups), and `portfolio_monthly` ($75/month, up to five startups). The Founder + Startups bundle displays a 5% discount and sends `account_type` and `bundle_discount_percent` with the selected `plan_id`. The backend must verify eligibility and calculate the discount server-side; do not trust the client amount. A separate Founder-only subscription price is not configured yet. Subscription confirmation, startup-count enforcement, customer portal, and webhook-backed billing status still need backend endpoints before plans can be activated or managed. More than five startups is shown as a custom plan without self-serve checkout.
