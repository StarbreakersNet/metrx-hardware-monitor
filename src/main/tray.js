import { app, Menu, Tray } from "electron";

export default function useTray(trayIcon, mainWindow) {
  let tray = new Tray(trayIcon);
  const buildContextMenu = () => {
    const openAtLogin = app.getLoginItemSettings().openAtLogin;

    return Menu.buildFromTemplate([
      {
        label: app.getName() + " " + app.getVersion(),
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
        checked: app.getLoginItemSettings().openAtLogin,
        click: () => {
          app.setLoginItemSettings({
            openAtLogin: !openAtLogin,
          });
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
  }
  tray.setToolTip(app.getName());
  tray.setContextMenu(buildContextMenu());
  tray.on("double-click", () => {
    mainWindow.show();
  });

  mainWindow.on("minimize", (event) => {
    setTimeout(() => {
      mainWindow.hide();
    }, 500);
  });
}

