# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Productify Pro is an AI-powered desktop productivity tracking application. It monitors application usage and web browsing, provides AI-driven insights, and supports team collaboration features.

## Development Commands

### Root (Monorepo)
```bash
npm run dev              # Run all apps in dev mode via Turbo
npm run build            # Build all apps
npm run lint             # Lint all apps
```

### Backend (FastAPI - apps/backend/)
```bash
cd apps/backend
source venv/bin/activate  # Activate virtual environment
python run.py             # Start server with hot reload (port 8000)
# OR
uvicorn app.main:app --reload --port 8000
```

### Desktop App (Tauri + React - apps/desktop/)
```bash
cd apps/desktop
npm run tauri:dev         # Start Tauri desktop app with hot reload
npm run dev               # Start Vite dev server only (port 1420)
npm run build             # Build frontend
npm run tauri:build       # Build desktop installer
npm run lint              # ESLint
```

### Landing Page (Next.js - apps/landing/)
```bash
cd apps/landing
npm run dev               # Start Next.js dev server (port 3000)
npm run build             # Production build
```

### Build Scripts
```bash
./scripts/build.sh release          # Build desktop app for all platforms
./scripts/build.sh release macos    # Build for specific platform
./scripts/deploy.sh local           # Deploy locally with Docker Compose
./scripts/deploy.sh production      # Build and push images for production
```

## Architecture

### Monorepo Structure
- **apps/backend/** - FastAPI Python backend with SQLAlchemy async ORM
- **apps/desktop/** - Tauri 2.0 desktop app (Rust backend + React frontend)
- **apps/landing/** - Next.js marketing site
- **apps/extension/** - Chrome extension (Manifest V3)
- **packages/shared/** - Shared TypeScript types

### Backend Architecture (apps/backend/app/)
- **api/routes/** - FastAPI route modules (auth, activities, analytics, teams, billing, etc.)
- **models/** - SQLAlchemy ORM models (User, Activity, Team, Goal, Screenshot, etc.)
- **services/** - Business logic (ai_service, classification, activity_tracker, stripe_service, etc.)
- **core/** - Database setup, config, security utilities

Key entry point: `app/main.py` - Initializes FastAPI, registers routes, manages WebSocket connections, starts background tasks.

### Desktop Frontend (apps/desktop/src/)
- **pages/** - React route components
- **components/** - Reusable UI components (shadcn/ui + Radix)
- **stores/** - Zustand state stores (authStore, activityStore, settingsStore, teamStore)
- **hooks/** - Custom hooks (useRealTimeActivity, useSettings)
- **lib/api/** - Axios API client and endpoint functions

### Tauri Backend (apps/desktop/src-tauri/)
- **src/main.rs** - Tauri app setup and plugin registration
- **src/commands.rs** - IPC commands exposed to frontend
- **src/state.rs** - App state management
- **tauri.conf.json** - Tauri configuration

### Data Flow
1. Desktop app connects via WebSocket to `/ws/activities` for real-time updates
2. Backend polls ActivityWatch (localhost:5600) for OS-level activity data
3. Activities are classified via `services/classification.py`
4. AI insights generated via OpenAI integration in `services/ai_service.py`
5. Frontend state managed with Zustand stores, server cache with React Query

### Database
- Development: SQLite (configured via `USE_SQLITE=true`)
- Production: PostgreSQL via Supabase
- Models use UUID string IDs for cross-platform compatibility

### Authentication
- JWT tokens with bcrypt password hashing
- Optional Google OAuth
- Token refresh flow

### Key Integrations
- **ActivityWatch** - OS-level activity monitoring (optional, falls back to mock data)
- **OpenAI** - AI-powered insights and classification (GPT-4o-mini)
- **Stripe** - Subscription billing
- **Firebase Storage** - Screenshot cloud storage
- **Supabase** - Production PostgreSQL database
- **Sentry** - Error tracking

## Environment Setup

Backend requires `.env` file (copy from `.env.example`):
- `USE_SQLITE=true` for local development
- `JWT_SECRET_KEY` for authentication
- `OPENAI_API_KEY` for AI features (optional)
- `STRIPE_SECRET_KEY` for billing (optional)

Desktop requires `VITE_API_URL` pointing to backend (default: http://localhost:8000).

## API Documentation

FastAPI auto-generates docs at:
- http://localhost:8000/docs (Swagger UI)
- http://localhost:8000/redoc (ReDoc)

## Browser Extension

Load unpacked from `apps/extension/` in Chrome developer mode. Syncs with desktop app via shared authentication.
