const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadEntityExtractor() {
  const context = vm.createContext({
    console,
    window: {},
    globalThis: {},
    LinkedInHiringExtension: {}
  });
  context.window = context;
  context.globalThis = context;

  const root = path.join(__dirname, "..");
  for (const file of ["src/utils.js", "src/entity-extractor.js"]) {
    const code = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInContext(code, context, { filename: file });
  }

  return context.LinkedInHiringExtension.entityExtractor;
}

function makeNode({ text = "", href = "", queryMap = {} } = {}) {
  return {
    href,
    innerText: text,
    textContent: text,
    querySelector(selector) {
      const value = queryMap[selector];
      return Array.isArray(value) ? value[0] || null : value || null;
    },
    querySelectorAll(selector) {
      const value = queryMap[selector];
      if (Array.isArray(value)) {
        return value;
      }
      return value ? [value] : [];
    }
  };
}

test("extract falls back to a cleaned company actor name for table-friendly company values", () => {
  const extractor = loadEntityExtractor();
  const companyAnchor = makeNode({ text: "Acme Labs Careers", href: "https://www.linkedin.com/company/acme-labs/" });
  const post = makeNode({
    queryMap: {
      "a[href*='/company/']": companyAnchor,
      ".update-components-actor__name, .feed-shared-actor__name, a[href*='/in/'], a[href*='/company/']": companyAnchor,
      ".update-components-actor__description, .feed-shared-actor__description, .update-components-actor__sub-description, .feed-shared-actor__sub-description": null
    }
  });

  const entities = extractor.extract(post, "We're hiring a Product Designer. Apply here.");
  assert.equal(entities.companyName, "Acme Labs");
  assert.equal(entities.authorType, "Company");
});

test("extract avoids noisy lowercase fragments as company names", () => {
  const extractor = loadEntityExtractor();
  const post = makeNode({
    queryMap: {
      "a[href*='/company/']": null,
      ".update-components-actor__name, .feed-shared-actor__name, a[href*='/in/'], a[href*='/company/']": null,
      ".update-components-actor__description, .feed-shared-actor__description, .update-components-actor__sub-description, .feed-shared-actor__sub-description": null
    }
  });

  const entities = extractor.extract(post, "We're hiring a Risk Analyst for our lending team in Mumbai. Apply here.");
  assert.equal(entities.companyName, "");
});

test("extract picks up company names that follow an at-company hiring phrase", () => {
  const extractor = loadEntityExtractor();
  const post = makeNode({
    queryMap: {
      "a[href*='/company/']": null,
      ".update-components-actor__name, .feed-shared-actor__name, a[href*='/in/'], a[href*='/company/']": null,
      ".update-components-actor__description, .feed-shared-actor__description, .update-components-actor__sub-description, .feed-shared-actor__sub-description": null
    }
  });

  const entities = extractor.extract(post, "Feed your hunger for great work. We're hiring a Group Creative Manager and more at One Hand Clap: https://lnkd.in/dJy5gscs");
  assert.equal(entities.companyName, "One Hand Clap");
});

test("extract picks up company names from leading at-company intros", () => {
  const extractor = loadEntityExtractor();
  const post = makeNode({
    queryMap: {
      "a[href*='/company/']": null,
      ".update-components-actor__name, .feed-shared-actor__name, a[href*='/in/'], a[href*='/company/']": null,
      ".update-components-actor__description, .feed-shared-actor__description, .update-components-actor__sub-description, .feed-shared-actor__sub-description": null
    }
  });

  const entities = extractor.extract(post, "At BabyOrgano, we believe growth doesn't stop at acquiring customers. We're looking for a Retention Marketing Executive.");
  assert.equal(entities.companyName, "BabyOrgano");
});

test("extract can derive a company name from nearby company context when a custom company email is present", () => {
  const extractor = loadEntityExtractor();
  const post = makeNode({
    queryMap: {
      "a[href*='/company/']": null,
      ".update-components-actor__name, .feed-shared-actor__name, a[href*='/in/'], a[href*='/company/']": null,
      ".update-components-actor__description, .feed-shared-actor__description, .update-components-actor__sub-description, .feed-shared-actor__sub-description": null
    }
  });

  const entities = extractor.extract(post, "I'm looking to grow the advisory business of Akum Investment Strategy & Co after receiving startup requests. If anyone is looking to join as an investment banking analyst, please reach out to akumsingh@akuminvestmentstrategy.com.");
  assert.equal(entities.companyName, "Akum Investment Strategy");
});

test("extract avoids broad at-company matches that are really descriptive phrases", () => {
  const extractor = loadEntityExtractor();
  const post = makeNode({
    queryMap: {
      "a[href*='/company/']": null,
      ".update-components-actor__name, .feed-shared-actor__name, a[href*='/in/'], a[href*='/company/']": null,
      ".update-components-actor__description, .feed-shared-actor__description, .update-components-actor__sub-description, .feed-shared-actor__sub-description": null
    }
  });

  const entities = extractor.extract(post, "We work on recommendation systems at YouTube scale and are hiring for ML efficiency roles.");
  assert.equal(entities.companyName, "");
});

test("extract identifies LinkedIn native starting-a-new-position cards separately from real job cards", () => {
  const extractor = loadEntityExtractor();
  const cardLabel = makeNode({ text: "Starting a new position" });
  const post = makeNode({
    text: "I'm happy to share that I'm starting a new position as Director, Product at InCred Financial Services!",
    queryMap: {
      "a[href*='/jobs/view/'], a[href*='/jobs/collections/'], a[href*='/talent/jobs/']": null,
      "a, button, span, div": [cardLabel]
    }
  });

  const entities = extractor.extract(post, "I'm happy to share that I'm starting a new position as Director, Product at InCred Financial Services!");
  assert.equal(entities.nativeCardType, "new-position");
  assert.equal(entities.hasNativeJobCard, false);
});

test("extract picks up roles from looking-to-hire phrasing", () => {
  const extractor = loadEntityExtractor();
  const post = makeNode({
    queryMap: {
      "a[href*='/company/']": null,
      ".update-components-actor__name, .feed-shared-actor__name, a[href*='/in/'], a[href*='/company/']": null,
      ".update-components-actor__description, .feed-shared-actor__description, .update-components-actor__sub-description, .feed-shared-actor__sub-description": null
    }
  });

  const entities = extractor.extract(post, "We're looking to hire Category Managers (M/SM) at Zepto with 1-3 years of relevant work experience. DM if this is relevant for you.");
  assert.equal(entities.roleTitle, "Category Managers (M/SM)");
});
