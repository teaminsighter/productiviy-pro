use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

static AW_SERVER_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

/// Get the path to the bundled aw-server-rust binary
fn get_aw_server_path(app: &AppHandle) -> Option<PathBuf> {
    // In dev mode, look in the resources folder relative to the manifest dir
    #[cfg(debug_assertions)]
    {
        let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("bin")
            .join("aw-server-rust");
        if dev_path.exists() {
            return Some(dev_path);
        }
    }

    // In production, look in the app's resource directory
    if let Ok(resource_path) = app.path().resource_dir() {
        let prod_path = resource_path.join("bin").join("aw-server-rust");
        if prod_path.exists() {
            return Some(prod_path);
        }
    }

    None
}

/// Start the aw-server-rust process
pub fn start_aw_server(app: &AppHandle) -> Result<(), String> {
    let mut process_guard = AW_SERVER_PROCESS.lock().map_err(|e| e.to_string())?;

    // Check if already running
    if let Some(ref mut child) = *process_guard {
        match child.try_wait() {
            Ok(Some(_)) => {
                // Process has exited, we can start a new one
                *process_guard = None;
            }
            Ok(None) => {
                // Process is still running
                println!("[AW Server] Already running");
                return Ok(());
            }
            Err(e) => {
                println!("[AW Server] Error checking process status: {}", e);
                *process_guard = None;
            }
        }
    }

    let server_path = get_aw_server_path(app)
        .ok_or_else(|| "aw-server-rust binary not found".to_string())?;

    println!("[AW Server] Starting from: {:?}", server_path);

    // Get the data directory for ActivityWatch
    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("activitywatch");

    // Create the data directory if it doesn't exist
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data dir: {}", e))?;

    // Start the server process
    let child = Command::new(&server_path)
        .args([
            "--port", "5600",
            "--dbpath", data_dir.to_str().unwrap_or(""),
            "--no-legacy-import",
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start aw-server-rust: {}", e))?;

    println!("[AW Server] Started with PID: {}", child.id());
    *process_guard = Some(child);

    Ok(())
}

/// Stop the aw-server-rust process
pub fn stop_aw_server() -> Result<(), String> {
    let mut process_guard = AW_SERVER_PROCESS.lock().map_err(|e| e.to_string())?;

    if let Some(ref mut child) = *process_guard {
        println!("[AW Server] Stopping server...");
        child.kill().map_err(|e| format!("Failed to kill process: {}", e))?;
        child.wait().map_err(|e| format!("Failed to wait for process: {}", e))?;
        *process_guard = None;
        println!("[AW Server] Server stopped");
    }

    Ok(())
}

/// Check if aw-server-rust is running
pub fn is_aw_server_running() -> bool {
    if let Ok(mut process_guard) = AW_SERVER_PROCESS.lock() {
        if let Some(ref mut child) = *process_guard {
            match child.try_wait() {
                Ok(Some(_)) => {
                    // Process has exited
                    *process_guard = None;
                    false
                }
                Ok(None) => true, // Still running
                Err(_) => {
                    *process_guard = None;
                    false
                }
            }
        } else {
            false
        }
    } else {
        false
    }
}

/// Wait for aw-server-rust to be ready (accepting connections)
pub async fn wait_for_server_ready(max_attempts: u32) -> bool {
    for i in 0..max_attempts {
        match reqwest::get("http://localhost:5600/api/0/info").await {
            Ok(response) if response.status().is_success() => {
                println!("[AW Server] Server is ready after {} attempts", i + 1);
                return true;
            }
            _ => {
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            }
        }
    }
    println!("[AW Server] Server failed to become ready after {} attempts", max_attempts);
    false
}
