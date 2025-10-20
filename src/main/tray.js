import { app, Menu, Tray } from "electron";
import { getData, onDidChange, setData } from "./store";
import { is } from "@electron-toolkit/utils";

function getAppLabel() {
  if (is.dev) {
    return app.getName() + " " + app.getVersion() + " 🚧";
  } else {
    return app.getName() + " " + app.getVersion();
  }
}

let isQuitting = false;
let tray = null;

export function setIsQuitting(value) {
  isQuitting = value;
}

export default function useTray(trayIcon, mainWindow) {
  if (tray) {
    tray.destroy();
  }

  tray = new Tray(trayIcon);

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
          if (process.platform === "darwin" && app.dock) {
            app.dock.show();
          }
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
    if (process.platform === "darwin" && app.dock) {
      app.dock.show();
    }
    mainWindow.show();
  });

  app.on("before-quit", () => {
    isQuitting = true;
    if (tray) {
      tray.destroy();
      tray = null;
    }
  });

  mainWindow.on("close", event => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();

      if (process.platform === "darwin" && app.dock) {
        app.dock.hide();
      }
    }
  });

  onDidChange("startOnLogin", () => {
    tray.setContextMenu(buildContextMenu());
  });

  onDidChange("startMinimized", () => {
    tray.setContextMenu(buildContextMenu());
  });
}
