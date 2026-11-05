//! Réglages « système » persistés côté Rust (équivalent de l'ancien electron-store).
//!
//! Ils sont lus par le tray et par la webview, et chaque modification est renvoyée
//! à la webview via l'évènement `settings:changed` pour garder les deux synchronisés.

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_store::StoreExt;

use crate::{i18n, menu, tray};

const STORE_FILE: &str = "settings.json";
pub const SETTINGS_CHANGED_EVENT: &str = "settings:changed";

pub const START_ON_LOGIN: &str = "startOnLogin";
pub const START_MINIMIZED: &str = "startMinimized";
/// "system", "fr" ou "en" : utilisé aussi par Rust pour le menu du tray
pub const LANGUAGE: &str = "language";

const BOOL_KEYS: [&str; 2] = [START_ON_LOGIN, START_MINIMIZED];
const DEFAULT_LANGUAGE: &str = "system";

#[derive(Clone, Serialize)]
struct SettingChanged<'a> {
    key: &'a str,
    value: Value,
}

pub fn init<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let store = app.store(STORE_FILE)?;

    for key in BOOL_KEYS {
        if !store.has(key) {
            store.set(key, false);
        }
    }

    if !store.has(LANGUAGE) {
        store.set(LANGUAGE, DEFAULT_LANGUAGE);
    }

    store.save()?;

    i18n::set_language(&get_language(app));
    // Réaligne l'autostart du système avec la préférence (ex : chemin changé après une mise à jour)
    sync_autostart(app, get_bool(app, START_ON_LOGIN));

    Ok(())
}

pub fn get_bool<R: Runtime>(app: &AppHandle<R>, key: &str) -> bool {
    get_value(app, key)
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
}

pub fn get_language<R: Runtime>(app: &AppHandle<R>) -> String {
    get_value(app, LANGUAGE)
        .and_then(|value| value.as_str().map(str::to_string))
        .filter(|language| i18n::PREFERENCES.contains(&language.as_str()))
        .unwrap_or_else(|| DEFAULT_LANGUAGE.to_string())
}

fn get_value<R: Runtime>(app: &AppHandle<R>, key: &str) -> Option<Value> {
    app.store(STORE_FILE).ok().and_then(|store| store.get(key))
}

pub fn set_bool<R: Runtime>(app: &AppHandle<R>, key: &str, value: bool) -> Result<(), String> {
    let key = BOOL_KEYS
        .into_iter()
        .find(|known| *known == key)
        .ok_or_else(|| format!("Réglage inconnu : {key}"))?;

    save(app, key, Value::Bool(value))?;

    if key == START_ON_LOGIN {
        sync_autostart(app, value);
    }

    tray::refresh(app);
    let _ = app.emit(
        SETTINGS_CHANGED_EVENT,
        SettingChanged {
            key,
            value: value.into(),
        },
    );

    Ok(())
}

fn set_language<R: Runtime>(app: &AppHandle<R>, language: &str) -> Result<(), String> {
    if !i18n::PREFERENCES.contains(&language) {
        return Err(format!("Langue inconnue : {language}"));
    }

    save(app, LANGUAGE, language.into())?;
    i18n::set_language(language);
    tray::refresh(app);
    menu::refresh(app);

    let _ = app.emit(
        SETTINGS_CHANGED_EVENT,
        SettingChanged {
            key: LANGUAGE,
            value: language.into(),
        },
    );

    Ok(())
}

fn save<R: Runtime>(app: &AppHandle<R>, key: &str, value: Value) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|error| error.to_string())?;

    store.set(key, value);
    store.save().map_err(|error| error.to_string())
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
pub fn settings_get<R: Runtime>(app: AppHandle<R>, key: String) -> Result<Value, String> {
    match key.as_str() {
        LANGUAGE => Ok(get_language(&app).into()),
        key if BOOL_KEYS.contains(&key) => Ok(get_bool(&app, key).into()),
        _ => Err(format!("Réglage inconnu : {key}")),
    }
}

#[tauri::command]
pub fn settings_set<R: Runtime>(
    app: AppHandle<R>,
    key: String,
    value: Value,
) -> Result<(), String> {
    if key == LANGUAGE {
        let language = value
            .as_str()
            .ok_or_else(|| format!("Valeur invalide pour {key} : texte attendu"))?;

        return set_language(&app, language);
    }

    let value = value
        .as_bool()
        .ok_or_else(|| format!("Valeur invalide pour {key} : booléen attendu"))?;

    set_bool(&app, &key, value)
}
