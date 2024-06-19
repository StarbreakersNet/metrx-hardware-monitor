import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import Si from "systeminformation";

// Custom APIs for renderer
const electron = {
  app: {
    getName: () => ipcRenderer.invoke("get_app_name"),
    getVersion: () => ipcRenderer.invoke("get_app_version"),
    openDevTools: () => ipcRenderer.invoke("open_devtools"),
  },
  ...electronAPI,
  dialog: (method, config) => ipcRenderer.invoke("dialog", method, config),
};
const api = {
  ...Si,
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electron);
    contextBridge.exposeInMainWorld("api", api);
    contextBridge.exposeInMainWorld("vite", import.meta.env);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electron;
  window.api = api;
  window.vite = import.meta.env;
}
