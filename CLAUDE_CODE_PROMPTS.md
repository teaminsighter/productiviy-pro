# 🤖 Claude Code Prompts Guide

## How to Use This Guide

Copy each prompt and give it to Claude Code in VS Code. Wait for Claude Code to complete each step before moving to the next. Show results after each prompt.

---

## 📋 Pre-requisites

Before starting, ensure you have installed:

```bash
# Required
node --version      # v18+ required
npm --version       # v9+ required
python --version    # v3.10+ required
pip --version
cargo --version     # For Tauri (Rust)

# Install Rust if not present
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli

# Install ActivityWatch (download from activitywatch.net)
```

---

## 🚀 PHASE 1: Project Setup

### Prompt 1.1 - Initialize Project Structure

```
Read the PRODUCTIFY_PRO_SPECIFICATION.md file first to understand the complete project.

Then create the initial project structure for Productify Pro:

1. Create a Tauri + React + TypeScript project in apps/desktop using:
   - Vite as bundler
   - React 18
   - TypeScript strict mode
   - Tailwind CSS

2. Create a Python FastAPI project in apps/backend with:
   - FastAPI
   - Proper folder structure (api, services, models, core)
   - requirements.txt with all dependencies from the spec

3. Create a packages/shared folder for shared TypeScript types

4. Create root package.json for monorepo management

5. Create turbo.json for Turborepo

Do not install dependencies yet, just create the structure and config files.
```

### Prompt 1.2 - Install Dependencies

```
Install all dependencies for the project:

1. In apps/desktop:
   - Install React, Tauri, and all frontend dependencies from the spec
   - Setup shadcn/ui with the CLI
   - Configure Tailwind CSS

2. In apps/backend:
   - Create a Python virtual environment
   - Install all Python dependencies from requirements.txt

3. Verify all installations work by running:
   - npm run dev (frontend)
   - python -m uvicorn app.main:app (backend)

Show me any errors that occur.
```

### Prompt 1.3 - Configure Tauri

```
Configure Tauri for our desktop app:

1. Update tauri.conf.json with:
   - App name: "Productify Pro"
   - Bundle identifier: "com.productify.pro"
   - Window settings: 1200x800, resizable, centered
   - System tray enabled
   - Auto-start capability
   - Single instance only

2. Create basic Rust files in src-tauri/src:
   - main.rs with Tauri setup
   - tray.rs for system tray
   - commands.rs for Tauri commands

3. Setup proper permissions in capabilities

Test that `npm run tauri dev` launches the app.
```

---

## 🎨 PHASE 2: Design System

### Prompt 2.1 - Setup Theme & Glassmorphism

```
Create the complete design system based on the spec:

1. Configure Tailwind CSS with:
   - Custom colors (productive green, neutral amber, distracting red, primary indigo)
   - Custom glassmorphism utilities
   - Dark and light mode support
   - Custom animations

2. Create CSS file at src/styles/globals.css with:
   - CSS variables for themes
   - Glassmorphism classes (.glass-card, .glass-button, etc.)
   - Gradient backgrounds
   - Utility classes

3. Create a ThemeProvider component with:
   - Dark/Light/System mode detection
   - Theme toggle functionality
   - Persist theme preference in localStorage

4. Create a useTheme hook

The design should be beautiful, modern, with glassmorphism effect.
```

### Prompt 2.2 - Setup shadcn/ui Components

```
Setup and customize shadcn/ui components:

1. Initialize shadcn/ui if not done

2. Add these components:
   - Button (customize with glassmorphism)
   - Card (customize with glassmorphism)
   - Input
   - Select
   - Switch
   - Tabs
   - Dialog/Modal
   - Dropdown Menu
   - Toast/Notification
   - Progress
   - Slider
   - Badge
   - Avatar
   - Tooltip

3. Customize each component to match our glassmorphism theme

4. Create an index.ts to export all components

Show me how the components look with the glassmorphism style.
```

### Prompt 2.3 - Create Reusable UI Components

```
Create custom reusable components for our app:

1. GlassCard - Glassmorphism card with hover effects
2. StatCard - Card for displaying stats (number, label, trend)
3. ActivityItem - List item for activity timeline
4. ProductivityBadge - Color-coded badge (productive/neutral/distracting)
5. LiveIndicator - Pulsing dot for "live" status
6. TimeDisplay - Formatted time with live counter
7. ProgressRing - Circular progress indicator
8. AppIcon - App icon with fallback
9. PlatformBadge - Badge for YouTube, GitHub, etc.
10. SearchInput - Search input with icon

All components should:
- Use Framer Motion for animations
- Support dark/light themes
- Have TypeScript props interfaces
- Include hover/active states
```

---

## 📊 PHASE 3: Dashboard UI

### Prompt 3.1 - Create Main Layout

```
Create the main app layout:

1. Create a layout with:
   - Sidebar (collapsible) with navigation
   - Main content area
   - Header with app name, status, and settings

2. Navigation items:
   - Dashboard (home icon)
   - Activity (list icon)
   - Analytics (chart icon)
   - Screenshots (camera icon)
   - Goals (target icon)
   - Settings (gear icon)

3. Use React Router for navigation

4. Add Framer Motion page transitions

5. The sidebar should show:
   - Current tracking status (green dot if tracking)
   - Quick stats (today's time, productivity %)

Make the layout beautiful with glassmorphism and smooth animations.
```

### Prompt 3.2 - Create Dashboard Page

```
Create the main Dashboard page with these sections:

1. Header Stats Row (3-4 cards):
   - Total Time Today (with goal progress)
   - Productivity Score (percentage with visual)
   - Focus Score (A+ to F grade)
   - Current Streak (days)

2. Current Activity Card (prominent):
   - App icon and name
   - Window title
   - Live timer counting up
   - Productivity indicator
   - Pulse animation

3. Productivity Timeline:
   - Hourly bar chart (Recharts)
   - Color coded by productivity
   - Current hour highlighted

4. Recent Activity List:
   - Last 10 activities
   - Animated list with Framer Motion
   - Click to see details

5. Quick Insights Card:
   - AI-generated insight (placeholder for now)
   - "Your productivity tip for today"

Use mock data for now. Make it look professional and beautiful.
```

### Prompt 3.3 - Create Activity Page

```
Create the Activity page with:

1. Filters Bar:
   - Date picker (Today, Yesterday, This Week, Custom)
   - Category filter dropdown
   - Productivity filter (All, Productive, Neutral, Distracting)
   - Search input

2. Activity Timeline View:
   - Vertical timeline with time markers
   - Activity cards along timeline
   - Color-coded by productivity
   - Expandable for details

3. Activity List View:
   - Table/list of all activities
   - Sortable columns (App, Duration, Category, Time)
   - Pagination

4. Activity Details Modal:
   - Full activity details
   - Screenshot if available
   - URL history if browser
   - Edit category option

5. Platform Grouping:
   - Collapsible sections by platform (YouTube, GitHub, etc.)
   - Summary stats per platform

Add toggle between Timeline and List view.
```

### Prompt 3.4 - Create Analytics Page

```
Create the Analytics page with comprehensive charts:

1. Time Period Selector:
   - Today, Yesterday, This Week, This Month, Custom Range

2. Overview Section:
   - Total time tracked
   - Productive vs unproductive time
   - Comparison to previous period (% change)

3. Productivity Chart:
   - Area chart showing productivity over time
   - Daily/hourly granularity option

4. Category Breakdown:
   - Donut/pie chart by category
   - Interactive (click to filter)

5. Top Apps Chart:
   - Horizontal bar chart
   - Top 10 apps by time

6. Daily Patterns:
   - Heatmap of activity by day/hour
   - Show when user is most productive

7. Trends Section:
   - Week over week comparison
   - Goal achievement rate

8. Distractions Analysis:
   - Top distracting sites/apps
   - Time lost to distractions

Use Recharts for all visualizations. Make charts animated on load.
```

### Prompt 3.5 - Create URL History / YouTube Tracking

```
Create a specialized URL/YouTube tracking view:

1. URL History Tab:
   - Organized by platform (YouTube, GitHub, etc.)
   - Collapsible platform sections
   - Search URLs
   - Filter by category

2. YouTube Section:
   - YouTube analytics card showing:
     - Total YouTube time today/week
     - Content breakdown pie chart (Educational/Entertainment/Music)
   - Video list:
     - Thumbnail (placeholder)
     - Video title
     - Channel name
     - Watch duration
     - Category badge (AI classified)
   - Top channels list

3. GitHub Section:
   - Repos visited
   - Time per repo
   - Issues/PRs viewed

4. Platform Detection:
   - Show detected platforms
   - User can classify new platforms

This should demonstrate the URL intelligence feature.
```

---

## ⚙️ PHASE 4: Backend Development

### Prompt 4.1 - Create FastAPI Base

```
Setup the FastAPI backend:

1. Create main.py with:
   - FastAPI app instance
   - CORS middleware (allow Tauri app)
   - Router includes for all routes
   - Startup/shutdown events
   - Health check endpoint

2. Create core/config.py with:
   - Settings class using Pydantic
   - Environment variable loading
   - Database paths
   - API settings

3. Create core/database.py with:
   - SQLite database setup using SQLAlchemy async
   - Database session management
   - Base model class

4. Create all model files in models/:
   - activity.py (Activity, URLActivity, YouTubeActivity)
   - screenshot.py (Screenshot)
   - settings.py (UserSettings, CustomList)

5. Create initial migration/table creation

Test that the backend starts with `uvicorn app.main:app --reload`
```

### Prompt 4.2 - Create Activity Tracking Service

```
Create the activity tracking service:

1. Create services/activity_tracker.py with:
   - ActivityWatch API client class
   - Method to fetch current activity
   - Method to fetch activity history
   - Activity aggregation functions
   - WebSocket for real-time updates

2. Create services/url_analyzer.py with:
   - URL parsing and extraction
   - Platform detection (YouTube, GitHub, etc.)
   - YouTube video ID extraction
   - Domain categorization

3. Create API routes in api/routes/activities.py:
   - GET /activities - list activities with filters
   - GET /activities/current - current activity
   - GET /activities/summary/{date} - daily summary
   - POST /activities/manual - manual entry
   - WebSocket /ws/activities - real-time updates

4. Handle case when ActivityWatch is not running

Test the endpoints with curl or Postman.
```

### Prompt 4.3 - Create AI Classification Service

```
Create the AI classification service:

1. Create services/ai_service.py with:
   - OpenAI client setup
   - API key management (from settings or env)
   - Method to classify activity as productive/not
   - Method to generate daily insights
   - Method to generate weekly report
   - Offline queue management
   - Caching for repeated URLs

2. Create services/classification.py using Instructor:
   - Pydantic models for structured output:
     - ProductivityClassification
     - YouTubeClassification  
     - DailyInsight
     - WeeklyReport
   - Classification pipeline:
     - Rule-based first (fast)
     - AI classification if uncertain
     - User override support

3. Create API routes in api/routes/ai_insights.py:
   - POST /ai/classify - classify single activity
   - GET /ai/insights/daily - daily AI insights
   - GET /ai/insights/weekly - weekly AI report
   - GET /ai/queue - offline queue status
   - POST /ai/queue/process - process queue

4. Handle API key not set gracefully

Test with sample activity data.
```

### Prompt 4.4 - Create Screenshot Service

```
Create the screenshot capture service:

1. Create services/screenshot_service.py with:
   - Screenshot capture using mss library
   - Random interval scheduling (10-15 min)
   - Idle detection integration
   - Image compression (JPEG 70%)
   - Encrypted storage
   - Auto-delete old screenshots
   - Excluded apps handling
   - Blur mode for sensitive content

2. Create models for screenshots:
   - Screenshot model with metadata
   - Storage path management

3. Create API routes in api/routes/screenshots.py:
   - GET /screenshots - list screenshots with pagination
   - GET /screenshots/{id} - get single screenshot
   - DELETE /screenshots/{id} - delete screenshot
   - POST /screenshots/capture - capture now
   - PUT /screenshots/settings - update screenshot settings

4. Create background scheduler for random captures

Test screenshot capture functionality.
```

### Prompt 4.5 - Create Settings & Custom Lists

```
Create settings management:

1. Create services/settings_service.py with:
   - Load/save user settings
   - Settings validation
   - Default settings
   - Custom lists management (productive/distracting/neutral sites)
   - Export/import settings

2. Create API routes in api/routes/settings.py:
   - GET /settings - get all settings
   - PUT /settings - update settings
   - GET /settings/lists - get custom classification lists
   - PUT /settings/lists - update custom lists
   - POST /settings/export - export all data
   - POST /settings/import - import data
   - DELETE /settings/data - delete all data

3. Settings should include:
   - General (theme, language, startup)
   - Tracking (excluded apps, work hours)
   - Screenshots (enabled, interval, blur)
   - AI (api key stored securely via keyring)
   - Privacy (retention period)
   - Notifications (alerts enabled)

4. Use Keyring for secure API key storage

Test settings persistence.
```

---

## 🔗 PHASE 5: Frontend-Backend Integration

### Prompt 5.1 - Create API Client

```
Create the frontend API client:

1. Create lib/api/client.ts with:
   - Axios or fetch wrapper
   - Base URL configuration (localhost:8000)
   - Error handling
   - Request/response interceptors
   - TypeScript types for all responses

2. Create lib/api/activities.ts:
   - fetchCurrentActivity()
   - fetchActivities(filters)
   - fetchDailySummary(date)
   - createManualEntry(data)

3. Create lib/api/analytics.ts:
   - fetchDailyAnalytics(date)
   - fetchWeeklyAnalytics(startDate)
   - fetchTrends()

4. Create lib/api/ai.ts:
   - classifyActivity(activity)
   - fetchDailyInsights()
   - fetchWeeklyReport()
   - processOfflineQueue()

5. Create lib/api/screenshots.ts:
   - fetchScreenshots(filters)
   - captureScreenshot()
   - deleteScreenshot(id)

6. Create lib/api/settings.ts:
   - fetchSettings()
   - updateSettings(settings)
   - fetchCustomLists()
   - updateCustomLists(lists)

Use TanStack Query for data fetching and caching.
```

### Prompt 5.2 - Create Zustand Stores

```
Create Zustand stores for state management:

1. Create stores/activityStore.ts:
   - currentActivity state
   - recentActivities array
   - isTracking boolean
   - actions: setCurrentActivity, addActivity, etc.

2. Create stores/analyticsStore.ts:
   - dailyStats state
   - weeklyStats state
   - selectedDateRange
   - actions: fetchStats, setDateRange

3. Create stores/settingsStore.ts:
   - settings object
   - customLists object
   - actions: loadSettings, updateSettings, etc.

4. Create stores/uiStore.ts:
   - sidebarCollapsed
   - theme (dark/light)
   - notifications array
   - modals state
   - actions for UI state

5. Create stores/aiStore.ts:
   - insights array
   - offlineQueue array
   - isProcessing boolean
   - apiKeySet boolean

Integrate stores with TanStack Query for server state.
```

### Prompt 5.3 - Connect Dashboard to Real Data

```
Connect the Dashboard page to real backend data:

1. Replace mock data with real API calls using TanStack Query

2. Implement real-time updates:
   - WebSocket connection for current activity
   - Auto-refresh for stats (every 30 seconds)
   - Optimistic updates

3. Add loading states:
   - Skeleton loaders for cards
   - Loading spinners where appropriate

4. Add error handling:
   - Error messages for failed requests
   - Retry buttons
   - Fallback UI

5. Add empty states:
   - "No activity tracked today"
   - "Start tracking to see insights"

6. Connect all dashboard components:
   - Stats cards show real data
   - Current activity is live
   - Timeline shows real history
   - Productivity chart uses real data

Test with ActivityWatch running and capturing data.
```

### Prompt 5.4 - Create System Tray Integration

```
Implement system tray for the Tauri app:

1. In Rust (src-tauri/src/tray.rs):
   - Create system tray icon
   - Menu items:
     - Show/Hide window
     - Current activity (dynamic)
     - Today: Xh Xm tracked (dynamic)
     - Productivity: XX% (dynamic)
     - ---
     - Pause/Resume Tracking
     - Start Focus Session
     - Take Screenshot
     - ---
     - Settings
     - Quit
   - Click handlers for each item
   - Tray icon changes based on state

2. In React:
   - Listen for tray events
   - Update tray menu dynamically
   - Handle tray actions

3. Features:
   - Left click: Show/hide window
   - Right click: Show menu
   - Tooltip shows current activity
   - Icon color indicates status:
     - Green: Tracking active
     - Yellow: Paused
     - Gray: Offline

4. Implement minimize to tray on close

Test tray functionality on both Windows and Mac.
```

---

## 🎯 PHASE 6: Core Features

### Prompt 6.1 - Implement Onboarding Flow

```
Create the onboarding flow:

1. Create pages/Onboarding.tsx with multi-step flow:

   Step 1 - Welcome:
   - App logo animation
   - Welcome message
   - "Get Started" button

   Step 2 - Profile:
   - "What do you do?"
   - Selection: Developer, Designer, Writer, Manager, Student, Freelancer, Other
   - This helps AI classify activities

   Step 3 - Work Apps:
   - "Select your work apps"
   - Grid of common apps with checkboxes
   - Add custom app option

   Step 4 - Goals:
   - "Set your daily goals"
   - Productive hours slider (4-10 hours)
   - Max distraction time slider (0-2 hours)
   - Enable notifications toggle

   Step 5 - AI Setup:
   - "Enable AI Insights (Optional)"
   - OpenAI API key input
   - Link to get API key
   - "Skip for now" option

   Step 6 - Permissions:
   - Request necessary permissions
   - Accessibility (explain why needed)
   - Screen recording (for screenshots)
   - Start on login checkbox

   Step 7 - Complete:
   - Celebration animation
   - Summary of setup
   - "Open Dashboard" button

2. Persist onboarding completion status

3. Redirect new users to onboarding

Make it beautiful with animations between steps.
```

### Prompt 6.2 - Implement Settings Page

```
Create the complete Settings page:

1. Create pages/Settings.tsx with tabs:

   General Tab:
   - Theme selector (Dark/Light/System)
   - Language selector
   - Launch on startup toggle
   - Start minimized toggle
   - Time format (12h/24h)

   Tracking Tab:
   - Work schedule (days + hours)
   - Track outside work hours toggle
   - Excluded apps manager
   - Excluded URLs manager

   Screenshots Tab:
   - Enable screenshots toggle
   - Interval slider (5-30 min)
   - Quality selector (Low/Medium/High)
   - Blur mode selector (Never/Sensitive/Always)
   - Auto-delete dropdown (7/30/90 days)
   - Manage excluded apps for screenshots

   AI Tab:
   - API key input (masked, with reveal button)
   - Test connection button
   - AI model selector (gpt-4o-mini, gpt-4o)
   - Offline queue status
   - Clear queue button

   Privacy Tab:
   - Track private browsing toggle
   - Data retention period
   - App lock (Set PIN)
   - View/clear all data

   Notifications Tab:
   - Distraction alerts toggle
   - Goal reminders toggle
   - Break reminders toggle
   - Daily summary toggle
   - Sound toggle

   Keyboard Shortcuts Tab:
   - List all shortcuts
   - Editable shortcuts

   Data Tab:
   - Export data (CSV/JSON)
   - Import data
   - Backup now
   - Restore from backup
   - Delete all data (with confirmation)

2. Save settings to backend and local store

3. Apply settings changes immediately where possible

Make settings feel professional with good UX.
```

### Prompt 6.3 - Implement Custom Lists Management

```
Create the custom lists management feature:

1. Create component CustomListsManager.tsx:

   Three sections:
   - Productive Sites/Apps (green)
   - Distracting Sites/Apps (red)
   - Neutral Sites/Apps (yellow)

   Each section:
   - List of items with delete button
   - Add new item input
   - Import from file option
   - Export to file option

2. Add item modal:
   - Domain input (e.g., github.com)
   - Or app name input
   - Wildcard support hint (*.company.com)
   - Category notes

3. New platform detection:
   - When new domain detected
   - Show notification: "New site detected: notion.so"
   - Quick classify buttons
   - Or "Ignore" option

4. Integrate with classification:
   - Custom lists take priority over AI
   - Update classification service to check lists first

5. Data format:
   ```typescript
   interface CustomList {
     productive: Array<{ pattern: string; note?: string }>;
     distracting: Array<{ pattern: string; note?: string }>;
     neutral: Array<{ pattern: string; note?: string }>;
     excluded: Array<{ pattern: string; reason?: string }>;
   }
   ```

Test that custom lists affect activity classification.
```

### Prompt 6.4 - Implement Screenshot Gallery

```
Create the Screenshots page:

1. Create pages/Screenshots.tsx:

   Header:
   - Date picker
   - Total screenshots count
   - Storage used
   - Export day button

   Timeline View:
   - Horizontal timeline with dots for screenshots
   - Click dot to preview

   Gallery Grid:
   - Thumbnail grid of screenshots
   - Show time, app name, category badge
   - Click to expand

   Screenshot Modal:
   - Full size image
   - Metadata (time, app, window title, URL)
   - Previous/Next navigation
   - Delete button
   - Download button

2. Create ScreenshotCard component:
   - Thumbnail preview
   - Time overlay
   - App icon overlay
   - Hover to show details
   - Click to open modal

3. Features:
   - Lazy loading for performance
   - Virtual scrolling for large lists
   - Filter by app/category
   - Bulk delete option

4. Privacy:
   - Blur sensitive screenshots if blur mode on
   - "Reveal" button for blurred images

Test with captured screenshots.
```

---

## 🤖 PHASE 7: AI Features

### Prompt 7.1 - Implement AI Insights Display

```
Create AI insights display throughout the app:

1. Create components/AIInsightCard.tsx:
   - Icon (sparkle/brain)
   - Insight text
   - "Generated by AI" badge
   - Timestamp
   - Refresh button

2. Dashboard AI Section:
   - Daily tip card
   - Pattern observation
   - Recommendation

3. Analytics AI Section:
   - Weekly trends analysis
   - Productivity patterns
   - Suggestions for improvement

4. Create hooks/useAIInsights.ts:
   - Fetch insights from backend
   - Handle loading/error states
   - Queue management for offline

5. Offline handling:
   - Show cached insights when offline
   - "Will update when online" message
   - Queue indicator

6. Sample insights:
   - "You're 25% more productive on Tuesdays"
   - "Your focus drops after 2pm - try a walk"
   - "YouTube usage increased 40% this week"

Make insights feel helpful, not creepy.
```

### Prompt 7.2 - Implement AI Classification Flow

```
Implement the complete AI classification pipeline:

1. Backend classification flow:
   ```
   Activity → Check Custom Lists → If not found → Check Cache
                                                       ↓
                                              If not cached
                                                       ↓
                                              AI Classification
                                                       ↓
                                              Cache Result
   ```

2. Frontend classification display:
   - Show classification badge on activities
   - "AI classified" indicator
   - "Override" button to change
   - Feedback: "Is this correct?" thumbs up/down

3. Override flow:
   - User clicks override
   - Select new category
   - Option to "Apply to all from this domain"
   - Saves to custom list

4. Batch classification:
   - When app starts, classify unclassified activities
   - Progress indicator
   - Skip if API key not set

5. API key not set handling:
   - Use rule-based classification only
   - Show "Add API key for AI insights" prompt
   - Don't break functionality

Test classification with various activities.
```

### Prompt 7.3 - Implement Weekly AI Report

```
Create the weekly AI report feature:

1. Create pages/Reports.tsx:

   Report selection:
   - Weekly reports list
   - Click to view

   Weekly Report View:
   - Header with date range
   - Summary stats comparison (vs last week)
   - AI-generated insights section:
     - Wins this week
     - Areas for improvement
     - Patterns detected
     - Recommendations
   - Charts:
     - Daily productivity comparison
     - Category breakdown
     - Time distribution
   - Download as PDF button

2. Create services/report_generator.py:
   - Aggregate weekly data
   - Send to OpenAI for analysis
   - Structure response with Instructor
   - Generate PDF using WeasyPrint or similar

3. PDF Report template:
   - Professional design
   - Company/app branding
   - Charts as images
   - Clean typography

4. Scheduling:
   - Generate report every Monday
   - Or on-demand generation

5. Notification:
   - "Your weekly report is ready!"
   - In-app notification

Test report generation with sample data.
```

---

## 🎯 PHASE 8: Polish & Advanced Features

### Prompt 8.1 - Implement Focus Timer

```
Create the Focus Timer feature:

1. Create pages/Focus.tsx:

   Focus Session Setup:
   - Duration selector (25/45/60/90 min or custom)
   - "Block distractions" toggle
   - "Track as productive" toggle
   - Start button

   Active Session:
   - Large timer display (countdown)
   - Circular progress ring
   - "Focusing on: [current app]"
   - Pause button
   - End session button
   - Motivational message

   Session Complete:
   - Celebration animation
   - Session summary
   - "Start another" button

2. Create FocusWidget component (for dashboard):
   - Mini timer display
   - Quick start buttons (25/45/60 min)

3. System tray integration:
   - "Start Focus" menu item
   - Timer in tray tooltip when active

4. Distraction blocking (during focus):
   - Alert when opening distracting site
   - Modal: "You're in focus mode!"
   - Option to bypass (with penalty)

5. Focus history:
   - List of completed sessions
   - Total focus time today/week
   - Streak tracking

6. Notifications:
   - Session starting
   - Halfway point
   - 5 minutes remaining
   - Session complete

Make it feel motivating and not punishing.
```

### Prompt 8.2 - Implement Goals & Streaks

```
Create the Goals & Streaks system:

1. Create pages/Goals.tsx:

   Daily Goals Section:
   - List of active goals with progress bars
   - Goal types:
     - Productive hours (e.g., "4 hours of coding")
     - Category limits (e.g., "Max 1 hour social media")
     - Focus sessions (e.g., "Complete 4 focus sessions")
     - App-specific (e.g., "2 hours in VS Code")
   - Add new goal button
   - Edit/delete goals

   Streaks Section:
   - Current streaks with flame icons
   - Best streaks (all time)
   - Streak types:
     - Days meeting all goals
     - Days under distraction limit
     - Consecutive focus sessions

   Achievements/Badges:
   - Grid of badges
   - Locked vs unlocked
   - Examples:
     - "7-day streak" badge
     - "100 hours productive" badge
     - "Night owl" badge
     - "Early bird" badge

2. Create AddGoalModal:
   - Goal type selector
   - Target input
   - Frequency (daily/weekly)
   - Notifications toggle

3. Goal checking:
   - Background check every hour
   - Notification when goal met
   - Notification when at risk

4. Streak calculation:
   - Calculate at end of day
   - Store streak data

Make it gamified and motivating!
```

### Prompt 8.3 - Implement Notifications System

```
Create the smart notifications system:

1. Create services/notification_service.py:
   - Notification types:
     - Distraction alert
     - Goal progress
     - Focus reminder
     - Break suggestion
     - Daily summary
   - Notification scheduling
   - Rate limiting (don't spam)

2. Create React notifications:
   - Toast notifications (using shadcn)
   - Notification center (dropdown)
   - Notification history

3. Notification triggers:

   Distraction Alert:
   - When on distracting site > 15 min
   - Message: "You've been on YouTube for 20 minutes"
   - Actions: "Back to work" | "5 more min"

   Goal Progress:
   - When goal 80% complete
   - Message: "Almost there! 30 more minutes to hit your goal"

   Focus Reminder:
   - At peak productivity hours (learned)
   - Message: "It's 10 AM - your best focus hour!"
   - Action: "Start focus session"

   Break Suggestion:
   - After 2 hours continuous work
   - Message: "Time for a break?"
   - Action: "Take 5 min" | "Keep working"

   Daily Summary:
   - At end of work day
   - Message: "Great day! 78% productive"
   - Action: "View summary"

4. Native notifications:
   - Use Tauri notifications
   - Respect OS notification settings
   - Click to open app

5. Settings:
   - Enable/disable each type
   - Quiet hours setting
   - Sound on/off

Test notifications don't feel annoying.
```

### Prompt 8.4 - Implement Data Export & Backup

```
Create comprehensive data management:

1. Export features:

   CSV Export:
   - Activities export
   - Analytics export
   - Custom date range
   - Column selection

   JSON Export:
   - Full data export
   - Settings included
   - For backup/migration

   PDF Report:
   - Weekly/monthly reports
   - Custom branding
   - Professional format

2. Create ExportModal component:
   - Format selection
   - Date range picker
   - Data type checkboxes
   - Export button
   - Progress indicator

3. Backup features:
   - Create backup (zip file)
   - Includes: database, screenshots, settings
   - Auto-backup option (weekly)
   - Backup location setting

4. Restore features:
   - Restore from backup file
   - Merge or replace options
   - Validation before restore
   - Progress indicator

5. Delete data:
   - Delete specific date range
   - Delete all data
   - Multiple confirmation steps
   - "This cannot be undone" warning

6. GDPR compliance:
   - "Export my data" button
   - "Delete my data" button
   - Clear explanations

Test export/import cycle works correctly.
```

---

## 💰 PHASE 9: Monetization (v2.0)

### Prompt 9.1 - Implement Stripe Integration

```
Setup Stripe for payments:

1. Create backend/app/services/payment_service.py:
   - Stripe client setup
   - Create checkout session
   - Handle webhooks
   - Subscription management

2. Create API routes:
   - POST /payments/checkout - create checkout
   - POST /payments/webhook - Stripe webhook
   - GET /payments/subscription - get status
   - POST /payments/cancel - cancel subscription

3. Create pricing page:
   - Free tier card
   - Pro tier card ($9/month)
   - Team tier card ($7/user/month)
   - Feature comparison table
   - FAQ section

4. Create UpgradeModal:
   - Shown when accessing Pro feature
   - Pricing info
   - Redirect to Stripe checkout

5. Subscription status:
   - Store in database
   - Check on app start
   - Show Pro badge in UI

6. Feature gating:
   - Create isPro() hook
   - Gate Pro features:
     - AI insights
     - Unlimited history
     - PDF reports
     - Website blocking
     - Cloud sync

Note: For testing, we'll use Stripe test mode.
```

### Prompt 9.2 - Implement Team Features (Basic)

```
Create basic team features:

1. Database models:
   - Organization
   - Team
   - TeamMember
   - TeamInvite

2. Backend routes:
   - POST /teams/create - create team
   - POST /teams/invite - invite member
   - POST /teams/join - accept invite
   - GET /teams/members - list members
   - GET /teams/stats - team statistics

3. Team dashboard:
   - Team members list with status
   - Team productivity overview
   - Individual member stats (privacy-controlled)
   - Activity summary

4. Privacy controls:
   - What managers can see (checkboxes)
   - What members can hide
   - "Personal time" marking

5. Invite flow:
   - Generate invite link
   - Email invite option
   - Accept/decline interface

6. Team settings:
   - Team name
   - Privacy defaults
   - Manager permissions

Keep it simple for v1 - no complex hierarchy.
```

---

## 🧪 PHASE 10: Testing & Polish

### Prompt 10.1 - Add Error Handling & Loading States

```
Add comprehensive error handling:

1. Global error boundary:
   - Catch React errors
   - Show friendly error page
   - Report to console (or Sentry later)
   - Recovery option

2. API error handling:
   - Network errors
   - 401/403 errors
   - 500 errors
   - Timeout handling
   - User-friendly messages

3. Loading states:
   - Skeleton loaders for cards
   - Spinner for buttons
   - Progress bars for long operations
   - "Loading..." placeholders

4. Empty states:
   - No activities: "Start tracking to see data"
   - No screenshots: "Screenshots will appear here"
   - No insights: "Add API key for AI insights"
   - Helpful illustrations

5. Offline handling:
   - Detect offline status
   - Show offline banner
   - Queue operations
   - Sync when back online
   - Clear feedback

6. Form validation:
   - Inline validation
   - Submit button disabled if invalid
   - Clear error messages

Test all error scenarios work gracefully.
```

### Prompt 10.2 - Optimize Performance

```
Optimize app performance:

1. Frontend optimization:
   - Code splitting (React.lazy)
   - Memoization (useMemo, useCallback)
   - Virtual scrolling for long lists
   - Image lazy loading
   - Bundle size analysis

2. Backend optimization:
   - Database indexing
   - Query optimization
   - Response caching
   - Connection pooling

3. Tauri optimization:
   - Minimize bundle size
   - Efficient IPC
   - Background process optimization

4. Memory management:
   - Clean up subscriptions
   - Limit stored data
   - Image compression

5. Monitoring:
   - Performance metrics
   - Memory usage tracking
   - CPU usage warnings

6. Low resource mode:
   - Reduce update frequency
   - Disable animations
   - Lower screenshot quality

Test app uses <100MB RAM and <2% CPU.
```

### Prompt 10.3 - Add Keyboard Shortcuts

```
Implement keyboard shortcuts:

1. Global shortcuts (work even when minimized):
   - Ctrl/Cmd + Shift + T: Toggle tracking
   - Ctrl/Cmd + Shift + F: Start focus session
   - Ctrl/Cmd + Shift + D: Show/hide dashboard
   - Ctrl/Cmd + Shift + S: Take screenshot now

2. In-app shortcuts:
   - Ctrl/Cmd + 1-5: Navigate tabs
   - Ctrl/Cmd + F: Search
   - Ctrl/Cmd + ,: Settings
   - Escape: Close modal
   - ?: Show shortcuts help

3. Implementation:
   - Tauri global shortcuts (Rust)
   - React keyboard hooks
   - Customizable shortcuts in settings

4. Shortcuts help:
   - Help modal showing all shortcuts
   - Trigger with "?"
   - Categorized list

5. Shortcut editing:
   - Settings page for customization
   - Conflict detection
   - Reset to defaults

Test shortcuts work on both Windows and Mac.
```

### Prompt 10.4 - Final Testing & Bug Fixes

```
Perform final testing:

1. Test all features:
   - Activity tracking accuracy
   - URL detection
   - Screenshot capture
   - AI classification
   - Data persistence
   - Export/import
   - Settings save/load

2. Cross-platform testing:
   - Windows 10/11
   - macOS (Intel + Apple Silicon)
   - Different screen sizes

3. Edge cases:
   - No internet connection
   - ActivityWatch not running
   - No API key set
   - Empty database
   - Very long activity names
   - Special characters in URLs

4. Performance testing:
   - Memory usage over time
   - CPU usage during tracking
   - Database size growth
   - App startup time

5. Security testing:
   - API key storage
   - Data encryption
   - Input validation

6. Fix any bugs found

Document all known issues.
```

---

## 📦 PHASE 11: Build & Distribution

### Prompt 11.1 - Build for Production

```
Build production version:

1. Frontend build:
   - Production mode
   - Minification
   - Tree shaking
   - Source maps (optional)

2. Tauri build:
   - Windows: .msi installer
   - macOS: .dmg installer
   - Code signing (if certificates available)
   - Auto-update configuration

3. Backend packaging:
   - PyInstaller or similar
   - Bundle Python runtime
   - Or: Keep as separate service

4. Build scripts:
   - scripts/build-windows.sh
   - scripts/build-mac.sh
   - scripts/build-all.sh

5. Version management:
   - Update version numbers
   - Generate changelog
   - Tag release

6. Test installers:
   - Clean install
   - Upgrade from previous version
   - Uninstall

Verify builds work on clean machines.
```

### Prompt 11.2 - Create README & Documentation

```
Create project documentation:

1. README.md:
   - Project description
   - Features list
   - Screenshots
   - Installation instructions
   - Development setup
   - Tech stack
   - License

2. SETUP.md:
   - Detailed setup guide
   - Prerequisites
   - Step-by-step instructions
   - Troubleshooting

3. ARCHITECTURE.md:
   - System architecture
   - Data flow
   - Component diagram
   - Technology decisions

4. API.md:
   - API documentation
   - Endpoints list
   - Request/response examples
   - Authentication

5. CONTRIBUTING.md:
   - How to contribute
   - Code style
   - PR process

6. CHANGELOG.md:
   - Version history
   - Changes per version

Make documentation clear and helpful.
```

---

## ✅ Final Checklist

After completing all prompts, verify:

- [ ] App launches without errors
- [ ] Activity tracking works
- [ ] UI looks beautiful (glassmorphism)
- [ ] Dark/Light theme works
- [ ] URL detection works
- [ ] YouTube tracking works
- [ ] AI classification works (with API key)
- [ ] Screenshots capture correctly
- [ ] Settings persist
- [ ] Export/import works
- [ ] System tray works
- [ ] Keyboard shortcuts work
- [ ] Offline mode works
- [ ] Performance is good (<100MB RAM)
- [ ] No console errors
- [ ] Builds successfully

---

## 🎉 Congratulations!

You've built Productify Pro - a professional, monetizable PC monitoring app!

Next steps:
1. Get user feedback
2. Fix bugs
3. Add more features
4. Launch on Product Hunt
5. Start monetizing!

Good luck! 🚀
