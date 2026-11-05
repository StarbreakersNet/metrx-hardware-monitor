//! Lance le sidecar de métriques (Bun + systeminformation, voir `src-sidecar/`) et relaie
//! ses messages : chaque ligne JSON écrite sur stdout est renvoyée telle quelle à la webview,
//! et la webview écrit ses requêtes sur stdin via la commande `metrics_send`.
//!
//! Le Rust ne connaît pas le protocole : toute la logique est dans `src-sidecar/index.js`
//! et `src/api/metrics.js`.

use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use serde_json::value::RawValue;
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};

use crate::window::MAIN_WINDOW;

const SIDECAR_NAME: &str = "metrx-metrics";
const MESSAGE_EVENT: &str = "metrics:message";

/// Au-delà de cette durée de vie, un redémarrage n'est plus considéré comme une boucle de crash
const STABLE_AFTER: Duration = Duration::from_secs(30);
const MAX_RESTART_DELAY: Duration = Duration::from_secs(30);

#[derive(Default)]
pub struct SidecarState {
    child: Mutex<Option<CommandChild>>,
    shutting_down: AtomicBool,
}

pub fn init<R: Runtime>(app: &AppHandle<R>) {
    app.manage(SidecarState::default());
    spawn(app.clone(), Duration::from_secs(1));
}

fn spawn<R: Runtime>(app: AppHandle<R>, restart_delay: Duration) {
    let state = app.state::<SidecarState>();

    if state.shutting_down.load(Ordering::SeqCst) {
        return;
    }

    let spawned = app
        .shell()
        .sidecar(SIDECAR_NAME)
        .and_then(|command| command.spawn());

    let (mut events, child) = match spawned {
        Ok(spawned) => spawned,
        Err(error) => {
            eprintln!("[sidecar] Impossible de lancer {SIDECAR_NAME} : {error}");
            schedule_restart(app, restart_delay);
            return;
        }
    };

    *state.child.lock().unwrap() = Some(child);
    let started_at = Instant::now();

    tauri::async_runtime::spawn(async move {
        while let Some(event) = events.recv().await {
            match event {
                CommandEvent::Stdout(line) => forward_message(&app, &line),
                CommandEvent::Stderr(line) => {
                    eprintln!("{}", String::from_utf8_lossy(&line).trim_end());
                }
                CommandEvent::Error(error) => eprintln!("[sidecar] {error}"),
                CommandEvent::Terminated(payload) => {
                    app.state::<SidecarState>().child.lock().unwrap().take();
                    eprintln!(
                        "[sidecar] Arrêté (code {:?}, signal {:?})",
                        payload.code, payload.signal
                    );

                    let delay = if started_at.elapsed() > STABLE_AFTER {
                        Duration::from_secs(1)
                    } else {
                        (restart_delay * 2).min(MAX_RESTART_DELAY)
                    };

                    schedule_restart(app, delay);
                    break;
                }
                _ => {}
            }
        }
    });
}

fn schedule_restart<R: Runtime>(app: AppHandle<R>, delay: Duration) {
    if app
        .state::<SidecarState>()
        .shutting_down
        .load(Ordering::SeqCst)
    {
        return;
    }

    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(delay).await;
        spawn(app, delay);
    });
}

fn forward_message<R: Runtime>(app: &AppHandle<R>, line: &[u8]) {
    let line = String::from_utf8_lossy(line);
    let line = line.trim();

    if line.is_empty() {
        return;
    }

    // RawValue : le JSON est transmis tel quel, sans être décodé puis réencodé
    match RawValue::from_string(line.to_string()) {
        Ok(message) => {
            let _ = app.emit_to(MAIN_WINDOW, MESSAGE_EVENT, message);
        }
        Err(_) => eprintln!("[sidecar] Sortie ignorée : {line}"),
    }
}

/// Envoie une requête JSON (une ligne) au sidecar.
#[tauri::command]
pub fn metrics_send(state: State<'_, SidecarState>, message: String) -> Result<(), String> {
    let mut child = state.child.lock().unwrap();
    let child = child
        .as_mut()
        .ok_or("Le service de métriques n'est pas démarré")?;

    let mut line = message.replace(['\n', '\r'], " ");
    line.push('\n');

    child
        .write(line.as_bytes())
        .map_err(|error| error.to_string())
}

/// Arrête le sidecar (fermeture de l'app ou installation d'une mise à jour).
pub fn shutdown<R: Runtime>(app: &AppHandle<R>) {
    let Some(state) = app.try_state::<SidecarState>() else {
        return;
    };

    state.shutting_down.store(true, Ordering::SeqCst);

    if let Some(child) = state.child.lock().unwrap().take() {
        let _ = child.kill();
    }
}
