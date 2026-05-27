import {writeFileSync} from "node:fs";
import {gemoji} from "gemoji";
import {emojiGroups} from "./emoji-groups.mjs";

const shortcodeMap = {};
const groupMap = {};
const orderMap = {};
const primaryNameGroups = new Map();
const primaryNameOrders = new Map();
let groupOrder = 0;

for (const [group, primaryNames] of Object.entries(emojiGroups)) {
  for (const primaryName of primaryNames) {
    if (primaryNameGroups.has(primaryName)) {
      throw new Error(`Emoji primary name appears in multiple groups: ${primaryName}`);
    }

    primaryNameGroups.set(primaryName, group);
    primaryNameOrders.set(primaryName, groupOrder);
    groupOrder += 1;
  }
}

function getGroup(item) {
  const primaryName = item.names[0];
  const group = primaryNameGroups.get(primaryName);

  if (!group) {
    throw new Error(`Missing emoji group for ${primaryName} (${item.emoji})`);
  }

  return group;
}

function addShortcode(name, emoji, group, order) {
  if (!shortcodeMap[name]) {
    shortcodeMap[name] = emoji;
    groupMap[name] = group;
    orderMap[name] = order;
  }
}

for (const item of gemoji) {
  const group = getGroup(item);
  const names = [...item.names, ...item.tags];
  const itemOrder = primaryNameOrders.get(item.names[0]);

  names.forEach((name, aliasIndex) => {
    addShortcode(name, item.emoji, group, itemOrder * 100 + aliasIndex);

    if (/^[a-z]{2}$/.test(name) && group === "Flags") {
      addShortcode(`flag_${name}`, item.emoji, "Flags", itemOrder * 100 + names.length + aliasIndex);
    }
  });
}

const overrides = {
  party: {
    emoji: "🥳",
    group: "Smileys"
  }
};

for (const [name, item] of Object.entries(overrides)) {
  shortcodeMap[name] = item.emoji;
  groupMap[name] = item.group;
  orderMap[name] = -1;
}

const sortedMap = Object.fromEntries(
  Object.entries(shortcodeMap).sort(([left], [right]) => left.localeCompare(right))
);
const sortedGroupMap = Object.fromEntries(
  Object.entries(groupMap).sort(([left], [right]) => left.localeCompare(right))
);
const sortedOrderMap = Object.fromEntries(
  Object.entries(orderMap).sort(([left], [right]) => left.localeCompare(right))
);

writeFileSync(
  new URL("../src/emoji-map.js", import.meta.url),
  [
    "globalThis.X_EMOJIES_SHORTCODES = Object.freeze(",
    JSON.stringify(sortedMap, null, 2),
    ");",
    "globalThis.X_EMOJIES_GROUPS = Object.freeze(",
    JSON.stringify(sortedGroupMap, null, 2),
    ");",
    "globalThis.X_EMOJIES_ORDER = Object.freeze(",
    JSON.stringify(sortedOrderMap, null, 2),
    ");",
    ""
  ].join("\n")
);

console.log(`Generated ${Object.keys(sortedMap).length} emoji shortcodes.`);
