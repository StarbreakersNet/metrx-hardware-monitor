import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";

// Custom APIs for renderer
const electron = {
  app: {
    getName: () => ipcRenderer.invoke("get_app_name"),
    getDisplayName: () => ipcRenderer.invoke("get_app_displayName"),
    getVersion: () => ipcRenderer.invoke("get_app_version"),
    openDevTools: () => ipcRenderer.invoke("open_devtools"),
  },
  store: {
    get: key => ipcRenderer.invoke("get_store", key),
    set: (key, value) => ipcRenderer.invoke("set_store", key, value),
    delete: key => ipcRenderer.invoke("delete_store", key),
  },
  ...electronAPI,
  dialog: (method, config) => ipcRenderer.invoke("dialog", method, config),
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
  },
  gnome: {
    getButtonPosition: () => ipcRenderer.invoke("gnome:get-button-position"),
  },
};
const api = {
  init: () => ipcRenderer.invoke("metrics:init"),
  start: (nodeUsed, interval) => ipcRenderer.invoke("metrics:start", nodeUsed, interval),
  stop: () => ipcRenderer.invoke("metrics:stop"),
  destroy: () => ipcRenderer.invoke("metrics:destroy"),
  get: staticData => ipcRenderer.invoke("metrics:get", staticData),
  onData: callback => {
    ipcRenderer.removeAllListeners("metrics:data");
    ipcRenderer.on("metrics:data", (event, data) => callback(data));
  },
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
