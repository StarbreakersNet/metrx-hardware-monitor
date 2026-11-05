/// Position des boutons de fenêtre sous GNOME / Unity ("left" ou "right"),
/// pour placer les contrôles de la barre de titre maison du même côté que le système.
#[tauri::command]
pub async fn gnome_button_position() -> &'static str {
    #[cfg(target_os = "linux")]
    {
        linux::button_position()
    }

    #[cfg(not(target_os = "linux"))]
    {
        "right"
    }
}

#[cfg(target_os = "linux")]
mod linux {
    use std::process::Command;

    pub fn button_position() -> &'static str {
        let desktop = std::env::var("XDG_CURRENT_DESKTOP")
            .unwrap_or_default()
            .to_lowercase();
        let is_gnome_or_unity = ["gnome", "unity", "ubuntu"]
            .iter()
            .any(|name| desktop.contains(name));

        if !is_gnome_or_unity {
            return "right";
        }

        // Schéma GNOME, puis repli pour les anciennes versions d'Ubuntu (Unity)
        let layout = gsettings("org.gnome.desktop.wm.preferences")
            .or_else(|| gsettings("com.canonical.Unity.Interface"));

        match layout {
            Some(layout) => position_from_layout(&layout),
            None => {
                eprintln!("Impossible de récupérer la position des boutons GNOME");
                "left"
            }
        }
    }

    fn gsettings(schema: &str) -> Option<String> {
        let output = Command::new("gsettings")
            .args(["get", schema, "button-layout"])
            .output()
            .ok()?;

        output
            .status
            .success()
            .then(|| String::from_utf8_lossy(&output.stdout).trim().to_string())
    }

    /// "close,minimize,maximize:" → boutons à gauche, ":minimize,maximize,close" → à droite
    pub fn position_from_layout(layout: &str) -> &'static str {
        let layout = layout.replace(['\'', '"', '`'], "");
        let index_of = |pattern: &str| layout.find(pattern).map_or(-1, |index| index as i64);

        if index_of(":") > index_of("close") {
            "left"
        } else {
            "right"
        }
    }

    #[cfg(test)]
    mod tests {
        use super::position_from_layout;

        #[test]
        fn detects_button_side() {
            assert_eq!(position_from_layout("'close,minimize,maximize:'"), "left");
            assert_eq!(position_from_layout("':minimize,maximize,close'"), "right");
            assert_eq!(position_from_layout("'appmenu:minimize,close'"), "right");
        }
    }
}
