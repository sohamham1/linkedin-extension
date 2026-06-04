(function () {
  function openSavedPosts() {
    const url = chrome.runtime.getURL("saved-posts.html");
    if (chrome && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
      window.close();
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
    window.close();
  }

  document.getElementById("openSavedPosts").addEventListener("click", openSavedPosts);
}());
