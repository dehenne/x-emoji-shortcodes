import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const context = {globalThis: {}};
vm.createContext(context);
vm.runInContext(readFileSync(new URL("../src/emoji-map.js", import.meta.url), "utf8"), context);

const shortcodes = context.globalThis.X_EMOJIES_SHORTCODES;
const groups = context.globalThis.X_EMOJIES_GROUPS;
const orders = context.globalThis.X_EMOJIES_ORDER;

assert.equal(shortcodes.party, "🥳");
assert.equal(shortcodes.partying_face, "🥳");
assert.equal(shortcodes.rocket, "🚀");
assert.equal(shortcodes.fire, "🔥");
assert.equal(shortcodes.de, "🇩🇪");
assert.equal(shortcodes.flag_de, "🇩🇪");
assert.equal(shortcodes.this_shortcode_should_not_exist, undefined);
assert.equal(groups.party, "Smileys");
assert.equal(groups.slightly_frowning_face, "Smileys");
assert.equal(groups.frowning_face, "Smileys");
assert.equal(groups.wave, "Hands");
assert.equal(groups["+1"], "Hands");
assert.equal(groups["-1"], "Hands");
assert.equal(groups.approve, "Hands");
assert.equal(groups.attack, "Hands");
assert.equal(groups.point_left, "Hands");
assert.equal(groups.point_right, "Hands");
assert.equal(groups.point_up_2, "Hands");
assert.equal(groups.point_down, "Hands");
assert.equal(groups.point_up, "Hands");
assert.equal(groups.index_pointing_at_the_viewer, "Hands");
assert.equal(groups.fist_left, "Hands");
assert.equal(groups.fist_right, "Hands");
assert.equal(groups.facepalm, "People");
assert.equal(groups.tipping_hand_person, "People");
assert.equal(groups.raising_hand, "People");
assert.equal(groups.muscle, "Hands");
assert.equal(groups.bicep, "Hands");
assert.equal(groups.flex, "Hands");
assert.equal(groups.strong, "Hands");
assert.equal(groups.mechanical_arm, "Body");
assert.ok(orders.smiley_cat < orders.black_cat, "expected black cat to follow cat emojis");
assert.ok(orders.black_cat < orders.see_no_evil, "expected cat emojis before monkey emojis");
assert.ok(orders.see_no_evil < orders.hear_no_evil, "expected monkey aliases to stay grouped in order");
assert.equal(groups.rocket, "Travel");
assert.equal(groups.flag_de, "Flags");

assert.ok(Object.keys(shortcodes).length > 2000, "expected broad gemoji shortcode coverage");

console.log(`Validated ${Object.keys(shortcodes).length} emoji shortcodes.`);
