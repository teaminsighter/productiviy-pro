// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod activity_tracker;
mod aw_server;
mod commands;
mod state;
mod tray;

use state::AppStateWrapper;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppStateWrapper::new())
        .setup(|app| {
            // Create system tray
            let _tray = tray::create_tray(app.handle())?;

            // Start the bundled aw-server-rust
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                match aw_server::start_aw_server(&app_handle) {
                    Ok(_) => println!("[Setup] aw-server-rust started successfully"),
                    Err(e) => eprintln!("[Setup] Failed to start aw-server-rust: {}", e),
                }
            });

            // Handle window close - check user preference
            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            let app_handle = app.handle().clone();

            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    use tauri_plugin_store::StoreExt;

                    // Check user preference from store
                    let close_to_tray = match app_handle.store("settings.json") {
                        Ok(store) => match store.get("closeToTray") {
                            Some(serde_json::Value::Bool(value)) => value,
                            _ => true, // Default to close-to-tray
                        },
                        Err(_) => true, // Default to close-to-tray on error
                    };

                    if close_to_tray {
                        // Prevent closing, hide to tray instead
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                    // If close_to_tray is false, let the window close normally (app quits)
                }
            });

            // Register global shortcut for focus mode toggle
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

                // Cmd+Shift+F to toggle focus mode
                let focus_shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyF);

                let app_handle = app.handle().clone();
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |_app, shortcut, _event| {
                            if shortcut == &focus_shortcut {
                                let state = app_handle.state::<AppStateWrapper>();
                                let current_state = state.get_state();
                                if current_state.focus_mode {
                                    state.end_focus_mode();
                                } else {
                                    // Start 25 min focus by default with shortcut
                                    state.set_focus_mode(true, 25 * 60, Some("Quick Focus".to_string()));
                                }
                            }
                        })
                        .build(),
                )?;

                // Register the shortcut
                app.global_shortcut().register(focus_shortcut)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_tracking_status,
            commands::toggle_tracking,
            commands::pause_tracking,
            commands::resume_tracking,
            commands::start_focus_mode,
            commands::end_focus_mode,
            commands::get_focus_status,
            commands::update_focus_elapsed,
            commands::update_current_activity,
            commands::get_tray_status,
            commands::capture_screenshot,
            commands::open_settings,
            commands::open_goals,
            commands::show_daily_summary,
            commands::get_app_state,
            commands::send_native_notification,
            commands::request_notification_permission,
            commands::check_notification_permission,
            commands::send_smart_notification,
            // Settings native commands
            commands::get_app_info,
            commands::set_autostart,
            commands::get_autostart,
            commands::get_system_theme,
            commands::set_window_theme,
            commands::set_tray_visible,
            commands::minimize_to_tray,
            commands::show_from_tray,
            commands::quit_app,
            // Close behavior commands
            commands::get_close_to_tray,
            commands::set_close_to_tray,
            commands::handle_window_close,
            // Focus mode distraction blocking
            commands::set_blocking_config,
            commands::get_blocking_config,
            commands::check_distraction,
            commands::enable_blocking,
            commands::disable_blocking,
            commands::show_distraction_warning,
            commands::open_focus_mode,
            // Native activity tracking
            commands::get_native_activity,
            commands::get_activity_tracker_state,
            commands::set_native_tracking,
            commands::set_idle_threshold,
            commands::start_activity_polling,
            commands::stop_activity_polling,
            commands::is_activity_polling_active,
            commands::get_polling_config,
            // ActivityWatch server commands
            commands::get_aw_server_status,
            commands::start_aw_server,
            commands::stop_aw_server,
            commands::send_aw_heartbeat,
            // Permission commands (macOS)
            commands::check_accessibility_permission,
            commands::check_screen_recording_permission,
            commands::request_accessibility_permission,
            commands::request_screen_recording_permission,
            commands::get_platform,
            // Event-based tracking (Option 3 - Accurate Timing)
            commands::start_event_based_tracking,
            commands::get_event_tracker_state,
            commands::finalize_current_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
