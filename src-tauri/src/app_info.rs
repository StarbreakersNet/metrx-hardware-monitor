use serde::Serialize;
use tauri::{AppHandle, Runtime};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    name: String,
    version: String,
    tauri_version: &'static str,
    webview_version: Option<String>,
}

/// Informations affichées dans « À propos » et utilisées pour le canal de mise à jour.
#[tauri::command]
pub fn app_info<R: Runtime>(app: AppHandle<R>) -> AppInfo {
    let package = app.package_info();

    AppInfo {
        name: package.name.clone(),
        version: package.version.to_string(),
        tauri_version: tauri::VERSION,
        webview_version: tauri::webview_version().ok(),
    }
}
