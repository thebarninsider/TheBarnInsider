# TheBarnInsider

Production-connected React/Vite frontend for TheBarnInsider.

## Required one-time database update

This release adds employee review editing/deletion and post-publication admin moderation. Existing Supabase projects must run:

`supabase/02_REVIEW_EDIT_DELETE_ADMIN.sql`

Open Supabase → SQL Editor → New query, paste the full file, and click Run once.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Production build

```bash
npm run build
```
