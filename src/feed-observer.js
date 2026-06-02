(function () {
  const NS = window.LinkedInHiringExtension;
  const { visibleText, compactWhitespace } = NS.utils;

  const STRONG_POST_SELECTORS = [
    "div[data-id*='urn:li:activity:']",
    "div.feed-shared-update-v2"
  ];

  const ACTION_LABELS = ["like", "comment", "repost", "send"];
  const EXCLUDED_TEXT_MARKERS = [
    "linkedin news",
    "top stories",
    "today's puzzles",
    "start a post",
    "write article",
    "photo",
    "video"
  ];
  const COMMENT_CONTEXT_SELECTORS = [
    ".comments-comment-item",
    ".comments-comments-list",
    ".comments-comment-list",
    ".comments-post-meta",
    ".comments-comment-social-bar",
    "[data-id*='comment']",
    "[class*='comments-comment-item']",
    "[class*='comments-reply-item']"
  ];

  function matchesStrongPostSelector(node) {
    return STRONG_POST_SELECTORS.some((selector) => node.matches && node.matches(selector));
  }

  function isCommentContext(node) {
    return COMMENT_CONTEXT_SELECTORS.some((selector) => node.closest && node.closest(selector));
  }

  function uniquePush(list, seen, node) {
    if (!node || seen.has(node)) {
      return;
    }
    seen.add(node);
    list.push(node);
  }

  function hasActionCluster(node) {
    const labels = Array.from(node.querySelectorAll("button, a, span"))
      .map((element) => visibleText(element).toLowerCase())
      .filter(Boolean);

    let hits = 0;
    for (const action of ACTION_LABELS) {
      if (labels.some((label) => label === action || label.includes(action))) {
        hits += 1;
      }
    }

    return hits >= 2;
  }

  function hasActorLink(node) {
    return Boolean(node.querySelector("a[href*='/in/'], a[href*='/company/']"));
  }

  function hasLongText(node) {
    const rawText = compactWhitespace(visibleText(node));
    return rawText.length >= 120;
  }

  function isExcludedModule(node) {
    const text = compactWhitespace(visibleText(node)).toLowerCase();
    return EXCLUDED_TEXT_MARKERS.some((marker) => text.includes(marker));
  }

  function nearestCandidate(node) {
    let current = node;
    let fallback = null;

    while (current && current !== document.body) {
      if (current.matches && current.matches("article, section, div")) {
        if (hasActorLink(current) && hasLongText(current) && hasActionCluster(current)) {
          if (isExcludedModule(current)) {
            return fallback;
          }
          return current;
        }

        if (!fallback && hasActorLink(current) && hasLongText(current)) {
          fallback = current;
        }
      }
      current = current.parentElement;
    }

    return fallback;
  }

  function findStrongPosts() {
    const results = [];
    const seen = new Set();

    STRONG_POST_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (hasActorLink(node) && hasLongText(node) && !isExcludedModule(node)) {
          uniquePush(results, seen, node);
        }
      });
    });

    return results;
  }

  function findHeuristicPosts() {
    const results = [];
    const seen = new Set();

    document.querySelectorAll("a[href*='/in/'], a[href*='/company/']").forEach((anchor) => {
      const candidate = nearestCandidate(anchor);
      if (!candidate) {
        return;
      }
      uniquePush(results, seen, candidate);
    });

    return results;
  }

  function findPosts() {
    const results = [];
    const seen = new Set();

    findStrongPosts().forEach((node) => uniquePush(results, seen, node));
    findHeuristicPosts().forEach((node) => uniquePush(results, seen, node));

    const filtered = results.filter((node) => !isCommentContext(node)
      && hasActorLink(node)
      && hasLongText(node)
      && !isExcludedModule(node)
      && (hasActionCluster(node) || matchesStrongPostSelector(node)));

    // Keep the most specific candidate when LinkedIn nests a full post inside a larger layout wrapper.
    return filtered.filter((node) => !filtered.some((other) => other !== node && node.contains(other)));
  }

  NS.feedObserver = {
    findPosts
  };
}());
