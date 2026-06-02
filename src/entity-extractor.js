(function () {
  const NS = window.LinkedInHiringExtension;
  const { visibleText, compactWhitespace, extractUrls, extractEmails } = NS.utils;

  const ROLE_PATTERNS = [
    /\b(?:role|position|opening|job)\s*:\s*([a-z][a-z0-9/&,+()' -]{1,80})/i,
    /\bhiring\s*:?\s*([a-z][a-z0-9/&,+()' -]{1,80})\s+(?:at|for)\s+([a-z][a-z0-9&.,' -]{1,80})/i,
    /\blooking for\s+(?:an?|the)\s+([a-z][a-z0-9/&,+()' -]{1,80})/i,
    /\b(?:we(?:'re| are)? hiring|actively hiring)\s+(?:an?|for)?\s*([a-z][a-z0-9/&,+()' -]{1,80})/i,
    /\bjoin us as\s+(?:an?|the)\s+([a-z][a-z0-9/&,+()' -]{1,80})/i
  ];

  const COMPANY_PATTERNS = [
    /\bcompany\s*:\s*([a-z][a-z0-9&.,' -]{1,80}?)(?=\.|,|;|\brole\b|\brequirements\b|$)/i,
    /\b([A-Z][A-Za-z0-9&.,' -]{1,80})\s+is hiring\b/
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

  function cleanCandidate(value) {
    return compactWhitespace(String(value || "").replace(/[|•].*$/, "").replace(/\s+/g, " ")).trim();
  }

  function normalizeRole(value) {
    const cleaned = cleanCandidate(value)
      .replace(/\b(?:in|at|for)\s+[A-Z][A-Za-z0-9&.,' -]{1,80}$/, "")
      .replace(/\b(?:remote|india|bangalore|bengaluru|mumbai|hyderabad|pune)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!cleaned || cleaned.length < 3) {
      return "";
    }

    return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function normalizeCompany(value) {
    const cleaned = cleanCandidate(value).replace(/[.,:;]+$/, "").trim();
    if (!cleaned || cleaned.length < 2) {
      return "";
    }
    return cleaned;
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

    const hiringRoleMatch = text.match(/\bhiring\s*:?\s*([a-z][a-z0-9/&,+()' -]{1,80})\s+(?:at|for)\s+([a-z][a-z0-9&.,' -]{1,80}?)(?=\.|,|;|$)/i);
    if (hiringRoleMatch) {
      return normalizeCompany(hiringRoleMatch[2]);
    }

    const explicit = firstMatch(text, COMPANY_PATTERNS, (match) => normalizeCompany(match[1] || match[2]));
    if (explicit) {
      return explicit;
    }

    return "";
  }

  function extractRole(text) {
    const explicit = firstMatch(text, ROLE_PATTERNS, (match) => normalizeRole(match[1]));
    return explicit || "";
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

  function hasNativeJobCard(postElement) {
    if (!postElement || typeof postElement.querySelector !== "function") {
      return false;
    }

    if (postElement.querySelector("a[href*='/jobs/view/'], a[href*='/jobs/collections/'], a[href*='/talent/jobs/']")) {
      return true;
    }

    if (typeof postElement.querySelectorAll !== "function") {
      return false;
    }

    return Array.from(postElement.querySelectorAll("a, button, span"))
      .some((node) => {
        const label = visibleText(node).toLowerCase();
        return label === "view job" || label === "see job details" || label === "easy apply";
      });
  }

  NS.entityExtractor = {
    extract(postElement, fullText) {
      const text = String(fullText || "");
      const authorName = extractAuthor(postElement);
      const authorType = inferAuthorType(postElement);
      const companyName = extractCompany(postElement, text);
      const roleTitle = extractRole(text);

      return {
        authorName,
        authorType,
        companyName,
        roleTitle,
        hasNativeJobCard: hasNativeJobCard(postElement),
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
