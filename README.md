# Productify Pro

AI-powered productivity tracking desktop application that helps you understand and improve your digital habits.

---

## Features

- **Real-time Activity Tracking** - Monitor your app usage and browsing activity
- **AI-Powered Insights** - Get personalized productivity recommendations
- **Smart Categorization** - Automatic classification of apps as productive, neutral, or distracting
- **Focus Sessions** - Pomodoro-style timer with distraction blocking
- **Team Collaboration** - Share and compare productivity with your team
- **Browser Extension** - Track web browsing across all sites
- **Goals & Streaks** - Set productivity goals and maintain streaks
- **Detailed Reports** - Weekly and monthly productivity reports
- **License System** - 7-day trial with Stripe payment integration

---

## Project Structure

```
productify-pro/
├── apps/
│   ├── desktop/          # Tauri + React desktop application
│   │   ├── src/          # React frontend
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── stores/
│   │   │   └── hooks/
│   │   └── src-tauri/    # Rust backend
│   ├── backend/          # FastAPI Python backend
│   │   ├── app/
│   │   │   ├── api/routes/
│   │   │   ├── models/
│   │   │   └── services/
│   │   └── Dockerfile
│   ├── landing/          # Next.js landing page
│   │   └── Dockerfile
│   └── extension/        # Chrome browser extension
│       ├── manifest.json
│       ├── background.js
│       ├── content.js
│       └── popup.html
├── scripts/              # Build & deploy scripts
│   ├── build.sh
│   ├── deploy.sh
│   └── release.sh
├── docker-compose.yml    # Docker configuration
├── coolify.json          # Coolify deployment config
└── README.md
```

---

## Tech Stack

### Desktop App
- **Framework**: [Tauri 2.0](https://tauri.app/) (Rust + WebView)
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + shadcn/ui
- **State**: Zustand
- **Animations**: Framer Motion

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL + SQLAlchemy (async)
- **Auth**: JWT tokens
- **Payments**: Stripe
- **AI**: OpenAI GPT-4

### Landing Page
- **Framework**: Next.js 14
- **Styling**: TailwindCSS
- **Animations**: Framer Motion

### Browser Extension
- **Manifest**: V3
- **Platforms**: Chrome, Edge, Brave

---

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Rust (for Tauri)
- PostgreSQL (or Docker)
- ActivityWatch (optional, for enhanced tracking)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/productify-pro.git
   cd productify-pro
   ```

2. **Start the backend**
   ```bash
   cd apps/backend
   python -m venv venv
   source venv/bin/activate  # or `venv\Scripts\activate` on Windows
   pip install -r requirements.txt
   cp .env.example .env      # Configure your environment
   uvicorn app.main:app --reload
   ```

3. **Start the desktop app**
   ```bash
   cd apps/desktop
   npm install
   npm run tauri dev
   ```

4. **Start the landing page** (optional)
   ```bash
   cd apps/landing
   npm install
   npm run dev
   ```

---

## Building for Production

### Desktop App
```bash
./scripts/build.sh release
```

Installers will be created in:
- **Windows**: `apps/desktop/src-tauri/target/release/bundle/msi/`
- **macOS**: `apps/desktop/src-tauri/target/release/bundle/dmg/`
- **Linux**: `apps/desktop/src-tauri/target/release/bundle/deb/`

### Docker Deployment
```bash
./scripts/deploy.sh local      # Local deployment
./scripts/deploy.sh production # Production deployment
```

---

## Deployment

### Using Coolify

1. Connect your repository to Coolify
2. Import `coolify.json` configuration
3. Set environment variables
4. Deploy!

### Using Docker Compose

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your values
nano .env

# Start services
docker-compose up -d
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET_KEY` | Secret key for JWT tokens |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `OPENAI_API_KEY` | OpenAI API key (optional) |
| `LICENSE_SECRET_KEY` | License validation key |

See `apps/backend/.env.production` for complete list.

---

## API Documentation

API documentation is available at:
- **Development**: http://localhost:8000/docs
- **Production**: https://api.productifypro.com/docs

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/auth/*` | Authentication (login, register, etc.) |
| `/api/activities/*` | Activity tracking |
| `/api/analytics/*` | Productivity analytics |
| `/api/billing/*` | Subscription management |
| `/api/teams/*` | Team collaboration |
| `/api/updates/*` | App auto-updates |

---

## Browser Extension

### Installation (Development)

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `apps/extension` folder

### Features

- Automatic URL tracking
- Platform detection (YouTube, GitHub, Netflix, etc.)
- Video/course progress tracking
- Login sync with desktop app
- Local storage with server sync

---

## Auto-Updates

The desktop app supports automatic updates via Tauri's updater plugin:

1. Update version in `tauri.conf.json`
2. Run `./scripts/release.sh <version>`
3. Upload installers to release server
4. Users will be notified automatically

---

## Scripts

| Script | Description |
|--------|-------------|
| `./scripts/build.sh` | Build desktop app for all platforms |
| `./scripts/deploy.sh` | Deploy to Docker/Coolify |
| `./scripts/release.sh` | Create and publish new release |

---

## Business Model

| Tier | Price | Features |
|------|-------|----------|
| **Free Trial** | $0 (7 days) | Full access to all features |
| **Personal** | $9/mo | Unlimited history, AI insights |
| **Pro** | $19/mo | Advanced reports, priority support |
| **Team** | $7/user/mo | Team dashboards, admin controls |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Make your changes
4. Run tests
5. Submit a pull request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

Open source components used under their respective licenses.

---

## Acknowledgments

Built with amazing open source projects:
- [Tauri](https://tauri.app)
- [ActivityWatch](https://activitywatch.net)
- [shadcn/ui](https://ui.shadcn.com)
- [FastAPI](https://fastapi.tiangolo.com)
- [Next.js](https://nextjs.org)

---

## Support

- **Documentation**: https://docs.productifypro.com
- **Issues**: https://github.com/yourusername/productify-pro/issues
- **Email**: support@productifypro.com

---

**Built with love by the Productify Pro team**
