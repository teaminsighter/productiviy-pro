use serde::{Deserialize, Serialize};
use std::sync::Mutex;

/// Application state shared across Tauri
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppState {
    pub tracking_active: bool,
    pub focus_mode: bool,
    pub focus_duration: u32,         // in seconds
    pub focus_elapsed: u32,          // in seconds
    pub focus_session_name: Option<String>,
    pub current_app: Option<String>,
    pub current_category: Option<String>,
    pub paused: bool,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            tracking_active: true,
            focus_mode: false,
            focus_duration: 0,
            focus_elapsed: 0,
            focus_session_name: None,
            current_app: None,
            current_category: None,
            paused: false,
        }
    }
}

/// Thread-safe wrapper for AppState
pub struct AppStateWrapper(pub Mutex<AppState>);

impl AppStateWrapper {
    pub fn new() -> Self {
        Self(Mutex::new(AppState::default()))
    }

    pub fn get_state(&self) -> AppState {
        self.0.lock().unwrap().clone()
    }

    pub fn set_tracking(&self, active: bool) {
        let mut state = self.0.lock().unwrap();
        state.tracking_active = active;
        state.paused = !active;
    }

    pub fn set_focus_mode(&self, active: bool, duration: u32, session_name: Option<String>) {
        let mut state = self.0.lock().unwrap();
        state.focus_mode = active;
        state.focus_duration = duration;
        state.focus_elapsed = 0;
        state.focus_session_name = session_name;
    }

    pub fn update_focus_elapsed(&self, elapsed: u32) {
        let mut state = self.0.lock().unwrap();
        state.focus_elapsed = elapsed;
    }

    pub fn end_focus_mode(&self) {
        let mut state = self.0.lock().unwrap();
        state.focus_mode = false;
        state.focus_duration = 0;
        state.focus_elapsed = 0;
        state.focus_session_name = None;
    }

    pub fn set_current_activity(&self, app: Option<String>, category: Option<String>) {
        let mut state = self.0.lock().unwrap();
        state.current_app = app;
        state.current_category = category;
    }

    pub fn toggle_pause(&self) -> bool {
        let mut state = self.0.lock().unwrap();
        state.paused = !state.paused;
        state.tracking_active = !state.paused;
        state.paused
    }
}

/// Tray status for dynamic icon updates
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrayStatus {
    Active,   // Green - Tracking active
    Focus,    // Yellow - Focus mode
    Paused,   // Gray - Paused
}

impl AppStateWrapper {
    pub fn get_tray_status(&self) -> TrayStatus {
        let state = self.0.lock().unwrap();
        if state.focus_mode {
            TrayStatus::Focus
        } else if state.paused {
            TrayStatus::Paused
        } else {
            TrayStatus::Active
        }
    }
}
