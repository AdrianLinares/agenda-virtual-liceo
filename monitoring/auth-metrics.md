# Auth Metrics and Monitoring

This document defines the key metrics to monitor for authentication and session management in the Agenda Virtual Liceo application.

## Client-Side Telemetry

The application includes a basic telemetry hook that currently logs events to the console. This allows for initial monitoring while providing a clean interface for swapping to a production telemetry service.

### Current Implementation

Events are logged using a `telemetry` utility that outputs to `console.log` with structured data:

```javascript
// Example telemetry calls in auth-store.ts
telemetry('markAppResumed', { timestamp: Date.now(), userId: user?.id })
telemetry('authReady', { duration: performance.now() - startTime })
```

### Swapping to Production Telemetry

To integrate with a real monitoring service:

1. **Update the telemetry utility** in `src/lib/telemetry.ts`:
   ```typescript
   // Replace console.log with your telemetry service
   export const telemetry = (event: string, data: Record<string, any>) => {
     if (process.env.NODE_ENV === 'production') {
       // Send to monitoring service (e.g., Sentry, LogRocket, etc.)
       yourTelemetryService.captureEvent(event, data)
     } else {
       console.log(`[Telemetry] ${event}`, data)
     }
   }
   ```

2. **Environment Variables**: Add your telemetry service keys to environment variables.

3. **Error Boundaries**: Ensure unhandled auth errors are captured.

## Key Metrics to Monitor

### 1. markAppResumed Count

**Definition**: Number of times the app detects a resume from background/visibility change.

**Why Important**: Indicates session loss frequency due to tab switching or app backgrounding.

**Collection**: Client-side telemetry event `markAppResumed`

**Thresholds**:
- **Warning**: > 10% of page views
- **Critical**: > 25% of page views

**Query Example**:
```sql
SELECT COUNT(*) as resume_events
FROM telemetry_events
WHERE event_name = 'markAppResumed'
  AND timestamp > NOW() - INTERVAL '1 hour'
```

### 2. authReady Timing Distribution

**Definition**: Time from app start to authentication state being ready.

**Why Important**: Measures auth initialization performance and identifies hydration delays.

**Collection**: Client-side timing from auth store initialization

**Thresholds**:
- **P95**: < 2000ms
- **P99**: < 5000ms

**Buckets**:
- 0-500ms: Fast
- 500-2000ms: Acceptable
- 2000-5000ms: Slow
- >5000ms: Critical

### 3. Redirects-to-Login Rate

**Definition**: Percentage of navigation attempts that result in redirect to login.

**Why Important**: Indicates authentication failures or session expiration rates.

**Collection**: Server-side logs or client-side navigation events

**Thresholds**:
- **Warning**: > 5% of navigations
- **Critical**: > 15% of navigations

**Calculation**:
```
redirects_to_login / total_navigation_events * 100
```

### 4. Login Success Rate

**Definition**: Percentage of login attempts that succeed.

**Why Important**: Core authentication reliability metric.

**Collection**: Auth store login attempts vs successes

**Thresholds**:
- **Warning**: < 95%
- **Critical**: < 90%

### 5. Session Loss Events

**Definition**: Instances where authenticated users lose their session unexpectedly.

**Why Important**: Measures session persistence issues.

**Collection**: Client-side events when auth state resets unexpectedly

**Thresholds**:
- **Warning**: > 1 per 1000 sessions
- **Critical**: > 5 per 1000 sessions

## Alert Configuration

### Recommended Alerts

1. **High Session Loss Rate**
   - Condition: `markAppResumed` events > 20% of page views in 5min window
   - Severity: Warning
   - Action: Check Cloudflare SES injection, review hydration logic

2. **Slow Auth Initialization**
   - Condition: P95 authReady > 3000ms for 10min
   - Severity: Warning
   - Action: Investigate network issues, Supabase latency

3. **Login Failure Spike**
   - Condition: Login success rate < 90% in 5min
   - Severity: Critical
   - Action: Check Supabase status, review auth configuration

4. **High Redirect Rate**
   - Condition: Redirects-to-login > 10% in 5min
   - Severity: Warning
   - Action: Monitor for DDoS or auth service issues

## Dashboard Setup

### Grafana Dashboard Panels

1. **Time Series**: authReady timing percentiles
2. **Gauge**: Login success rate
3. **Bar Chart**: Top error types from auth failures
4. **Heatmap**: Session loss events by time of day

### Log Queries

```sql
-- Auth errors by type
SELECT error_type, COUNT(*) as count
FROM auth_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY error_type
ORDER BY count DESC

-- Session duration distribution
SELECT
  FLOOR(EXTRACT(EPOCH FROM (logout_time - login_time))/60) as minutes,
  COUNT(*) as sessions
FROM user_sessions
WHERE logout_time IS NOT NULL
  AND login_time > NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1
```

## Implementation Notes

- All metrics should be collected with user IDs (anonymized/hashed) for cohort analysis
- Include device/browser info for debugging platform-specific issues
- Consider geographic distribution for CDN-related problems
- Set up anomaly detection for sudden metric changes

## Next Steps

1. Integrate with production monitoring service
2. Set up alerting rules in monitoring platform
3. Create dashboards for real-time visibility
4. Establish baseline metrics from initial deployment
5. Document incident response procedures for auth failures