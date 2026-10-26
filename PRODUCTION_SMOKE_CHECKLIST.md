# Production smoke checklist

Use this checklist before inviting founders. The checks marked **Dashboard check** require access to the Supabase or Vercel project; the public Supabase Auth settings endpoint does not expose the redirect allow-list or Site URL.

## 1. Deployment and redirects

- [ ] In Vercel, set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_DEMO_MODE=false` for the environments being tested, then redeploy. These Vite values are embedded at build time.
- [ ] **Dashboard check — Supabase → Authentication → URL Configuration:** set the Site URL to `https://founder-content-temp.vercel.app` (or the final production domain).
- [ ] Add the exact app origins to the redirect allow-list:
  - `https://founder-content-temp.vercel.app/`
  - `https://founder-content-temp.vercel.app/reset-password`
  - `http://localhost:5173/`
  - `http://localhost:5173/reset-password`
- [ ] Add any Vercel preview domain used for testing. Signup returns to the current app origin; password recovery returns to `/reset-password`.

**Verified from the public Auth settings endpoint:** email auto-confirm is disabled (`mailer_autoconfirm=false`), so new users must click the confirmation email before they can sign in. The endpoint does not reveal Site URL or allowed redirect URLs; verify those in the dashboard above.

## 2. Sign up, confirm, and onboard

- [ ] Open `/sign-up`; create an account with a name, email, and password.
- [ ] Confirm the email using the link Supabase sends. It should return to the app's root URL.
- [ ] Sign in if Supabase did not establish a session automatically.
- [ ] Complete the short onboarding form. Confirm the founder workspace opens after completion.
- [ ] Reload the page. The session and onboarding choice should remain available.
- [ ] Sign out, then sign in again and confirm the same account workspace loads.
- [ ] On `/sign-in`, use **Forgot password?**; confirm the recovery email returns to `/reset-password`, then set a new password.

## 3. Cloud persistence

- [ ] Update founder profile context; wait for sync, reload, and confirm the values remain.
- [ ] Add a writing skill; reload and confirm it remains and can be selected for generation.
- [ ] If testing startup plans, add a startup, edit its website/voice/context, and reload.
- [ ] Confirm browser console has no Supabase RLS/column/constraint errors. A failed sync should show the app's cloud-sync alert.

## 4. First live draft

- [ ] Confirm with the backend developer that production n8n has active POST routes for generation/repurpose and an active GET `/webhook/job-status` route.
- [ ] Submit a real idea. The browser sends the Supabase JWT in `Authorization`; it does not send `user_id` or a pre-created `job_id` in the POST body. The backend verifies the JWT, derives the user ID, creates a job, and returns its real ID.
- [ ] Confirm the accepted response contains a job ID, then status polling returns `processing` and eventually `completed` (or the documented error schema).
- [ ] Confirm the draft is saved to `content_history`, appears in the right founder/startup library, and remains after reload.
- [ ] Edit the draft, save, reload, and confirm the edited content remains.
- [ ] Repurpose the saved draft and confirm the parent content belongs to the signed-in user.

**Current backend blocker from the last live check:** `GET /webhook/job-status?job_id=mock-job-123` returned n8n's “GET job-status is not registered” 404. The frontend can be tested through persistence now, but a complete generation test must wait until the production n8n status route is registered and active.

## 5. Ownership and billing

- [ ] With two test accounts, verify neither account can read or change the other's profile, projects, skills, documents, or drafts.
- [ ] Before Stripe testing, agree on final plan IDs/prices and startup limits. Confirm checkout uses server-owned Stripe prices and entitlement changes only after a verified Stripe webhook.
- [ ] Test successful checkout, canceled checkout, subscription update, and startup limits in Stripe test mode before enabling live payments.
