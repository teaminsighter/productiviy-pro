# PRODUCTIFY PRO - API REFERENCE

**Base URL:** `http://localhost:8000/api` (development) or `https://api.yourdomain.com/api` (production)

**Authentication:** Bearer JWT Token in `Authorization` header

---

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "free",
    "is_trial_active": true
  }
}
```

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

### POST /auth/google
Login/register with Google OAuth.

**Request Body:**
```json
{
  "token": "google-id-token"
}
```

### GET /auth/me
Get current authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "plan": "free",
  "has_premium_access": true,
  "is_trial_active": true,
  "days_left_trial": 5
}
```

### PATCH /auth/me
Update user profile.

**Request Body:**
```json
{
  "name": "New Name",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

### DELETE /auth/me
Delete user account (GDPR).

**Request Body:**
```json
{
  "confirm": true,
  "password": "SecurePassword123!"
}
```

### GET /auth/me/export
Export all user data (GDPR).

**Response:** JSON file with all user data.

### POST /auth/forgot-password
Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### POST /auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "reset-token",
  "new_password": "NewPassword123!"
}
```

### POST /auth/change-password
Change password (authenticated).

**Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword123!"
}
```

---

## Activity Endpoints

### GET /activities/current
Get current activity being tracked.

**Response (200):**
```json
{
  "app_name": "VS Code",
  "window_title": "main.py - project",
  "category": "development",
  "is_productive": true,
  "start_time": "2024-01-15T09:30:00Z",
  "duration": 1800
}
```

### GET /activities/stream
Stream activities (Server-Sent Events).

### GET /activities
Get activity history.

**Query Parameters:**
- `period`: today|week|month|all|custom
- `start_date`: ISO date (for custom)
- `end_date`: ISO date (for custom)
- `limit`: number (default 100)
- `offset`: number (default 0)

**Response (200):**
```json
{
  "activities": [
    {
      "id": "uuid",
      "app_name": "VS Code",
      "window_title": "main.py",
      "category": "development",
      "is_productive": true,
      "start_time": "2024-01-15T09:30:00Z",
      "end_time": "2024-01-15T10:30:00Z",
      "duration": 3600
    }
  ],
  "total": 150,
  "page": 1
}
```

### WebSocket /ws/activities
Real-time activity updates.

**Message Format:**
```json
{
  "type": "activity_update",
  "data": {
    "app_name": "VS Code",
    "window_title": "main.py",
    "is_productive": true
  }
}
```

---

## Analytics Endpoints

### GET /analytics/summary
Get productivity summary.

**Query Parameters:**
- `period`: today|week|month

**Response (200):**
```json
{
  "total_time": 28800,
  "productive_time": 21600,
  "distracted_time": 3600,
  "neutral_time": 3600,
  "productivity_percentage": 75.0,
  "top_apps": [
    {"app": "VS Code", "duration": 14400, "is_productive": true}
  ],
  "categories": {
    "development": 14400,
    "communication": 7200,
    "entertainment": 3600
  }
}
```

### GET /analytics/trends
Get productivity trends over time.

**Query Parameters:**
- `days`: number (default 7)

---

## Settings Endpoints

### GET /settings
Get all user settings.

**Response (200):**
```json
{
  "general": {
    "theme": "dark",
    "language": "en",
    "startOnBoot": true
  },
  "tracking": {
    "trackingEnabled": true,
    "idleTimeout": 300
  },
  "screenshots": {
    "screenshotsEnabled": true,
    "screenshotInterval": 300,
    "blurScreenshots": false
  },
  "privacy": {
    "incognitoMode": false,
    "dataRetentionDays": 90
  },
  "notifications": {
    "notificationsEnabled": true,
    "breakReminders": true
  }
}
```

### PATCH /settings/general
Update general settings.

### PATCH /settings/tracking
Update tracking settings.

### PATCH /settings/screenshots
Update screenshot settings.

### PATCH /settings/privacy
Update privacy settings.

### PATCH /settings/notifications
Update notification settings.

### GET /settings/data-retention
Get data retention settings.

### PUT /settings/data-retention
Update data retention period.

**Request Body:**
```json
{
  "retention_days": 30
}
```

### GET /settings/data-stats
Get storage usage statistics.

### POST /settings/cleanup-old-data
Clean up old data.

**Query Parameters:**
- `confirm`: boolean (required for actual deletion)

---

## Screenshots Endpoints

### GET /screenshots
Get screenshot list.

**Query Parameters:**
- `date`: ISO date
- `limit`: number
- `offset`: number

### GET /screenshots/{id}
Get specific screenshot.

### POST /screenshots
Upload a screenshot.

**Form Data:**
- `file`: image file
- `app_name`: string
- `window_title`: string

### DELETE /screenshots/{id}
Delete a screenshot.

---

## Focus Endpoints

### GET /focus/sessions
Get focus session history.

### POST /focus/sessions
Start a new focus session.

**Request Body:**
```json
{
  "duration_minutes": 50,
  "title": "Deep work session",
  "blocked_apps": ["Twitter", "YouTube"],
  "blocked_websites": ["twitter.com", "youtube.com"]
}
```

### PATCH /focus/sessions/{id}
Update focus session (pause/resume/end).

**Request Body:**
```json
{
  "status": "completed"
}
```

### GET /focus/blocks
Get scheduled focus blocks.

### POST /focus/blocks
Schedule a focus block.

---

## Reports Endpoints

### GET /reports/preview
Get report preview data.

**Query Parameters:**
- `period`: daily|weekly|monthly

### POST /reports/generate
Generate PDF report.

**Request Body:**
```json
{
  "period": "weekly",
  "include_screenshots": false
}
```

**Response:** PDF file

### POST /reports/email
Send report via email.

**Request Body:**
```json
{
  "period": "weekly",
  "email": "user@example.com"
}
```

---

## Goals Endpoints

### GET /goals
Get all goals.

### POST /goals
Create a new goal.

**Request Body:**
```json
{
  "name": "6 hours productive daily",
  "target_hours": 6,
  "type": "daily_productive"
}
```

### PATCH /goals/{id}
Update a goal.

### DELETE /goals/{id}
Delete a goal.

### GET /goals/progress
Get goal progress.

---

## Team Endpoints

### GET /teams
Get user's teams.

### POST /teams
Create a new team.

**Request Body:**
```json
{
  "name": "Engineering Team",
  "description": "Backend development team"
}
```

### GET /teams/{id}
Get team details.

### GET /teams/{id}/members
Get team members.

### POST /teams/{id}/invite
Invite a member.

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "member"
}
```

### DELETE /teams/{id}/members/{user_id}
Remove a team member.

### GET /teams/{id}/analytics
Get team analytics.

### GET /teams/{id}/deepwork
Get team deep work metrics.

---

## Billing Endpoints

### POST /billing/checkout
Create Stripe checkout session.

**Request Body:**
```json
{
  "plan": "pro",
  "success_url": "https://app.example.com/success",
  "cancel_url": "https://app.example.com/cancel"
}
```

**Response (200):**
```json
{
  "checkout_url": "https://checkout.stripe.com/..."
}
```

### POST /billing/portal
Create Stripe customer portal session.

### GET /billing/subscription
Get subscription status.

### POST /billing/cancel
Cancel subscription.

### POST /billing/reactivate
Reactivate cancelled subscription.

### GET /billing/license
Validate license.

### POST /billing/activate-device
Activate device for license.

### POST /billing/deactivate-device
Deactivate device.

---

## AI Insights Endpoints

### GET /ai/insights/daily
Get AI-generated daily insights.

### GET /ai/insights/weekly
Get AI-generated weekly insights.

### POST /ai/classify
Classify an activity.

**Request Body:**
```json
{
  "app_name": "Unknown App",
  "window_title": "Document.pdf"
}
```

---

## Admin Endpoints (Admin Only)

### GET /admin/users
Get all users (paginated).

### GET /admin/users/{id}
Get user details.

### PATCH /admin/users/{id}
Update user (admin actions).

### GET /admin/stats
Get system statistics.

### GET /admin/health
Get detailed system health.

---

## Health Endpoints

### GET /health
Basic health check.

**Response (200):**
```json
{
  "status": "healthy"
}
```

### GET /health/detailed
Detailed health check.

**Response (200):**
```json
{
  "status": "healthy",
  "components": {
    "database": "healthy",
    "activitywatch": "healthy",
    "redis": "unavailable",
    "sentry": "healthy"
  }
}
```

### GET /health/ready
Kubernetes readiness probe.

### GET /health/live
Kubernetes liveness probe.

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message here",
  "error_code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 422 | Validation Error | Input validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Authentication | 5/minute |
| General API | 100/minute |
| Sensitive operations | 10/minute |
| Data export | 5/hour |
| Report generation | 10/hour |

---

*API documentation generated from route analysis.*
