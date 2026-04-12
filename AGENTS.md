# AGENTS - Compact, high-signal instructions

Only include facts an agent would likely miss. Read README, package.json, tsconfig, CI and openspec/ first.

Quick commands (exact)
- Install: `pnpm install` (preferred). `npm install` allowed when pnpm unavailable.
- Dev: `pnpm dev` (Vite)
- Build (typecheck+bundle): `pnpm build` -> runs `tsc --project tsconfig.node.json && vite build`
- Lint: `pnpm lint` (eslint with --max-warnings 0 — warnings fail)
- Unit tests (dev): `pnpm test` (vitest)
- Unit tests (CI): `pnpm run test:ci` -> `vitest run` (use this for automated verification)
- E2E: `pnpm run test:e2e` (Playwright — requires real Supabase + env)

Verification order you should use before committing:
- 1) `pnpm lint`
- 2) `pnpm build` (typecheck via tsc)
- 3) `pnpm run test:ci` (tests are authoritative)

Repo-specific constraints
- Package manager: pnpm preferred (lockfiles reflect pnpm-style setup).
- Supabase schema: apply `supabase-schema.sql` to your Supabase project BEFORE running protected flows or E2E tests.
- `.env`: copy `.env.example` -> `.env` and fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Never commit `.env` or service keys.
- Server secrets (never client): SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET — store in CI/hosting secrets.

SDD & artifacts
- `openspec/` exists and is excluded from commits. Do NOT write persistent SDD artifacts there unless instructed.
- Engram is the active SDD artifact store. To share memories across machines:
  - `engram sync`                    # export new memories as compressed chunk
  - `git add .engram/ && git commit -m "sync engram memories"`
  - On another machine: `engram sync --import`
  - Check status: `engram sync --status`

Strict TDD
- This repo uses STRICT TDD for sdd-apply / sdd-verify. Sub-agents must run `pnpm run test:ci` and must NOT skip tests.

Deploy notes (short)
- Cloudflare Pages: Build with `pnpm build`. Publish directory: `dist`.
- Ensure `public/_redirects` contains `/* /index.html 200` for SPA routing.
- Edge functions / workers (send-message-emails, cron) require secrets and separate deploys (e.g. `wrangler deploy --config wrangler.worker.toml`).

Testing gotchas
- Playwright E2E requires a real Supabase instance seeded with schema/data; do not run E2E without envs and migrations applied.
- Lint warnings fail CI; fix ESLint errors/warnings before pushing.

Git / commit policy (agents)
- You MAY create commits, but DO NOT create branches. All commits go to origin/main only after manual testing/verification by a human.
- Do NOT force-push or amend pushed commits. If a hook fails, fix locally and create a new commit.
- ALWAYS confirm with the user before pushing to origin/main. Ask explicit approval (yes/confirm) before running `git push`.
- After pushing to origin/main, save important artifacts/decisions to engram (mem_save) so other machines/agents can consume the change.

Where to look first
- README.md (env, setup)
- package.json, tsconfig.node.json (scripts, typecheck)
- supabase-schema.sql and migrations/
- openspec/changes/ (active SDD work)
- .atl/skill-registry.md (if present) — use Compact Rules for sub-agent prompts

If docs conflict with scripts, trust the executable script (package.json, tsconfig, CI). When in doubt: run the exact command listed above and rely on its output.
