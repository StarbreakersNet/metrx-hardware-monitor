//! Lancement de l'application à l'ouverture de session.
//!
//! - macOS : API `SMAppService` d'Apple (macOS 13+). L'app apparaît sous son nom et son icône
//!   dans Réglages Système > Général > Ouverture, rubrique « Ouvrir à l'ouverture de session ».
//!   tauri-plugin-autostart 2.x passe par un LaunchAgent, que macOS range dans « Autoriser en
//!   arrière-plan » sous le nom du titulaire du certificat de signature.
//! - Windows / Linux : tauri-plugin-autostart.
//!
//! Rien n'est modifié en développement, pour ne pas inscrire le binaire de debug.

use tauri::{AppHandle, Runtime};

/// Aligne le système et la préférence au lancement de l'application.
/// Renvoie la nouvelle valeur de la préférence quand c'est le système qui fait foi.
pub fn init<R: Runtime>(app: &AppHandle<R>, enabled: bool) -> Option<bool> {
    if cfg!(debug_assertions) {
        return None;
    }

    platform::init(app, enabled).unwrap_or_else(|error| {
        eprintln!("[autostart] Impossible de vérifier le lancement au démarrage : {error}");
        None
    })
}

pub fn set<R: Runtime>(app: &AppHandle<R>, enabled: bool) {
    if cfg!(debug_assertions) {
        eprintln!("[autostart] Lancement au démarrage ignoré en développement ({enabled})");
        return;
    }

    if let Err(error) = platform::set(app, enabled) {
        eprintln!("[autostart] Impossible de modifier le lancement au démarrage : {error}");
    }
}

#[cfg(target_os = "macos")]
mod platform {
    use auto_launch::{AutoLaunch, AutoLaunchBuilder, MacOSLaunchMode};
    use tauri::{AppHandle, Runtime};
    use tauri_plugin_autostart::ManagerExt;

    pub fn init<R: Runtime>(app: &AppHandle<R>, enabled: bool) -> Result<Option<bool>, String> {
        // Les 2.0.0-beta passaient par un LaunchAgent : on le remplace par SMAppService
        if remove_launch_agent(app)? {
            set(app, enabled)?;
            return Ok(None);
        }

        // L'utilisateur peut retirer l'app des éléments d'ouverture depuis les Réglages Système :
        // c'est alors l'état du système qui fait foi
        let registered = launcher()?.is_enabled().map_err(|e| e.to_string())?;
        Ok((registered != enabled).then_some(registered))
    }

    pub fn set<R: Runtime>(_app: &AppHandle<R>, enabled: bool) -> Result<(), String> {
        let launcher = launcher()?;
        let result = if enabled {
            launcher.enable()
        } else if launcher.is_enabled().unwrap_or(false) {
            launcher.disable()
        } else {
            Ok(())
        };

        result.map_err(|e| e.to_string())
    }

    /// Avec SMAppService, c'est l'application en cours d'exécution qui est inscrite
    fn launcher() -> Result<AutoLaunch, String> {
        AutoLaunchBuilder::new()
            .set_macos_launch_mode(MacOSLaunchMode::SMAppService)
            .build()
            .map_err(|e| e.to_string())
    }

    /// Supprime le LaunchAgent créé par tauri-plugin-autostart. Renvoie `true` s'il existait.
    fn remove_launch_agent<R: Runtime>(app: &AppHandle<R>) -> Result<bool, String> {
        let agent = app.autolaunch();
        if !agent.is_enabled().map_err(|e| e.to_string())? {
            return Ok(false);
        }

        agent.disable().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

#[cfg(not(target_os = "macos"))]
mod platform {
    use tauri::{AppHandle, Runtime};
    use tauri_plugin_autostart::ManagerExt;

    /// Réinscrit l'app selon la préférence (ex : chemin de l'AppImage changé après une mise à jour)
    pub fn init<R: Runtime>(app: &AppHandle<R>, enabled: bool) -> Result<Option<bool>, String> {
        set(app, enabled)?;
        Ok(None)
    }

    pub fn set<R: Runtime>(app: &AppHandle<R>, enabled: bool) -> Result<(), String> {
        let autolaunch = app.autolaunch();
        let result = if enabled {
            autolaunch.enable()
        } else if autolaunch.is_enabled().unwrap_or(false) {
            autolaunch.disable()
        } else {
            Ok(())
        };

        result.map_err(|e| e.to_string())
    }
}
