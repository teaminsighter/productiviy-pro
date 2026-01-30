# Layer 4: Database Schema

## Overview
Database structure for workspace-based multi-tenant system.

---

## Tables

### 1. Users (existing - modify)
```sql
users
├── id (UUID, PK)
├── email (unique)
├── name
├── password_hash
├── avatar_url
├── is_active
├── created_at
├── updated_at
└── personal_workspace_id (FK → workspaces) -- NEW
```

### 2. Workspaces (NEW)
```sql
workspaces
├── id (UUID, PK)
├── name
├── type (ENUM: 'personal', 'team')
├── owner_id (FK → users)
├── logo_url
├── settings (JSON)
│   ├── screenshot_enabled
│   ├── screenshot_interval
│   ├── blur_screenshots
│   └── tracking_hours
├── subscription_id (FK → subscriptions, nullable)
├── created_at
└── updated_at
```

### 3. Workspace Members (NEW)
```sql
workspace_members
├── id (UUID, PK)
├── workspace_id (FK → workspaces)
├── user_id (FK → users)
├── role (ENUM: 'owner', 'admin', 'member')
├── permissions (JSON)
│   ├── can_view_team_activity
│   ├── can_view_screenshots
│   ├── can_manage_projects
│   └── can_invite_members
├── joined_at
├── invited_by (FK → users)
└── status (ENUM: 'active', 'pending', 'removed')
```

### 4. Projects (NEW)
```sql
projects
├── id (UUID, PK)
├── workspace_id (FK → workspaces)
├── name
├── description
├── color (hex code for UI)
├── status (ENUM: 'active', 'paused', 'archived')
├── budget_hours (nullable)
├── created_by (FK → users)
├── created_at
└── updated_at
```

### 5. Project Members (NEW)
```sql
project_members
├── id (UUID, PK)
├── project_id (FK → projects)
├── user_id (FK → users)
├── role (ENUM: 'lead', 'member')
├── hourly_rate (nullable, for billing)
├── assigned_at
└── assigned_by (FK → users)
```

### 6. Activities (existing - modify)
```sql
activities
├── id (UUID, PK)
├── user_id (FK → users)
├── workspace_id (FK → workspaces) -- NEW
├── project_id (FK → projects, nullable) -- NEW
├── app_name
├── window_title
├── url (nullable)
├── category (ENUM: 'productive', 'neutral', 'distracting')
├── start_time
├── end_time
├── duration_seconds
├── is_idle
├── created_at
└── metadata (JSON)
```

### 7. Screenshots (existing - modify)
```sql
screenshots
├── id (UUID, PK)
├── user_id (FK → users)
├── workspace_id (FK → workspaces) -- NEW
├── project_id (FK → projects, nullable) -- NEW
├── activity_id (FK → activities, nullable)
├── image_url
├── thumbnail_url
├── is_blurred
├── captured_at
└── created_at
```

### 8. Time Entries (NEW - manual time tracking)
```sql
time_entries
├── id (UUID, PK)
├── user_id (FK → users)
├── workspace_id (FK → workspaces)
├── project_id (FK → projects)
├── description
├── start_time
├── end_time
├── duration_seconds
├── is_manual (boolean)
├── is_running (boolean)
├── created_at
└── updated_at
```

### 9. Workspace Invites (NEW)
```sql
workspace_invites
├── id (UUID, PK)
├── workspace_id (FK → workspaces)
├── email
├── role (ENUM: 'admin', 'member')
├── token (unique)
├── invited_by (FK → users)
├── expires_at
├── accepted_at (nullable)
├── created_at
└── status (ENUM: 'pending', 'accepted', 'expired', 'cancelled')
```

---

## Relationships Diagram

```
                    ┌─────────────┐
                    │   Users     │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ Workspaces │  │ Activities │  │Screenshots │
    │ (owns)     │  │ (creates)  │  │ (creates)  │
    └─────┬──────┘  └────────────┘  └────────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌────────┐  ┌────────────────┐
│Projects│  │WorkspaceMembers│
└───┬────┘  └────────────────┘
    │
    ▼
┌──────────────┐
│ProjectMembers│
└──────────────┘
```

---

## Indexes

```sql
-- Fast workspace lookups
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);

-- Fast activity queries
CREATE INDEX idx_activities_user_workspace ON activities(user_id, workspace_id);
CREATE INDEX idx_activities_workspace_project ON activities(workspace_id, project_id);
CREATE INDEX idx_activities_start_time ON activities(start_time);

-- Fast project lookups
CREATE INDEX idx_projects_workspace ON projects(workspace_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- Fast screenshot queries
CREATE INDEX idx_screenshots_workspace ON screenshots(workspace_id);
CREATE INDEX idx_screenshots_captured ON screenshots(captured_at);
```

---

## Data Flow Examples

### User Signs Up
```
1. Create User record
2. Create Personal Workspace (type='personal')
3. Add user as WorkspaceMember (role='owner')
4. Set user.personal_workspace_id
```

### User Creates Team
```
1. Create Workspace (type='team')
2. Add creator as WorkspaceMember (role='owner')
3. Create default Project (optional)
```

### User Joins Team
```
1. Owner creates WorkspaceInvite
2. User accepts → Create WorkspaceMember record
3. User can now access workspace data
```

### Activity Tracked
```
1. Get current active workspace from client
2. Get current active project (if any)
3. Create Activity with workspace_id + project_id
4. Data automatically segmented
```

---

## Migration Strategy

### Phase 1: Add new tables
- Create workspaces table
- Create workspace_members table
- Create projects table
- Create project_members table
- Create time_entries table
- Create workspace_invites table

### Phase 2: Migrate existing data
- Create personal workspace for each existing user
- Move existing activities to personal workspace
- Move existing screenshots to personal workspace

### Phase 3: Add new columns
- Add workspace_id to activities
- Add project_id to activities
- Add workspace_id to screenshots
- Add project_id to screenshots

---

## Status: [ ] Not Started
