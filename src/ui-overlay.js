(function () {
  const NS = window.LinkedInHiringExtension;

  function ensureBadge(postElement) {
    let badge = postElement.querySelector(":scope > .lihpd-badge");
    if (badge) {
      return badge;
    }

    if (!postElement.dataset.lihpdOriginalPosition) {
      postElement.dataset.lihpdOriginalPosition = postElement.style.position || "";
    }
    if (getComputedStyle(postElement).position === "static") {
      postElement.style.position = "relative";
    }

    badge = document.createElement("div");
    badge.className = "lihpd-badge";
    badge.setAttribute("data-lihpd-ui", "true");

    const textStack = document.createElement("span");
    textStack.className = "lihpd-badge__text";

    const labelNode = document.createElement("span");
    labelNode.className = "lihpd-badge__label";
    textStack.appendChild(labelNode);

    const metaNode = document.createElement("span");
    metaNode.className = "lihpd-badge__meta";
    textStack.appendChild(metaNode);

    badge.appendChild(textStack);

    postElement.appendChild(badge);
    return badge;
  }

  function stateClass(label) {
    switch (label) {
      case NS.constants.badgeStates.OPEN:
        return "is-open";
      case NS.constants.badgeStates.CLOSED:
        return "is-closed";
      case NS.constants.badgeStates.MAYBE:
        return "is-maybe";
      case NS.constants.badgeStates.NONE:
        return "is-none";
      default:
        return "is-scanning";
    }
  }

  function clearAll() {
    document.querySelectorAll(".lihpd-badge").forEach((badge) => badge.remove());
    document.querySelectorAll(".lihpd-status").forEach((badge) => badge.remove());
    document.querySelectorAll(".lihpd-workspace-button").forEach((button) => button.remove());
  }

  function renderStatus(text) {
    let status = document.querySelector(".lihpd-status");
    if (!status) {
      status = document.createElement("div");
      status.className = "lihpd-status";
      status.setAttribute("data-lihpd-ui", "true");
      document.body.appendChild(status);
    }
    status.textContent = text;
  }

  NS.uiOverlay = {
    clearAll,
    renderStatus,
    renderWorkspaceButton() {
      let button = document.querySelector(".lihpd-workspace-button");
      if (button) {
        return button;
      }

      button = document.createElement("button");
      button.type = "button";
      button.className = "lihpd-workspace-button";
      button.setAttribute("data-lihpd-ui", "true");
      button.textContent = "Hiring Radar";
      button.addEventListener("click", () => {
        if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
          return;
        }
        chrome.runtime.sendMessage({
          type: NS.constants.messages.OPEN_SAVED_POSTS
        });
      });
      document.body.appendChild(button);
      return button;
    },
    render(postElement, payload) {
      const badge = ensureBadge(postElement);
      badge.className = `lihpd-badge ${stateClass(payload.label)}`;
      const labelNode = badge.querySelector(".lihpd-badge__label");
      const metaNode = badge.querySelector(".lihpd-badge__meta");
      labelNode.textContent = payload.label;
      const metaText = payload.subtitle || "";
      metaNode.textContent = metaText;
      metaNode.hidden = !metaText;
      badge.classList.toggle("has-meta", Boolean(metaText));
      badge.title = payload.debugTitle || "";
    }
  };
}());
