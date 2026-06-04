const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("popup opens the saved posts page in a new tab", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "popup.js"), "utf8");
  const createdTabs = [];
  const clickHandlers = {};
  let closed = false;

  const context = {
    console,
    chrome: {
      runtime: {
        getURL(file) {
          return `chrome-extension://test/${file}`;
        }
      },
      tabs: {
        create(payload) {
          createdTabs.push(payload);
        }
      }
    },
    document: {
      getElementById(id) {
        return {
          addEventListener(eventName, handler) {
            clickHandlers[`${id}:${eventName}`] = handler;
          }
        };
      }
    },
    window: {
      close() {
        closed = true;
      }
    }
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "popup.js" });
  clickHandlers["openSavedPosts:click"]();

  assert.equal(createdTabs.length, 1);
  assert.equal(createdTabs[0].url, "chrome-extension://test/saved-posts.html");
  assert.equal(closed, true);
});
