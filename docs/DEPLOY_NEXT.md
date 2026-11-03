# What to run to take everything live (in this order)
1. Database: migration 0015 is ALREADY applied live. Apply `packages/database/migrations/0016_kids_academy.sql` (Supabase SQL editor, or ask Claude to apply it).
2. Edge function: redeploy `api` from `packages/edge/dist` (7 files, all pure ASCII, `verify_jwt` off, import map `deno.json`). With the Supabase CLI from that folder: `supabase functions deploy api --project-ref okbtrogotrtciymmuokr --no-verify-jwt --import-map deno.json` (not tested by me). Or ask Claude to deploy it with explicit permission.
3. Web: push the git bundle; Vercel deploys by itself.
4. Smoke: sign in as a student and a teacher in a test institution, send progress, approve a plan; delete the test rows afterwards.
Order matters: the pushed web pages call the new endpoints; until step 2 the plan-save and kids-sync buttons will show an error.
