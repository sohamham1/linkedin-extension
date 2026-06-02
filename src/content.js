(function () {
  const NS = window.LinkedInHiringExtension;
  const { hashString, normalizeText } = NS.utils;
  const INSTANCE_KEY = "__linkedinHiringDetectorInstance";
  const DEBUG_KEY = "LinkedInHiringExtensionDebug";
  const LOG_PREFIX = "[LIHPD]";
  const PROCESS_LIMIT = 250;
  const PROCESS_WINDOW_MS = 15000;
  const CIRCUIT_BREAKER_COOLDOWN_MS = 5000;
  const POST_SCAN_INTERVAL_MS = 1500;
  const ROUTE_POLL_INTERVAL_MS = 1500;
  const SUPPORTED_ROUTE_PATTERNS = [
    /^\/feed\/?$/i,
    /^\/feed\/update\/.+/i,
    /^\/posts\/.+/i
  ];
  const DETAIL_ROUTE_PATTERNS = [
    /^\/feed\/update\/.+/i,
    /^\/posts\/.+/i
  ];

  if (window[INSTANCE_KEY] && typeof window[INSTANCE_KEY].destroy === "function") {
    window[INSTANCE_KEY].destroy();
  }

  function createDebugState() {
    return {
      counters: {
        boot: 0,
        feedRootFound: 0,
        postFound: 0,
        postSkipped: 0,
        badgeRendered: 0,
        postUpdated: 0,
        circuitBreaker: 0
      },
      events: [],
      lastUrl: location.href
    };
  }

  function logEvent(debugState, type, details) {
    const entry = {
      type,
      details: details || "",
      time: new Date().toISOString()
    };
    debugState.events.push(entry);
    if (debugState.events.length > 100) {
      debugState.events.shift();
    }

    if (type === "boot") {
      debugState.counters.boot += 1;
    } else if (type === "feed-root-found") {
      debugState.counters.feedRootFound += 1;
    } else if (type === "post-found") {
      debugState.counters.postFound += 1;
    } else if (type === "post-skipped") {
      debugState.counters.postSkipped += 1;
    } else if (type === "badge-rendered") {
      debugState.counters.badgeRendered += 1;
    } else if (type === "post-updated") {
      debugState.counters.postUpdated += 1;
    } else if (type === "circuit-breaker") {
      debugState.counters.circuitBreaker += 1;
    }

    console.warn(LOG_PREFIX, type, details || "");
  }

  function isSupportedRoute(urlLike) {
    const pathname = typeof urlLike === "string"
      ? new URL(urlLike, location.origin).pathname
      : location.pathname;

    return SUPPORTED_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
  }

  function currentPageMode(urlLike) {
    const pathname = typeof urlLike === "string"
      ? new URL(urlLike, location.origin).pathname
      : location.pathname;

    if (!SUPPORTED_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname))) {
      return "inactive";
    }

    if (DETAIL_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname))) {
      return "detail";
    }

    return "feed";
  }

  function syncPageMode(urlLike) {
    document.documentElement.setAttribute("data-lihpd-page", currentPageMode(urlLike));
  }

  function createInstance() {
    const debugState = window[DEBUG_KEY] = createDebugState();
    const processedPosts = new Map();
    const visiblePosts = new WeakSet();
    const processTimestamps = [];

    let intersectionObserver = null;
    let postScanPoller = null;
    let routePoller = null;
    let stopped = false;
    let cooldownUntil = 0;

    function disconnectAll() {
      if (intersectionObserver) {
        intersectionObserver.disconnect();
        intersectionObserver = null;
      }
      if (postScanPoller) {
        window.clearInterval(postScanPoller);
        postScanPoller = null;
      }
      if (routePoller) {
        window.clearInterval(routePoller);
        routePoller = null;
      }
    }

    function destroy() {
      stopped = true;
      disconnectAll();
      syncPageMode("https://www.linkedin.com/unsupported");
      NS.uiOverlay.clearAll();
    }

    function recordProcessTick() {
      const now = Date.now();
      processTimestamps.push(now);
      while (processTimestamps.length > 0 && now - processTimestamps[0] > PROCESS_WINDOW_MS) {
        processTimestamps.shift();
      }

      if (processTimestamps.length > PROCESS_LIMIT) {
        logEvent(debugState, "circuit-breaker", `${processTimestamps.length} process attempts in ${PROCESS_WINDOW_MS}ms`);
        cooldownUntil = now + CIRCUIT_BREAKER_COOLDOWN_MS;
        NS.uiOverlay.renderStatus("LIHPD throttling briefly");
        return false;
      }

      return true;
    }

    function classifyAndRender(postElement, reason) {
      if (stopped || !isSupportedRoute()) {
        return;
      }

      const resolved = NS.textResolver.resolve(postElement);
      const normalizedText = normalizeText(resolved.fullText);
      if (!normalizedText || normalizedText.length < 20) {
        logEvent(debugState, "post-skipped", "empty-or-short-text");
        return;
      }

      const textHash = hashString(normalizedText);
      const previous = processedPosts.get(resolved.key);
      if (previous && previous.textHash === textHash) {
        return;
      }

      if (!recordProcessTick()) {
        return;
      }

      const result = NS.classifier.scoreText(resolved.fullText);
      const entities = NS.entityExtractor.extract(postElement, resolved.fullText);
      const finalLabel = entities.hasNativeJobCard
        ? NS.constants.badgeStates.OPEN
        : result.label;
      processedPosts.set(resolved.key, {
        textHash,
        label: finalLabel
      });

      if (previous) {
        logEvent(debugState, "post-updated", finalLabel);
      } else {
        logEvent(debugState, "post-found", finalLabel);
      }

      NS.uiOverlay.render(postElement, {
        label: finalLabel,
        subtitle: finalLabel === NS.constants.badgeStates.OPEN || finalLabel === NS.constants.badgeStates.MAYBE
          ? entities.subtitle
          : "",
        debugTitle: `reason=${reason}; score=${result.hiringScore}/${result.actionabilityScore}/${result.closureScore}/${result.negativeScore}; nativeJobCard=${entities.hasNativeJobCard ? "yes" : "no"}; company=${entities.companyName || "-"}; role=${entities.roleTitle || "-"}; authorType=${entities.authorType || "-"}`
      });
      logEvent(debugState, "badge-rendered", finalLabel);
    }

    function registerPost(postElement) {
      if (!postElement || postElement.dataset.lihpdRegistered === "1") {
        return;
      }
      postElement.dataset.lihpdRegistered = "1";
      intersectionObserver.observe(postElement);
    }

    function scanPosts(reason) {
      if (stopped) {
        return;
      }

      if (!isSupportedRoute()) {
        NS.uiOverlay.clearAll();
        return;
      }

      if (cooldownUntil > Date.now()) {
        NS.uiOverlay.renderStatus("LIHPD throttling briefly");
        return;
      }

      const posts = NS.feedObserver.findPosts();
      NS.uiOverlay.renderStatus(posts.length > 0
        ? `LIHPD: scanned ${posts.length} feed posts`
        : "LIHPD: no feed posts detected yet");
      posts.forEach((postElement) => {
        registerPost(postElement);
        if (visiblePosts.has(postElement)) {
          classifyAndRender(postElement, reason);
        }
      });
    }

    function resetForRouteChange() {
      processedPosts.clear();
      cooldownUntil = 0;
      NS.uiOverlay.clearAll();
      if (isSupportedRoute()) {
        NS.uiOverlay.renderStatus("LIHPD: rescanning feed");
      }
    }

    function startPostScanning() {
      if (isSupportedRoute()) {
        NS.uiOverlay.renderStatus("LIHPD: scanning page");
      }

      postScanPoller = window.setInterval(() => {
        if (stopped) {
          return;
        }
        scanPosts("poll");
      }, POST_SCAN_INTERVAL_MS);
    }

    function startRoutePolling() {
      routePoller = window.setInterval(() => {
        if (stopped) {
          return;
        }

        if (location.href !== debugState.lastUrl) {
          debugState.lastUrl = location.href;
          syncPageMode(debugState.lastUrl);
          resetForRouteChange();
          if (isSupportedRoute(debugState.lastUrl)) {
            scanPosts("route-change");
          }
        }
      }, ROUTE_POLL_INTERVAL_MS);
    }

    function boot() {
      logEvent(debugState, "boot", location.href);
      syncPageMode(location.href);

      intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          visiblePosts.add(entry.target);
          classifyAndRender(entry.target, "visible");
        });
      }, { rootMargin: "200px 0px" });

      if (isSupportedRoute()) {
        NS.uiOverlay.renderStatus("LIHPD: booting");
        scanPosts("boot");
      }
      startPostScanning();
      startRoutePolling();
    }

    return {
      boot,
      destroy
    };
  }

  const instance = createInstance();
  window[INSTANCE_KEY] = instance;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => instance.boot(), { once: true });
  } else {
    instance.boot();
  }
}());
