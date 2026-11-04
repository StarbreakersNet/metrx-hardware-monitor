//! Réglages « système » persistés côté Rust (équivalent de l'ancien electron-store).
//!
//! Ils sont lus par le tray et par la webview, et chaque modification est renvoyée
//! à la webview via l'évènement `settings:changed` pour garder les deux synchronisés.

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_store::StoreExt;

use crate::tray;

const STORE_FILE: &str = "settings.json";
pub const SETTINGS_CHANGED_EVENT: &str = "settings:changed";

pub const START_ON_LOGIN: &str = "startOnLogin";
pub const START_MINIMIZED: &str = "startMinimized";
const KEYS: [&str; 2] = [START_ON_LOGIN, START_MINIMIZED];

#[derive(Clone, Serialize)]
struct SettingChanged<'a> {
    key: &'a str,
    value: bool,
}

pub fn init<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let store = app.store(STORE_FILE)?;

    for key in KEYS {
        if !store.has(key) {
            store.set(key, false);
        }
    }

    store.save()?;

    // Réaligne l'autostart du système avec la préférence (ex : chemin changé après une mise à jour)
    sync_autostart(app, get_bool(app, START_ON_LOGIN));

    Ok(())
}

pub fn get_bool<R: Runtime>(app: &AppHandle<R>, key: &str) -> bool {
    app.store(STORE_FILE)
        .ok()
        .and_then(|store| store.get(key))
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
}

pub fn set_bool<R: Runtime>(app: &AppHandle<R>, key: &str, value: bool) -> Result<(), String> {
    let key = KEYS
        .into_iter()
        .find(|known| *known == key)
        .ok_or_else(|| format!("Réglage inconnu : {key}"))?;
    let store = app.store(STORE_FILE).map_err(|error| error.to_string())?;

    store.set(key, value);
    store.save().map_err(|error| error.to_string())?;

    if key == START_ON_LOGIN {
        sync_autostart(app, value);
    }

    tray::refresh(app);
    let _ = app.emit(SETTINGS_CHANGED_EVENT, SettingChanged { key, value });

    Ok(())
}

fn sync_autostart<R: Runtime>(app: &AppHandle<R>, enabled: bool) {
    // En développement, on évite d'inscrire le binaire de debug au démarrage de la session
    if cfg!(debug_assertions) {
        eprintln!("[settings] Lancement au démarrage ignoré en développement ({enabled})");
        return;
    }

    let autolaunch = app.autolaunch();
    let result = if enabled {
        autolaunch.enable()
    } else if autolaunch.is_enabled().unwrap_or(false) {
        autolaunch.disable()
    } else {
        Ok(())
    };

    if let Err(error) = result {
        eprintln!("[settings] Impossible de modifier le lancement au démarrage : {error}");
    }
}

#[tauri::command]
pub fn settings_get<R: Runtime>(app: AppHandle<R>, key: String) -> Result<bool, String> {
    if !KEYS.contains(&key.as_str()) {
        return Err(format!("Réglage inconnu : {key}"));
    }

    Ok(get_bool(&app, &key))
}

#[tauri::command]
pub fn settings_set<R: Runtime>(
    app: AppHandle<R>,
    key: String,
    value: Value,
) -> Result<(), String> {
    let value = value
        .as_bool()
        .ok_or_else(|| format!("Valeur invalide pour {key} : booléen attendu"))?;

    set_bool(&app, &key, value)
}
