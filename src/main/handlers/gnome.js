import { execSync } from "child_process";
import { ipcMain } from "electron";

export default function useGnomeHandler() {
  ipcMain.handle("gnome:get-button-position", async () => {
    try {
      // Vérifier si nous sommes sur GNOME ou Unity
      const desktopEnv = process.env.XDG_CURRENT_DESKTOP || "";
      const isGnomeOrUnity =
        desktopEnv.toLowerCase().includes("gnome") ||
        desktopEnv.toLowerCase().includes("unity") ||
        desktopEnv.toLowerCase().includes("ubuntu");

      if (!isGnomeOrUnity) {
        return "right"; // Valeur par défaut si ni GNOME ni Unity
      }

      // Pour GNOME ou Unity, on utilise des schémas gsettings différents selon l'environnement
      let buttonLayout;

      try {
        buttonLayout = execSync("gsettings get org.gnome.desktop.wm.preferences button-layout")
          .toString()
          .trim();
      } catch (error) {
        // Fallback pour les versions plus anciennes d'Ubuntu
        buttonLayout = execSync("gsettings get com.canonical.Unity.Interface button-layout")
          .toString()
          .trim();
      }

      // Si le format est "close,minimize,maximize:" (ou similaire), les boutons sont à gauche
      // Si le format est ":minimize,maximize,close" (ou similaire), les boutons sont à droite
      // Enlever les guillemets potentiels
      buttonLayout = buttonLayout.replace(/['"`]/g, "");

      // Vérifier la position basée sur la présence des deux-points
      const isPositionLeft = buttonLayout.indexOf(":") > buttonLayout.indexOf("close");
      return isPositionLeft ? "left" : "right";
    } catch (error) {
      console.error("Erreur lors de la récupération de la position des boutons:", error);
      return "left";
    }
  });
}
