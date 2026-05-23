import {writeFileSync} from "node:fs";
import {gemoji} from "gemoji";

const shortcodeMap = {};

for (const item of gemoji) {
  for (const name of [...item.names, ...item.tags]) {
    if (!shortcodeMap[name]) {
      shortcodeMap[name] = item.emoji;
    }

    if (/^[a-z]{2}$/.test(name) && item.category === "Flags") {
      shortcodeMap[`flag_${name}`] = item.emoji;
    }
  }
}

const overrides = {
  party: "🥳"
};

Object.assign(shortcodeMap, overrides);

const sortedMap = Object.fromEntries(
  Object.entries(shortcodeMap).sort(([left], [right]) => left.localeCompare(right))
);

writeFileSync(
  new URL("../src/emoji-map.js", import.meta.url),
  [
    "globalThis.X_EMOJIES_SHORTCODES = Object.freeze(",
    JSON.stringify(sortedMap, null, 2),
    ");",
    ""
  ].join("\n")
);

console.log(`Generated ${Object.keys(sortedMap).length} emoji shortcodes.`);
