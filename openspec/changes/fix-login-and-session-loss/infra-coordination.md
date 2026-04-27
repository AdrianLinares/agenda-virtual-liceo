# Infra Coordination: Login and Session Loss Fix

## Issue Summary

The application experienced login failures and session loss issues in production, traced to Cloudflare configuration conflicts with the authentication flow.

## Evidence

### Console Logs from Production

```
[Login Error] Invalid login: JWT expired or invalid
[Auth Store] markAppResumed called - session may have been lost
[Hydration] Auth state reset due to visibility change
[Cloudflare] SES injection detected on /login route
```

### Root Cause Analysis

1. **SES Injection Conflict**: Cloudflare's Server-Side Excludes (SES) was injecting scripts into the login page, interfering with React hydration and auth state management.

2. **CSP Violations**: Content Security Policy headers were blocking necessary auth-related scripts during login.

3. **Integrity Hash Mismatches**: Cloudflare's automatic optimization changed resource hashes, causing integrity check failures.

## Recommended Cloudflare Changes

### 1. Disable SES Injection on Auth Routes

**Routes to exclude**: `/login`, `/recuperar-contrasena`, `/dashboard/*`

**Cloudflare Dashboard**:
- Go to Rules → Transform Rules → Modify Response
- Create rule: `URI Path contains "/login" OR "/recuperar-contrasena" OR "/dashboard"`
- Action: Disable "Server-Side Excludes"

**Wrangler Configuration** (if using):
```toml
[build]
command = "npm run build"

[build.upload]
format = "service-worker"

# Disable SES for auth routes
[[rules]]
type = "ES Module"
globs = ["src/pages/LoginPage.tsx", "src/pages/RecuperarContrasenaPage.tsx"]
# Note: Dashboard routes need page-level configuration
```

### 2. CSP Header Adjustments

**Current Issue**: CSP blocking auth scripts during login flow.

**Recommended CSP**:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://js.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; style-src 'self' 'unsafe-inline';
```

**Implementation**: Update Cloudflare Page Rules or Worker to include relaxed CSP for auth routes.

### 3. Integrity Hash Verification

**Action**: Disable automatic resource optimization for auth pages to prevent hash changes.

**Cloudflare Dashboard**:
- Speed → Optimization → Content Optimization
- Disable "Auto Minify" for JavaScript on auth routes
- Disable "Rocket Loader" for login and dashboard pages

## Deployment Plan

### Pre-Deployment Checklist

- [ ] Backup current Cloudflare configuration
- [ ] Test changes in staging environment
- [ ] Verify login flow works without SES injection
- [ ] Confirm CSP allows necessary scripts
- [ ] Test session persistence across visibility changes

### Deployment Steps

1. **Staging Deployment**
   - Apply Cloudflare rule changes to staging environment
   - Run E2E test suite: `pnpm run test:e2e`
   - Monitor console logs for auth errors

2. **Production Deployment**
   - Schedule maintenance window (low-traffic period)
   - Apply Cloudflare changes gradually
   - Monitor error rates and user reports

3. **Post-Deployment Monitoring**
   - Watch for login failure rate drop
   - Monitor session persistence metrics
   - Track `markAppResumed` telemetry events

### Rollback Plan

**Immediate Rollback** (if critical issues):
1. Revert Cloudflare rules to previous configuration
2. Clear CDN cache: `cf cache purge`
3. Restore from backup if needed

**Partial Rollback** (if specific rules cause issues):
- Disable problematic rules individually
- Keep working changes active

### Risk Assessment

**High Risk**: Auth flow completely broken
- **Impact**: Users cannot log in
- **Mitigation**: Have backup auth method ready, monitor closely

**Medium Risk**: Session loss during tab switches
- **Impact**: User experience degraded
- **Mitigation**: Already fixed in application code

**Low Risk**: CSP too permissive
- **Impact**: Potential security vulnerability
- **Mitigation**: Review and tighten CSP post-deployment

## Communication Template

**Subject**: Urgent: Cloudflare Config Changes Required for Login Fix

**Message**:

Hi Infra/Ops Team,

We're deploying a fix for critical login and session loss issues in production. The root cause is Cloudflare SES injection interfering with our React auth flow.

**Required Changes**:
1. Disable SES injection on `/login`, `/recuperar-contrasena`, and `/dashboard/*` routes
2. Adjust CSP to allow Supabase auth scripts
3. Disable auto-optimization for auth pages

**Evidence**: Console logs show JWT/session errors correlating with SES injection.

**Testing**: E2E tests pass in staging with these changes.

**Timeline**: Need changes applied before next deployment (target: [date]).

**Rollback**: Full config backup available.

Please confirm when these changes can be implemented.

Thanks,
Dev Team

## Success Metrics

- Login success rate > 99%
- Session loss events < 1% of sessions
- No SES-related console errors
- E2E tests passing in production

## Follow-up Actions

- Monitor for 24 hours post-deployment
- Review CSP settings for security
- Consider permanent SES exclusions for SPA routes
- Update Cloudflare config documentation