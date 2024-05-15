import { ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

export default function useUpdater(app, window) {
  removeListeners();
  // Auto updater
  ipcMain.on("app_version", event => {
    event.sender.send("app_version", { version: app.getVersion() });
  });

  autoUpdater.autoDownload = true;

  autoUpdater.setFeedURL(
    "https://gitlab.com/api/v4/projects/33549653/jobs/artifacts/main/raw/dist?job=build"
  );

  autoUpdater.on("checking-for-update", () => {
    window.webContents.send("update-status", "Vérification des mises à jour...1");
  });

  autoUpdater.on("update-available", () => {
    window.webContents.send("update-status", "Mise à jour disponible.");
  });

  autoUpdater.on("update-not-available", () => {
    window.webContents.send("update-status", "Aucune mise à jour disponible.");
  });

  autoUpdater.on("error", message => {
    window.webContents.send("update-error", message);
  });

  autoUpdater.on("download-progress", progressObj => {
    window.webContents.send("download-progress", progressObj);
  });

  autoUpdater.on("update-downloaded", () => {
    window.webContents.send(
      "update-status",
      "Mise à jour téléchargée. Redémarrage de l'application..."
    );
    autoUpdater.quitAndInstall();
  });

  ipcMain.on("check-for-updates", async (event, options) => {
    const feedUrl = options.beta
      ? "https://gitlab.com/api/v4/projects/33549653/jobs/artifacts/develop/raw/dist?job=build"
      : "https://gitlab.com/api/v4/projects/33549653/jobs/artifacts/main/raw/dist?job=build";

    console.log("[Updater] Utilisation de l'URL :", feedUrl);

    autoUpdater.setFeedURL(feedUrl);

    if (process.env.NODE_ENV === "development") {
      window.webContents.send(
        "update-error",
        "Impossible de vérifier les mises à jour en mode développement."
      );
    } else {
      await autoUpdater.checkForUpdates();
    }
  });
}

function removeListeners() {
  autoUpdater.removeAllListeners("checking-for-update");
  autoUpdater.removeAllListeners("update-available");
  autoUpdater.removeAllListeners("update-not-available");
  autoUpdater.removeAllListeners("error");
  autoUpdater.removeAllListeners("download-progress");
  autoUpdater.removeAllListeners("update-downloaded");
  ipcMain.removeAllListeners("app_version");
  ipcMain.removeAllListeners("check-for-updates");
}
