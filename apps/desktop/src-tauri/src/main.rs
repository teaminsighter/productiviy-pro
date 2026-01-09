// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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
        .manage(AppStateWrapper::new())
        .setup(|app| {
            // Create system tray
            let _tray = tray::create_tray(app.handle())?;

            // Handle window close - minimize to tray instead
            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();

            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    // Prevent closing, hide to tray instead
                    api.prevent_close();
                    let _ = window_clone.hide();
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
