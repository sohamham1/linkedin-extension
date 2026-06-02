const fs = require("fs");
const path = require("path");
const vm = require("vm");

const workspaceRoot = path.resolve(__dirname, "..");

function loadScript(relativePath, context) {
  const fullPath = path.join(workspaceRoot, relativePath);
  const code = fs.readFileSync(fullPath, "utf8");
  vm.runInContext(code, context, { filename: fullPath });
}

const context = vm.createContext({
  console,
  window: {},
  globalThis: {},
  location: {
    pathname: "/feed/"
  },
  setTimeout,
  clearTimeout
});

context.window = context;
context.globalThis = context;

loadScript("src/utils.js", context);
loadScript("src/classifier.js", context);
loadScript("src/entity-extractor.js", context);
loadScript("src/feed-observer.js", context);
loadScript("src/text-resolver.js", context);

const { classifier, entityExtractor, feedObserver, textResolver } = context.LinkedInHiringExtension;

const fixtures = [
  {
    name: "Open role with apply link",
    expected: "Open",
    text: "We're hiring a Backend Engineer in Bengaluru. Apply here: https://example.com/jobs/backend. Send your resume or DM me for details. #hiring"
  },
  {
    name: "Closed role update",
    expected: "Closed/Filled",
    text: "Update: the position has been filled. Applications closed. Thanks for the interest and all the messages."
  },
  {
    name: "Ambiguous growing team post",
    expected: "Maybe",
    text: "Our team is growing fast and we are looking for strong product thinkers. Link in comments. More details soon."
  },
  {
    name: "Leadership story",
    expected: "No Opening",
    text: "A leadership lesson I learned this year: clarity beats intensity. Sharing a story from my journey building teams."
  },
  {
    name: "False friend open to work",
    expected: "No Opening",
    text: "I am open to work after a great learning journey in growth and analytics. Would appreciate referrals."
  },
  {
    name: "Layoff and self-seeking post",
    expected: "No Opening",
    text: "I got laid off last month and I'm still processing it. If you're hiring a fraud or risk specialist, I'm open and looking. Would appreciate referrals and happy to connect."
  },
  {
    name: "Emergency help and referrals post",
    expected: "No Opening",
    text: "I have submitted over 10,000 applications and still need help. If anyone knows of remote jobs, freelance projects, contract work, referrals, or professional connections, please reach out. If you can support my GoFundMe, it would help."
  },
  {
    name: "Opinion post about AI and Figma",
    expected: "No Opening",
    text: "Figma is getting killed. AI is taking over. Few weeks back, Google launched Stitch and Anthropic launched Claude Design. Think about the bigger picture. Today, that entire middle layer is collapsing."
  },
  {
    name: "Career reflection post",
    expected: "No Opening",
    text: "I was 21 when I joined a venture internship and five years later I am still surprised how it worked out. Leaving was the hardest decision. There has been a growing itch to move to the operating side."
  },
  {
    name: "New role announcement",
    expected: "No Opening",
    text: "I am delighted to share that I have stepped into a new role as Director. Looking forward to the next phase and excited to start my new job. #newjob"
  },
  {
    name: "Career advice roles list",
    expected: "No Opening",
    text: "Adding my 2 cents on similar lines. As an aspiring product manager, if you are not able to break in then these are the roles that would be a good fit as well: founder's office, customer success manager, product analyst, category manager, brand manager, project manager. Do you agree? Follow for more career tips."
  },
  {
    name: "Founder hiring advice sales post",
    expected: "No Opening",
    text: "A founder burned 38 lakhs on a Head of AI hire who lasted 4 months. Takeaways worth saving: the title was the trap, hire 1 should have been an AI implementation engineer. If you are about to make this hire, I will tear down your job description and shortlist in 45 minutes. DM me AI hire this week. 5 founders only."
  },
  {
    name: "JEE reflection post",
    expected: "No Opening",
    text: "Would I recommend preparing for JEE? Never. It was a pressure cooker waiting to explode. I genuinely loved Physics and Mathematics, but that curiosity got replaced by cutthroat competition. JEE produces some of India's brightest engineers, but I wonder how many talented young people it convinced weren't good enough."
  },
  {
    name: "Starting a new role announcement",
    expected: "No Opening",
    text: "Excited to share that I am starting a new role as Senior Product Manager at Microsoft. Grateful for all the experiences, mentorship, friendships, and memories from this journey. Looking forward to this next chapter."
  },
  {
    name: "Explicit company hiring announcement",
    expected: "Open",
    text: "Hiring: Product Manager at Nykaa. Nykaa is hiring passionate Product Managers to join their growing team and work on innovative digital products and customer experiences. Company: Nykaa. Role: Product Manager. Requirements: Product Thinking, User Research, Cross-Functional Collaboration, Problem-Solving Skills. If you're interested, comment interested below."
  },
  {
    name: "Public sector hiring post with deadline",
    expected: "Open",
    text: "#HiringNow Take pride in energizing the nation with Bharat Petroleum Corporation Limited. Refer the attached file and the interested candidates can apply via the following link: https://lnkd.in/dgQtejEm. If you are an ambitious, qualified and versatile professional, we are looking for you. Last date for submission of application is 20.06.2026."
  },
  {
    name: "Broad multi-role hiring announcement",
    expected: "Open",
    text: "We are hiring. Not for everyone - we move fast, hold a high bar, and expect real ownership. If that's your kind of place, come build with us. From programs, fundraising, people & culture to finance, we have open positions across all levels, from interns to CXO, across Bangalore, Meghalaya, Tripura, Jharkhand, Seattle, Texas, Assam, Odisha. Find your place to make an impact: https://lnkd.in/gEqRJZpv The/Nudge Institute"
  },
  {
    name: "Founder story and product pitch",
    expected: "No Opening",
    text: "How did I go from a 9-to-5 employee to a CEO? Eight years ago, I arrived in the US with a clear path: Study hard. Get a good job. Chase the American dream. I did just that. I spent five years in consulting. But a question remained: What if I built something entirely mine? The answer came on my wedding day. Looking for a wedding band, I couldn't find a single piece that felt like me. The jewelry industry crafts breathtaking, intentional pieces for women. But for a man? You settle for a plain, mass-produced band. That never sat right with me. So my wife, Nika, left her career as a software engineer to build a fine jewelry brand from the ground up with me. When I put my custom-made wedding band on, it clicked: I am meant to revolutionize men's fine jewelry. That moment became AviNika. Our Legacy Collection is our answer to an industry that overlooked men. We choose to work with a limited number of clients at a time. If your legacy deserves more than a shelf piece, you may join the custom commission waitlist at: www.avinikajewelry.com"
  },
  {
    name: "Mentorship and consultant recommendation post",
    expected: "No Opening",
    text: "Don't skip the process. I had the privilege of having a 1:1 conversation with Jonathan Pipek two months ago. I learnt a lot about product marketing and decision making in that call. What I took away from him: being humble, giving back to the community, question your assumptions, own up mistakes and learn from them. He frequently dedicates time for mentorship on ADPlist and holds a monthly AMA for PMMs through Blue Manta Consulting. If you ever get a chance to work with him, or even speak to him, I would recommend not missing it for anything. For B2B SaaS companies looking for GTM help, you should reach out to him or his company. I would be making more posts about the amazing people I have recently spoken to. If there's anyone in the Product Marketing / GTM space that you recommend I speak to, do tag them and share their name."
  },
  {
    name: "Join us at company phrasing",
    expected: "Open",
    expectedCompanyName: "Acme Labs",
    text: "We're hiring a Product Designer to join us at Acme Labs in Bengaluru. Apply here: https://example.com/jobs/product-designer and share your portfolio."
  },
  {
    name: "Hiring post with title, experience range, and link",
    expected: "Open",
    text: "Feed your hunger for great work. We're hiring a Group Creative Manager (5-8 years of experience) and more at One Hand Clap: https://lnkd.in/dJy5gscs"
  },
  {
    name: "Finance title coverage",
    expected: "Open",
    text: "We're hiring a Risk Analyst for our lending team in Mumbai. Apply here: https://example.com/risk-analyst"
  },
  {
    name: "Gaming title coverage",
    expected: "Open",
    text: "We are hiring a Gameplay Designer to build combat systems for our next title. Apply now: https://example.com/gameplay-designer"
  },
  {
    name: "Publishing title coverage",
    expected: "Open",
    text: "We're hiring an Editorial Assistant to support our publishing team. Apply here: https://example.com/editorial-assistant"
  },
  {
    name: "Medical title coverage",
    expected: "Open",
    text: "We're hiring a Clinical Research Associate with 2-4 years of experience. Apply via the following link: https://example.com/cra-role"
  },
  {
    name: "Intern title coverage",
    expected: "Open",
    text: "We're hiring a Product Management Intern for summer 2026. Apply here: https://example.com/pm-intern"
  },
  {
    name: "Structured title-first JD post",
    expected: "Open",
    text: "Backend Engineer (Node.js)\n\nWe're building technology to solve some of the hardest problems faced by Indian SMBs — from intelligent automation and business intelligence to customer experience, marketing, and operations.\n\nIf you get excited by building products that actually impact businesses, enjoy solving complex engineering challenges, and probably spend more time thinking about technology than your partner would like, we should talk.\n\nWhat you'll work on\n- Building scalable backend systems using Node.js\n- Designing APIs and automation engines\n- Working on AI-powered workflows, business intelligence, and customer engagement platforms\n- Solving real-world problems for thousands of businesses\n\nWhat we care about\nWe don't care much about fancy resumes, degrees, or how many buzzwords you can fit into your LinkedIn headline.\n\nWe only have 3 checks:\nVibe Match – You'll be working closely with a small, passionate team. We value curiosity, ownership, and people who enjoy building.\nTech Check – Can you solve problems? Can you write clean code? Can you learn fast? That's what matters.\nGood Human Check – Skills can be taught. Character is harder. We want genuinely good people.\n\nYou'll probably enjoy this if\n- You love backend engineering and system design\n- You're curious about AI, automation, and business intelligence\n- You like taking ownership instead of waiting for instructions\n- You enjoy building products from first principles\n- You want your work to directly shape a company's future\n\nAbout Us\nWe're a chill, product-first company building technology at the intersection of business intelligence, intelligent automation, customer experience, and AI.\n\nNo corporate politics.\nNo unnecessary meetings.\n\nJust smart people building ambitious things.\nIf this sounds like your kind of place, let's talk (but first check the product wisemelon)."
  }
];

const results = fixtures.map((fixture) => {
  const result = classifier.scoreText(fixture.text);
  const entities = entityExtractor.extract({
    querySelector() {
      return null;
    }
  }, fixture.text);
  return {
    name: fixture.name,
    expected: fixture.expected,
    actual: result.label,
    expectedCompanyName: fixture.expectedCompanyName || "",
    entities: {
      companyName: entities.companyName,
      roleTitle: entities.roleTitle,
      authorType: entities.authorType,
      hasApplyLink: entities.hasApplyLink,
      hasEmail: entities.hasEmail
    },
    scores: {
      hiring: result.hiringScore,
      actionability: result.actionabilityScore,
      closure: result.closureScore,
      negative: result.negativeScore
    },
    reasons: result.reasons.slice(0, 5)
  };
});

function createMockNode(options) {
  const selectorMap = new Map(Object.entries(options.querySelectorAllMap || {}));
  const matchers = new Set(options.matches || []);
  const node = {
    innerText: options.text || "",
    textContent: options.text || "",
    parentElement: options.parentElement || null,
    querySelector(selector) {
      const list = this.querySelectorAll(selector);
      return list[0] || null;
    },
    querySelectorAll(selector) {
      return selectorMap.get(selector) || [];
    },
    matches(selector) {
      return String(selector || "")
        .split(",")
        .map((part) => part.trim())
        .some((part) => matchers.has(part));
    },
    closest(selector) {
      let current = this;
      while (current) {
        if (typeof current.matches === "function" && current.matches(selector)) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    },
    contains(other) {
      let current = other;
      while (current) {
        if (current === this) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    }
  };
  return node;
}

const actorAnchor = createMockNode({
  text: "Acme Labs Careers",
  matches: ["a"],
  querySelectorAllMap: {}
});

const likeButton = createMockNode({ text: "Like", matches: ["button"], querySelectorAllMap: {} });
const commentButton = createMockNode({ text: "Comment", matches: ["button"], querySelectorAllMap: {} });

const shortHiringPost = createMockNode({
  text: "We're hiring a backend engineer at Acme Labs. Apply here: https://example.com/jobs/backend",
  matches: ["div", "div.feed-shared-update-v2"],
  querySelectorAllMap: {
    "a[href*='/in/'], a[href*='/company/']": [actorAnchor],
    "button, a, span": [actorAnchor, likeButton, commentButton]
  }
});

actorAnchor.parentElement = shortHiringPost;
likeButton.parentElement = shortHiringPost;
commentButton.parentElement = shortHiringPost;

const commentActorAnchor = createMockNode({
  text: "Raunak Yadush",
  matches: ["a"],
  querySelectorAllMap: {}
});

const commentLikeButton = createMockNode({ text: "Like", matches: ["button"], querySelectorAllMap: {} });
const commentReplyButton = createMockNode({ text: "Comment", matches: ["button"], querySelectorAllMap: {} });
const postPermalink = createMockNode({
  text: "Permalink",
  matches: ["a"],
  querySelectorAllMap: {}
});

const commentThreadNode = createMockNode({
  text: "Raunak Yadush Founder & CTO The funniest thing is how seriously people discuss predictions like they are in team management Like Comment",
  matches: ["div", "[componentkey*='replaceableComment_']"],
  querySelectorAllMap: {
    "a[href*='/in/'], a[href*='/company/']": [commentActorAnchor],
    "button, a, span": [commentActorAnchor, commentLikeButton, commentReplyButton]
  }
});

commentActorAnchor.parentElement = commentThreadNode;
commentLikeButton.parentElement = commentThreadNode;
commentReplyButton.parentElement = commentThreadNode;
postPermalink.parentElement = null;

const detailActorAnchor = createMockNode({
  text: "Daria Quadratus",
  matches: ["a"],
  querySelectorAllMap: {}
});

const detailPostNode = createMockNode({
  text: "I am thrilled to announce that I have been laid off from my job as a machine learning engineer at meta! I am excited to begin the next phase of my life, which will involve more time to go to the gym, hang out with my dog, and work on my personal projects. If anyone would like to stay up til 3am playing video games on a weekday, please dont hesitate to reach out!",
  matches: ["article"],
  querySelectorAllMap: {
    "a[href*='/in/'], a[href*='/company/']": [detailActorAnchor],
    "button, a, span": [detailActorAnchor, postPermalink],
    "a[href*='/posts/'], a[href*='/feed/update/'], a[href*='/activity-']": [postPermalink]
  }
});

detailActorAnchor.parentElement = detailPostNode;
postPermalink.parentElement = detailPostNode;

const structuredTextNode = createMockNode({
  text: "Backend Engineer (Node.js)\n\nWe're building technology to solve some of the hardest problems faced by Indian SMBs.\n\nWhat you'll work on\n- Building scalable backend systems using Node.js\n- Designing APIs and automation engines\n- Solving real-world problems for thousands of businesses\n\nWhat we care about\nWe only have 3 checks.\n\nYou'll probably enjoy this if\n- You love backend engineering and system design\n- You like taking ownership instead of waiting for instructions\n\nAbout Us\nWe're a chill, product-first company building ambitious things.",
  matches: ["div", ".update-components-text"],
  querySelectorAllMap: {}
});

const structuredTextPost = createMockNode({
  text: "Outer wrapper text",
  matches: ["article"],
  querySelectorAllMap: {
    ".update-components-text": [structuredTextNode],
    ".feed-shared-update-v2__description": [],
    ".feed-shared-inline-show-more-text": [],
    "span.break-words": [],
    "div[dir='ltr']": [],
    "span[dir='ltr']": []
  }
});

structuredTextNode.parentElement = structuredTextPost;

function runFeedObserverScenario(pathname, querySelectorAll) {
  context.location.pathname = pathname;
  context.document = {
    body: {},
    querySelectorAll
  };
  return feedObserver.findPosts();
}

const feedObserverChecks = [
  {
    name: "Short explicit hiring post is still detected",
    expectedCount: 1,
    actualCount: runFeedObserverScenario("/feed/", (selector) => {
      if (selector === "div.feed-shared-update-v2") {
        return [shortHiringPost];
      }
      if (selector === "div[data-id*='urn:li:activity:']") {
        return [];
      }
      if (selector === "a[href*='/in/'], a[href*='/company/']") {
        return [actorAnchor, commentActorAnchor];
      }
      return [];
    }).length
  },
  {
    name: "Modern LinkedIn comment threads are excluded",
    expectedCount: 0,
    actualCount: runFeedObserverScenario("/feed/", (selector) => {
      if (selector === "div.feed-shared-update-v2") {
        return [shortHiringPost];
      }
      if (selector === "div[data-id*='urn:li:activity:']") {
        return [];
      }
      if (selector === "a[href*='/in/'], a[href*='/company/']") {
        return [actorAnchor, commentActorAnchor];
      }
      return [];
    }).filter((node) => node === commentThreadNode).length
  },
  {
    name: "Single-post detail pages without inline action rows are still detected",
    expectedCount: 1,
    actualCount: runFeedObserverScenario("/posts/dquadratus/some-post-id/", (selector) => {
      if (selector === "div.feed-shared-update-v2") {
        return [];
      }
      if (selector === "div[data-id*='urn:li:activity:']") {
        return [];
      }
      if (selector === "a[href*='/in/'], a[href*='/company/']") {
        return [detailActorAnchor];
      }
      return [];
    }).length
  }
];

const stylesSource = fs.readFileSync(path.join(workspaceRoot, "src/styles.css"), "utf8");
const noneBadgeRuleMatch = stylesSource.match(/\.lihpd-badge\.is-none\s*\{([\s\S]*?)\}/);
const styleChecks = [
  {
    name: "No Opening badge keeps absolute positioning",
    passed: !noneBadgeRuleMatch || !/position\s*:/.test(noneBadgeRuleMatch[1])
  },
  {
    name: "No Opening badge keeps gradient border accent styling",
    passed: /rgba\(220,\s*38,\s*38,\s*0\.34\)/.test(stylesSource)
      && /background:\s*#b91c1c;/.test(stylesSource)
      && /border-color:\s*rgba\(127,\s*29,\s*29,\s*0\.16\);/.test(stylesSource)
      && /color:\s*#475467;/.test(stylesSource)
      && !/padding:\s*10px 16px;/.test(noneBadgeRuleMatch ? noneBadgeRuleMatch[1] : "")
      && !/font:\s*600 15px\/1/.test(noneBadgeRuleMatch ? noneBadgeRuleMatch[1] : "")
  }
];

const classifierSource = fs.readFileSync(path.join(workspaceRoot, "src/classifier.js"), "utf8");
const roleTitleSignalsMatch = classifierSource.match(/const ROLE_TITLE_SIGNALS = \[([\s\S]*?)\];/);
const roleTitleCount = roleTitleSignalsMatch
  ? (roleTitleSignalsMatch[1].match(/"/g) || []).length / 2
  : 0;
const vocabularyChecks = [
  {
    name: "Role title coverage stays above 200 titles",
    expectedMinimum: 200,
    actualCount: roleTitleCount
  }
];

const nativeJobEntities = entityExtractor.extract({
  querySelector(selector) {
    if (selector === "a[href*='/jobs/view/'], a[href*='/jobs/collections/'], a[href*='/talent/jobs/']") {
      return { href: "https://www.linkedin.com/jobs/view/1234567890/" };
    }
    return null;
  },
  querySelectorAll() {
    return [];
  }
}, "Calling ex-founders. We're hiring Entrepreneurs in Residence at Hobfit.");

const resolvedStructuredText = textResolver.resolve(structuredTextPost).fullText;
const structuredResolutionCheck = {
  name: "Resolved post text preserves title and bullet structure for JD scoring",
  expected: "Open",
  actual: classifier.scoreText(resolvedStructuredText).label
};

const failed = results.filter((result) => result.expected !== result.actual
  || (result.expectedCompanyName && result.entities.companyName !== result.expectedCompanyName));
const failedFeedObserverChecks = feedObserverChecks.filter((check) => check.actualCount !== check.expectedCount);
const failedStyleChecks = styleChecks.filter((check) => !check.passed);
const failedVocabularyChecks = vocabularyChecks.filter((check) => check.actualCount < check.expectedMinimum);

console.log(JSON.stringify({
  passed: failed.length === 0 && failedFeedObserverChecks.length === 0 && failedStyleChecks.length === 0 && failedVocabularyChecks.length === 0,
  results,
  feedObserverChecks,
  structuredResolutionCheck,
  styleChecks,
  vocabularyChecks,
  nativeJobCardCheck: {
    detected: nativeJobEntities.hasNativeJobCard === true
  },
  failedCount: failed.length
    + failedFeedObserverChecks.length
    + failedStyleChecks.length
    + failedVocabularyChecks.length
    + (structuredResolutionCheck.actual !== structuredResolutionCheck.expected ? 1 : 0)
}, null, 2));
process.exit(
  failed.length === 0
  && failedFeedObserverChecks.length === 0
  && failedStyleChecks.length === 0
  && failedVocabularyChecks.length === 0
  && structuredResolutionCheck.actual === structuredResolutionCheck.expected
    ? 0
    : 1
);
