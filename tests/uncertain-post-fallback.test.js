const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadRuntime() {
  const context = vm.createContext({
    console,
    window: {},
    globalThis: {},
    LinkedInHiringExtension: {}
  });
  context.window = context;
  context.globalThis = context;

  const root = path.join(__dirname, "..");
  for (const file of ["src/utils.js", "src/classifier.js", "src/entity-extractor.js", "src/uncertain-post-fallback.js"]) {
    const code = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInContext(code, context, { filename: file });
  }

  return context.LinkedInHiringExtension;
}

test("uncertain post fallback promotes buried hiring stories from no opening to maybe", () => {
  const runtime = loadRuntime();
  const text = "Every great brand starts with someone willing to back an idea before the data does. A few years ago, I was meeting my tenth candidate for a marketing role that month. Interview after interview, everyone knew the metrics. Then came a candidate who asked better questions than everyone else. At Rebel Foods, we've built brands that millions of people order out of love. We're looking for more of those people. If brand building feels like a calling rather than a job, we'd love to meet you. We're not hiring marketers. We're looking for future brand builders. Come build with us. Application link in comments.";
  const result = runtime.classifier.scoreText(text);
  const entities = runtime.entityExtractor.extract({
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  }, text);

  const fallback = runtime.uncertainPostFallback.evaluate(text, {
    ...result,
    label: "No Opening"
  }, entities);

  assert.equal(fallback.promotedLabel, "Maybe");
  assert.equal(fallback.used, true);
});

test("uncertain post fallback does not promote consulting case-study posts", () => {
  const runtime = loadRuntime();
  const text = "A first-year analyst just did 2 days of work in 2 hours. So I asked the question nobody at the table wanted to answer: If a rookie with AI can do the work of a third-year, what exactly are we promoting people for? McKinsey's Lilli didn't just speed things up. The old pyramid was built on research being slow. Full breakdown here: https://lnkd.in/g4rnb55a What would you measure instead of hours?";
  const result = runtime.classifier.scoreText(text);
  const entities = runtime.entityExtractor.extract({
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  }, text);

  const fallback = runtime.uncertainPostFallback.evaluate(text, result, entities);

  assert.equal(fallback.promotedLabel, "No Opening");
});
