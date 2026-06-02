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
  setTimeout,
  clearTimeout
});

context.window = context;
context.globalThis = context;

loadScript("src/utils.js", context);
loadScript("src/classifier.js", context);
loadScript("src/entity-extractor.js", context);

const { classifier, entityExtractor } = context.LinkedInHiringExtension;

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

const failed = results.filter((result) => result.expected !== result.actual);

console.log(JSON.stringify({
  passed: failed.length === 0,
  results,
  nativeJobCardCheck: {
    detected: nativeJobEntities.hasNativeJobCard === true
  },
  failedCount: failed.length
}, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
