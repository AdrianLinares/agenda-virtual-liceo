# .github/copilot-instructions.md

Purpose
- Short reference for Copilot/automated agents working on this repository. Focused on exact commands, high-level architecture, and repo-specific conventions that affect automation or code changes.

1) Build, test, and lint commands
- Install (preferred): pnpm install  (npm install is supported)
- Dev server: pnpm dev
- Build (typecheck + bundle): pnpm build
  - Equivalent to: tsc --project tsconfig.node.json && vite build
- Preview build: pnpm preview
- Lint (CI-strict): pnpm lint
  - Runs: eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0
  - Note: ESLint warnings cause CI failure.

Tests
- Unit (Vitest, dev): pnpm test
- Unit (Vitest, CI): pnpm run test:ci   (runs: vitest run)
- Watch tests: pnpm run test:watch
- Run a single unit test file: pnpm test -- path/to/file.test.ts
- Run tests by name (filter): pnpm test -- -t "pattern"
- E2E (Playwright): pnpm run test:e2e
  - Run a single E2E spec: pnpm run test:e2e -- tests/path/to.spec.ts
  - WARNING: Playwright E2E requires a real Supabase instance seeded with supabase-schema.sql and proper env vars.

Verification order (use before merging changes)
1) pnpm lint
2) pnpm build
3) pnpm run test:ci

2) High-level architecture (big picture)
- Frontend SPA: React + TypeScript + Vite. Source in `src/` (components/, lib/, pages/, types/, styles/). Entry: `src/main.tsx`, routes in `src/App.tsx`.
- UI: TailwindCSS + shadcn-ui components under `src/components/ui`.
- State: zustand for global state (auth-store etc.).
- Backend services:
  - Supabase (Postgres) as the primary backend. DB schema at `supabase-schema.sql`. Row Level Security (RLS) is used.
  - Supabase Functions in `supabase/functions/` for server-side/cron tasks (e.g., email senders).
  - Cloudflare Workers / wrangler config found under `cloudflare/` and `wrangler*.toml` for edge workers; frontend is deployed to Cloudflare Pages (publish dir `dist`).
- CI & automation: GitHub Actions workflows in `.github/workflows/` (examples: email worker cron). Frontend deploys via Cloudflare Pages; edge functions deployed separately (wrangler / supabase functions).

3) Key conventions and repo-specific rules
- Package manager: pnpm is preferred. Use pnpm install in automation.
- Env vars:
  - Frontend-only envs must be prefixed with VITE_ (e.g., VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
  - Server/cron secrets: SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET (never commit these).
  - Copy `.env.example` → `.env` for local development; do NOT commit `.env`.
- Secrets: never commit service keys; use CI/hosting secret stores (Cloudflare secrets, GitHub secrets, Supabase secrets).
- Lint: ESLint warnings fail CI. Fix warnings (not just errors) before pushing.
- Typecheck: `pnpm build` includes type checking (tsc --project tsconfig.node.json). Always run build in verification.
- Tests: Strict TDD/verification required for sdd-apply and sdd-verify workflows: automated agents must run `pnpm run test:ci` and must not skip tests.
- openspec/: ephemeral SDD artifacts. Do NOT use it as persistent storage for implementation changes.
- Agent Git policy (strict for automated agents)
  - Agents MAY create commits but MUST NOT create branches. Any push to origin/main requires explicit human confirmation (ask: "confirm to push?").
  - Never force-push or amend pushed commits. If hooks fail, fix and create a new commit.
- SPA routing: ensure `public/_redirects` contains: `/* /index.html 200` for Cloudflare Pages.
- E2E gotchas: Playwright tests require a seeded Supabase DB (apply `supabase-schema.sql`) and proper env vars; do not run E2E in CI/dev unless configured.

Where to look first
- README.md (setup and deploy checklist)
- package.json and tsconfig.node.json (scripts and typecheck)
- supabase-schema.sql and supabase/functions/ (DB + server logic)
- cloudflare/ and wrangler*.toml (edge workers)
- openspec/changes/ (active SDD artifacts)
- .github/workflows/ (CI/workflows)

Notes from other AI assistant configs (incorporated)
- AGENTS.md: verification order and agent git policy (see above).
- CLAUDE.md: repository contains Cloudflare-related skills/docs; follow Cloudflare secret/publishing guidance and use `wrangler`/Pages as documented.

Quick examples
- Run a single unit test file: pnpm test -- src/lib/myUtil.test.ts
- Run tests matching a name: pnpm test -- -t "renders" 
- Run a single E2E spec: pnpm run test:e2e -- tests/login.spec.ts

Contact points for automation
- If an automated agent needs to modify deployment or secrets, require human approval and explicit instructions to push/deploy.

---
Created by Copilot helper: concise instructions to help future Copilot/agents operate safely in this repo.

Improvements added (clarifications):
- Typecheck-only (fast): pnpm exec tsc --project tsconfig.node.json --noEmit
- Lint single file: pnpm run lint -- src/path/to/file.tsx   # or pnpm exec eslint src/path/to/file.tsx --ext ts,tsx
- Run a single Vitest file: pnpm test -- src/path/to/file.test.ts
- Run a named Vitest test: pnpm test -- -t "pattern"
- CI installs: use pnpm install --frozen-lockfile in CI to ensure reproducible installs
- Use pnpm exec / npx when running tools directly in scripts to avoid global deps

CI/Automation notes:
- Playwright GH Action needs these secrets: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, APP_BASE_URL; ensure supabase-schema.sql is applied before E2E runs.
- When an automated agent changes deployment or secrets, require explicit human confirmation before pushing to origin/main.

If you'd like these items reordered, shortened, or integrated into an existing section, say which section to change.

## Memory
You have access to Engram persistent memory via MCP tools (mem_save, mem_search, mem_session_summary, etc.).
- Save proactively after significant work — don't wait to be asked.
- After any compaction or context reset, call `mem_context` to recover session state before continuing.