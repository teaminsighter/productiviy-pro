use crate::state::{AppState, AppStateWrapper, TrayStatus};
use serde::{Deserialize, Serialize};
use tauri::State;

// ============ Response Types ============

#[derive(Debug, Serialize)]
pub struct TrackingStatusResponse {
    pub active: bool,
    pub paused: bool,
    pub focus_mode: bool,
    pub current_app: Option<String>,
    pub current_category: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FocusStatusResponse {
    pub active: bool,
    pub duration: u32,
    pub elapsed: u32,
    pub remaining: u32,
    pub progress: f32,
    pub session_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TrayStatusResponse {
    pub status: String,
    pub tooltip: String,
}

// ============ Request Types ============

#[derive(Debug, Deserialize)]
pub struct StartFocusRequest {
    pub duration: u32,
    pub session_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateActivityRequest {
    pub app_name: Option<String>,
    pub category: Option<String>,
}

// ============ Commands ============

/// Get current tracking status
#[tauri::command]
pub fn get_tracking_status(state: State<AppStateWrapper>) -> TrackingStatusResponse {
    let app_state = state.get_state();
    TrackingStatusResponse {
        active: app_state.tracking_active,
        paused: app_state.paused,
        focus_mode: app_state.focus_mode,
        current_app: app_state.current_app,
        current_category: app_state.current_category,
    }
}

/// Toggle tracking on/off
#[tauri::command]
pub fn toggle_tracking(state: State<AppStateWrapper>) -> TrackingStatusResponse {
    let paused = state.toggle_pause();
    let app_state = state.get_state();
    TrackingStatusResponse {
        active: !paused,
        paused,
        focus_mode: app_state.focus_mode,
        current_app: app_state.current_app,
        current_category: app_state.current_category,
    }
}

/// Pause tracking
#[tauri::command]
pub fn pause_tracking(state: State<AppStateWrapper>) -> TrackingStatusResponse {
    state.set_tracking(false);
    get_tracking_status(state)
}

/// Resume tracking
#[tauri::command]
pub fn resume_tracking(state: State<AppStateWrapper>) -> TrackingStatusResponse {
    state.set_tracking(true);
    get_tracking_status(state)
}

/// Start focus mode
#[tauri::command]
pub fn start_focus_mode(
    duration: u32,
    session_name: Option<String>,
    state: State<AppStateWrapper>,
) -> FocusStatusResponse {
    state.set_focus_mode(true, duration, session_name.clone());
    FocusStatusResponse {
        active: true,
        duration,
        elapsed: 0,
        remaining: duration,
        progress: 0.0,
        session_name,
    }
}

/// End focus mode
#[tauri::command]
pub fn end_focus_mode(state: State<AppStateWrapper>) -> FocusStatusResponse {
    state.end_focus_mode();
    FocusStatusResponse {
        active: false,
        duration: 0,
        elapsed: 0,
        remaining: 0,
        progress: 0.0,
        session_name: None,
    }
}

/// Get current focus status
#[tauri::command]
pub fn get_focus_status(state: State<AppStateWrapper>) -> FocusStatusResponse {
    let app_state = state.get_state();
    let remaining = if app_state.focus_duration > app_state.focus_elapsed {
        app_state.focus_duration - app_state.focus_elapsed
    } else {
        0
    };
    let progress = if app_state.focus_duration > 0 {
        (app_state.focus_elapsed as f32 / app_state.focus_duration as f32) * 100.0
    } else {
        0.0
    };

    FocusStatusResponse {
        active: app_state.focus_mode,
        duration: app_state.focus_duration,
        elapsed: app_state.focus_elapsed,
        remaining,
        progress,
        session_name: app_state.focus_session_name,
    }
}

/// Update focus elapsed time
#[tauri::command]
pub fn update_focus_elapsed(elapsed: u32, state: State<AppStateWrapper>) -> FocusStatusResponse {
    state.update_focus_elapsed(elapsed);
    get_focus_status(state)
}

/// Update current activity (for tray tooltip)
#[tauri::command]
pub fn update_current_activity(
    app_name: Option<String>,
    category: Option<String>,
    state: State<AppStateWrapper>,
) {
    state.set_current_activity(app_name, category);
}

/// Get tray status for icon updates
#[tauri::command]
pub fn get_tray_status(state: State<AppStateWrapper>) -> TrayStatusResponse {
    let app_state = state.get_state();
    let tray_status = state.get_tray_status();

    let status = match tray_status {
        TrayStatus::Active => "active",
        TrayStatus::Focus => "focus",
        TrayStatus::Paused => "paused",
    };

    let tooltip = if app_state.focus_mode {
        let remaining = if app_state.focus_duration > app_state.focus_elapsed {
            let secs = app_state.focus_duration - app_state.focus_elapsed;
            let mins = secs / 60;
            let hrs = mins / 60;
            if hrs > 0 {
                format!("{}h {}m", hrs, mins % 60)
            } else {
                format!("{}m", mins)
            }
        } else {
            "0m".to_string()
        };
        format!(
            "Focus Mode - {} remaining\n{}",
            remaining,
            app_state.focus_session_name.unwrap_or_default()
        )
    } else if app_state.paused {
        "Productify Pro - Paused".to_string()
    } else {
        let activity = app_state
            .current_app
            .as_ref()
            .map(|app| format!("Using: {}", app))
            .unwrap_or_else(|| "Tracking Active".to_string());
        format!("Productify Pro\n{}", activity)
    };

    TrayStatusResponse {
        status: status.to_string(),
        tooltip,
    }
}

/// Capture a screenshot (placeholder)
#[tauri::command]
pub fn capture_screenshot() -> Result<String, String> {
    // This would integrate with the backend screenshot capture
    Ok("Screenshot capture triggered".to_string())
}

/// Open settings window
#[tauri::command]
pub fn open_settings(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        // Navigate to settings - handled by frontend
        let _ = window.eval("window.location.hash = '#/settings'");
    }
}

/// Open goals page
#[tauri::command]
pub fn open_goals(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.eval("window.location.hash = '#/goals'");
    }
}

/// Show daily summary
#[tauri::command]
pub fn show_daily_summary(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.eval("window.location.hash = '#/analytics'");
    }
}

/// Get full app state (for debugging/sync)
#[tauri::command]
pub fn get_app_state(state: State<AppStateWrapper>) -> AppState {
    state.get_state()
}

// ============ Native Notification Commands ============

/// Send a native OS notification
#[tauri::command]
pub async fn send_native_notification(
    app: tauri::AppHandle,
    title: String,
    body: String,
    _icon: Option<String>,
) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;

    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Request notification permission
#[tauri::command]
pub async fn request_notification_permission(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_notification::NotificationExt;

    let permission = app.notification().request_permission().map_err(|e| e.to_string())?;

    match permission {
        tauri_plugin_notification::PermissionState::Granted => Ok(true),
        _ => Ok(false),
    }
}

/// Check notification permission
#[tauri::command]
pub async fn check_notification_permission(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_notification::NotificationExt;

    let permission = app.notification().permission_state().map_err(|e| e.to_string())?;

    let status = match permission {
        tauri_plugin_notification::PermissionState::Granted => "granted",
        tauri_plugin_notification::PermissionState::Denied => "denied",
        tauri_plugin_notification::PermissionState::Unknown => "unknown",
    };

    Ok(status.to_string())
}

/// Send notification with actions (for smart notifications)
#[tauri::command]
pub async fn send_smart_notification(
    app: tauri::AppHandle,
    notification_type: String,
    title: String,
    body: String,
) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;

    // Different notification configs based on type
    let mut builder = app.notification().builder();
    builder = builder.title(&title).body(&body);

    // Add type-specific configuration
    match notification_type.as_str() {
        "distraction_alert" | "streak_alert" => {
            // High priority for alerts
            builder = builder.sound("default");
        }
        "goal_achieved" | "daily_summary" => {
            // Success notifications
            builder = builder.sound("default");
        }
        "break_suggestion" | "focus_reminder" => {
            // Softer notifications
            builder = builder.sound("default");
        }
        _ => {}
    }

    builder.show().map_err(|e| e.to_string())?;

    Ok(())
}
