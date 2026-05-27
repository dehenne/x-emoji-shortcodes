(function () {
  "use strict";

  const SHORTCODES = globalThis.X_EMOJIES_SHORTCODES || {};
  const GROUPS = globalThis.X_EMOJIES_GROUPS || {};
  const ORDERS = globalThis.X_EMOJIES_ORDER || {};
  const SHORTCODE_PATTERN = /:([a-z0-9_+\-]+):$/i;
  const PARTIAL_SHORTCODE_PATTERN = /:([a-z0-9_+\-]{2,})$/i;
  const MAX_SUGGESTIONS = 8;
  const EMOJI_SEARCH_SHORTCUTS = new Set(["."]);
  const OPEN_EMOJI_SEARCH_MESSAGE = "x-emojies-open-search";
  const EMOJI_SEARCH_COLUMNS = "repeat(auto-fill,minmax(58px,1fr))";
  const EMOJI_SEARCH_GROUP_ORDER = [
    "Smileys",
    "Cats & Fantasy",
    "Hearts",
    "Reactions",
    "Hands",
    "Body",
    "People",
    "Animals",
    "Nature",
    "Food",
    "Drinks",
    "Travel",
    "Weather",
    "Events",
    "Sports",
    "Games & Arts",
    "Money",
    "Office",
    "Health",
    "Clothing",
    "Music",
    "Tech",
    "Tools",
    "Home",
    "Symbols",
    "Flags"
  ];
  const EDITOR_SELECTOR = [
    "[contenteditable='true']",
    "textarea",
    "input[type='text']",
    "input:not([type])"
  ].join(",");

  let autocomplete = null;
  let emojiSearch = null;
  let lastEditor = null;
  let lastEditorSelection = null;

  function getEditor(target) {
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    return target.matches(EDITOR_SELECTOR) ? target : target.closest(EDITOR_SELECTOR);
  }

  function getActiveEditor(target) {
    const targetEditor = getEditor(target);

    if (targetEditor) {
      return targetEditor;
    }

    const activeEditor = getEditor(document.activeElement);

    if (activeEditor) {
      return activeEditor;
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const container = selection.getRangeAt(0).commonAncestorContainer;
    const element = container instanceof HTMLElement ? container : container.parentElement;

    return getEditor(element);
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

  function compareEmojiSearchNames(left, right) {
    return (ORDERS[left] ?? Number.MAX_SAFE_INTEGER) - (ORDERS[right] ?? Number.MAX_SAFE_INTEGER) ||
      left.localeCompare(right);
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

  function getEmojiSearchResults(query) {
    const normalizedQuery = query.trim().toLowerCase();
    const names = Object.keys(SHORTCODES);

    if (!normalizedQuery) {
      return names.sort(compareEmojiSearchNames);
    }

    return names
      .filter((name) => name.includes(normalizedQuery))
      .sort((left, right) => {
        const leftStarts = left.startsWith(normalizedQuery);
        const rightStarts = right.startsWith(normalizedQuery);

        if (leftStarts !== rightStarts) {
          return leftStarts ? -1 : 1;
        }

        return compareEmojiSearchNames(left, right);
      });
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

  function captureEditorSelection(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return {
        end: element.selectionEnd,
        start: element.selectionStart
      };
    }

    if (!element.isContentEditable) {
      return null;
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);

    if (!element.contains(range.commonAncestorContainer)) {
      return null;
    }

    return range.cloneRange();
  }

  function rememberEditor(element) {
    if (!element) {
      return;
    }

    lastEditor = element;
    lastEditorSelection = captureEditorSelection(element);
  }

  function restoreEditorSelection(element, savedSelection) {
    if (!savedSelection) {
      element.focus();
      return;
    }

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (typeof savedSelection.start === "number" && typeof savedSelection.end === "number") {
        element.focus();
        element.setSelectionRange(savedSelection.start, savedSelection.end);
      }

      return;
    }

    if (savedSelection instanceof Range) {
      const selection = window.getSelection();

      if (!selection) {
        return;
      }

      element.focus();
      selection.removeAllRanges();
      selection.addRange(savedSelection);
    }
  }

  function insertInTextInput(element, emoji) {
    const start = element.selectionStart;
    const end = element.selectionEnd;

    if (typeof start !== "number" || typeof end !== "number") {
      return false;
    }

    element.setRangeText(emoji, start, end, "end");
    dispatchReplacementInput(element, emoji);
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

  function insertInContentEditable(element, emoji) {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return false;
    }

    const range = selection.getRangeAt(0);

    if (!element.contains(range.commonAncestorContainer)) {
      return false;
    }

    range.deleteContents();

    const textNode = document.createTextNode(emoji);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    dispatchReplacementInput(element, emoji);
    return true;
  }

  function copyEmojiToClipboard(emoji) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(emoji).catch(() => {
        copyEmojiWithFallback(emoji);
      });
      return;
    }

    copyEmojiWithFallback(emoji);
  }

  function copyEmojiWithFallback(emoji) {
    const textarea = document.createElement("textarea");
    textarea.value = emoji;
    textarea.style.cssText = [
      "position:fixed",
      "left:-9999px",
      "top:0"
    ].join(";");
    document.documentElement.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function insertEmojiAtSavedPosition(suggestion) {
    if (!emojiSearch || !emojiSearch.editor) {
      copyEmojiToClipboard(suggestion.emoji);
      hideEmojiSearch();
      return;
    }

    const editor = emojiSearch.editor;
    restoreEditorSelection(editor, emojiSearch.savedSelection);

    const inserted = editor instanceof HTMLInputElement || editor instanceof HTMLTextAreaElement
      ? insertInTextInput(editor, suggestion.emoji)
      : insertInContentEditable(editor, suggestion.emoji);

    if (inserted) {
      rememberEditor(editor);
      hideEmojiSearch();
      return;
    }

    copyEmojiToClipboard(suggestion.emoji);
    hideEmojiSearch();
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

  function ensureEmojiSearch() {
    if (emojiSearch) {
      return emojiSearch;
    }

    const overlay = document.createElement("div");
    const panel = document.createElement("div");
    const search = document.createElement("input");
    const grid = document.createElement("div");
    const empty = document.createElement("div");

    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "display:none",
      "align-items:center",
      "justify-content:center",
      "padding:24px",
      "background:rgba(2,6,23,0.58)",
      "box-sizing:border-box",
      "font:14px/1.35 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"
    ].join(";");
    panel.style.cssText = [
      "box-sizing:border-box",
      "display:flex",
      "flex-direction:column",
      "width:min(760px,100%)",
      "max-height:min(720px,88vh)",
      "padding:14px",
      "border:1px solid rgba(148,163,184,0.35)",
      "border-radius:12px",
      "background:#111827",
      "box-shadow:0 24px 80px rgba(0,0,0,0.46)",
      "color:#f8fafc"
    ].join(";");
    search.type = "search";
    search.placeholder = "Search emoji";
    search.autocomplete = "off";
    search.spellcheck = false;
    search.style.cssText = [
      "box-sizing:border-box",
      "width:100%",
      "margin:0 0 12px",
      "padding:11px 12px",
      "border:1px solid rgba(148,163,184,0.35)",
      "border-radius:8px",
      "outline:none",
      "background:#020617",
      "color:#f8fafc",
      "font:inherit"
    ].join(";");
    grid.style.cssText = [
      "overflow:auto",
      "padding:2px 2px 4px"
    ].join(";");
    empty.textContent = "No emoji found";
    empty.style.cssText = [
      "display:none",
      "padding:24px",
      "color:#94a3b8",
      "text-align:center"
    ].join(";");

    panel.append(search, grid, empty);
    overlay.appendChild(panel);
    document.documentElement.appendChild(overlay);

    emojiSearch = {
      editor: null,
      empty,
      grid,
      overlay,
      panel,
      savedSelection: null,
      search
    };

    search.addEventListener("input", renderEmojiSearch);
    overlay.addEventListener("mousedown", (event) => {
      if (event.target === overlay) {
        event.preventDefault();
        hideEmojiSearch();
      }
    });

    return emojiSearch;
  }

  function getEmojiSearchGroup(name) {
    return GROUPS[name] || "Other";
  }

  function getOrderedEmojiSearchGroups(results) {
    const groups = new Map();

    for (const name of results) {
      const group = getEmojiSearchGroup(name);

      if (!groups.has(group)) {
        groups.set(group, []);
      }

      groups.get(group).push(name);
    }

    return [...groups.entries()].sort(([left], [right]) => {
      const leftIndex = EMOJI_SEARCH_GROUP_ORDER.indexOf(left);
      const rightIndex = EMOJI_SEARCH_GROUP_ORDER.indexOf(right);

      if (leftIndex !== rightIndex) {
        return (leftIndex === -1 ? EMOJI_SEARCH_GROUP_ORDER.length : leftIndex) -
          (rightIndex === -1 ? EMOJI_SEARCH_GROUP_ORDER.length : rightIndex);
      }

      return left.localeCompare(right);
    });
  }

  function renderEmojiButton(name) {
    const button = document.createElement("button");
    const emoji = document.createElement("span");
    const label = document.createElement("span");

    button.type = "button";
    button.title = ":" + name + ":";
    button.style.cssText = [
      "box-sizing:border-box",
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "justify-content:center",
      "gap:5px",
      "height:62px",
      "padding:6px",
      "border:1px solid rgba(148,163,184,0.18)",
      "border-radius:8px",
      "background:#1f2937",
      "color:#e5e7eb",
      "font:12px/1.15 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
      "cursor:pointer",
      "overflow:hidden"
    ].join(";");

    emoji.textContent = SHORTCODES[name];
    emoji.style.cssText = "font-size:24px;line-height:1";
    label.textContent = name;
    label.style.cssText = [
      "display:block",
      "max-width:100%",
      "overflow:hidden",
      "text-overflow:ellipsis",
      "white-space:nowrap"
    ].join(";");

    button.append(emoji, label);
    button.addEventListener("click", () => {
      insertEmojiAtSavedPosition({
        emoji: SHORTCODES[name],
        name
      });
    });

    return button;
  }

  function renderEmojiSearch() {
    const state = ensureEmojiSearch();
    const results = getEmojiSearchResults(state.search.value);
    const groupedResults = getOrderedEmojiSearchGroups(results);

    state.grid.textContent = "";
    state.empty.style.display = results.length ? "none" : "block";

    const fragment = document.createDocumentFragment();

    groupedResults.forEach(([group, names]) => {
      const section = document.createElement("section");
      const heading = document.createElement("div");
      const groupGrid = document.createElement("div");

      section.style.cssText = "margin:0 0 18px";
      heading.textContent = group;
      heading.style.cssText = [
        "position:sticky",
        "top:0",
        "z-index:1",
        "padding:7px 2px 8px",
        "background:#111827",
        "color:#cbd5e1",
        "font:700 12px/1.2 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
        "text-transform:uppercase"
      ].join(";");
      groupGrid.style.cssText = [
        "display:grid",
        "grid-template-columns:" + EMOJI_SEARCH_COLUMNS,
        "gap:8px"
      ].join(";");

      names.forEach((name) => {
        groupGrid.appendChild(renderEmojiButton(name));
      });

      section.append(heading, groupGrid);
      fragment.appendChild(section);
    });

    state.grid.appendChild(fragment);
  }

  function showEmojiSearch(editor) {
    const state = ensureEmojiSearch();

    state.editor = editor;
    state.savedSelection = editor ? captureEditorSelection(editor) || lastEditorSelection : null;
    state.search.value = "";
    state.overlay.style.display = "flex";
    renderEmojiSearch();
    hideAutocomplete();
    state.search.focus();
  }

  function openEmojiSearchFromCurrentContext(target) {
    const editor = getActiveEditor(target) || (lastEditor && lastEditor.isConnected ? lastEditor : null);

    if (editor) {
      rememberEditor(editor);
    }

    showEmojiSearch(editor);
    return true;
  }

  function hideEmojiSearch() {
    if (!emojiSearch) {
      return;
    }

    emojiSearch.overlay.style.display = "none";
    emojiSearch.editor = null;
    emojiSearch.savedSelection = null;
    emojiSearch.search.value = "";
  }

  function handleInput(event) {
    const editor = getEditor(event.target);

    if (!editor) {
      return;
    }

    rememberEditor(editor);

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

  function consumeAutocompleteKey(event) {
    event.preventDefault();
    event.stopPropagation();

    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
  }

  function handleKeyDown(event) {
    if (event.ctrlKey && event.altKey && !event.shiftKey && !event.metaKey && (EMOJI_SEARCH_SHORTCUTS.has(event.key) || event.code === "Period")) {
      if (openEmojiSearchFromCurrentContext(event.target)) {
        consumeAutocompleteKey(event);
      }

      return;
    }

    if (emojiSearch && emojiSearch.overlay.style.display !== "none" && event.key === "Escape") {
      consumeAutocompleteKey(event);
      hideEmojiSearch();
      return;
    }

    if (!autocomplete || autocomplete.popup.style.display === "none") {
      return;
    }

    if (!autocomplete.suggestions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      consumeAutocompleteKey(event);
      autocomplete.activeIndex = (autocomplete.activeIndex + 1) % autocomplete.suggestions.length;
      renderAutocomplete();
      return;
    }

    if (event.key === "ArrowUp") {
      consumeAutocompleteKey(event);
      autocomplete.activeIndex = (autocomplete.activeIndex - 1 + autocomplete.suggestions.length) % autocomplete.suggestions.length;
      renderAutocomplete();
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      consumeAutocompleteKey(event);
      applyAutocomplete(autocomplete.suggestions[autocomplete.activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      consumeAutocompleteKey(event);
      hideAutocomplete();
    }
  }

  function handleKeyUp(event) {
    if (event.key !== "Backspace" && event.key !== "Delete") {
      return;
    }

    const editor = getEditor(event.target);

    if (editor) {
      rememberEditor(editor);
      updateAutocomplete(editor);
    }
  }

  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (!message || message.type !== OPEN_EMOJI_SEARCH_MESSAGE) {
        return;
      }

      openEmojiSearchFromCurrentContext(document.activeElement);
    });
  }

  document.addEventListener("focusin", (event) => {
    const editor = getEditor(event.target);

    if (editor) {
      rememberEditor(editor);
    }
  }, true);
  document.addEventListener("selectionchange", () => {
    const editor = getActiveEditor(document.activeElement);

    if (editor) {
      rememberEditor(editor);
    }
  }, true);
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
