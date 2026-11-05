use tauri::image::Image;
use tauri::menu::{CheckMenuItem, Menu, MenuEvent, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Runtime};

use crate::i18n::t;
use crate::settings::{self, START_MINIMIZED, START_ON_LOGIN};
use crate::window;

const MENU_OPEN: &str = "open";
const MENU_START_ON_LOGIN: &str = "start-on-login";
const MENU_START_MINIMIZED: &str = "start-minimized";
const MENU_QUIT: &str = "quit";

/// Entrées du menu, mises à jour quand un réglage (ou la langue) change depuis la webview.
struct TrayMenuState<R: Runtime> {
    open: MenuItem<R>,
    start_on_login: CheckMenuItem<R>,
    start_minimized: CheckMenuItem<R>,
    quit: MenuItem<R>,
}

pub fn init<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let label = MenuItem::with_id(app, "label", app_label(app), false, None::<&str>)?;
    let open = MenuItem::with_id(app, MENU_OPEN, t("tray.open"), true, None::<&str>)?;
    let start_on_login = CheckMenuItem::with_id(
        app,
        MENU_START_ON_LOGIN,
        t("tray.startOnLogin"),
        true,
        settings::get_bool(app, START_ON_LOGIN),
        None::<&str>,
    )?;
    let start_minimized = CheckMenuItem::with_id(
        app,
        MENU_START_MINIMIZED,
        t("tray.startMinimized"),
        true,
        settings::get_bool(app, START_MINIMIZED),
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, MENU_QUIT, t("tray.quit"), true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &label,
            &open,
            &PredefinedMenuItem::separator(app)?,
            &start_on_login,
            &start_minimized,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    TrayIconBuilder::with_id("main")
        .icon(tray_icon()?)
        // Sur macOS, l'icône « template » s'adapte automatiquement au thème de la barre des menus
        .icon_as_template(cfg!(target_os = "macos"))
        .tooltip(&app.package_info().name)
        .menu(&menu)
        // Comme avant : clic gauche = menu sur macOS, double-clic = ouvrir sur Windows
        .show_menu_on_left_click(cfg!(target_os = "macos"))
        .on_menu_event(on_menu_event)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } = event
            {
                window::show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    app.manage(TrayMenuState {
        open,
        start_on_login,
        start_minimized,
        quit,
    });

    Ok(())
}

/// Resynchronise les libellés (langue) et les cases à cocher avec les réglages enregistrés.
pub fn refresh<R: Runtime>(app: &AppHandle<R>) {
    if let Some(state) = app.try_state::<TrayMenuState<R>>() {
        let _ = state.open.set_text(t("tray.open"));
        let _ = state.start_on_login.set_text(t("tray.startOnLogin"));
        let _ = state.start_minimized.set_text(t("tray.startMinimized"));
        let _ = state.quit.set_text(t("tray.quit"));
        let _ = state
            .start_on_login
            .set_checked(settings::get_bool(app, START_ON_LOGIN));
        let _ = state
            .start_minimized
            .set_checked(settings::get_bool(app, START_MINIMIZED));
    }
}

fn on_menu_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    match event.id().as_ref() {
        MENU_OPEN => window::show_main_window(app),
        MENU_START_ON_LOGIN => toggle_setting(app, START_ON_LOGIN),
        MENU_START_MINIMIZED => toggle_setting(app, START_MINIMIZED),
        MENU_QUIT => app.exit(0),
        _ => {}
    }
}

fn toggle_setting<R: Runtime>(app: &AppHandle<R>, key: &str) {
    if let Err(error) = settings::set_bool(app, key, !settings::get_bool(app, key)) {
        eprintln!("[tray] {error}");
        refresh(app);
    }
}

fn app_label<R: Runtime>(app: &AppHandle<R>) -> String {
    let package = app.package_info();
    let label = format!("{} {}", package.name, package.version);

    if cfg!(debug_assertions) {
        label + " 🚧"
    } else {
        label
    }
}

fn tray_icon() -> tauri::Result<Image<'static>> {
    #[cfg(target_os = "macos")]
    let bytes = include_bytes!("../resources/trayIconTemplate@2x.png").as_slice();
    #[cfg(target_os = "windows")]
    let bytes = include_bytes!("../resources/trayIcon.ico").as_slice();
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let bytes = include_bytes!("../resources/trayIcon.png").as_slice();

    Image::from_bytes(bytes)
}
