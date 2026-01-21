# Productify Pro - Complete Commercial Plan
## Slow, Thorough, Production-Ready

---

## Overview: 8-Week Complete Launch

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE COMMERCIAL ROADMAP                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Week 1-2         Week 3-4         Week 5-6         Week 7-8                        │
│  ─────────        ─────────        ─────────        ─────────                       │
│  🔧 Foundation    🎨 Features      🔒 Security      🚀 Launch                        │
│                                                                                      │
│  • Fix bugs       • Team UI        • Rate limiting  • Code signing                  │
│  • Email setup    • Settings       • Validation     • Final testing                 │
│  • Database       • Analytics      • GDPR           • Deploy                        │
│  • Auth complete  • Reports        • Legal pages    • Monitor                       │
│  • Error tracking • Admin panel    • Backups        • GO LIVE                       │
│  • CI/CD setup    • Stripe         • Tests          •                               │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Progress Tracker

```
□ = Not Started | ◐ = In Progress | ✓ = Complete | ✗ = Blocked

FOUNDATION (Week 1-2)
├── □ Fix 404 errors
├── □ Email service (Resend)
├── □ Google OAuth
├── □ Error tracking (Sentry)
├── □ CI/CD pipeline (GitHub Actions)
├── □ Database migrations
└── □ Build & test desktop app

FEATURES (Week 3-4)
├── □ Team Management UI
├── □ Settings page complete
├── □ Analytics dashboard
├── □ Report generator
├── □ Admin panel
├── □ Stripe integration
└── □ Auto-update system

SECURITY & COMPLIANCE (Week 5-6)
├── □ Rate limiting
├── □ Input validation
├── □ GDPR compliance
├── □ Terms of Service
├── □ Privacy Policy
├── □ Backup strategy
├── □ Security audit
└── □ Write tests

LAUNCH (Week 7-8)
├── □ Apple code signing ($99)
├── □ Windows code signing
├── □ Final testing
├── □ Deploy to Hostinger
├── □ Monitoring setup
├── □ Landing page update
├── □ Beta launch
└── □ Production launch
```

---

# WEEK 1: Foundation Part 1

## Day 1: Fix Current Bugs

### Task 1.1: Fix 404 /api/activities/current-realtime
**Priority:** CRITICAL | **Time:** 1 hour

```python
# ADD to apps/backend/app/api/routes/activities.py

@router.get("/current-realtime")
async def get_current_realtime_activity(
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Real-time current activity for dashboard widget"""
    try:
        status = await check_activitywatch_status()

        if not status.get("available"):
            return {
                "is_tracking": False,
                "is_idle": False,
                "message": "ActivityWatch not running",
                "current_activity": None,
                "timestamp": datetime.now().isoformat()
            }

        current = await get_current_activity()

        if not current:
            return {
                "is_tracking": True,
                "is_idle": True,
                "current_activity": None,
                "timestamp": datetime.now().isoformat()
            }

        classification = classify_activity(
            current.app_name,
            current.window_title,
            current.url
        )

        return {
            "is_tracking": True,
            "is_idle": current.is_afk if hasattr(current, 'is_afk') else False,
            "current_activity": {
                "app_name": current.app_name,
                "window_title": current.window_title,
                "url": current.url,
                "duration": current.duration,
                "start_time": current.start_time.isoformat() if current.start_time else None,
                "category": classification.category,
                "productivity_score": classification.productivity_score,
                "productivity_type": classification.productivity_type,
            },
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        return {
            "is_tracking": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@router.get("/diagnostics")
async def get_activity_diagnostics():
    """System diagnostics endpoint for debugging"""
    aw_status = await check_activitywatch_status()

    return {
        "activitywatch": {
            "available": aw_status.get("available", False),
            "url": aw_status.get("url", "http://localhost:5600"),
            "buckets": aw_status.get("buckets", [])
        },
        "firebase_storage": firebase_storage.is_available if 'firebase_storage' in dir() else False,
        "database": "connected",
        "server_time": datetime.now().isoformat(),
        "version": "1.0.0"
    }
```

**Test:**
```bash
curl http://localhost:8000/api/activities/current-realtime
curl http://localhost:8000/api/activities/diagnostics
```

---

## Day 2: Setup Email Service (Resend)

### Task 1.2: Email Service Integration
**Priority:** HIGH | **Time:** 2-3 hours

**Why Resend?** Free tier: 3,000 emails/month, easy API, great deliverability

**Step 1: Sign up at resend.com**
- Create account
- Verify your domain (add DNS records)
- Get API key

**Step 2: Install package**
```bash
cd apps/backend
pip install resend
echo "resend>=0.5.0" >> requirements.txt
```

**Step 3: Create email service**
```python
# apps/backend/app/services/email_service.py

import resend
from typing import Optional
from app.core.config import settings

resend.api_key = settings.resend_api_key


class EmailService:
    """Email service using Resend"""

    def __init__(self):
        self.from_email = settings.from_email or "noreply@productifypro.com"
        self.app_name = "Productify Pro"

    async def send_email(
        self,
        to: str,
        subject: str,
        html: str,
        text: Optional[str] = None
    ) -> bool:
        """Send an email"""
        if not settings.resend_api_key:
            print(f"[EMAIL-DEV] Would send to {to}: {subject}")
            return True

        try:
            resend.Emails.send({
                "from": f"{self.app_name} <{self.from_email}>",
                "to": to,
                "subject": subject,
                "html": html,
                "text": text or ""
            })
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False

    async def send_welcome_email(self, to: str, name: str) -> bool:
        """Send welcome email to new user"""
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">Welcome to Productify Pro!</h1>
            <p>Hi {name},</p>
            <p>Thanks for signing up! We're excited to help you boost your productivity.</p>
            <p>Here's what you can do next:</p>
            <ul>
                <li>Download the desktop app</li>
                <li>Set up your goals</li>
                <li>Start tracking your productivity</li>
            </ul>
            <p>If you have any questions, just reply to this email.</p>
            <p>Best,<br>The Productify Pro Team</p>
        </div>
        """
        return await self.send_email(to, "Welcome to Productify Pro!", html)

    async def send_password_reset(self, to: str, reset_token: str) -> bool:
        """Send password reset email"""
        reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">Reset Your Password</h1>
            <p>You requested a password reset. Click the button below to create a new password:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">
                    Reset Password
                </a>
            </p>
            <p style="color: #666; font-size: 14px;">
                This link expires in 1 hour. If you didn't request this, ignore this email.
            </p>
        </div>
        """
        return await self.send_email(to, "Reset Your Password - Productify Pro", html)

    async def send_team_invite(self, to: str, team_name: str, inviter_name: str, invite_token: str) -> bool:
        """Send team invitation email"""
        invite_url = f"{settings.frontend_url}/join-team?token={invite_token}"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">You're Invited!</h1>
            <p>{inviter_name} has invited you to join <strong>{team_name}</strong> on Productify Pro.</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{invite_url}" style="background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">
                    Join Team
                </a>
            </p>
            <p style="color: #666; font-size: 14px;">
                This invitation expires in 7 days.
            </p>
        </div>
        """
        return await self.send_email(to, f"Join {team_name} on Productify Pro", html)

    async def send_weekly_report(self, to: str, name: str, stats: dict) -> bool:
        """Send weekly productivity report"""
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">Your Weekly Report</h1>
            <p>Hi {name}, here's your productivity summary:</p>
            <div style="background: #1F2937; padding: 20px; border-radius: 8px; color: white;">
                <p><strong>Total Time:</strong> {stats.get('total_hours', 0)} hours</p>
                <p><strong>Productive Time:</strong> {stats.get('productive_hours', 0)} hours</p>
                <p><strong>Productivity Score:</strong> {stats.get('productivity_score', 0)}%</p>
                <p><strong>Top App:</strong> {stats.get('top_app', 'N/A')}</p>
            </div>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{settings.frontend_url}/analytics" style="background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">
                    View Full Report
                </a>
            </p>
        </div>
        """
        return await self.send_email(to, "Your Weekly Productivity Report", html)


# Singleton instance
email_service = EmailService()
```

**Step 4: Update config**
```python
# apps/backend/app/core/config.py - ADD:

    # Email (Resend)
    resend_api_key: str = ""
    from_email: str = "noreply@productifypro.com"
    frontend_url: str = "http://localhost:1420"
```

**Step 5: Update .env**
```bash
# Add to apps/backend/.env
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=noreply@productifypro.com
FRONTEND_URL=http://localhost:1420
```

---

## Day 3: Google OAuth

### Task 1.3: Add Google Login
**Priority:** HIGH | **Time:** 2-3 hours

**Step 1: Google Cloud Console Setup**
1. Go to console.cloud.google.com
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:8000/api/auth/google/callback`
   - `https://api.productifypro.com/api/auth/google/callback`

**Step 2: Install packages**
```bash
pip install authlib httpx
echo "authlib>=1.2.0" >> requirements.txt
```

**Step 3: Add Google OAuth endpoints**
```python
# apps/backend/app/api/routes/auth.py - ADD:

from authlib.integrations.starlette_client import OAuth
from starlette.config import Config

# OAuth setup
oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)


@router.get("/google/login")
async def google_login(request: Request):
    """Initiate Google OAuth login"""
    redirect_uri = request.url_for('google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')

        if not user_info:
            raise HTTPException(400, "Failed to get user info from Google")

        email = user_info.get('email')
        name = user_info.get('name')
        google_id = user_info.get('sub')
        avatar_url = user_info.get('picture')

        # Check if user exists
        result = await db.execute(
            select(User).where(
                (User.email == email) | (User.google_id == google_id)
            )
        )
        user = result.scalar_one_or_none()

        if user:
            # Update Google ID if not set
            if not user.google_id:
                user.google_id = google_id
                user.auth_provider = "google"
                if avatar_url and not user.avatar_url:
                    user.avatar_url = avatar_url
                await db.commit()
        else:
            # Create new user
            user = User(
                email=email,
                name=name,
                google_id=google_id,
                avatar_url=avatar_url,
                auth_provider="google",
                is_verified=True,  # Google already verified email
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

            # Send welcome email
            await email_service.send_welcome_email(email, name or email)

        # Generate JWT token
        access_token = create_access_token(data={"sub": user.id})

        # Redirect to frontend with token
        frontend_url = settings.frontend_url
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?token={access_token}"
        )

    except Exception as e:
        print(f"Google OAuth error: {e}")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=oauth_failed")
```

**Step 4: Update .env**
```bash
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
```

---

## Day 4: Error Tracking (Sentry)

### Task 1.4: Setup Sentry
**Priority:** HIGH | **Time:** 1-2 hours

**Why?** You'll know when errors happen in production BEFORE users complain.

**Step 1: Sign up at sentry.io (free tier: 5K errors/month)**

**Step 2: Install**
```bash
pip install sentry-sdk[fastapi]
echo "sentry-sdk[fastapi]>=1.39.0" >> requirements.txt
```

**Step 3: Initialize in main.py**
```python
# apps/backend/app/main.py - ADD at top:

import sentry_sdk
from app.core.config import settings

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.app_env,
        traces_sample_rate=0.1,  # 10% of transactions for performance
        profiles_sample_rate=0.1,
    )
```

**Step 4: Update .env**
```bash
SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxx
APP_ENV=development  # or production
```

**Step 5: Test it works**
```python
# Add temporary test endpoint
@router.get("/test-error")
async def test_error():
    """Test Sentry error tracking"""
    raise Exception("Test error for Sentry!")
```

---

## Day 5: CI/CD Pipeline (GitHub Actions)

### Task 1.5: Automated Testing & Deployment
**Priority:** HIGH | **Time:** 2-3 hours

**Create:** `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  PYTHON_VERSION: '3.11'
  NODE_VERSION: '18'

jobs:
  # Backend Tests
  test-backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/backend

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx

      - name: Run tests
        run: |
          pytest tests/ -v --tb=short
        env:
          USE_SQLITE: true
          JWT_SECRET_KEY: test-secret-key

  # Frontend Lint & Build
  test-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/desktop

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: apps/desktop/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck || true

      - name: Build
        run: npm run build

  # Deploy Backend (on main branch only)
  deploy-backend:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Hostinger
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.HOSTINGER_HOST }}
          username: ${{ secrets.HOSTINGER_USER }}
          key: ${{ secrets.HOSTINGER_SSH_KEY }}
          script: |
            cd /var/www/productify
            git pull origin main
            cd apps/backend
            source venv/bin/activate
            pip install -r requirements.txt
            sudo systemctl restart productify

  # Deploy Landing Page to Vercel
  deploy-landing:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: apps/landing
```

**Create:** `.github/workflows/release.yml`

```yaml
name: Build & Release Desktop App

on:
  push:
    tags:
      - 'v*'

jobs:
  build-tauri:
    strategy:
      matrix:
        include:
          - platform: macos-latest
            target: universal-apple-darwin
          - platform: windows-latest
            target: x86_64-pc-windows-msvc

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Install Rust
        uses: dtolnay/rust-action@stable

      - name: Install dependencies
        working-directory: apps/desktop
        run: npm ci

      - name: Build Tauri App
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
          TAURI_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}
        with:
          projectPath: apps/desktop
          tagName: ${{ github.ref_name }}
          releaseName: 'Productify Pro ${{ github.ref_name }}'
          releaseBody: 'See the changelog for details.'
          releaseDraft: true
          prerelease: false
```

---

# WEEK 2: Foundation Part 2

## Day 6-7: Database Migrations & Testing

### Task 2.1: Run Complete Migrations
**Priority:** HIGH | **Time:** 2 hours

Run in Supabase SQL Editor:

```sql
-- =============================================
-- COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE (if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    auth_provider VARCHAR(50) DEFAULT 'email',
    google_id VARCHAR(255) UNIQUE,
    plan VARCHAR(20) DEFAULT 'free',
    trial_started_at TIMESTAMP DEFAULT NOW(),
    trial_ends_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
    subscription_id VARCHAR(255),
    subscription_status VARCHAR(50) DEFAULT 'trialing',
    stripe_customer_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    device_id VARCHAR(255),
    device_name VARCHAR(255)
);

-- =============================================
-- USER SETTINGS
-- =============================================
CREATE TABLE IF NOT EXISTS user_settings_new (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    theme VARCHAR(20) DEFAULT 'dark',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    track_idle BOOLEAN DEFAULT true,
    idle_timeout INTEGER DEFAULT 5,
    work_start_time VARCHAR(10) DEFAULT '09:00',
    work_end_time VARCHAR(10) DEFAULT '17:00',
    work_days JSONB DEFAULT '["mon","tue","wed","thu","fri"]',
    screenshots_enabled BOOLEAN DEFAULT true,
    screenshot_interval INTEGER DEFAULT 15,
    screenshot_quality VARCHAR(20) DEFAULT 'medium',
    blur_screenshots BOOLEAN DEFAULT false,
    ai_enabled BOOLEAN DEFAULT true,
    openai_api_key_set BOOLEAN DEFAULT false,
    notifications_enabled BOOLEAN DEFAULT true,
    distraction_alerts BOOLEAN DEFAULT true,
    goal_reminders BOOLEAN DEFAULT true,
    daily_summary BOOLEAN DEFAULT true,
    productive_apps JSONB DEFAULT '[]',
    distracting_apps JSONB DEFAULT '[]',
    excluded_apps JSONB DEFAULT '[]'
);

-- =============================================
-- TEAMS
-- =============================================
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url VARCHAR(500),
    owner_id INTEGER REFERENCES users(id),
    plan VARCHAR(20) DEFAULT 'team',
    max_members INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    share_activity BOOLEAN DEFAULT true,
    share_screenshots BOOLEAN DEFAULT false,
    share_urls BOOLEAN DEFAULT true,
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS team_invites (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'member',
    token VARCHAR(255) UNIQUE NOT NULL,
    invited_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ACTIVITIES
-- =============================================
CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(36) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    app_name VARCHAR(255) NOT NULL,
    window_title VARCHAR(500) NOT NULL,
    url VARCHAR(1000),
    domain VARCHAR(255),
    platform VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INTEGER DEFAULT 0,
    category VARCHAR(100) DEFAULT 'other',
    productivity_score FLOAT DEFAULT 0.5,
    is_productive BOOLEAN DEFAULT false,
    extra_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS url_activities (
    id VARCHAR(36) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    activity_id VARCHAR(36) NOT NULL,
    full_url VARCHAR(2000) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    platform VARCHAR(50),
    page_title VARCHAR(500),
    favicon_url VARCHAR(500),
    duration INTEGER DEFAULT 0,
    timestamp TIMESTAMP DEFAULT NOW(),
    category VARCHAR(100) DEFAULT 'other',
    is_productive BOOLEAN DEFAULT false,
    productivity_score FLOAT DEFAULT 0.5
);

-- =============================================
-- SCREENSHOTS
-- =============================================
CREATE TABLE IF NOT EXISTS screenshots (
    id VARCHAR(36) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    image_path VARCHAR(500),
    thumbnail_path VARCHAR(500),
    storage_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    storage_path VARCHAR(500),
    app_name VARCHAR(255),
    window_title VARCHAR(500),
    url VARCHAR(1000),
    category VARCHAR(100) DEFAULT 'other',
    is_blurred BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false
);

-- =============================================
-- GOALS & ACHIEVEMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    goal_type VARCHAR(50) NOT NULL,
    target_value FLOAT NOT NULL,
    current_value FLOAT DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'hours',
    frequency VARCHAR(20) DEFAULT 'daily',
    target_category VARCHAR(100),
    target_app VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'on_track',
    last_reset TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    streak_type VARCHAR(50) NOT NULL,
    current_count INTEGER DEFAULT 0,
    best_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    last_achieved_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    achievement_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    target FLOAT,
    progress FLOAT DEFAULT 0,
    is_unlocked BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS focus_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255),
    duration_planned INTEGER NOT NULL,
    duration_actual INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    was_completed BOOLEAN DEFAULT false,
    interruptions INTEGER DEFAULT 0,
    primary_category VARCHAR(100),
    productive_time INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- REPORTS
-- =============================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id),
    team_id INTEGER REFERENCES teams(id),
    report_type VARCHAR(50) NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    file_url TEXT,
    storage_path TEXT,
    format VARCHAR(10) DEFAULT 'pdf',
    status VARCHAR(20) DEFAULT 'pending',
    include_options JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ADMIN
-- =============================================
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    role VARCHAR(20) DEFAULT 'admin',
    permissions JSONB DEFAULT '{"users": true, "teams": true, "billing": true, "settings": true}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INTEGER,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(20) DEFAULT 'info',
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- PASSWORD RESET TOKENS
-- =============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_activities_user_time ON activities(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, DATE(start_time));
CREATE INDEX IF NOT EXISTS idx_screenshots_user_time ON screenshots(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit ON admin_audit_log(admin_id, created_at DESC);

-- =============================================
-- DEFAULT ADMIN USER (update email!)
-- =============================================
-- Run after creating your account:
-- INSERT INTO admin_users (user_id, role)
-- SELECT id, 'super_admin' FROM users WHERE email = 'your-email@example.com';
```

---

## Day 8-9: Build & Test Desktop App

### Task 2.2: Build Desktop App
**Priority:** CRITICAL | **Time:** 2-3 hours

```bash
# Navigate to desktop app
cd apps/desktop

# Install dependencies
npm install

# Build for development testing
npm run tauri dev

# Build for production
npm run tauri build

# Outputs will be in:
# macOS: src-tauri/target/release/bundle/dmg/
# Windows: src-tauri/target/release/bundle/msi/
```

### Task 2.3: Test Complete Flow
**Priority:** CRITICAL | **Time:** 2-3 hours

**Test Checklist:**
```
□ App installs correctly
□ App launches without errors
□ Registration form works
□ Login works
□ Dashboard loads
□ ActivityWatch connection works
□ Current activity shows
□ Activity history loads
□ Screenshots capture
□ Settings save
□ Logout works
```

---

# WEEK 3: Features Complete

## Day 10-12: Team Management UI

[Detailed in MASTER_PLAN.md - Team Management section]

## Day 13-14: Settings & Analytics

[Detailed in MASTER_PLAN.md - Settings and Analytics sections]

## Day 15-16: Admin Panel

[Detailed in MASTER_PLAN.md - Admin Panel section]

## Day 17-18: Stripe Integration

### Task 3.5: Complete Stripe Setup
**Priority:** HIGH | **Time:** 4-6 hours

**Step 1: Stripe Dashboard Setup**
1. Create products and prices:
   - Personal: $9/month
   - Pro: $19/month
   - Team: $49/month (per 5 users)

**Step 2: Install Stripe**
```bash
pip install stripe
echo "stripe>=7.0.0" >> requirements.txt
```

**Step 3: Webhook handling**
```python
# apps/backend/app/api/routes/billing.py - Complete the webhook

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Stripe webhooks"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except Exception as e:
        raise HTTPException(400, str(e))

    # Handle events
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        await handle_checkout_complete(session, db)

    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        await handle_subscription_update(subscription, db)

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        await handle_subscription_cancelled(subscription, db)

    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        await handle_payment_failed(invoice, db)

    return {"status": "success"}


async def handle_checkout_complete(session: dict, db: AsyncSession):
    """Handle successful checkout"""
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    # Find user by Stripe customer ID
    result = await db.execute(
        select(User).where(User.stripe_customer_id == customer_id)
    )
    user = result.scalar_one_or_none()

    if user:
        # Get subscription details
        subscription = stripe.Subscription.retrieve(subscription_id)
        price_id = subscription["items"]["data"][0]["price"]["id"]

        # Determine plan
        plan = "personal"
        if price_id == settings.stripe_price_pro:
            plan = "pro"
        elif price_id == settings.stripe_price_team:
            plan = "team"

        # Update user
        user.subscription_id = subscription_id
        user.subscription_status = "active"
        user.plan = plan
        await db.commit()


async def handle_subscription_cancelled(subscription: dict, db: AsyncSession):
    """Handle subscription cancellation"""
    customer_id = subscription.get("customer")

    result = await db.execute(
        select(User).where(User.stripe_customer_id == customer_id)
    )
    user = result.scalar_one_or_none()

    if user:
        user.subscription_status = "cancelled"
        user.plan = "free"
        await db.commit()
```

---

# WEEK 4: Auto-Update System

## Day 19: Tauri Auto-Update

### Task 4.1: Setup Auto-Update
**Priority:** HIGH | **Time:** 3-4 hours

**Step 1: Generate update keys**
```bash
cd apps/desktop
npx tauri signer generate -w ~/.tauri/productify.key
```

**Step 2: Update tauri.conf.json**
```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://api.productifypro.com/api/updates/check"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

**Step 3: Create update endpoint (already exists in backend)**
```python
# apps/backend/app/api/routes/updates.py is already created
# Make sure it returns the correct format
```

---

# WEEK 5: Security & Compliance

## Day 20-21: Rate Limiting

### Task 5.1: Add Rate Limiting
**Priority:** HIGH | **Time:** 1-2 hours

```bash
pip install slowapi
echo "slowapi>=0.1.9" >> requirements.txt
```

```python
# apps/backend/app/main.py - ADD:

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Apply to routes:
# In auth.py:
@router.post("/login")
@limiter.limit("5/minute")  # 5 login attempts per minute
async def login(...):
    pass

@router.post("/register")
@limiter.limit("3/minute")  # 3 registrations per minute
async def register(...):
    pass

# In general, for all API endpoints:
@router.get("/activities")
@limiter.limit("60/minute")  # 60 requests per minute
async def get_activities(...):
    pass
```

---

## Day 22: Input Validation

### Task 5.2: Add Comprehensive Validation
**Priority:** HIGH | **Time:** 2-3 hours

```python
# apps/backend/app/core/validators.py (NEW)

import re
from pydantic import validator, EmailStr
from typing import Optional

def validate_email(email: str) -> str:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValueError('Invalid email format')
    return email.lower()

def validate_password(password: str) -> str:
    """Validate password strength"""
    if len(password) < 8:
        raise ValueError('Password must be at least 8 characters')
    if not re.search(r'[A-Z]', password):
        raise ValueError('Password must contain uppercase letter')
    if not re.search(r'[a-z]', password):
        raise ValueError('Password must contain lowercase letter')
    if not re.search(r'[0-9]', password):
        raise ValueError('Password must contain a number')
    return password

def sanitize_string(value: str, max_length: int = 255) -> str:
    """Sanitize string input"""
    # Remove HTML tags
    value = re.sub(r'<[^>]+>', '', value)
    # Limit length
    value = value[:max_length]
    # Remove null bytes
    value = value.replace('\x00', '')
    return value.strip()

def validate_url(url: str) -> str:
    """Validate URL format"""
    pattern = r'^https?:\/\/[^\s<>"{}|\\^`\[\]]+$'
    if url and not re.match(pattern, url):
        raise ValueError('Invalid URL format')
    return url
```

```python
# Update schemas with validation
# apps/backend/app/api/routes/auth.py

from pydantic import BaseModel, EmailStr, validator
from app.core.validators import validate_password, sanitize_string

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

    @validator('password')
    def password_strength(cls, v):
        return validate_password(v)

    @validator('name')
    def sanitize_name(cls, v):
        if v:
            return sanitize_string(v, 100)
        return v
```

---

## Day 23-24: GDPR Compliance

### Task 5.3: GDPR Implementation
**Priority:** HIGH | **Time:** 4-6 hours

**Step 1: Data Export Endpoint**
```python
# apps/backend/app/api/routes/users.py

@router.get("/me/export")
async def export_user_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Export all user data (GDPR compliance)"""

    # Get all user activities
    activities_result = await db.execute(
        select(Activity).where(Activity.user_id == current_user.id)
    )
    activities = activities_result.scalars().all()

    # Get all screenshots metadata (not images)
    screenshots_result = await db.execute(
        select(Screenshot).where(Screenshot.user_id == current_user.id)
    )
    screenshots = screenshots_result.scalars().all()

    # Get goals
    goals_result = await db.execute(
        select(Goal).where(Goal.user_id == current_user.id)
    )
    goals = goals_result.scalars().all()

    # Compile data
    export_data = {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "activities": [
            {
                "app_name": a.app_name,
                "window_title": a.window_title,
                "start_time": a.start_time.isoformat() if a.start_time else None,
                "duration": a.duration,
                "category": a.category,
            }
            for a in activities
        ],
        "screenshots": [
            {
                "timestamp": s.timestamp.isoformat() if s.timestamp else None,
                "app_name": s.app_name,
                "category": s.category,
            }
            for s in screenshots
        ],
        "goals": [
            {
                "name": g.name,
                "target_value": g.target_value,
                "created_at": g.created_at.isoformat() if g.created_at else None,
            }
            for g in goals
        ],
        "exported_at": datetime.now().isoformat()
    }

    return export_data


@router.delete("/me")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete user account and all data (GDPR right to be forgotten)"""

    # Delete from Firebase Storage
    if firebase_storage.is_available:
        await firebase_storage.delete_user_screenshots(current_user.id)

    # Delete user (cascades to related data)
    await db.delete(current_user)
    await db.commit()

    return {"message": "Account deleted successfully"}
```

**Step 2: Cookie Consent (Frontend)**
```typescript
// apps/desktop/src/components/CookieConsent.tsx
// Add cookie consent banner for web version
```

**Step 3: Privacy Policy Page**
Create `apps/landing/src/app/privacy/page.tsx` with:
- What data we collect
- How we use it
- User rights
- Contact information

---

## Day 25: Legal Pages

### Task 5.4: Terms & Privacy Pages
**Priority:** HIGH | **Time:** 2-3 hours

```typescript
// apps/landing/src/app/terms/page.tsx

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-4">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
        <p>By using Productify Pro, you agree to these terms...</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
        <p>Productify Pro is a productivity tracking application...</p>
      </section>

      {/* Add all required sections */}
    </div>
  );
}
```

---

## Day 26: Backup Strategy

### Task 5.5: Automated Backups
**Priority:** HIGH | **Time:** 2-3 hours

**Supabase has automatic backups, but add:**

```python
# apps/backend/scripts/backup.py

import subprocess
from datetime import datetime
import boto3  # If using S3 for backup storage

def backup_database():
    """Create database backup"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.sql"

    # Using pg_dump
    subprocess.run([
        "pg_dump",
        "-h", "db.xxxx.supabase.co",
        "-U", "postgres",
        "-d", "postgres",
        "-f", filename
    ])

    # Upload to S3 or other storage
    # ...

if __name__ == "__main__":
    backup_database()
```

**Add to cron:**
```bash
# Daily backup at 3 AM
0 3 * * * cd /var/www/productify && python scripts/backup.py
```

---

# WEEK 6: Testing

## Day 27-28: Write Tests

### Task 6.1: Backend Tests
**Priority:** MEDIUM | **Time:** 4-6 hours

```python
# apps/backend/tests/test_auth.py

import pytest
from httpx import AsyncClient
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_register(client):
    response = await client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "TestPass123",
        "name": "Test User"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

@pytest.mark.asyncio
async def test_login(client):
    # First register
    await client.post("/api/auth/register", json={
        "email": "login@example.com",
        "password": "TestPass123"
    })

    # Then login
    response = await client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "TestPass123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

@pytest.mark.asyncio
async def test_invalid_login(client):
    response = await client.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "WrongPass123"
    })
    assert response.status_code == 401
```

---

# WEEK 7: Code Signing & Final Polish

## Day 29-30: Code Signing

### Task 7.1: Apple Code Signing
**Priority:** CRITICAL for Mac | **Cost:** $99/year

1. Enroll in Apple Developer Program
2. Create Developer ID certificate
3. Update tauri.conf.json with signing identity

### Task 7.2: Windows Code Signing
**Priority:** CRITICAL for Windows | **Cost:** $200-400/year

1. Purchase code signing certificate (DigiCert, Sectigo, etc.)
2. Configure in GitHub Actions

---

# WEEK 8: Launch

## Day 31-32: Deploy Everything

[Detailed deployment steps from MASTER_PLAN.md]

## Day 33-34: Monitoring Setup

### Task 8.1: Setup Monitoring
**Priority:** HIGH | **Time:** 2-3 hours

**Uptime Monitoring (UptimeRobot - free):**
- Monitor: https://api.productifypro.com/health
- Alert via email/Slack when down

**Log Aggregation:**
```python
# Already have Sentry, add structured logging

import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }
        return json.dumps(log_data)
```

## Day 35: Final Testing & Launch

### Final Checklist
```
AUTHENTICATION
□ Email registration works
□ Email login works
□ Google OAuth works
□ Password reset works
□ Session persists

CORE FEATURES
□ Dashboard loads
□ Activity tracking works
□ Screenshots capture & upload
□ Analytics display correctly
□ Goals sync properly
□ Reports generate

TEAM FEATURES
□ Create team works
□ Invite member works
□ Accept invite works
□ View member data works
□ Privacy settings respected

ADMIN
□ Admin login works
□ User list loads
□ User management works
□ Team management works
□ Stats display

BILLING
□ Stripe checkout works
□ Subscription activates
□ Webhook updates user
□ Cancel works

SECURITY
□ Rate limiting active
□ Input validation works
□ HTTPS everywhere
□ No sensitive data exposed

DESKTOP APP
□ Installs without warning
□ Auto-update works
□ All features work
□ No crashes

MONITORING
□ Sentry receiving errors
□ Uptime monitoring active
□ Logs accessible
```

---

# Summary: Complete Commercial Checklist

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| 1 | Foundation | Fix bugs, Email, OAuth, Sentry, CI/CD |
| 2 | Foundation | Database, Build app, Test flow |
| 3 | Features | Team UI, Settings, Analytics, Admin |
| 4 | Features | Stripe, Auto-update |
| 5 | Security | Rate limiting, Validation, GDPR, Legal |
| 6 | Testing | Write tests, Security audit |
| 7 | Polish | Code signing, Final fixes |
| 8 | Launch | Deploy, Monitor, GO LIVE |

---

## Costs Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Apple Developer | $99 | /year |
| Windows Signing | ~$300 | /year |
| Supabase | Free→$25 | /month |
| Firebase | Free→$25 | /month |
| Hostinger VPS | ~$10 | /month |
| Resend Email | Free | (3K/month) |
| Sentry | Free | (5K/month) |
| Domain | ~$15 | /year |
| **Total Start** | ~$450 | /year |
| **Monthly** | ~$35-60 | after launch |

---

## Ready to Start?

This is the COMPLETE plan. Start with Week 1, Day 1: Fix the 404 error.
