function initTooltips() {
  if (window.__cmaxTooltipsInit) return;
  window.__cmaxTooltipsInit = true;

  const tooltip = document.createElement("div");
  tooltip.className = "cmax-tooltip";
  tooltip.id = "cmaxTooltip";
  document.body.appendChild(tooltip);

  let currentTarget = null;

  const showTooltip = (el, text) => {
    if (!text) return;
    currentTarget = el;
    tooltip.textContent = text;
    tooltip.classList.add("visible");
  };

  const hideTooltip = (el) => {
    tooltip.classList.remove("visible");
    tooltip.textContent = "";
    if (el && el.dataset.tooltipTitle) {
      el.setAttribute("title", el.dataset.tooltipTitle);
      delete el.dataset.tooltipTitle;
    }
    currentTarget = null;
  };

  const moveTooltip = (evt) => {
    const padding = 12;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const rect = tooltip.getBoundingClientRect();
    const preferredX = evt.clientX + 12;
    const preferredY = evt.clientY + 12;

    let x = preferredX;
    let y = preferredY;

    if (preferredX + rect.width + padding > viewportW) {
      x = evt.clientX - rect.width - 12;
    }
    if (x < padding) x = padding;

    if (preferredY + rect.height + padding > viewportH) {
      y = evt.clientY - rect.height - 12;
    }
    if (y < padding) y = padding;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  };

  document.addEventListener("mouseover", (evt) => {
    const target = evt.target && evt.target.closest
      ? evt.target.closest("[title]")
      : null;
    if (!target || target === currentTarget) return;
    const title = target.getAttribute("title");
    if (!title) return;
    target.dataset.tooltipTitle = title;
    target.removeAttribute("title");
    showTooltip(target, title);
    moveTooltip(evt);
  });

  document.addEventListener("mousemove", (evt) => {
    if (!currentTarget) return;
    moveTooltip(evt);
  });

  document.addEventListener("mouseout", (evt) => {
    if (!currentTarget) return;
    const related = evt.relatedTarget;
    if (related && currentTarget.contains && currentTarget.contains(related)) return;
    hideTooltip(currentTarget);
  });

  document.addEventListener("focusin", (evt) => {
    const target = evt.target && evt.target.closest
      ? evt.target.closest("[title]")
      : null;
    if (!target) return;
    const title = target.getAttribute("title");
    if (!title) return;
    target.dataset.tooltipTitle = title;
    target.removeAttribute("title");
    showTooltip(target, title);
    const rect = target.getBoundingClientRect();
    tooltip.style.left = `${rect.right + 8}px`;
    tooltip.style.top = `${rect.top}px`;
  });

  document.addEventListener("focusout", () => {
    if (!currentTarget) return;
    hideTooltip(currentTarget);
  });
}

/* ==================== INITIALIZATION ==================== */
