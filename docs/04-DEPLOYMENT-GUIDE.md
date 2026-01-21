# PRODUCTIFY PRO - DEPLOYMENT GUIDE

**Step-by-step guide to deploy Productify Pro to production**

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Deployment](#backend-deployment)
3. [Desktop App Build](#desktop-app-build)
4. [Landing Page Deployment](#landing-page-deployment)
5. [External Services Setup](#external-services-setup)
6. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Prerequisites

### Required Tools
- Python 3.10+
- Node.js 18+
- npm or pnpm
- Rust (for Tauri desktop app)
- PostgreSQL 14+ (production database)

### Required Accounts
- Stripe (billing)
- OpenAI (AI features)
- Firebase (cloud storage)
- Google Cloud (OAuth)
- Resend (email)
- Supabase (optional, for managed PostgreSQL)

---

## Backend Deployment

### Option 1: Docker Deployment

#### Step 1: Create Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Step 2: Create docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./apps/backend
    ports:
      - "8000:8000"
    environment:
      - APP_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
    restart: always

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_USER=productify
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=productify
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    restart: always

volumes:
  postgres_data:
```

#### Step 3: Deploy

```bash
# Build and start
docker-compose up -d --build

# Check logs
docker-compose logs -f backend

# Run migrations
docker-compose exec backend python -m alembic upgrade head
```

---

### Option 2: Manual Server Deployment

#### Step 1: Set Up Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python
sudo apt install python3.10 python3.10-venv python3-pip -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install nginx
sudo apt install nginx -y
```

#### Step 2: Set Up Database

```bash
# Create database user
sudo -u postgres createuser productify_user --pwprompt

# Create database
sudo -u postgres createdb productify_db --owner=productify_user
```

#### Step 3: Deploy Application

```bash
# Clone repository
git clone https://github.com/your-repo/productify-pro.git
cd productify-pro/apps/backend

# Create virtual environment
python3.10 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
nano .env  # Edit with your values
```

#### Step 4: Set Up Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/productify.service
```

```ini
[Unit]
Description=Productify Pro Backend
After=network.target postgresql.service

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/opt/productify-pro/apps/backend
Environment="PATH=/opt/productify-pro/apps/backend/venv/bin"
EnvironmentFile=/opt/productify-pro/apps/backend/.env
ExecStart=/opt/productify-pro/apps/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable productify
sudo systemctl start productify
```

#### Step 5: Configure Nginx

```nginx
# /etc/nginx/sites-available/productify
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/productify /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Set up SSL
sudo certbot --nginx -d api.yourdomain.com
```

---

### Option 3: Supabase + Railway/Render

#### Using Supabase for Database

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Get connection string from Settings > Database
3. Update `.env`:

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_DB_URL=postgresql+asyncpg://postgres:xxx@db.xxx.supabase.co:5432/postgres
```

#### Using Railway

1. Connect GitHub repo to [Railway](https://railway.app)
2. Add environment variables
3. Deploy automatically on push

#### Using Render

1. Create Web Service on [Render](https://render.com)
2. Connect GitHub repo
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## Desktop App Build

### Development

```bash
cd apps/desktop

# Install dependencies
npm install

# Run development
npm run tauri:dev
```

### Production Build

```bash
# Build for current platform
npm run tauri:build

# Output locations:
# macOS: src-tauri/target/release/bundle/dmg/
# Windows: src-tauri/target/release/bundle/msi/
# Linux: src-tauri/target/release/bundle/deb/
```

### Cross-Platform Builds

Use GitHub Actions for automated cross-platform builds:

```yaml
# .github/workflows/build.yml
name: Build Desktop App

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies
        run: |
          cd apps/desktop
          npm install

      - name: Build
        run: |
          cd apps/desktop
          npm run tauri:build

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: desktop-${{ matrix.platform }}
          path: apps/desktop/src-tauri/target/release/bundle/
```

### Configure Desktop App API URL

Edit `apps/desktop/.env`:

```bash
VITE_API_URL=https://api.yourdomain.com
```

---

## Landing Page Deployment

### Vercel (Recommended)

```bash
cd apps/landing

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

### Netlify

```bash
# Build
npm run build

# Deploy output folder
# Point to: apps/landing/out
```

### Environment Variables

Set in Vercel/Netlify dashboard:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
```

---

## External Services Setup

### 1. Stripe Setup

1. Create account at [stripe.com](https://stripe.com)
2. Get API keys from Dashboard > Developers > API keys
3. Create products:
   - Personal Plan ($9/mo)
   - Pro Plan ($19/mo)
   - Team Plan ($15/user/mo)
4. Get price IDs for each product
5. Set up webhook:
   - URL: `https://api.yourdomain.com/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`
6. Get webhook signing secret

```bash
# .env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PERSONAL=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_TEAM=price_xxx
```

### 2. OpenAI Setup

1. Create account at [platform.openai.com](https://platform.openai.com)
2. Generate API key from API Keys section
3. Add payment method for usage

```bash
# .env
OPENAI_API_KEY=sk-xxx
```

### 3. Firebase Setup

1. Create project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Storage
3. Create service account:
   - Settings > Service Accounts > Generate new private key
4. Download JSON key file

```bash
# .env
FIREBASE_CREDENTIALS_PATH=/path/to/firebase-credentials.json
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials:
   - Authorized redirect URIs: `https://api.yourdomain.com/api/auth/google/callback`
3. Get Client ID and Secret

```bash
# .env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

### 5. Resend Email Setup

1. Create account at [resend.com](https://resend.com)
2. Verify your domain
3. Create API key

```bash
# .env
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@yourdomain.com
```

### 6. Deepgram Setup (Optional)

1. Create account at [deepgram.com](https://deepgram.com)
2. Create API key

```bash
# .env
DEEPGRAM_API_KEY=xxx
```

### 7. Sentry Setup (Optional)

1. Create project at [sentry.io](https://sentry.io)
2. Get DSN from project settings

```bash
# .env
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## Database Migrations

### Run Migrations

```bash
cd apps/backend
source venv/bin/activate

# Create migration
alembic revision --autogenerate -m "Description"

# Run migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Initial Schema

Tables created automatically:
- users
- user_settings
- activities
- screenshots
- goals
- teams
- team_members
- focus_sessions
- integrations

---

## Post-Deployment Checklist

### Security

- [ ] Strong JWT_SECRET_KEY (min 32 chars, random)
- [ ] HTTPS enabled (SSL certificates)
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] Database password is strong
- [ ] Firebase rules configured
- [ ] Stripe webhook signature validation

### Testing

- [ ] User registration works
- [ ] User login works
- [ ] Google OAuth works
- [ ] Activity tracking works
- [ ] Screenshots upload works
- [ ] Stripe checkout works
- [ ] Stripe webhook processes correctly
- [ ] Email sending works
- [ ] PDF reports generate
- [ ] WebSocket connections work

### Monitoring

- [ ] Sentry configured
- [ ] Health check endpoint works
- [ ] Logs are being collected
- [ ] Database backups scheduled

### Performance

- [ ] Redis caching enabled
- [ ] Database connection pooling
- [ ] CDN for static assets
- [ ] Gzip compression enabled

---

## Backup Strategy

### Database Backup

```bash
# Using the included backup script
cd apps/backend
python scripts/backup.py

# Or manual PostgreSQL backup
pg_dump -U productify_user productify_db > backup.sql

# Restore
psql -U productify_user productify_db < backup.sql
```

### Automated Backups

```bash
# Add to crontab
0 2 * * * /opt/productify-pro/apps/backend/venv/bin/python /opt/productify-pro/apps/backend/scripts/backup.py
```

---

## Troubleshooting

### Common Issues

**Database connection error:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection string
psql $DATABASE_URL
```

**WebSocket not connecting:**
```bash
# Check nginx config for WebSocket support
# Ensure proxy_read_timeout is high enough
```

**Stripe webhook failing:**
```bash
# Check webhook signature
# Verify endpoint URL is correct
# Check Stripe dashboard for failed webhooks
```

**Screenshots not uploading:**
```bash
# Check Firebase credentials
# Verify storage bucket name
# Check CORS settings in Firebase
```

---

## Scaling Considerations

### Horizontal Scaling

1. Use Redis for session/cache sharing
2. Use load balancer for multiple backend instances
3. Use Redis pub/sub for WebSocket scaling
4. Consider Kubernetes for orchestration

### Database Scaling

1. Add read replicas for heavy read workloads
2. Use connection pooling (PgBouncer)
3. Index frequently queried columns
4. Archive old data periodically

---

*Deployment guide for Productify Pro production setup.*
