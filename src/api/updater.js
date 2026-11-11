import { Channel, invoke } from "@tauri-apps/api/core";

/**
 * Vérifie et télécharge la dernière mise à jour du canal (voir `src-tauri/src/updater.rs`).
 *
 * `onEvent` reçoit `{ event, data }` avec `event` parmi : checking, available, notAvailable,
 * cancelled, error, log, progress et downloaded.
 */
export function checkForUpdates(channel, onEvent) {
  const events = new Channel();

  events.onmessage = onEvent;
  return invoke("updater_check", { channel, onEvent: events });
}

/**
 * Attend qu'Internet soit joignable (résolution DNS de l'API GitHub), au plus `timeoutSecs`
 * secondes. Renvoie `false` si le délai est dépassé.
 */
export function waitForNetwork(timeoutSecs) {
  return invoke("updater_wait_for_network", { timeoutSecs });
}

/** Installe la mise à jour téléchargée et relance l'application */
export function installUpdate() {
  return invoke("updater_install");
}
