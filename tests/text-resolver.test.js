const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadTextResolver(locationHref) {
  const context = {
    console,
    URL,
    window: {},
    globalThis: {},
    location: new URL(locationHref),
    LinkedInHiringExtension: {}
  };
  context.window = context;
  context.globalThis = context;

  const root = path.join(__dirname, "..");
  for (const file of ["src/utils.js", "src/text-resolver.js"]) {
    const code = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInContext(code, vm.createContext(context), { filename: file });
  }

  return context.LinkedInHiringExtension.textResolver;
}

function makeAnchor(href) {
  return {
    href,
    getAttribute() {
      return href;
    }
  };
}

function makeElement({ text = "", urn = "", href = "", hrefs = [] } = {}) {
  const permalinkHrefs = hrefs.length > 0 ? hrefs : (href ? [href] : []);
  return {
    innerText: text,
    textContent: text,
    querySelector(selector) {
      if ((selector.includes("[data-urn]") || selector.includes("[data-id*='urn:li:']") || selector.includes("[data-activity-urn]")) && urn) {
        return {
          getAttribute(name) {
            if (name === "data-urn") {
              return urn;
            }
            return "";
          }
        };
      }

      if (selector.includes("a[href*='/feed/update/']") || selector.includes("a[href*='/posts/']") || selector.includes("a[href*='/activity-']")) {
        return permalinkHrefs.length > 0 ? makeAnchor(permalinkHrefs[0]) : null;
      }

      return null;
    },
    querySelectorAll(selector) {
      if (selector.includes("a[href*='/feed/update/']") || selector.includes("a[href*='/posts/']") || selector.includes("a[href*='/activity-']")) {
        return permalinkHrefs.map((value) => makeAnchor(value));
      }

      return [];
    }
  };
}

test("resolve uses the current detail-page URL when the post DOM has no permalink anchor", () => {
  const resolver = loadTextResolver("https://www.linkedin.com/feed/update/urn:li:activity:7467921408011116545/?utm_source=share&utm_medium=member_desktop");
  const post = makeElement({
    text: "We're hiring for a product role.",
    urn: "urn:li:activity:7467921408011116545"
  });

  const resolved = resolver.resolve(post);
  assert.equal(resolved.postUrl, "https://www.linkedin.com/feed/update/urn:li:activity:7467921408011116545/");
});

test("resolve builds a canonical feed URL from the activity URN when feed cards lack a permalink anchor", () => {
  const resolver = loadTextResolver("https://www.linkedin.com/feed/");
  const post = makeElement({
    text: "We're hiring for a backend engineer.",
    urn: "urn:li:activity:1234567890123456789"
  });

  const resolved = resolver.resolve(post);
  assert.equal(resolved.postUrl, "https://www.linkedin.com/feed/update/urn:li:activity:1234567890123456789/");
});

test("resolve extracts an activity URN from mixed LinkedIn data-id blobs", () => {
  const resolver = loadTextResolver("https://www.linkedin.com/feed/");
  const post = makeElement({
    text: "We're hiring for a growth marketer.",
    urn: "urn:li:activity:987654321012345678,urn:li:share:987654321012345678"
  });

  const resolved = resolver.resolve(post);
  assert.equal(resolved.key, "urn:li:activity:987654321012345678");
  assert.equal(resolved.postUrl, "https://www.linkedin.com/feed/update/urn:li:activity:987654321012345678/");
});

test("resolve keeps LinkedIn activity-style permalink URLs when feed cards expose activity links", () => {
  const resolver = loadTextResolver("https://www.linkedin.com/feed/");
  const post = makeElement({
    text: "We're hiring for a designer.",
    href: "https://www.linkedin.com/posts/amna-qureshi-65433318a_excited-to-be-growing-the-digital-products-share-7467848820815749121-q89e/?trackingId=abc"
  });

  const resolved = resolver.resolve(post);
  assert.equal(resolved.postUrl, "https://www.linkedin.com/posts/amna-qureshi-65433318a_excited-to-be-growing-the-digital-products-share-7467848820815749121-q89e/");
});

test("resolve prefers the actual post permalink over generic company posts pages", () => {
  const resolver = loadTextResolver("https://www.linkedin.com/feed/");
  const post = makeElement({
    text: "We're hiring for a designer.",
    hrefs: [
      "https://www.linkedin.com/company/acme-labs/posts/?feedView=all",
      "https://www.linkedin.com/posts/acme-labs_we-are-hiring-a-designer-activity-7467848820815749121-q89e/?trackingId=abc"
    ]
  });

  const resolved = resolver.resolve(post);
  assert.equal(resolved.postUrl, "https://www.linkedin.com/posts/acme-labs_we-are-hiring-a-designer-activity-7467848820815749121-q89e/");
});
