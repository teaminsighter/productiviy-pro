// Native Activity Tracker for macOS and Windows
// Event-based tracking: only sends data when activity changes (Option 3)
// Gets foreground application, window title, and idle time without ActivityWatch

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeActivity {
    pub app_name: String,
    pub window_title: String,
    pub bundle_id: Option<String>,
    pub is_browser: bool,
    pub idle_seconds: u64,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityState {
    pub current_activity: Option<NativeActivity>,
    pub is_tracking: bool,
    pub is_idle: bool,
    pub idle_threshold_seconds: u64,
    pub last_update: Option<String>,
}

impl Default for ActivityState {
    fn default() -> Self {
        Self {
            current_activity: None,
            is_tracking: true,
            is_idle: false,
            idle_threshold_seconds: 300, // 5 minutes default
            last_update: None,
        }
    }
}

// ============================================================================
// Event-Based Session Tracking (Option 3)
// ============================================================================

/// Represents an active tracking session for a specific app/window
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivitySession {
    pub app_name: String,
    pub window_title: String,
    pub bundle_id: Option<String>,
    pub is_browser: bool,
    pub start_time: DateTime<Utc>,
    pub last_heartbeat: DateTime<Utc>,
}

/// Completed session ready to send to backend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletedSession {
    pub app_name: String,
    pub window_title: String,
    pub url: Option<String>,
    pub start_time: String,
    pub end_time: String,
    pub duration: i64, // in seconds
    pub source: String,
}

/// Event-based tracker state
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EventTrackerState {
    pub current_session: Option<ActivitySession>,
    pub is_tracking: bool,
    pub is_idle: bool,
    pub idle_threshold_seconds: u64,
    pub sessions_sent: u64,
    pub last_send_error: Option<String>,
}

pub struct ActivityTracker {
    state: Arc<Mutex<ActivityState>>,
    // Event-based tracking state
    event_state: Arc<Mutex<EventTrackerState>>,
}

impl ActivityTracker {
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(ActivityState::default())),
            event_state: Arc::new(Mutex::new(EventTrackerState {
                current_session: None,
                is_tracking: true,
                is_idle: false,
                idle_threshold_seconds: 300,
                sessions_sent: 0,
                last_send_error: None,
            })),
        }
    }

    pub fn get_state(&self) -> ActivityState {
        self.state.lock().unwrap().clone()
    }

    pub fn get_event_state(&self) -> EventTrackerState {
        self.event_state.lock().unwrap().clone()
    }

    pub fn set_tracking(&self, enabled: bool) {
        let mut state = self.state.lock().unwrap();
        state.is_tracking = enabled;

        let mut event_state = self.event_state.lock().unwrap();
        event_state.is_tracking = enabled;
    }

    pub fn set_idle_threshold(&self, seconds: u64) {
        let mut state = self.state.lock().unwrap();
        state.idle_threshold_seconds = seconds;

        let mut event_state = self.event_state.lock().unwrap();
        event_state.idle_threshold_seconds = seconds;
    }

    pub fn update_activity(&self, activity: NativeActivity) {
        let mut state = self.state.lock().unwrap();
        state.is_idle = activity.idle_seconds >= state.idle_threshold_seconds;
        state.current_activity = Some(activity);
        state.last_update = Some(chrono::Utc::now().to_rfc3339());
    }

    /// Check if activity has changed from current session
    pub fn has_activity_changed(&self, new_activity: &NativeActivity) -> bool {
        let event_state = self.event_state.lock().unwrap();

        match &event_state.current_session {
            Some(session) => {
                // Activity changed if app name OR window title changed
                session.app_name != new_activity.app_name ||
                session.window_title != new_activity.window_title
            }
            None => true, // No current session, so this is a "change"
        }
    }

    /// Start a new tracking session
    pub fn start_session(&self, activity: &NativeActivity) {
        let mut event_state = self.event_state.lock().unwrap();
        let now = Utc::now();

        event_state.current_session = Some(ActivitySession {
            app_name: activity.app_name.clone(),
            window_title: activity.window_title.clone(),
            bundle_id: activity.bundle_id.clone(),
            is_browser: activity.is_browser,
            start_time: now,
            last_heartbeat: now,
        });
        event_state.is_idle = false;

        println!("[Event Tracker] Started session: {} - {}",
            activity.app_name, activity.window_title);
    }

    /// Update heartbeat for current session (keeps session alive)
    pub fn update_heartbeat(&self) {
        let mut event_state = self.event_state.lock().unwrap();
        if let Some(ref mut session) = event_state.current_session {
            session.last_heartbeat = Utc::now();
        }
    }

    /// Finalize current session and return completed session data
    pub fn finalize_session(&self) -> Option<CompletedSession> {
        let mut event_state = self.event_state.lock().unwrap();

        if let Some(session) = event_state.current_session.take() {
            let end_time = Utc::now();
            let duration = (end_time - session.start_time).num_seconds();

            // Only count sessions longer than 1 second
            if duration >= 1 {
                println!("[Event Tracker] Finalized session: {} - {} ({}s)",
                    session.app_name, session.window_title, duration);

                return Some(CompletedSession {
                    app_name: session.app_name,
                    window_title: session.window_title,
                    url: None, // URL comes from browser extension
                    start_time: session.start_time.to_rfc3339(),
                    end_time: end_time.to_rfc3339(),
                    duration,
                    source: "native_event".to_string(),
                });
            } else {
                println!("[Event Tracker] Discarded short session (<1s): {} - {}",
                    session.app_name, session.window_title);
            }
        }

        None
    }

    /// Handle user going idle - finalize current session
    pub fn handle_idle(&self) -> Option<CompletedSession> {
        let mut event_state = self.event_state.lock().unwrap();

        if !event_state.is_idle {
            event_state.is_idle = true;
            drop(event_state); // Release lock before calling finalize

            println!("[Event Tracker] User went idle, finalizing session");
            return self.finalize_session();
        }

        None
    }

    /// Handle user becoming active after idle
    pub fn handle_active(&self, activity: &NativeActivity) {
        let mut event_state = self.event_state.lock().unwrap();

        if event_state.is_idle {
            event_state.is_idle = false;
            drop(event_state); // Release lock

            println!("[Event Tracker] User became active, starting new session");
            self.start_session(activity);
        }
    }

    /// Record successful send
    pub fn record_send_success(&self) {
        let mut event_state = self.event_state.lock().unwrap();
        event_state.sessions_sent += 1;
        event_state.last_send_error = None;
    }

    /// Record send error
    pub fn record_send_error(&self, error: String) {
        let mut event_state = self.event_state.lock().unwrap();
        event_state.last_send_error = Some(error);
    }

    /// Get current foreground activity using native OS APIs
    pub fn get_current_activity(&self) -> Option<NativeActivity> {
        if !self.state.lock().unwrap().is_tracking {
            return None;
        }

        #[cfg(target_os = "macos")]
        {
            return get_macos_activity();
        }

        #[cfg(target_os = "windows")]
        {
            return get_windows_activity();
        }

        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            return None;
        }
    }
}

// ============================================================================
// macOS Implementation using AppleScript (reliable across macOS versions)
// ============================================================================

/// Run osascript with a timeout to prevent blocking when accessibility isn't granted
#[cfg(target_os = "macos")]
fn run_osascript_with_timeout(script: &str, timeout_secs: u64) -> Option<String> {
    use std::process::{Command, Stdio};
    use std::time::{Duration, Instant};

    let mut child = Command::new("osascript")
        .args(["-e", script])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .ok()?;

    let start = Instant::now();
    let timeout = Duration::from_secs(timeout_secs);

    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                if status.success() {
                    let output = child.wait_with_output().ok()?;
                    return Some(String::from_utf8_lossy(&output.stdout).trim().to_string());
                }
                return None;
            }
            Ok(None) => {
                if start.elapsed() > timeout {
                    // Timed out - kill process and return None
                    let _ = child.kill();
                    return None;
                }
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(_) => return None,
        }
    }
}

#[cfg(target_os = "macos")]
fn get_macos_activity() -> Option<NativeActivity> {
    // Get frontmost application name and bundle ID using AppleScript
    // Use a 2 second timeout to prevent blocking if accessibility isn't granted
    let app_script = r#"
        tell application "System Events"
            set frontApp to first application process whose frontmost is true
            set appName to name of frontApp
            set bundleId to bundle identifier of frontApp
            return appName & "|" & bundleId
        end tell
    "#;

    let app_result = run_osascript_with_timeout(app_script, 2)?;
    let parts: Vec<&str> = app_result.split('|').collect();

    let app_name = parts.get(0).unwrap_or(&"Unknown").to_string();
    let bundle_id = parts.get(1).map(|s| s.to_string()).filter(|s| !s.is_empty() && s != "missing value");

    // Get window title using AppleScript
    // Different browsers need different AppleScript approaches
    let title_script = get_window_title_script(&app_name, &bundle_id);

    fn get_window_title_script(app_name: &str, bundle_id: &Option<String>) -> String {
        let app_lower = app_name.to_lowercase();
        let bundle = bundle_id.as_deref().unwrap_or("");

        // Google Chrome - use System Events to get actual frontmost window title
        // (Chrome's native AppleScript API may not see all windows when multiple profiles are active)
        // First try to get focused window, then fall back to first window with name
        if app_lower.contains("chrome") || bundle.contains("com.google.Chrome") {
            return r#"
                try
                    tell application "System Events"
                        tell process "Google Chrome"
                            set windowTitle to ""
                            -- Try to find the focused window first
                            try
                                set focusedWin to first window whose value of attribute "AXMain" is true
                                set windowTitle to name of focusedWin
                            end try
                            -- If still empty, find first window with non-empty name
                            if windowTitle is "" or windowTitle is missing value then
                                repeat with w in windows
                                    set wName to name of w
                                    if wName is not "" and wName is not missing value then
                                        set windowTitle to wName
                                        exit repeat
                                    end if
                                end repeat
                            end if
                            return windowTitle
                        end tell
                    end tell
                on error
                    return ""
                end try
            "#.to_string();
        }

        // Safari - use direct app scripting
        if app_lower.contains("safari") || bundle.contains("com.apple.Safari") {
            return r#"
                try
                    tell application "Safari"
                        set docName to name of front document
                        return docName & " - Safari"
                    end tell
                on error
                    return ""
                end try
            "#.to_string();
        }

        // Brave Browser
        if app_lower.contains("brave") || bundle.contains("com.brave.Browser") {
            return r#"
                try
                    tell application "Brave Browser"
                        set tabTitle to title of active tab of front window
                        return tabTitle & " - Brave"
                    end tell
                on error
                    return ""
                end try
            "#.to_string();
        }

        // Arc Browser
        if app_lower.contains("arc") || bundle.contains("company.thebrowser.Browser") {
            return r#"
                try
                    tell application "Arc"
                        set tabTitle to title of active tab of front window
                        return tabTitle & " - Arc"
                    end tell
                on error
                    return ""
                end try
            "#.to_string();
        }

        // Microsoft Edge
        if app_lower.contains("edge") || bundle.contains("com.microsoft.edgemac") {
            return r#"
                try
                    tell application "Microsoft Edge"
                        set tabTitle to title of active tab of front window
                        return tabTitle & " - Edge"
                    end tell
                on error
                    return ""
                end try
            "#.to_string();
        }

        // Firefox - doesn't support AppleScript well, use System Events
        // Opera, Vivaldi - use System Events as fallback
        // Default: Use System Events for window title
        format!(r#"
            tell application "System Events"
                tell process "{}"
                    try
                        set winTitle to name of front window
                        return winTitle
                    on error
                        return ""
                    end try
                end tell
            end tell
        "#, app_name.replace('"', "\\\""))
    }

    let window_title = run_osascript_with_timeout(&title_script, 2)
        .unwrap_or_default();

    // Get idle time using ioreg (IOKit)
    let idle_seconds = get_macos_idle_time();

    // Check if it's a browser
    let is_browser = is_browser_app(&app_name, &bundle_id);

    Some(NativeActivity {
        app_name,
        window_title,
        bundle_id,
        is_browser,
        idle_seconds,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

#[cfg(target_os = "macos")]
fn get_macos_idle_time() -> u64 {
    use std::process::Command;

    // Use ioreg to get idle time from IOKit HIDSystem
    let output = Command::new("ioreg")
        .args(["-c", "IOHIDSystem", "-d", "4"])
        .output()
        .ok();

    if let Some(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);

        // Parse HIDIdleTime from ioreg output
        // The value is in nanoseconds
        for line in stdout.lines() {
            if line.contains("HIDIdleTime") {
                // Extract the number from the line
                if let Some(start) = line.find('=') {
                    let value_str: String = line[start + 1..]
                        .chars()
                        .filter(|c| c.is_ascii_digit())
                        .collect();

                    if let Ok(nanoseconds) = value_str.parse::<u64>() {
                        // Convert nanoseconds to seconds
                        return nanoseconds / 1_000_000_000;
                    }
                }
            }
        }
    }

    // Fallback: use AppleScript with delay measurement (less accurate)
    0
}

fn is_browser_app(app_name: &str, bundle_id: &Option<String>) -> bool {
    let browser_names = [
        "Google Chrome", "Chrome", "Safari", "Firefox", "Microsoft Edge",
        "Brave Browser", "Arc", "Opera", "Vivaldi", "Chromium"
    ];

    let browser_bundles = [
        "com.google.Chrome", "com.apple.Safari", "org.mozilla.firefox",
        "com.microsoft.edgemac", "com.brave.Browser", "company.thebrowser.Browser",
        "com.operasoftware.Opera", "com.vivaldi.Vivaldi"
    ];

    if browser_names.iter().any(|b| app_name.contains(b)) {
        return true;
    }

    if let Some(bundle) = bundle_id {
        if browser_bundles.iter().any(|b| bundle.contains(b)) {
            return true;
        }
    }

    false
}

// ============================================================================
// Windows Implementation
// ============================================================================

#[cfg(target_os = "windows")]
fn get_windows_activity() -> Option<NativeActivity> {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
    };
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
    };

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0 == 0 {
            return None;
        }

        // Get window title
        let mut title_buf = [0u16; 512];
        let title_len = GetWindowTextW(hwnd, &mut title_buf);
        let window_title = if title_len > 0 {
            OsString::from_wide(&title_buf[..title_len as usize])
                .to_string_lossy()
                .to_string()
        } else {
            String::new()
        };

        // Get process ID
        let mut process_id: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));

        // Get process name
        let mut app_name = String::from("Unknown");
        if let Ok(process_handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id) {
            let mut name_buf = [0u16; 260];
            let mut size = name_buf.len() as u32;
            if QueryFullProcessImageNameW(process_handle, windows::Win32::System::Threading::PROCESS_NAME_FORMAT(0), windows::core::PWSTR(name_buf.as_mut_ptr()), &mut size).is_ok() {
                let full_path = OsString::from_wide(&name_buf[..size as usize])
                    .to_string_lossy()
                    .to_string();
                // Extract filename from full path
                if let Some(name) = full_path.rsplit('\\').next() {
                    app_name = name.trim_end_matches(".exe").to_string();
                }
            }
        }

        // Get idle time using GetLastInputInfo
        let idle_seconds = get_windows_idle_time();

        let is_browser = is_browser_app(&app_name, &None);

        Some(NativeActivity {
            app_name,
            window_title,
            bundle_id: None,
            is_browser,
            idle_seconds,
            timestamp: chrono::Utc::now().to_rfc3339(),
        })
    }
}

#[cfg(target_os = "windows")]
fn get_windows_idle_time() -> u64 {
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
    use windows::Win32::System::SystemInformation::GetTickCount;

    unsafe {
        let mut last_input = LASTINPUTINFO {
            cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
            dwTime: 0,
        };

        if GetLastInputInfo(&mut last_input).as_bool() {
            let current_tick = GetTickCount();
            let idle_ms = current_tick.wrapping_sub(last_input.dwTime);
            return (idle_ms / 1000) as u64;
        }
    }

    0
}

// ============================================================================
// Activity Polling & Sending to Backend
// ============================================================================

#[derive(Debug, Clone, Serialize)]
pub struct ActivityPayload {
    pub app_name: String,
    pub window_title: String,
    pub url: Option<String>,
    pub is_idle: bool,
    pub idle_seconds: u64,
    pub timestamp: String,
    pub source: String, // "native" to indicate from Tauri, not ActivityWatch
}

impl From<NativeActivity> for ActivityPayload {
    fn from(activity: NativeActivity) -> Self {
        Self {
            app_name: activity.app_name,
            window_title: activity.window_title,
            url: None, // URL comes from browser extension
            is_idle: false,
            idle_seconds: activity.idle_seconds,
            timestamp: activity.timestamp,
            source: "native".to_string(),
        }
    }
}

/// Send activity to backend (legacy - still used for real-time display)
pub async fn send_activity_to_backend(
    base_url: &str,
    token: &str,
    activity: ActivityPayload,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();

    let response = client
        .post(&format!("{}/api/activities/native", base_url))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&activity)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to send activity: {} - {}", status, text).into());
    }

    Ok(())
}

/// Send completed session to backend (Event-Based - Option 3)
/// Only called when activity changes, with accurate duration
pub async fn send_session_to_backend(
    base_url: &str,
    token: &str,
    session: CompletedSession,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();

    println!("[Event Tracker] Sending session to backend: {} - {} ({}s)",
        session.app_name, session.window_title, session.duration);

    let response = client
        .post(&format!("{}/api/activities/session", base_url))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&session)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to send session: {} - {}", status, text).into());
    }

    println!("[Event Tracker] Session sent successfully");
    Ok(())
}

/// Send current activity state to backend for real-time display
/// This updates _native_activity_state so the dashboard shows current activity
pub async fn send_current_activity_to_backend(
    base_url: &str,
    token: &str,
    activity: &NativeActivity,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();

    let payload = serde_json::json!({
        "app_name": activity.app_name,
        "window_title": activity.window_title,
        "url": null,
        "is_idle": activity.idle_seconds >= 300, // 5 min threshold
        "idle_seconds": activity.idle_seconds,
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "source": "tauri"
    });

    let response = client
        .post(&format!("{}/api/activities/native", base_url))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await?;

    if !response.status().is_success() {
        // Silently ignore errors for real-time updates
        return Ok(());
    }

    Ok(())
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_activity_state_default() {
        let state = ActivityState::default();
        assert!(state.is_tracking);
        assert!(!state.is_idle);
        assert_eq!(state.idle_threshold_seconds, 300);
    }

    #[test]
    fn test_is_browser() {
        assert!(is_browser_app("Google Chrome", &None));
        assert!(is_browser_app("Safari", &None));
        assert!(!is_browser_app("VS Code", &None));
        assert!(is_browser_app("Unknown", &Some("com.google.Chrome".to_string())));
    }
}
