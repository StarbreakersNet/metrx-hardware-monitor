//! Barre de menus de macOS, traduite.
//!
//! Le menu par défaut de Tauri est en anglais : on reconstruit le même avec les textes de
//! `locales/*.json` (section « native.menu »). Windows et Linux n'ont pas de barre de menus
//! (la barre de titre est dessinée par l'interface).

use tauri::{AppHandle, Runtime};

/// Construit (ou reconstruit après un changement de langue) la barre de menus.
pub fn refresh<R: Runtime>(app: &AppHandle<R>) {
    #[cfg(target_os = "macos")]
    match macos::build(app) {
        Ok(menu) => {
            let _ = app.set_menu(menu);
        }
        Err(error) => eprintln!("[menu] Impossible de créer la barre de menus : {error}"),
    }

    #[cfg(not(target_os = "macos"))]
    let _ = app;
}

// Compilé partout pour être vérifié par la CI sur tous les OS, mais utilisé seulement sur macOS
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
mod macos {
    use tauri::menu::{
        AboutMetadata, HELP_SUBMENU_ID, Menu, PredefinedMenuItem, Submenu, WINDOW_SUBMENU_ID,
    };
    use tauri::{AppHandle, Runtime};

    use crate::i18n::{t, tf};

    pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
        let package = app.package_info();
        let name = package.name.as_str();
        let text = |key: &str| tf(&format!("menu.{key}"), &[("name", name)]);

        let about = AboutMetadata {
            name: Some(package.name.clone()),
            version: Some(package.version.to_string()),
            copyright: app.config().bundle.copyright.clone(),
            ..Default::default()
        };

        let app_menu = Submenu::with_items(
            app,
            name,
            true,
            &[
                &PredefinedMenuItem::about(app, Some(text("about").as_str()), Some(about))?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::services(app, Some(text("services").as_str()))?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::hide(app, Some(text("hide").as_str()))?,
                &PredefinedMenuItem::hide_others(app, Some(text("hideOthers").as_str()))?,
                &PredefinedMenuItem::show_all(app, Some(text("showAll").as_str()))?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::quit(app, Some(text("quit").as_str()))?,
            ],
        )?;

        let file_menu = Submenu::with_items(
            app,
            t("menu.file"),
            true,
            &[&PredefinedMenuItem::close_window(
                app,
                Some(text("closeWindow").as_str()),
            )?],
        )?;

        let edit_menu = Submenu::with_items(
            app,
            t("menu.edit"),
            true,
            &[
                &PredefinedMenuItem::undo(app, Some(text("undo").as_str()))?,
                &PredefinedMenuItem::redo(app, Some(text("redo").as_str()))?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::cut(app, Some(text("cut").as_str()))?,
                &PredefinedMenuItem::copy(app, Some(text("copy").as_str()))?,
                &PredefinedMenuItem::paste(app, Some(text("paste").as_str()))?,
                &PredefinedMenuItem::select_all(app, Some(text("selectAll").as_str()))?,
            ],
        )?;

        let view_menu = Submenu::with_items(
            app,
            t("menu.view"),
            true,
            &[&PredefinedMenuItem::fullscreen(
                app,
                Some(text("fullscreen").as_str()),
            )?],
        )?;

        // Identifiants attendus par macOS pour y ajouter ses entrées (liste des fenêtres, aide)
        let window_menu = Submenu::with_id_and_items(
            app,
            WINDOW_SUBMENU_ID,
            t("menu.window"),
            true,
            &[
                &PredefinedMenuItem::minimize(app, Some(text("minimize").as_str()))?,
                &PredefinedMenuItem::maximize(app, Some(text("zoom").as_str()))?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::close_window(app, Some(text("closeWindow").as_str()))?,
            ],
        )?;

        let help_menu =
            Submenu::with_id_and_items(app, HELP_SUBMENU_ID, t("menu.help"), true, &[])?;

        Menu::with_items(
            app,
            &[
                &app_menu,
                &file_menu,
                &edit_menu,
                &view_menu,
                &window_menu,
                &help_menu,
            ],
        )
    }
}
