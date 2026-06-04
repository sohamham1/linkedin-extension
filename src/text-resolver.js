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
  const PERMALINK_SELECTOR = "a[href*='/feed/update/'], a[href*='/posts/'], a[href*='/activity-']";

  const DETAIL_ROUTE_PATTERNS = [
    /^\/feed\/update\/.+/i,
    /^\/posts\/.+/i
  ];

  function currentHref() {
    if (location && typeof location.href === "string" && location.href) {
      return location.href;
    }

    return "https://www.linkedin.com/";
  }

  function currentOrigin() {
    const UrlConstructor = getUrlConstructor();
    if (!UrlConstructor) {
      return "https://www.linkedin.com";
    }

    try {
      return new UrlConstructor(currentHref()).origin;
    } catch (error) {
      return "https://www.linkedin.com";
    }
  }

  function getUrlConstructor() {
    if (typeof URL === "function") {
      return URL;
    }

    if (location && location.constructor && typeof location.constructor === "function") {
      return location.constructor;
    }

    return null;
  }

  function extractActivityUrn(value) {
    const match = String(value || "").match(/urn:li:activity:\d+/i);
    return match ? match[0] : "";
  }

  function extractAnyUrn(value) {
    const match = String(value || "").match(/urn:li:[^,\s"'?&#]+/i);
    return match ? match[0] : "";
  }

  function getPermalinkCandidates(postElement) {
    if (!postElement || typeof postElement.querySelectorAll !== "function") {
      return [];
    }

    return Array.from(postElement.querySelectorAll(PERMALINK_SELECTOR))
      .map((node) => node.href || (typeof node.getAttribute === "function" ? node.getAttribute("href") : ""))
      .filter(Boolean);
  }

  function parsePermalinkCandidate(href) {
    const raw = String(href || "").trim();
    if (!raw) {
      return null;
    }

    const UrlConstructor = getUrlConstructor();
    if (!UrlConstructor) {
      return null;
    }

    try {
      return new UrlConstructor(raw, currentOrigin());
    } catch (error) {
      return null;
    }
  }

  function isGenericPostsIndexPath(pathname) {
    return /^\/company\/[^/]+\/posts\/?$/i.test(pathname) || /^\/in\/[^/]+\/posts\/?$/i.test(pathname);
  }

  function classifyPermalinkPath(pathname) {
    const path = String(pathname || "");
    if (!path) {
      return "";
    }

    if (/^\/feed\/update\/urn:li:activity:\d+\/?$/i.test(path)) {
      return "feed-update";
    }
    if (/^\/activity-\d+\/?$/i.test(path)) {
      return "activity";
    }
    if (isGenericPostsIndexPath(path)) {
      return "generic-posts-index";
    }
    if (/^\/posts\/.+/i.test(path)) {
      return "posts";
    }

    return "";
  }

  function selectBestPermalink(postElement) {
    const candidates = getPermalinkCandidates(postElement)
      .map((href) => parsePermalinkCandidate(href))
      .filter(Boolean)
      .map((url) => ({
        href: url.href,
        type: classifyPermalinkPath(url.pathname || "")
      }));

    if (candidates.length === 0) {
      return "";
    }

    const preferredTypes = ["feed-update", "posts", "activity"];
    for (const type of preferredTypes) {
      const match = candidates.find((candidate) => candidate.type === type);
      if (match) {
        return match.href;
      }
    }

    return "";
  }

  function derivePostKey(postElement) {
    const urnNode = postElement.querySelector("[data-urn], [data-id*='urn:li:'], [data-activity-urn]");
    const urnCandidate = urnNode && (urnNode.getAttribute("data-urn") || urnNode.getAttribute("data-id") || urnNode.getAttribute("data-activity-urn"));
    const activityUrn = extractActivityUrn(urnCandidate);
    if (activityUrn) {
      return activityUrn;
    }

    const genericUrn = extractAnyUrn(urnCandidate);
    if (genericUrn) {
      return genericUrn;
    }

    const postLink = selectBestPermalink(postElement);
    if (postLink) {
      return postLink;
    }

    const author = visibleText(postElement.querySelector(".update-components-actor__name, .feed-shared-actor__name, a[href*='/in/']"));
    const time = visibleText(postElement.querySelector("time, .update-components-actor__sub-description, .feed-shared-actor__sub-description"));
    const snippet = compactWhitespace(extractVisibleText(postElement)).slice(0, 180);
    return hashString(`${author}|${time}|${snippet}`);
  }

  function canonicalizePostUrl(urlLike) {
    if (!urlLike) {
      return "";
    }

    const raw = String(urlLike || "").trim();
    if (!raw) {
      return "";
    }

    if (/^https?:\/\//i.test(raw)) {
      const withoutParams = raw.replace(/[?#].*$/, "");
      return withoutParams.endsWith("/") ? withoutParams : `${withoutParams}/`;
    }

    if (raw.startsWith("/")) {
      return `${currentOrigin()}${raw.endsWith("/") ? raw : `${raw}/`}`;
    }

    return `${currentOrigin()}/${raw.replace(/^\/+/, "").replace(/[?#].*$/, "").replace(/\/?$/, "/")}`;
  }

  function buildUrlFromActivityKey(key) {
    const activityUrn = extractActivityUrn(key);
    if (!activityUrn) {
      return "";
    }

    return canonicalizePostUrl(`/feed/update/${activityUrn}/`);
  }

  function isDetailRoute() {
    return DETAIL_ROUTE_PATTERNS.some((pattern) => pattern.test(location.pathname || ""));
  }

  function derivePostUrl(postElement, key) {
    const postLink = selectBestPermalink(postElement);
    if (postLink) {
      return canonicalizePostUrl(postLink);
    }

    if (isDetailRoute()) {
      return canonicalizePostUrl(currentHref());
    }

    return buildUrlFromActivityKey(key);
  }

  function normalizeStructuredText(input) {
    return String(input || "")
      .split(/\r?\n/)
      .map((line) => compactWhitespace(line))
      .filter(Boolean)
      .join("\n");
  }

  function extractVisibleText(postElement) {
    const joined = TEXT_SELECTORS
      .flatMap((selector) => Array.from(postElement.querySelectorAll(selector)))
      .map((node) => normalizeStructuredText(node.innerText || node.textContent || ""))
      .filter(Boolean)
      .join("\n\n");

    if (joined.trim()) {
      return joined.trim();
    }

    return normalizeStructuredText(postElement.innerText || postElement.textContent || "");
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
      const key = derivePostKey(postElement);
      return {
        key,
        postUrl: derivePostUrl(postElement, key),
        fullText: text,
        truncated: isTruncated(postElement)
      };
    }
  };
}());
