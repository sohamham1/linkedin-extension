const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("workspace button delegates opening to the extension runtime message bridge", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "ui-overlay.js"), "utf8");
  const sentMessages = [];
  let clickHandler = null;

  const context = {
    console,
    chrome: {
      runtime: {
        sendMessage(payload) {
          sentMessages.push(payload);
        }
      }
    },
    document: {
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      body: {
        appendChild() {}
      },
      createElement() {
        return {
          className: "",
          setAttribute() {},
          addEventListener(eventName, handler) {
            if (eventName === "click") {
              clickHandler = handler;
            }
          }
        };
      }
    },
    LinkedInHiringExtension: {
      constants: {
        badgeStates: {
          OPEN: "Open",
          CLOSED: "Closed/Filled",
          MAYBE: "Maybe",
          NONE: "No Opening"
        },
        messages: {
          OPEN_SAVED_POSTS: "LIHPD_OPEN_SAVED_POSTS"
        }
      }
    }
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "ui-overlay.js" });

  context.LinkedInHiringExtension.uiOverlay.renderWorkspaceButton();
  clickHandler();

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].type, "LIHPD_OPEN_SAVED_POSTS");
});
