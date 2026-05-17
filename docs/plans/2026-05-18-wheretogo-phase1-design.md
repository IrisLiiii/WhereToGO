# WhereToGO Phase 1 Design

## Goal

Build a private shared memory website for two users while preserving the strongest visual atmosphere of the original project. The first usable release focuses on stable login, photo-backed memory records, and a deployable structure that can grow into music memories and richer visualizations.

## Confirmed Decisions

- Product name: `WhereToGO`
- Repository: `IrisLiiii/WhereToGO`
- Hosting: `Vercel`
- Backend: `Supabase`
- Auth model: two independent user accounts
- Privacy model: welcome shell is visible, private content requires login
- Media storage: `Supabase Storage`
- Music memory v1: song metadata plus playback link

## Phase 1 Scope

### 1. Globe

Primary memory entry point. Each location record should support:

- place name
- start and end date
- auto-filled coordinates from place name
- photo gallery upload
- impression text
- music memory fields: song title, artist, platform link, optional note

### 2. Firsts Timeline

Lightweight timeline records for important first moments. Each entry should support:

- title
- date
- text
- photos

### 3. Keywords Module

Keep the current visual shell and reserve the data model for future use. Phase 1 does not need the full scoring and visualization rebuild yet.

## Architecture Direction

- Frontend remains `React + Vite`
- `Supabase Auth` protects private routes and upload actions
- `Supabase Database` stores structured records for cities, galleries, firsts, and future keyword logs
- `Supabase Storage` stores uploaded images and future media assets
- `Vercel` handles deployment previews and production hosting

## Migration Notes

- Remove legacy hardcoded password login
- Remove browser-side GitHub token upload flow
- Replace original project branding with `WhereToGO`
- Rebuild upload flows around authenticated Supabase access and storage policies

## Recommended Build Order

1. Clean branding and repository setup
2. Add Supabase project, schema, storage buckets, and auth
3. Gate private content behind login
4. Rebuild Globe create/edit flow with photo upload and music metadata
5. Rebuild Firsts create/edit flow
6. Deploy to Vercel with environment variables
7. Return to mobile optimization and keyword visualization expansion
