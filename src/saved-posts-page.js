(function () {
  const NS = window.LinkedInHiringExtension || (window.LinkedInHiringExtension = {});
  const storage = NS.savedPostsStorage;
  const model = NS.savedPostsPageModel;

  const state = {
    rows: [],
    filters: {
      query: "",
      status: "all",
      age: "all"
    },
    editingPostId: ""
  };

  function formatDate(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    return date.toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getVisibleRows() {
    return model.buildVisibleRows(state.rows, state.filters);
  }

  function escapeHtml(input) {
    return String(input || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderSummary(visibleRows) {
    const openCount = state.rows.filter((row) => row.status === "Open").length;
    const maybeCount = state.rows.filter((row) => row.status === "Maybe").length;
    document.getElementById("summary").innerHTML = [
      `<strong>${visibleRows.length}</strong> shown`,
      `${state.rows.length} tracked leads`,
      `${openCount} open`,
      `${maybeCount} maybe`
    ].join("<br>");
  }

  function renderEmptyState(visibleRows) {
    document.getElementById("emptyState").hidden = visibleRows.length > 0;
  }

  function renderTable() {
    const tableBody = document.getElementById("tableBody");
    const visibleRows = getVisibleRows();
    renderSummary(visibleRows);
    renderEmptyState(visibleRows);

    tableBody.innerHTML = visibleRows.map((row) => {
      const isEditing = row.postId === state.editingPostId;
      const roleSummary = model.getDisplayRoleSummary(row);
      const rolesMarkup = isEditing
        ? `<textarea class="inline-input" data-field="roles">${escapeHtml(model.createRoleEditorValue(row.roleTitles))}</textarea>`
        : `<div class="role-summary">${escapeHtml(roleSummary)}</div>`;
      const displayCompanyName = model.getDisplayCompanyName(row);
      const companyMarkup = isEditing
        ? `<input class="inline-input" data-field="company" value="${escapeHtml(row.companyName)}">`
        : `<strong>${escapeHtml(displayCompanyName)}</strong>`;
      const actionsMarkup = isEditing
        ? `
          <button class="action-button is-primary" data-action="save" data-post-id="${escapeHtml(row.postId)}">Save</button>
          <button class="action-button" data-action="cancel" data-post-id="${escapeHtml(row.postId)}">Cancel</button>
        `
        : `
          <button class="action-button" data-action="edit" data-post-id="${escapeHtml(row.postId)}">Edit</button>
          <button class="action-button is-danger" data-action="delete" data-post-id="${escapeHtml(row.postId)}">Remove</button>
        `;

      return `
        <tr data-post-id="${escapeHtml(row.postId)}">
          <td><span class="status-pill ${row.status === "Open" ? "is-open" : "is-maybe"}">${escapeHtml(row.status)}</span></td>
          <td>${companyMarkup}</td>
          <td>${rolesMarkup}</td>
          <td class="link-cell"><a href="${escapeHtml(row.postUrl)}" target="_blank" rel="noreferrer">View post</a></td>
          <td class="timestamp">${escapeHtml(formatDate(row.firstSeenAt))}</td>
          <td class="timestamp">${escapeHtml(formatDate(row.lastSeenAt))}</td>
          <td><div class="actions-cell">${actionsMarkup}</div></td>
        </tr>
      `;
    }).join("");
  }

  async function refreshRows() {
    state.rows = await storage.listSavedPosts();
    renderTable();
  }

  function flashButtonLabel(button, nextLabel) {
    if (!button) {
      return;
    }

    const originalLabel = button.dataset.originalLabel || button.textContent;
    button.dataset.originalLabel = originalLabel;
    button.textContent = nextLabel;
    window.setTimeout(() => {
      button.textContent = button.dataset.originalLabel || originalLabel;
    }, 1600);
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "true");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  }

  function downloadCsv(filename, text) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleCopyTable() {
    const visibleRows = getVisibleRows();
    if (visibleRows.length === 0) {
      flashButtonLabel(document.getElementById("copyTableButton"), "Nothing to copy");
      return;
    }

    await copyText(model.buildCopyTableText(visibleRows));
    flashButtonLabel(document.getElementById("copyTableButton"), "Copied");
  }

  function handleExportCsv() {
    const visibleRows = getVisibleRows();
    if (visibleRows.length === 0) {
      flashButtonLabel(document.getElementById("exportCsvButton"), "No rows");
      return;
    }

    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`hiring-radar-${stamp}.csv`, model.buildCsv(visibleRows));
    flashButtonLabel(document.getElementById("exportCsvButton"), "Exported");
  }

  async function handleTableClick(event) {
    const action = event.target.getAttribute("data-action");
    const postId = event.target.getAttribute("data-post-id");
    if (!action || !postId) {
      return;
    }

    if (action === "edit") {
      state.editingPostId = postId;
      renderTable();
      return;
    }

    if (action === "cancel") {
      state.editingPostId = "";
      renderTable();
      return;
    }

    if (action === "delete") {
      await storage.deleteSavedPost(postId);
      if (state.editingPostId === postId) {
        state.editingPostId = "";
      }
      await refreshRows();
      return;
    }

    if (action === "save") {
      const row = event.target.closest("tr");
      const companyInput = row.querySelector('[data-field="company"]');
      const rolesInput = row.querySelector('[data-field="roles"]');
      await storage.updateSavedPost(postId, {
        companyName: companyInput ? companyInput.value : "",
        roleTitles: (rolesInput ? rolesInput.value : "")
          .split(",")
          .map((role) => role.trim())
          .filter(Boolean)
      });
      state.editingPostId = "";
      await refreshRows();
    }
  }

  function bindFilters() {
    document.getElementById("searchInput").addEventListener("input", (event) => {
      state.filters.query = event.target.value;
      renderTable();
    });

    document.getElementById("statusFilter").addEventListener("change", (event) => {
      state.filters.status = event.target.value;
      renderTable();
    });

    document.getElementById("ageFilter").addEventListener("change", (event) => {
      state.filters.age = event.target.value;
      renderTable();
    });
  }

  function bindStorageUpdates() {
    if (!chrome || !chrome.storage || !chrome.storage.onChanged) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[NS.constants.savedPostsStorageKey]) {
        return;
      }
      refreshRows();
    });
  }

  function bindLifecycleRefresh() {
    window.addEventListener("focus", () => {
      refreshRows();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        refreshRows();
      }
    });
  }

  function boot() {
    bindFilters();
    bindStorageUpdates();
    bindLifecycleRefresh();
    document.getElementById("tableBody").addEventListener("click", handleTableClick);
    document.getElementById("copyTableButton").addEventListener("click", () => {
      handleCopyTable().catch(() => {
        flashButtonLabel(document.getElementById("copyTableButton"), "Copy failed");
      });
    });
    document.getElementById("exportCsvButton").addEventListener("click", handleExportCsv);
    refreshRows();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}());
