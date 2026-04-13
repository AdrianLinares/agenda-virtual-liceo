# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

## User Skills

| Trigger (when to use) | Skill | Path |
|---|---|---|
| Complex TypeScript type logic, reusable type utilities, compile-time type safety | typescript-advanced-types | .agents/skills/typescript-advanced-types/SKILL.md |
| Vite config, plugins, SSR, library builds | vite | .agents/skills/vite/SKILL.md |
| Audit/profile/optimize page load performance, Lighthouse, Core Web Vitals | web-perf | .agents/skills/web-perf/SKILL.md |
| Cloudflare Workers review and production best practices | workers-best-practices | .agents/skills/workers-best-practices/SKILL.md |
| Node.js backend architecture, APIs, DB, auth patterns | nodejs-backend-patterns | .agents/skills/nodejs-backend-patterns/SKILL.md |
| Web accessibility (WCAG 2.2) audits and fixes | accessibility | .agents/skills/accessibility/SKILL.md |
| Production-grade frontend UI design and components | frontend-design | .agents/skills/frontend-design/SKILL.md |
| Wrangler / Cloudflare Workers CLI usage and checks | wrangler | .agents/skills/wrangler/SKILL.md |
| React / Next.js performance and bundle optimization | vercel-react-best-practices | .agents/skills/vercel-react-best-practices/SKILL.md |
| Cloudflare deploy: Pages, Workers, bindings, tokens | cloudflare-deploy | .agents/skills/cloudflare-deploy/SKILL.md |
| Migrate Next.js → vinext (Vite-based Next.js) | migrate-to-vinext | .agents/skills/migrate-to-vinext/SKILL.md |
| SEO: meta tags, structured data, sitemaps | seo | .agents/skills/seo/SKILL.md |
| Node.js engineering best-practices (decision patterns) | nodejs-best-practices | .agents/skills/nodejs-best-practices/SKILL.md |
| Tailwind CSS utility patterns and responsive strategies | tailwind-css-patterns | .agents/skills/tailwind-css-patterns/SKILL.md |
| Vitest: tests, fixtures, filtering, CI runs | vitest | .agents/skills/vitest/SKILL.md |
| Cloudflare platform (broad) — workers, Pages, KV, D1, R2 | cloudflare | .agents/skills/cloudflare/SKILL.md |
| Vercel-style React composition patterns (compound components) | vercel-composition-patterns | .agents/skills/vercel-composition-patterns/SKILL.md |
| Supabase/Postgres performance & schema best-practices | supabase-postgres-best-practices | .agents/skills/supabase-postgres-best-practices/SKILL.md |
| Playwright test guidance and E2E best practices | playwright-best-practices | .agents/skills/playwright-best-practices/SKILL.md |


## Compact Rules

### typescript-advanced-types
- Use this skill when implementing advanced TypeScript types, reusable generics, template literal types, mapped and conditional types.
- Prefer compile-time solutions (types/utilities) instead of runtime checks when feasible.
- Keep type-level logic clear: name generic parameters, extract helper utility types, avoid deeply nested conditional chains.
- Use `tsc --noEmit` or CI typecheck step to verify invariants before merging.
- When converting JS → TS, start with `any`-to-specific migration patterns and add strictness incrementally.

### vite
- Use for Vite config, plugin ordering, SSR and library builds; prefer ESM config files (vite.config.ts as ESM).
- Prefer `pnpm exec`/`npx` for local tools; ensure `esbuild`/plugins are compatible with Vite 5.
- For library builds, use `build.lib` config and set `external` and `formats` explicitly.
- In CI, prefer `pnpm build` (runs tsc then vite build) and `pnpm exec tsc --noEmit` for fast type-only checks.

### web-perf
- Measure real Core Web Vitals (LCP, INP, CLS) using Lighthouse/Chrome DevTools; prioritize LCP and INP regressions.
- Use performance tracing (trace / trace_event) for root-cause analysis; prefer filmstrip and network waterfall for LCP.
- Report actionable changes: reduce critical CSS/JS, defer non-critical images, compress assets, use caching headers.
- When automating, favor Lighthouse CI or Puppeteer/Playwright traces; do not rely solely on synthetic single-run numbers.

### workers-best-practices
- Use for Cloudflare Workers code reviews: ensure `ctx.waitUntil()` for fire-and-forget tasks; never `await` background work.
- Use prepared statements or `env.DB.prepare(...).bind(...)` for D1 to avoid SQL injection and retries.
- Prefer small, idempotent handlers; offload heavy compute to Durable Objects or external services.
- Generate bindings types with `npx wrangler types` and validate `compatibility_date` is up-to-date.

### nodejs-backend-patterns
- Use for API design, middleware, error handling, and DB integration; centralize error handling and logging.
- Avoid blocking CPU work in request handlers; move to job queues or worker threads if needed.
- Validate and sanitize inputs at boundary; use prepared statements / parameterized queries for DB access.
- Prefer composable middleware patterns and keep handlers small and testable.

### accessibility
- Use for WCAG 2.2 compliance, keyboard navigation, ARIA roles and semantics; run `axe` or equivalent automated checks.
- Prefer semantic HTML and visible focus styles; ensure form fields have accessible labels and error messaging.
- For dynamic UI (dialogs, menus), manage focus containment and aria-hidden toggles correctly.
- Provide one-line remediation suggestions (e.g., add aria-label, role, or visible label) when reporting issues.

### frontend-design
- Use when designing reusable components and layouts; prefer composition over many boolean props.
- Provide clear tokens (spacing, colors, typography) and favor CSS variables or Tailwind tokens for theming.
- Components must be accessible by default (keyboard, aria where required) and have testable hooks.

### wrangler
- Run basic checks before deployments: `wrangler --version`, `npx wrangler types`, confirm `wrangler.toml` bindings.
- For deployments, use `wrangler deploy --config <file>` and keep preview/production IDs separate.
- Keep secrets out of source; use `wrangler secret put` or CI secret stores.

### vercel-react-best-practices
- Use for React/Next performance: prefer Server Components where appropriate, minimize client bundle size.
- Avoid heavy client-side data fetching; prefer streaming and server-side data when possible.
- Use code-splitting and analyze bundles; replace large libs with lighter alternatives when feasible.

### cloudflare-deploy
- Use for Pages + Workers deploys: Pages for static frontend (publish `dist`), `wrangler` for Workers and edge code.
- Create scoped API tokens for CI with only necessary permissions; never commit tokens.
- Validate `_redirects` includes `/* /index.html 200` for SPA routing when deploying to Pages.

### migrate-to-vinext
- Before migrating, verify Next.js usage in package.json and server components; replace unsupported APIs with vinext equivalents.
- Update build tooling to Vite-compatible plugins and adjust serverless runtime patterns.

### seo
- Use for meta tags, canonical URLs, structured data (JSON-LD), and sitemaps; validate with Google Rich Results Test.
- Ensure `og:` and `twitter:` tags present for social previews and canonical links for duplicate pages.

### nodejs-best-practices
- Use general Node operational rules: handle uncaught exceptions, use structured logs, set request timeouts, avoid blocking I/O.
- Prefer environment-based configuration and secure handling of secrets on the server only.

### tailwind-css-patterns
- Prefer utility-first composition; use responsive prefixes (`sm:`, `md:`) and `@apply` sparingly.
- Keep design tokens in Tailwind config; avoid duplication of utility classes across components.

### vitest
- Use for unit tests and CI: `pnpm test` for dev, `pnpm run test:ci` for CI. Use `pnpm test -- -t "pattern"` to run named tests.
- Prefer Testing Library for React component tests; use `vi` for mocking and fixtures.

### cloudflare
- Broad Cloudflare platform rules: consult Cloudflare docs for APIs (Workers, KV, R2, D1); always generate runtime types.
- Use `ctx.waitUntil()` for background work; avoid long CPU-bound requests in Workers.

### vercel-composition-patterns
- Use compound components and context to avoid boolean-prop proliferation; expose minimal public API for components.
- Prefer well-documented hooks and composable primitives for variations.

### supabase-postgres-best-practices
- Use prepared statements, indexes, and RLS policies carefully; never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- For migrations, apply `supabase-schema.sql` and test RLS rules with representative test users.

### playwright-best-practices
- Use for E2E: run Playwright against a seeded Supabase DB; seed using `supabase-schema.sql` before tests.
- Use `npx playwright install --with-deps` in CI and limit E2E runs to configured environments.


## Project Conventions

| File | Path | Notes |
|---|---:|---|
| AGENTS.md | ./AGENTS.md | High-signal agent rules and verification order (pnpm lint, pnpm build, pnpm run test:ci) |
| CLAUDE.md | ./CLAUDE.md | Project-level Claude skill summaries and Cloudflare-related references |
| Copilot instructions | .github/copilot-instructions.md | Local Copilot guidance (build/test/lint, verification order, agent git policy) |

### Extracted references from AGENTS.md
- README.md
- package.json
- tsconfig.node.json
- supabase-schema.sql
- openspec/changes/
- .agents/skills/ (this skill registry source)
- .atl/skill-registry.md (this file)


## Next Steps / Usage
- Delegators MUST copy matching Compact Rules blocks into sub-agent launch prompts under `## Project Standards (auto-resolved)`.
- To refresh after installing/removing skills, run this registry update flow again.

---
Generated by project skill-registry runner.
