# AGENTS — short, high-signal repo notes

Only include facts an agent would likely miss. Read README.md, package.json, tsconfig*, CI and openspec/ first.

Commands (exact)
- Install (preferred): pnpm install
  - CI: pnpm install --frozen-lockfile
- Dev server: pnpm dev
- Build (typecheck + bundle): pnpm build
  - runs: tsc --project tsconfig.node.json && vite build
  - fast typecheck-only: pnpm exec tsc --project tsconfig.node.json --noEmit
- Lint (CI-strict): pnpm lint
  - runs: eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0
  - ESLint warnings fail CI
- Unit tests (Vitest): pnpm test
  - CI (authoritative): pnpm run test:ci  (runs: vitest run)
  - Run a single unit test file: pnpm test -- path/to/file.test.ts
  - Run tests by name: pnpm test -- -t "pattern"
- E2E (Playwright): pnpm run test:e2e
  - Run a single spec: pnpm run test:e2e -- tests/path/to.spec.ts
  - Must run: npx playwright install --with-deps (CI and local when browsers missing)

Local setup gotchas
- Copy .env.example -> .env and set at minimum: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- Vite-only envs MUST be prefixed with VITE_ (only these are safe to expose in the frontend)
- Never commit .env or server/cron secrets. Server/cron secrets: SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET — store in CI/hosting or secret manager
- Apply supabase-schema.sql (root) to your Supabase project before running protected flows or Playwright E2E

Verification order (pre-merge / CI equivalence)
1) pnpm lint  (ESLint warnings fail CI)
2) pnpm build (includes tsc typecheck)
3) pnpm run test:ci (Vitest — authoritative)

SDD / artifacts
- openspec/ is for ephemeral change drafts. Do NOT rely on it as persistent storage for implementation work.
- Project memory: engram (.engram) is available for cross-session artifacts — use it for SDD state when present.

Strict TDD
- sdd-apply and sdd-verify workflows MUST run pnpm run test:ci and MUST NOT skip tests (this repo enforces strict TDD).

Deploy notes
- Cloudflare Pages (frontend): build with pnpm build, publish directory = dist. DO NOT use wrangler to deploy the frontend.
- Ensure public/_redirects contains: /* /index.html 200 (SPA routing)
- Edge code (supabase/functions/, cloudflare/workers/) is deployed separately using `supabase functions deploy` or `wrangler deploy --config <file>` and requires server secrets (SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, Google creds, etc.).

Testing / E2E gotchas
- Playwright E2E requires a real Supabase instance seeded with supabase-schema.sql and proper env vars. Do not run E2E without provisioning a seeded Supabase.
- GitHub Actions Playwright job expects these repo secrets set: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, APP_BASE_URL (see .github/workflows/playwright-e2e.yml).

Agent Git policy (strict for automated agents)
- Agents MAY create commits but MUST NOT create branches. Any push to origin/main requires explicit human confirmation (ask: "confirm to push?").
- Never force-push or amend pushed commits. If hooks fail, fix and create a new commit.

Where to look first (high signal)
- README.md (setup, env, deploy checklist)
- package.json, tsconfig.node.json (scripts and typecheck behaviour)
- supabase-schema.sql and supabase/functions/ (DB schema + server/cron logic)
- cloudflare/ and wrangler*.toml (edge worker config)
- openspec/changes/ (active SDD artifacts)
- .agents/skills/ and .atl/skill-registry.md (agent/skill compact rules)
- .github/workflows/ (CI expectations, required secrets)

If docs conflict with scripts, trust the executable (package.json, tsconfig, CI). When unsure: run the exact repo command and trust its output.
