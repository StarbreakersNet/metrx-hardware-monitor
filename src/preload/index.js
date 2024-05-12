import { contextBridge } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import Si from "systeminformation";

// Custom APIs for renderer
const api = {
  ...Si,
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
    contextBridge.exposeInMainWorld("vite", import.meta.env);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
  window.vite = import.meta.env;
}

if (process.platform === "win32") {
  Si.powerShellStart();
}
