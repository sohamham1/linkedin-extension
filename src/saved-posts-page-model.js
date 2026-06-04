(function () {
  const NS = window.LinkedInHiringExtension || (window.LinkedInHiringExtension = {});

  function normalizeQuery(input) {
    return String(input || "").trim().toLowerCase();
  }

  function getNow(filters) {
    const candidate = filters && filters.now ? new Date(filters.now) : new Date();
    return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
  }

  function getAgeBucket(dateValue, now) {
    const date = new Date(dateValue || 0);
    if (Number.isNaN(date.getTime())) {
      return "older";
    }

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeekWindow = new Date(startOfToday);
    startOfWeekWindow.setDate(startOfWeekWindow.getDate() - 6);

    if (date >= startOfToday) {
      return "today";
    }

    if (date >= startOfWeekWindow) {
      return "this-week";
    }

    return "older";
  }

  function createRoleEditorValue(roleTitles) {
    return (Array.isArray(roleTitles) ? roleTitles : []).join(", ");
  }

  function getDisplayRoleSummary(row) {
    const roles = Array.isArray(row && row.roleTitles) ? row.roleTitles.filter(Boolean) : [];
    if (roles.length > 1) {
      return "Multiple roles";
    }
    if (roles.length === 1) {
      return roles[0];
    }
    if (row && row.status === "Maybe") {
      return "Unclear role, needs review";
    }
    if (row && (row.authorType === "Company" || row.companyName)) {
      return "Company hiring multiple roles";
    }
    if (row && row.authorType) {
      return "Referral/open roles";
    }
    return "General hiring post";
  }

  function getDisplayCompanyName(row) {
    if (row && row.companyName) {
      return row.companyName;
    }

    if (row && row.authorType === "Company" && row.authorName) {
      return "From author profile";
    }

    if (row && row.status === "Maybe") {
      return "Needs review";
    }

    return "Unknown company";
  }

  function buildSearchIndex(row) {
    return [
      row.companyName || "",
      row.authorName || "",
      getDisplayCompanyName(row),
      ...(Array.isArray(row.roleTitles) ? row.roleTitles : []),
      getDisplayRoleSummary(row),
      row.status || "",
      row.postUrl || ""
    ].join(" ").toLowerCase();
  }

  function quoteCsvCell(input) {
    const value = String(input || "");
    return `"${value.replace(/"/g, "\"\"")}"`;
  }

  function formatExportDate(value) {
    return String(value || "");
  }

  function buildExportRow(row) {
    return [
      row.status || "",
      getDisplayCompanyName(row),
      getDisplayRoleSummary(row),
      row.postUrl || "",
      formatExportDate(row.firstSeenAt),
      formatExportDate(row.lastSeenAt)
    ];
  }

  function buildVisibleRows(rows, filters) {
    const query = normalizeQuery(filters && filters.query);
    const status = filters && filters.status ? filters.status : "all";
    const age = filters && filters.age ? filters.age : "all";
    const now = getNow(filters);

    return (Array.isArray(rows) ? rows : [])
      .filter((row) => status === "all" || row.status === status)
      .filter((row) => age === "all" || getAgeBucket(row.lastSeenAt, now) === age)
      .filter((row) => !query || buildSearchIndex(row).includes(query))
      .slice()
      .sort((left, right) => Date.parse(right.lastSeenAt || 0) - Date.parse(left.lastSeenAt || 0));
  }

  function buildCsv(rows) {
    const headers = ["Status", "Company", "Roles", "Post Link", "First Seen", "Last Seen"];
    return [
      headers.join(","),
      ...(Array.isArray(rows) ? rows : []).map((row) => buildExportRow(row).map(quoteCsvCell).join(","))
    ].join("\n");
  }

  function buildCopyTableText(rows) {
    const headers = ["Status", "Company", "Roles", "Post Link", "First Seen", "Last Seen"];
    return [
      headers.join("\t"),
      ...(Array.isArray(rows) ? rows : []).map((row) => buildExportRow(row).join("\t"))
    ].join("\n");
  }

  NS.savedPostsPageModel = {
    buildVisibleRows,
    buildCsv,
    buildCopyTableText,
    createRoleEditorValue,
    getDisplayCompanyName,
    getDisplayRoleSummary
  };
}());
