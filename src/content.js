(function () {
  "use strict";

  const SHORTCODES = globalThis.X_EMOJIES_SHORTCODES || {};
  const SHORTCODE_PATTERN = /:([a-z0-9_+\-]+):$/i;
  const PARTIAL_SHORTCODE_PATTERN = /:([a-z0-9_+\-]{2,})$/i;
  const MAX_SUGGESTIONS = 8;
  const EDITOR_SELECTOR = [
    "[contenteditable='true']",
    "textarea",
    "input[type='text']",
    "input:not([type])"
  ].join(",");

  let autocomplete = null;

  function getEditor(target) {
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    return target.matches(EDITOR_SELECTOR) ? target : target.closest(EDITOR_SELECTOR);
  }

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

  function getPartial(textBeforeCaret) {
    const match = textBeforeCaret.match(PARTIAL_SHORTCODE_PATTERN);

    if (!match) {
      return null;
    }

    return {
      query: match[1].toLowerCase(),
      length: match[0].length
    };
  }

  function getSuggestions(query) {
    return Object.keys(SHORTCODES)
      .filter((name) => name.startsWith(query))
      .sort((left, right) => left.length - right.length || left.localeCompare(right))
      .slice(0, MAX_SUGGESTIONS)
      .map((name) => ({
        name,
        emoji: SHORTCODES[name]
      }));
  }

  function dispatchReplacementInput(element, emoji) {
    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertReplacementText",
      data: emoji
    }));
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
    dispatchReplacementInput(element, replacement.emoji);
  }

  function replacePartialInTextInput(element, suggestion) {
    const start = element.selectionStart;
    const end = element.selectionEnd;

    if (typeof start !== "number" || start !== end) {
      return false;
    }

    const partial = getPartial(element.value.slice(0, start));

    if (!partial) {
      return false;
    }

    element.setRangeText(suggestion.emoji, start - partial.length, start, "end");
    dispatchReplacementInput(element, suggestion.emoji);
    return true;
  }

  function getContentEditableTextBeforeCaret(element) {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return null;
    }

    const range = selection.getRangeAt(0);

    if (!element.contains(range.startContainer)) {
      return null;
    }

    const beforeCaretRange = range.cloneRange();
    beforeCaretRange.selectNodeContents(element);
    beforeCaretRange.setEnd(range.startContainer, range.startOffset);

    return beforeCaretRange.toString();
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

    replaceTextNodeRange(element, textNode, range.startOffset - replacement.length, range.startOffset, replacement.emoji);
  }

  function replacePartialInContentEditable(element, suggestion) {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return false;
    }

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    if (!element.contains(textNode) || textNode.nodeType !== Node.TEXT_NODE) {
      return false;
    }

    const partial = getPartial(textNode.textContent.slice(0, range.startOffset));

    if (!partial) {
      return false;
    }

    replaceTextNodeRange(element, textNode, range.startOffset - partial.length, range.startOffset, suggestion.emoji);
    return true;
  }

  function replaceTextNodeRange(element, textNode, start, end, value) {
    textNode.textContent =
      textNode.textContent.slice(0, start) +
      value +
      textNode.textContent.slice(end);

    const nextOffset = start + value.length;
    const nextRange = document.createRange();
    const selection = window.getSelection();

    nextRange.setStart(textNode, nextOffset);
    nextRange.collapse(true);

    selection.removeAllRanges();
    selection.addRange(nextRange);
    dispatchReplacementInput(element, value);
  }

  function getCaretRect(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const rect = element.getBoundingClientRect();

      return {
        left: rect.left + 12,
        top: rect.bottom,
        bottom: rect.bottom
      };
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(true);

    let rect = range.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      const marker = document.createElement("span");
      marker.textContent = "\u200b";
      range.insertNode(marker);
      rect = marker.getBoundingClientRect();
      marker.remove();
    }

    return rect;
  }

  function ensureAutocomplete() {
    if (autocomplete) {
      return autocomplete;
    }

    const popup = document.createElement("div");
    popup.style.cssText = [
      "position:fixed",
      "z-index:2147483647",
      "display:none",
      "min-width:220px",
      "max-width:320px",
      "padding:6px",
      "border:1px solid rgba(148,163,184,0.35)",
      "border-radius:10px",
      "background:#111827",
      "box-shadow:0 16px 40px rgba(0,0,0,0.32)",
      "color:#f8fafc",
      "font:14px/1.35 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"
    ].join(";");

    document.documentElement.appendChild(popup);

    autocomplete = {
      activeIndex: 0,
      editor: null,
      popup,
      suggestions: []
    };

    return autocomplete;
  }

  function renderAutocomplete() {
    const state = ensureAutocomplete();
    state.popup.textContent = "";

    state.suggestions.forEach((suggestion, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.style.cssText = [
        "display:flex",
        "align-items:center",
        "gap:10px",
        "width:100%",
        "padding:8px 10px",
        "border:0",
        "border-radius:7px",
        "background:" + (index === state.activeIndex ? "rgba(20,184,166,0.24)" : "transparent"),
        "color:inherit",
        "text-align:left",
        "font:inherit",
        "cursor:pointer"
      ].join(";");
      item.innerHTML = "<span style=\"font-size:18px;width:24px;text-align:center\">" + suggestion.emoji + "</span><span>:" + suggestion.name + ":</span>";
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        applyAutocomplete(suggestion);
      });
      state.popup.appendChild(item);
    });
  }

  function showAutocomplete(editor, suggestions, rect) {
    const state = ensureAutocomplete();

    state.editor = editor;
    state.suggestions = suggestions;
    state.activeIndex = 0;
    state.popup.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 340)) + "px";
    state.popup.style.top = Math.min(rect.bottom + 8, window.innerHeight - 80) + "px";
    state.popup.style.display = "block";

    renderAutocomplete();
  }

  function hideAutocomplete() {
    if (!autocomplete) {
      return;
    }

    autocomplete.popup.style.display = "none";
    autocomplete.editor = null;
    autocomplete.suggestions = [];
    autocomplete.activeIndex = 0;
  }

  function updateAutocomplete(element) {
    let beforeCaret = null;

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const start = element.selectionStart;
      const end = element.selectionEnd;

      if (typeof start === "number" && start === end) {
        beforeCaret = element.value.slice(0, start);
      }
    } else if (element.isContentEditable) {
      beforeCaret = getContentEditableTextBeforeCaret(element);
    }

    if (!beforeCaret) {
      hideAutocomplete();
      return;
    }

    const partial = getPartial(beforeCaret);

    if (!partial) {
      hideAutocomplete();
      return;
    }

    const suggestions = getSuggestions(partial.query);
    const rect = getCaretRect(element);

    if (suggestions.length === 0 || !rect) {
      hideAutocomplete();
      return;
    }

    showAutocomplete(element, suggestions, rect);
  }

  function applyAutocomplete(suggestion) {
    if (!autocomplete || !autocomplete.editor) {
      return;
    }

    const editor = autocomplete.editor;
    const replaced = editor instanceof HTMLInputElement || editor instanceof HTMLTextAreaElement
      ? replacePartialInTextInput(editor, suggestion)
      : replacePartialInContentEditable(editor, suggestion);

    if (replaced) {
      hideAutocomplete();
    }
  }

  function handleInput(event) {
    const editor = getEditor(event.target);

    if (!editor) {
      return;
    }

    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
      replaceInTextInput(editor);
      updateAutocomplete(editor);
      return;
    }

    if (editor.isContentEditable) {
      replaceInContentEditable(editor);
      updateAutocomplete(editor);
    }
  }

  function handleKeyDown(event) {
    if (!autocomplete || autocomplete.popup.style.display === "none") {
      return;
    }

    if (!autocomplete.suggestions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      autocomplete.activeIndex = (autocomplete.activeIndex + 1) % autocomplete.suggestions.length;
      renderAutocomplete();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      autocomplete.activeIndex = (autocomplete.activeIndex - 1 + autocomplete.suggestions.length) % autocomplete.suggestions.length;
      renderAutocomplete();
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      applyAutocomplete(autocomplete.suggestions[autocomplete.activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      hideAutocomplete();
    }
  }

  function handleKeyUp(event) {
    if (event.key !== "Backspace" && event.key !== "Delete") {
      return;
    }

    const editor = getEditor(event.target);

    if (editor) {
      updateAutocomplete(editor);
    }
  }

  document.addEventListener("input", handleInput, true);
  document.addEventListener("keydown", handleKeyDown, true);
  document.addEventListener("keyup", handleKeyUp, true);
  document.addEventListener("scroll", hideAutocomplete, true);
  document.addEventListener("click", (event) => {
    if (!autocomplete || autocomplete.popup.contains(event.target)) {
      return;
    }

    hideAutocomplete();
  }, true);
})();
