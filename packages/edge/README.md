# edge
`node build.mjs` generates `dist/` (Deno entry + app/auth/pg/database sources) from the real packages. It fails if an expected pattern is missing. Deploy by publishing the dist files as the Supabase Edge Function `api`.
