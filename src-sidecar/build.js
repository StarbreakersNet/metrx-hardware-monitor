/**
 * Compile le sidecar en un exécutable autonome avec `bun build --compile`.
 *
 * Tauri attend le binaire dans `src-tauri/binaries/` suffixé par le « target triple » Rust
 * (ex : `metrx-metrics-x86_64-pc-windows-msvc.exe`), voir `bundle.externalBin`
 * dans `src-tauri/tauri.conf.json`.
 *
 * Utilisation : `yarn sidecar:build` (lancé automatiquement par `yarn dev` et `yarn build`).
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import packageJson from "../package.json" with { type: "json" };

const SIDECAR_NAME = "metrx-metrics";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Correspondance target triple Rust → cible de compilation Bun
const BUN_TARGETS = {
  "x86_64-pc-windows-msvc": "bun-windows-x64",
  "aarch64-pc-windows-msvc": "bun-windows-arm64",
  "x86_64-apple-darwin": "bun-darwin-x64",
  "aarch64-apple-darwin": "bun-darwin-arm64",
  "x86_64-unknown-linux-gnu": "bun-linux-x64",
  "aarch64-unknown-linux-gnu": "bun-linux-arm64",
};

// Modules natifs optionnels, chargés via `require()` dans un try/catch par systeminformation.
// On ne les embarque que sur macOS, là où ils sont installés.
const OPTIONAL_NATIVE_MODULES = ["osx-temperature-sensor", "macos-temperature-sensor"];

function getTargetTriple() {
  // Défini par la CLI Tauri pour beforeDevCommand / beforeBuildCommand
  if (process.env.TAURI_ENV_TARGET_TRIPLE) {
    return process.env.TAURI_ENV_TARGET_TRIPLE;
  }

  const rustInfo = execSync("rustc -vV").toString();
  const host = /host: (\S+)/.exec(rustInfo)?.[1];

  if (!host) {
    throw new Error("Impossible de déterminer le target triple via `rustc -vV`");
  }

  return host;
}

function isReleaseBuild() {
  // TAURI_ENV_DEBUG vaut "true" pour `tauri dev` et `tauri build --debug`
  return process.env.TAURI_ENV_DEBUG === "false";
}

function getBunTarget(triple) {
  const target = BUN_TARGETS[triple];

  if (!target) {
    throw new Error(`Target triple non supporté par le sidecar : ${triple}`);
  }

  // En release, la variante « baseline » ne nécessite pas AVX2 : elle tourne aussi
  // sur les processeurs plus anciens ou d'entrée de gamme (Celeron, Pentium…).
  if (isReleaseBuild() && target.endsWith("-x64")) {
    return target + "-baseline";
  }

  return target;
}

/** Le module est installé et son binaire natif (.node) a bien été compilé par node-gyp */
function isNativeModuleBuilt(name) {
  try {
    const packageDir = dirname(fileURLToPath(import.meta.resolve(`${name}/package.json`)));
    const releaseDir = join(packageDir, "build", "Release");

    return existsSync(releaseDir) && readdirSync(releaseDir).some(file => file.endsWith(".node"));
  } catch {
    return false;
  }
}

/** Modules laissés hors du bundle : systeminformation les ignore s'ils sont absents */
function getExternalModules(triple) {
  if (!triple.includes("apple-darwin") || process.platform !== "darwin") {
    return OPTIONAL_NATIVE_MODULES;
  }

  return OPTIONAL_NATIVE_MODULES.filter(name => {
    const built = isNativeModuleBuilt(name);

    if (name === "macos-temperature-sensor" && !built) {
      console.warn(`[sidecar] ⚠️ ${name} n'est pas compilé : pas de température CPU sur macOS`);
    }

    return !built;
  });
}

async function build() {
  const triple = getTargetTriple();
  const target = getBunTarget(triple);
  const extension = triple.includes("windows") ? ".exe" : "";
  const outfile = join(root, "src-tauri", "binaries", `${SIDECAR_NAME}-${triple}${extension}`);

  mkdirSync(dirname(outfile), { recursive: true });
  console.log(`[sidecar] Compilation ${target} → ${outfile}`);

  const result = await Bun.build({
    entrypoints: [join(root, "src-sidecar", "index.js")],
    target: "bun",
    format: "esm",
    minify: true,
    bytecode: true,
    external: getExternalModules(triple),
    compile: {
      target,
      outfile,
      autoloadDotenv: false,
      autoloadBunfig: false,
      // Pas de `hideConsole` : Tauri lance déjà le sidecar sans fenêtre (CREATE_NO_WINDOW), et les
      // commandes lancées par systeminformation (PowerShell…) héritent de cette console cachée.
      windows: {
        icon: join(root, "src-tauri", "icons", "icon.ico"),
        title: `${packageJson.displayName} metrics`,
        publisher: packageJson.author,
        version: packageJson.version.split("-")[0],
        description: `${packageJson.displayName} hardware metrics collector`,
      },
    },
  });

  for (const message of result.logs) {
    console.warn(message);
  }

  if (!result.success) {
    process.exit(1);
  }

  console.log("[sidecar] ✅ Compilation terminée");
}

await build();
