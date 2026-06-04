(function () {
  const NS = window.LinkedInHiringExtension;
  const { visibleText, compactWhitespace, extractUrls, extractEmails } = NS.utils;

  const ROLE_PATTERNS = [
    /\b(?:role|position|opening|job)\s*:\s*([a-z][a-z0-9/&,+()' -]{1,80})/i,
    /\bhiring\s*:?\s*([a-z][a-z0-9/&,+()' -]{1,80})\s+(?:at|for)\s+([a-z][a-z0-9&.,' -]{1,80})/i,
    /\b(?:we(?:'re| are)?\s+)?looking to hire\s+([a-z][a-z0-9/&,+()' -]{1,80}?)(?=\s+at\s+[a-z]|\s+with\b|\.|,|;|$)/i,
    /\blooking for\s+(?:an?|the)\s+([a-z][a-z0-9/&,+()' -]{1,80})/i,
    /\b(?:we(?:'re| are)? hiring|actively hiring)\s+(?:an?|for)?\s*([a-z][a-z0-9/&,+()' -]{1,80}?)(?=\.|,|;|\bat\b|\bto join\b|\bto work\b|\bremote\b|$)/i,
    /\bjoin us as\s+(?:an?|the)\s+([a-z][a-z0-9/&,+()' -]{1,80})/i
  ];

  const COMPANY_PATTERNS = [
    /\bcompany\s*:\s*([a-z][a-z0-9&.,' -]{1,80}?)(?=\.|,|;|\brole\b|\brequirements\b|$)/i,
    /\b([A-Z][A-Za-z0-9&.,' -]{1,80})\s+is hiring\b/,
    /\bjoin us at\s+([A-Z][A-Za-z0-9&.,/' -]{1,80}?)(?=\.|,|;|\bin\b\s+[A-Z][A-Za-z]+|$)/,
    /^at\s+([A-Z][A-Za-z0-9&.,/' -]{1,80}?)(?=,|\s+we\b|\s+our\b)/i,
    /\bbusiness of\s+([A-Z][A-Za-z0-9&.,/' -]{1,80}?)(?=\s+after\b|\.|,|;|$)/i
  ];

  const RECRUITER_SIGNALS = [
    "recruiter",
    "talent acquisition",
    "talent partner",
    "hiring manager",
    "headhunter",
    "staffing",
    "people ops",
    "human resources",
    "hr"
  ];

  const FOUNDER_SIGNALS = [
    "founder",
    "co-founder",
    "cofounder",
    "ceo"
  ];

  const COMPANY_SUFFIX_PATTERNS = [
    /\bcareers?\b$/i,
    /\bhiring\b$/i,
    /\bjobs?\b$/i,
    /\s*&\s*co\.?$/i,
    /\s+co\.?$/i
  ];

  const DISALLOWED_COMPANY_PREFIXES = [
    /^(?:our|the|this|that|their|my)\b/i,
    /^(?:summer|winter|spring|fall)\b/i
  ];

  function cleanCandidate(value) {
    return compactWhitespace(String(value || "").replace(/[|•].*$/, "").replace(/\s+/g, " ")).trim();
  }

  function normalizeRole(value) {
    const cleaned = cleanCandidate(value)
      .replace(/^(?:an?|the)\s+/i, "")
      .replace(/\bto join us(?:\s+(?:at|for)\s+[A-Z][A-Za-z0-9&.,' -]{1,80})?$/i, "")
      .replace(/\b(?:in|at|for)\s+[A-Z][A-Za-z0-9&.,' -]{1,80}$/, "")
      .replace(/\b(?:remote|india|bangalore|bengaluru|mumbai|hyderabad|pune)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!cleaned || cleaned.length < 3) {
      return "";
    }

    return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function splitRoleCandidates(value) {
    const source = String(value || "");
    const candidates = [];
    let current = "";
    let depth = 0;

    for (const character of source) {
      if (character === "(") {
        depth += 1;
        current += character;
        continue;
      }

      if (character === ")") {
        depth = Math.max(0, depth - 1);
        current += character;
        continue;
      }

      if (depth === 0 && (character === "," || character === "|" || character === "/")) {
        candidates.push(current);
        current = "";
        continue;
      }

      current += character;
    }

    if (current) {
      candidates.push(current);
    }

    return candidates
      .map((candidate) => normalizeRole(candidate))
      .filter(Boolean);
  }

  function normalizeCompany(value) {
    let cleaned = cleanCandidate(value).replace(/[.,:;]+$/, "").trim();
    COMPANY_SUFFIX_PATTERNS.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, "").trim();
    });

    if (!cleaned || cleaned.length < 2) {
      return "";
    }

    if (DISALLOWED_COMPANY_PREFIXES.some((pattern) => pattern.test(cleaned))) {
      return "";
    }

    if (!/[A-Z]/.test(cleaned)) {
      return "";
    }

    return cleaned;
  }

  function titleCaseFromDomain(domainRoot) {
    return String(domainRoot || "")
      .split(/[-_.]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function extractCompanyFromEmail(text) {
    const emails = extractEmails(text);
    for (const email of emails) {
      const domain = String(email).split("@")[1] || "";
      const domainRoot = domain.split(".")[0] || "";
      if (!domainRoot || /^(gmail|yahoo|outlook|hotmail|protonmail|icloud|example)$/i.test(domainRoot)) {
        continue;
      }

      const normalized = normalizeCompany(titleCaseFromDomain(domainRoot));
      if (normalized) {
        return normalized;
      }
    }

    return "";
  }

  function firstMatch(text, patterns, mapper) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return mapper(match);
      }
    }
    return null;
  }

  function inferAuthorType(postElement) {
    const subtitle = compactWhitespace(visibleText(postElement.querySelector(".update-components-actor__description, .feed-shared-actor__description, .update-components-actor__sub-description, .feed-shared-actor__sub-description"))).toLowerCase();
    const hasCompanyAuthor = Boolean(postElement.querySelector("a[href*='/company/']"));

    if (hasCompanyAuthor) {
      return "Company";
    }
    if (RECRUITER_SIGNALS.some((signal) => subtitle.includes(signal))) {
      return "Recruiter";
    }
    if (FOUNDER_SIGNALS.some((signal) => subtitle.includes(signal))) {
      return "Founder";
    }
    if (subtitle) {
      return "Employee";
    }
    return "";
  }

  function extractAuthor(postElement) {
    return cleanCandidate(visibleText(postElement.querySelector(".update-components-actor__name, .feed-shared-actor__name, a[href*='/in/'], a[href*='/company/']")));
  }

  function extractCompany(postElement, text) {
    const companyLink = postElement.querySelector("a[href*='/company/']");
    const linkedCompany = normalizeCompany(visibleText(companyLink));
    if (linkedCompany) {
      return linkedCompany;
    }

    const hiringRoleMatch = text.match(/\bhiring\s*:?\s*([a-z][a-z0-9/&,+()' -]{1,80})\s+(?:at|for)\s+([a-z][a-z0-9&.,/' -]{1,80}?)(?=:|\.|,|;|\bin\b\s+[A-Z][A-Za-z]+|$)/i);
    if (hiringRoleMatch) {
      return normalizeCompany(hiringRoleMatch[2]);
    }

    const explicit = firstMatch(text, COMPANY_PATTERNS, (match) => normalizeCompany(match[1] || match[2]));
    if (explicit) {
      return explicit;
    }

    const fromEmail = extractCompanyFromEmail(text);
    if (fromEmail) {
      return fromEmail;
    }

    return "";
  }

  function extractRoles(text) {
    const roles = [];
    const seen = new Set();

    ROLE_PATTERNS.forEach((pattern) => {
      const match = text.match(pattern);
      if (!match || !match[1]) {
        return;
      }

      splitRoleCandidates(match[1]).forEach((role) => {
        const key = role.toLowerCase();
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        roles.push(role);
      });
    });

    return roles;
  }

  function buildSubtitle(entities) {
    if (entities.companyName) {
      return entities.companyName;
    }
    if (entities.authorType && entities.authorName) {
      return `${entities.authorType} · ${entities.authorName}`;
    }
    return entities.authorType || "";
  }

  function detectNativeCardType(postElement) {
    if (!postElement || typeof postElement.querySelector !== "function") {
      return "";
    }

    const visiblePostText = visibleText(postElement).toLowerCase();
    if (visiblePostText.includes("starting a new position")) {
      return "new-position";
    }

    if (postElement.querySelector("a[href*='/jobs/view/'], a[href*='/jobs/collections/'], a[href*='/talent/jobs/']")) {
      return "job";
    }

    if (typeof postElement.querySelectorAll !== "function") {
      return "";
    }

    const labels = Array.from(postElement.querySelectorAll("a, button, span, div"))
      .map((node) => visibleText(node).toLowerCase())
      .filter(Boolean);

    if (labels.some((label) => label === "starting a new position")) {
      return "new-position";
    }

    if (labels.some((label) => label === "view job" || label === "see job details" || label === "easy apply")) {
      return "job";
    }

    return "";
  }

  NS.entityExtractor = {
    extract(postElement, fullText) {
      const text = String(fullText || "");
      const authorName = extractAuthor(postElement);
      const authorType = inferAuthorType(postElement);
      const companyName = extractCompany(postElement, text);
      const roleTitles = extractRoles(text);
      const roleTitle = roleTitles[0] || "";
      const nativeCardType = detectNativeCardType(postElement);

      return {
        authorName,
        authorType,
        companyName,
        roleTitles,
        roleTitle,
        nativeCardType,
        hasNativeJobCard: nativeCardType === "job",
        hasApplyLink: extractUrls(text).length > 0,
        hasEmail: extractEmails(text).length > 0,
        subtitle: buildSubtitle({
          authorName,
          authorType,
          companyName,
          roleTitle
        })
      };
    }
  };
}());
