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
loadScript("src/uncertain-post-fallback.js", context);

const { classifier, entityExtractor, feedObserver, textResolver, uncertainPostFallback } = context.LinkedInHiringExtension;

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
    name: "Starting a new position announcement",
    expected: "No Opening",
    text: "I'm happy to share that I'm starting a new position as Director, Product at InCred Financial Services!"
  },
  {
    name: "Looking-to-hire DM outreach post",
    expected: "Open",
    text: "We're looking to hire Category Managers (M/SM) at Zepto with 1-3 years of relevant work experience, preferably working with FMCG brands in Home & Personal Care categories. DM if you think this is relevant for you and we'll get in touch with you :)"
  },
  {
    name: "Consulting AI case-study opinion post",
    expected: "No Opening",
    text: "A first-year analyst just did 2 days of work in 2 hours. So I asked the question nobody at the table wanted to answer: If a rookie with AI can do the work of a third-year... what exactly are we promoting people FOR? McKinsey's Lilli didn't just speed things up. The old pyramid was built on research being slow. Full breakdown of the case study here: https://lnkd.in/g4rnb55a What would you measure instead of hours? Curious how you'd score judgment."
  },
  {
    name: "Buried storytelling hiring CTA post",
    expected: "Maybe",
    text: "Every great brand starts with someone willing to back an idea before the data does.\n\nA few years ago, I was meeting my tenth candidate for a marketing role that month.\n\nInterview after interview — CAC, retention, ROAS, funnels, cohorts.\n\nTechnically solid.\n\nEveryone knew the metrics.\n\nAnd after a while, every conversation started to sound the same.\n\nThen came a candidate who asked better questions than everyone else.\n\nWhy do customers order biryani more on Fridays?\n\nWhy does someone come back after their first order? And equally important, why don’t they?\n\nWhy does a family choose us for birthdays, celebrations and game nights?\n\nAt Rebel Foods, we’ve built brands that millions of people order out of love.\n\nWe’re looking for more of those people.\n\nIf brand building feels like a calling rather than a job, we’d love to meet you.\n\nWe’re not hiring marketers. We’re looking for future brand builders.\n\nCome build with us.\n\nApplication link in comments"
  },
  {
    name: "Work anniversary apply again personal story",
    expected: "No Opening",
    text: "Another year at Zomato, another no Chat-Gpt Post. The highlight of my second year was finally getting into the CKAM team. This wouldn't have been possible without my previous manager pushing me to apply again, and making sure I don't give up until I make him proud. Always grateful and loyal to Zomato, Eternal."
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
  },
  {
    name: "Unicode hiring post with profile share CTA",
    expected: "Open",
    text: "We’re Hiring | Retention Marketing Executive 🚀\n\nAt BabyOrgano, we believe growth doesn’t stop at acquiring customers it’s about building relationships that last.\n\nWe’re looking for a Retention Marketing Executive who understands customer behavior, engagement, and how to turn first-time buyers into loyal brand advocates.\n\nIf you have experience in:\n• Email & WhatsApp Marketing\n• Customer engagement campaigns\n• CRM & retention strategies\n• Lifecycle marketing & automation\n• Improving repeat purchases & customer loyalty\nwe’d love to connect with you.\n\nWhat you’ll do:\n• Plan & execute retention campaigns across Email, WhatsApp, SMS & Push Notifications\n• Create personalized customer journeys & engagement flows\n• Analyze retention metrics, customer behavior & campaign performance\n• Work closely with marketing & creative teams for impactful communication\n• Build strategies to improve repeat purchase rates & customer loyalty\n\nWhat we’re looking for:\n• Creative + data-driven mindset\n• Understanding of customer psychology\n• Strong communication & analytical skills\n• Experience in D2C / E-commerce / Consumer Brands preferred\n\nLocation: Ahmedabad\nExperience: 2–4 Years\n\nShare your profile at: https://lnkd.in/dzTh55nc"
  },
  {
    name: "Investment banking and consulting outreach hiring post",
    expected: "Open",
    text: "Hi, I’m looking to grow the advisory business of Akum Investment Strategy & Co after receiving 100s of startup requests.\n\nIf anyone is looking to join as an investment banking analyst/consultant for startups. Please reach out to akumsingh@akuminvestmentstrategy.com or DM."
  },
  {
    name: "Open across founding team roles",
    expected: "Open",
    text: "Looking for smart, ambitious people who want to be part of a founding team and learn by building.\n\nOpen across:\n• Generalist\n• Design & Creative\n• Business Development\n• Supply Chain & Operations\n\nIf you’re excited by ownership, problem-solving, and growth, send your profile to neel@vmjewellery.com\n\nLocation : Mumbai"
  },
  {
    name: "GTM and key accounts coverage",
    expected: "Open",
    text: "We’re hiring a GTM Associate and a Key Account Manager to help us scale distribution. Send your profile to careers@example.com."
  },
  {
    name: "CEO office and climate coverage",
    expected: "Open",
    text: "Open roles: CEO's Office Associate and Climate Associate. If this sounds like you, email us at team@example.com."
  },
  {
    name: "Deep ML systems hiring post with L-bands",
    expected: "Open",
    text: "YouTube’s Discovery ML Efficiency team is growing, and I’m looking for a few engineers to join us!\n\nWe’re a horizontal team working across all Discovery surface models (nomination, ranking, etc.). Our core mission is to make YouTube’s recommendation systems run faster and cheaper, while unblocking massive model scaling on the latest TPU hardware.\n\nWhy join this team?\n- High impact: Historically, our team has delivered double-digit YoY performance gains across our TPU footprint.\n- End-to-End Ownership: While we work closely with quality, infra, and data engineers, XLA compiler teams, and Google Research, our engineers actively modify the models we service, run experiments, and own launches across both training and serving.\n- A Unique Tech Stack: If you read most RecSys papers today, the focus is entirely on GPUs. We work exclusively on TPUs. This means we tackle a unique, highly specialized set of architectural and low-level challenges you won't encounter in a standard GPU environment.\n\nWe have two main areas we're hiring for right now:\n\nTech Lead for Modeling Efficiency (L6/L7) You’ll guide how our model architectures evolve alongside our hardware. You’ll bridge the gap between model quality engineers and our next-generation hardware evaluation teams to define what the future of RecSys looks like at YouTube scale. Ideally you have RecSys modeling experience and have enjoyed optimizing your launches.\nXLA / Low-Level TPU Developers (L3 to L6) Looking for folks who genuinely enjoy compilers, low-level optimization, and squeezing every bit of performance out of custom silicon. Ideally, you have GPU kernel experience or a background with GPU/XLA compilers.\n\nIf this sounds like a challenge you're up for, drop me (or Smit Hinsu) a DM or tag anyone in the comments who might be interested!\n\nI'll post links to the job posts in the comments below."
  },
  {
    name: "Executive revenue leadership hiring post",
    expected: "Open",
    text: "We’re looking for someone to lead revenue at E2M.\n\nPosition could be: Head of Revenue OR Chief Revenue Officer\n\nThis role will own both sides of revenue growth:\n\nPre-sales: bringing in new customers and building a strong new business engine. (Does not include Marketing)\n\nPost-sales: growing revenue from existing customers through deeper relationships, expansion, and stronger client success.\n\nThis is an exciting opportunity for someone who wants to play a different game.\n\nE2M is growing fast. We are building a category-leading white label partner for digital agencies, and this role will play a key part in shaping the next phase of our growth.\n\nWe are looking for someone who understands the agency ecosystem, knows how digital agencies think, and has experience working with the US market.\n\nThis is not just a sales leadership role. It’s a chance to help build the revenue function of a high-growth company with strong momentum, a great team, and a very clear direction.\n\nP.S. Please do not apply if you do not have experience with the US market and have not worked in the digital agency ecosystem, especially in the white label space.\n\nIf this sounds like you, or someone you know, I’d love to connect."
  }
];

function resolveFinalLabel(result, entities, text) {
  if (entities.nativeCardType === "new-position") {
    return "No Opening";
  }
  if (entities.nativeCardType === "job") {
    return "Open";
  }
  return uncertainPostFallback.evaluate(text, result, entities).promotedLabel;
}

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
    actual: resolveFinalLabel(result, entities, fixture.text),
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

const vocabularyChecks = [
  {
    name: "Role title coverage stays above 200 titles",
    expectedMinimum: 200,
    actualCount: classifier.roleTitleCount || 0
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

const startingPositionEntities = entityExtractor.extract({
  querySelector() {
    return null;
  },
  querySelectorAll(selector) {
    if (selector === "a, button, span, div") {
      return [{ innerText: "Starting a new position", textContent: "Starting a new position" }];
    }
    return [];
  }
}, "I'm happy to share that I'm starting a new position as Director, Product at InCred Financial Services!");

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
  startingPositionCardCheck: {
    detectedAsNewPosition: startingPositionEntities.nativeCardType === "new-position",
    treatedAsJobCard: startingPositionEntities.hasNativeJobCard === true
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
