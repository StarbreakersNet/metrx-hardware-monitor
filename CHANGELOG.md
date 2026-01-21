# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.7.11-beta] - 2026-01-21

### Removed
- Removed unused `echarts` dependency

### Fixed
- Fixed missing nvidia-smi path correlation and usage in `systemInformation` patch
- Fixed typo in updater notification
- Fixed undefined production name for updater notification
- Fixed duplicate app instance when click on dock on macOS

## [1.7.11-alpha] - 2026-01-21

### Fixed
- Fixed missing nvidia-smi path correlation and usage in `systemInformation` patch

## [1.7.10-alpha] - 2026-01-20

### Changed
- Try removing patch for `systemInformation`

## [1.7.9-alpha] - 2026-01-19

### Changed
- Change patch for `systemInformation` to fix nvidia-smi path dectection with yarn patch

## [1.7.8-alpha] - 2026-01-19

### Fixed
- Fixed nvidia-smi patch for `systemInformation` `5.30.5`
- Fixed typo in updater notification

## [1.7.7-alpha] - 2026-01-19

### Removed
- Removed patch for `systemInformation` `5.27.17` to fix missing nvidia-smi path and usage

## [1.7.6-alpha] - 2026-01-19

### Removed
- Removed unused `echarts` dependency

### Fixed
- Fixed replace app name in updater notification and renderer process

## [1.7.5-alpha] - 2026-01-19

### Fixed
- Fixed undefined production name for updater notification
- Fixed duplicate app instance when click on dock on macOS

## [1.7.4-beta] - 2026-01-19

### Fixed
- Fixed systeminformation patch for missing nvidia-smi path and usage
- Fixed unhandled nullish in chart crosshair overall listeners #77
- Fixed another unhandled error in chart crosshair #77
- Fixed chart not appearing in certain cases #77
- Fixed tooltip not deseappearing when mouse leaves the chart #75
- Fixed automatic application closing on macOS during updates

### Changed

- Minor update SystemInformation to 5.27.11
- Minor update Vue to 3.5.22
- Minor update Vue Router to 4.6.3
- Upgraded Electron to version 38.2.1 #76
- Upgraded NaiveUI to 2.43.1 #76
- Improved dock behavior on macOS #66

## [1.7.4-alpha] - 2025-10-22

### Fixed

- Fixed systeminformation patch for missing nvidia-smi path and usage

## [1.7.3-alpha] - 2025-10-22

### Fixed

- Fixed unhandled nullish in chart crosshair overall listeners #77

## [1.7.2-alpha] - 2025-10-22

### Fixed

- Fixed another unhandled error in chart crosshair #77

### Changed

- Minor update SystemInformation to 5.27.11
- Minor update Vue to 3.5.22
- Minor update Vue Router to 4.6.3

## [1.7.1-alpha] - 2025-10-22

### Fixed

- Fixed chart not appearing in certain cases #77
- Fixed tooltip not deseappearing when mouse leaves the chart #75

## [1.7.0-alpha] - 2025-10-20

### Changed

- Upgraded Electron to version 38.2.1 #76
- Upgraded NaiveUI to 2.43.1 #76
- Improved dock behavior on macOS #66

### Fixed

- Fixed automatic application closing on macOS during updates

## [1.6.2-beta] - 2025-07-27

### Added

- Added configurable chart height setting #43
- Added automatic cleanup of obsolete settings during local storage restoration
  when settings change
- Added optional dependency `osx-temperature-sensor` to fix missing temperature metrics on macOS systems #63
- Added crosshair hover effect on graphs
- Added synchronization between graph crosshairs

### Removed

- Removed service worker to simplify application architecture

### Changed

- Migrated project repository to GitHub platform
- Implemented new CI/CD workflow for application builds
- Migrated package management from npm to yarn
- Upgraded electron to version 36.2.1
- Upgraded electron-builder to version 26.0.12
- Improved system tray icon management
- Renamed `graphSettings` key to `chartSettings`
- Updated dependencies (`sass` and `vite`) to latest versions
- Modernized imports in using `@use` syntax
- Introduced metrics collection module to streamline system metrics in renderer process
- Improved updater error message display by truncating long messages
- Changed border radius to better match Apple Design System
- Complete migration to yarn in build workflow
- Added workflow exception to prevent release generation when version tag doesn't match `*-beta` or `*-alpha`
- Improved chart line skeleton theme color matching
- Unify scroll content gradient layout behavior
- Improve update download progress information

### Fixed

- Setup automated build process for Windows, MacOS and Linux
- Configured GitHub Actions for continuous integration
- Window display issues on Ubuntu
- Missing app icon on Ubuntu
- Missing system tray icon on MacOS
- Workers not closing properly when force quit the application
- Fixed chart visibility toggle functionality based on user preferences #42
- Fixed scrollbar visibility issue during main app loading #65
- Fixed proper cleanup of system metrics collection when closing application #64
- Fixed metrics cleanup when application quits
- Fixed macOS updates by adding zip format support for macOS builds
- Fixed transparent system tray icon issue
- Fixed graph buffer size calculation to account for metrics refresh rate
- Fixed GPU metrics reporting as 0 (caused by build configuration issue)
- Fixed automatic restart issue during update on macOS

## [1.6.2-alpha] - 2025-06-01

### Changed

- Improved chart line skeleton theme color matching
- Unify scroll content gradient layout behavior
- Improve update download progress information

### Fixed

- Fixed automatic restart issue during update on macOS

## [1.6.1-alpha] - 2025-05-31

### Fixed

- Fixed GPU metrics reporting as 0 (caused by build configuration issue)

### Changed

- Complete migration to yarn in build workflow
- Added workflow exception to prevent release generation when version tag doesn't match `*-beta` or `*-alpha`

## [1.6.0-alpha] - 2025-05-25

### Added

- Added crosshair hover effect on graphs
- Added synchronization between graph crosshairs

### Changed

- Changed border radius to better match Apple Design System

### Fixed

- Fixed transparent system tray icon issue
- Fixed graph buffer size calculation to account for metrics refresh rate

## [1.5.1-alpha] - 2025-05-19

### Fixed

- Fixed scrollbar visibility issue during main app loading #65
- Fixed proper cleanup of system metrics collection when closing application #64
- Fixed metrics cleanup when application quits
- Fixed macOS updates by adding zip format support for macOS builds

### Changed

- Improved updater error message display by truncating long messages

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
