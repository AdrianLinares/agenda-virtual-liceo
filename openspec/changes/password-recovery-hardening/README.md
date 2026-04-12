## password-recovery-hardening

Artifacts and runbook for hardening the password recovery flow.

### Local run (E2E smoke)

1. Install dependencies:

```bash
pnpm install
```

2. Ensure env vars are present (never commit secrets):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (E2E helper only)
- Optional overrides:
  - `E2E_BASE_URL` (default `http://localhost:5173`)
  - `E2E_TEST_EMAIL` (default `e2e.recovery@liceo.test`)
  - `E2E_TEST_PASSWORD` (default `Baseline123*`)
  - `E2E_TEST_NEW_PASSWORD` (default `Recovered123*`)

3. Run unit tests first, then smoke E2E:

```bash
pnpm test
pnpm test:e2e
```

### Notes

- E2E uses Supabase Admin API to generate the recovery link and avoids inbox polling.
- Playwright retries are enabled only in CI (`retries=1`) to reduce flakes without hiding local failures.
