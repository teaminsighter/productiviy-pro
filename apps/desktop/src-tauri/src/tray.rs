use crate::state::{AppStateWrapper, TrayStatus};
use tauri::{
    image::Image,
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu},
    tray::{TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Result,
};

/// Create the system tray with all menu items
pub fn create_tray(app: &AppHandle) -> Result<TrayIcon> {
    // Create menu items
    let show_dashboard = MenuItem::with_id(app, "show_dashboard", "Show Dashboard", true, None::<&str>)?;
    let separator1 = PredefinedMenuItem::separator(app)?;

    // Tracking controls
    let pause_tracking = MenuItem::with_id(app, "pause_tracking", "Pause Tracking", true, None::<&str>)?;
    let resume_tracking = MenuItem::with_id(app, "resume_tracking", "Resume Tracking", true, None::<&str>)?;

    let separator2 = PredefinedMenuItem::separator(app)?;

    // Focus mode submenu
    let focus_25 = MenuItem::with_id(app, "focus_25", "25 minutes (Pomodoro)", true, None::<&str>)?;
    let focus_45 = MenuItem::with_id(app, "focus_45", "45 minutes (Deep Work)", true, None::<&str>)?;
    let focus_60 = MenuItem::with_id(app, "focus_60", "60 minutes (Extended)", true, None::<&str>)?;
    let focus_90 = MenuItem::with_id(app, "focus_90", "90 minutes (Flow State)", true, None::<&str>)?;
    let focus_custom = MenuItem::with_id(app, "focus_custom", "Custom Duration...", true, None::<&str>)?;
    let end_focus = MenuItem::with_id(app, "end_focus", "End Focus Session", true, None::<&str>)?;

    let focus_submenu = Submenu::with_id_and_items(
        app,
        "focus_menu",
        "Start Focus Session",
        true,
        &[&focus_25, &focus_45, &focus_60, &focus_90, &focus_custom],
    )?;

    let separator3 = PredefinedMenuItem::separator(app)?;

    // Quick actions
    let view_goals = MenuItem::with_id(app, "view_goals", "View Goals", true, None::<&str>)?;
    let daily_summary = MenuItem::with_id(app, "daily_summary", "Daily Summary", true, None::<&str>)?;
    let take_screenshot = MenuItem::with_id(app, "take_screenshot", "Take Screenshot", true, None::<&str>)?;

    let separator4 = PredefinedMenuItem::separator(app)?;

    // Settings and quit
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let about = MenuItem::with_id(app, "about", "About Productify Pro", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Productify Pro", true, None::<&str>)?;

    // Build menu
    let menu = Menu::with_items(
        app,
        &[
            &show_dashboard,
            &separator1,
            &pause_tracking,
            &resume_tracking,
            &separator2,
            &focus_submenu,
            &end_focus,
            &separator3,
            &view_goals,
            &daily_summary,
            &take_screenshot,
            &separator4,
            &settings,
            &about,
            &quit,
        ],
    )?;

    // Build tray icon
    let tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Productify Pro - Tracking Active")
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(handle_tray_event)
        .build(app)?;

    Ok(tray)
}

/// Handle tray menu events
fn handle_menu_event(app: &AppHandle, event: MenuEvent) {
    let state = app.state::<AppStateWrapper>();

    match event.id.as_ref() {
        "quit" => {
            app.exit(0);
        }
        "show_dashboard" => {
            show_main_window(app);
        }
        "pause_tracking" => {
            state.set_tracking(false);
            update_tray_for_status(app, TrayStatus::Paused);
        }
        "resume_tracking" => {
            state.set_tracking(true);
            let status = if state.get_state().focus_mode {
                TrayStatus::Focus
            } else {
                TrayStatus::Active
            };
            update_tray_for_status(app, status);
        }
        "focus_25" => {
            start_focus_from_tray(app, 25 * 60, "Pomodoro Session");
        }
        "focus_45" => {
            start_focus_from_tray(app, 45 * 60, "Deep Work Session");
        }
        "focus_60" => {
            start_focus_from_tray(app, 60 * 60, "Extended Focus");
        }
        "focus_90" => {
            start_focus_from_tray(app, 90 * 60, "Flow State Session");
        }
        "focus_custom" => {
            // Open the app with focus setup modal
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.eval("window.dispatchEvent(new CustomEvent('open-focus-modal'))");
            }
        }
        "end_focus" => {
            state.end_focus_mode();
            update_tray_for_status(app, TrayStatus::Active);
            // Notify frontend
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.eval("window.dispatchEvent(new CustomEvent('focus-ended'))");
            }
        }
        "view_goals" => {
            navigate_to(app, "/goals");
        }
        "daily_summary" => {
            navigate_to(app, "/analytics");
        }
        "take_screenshot" => {
            // Trigger screenshot capture
            println!("Screenshot capture triggered from tray");
        }
        "settings" => {
            navigate_to(app, "/settings");
        }
        "about" => {
            // Show about dialog or navigate to about page
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.eval("window.dispatchEvent(new CustomEvent('show-about'))");
            }
        }
        _ => {}
    }
}

/// Handle tray icon events (clicks)
fn handle_tray_event(tray: &TrayIcon, event: TrayIconEvent) {
    match event {
        TrayIconEvent::DoubleClick { .. } => {
            let app = tray.app_handle();
            show_main_window(&app);
        }
        TrayIconEvent::Click {
            button: tauri::tray::MouseButton::Left,
            button_state: tauri::tray::MouseButtonState::Up,
            ..
        } => {
            // Single left click - could show quick stats popup
            // For now, just show the window
            let app = tray.app_handle();
            show_main_window(&app);
        }
        _ => {}
    }
}

/// Show and focus the main window
fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// Navigate to a specific route
fn navigate_to(app: &AppHandle, route: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let script = format!("window.location.hash = '#{}'", route);
        let _ = window.eval(&script);
    }
}

/// Start focus mode from tray
fn start_focus_from_tray(app: &AppHandle, duration: u32, session_name: &str) {
    let state = app.state::<AppStateWrapper>();
    state.set_focus_mode(true, duration, Some(session_name.to_string()));
    update_tray_for_status(app, TrayStatus::Focus);

    // Notify frontend to start focus timer
    if let Some(window) = app.get_webview_window("main") {
        let script = format!(
            "window.dispatchEvent(new CustomEvent('start-focus', {{ detail: {{ duration: {}, sessionName: '{}' }} }}))",
            duration, session_name
        );
        let _ = window.eval(&script);
    }
}

/// Update tray icon and tooltip based on status
pub fn update_tray_for_status(app: &AppHandle, status: TrayStatus) {
    // Note: In a real implementation, you would load different icon images
    // For now, we update the tooltip to reflect the status

    let tooltip = match status {
        TrayStatus::Active => "Productify Pro - Tracking Active",
        TrayStatus::Focus => "Productify Pro - Focus Mode",
        TrayStatus::Paused => "Productify Pro - Paused",
    };

    // Get tray and update tooltip
    // Note: TrayIcon doesn't have a direct reference in app state in Tauri 2.0
    // You would need to store the TrayIcon reference or use events

    println!("Tray status updated: {:?} - {}", status, tooltip);
}

/// Update tray tooltip with current activity
pub fn update_tray_tooltip(app: &AppHandle, tooltip: &str) {
    println!("Tray tooltip: {}", tooltip);
}
