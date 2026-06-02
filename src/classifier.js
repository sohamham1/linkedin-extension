(function () {
  const NS = window.LinkedInHiringExtension;
  const { normalizeText, extractUrls, extractEmails } = NS.utils;

  const PHRASE_GROUPS = {
    hiringStrong: [
      "we're hiring", "we are hiring", "hiring now", "join our team", "looking for",
      "open role", "open roles", "job opening", "vacancy", "hiring for", "immediate opening",
      "urgent hiring", "actively hiring", "#hiring", "#hiringnow"
    ],
    roleTitles: [
      "engineer", "developer", "designer", "analyst", "product manager", "intern",
      "sales", "marketing", "recruiter", "data scientist", "frontend", "backend",
      "full stack", "software", "qa", "devops", "android", "ios", "founding engineer"
    ],
    applySignals: [
      "apply", "apply here", "apply now", "job description", "jd", "resume", "cv",
      "send your profile", "dm me", "drop your resume", "email me", "careers page",
      "link in comments", "google form", "application form", "submit your application",
      "apply via the following link"
    ],
    growthSignals: [
      "team is growing", "building our team", "we are growing", "expanding our team",
      "hiring across", "multiple openings", "new opening"
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
      consultingSignals: phraseHits(text, PHRASE_GROUPS.consultingSignals)
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
    if (hits.hiringStrong.length > 0 && (urls.length > 0 || emails.length > 0)) {
      actionabilityScore += 4;
    }

    const explicitHiringAnnouncement = hasExplicitHiringAnnouncement(text);
    const structuredRoleBlock = hasStructuredRoleBlock(text);
    if (explicitHiringAnnouncement) {
      hiringScore += 6;
      actionabilityScore += 3;
    }
    if (explicitHiringAnnouncement && structuredRoleBlock && hits.roleTitles.length > 0) {
      hiringScore += 4;
      actionabilityScore += 3;
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
