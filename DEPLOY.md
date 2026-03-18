# Deploying Cellar to Vercel

## Prerequisites
- Vercel account
- Supabase project (already set up)
- Anthropic API key with credits

## Steps

### 1. Push code to GitHub
Make sure your latest code is pushed to the main branch.

### 2. Import repo in Vercel
- Go to vercel.com → New Project → Import from GitHub
- Select the cellar repo
- Framework: Next.js (auto-detected)
- Root directory: leave as default (/)

### 3. Add environment variables in Vercel dashboard
Before deploying, add these under Project Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL       = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY      = your-service-role-key
ANTHROPIC_API_KEY              = your-anthropic-key
NEXT_PUBLIC_APP_URL            = https://your-project.vercel.app
```

Note: Set `NEXT_PUBLIC_APP_URL` to the exact Vercel URL you'll be assigned
(you can update it after the first deploy).

### 4. Deploy
Click Deploy. The build should complete in ~1-2 minutes.

### 5. After deploy — update Supabase auth settings
This is required for magic-link login to work in production.

- Go to Supabase dashboard → Authentication → URL Configuration
- Set **Site URL** to: `https://your-project.vercel.app`
- Under **Redirect URLs**, add: `https://your-project.vercel.app/auth/callback`
- Save

### 6. Run database migrations
If you haven't already, run the SQL migrations in the Supabase SQL editor:
1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_vibe_system.sql`

### 7. Done
Open the app on your phone and tap "Add to Home Screen" in Safari (iOS)
or use Chrome's install prompt (Android) to install as a PWA.

---

## Updating after changes
Just push to the main branch — Vercel auto-deploys on every push.

## Storage bucket
Make sure the `cellar-images` bucket is set to **private** in Supabase Storage.
The app generates signed URLs server-side for all image access.
