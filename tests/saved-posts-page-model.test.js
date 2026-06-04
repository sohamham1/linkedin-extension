const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadPageModel() {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "saved-posts-page-model.js"), "utf8");
  const context = {
    console,
    LinkedInHiringExtension: {}
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "saved-posts-page-model.js" });
  return context.LinkedInHiringExtension.savedPostsPageModel;
}

test("buildVisibleRows sorts posts by lastSeenAt descending by default", () => {
  const model = loadPageModel();
  const rows = model.buildVisibleRows([
    { postId: "1", companyName: "First", roleTitles: ["PM"], status: "Open", lastSeenAt: "2026-06-01T10:00:00.000Z" },
    { postId: "2", companyName: "Second", roleTitles: ["Designer"], status: "Maybe", lastSeenAt: "2026-06-03T10:00:00.000Z" }
  ], { query: "", status: "all" });

  assert.deepEqual(rows.map((row) => row.postId), ["2", "1"]);
});

test("buildVisibleRows filters by status and search query", () => {
  const model = loadPageModel();
  const rows = model.buildVisibleRows([
    { postId: "1", companyName: "Acme", roleTitles: ["Product Manager"], status: "Open", lastSeenAt: "2026-06-03T10:00:00.000Z" },
    { postId: "2", companyName: "Northwind", roleTitles: ["Designer"], status: "Maybe", lastSeenAt: "2026-06-02T10:00:00.000Z" }
  ], { query: "acme", status: "Open" });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].postId, "1");
});

test("buildVisibleRows filters by age buckets", () => {
  const model = loadPageModel();
  const sourceRows = [
    { postId: "1", companyName: "Acme", roleTitles: ["PM"], status: "Open", lastSeenAt: "2026-06-04T10:00:00.000Z" },
    { postId: "2", companyName: "Northwind", roleTitles: ["Designer"], status: "Maybe", lastSeenAt: "2026-06-01T10:00:00.000Z" },
    { postId: "3", companyName: "Contoso", roleTitles: ["Analyst"], status: "Open", lastSeenAt: "2026-05-20T10:00:00.000Z" }
  ];

  assert.deepEqual(
    model.buildVisibleRows(sourceRows, { query: "", status: "all", age: "today", now: "2026-06-04T18:00:00.000Z" }).map((row) => row.postId),
    ["1"]
  );
  assert.deepEqual(
    model.buildVisibleRows(sourceRows, { query: "", status: "all", age: "this-week", now: "2026-06-04T18:00:00.000Z" }).map((row) => row.postId),
    ["2"]
  );
  assert.deepEqual(
    model.buildVisibleRows(sourceRows, { query: "", status: "all", age: "older", now: "2026-06-04T18:00:00.000Z" }).map((row) => row.postId),
    ["3"]
  );
});

test("createRoleEditorValue joins multiple roles for inline editing", () => {
  const model = loadPageModel();
  assert.equal(model.createRoleEditorValue(["Business Analyst", "Strategy Analyst"]), "Business Analyst, Strategy Analyst");
});

test("getDisplayCompanyName falls back to company author names for table display", () => {
  const model = loadPageModel();
  assert.equal(model.getDisplayCompanyName({
    companyName: "",
    authorName: "Acme Labs",
    authorType: "Company"
  }), "From author profile");
});

test("getDisplayCompanyName uses a clearer open-company placeholder when no company was extracted", () => {
  const model = loadPageModel();
  assert.equal(model.getDisplayCompanyName({
    companyName: "",
    authorName: "",
    authorType: "",
    status: "Open"
  }), "Unknown company");
});

test("getDisplayCompanyName uses a clearer maybe-company placeholder when no company was extracted", () => {
  const model = loadPageModel();
  assert.equal(model.getDisplayCompanyName({
    companyName: "",
    authorName: "",
    authorType: "",
    status: "Maybe"
  }), "Needs review");
});

test("getDisplayRoleSummary uses a clearer multi-role fallback", () => {
  const model = loadPageModel();
  assert.equal(model.getDisplayRoleSummary({
    roleTitles: ["Business Analyst", "Strategy Analyst"],
    status: "Open"
  }), "Multiple roles");
});

test("getDisplayRoleSummary uses a clearer open-role placeholder when no role was extracted", () => {
  const model = loadPageModel();
  assert.equal(model.getDisplayRoleSummary({
    roleTitles: [],
    companyName: "Acme",
    authorType: "Company",
    status: "Open"
  }), "Company hiring multiple roles");
});

test("getDisplayRoleSummary uses a referral/open roles fallback for non-company posts without role extraction", () => {
  const model = loadPageModel();
  assert.equal(model.getDisplayRoleSummary({
    roleTitles: [],
    companyName: "",
    authorType: "Employee",
    status: "Open"
  }), "Referral/open roles");
});

test("getDisplayRoleSummary uses a general hiring fallback when little context is available", () => {
  const model = loadPageModel();
  assert.equal(model.getDisplayRoleSummary({
    roleTitles: [],
    companyName: "",
    authorType: "",
    status: "Open"
  }), "General hiring post");
});

test("getDisplayRoleSummary uses a review fallback for maybe rows without role extraction", () => {
  const model = loadPageModel();
  assert.equal(model.getDisplayRoleSummary({
    roleTitles: [],
    status: "Maybe"
  }), "Unclear role, needs review");
});

test("buildCsv exports visible rows with readable labels", () => {
  const model = loadPageModel();
  const csv = model.buildCsv([
    {
      postId: "1",
      status: "Open",
      companyName: "",
      authorName: "Acme Labs",
      authorType: "Company",
      roleTitles: [],
      postUrl: "https://example.com/post",
      firstSeenAt: "2026-06-04T10:00:00.000Z",
      lastSeenAt: "2026-06-04T12:00:00.000Z"
    }
  ]);

  assert.match(csv, /Status,Company,Roles,Post Link,First Seen,Last Seen/);
  assert.match(csv, /"Open","From author profile","Company hiring multiple roles"/);
});

test("buildCopyTableText exports tabular text for quick copy", () => {
  const model = loadPageModel();
  const copied = model.buildCopyTableText([
    {
      postId: "2",
      status: "Maybe",
      companyName: "",
      authorName: "",
      authorType: "",
      roleTitles: [],
      postUrl: "https://example.com/post-2",
      firstSeenAt: "2026-06-03T10:00:00.000Z",
      lastSeenAt: "2026-06-04T12:00:00.000Z"
    }
  ]);

  assert.match(copied, /Status\tCompany\tRoles\tPost Link\tFirst Seen\tLast Seen/);
  assert.match(copied, /Maybe\tNeeds review\tUnclear role, needs review/);
});
