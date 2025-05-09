import { app, Menu, Tray } from "electron";
import { getData, onDidChange, setData } from "./store";
import { is } from "@electron-toolkit/utils";

function getAppLabel() {
  if (is.dev) {
    return app.getName() + " " + app.getVersion() + " 🚧";
  } else {
    return app.getName() + " " + app.getVersion()
  }
}

export default function useTray(trayIcon, mainWindow) {
  let tray = new Tray(trayIcon);
  let isQuitting = false;

  const buildContextMenu = () => {
    const openAtLogin = getData("startOnLogin");
    const openAsHidden = getData("startMinimized");

    return Menu.buildFromTemplate([
      {
        label: getAppLabel(),
        type: "normal",
        enabled: false,
      },
      {
        label: "Ouvrir",
        type: "normal",
        click: () => {
          mainWindow.show();
        },
      },
      { type: "separator" },
      {
        label: "Lancer au démarrage",
        type: "checkbox",
        checked: openAtLogin,
        click: () => {
          setData("startOnLogin", !openAtLogin);
          tray.setContextMenu(buildContextMenu());
        },
      },
      {
        label: "Ouvrir minimisé",
        type: "checkbox",
        checked: openAsHidden,
        click: () => {
          setData("startMinimized", !openAsHidden);
          tray.setContextMenu(buildContextMenu());
        },
      },
      { type: "separator" },
      {
        label: "Quitter",
        type: "normal",
        click: () => {
          app.quit();
        },
      },
    ]);
  };

  tray.setToolTip(app.getName());
  tray.setContextMenu(buildContextMenu());
  tray.on("double-click", () => {
    mainWindow.show();
  });

  app.on("before-quit", () => {
    isQuitting = true;
  });

  mainWindow.on("close", event => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  onDidChange("startOnLogin", newValue => {
    tray.setContextMenu(buildContextMenu());
  });

  onDidChange("startMinimized", newValue => {
    tray.setContextMenu(buildContextMenu());
  });
}
