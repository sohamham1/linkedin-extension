const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadBackground() {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "background.js"), "utf8");
  const createdTabs = [];
  const listeners = [];
  const context = {
    console,
    chrome: {
      runtime: {
        getURL(input) {
          return `chrome-extension://test/${input}`;
        },
        onMessage: {
          addListener(listener) {
            listeners.push(listener);
          }
        }
      },
      tabs: {
        async create(payload) {
          createdTabs.push(payload);
        }
      }
    }
  };

  context.globalThis = context;
  context.self = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "background.js" });
  return { createdTabs, listeners };
}

test("background opens the saved posts workspace tab for the overlay action", async () => {
  const { createdTabs, listeners } = loadBackground();
  await listeners[0]({ type: "LIHPD_OPEN_SAVED_POSTS" });
  assert.equal(createdTabs.length, 1);
  assert.equal(createdTabs[0].url, "chrome-extension://test/saved-posts.html");
});
