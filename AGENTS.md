# AGENTS — short, high-signal repo notes

Only include facts an agent would likely miss. Read README.md, package.json, tsconfig*, CI and openspec/ first.

Commands (exact)
- Install deps (preferred): pnpm install
- Dev server: pnpm dev
- Build (typecheck + bundle): pnpm build
  - runs: tsc --project tsconfig.node.json && vite build
- Lint (CI-strict): pnpm lint
- Unit tests (dev): pnpm test
- Unit tests (CI, authoritative): pnpm run test:ci  (runs: vitest run)
- E2E: pnpm run test:e2e  (playwright — requires a real Supabase + env)

Local setup gotchas
- Copy .env.example -> .env and set at minimum: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- Never commit .env or server secrets. Server/cron secrets: SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET (store in CI/hosting)
- Apply supabase-schema.sql (root) to your Supabase project before running protected flows or E2E tests.

Verification order (use before committing/PR review)
1) pnpm lint  (eslint --max-warnings 0 — warnings fail)
2) pnpm build (ensures tsc typecheck)
3) pnpm run test:ci (tests are authoritative)

SDD / artifacts
- openspec/ is for ephemeral change drafts and is excluded from commits. Do NOT use it as persistent storage unless instructed.
- Engram is the project memory store (present in .engram). Use engram sync/import to share memories across machines.

Strict TDD
- This repo expects STRICT TDD for sdd-apply / sdd-verify: sub-agents MUST run pnpm run test:ci and must NOT skip tests.

Deploy notes
- Cloudflare Pages: build with pnpm build, publish directory = dist. DO NOT use wrangler to deploy the frontend.
- Ensure public/_redirects contains: /* /index.html 200
- Edge functions / cron (supabase/functions and wrangler.toml) are deployed separately and require server secrets (wrangler deploy or supabase functions deploy).

Testing gotchas
- Playwright E2E requires a real Supabase instance seeded with supabase-schema.sql and appropriate env vars — don't run them without configuring Supabase.
- Lint warnings fail CI — fix ESLint warnings (not just errors) before pushing.

Agent Git policy (strict for automated agents)
- Agents MAY create commits but MUST NOT create branches. Any push to origin/main requires explicit human confirmation (ask: "confirm to push?").
- Never force-push or amend pushed commits. If hooks fail, fix and create a new commit.

Where to look first (high signal)
- README.md (setup, env, deploy checklist)
- package.json, tsconfig.node.json (scripts and typecheck)
- supabase-schema.sql and supabase/functions/ (DB + edge function entry points)
- openspec/changes/ (active SDD artifacts)
- .agents/skills/ and .atl/skill-registry.md (project agent/skill rules)

If docs conflict with scripts, trust the executable (package.json, tsconfig, CI). When unsure: run the exact repo command and trust its output.
