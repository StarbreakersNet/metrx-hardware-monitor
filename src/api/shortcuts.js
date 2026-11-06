/**
 * Raccourcis clavier et menu contextuel, pour retrouver le comportement de la version Electron :
 * - Ctrl/⌘ + R recharge l'interface (indiqué dans « À propos »)
 * - F12 ouvre les outils de développement en dev, et est bloqué en production
 *   (clic droit sur l'icône bug pour les ouvrir quand même)
 * - pas de menu contextuel du navigateur en production
 */
import { openDevTools } from "@/api/app";

function isDevToolsShortcut(event) {
  const key = event.key.toLowerCase();

  return (
    event.key === "F12" ||
    (event.ctrlKey && event.shiftKey && key === "i") ||
    (event.metaKey && event.altKey && key === "i")
  );
}

function onKeyDown(event) {
  const key = event.key.toLowerCase();

  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === "r") {
    event.preventDefault();
    window.location.reload();
  } else if (isDevToolsShortcut(event)) {
    event.preventDefault();

    if (import.meta.env.DEV) {
      openDevTools();
    }
  }
}

export function installShortcuts() {
  window.addEventListener("keydown", onKeyDown);

  if (!import.meta.env.DEV) {
    window.addEventListener("contextmenu", event => event.preventDefault());
  }
}
