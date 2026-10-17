// Case 15 - câblage des réglages de télé-métrie (processus principal, côté Electron).
// Le serveur lui-même est sourd à Electron (src/main/remote.js, testable sans l'app) ;
// ce module-là est la seule interface entre l'electron-store et lui.
import { ipcMain } from "electron";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getData, onDidChange } from "./store";
import { arreterTeleMetrie, etatTeleMetrie, initialiserTeleMetrie, urlConsultation } from "./remote.js";

const CLES = ["remoteMetrics", "remoteMetricsPort", "remoteMetricsToken"];
const PORT_PAR_DEFAUT = 8791;

let appRef;
let windowRef;

function portValide() {
  const port = getData("remoteMetricsPort");
  return Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : PORT_PAR_DEFAUT;
}

function jetonCourant() {
  return String(getData("remoteMetricsToken") ?? "");
}

// units.js est relu depuis l'application elle-même (racine du projet en dev, asar installe) :
// la page distante ne recoit JAMAIS un format invente, seulement le fichier qui fait foi.
function lireSourceUnites() {
  try {
    return readFileSync(join(appRef.getAppPath(), "src/renderer/src/utils/units.js"), "utf8");
  } catch (error) {
    console.error("Télé-métrie : impossible de lire units.js, la page mobile reste éteinte : ", error);
    return null;
  }
}

function etatComplet() {
  const etat = etatTeleMetrie();
  if (etat.actif) {
    etat.urls = urlConsultation({ port: portValide(), jeton: jetonCourant() });
  }
  return etat;
}

function notifierEtat() {
  if (windowRef && !windowRef.isDestroyed()) {
    windowRef.webContents.send("remote:etat-change", etatComplet());
  }
}

async function appliquerReglages() {
  if (getData("remoteMetrics") !== true) {
    await arreterTeleMetrie();
    notifierEtat();
    return;
  }
  const unitsSource = lireSourceUnites();
  try {
    await initialiserTeleMetrie({
      active: true,
      port: portValide(),
      jeton: jetonCourant(),
      page: unitsSource ? { unitsSource } : null,
    });
  } catch (error) {
    // Port deja pris, sandbox reseau... : l'app continue, seule la tele-metrie reste éteinte.
    console.error("Télé-métrie : demarrage impossible (le reste de l'app continue) : ", error);
  }
  notifierEtat();
}

export function initTeleMetrie(app, window) {
  appRef = app;
  windowRef = window;

  for (const cle of CLES) {
    onDidChange(cle, () => {
      appliquerReglages();
    });
  }

  ipcMain.handle("remote:etat", () => etatComplet());

  appliquerReglages();
}
