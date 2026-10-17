// Cablage des reglages de tele-metrie (processus principal, cote Electron).
// Le serveur lui-meme est sourd a Electron (src/main/remote.js, testable sans l'app) ;
// ce module-la est la seule interface entre l'electron-store et lui.
import { ipcMain } from "electron";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getData, onDidChange } from "./store";
import { DEFAULT_PORT, remoteTelemetryState, startRemoteTelemetry, stopRemoteTelemetry, consultationUrls } from "./remote.js";

const KEYS = ["remoteMetrics", "remoteMetricsPort", "remoteMetricsToken"];

let appRef;
let windowRef;

function validPort() {
  const port = getData("remoteMetricsPort");
  return Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : DEFAULT_PORT;
}

function currentToken() {
  return String(getData("remoteMetricsToken") ?? "");
}

// units.js est relu depuis l'application elle-meme (racine du projet en dev, asar installe) :
// la page distante recoit JAMAIS un format invente, seulement le fichier qui fait foi.
function readUnitsSource() {
  try {
    return readFileSync(join(appRef.getAppPath(), "src/renderer/src/utils/units.js"), "utf8");
  } catch (error) {
    console.error("Télé-métrie : impossible de lire units.js, la page mobile reste éteinte : ", error);
    return null;
  }
}

// Meme principe pour les icones : lues a l'application (dev et asar). Absentes, elles font 404
// sur le serveur distant et la page continue de fonctionner sans elles.
function readPublicAsset(chemin) {
  try {
    return readFileSync(join(appRef.getAppPath(), "src/renderer/public", chemin));
  } catch (error) {
    console.error(`Télé-métrie : icone indisponible (${chemin}) : `, error);
    return null;
  }
}

function fullStatus() {
  const status = remoteTelemetryState();
  if (status.active) {
    status.urls = consultationUrls({ port: validPort(), token: currentToken() });
  }
  return status;
}

function notifyStatus() {
  if (windowRef && !windowRef.isDestroyed()) {
    windowRef.webContents.send("remote:status-change", fullStatus());
  }
}

async function applySettings() {
  if (getData("remoteMetrics") !== true) {
    await stopRemoteTelemetry();
    notifyStatus();
    return;
  }
  const unitsSource = readUnitsSource();
  const page = unitsSource
    ? {
        unitsSource,
        faviconSource: readPublicAsset("favicon.svg"),
        touchIconSource: readPublicAsset("apple-touch-icon.png"),
      }
    : null;
  try {
    await startRemoteTelemetry({
      active: true,
      port: validPort(),
      token: currentToken(),
      page,
    });
  } catch (error) {
    // Port deja pris, sandbox reseau... : l'app continue, seule la tele-metrie reste éteinte.
    console.error("Télé-métrie : demarrage impossible (le reste de l'app continue) : ", error);
  }
  notifyStatus();
}

export function initRemoteTelemetry(app, window) {
  appRef = app;
  windowRef = window;

  for (const key of KEYS) {
    onDidChange(key, () => {
      applySettings();
    });
  }

  ipcMain.handle("remote:status", () => fullStatus());

  applySettings();
}
