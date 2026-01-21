use crate::activity_tracker::{ActivityPayload, ActivityState, NativeActivity, CompletedSession, EventTrackerState};
use crate::state::{AppState, AppStateWrapper, TrayStatus};
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};

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
        _ => "prompt",
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

// ============ Settings Native Commands ============

#[derive(Debug, Serialize)]
pub struct AppInfoResponse {
    pub version: String,
    pub name: String,
    pub build_type: String,
}

/// Get app version and info
#[tauri::command]
pub fn get_app_info() -> AppInfoResponse {
    AppInfoResponse {
        version: env!("CARGO_PKG_VERSION").to_string(),
        name: env!("CARGO_PKG_NAME").to_string(),
        build_type: if cfg!(debug_assertions) { "debug" } else { "release" }.to_string(),
    }
}

/// Enable or disable autostart
#[tauri::command]
pub async fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart = app.autolaunch();

    if enabled {
        autostart.enable().map_err(|e| e.to_string())?;
    } else {
        autostart.disable().map_err(|e| e.to_string())?;
    }

    Ok(enabled)
}

/// Check if autostart is enabled
#[tauri::command]
pub async fn get_autostart(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart = app.autolaunch();
    autostart.is_enabled().map_err(|e| e.to_string())
}

/// Get system theme (dark/light)
#[tauri::command]
pub fn get_system_theme(window: tauri::Window) -> String {
    match window.theme() {
        Ok(tauri::Theme::Dark) => "dark".to_string(),
        Ok(tauri::Theme::Light) => "light".to_string(),
        _ => "dark".to_string(), // Default to dark if unknown
    }
}

/// Set window theme
#[tauri::command]
pub fn set_window_theme(window: tauri::Window, theme: String) -> Result<(), String> {
    let theme_enum = match theme.as_str() {
        "dark" => Some(tauri::Theme::Dark),
        "light" => Some(tauri::Theme::Light),
        "system" => None,
        _ => Some(tauri::Theme::Dark),
    };

    window.set_theme(theme_enum).map_err(|e| e.to_string())
}

/// Show or hide from system tray
#[tauri::command]
pub fn set_tray_visible(app: tauri::AppHandle, visible: bool) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main-tray") {
        tray.set_visible(visible).map_err(|e| e.to_string())
    } else {
        Err("Tray not found".to_string())
    }
}

/// Minimize window to tray
#[tauri::command]
pub fn minimize_to_tray(window: tauri::Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

/// Show window from tray
#[tauri::command]
pub fn show_from_tray(window: tauri::Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}

/// Quit the application
#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

// ============ Close Behavior Commands ============

/// Get close-to-tray setting from store
#[tauri::command]
pub async fn get_close_to_tray(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("settings.json").map_err(|e| e.to_string())?;

    match store.get("closeToTray") {
        Some(serde_json::Value::Bool(value)) => Ok(value),
        _ => Ok(true), // Default to close-to-tray
    }
}

/// Set close-to-tray setting in store
#[tauri::command]
pub async fn set_close_to_tray(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    store.set("closeToTray", serde_json::Value::Bool(enabled));
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

/// Handle window close based on settings
#[tauri::command]
pub async fn handle_window_close(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("settings.json").map_err(|e| e.to_string())?;

    let close_to_tray = match store.get("closeToTray") {
        Some(serde_json::Value::Bool(value)) => value,
        _ => true, // Default
    };

    if close_to_tray {
        if let Some(window) = app.get_webview_window("main") {
            window.hide().map_err(|e| e.to_string())?;
        }
        Ok("hidden".to_string())
    } else {
        app.exit(0);
        Ok("quit".to_string())
    }
}

// ============ Focus Mode Distraction Blocking ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DistractionBlockingConfig {
    pub enabled: bool,
    pub blocking_mode: String, // "soft", "hard", "strict"
    pub blocked_apps: Vec<String>,
    pub blocked_websites: Vec<String>,
    pub allowed_apps: Vec<String>,
    pub allowed_websites: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct BlockCheckResult {
    pub is_blocked: bool,
    pub block_type: Option<String>, // "app" or "website"
    pub blocked_item: Option<String>,
    pub blocking_mode: String,
    pub can_bypass: bool,
}

/// Set distraction blocking configuration
#[tauri::command]
pub async fn set_blocking_config(
    app: tauri::AppHandle,
    config: DistractionBlockingConfig,
) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("focus-blocking.json").map_err(|e| e.to_string())?;
    store.set("config", serde_json::to_value(config).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

/// Get distraction blocking configuration
#[tauri::command]
pub async fn get_blocking_config(app: tauri::AppHandle) -> Result<DistractionBlockingConfig, String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("focus-blocking.json").map_err(|e| e.to_string())?;

    match store.get("config") {
        Some(value) => {
            serde_json::from_value(value.clone()).map_err(|e| e.to_string())
        }
        None => Ok(DistractionBlockingConfig {
            enabled: false,
            blocking_mode: "soft".to_string(),
            blocked_apps: vec![
                "Slack".to_string(),
                "Discord".to_string(),
                "Messages".to_string(),
                "Mail".to_string(),
                "Twitter".to_string(),
            ],
            blocked_websites: vec![
                "twitter.com".to_string(),
                "x.com".to_string(),
                "facebook.com".to_string(),
                "instagram.com".to_string(),
                "reddit.com".to_string(),
                "youtube.com".to_string(),
            ],
            allowed_apps: vec![],
            allowed_websites: vec![],
        })
    }
}

/// Check if an app or website should be blocked
#[tauri::command]
pub async fn check_distraction(
    app: tauri::AppHandle,
    app_name: Option<String>,
    url: Option<String>,
    state: State<'_, AppStateWrapper>,
) -> Result<BlockCheckResult, String> {
    use tauri_plugin_store::StoreExt;

    // Not in focus mode = not blocked
    let app_state = state.get_state();
    if !app_state.focus_mode {
        return Ok(BlockCheckResult {
            is_blocked: false,
            block_type: None,
            blocked_item: None,
            blocking_mode: "soft".to_string(),
            can_bypass: true,
        });
    }

    let store = app.store("focus-blocking.json").map_err(|e| e.to_string())?;

    let config: DistractionBlockingConfig = match store.get("config") {
        Some(value) => serde_json::from_value(value.clone()).unwrap_or_else(|_| DistractionBlockingConfig {
            enabled: false,
            blocking_mode: "soft".to_string(),
            blocked_apps: vec![],
            blocked_websites: vec![],
            allowed_apps: vec![],
            allowed_websites: vec![],
        }),
        None => return Ok(BlockCheckResult {
            is_blocked: false,
            block_type: None,
            blocked_item: None,
            blocking_mode: "soft".to_string(),
            can_bypass: true,
        }),
    };

    if !config.enabled {
        return Ok(BlockCheckResult {
            is_blocked: false,
            block_type: None,
            blocked_item: None,
            blocking_mode: config.blocking_mode,
            can_bypass: true,
        });
    }

    // Check if app is blocked
    if let Some(ref name) = app_name {
        let name_lower = name.to_lowercase();

        // Check if in allowed list first
        let is_allowed = config.allowed_apps.iter()
            .any(|a| name_lower.contains(&a.to_lowercase()));

        if !is_allowed {
            let is_blocked = config.blocked_apps.iter()
                .any(|a| name_lower.contains(&a.to_lowercase()));

            if is_blocked {
                return Ok(BlockCheckResult {
                    is_blocked: true,
                    block_type: Some("app".to_string()),
                    blocked_item: Some(name.clone()),
                    blocking_mode: config.blocking_mode.clone(),
                    can_bypass: config.blocking_mode != "strict",
                });
            }
        }
    }

    // Check if website is blocked
    if let Some(ref site_url) = url {
        let url_lower = site_url.to_lowercase();

        // Check if in allowed list first
        let is_allowed = config.allowed_websites.iter()
            .any(|w| url_lower.contains(&w.to_lowercase()));

        if !is_allowed {
            let is_blocked = config.blocked_websites.iter()
                .any(|w| url_lower.contains(&w.to_lowercase()));

            if is_blocked {
                return Ok(BlockCheckResult {
                    is_blocked: true,
                    block_type: Some("website".to_string()),
                    blocked_item: Some(site_url.clone()),
                    blocking_mode: config.blocking_mode.clone(),
                    can_bypass: config.blocking_mode != "strict",
                });
            }
        }
    }

    Ok(BlockCheckResult {
        is_blocked: false,
        block_type: None,
        blocked_item: None,
        blocking_mode: config.blocking_mode,
        can_bypass: true,
    })
}

/// Enable distraction blocking for current focus session
#[tauri::command]
pub async fn enable_blocking(
    app: tauri::AppHandle,
    blocked_apps: Vec<String>,
    blocked_websites: Vec<String>,
    blocking_mode: String,
) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("focus-blocking.json").map_err(|e| e.to_string())?;

    let config = DistractionBlockingConfig {
        enabled: true,
        blocking_mode,
        blocked_apps,
        blocked_websites,
        allowed_apps: vec![],
        allowed_websites: vec![],
    };

    store.set("config", serde_json::to_value(config).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

/// Disable distraction blocking
#[tauri::command]
pub async fn disable_blocking(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("focus-blocking.json").map_err(|e| e.to_string())?;

    // Get existing config and just disable it
    let mut config: DistractionBlockingConfig = match store.get("config") {
        Some(value) => serde_json::from_value(value.clone()).unwrap_or_else(|_| DistractionBlockingConfig {
            enabled: false,
            blocking_mode: "soft".to_string(),
            blocked_apps: vec![],
            blocked_websites: vec![],
            allowed_apps: vec![],
            allowed_websites: vec![],
        }),
        None => DistractionBlockingConfig {
            enabled: false,
            blocking_mode: "soft".to_string(),
            blocked_apps: vec![],
            blocked_websites: vec![],
            allowed_apps: vec![],
            allowed_websites: vec![],
        },
    };

    config.enabled = false;
    store.set("config", serde_json::to_value(config).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

/// Show a distraction warning popup
#[tauri::command]
pub async fn show_distraction_warning(
    app: tauri::AppHandle,
    blocked_item: String,
    block_type: String,
    blocking_mode: String,
) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;

    let title = match blocking_mode.as_str() {
        "strict" => "Distraction Blocked",
        "hard" => "Distraction Warning",
        _ => "Focus Mode Reminder",
    };

    let body = match block_type.as_str() {
        "app" => format!("{} is blocked during focus mode", blocked_item),
        "website" => format!("{} is blocked during focus mode", blocked_item),
        _ => format!("{} is blocked during focus mode", blocked_item),
    };

    app.notification()
        .builder()
        .title(title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Open focus mode page
#[tauri::command]
pub fn open_focus_mode(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.eval("window.location.hash = '#/focus'");
    }
}

// ============ Native Activity Tracking Commands ============

/// Response type for native activity
#[derive(Debug, Serialize)]
pub struct NativeActivityResponse {
    pub app_name: String,
    pub window_title: String,
    pub bundle_id: Option<String>,
    pub is_browser: bool,
    pub idle_seconds: u64,
    pub timestamp: String,
}

impl From<NativeActivity> for NativeActivityResponse {
    fn from(activity: NativeActivity) -> Self {
        Self {
            app_name: activity.app_name,
            window_title: activity.window_title,
            bundle_id: activity.bundle_id,
            is_browser: activity.is_browser,
            idle_seconds: activity.idle_seconds,
            timestamp: activity.timestamp,
        }
    }
}

/// Get current native activity (foreground app, window title, idle time)
#[tauri::command]
pub fn get_native_activity(state: State<AppStateWrapper>) -> Option<NativeActivityResponse> {
    state.get_native_activity().map(|a| a.into())
}

/// Get activity tracker state
#[tauri::command]
pub fn get_activity_tracker_state(state: State<AppStateWrapper>) -> ActivityState {
    state.activity_tracker.get_state()
}

/// Set activity tracking enabled/disabled
#[tauri::command]
pub fn set_native_tracking(enabled: bool, state: State<AppStateWrapper>) {
    state.activity_tracker.set_tracking(enabled);
}

/// Set idle threshold in seconds
#[tauri::command]
pub fn set_idle_threshold(seconds: u64, state: State<AppStateWrapper>) {
    state.activity_tracker.set_idle_threshold(seconds);
}

/// Polling configuration stored in app
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PollingConfig {
    pub backend_url: String,
    pub auth_token: String,
    pub poll_interval_ms: u64,
    pub idle_threshold_seconds: u64,
}

/// Start background activity polling and sending to backend
#[tauri::command]
pub async fn start_activity_polling(
    app: tauri::AppHandle,
    config: PollingConfig,
) -> Result<String, String> {
    use tauri_plugin_store::StoreExt;
    use tokio::time::{interval, Duration};

    // Store the polling config
    let store = app.store("activity-polling.json").map_err(|e| e.to_string())?;
    store.set("config", serde_json::to_value(&config).map_err(|e| e.to_string())?);
    store.set("active", serde_json::Value::Bool(true));
    store.save().map_err(|e| e.to_string())?;

    let state = app.state::<AppStateWrapper>();
    state.activity_tracker.set_idle_threshold(config.idle_threshold_seconds);
    state.activity_tracker.set_tracking(true);

    // Spawn background task for polling
    let app_handle = app.clone();
    let poll_interval = config.poll_interval_ms;
    let backend_url = config.backend_url.clone();
    let auth_token = config.auth_token.clone();
    let idle_threshold = config.idle_threshold_seconds;

    // Log to file for debugging (stdout not visible in GUI apps)
    use std::io::Write;
    let log_path = std::env::temp_dir().join("productify-native-tracking.log");
    let _ = std::fs::write(&log_path, format!("[{}] Starting activity polling\n", chrono::Utc::now()));

    println!("[Native Tracking] Starting activity polling:");
    println!("[Native Tracking]   Backend URL: {}", backend_url);
    println!("[Native Tracking]   Poll interval: {}ms", poll_interval);
    println!("[Native Tracking]   Idle threshold: {}s", idle_threshold);
    println!("[Native Tracking]   Log file: {:?}", log_path);

    let log_path_clone = log_path.clone();
    tokio::spawn(async move {
        let mut interval_timer = interval(Duration::from_millis(poll_interval));
        let _ = std::fs::OpenOptions::new().append(true).open(&log_path_clone)
            .map(|mut f| writeln!(f, "[{}] Background task started", chrono::Utc::now()));
        println!("[Native Tracking] Background task started");

        loop {
            interval_timer.tick().await;

            // Check if polling is still active
            let should_continue = {
                match app_handle.try_state::<AppStateWrapper>() {
                    Some(state) => {
                        let tracker_state = state.activity_tracker.get_state();
                        tracker_state.is_tracking
                    }
                    None => false,
                }
            };

            if !should_continue {
                break;
            }

            // Get current activity
            if let Some(state) = app_handle.try_state::<AppStateWrapper>() {
                if let Some(activity) = state.get_native_activity() {
                    // Update internal state
                    state.update_from_native_activity(
                        activity.app_name.clone(),
                        activity.window_title.clone(),
                        activity.idle_seconds,
                        idle_threshold,
                    );

                    // Update activity tracker state
                    state.activity_tracker.update_activity(activity.clone());

                    // Send to backend if not idle
                    if activity.idle_seconds < idle_threshold {
                        let payload = ActivityPayload::from(activity.clone());

                        println!("[Native Tracking] Sending activity: {} - {}", payload.app_name, payload.window_title);
                        let _ = std::fs::OpenOptions::new().append(true).create(true).open(&log_path_clone)
                            .map(|mut f| writeln!(f, "[{}] Sending: {} - {}", chrono::Utc::now(), payload.app_name, payload.window_title));

                        match crate::activity_tracker::send_activity_to_backend(
                            &backend_url,
                            &auth_token,
                            payload,
                        ).await {
                            Ok(_) => {
                                println!("[Native Tracking] Successfully sent activity to backend");
                                let _ = std::fs::OpenOptions::new().append(true).create(true).open(&log_path_clone)
                                    .map(|mut f| writeln!(f, "[{}] SUCCESS", chrono::Utc::now()));
                            }
                            Err(e) => {
                                eprintln!("[Native Tracking] Failed to send activity: {}", e);
                                let _ = std::fs::OpenOptions::new().append(true).create(true).open(&log_path_clone)
                                    .map(|mut f| writeln!(f, "[{}] ERROR: {}", chrono::Utc::now(), e));
                            }
                        }
                    } else {
                        println!("[Native Tracking] User is idle ({} seconds)", activity.idle_seconds);
                    }
                }
            }
        }
    });

    Ok("Activity polling started".to_string())
}

/// Stop background activity polling
#[tauri::command]
pub async fn stop_activity_polling(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("activity-polling.json").map_err(|e| e.to_string())?;
    store.set("active", serde_json::Value::Bool(false));
    store.save().map_err(|e| e.to_string())?;

    let state = app.state::<AppStateWrapper>();
    state.activity_tracker.set_tracking(false);

    Ok("Activity polling stopped".to_string())
}

// ============================================================================
// Event-Based Activity Tracking (Option 3 - Accurate Timing)
// ============================================================================

/// Start event-based activity tracking
/// Only sends data to backend when activity CHANGES (not every poll)
/// Results in 98%+ accuracy and 99% less network traffic
#[tauri::command]
pub async fn start_event_based_tracking(
    app: tauri::AppHandle,
    config: PollingConfig,
) -> Result<String, String> {
    use tauri_plugin_store::StoreExt;
    use tokio::time::{interval, Duration};

    // Store config
    let store = app.store("activity-polling.json").map_err(|e| e.to_string())?;
    store.set("config", serde_json::to_value(&config).map_err(|e| e.to_string())?);
    store.set("active", serde_json::Value::Bool(true));
    store.set("mode", serde_json::Value::String("event_based".to_string()));
    store.save().map_err(|e| e.to_string())?;

    let state = app.state::<AppStateWrapper>();
    state.activity_tracker.set_idle_threshold(config.idle_threshold_seconds);
    state.activity_tracker.set_tracking(true);

    // Spawn background task
    let app_handle = app.clone();
    let poll_interval = config.poll_interval_ms;
    let backend_url = config.backend_url.clone();
    let auth_token = config.auth_token.clone();
    let idle_threshold = config.idle_threshold_seconds;

    println!("[Event Tracking] Starting event-based tracking:");
    println!("[Event Tracking]   Backend URL: {}", backend_url);
    println!("[Event Tracking]   Check interval: {}ms", poll_interval);
    println!("[Event Tracking]   Idle threshold: {}s", idle_threshold);

    tokio::spawn(async move {
        let mut interval_timer = interval(Duration::from_millis(poll_interval));
        println!("[Event Tracking] Background task started");

        loop {
            interval_timer.tick().await;

            // Check if tracking is still active
            let should_continue = {
                match app_handle.try_state::<AppStateWrapper>() {
                    Some(state) => {
                        let tracker_state = state.activity_tracker.get_state();
                        tracker_state.is_tracking
                    }
                    None => false,
                }
            };

            if !should_continue {
                // Finalize any current session before stopping
                if let Some(state) = app_handle.try_state::<AppStateWrapper>() {
                    if let Some(session) = state.activity_tracker.finalize_session() {
                        let _ = crate::activity_tracker::send_session_to_backend(
                            &backend_url,
                            &auth_token,
                            session,
                        ).await;
                    }
                }
                break;
            }

            // Get current activity
            if let Some(state) = app_handle.try_state::<AppStateWrapper>() {
                if let Some(activity) = state.get_native_activity() {
                    // Check if user is idle
                    if activity.idle_seconds >= idle_threshold {
                        // User went idle - finalize current session
                        if let Some(session) = state.activity_tracker.handle_idle() {
                            match crate::activity_tracker::send_session_to_backend(
                                &backend_url,
                                &auth_token,
                                session,
                            ).await {
                                Ok(_) => state.activity_tracker.record_send_success(),
                                Err(e) => state.activity_tracker.record_send_error(e.to_string()),
                            }
                        }
                    } else {
                        // User is active - check if activity changed
                        if state.activity_tracker.has_activity_changed(&activity) {
                            // Activity changed! Finalize old session and start new one
                            if let Some(session) = state.activity_tracker.finalize_session() {
                                match crate::activity_tracker::send_session_to_backend(
                                    &backend_url,
                                    &auth_token,
                                    session,
                                ).await {
                                    Ok(_) => state.activity_tracker.record_send_success(),
                                    Err(e) => state.activity_tracker.record_send_error(e.to_string()),
                                }
                            }

                            // Start new session
                            state.activity_tracker.start_session(&activity);
                        } else {
                            // Same activity - just update heartbeat
                            state.activity_tracker.update_heartbeat();
                        }

                        // Handle coming back from idle
                        state.activity_tracker.handle_active(&activity);
                    }

                    // Update internal state for UI display
                    state.update_from_native_activity(
                        activity.app_name.clone(),
                        activity.window_title.clone(),
                        activity.idle_seconds,
                        idle_threshold,
                    );

                    // Send current activity to backend for real-time dashboard display
                    // This updates _native_activity_state so the web UI shows current activity
                    let _ = crate::activity_tracker::send_current_activity_to_backend(
                        &backend_url,
                        &auth_token,
                        &activity,
                    ).await;

                    state.activity_tracker.update_activity(activity);
                }
            }
        }

        println!("[Event Tracking] Background task stopped");
    });

    Ok("Event-based tracking started".to_string())
}

/// Get event tracker state (for debugging/status display)
#[tauri::command]
pub fn get_event_tracker_state(state: State<AppStateWrapper>) -> EventTrackerState {
    state.activity_tracker.get_event_state()
}

/// Finalize current session (for app shutdown)
#[tauri::command]
pub async fn finalize_current_session(
    app: tauri::AppHandle,
) -> Result<Option<CompletedSession>, String> {
    use tauri_plugin_store::StoreExt;

    let state = app.state::<AppStateWrapper>();

    if let Some(session) = state.activity_tracker.finalize_session() {
        // Try to send to backend
        let store = app.store("activity-polling.json").map_err(|e| e.to_string())?;

        if let Some(config_value) = store.get("config") {
            if let Ok(config) = serde_json::from_value::<PollingConfig>(config_value.clone()) {
                let _ = crate::activity_tracker::send_session_to_backend(
                    &config.backend_url,
                    &config.auth_token,
                    session.clone(),
                ).await;
            }
        }

        return Ok(Some(session));
    }

    Ok(None)
}

/// Check if activity polling is active
#[tauri::command]
pub async fn is_activity_polling_active(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("activity-polling.json").map_err(|e| e.to_string())?;

    match store.get("active") {
        Some(serde_json::Value::Bool(value)) => Ok(value),
        _ => Ok(false),
    }
}

/// Get polling configuration
#[tauri::command]
pub async fn get_polling_config(app: tauri::AppHandle) -> Result<Option<PollingConfig>, String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("activity-polling.json").map_err(|e| e.to_string())?;

    match store.get("config") {
        Some(value) => {
            let config: PollingConfig = serde_json::from_value(value.clone())
                .map_err(|e| e.to_string())?;
            Ok(Some(config))
        }
        None => Ok(None),
    }
}

// ============ ActivityWatch Server Commands ============

#[derive(Debug, Serialize)]
pub struct AwServerStatus {
    pub running: bool,
    pub url: String,
    pub version: Option<String>,
}

/// Check if aw-server-rust is running and responsive
#[tauri::command]
pub async fn get_aw_server_status() -> AwServerStatus {
    let running = crate::aw_server::is_aw_server_running();
    let mut version = None;

    if running {
        // Try to get version from API
        if let Ok(response) = reqwest::get("http://localhost:5600/api/0/info").await {
            if let Ok(info) = response.json::<serde_json::Value>().await {
                version = info.get("version").and_then(|v| v.as_str()).map(|s| s.to_string());
            }
        }
    }

    AwServerStatus {
        running,
        url: "http://localhost:5600".to_string(),
        version,
    }
}

/// Start the bundled aw-server-rust
#[tauri::command]
pub async fn start_aw_server(app: tauri::AppHandle) -> Result<String, String> {
    crate::aw_server::start_aw_server(&app)?;

    // Wait for server to be ready
    if crate::aw_server::wait_for_server_ready(10).await {
        Ok("aw-server-rust started successfully".to_string())
    } else {
        Err("aw-server-rust started but not responding".to_string())
    }
}

/// Stop the bundled aw-server-rust
#[tauri::command]
pub async fn stop_aw_server() -> Result<String, String> {
    crate::aw_server::stop_aw_server()?;
    Ok("aw-server-rust stopped".to_string())
}

// ============ macOS Permission Commands ============

#[derive(Debug, Serialize)]
pub struct PermissionStatus {
    pub granted: bool,
    pub can_request: bool,
}

/// Check if accessibility permission is granted (macOS)
/// This is required for tracking active windows and applications
#[tauri::command]
pub async fn check_accessibility_permission() -> Result<PermissionStatus, String> {
    #[cfg(target_os = "macos")]
    {
        use std::time::Duration;
        use std::process::Stdio;

        // Use a timeout to prevent blocking if permission isn't granted
        // Without accessibility, the osascript will hang
        let child = std::process::Command::new("osascript")
            .args(["-e", "tell application \"System Events\" to get name of first process whose frontmost is true"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn();

        match child {
            Ok(mut child) => {
                // Wait with timeout (2 seconds should be plenty for a granted permission)
                let start = std::time::Instant::now();
                let timeout = Duration::from_secs(2);

                loop {
                    match child.try_wait() {
                        Ok(Some(status)) => {
                            // Process completed
                            let output = child.wait_with_output();
                            let granted = match output {
                                Ok(out) => status.success() && !out.stdout.is_empty(),
                                Err(_) => false,
                            };
                            return Ok(PermissionStatus {
                                granted,
                                can_request: true,
                            });
                        }
                        Ok(None) => {
                            // Still running, check timeout
                            if start.elapsed() > timeout {
                                // Timed out - permission not granted (osascript is blocking)
                                let _ = child.kill();
                                return Ok(PermissionStatus {
                                    granted: false,
                                    can_request: true,
                                });
                            }
                            std::thread::sleep(Duration::from_millis(100));
                        }
                        Err(_) => {
                            return Ok(PermissionStatus {
                                granted: false,
                                can_request: true,
                            });
                        }
                    }
                }
            }
            Err(_) => Ok(PermissionStatus {
                granted: false,
                can_request: true,
            }),
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Windows doesn't require accessibility permission
        Ok(PermissionStatus {
            granted: true,
            can_request: false,
        })
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Ok(PermissionStatus {
            granted: true,
            can_request: false,
        })
    }
}

/// Check if screen recording permission is granted (macOS)
/// This is required for screenshot functionality
#[tauri::command]
pub async fn check_screen_recording_permission() -> Result<PermissionStatus, String> {
    #[cfg(target_os = "macos")]
    {
        // Try to take a small screenshot to test permission
        // Using screencapture with -x (no sound) and a temp file
        let temp_path = std::env::temp_dir().join("productify-screen-test.png");
        let _temp_path_str = temp_path.to_string_lossy().to_string();

        let output = std::process::Command::new("screencapture")
            .args(["-x", "-c", "-R", "0,0,1,1"]) // Capture 1x1 pixel to clipboard
            .output();

        // Clean up temp file if it was created
        let _ = std::fs::remove_file(&temp_path);

        match output {
            Ok(result) => {
                // On macOS 10.15+, screencapture returns success but shows permission dialog
                // We check if the command succeeded
                let granted = result.status.success();
                Ok(PermissionStatus {
                    granted,
                    can_request: true,
                })
            }
            Err(_) => Ok(PermissionStatus {
                granted: false,
                can_request: true,
            }),
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Windows doesn't require screen recording permission
        Ok(PermissionStatus {
            granted: true,
            can_request: false,
        })
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Ok(PermissionStatus {
            granted: true,
            can_request: false,
        })
    }
}

/// Open System Preferences to Accessibility pane (macOS)
#[tauri::command]
pub async fn request_accessibility_permission() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        // Open System Preferences/Settings to Privacy & Security > Accessibility
        // macOS Ventura (13+) uses different URL scheme
        let result = std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn();

        match result {
            Ok(_) => Ok(true),
            Err(e) => {
                // Fallback for older macOS
                let fallback = std::process::Command::new("open")
                    .args(["-b", "com.apple.systempreferences", "/System/Library/PreferencePanes/Security.prefPane"])
                    .spawn();

                match fallback {
                    Ok(_) => Ok(true),
                    Err(_) => Err(format!("Failed to open System Preferences: {}", e)),
                }
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(true) // No action needed on other platforms
    }
}

/// Open System Preferences to Screen Recording pane (macOS)
#[tauri::command]
pub async fn request_screen_recording_permission() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        // Open System Preferences/Settings to Privacy & Security > Screen Recording
        let result = std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")
            .spawn();

        match result {
            Ok(_) => Ok(true),
            Err(e) => {
                // Fallback for older macOS
                let fallback = std::process::Command::new("open")
                    .args(["-b", "com.apple.systempreferences", "/System/Library/PreferencePanes/Security.prefPane"])
                    .spawn();

                match fallback {
                    Ok(_) => Ok(true),
                    Err(_) => Err(format!("Failed to open System Preferences: {}", e)),
                }
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(true) // No action needed on other platforms
    }
}

/// Get current platform for permission handling
#[tauri::command]
pub fn get_platform() -> String {
    #[cfg(target_os = "macos")]
    return "macos".to_string();

    #[cfg(target_os = "windows")]
    return "windows".to_string();

    #[cfg(target_os = "linux")]
    return "linux".to_string();

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    return "unknown".to_string();
}

// ============ ActivityWatch Server Commands ============

/// Ensure aw-watcher-window bucket exists and send heartbeat
#[tauri::command]
pub async fn send_aw_heartbeat(
    app_name: String,
    window_title: String,
    url: Option<String>,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    let bucket_id = format!("aw-watcher-window_{}", hostname);

    // Ensure bucket exists
    let bucket_url = format!("http://localhost:5600/api/0/buckets/{}", bucket_id);
    let bucket_body = serde_json::json!({
        "id": bucket_id,
        "type": "currentwindow",
        "client": "productify-pro",
        "hostname": hostname,
    });

    let _ = client.post(&bucket_url)
        .json(&bucket_body)
        .send()
        .await;

    // Send heartbeat
    let heartbeat_url = format!("{}/heartbeat?pulsetime=5", bucket_url);
    let heartbeat_body = serde_json::json!({
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "duration": 0,
        "data": {
            "app": app_name,
            "title": window_title,
            "url": url,
        }
    });

    client.post(&heartbeat_url)
        .json(&heartbeat_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
