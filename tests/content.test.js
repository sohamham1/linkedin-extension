const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("content retries saving a qualifying post after a transient storage failure", async () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "content.js"), "utf8");
  const postElement = {
    dataset: {},
    style: {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
  let intersectionCallback = null;
  let saveAttempts = 0;

  const context = {
    console,
    Date,
    URL,
    location: new URL("https://www.linkedin.com/feed/"),
    setInterval() {
      return 1;
    },
    clearInterval() {},
    IntersectionObserver: function IntersectionObserver(callback) {
      intersectionCallback = callback;
      return {
        observe() {},
        disconnect() {}
      };
    },
    document: {
      readyState: "complete",
      documentElement: {
        setAttribute() {}
      },
      addEventListener() {}
    },
    window: {},
    globalThis: {},
    LinkedInHiringExtension: {
      constants: {
        badgeStates: {
          OPEN: "Open",
          MAYBE: "Maybe",
          NONE: "No Opening"
        }
      },
      utils: {
        hashString(input) {
          return `h:${String(input || "").length}`;
        },
        normalizeText(input) {
          return String(input || "").replace(/\s+/g, " ").trim().toLowerCase();
        }
      },
      feedObserver: {
        findPosts() {
          return [postElement];
        }
      },
      textResolver: {
        resolve() {
          return {
            key: "post-with-transient-save-failure",
            postUrl: "",
            fullText: "We're hiring a Product Manager. Apply here.",
            truncated: false
          };
        }
      },
      classifier: {
        scoreText() {
          return {
            label: "Open",
            hiringScore: 10,
            actionabilityScore: 6,
            closureScore: 0,
            negativeScore: 0
          };
        }
      },
      entityExtractor: {
        extract() {
          return {
            nativeCardType: "",
            companyName: "Acme",
            authorName: "Acme Careers",
            authorType: "Company",
            roleTitles: ["Product Manager"]
          };
        }
      },
      uiOverlay: {
        clearAll() {},
        renderStatus() {},
        renderWorkspaceButton() {},
        render() {}
      },
      savedPostsStorage: {
        async upsertSavedPost() {
          saveAttempts += 1;
          if (saveAttempts === 1) {
            throw new Error("temporary storage failure");
          }
          return { postId: "post-with-transient-save-failure" };
        }
      }
    }
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "content.js" });

  intersectionCallback([{ isIntersecting: true, target: postElement }]);
  await Promise.resolve();
  await Promise.resolve();

  intersectionCallback([{ isIntersecting: true, target: postElement }]);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(saveAttempts, 2);
});
