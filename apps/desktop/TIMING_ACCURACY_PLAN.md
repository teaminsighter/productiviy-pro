# Option 3: Event-Based Activity Tracking - Implementation Plan

## Overview
Replace polling-based tracking (2s heartbeats with 5s hardcoded duration) with event-based tracking that only sends data when activity changes.

## Current Flow (Broken)
```
Every 2 seconds:
Frontend ──poll──► Rust ──return──► Frontend ──HTTP──► Backend ──save 5s──► DB

Result: 2.5x overcounting (40% accuracy)
```

## New Flow (Option 3)
```
On activity change only:
Rust detects change ──HTTP──► Backend ──save accurate duration──► DB
Frontend just displays current activity (no HTTP)

Result: 98%+ accuracy, 99% less network traffic
```

---

## Implementation Steps

### Step 1: Modify Rust `activity_tracker.rs`

Add state tracking:
```rust
pub struct ActivitySession {
    pub app_name: String,
    pub window_title: String,
    pub start_time: DateTime<Utc>,
    pub last_heartbeat: DateTime<Utc>,
}

pub struct EventBasedTracker {
    current_session: Option<ActivitySession>,
    backend_url: String,
    auth_token: String,
    idle_threshold: u64,
}
```

Key functions:
- `check_activity_change()` - Compare current vs last, detect change
- `finalize_session()` - Calculate duration, send to backend
- `start_new_session()` - Begin tracking new activity
- `handle_idle()` - Finalize session when user goes idle

### Step 2: New Backend Endpoint

`POST /api/activities/session` - Receives complete activity sessions:
```json
{
  "app_name": "VS Code",
  "window_title": "main.rs - project",
  "start_time": "2024-01-19T10:00:00Z",
  "end_time": "2024-01-19T10:05:00Z",
  "duration": 300,
  "source": "native"
}
```

### Step 3: Simplify Frontend

`useNativeTracking.ts`:
- Remove HTTP calls to backend
- Just fetch current activity from Rust for UI display
- Let Rust handle all backend communication

### Step 4: Handle Edge Cases

1. **App close**: Finalize current session before exit
2. **Idle detection**: Finalize session when idle threshold reached
3. **Resume from idle**: Start new session when activity resumes
4. **Crash recovery**: Store session state in file, recover on restart

---

## Files to Modify

| File | Changes |
|------|---------|
| `activity_tracker.rs` | Add session tracking, event detection, backend sending |
| `commands.rs` | New command to start event-based tracking |
| `activities.py` | New `/session` endpoint for complete sessions |
| `useNativeTracking.ts` | Simplify to UI-only display |

---

## Testing Checklist

- [ ] Activity duration matches actual time spent
- [ ] Session ends correctly when switching apps
- [ ] Idle detection finalizes session
- [ ] App close saves current session
- [ ] Database records are accurate
- [ ] Network traffic reduced significantly

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Accuracy | ~40% | ~98% |
| HTTP requests/hour | 1,800 | ~50-200 |
| DB records/hour | 1,800 | ~50-200 |
| Battery impact | High | Minimal |
