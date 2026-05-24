import {readFileSync, writeFileSync} from "node:fs";

const nextVersion = process.argv[2];

if (!nextVersion) {
  console.error("Usage: npm run version:bump -- <version>");
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(nextVersion)) {
  console.error("Version must use SemVer format, for example 0.2.0.");
  process.exit(1);
}

const jsonFiles = [
  "package.json",
  "manifest.json",
  "package-lock.json"
];

for (const file of jsonFiles) {
  const data = JSON.parse(readFileSync(file, "utf8"));

  if (file === "package-lock.json") {
    if (data.packages?.[""]) {
      data.packages[""].version = nextVersion;
    }
  } else {
    data.version = nextVersion;
  }

  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

console.log(`Bumped version to ${nextVersion}`);
