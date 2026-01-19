import { ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import PackageJson from "/package.json";
import { setIsQuitting } from "./tray";

export default function useUpdater(app, window) {
  removeListeners();
  // Auto updater
  ipcMain.on("app_version", event => {
    event.sender.send("app_version", { version: app.getVersion() });
  });

  autoUpdater.autoDownload = true;

  autoUpdater.on("checking-for-update", () => {
    window.webContents.send("update-check");
  });

  autoUpdater.on("update-available", () => {
    window.webContents.send("update-available");
  });

  autoUpdater.on("update-not-available", () => {
    window.webContents.send("update-not-available");
  });

  autoUpdater.on("update-cancelled", () => {
    window.webContents.send("update-cancelled");
  });

  autoUpdater.on("error", message => {
    window.webContents.send("update-error", message);
  });

  autoUpdater.on("download-progress", progressObj => {
    window.webContents.send(
      "update-log",
      "[autoUpdater] ⬇️ Download progress : " +
        progressObj.progress +
        " - " +
        progressObj.transferred +
        "/" +
        progressObj.total +
        " bytes (" +
        progressObj.percent +
        "% - " +
        progressObj.bytesPerSecond +
        "bps)"
    );
    window.webContents.send("download-progress", progressObj);
  });

  autoUpdater.on("update-downloaded", () => {
    window.webContents.send("update-downloaded");
  });

  ipcMain.on("install-update", () => {
    setIsQuitting(true);
    autoUpdater.quitAndInstall();
  });

  ipcMain.on("check-for-updates", async (event, updateChanel) => {
    try {
      let version = PackageJson.version;
      let channel = updateChanel;

      if (!channel) {
        channel = "latest";

        if (version.includes("-")) {
          channel = version.split("-")[1];
        }
      }

      window.webContents.send("update-log", "[autoUpdater] 📺 Channel selected : " + channel);
      autoUpdater.channel = channel;

      if (process.env.NODE_ENV === "development") {
        window.webContents.send(
          "update-cancelled",
          "Impossible de vérifier les mises à jour en mode développement"
        );
      } else {
        window.webContents.send("update-log", "[autoUpdater] 🔄 Checking for updates...");
        await autoUpdater.checkForUpdatesAndNotify(getNotificationOptions());
        window.webContents.send("update-log", "[autoUpdater] ✅ Check for updates done");
      }
    } catch (error) {
      window.webContents.send("update-error", "Erreur lors de la vérification des mises à jour");
    }
  });
}

function getNotificationOptions() {
  return {
    title: "Une nouvelle mise à jour est prête",
    body:
      "La dernière version de " +
      PackageJson.displayName +
      " a été téléchargée et sera automatiquement installée à la fermeture de l'application",
  };
}

function getBinaryType() {
  switch (process.platform) {
    case "win32":
      return "-setup.exe";
    case "darwin":
      return ".dmg";
    case "linux":
      return "-amd64.deb";
    default:
      return "-setup.exe";
  }
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
  ipcMain.removeAllListeners("install-update");
}
