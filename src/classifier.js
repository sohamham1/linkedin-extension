(function () {
  const NS = window.LinkedInHiringExtension;
  const { normalizeText, extractUrls, extractEmails } = NS.utils;

  const ROLE_TITLE_SIGNALS = [
    "accountant", "accounts executive", "accounts manager", "actuary", "ad operations manager",
    "ad sales manager", "admissions counselor", "admissions manager", "aerospace engineer", "agile coach",
    "android developer", "animator", "applied scientist", "architect", "art director",
    "art producer", "associate consultant", "associate editor", "associate product manager", "associate producer",
    "associate scientist", "auditor", "automation engineer", "backend developer", "backend engineer",
    "banker", "bi analyst", "bi developer", "big data engineer", "billing specialist",
    "bioinformatician", "biologist", "biomedical engineer", "brand designer", "brand manager",
    "business analyst", "business consultant", "business development executive", "business development manager", "business intelligence analyst",
    "business intelligence developer", "campaign manager", "cardiologist", "care coordinator", "care manager",
    "care navigator", "care specialist", "case manager", "category manager", "chemical engineer",
    "chief of staff", "civil engineer", "claims analyst", "clinical data manager", "clinical operations manager",
    "clinical pharmacist", "clinical psychologist", "clinical researcher", "clinical research associate", "cloud architect",
    "cloud engineer", "comms manager", "community manager", "compliance analyst", "compliance manager",
    "concept artist", "content creator", "content designer", "content editor", "content manager",
    "content marketer", "content producer", "content specialist", "copy editor", "copywriter",
    "corporate banker", "credit analyst", "creative director", "creative manager", "crm manager",
    "customer success associate", "customer success manager", "customer support engineer", "customer support specialist", "cybersecurity analyst",
    "cybersecurity engineer", "data analyst", "data architect", "data engineer", "data governance analyst",
    "data governance manager", "data scientist", "database administrator", "delivery manager", "demand generation manager",
    "dentist", "dermatologist", "design engineer", "design manager", "devops engineer",
    "digital marketing manager", "digital strategist", "director of engineering", "director of product", "doctor",
    "ecommerce manager", "editor", "editorial assistant", "editorial manager", "electrical engineer",
    "embedded engineer", "embedded software engineer", "environment artist", "environmental engineer", "epidemiologist",
    "er nurse", "event manager", "executive assistant", "facility manager", "finance analyst",
    "finance manager", "financial advisor", "financial analyst", "financial controller", "financial planner",
    "financial writer", "firmware engineer", "founding designer", "founding engineer", "founding pm",
    "frontend developer", "frontend engineer", "full stack developer", "full stack engineer", "game designer",
    "game developer", "game economy designer", "game producer", "game programmer", "game writer",
    "gameplay designer", "gameplay engineer", "general manager", "general physician", "genomics analyst",
    "graphic designer", "group creative manager", "growth analyst", "growth associate", "growth lead",
    "growth manager", "hardware engineer", "head of content", "head of design", "head of growth",
    "head of marketing", "head of partnerships", "head of product", "head of sales", "hr business partner",
    "hr generalist", "hr manager", "illustrator", "industrial designer", "inside sales representative",
    "instructional designer", "insurance advisor", "insurance underwriter", "integrated marketing manager", "interaction designer",
    "ios developer", "ios engineer", "investment analyst", "investment banker", "investment associate",
    "journalist", "laboratory technician", "legal associate", "legal counsel", "level designer",
    "logistics manager", "machine learning engineer", "machine learning scientist", "management consultant", "managing editor",
    "manufacturing engineer", "market research analyst", "marketing analyst", "marketing associate", "marketing coordinator",
    "marketing lead", "marketing manager", "media buyer", "media planner", "medical advisor",
    "medical assistant", "medical coder", "medical director", "medical officer", "medical representative",
    "medical science liaison", "medical writer", "merchandiser", "ml engineer", "mobile developer",
    "mobile engineer", "motion designer", "motion graphics designer", "narrative designer", "network engineer",
    "nurse", "nurse practitioner", "occupational therapist", "oncologist", "operations analyst",
    "operations associate", "operations executive", "operations manager", "orthopedic surgeon", "partnerships manager",
    "pathologist", "patient coordinator", "patient counselor", "patient success manager", "performance marketer",
    "pharmacist", "photographer", "physician", "pipeline td", "planner",
    "portfolio manager", "pricing analyst", "principal engineer", "principal product manager", "producer",
    "product analyst", "product designer", "product lead", "product manager", "product marketing manager",
    "product owner", "product strategist", "program manager", "project coordinator", "project manager",
    "prompt engineer", "psychiatrist", "psychologist", "publisher", "publishing editor",
    "qa analyst", "qa engineer", "quality assurance engineer", "quant analyst", "quant researcher",
    "radiologist", "react developer", "react native developer", "recruiter", "research analyst",
    "research assistant", "research associate", "research scientist", "revenue operations manager", "risk analyst",
    "risk manager", "sales associate", "sales development representative", "sales executive", "sales manager",
    "sales operations analyst", "sales operations manager", "scrum master", "security analyst", "security engineer",
    "seo manager", "seo specialist", "site reliability engineer", "social media manager", "social media strategist",
    "software architect", "software developer", "software development engineer", "software engineer", "solutions architect",
    "solutions consultant", "solutions engineer", "sound designer", "speech therapist", "sports medicine doctor",
    "staff accountant", "staff engineer", "strategy analyst", "strategy manager", "studio manager",
    "supply chain analyst", "supply chain manager", "surgeon", "systems analyst", "systems engineer",
    "talent acquisition partner", "talent acquisition specialist", "technical artist", "technical consultant", "technical lead",
    "technical product manager", "technical program manager", "technical recruiter", "technical support engineer", "technical writer",
    "test engineer", "trader", "treasury analyst", "ui designer", "ui engineer",
    "underwriter", "unity developer", "unity engineer", "unreal developer", "unreal engineer",
    "ux designer", "ux researcher", "vfx artist", "video editor", "video producer",
    "visual designer", "web designer", "web developer", "writer", "xray technician",
    "intern", "internship", "summer intern", "winter intern", "management trainee",
    "graduate engineer trainee", "trainee engineer", "analyst intern", "developer intern", "engineering intern",
    "software engineer intern", "backend engineer intern", "frontend engineer intern", "full stack intern", "product intern",
    "product management intern", "product design intern", "ux intern", "ui ux intern", "design intern",
    "graphic design intern", "marketing intern", "content intern", "finance intern", "investment banking intern",
    "research intern", "data analyst intern", "data science intern", "machine learning intern", "qa intern",
    "hr intern", "operations intern", "sales intern", "business analyst intern", "editorial intern",
    "media intern", "game design intern", "gameplay programmer intern", "medical intern", "clinical intern"
  ];

  const PHRASE_GROUPS = {
    hiringStrong: [
      "we're hiring", "we are hiring", "hiring now", "join our team",
      "open role", "open roles", "job opening", "vacancy", "hiring for", "immediate opening",
      "urgent hiring", "actively hiring", "#hiring", "#hiringnow", "open positions"
    ],
    roleTitles: ROLE_TITLE_SIGNALS,
    applySignals: [
      "apply", "apply here", "apply now", "job description", "jd", "resume", "cv",
      "send your profile", "dm me", "drop your resume", "email me", "careers page",
      "link in comments", "google form", "application form", "submit your application",
      "apply via the following link"
    ],
    growthSignals: [
      "team is growing", "building our team", "we are growing", "expanding our team",
      "hiring across", "multiple openings", "new opening", "across all levels",
      "come build with us", "find your place"
    ],
    actionabilityStrong: [
      "accepting applications", "open until", "currently hiring", "still hiring",
      "actively hiring", "interviewing now", "applications open",
      "last date for submission of application", "last date to apply"
    ],
    closedSignals: [
      "applications closed", "application closed", "position filled", "role filled",
      "hiring closed", "no longer hiring", "opening closed", "we've hired", "we have hired",
      "position has been filled", "not accepting applications", "this role is closed",
      "thanks for the interest", "we received many applications", "vacancy is now closed",
      "role has been filled"
    ],
    negativeSignals: [
      "open to work", "hiring manager", "hiring freeze", "if i were hiring", "not hiring",
      "future hiring plans", "lessons learned", "what i learned", "leadership", "my journey",
      "reflection", "gratitude", "story", "thread", "hot take", "i realized"
    ],
    selfSeekingSignals: [
      "i got laid off", "got laid off", "i was laid off", "i'm open and looking",
      "i am open and looking", "if you're hiring", "if you are hiring", "happy to connect",
      "would appreciate referrals", "open for work", "i'm looking for my next role",
      "i am looking for my next role", "looking for my next opportunity", "seeking new opportunities",
      "remote jobs", "freelance projects", "contract work", "professional connections", "gofundme",
      "please reach out", "i need an opportunity", "i need help", "i desperately need"
    ],
    personalAnnouncementSignals: [
      "i'm delighted to share", "i am delighted to share", "i'm excited to share",
      "i am excited to share", "stepped into a new role", "start my new job", "#newjob",
      "looking forward to the next phase", "excited to start my new job", "joined as",
      "promotion", "promoted to", "moved to the operating side", "starting a new role as",
      "starting a new role", "looking forward to this next chapter", "grateful for all the experiences"
    ],
    opinionSignals: [
      "what's exactly happening", "what is exactly happening", "think about the bigger picture",
      "ai is taking over", "market has already priced it", "few weeks back", "but honestly",
      "forget figma for a second", "today, that entire middle layer is collapsing"
    ],
    adviceSignals: [
      "adding my 2 cents", "must read below post", "do you agree?", "career tips",
      "these are the roles that would be a good fit", "aspiring product manager",
      "you can internally transition", "good fit as well", "for more career tips",
      "students", "guidance"
    ],
    consultingSignals: [
      "takeaways worth saving", "skip this if your team already ships",
      "if you are about to make this hire", "if you're about to make this hire",
      "i will tear down your job description", "shortlist in 45 minutes",
      "5 founders only", "founder still does not have", "the title was the trap",
      "hire 1 should have been", "title is boring. output is real"
    ],
    commercialSignals: [
      "custom commission", "waitlist", "limited number of clients", "legacy collection",
      "fashion week", "fine jewelry", "brand from the ground up", "our answer to an industry",
      "wedding band", "clients at a time", "wearable monument"
    ],
    endorsementSignals: [
      "had the privilege of having", "what i took away", "giving back to the community",
      "monthly ama", "reach out to him or his company", "recommend i speak to",
      "if you ever get a chance to work with him", "mentorship on adplist",
      "do tag them", "share their name"
    ]
  };

  function escapeForRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function phraseMatches(text, phrase) {
    const escapedPhrase = escapeForRegex(phrase);
    const pattern = new RegExp(`(^|[^a-z0-9])${escapedPhrase}($|[^a-z0-9])`, "i");
    return pattern.test(text);
  }

  function phraseHits(text, phrases) {
    return phrases.filter((phrase) => phraseMatches(text, phrase));
  }

  function hasNearbyNegation(text, keyword) {
    const pattern = new RegExp(`(?:not|no|never|isn't|aren't|wasn't|weren't)\\s+(?:\\w+\\s+){0,3}${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    return pattern.test(text);
  }

  function hasExplicitHiringAnnouncement(text) {
    return /(^|[^a-z0-9])hiring\s*:\s+[a-z]/i.test(text)
      || /(^|[^a-z0-9])[a-z0-9&.' -]+\s+is hiring([^a-z0-9]|$)/i.test(text);
  }

  function hasStructuredRoleBlock(text) {
    return phraseMatches(text, "company:") || phraseMatches(text, "role:");
  }

  function hasHiringLookingForContext(text) {
    return /\blooking for\s+(?:strong\s+|passionate\s+|experienced\s+|talented\s+|driven\s+|ambitious\s+)?(?:engineers?|developers?|designers?|analysts?|product thinkers?|product managers?|interns?|marketers?|recruiters?|salespeople|sales leaders|founding engineers?|candidates|talent|folks|people)\b/i.test(text);
  }

  function hasInlineHiringRole(text) {
    return /\b(?:we(?:'re| are)? hiring|hiring)\s+(?:an?|for)?\s*[a-z][a-z0-9/&,+()' -]{2,80}\b/i.test(text);
  }

  function hasExperienceRequirement(text) {
    return /\b\d+\s*[-–]\s*\d+\s+years?\s+of\s+experience\b/i.test(text)
      || /\b\d+\+?\s+years?\s+of\s+experience\b/i.test(text);
  }

  function hasTitleLead(rawText) {
    const firstLine = String(rawText || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);

    if (!firstLine || firstLine.length > 90) {
      return false;
    }

    const normalizedFirstLine = normalizeText(firstLine);
    return phraseHits(normalizedFirstLine, ROLE_TITLE_SIGNALS).length > 0
      && /\b[a-z][a-z0-9.+/& -]*(?:\([^)]{2,40}\))?\s*$/i.test(firstLine);
  }

  function hasStructuredJobDescription(rawText, text) {
    const headingPattern = /\b(?:what you'll work on|what you will work on|what you'll do|what you will do|what we care about|you'll probably enjoy this if|you will probably enjoy this if|about us|about the role|responsibilities|requirements|who you are)\b/gi;
    const headings = text.match(headingPattern) || [];
    const bulletLines = String(rawText || "").match(/^\s*[-*•]\s+\S+/gm) || [];
    return headings.length >= 2 && bulletLines.length >= 3;
  }

  function scoreText(rawText) {
    const text = normalizeText(rawText);
    const urls = extractUrls(rawText);
    const emails = extractEmails(rawText);

    const hits = {
      hiringStrong: phraseHits(text, PHRASE_GROUPS.hiringStrong),
      roleTitles: phraseHits(text, PHRASE_GROUPS.roleTitles),
      applySignals: phraseHits(text, PHRASE_GROUPS.applySignals),
      growthSignals: phraseHits(text, PHRASE_GROUPS.growthSignals),
      actionabilityStrong: phraseHits(text, PHRASE_GROUPS.actionabilityStrong),
      closedSignals: phraseHits(text, PHRASE_GROUPS.closedSignals),
      negativeSignals: phraseHits(text, PHRASE_GROUPS.negativeSignals),
      selfSeekingSignals: phraseHits(text, PHRASE_GROUPS.selfSeekingSignals),
      personalAnnouncementSignals: phraseHits(text, PHRASE_GROUPS.personalAnnouncementSignals),
      opinionSignals: phraseHits(text, PHRASE_GROUPS.opinionSignals),
      adviceSignals: phraseHits(text, PHRASE_GROUPS.adviceSignals),
      consultingSignals: phraseHits(text, PHRASE_GROUPS.consultingSignals),
      commercialSignals: phraseHits(text, PHRASE_GROUPS.commercialSignals),
      endorsementSignals: phraseHits(text, PHRASE_GROUPS.endorsementSignals)
    };

    let hiringScore = 0;
    let actionabilityScore = 0;
    let closureScore = 0;
    let negativeScore = 0;

    hiringScore += hits.hiringStrong.length * 4;
    hiringScore += hits.roleTitles.length * 2;
    hiringScore += hits.applySignals.length * 3;
    hiringScore += hits.growthSignals.length * 2;
    actionabilityScore += hits.actionabilityStrong.length * 3;
    actionabilityScore += hits.applySignals.length * 2;
    closureScore += hits.closedSignals.length * 6;
    negativeScore += hits.negativeSignals.length * 4;
    negativeScore += hits.selfSeekingSignals.length * 6;
    negativeScore += hits.personalAnnouncementSignals.length * 6;
    negativeScore += hits.opinionSignals.length * 5;
    negativeScore += hits.adviceSignals.length * 5;
    negativeScore += hits.consultingSignals.length * 6;
    negativeScore += hits.commercialSignals.length * 5;
    negativeScore += hits.endorsementSignals.length * 5;

    const hiringLookingForContext = hasHiringLookingForContext(text);
    if (hiringLookingForContext) {
      hiringScore += 4;
    }

    if (urls.length > 0) {
      hiringScore += 2;
      actionabilityScore += 2;
    }
    if (emails.length > 0) {
      hiringScore += 2;
      actionabilityScore += 2;
    }

    if (hits.hiringStrong.length > 0 && hits.roleTitles.length > 0) {
      hiringScore += 5;
    }
    if (hits.roleTitles.length > 0 && hits.applySignals.length > 0) {
      hiringScore += 4;
      actionabilityScore += 3;
    }
    const explicitHiringAnnouncement = hasExplicitHiringAnnouncement(text);
    const structuredRoleBlock = hasStructuredRoleBlock(text);
    const inlineHiringRole = hasInlineHiringRole(text);
    const experienceRequirement = hasExperienceRequirement(text);
    const titleLead = hasTitleLead(rawText);
    const structuredJobDescription = hasStructuredJobDescription(rawText, text);
    if (hits.hiringStrong.length > 0 && (urls.length > 0 || emails.length > 0)) {
      actionabilityScore += 4;
    }
    if (inlineHiringRole) {
      hiringScore += 4;
    }
    if (experienceRequirement) {
      hiringScore += 3;
      actionabilityScore += 2;
    }
    if (explicitHiringAnnouncement && hits.growthSignals.length > 0) {
      hiringScore += 5;
      actionabilityScore += 2;
    }
    if (explicitHiringAnnouncement && urls.length > 0) {
      hiringScore += 3;
      actionabilityScore += 2;
    }
    if (explicitHiringAnnouncement) {
      hiringScore += 6;
      actionabilityScore += 3;
    }
    if (explicitHiringAnnouncement && structuredRoleBlock && hits.roleTitles.length > 0) {
      hiringScore += 4;
      actionabilityScore += 3;
    }
    if (titleLead && structuredJobDescription && hits.roleTitles.length > 0) {
      hiringScore += 8;
      actionabilityScore += 5;
    }

    const isLikelySelfSeeking = hits.selfSeekingSignals.length > 0;
    const isLikelyPersonalAnnouncement = hits.personalAnnouncementSignals.length > 0;
    const isLikelyOpinionPost = hits.opinionSignals.length > 0;
    const isLikelyAdvicePost = hits.adviceSignals.length > 0;
    const isLikelyConsultingPost = hits.consultingSignals.length > 0;
    if (isLikelySelfSeeking) {
      actionabilityScore = Math.max(0, actionabilityScore - 4);
    }
    if (isLikelyPersonalAnnouncement || isLikelyOpinionPost || isLikelyAdvicePost || isLikelyConsultingPost) {
      actionabilityScore = Math.max(0, actionabilityScore - 3);
    }

    for (const keyword of ["hiring", "apply", "looking for", "open role"]) {
      if (hasNearbyNegation(text, keyword)) {
        negativeScore += 5;
      }
    }

    const reasons = [];
    Object.entries(hits).forEach(([group, values]) => {
      values.slice(0, 3).forEach((value) => reasons.push(`${group}:${value}`));
    });
    if (urls.length > 0) {
      reasons.push("signal:url");
    }
    if (emails.length > 0) {
      reasons.push("signal:email");
    }
    if (explicitHiringAnnouncement) {
      reasons.push("signal:explicit-hiring-announcement");
    }
    if (structuredRoleBlock) {
      reasons.push("signal:structured-role-block");
    }
    if (hiringLookingForContext) {
      reasons.push("signal:hiring-looking-for-context");
    }
    if (inlineHiringRole) {
      reasons.push("signal:inline-hiring-role");
    }
    if (experienceRequirement) {
      reasons.push("signal:experience-requirement");
    }
    if (titleLead) {
      reasons.push("signal:title-lead");
    }
    if (structuredJobDescription) {
      reasons.push("signal:structured-job-description");
    }

    let label = NS.constants.badgeStates.NONE;
    if (closureScore >= 12 || (closureScore >= 6 && hiringScore >= 4)) {
      label = NS.constants.badgeStates.CLOSED;
    } else if (isLikelySelfSeeking && hits.hiringStrong.length === 0 && hits.growthSignals.length === 0) {
      label = NS.constants.badgeStates.NONE;
    } else if (isLikelyPersonalAnnouncement && hits.hiringStrong.length === 0) {
      label = NS.constants.badgeStates.NONE;
    } else if (isLikelyOpinionPost && hits.hiringStrong.length === 0 && hits.growthSignals.length === 0) {
      label = NS.constants.badgeStates.NONE;
    } else if (isLikelyAdvicePost && hits.hiringStrong.length === 0 && hits.growthSignals.length === 0) {
      label = NS.constants.badgeStates.NONE;
    } else if (isLikelyConsultingPost && hits.hiringStrong.length === 0 && hits.growthSignals.length === 0) {
      label = NS.constants.badgeStates.NONE;
    } else if ((hiringScore - negativeScore) >= 10 && closureScore === 0 && actionabilityScore >= 4) {
      label = NS.constants.badgeStates.OPEN;
    } else if ((hiringScore - negativeScore) >= 6 || closureScore >= 4) {
      label = NS.constants.badgeStates.MAYBE;
    }

    return {
      label,
      hiringScore,
      actionabilityScore,
      closureScore,
      negativeScore,
      reasons,
      normalizedText: text
    };
  }

  NS.classifier = {
    scoreText,
    heuristicsVersion: "2026-06-01-v1",
    shouldAutoExpand(result, options) {
      if (!options || !options.autoExpandUncertainPosts) {
        return false;
      }
      if (!options.truncated) {
        return false;
      }
      if (result.label !== NS.constants.badgeStates.MAYBE) {
        return false;
      }
      const netHiring = result.hiringScore - result.negativeScore;
      return netHiring >= 5 && netHiring <= 11 && result.closureScore < 6;
    }
  };
}());
