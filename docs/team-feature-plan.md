# Team Feature - Complete Implementation Plan

## Overview
Implement a fully functional team management system with role-based access control, real-time member activity viewing, and granular permission settings.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TEAM ACCESS HIERARCHY                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   OWNER (Full Control)                                                       │
│   ├── View ALL member data (activity, screenshots, URLs)                     │
│   ├── Grant/Revoke viewing permissions to Admins                             │
│   ├── Manage team settings, billing, delete team                             │
│   ├── Promote/Demote members                                                 │
│   └── All Admin permissions                                                  │
│                                                                              │
│   ADMIN (Delegated Access)                                                   │
│   ├── View member data (if granted by Owner)                                 │
│   ├── Invite/Remove members                                                  │
│   ├── View team analytics (aggregated)                                       │
│   └── Cannot change Owner's permissions                                      │
│                                                                              │
│   MEMBER (Self Only)                                                         │
│   ├── View own data only                                                     │
│   ├── Control own privacy settings                                           │
│   └── Leave team                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Updates

### New Table: `team_permissions`
```sql
CREATE TABLE team_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    granter_id INTEGER NOT NULL,          -- Owner who granted permission
    grantee_id INTEGER NOT NULL,          -- Admin who receives permission
    target_user_id INTEGER,               -- NULL = all members, specific ID = one member

    -- Permission types
    can_view_activity BOOLEAN DEFAULT FALSE,
    can_view_screenshots BOOLEAN DEFAULT FALSE,
    can_view_urls BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT FALSE,
    can_export_data BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,                  -- Optional expiration

    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (granter_id) REFERENCES users(id),
    FOREIGN KEY (grantee_id) REFERENCES users(id),
    FOREIGN KEY (target_user_id) REFERENCES users(id)
);
```

### Update: `team_members` table
```sql
-- Add columns for member-controlled privacy
ALTER TABLE team_members ADD COLUMN blur_screenshots BOOLEAN DEFAULT FALSE;
ALTER TABLE team_members ADD COLUMN hide_window_titles BOOLEAN DEFAULT FALSE;
ALTER TABLE team_members ADD COLUMN working_hours_only BOOLEAN DEFAULT TRUE;  -- Only share during work hours
```

---

## Phase 1: Backend - Permission System

### 1.1 New Model: `TeamPermission`
**File:** `/apps/backend/app/models/team.py`

```python
class TeamPermission(Base):
    __tablename__ = "team_permissions"

    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    granter_id = Column(Integer, ForeignKey("users.id"))
    grantee_id = Column(Integer, ForeignKey("users.id"))
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    can_view_activity = Column(Boolean, default=False)
    can_view_screenshots = Column(Boolean, default=False)
    can_view_urls = Column(Boolean, default=False)
    can_view_analytics = Column(Boolean, default=False)
    can_export_data = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
```

### 1.2 Permission API Endpoints
**File:** `/apps/backend/app/api/routes/teams.py`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/teams/{id}/permissions` | GET | List all permissions (Owner only) |
| `/teams/{id}/permissions` | POST | Grant permission (Owner only) |
| `/teams/{id}/permissions/{perm_id}` | PUT | Update permission |
| `/teams/{id}/permissions/{perm_id}` | DELETE | Revoke permission |
| `/teams/{id}/my-permissions` | GET | Get current user's permissions |

### 1.3 Permission Check Helper
```python
async def check_view_permission(
    db: AsyncSession,
    team_id: int,
    requester_id: int,
    target_user_id: int,
    permission_type: str  # 'activity', 'screenshots', 'urls'
) -> bool:
    """
    Check if requester can view target's data.
    Returns True if:
    - Requester is Owner (always has access)
    - Requester is Admin with granted permission for this target
    - Requester is viewing their own data
    """
```

---

## Phase 2: Backend - Real Activity Data

### 2.1 Team Dashboard Stats
**Endpoint:** `GET /api/teams/{id}/dashboard`

Returns real-time aggregated data:
```json
{
  "team_id": 1,
  "date": "2024-01-15",
  "stats": {
    "total_members": 5,
    "active_today": 3,
    "total_hours_today": 18.5,
    "avg_productivity": 72.5,
    "top_apps": [
      {"name": "VS Code", "hours": 8.2},
      {"name": "Slack", "hours": 3.1}
    ]
  },
  "members_summary": [
    {
      "user_id": 2,
      "name": "John",
      "avatar_url": null,
      "today_hours": 6.2,
      "productivity": 85,
      "status": "active",  // active, idle, offline
      "current_app": "VS Code",
      "can_view_details": true
    }
  ]
}
```

### 2.2 Member Detail Endpoints (Enhanced)

**Activity Timeline:**
`GET /api/teams/{id}/members/{userId}/timeline?date=2024-01-15`
```json
{
  "user_id": 2,
  "date": "2024-01-15",
  "timeline": [
    {
      "start": "09:00",
      "end": "09:45",
      "app": "VS Code",
      "title": "project/src/main.ts",  // Hidden if hide_window_titles
      "category": "Development",
      "productivity": "productive"
    }
  ],
  "hourly_breakdown": [
    {"hour": 9, "productive": 45, "neutral": 10, "distracting": 5}
  ]
}
```

**Screenshots Gallery:**
`GET /api/teams/{id}/members/{userId}/screenshots?date=2024-01-15`
```json
{
  "user_id": 2,
  "date": "2024-01-15",
  "screenshots": [
    {
      "id": 123,
      "timestamp": "2024-01-15T09:30:00",
      "thumbnail_url": "/api/screenshots/123/thumb",
      "full_url": "/api/screenshots/123/full",
      "app": "VS Code",
      "is_blurred": false
    }
  ]
}
```

---

## Phase 3: Frontend - Team Dashboard Redesign

### 3.1 New Page Structure

```
/team
├── TeamDashboard.tsx        (Main dashboard with stats)
├── TeamMembers.tsx          (Members list with quick stats)
├── TeamSettings.tsx         (Team settings, permissions)
├── TeamAnalytics.tsx        (Charts and reports)
└── MemberDetail.tsx         (Individual member view)

/team/member/:userId
├── Overview tab             (Today's summary)
├── Activity tab             (Timeline view)
├── Screenshots tab          (Gallery view)
└── Reports tab              (Weekly/monthly reports)
```

### 3.2 Team Dashboard UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Team: Acme Inc                                    [Settings]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ 5        │  │ 3        │  │ 18.5h    │  │ 72%      │        │
│  │ Members  │  │ Active   │  │ Today    │  │ Prod.    │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Team Activity Today                              [Live]     ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ [Avatar] John Doe        ████████░░ 6.2h  85%  [VS Code]   ││
│  │ [Avatar] Jane Smith      ██████░░░░ 4.8h  72%  [Figma]     ││
│  │ [Avatar] Bob Wilson      █████░░░░░ 3.5h  68%  [Slack]     ││
│  │ [Avatar] Alice Chen      ░░░░░░░░░░ Offline                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Top Applications Today                                      ││
│  │ VS Code ████████████████████ 12.3h                          ││
│  │ Slack   ████████░░░░░░░░░░░░  5.2h                          ││
│  │ Chrome  ██████░░░░░░░░░░░░░░  4.1h                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Member Detail View

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Team    John Doe                        [Export]     │
├─────────────────────────────────────────────────────────────────┤
│  [Overview]  [Activity]  [Screenshots]  [Reports]               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Today's Summary                           January 15, 2024     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ 6.2h     │  │ 85%      │  │ 5.3h     │  │ 42       │        │
│  │ Total    │  │ Prod.    │  │ Focus    │  │ Screenshots│      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  Activity Timeline                                               │
│  09:00 ┌─────────────────────────────┐ VS Code                  │
│        │ Working on: main.ts         │ Productive               │
│  10:00 └─────────────────────────────┘                          │
│        ┌───────────────┐ Slack                                  │
│  10:30 └───────────────┘ Neutral                                │
│        ┌─────────────────────────────────────┐ VS Code          │
│  12:00 └─────────────────────────────────────┘ Productive       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 4: Permission Management UI (Owner Only)

### 4.1 Team Settings - Permissions Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  Team Settings                                                   │
├─────────────────────────────────────────────────────────────────┤
│  [General]  [Members]  [Permissions]  [Billing]                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Admin Permissions                              [+ Grant Access] │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Jane Smith (Admin)                              [Edit] [X]  ││
│  │ Can view: All Members                                        ││
│  │ ✓ Activity  ✓ Screenshots  ✓ URLs  ✓ Analytics              ││
│  │ Granted: Jan 10, 2024                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Bob Wilson (Admin)                              [Edit] [X]  ││
│  │ Can view: John Doe, Alice Chen (2 members)                   ││
│  │ ✓ Activity  ✗ Screenshots  ✓ URLs  ✗ Analytics              ││
│  │ Granted: Jan 12, 2024  │  Expires: Feb 12, 2024             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Grant Permission Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Grant Viewing Permission                              [X]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Grant to:                                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Dropdown] Select Admin...                           ▼      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Can view data of:                                               │
│  ○ All team members                                              │
│  ● Specific members:                                             │
│    ☑ John Doe                                                    │
│    ☑ Alice Chen                                                  │
│    ☐ Bob Wilson                                                  │
│                                                                  │
│  Permissions:                                                    │
│  ☑ View Activity (apps, time spent)                             │
│  ☑ View Screenshots                                             │
│  ☑ View URLs visited                                            │
│  ☐ View Analytics & Reports                                     │
│  ☐ Export Data                                                  │
│                                                                  │
│  Expiration:                                                     │
│  ○ Never expires                                                 │
│  ● Expires on: [Date Picker]                                    │
│                                                                  │
│                              [Cancel]  [Grant Permission]        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 5: Invite Accept Flow

### 5.1 New Route: `/invite/:token`
**File:** `/apps/desktop/src/pages/InviteAccept.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    [Productify Pro Logo]                         │
│                                                                  │
│              You've been invited to join                         │
│                                                                  │
│                    ┌───────────────┐                             │
│                    │   Acme Inc    │                             │
│                    │   5 members   │                             │
│                    └───────────────┘                             │
│                                                                  │
│              Invited by: John Doe (Owner)                        │
│              Role: Member                                        │
│                                                                  │
│              ┌─────────────────────────┐                         │
│              │    Accept Invitation    │                         │
│              └─────────────────────────┘                         │
│                                                                  │
│              [Decline]                                           │
│                                                                  │
│  Note: You'll be able to control what data                      │
│  you share with the team.                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Backend: Get Invite Info (Public)
`GET /api/teams/invite/{token}/info`
```json
{
  "team_name": "Acme Inc",
  "team_avatar": null,
  "member_count": 5,
  "invited_by": "John Doe",
  "role": "member",
  "expires_at": "2024-01-22T00:00:00Z",
  "is_valid": true
}
```

---

## Phase 6: Member Privacy Controls

### 6.1 Settings > Privacy Tab Update

Add team-specific privacy settings:

```
┌─────────────────────────────────────────────────────────────────┐
│  Team Sharing Settings                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Team: Acme Inc                                                  │
│                                                                  │
│  Share with team admins:                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ✓ Activity data (apps, time spent)              [Toggle] │   │
│  │   Admins can see which apps you use                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ✗ Screenshots                                   [Toggle] │   │
│  │   Share periodic screenshots with admins                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ✓ URLs visited                                  [Toggle] │   │
│  │   Share browsing history with admins                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Privacy Options:                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ☐ Blur screenshots                              [Toggle] │   │
│  │   Screenshots will be blurred for privacy                │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ☐ Hide window titles                            [Toggle] │   │
│  │   Window titles won't be visible to admins               │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ✓ Working hours only                            [Toggle] │   │
│  │   Only share data during 9 AM - 6 PM                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Order

### Week 1: Backend Foundation
1. Create `TeamPermission` model and migration
2. Update `TeamMember` model with new privacy fields
3. Implement permission check helper functions
4. Create permission CRUD endpoints
5. Update existing endpoints to check permissions

### Week 2: Real Data Endpoints
1. Implement real team dashboard stats
2. Update member activity endpoint with real data
3. Update member screenshots endpoint
4. Implement member timeline endpoint
5. Add member summary/reports endpoint

### Week 3: Frontend - Team Dashboard
1. Redesign Team page layout
2. Implement real-time stats cards
3. Create member list with live status
4. Add activity charts
5. Implement member quick view

### Week 4: Frontend - Member Detail
1. Create MemberDetail page
2. Implement Overview tab
3. Implement Activity/Timeline tab
4. Implement Screenshots gallery tab
5. Implement Reports tab

### Week 5: Permission Management
1. Create Team Settings page
2. Implement Permissions tab
3. Create Grant Permission modal
4. Add permission indicators in UI
5. Test permission flows

### Week 6: Invite & Privacy
1. Create Invite Accept page
2. Add invite info endpoint
3. Update Privacy settings with team options
4. Add team switching UI
5. Add leave/delete team functionality

---

## API Endpoints Summary

### Team Core
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams` | List my teams |
| POST | `/api/teams` | Create team |
| GET | `/api/teams/{id}` | Get team details |
| PUT | `/api/teams/{id}` | Update team |
| DELETE | `/api/teams/{id}` | Delete team (owner) |

### Team Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams/{id}/dashboard` | Real-time dashboard stats |
| GET | `/api/teams/{id}/analytics` | Team analytics/charts |

### Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams/{id}/members` | List members |
| PUT | `/api/teams/{id}/members/{userId}` | Update member |
| DELETE | `/api/teams/{id}/members/{userId}` | Remove member |
| GET | `/api/teams/{id}/members/{userId}/timeline` | Member timeline |
| GET | `/api/teams/{id}/members/{userId}/screenshots` | Member screenshots |
| GET | `/api/teams/{id}/members/{userId}/summary` | Member summary |

### Permissions (Owner Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams/{id}/permissions` | List all permissions |
| POST | `/api/teams/{id}/permissions` | Grant permission |
| PUT | `/api/teams/{id}/permissions/{permId}` | Update permission |
| DELETE | `/api/teams/{id}/permissions/{permId}` | Revoke permission |
| GET | `/api/teams/{id}/my-permissions` | Current user's permissions |

### Invites
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/teams/{id}/invites` | Send invite |
| GET | `/api/teams/{id}/invites` | List pending |
| DELETE | `/api/teams/{id}/invites/{inviteId}` | Cancel invite |
| GET | `/api/teams/invite/{token}/info` | Get invite info (public) |
| POST | `/api/teams/join/{token}` | Accept invite |

---

## Security Considerations

1. **Permission Inheritance**: Owner always has full access
2. **Expiring Permissions**: Permissions can auto-expire
3. **Audit Log**: Track who viewed whose data (future)
4. **Member Consent**: Members control their own sharing settings
5. **Working Hours**: Respect working hours setting
6. **Data Minimization**: Only fetch data user has permission to see

---

## Files to Create/Modify

### Backend
| File | Action |
|------|--------|
| `/app/models/team.py` | Add TeamPermission model |
| `/app/api/routes/teams.py` | Add permission endpoints |
| `/app/api/routes/teams.py` | Update dashboard/analytics |
| `/app/core/database.py` | Add migration |

### Frontend
| File | Action |
|------|--------|
| `/src/pages/Team.tsx` | Redesign with dashboard |
| `/src/pages/team/MemberDetail.tsx` | CREATE - Member view |
| `/src/pages/team/TeamSettings.tsx` | CREATE - Settings |
| `/src/pages/InviteAccept.tsx` | CREATE - Accept invite |
| `/src/stores/teamStore.ts` | Add permission actions |
| `/src/lib/api/teams.ts` | CREATE - API functions |
| `/src/pages/Settings.tsx` | Add team privacy section |

---

## Success Criteria

- [ ] Owner can see all member data in real-time
- [ ] Owner can grant specific permissions to admins
- [ ] Admins can only see data they're permitted to see
- [ ] Members can control their own sharing settings
- [ ] Invites can be sent and accepted
- [ ] Team stats show real data
- [ ] Member detail view shows timeline & screenshots
- [ ] Permissions can expire automatically
- [ ] Privacy settings are respected
