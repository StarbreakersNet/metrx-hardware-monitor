/**
 * Réglages « système » (lancement au démarrage, ouverture minimisée, langue).
 *
 * Ils sont stockés côté Rust (voir `src-tauri/src/settings.rs`) car le tray les utilise aussi.
 */
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const DESKTOP_SETTING_KEYS = ["startOnLogin", "startMinimized", "language"];

let desktopSettings = {};

/** Charge les réglages (à appeler une fois au démarrage, voir main.js) */
export async function loadDesktopSettings() {
  const values = await Promise.all(
    DESKTOP_SETTING_KEYS.map(key => invoke("settings_get", { key }))
  );

  desktopSettings = Object.fromEntries(DESKTOP_SETTING_KEYS.map((key, i) => [key, values[i]]));
  return getDesktopSettings();
}

export function getDesktopSettings() {
  return { ...desktopSettings };
}

export function setDesktopSetting(key, value) {
  desktopSettings[key] = value;
  return invoke("settings_set", { key, value });
}

/** Notifié quand un réglage change, y compris depuis le menu du tray */
export function onDesktopSettingChanged(callback) {
  return listen("settings:changed", ({ payload }) => {
    desktopSettings[payload.key] = payload.value;
    callback(payload.key, payload.value);
  });
}
