(function () {
  const NS = window.LinkedInHiringExtension;
  const { visibleText, compactWhitespace, hashString } = NS.utils;

  const TEXT_SELECTORS = [
    ".update-components-text",
    ".feed-shared-update-v2__description",
    ".feed-shared-inline-show-more-text",
    "span.break-words",
    "div[dir='ltr']",
    "span[dir='ltr']"
  ];

  function derivePostKey(postElement) {
    const urnNode = postElement.querySelector("[data-urn], [data-id*='urn:li:'], [data-activity-urn]");
    const urnCandidate = urnNode && (urnNode.getAttribute("data-urn") || urnNode.getAttribute("data-id") || urnNode.getAttribute("data-activity-urn"));
    if (urnCandidate && urnCandidate.includes("urn:li:")) {
      return urnCandidate;
    }

    const postLink = postElement.querySelector("a[href*='/feed/update/'], a[href*='/posts/']");
    if (postLink) {
      return postLink.href || postLink.getAttribute("href") || "";
    }

    const author = visibleText(postElement.querySelector(".update-components-actor__name, .feed-shared-actor__name, a[href*='/in/']"));
    const time = visibleText(postElement.querySelector("time, .update-components-actor__sub-description, .feed-shared-actor__sub-description"));
    const snippet = compactWhitespace(extractVisibleText(postElement)).slice(0, 180);
    return hashString(`${author}|${time}|${snippet}`);
  }

  function extractVisibleText(postElement) {
    const joined = TEXT_SELECTORS
      .flatMap((selector) => Array.from(postElement.querySelectorAll(selector)))
      .map((node) => visibleText(node))
      .filter(Boolean)
      .join("\n");

    if (joined.trim()) {
      return compactWhitespace(joined);
    }

    return compactWhitespace(visibleText(postElement));
  }

  function isTruncated(postElement) {
    return Array.from(postElement.querySelectorAll("button, a, span"))
      .some((node) => {
        const label = visibleText(node).toLowerCase();
        return label === "see more" || label === "show more" || label.includes("see more");
      });
  }

  NS.textResolver = {
    resolve(postElement) {
      const text = extractVisibleText(postElement);
      return {
        key: derivePostKey(postElement),
        fullText: text,
        truncated: isTruncated(postElement)
      };
    }
  };
}());
