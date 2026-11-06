use serde::Serialize;
use tauri::{AppHandle, Runtime};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    name: String,
    version: String,
    tauri_version: &'static str,
    webview_version: Option<String>,
    /// Locale du système (ex : "fr-FR"), pour choisir la langue quand le réglage vaut « Système »
    system_locale: String,
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
        system_locale: crate::i18n::system_locale(),
    }
}
