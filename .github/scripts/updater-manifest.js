/**
 * Génère le `latest.json` lu par l'updater de Tauri à partir des artefacts de la CI.
 *
 * Format : https://v2.tauri.app/plugin/updater/#static-json-file
 * L'updater cherche d'abord la clé `{os}-{arch}-{installeur}` puis `{os}-{arch}` : un .deb ne
 * doit donc jamais recevoir l'AppImage, d'où la clé dédiée `linux-x86_64-deb`.
 *
 * Usage :
 *   node .github/scripts/updater-manifest.js --dir dist --version 2.0.0 --tag 2.0.0 \
 *     --repository owner/repo --notes release-notes.md --output dist/latest.json
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    dir: { type: "string" },
    version: { type: "string" },
    tag: { type: "string" },
    repository: { type: "string" },
    notes: { type: "string" },
    output: { type: "string" },
  },
});

for (const name of ["dir", "version", "tag", "repository", "output"]) {
  if (!args[name]) {
    console.error(`Argument manquant : --${name}`);
    process.exit(1);
  }
}

// Artefact de mise à jour → plateformes de l'updater qui l'utilisent
const TARGETS = [
  { suffix: "-setup.exe", platforms: ["windows-x86_64", "windows-x86_64-nsis"] },
  { suffix: ".app.tar.gz", platforms: ["darwin-aarch64", "darwin-aarch64-app"] },
  { suffix: ".AppImage", platforms: ["linux-x86_64", "linux-x86_64-appimage"] },
  { suffix: ".deb", platforms: ["linux-x86_64-deb"] },
];

const files = readdirSync(args.dir);
const platforms = {};

for (const { suffix, platforms: keys } of TARGETS) {
  const file = files.find(name => name.endsWith(suffix));

  if (!file) {
    console.warn(`⚠️  Aucun artefact *${suffix} : plateformes ignorées (${keys.join(", ")})`);
    continue;
  }

  const signaturePath = join(args.dir, file + ".sig");

  if (!existsSync(signaturePath)) {
    console.error(`Signature manquante pour ${file}`);
    process.exit(1);
  }

  const entry = {
    signature: readFileSync(signaturePath, "utf8").trim(),
    url: `https://github.com/${args.repository}/releases/download/${encodeURIComponent(args.tag)}/${encodeURIComponent(file)}`,
  };

  for (const key of keys) {
    platforms[key] = entry;
  }
}

if (Object.keys(platforms).length === 0) {
  console.error("Aucun artefact de mise à jour trouvé");
  process.exit(1);
}

const manifest = {
  version: args.version,
  notes: args.notes && existsSync(args.notes) ? readFileSync(args.notes, "utf8").trim() : "",
  pub_date: new Date().toISOString(),
  platforms,
};

writeFileSync(args.output, JSON.stringify(manifest, null, 2) + "\n");
console.log(`✅ ${args.output} généré pour : ${Object.keys(platforms).join(", ")}`);
