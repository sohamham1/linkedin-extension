(function () {
  const NS = window.LinkedInHiringExtension || (window.LinkedInHiringExtension = {});
  const badgeStates = (NS.constants && NS.constants.badgeStates) || {};
  const compactWhitespace = NS.utils && NS.utils.compactWhitespace
    ? NS.utils.compactWhitespace
    : (input) => String(input || "").replace(/\s+/g, " ").trim();

  const STORAGE_KEY = (NS.constants && NS.constants.savedPostsStorageKey) || "lihpd:saved-posts";
  const QUALIFYING_STATUSES = new Set([badgeStates.OPEN || "Open", badgeStates.MAYBE || "Maybe"]);
  const ACTIVITY_URN_PATTERN = /urn:li:activity:\d+/i;
  let mutationQueue = Promise.resolve();

  function storageArea() {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      throw new Error("chrome.storage.local is unavailable");
    }
    return chrome.storage.local;
  }

  async function readState() {
    const stored = await storageArea().get(STORAGE_KEY);
    const state = stored[STORAGE_KEY] || {};
    return {
      postsById: state.postsById || {},
      deletedPostIds: state.deletedPostIds || {}
    };
  }

  async function writeState(state) {
    await storageArea().set({
      [STORAGE_KEY]: state
    });
  }

  function queueMutation(mutator) {
    const run = mutationQueue.then(() => mutator());
    mutationQueue = run.catch(() => {});
    return run;
  }

  function normalizeRoleTitles(roleTitles) {
    const unique = new Set();
    return (Array.isArray(roleTitles) ? roleTitles : [])
      .map((role) => compactWhitespace(role))
      .filter((role) => role.length > 0)
      .filter((role) => {
        const key = role.toLowerCase();
        if (unique.has(key)) {
          return false;
        }
        unique.add(key);
        return true;
      });
  }

  function normalizeString(value) {
    return compactWhitespace(value);
  }

  function deriveCanonicalPostUrl(postId, postUrl) {
    const normalizedUrl = normalizeString(postUrl);
    if (normalizedUrl) {
      return normalizedUrl;
    }

    const activityUrnMatch = String(postId || "").match(ACTIVITY_URN_PATTERN);
    if (!activityUrnMatch) {
      return "";
    }

    return `https://www.linkedin.com/feed/update/${activityUrnMatch[0]}/`;
  }

  function createBaseRecord(input, nowIso) {
    const canonicalPostUrl = deriveCanonicalPostUrl(input.postId, input.postUrl);
    return {
      postId: input.postId,
      postUrl: canonicalPostUrl,
      status: input.status,
      companyName: normalizeString(input.companyName),
      authorName: normalizeString(input.authorName),
      authorType: normalizeString(input.authorType),
      roleTitles: normalizeRoleTitles(input.roleTitles),
      firstSeenAt: nowIso,
      lastSeenAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      manuallyEditedFields: {
        companyName: false,
        roleTitles: false
      }
    };
  }

  function mergeAutoUpdate(record, input, nowIso) {
    const canonicalPostUrl = deriveCanonicalPostUrl(input.postId, input.postUrl);
    const next = {
      ...record,
      postUrl: canonicalPostUrl || record.postUrl,
      status: input.status,
      authorName: normalizeString(input.authorName) || record.authorName || "",
      authorType: normalizeString(input.authorType) || record.authorType || "",
      lastSeenAt: nowIso,
      updatedAt: nowIso,
      manuallyEditedFields: {
        companyName: Boolean(record.manuallyEditedFields && record.manuallyEditedFields.companyName),
        roleTitles: Boolean(record.manuallyEditedFields && record.manuallyEditedFields.roleTitles)
      }
    };

    const normalizedCompany = normalizeString(input.companyName);
    if (!next.manuallyEditedFields.companyName && normalizedCompany) {
      next.companyName = normalizedCompany;
    }

    const normalizedRoles = normalizeRoleTitles(input.roleTitles);
    if (!next.manuallyEditedFields.roleTitles && normalizedRoles.length > 0) {
      next.roleTitles = normalizedRoles;
    }

    return next;
  }

  function sortRows(rows) {
    return rows.slice().sort((left, right) => {
      const rightTime = Date.parse(right.lastSeenAt || 0);
      const leftTime = Date.parse(left.lastSeenAt || 0);
      return rightTime - leftTime;
    });
  }

  async function listSavedPosts() {
    const state = await readState();
    return sortRows(Object.values(state.postsById));
  }

  async function upsertSavedPost(input) {
    if (!input || !input.postId || !QUALIFYING_STATUSES.has(input.status)) {
      return null;
    }

    const canonicalPostUrl = deriveCanonicalPostUrl(input.postId, input.postUrl);
    if (!canonicalPostUrl) {
      return null;
    }

    return queueMutation(async () => {
      const state = await readState();
      if (state.deletedPostIds[input.postId]) {
        return null;
      }

      const nowIso = new Date().toISOString();
      const previous = state.postsById[input.postId];
      state.postsById[input.postId] = previous
        ? mergeAutoUpdate(previous, { ...input, postUrl: canonicalPostUrl }, nowIso)
        : createBaseRecord({ ...input, postUrl: canonicalPostUrl }, nowIso);
      await writeState(state);
      return state.postsById[input.postId];
    });
  }

  async function updateSavedPost(postId, patch) {
    if (!postId) {
      return null;
    }

    return queueMutation(async () => {
      const state = await readState();
      const record = state.postsById[postId];
      if (!record) {
        return null;
      }

      const next = {
        ...record,
        updatedAt: new Date().toISOString(),
        manuallyEditedFields: {
          companyName: Boolean(record.manuallyEditedFields && record.manuallyEditedFields.companyName),
          roleTitles: Boolean(record.manuallyEditedFields && record.manuallyEditedFields.roleTitles)
        }
      };

      if (Object.prototype.hasOwnProperty.call(patch || {}, "companyName")) {
        next.companyName = normalizeString(patch.companyName);
        next.manuallyEditedFields.companyName = true;
      }

      if (Object.prototype.hasOwnProperty.call(patch || {}, "roleTitles")) {
        next.roleTitles = normalizeRoleTitles(patch.roleTitles);
        next.manuallyEditedFields.roleTitles = true;
      }

      if (Object.prototype.hasOwnProperty.call(patch || {}, "status") && QUALIFYING_STATUSES.has(patch.status)) {
        next.status = patch.status;
      }

      state.postsById[postId] = next;
      await writeState(state);
      return next;
    });
  }

  async function deleteSavedPost(postId) {
    if (!postId) {
      return false;
    }

    return queueMutation(async () => {
      const state = await readState();
      delete state.postsById[postId];
      state.deletedPostIds[postId] = new Date().toISOString();
      await writeState(state);
      return true;
    });
  }

  NS.savedPostsStorage = {
    listSavedPosts,
    upsertSavedPost,
    updateSavedPost,
    deleteSavedPost
  };
}());
