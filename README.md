# metrx-hardware-monitor

[![Live](https://img.shields.io/github/v/release/StarbreakersNet/metrx-hardware-monitor?label=live)](https://github.com/StarbreakersNet/metrx-hardware-monitor/releases/latest)
[![Preview](https://img.shields.io/github/v/release/StarbreakersNet/metrx-hardware-monitor?include_prereleases&sort=semver&filter=!*-alpha*&label=preview)](https://github.com/StarbreakersNet/metrx-hardware-monitor/releases)
[![Build & release](https://github.com/StarbreakersNet/metrx-hardware-monitor/actions/workflows/deploy.yml/badge.svg?event=push)](https://github.com/StarbreakersNet/metrx-hardware-monitor/actions/workflows/deploy.yml)
[![License](https://img.shields.io/github/license/StarbreakersNet/metrx-hardware-monitor)](LICENSE)

A [Tauri](https://tauri.app) application with Vue that allows users to monitor their hardware status in real-time. This application provides a user-friendly interface to display various hardware metrics, making it easier for users to keep an eye on their system's health and performance.

## Download

Download the installer for your system from the [latest release](https://github.com/StarbreakersNet/metrx-hardware-monitor/releases/latest):

| System                            | File                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------- |
| Windows 10 / 11 (x64)             | `Metrx_<version>_x64-setup.exe`                                                   |
| macOS 13 or later (Apple Silicon) | `Metrx_<version>_aarch64.dmg`                                                     |
| Linux (x64)                       | `Metrx_<version>_amd64.deb` (Debian, Ubuntu…) or `Metrx_<version>_amd64.AppImage` |

Metrx then updates itself. To get pre-releases, choose the **Preview** (beta) or **Nightly** (alpha)
update channel in Settings > Updates.

- Windows: the installer is not signed yet. If SmartScreen warns about it, click "More info" then
  "Run anyway".
- macOS: the application is signed but not notarized yet. If macOS blocks it on first launch, open
  System Settings > Privacy & Security and click "Open Anyway".

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

Issue templates (`.github/ISSUE_TEMPLATE`) only exist in French and English: for any other language,
the "Report an issue" link opens the English template (`ISSUE_TEMPLATE_LANGUAGES` in
`src/models/repository.js`).

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

Versions follow [Semantic Versioning](https://semver.org/): successive pre-releases of a version are
numbered `2.1.0-alpha.1`, `2.1.0-beta.1`, `2.1.0-beta.2`… before `2.1.0`.

`main` is the only long-lived branch: changes go through a branch (`feat/…`, `fix/…`) and a pull
request to `main`, and every version, pre-release or release, is a tag on `main`.

User-facing changes are listed under `## [Unreleased]` in `CHANGELOG.md` as they are merged. Tooling,
CI or dev dependency changes are not listed and do not need a release.

To publish a version, from an up-to-date `main`:

```bash
yarn release 2.1.0-beta.1
```

[release-it](https://github.com/release-it/release-it) renames the `[Unreleased]` section to the
version and date, commits `docs(changelog): Prepare the 2.1.0-beta.1 release notes`, creates the tag
and pushes both after confirmation. It stops if the `[Unreleased]` section is empty. If git is not
authenticated in the terminal (when using a Git client such as GitKraken), answer "No" to the push,
then push the branch and the tag from the client.

To fix a release while `main` already holds unreleased work, start a branch from its tag
(`git switch -c hotfix/2.1.1 2.1.0`), commit the fix with its `CHANGELOG.md` entry, run
`yarn release 2.1.1` on that branch, then merge it into `main` with a pull request.

Pushing the tag runs `.github/workflows/deploy.yml`. It first runs the same lint and tests as pull
requests (`.github/workflows/ci.yml`), then builds, signs and publishes the release on the three
platforms with its `latest.json` update manifest and the notes of that `CHANGELOG.md` section. Nothing
is built if the tests fail or if the section is missing. Tags containing `-beta` or `-alpha` are
published as pre-releases and delivered to the matching update channel.

Pull requests only run the lint and tests. To get unsigned test installers of a branch, run the
"Test installers" workflow (Actions > Test installers > Run workflow).

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

Contributions are welcome! Feel free to open an issue or a pull request. By contributing, you agree
that your contributions are licensed under the GPL-3.0-or-later license of the project.

### License

Copyright (C) 2022-2026 StarbreakersNet

This program is free software: you can redistribute it and/or modify it under the terms of the GNU
General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version. See the [LICENSE](LICENSE) file for details.
