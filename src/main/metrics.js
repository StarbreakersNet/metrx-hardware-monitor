import { ipcMain } from "electron";
import Si from "systeminformation";

export default function useMetricsHandler(mainWindow) {
  const isElectronWindows = process.platform === "win32";
  let observer;

  function clearObserver() {
    clearInterval(observer);
    observer = null;
  }

  function metricsCallback(apiData) {
    mainWindow.webContents.send("metrics:data", apiData);
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
    clearObserver();

    if (isElectronWindows) {
      Si.powerShellRelease();
    }
  }

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
}
