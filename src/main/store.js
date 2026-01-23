import Store from "electron-store";
import { ipcMain } from "electron";

const schema = {
  startOnLogin: {
    type: "boolean",
    default: false,
  },
  startMinimized: {
    type: "boolean",
    default: false,
  },
};
const settingsStore = new Store({ schema });

function getData(key) {
  return settingsStore.get(key);
}

function setData(key, value) {
  settingsStore.set(key, value);
}

function deleteData(key) {
  settingsStore.delete(key);
}

function onDidChange(key, callback) {
  settingsStore.onDidChange(key, callback);
}

function initSettingsStore(app, window) {
  settingsStore.onDidChange("startOnLogin", newValue => {
    app.setLoginItemSettings({
      openAtLogin: !!newValue,
    });
    window.webContents.send("electron-store-startOnLogin", newValue);
  });

  settingsStore.onDidChange("startMinimized", newValue => {
    window.webContents.send("electron-store-startMinimized", newValue);
  });

  // Handle store for renderer
  ipcMain.handle("get_store", (event, key) => {
    return getData(key);
  });
  ipcMain.handle("set_store", (event, key, value) => {
    return setData(key, value);
  });
  ipcMain.handle("delete_store", (event, key) => {
    return deleteData(key);
  });
}

export { initSettingsStore, getData, setData, deleteData, onDidChange };
