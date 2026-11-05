import { invoke } from "@tauri-apps/api/core";
import { platform, version } from "@tauri-apps/plugin-os";

/** Plateforme courante : "windows", "macos" ou "linux" */
export const currentPlatform = platform();

const PLATFORM_NAMES = { windows: "Windows", macos: "macOS", linux: "Linux" };

/** Système et version, ex : "Windows 10.0.26100" (pour pré-remplir les rapports de bug) */
export function getOsLabel() {
  return `${PLATFORM_NAMES[currentPlatform] ?? currentPlatform} ${version()}`;
}

let appInfo = {
  name: "",
  version: "",
  tauriVersion: "",
  webviewVersion: null,
  systemLocale: "",
};

/** Charge les infos de l'application (à appeler une fois au démarrage, voir main.js) */
export async function loadAppInfo() {
  appInfo = await invoke("app_info");
  return appInfo;
}

export function getAppInfo() {
  return appInfo;
}

export function openDevTools() {
  return invoke("open_devtools");
}

/** Signale à Tauri que l'interface est montée : la fenêtre peut être affichée */
export function notifyWindowReady() {
  return invoke("window_ready");
}
