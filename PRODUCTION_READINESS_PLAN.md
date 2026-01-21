# PRODUCTIFY PRO - PRODUCTION READINESS PLAN

## Current Status: 6.5/10 (Beta)
## Target Status: 9/10 (Production Ready)

---

# PHASE 1: CREDENTIAL FIXES (Day 1)
**Priority:** 🔴 CRITICAL
**Estimated Time:** 2-3 hours

## 1.1 OpenAI API Key (BROKEN)
**Current Issue:** API returning 401 - key is invalid/expired
**Action Required:**
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Update `.env` line 55:
```env
OPENAI_API_KEY=sk-proj-YOUR_NEW_VALID_KEY_HERE
```
4. Verify: `curl -s http://localhost:8000/api/ai/status`

## 1.2 JWT Secret Key (SECURITY RISK)
**Current Issue:** Using placeholder value - anyone can forge tokens
**Action Required:**
Generate a secure random key:
```bash
openssl rand -hex 64
```
Update `.env` line 40:
```env
JWT_SECRET_KEY=<paste_generated_key_here>
```

## 1.3 Stripe Configuration (NOT WORKING)
**Current Issue:** All values are `xxx` placeholders
**Action Required:**
1. Go to https://dashboard.stripe.com/test/apikeys
2. Get your test keys
3. Create products/prices at https://dashboard.stripe.com/test/products
4. Update `.env` lines 59-63:
```env
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_PRICE_PERSONAL=price_YOUR_PERSONAL_PRICE_ID
STRIPE_PRICE_PRO=price_YOUR_PRO_PRICE_ID
STRIPE_PRICE_TEAM=price_YOUR_TEAM_PRICE_ID
```

## 1.4 Sentry Error Tracking (EMPTY)
**Current Issue:** No error tracking in production
**Action Required:**
1. Go to https://sentry.io and create a project
2. Get your DSN
3. Update `.env` line 70:
```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

## 1.5 Redis (NOT RUNNING)
**Current Issue:** Redis URL configured but server not running
**Options:**
- **Option A:** Install locally: `brew install redis && brew services start redis`
- **Option B:** Use Upstash (free tier): https://upstash.com
- **Option C:** Disable Redis-dependent features temporarily

---

# PHASE 2: PERFORMANCE OPTIMIZATION (Days 2-3)
**Priority:** 🟡 HIGH
**Estimated Time:** 4-6 hours

## 2.1 Reduce JS Bundle Size (Currently 1.5MB → Target <500KB)

### Step 1: Analyze Bundle
```bash
cd apps/desktop
npm install -D rollup-plugin-visualizer
```

Add to `vite.config.ts`:
```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    // ... existing plugins
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          charts: ['recharts'],
          utils: ['date-fns', 'axios', 'zustand'],
        },
      },
    },
  },
});
```

### Step 2: Lazy Load Routes
Update `App.tsx`:
```typescript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const Team = lazy(() => import('./pages/Team'));
const Focus = lazy(() => import('./pages/Focus'));
const Screenshots = lazy(() => import('./pages/Screenshots'));

// Wrap routes with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    ...
  </Routes>
</Suspense>
```

### Step 3: Optimize Imports
Replace:
```typescript
import { format, parseISO, differenceInMinutes } from 'date-fns';
```
With tree-shakeable imports:
```typescript
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
```

## 2.2 Add Loading States
Create `src/components/common/LoadingSpinner.tsx`:
```typescript
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);
```

## 2.3 Optimize API Calls
- Add debouncing to search inputs
- Implement request caching with React Query
- Reduce polling intervals where possible

---

# PHASE 3: FIX BROKEN ENDPOINTS (Day 3)
**Priority:** 🟡 HIGH
**Estimated Time:** 3-4 hours

## 3.1 Focus Mode Endpoints (404)
**Files to check:**
- `apps/backend/app/api/routes/focus.py`
- `apps/backend/app/main.py` (router registration)

**Action:** Verify routes are registered in main.py:
```python
from app.api.routes import focus
app.include_router(focus.router, prefix="/api/focus", tags=["focus"])
```

## 3.2 Deep Work Endpoints (404)
**Files to check:**
- `apps/backend/app/api/routes/deepwork.py`
- `apps/backend/app/main.py`

## 3.3 Admin Endpoints (404)
**Files to check:**
- `apps/backend/app/api/routes/admin.py`
- Verify admin authentication middleware

---

# PHASE 4: SECURITY HARDENING (Day 4)
**Priority:** 🔴 CRITICAL
**Estimated Time:** 3-4 hours

## 4.1 Environment Variables
- [ ] Generate new JWT_SECRET_KEY (64+ characters)
- [ ] Remove sensitive data from .env.example
- [ ] Add `.env` to `.gitignore` (verify)
- [ ] Create `.env.production` template

## 4.2 API Security
- [ ] Verify rate limiting is working
- [ ] Check CORS configuration for production domains
- [ ] Audit all endpoints for authentication requirements
- [ ] Add request validation on all inputs

## 4.3 Data Security
- [ ] Encrypt sensitive user data at rest
- [ ] Implement proper session management
- [ ] Add audit logging for sensitive operations

---

# PHASE 5: TESTING & QA (Days 5-6)
**Priority:** 🟡 HIGH
**Estimated Time:** 6-8 hours

## 5.1 Fix E2E Tests
- Update test fixtures with valid test user
- Handle onboarding flow in tests
- Add tests for all critical paths

## 5.2 Add Unit Tests
- Backend service tests
- Frontend component tests
- API endpoint tests

## 5.3 Manual QA Checklist
- [ ] Registration flow
- [ ] Login flow
- [ ] Dashboard loads correctly
- [ ] Activity tracking works
- [ ] Analytics displays data
- [ ] Settings save properly
- [ ] AI insights generate (after fixing API key)
- [ ] Screenshots capture and display

---

# PHASE 6: PRODUCTION DEPLOYMENT PREP (Day 7)
**Priority:** 🟢 MEDIUM
**Estimated Time:** 4-5 hours

## 6.1 Build Optimization
```bash
# Production build
cd apps/desktop
npm run build
npm run tauri:build
```

## 6.2 Environment Configuration
Create `apps/backend/.env.production`:
```env
DEBUG=false
APP_ENV=production
USE_SQLITE=false
# ... production values
```

## 6.3 Database Migration
- Run Alembic migrations on production database
- Verify Supabase connection
- Backup strategy

## 6.4 Monitoring Setup
- Configure Sentry for error tracking
- Setup uptime monitoring
- Configure log aggregation

---

# CREDENTIAL STATUS SUMMARY

| Credential | Current Status | Action Required |
|------------|---------------|-----------------|
| OpenAI API Key | ❌ INVALID | Get new key from OpenAI |
| JWT Secret | ⚠️ PLACEHOLDER | Generate secure random key |
| Stripe Keys | ❌ PLACEHOLDER | Get from Stripe Dashboard |
| Sentry DSN | ❌ EMPTY | Create Sentry project |
| Redis | ⚠️ NOT RUNNING | Install/start Redis |
| Firebase | ✅ OK | Credentials file exists |
| Supabase | ✅ OK | Keys configured |
| Google OAuth | ✅ OK | Keys configured |
| Resend Email | ✅ OK | Key configured |

---

# QUICK START - IMMEDIATE FIXES

Run these commands to fix critical issues now:

```bash
# 1. Generate new JWT secret
echo "JWT_SECRET_KEY=$(openssl rand -hex 64)" >> /tmp/new_secrets.txt

# 2. Start Redis (if installed)
brew services start redis

# 3. Verify backend health
curl http://localhost:8000/health

# 4. Test AI after updating OpenAI key
curl http://localhost:8000/api/ai/status
```

---

# ESTIMATED TIMELINE

| Phase | Description | Time | Priority |
|-------|-------------|------|----------|
| 1 | Credential Fixes | 2-3 hrs | 🔴 Critical |
| 2 | Performance Optimization | 4-6 hrs | 🟡 High |
| 3 | Fix Broken Endpoints | 3-4 hrs | 🟡 High |
| 4 | Security Hardening | 3-4 hrs | 🔴 Critical |
| 5 | Testing & QA | 6-8 hrs | 🟡 High |
| 6 | Deployment Prep | 4-5 hrs | 🟢 Medium |
| **TOTAL** | | **22-30 hrs** | |

---

# SUCCESS CRITERIA

When complete, the app should:
- [ ] Load in under 3 seconds on average connection
- [ ] All API endpoints return valid responses
- [ ] AI insights generate successfully
- [ ] Payments can be processed (test mode)
- [ ] Error tracking captures issues
- [ ] All E2E tests pass
- [ ] Security audit passes
- [ ] Bundle size < 500KB (gzipped)

---

**Ready to start? Begin with Phase 1: Credential Fixes**
