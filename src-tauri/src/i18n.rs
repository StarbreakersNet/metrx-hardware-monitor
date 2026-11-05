//! Traductions des textes affichés par Rust (menu du tray, notifications, mises à jour).
//!
//! Les textes sont dans `locales/*.json`, section « native », à côté de ceux de l'interface
//! (section « app », lue par vue-i18n). `{nom}` est remplacé par la valeur donnée.

use std::collections::HashMap;
use std::sync::RwLock;

use serde_json::Value;

const FR: &str = include_str!("../../locales/fr.json");
const EN: &str = include_str!("../../locales/en.json");

static TEXTS: RwLock<Option<HashMap<String, String>>> = RwLock::new(None);

/// Préférences possibles (réglage « Langue » de l'interface)
pub const PREFERENCES: [&str; 3] = ["system", "fr", "en"];

/// Choisit la langue à partir de la préférence ("system", "fr" ou "en").
pub fn set_language(preference: &str) {
    let lang = match preference {
        "fr" | "en" => preference,
        _ => system_language(),
    };

    *TEXTS.write().unwrap() = Some(load(lang));
}

/// Langue du système : français ou, à défaut, anglais.
fn system_language() -> &'static str {
    if system_locale().to_ascii_lowercase().starts_with("fr") {
        "fr"
    } else {
        "en"
    }
}

/// Locale du système (ex : "fr-FR"), aussi transmise à l'interface
pub fn system_locale() -> String {
    sys_locale::get_locale().unwrap_or_default()
}

/// Textes de la langue, complétés par l'anglais pour les clés absentes.
fn load(lang: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();

    for text in [EN, if lang == "fr" { FR } else { EN }] {
        if let Ok(value) = serde_json::from_str::<Value>(text) {
            flatten(&value["native"], "", &mut map);
        }
    }

    map
}

fn flatten(value: &Value, prefix: &str, out: &mut HashMap<String, String>) {
    match value {
        Value::Object(object) => {
            for (key, value) in object {
                let key = if prefix.is_empty() {
                    key.clone()
                } else {
                    format!("{prefix}.{key}")
                };
                flatten(value, &key, out);
            }
        }
        Value::String(text) => {
            out.insert(prefix.to_string(), text.clone());
        }
        _ => {}
    }
}

/// Texte traduit.
pub fn t(key: &str) -> String {
    tf(key, &[])
}

/// Texte traduit, avec ses valeurs : `tf("update.checkFailed", &[("error", "…")])`.
pub fn tf(key: &str, args: &[(&str, &str)]) -> String {
    if TEXTS.read().unwrap().is_none() {
        set_language("system");
    }

    let texts = TEXTS.read().unwrap();
    let mut text = texts
        .as_ref()
        .and_then(|texts| texts.get(key).cloned())
        .unwrap_or_else(|| key.to_string());

    for (name, value) in args {
        text = text.replace(&format!("{{{name}}}"), value);
    }

    text
}

#[cfg(test)]
mod tests {
    use super::*;

    fn keys(text: &str, section: &str) -> Vec<String> {
        let mut map = HashMap::new();
        flatten(
            &serde_json::from_str::<Value>(text).unwrap()[section],
            "",
            &mut map,
        );
        let mut keys: Vec<_> = map.into_keys().collect();
        keys.sort();
        keys
    }

    /// Vérifie aussi la section « app » : une clé oubliée dans une langue fait échouer la CI
    #[test]
    fn same_keys_in_every_language() {
        for section in ["native", "app"] {
            let fr = keys(FR, section);
            assert!(!fr.is_empty(), "section {section} vide");
            assert_eq!(fr, keys(EN, section), "clés différentes dans « {section} »");
        }
    }

    #[test]
    fn languages_and_placeholders() {
        set_language("en");
        assert_eq!(t("tray.quit"), "Quit");

        set_language("fr");
        assert_eq!(t("tray.quit"), "Quitter");
        assert_eq!(
            tf("update.checkFailed", &[("error", "timeout")]),
            "Erreur lors de la vérification des mises à jour : timeout"
        );
        assert_eq!(t("cle.inconnue"), "cle.inconnue");
    }
}
