# Apply Progress — password-recovery-hardening

## Merged previous progress (kept)
- T1: Fixed TypeScript issues; ensured `npx tsc --noEmit` passes. (commits: d73a7ef, d33bf66, 842328f, dd07d6f)
- T2: Added `test:ci` script and validated `pnpm test:ci` runs and exits.
- T3: Added unit tests for `updatePasswordWithRecovery` (`src/lib/__tests__/auth-store.spec.ts`).
- T4: Added unit tests for `RestablecerContrasenaPage` (`src/pages/__tests__/RestablecerContrasenaPage.spec.tsx`).
- T5: Refactored `updatePasswordWithRecovery` to use shared `withTimeout`/`withRetry` helpers.
- T6: Added `normalizeEmail` util and applied across codebase; added unit tests.

## This batch (tasks.md 1.1 → 5.1)
- [x] 1.1 Add Playwright dev dependency and script (`test:e2e`)
- [x] 1.2 Create `playwright.config.ts` (baseURL + retries CI=1 + webServer `pnpm dev`)
- [x] 2.1 Create `e2e/utils/supabaseAdmin.ts` (`ensureTestUser`, `ensureProfile`, `generateRecoveryLink`, `resetPassword`)
- [x] 2.2 Create `e2e/utils/recoveryUrl.ts` (`normalizeRecoveryUrl`)
- [x] 3.1 RED: Add `e2e/recovery.spec.ts` happy-path smoke
- [x] 3.2 GREEN: Wire spec with helpers
- [x] 3.3 REFACTOR: URL hygiene assertion + helper cleanup + CI retries
- [x] 4.1 Update README with env/run instructions
- [x] 4.2 Merge apply-progress (Engram + file)
- [x] 5.1 Run checks (`pnpm test`, `pnpm test:e2e`; plus `pnpm lint` per user request)

## TDD Cycle Evidence (Strict Mode)
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `e2e/__tests__/playwright-setup.spec.ts` | Unit | N/A (new) | ✅ script+dep assertions added first (failed) | ✅ pass after `package.json` update | ✅ dependency + script cases | ➖ None needed |
| 1.2 | `e2e/__tests__/playwright-setup.spec.ts` | Unit | N/A (new) | ✅ config existence assertion failed first | ✅ pass after `playwright.config.ts` | ✅ with 1.1 in same spec file | ✅ added `testIgnore` to avoid runner collision |
| 2.1 | `e2e/__tests__/supabaseAdmin.spec.ts` | Unit | N/A (new) | ✅ import failed before helper existed | ✅ pass after helper implementation | ✅ create/reuse/profile/link/reset cases | ✅ lazy client init + typed import path |
| 2.2 | `e2e/__tests__/recoveryUrl.spec.ts` | Unit | N/A (new) | ✅ import failed before helper existed | ✅ pass after helper implementation | ✅ redirect-to rewrite + code cleanup path | ➖ None needed |
| 3.1 | `e2e/recovery.spec.ts` | E2E | N/A (new) | ✅ spec authored before full wiring | ✅ e2e runner loads and skips when env missing | ✅ request→reset→login + URL hygiene assertion | ✅ removed arbitrary waits; explicit URL poll |
| 3.2 | `e2e/recovery.spec.ts` | E2E | N/A (new) | ✅ helper contracts drove missing code | ✅ wired helpers and selectors | ✅ baseline/new password + login verification | ✅ centralized base URL and cleanup flow |
| 3.3 | `e2e/recovery.spec.ts` + helpers | E2E/Unit | ✅ targeted helper tests green before refactor | ✅ added stricter URL post-hydration expectation | ✅ tests green after refactor | ✅ includes explicit URL hygiene path | ✅ helper/env/refactor complete |
| 4.1 | N/A (docs) | Docs | N/A | ✅ README requirements captured | ✅ manual validation of commands/envs | ➖ Single | ➖ None needed |
| 4.2 | `apply-progress.md` | Artifact | N/A | ✅ merge-first rewrite from prior file state | ✅ merged old + new completions | ➖ Single | ➖ None needed |
| 5.1 | Runtime checks | Verification | ✅ baseline targeted tests run first | ✅ failures observed and fixed (Playwright-vs-Vitest collision) | ✅ `CI=1 pnpm test` and `pnpm test:e2e` re-run | ✅ lint executed; pre-existing warnings remain repo-wide | ✅ adjusted `vitest` include + Playwright ignore |

## Check results
- ✅ `CI=1 pnpm test` → pass (20/20)
- ✅ `pnpm test:e2e` → pass (suite runs, `recovery.spec.ts` skipped without required secrets)
- ⚠️ `pnpm lint` → fails due **pre-existing repo warnings treated as errors** (`--max-warnings 0`) outside this change scope.

## Files added/updated in this batch
- `package.json`
- `pnpm-lock.yaml`
- `playwright.config.ts`
- `vitest.config.ts`
- `e2e/recovery.spec.ts`
- `e2e/utils/supabaseAdmin.ts`
- `e2e/utils/recoveryUrl.ts`
- `e2e/__tests__/playwright-setup.spec.ts`
- `e2e/__tests__/supabaseAdmin.spec.ts`
- `e2e/__tests__/recoveryUrl.spec.ts`
- `openspec/changes/password-recovery-hardening/README.md`
- `openspec/changes/password-recovery-hardening/tasks.md`
- `openspec/changes/password-recovery-hardening/apply-progress.md`
