(function () {
  const NS = window.LinkedInHiringExtension;
  const { visibleText, sleep, isElementInViewport } = NS.utils;

  let activeExpansion = null;

  function findExpandButton(postElement) {
    return Array.from(postElement.querySelectorAll("button, a, span[role='button']"))
      .find((node) => {
        const label = visibleText(node).toLowerCase();
        return label === "see more" || label === "read more" || label === "…see more";
      });
  }

  function findCollapseButton(postElement) {
    return Array.from(postElement.querySelectorAll("button, a, span[role='button']"))
      .find((node) => {
        const label = visibleText(node).toLowerCase();
        return label === "see less" || label === "show less";
      });
  }

  async function expandSafely(postElement) {
    if (activeExpansion) {
      return null;
    }
    if (!isElementInViewport(postElement, 40)) {
      return null;
    }

    const button = findExpandButton(postElement);
    if (!button) {
      return null;
    }

    activeExpansion = postElement;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const preHeight = postElement.getBoundingClientRect().height;

    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await sleep(250);

    window.scrollTo(scrollX, scrollY);
    await sleep(150);

    const expandedText = NS.textResolver.absorbExpandedText(postElement);
    const postHeight = postElement.getBoundingClientRect().height;
    const changedLayoutMaterially = Math.abs(postHeight - preHeight) > 100;

    if (changedLayoutMaterially) {
      const collapseButton = findCollapseButton(postElement);
      if (collapseButton) {
        collapseButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        await sleep(100);
        window.scrollTo(scrollX, scrollY);
      }
    }

    activeExpansion = null;
    return expandedText || null;
  }

  NS.expansionController = {
    expandSafely
  };
}());
