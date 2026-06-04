const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadClassifier() {
  const context = vm.createContext({
    console,
    window: {},
    globalThis: {},
    LinkedInHiringExtension: {}
  });
  context.window = context;
  context.globalThis = context;

  const root = path.join(__dirname, "..");
  for (const file of ["src/utils.js", "src/classifier.js"]) {
    const code = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInContext(code, context, { filename: file });
  }

  return context.LinkedInHiringExtension.classifier;
}

test("classifier marks starting-a-new-position announcements as no opening", () => {
  const classifier = loadClassifier();

  const result = classifier.scoreText("I'm happy to share that I'm starting a new position as Director, Product at InCred Financial Services!");

  assert.equal(result.label, "No Opening");
});

test("classifier marks looking-to-hire posts with DM outreach as open", () => {
  const classifier = loadClassifier();

  const result = classifier.scoreText("We're looking to hire Category Managers (M/SM) at Zepto with 1-3 years of relevant work experience, preferably working with FMCG brands in Home & Personal Care categories. DM if you think this is relevant for you and we'll get in touch with you :)");

  assert.equal(result.label, "Open");
});

test("classifier keeps consulting and AI case-study opinion posts as no opening", () => {
  const classifier = loadClassifier();

  const result = classifier.scoreText("A first-year analyst just did 2 days of work in 2 hours. So I asked the question nobody at the table wanted to answer: If a rookie with AI can do the work of a third-year... what exactly are we promoting people for? McKinsey's Lilli didn't just speed things up. The old pyramid was built on research being slow. Full breakdown of the case study here: https://lnkd.in/g4rnb55a What would you measure instead of hours?");

  assert.equal(result.label, "No Opening");
});

test("classifier lifts buried storytelling hiring posts to maybe", () => {
  const classifier = loadClassifier();

  const result = classifier.scoreText("Every great brand starts with someone willing to back an idea before the data does.\n\nA few years ago, I was meeting my tenth candidate for a marketing role that month.\n\nInterview after interview, everyone knew the metrics.\n\nThen came a candidate who asked better questions than everyone else.\n\nWhy do customers order biryani more on Fridays?\n\nWhy does someone come back after their first order?\n\nAt Rebel Foods, we've built brands that millions of people order out of love.\n\nWe're looking for more of those people.\n\nIf brand building feels like a calling rather than a job, we'd love to meet you.\n\nWe're not hiring marketers. We're looking for future brand builders.\n\nCome build with us.\n\nApplication link in comments.");

  assert.equal(result.label, "Maybe");
});

test("classifier keeps work-anniversary personal stories with apply again phrasing as no opening", () => {
  const classifier = loadClassifier();

  const result = classifier.scoreText("Another year at Zomato, another no Chat-Gpt post. The highlight of my second year was finally getting into the CKAM team. This wouldn't have been possible without my previous manager pushing me to apply again, and making sure I don't give up until I make him proud. Always grateful and loyal to Zomato, Eternal.");

  assert.equal(result.label, "No Opening");
});

test("classifier keeps revoked-offer self-seeking posts as no opening", () => {
  const classifier = loadClassifier();

  const result = classifier.scoreText("My FTE offer from Oracle was revoked as part of their recent mass revocation.\n\nOver the past 5 months I worked on real production systems - Kubernetes autoscaling with KEDA and Prometheus, XML automation pipelines, and CLI infrastructure tooling used across live service deployments.\n\nAbout me: NIT Patna, CSE | CGPA 9.68,\nOracle Intern - Cloud Infrastructure & DevOps,\nLeetCode Knight | Rating 1864 (Top 5.5% globally)\nStack: Java, Python, Kubernetes, Docker, Node.js, Linux\n\nActively looking for SDE-1 or DevOps/Platform Engineering roles with immediate joining.\nOpen to relocation anywhere in India.\nIf your team is hiring or you can refer me, I'd genuinely appreciate it. Resume attached.");

  assert.equal(result.label, "No Opening");
});
