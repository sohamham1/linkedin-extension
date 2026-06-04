(function () {
  const NS = window.LinkedInHiringExtension || (window.LinkedInHiringExtension = {});

  function compactWhitespace(input) {
    return String(input || "").replace(/\s+/g, " ").trim();
  }

  function visibleText(element) {
    if (!element) {
      return "";
    }
    return compactWhitespace(element.innerText || element.textContent || "");
  }

  NS.constants = {
    badgeStates: {
      SCANNING: "Scanning...",
      OPEN: "Open",
      CLOSED: "Closed/Filled",
      MAYBE: "Maybe",
      NONE: "No Opening"
    },
    cachePrefix: "lihpd:cache:",
    savedPostsStorageKey: "lihpd:saved-posts",
    eventType: "linkedin-hiring:page-data",
    debugEventType: "linkedin-hiring:debug",
    messages: {
      OPEN_SAVED_POSTS: "LIHPD_OPEN_SAVED_POSTS"
    }
  };

  NS.utils = {
    debounce(fn, wait) {
      let timeoutId = null;
      return function debounced(...args) {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => fn.apply(this, args), wait);
      };
    },

    hashString(input) {
      let hash = 2166136261;
      for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      }
      return `h${(hash >>> 0).toString(16)}`;
    },

    normalizeText(input) {
      if (!input) {
        return "";
      }

      return input
        .normalize("NFKC")
        .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
        .replace(/[\u201C\u201D\u2033]/g, "\"")
        .replace(/[\u2010-\u2015\u2212]/g, "-")
        .replace(/\u2026/g, "...")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    },

    compactWhitespace,

    looksLikeUrl(input) {
      return /https?:\/\/|www\./i.test(input);
    },

    extractUrls(input) {
      return String(input || "").match(/https?:\/\/[^\s]+|www\.[^\s]+/gi) || [];
    },

    extractEmails(input) {
      return String(input || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    },

    createIdleScheduler() {
      if ("requestIdleCallback" in window) {
        return (callback) => window.requestIdleCallback(callback, { timeout: 250 });
      }
      return (callback) => window.setTimeout(() => callback({ timeRemaining: () => 0, didTimeout: true }), 32);
    },

    visibleText,

    textFromNodes(nodes) {
      return Array.from(nodes || [])
        .map((node) => visibleText(node))
        .filter(Boolean)
        .join("\n")
        .trim();
    },

    isElementInViewport(element, marginPx) {
      if (!element) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      const margin = Number.isFinite(marginPx) ? marginPx : 0;
      return rect.bottom >= -margin && rect.top <= window.innerHeight + margin;
    },

    sleep(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    }
  };
}());
