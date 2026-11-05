mod app_info;
mod autostart;
mod gnome;
mod i18n;
mod menu;
mod settings;
mod sidecar;
mod tray;
mod updater;
mod window;

use tauri::RunEvent;
use tauri_plugin_window_state::StateFlags;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        // Doit être enregistré en premier : une seconde instance ne fait que réafficher la première
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            window::show_main_window(app);
        }))
        .plugin(
            tauri_plugin_window_state::Builder::default()
                // La visibilité est gérée par l'option « Ouvrir minimisé »
                .with_state_flags(StateFlags::all() - StateFlags::VISIBLE)
                .build(),
        )
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        // Lance le sidecar. En 2.x, il intercepte aussi tous les clics sur les liens `target="_blank"`
        // pour les ouvrir avec sa commande `open` (permission `shell:allow-open`), avant le plugin
        // opener, sans option pour le désactiver : https://github.com/tauri-apps/plugins-workspace/issues/3753
        // Quand l'option `open_js_links_on_click(false)` sera publiée (shell 2.7), l'utiliser ici et
        // retirer `shell:allow-open` des capabilities pour laisser les liens au plugin opener.
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        // Ouvre les liens `target="_blank"` dans le navigateur par défaut (voir le plugin shell)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            app_info::app_info,
            gnome::gnome_button_position,
            settings::settings_get,
            settings::settings_set,
            sidecar::metrics_send,
            updater::updater_check,
            updater::updater_install,
            window::open_devtools,
            window::window_ready,
        ])
        .setup(|app| {
            let handle = app.handle();

            settings::init(handle)?;
            menu::refresh(handle);
            window::create_main_window(handle)?;
            tray::init(handle)?;
            sidecar::init(handle);
            updater::init(handle);

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Erreur lors du démarrage de Metrx");

    app.run(|app, event| match event {
        RunEvent::Exit => {
            sidecar::shutdown(app);
            // Comme electron-updater : une mise à jour téléchargée s'installe à la fermeture
            updater::install_pending_on_exit(app);
        }
        // Clic sur l'icône du Dock alors que la fenêtre est cachée
        #[cfg(target_os = "macos")]
        RunEvent::Reopen { .. } => window::show_main_window(app),
        _ => {}
    });
}
