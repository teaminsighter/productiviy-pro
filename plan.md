🚀 Productify Pro - Full Commercial Launch Plan
Based on your current status, here's a prioritized, step-by-step plan to make this a complete commercial product.

📊 Overview: 4 Phases to Launch
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTIFY PRO ROADMAP                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1 (Week 1)      Phase 2 (Week 2)     Phase 3 (Week 3)    Phase 4    │
│  ───────────────       ───────────────      ───────────────     ─────────  │
│  🔧 Fix Current        🎨 UI/UX Updates     👑 Admin Panel      🚀 Deploy  │
│     Issues                                                                  │
│                                                                             │
│  • Fix 404 errors      • Team Management    • User Management   • Build    │
│  • Database setup      • Settings Page      • Activity Monitor  • Host     │
│  • User isolation      • Analytics UI       • Team Control      • Domain   │
│  • Auth flow           • Report Download    • Billing Dashboard • Launch   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

🔴 PHASE 1: Fix Foundation (Days 1-3)
Fix all current bugs before adding features
Step 1.1: Fix the 404 Backend Error
Priority: CRITICAL
Time: 30 minutes

Add missing endpoint /api/activities/current-realtime to backend.
This is causing all those console errors.
Step 1.2: Database Schema Update
Priority: HIGH
Time: 1-2 hours

Add these tables/columns to Supabase:

-- User Settings Table
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'dark',
  timezone VARCHAR(50) DEFAULT 'UTC',
  notification_enabled BOOLEAN DEFAULT true,
  screenshot_interval INTEGER DEFAULT 300,
  blur_screenshots BOOLEAN DEFAULT false,
  tracking_hours_start TIME DEFAULT '09:00',
  tracking_hours_end TIME DEFAULT '18:00',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reports Table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id),
  report_type VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'custom'
  date_from DATE,
  date_to DATE,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Activity Categories (for better analytics)
CREATE TABLE activity_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  type VARCHAR(20), -- 'productive', 'neutral', 'distracting'
  apps TEXT[], -- array of app names
  urls TEXT[], -- array of URL patterns
  created_by UUID REFERENCES auth.users(id),
  is_global BOOLEAN DEFAULT false
);

-- Admin Users Table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'admin', -- 'super_admin', 'admin', 'support'
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
Step 1.3: Backend API Completion
Priority: HIGH
Time: 2-3 hours

Add these endpoints:

# User Settings
GET    /api/users/settings
PUT    /api/users/settings
PATCH  /api/users/settings/{key}

# Reports
GET    /api/reports
POST   /api/reports/generate
GET    /api/reports/{id}/download

# Analytics
GET    /api/analytics/summary?period=day|week|month
GET    /api/analytics/apps?limit=10
GET    /api/analytics/categories
GET    /api/analytics/productivity-score
GET    /api/analytics/trends

# Admin (protected)
GET    /api/admin/users
GET    /api/admin/users/{id}
PUT    /api/admin/users/{id}/status
GET    /api/admin/teams
GET    /api/admin/stats

🟡 PHASE 2: UI/UX Updates (Days 4-7)
Build beautiful, functional interfaces
Step 2.1: Team Management Page
Priority: HIGH
File: apps/web/src/pages/TeamManagement.tsx

Features:
├── Team Overview Card
│   ├── Team name, logo, description
│   ├── Created date
│   └── Total members count
│
├── Members List
│   ├── Avatar, Name, Email, Role
│   ├── Status (Active/Offline/Paused)
│   ├── Today's productivity %
│   ├── Actions: View Details, Change Role, Remove
│   └── Bulk actions
│
├── Invite Members
│   ├── Email input
│   ├── Role selector
│   └── Send invite button
│
├── Team Settings
│   ├── Rename team
│   ├── Privacy defaults
│   ├── Screenshot settings
│   └── Delete team
│
└── Activity Feed
    └── Recent team activity
Step 2.2: Settings Page
Priority: HIGH
File: apps/web/src/pages/Settings.tsx

Tabs:
├── Profile
│   ├── Avatar upload
│   ├── Name, Email
│   ├── Password change
│   └── Delete account
│
├── Preferences
│   ├── Theme (Dark/Light/System)
│   ├── Timezone
│   ├── Language
│   └── Date/Time format
│
├── Tracking
│   ├── Enable/Disable tracking
│   ├── Working hours
│   ├── Screenshot interval
│   ├── Blur screenshots toggle
│   └── App categorization
│
├── Privacy
│   ├── Share activity with team
│   ├── Share screenshots
│   ├── Data retention period
│   └── Export my data
│
├── Notifications
│   ├── Email notifications
│   ├── Desktop notifications
│   ├── Weekly report email
│   └── Goal reminders
│
└── Billing (Link to Stripe portal)
Step 2.3: Analytics Dashboard Upgrade
Priority: HIGH
File: apps/web/src/pages/Analytics.tsx

Sections:
├── Summary Cards Row
│   ├── Total Hours (this period)
│   ├── Productive Hours
│   ├── Top App
│   └── Productivity Trend (+/-%)
│
├── Time Distribution Chart
│   ├── Pie chart: Apps by time
│   └── Toggle: By category
│
├── Productivity Timeline
│   ├── Line chart: Daily productivity
│   └── Period selector: Day/Week/Month
│
├── Top Apps Table
│   ├── App icon, name
│   ├── Time spent
│   ├── Category badge
│   └── % of total
│
├── Top Websites Table
│   ├── Favicon, URL
│   ├── Time spent
│   └── Category
│
├── Category Breakdown
│   ├── Productive
│   ├── Neutral
│   └── Distracting
│
└── Comparison
    └── This week vs Last week
Step 2.4: Report Download Feature
Priority: MEDIUM
File: apps/web/src/components/ReportGenerator.tsx

Features:
├── Report Type Selector
│   ├── Daily Summary
│   ├── Weekly Report
│   ├── Monthly Report
│   └── Custom Date Range
│
├── Include Options (Checkboxes)
│   ├── Activity Summary
│   ├── App Usage Details
│   ├── Website Details
│   ├── Screenshots
│   ├── Goals Progress
│   └── Productivity Score
│
├── Format Selector
│   ├── PDF
│   ├── CSV
│   └── Excel
│
└── Download Button
    └── Generate & Download

🟢 PHASE 3: Admin Panel (Days 8-12)
Full control dashboard for you
Step 3.1: Admin Panel Setup
Priority: HIGH
Location: apps/admin/ (new app) or apps/web/src/pages/admin/

Admin Dashboard Structure:
├── /admin
│   └── Overview stats, charts
│
├── /admin/users
│   ├── List all users
│   ├── Search, filter, sort
│   ├── User details modal
│   ├── Disable/Enable user
│   └── Delete user
│
├── /admin/teams
│   ├── List all teams
│   ├── Team details
│   ├── Member count
│   └── Manage team
│
├── /admin/activity
│   ├── Real-time activity monitor
│   ├── See who's online
│   └── Activity logs
│
├── /admin/billing
│   ├── Subscription stats
│   ├── Revenue chart
│   ├── Recent transactions
│   └── Stripe dashboard link
│
├── /admin/reports
│   ├── System reports
│   ├── User reports
│   └── Export data
│
└── /admin/settings
    ├── App settings
    ├── Default categories
    ├── Pricing tiers
    └── Feature flags
Step 3.2: Admin Dashboard UI
File: apps/web/src/pages/admin/Dashboard.tsx

Stats Cards:
├── Total Users (with growth %)
├── Active Users (24h)
├── Total Teams
├── Revenue (MTD)

Charts:
├── User Growth (Line chart)
├── Daily Active Users (Bar chart)
├── Revenue Trend (Line chart)
└── User Distribution (Pie: Free/Pro/Team)

Tables:
├── Recent Signups (last 10)
├── Active Sessions
└── Recent Transactions
Step 3.3: User Management
File: apps/web/src/pages/admin/Users.tsx

Features:
├── Search bar (by name, email)
├── Filters (status, plan, date)
├── Sortable columns
├── User row:
│   ├── Avatar, Name, Email
│   ├── Plan (Free/Pro/Team)
│   ├── Status (Active/Suspended)
│   ├── Joined date
│   ├── Last active
│   └── Actions dropdown
│
└── User Detail Modal:
    ├── Full profile
    ├── Activity stats
    ├── Teams
    ├── Billing history
    └── Admin actions

🔵 PHASE 4: Deploy & Launch (Days 13-15)
Go live!
Step 4.1: Build Desktop App
bash# Build Tauri app for distribution
cd apps/desktop
npm run tauri build

# Outputs:
# Windows: .exe, .msi
# macOS: .dmg, .app
# Linux: .deb, .AppImage
```

### Step 4.2: Setup Hosting
```
Option A: Hostinger (Your choice)
├── Upload backend to VPS
├── Setup Node.js/Python
├── Configure nginx
├── SSL certificate
└── Domain setup

Option B: Vercel + Railway (Easier)
├── Frontend → Vercel (free)
├── Backend → Railway ($5/mo)
└── Auto-deploy from GitHub
```

### Step 4.3: Download Links
```
Host app installers:
├── GitHub Releases (free, reliable)
├── Or Hostinger file hosting
└── Or AWS S3

Update landing page with:
├── Windows download (.exe)
├── macOS download (.dmg)
└── Linux download (.deb)
```

### Step 4.4: Final Checklist
```
□ All API endpoints working
□ User registration/login flow
□ Team creation and invite
□ Activity tracking working
□ Screenshots capturing
□ Analytics showing data
□ Reports downloading
□ Settings saving
□ Admin panel functional
□ Stripe payments tested
□ Desktop app installs correctly
□ Landing page has download links
□ Terms & Privacy pages
□ Contact/Support page
```

---

## 📋 Claude Code Prompts (Copy & Paste)

### 🔧 For Phase 1 (Fix Foundation):
```
Fix the 404 error on /api/activities/current-realtime. 
Add this endpoint to the backend that:
1. Checks if ActivityWatch is running at localhost:5600
2. If yes, gets current window activity
3. If no, returns a fallback response with is_tracking: false

Also add /api/activities/diagnostics endpoint for debugging.

Show me the changes.
```

### 🎨 For Phase 2 (Team Management):
```
Create a Team Management page at /team with:
1. Team overview card (name, member count, created date)
2. Members list table with columns: Avatar, Name, Email, Role, Status, Actions
3. Invite member form (email input + role dropdown + send button)
4. Team settings section (rename, privacy defaults, delete)

Use the existing UI components and styling. 
Connect to the existing team API endpoints.
```

### 📊 For Phase 2 (Settings Page):
```
Create a comprehensive Settings page at /settings with tabs:
1. Profile - avatar, name, email, password change
2. Preferences - theme, timezone, language
3. Tracking - working hours, screenshot interval, blur option
4. Privacy - share settings, data export
5. Notifications - email and desktop notification toggles

Save settings to /api/users/settings endpoint.
Use the existing dark theme styling.
```

### 📈 For Phase 2 (Analytics):
```
Upgrade the Analytics page with:
1. Summary cards: Total Hours, Productive Hours, Top App, Productivity Trend
2. Time distribution pie chart (apps by time)
3. Productivity timeline (daily line chart)
4. Top apps table with icons
5. Category breakdown (productive/neutral/distracting)
6. Period selector (day/week/month)

Use recharts for visualizations.
Fetch data from /api/analytics/* endpoints.
```

### 📥 For Phase 2 (Reports):
```
Create a Report Generator component with:
1. Report type selector (daily/weekly/monthly/custom)
2. Date range picker for custom reports
3. Checkboxes for what to include (activity, apps, websites, screenshots)
4. Format selector (PDF/CSV/Excel)
5. Generate & Download button

Backend should generate the report and return a download URL.
Use jsPDF for PDF generation or call backend API.
```

### 👑 For Phase 3 (Admin Panel):
```
Create an Admin Panel section with routes:
- /admin - Dashboard with stats cards and charts
- /admin/users - User management table with search/filter
- /admin/teams - Team management 
- /admin/billing - Subscription stats

Include:
1. Protected route (check if user is admin)
2. Sidebar navigation
3. Stats: Total Users, Active Users, Teams, Revenue
4. Charts: User growth, DAU, revenue trend
5. Recent signups table
6. Quick actions

Style to match the existing dark theme.
2