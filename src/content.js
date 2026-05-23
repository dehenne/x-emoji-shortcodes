(function () {
  "use strict";

  const SHORTCODES = globalThis.X_EMOJIES_SHORTCODES || {};

  const SHORTCODE_PATTERN = /:([a-z0-9_+\-]+):$/i;
  const EDITOR_SELECTOR = [
    "[contenteditable='true']",
    "textarea",
    "input[type='text']",
    "input:not([type])"
  ].join(",");

  function getReplacement(textBeforeCaret) {
    const match = textBeforeCaret.match(SHORTCODE_PATTERN);

    if (!match) {
      return null;
    }

    const shortcode = match[1].toLowerCase();
    const emoji = SHORTCODES[shortcode];

    if (!emoji) {
      return null;
    }

    return {
      emoji,
      length: match[0].length
    };
  }

  function replaceInTextInput(element) {
    const start = element.selectionStart;
    const end = element.selectionEnd;

    if (typeof start !== "number" || start !== end) {
      return;
    }

    const beforeCaret = element.value.slice(0, start);
    const replacement = getReplacement(beforeCaret);

    if (!replacement) {
      return;
    }

    const replaceFrom = start - replacement.length;
    element.setRangeText(replacement.emoji, replaceFrom, start, "end");
    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertReplacementText",
      data: replacement.emoji
    }));
  }

  function replaceInContentEditable(element) {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (!element.contains(range.startContainer)) {
      return;
    }

    const textNode = range.startContainer;

    if (textNode.nodeType !== Node.TEXT_NODE) {
      return;
    }

    const beforeCaret = textNode.textContent.slice(0, range.startOffset);
    const replacement = getReplacement(beforeCaret);

    if (!replacement) {
      return;
    }

    const replaceFrom = range.startOffset - replacement.length;
    textNode.textContent =
      textNode.textContent.slice(0, replaceFrom) +
      replacement.emoji +
      textNode.textContent.slice(range.startOffset);

    const nextOffset = replaceFrom + replacement.emoji.length;
    const nextRange = document.createRange();
    nextRange.setStart(textNode, nextOffset);
    nextRange.collapse(true);

    selection.removeAllRanges();
    selection.addRange(nextRange);

    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertReplacementText",
      data: replacement.emoji
    }));
  }

  function handleInput(event) {
    const target = event.target;

    if (!(target instanceof HTMLElement) || !target.matches(EDITOR_SELECTOR)) {
      return;
    }

    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      replaceInTextInput(target);
      return;
    }

    if (target.isContentEditable) {
      replaceInContentEditable(target);
    }
  }

  document.addEventListener("input", handleInput, true);
})();
