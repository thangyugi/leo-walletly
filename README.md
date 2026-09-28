# Leo Walletly

Next.js 16 + Supabase. Database schema: `docs/database/SCHEMA_V2.md`; screens: `docs/SCREEN_FLOWS.md`.

**Setup guide (Vietnamese, local Docker or Supabase cloud, with a test checklist): `docs/SETUP_SUPABASE.md`.**

## Run locally

Requires Docker and Node 20+.

```bash
npx supabase start          # Postgres + Auth + REST + Storage, applies supabase/migrations
npx supabase status -o env  # prints API_URL and ANON_KEY
```

Create `.env.local` from `.env.example` (not committed):

```
NEXT_PUBLIC_SUPABASE_URL=<API_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
```

Then `npm install && npm run dev` and open http://localhost:3000. Sign up on /login; onboarding creates the first ledger. Sample statements to import are in `test/fixtures/import/`.

If the default image registry is blocked, `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npx supabase start` pulls from Docker Hub instead.

## Database scripts

- `npx supabase db reset` — recreate the local database from `supabase/migrations`
- `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run db:types` — regenerate `types/supabase.ts`
- `npm run db:i18n-seed` — regenerate the translation seed migration from `lib/i18n.ts`
