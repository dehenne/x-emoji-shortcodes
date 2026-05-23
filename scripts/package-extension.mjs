import {execFileSync} from "node:child_process";
import {existsSync, mkdirSync, readFileSync, rmSync} from "node:fs";
import {join} from "node:path";

const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const outDir = new URL("../dist/", import.meta.url);
const zipName = `x-emoji-shortcodes-v${manifest.version}.zip`;
const zipPath = join(outDir.pathname, zipName);

mkdirSync(outDir, {recursive: true});

if (existsSync(zipPath)) {
  rmSync(zipPath);
}

const files = [
  "manifest.json",
  "src/content.js",
  "src/emoji-map.js",
  "assets/icons/icon-16.png",
  "assets/icons/icon-32.png",
  "assets/icons/icon-48.png",
  "assets/icons/icon-128.png",
  "LICENSE",
  "PRIVACY.md"
];

execFileSync("zip", ["-q", "-r", zipPath, ...files], {stdio: "inherit"});

console.log(`Created ${zipPath}`);
