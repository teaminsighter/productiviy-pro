# Productify Pro - Master Launch Plan
## Combined Best of Both Plans

---

## Timeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PRODUCTIFY PRO - 4 WEEK LAUNCH                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Week 1              Week 2              Week 3              Week 4         │
│  ──────────          ──────────          ──────────          ──────────     │
│  🔧 Fix & Build      🎨 UI/UX            👑 Admin Panel      🚀 Deploy      │
│                                                                             │
│  • Fix 404 errors    • Team Management   • User Management   • Build Apps  │
│  • Database setup    • Settings Page     • Activity Monitor  • Host Backend│
│  • Auth completion   • Analytics UI      • Team Control      • Domain Setup│
│  • Test full flow    • Report Download   • Billing Dashboard • GO LIVE!    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 🔴 WEEK 1: Fix Foundation & Core

## Day 1-2: Fix Current Issues

### Task 1.1: Fix 404 Backend Errors
**Priority:** CRITICAL | **Time:** 1 hour

Add missing endpoint `/api/activities/current-realtime`:

```python
# apps/backend/app/api/routes/activities.py

@router.get("/current-realtime")
async def get_current_realtime_activity(
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Real-time current activity for dashboard"""
    try:
        status = await check_activitywatch_status()

        if not status.get("available"):
            return {
                "is_tracking": False,
                "message": "ActivityWatch not running",
                "current_activity": None
            }

        current = await get_current_activity()
        if not current:
            return {
                "is_tracking": True,
                "is_idle": True,
                "current_activity": None
            }

        classification = classify_activity(
            current.app_name,
            current.window_title,
            current.url
        )

        return {
            "is_tracking": True,
            "is_idle": current.is_afk,
            "current_activity": {
                "app_name": current.app_name,
                "window_title": current.window_title,
                "url": current.url,
                "duration": current.duration,
                "category": classification.category,
                "productivity_score": classification.productivity_score,
                "productivity_type": classification.productivity_type,
            }
        }
    except Exception as e:
        return {"is_tracking": False, "error": str(e)}
```

### Task 1.2: Add Diagnostics Endpoint
**Priority:** HIGH | **Time:** 30 min

```python
@router.get("/diagnostics")
async def get_diagnostics():
    """System diagnostics for debugging"""
    aw_status = await check_activitywatch_status()

    return {
        "activitywatch": aw_status,
        "database": "connected",  # Add actual check
        "firebase": firebase_storage.is_available,
        "timestamp": datetime.now().isoformat()
    }
```

---

## Day 2-3: Database Schema (Supabase)

### Task 1.3: Run Migrations
**Priority:** HIGH | **Time:** 2 hours

Run these in Supabase SQL Editor:

```sql
-- =============================================
-- CORE TABLES (if not exist via SQLAlchemy)
-- =============================================

-- User Settings (enhanced)
CREATE TABLE IF NOT EXISTS user_settings_new (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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
    notifications_enabled BOOLEAN DEFAULT true,
    distraction_alerts BOOLEAN DEFAULT true,
    goal_reminders BOOLEAN DEFAULT true,
    daily_summary BOOLEAN DEFAULT true,
    productive_apps JSONB DEFAULT '[]',
    distracting_apps JSONB DEFAULT '[]',
    excluded_apps JSONB DEFAULT '[]',
    UNIQUE(user_id)
);

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id),
    team_id INTEGER REFERENCES teams(id),
    report_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    file_url TEXT,
    file_path TEXT,
    format VARCHAR(10) DEFAULT 'pdf', -- 'pdf', 'csv', 'excel'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'generating', 'ready', 'failed'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Activity Categories (customizable)
CREATE TABLE IF NOT EXISTS activity_categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id), -- NULL for global
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'productive', 'neutral', 'distracting'
    apps TEXT[] DEFAULT '{}',
    url_patterns TEXT[] DEFAULT '{}',
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default global categories
INSERT INTO activity_categories (name, type, apps, url_patterns, is_global) VALUES
('Development', 'productive', ARRAY['Visual Studio Code', 'Terminal', 'iTerm', 'Xcode', 'Android Studio'], ARRAY['github.com', 'stackoverflow.com'], true),
('Communication', 'neutral', ARRAY['Slack', 'Discord', 'Zoom', 'Microsoft Teams'], ARRAY['slack.com', 'discord.com'], true),
('Social Media', 'distracting', ARRAY['Twitter', 'Facebook', 'Instagram'], ARRAY['twitter.com', 'facebook.com', 'instagram.com', 'tiktok.com'], true),
('Entertainment', 'distracting', ARRAY['Netflix', 'YouTube', 'Spotify'], ARRAY['netflix.com', 'youtube.com'], true);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    role VARCHAR(20) DEFAULT 'admin', -- 'super_admin', 'admin', 'support'
    permissions JSONB DEFAULT '{"users": true, "teams": true, "billing": true, "settings": true}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin Audit Log
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50), -- 'user', 'team', 'setting'
    target_id INTEGER,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Announcements (system-wide)
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_screenshots_user_date ON screenshots(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_log(admin_id);
```

---

## Day 3-4: Complete Backend APIs

### Task 1.4: Add Missing API Endpoints
**Priority:** HIGH | **Time:** 3-4 hours

```python
# =============================================
# apps/backend/app/api/routes/reports.py (NEW)
# =============================================

from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.user import User
from app.api.routes.auth import get_current_user
from app.services.pdf_generator import generate_report

router = APIRouter()

@router.get("/")
async def get_reports(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's generated reports"""
    # Query reports for user
    pass

@router.post("/generate")
async def generate_report_endpoint(
    report_type: str,  # daily, weekly, monthly, custom
    date_from: str,
    date_to: str,
    format: str = "pdf",  # pdf, csv, excel
    include: list = ["activity", "apps", "websites"],
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate a new report"""
    # Create report record
    # Add background task to generate
    pass

@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download a generated report"""
    pass
```

```python
# =============================================
# apps/backend/app/api/routes/admin.py (NEW)
# =============================================

from fastapi import APIRouter, Depends, HTTPException
from app.api.routes.auth import get_current_user
from app.models.user import User

router = APIRouter()

async def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to require admin access"""
    # Check if user is in admin_users table
    # For now, check if email matches admin emails
    admin_emails = ["your-email@example.com"]  # Configure this
    if current_user.email not in admin_emails:
        raise HTTPException(403, "Admin access required")
    return current_user

@router.get("/stats")
async def get_admin_stats(admin: User = Depends(require_admin)):
    """Get admin dashboard stats"""
    return {
        "total_users": 0,  # Query from DB
        "active_users_24h": 0,
        "total_teams": 0,
        "total_screenshots": 0,
        "storage_used_mb": 0,
    }

@router.get("/users")
async def get_all_users(
    search: str = None,
    status: str = None,
    plan: str = None,
    page: int = 1,
    limit: int = 50,
    admin: User = Depends(require_admin)
):
    """Get all users with filters"""
    pass

@router.get("/users/{user_id}")
async def get_user_detail(
    user_id: int,
    admin: User = Depends(require_admin)
):
    """Get detailed user info"""
    pass

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    status: str,  # active, suspended, banned
    admin: User = Depends(require_admin)
):
    """Update user status"""
    pass

@router.get("/teams")
async def get_all_teams(admin: User = Depends(require_admin)):
    """Get all teams"""
    pass

@router.get("/activity/realtime")
async def get_realtime_activity(admin: User = Depends(require_admin)):
    """Get real-time activity across all users"""
    pass
```

---

## Day 4-5: Auth Flow Completion

### Task 1.5: Add Password Reset
**Priority:** HIGH | **Time:** 2 hours

```python
# apps/backend/app/api/routes/auth.py - ADD these endpoints

@router.post("/forgot-password")
async def forgot_password(email: str, db: AsyncSession = Depends(get_db)):
    """Send password reset email"""
    # 1. Find user by email
    # 2. Generate reset token
    # 3. Send email with reset link
    # For now, return success (implement email later)
    return {"message": "If email exists, reset link sent"}

@router.post("/reset-password")
async def reset_password(
    token: str,
    new_password: str,
    db: AsyncSession = Depends(get_db)
):
    """Reset password with token"""
    # 1. Verify token
    # 2. Update password
    # 3. Invalidate token
    pass

@router.put("/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change password (logged in user)"""
    # 1. Verify current password
    # 2. Update to new password
    pass
```

### Task 1.6: Build & Test Desktop App
**Priority:** CRITICAL | **Time:** 2 hours

```bash
# Build desktop app
cd apps/desktop
npm install
npm run tauri build

# Test the built app
# macOS: open src-tauri/target/release/bundle/dmg/*.dmg
# Windows: run src-tauri/target/release/bundle/msi/*.msi
```

---

# 🟡 WEEK 2: UI/UX Updates

## Day 6-7: Team Management Page

### Task 2.1: Create Team Management UI
**File:** `apps/desktop/src/pages/TeamManagement.tsx`

```
Team Management Page Structure:
├── Team Overview Card
│   ├── Team name, avatar
│   ├── Member count
│   ├── Created date
│   └── Your role badge
│
├── Members Tab
│   ├── Members table
│   │   ├── Avatar, Name, Email
│   │   ├── Role (Owner/Admin/Member)
│   │   ├── Status (Online/Offline)
│   │   ├── Today's productivity %
│   │   └── Actions dropdown (View, Change Role, Remove)
│   │
│   └── Invite Member Button → Modal
│       ├── Email input
│       ├── Role selector
│       └── Send Invite
│
├── Activity Tab (Admin only)
│   ├── Team activity feed
│   ├── Filter by member
│   └── Date range picker
│
├── Analytics Tab (Admin only)
│   ├── Team productivity chart
│   ├── Member comparison
│   └── Category breakdown
│
└── Settings Tab (Owner/Admin only)
    ├── Team name edit
    ├── Team avatar
    ├── Privacy defaults
    └── Delete team (Owner only)
```

**Claude Prompt:**
```
Create a Team Management page at apps/desktop/src/pages/TeamManagement.tsx with:

1. Team overview card showing team name, member count, and user's role
2. Tabs: Members, Activity, Analytics, Settings
3. Members tab with a table showing all members with Avatar, Name, Email, Role, Status, and Actions
4. Invite member modal with email input and role selector
5. Settings tab for team name edit and delete team

Use existing shadcn/ui components (Card, Tabs, Table, Dialog, Button).
Connect to existing /api/teams endpoints.
Match the existing dark theme styling.
```

---

## Day 8-9: Settings Page

### Task 2.2: Complete Settings Page
**File:** `apps/desktop/src/pages/Settings.tsx`

```
Settings Page Structure:
├── Profile Tab
│   ├── Avatar (upload)
│   ├── Display Name
│   ├── Email (read-only)
│   ├── Change Password button
│   └── Delete Account button (danger)
│
├── Preferences Tab
│   ├── Theme (Dark/Light/System)
│   ├── Timezone selector
│   ├── Language selector
│   └── Date format
│
├── Tracking Tab
│   ├── Enable tracking toggle
│   ├── Working hours (start/end)
│   ├── Screenshot interval slider
│   ├── Blur screenshots toggle
│   └── Excluded apps list
│
├── Privacy Tab
│   ├── Share activity with team
│   ├── Share screenshots with team
│   ├── Share URLs with team
│   ├── Data retention dropdown
│   └── Export my data button
│
├── Notifications Tab
│   ├── Desktop notifications toggle
│   ├── Email notifications toggle
│   ├── Weekly summary email
│   ├── Goal reminders
│   └── Distraction alerts
│
└── Billing Tab
    ├── Current plan display
    ├── Usage stats
    ├── Upgrade button
    └── Manage subscription (Stripe portal)
```

**Claude Prompt:**
```
Update apps/desktop/src/pages/Settings.tsx with comprehensive tabs:

1. Profile - avatar upload, name, change password, delete account
2. Preferences - theme toggle, timezone, language
3. Tracking - enable/disable, working hours, screenshot settings
4. Privacy - team sharing toggles, data export
5. Notifications - all notification toggles
6. Billing - current plan, upgrade options

Use Tabs component for navigation.
Save changes via PUT /api/settings endpoint.
Add confirmation dialogs for dangerous actions.
```

---

## Day 10-11: Analytics Dashboard Upgrade

### Task 2.3: Enhanced Analytics Page
**File:** `apps/desktop/src/pages/Analytics.tsx`

```
Analytics Page Structure:
├── Period Selector (Day/Week/Month/Custom)
│
├── Summary Cards Row
│   ├── Total Time
│   ├── Productive Time
│   ├── Top App
│   └── Productivity Score (+/- trend)
│
├── Charts Row
│   ├── Productivity Timeline (Line chart)
│   └── Category Distribution (Pie chart)
│
├── Top Apps Section
│   ├── Bar chart visualization
│   └── Detailed table with icons
│
├── Top Websites Section
│   ├── Favicon, URL, Time, Category
│   └── Filter by productive/distracting
│
├── Comparison Section
│   └── This period vs Previous period
│
└── Export Button
    └── Download as PDF/CSV
```

---

## Day 12: Report Download Feature

### Task 2.4: Report Generator Component
**File:** `apps/desktop/src/components/reports/ReportGenerator.tsx`

```
Report Generator Modal:
├── Report Type
│   ├── Daily Summary
│   ├── Weekly Report
│   ├── Monthly Report
│   └── Custom Date Range
│
├── Date Range (if custom)
│   ├── From date
│   └── To date
│
├── Include (checkboxes)
│   ├── Activity Summary
│   ├── App Usage Details
│   ├── Website Details
│   ├── Screenshots
│   ├── Goals Progress
│   └── Productivity Score
│
├── Format
│   ├── PDF
│   ├── CSV
│   └── Excel
│
└── Actions
    ├── Preview button
    └── Generate & Download button
```

---

# 🟢 WEEK 3: Admin Panel

## Day 13-14: Admin Panel Setup

### Task 3.1: Create Admin App Structure
**Location:** `apps/admin/` (new app)

```
apps/admin/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   └── AdminHeader.tsx
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── UserGrowthChart.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   └── RecentActivity.tsx
│   │   ├── users/
│   │   │   ├── UserTable.tsx
│   │   │   ├── UserFilters.tsx
│   │   │   └── UserDetailModal.tsx
│   │   └── teams/
│   │       ├── TeamTable.tsx
│   │       └── TeamDetailModal.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Users.tsx
│   │   ├── Teams.tsx
│   │   ├── Activity.tsx
│   │   ├── Billing.tsx
│   │   └── Settings.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

**Claude Prompt:**
```
Create a new admin panel app at apps/admin with:

1. Vite + React + TypeScript + Tailwind setup
2. Admin login page (check against admin_users table)
3. Dashboard with stats cards: Total Users, Active Users, Teams, Revenue
4. User management page with search, filters, and user table
5. Team management page
6. Protected routes (require admin login)
7. Sidebar navigation

Use the same dark theme as the desktop app.
Connect to /api/admin/* endpoints.
```

---

## Day 15-16: Admin Dashboard

### Task 3.2: Build Admin Dashboard
**File:** `apps/admin/src/pages/Dashboard.tsx`

```
Admin Dashboard:
├── Stats Cards Row
│   ├── Total Users (with % growth)
│   ├── Active Users (24h)
│   ├── Total Teams
│   └── Monthly Revenue
│
├── Charts Row
│   ├── User Growth (line chart - 30 days)
│   └── Daily Active Users (bar chart)
│
├── Tables Row
│   ├── Recent Signups (last 10)
│   │   └── Avatar, Name, Email, Plan, Joined
│   │
│   └── Active Sessions
│       └── User, Device, Location, Started
│
└── Quick Actions
    ├── Send Announcement
    ├── Generate Report
    └── System Status
```

---

## Day 17-18: User & Team Management

### Task 3.3: User Management Page
**File:** `apps/admin/src/pages/Users.tsx`

Features:
- Search by name/email
- Filter by: Status, Plan, Date range
- Sortable columns
- User detail modal with full info
- Actions: View, Suspend, Delete, Change plan

### Task 3.4: Team Management Page
**File:** `apps/admin/src/pages/Teams.tsx`

Features:
- All teams list
- Team members count
- Team plan
- Storage usage
- Actions: View details, Manage

---

# 🔵 WEEK 4: Deploy & Launch

## Day 19-20: Build Applications

### Task 4.1: Build All Apps

```bash
# 1. Build Desktop App
cd apps/desktop
npm run tauri build
# Outputs: .dmg (macOS), .exe (Windows)

# 2. Build Landing Page
cd apps/landing
npm run build
# Output: .next/ or out/

# 3. Build Admin Panel
cd apps/admin
npm run build
# Output: dist/
```

### Task 4.2: Setup GitHub Releases

```bash
# Create release with app downloads
gh release create v1.0.0 \
  apps/desktop/src-tauri/target/release/bundle/dmg/*.dmg \
  apps/desktop/src-tauri/target/release/bundle/msi/*.msi \
  --title "Productify Pro v1.0.0" \
  --notes "Initial release"
```

---

## Day 21-22: Deploy to Hostinger

### Task 4.3: Backend Deployment

```bash
# On Hostinger VPS:

# 1. Install dependencies
sudo apt update
sudo apt install python3 python3-pip nginx certbot

# 2. Clone repo
git clone https://github.com/teaminsighter/productiviy-pro.git
cd productiviy-pro/apps/backend

# 3. Setup Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. Create .env with production values
cp .env.example .env
nano .env  # Edit with real values

# 5. Setup systemd service
sudo nano /etc/systemd/system/productify.service
```

```ini
# /etc/systemd/system/productify.service
[Unit]
Description=Productify Pro API
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/productify/apps/backend
Environment="PATH=/var/www/productify/apps/backend/venv/bin"
ExecStart=/var/www/productify/apps/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# 6. Setup Nginx
sudo nano /etc/nginx/sites-available/productify
```

```nginx
# /etc/nginx/sites-available/productify
server {
    listen 80;
    server_name api.productifypro.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name admin.productifypro.com;
    root /var/www/productify/apps/admin/dist;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# 7. Enable site and SSL
sudo ln -s /etc/nginx/sites-available/productify /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.productifypro.com -d admin.productifypro.com
sudo systemctl restart nginx
```

---

## Day 23: Update Landing Page

### Task 4.4: Add Download Links

Update `apps/landing/src/components/Download.tsx`:
- macOS download button → GitHub Release .dmg
- Windows download button → GitHub Release .exe
- Version number display
- System requirements

---

## Day 24: Final Testing

### Task 4.5: Complete Checklist

```
□ User registration works
□ User login works
□ Password reset works
□ Team creation works
□ Team invite works
□ Activity tracking works
□ Screenshots capturing
□ Screenshots uploading to Firebase
□ Analytics showing real data
□ Reports generating
□ Settings saving
□ Admin login works
□ Admin can see all users
□ Admin can suspend users
□ Desktop app installs correctly
□ Desktop app connects to API
□ Landing page loads
□ Download links work
□ SSL certificates valid
□ Mobile responsive
```

---

# 📋 Claude Code Prompts (Copy & Paste Ready)

## Week 1 Prompts

### Fix 404 Error
```
Fix the 404 error on /api/activities/current-realtime. Add this endpoint to apps/backend/app/api/routes/activities.py that:
1. Checks if ActivityWatch is running
2. Returns current activity with classification
3. Handles errors gracefully
Also add /api/activities/diagnostics for debugging.
```

### Add Admin Routes
```
Create apps/backend/app/api/routes/admin.py with:
1. require_admin dependency that checks admin_users table
2. GET /api/admin/stats - dashboard statistics
3. GET /api/admin/users - paginated user list with search
4. GET /api/admin/users/{id} - user detail
5. PUT /api/admin/users/{id}/status - update status
6. GET /api/admin/teams - all teams

Add router to main.py with prefix /api/admin
```

## Week 2 Prompts

### Team Management Page
```
Create apps/desktop/src/pages/TeamManagement.tsx with:
1. Team overview card (name, members, your role)
2. Tabs: Members, Activity, Settings
3. Members table with Avatar, Name, Role, Status, Actions
4. Invite modal with email and role
5. Settings for rename and delete team

Use shadcn/ui Tabs, Card, Table, Dialog.
Connect to /api/teams endpoints.
```

### Settings Page
```
Update apps/desktop/src/pages/Settings.tsx with tabs:
1. Profile - name, avatar, password change
2. Preferences - theme, timezone
3. Tracking - hours, screenshots, blur
4. Privacy - sharing toggles, export
5. Notifications - all toggles
6. Billing - plan info

Save to /api/settings. Use Switch, Select, Slider components.
```

### Analytics Upgrade
```
Upgrade apps/desktop/src/pages/Analytics.tsx with:
1. Period selector (day/week/month)
2. Stats cards with trends
3. Productivity line chart
4. Category pie chart
5. Top apps bar chart + table
6. Export button

Use recharts. Fetch from /api/analytics endpoints.
```

## Week 3 Prompts

### Create Admin Panel
```
Create new app at apps/admin with Vite + React + TypeScript:
1. Setup with Tailwind, same dark theme
2. Login page for admins
3. Dashboard with stats and charts
4. Users page with table and filters
5. Teams page
6. Sidebar navigation
7. Protected routes

Use shadcn/ui components. Connect to /api/admin endpoints.
```

---

# 🎯 Success Metrics

| Metric | Target |
|--------|--------|
| App Download | Working .dmg and .exe |
| User Registration | < 30 seconds |
| Page Load Time | < 2 seconds |
| API Response Time | < 200ms |
| Uptime | 99.9% |
| First Paying Customer | Week 5 |
| 100 Users | Month 1 |
