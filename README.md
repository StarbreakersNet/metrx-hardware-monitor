# sb-hardware-monitor

An Electron application with Vue that allows users to monitor their hardware status in real-time. This application provides a user-friendly interface to display various hardware metrics, making it easier for users to keep an eye on their system's health and performance.

## Features

- Real-time hardware monitoring
- Customizable dashboard with various metrics
- Fully responsive design
- Start on login option and system tray support
- User settings persistence through `electron-store` amd `pinia-plugin-persistedstate`
- Cross-platform support (Windows, macOS, Linux)

## Recommended IDE Setup

For the best development experience, we recommend the following IDE setup:

- [IntelliJ IDEA Ultimate](https://www.jetbrains.com/idea/) with [Vue.js](https://www.jetbrains.com/help/idea/vue-js.html), [ESLint](https://www.jetbrains.com/help/idea/eslint.html) and [Prettier](https://www.jetbrains.com/help/idea/prettier.html)

## Project Setup

### Install

To get started with development, first clone the repository and then run the following command to install dependencies:

```bash
npm install
```

### Development

To start the application in development mode with hot-reload, run:

```bash
$ npm run dev
```

### Build

To build the application for production, use one of the following commands based on your target platform:

```bash
# For windows
$ npm run build:win
```
```bash
# For macOS
$ npm run build:mac
```
```bash
# For Linux
$ npm run build:linux
```

### Configuration

User settings can be adjusted in the application's settings menu. These settings are persisted across sessions using `electron-store` and `pinia-plugin-persistedstate` for **Vue 3**.

### Contributing

Contributions are welcome! Please read our contributing guidelines before submitting merge requests.

### License

This project is licensed under the MIT License - see the LICENSE file for details.
