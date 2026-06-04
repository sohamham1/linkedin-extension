(function () {
  const OPEN_SAVED_POSTS_MESSAGE = "LIHPD_OPEN_SAVED_POSTS";

  if (!chrome || !chrome.runtime || !chrome.runtime.onMessage) {
    return;
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== OPEN_SAVED_POSTS_MESSAGE) {
      return false;
    }

    chrome.tabs.create({
      url: chrome.runtime.getURL("saved-posts.html")
    });
    return false;
  });
}());
