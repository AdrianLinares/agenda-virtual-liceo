# E2E Testing Setup Guide

This guide explains how to set up and run end-to-end tests for the Agenda Virtual Liceo project.

## Prerequisites

### Environment Variables

Set the following environment variables for E2E testing:

```bash
# Required for Supabase connection
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Required for database seeding and test user management
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:your-service-role-key@db.your-project-ref.supabase.co:5432/postgres

# Optional: Custom test user credentials (defaults provided)
E2E_TEST_EMAIL=e2e.test@liceo.test
E2E_TEST_PASSWORD=TestPass123*
E2E_TEST_NEW_PASSWORD=NewTestPass123*
```

### Database Seeding

Before running E2E tests, seed your Supabase database with the required schema and test data:

#### Option 1: Using the provided script

```bash
# Make sure you're in the project root
./scripts/seed_supabase.sh
```

Or with explicit parameters:

```bash
./scripts/seed_supabase.sh https://your-project-ref.supabase.co your-service-role-key
```

#### Option 2: Using Supabase CLI

```bash
# Install CLI if not already installed
npm install -g supabase

# Link your project
supabase link --project-ref your-project-ref

# Reset database with schema
supabase db reset
```

### Browser Installation

Playwright requires browsers to run tests. Install them once:

```bash
npx playwright install --with-deps
```

This installs Chromium, Firefox, and WebKit browsers along with their system dependencies.

## Running E2E Tests

### Run All E2E Tests

```bash
pnpm run test:e2e
```

### Run Specific Test File

```bash
# Run login tests
pnpm run test:e2e -- e2e/login_autofill_and_submit.spec.ts

# Run session visibility tests
pnpm run test:e2e -- e2e/session_visibility.spec.ts

# Run recovery flow tests
pnpm run test:e2e -- e2e/recovery_flow.spec.ts
```

### Run Tests in Specific Browser

```bash
# Run in Chromium only
pnpm run test:e2e -- --project=chromium

# Run in Firefox
pnpm run test:e2e -- --project=firefox
```

### Debug Mode

```bash
# Run with browser UI visible for debugging
pnpm run test:e2e -- --headed

# Run in debug mode (step through tests)
pnpm run test:e2e -- --debug
```

## Test Structure

### login_autofill_and_submit.spec.ts

Tests the login flow with simulated autofill:
- Verifies login succeeds and redirects to dashboard
- Confirms profile information loads
- Tests error handling for invalid credentials

### session_visibility.spec.ts

Tests session persistence during tab visibility changes:
- Logs in and fills a form draft
- Simulates tab switching (hidden/visible)
- Verifies form state is preserved and no remount occurs

### recovery_flow.spec.ts

Tests password recovery with hydration handling:
- Verifies recovery form preserves inputs during state changes
- Tests the complete recovery flow

## CI/CD Integration

In GitHub Actions, the E2E tests run automatically on pull requests and pushes to main. The workflow:

1. Checks out code
2. Sets up Node.js and pnpm
3. Installs dependencies
4. Installs Playwright browsers
5. Runs E2E tests against staging environment

Required secrets in GitHub repository:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Troubleshooting

### Common Issues

1. **Tests skipped due to missing env vars**
   - Ensure all required environment variables are set
   - Check that `.env` file exists in project root

2. **Database connection errors**
   - Verify Supabase project is active
   - Check service role key permissions
   - Ensure database is seeded with schema

3. **Browser launch failures**
   - Run `npx playwright install --with-deps` again
   - Check system has required dependencies (see Playwright docs)

4. **Test timeouts**
   - Increase timeout in `playwright.config.ts`
   - Check network connectivity to Supabase

### Test Data Management

Tests use isolated test users that are created and cleaned up automatically. The test helpers in `e2e/utils/supabaseAdmin.ts` manage:

- Creating test users with profiles
- Resetting passwords between tests
- Cleaning up test data

## Best Practices

- Always seed the database before running tests locally
- Use different test users for different test scenarios
- Keep test data minimal and focused
- Use descriptive test names and assertions
- Run tests in headless mode for CI performance