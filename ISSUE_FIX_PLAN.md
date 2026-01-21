# PRODUCTIFY PRO - 96 ISSUES FIX PLAN

## Overview
- **Total Issues:** 96
- **Total Phases:** 12
- **Estimated Duration:** 8-10 weeks
- **Approach:** Fix → Test with Playwright → Manual Verification → Next Phase

---

# PHASE 1: Critical Authentication & Error Handling
**Priority:** P0 (Blocker)
**Estimated Time:** 2-3 days
**Issues Fixed:** 8

## Tasks

### 1.1 Fix Error Display `[object Object]` Bug
- **File:** `apps/desktop/src/lib/api/client.ts`
- **File:** `apps/desktop/src/pages/auth/Login.tsx`
- **File:** `apps/desktop/src/pages/auth/Register.tsx`
- **Issue:** API errors not properly stringified
- **Fix:** Add proper error extraction from Axios responses

### 1.2 Fix Registration 422 Error
- **File:** `apps/backend/app/api/routes/auth.py`
- **Issue:** Email validation too strict
- **Fix:** Update email validation regex/logic

### 1.3 Fix "Session Expired" Wrong Message
- **File:** `apps/desktop/src/pages/auth/Login.tsx`
- **Issue:** Shows "Session expired" instead of "Invalid credentials"
- **Fix:** Proper error message mapping from 401 responses

### 1.4 Fix Login Flow Error Handling
- **File:** `apps/desktop/src/stores/authStore.ts`
- **Issue:** Error states not properly cleared
- **Fix:** Reset error state on new attempts

### 1.5 Add Proper Error Types
- **File:** `apps/desktop/src/lib/api/client.ts`
- **Issue:** No typed error responses
- **Fix:** Create ApiError type and handler

### 1.6 Fix Empty Catch Blocks (Critical Paths)
- **Files:** Auth-related components
- **Issue:** Silent failures
- **Fix:** Add proper error logging/handling

### 1.7 Replace console.log with Proper Logging (Auth)
- **File:** `apps/desktop/src/stores/authStore.ts`
- **Issue:** Debug logs in production
- **Fix:** Remove or wrap in DEBUG check

### 1.8 Add User-Friendly Error Messages
- **File:** `apps/desktop/src/lib/api/client.ts`
- **Issue:** Technical errors shown to users
- **Fix:** Error message mapping

## Testing
- [ ] Playwright: Test registration with valid email
- [ ] Playwright: Test registration with invalid email
- [ ] Playwright: Test login with valid credentials
- [ ] Playwright: Test login with invalid credentials
- [ ] Playwright: Test error message display
- [ ] Manual: Verify error messages are readable

---

# PHASE 2: Security - Rate Limiting & CSRF
**Priority:** P0 (Blocker)
**Estimated Time:** 2 days
**Issues Fixed:** 6

## Tasks

### 2.1 Add Rate Limiting Middleware
- **File:** `apps/backend/app/main.py`
- **File:** `apps/backend/app/core/rate_limiter.py` (new)
- **Issue:** No rate limiting on auth endpoints
- **Fix:** Add slowapi or custom rate limiter

### 2.2 Configure Rate Limits per Endpoint
- **Endpoints:** `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`
- **Limits:** 5 attempts per minute for auth, 100 requests per minute for API

### 2.3 Add CSRF Protection
- **File:** `apps/backend/app/main.py`
- **File:** `apps/backend/app/core/security.py`
- **Issue:** No CSRF tokens
- **Fix:** Add CSRF middleware for state-changing operations

### 2.4 Add CSRF Token to Frontend
- **File:** `apps/desktop/src/lib/api/client.ts`
- **Issue:** Frontend doesn't send CSRF tokens
- **Fix:** Include CSRF token in headers

### 2.5 Add Brute Force Protection
- **File:** `apps/backend/app/api/routes/auth.py`
- **Issue:** No account lockout
- **Fix:** Lock account after 5 failed attempts

### 2.6 Add Security Headers
- **File:** `apps/backend/app/main.py`
- **Issue:** Missing security headers
- **Fix:** Add X-Content-Type-Options, X-Frame-Options, etc.

## Testing
- [ ] Playwright: Test rate limiting triggers after threshold
- [ ] Playwright: Test CSRF token flow
- [ ] Manual: Verify rate limit headers in response
- [ ] Manual: Test account lockout after failed attempts

---

# PHASE 3: Security - OAuth & Data Encryption
**Priority:** P0 (Blocker)
**Estimated Time:** 2 days
**Issues Fixed:** 6

## Tasks

### 3.1 Move OAuth State to Redis
- **File:** `apps/backend/app/api/routes/integrations.py`
- **File:** `apps/backend/app/core/redis.py` (new)
- **Issue:** OAuth state in memory dict
- **Fix:** Use Redis for OAuth state storage

### 3.2 Add Redis Connection
- **File:** `apps/backend/app/core/config.py`
- **File:** `apps/backend/requirements.txt`
- **Issue:** No Redis configured
- **Fix:** Add redis-py, configure connection

### 3.3 Encrypt Sensitive Settings
- **File:** `apps/backend/app/models/settings.py`
- **File:** `apps/backend/app/core/encryption.py` (new)
- **Issue:** API keys stored plaintext
- **Fix:** Add Fernet encryption for sensitive fields

### 3.4 Add Encryption Key Management
- **File:** `apps/backend/app/core/config.py`
- **Issue:** No encryption key
- **Fix:** Add ENCRYPTION_KEY to config

### 3.5 Fix Path Traversal in Screenshots
- **File:** `apps/backend/app/api/routes/screenshots.py`
- **Issue:** Filename not validated
- **Fix:** Sanitize filename, validate path

### 3.6 Improve API Key Validation
- **File:** `apps/backend/app/api/routes/settings.py`
- **Issue:** Only checks "sk-" prefix
- **Fix:** Validate key format and test with OpenAI

## Testing
- [ ] Playwright: Test OAuth flow (Google)
- [ ] Manual: Verify Redis stores OAuth state
- [ ] Manual: Verify encrypted values in database
- [ ] Playwright: Test screenshot access with malicious paths
- [ ] Manual: Test API key validation

---

# PHASE 4: Complete TODO Items
**Priority:** P0 (Blocker)
**Estimated Time:** 3 days
**Issues Fixed:** 7

## Tasks

### 4.1 Fix User ID from Auth (main.py:285)
- **File:** `apps/backend/app/main.py:285`
- **Issue:** `user_id = data.get("user_id", 1)  # TODO: Get from auth`
- **Fix:** Get user_id from WebSocket authentication

### 4.2 Calculate Hours Change (ai_insights.py:407)
- **File:** `apps/backend/app/api/routes/ai_insights.py:407`
- **Issue:** `"hours_change": 0,  # TODO: Compare with previous week`
- **Fix:** Query previous week data and calculate difference

### 4.3 Calculate Team Trends (reports.py:624-625)
- **File:** `apps/backend/app/api/routes/reports.py:624-625`
- **Issue:** Team trends hardcoded to 0
- **Fix:** Implement actual trend calculation

### 4.4 Implement Screenshot Stats (admin.py:381)
- **File:** `apps/backend/app/api/routes/admin.py:381`
- **Issue:** `total_screenshots = 0  # TODO`
- **Fix:** Query Screenshot model for count

### 4.5 Add Calendar Sync for Focus Blocks (focus_service.py:322)
- **File:** `apps/backend/app/services/focus_service.py:322`
- **Issue:** Focus blocks don't sync to calendar
- **Fix:** Create calendar event when sync enabled

### 4.6 Implement Profile Edit (Settings.tsx:326)
- **File:** `apps/desktop/src/pages/Settings.tsx:326`
- **Issue:** Button does nothing
- **Fix:** Add profile edit modal or navigation

### 4.7 Fix Meeting Analysis Navigation (MeetingIntelligence.tsx:549)
- **File:** `apps/desktop/src/components/meetings/MeetingIntelligence.tsx:549`
- **Issue:** Analyze tab navigation broken
- **Fix:** Implement proper tab switching

## Testing
- [ ] Playwright: Test AI insights shows hours change
- [ ] Playwright: Test team reports show trends
- [ ] Playwright: Test admin dashboard shows screenshot count
- [ ] Playwright: Test profile edit works
- [ ] Manual: Verify focus blocks create calendar events
- [ ] Manual: Verify meeting analysis navigation

---

# PHASE 5: Logging & Monitoring
**Priority:** P0 (Blocker)
**Estimated Time:** 2 days
**Issues Fixed:** 8

## Tasks

### 5.1 Replace print() with Logging (Backend)
- **Files:**
  - `apps/backend/app/services/secure_storage.py:18,27,37`
  - `apps/backend/app/services/screenshot_service.py:81,96,142,144,148,231,234`
- **Issue:** print() statements instead of logging
- **Fix:** Use Python logging module

### 5.2 Configure Logging Framework
- **File:** `apps/backend/app/core/logging.py` (new)
- **Issue:** No centralized logging config
- **Fix:** Setup structured logging with levels

### 5.3 Remove console.log from Production (Frontend)
- **Files:**
  - `apps/desktop/src/lib/tauri.ts:327,379,434,464,518`
  - `apps/desktop/src/hooks/useRealTimeActivity.ts:184`
- **Issue:** Debug logs in production
- **Fix:** Remove or wrap in import.meta.env.DEV

### 5.4 Add Error Tracking (Sentry Complete)
- **File:** `apps/backend/app/main.py`
- **File:** `apps/desktop/src/main.tsx`
- **Issue:** Sentry partially configured
- **Fix:** Complete Sentry setup with proper DSN

### 5.5 Add Request Logging Middleware
- **File:** `apps/backend/app/main.py`
- **Issue:** No request/response logging
- **Fix:** Add middleware for request logging

### 5.6 Fix Empty Catch Blocks (Backend)
- **Files:** Multiple pass statements
- **Issue:** Silent failures
- **Fix:** Add logging to exception handlers

### 5.7 Fix Empty Catch Blocks (Frontend)
- **Files:** 17 files with empty catches
- **Issue:** Silent failures
- **Fix:** Add error logging

### 5.8 Add Health Check Logging
- **File:** `apps/backend/app/api/routes/system.py`
- **Issue:** Health checks not logged
- **Fix:** Add logging for monitoring

## Testing
- [ ] Manual: Check backend logs appear correctly
- [ ] Manual: Check Sentry receives errors
- [ ] Playwright: Trigger error and verify logging
- [ ] Manual: Verify no console.log in browser console

---

# PHASE 6: Database Optimization
**Priority:** P1
**Estimated Time:** 4-5 days
**Issues Fixed:** 8

## Tasks

### 6.1 Fix N+1 Queries in Teams
- **File:** `apps/backend/app/api/routes/teams.py`
- **Issue:** 144 separate queries
- **Fix:** Use SQLAlchemy eager loading (selectinload, joinedload)

### 6.2 Fix N+1 Queries in Activities
- **File:** `apps/backend/app/api/routes/activities.py`
- **Issue:** Multiple queries per activity
- **Fix:** Batch queries with eager loading

### 6.3 Add Redis Caching Layer
- **File:** `apps/backend/app/core/cache.py` (new)
- **Issue:** No caching
- **Fix:** Add Redis cache for frequent queries

### 6.4 Cache Analytics Queries
- **File:** `apps/backend/app/api/routes/analytics.py`
- **Issue:** Heavy queries on every request
- **Fix:** Cache results with TTL

### 6.5 Cache Team Data
- **File:** `apps/backend/app/api/routes/teams.py`
- **Issue:** Team data queried repeatedly
- **Fix:** Cache team membership

### 6.6 Add Database Indexes
- **File:** `apps/backend/migrations/` (new migration)
- **Issue:** Missing indexes on frequently queried columns
- **Fix:** Add indexes for user_id, team_id, created_at

### 6.7 Optimize Activity Queries
- **File:** `apps/backend/app/api/routes/activities.py`
- **Issue:** Full table scans
- **Fix:** Add proper WHERE clauses and limits

### 6.8 Add Query Performance Logging
- **File:** `apps/backend/app/core/database.py`
- **Issue:** No visibility into slow queries
- **Fix:** Log queries taking > 100ms

## Testing
- [ ] Manual: Check query count reduced (SQLAlchemy echo)
- [ ] Manual: Verify Redis cache working
- [ ] Playwright: Test page load times improved
- [ ] Manual: Check slow query logs

---

# PHASE 7: Focus Mode Implementation
**Priority:** P1
**Estimated Time:** 4-5 days
**Issues Fixed:** 6

## Tasks

### 7.1 Implement App Blocking (Tauri)
- **File:** `apps/desktop/src-tauri/src/commands.rs`
- **File:** `apps/desktop/src-tauri/src/focus.rs` (new)
- **Issue:** Focus mode UI only
- **Fix:** Implement actual app blocking via system APIs

### 7.2 Implement Website Blocking
- **File:** `apps/desktop/src-tauri/src/focus.rs`
- **Issue:** No website blocking
- **Fix:** Modify hosts file or use proxy

### 7.3 Connect Frontend to Blocking
- **File:** `apps/desktop/src/pages/Focus.tsx`
- **File:** `apps/desktop/src/lib/tauri.ts`
- **Issue:** UI doesn't trigger blocking
- **Fix:** Call Tauri commands on focus start

### 7.4 Add Blocking Mode Enforcement
- **File:** `apps/backend/app/services/focus_service.py`
- **Issue:** Soft/hard/strict modes not enforced
- **Fix:** Implement mode-specific blocking rules

### 7.5 Add Break Reminder Notifications
- **File:** `apps/desktop/src-tauri/src/notifications.rs`
- **Issue:** Break reminders not shown
- **Fix:** System notifications for breaks

### 7.6 Add Focus Session Persistence
- **File:** `apps/backend/app/api/routes/focus.py`
- **Issue:** Session lost on app restart
- **Fix:** Persist active session to database

## Testing
- [ ] Manual: Test app blocking works
- [ ] Manual: Test website blocking works
- [ ] Playwright: Test focus session start/stop
- [ ] Manual: Test break notifications appear
- [ ] Manual: Test session survives app restart

---

# PHASE 8: Notification System
**Priority:** P1
**Estimated Time:** 3-4 days
**Issues Fixed:** 6

## Tasks

### 8.1 Add Email Notification Delivery
- **File:** `apps/backend/app/services/email_service.py`
- **File:** `apps/backend/app/services/notification_service.py`
- **Issue:** Notifications created but not delivered
- **Fix:** Send emails for important notifications

### 8.2 Add Push Notification Support
- **File:** `apps/desktop/src-tauri/src/notifications.rs`
- **Issue:** No desktop push notifications
- **Fix:** Use Tauri notification plugin

### 8.3 Add Notification Preferences
- **File:** `apps/backend/app/api/routes/notifications.py`
- **Issue:** Can't control which notifications to receive
- **Fix:** Add granular notification settings

### 8.4 Add Email Templates
- **File:** `apps/backend/app/templates/` (new)
- **Issue:** Plain text emails
- **Fix:** HTML email templates

### 8.5 Add Notification Queue
- **File:** `apps/backend/app/services/notification_service.py`
- **Issue:** Notifications sent synchronously
- **Fix:** Queue for background processing

### 8.6 Add Notification History
- **File:** `apps/desktop/src/pages/Notifications.tsx` (new)
- **Issue:** No way to view past notifications
- **Fix:** Notification history page

## Testing
- [ ] Manual: Test email notification received
- [ ] Manual: Test desktop notification appears
- [ ] Playwright: Test notification preferences save
- [ ] Playwright: Test notification history loads
- [ ] Manual: Check email template renders correctly

---

# PHASE 9: Feature Completion (Data & Settings)
**Priority:** P2
**Estimated Time:** 3-4 days
**Issues Fixed:** 8

## Tasks

### 9.1 Implement Data Export
- **File:** `apps/backend/app/api/routes/settings.py`
- **File:** `apps/desktop/src/pages/Settings.tsx`
- **Issue:** Export button does nothing
- **Fix:** Generate JSON/CSV export

### 9.2 Implement Data Import
- **File:** `apps/backend/app/api/routes/settings.py`
- **Issue:** Import not implemented
- **Fix:** Parse and import user data

### 9.3 Add Light Theme
- **File:** `apps/desktop/src/components/providers/ThemeProvider.tsx`
- **File:** `apps/desktop/src/styles/`
- **Issue:** Dark theme only
- **Fix:** Add light theme CSS variables

### 9.4 Implement App Lock PIN
- **File:** `apps/desktop/src-tauri/src/security.rs` (new)
- **Issue:** PIN is UI only
- **Fix:** Store encrypted PIN, verify on unlock

### 9.5 Add Profile Edit Modal
- **File:** `apps/desktop/src/components/settings/ProfileEditModal.tsx` (new)
- **Issue:** Can't edit profile from settings
- **Fix:** Modal for name, email, avatar

### 9.6 Fix Password Reset Flow
- **File:** `apps/backend/app/models/user.py`
- **File:** `apps/backend/app/api/routes/auth.py`
- **Issue:** Token in user table
- **Fix:** Separate password_reset_tokens table

### 9.7 Add API Versioning
- **File:** `apps/backend/app/main.py`
- **Issue:** No API versioning
- **Fix:** Add /api/v1/ prefix

### 9.8 Fix Inconsistent API Responses
- **Files:** Various routes
- **Issue:** Mixed response formats
- **Fix:** Standardize response structure

## Testing
- [ ] Playwright: Test data export downloads file
- [ ] Playwright: Test data import works
- [ ] Playwright: Test light theme toggle
- [ ] Playwright: Test PIN lock/unlock
- [ ] Playwright: Test profile edit saves
- [ ] Manual: Verify API versioning works

---

# PHASE 10: Integrations Completion
**Priority:** P2
**Estimated Time:** 5-6 days
**Issues Fixed:** 8

## Tasks

### 10.1 Implement GitLab Integration
- **File:** `apps/backend/app/api/routes/integrations.py`
- **File:** `apps/backend/app/services/gitlab_service.py` (new)
- **Issue:** Marked "coming_soon"
- **Fix:** OAuth flow, activity sync

### 10.2 Implement Linear Integration
- **File:** `apps/backend/app/api/routes/integrations.py`
- **File:** `apps/backend/app/services/linear_service.py` (new)
- **Issue:** Marked "coming_soon"
- **Fix:** OAuth flow, issue tracking

### 10.3 Implement Notion Integration
- **File:** `apps/backend/app/api/routes/integrations.py`
- **File:** `apps/backend/app/services/notion_service.py` (new)
- **Issue:** Marked "coming_soon"
- **Fix:** OAuth flow, page sync

### 10.4 Add Webhook Retry Logic
- **File:** `apps/backend/app/services/webhook_service.py` (new)
- **Issue:** Webhooks fail silently
- **Fix:** Retry with exponential backoff

### 10.5 Add Real-time Calendar Sync
- **File:** `apps/backend/app/services/calendar_service.py`
- **Issue:** Polling only
- **Fix:** Use Google Calendar push notifications

### 10.6 Improve Slack Integration
- **File:** `apps/backend/app/services/integrations_service.py`
- **Issue:** Basic status sync only
- **Fix:** Add rich presence, notifications

### 10.7 Add Integration Health Checks
- **File:** `apps/backend/app/api/routes/integrations.py`
- **Issue:** No way to check if integration working
- **Fix:** Health check endpoints per integration

### 10.8 Add Integration Logs
- **File:** `apps/desktop/src/pages/settings/Integrations.tsx`
- **Issue:** No visibility into sync status
- **Fix:** Show last sync time, errors

## Testing
- [ ] Manual: Test GitLab OAuth flow
- [ ] Manual: Test Linear OAuth flow
- [ ] Manual: Test Notion OAuth flow
- [ ] Playwright: Test webhook retry (mock failure)
- [ ] Manual: Test calendar real-time sync
- [ ] Playwright: Test integration health checks

---

# PHASE 11: Work Sessions & Billing
**Priority:** P2
**Estimated Time:** 4-5 days
**Issues Fixed:** 8

## Tasks

### 11.1 Add Invoice Generation
- **File:** `apps/backend/app/services/invoice_service.py` (new)
- **File:** `apps/backend/app/api/routes/work_sessions.py`
- **Issue:** No invoices
- **Fix:** Generate PDF invoices

### 11.2 Add Client Management
- **File:** `apps/backend/app/models/client.py` (new)
- **File:** `apps/backend/app/api/routes/clients.py` (new)
- **Issue:** Basic client tracking
- **Fix:** Full client CRUD, rates

### 11.3 Implement Session Modals
- **File:** `apps/desktop/src/components/work-sessions/StartSessionModal.tsx`
- **File:** `apps/desktop/src/components/work-sessions/EndSessionModal.tsx`
- **Issue:** Components referenced but missing
- **Fix:** Create modal components

### 11.4 Add Timesheet Export
- **File:** `apps/backend/app/api/routes/work_sessions.py`
- **Issue:** Export incomplete
- **Fix:** CSV/PDF timesheet export

### 11.5 Add Project Tracking
- **File:** `apps/backend/app/models/project.py` (new)
- **Issue:** No project association
- **Fix:** Link sessions to projects

### 11.6 Add Billing Reports
- **File:** `apps/desktop/src/pages/WorkSessions.tsx`
- **Issue:** No billing summary
- **Fix:** Add billing dashboard

### 11.7 Add Payment Tracking
- **File:** `apps/backend/app/models/payment.py` (new)
- **Issue:** No payment status
- **Fix:** Track invoice payments

### 11.8 Add Team Billing
- **File:** `apps/backend/app/api/routes/teams.py`
- **Issue:** No team billing features
- **Fix:** Team subscription management

## Testing
- [ ] Playwright: Test invoice generation
- [ ] Playwright: Test client CRUD
- [ ] Playwright: Test session start/end modals
- [ ] Playwright: Test timesheet export
- [ ] Manual: Verify PDF invoice renders correctly
- [ ] Playwright: Test billing reports load

---

# PHASE 12: Testing & Polish
**Priority:** P2
**Estimated Time:** 5-6 days
**Issues Fixed:** 13

## Tasks

### 12.1 Add Unit Tests (Backend Services)
- **Files:** `apps/backend/tests/test_*.py`
- **Issue:** 0% service coverage
- **Fix:** Tests for critical services

### 12.2 Add Unit Tests (Frontend Stores)
- **Files:** `apps/desktop/src/stores/*.test.ts`
- **Issue:** Minimal store tests
- **Fix:** Tests for Zustand stores

### 12.3 Add Integration Tests (API)
- **Files:** `apps/backend/tests/test_api_*.py`
- **Issue:** Only auth/billing tested
- **Fix:** Tests for all major endpoints

### 12.4 Add E2E Tests (Critical Flows)
- **Files:** `apps/desktop/e2e/*.spec.ts`
- **Issue:** No E2E tests
- **Fix:** Playwright tests for critical flows

### 12.5 Fix Rust Dead Code
- **Files:** `apps/desktop/src-tauri/src/`
- **Issue:** Unused variables/functions
- **Fix:** Remove or use dead code

### 12.6 Fix FastAPI Deprecations
- **Files:** `apps/backend/app/api/routes/activities.py`
- **Issue:** `regex` → `pattern` warnings
- **Fix:** Update to new syntax

### 12.7 Add TypeScript Strict Mode
- **File:** `apps/desktop/tsconfig.json`
- **Issue:** Allows implicit any
- **Fix:** Enable strict mode, fix errors

### 12.8 Add API Documentation
- **File:** `apps/backend/app/main.py`
- **Issue:** OpenAPI incomplete
- **Fix:** Add descriptions, examples

### 12.9 Add Error Boundary Coverage
- **File:** `apps/desktop/src/components/common/ErrorBoundary.tsx`
- **Issue:** Not all routes covered
- **Fix:** Wrap all major routes

### 12.10 Add Loading States
- **Files:** Various pages
- **Issue:** Some pages lack loading states
- **Fix:** Add skeletons/spinners

### 12.11 Add Empty States
- **Files:** Various pages
- **Issue:** Blank pages when no data
- **Fix:** Add empty state illustrations

### 12.12 Performance Audit
- **Issue:** No performance baseline
- **Fix:** Lighthouse audit, optimize

### 12.13 Accessibility Audit
- **Issue:** No a11y audit
- **Fix:** Run axe, fix issues

## Testing
- [ ] Run full test suite
- [ ] Playwright: E2E critical flows
- [ ] Manual: Check all pages have loading states
- [ ] Manual: Check all pages have empty states
- [ ] Manual: Run Lighthouse audit
- [ ] Manual: Run accessibility audit

---

# PHASE SUMMARY

| Phase | Name | Issues | Priority | Days |
|-------|------|--------|----------|------|
| 1 | Critical Auth & Errors | 8 | P0 | 2-3 |
| 2 | Security: Rate Limiting | 6 | P0 | 2 |
| 3 | Security: OAuth & Encryption | 6 | P0 | 2 |
| 4 | Complete TODO Items | 7 | P0 | 3 |
| 5 | Logging & Monitoring | 8 | P0 | 2 |
| 6 | Database Optimization | 8 | P1 | 4-5 |
| 7 | Focus Mode Implementation | 6 | P1 | 4-5 |
| 8 | Notification System | 6 | P1 | 3-4 |
| 9 | Data & Settings | 8 | P2 | 3-4 |
| 10 | Integrations | 8 | P2 | 5-6 |
| 11 | Work Sessions & Billing | 8 | P2 | 4-5 |
| 12 | Testing & Polish | 13 | P2 | 5-6 |
| **TOTAL** | | **96** | | **40-50 days** |

---

# HOW WE'LL WORK

## For Each Phase:
1. **I'll implement** all tasks in the phase
2. **I'll write Playwright tests** for automated verification
3. **I'll run tests** and show results
4. **You manually verify** anything that can't be automated
5. **You confirm** phase is complete
6. **We move to next phase**

## Ready to Start?
Say "Start Phase 1" to begin with Critical Authentication & Error Handling.
