(function () {
  "use strict";

  const OPEN_EMOJI_SEARCH_MESSAGE = "x-emojies-open-search";

  function openEmojiSearch(tab) {
    if (!tab || typeof tab.id !== "number") {
      return;
    }

    chrome.tabs.sendMessage(tab.id, {
      type: OPEN_EMOJI_SEARCH_MESSAGE
    }, () => {
      // The active tab may not be an X/Twitter page with this content script.
      chrome.runtime.lastError;
    });
  }

  chrome.action.onClicked.addListener(openEmojiSearch);
})();
