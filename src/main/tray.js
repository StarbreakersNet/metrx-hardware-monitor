import { app, Menu, Tray } from "electron";

export default function useTray(trayIcon, mainWindow) {
  let tray = new Tray(trayIcon);
  let isQuitting = false;
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
}
