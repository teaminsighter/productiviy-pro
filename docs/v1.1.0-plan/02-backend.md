# Layer 3: Backend Logic

## Overview
FastAPI backend services and API routes for workspace system.

---

## API Routes

### Workspaces API

```
GET    /api/workspaces              - List user's workspaces
POST   /api/workspaces              - Create new workspace
GET    /api/workspaces/:id          - Get workspace details
PUT    /api/workspaces/:id          - Update workspace
DELETE /api/workspaces/:id          - Delete workspace (owner only)
GET    /api/workspaces/:id/stats    - Get workspace statistics
```

### Workspace Members API

```
GET    /api/workspaces/:id/members           - List members
POST   /api/workspaces/:id/members           - Add member directly
PUT    /api/workspaces/:id/members/:userId   - Update member role
DELETE /api/workspaces/:id/members/:userId   - Remove member
```

### Workspace Invites API

```
GET    /api/workspaces/:id/invites    - List pending invites
POST   /api/workspaces/:id/invites    - Create invite
DELETE /api/workspaces/:id/invites/:id - Cancel invite
POST   /api/invites/:token/accept      - Accept invite (public)
GET    /api/invites/:token             - Get invite details (public)
```

### Projects API

```
GET    /api/workspaces/:id/projects           - List projects
POST   /api/workspaces/:id/projects           - Create project
GET    /api/workspaces/:id/projects/:id       - Get project details
PUT    /api/workspaces/:id/projects/:id       - Update project
DELETE /api/workspaces/:id/projects/:id       - Archive project
GET    /api/workspaces/:id/projects/:id/stats - Project statistics
```

### Project Members API

```
GET    /api/projects/:id/members           - List project members
POST   /api/projects/:id/members           - Add member to project
DELETE /api/projects/:id/members/:userId   - Remove from project
```

### Activities API (modified)

```
GET    /api/workspaces/:id/activities       - Get workspace activities
GET    /api/projects/:id/activities         - Get project activities
POST   /api/activities                      - Create activity (with workspace_id, project_id)
GET    /api/activities/summary              - Summary across all workspaces (personal view)
```

### Time Entries API (NEW)

```
GET    /api/time-entries                    - List user's time entries
POST   /api/time-entries                    - Create/start time entry
PUT    /api/time-entries/:id                - Update time entry
DELETE /api/time-entries/:id                - Delete time entry
POST   /api/time-entries/:id/stop           - Stop running timer
GET    /api/time-entries/running            - Get current running timer
```

### Screenshots API (modified)

```
GET    /api/workspaces/:id/screenshots      - Workspace screenshots (role-based)
GET    /api/projects/:id/screenshots        - Project screenshots
POST   /api/screenshots                     - Upload screenshot (with workspace_id)
```

---

## Services

### WorkspaceService
```python
class WorkspaceService:
    async def create_workspace(user_id, name, type) -> Workspace
    async def get_user_workspaces(user_id) -> List[Workspace]
    async def get_workspace(workspace_id, user_id) -> Workspace
    async def update_workspace(workspace_id, user_id, data) -> Workspace
    async def delete_workspace(workspace_id, user_id) -> bool
    async def get_workspace_stats(workspace_id, user_id, date_range) -> Stats
```

### WorkspaceMemberService
```python
class WorkspaceMemberService:
    async def add_member(workspace_id, user_id, role, invited_by) -> Member
    async def remove_member(workspace_id, user_id, removed_by) -> bool
    async def update_role(workspace_id, user_id, new_role, updated_by) -> Member
    async def get_members(workspace_id) -> List[Member]
    async def check_permission(workspace_id, user_id, permission) -> bool
```

### InviteService
```python
class InviteService:
    async def create_invite(workspace_id, email, role, invited_by) -> Invite
    async def accept_invite(token, user_id) -> Member
    async def cancel_invite(invite_id, cancelled_by) -> bool
    async def get_invite_by_token(token) -> Invite
    async def cleanup_expired_invites() -> int
```

### ProjectService
```python
class ProjectService:
    async def create_project(workspace_id, name, created_by) -> Project
    async def get_projects(workspace_id, user_id) -> List[Project]
    async def update_project(project_id, user_id, data) -> Project
    async def archive_project(project_id, user_id) -> bool
    async def get_project_stats(project_id, date_range) -> Stats
```

### TimeEntryService
```python
class TimeEntryService:
    async def start_timer(user_id, workspace_id, project_id, description) -> TimeEntry
    async def stop_timer(entry_id, user_id) -> TimeEntry
    async def get_running_timer(user_id) -> TimeEntry | None
    async def create_manual_entry(user_id, data) -> TimeEntry
    async def get_entries(user_id, workspace_id, date_range) -> List[TimeEntry]
```

### ActivityService (modified)
```python
class ActivityService:
    # Existing methods...

    # New methods:
    async def get_workspace_activities(workspace_id, user_id, filters) -> List[Activity]
    async def get_project_activities(project_id, user_id, filters) -> List[Activity]
    async def get_cross_workspace_summary(user_id, date_range) -> Summary
```

---

## Permission System

### Role Permissions Matrix

```python
PERMISSIONS = {
    'owner': {
        'can_view_workspace': True,
        'can_edit_workspace': True,
        'can_delete_workspace': True,
        'can_view_all_members_activity': True,
        'can_view_all_screenshots': True,
        'can_manage_members': True,
        'can_manage_projects': True,
        'can_manage_billing': True,
        'can_invite_members': True,
    },
    'admin': {
        'can_view_workspace': True,
        'can_edit_workspace': True,
        'can_delete_workspace': False,
        'can_view_all_members_activity': True,
        'can_view_all_screenshots': True,  # configurable
        'can_manage_members': True,
        'can_manage_projects': True,
        'can_manage_billing': False,
        'can_invite_members': True,
    },
    'member': {
        'can_view_workspace': True,
        'can_edit_workspace': False,
        'can_delete_workspace': False,
        'can_view_all_members_activity': False,
        'can_view_all_screenshots': False,
        'can_manage_members': False,
        'can_manage_projects': False,
        'can_manage_billing': False,
        'can_invite_members': False,
    },
}
```

### Permission Decorator
```python
def require_workspace_permission(permission: str):
    async def decorator(func):
        async def wrapper(workspace_id, user_id, *args, **kwargs):
            member = await get_workspace_member(workspace_id, user_id)
            if not member:
                raise HTTPException(403, "Not a member")
            if not check_permission(member.role, permission):
                raise HTTPException(403, "Permission denied")
            return await func(workspace_id, user_id, *args, **kwargs)
        return wrapper
    return decorator
```

---

## WebSocket Updates

### Events to broadcast

```python
# When activity is tracked
ws.broadcast_to_workspace(workspace_id, {
    'type': 'activity:new',
    'data': activity,
    'user_id': user_id
})

# When member joins
ws.broadcast_to_workspace(workspace_id, {
    'type': 'member:joined',
    'data': member
})

# When project updated
ws.broadcast_to_workspace(workspace_id, {
    'type': 'project:updated',
    'data': project
})

# When screenshot captured (to admins/owners only)
ws.broadcast_to_workspace_admins(workspace_id, {
    'type': 'screenshot:new',
    'data': screenshot,
    'user_id': user_id
})
```

---

## File Structure

```
apps/backend/app/
├── api/routes/
│   ├── workspaces.py      # NEW
│   ├── workspace_members.py # NEW
│   ├── invites.py          # NEW
│   ├── projects.py         # NEW
│   ├── time_entries.py     # NEW
│   ├── activities.py       # MODIFY
│   └── screenshots.py      # MODIFY
├── services/
│   ├── workspace_service.py      # NEW
│   ├── workspace_member_service.py # NEW
│   ├── invite_service.py         # NEW
│   ├── project_service.py        # NEW
│   ├── time_entry_service.py     # NEW
│   └── activity_service.py       # MODIFY
├── models/
│   ├── workspace.py        # NEW
│   ├── workspace_member.py # NEW
│   ├── project.py          # NEW
│   ├── project_member.py   # NEW
│   ├── time_entry.py       # NEW
│   ├── workspace_invite.py # NEW
│   └── activity.py         # MODIFY
└── core/
    └── permissions.py      # NEW
```

---

## Status: [ ] Not Started
