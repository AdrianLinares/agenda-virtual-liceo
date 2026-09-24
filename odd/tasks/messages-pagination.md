# Messages pagination and date filters

## Objective
Make received and sent messages browsable through server-side pagination and an inclusive date-range filter, and raise the requested Supabase Data API row cap to 3,000 once the hosted-project mutation is explicitly authorized.

## Problem
The messages page issues one unpaginated query. The target account has 1,855 message rows, which can exceed the API response cap. Users also cannot narrow either mailbox by date.

## Why
Users need to reach the complete received/sent history without depending on one oversized response, and identify messages within a date interval.

## Scope and constraints
- Add server-side pagination to both `recibidos` and `enviados` queries using the existing `created_at` descending order.
- Add start/end date controls that apply to both tabs. Treat selected calendar dates inclusively; apply the filter to `created_at` and reset pagination when a tab or date changes.
- Preserve the existing sender/recipient filtering, message selection/details, status display, and RLS behavior.
- Add behavior-focused component tests for page navigation, date filtering in both tabs, empty/short/boundary pages, result-count shrinkage while on a later page, selected-message details, and resetting pagination when criteria change.
- Do not add a local Supabase configuration that would be mistaken for changing the hosted project's API cap. The repository has no `supabase/config.toml`; changing hosted `api.max_rows` is a separate remote operation requiring explicit destination and credential/session authorization.
- Do not stage or modify the existing unrelated `.atl/skill-registry.md` and `.codegraph/` working-tree entries.

## TDD and delivery
- TDD: strict, explicitly selected by the user for this feature.
- Test runner: `pnpm run test:ci` (authoritative Vitest run); focused command: `pnpm exec vitest run src/pages/__tests__/MensajesPage.spec.tsx`.
- Verification: `pnpm lint`, `pnpm build`, and `pnpm run test:ci`.
- Delivery strategy: `ask-on-risk`; forecast is below 400 authored changed lines. No PR is created or pushed by this task.
- Estimated authored changes: approximately 200 lines (planning estimate, not a cap).

## Authorized scope and route
- Feature branch: `feat/messages-list-controls`.
- Work unit W1: implement server-side page/range filtering plus tests in `src/pages/MensajesPage.tsx` and `src/pages/__tests__/MensajesPage.spec.tsx`. Route: delegated direct, triggered by the 2+ non-trivial-file writer rule and preparation/mapping rule. The parent mapped the page, current query, reusable Supabase range patterns, and test setup before delegation.
- Work unit W2: set hosted Supabase Data API `max_rows` to 3,000. User requested the value, but the exact remote target and credential/session authorization are not confirmed; do not perform this mutation until explicitly authorized.

## Checklist and progress
- [x] W1 — Correct stale-page handling and expand edge-case tests for paginated received and sent messages.
  - Acceptance: both tabs request only the current page, filter `created_at` to the inclusive selected dates, expose navigation based on the filtered result count, reset to the first page when tab/date criteria change, and clamp/refetch if a changed result count makes the current page invalid.
  - Verification: focused `pnpm exec vitest run src/pages/__tests__/MensajesPage.spec.tsx` passed (1 file, 7 tests); `pnpm lint` passed; `pnpm build` passed (Vite emitted the existing stale Browserslist data notice); `pnpm run test:ci` passed (18 files, 94 tests).
  - TDD evidence: before implementation, the requested `pnpm test -- src/pages/__tests__/MensajesPage.spec.tsx` run failed the new behavior assertions because the date controls and pagination controls were absent. The package script starts Vitest in watch mode and forwards `--` as an argument separator, so it ran the full suite and timed out after 120 seconds. With `CI=1`, the same command completed successfully (18 files, 91 tests); use the explicit `pnpm exec vitest run <file>` invocation for single-file execution.
  - Route evidence: delegated direct; mapper found no existing messages tests or reusable pagination UI, and confirmed query currently has no `.range()`/`.limit()`.
  - Commit: `5840c3c` (`feat(messages): paginate inbox with date filters`).
- [x] W1-CORR — Handle result-count shrinkage on later pages; add tests for short/empty pages and preserved message details.
  - Trigger: independent verification found that `page` was not clamped when `count` shrank, allowing an invalid page indicator/empty result despite earlier-page messages. The existing mock always returned one row and count 25, so it did not prove short/empty-page behavior.
  - Route: one delegated direct correction to the existing page/test scope; strict TDD requires a failing regression test before the fix. No scope expansion.
  - TDD evidence: before the implementation, focused Vitest reported the regression assertion failed because it could not find `Página 1 de 1` after the result count shrank while on page 2 (1 failed, 6 passed). The detail-view fixture also stubs JSDOM's missing `scrollIntoView` implementation.
  - Coverage: the Supabase mock now returns rows bounded by the requested range and current result count; tests verify a short final page (5 rows), an empty result set, and selecting a message into its detail view.
  - Verification: focused test passed (1 file, 7 tests); `pnpm lint` passed; `pnpm build` passed with the existing stale Browserslist data notice; `pnpm run test:ci` passed (18 files, 94 tests).
  - Commit: correction commit; hash is recorded in the delivery response.
- [ ] W2 — Apply hosted API row cap `3,000` after remote authorization.
  - Acceptance: the exact intended hosted project reports `max_rows = 3000` after the authorized change.
  - Verification: read back the configured value from that same authorized project.
  - Route: direct bounded remote setting operation only after explicit authorization; no project probing or mutation before that.

## Progress evidence
- The user selected strict TDD and requested date filters for both inbox tabs.
- The user authorized creating this feature branch; it was created from `main`.
- W1 currently uses 20-row server pagination with exact filtered counts and date filters. Date boundaries are local-calendar midnight instants; the end bound is exclusive midnight of the following local date so the selected end date is fully included.
- Added component tests for received/sent user-side ID filters, inclusive date bounds, page ranges and disabled boundaries, criteria/profile page resets, and reversed dates.
- Verification passed: lint, build, full Vitest CI suite (18 files, 91 tests), and direct focused suite (4 tests). The plain `pnpm test -- <file>` invocation did not isolate the file because the script forwards `--` to Vitest and starts watch mode; with `CI=1` it ran all 18 files successfully.
- W1 commit: `5840c3c` (`feat(messages): paginate inbox with date filters`).
- Parent verification reran `pnpm run test:ci` successfully (18 files, 91 tests). Because the assessment command rejected the unrelated untracked `.codegraph/`, the outcome is treated as high risk; independent verification was run and opened the single bounded W1 correction above.
- W1-CORR correction: `loadMensajes` now updates the exact count and clamps an invalid page before returning; the page effect then fetches the last valid page. The new test first reproduced `Página 2 de 1`, and focused plus full test suites now pass.
- Hosted Supabase `max_rows` remains pending; no remote operation or local pretend configuration was performed.
- The working tree also contains unrelated changes in `.atl/skill-registry.md` and untracked `.codegraph/`; preserve them and exclude them from feature commits.
- Engram mirror: pending; the save was rejected because multiple active runtime sessions match this project. Preserve this local task document and resynchronize when the session ambiguity is resolved.

## Next step
Keep W2 blocked pending exact remote authorization; leave `.atl/skill-registry.md` and `.codegraph/` untouched. Engram mirror resynchronization is pending.
