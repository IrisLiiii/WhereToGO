# WhereToGO Deployment Checklist

## 1. Supabase

- Open the Supabase project dashboard.
- Run `supabase-schema.sql` in the SQL Editor.
- In `Authentication -> Sign In / Providers`, keep Email enabled.
- Turn off public sign-up after invited accounts are ready.
- Invite the two member emails from `Authentication -> Users`.

## 2. Vercel

- Sign in to [Vercel](https://vercel.com/) with GitHub.
- Import the repository `IrisLiiii/WhereToGO`.
- Framework preset: `Vite`.
- Build command: `npm run build`
- Output directory: `dist`

## 3. Environment Variables

Add these variables in the Vercel project settings:

```env
VITE_SUPABASE_URL=https://hmxfwibfblpshryunfrl.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GITHUB_OWNER=IrisLiiii
VITE_GITHUB_REPO=WhereToGO
VITE_GITHUB_BRANCH=main
VITE_ENABLE_LEGACY_ADMIN=false
```

Notes:

- Keep `VITE_ENABLE_LEGACY_ADMIN=false` for production.
- The current deployment path is prepared for Vercel via `vercel.json`.
- GitHub Pages workflow has been removed to avoid conflicting deployments.

## 4. First Login

- Accept the Supabase invite email for each user.
- Set the password for each invited account.
- Open the deployed site.
- Use the invited email and password in the login modal.

## 5. After Deployment

- Rebuild the Globe admin flow from GitHub upload to Supabase Storage.
- Add city-level music metadata and player behavior.
- Refactor Firsts into cleaner structured records.
- Improve mobile layouts after the private auth flow is stable.
