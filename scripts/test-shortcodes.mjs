import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const context = {globalThis: {}};
vm.createContext(context);
vm.runInContext(readFileSync(new URL("../src/emoji-map.js", import.meta.url), "utf8"), context);

const shortcodes = context.globalThis.X_EMOJIES_SHORTCODES;

assert.equal(shortcodes.party, "🥳");
assert.equal(shortcodes.partying_face, "🥳");
assert.equal(shortcodes.rocket, "🚀");
assert.equal(shortcodes.fire, "🔥");
assert.equal(shortcodes.de, "🇩🇪");
assert.equal(shortcodes.flag_de, "🇩🇪");
assert.equal(shortcodes.this_shortcode_should_not_exist, undefined);

assert.ok(Object.keys(shortcodes).length > 2000, "expected broad gemoji shortcode coverage");

console.log(`Validated ${Object.keys(shortcodes).length} emoji shortcodes.`);
