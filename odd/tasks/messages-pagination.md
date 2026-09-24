# Messages pagination and date filters

## Objective
Make received and sent messages browsable through server-side pagination, an inclusive date-range filter, and an optional counterpart filter; raise the requested Supabase Data API row cap to 3,000 once the hosted-project mutation is explicitly authorized.

## Problem
The messages page issues one unpaginated query. The target account has 1,855 message rows, which can exceed the API response cap. Users also cannot narrow either mailbox by date.

## Why
Users need to reach the complete received/sent history without depending on one oversized response, and identify messages within a date interval.

## Scope and constraints
- Add server-side pagination to both `recibidos` and `enviados` queries using the existing `created_at` descending order.
- Add start/end date controls that apply to both tabs. Treat selected calendar dates inclusively; apply the filter to `created_at` and reset pagination when a tab or date changes.
- Add an optional counterpart dropdown: sender in `recibidos`, recipient in `enviados`. Apply it server-side by profile ID, combine it with the date criteria, and reset pagination/selection when it changes.
- When a reduced exact result count clamps the current page to a valid page, clear the selected-message detail. The user explicitly selected this behavior.
- Preserve the existing sender/recipient filtering, message selection/details, status display, and RLS behavior.
- Add behavior-focused component tests for page navigation, date and counterpart filtering in both tabs, empty/short/boundary pages, result-count shrinkage while on a later page, selected-message details, and resetting pagination when criteria change.
- Do not add a local Supabase configuration that would be mistaken for changing the hosted project's API cap. The repository has no `supabase/config.toml`; changing hosted `api.max_rows` is a separate remote operation requiring explicit destination and credential/session authorization.
- Do not stage or modify the existing unrelated `.atl/skill-registry.md` and `.codegraph/` working-tree entries.

## TDD and delivery
- TDD: strict, explicitly selected by the user for this feature.
- Test runner: `pnpm run test:ci` (authoritative Vitest run); focused command: `pnpm exec vitest run src/pages/__tests__/MensajesPage.spec.tsx`.
- Verification: `pnpm lint`, `pnpm build`, and `pnpm run test:ci`.
- Delivery strategy: user-selected `feature-branch-chain` under `ask-on-risk`. No PR is created or pushed by this task.
- The original estimate was approximately 200 lines. The full integration diff is about 720 changed lines; the planned PR 1 and PR 2 slices are 361 and 359 changed lines respectively, excluding unrelated working-tree changes.

## Authorized scope and route
- Feature branch: `feat/messages-list-controls`.
- Work unit W1: implement server-side page/range filtering plus tests in `src/pages/MensajesPage.tsx` and `src/pages/__tests__/MensajesPage.spec.tsx`. Route: delegated direct, triggered by the 2+ non-trivial-file writer rule and preparation/mapping rule. The parent mapped the page, current query, reusable Supabase range patterns, and test setup before delegation.
- Work unit W2: set hosted Supabase Data API `max_rows` to 3,000. User requested the value, but the exact remote target and credential/session authorization are not confirmed; do not perform this mutation until explicitly authorized.

## Delivery plan
- Strategy: user-selected `feature-branch-chain`.
- Tracker branch: local `feat/messages-list-controls-tracker`, created from `origin/main`; its PR to `main` must remain draft/no-merge while child slices are reviewed. No remote PR was created.
- PR 1 slice: local child branch `feat/messages-list-controls-01-pagination-dates`, at `7e15ec7`; base is the tracker branch; includes pagination/date behavior, tests, and its task document. Current count: 351 additions + 10 deletions = 361 changed lines.
- PR 2 slice: current branch `feat/messages-list-controls`, based on PR 1 commit `7e15ec7`; target is `feat/messages-list-controls-01-pagination-dates`; includes the page-clamp correction, counterpart filter, selected-detail behavior, and failed-query recovery. Current slice count after task evidence updates: 334 additions + 25 deletions = 359 changed lines.
- The tracker branch is the final integration target and only it may merge to `main`; do not create or open remote PRs in this task. Recount slices after final task-document updates; keep each child PR under 400 changed lines.

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
  - Commit: `7bc12b3` (`fix(messages): clamp stale pagination results`).
- [x] W1-FINAL — Clear stale selected-message details when a shrinking result count clamps the current page.
  - User decision: clear the selected-message detail when clamping changes the current page.
  - Acceptance: selecting a message on page 2, then shrinking results so the page clamps, clears the detail and leaves the list/count/page consistent.
  - TDD RED: focused run failed the new clamp assertion because the selected detail remained visible after page 2 clamped to page 1 (1 file, 9 tests; 2 failed, 7 passed; the other failure was the missing counterpart control).
  - TDD GREEN: focused run passed (1 file, 9 tests).
  - Verification: `pnpm lint` passed; `pnpm build` passed with the existing stale Browserslist-data notice; `pnpm run test:ci` passed (18 files, 96 tests).
  - Commit: `85f3944` (`feat(messages): filter counterpart and recover stale results`).
- [x] W1-FILTER — Add an optional counterpart dropdown to both message tabs.
  - Acceptance: `recibidos` filters by selected sender ID; `enviados` filters by selected recipient ID; the filter combines with date bounds and pagination, and clearing it restores the unfiltered mailbox from page 1.
  - Route: delegated direct with W1-FINAL because both behaviors touch the same page/query/test files; strict TDD applies.
  - Implementation: added an optional list filter labeled `Remitente` or `Destinatario`; active profile options are loaded through the existing browser Supabase client and current RLS context, excluding the current user. The query adds the selected profile ID to the correct counterpart column alongside the current-user mailbox constraint, date bounds, exact count, and page range. `Todos` omits the optional filter.
  - Coverage: tests assert both tab-specific ID columns, inclusive date bounds combined with counterpart IDs, page reset on selecting/clearing, cleared detail after criteria change, and no stale page indicator after clamp.
  - TDD GREEN: focused run passed (1 file, 9 tests); `pnpm lint` passed; `pnpm build` passed with the existing stale Browserslist-data notice; `pnpm run test:ci` passed (18 files, 96 tests).
- [x] W1-ERROR — Prevent stale rows/counts from appearing after a filtered message query fails.
  - Trigger: independent verification found that the latest query's catch path sets an alert but preserves the prior page rows/count. Because filter changes reset the page, a failed response can leave rows from the old criteria visible beneath the new filter state.
  - Acceptance: when a changed tab/date/counterpart query fails, clear or invalidate prior results and count for that latest request; show the existing error state and never present old rows as matches for the new criteria. Preserve request-ID protection against stale requests.
  - Route: one bounded delegated direct correction to `MensajesPage.tsx` and its component tests; strict TDD requires a failing request-error test before the fix.
  - Implementation: track the criteria/page key of the last successful result; for a latest-request failure, clear rows/count/selection only if its key differs. Same-criteria refresh failures retain loaded data and selection. Suppress the empty-mailbox state while an error is shown; latest-request ID checks remain in place.
  - TDD RED: focused Vitest failed as expected (1 failed, 9 passed); after the changed-date query failed, the old `Mensaje página 1` row remained visible.
  - TDD GREEN: focused Vitest passed (1 file, 11 tests), including changed-criteria clearing and same-criteria refresh preservation.
  - Verification: `pnpm lint` passed; `pnpm build` passed with the existing stale Browserslist-data notice; `pnpm run test:ci` passed (18 files, 98 tests).
  - Commit: `85f3944` (`feat(messages): filter counterpart and recover stale results`).
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
- Final independent verification found the selected-message detail could remain stale after clamping. The user resolved the behavior: clear the selected message when clamping changes the page.
- Implemented clamp selection clearing and the optional counterpart filter, mapped to sender in Recibidos and recipient in Enviados. Criteria changes reset to page 1 and clear selected detail; the exact-count clamp also clears detail before the valid-page refetch.
- Focused TDD evidence: before production changes, `pnpm exec vitest run src/pages/__tests__/MensajesPage.spec.tsx` produced 2 expected failures (stale selected detail after clamp and absent counterpart control), with 7 tests passing. After changes, the same command passed all 9 tests.
- Final verification: `pnpm lint` passed; `pnpm build` passed with the existing stale Browserslist-data notice; `pnpm run test:ci` passed (18 files, 96 tests). Existing React Router and expected error-path test stderr warnings remain non-failing.
- Counterpart choices use the active-profile list from the existing client-side `profiles` query, without service-role access; the compose permission-role restriction is not reused as the historical-counterpart list.
- The user selected `feature-branch-chain`; PR 1 and PR 2 are planned as bounded child slices below 400 lines. Local tracker and PR 1 child branches have been created; no remote PR exists.
- The current checkout remains on PR 2 branch `feat/messages-list-controls`.
- Final independent verification found that a failed current query can leave prior rows/count visible under the new criteria; the strict-TDD W1-ERROR correction is recorded above.
- W1-ERROR correction: a failed current query clears prior page rows, count, and selection only when the request key differs from the last successful query; failed same-criteria refreshes preserve them. Request-ID protection still guards success and error completion updates.
- W1-ERROR TDD evidence: the pre-fix changed-date failure showed the stale `Mensaje página 1` row (1 failed, 9 passed); post-fix focused tests passed (11 tests), including preservation on a failed same-criteria refresh.
- W1-ERROR verification passed: lint, build (existing stale Browserslist-data notice), and full CI Vitest (18 files, 98 tests).
- W1-FINAL, W1-FILTER, and W1-ERROR were committed together as `85f3944` (`feat(messages): filter counterpart and recover stale results`).
- Parent reran `pnpm run test:ci` successfully (18 files, 98 tests) and `git diff --check` passed. Risk assessment could not inventory the unrelated untracked `.codegraph/`, so the delegated-verification tier remains high; independent verification found no blocker in settled request-error states.
- Residual verifier caveats: no explicit delayed/out-of-order request or failed clamp-refetch test; during a clamp refetch there may be a brief prior-row/page mismatch; a failed manual page navigation may leave a page/count indicator mismatch. No additional correction was made after the bounded W1-ERROR fix.
- Hosted Supabase `max_rows` remains pending; no remote operation or local pretend configuration was performed.
- The working tree also contains unrelated changes in `.atl/skill-registry.md` and untracked `.codegraph/`; preserve them and exclude them from feature commits.
- Engram mirror: pending; the save was rejected because multiple active runtime sessions match this project. Preserve this local task document and resynchronize when the session ambiguity is resolved.

## Next step
W1-ERROR is complete. Recount the PR 2 slice, then commit only its feature files and task document. Do not push/create PRs; keep W2 blocked pending exact remote authorization. Leave `.atl/skill-registry.md` and `.codegraph/` untouched. Engram mirror resynchronization is pending.
