use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tauri::utils::config::BackgroundThrottlingPolicy;
use tauri::{
    AppHandle, Manager, Runtime, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent,
};

use crate::settings::{self, START_MINIMIZED};

pub const MAIN_WINDOW: &str = "main";

/// Délai de secours si la webview ne signale jamais qu'elle est prête
const READY_FALLBACK: Duration = Duration::from_secs(10);

static FIRST_SHOW_DONE: AtomicBool = AtomicBool::new(false);

pub fn create_main_window<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let builder = WebviewWindowBuilder::new(app, MAIN_WINDOW, WebviewUrl::default())
        .title(&app.package_info().name)
        .inner_size(960.0, 1000.0)
        .min_inner_size(500.0, 500.0)
        .center()
        // Affichée quand la webview est prête (équivalent de « ready-to-show »)
        .visible(false)
        .disable_drag_drop_handler()
        // Les métriques continuent d'être tracées quand la fenêtre est cachée
        .background_throttling(BackgroundThrottlingPolicy::Disabled);

    // macOS : on garde les boutons natifs (feux tricolores) au-dessus de notre barre de titre.
    // Windows / Linux : pas de décoration système, les boutons sont dessinés par l'interface.
    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);
    #[cfg(not(target_os = "macos"))]
    let builder = builder.decorations(false);

    let window = builder.build()?;
    let handle = app.clone();

    window.on_window_event(move |event| {
        // Fermer la fenêtre la cache dans le tray : « Quitter » depuis le tray ferme vraiment l'app
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            hide_main_window(&handle);
        }
    });

    let handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(READY_FALLBACK);
        show_on_startup(&handle);
    });

    Ok(())
}

fn main_window<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
    app.get_webview_window(MAIN_WINDOW)
}

pub fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    #[cfg(target_os = "macos")]
    let _ = app.set_dock_visibility(true);

    if let Some(window) = main_window(app) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn hide_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = main_window(app) {
        let _ = window.hide();
    }

    #[cfg(target_os = "macos")]
    let _ = app.set_dock_visibility(false);
}

/// Premier affichage de la fenêtre, sauf si l'utilisateur a choisi « Ouvrir minimisé »
fn show_on_startup<R: Runtime>(app: &AppHandle<R>) {
    if FIRST_SHOW_DONE.swap(true, Ordering::SeqCst) {
        return;
    }

    if settings::get_bool(app, START_MINIMIZED) {
        hide_main_window(app);
    } else {
        show_main_window(app);
    }
}

/// Appelée par la webview une fois l'interface montée.
#[tauri::command]
pub fn window_ready<R: Runtime>(app: AppHandle<R>) {
    show_on_startup(&app);
}

#[tauri::command]
pub fn open_devtools<R: Runtime>(app: AppHandle<R>) {
    if let Some(window) = main_window(&app) {
        window.open_devtools();
    }
}
