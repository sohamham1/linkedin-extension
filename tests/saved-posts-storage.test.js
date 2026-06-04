const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createStorageArea() {
  return {
    _store: {},
    async get(key) {
      if (Array.isArray(key)) {
        return key.reduce((acc, item) => {
          acc[item] = this._store[item];
          return acc;
        }, {});
      }
      if (typeof key === "string") {
        return { [key]: this._store[key] };
      }
      return { ...this._store };
    },
    async set(payload) {
      Object.assign(this._store, payload);
    }
  };
}

function createDelayedStorageArea() {
  return {
    _store: {},
    async get(key) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (Array.isArray(key)) {
        return key.reduce((acc, item) => {
          acc[item] = this._store[item];
          return acc;
        }, {});
      }
      if (typeof key === "string") {
        return { [key]: this._store[key] };
      }
      return { ...this._store };
    },
    async set(payload) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      Object.assign(this._store, payload);
    }
  };
}

function loadStorageModule(storageArea = createStorageArea()) {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "saved-posts-storage.js"), "utf8");
  const context = {
    console,
    Date,
    setTimeout,
    LinkedInHiringExtension: {
      constants: {
        badgeStates: {
          OPEN: "Open",
          MAYBE: "Maybe",
          NONE: "No Opening"
        }
      },
      utils: {
        compactWhitespace(input) {
          return String(input || "").replace(/\s+/g, " ").trim();
        },
        hashString(input) {
          let hash = 0;
          const normalized = String(input || "");
          for (let index = 0; index < normalized.length; index += 1) {
            hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
          }
          return `h${hash.toString(16)}`;
        }
      }
    },
    chrome: {
      storage: {
        local: storageArea
      }
    }
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "saved-posts-storage.js" });
  return context.LinkedInHiringExtension.savedPostsStorage;
}

test("upsertSavedPost stores and updates qualifying posts without duplicating rows", async () => {
  const storage = loadStorageModule();

  await storage.upsertSavedPost({
    postId: "urn:li:activity:1",
    postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:1/",
    status: "Open",
    companyName: "Acme",
    roleTitles: ["Product Manager"]
  });

  await storage.upsertSavedPost({
    postId: "urn:li:activity:1",
    postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:1/",
    status: "Maybe",
    companyName: "Acme Labs",
    roleTitles: ["Product Manager", "Growth Lead"]
  });

  const rows = await storage.listSavedPosts();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "Maybe");
  assert.equal(rows[0].companyName, "Acme Labs");
  assert.deepEqual([...rows[0].roleTitles], ["Product Manager", "Growth Lead"]);
});

test("upsertSavedPost ignores non qualifying statuses", async () => {
  const storage = loadStorageModule();

  await storage.upsertSavedPost({
    postId: "urn:li:activity:skip",
    postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:skip/",
    status: "No Opening",
    companyName: "Ignored",
    roleTitles: ["Role"]
  });

  const rows = await storage.listSavedPosts();
  assert.equal(rows.length, 0);
});

test("deleteSavedPost prevents the same post from being auto-saved again", async () => {
  const storage = loadStorageModule();

  await storage.upsertSavedPost({
    postId: "urn:li:activity:2",
    postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:2/",
    status: "Open",
    companyName: "Northwind",
    roleTitles: ["Designer"]
  });

  await storage.deleteSavedPost("urn:li:activity:2");
  await storage.upsertSavedPost({
    postId: "urn:li:activity:2",
    postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:2/",
    status: "Maybe",
    companyName: "Northwind Updated",
    roleTitles: ["Senior Designer"]
  });

  const rows = await storage.listSavedPosts();
  assert.equal(rows.length, 0);
});

test("updateSavedPost preserves manual edits against later auto-updates", async () => {
  const storage = loadStorageModule();

  await storage.upsertSavedPost({
    postId: "urn:li:activity:3",
    postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:3/",
    status: "Open",
    companyName: "Contoso",
    roleTitles: ["Analyst"]
  });

  await storage.updateSavedPost("urn:li:activity:3", {
    companyName: "Contoso India",
    roleTitles: ["Business Analyst", "Strategy Analyst"]
  });

  await storage.upsertSavedPost({
    postId: "urn:li:activity:3",
    postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:3/",
    status: "Open",
    companyName: "Contoso Corp",
    roleTitles: ["Analyst"]
  });

  const rows = await storage.listSavedPosts();
  assert.equal(rows[0].companyName, "Contoso India");
  assert.deepEqual([...rows[0].roleTitles], ["Business Analyst", "Strategy Analyst"]);
});

test("upsertSavedPost keeps company-author fallback data for table display", async () => {
  const storage = loadStorageModule();

  await storage.upsertSavedPost({
    postId: "urn:li:activity:4",
    postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:4/",
    status: "Open",
    companyName: "",
    authorName: "Acme Labs",
    authorType: "Company",
    roleTitles: ["Product Designer"]
  });

  const rows = await storage.listSavedPosts();
  assert.equal(rows[0].authorName, "Acme Labs");
  assert.equal(rows[0].authorType, "Company");
});

test("upsertSavedPost derives a canonical LinkedIn URL from an activity postId when postUrl is missing", async () => {
  const storage = loadStorageModule();

  await storage.upsertSavedPost({
    postId: "urn:li:activity:7467921408011116545",
    postUrl: "",
    status: "Open",
    companyName: "Acme",
    roleTitles: ["Product Manager"]
  });

  const rows = await storage.listSavedPosts();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].postUrl, "https://www.linkedin.com/feed/update/urn:li:activity:7467921408011116545/");
});

test("upsertSavedPost preserves multiple concurrent qualifying saves", async () => {
  const storage = loadStorageModule(createDelayedStorageArea());

  await Promise.all([
    storage.upsertSavedPost({
      postId: "urn:li:activity:101",
      postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:101/",
      status: "Open",
      companyName: "Acme",
      roleTitles: ["Product Manager"]
    }),
    storage.upsertSavedPost({
      postId: "urn:li:activity:102",
      postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:102/",
      status: "Maybe",
      companyName: "Northwind",
      roleTitles: ["Designer"]
    }),
    storage.upsertSavedPost({
      postId: "urn:li:activity:103",
      postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:103/",
      status: "Open",
      companyName: "Contoso",
      roleTitles: ["Analyst"]
    })
  ]);

  const rows = await storage.listSavedPosts();
  assert.deepEqual(Array.from(rows, (row) => row.postId).sort(), [
    "urn:li:activity:101",
    "urn:li:activity:102",
    "urn:li:activity:103"
  ]);
});
