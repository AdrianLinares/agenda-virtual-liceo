# Tasks: Password Recovery Hardening

## Phase 1: Foundation / Test infra

- [x] 1.1 Add Playwright dev dependency and script to package.json (`test:e2e`) (code change) — ~15m — depends: none
- [x] 1.2 Create `playwright.config.ts` with baseURL, retries (CI=1), and webServer (`pnpm dev`) (code change) — ~20m — depends: 1.1

## Phase 2: Core E2E helpers

- [x] 2.1 Create `e2e/utils/supabaseAdmin.ts` implementing ensureTestUser, ensureProfile, generateRecoveryLink, resetPassword (code change) — ~45m — depends: 1.2
- [x] 2.2 Create `e2e/utils/recoveryUrl.ts` with normalizeRecoveryUrl(actionLink, baseUrl) (code change) — ~10m — depends: 2.1

## Phase 3: E2E spec (TDD)

- [x] 3.1 RED: Add `e2e/recovery.spec.ts` Playwright test (happy-path) with comments for expected failing assertions (test file) (code change — test-first) — ~30m — depends: 1.1,1.2
- [x] 3.2 GREEN: Implement minimal wiring so `e2e/recovery.spec.ts` passes using helpers from 2.1/2.2 (code change) — ~45m — depends: 3.1,2.1,2.2
- [x] 3.3 REFACTOR: Clean helpers, remove duplicated waits, add explicit expect checks and set Playwright retries=1 for CI (code change) — ~20m — depends: 3.2

## Phase 4: Documentation & metadata

- [x] 4.1 Update `openspec/changes/password-recovery-hardening/README.md` with run instructions and required env vars (openspec edit) — ~10m — depends: 1.1,1.2
- [x] 4.2 Merge existing apply-progress from Engram (`sdd/password-recovery-hardening/apply-progress`) into `openspec/changes/password-recovery-hardening/apply-progress.md` (openspec edit — MERGE, do not overwrite) — ~10m — depends: existing apply-progress

## Phase 5: Verification / CI smoke run

- [x] 5.1 Run `pnpm test` (unit) then `pnpm test:e2e` locally; fix flakiness (manual) (verification) — ~30m — depends: 3.2,4.1

## Notes

- Strict TDD: follow strict-tdd.md — write failing test first (3.1), then implement (3.2), then refactor (3.3). Run `pnpm test` frequently.
- Security: use `SUPABASE_SERVICE_ROLE_KEY` from env in CI only; never commit secrets.

Total tasks: 9
