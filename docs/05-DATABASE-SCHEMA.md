# PRODUCTIFY PRO - DATABASE SCHEMA

**Complete database model reference**

---

## Overview

- **Development:** SQLite
- **Production:** PostgreSQL (Supabase)
- **ORM:** SQLAlchemy 2.0 (async)
- **ID Format:** UUID strings for cross-platform compatibility

---

## Core Tables

### users

Primary user account table.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (string) | No | Primary key |
| email | String(255) | No | Unique email address |
| hashed_password | String(255) | Yes | Bcrypt hash (null for OAuth) |
| name | String(100) | Yes | Display name |
| avatar_url | String(500) | Yes | Profile picture URL |
| plan | String(50) | No | free/personal/pro/team |
| stripe_customer_id | String(255) | Yes | Stripe customer ID |
| stripe_subscription_id | String(255) | Yes | Active subscription ID |
| trial_ends_at | DateTime | Yes | Trial expiration |
| is_trial_active | Boolean | No | Trial status |
| is_active | Boolean | No | Account active |
| is_admin | Boolean | No | Admin privileges |
| email_verified | Boolean | No | Email verification status |
| google_id | String(255) | Yes | Google OAuth ID |
| created_at | DateTime | No | Account creation |
| updated_at | DateTime | No | Last update |
| last_login_at | DateTime | Yes | Last login timestamp |
| onboarding_completed | Boolean | No | Onboarding status |
| profile_type | String(50) | Yes | developer/designer/manager/etc |

**Indexes:**
- `ix_users_email` (unique)
- `ix_users_google_id`
- `ix_users_stripe_customer_id`

---

### user_settings

Per-user configuration settings.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (string) | No | Primary key |
| user_id | UUID (string) | No | Foreign key to users |
| theme | String(20) | No | dark/light/system |
| language | String(10) | No | en/es/fr/de/ja |
| start_on_boot | Boolean | No | Auto-start on login |
| tracking_enabled | Boolean | No | Activity tracking on/off |
| screenshots_enabled | Boolean | No | Screenshot capture on/off |
| screenshot_interval | Integer | No | Capture interval (seconds) |
| screenshot_quality | String(20) | No | low/medium/high |
| blur_screenshots | Boolean | No | Auto-blur sensitive content |
| incognito_mode | Boolean | No | Privacy mode active |
| data_retention_days | Integer | No | Days to keep data |
| notifications_enabled | Boolean | No | Push notifications |
| break_reminders | Boolean | No | Break reminder alerts |
| idle_timeout | Integer | No | AFK detection seconds |
| track_idle | Boolean | No | Track idle time |
| openai_api_key | String(500) | Yes | User's OpenAI key |
| created_at | DateTime | No | Creation timestamp |
| updated_at | DateTime | No | Last update |

**Relationships:**
- `user` -> users (one-to-one)

---

### activities

Tracked application/website activities.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (string) | No | Primary key |
| user_id | UUID (string) | No | Foreign key to users |
| app_name | String(255) | No | Application name |
| window_title | String(1000) | Yes | Window/tab title |
| url | String(2000) | Yes | URL (for browsers) |
| category | String(100) | Yes | Activity category |
| is_productive | Boolean | Yes | Productivity classification |
| is_afk | Boolean | No | Away from keyboard |
| start_time | DateTime | No | Activity start |
| end_time | DateTime | Yes | Activity end |
| duration | Integer | Yes | Duration in seconds |
| created_at | DateTime | No | Record creation |

**Indexes:**
- `ix_activities_user_id`
- `ix_activities_start_time`
- `ix_activities_app_name`
- Composite: `(user_id, start_time)`

---

### screenshots

Captured screenshots with metadata.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (string) | No | Primary key |
| user_id | UUID (string) | No | Foreign key to users |
| file_path | String(1000) | No | Local file path |
| cloud_url | String(2000) | Yes | Firebase storage URL |
| thumbnail_url | String(2000) | Yes | Thumbnail URL |
| app_name | String(255) | Yes | Active app when captured |
| window_title | String(1000) | Yes | Active window title |
| is_blurred | Boolean | No | Screenshot blurred |
| file_size | Integer | Yes | File size in bytes |
| width | Integer | Yes | Image width |
| height | Integer | Yes | Image height |
| captured_at | DateTime | No | Capture timestamp |
| created_at | DateTime | No | Record creation |

**Indexes:**
- `ix_screenshots_user_id`
- `ix_screenshots_captured_at`

---

### goals

User productivity goals.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (string) | No | Primary key |
| user_id | UUID (string) | No | Foreign key to users |
| name | String(255) | No | Goal name |
| type | String(50) | No | daily_productive/daily_distraction/etc |
| target_hours | Float | No | Target hours |
| is_active | Boolean | No | Goal active |
| created_at | DateTime | No | Creation timestamp |
| updated_at | DateTime | No | Last update |

**Indexes:**
- `ix_goals_user_id`

---

### focus_sessions

Focus/Pomodoro tracking sessions.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (string) | No | Primary key |
| user_id | UUID (string) | No | Foreign key to users |
| title | String(255) | Yes | Session title |
| duration_minutes | Integer | No | Planned duration |
| actual_duration | Integer | Yes | Actual duration |
| status | String(20) | No | active/paused/completed/cancelled |
| blocked_apps | JSON | Yes | List of blocked apps |
| blocked_websites | JSON | Yes | List of blocked sites |
| distraction_count | Integer | No | Blocked access attempts |
| started_at | DateTime | No | Session start |
| ended_at | DateTime | Yes | Session end |
| created_at | DateTime | No | Record creation |

**Indexes:**
- `ix_focus_sessions_user_id`
- `ix_focus_sessions_status`

---

## Team Tables

### teams

Team/organization entities.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (string) | No | Primary key |
| name | String(255) | No | Team name |
| description | Text | Yes | Team description |
| owner_id | UUID (string) | No | Foreign key to users |
| plan | String(50) | No | free/team |
| max_members | Integer | No | Member limit |
| settings | JSON | Yes | Team-level settings |
| created_at | DateTime | No | Creation timestamp |
| updated_at | DateTime | No | Last update |

**Indexes:**
- `ix_teams_owner_id`

---

### team_members

Team membership junction table.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (string) | No | Primary key |
| team_id | UUID (string) | No | Foreign key to teams |
| user_id | UUID (string) | No | Foreign key to users |
| role | String(20) | No | owner/admin/member |
| invited_by | UUID (string) | Yes | Who sent invite |
| joined_at | DateTime | No | Join timestamp |
| is_active | Boolean | No | Membership active |

**Indexes:**
- Composite unique: `(team_id, user_id)`

---

### team_invites

Pending team invitations.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (string) | No | Primary key |
| team_id | UUID (string) | No | Foreign key to teams |
| email | String(255) | No | Invitee email |
| role | String(20) | No | Assigned role |
| token | String(255) | No | Unique invite token |
| invited_by | UUID (string) | No | Inviter user ID |
| expires_at | DateTime | No | Expiration time |
| accepted_at | DateTime | Yes | Acceptance time |
| created_at | DateTime | No | Creation timestamp |

**Indexes:**
- `ix_team_invites_token` (unique)
- `ix_team_invites_email`

---

## Integration Tables

### integrations

Connected third-party services.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (string) | No | Primary key |
| user_id | UUID (string) | No | Foreign key to users |
| provider | String(50) | No | github/slack/google/etc |
| access_token | String(1000) | Yes | Encrypted OAuth token |
| refresh_token | String(1000) | Yes | Encrypted refresh token |
| token_expires_at | DateTime | Yes | Token expiration |
| provider_user_id | String(255) | Yes | External user ID |
| metadata | JSON | Yes | Provider-specific data |
| is_active | Boolean | No | Integration active |
| created_at | DateTime | No | Creation timestamp |
| updated_at | DateTime | No | Last update |

**Indexes:**
- Composite unique: `(user_id, provider)`

---

### calendar_events

Synced calendar events.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (string) | No | Primary key |
| user_id | UUID (string) | No | Foreign key to users |
| integration_id | UUID (string) | No | Foreign key to integrations |
| external_id | String(255) | No | Calendar provider event ID |
| title | String(500) | Yes | Event title |
| description | Text | Yes | Event description |
| start_time | DateTime | No | Event start |
| end_time | DateTime | No | Event end |
| is_all_day | Boolean | No | All-day event |
| location | String(500) | Yes | Event location |
| attendees | JSON | Yes | Attendee list |
| is_meeting | Boolean | No | Classified as meeting |
| created_at | DateTime | No | Record creation |
| updated_at | DateTime | No | Last update |

**Indexes:**
- `ix_calendar_events_user_id`
- `ix_calendar_events_start_time`

---

## Rules Tables

### classification_rules

Custom app/site classification rules.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (string) | No | Primary key |
| user_id | UUID (string) | Yes | User-specific (null=global) |
| app_name | String(255) | Yes | App name pattern |
| url_pattern | String(500) | Yes | URL regex pattern |
| category | String(100) | No | Assigned category |
| is_productive | Boolean | No | Productivity classification |
| priority | Integer | No | Rule priority (higher wins) |
| is_active | Boolean | No | Rule active |
| created_at | DateTime | No | Creation timestamp |

**Indexes:**
- `ix_classification_rules_user_id`
- `ix_classification_rules_app_name`

---

## Work Session Tables

### work_sessions

Manual work session tracking.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (string) | No | Primary key |
| user_id | UUID (string) | No | Foreign key to users |
| title | String(255) | Yes | Session title |
| description | Text | Yes | Session notes |
| project | String(255) | Yes | Project name |
| tags | JSON | Yes | Tag array |
| started_at | DateTime | No | Session start |
| ended_at | DateTime | Yes | Session end |
| duration | Integer | Yes | Duration seconds |
| is_billable | Boolean | No | Billable session |
| created_at | DateTime | No | Record creation |

**Indexes:**
- `ix_work_sessions_user_id`
- `ix_work_sessions_started_at`

---

## Entity Relationship Diagram (Text)

```
users
  │
  ├──< user_settings (1:1)
  │
  ├──< activities (1:many)
  │
  ├──< screenshots (1:many)
  │
  ├──< goals (1:many)
  │
  ├──< focus_sessions (1:many)
  │
  ├──< work_sessions (1:many)
  │
  ├──< integrations (1:many)
  │     │
  │     └──< calendar_events (1:many)
  │
  ├──< classification_rules (1:many)
  │
  ├──< teams (owner, 1:many)
  │
  └──<> team_members (many:many with teams)
              │
              └── team_invites
```

---

## Migration Commands

```bash
cd apps/backend
source venv/bin/activate

# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history

# View current revision
alembic current
```

---

## Sample Queries

### Get user with settings
```python
from sqlalchemy.orm import selectinload

result = await db.execute(
    select(User)
    .options(selectinload(User.settings))
    .where(User.id == user_id)
)
user = result.scalar_one_or_none()
```

### Get activities for date range
```python
from datetime import datetime, timedelta

start = datetime.utcnow() - timedelta(days=7)
result = await db.execute(
    select(Activity)
    .where(Activity.user_id == user_id)
    .where(Activity.start_time >= start)
    .order_by(Activity.start_time.desc())
)
activities = result.scalars().all()
```

### Get team with members
```python
result = await db.execute(
    select(Team)
    .options(
        selectinload(Team.members).selectinload(TeamMember.user)
    )
    .where(Team.id == team_id)
)
team = result.scalar_one_or_none()
```

---

*Database schema reference for Productify Pro.*
