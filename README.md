# metrx-hardware-monitor

A [Tauri](https://tauri.app) application with Vue that allows users to monitor their hardware status in real-time. This application provides a user-friendly interface to display various hardware metrics, making it easier for users to keep an eye on their system's health and performance.

## Features

- Real-time hardware monitoring
- Customizable dashboard with various metrics
- Fully responsive design
- Start on login option and system tray support
- User settings persistence through `tauri-plugin-store` and `pinia-plugin-persistedstate`
- Cross-platform support (Windows, macOS, Linux)

## Architecture

```
src/            Vue 3 interface (Naive UI, Chart.js, Pinia)
  api/          Thin wrappers around the Tauri APIs used by the interface
src-tauri/      Rust backend: window, tray, settings, auto-updater, sidecar relay
src-sidecar/    Metrics collector: Bun + systeminformation, compiled to a standalone binary
```

Hardware metrics are collected by [systeminformation](https://systeminformation.io) running in a
small [Bun](https://bun.sh) executable (the _sidecar_), started and stopped by Tauri. The interface
talks to it through the Rust backend, one JSON message per line:

```
Vue (webview) ──invoke──▶ Rust (Tauri) ──stdin──▶ sidecar (Bun + systeminformation)
              ◀──event───              ◀─stdout──
```

The Rust side only relays messages: to expose a new systeminformation function, add it to
`src-sidecar/index.js` and call it from `src/api/metrics.js`.

### Translations

The application is available in French and English. Texts live in `locales/*.json`:

- `app`: the interface, through [vue-i18n](https://vue-i18n.intlify.dev)
- `native`: texts displayed by Rust (tray menu, notifications, macOS menu bar, update messages)

Both files must contain the same keys: a Rust test (`cargo test`) checks it in CI.

## Recommended IDE Setup

- [IntelliJ IDEA Ultimate](https://www.jetbrains.com/idea/) with [Vue.js](https://www.jetbrains.com/help/idea/vue-js.html), [ESLint](https://www.jetbrains.com/help/idea/eslint.html), [Prettier](https://www.jetbrains.com/help/idea/prettier.html) and [Rust](https://www.jetbrains.com/rust/)
- or [VS Code](https://code.visualstudio.com/) with the recommended extensions (`.vscode/extensions.json`)

## Project Setup

### Prerequisites

- [Node.js](https://nodejs.org) 22+ with Corepack enabled (`corepack enable`), the project uses Yarn 4
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- The [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: Visual Studio Build Tools with the "Desktop development with C++" workload (WebView2 is already installed on Windows 10/11)
  - **Linux** (Debian/Ubuntu 22.04+):
    ```bash
    sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
    ```

Bun does not need to be installed globally: it is installed as a dev dependency.

### Install

```bash
yarn install
```

### Development

To start the application in development mode with hot-reload, run:

```bash
yarn dev
```

The development build uses its own identifier (`com.starbreakers.metrx.dev`), so its settings are
kept apart from an installed version of Metrx.

### Build

To build the application for the current platform:

```bash
yarn build
```

Installers are generated in `src-tauri/target/release/bundle/`.

### Lint & format

```bash
yarn lint
```

```bash
yarn format
```

## Releases

Pushing a tag (`2.0.0`, `2.0.0-beta`, `2.0.0-alpha`…) runs `.github/workflows/deploy.yml`, which
builds, signs and publishes the release with its `latest.json` update manifest. Tags containing
`-beta` or `-alpha` are published as pre-releases and delivered to the matching update channel.

### Auto-updates

Updates are signed with a dedicated key (it is not related to OS code signing). Generate it once:

```bash
yarn tauri signer generate -w ~/.tauri/metrx.key
```

- Put the content of `~/.tauri/metrx.key.pub` in `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`)
- Add the repository secrets `TAURI_SIGNING_PRIVATE_KEY` (content of `~/.tauri/metrx.key`) and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- Keep a backup of the private key: without it, installed versions can no longer be updated

### Code signing

| Platform | Repository secrets                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| macOS    | `CSC_LINK` (base64 `.p12` Developer ID certificate), `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` |
| Windows  | Not signed yet                                                                                                                      |
| Linux    | Not signed (AppImage / .deb)                                                                                                        |

macOS notarization requires an active Apple Developer Program membership. To publish a signed but
not notarized macOS build, create the repository variable `MACOS_NOTARIZE` with the value `false`
(Settings > Secrets and variables > Actions > Variables).

## Configuration

User settings can be adjusted in the application's settings menu. Interface settings are persisted
with `pinia-plugin-persistedstate`, system settings (start on login, start minimized) with
`tauri-plugin-store`.

### Contributing

Contributions are welcome! Please read our contributing guidelines before submitting merge requests.

### License

This project is licensed under the MIT License - see the LICENSE file for details.
