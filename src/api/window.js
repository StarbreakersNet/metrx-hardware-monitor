import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function minimize() {
  return appWindow.minimize();
}

export function toggleMaximize() {
  return appWindow.toggleMaximize();
}

/** Ferme la fenêtre : Tauri la cache dans le tray (voir `src-tauri/src/window.rs`) */
export function close() {
  return appWindow.close();
}

/** Notifié quand le thème du système change ("light" ou "dark") */
export function onThemeChanged(callback) {
  return appWindow.onThemeChanged(({ payload }) => callback(payload));
}

/** Position des boutons de fenêtre sous GNOME / Unity : "left" ou "right" */
export function getGnomeButtonPosition() {
  return invoke("gnome_button_position");
}
