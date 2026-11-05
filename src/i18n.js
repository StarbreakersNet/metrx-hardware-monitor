// Traductions avec vue-i18n (API Composition). Les textes sont dans locales/*.json, à la racine
// du dépôt : section « app » pour l'interface, section « native » pour les textes affichés par
// Rust (menu du tray, notifications, messages de mise à jour).
import { getAppInfo } from "@/api/app";
import { createI18n } from "vue-i18n";
import en from "../locales/en.json";
import fr from "../locales/fr.json";

export const LOCALES = ["fr", "en"];

export const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages: { fr: fr.app, en: en.app },
});

/** Langue du système (fournie par Rust) : français ou, à défaut, anglais */
export function systemLocale() {
  const locale = getAppInfo().systemLocale || navigator.language || "";

  return locale.toLowerCase().startsWith("fr") ? "fr" : "en";
}

/** Applique la préférence de langue ("system", "fr" ou "en") */
export function setLocale(preference) {
  const locale = LOCALES.includes(preference) ? preference : systemLocale();

  i18n.global.locale.value = locale;
  document.documentElement.lang = locale;
  return locale;
}
