# Layer 2: Client Logic

## Overview
State management, API clients, and business logic for the desktop app.

---

## Zustand Stores

### 1. WorkspaceStore (NEW)

```typescript
interface WorkspaceState {
  // Data
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (id: string) => void;
  createWorkspace: (data: CreateWorkspaceDto) => Promise<Workspace>;
  updateWorkspace: (id: string, data: UpdateWorkspaceDto) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;

  // Members
  fetchMembers: (workspaceId: string) => Promise<void>;
  inviteMember: (email: string, role: Role) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  updateMemberRole: (userId: string, role: Role) => Promise<void>;
}
```

### 2. ProjectStore (NEW)

```typescript
interface ProjectState {
  // Data
  projects: Project[];
  currentProject: Project | null;
  projectMembers: ProjectMember[];

  // Loading
  isLoading: boolean;

  // Actions
  fetchProjects: (workspaceId: string) => Promise<void>;
  setCurrentProject: (id: string | null) => void;
  createProject: (data: CreateProjectDto) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectDto) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;

  // Members
  addMemberToProject: (projectId: string, userId: string) => Promise<void>;
  removeMemberFromProject: (projectId: string, userId: string) => Promise<void>;
}
```

### 3. TimeTrackingStore (NEW)

```typescript
interface TimeTrackingState {
  // Current timer
  runningEntry: TimeEntry | null;
  elapsedSeconds: number;

  // History
  todayEntries: TimeEntry[];
  weekEntries: TimeEntry[];

  // Actions
  startTimer: (workspaceId: string, projectId?: string, description?: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  updateDescription: (description: string) => Promise<void>;

  // Manual entries
  createManualEntry: (data: CreateTimeEntryDto) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;

  // Queries
  fetchTodayEntries: () => Promise<void>;
  fetchWeekEntries: () => Promise<void>;

  // Tick (for live timer display)
  tick: () => void;
}
```

### 4. ActivityStore (MODIFY)

```typescript
interface ActivityState {
  // Existing...

  // NEW: workspace/project context
  currentWorkspaceId: string | null;
  currentProjectId: string | null;

  // NEW: cross-workspace summary
  crossWorkspaceSummary: WorkspaceSummary[];

  // NEW: Actions
  setTrackingContext: (workspaceId: string, projectId?: string) => void;
  fetchWorkspaceActivities: (workspaceId: string, filters: Filters) => Promise<void>;
  fetchCrossWorkspaceSummary: (dateRange: DateRange) => Promise<void>;
}
```

### 5. ScreenshotStore (MODIFY)

```typescript
interface ScreenshotState {
  // Existing...

  // NEW: workspace context
  workspaceScreenshots: Screenshot[];
  teamScreenshots: Screenshot[];  // For owners/admins

  // NEW: Actions
  fetchWorkspaceScreenshots: (workspaceId: string) => Promise<void>;
  fetchTeamScreenshots: (workspaceId: string, userId?: string) => Promise<void>;
}
```

---

## API Client Functions

### workspaceApi.ts (NEW)

```typescript
// Workspaces
export const getWorkspaces = () => api.get<Workspace[]>('/workspaces');
export const createWorkspace = (data: CreateWorkspaceDto) => api.post<Workspace>('/workspaces', data);
export const getWorkspace = (id: string) => api.get<Workspace>(`/workspaces/${id}`);
export const updateWorkspace = (id: string, data: UpdateWorkspaceDto) => api.put(`/workspaces/${id}`, data);
export const deleteWorkspace = (id: string) => api.delete(`/workspaces/${id}`);
export const getWorkspaceStats = (id: string, dateRange: DateRange) => api.get(`/workspaces/${id}/stats`, { params: dateRange });

// Members
export const getWorkspaceMembers = (workspaceId: string) => api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
export const updateMemberRole = (workspaceId: string, userId: string, role: Role) => api.put(`/workspaces/${workspaceId}/members/${userId}`, { role });
export const removeMember = (workspaceId: string, userId: string) => api.delete(`/workspaces/${workspaceId}/members/${userId}`);

// Invites
export const createInvite = (workspaceId: string, email: string, role: Role) => api.post(`/workspaces/${workspaceId}/invites`, { email, role });
export const getInvites = (workspaceId: string) => api.get(`/workspaces/${workspaceId}/invites`);
export const cancelInvite = (workspaceId: string, inviteId: string) => api.delete(`/workspaces/${workspaceId}/invites/${inviteId}`);
export const acceptInvite = (token: string) => api.post(`/invites/${token}/accept`);
export const getInviteByToken = (token: string) => api.get(`/invites/${token}`);
```

### projectApi.ts (NEW)

```typescript
export const getProjects = (workspaceId: string) => api.get<Project[]>(`/workspaces/${workspaceId}/projects`);
export const createProject = (workspaceId: string, data: CreateProjectDto) => api.post<Project>(`/workspaces/${workspaceId}/projects`, data);
export const getProject = (workspaceId: string, projectId: string) => api.get<Project>(`/workspaces/${workspaceId}/projects/${projectId}`);
export const updateProject = (workspaceId: string, projectId: string, data: UpdateProjectDto) => api.put(`/workspaces/${workspaceId}/projects/${projectId}`, data);
export const archiveProject = (workspaceId: string, projectId: string) => api.delete(`/workspaces/${workspaceId}/projects/${projectId}`);
export const getProjectStats = (workspaceId: string, projectId: string) => api.get(`/workspaces/${workspaceId}/projects/${projectId}/stats`);

// Project members
export const getProjectMembers = (projectId: string) => api.get<ProjectMember[]>(`/projects/${projectId}/members`);
export const addProjectMember = (projectId: string, userId: string) => api.post(`/projects/${projectId}/members`, { userId });
export const removeProjectMember = (projectId: string, userId: string) => api.delete(`/projects/${projectId}/members/${userId}`);
```

### timeEntryApi.ts (NEW)

```typescript
export const getTimeEntries = (params: TimeEntryParams) => api.get<TimeEntry[]>('/time-entries', { params });
export const createTimeEntry = (data: CreateTimeEntryDto) => api.post<TimeEntry>('/time-entries', data);
export const updateTimeEntry = (id: string, data: UpdateTimeEntryDto) => api.put<TimeEntry>(`/time-entries/${id}`, data);
export const deleteTimeEntry = (id: string) => api.delete(`/time-entries/${id}`);
export const startTimer = (data: StartTimerDto) => api.post<TimeEntry>('/time-entries', { ...data, is_running: true });
export const stopTimer = (id: string) => api.post<TimeEntry>(`/time-entries/${id}/stop`);
export const getRunningTimer = () => api.get<TimeEntry | null>('/time-entries/running');
```

---

## Hooks

### useWorkspace.ts (NEW)

```typescript
export function useWorkspace() {
  const {
    currentWorkspace,
    workspaces,
    setCurrentWorkspace,
    fetchWorkspaces
  } = useWorkspaceStore();

  // Auto-fetch on mount
  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Persist selected workspace
  useEffect(() => {
    if (currentWorkspace) {
      localStorage.setItem('currentWorkspaceId', currentWorkspace.id);
    }
  }, [currentWorkspace]);

  return {
    workspace: currentWorkspace,
    workspaces,
    switchWorkspace: setCurrentWorkspace,
    isPersonal: currentWorkspace?.type === 'personal',
    isTeam: currentWorkspace?.type === 'team',
    isOwner: currentWorkspace?.role === 'owner',
    isAdmin: ['owner', 'admin'].includes(currentWorkspace?.role || ''),
  };
}
```

### useProjects.ts (NEW)

```typescript
export function useProjects(workspaceId: string) {
  const { projects, currentProject, fetchProjects, setCurrentProject } = useProjectStore();

  useEffect(() => {
    if (workspaceId) {
      fetchProjects(workspaceId);
    }
  }, [workspaceId]);

  return {
    projects,
    currentProject,
    activeProjects: projects.filter(p => p.status === 'active'),
    selectProject: setCurrentProject,
  };
}
```

### useTimeTracking.ts (NEW)

```typescript
export function useTimeTracking() {
  const {
    runningEntry,
    elapsedSeconds,
    startTimer,
    stopTimer,
    tick
  } = useTimeTrackingStore();

  // Timer tick
  useEffect(() => {
    if (runningEntry) {
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }
  }, [runningEntry]);

  return {
    isTracking: !!runningEntry,
    currentEntry: runningEntry,
    elapsed: elapsedSeconds,
    formattedTime: formatDuration(elapsedSeconds),
    start: startTimer,
    stop: stopTimer,
  };
}
```

### usePermissions.ts (NEW)

```typescript
export function usePermissions() {
  const { currentWorkspace } = useWorkspaceStore();
  const role = currentWorkspace?.role;

  return {
    canViewTeamActivity: ['owner', 'admin'].includes(role || ''),
    canViewScreenshots: ['owner', 'admin'].includes(role || ''),
    canManageMembers: ['owner', 'admin'].includes(role || ''),
    canManageProjects: ['owner', 'admin'].includes(role || ''),
    canManageBilling: role === 'owner',
    canDeleteWorkspace: role === 'owner',
    canInviteMembers: ['owner', 'admin'].includes(role || ''),
  };
}
```

---

## Real-time Updates (WebSocket)

### workspaceSocket.ts (NEW)

```typescript
export function setupWorkspaceSocket(workspaceId: string) {
  const ws = new WebSocket(`${WS_URL}/ws/workspace/${workspaceId}`);

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'activity:new':
        useActivityStore.getState().addActivity(message.data);
        break;

      case 'member:joined':
        useWorkspaceStore.getState().addMember(message.data);
        break;

      case 'member:left':
        useWorkspaceStore.getState().removeMember(message.data.userId);
        break;

      case 'project:updated':
        useProjectStore.getState().updateProject(message.data);
        break;

      case 'screenshot:new':
        useScreenshotStore.getState().addTeamScreenshot(message.data);
        break;
    }
  };

  return ws;
}
```

---

## File Structure

```
apps/desktop/src/
├── stores/
│   ├── workspaceStore.ts    # NEW
│   ├── projectStore.ts      # NEW
│   ├── timeTrackingStore.ts # NEW
│   ├── activityStore.ts     # MODIFY
│   └── screenshotStore.ts   # MODIFY
├── lib/api/
│   ├── workspace.ts         # NEW
│   ├── projects.ts          # NEW
│   ├── timeEntries.ts       # NEW
│   └── index.ts             # MODIFY
├── hooks/
│   ├── useWorkspace.ts      # NEW
│   ├── useProjects.ts       # NEW
│   ├── useTimeTracking.ts   # NEW
│   ├── usePermissions.ts    # NEW
│   └── useWorkspaceSocket.ts # NEW
└── types/
    ├── workspace.ts         # NEW
    ├── project.ts           # NEW
    └── timeEntry.ts         # NEW
```

---

## Status: [ ] Not Started
