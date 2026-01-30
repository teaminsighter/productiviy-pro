# Implementation Tasks

## Overview
Step-by-step implementation plan for v1.1.0. Execute in order.

---

## Phase 1: Database (Week 1)

### 1.1 Create New Tables
- [ ] Create `workspaces` table with migrations
- [ ] Create `workspace_members` table
- [ ] Create `projects` table
- [ ] Create `project_members` table
- [ ] Create `time_entries` table
- [ ] Create `workspace_invites` table

### 1.2 Modify Existing Tables
- [ ] Add `workspace_id` column to `activities`
- [ ] Add `project_id` column to `activities`
- [ ] Add `workspace_id` column to `screenshots`
- [ ] Add `project_id` column to `screenshots`
- [ ] Add `personal_workspace_id` to `users`

### 1.3 Data Migration
- [ ] Create personal workspace for existing users
- [ ] Migrate existing activities to personal workspace
- [ ] Migrate existing screenshots to personal workspace
- [ ] Add indexes for performance

### 1.4 Test Database
- [ ] Verify relationships work correctly
- [ ] Test queries with sample data
- [ ] Verify migration rollback works

---

## Phase 2: Backend API (Week 2-3)

### 2.1 Models
- [ ] Create Workspace model
- [ ] Create WorkspaceMember model
- [ ] Create Project model
- [ ] Create ProjectMember model
- [ ] Create TimeEntry model
- [ ] Create WorkspaceInvite model
- [ ] Update Activity model
- [ ] Update Screenshot model

### 2.2 Services
- [ ] Create WorkspaceService
- [ ] Create WorkspaceMemberService
- [ ] Create InviteService
- [ ] Create ProjectService
- [ ] Create TimeEntryService
- [ ] Update ActivityService
- [ ] Update ScreenshotService

### 2.3 Permission System
- [ ] Create permissions.py with role matrix
- [ ] Create permission decorators
- [ ] Add permission checks to services

### 2.4 API Routes - Workspaces
- [ ] GET /api/workspaces
- [ ] POST /api/workspaces
- [ ] GET /api/workspaces/:id
- [ ] PUT /api/workspaces/:id
- [ ] DELETE /api/workspaces/:id
- [ ] GET /api/workspaces/:id/stats

### 2.5 API Routes - Members
- [ ] GET /api/workspaces/:id/members
- [ ] POST /api/workspaces/:id/members
- [ ] PUT /api/workspaces/:id/members/:userId
- [ ] DELETE /api/workspaces/:id/members/:userId

### 2.6 API Routes - Invites
- [ ] POST /api/workspaces/:id/invites
- [ ] GET /api/workspaces/:id/invites
- [ ] DELETE /api/workspaces/:id/invites/:id
- [ ] POST /api/invites/:token/accept
- [ ] GET /api/invites/:token

### 2.7 API Routes - Projects
- [ ] GET /api/workspaces/:id/projects
- [ ] POST /api/workspaces/:id/projects
- [ ] GET /api/workspaces/:id/projects/:id
- [ ] PUT /api/workspaces/:id/projects/:id
- [ ] DELETE /api/workspaces/:id/projects/:id

### 2.8 API Routes - Time Entries
- [ ] GET /api/time-entries
- [ ] POST /api/time-entries
- [ ] PUT /api/time-entries/:id
- [ ] DELETE /api/time-entries/:id
- [ ] POST /api/time-entries/:id/stop
- [ ] GET /api/time-entries/running

### 2.9 WebSocket Updates
- [ ] Add workspace room support
- [ ] Broadcast activity updates
- [ ] Broadcast member updates
- [ ] Broadcast project updates

### 2.10 Test Backend
- [ ] Write unit tests for services
- [ ] Write API integration tests
- [ ] Test permission system
- [ ] Test WebSocket updates

---

## Phase 3: Client Logic (Week 3-4)

### 3.1 Types
- [ ] Create workspace types
- [ ] Create project types
- [ ] Create time entry types
- [ ] Update activity types
- [ ] Update screenshot types

### 3.2 API Client
- [ ] Create workspaceApi.ts
- [ ] Create projectApi.ts
- [ ] Create timeEntryApi.ts
- [ ] Update activityApi.ts
- [ ] Update screenshotApi.ts

### 3.3 Stores
- [ ] Create workspaceStore.ts
- [ ] Create projectStore.ts
- [ ] Create timeTrackingStore.ts
- [ ] Update activityStore.ts
- [ ] Update screenshotStore.ts

### 3.4 Hooks
- [ ] Create useWorkspace.ts
- [ ] Create useProjects.ts
- [ ] Create useTimeTracking.ts
- [ ] Create usePermissions.ts
- [ ] Create useWorkspaceSocket.ts

### 3.5 WebSocket Integration
- [ ] Setup workspace-scoped WebSocket
- [ ] Handle real-time updates
- [ ] Handle reconnection

### 3.6 Test Client Logic
- [ ] Test store actions
- [ ] Test API calls
- [ ] Test WebSocket updates

---

## Phase 4: UI Components (Week 4-5)

### 4.1 Workspace Components
- [ ] WorkspaceSwitcher component
- [ ] CreateWorkspaceModal component
- [ ] WorkspaceSettings component

### 4.2 Project Components
- [ ] ProjectCard component
- [ ] ProjectSelector component
- [ ] CreateProjectModal component
- [ ] ProjectMemberList component

### 4.3 Team Components
- [ ] Update TeamMemberCard component
- [ ] InviteMemberModal component
- [ ] PendingInviteCard component

### 4.4 Time Tracking Components
- [ ] TimeTrackerWidget component
- [ ] TimeEntryList component
- [ ] ManualTimeEntry component

### 4.5 Dashboard Components
- [ ] CrossWorkspaceSummary component
- [ ] TeamOverview component
- [ ] ProjectsOverview component

### 4.6 Layout Updates
- [ ] Update Sidebar with WorkspaceSwitcher
- [ ] Update header/navigation
- [ ] Add workspace context indicator

---

## Phase 5: Pages (Week 5-6)

### 5.1 Update Existing Pages
- [ ] Update Dashboard for workspace context
- [ ] Update Activity for workspace/project filter
- [ ] Update Analytics for workspace context
- [ ] Update Screenshots for workspace context
- [ ] Update Team page with new design
- [ ] Update Settings page

### 5.2 New Pages
- [ ] Create Projects page
- [ ] Create ProjectDetail page
- [ ] Create InviteAccept page (public)

### 5.3 Personal Dashboard View
- [ ] Cross-workspace summary
- [ ] Work distribution chart
- [ ] Client/project breakdown

### 5.4 Team Dashboard View
- [ ] Team member overview
- [ ] Project overview
- [ ] Activity feed

---

## Phase 6: Admin Dashboard (Week 6-7)

### 6.1 Setup
- [ ] Create admin app structure
- [ ] Setup authentication
- [ ] Setup routing

### 6.2 Backend APIs
- [ ] GET /api/admin/stats/overview
- [ ] GET /api/admin/users
- [ ] GET /api/admin/workspaces
- [ ] GET /api/admin/stats/downloads

### 6.3 Admin Pages
- [ ] Overview dashboard
- [ ] Users list page
- [ ] User detail page
- [ ] Workspaces page
- [ ] Downloads/Analytics page

### 6.4 Integrations
- [ ] GitHub API for download stats
- [ ] Stripe API for revenue (if applicable)

---

## Phase 7: Testing & Polish (Week 7-8)

### 7.1 Testing
- [ ] End-to-end testing
- [ ] Cross-browser testing
- [ ] Mobile responsiveness
- [ ] Performance testing

### 7.2 Bug Fixes
- [ ] Fix identified bugs
- [ ] Handle edge cases
- [ ] Error handling improvements

### 7.3 UI Polish
- [ ] Consistent styling
- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Animations/transitions

### 7.4 Documentation
- [ ] Update API docs
- [ ] User guide for new features
- [ ] Admin dashboard guide

---

## Phase 8: Release (Week 8)

### 8.1 Pre-release
- [ ] Final testing
- [ ] Backup production database
- [ ] Prepare rollback plan

### 8.2 Release
- [ ] Deploy backend changes
- [ ] Run database migrations
- [ ] Deploy desktop app v1.1.0
- [ ] Deploy admin dashboard

### 8.3 Post-release
- [ ] Monitor for errors
- [ ] Check metrics
- [ ] Gather user feedback

---

## Quick Reference

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Database | Week 1 |
| 2 | Backend | Week 2-3 |
| 3 | Client Logic | Week 3-4 |
| 4 | UI Components | Week 4-5 |
| 5 | Pages | Week 5-6 |
| 6 | Admin Dashboard | Week 6-7 |
| 7 | Testing | Week 7-8 |
| 8 | Release | Week 8 |

---

## Current Status

**Phase:** Not Started
**Next Task:** Phase 1.1 - Create workspace tables

---

## Notes

- Work layer by layer (Database → Backend → Client → UI)
- Test each layer before moving to next
- Commit frequently with descriptive messages
- Update this file as tasks are completed
