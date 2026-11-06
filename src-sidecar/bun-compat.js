/**
 * Compatibilité Node.js ↔ Bun pour systeminformation.
 *
 * Sous Windows, systeminformation v6 garde des processus PowerShell ouverts et appelle
 * `child.stdin.unref()` dessus. Avec Node.js, `stdin` est un socket qui possède `unref()`,
 * mais pas avec Bun (Writable classique) : l'appel plante et le sidecar s'arrête.
 *
 * `unref()` sert seulement à laisser le processus se terminer même si l'enfant tourne
 * encore. Le sidecar s'arrête explicitement quand Tauri ferme stdin (voir index.js) :
 * une méthode qui ne fait rien suffit donc.
 *
 * Doit être importé avant systeminformation.
 */
import childProcess from "node:child_process";

const STREAMS = ["stdin", "stdout", "stderr"];

function addMissingUnref(child) {
  for (const name of STREAMS) {
    const stream = child?.[name];

    if (stream && typeof stream.unref !== "function") {
      stream.unref = () => stream;
      stream.ref ??= () => stream;
    }
  }

  return child;
}

const originalSpawn = childProcess.spawn;

childProcess.spawn = function spawn(...args) {
  return addMissingUnref(originalSpawn.apply(this, args));
};
