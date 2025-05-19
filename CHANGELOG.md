# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.5.1-alpha] - 2025-05-19

### Fixed

- Fixed scrollbar visibility issue during main app loading #65
- Fixed proper cleanup of system metrics collection when closing application #64

## [1.5.0-alpha] - 2025-05-18

### Added

- Added configurable chart height setting #43
- Added automatic cleanup of obsolete settings during local storage restoration
  when settings change
- Added optional dependency `osx-temperature-sensor` to fix missing temperature metrics on macOS systems #63

### Changed

- Renamed `graphSettings` key to `chartSettings`
- Updated dependencies (`sass` and `vite`) to latest versions
- Modernized imports in using `@use` syntax
- Introduced metrics collection module to streamline system metrics in renderer process

### Removed

- Removed service worker to simplify application architecture

### Fixed

- Fixed chart visibility toggle functionality based on user preferences #42

## [1.4.4-alpha] - 2025-05-16

### Changed

- Migrated package management from npm to yarn
- Upgraded electron to version 36.2.1
- Upgraded electron-builder to version 26.0.12
- Improved system tray icon management

### Fixed

- Window display issues on Ubuntu
- Missing app icon on Ubuntu
- Missing system tray icon on MacOS
- Workers not closing properly when force quit the application

## [1.4.3-alpha] - 2025-05-14

### Changed

- Migrated project repository to GitHub platform
- Implemented new CI/CD workflow for application builds

### Fixed

- Setup automated build process for Windows, MacOS and Linux
- Configured GitHub Actions for continuous integration
