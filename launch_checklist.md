# 🚀 Production Launch Checklist — AI Voice Receptionist SaaS

> Organized by priority. Complete top → bottom before going live.

---

## 🔴 TIER 1 — Blockers (Must fix before ANY user touches production)

### 💳 Real Payments & Subscriptions
- `[ ]` **Switch Razorpay to LIVE mode** — replace `rzp_test_*` key with `rzp_live_*` in both `.env` and Vercel/hosting env vars
- `[ ]` **Register Razorpay Webhook in LIVE dashboard** → point to `https://your-domain.com/api/v1/billing/webhook`
- `[ ]` **Set `RAZORPAY_WEBHOOK_SECRET`** to the live webhook secret (it's different from test)
- `[ ]` **Create LIVE Razorpay Plans** (INR + USD) and update `RAZORPAY_PLAN_ID_INR` / `RAZORPAY_PLAN_ID_USD` in env
- `[ ]` **Test a real ₹1 payment end-to-end** — verify `subscription.charged` webhook fires → `subscription_status` goes `active`
- `[ ]` **Test subscription cancellation** → verify `subscription.cancelled` fires → status goes `cancelling`
- `[ ]` **Test resume subscription** → status goes back `active`
- `[ ]` **Test wallet top-up via real card** → wallet balance increases in DB

### 🔐 Auth & Security
- `[ ]` **Remove service role key from `NEXT_PUBLIC_SUPABASE_ANON_KEY`** — this exposes full DB access to browsers. Use actual anon key + proper RLS policies
- `[ ]` **Enable Row Level Security (RLS)** on `clinics`, `leads`, `phone_numbers`, `transactions`, `agent_settings` tables in Supabase
- `[ ]` **Set up proper Supabase RLS policies** — users can only read/write their own clinic's data
- `[ ]` **Rotate `ADMIN_API_KEY`** from `dentocare-admin-2024` to a strong random secret
- `[ ]` **Enable Supabase Auth email confirmation** for magic link (disable auto-confirm in production)
- `[ ]` **Add Google OAuth redirect URI** for production domain in Google Cloud Console

### 🌐 Infrastructure
- `[ ]` **Deploy backend to a real server** (Railway / Render / EC2) — not localhost:8000
- `[ ]` **Update `NEXT_PUBLIC_BACKEND_URL`** in all env files from `http://localhost:8000` → production URL
- `[ ]` **Update `WEBHOOK_URL`** in backend `.env` from localhost → production backend URL
- `[ ]` **Deploy Next.js frontend** to Vercel (or equivalent)
- `[ ]` **Set `NEXT_PUBLIC_SITE_URL`** to production domain for magic link redirects
- `[ ]` **Deploy LiveKit voice agent** as a persistent background process (not just local)
- `[ ]` **Configure LiveKit Dispatch Rule** to auto-dispatch agent on inbound calls
- `[ ]` **Set production domain in Supabase** → Auth > URL Configuration > Site URL

---

## 🟠 TIER 2 — Admin Panel (Owner must have this before launch)

> The **SuperAdmin Console** (`/superadmin`) is the #1 pending item. This is the owner's control center for managing all clinics, APIs, and revenue.

### Admin Console — Must Build

- `[ ]` **Create `/superadmin` route** protected by `ADMIN_API_KEY` header or a dedicated Supabase admin role
- `[ ]` **Clinic Management Table** — list all registered clinics with:
  - Clinic name, email, signup date
  - `subscription_status` badge (active / trial / inactive / cancelling)
  - `trial_ends_at` countdown
  - `wallet_balance` and `monthly_minutes_used`
  - Assigned phone number
  - Actions: Force-activate, Suspend, Reset trial, View leads
- `[ ]` **Global API Key Manager** — update keys in `system_settings` table (DB-backed, not `.env`):
  - Razorpay Key ID & Secret (live/test toggle)
  - LiveKit URL, API Key, API Secret
  - Telnyx API Key + Connection ID
  - Vobiz Auth ID + Token
  - Sarvam API Key
  - Groq API Key
  - "Reload Settings" button → triggers `POST /api/v1/system/reload-settings`
- `[ ]` **Revenue Dashboard** — total MRR, active subscribers, trial users, churn this month
- `[ ]` **Active Phone Numbers** — all numbers across all clinics, provider, status, clinic owner
- `[ ]` **Transaction Log** — all payments, top-ups, auto-recharges across all clinics
- `[ ]` **Force Actions** — manually:
  - Activate / suspend a clinic subscription
  - Grant extra trial days
  - Credit wallet balance
  - Release / reassign a phone number

### Admin Console — Nice to Have
- `[ ]` Support ticket inbox
- `[ ]` Email broadcast to all clinics
- `[ ]` Usage reports by date range

---

## 🟡 TIER 3 — Live Demo & Landing Page

- `[ ]` **Verify `+918046733471` is live and answered by AI** — call it manually right now
- `[ ]` **Update demo number** in `LiveDemo.tsx` if number changed
- `[ ]` **Test the web audio simulation** — click "Start Live Browser Call", mic dialog appears, simulation runs
- `[ ]` **Landing page links** — test ALL navbar anchor links scroll correctly in production build
- `[ ]` **Pricing CTA buttons** — "Start Free Trial" → onboarding flow → works end-to-end
- `[ ]` **Google OAuth** — "Sign in with Google" → auth → dashboard → no 404
- `[ ]` **Magic Link login** — enter email → receive link → land on `/dashboard` (not `/dashboard/agent`)
- `[ ]` **Meta tags** — title, description, og:image set for every page
- `[ ]` **Favicon** set correctly

---

## 🟡 TIER 4 — AI Agent Production Readiness

- `[ ]` **Verify Telnyx SIP trunk is provisioned** in LiveKit with correct trunk ID (`LIVEKIT_INBOUND_TRUNK_TELNYX`)
- `[ ]` **Verify Vobiz SIP trunk is provisioned** in LiveKit (`LIVEKIT_INBOUND_TRUNK_VOBIZ`)
- `[ ]` **Verify outbound trunk** (`LIVEKIT_OUTBOUND_TRUNK_ID`) is working — trigger test outbound call
- `[ ]` **Test inbound call → clinic settings applied** — save custom greeting in dashboard → call number → AI uses your greeting (fix from debug session is live)
- `[ ]` **Test voice selection** — change voice in dashboard → call → confirm AI voice changed
- `[ ]` **Test language switching** — speak Hindi → AI replies in Hindi
- `[ ]` **Test emergency handling** — say "I have severe pain" → AI prioritizes correctly
- `[ ]` **Test appointment booking end-to-end** — call → book appointment → lead appears in dashboard → SMS sent
- `[ ]` **Test outbound call** — trigger from dashboard → AI calls number → plays outbound script
- `[ ]` **Verify `WEBHOOK_URL`** in agent `.env` points to production backend, not localhost

---

## 🟡 TIER 5 — Database Schema Verification

- `[ ]` **Run Supabase migration** to ensure all columns exist:
  - `clinics.trial_ends_at` (timestamp)
  - `clinics.monthly_minutes_limit` (int, default 500)
  - `clinics.monthly_minutes_used` (int, default 0)
  - `clinics.monthly_sms_limit` (int, default 500)
  - `clinics.monthly_sms_used` (int, default 0)
  - `clinics.wallet_balance` (float, default 0)
  - `clinics.auto_recharge` (bool, default false)
  - `clinics.currency` (text, default 'USD')
  - `clinics.country_code` (text)
  - `clinics.subscription_end_date` (timestamp)
  - `phone_numbers.ai_answering` (bool, default true)
  - `phone_numbers.clinic_direct_line` (text)
- `[ ]` **Verify `system_settings` table** exists for global API key storage (used by `loader.py`)
- `[ ]` **Check `transactions` table** has correct schema for subscription + topup + auto_recharge types

---

## 🟢 TIER 6 — Monitoring & Ops (Post-Launch)

- `[ ]` **Set up error monitoring** (Sentry or LogRocket for frontend, Sentry for backend)
- `[ ]` **Set up uptime monitoring** (UptimeRobot / Better Uptime) for:
  - Frontend URL
  - Backend `/health` endpoint
  - LiveKit agent status
- `[ ]` **Enable cron job** for `POST /api/v1/cron/check-trials` — run daily to expire trials
- `[ ]` **Enable cron job** for auto-recharge check — run when wallet depletes
- `[ ]` **Backup Supabase** — enable PITR (Point In Time Recovery) on paid plan
- `[ ]` **Log rotation** on backend server
- `[ ]` **Rate limiting** on backend API — prevent abuse of `/api/v1/voice/outbound`

---

## 📋 Launch Day Checklist (Day-Of)

```
□ All TIER 1 items complete
□ Razorpay live mode confirmed with real ₹1 test payment
□ RLS enabled on all Supabase tables  
□ Backend deployed and /health returning 200
□ LiveKit agent running in production
□ Demo number +918046733471 is live and responding
□ Admin panel (/superadmin) is accessible
□ One test end-to-end signup: google login → trial → dashboard → provision number → call → lead saved
□ Announce 🎉
```

---

## 📌 Admin Panel — Recommended Tech Stack

For the `/superadmin` route, build it inside the existing Next.js app:

```
voice_bot/app/superadmin/
  ├── layout.tsx          ← Protected by ADMIN_API_KEY cookie/check
  ├── page.tsx            ← Overview: MRR, active clinics, total calls
  ├── clinics/page.tsx    ← All clinics table with actions
  ├── api-keys/page.tsx   ← Global API key manager
  ├── numbers/page.tsx    ← All phone numbers
  └── transactions/page.tsx ← Revenue log
```

Backend routes needed (don't exist yet):
```
GET  /api/v1/admin/clinics          → all clinics with stats
GET  /api/v1/admin/revenue          → MRR, ARR, trial count
POST /api/v1/admin/clinics/{id}/activate
POST /api/v1/admin/clinics/{id}/suspend
POST /api/v1/admin/clinics/{id}/credit-wallet
GET  /api/v1/admin/api-keys
POST /api/v1/admin/api-keys         → update + trigger reload
```
