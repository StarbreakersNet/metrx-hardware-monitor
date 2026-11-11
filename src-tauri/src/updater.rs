//! Mises à jour automatiques avec les canaux de l'ancienne version Electron :
//! `latest` (Live), `beta` (Preview) et `alpha` (Nightly).
//!
//! Comme electron-updater, un canal reçoit aussi les versions des canaux plus stables :
//! alpha ⊃ beta ⊃ latest. On interroge l'API GitHub Releases pour trouver la release la plus
//! récente du canal, puis on donne son `latest.json` (généré par la CI) au plugin updater de
//! Tauri, qui vérifie la signature, télécharge et installe.

use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use semver::Version;
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, Runtime, State, Url};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::i18n::{t, tf};
use crate::sidecar;

const RELEASES_API: &str =
    "https://api.github.com/repos/StarbreakersNet/metrx-hardware-monitor/releases?per_page=50";
const MANIFEST_NAME: &str = "latest.json";
const USER_AGENT: &str = "Metrx-Updater";
/// Hôte de `RELEASES_API`, résolu pour savoir si Internet est joignable
const NETWORK_HOST: &str = "api.github.com:443";
const NETWORK_POLL_INTERVAL: Duration = Duration::from_secs(5);
const NETWORK_LOOKUP_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Default)]
pub struct UpdaterState {
    checking: AtomicBool,
    downloaded: Mutex<Option<DownloadedUpdate>>,
}

struct DownloadedUpdate {
    update: Update,
    bytes: Vec<u8>,
}

/// Évènements envoyés à `src/Updater.vue`, équivalents de ceux d'electron-updater.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum UpdaterEvent {
    Checking,
    Available {
        version: String,
    },
    NotAvailable,
    Cancelled {
        message: String,
    },
    Error {
        message: String,
    },
    Log {
        message: String,
    },
    #[serde(rename_all = "camelCase")]
    Progress {
        transferred: u64,
        total: u64,
        bytes_per_second: u64,
        percent: f64,
    },
    Downloaded {
        version: String,
    },
}

#[derive(Deserialize)]
struct GithubRelease {
    tag_name: String,
    draft: bool,
    assets: Vec<GithubAsset>,
}

#[derive(Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: Url,
}

#[derive(Clone, Copy, PartialEq, PartialOrd)]
enum UpdateChannel {
    Alpha,
    Beta,
    Latest,
}

impl UpdateChannel {
    fn parse(name: &str) -> Option<Self> {
        match name {
            "latest" => Some(Self::Latest),
            "beta" => Some(Self::Beta),
            "alpha" => Some(Self::Alpha),
            _ => None,
        }
    }

    /// Canal d'une version : `1.2.3` → latest, `1.2.3-beta.1` → beta, `1.2.3-alpha` → alpha
    fn of_version(version: &Version) -> Option<Self> {
        let pre = version.pre.as_str();

        if pre.is_empty() {
            Some(Self::Latest)
        } else if pre.starts_with("beta") {
            Some(Self::Beta)
        } else if pre.starts_with("alpha") {
            Some(Self::Alpha)
        } else {
            None
        }
    }

    fn name(self) -> &'static str {
        match self {
            Self::Latest => "latest",
            Self::Beta => "beta",
            Self::Alpha => "alpha",
        }
    }
}

pub fn init<R: Runtime>(app: &AppHandle<R>) {
    app.manage(UpdaterState::default());
}

/// Attend qu'Internet soit joignable, au plus `timeout_secs` secondes. Renvoie `false` si le délai
/// est dépassé.
///
/// Au démarrage de l'ordinateur, le réseau peut être connecté avant que le DNS réponde : on
/// résout l'hôte de l'API GitHub toutes les 5 s. Une résolution DNS ne coûte qu'un petit paquet
/// et ne compte pas dans la limite d'appels de l'API GitHub (60 par heure sans compte).
#[tauri::command]
pub async fn updater_wait_for_network(timeout_secs: u64) -> bool {
    let deadline = Instant::now() + Duration::from_secs(timeout_secs);

    loop {
        if is_internet_reachable().await {
            return true;
        }
        if Instant::now() >= deadline {
            return false;
        }
        tokio::time::sleep(NETWORK_POLL_INTERVAL).await;
    }
}

async fn is_internet_reachable() -> bool {
    let lookup = tokio::time::timeout(
        NETWORK_LOOKUP_TIMEOUT,
        tokio::net::lookup_host(NETWORK_HOST),
    );

    match lookup.await {
        Ok(Ok(mut addresses)) => addresses.next().is_some(),
        _ => false,
    }
}

#[tauri::command]
pub async fn updater_check<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, UpdaterState>,
    channel: Option<String>,
    on_event: Channel<UpdaterEvent>,
) -> Result<(), String> {
    let send = |event: UpdaterEvent| {
        let _ = on_event.send(event);
    };

    if cfg!(debug_assertions) {
        send(UpdaterEvent::Cancelled {
            message: t("update.devMode"),
        });
        return Ok(());
    }

    if state.checking.swap(true, Ordering::SeqCst) {
        send(UpdaterEvent::Cancelled {
            message: t("update.alreadyChecking"),
        });
        return Ok(());
    }

    let result = check_and_download(&app, &state, channel, &send).await;
    state.checking.store(false, Ordering::SeqCst);

    if let Err(message) = result {
        send(UpdaterEvent::Error { message });
    }

    Ok(())
}

async fn check_and_download<R: Runtime>(
    app: &AppHandle<R>,
    state: &UpdaterState,
    channel: Option<String>,
    send: &impl Fn(UpdaterEvent),
) -> Result<(), String> {
    let current_version = app.package_info().version.clone();
    let channel = channel
        .as_deref()
        .and_then(UpdateChannel::parse)
        .or_else(|| UpdateChannel::of_version(&current_version))
        .unwrap_or(UpdateChannel::Latest);

    send(UpdaterEvent::Log {
        message: format!("[updater] 📺 Channel selected : {}", channel.name()),
    });
    send(UpdaterEvent::Checking);

    let Some(manifest_url) = find_manifest(channel).await? else {
        send(UpdaterEvent::NotAvailable);
        return Ok(());
    };

    send(UpdaterEvent::Log {
        message: format!("[updater] 🔄 Checking {manifest_url}"),
    });

    let update = app
        .updater_builder()
        .endpoints(vec![manifest_url])
        .and_then(|builder| builder.build())
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| tf("update.checkFailed", &[("error", &error.to_string())]))?;

    let Some(update) = update else {
        send(UpdaterEvent::NotAvailable);
        send(UpdaterEvent::Log {
            message: "[updater] ✅ Check for updates done".into(),
        });
        return Ok(());
    };

    let version = update.version.clone();
    send(UpdaterEvent::Available {
        version: version.clone(),
    });

    let started_at = Instant::now();
    let mut transferred: u64 = 0;
    let bytes = update
        .download(
            |chunk_length, content_length| {
                transferred += chunk_length as u64;
                let total = content_length.unwrap_or(transferred);
                let elapsed = started_at.elapsed().as_secs_f64().max(0.001);

                send(UpdaterEvent::Progress {
                    transferred,
                    total,
                    bytes_per_second: (transferred as f64 / elapsed) as u64,
                    percent: transferred as f64 / total.max(1) as f64 * 100.0,
                });
            },
            || {},
        )
        .await
        .map_err(|error| tf("update.downloadFailed", &[("error", &error.to_string())]))?;

    *state.downloaded.lock().unwrap() = Some(DownloadedUpdate { update, bytes });
    send(UpdaterEvent::Downloaded {
        version: version.clone(),
    });
    notify_downloaded(app);

    Ok(())
}

/// URL du `latest.json` de la release la plus récente compatible avec le canal.
async fn find_manifest(channel: UpdateChannel) -> Result<Option<Url>, String> {
    // reqwest est compilé sans fournisseur crypto par défaut (comme tauri-plugin-updater)
    if rustls::crypto::CryptoProvider::get_default().is_none() {
        let _ = rustls::crypto::ring::default_provider().install_default();
    }

    let releases: Vec<GithubRelease> = reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .build()
        .map_err(|error| error.to_string())?
        .get(RELEASES_API)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .and_then(|response| response.error_for_status())
        .map_err(|error| tf("update.listFailed", &[("error", &error.to_string())]))?
        .json()
        .await
        .map_err(|error| tf("update.invalidResponse", &[("error", &error.to_string())]))?;

    let manifest = releases
        .into_iter()
        .filter(|release| !release.draft)
        .filter_map(|release| {
            let version = Version::parse(release.tag_name.trim_start_matches('v')).ok()?;
            // alpha accepte alpha, beta et latest ; beta accepte beta et latest
            let release_channel = UpdateChannel::of_version(&version)?;
            let manifest = release
                .assets
                .into_iter()
                .find(|asset| asset.name == MANIFEST_NAME)?;

            (release_channel >= channel).then_some((version, manifest.browser_download_url))
        })
        .max_by(|(a, _), (b, _)| a.cmp(b))
        .map(|(_, url)| url);

    Ok(manifest)
}

fn notify_downloaded<R: Runtime>(app: &AppHandle<R>) {
    let name = &app.package_info().name;
    let result = app
        .notification()
        .builder()
        .title(t("update.readyTitle"))
        .body(tf("update.readyBody", &[("name", name)]))
        .show();

    if let Err(error) = result {
        eprintln!("[updater] Notification impossible : {error}");
    }
}

/// Installe la mise à jour téléchargée puis relance l'application.
#[tauri::command]
pub fn updater_install<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, UpdaterState>,
) -> Result<(), String> {
    let downloaded = state
        .downloaded
        .lock()
        .unwrap()
        .take()
        .ok_or_else(|| t("update.noneDownloaded"))?;

    install(&app, downloaded)?;
    app.restart();
}

pub fn install_pending_on_exit<R: Runtime>(app: &AppHandle<R>) {
    let Some(state) = app.try_state::<UpdaterState>() else {
        return;
    };

    if let Some(downloaded) = state.downloaded.lock().unwrap().take() {
        if let Err(error) = install(app, downloaded) {
            eprintln!("[updater] {error}");
        }
    }
}

fn install<R: Runtime>(app: &AppHandle<R>, downloaded: DownloadedUpdate) -> Result<(), String> {
    // Sous Windows, l'installeur ne peut pas remplacer le sidecar s'il tourne encore
    sidecar::shutdown(app);

    downloaded
        .update
        .install(&downloaded.bytes)
        .map_err(|error| tf("update.installFailed", &[("error", &error.to_string())]))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn channel_of(version: &str) -> Option<&'static str> {
        UpdateChannel::of_version(&Version::parse(version).unwrap()).map(UpdateChannel::name)
    }

    #[test]
    fn detects_channel_from_version() {
        assert_eq!(channel_of("2.0.0"), Some("latest"));
        assert_eq!(channel_of("2.0.0-beta"), Some("beta"));
        assert_eq!(channel_of("2.0.0-beta.2"), Some("beta"));
        assert_eq!(channel_of("2.0.0-alpha"), Some("alpha"));
        assert_eq!(channel_of("0.0.0-dev"), None);
    }

    #[test]
    fn less_stable_channels_include_more_stable_ones() {
        assert!(UpdateChannel::Latest >= UpdateChannel::Alpha);
        assert!(UpdateChannel::Beta >= UpdateChannel::Alpha);
        assert!(UpdateChannel::Latest >= UpdateChannel::Beta);
        assert!(UpdateChannel::Alpha < UpdateChannel::Beta);
    }
}
