import { ipcMain } from "electron";
import Si from "systeminformation";

let observer;
let mainWindowRef;
const isElectronWindows = process.platform === "win32";

function clearObserver() {
  clearInterval(observer);
  observer = null;
}

function metricsCallback(apiData) {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send("metrics:data", apiData);
  }
}

function initMetrics() {
  if (isElectronWindows) {
    Si.powerShellStart();
  }
}

function startMetrics(nodeUsed, interval) {
  clearObserver();
  observer = Si.observe(nodeUsed, interval, metricsCallback);
}

function stopMetrics() {
  clearObserver();
}

function destroyMetrics() {
  stopMetrics();

  if (isElectronWindows) {
    Si.powerShellRelease();
  }
}

// Fonction principale pour configurer les handlers
export default function useMetricsHandler(mainWindow) {
  mainWindowRef = mainWindow; // Stocke la référence de fenêtre pour utilisation dans les callbacks

  ipcMain.handle("metrics:init", () => {
    initMetrics();
  });

  ipcMain.handle("metrics:start", (event, nodeUsed, interval) => {
    startMetrics(nodeUsed, interval);
  });

  ipcMain.handle("metrics:stop", () => {
    stopMetrics();
  });

  ipcMain.handle("metrics:destroy", () => {
    destroyMetrics();
  });

  ipcMain.handle("metrics:get", (event, staticData) => {
    return Si.get(staticData);
  });

  return {
    initMetrics,
    startMetrics,
    stopMetrics,
    destroyMetrics,
  };
}
