# 🖥️ PRODUCTIFY PRO - Complete Project Specification

## Project Overview

**Name:** Productify Pro  
**Type:** PC Monitoring & Productivity Tracking Application  
**Platforms:** Windows + macOS  
**Model:** Freemium SaaS (Free + Pro + Team tiers)

### What It Does
A beautiful, AI-powered desktop application that tracks user activity, analyzes productivity patterns, and provides actionable insights. Think RescueTime + Toggl + AI insights combined.

---

## 🏗️ Technology Stack

### Desktop Application
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | **Tauri 2.0** | Lightweight desktop app framework |
| Frontend | **React 18 + TypeScript** | UI framework |
| UI Components | **shadcn/ui** | Beautiful, accessible components |
| Styling | **Tailwind CSS** | Utility-first CSS |
| Animations | **Framer Motion** | Smooth animations |
| Charts | **Recharts** | Data visualization |
| State | **Zustand** | State management |
| PDF Export | **@react-pdf/renderer** | Report generation |

### Backend Service (Python)
| Component | Technology | Purpose |
|-----------|------------|---------|
| API Framework | **FastAPI** | REST API server |
| Activity Tracking | **ActivityWatch API** | App/window tracking |
| System Metrics | **psutil** | CPU, RAM, processes |
| AI Framework | **LangChain** | AI workflows |
| Structured AI | **Instructor** | JSON outputs from AI |
| LLM Provider | **OpenAI API** | GPT for analysis |
| Database | **SQLite** (local) | Local data storage |
| Cloud Database | **Supabase** | Cloud sync, auth, teams |
| Security | **Keyring** | Secure credential storage |

### External Services
| Service | Purpose |
|---------|---------|
| **ActivityWatch** | Core activity tracking (runs separately) |
| **OpenAI API** | AI-powered insights |
| **Supabase** | Authentication, cloud database, real-time |
| **Stripe** | Payment processing |

---

## 📁 Project Structure

```
productify-pro/
├── apps/
│   ├── desktop/                    # Tauri + React desktop app
│   │   ├── src/
│   │   │   ├── components/         # React components
│   │   │   │   ├── ui/            # shadcn/ui components
│   │   │   │   ├── dashboard/     # Dashboard components
│   │   │   │   ├── activity/      # Activity tracking UI
│   │   │   │   ├── analytics/     # Charts and stats
│   │   │   │   ├── settings/      # Settings panels
│   │   │   │   └── common/        # Shared components
│   │   │   ├── pages/             # App pages/routes
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   ├── stores/            # Zustand stores
│   │   │   ├── lib/               # Utilities
│   │   │   ├── styles/            # Global styles
│   │   │   ├── types/             # TypeScript types
│   │   │   └── App.tsx            # Main app component
│   │   ├── src-tauri/             # Tauri Rust backend
│   │   │   ├── src/
│   │   │   │   ├── main.rs        # Main entry
│   │   │   │   ├── commands/      # Tauri commands
│   │   │   │   ├── tray.rs        # System tray
│   │   │   │   └── lib.rs         # Library
│   │   │   ├── Cargo.toml         # Rust dependencies
│   │   │   └── tauri.conf.json    # Tauri config
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── backend/                    # Python FastAPI backend
│       ├── app/
│       │   ├── main.py            # FastAPI app entry
│       │   ├── api/
│       │   │   ├── routes/        # API endpoints
│       │   │   │   ├── activities.py
│       │   │   │   ├── analytics.py
│       │   │   │   ├── screenshots.py
│       │   │   │   ├── ai_insights.py
│       │   │   │   ├── settings.py
│       │   │   │   └── auth.py
│       │   │   └── deps.py        # Dependencies
│       │   ├── core/
│       │   │   ├── config.py      # Configuration
│       │   │   ├── security.py    # Security utils
│       │   │   └── database.py    # Database setup
│       │   ├── services/
│       │   │   ├── activity_tracker.py    # Activity tracking
│       │   │   ├── screenshot_service.py  # Screenshot capture
│       │   │   ├── url_analyzer.py        # URL analysis
│       │   │   ├── ai_service.py          # AI integration
│       │   │   ├── classification.py      # Work/not work
│       │   │   └── report_generator.py    # Reports
│       │   ├── models/
│       │   │   ├── activity.py    # Activity models
│       │   │   ├── screenshot.py  # Screenshot models
│       │   │   ├── settings.py    # Settings models
│       │   │   └── user.py        # User models
│       │   └── utils/
│       │       ├── helpers.py     # Helper functions
│       │       └── constants.py   # Constants
│       ├── requirements.txt
│       └── run.py                 # Start script
│
├── packages/
│   └── shared/                    # Shared types/utils
│       ├── types/
│       └── constants/
│
├── docs/                          # Documentation
│   ├── SETUP.md
│   ├── ARCHITECTURE.md
│   └── API.md
│
├── scripts/                       # Build/deploy scripts
│   ├── build.sh
│   └── package.sh
│
├── .github/
│   └── workflows/                 # CI/CD
│
├── PRODUCTIFY_PRO_SPECIFICATION.md  # This file
├── README.md
├── package.json                   # Root package.json (monorepo)
└── turbo.json                     # Turborepo config
```

---

## 🎨 Design System

### Theme: Glassmorphism

```css
/* Light Mode */
--bg-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--glass-bg: rgba(255, 255, 255, 0.25);
--glass-border: rgba(255, 255, 255, 0.3);
--glass-blur: blur(20px);
--text-primary: #1a1a2e;
--text-secondary: #4a4a6a;

/* Dark Mode (Default) */
--bg-primary: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f172a 100%);
--glass-bg: rgba(255, 255, 255, 0.05);
--glass-border: rgba(255, 255, 255, 0.1);
--glass-blur: blur(20px);
--text-primary: #ffffff;
--text-secondary: #a0a0b0;

/* Accent Colors */
--productive: #10b981;      /* Green */
--neutral: #f59e0b;         /* Amber */
--distracting: #ef4444;     /* Red */
--primary: #6366f1;         /* Indigo */
--secondary: #8b5cf6;       /* Purple */
```

### Component Styling

```css
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(99, 102, 241, 0.15);
}
```

### Animations (Framer Motion)

```typescript
// Page transitions
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

// Card entrance
const cardVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  hover: { y: -4, boxShadow: "0 12px 40px rgba(99, 102, 241, 0.2)" }
};

// Activity list items
const listItemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

// Number counters - animate counting up
// Progress bars - smooth fill animation
// Charts - draw-in animation on load
```

---

## 📋 Feature Specifications

### 1. Real-Time Activity Display

**Description:** Live feed showing current and recent activities with smooth animations.

**UI Components:**
- Current activity card (large, prominent)
- Activity timeline (scrollable list)
- Live timer for current activity
- Productivity indicator (color-coded)

**Data Structure:**
```typescript
interface Activity {
  id: string;
  appName: string;
  windowTitle: string;
  url?: string;
  domain?: string;
  platform?: string;          // "YouTube", "GitHub", etc.
  startTime: Date;
  endTime?: Date;
  duration: number;           // seconds
  category: Category;
  productivityScore: number;  // 0.0 - 1.0
  isProductive: boolean;
  metadata?: Record<string, any>;
}

type Category = 
  | "development" 
  | "design" 
  | "communication" 
  | "entertainment" 
  | "social_media" 
  | "research" 
  | "email" 
  | "meeting" 
  | "other";
```

**Update Frequency:** Every 1-3 seconds via WebSocket.

---

### 2. URL Detection & History

**Description:** Track all visited URLs, organize by platform, with deep insights.

**Supported Browsers:**
- Chrome, Firefox, Edge, Safari (Mac), Brave, Arc, Opera

**Data Extraction:**
- Full URL
- Domain
- Page title
- Platform detection (YouTube, GitHub, etc.)
- Time spent per URL/domain

**History Organization:**
- By platform (YouTube, GitHub, etc.)
- By category (Work, Learning, Entertainment)
- By date (Today, This Week, This Month)
- By productivity (Productive, Neutral, Distracting)

**Special Handling:**
- YouTube: Extract video ID, title, channel
- GitHub: Extract repo, issue/PR number
- Google Docs: Extract document name
- Private browsing: Option to track or ignore

---

### 3. YouTube Deep Tracking

**Description:** Detailed tracking of YouTube usage with content classification.

**Data Captured:**
```typescript
interface YouTubeActivity {
  videoId: string;
  videoTitle: string;
  channelName: string;
  watchDuration: number;
  watchPercentage?: number;
  timestamp: Date;
  category: "educational" | "entertainment" | "music" | "news" | "gaming" | "other";
  isProductive: boolean;
  aiClassification?: {
    category: string;
    confidence: number;
    reasoning: string;
  };
}
```

**Insights Generated:**
- Total YouTube time (daily/weekly/monthly)
- Content breakdown (% educational vs entertainment)
- Most watched channels
- Peak YouTube hours
- Binge detection alerts

---

### 4. AI Work/Not-Work Classification

**Description:** Intelligent classification of activities as productive or not.

**Classification Pipeline:**

1. **Rule-Based (Fast):**
   - Known productive apps: VS Code, IDE, Figma → Productive
   - Known distracting: Twitter, TikTok, Reddit → Distracting
   - User custom lists → User-defined

2. **AI Classification (When uncertain):**
   - Send URL + title + context to OpenAI
   - Use Instructor for structured output
   - Cache results for same URLs

3. **User Feedback Loop:**
   - User can override any classification
   - System learns from corrections

**Output Structure (via Instructor):**
```python
class ProductivityClassification(BaseModel):
    is_productive: bool
    productivity_score: float  # 0.0 - 1.0
    category: str
    reasoning: str
    confidence: float
```

---

### 5. Custom URL/Platform Lists

**Description:** User-managed lists for classification customization.

**List Types:**
- Productive sites/apps
- Distracting sites/apps
- Neutral sites/apps
- Excluded sites (don't track)

**Features:**
- Add by domain or full URL
- Bulk import/export
- Auto-detect new platforms (prompt user to classify)
- Wildcard support (*.mycompany.com)

---

### 6. Screenshot Capture

**Description:** Random screenshots for activity verification.

**Settings:**
- Interval: 10-15 minutes (random within range)
- Capture only during active use (not idle)
- Max 4 screenshots per hour
- Blur sensitive windows option
- Auto-delete after X days (7/30/90)

**Privacy Features:**
- Exclude specific apps (banking, passwords)
- Blur mode (capture but blur content)
- Pause capture (manual toggle)
- User can delete any screenshot

**Storage:**
- Compressed JPEG (quality: 70%)
- Local encrypted storage
- Optional cloud backup (Pro)

---

### 7. Daily Analytics Dashboard

**Components:**

1. **Header Stats (Cards):**
   - Total time tracked
   - Productivity percentage
   - Focus score (A+ to F)
   - Goal progress

2. **Productivity Timeline:**
   - Hourly productivity chart
   - Color-coded by productivity level

3. **App/Category Breakdown:**
   - Top apps (with time)
   - Category pie chart
   - Top distractions

4. **Best/Worst Hours:**
   - Peak productive hours
   - Low productivity periods

5. **AI Insights:**
   - Personalized recommendations
   - Pattern detection
   - Comparison to previous days

---

### 8. System Tray / Menu Bar

**Tray Icon Features:**
- Status indicator (tracking/paused/offline)
- Current activity & timer
- Quick stats (today's time, productivity)

**Menu Options:**
- Pause/Resume tracking
- Start focus session
- Take screenshot now
- Open dashboard
- Settings
- Quit

---

### 9. Onboarding Flow

**Steps:**
1. Welcome screen
2. User type selection (Developer, Designer, etc.)
3. Work apps selection
4. Daily goals setup
5. OpenAI API key input (optional)
6. Permissions request
7. Completion & dashboard

---

### 10. Settings

**Categories:**
- General (startup, theme, language)
- Notifications (alerts, reminders)
- Screenshots (interval, quality, exclusions)
- AI Settings (API key, model, offline queue)
- Privacy (exclusions, retention, app lock)
- Keyboard shortcuts
- Data (export, backup, delete)
- Work schedule

---

### 11. Offline Mode

**Behavior:**
- Full tracking works offline (stored in SQLite)
- AI features queue requests
- Syncs when online
- Visual indicator of offline status
- Queue management in settings

---

### 12. Focus Timer (v1.5)

**Features:**
- Pomodoro-style timer
- Custom session lengths
- Break reminders
- Block distractions during focus
- Focus streak tracking

---

### 13. Goals & Streaks (v1.5)

**Goal Types:**
- Daily productive hours
- Max distraction time
- Focus sessions completed
- Specific app usage limits

**Streak Tracking:**
- Consecutive days meeting goals
- Badges and rewards
- Weekly challenges

---

### 14. Website Blocking (v1.5)

**Block Modes:**
- Block specific sites
- Block categories
- Block during focus only
- Block during work hours

**Bypass Options:**
- No bypass (strict)
- Wait timer
- Type reason
- Password protected

---

### 15. Team Features (v2.0)

**Structure:**
- Organizations → Teams → Members
- Roles: Owner, Admin, Manager, Member

**Privacy Controls:**
- Configurable visibility per data type
- Members can mark time as "personal"

**Team Reports:**
- Productivity overview
- Department comparisons
- Workload balance
- Burnout indicators

---

## 🔌 API Endpoints

### Activities
```
GET    /api/activities              # List activities
GET    /api/activities/current      # Current activity
GET    /api/activities/summary      # Daily summary
POST   /api/activities/manual       # Manual entry
DELETE /api/activities/{id}         # Delete activity
```

### Analytics
```
GET    /api/analytics/daily         # Daily stats
GET    /api/analytics/weekly        # Weekly stats
GET    /api/analytics/monthly       # Monthly stats
GET    /api/analytics/trends        # Trend analysis
```

### Screenshots
```
GET    /api/screenshots             # List screenshots
GET    /api/screenshots/{id}        # Get screenshot
DELETE /api/screenshots/{id}        # Delete screenshot
POST   /api/screenshots/capture     # Capture now
```

### AI Insights
```
POST   /api/ai/classify             # Classify activity
GET    /api/ai/insights             # Get insights
GET    /api/ai/report/daily         # Daily AI report
GET    /api/ai/report/weekly        # Weekly AI report
POST   /api/ai/queue/process        # Process offline queue
```

### Settings
```
GET    /api/settings                # Get all settings
PUT    /api/settings                # Update settings
GET    /api/settings/lists          # Get custom lists
PUT    /api/settings/lists          # Update custom lists
```

### Auth (Supabase)
```
POST   /api/auth/login              # Login
POST   /api/auth/register           # Register
POST   /api/auth/logout             # Logout
GET    /api/auth/user               # Current user
```

---

## 📦 Dependencies

### Desktop (package.json)
```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.0",
    "framer-motion": "^10.18.0",
    "recharts": "^2.10.0",
    "@react-pdf/renderer": "^3.1.0",
    "date-fns": "^3.2.0",
    "zod": "^3.22.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### Backend (requirements.txt)
```
# Core
fastapi==0.109.0
uvicorn==0.27.0
pydantic==2.5.0
python-dotenv==1.0.0

# Data Collection
psutil==5.9.8
aw-client==0.5.13
mss==9.0.1
pillow==10.2.0

# Database
sqlalchemy==2.0.25
aiosqlite==0.19.0

# AI
langchain==0.1.0
langchain-openai==0.0.5
instructor==0.5.0
openai==1.10.0

# Security
keyring==24.3.0
cryptography==41.0.0

# Utilities
httpx==0.26.0
websockets==12.0
apscheduler==3.10.4
```

---

## 🔒 Security Requirements

1. **API Key Storage:** Use Keyring for secure storage
2. **Local Data:** Encrypt SQLite database
3. **Screenshots:** Encrypted storage folder
4. **App Lock:** Optional PIN/password protection
5. **GDPR Compliance:** Export all data, delete all data options

---

## 📝 Development Guidelines

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Python: Black + isort + mypy
- Commit messages: Conventional Commits

### Testing
- React: Vitest + React Testing Library
- Python: pytest + pytest-asyncio
- E2E: Playwright

### Git Workflow
- main: Production
- develop: Development
- feature/*: New features
- fix/*: Bug fixes

---

## 🚀 Build Commands

```bash
# Development
npm run dev              # Start frontend dev server
npm run tauri dev        # Start Tauri dev
python -m app.main       # Start backend

# Production Build
npm run build            # Build frontend
npm run tauri build      # Build Tauri app

# Testing
npm run test             # Frontend tests
pytest                   # Backend tests
```

---

## 📅 Development Phases

### Phase 1: Foundation (Week 1)
- [ ] Project setup (Tauri + React + FastAPI)
- [ ] Design system (glassmorphism theme)
- [ ] Basic UI components (shadcn/ui)
- [ ] ActivityWatch integration
- [ ] Basic activity display

### Phase 2: Core Features (Week 2)
- [ ] Real-time activity tracking
- [ ] URL detection & history
- [ ] YouTube deep tracking
- [ ] Daily analytics dashboard
- [ ] System tray integration

### Phase 3: Intelligence (Week 3)
- [ ] AI classification (OpenAI + Instructor)
- [ ] Custom lists management
- [ ] Screenshot capture
- [ ] Offline mode with queue
- [ ] Settings panel

### Phase 4: Polish (Week 4)
- [ ] Onboarding flow
- [ ] Animations (Framer Motion)
- [ ] PDF export
- [ ] Keyboard shortcuts
- [ ] Testing & bug fixes

### Phase 5: Pro Features (Week 5-6)
- [ ] Focus timer
- [ ] Goals & streaks
- [ ] Website blocking
- [ ] Smart notifications
- [ ] Weekly AI reports

### Phase 6: Monetization (Week 7-8)
- [ ] Stripe integration
- [ ] Team features (basic)
- [ ] Cloud sync (Supabase)
- [ ] Pro tier features

---

## 📚 Open Source Repositories to Use

### Core (Must Use)
| Repo | Purpose | License | Modify? |
|------|---------|---------|---------|
| ActivityWatch/activitywatch | Activity data source | MPL-2.0 | Use API only |
| giampaolo/psutil | System metrics | BSD | Import only |
| tauri-apps/tauri | Desktop framework | MIT | Use as base |
| shadcn/ui | UI components | MIT | Copy & modify |

### Supporting (Import as Libraries)
| Repo | Purpose | License |
|------|---------|---------|
| langchain-ai/langchain | AI workflows | MIT |
| jxnl/instructor | Structured AI output | MIT |
| tiangolo/fastapi | Backend API | MIT |
| supabase/supabase | Cloud services | Apache 2.0 |
| recharts/recharts | Charts | MIT |
| diegomura/react-pdf | PDF generation | MIT |
| jaraco/keyring | Secure storage | MIT |

---

## ✅ Success Criteria

1. **Performance:** App uses <100MB RAM, <2% CPU
2. **Reliability:** 99.9% tracking accuracy
3. **Speed:** Dashboard loads in <2 seconds
4. **Privacy:** All data encrypted, user controls everything
5. **UX:** Onboarding completion >80%
6. **Revenue:** 5% free-to-paid conversion

---

*This specification is the single source of truth for the Productify Pro project.*
