# Cellar — Setup Guide

A private, personal wine memory PWA. Follow these steps to get it running.

---

## Prerequisites

- Node.js 18+ — download from https://nodejs.org
- A Supabase account — https://supabase.com (free tier is fine)
- An Anthropic API key — https://console.anthropic.com

---

## Step 1: Install Node.js

Download and install Node.js LTS from https://nodejs.org/en/download
After installing, open a new terminal (PowerShell or Command Prompt) and verify:
```
node --version
npm --version
```

---

## Step 2: Install dependencies

In your project folder:
```
npm install
```

---

## Step 3: Create your Supabase project

1. Go to https://supabase.com → New Project
2. Pick a name (e.g., "cellar") and a strong database password
3. Select the region closest to you
4. Wait for it to provision (~60 seconds)

---

## Step 4: Run the database migration

1. In Supabase, go to **SQL Editor**
2. Copy the contents of `supabase/migrations/001_initial.sql`
3. Paste and click **Run**

---

## Step 5: Create the storage bucket

1. In Supabase, go to **Storage**
2. Click **New Bucket**
3. Name it `cellar-images`
4. Toggle it to **Private** (NOT public)
5. Click Create

Then add storage policies:
1. Go to Storage → Policies → `cellar-images` bucket
2. Add these two policies:

**SELECT (download) policy:**
```sql
(bucket_id = 'cellar-images' AND auth.uid()::text = (storage.foldername(name))[1])
```

**INSERT (upload) policy:**
```sql
(bucket_id = 'cellar-images' AND auth.uid()::text = (storage.foldername(name))[1])
```

---

## Step 6: Configure environment variables

Copy `.env.example` to `.env.local`:
```
cp .env.example .env.local
```

Then fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Find your Supabase keys at: Project Settings → API

---

## Step 7: Configure Supabase Auth

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your domain (e.g., `https://cellar.yourdomain.com`)
3. Add `http://localhost:3000/auth/callback` to **Redirect URLs**
4. For production, add `https://yourdomain.com/auth/callback`

Optional: In **Authentication** → **Providers**, disable everything except Email.
Under Email, you can configure the magic link template.

---

## Step 8: Add PWA icons

Generate app icons and place them in `public/icons/`. See `public/icons/README.md` for required files.

Quickstart: use https://realfavicongenerator.net with a 512×512 PNG source.

---

## Step 9: Run locally

```
npm run dev
```

Open http://localhost:3000 — you'll land on the login page.
Enter your email → check your inbox → click the magic link.

---

## Step 10: Install on iPhone

1. Open Safari on your iPhone
2. Navigate to your app URL
3. Tap the Share button → **Add to Home Screen**
4. Tap Add

The app will install as a standalone PWA.

---

## Deploy to Vercel (recommended)

```
npm install -g vercel
vercel deploy
```

Or connect your GitHub repo to Vercel at https://vercel.com/new

Add all environment variables in the Vercel dashboard under your project settings.

---

## Architecture Overview

```
app/
├── (auth)/login/          — magic link auth page
├── (app)/
│   ├── page.tsx           — home / dashboard
│   ├── collection/        — all wines
│   ├── scan/              — label scanning flow
│   ├── wine/[id]/         — wine detail page
│   ├── profile/           — palate insights
│   └── shelf/             — shelf photo → recommendations
├── api/
│   ├── extract-label/     — AI label extraction pipeline
│   ├── analyze-shelf/     — AI shelf analysis pipeline
│   └── jobs/[id]/         — polling endpoint for job status
lib/
├── ai/                    — Claude Vision integration
├── wine/                  — canonicalization, matching, profile computation
└── actions/               — server actions for data mutations
```

---

## Key Flows

### Scanning a wine label
1. User takes/uploads photo → `uploadImage()` stores in Supabase Storage
2. `POST /api/extract-label` → downloads image → calls Claude Vision → parses JSON
3. Client polls `/api/jobs/[id]` until complete
4. Extraction review screen shown — user edits fields
5. `saveTasting()` → creates/finds Wine record → creates Tasting → recomputes taste profile

### Shelf recommendations
1. User uploads shelf photo → stored in storage
2. `POST /api/analyze-shelf` → Claude identifies bottles → scores against taste profile
3. Results ranked and returned with explanations

### Taste profile
- Recomputed after every tasting save
- Rules-based: weighted average by varietal/region/recency
- Minimum 3 tastings required before insights appear

---

## Troubleshooting

**Auth not working:** Check Supabase URL configuration and redirect URLs.

**Images not uploading:** Verify storage bucket name is exactly `cellar-images` and policies are correct.

**AI extraction failing:** Check `ANTHROPIC_API_KEY` is valid and has credits.

**Fuzzy search not working:** Ensure `pg_trgm` extension was enabled in the migration.
