function initTidplanResizer() {
  const resizer = document.getElementById("tidplanResizer");
  const leftPanel = document.querySelector(".tidplan-left-panel");
  if (!resizer || !leftPanel) return;
  if (resizer.dataset.cmaxResizerBound === "true") {
    initTidplanPanelControls();
    initTidplanFullscreenControls();
    return;
  }
  resizer.dataset.cmaxResizerBound = "true";

  // Load saved width
  const savedWidth = localStorage.getItem("tidplanLeftPanelWidth");
  if (savedWidth) {
    const width = parseInt(savedWidth);
    if (width >= 300 && width <= 800) {
      leftPanel.style.width = width + "px";
    }
  }

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  const handleMouseMove = typeof cmaxThrottle === "function"
    ? cmaxThrottle((e) => {
        if (!isResizing) return;
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(300, Math.min(800, startWidth + deltaX));
        leftPanel.style.width = newWidth + "px";
      }, 16)
    : (e) => {
        if (!isResizing) return;
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(300, Math.min(800, startWidth + deltaX));
        leftPanel.style.width = newWidth + "px";
      };

  resizer.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = leftPanel.offsetWidth;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", handleMouseMove);

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Save width
      localStorage.setItem("tidplanLeftPanelWidth", leftPanel.offsetWidth);
    }
  });

  // Initialize panel controls
  initTidplanPanelControls();
  initTidplanFullscreenControls();
}

function initTidplanPanelControls() {
  const panelToggle = document.getElementById("tidplanPanelToggle");
  const panelToggleIcon = document.getElementById("panelToggleIcon");
  const leftPanel = document.querySelector(".tidplan-left-panel");
  const container = document.querySelector(".tidplan-container");
  const resizer = document.getElementById("tidplanResizer");

  if (!panelToggle || !leftPanel || !container) return;
  if (panelToggle.dataset.cmaxPanelToggleBound === "true") return;
  panelToggle.dataset.cmaxPanelToggleBound = "true";

  let panelMode = localStorage.getItem("tidplanPanelMode") || "normal"; // "hidden", "normal", "expanded"

  function updatePanelMode() {
    // Reset classes
    leftPanel.classList.remove("tidplan-left-panel-hidden", "tidplan-left-panel-expanded");
    container.classList.remove("tidplan-container-expanded");
    resizer.style.display = "flex";

    switch (panelMode) {
      case "hidden":
        leftPanel.classList.add("tidplan-left-panel-hidden");
        resizer.style.display = "none";
        panelToggleIcon.textContent = "◑";
        panelToggle.title = "Show Panel";
        break;
      case "normal":
        // Default state - no special classes needed
        panelToggleIcon.textContent = "◐";
        panelToggle.title = "Panel Mode";
        break;
      case "expanded":
        leftPanel.classList.add("tidplan-left-panel-expanded");
        container.classList.add("tidplan-container-expanded");
        resizer.style.display = "none";
        panelToggleIcon.textContent = "◒";
        panelToggle.title = "Work Mode";
        break;
    }

    localStorage.setItem("tidplanPanelMode", panelMode);
  }

  // Set initial mode
  updatePanelMode();

  panelToggle.addEventListener("click", () => {
    switch (panelMode) {
      case "normal":
        panelMode = "hidden";
        break;
      case "hidden":
        panelMode = "expanded";
        break;
      case "expanded":
        panelMode = "normal";
        break;
    }
    updatePanelMode();
  });
}

function bindTidplanViewportFullscreen() {
  const fullscreenToggle = document.getElementById("tidplanFullscreenToggle");
  const timeline = document.getElementById("tidplanTimeline");
  const container = timeline?.closest(".tidplan-container");

  if (!fullscreenToggle || !timeline || !container) return;
  if (fullscreenToggle.dataset.cmaxFullscreenBound === "true") return;
  fullscreenToggle.dataset.cmaxFullscreenBound = "true";

  let isFullscreen = false;
  let fullscreenCloseButton = null;

  function syncToggleLabel() {
    fullscreenToggle.classList.toggle("fullscreen-active", isFullscreen);
    fullscreenToggle.textContent = isFullscreen ? "X" : "[ ]";
    fullscreenToggle.title = isFullscreen ? "Exit Fullscreen" : "Fullscreen Gantt";
  }

  function removeCloseButton() {
    if (fullscreenCloseButton) {
      fullscreenCloseButton.remove();
      fullscreenCloseButton = null;
    }
  }

  function ensureCloseButton() {
    removeCloseButton();
    fullscreenCloseButton = document.createElement("button");
    fullscreenCloseButton.type = "button";
    fullscreenCloseButton.className = "tidplan-fullscreen-close";
    fullscreenCloseButton.setAttribute("aria-label", "Exit Fullscreen");
    fullscreenCloseButton.textContent = "X";
    fullscreenCloseButton.addEventListener("click", exitFullscreen);
    document.body.appendChild(fullscreenCloseButton);
  }

  function exitFullscreen() {
    container.classList.remove("tidplan-container-fullscreen");
    timeline.classList.remove("tidplan-timeline-fullscreen");
    document.body.classList.remove("tidplan-fullscreen-open");
    document.documentElement.classList.remove("tidplan-fullscreen-open");
    isFullscreen = false;
    removeCloseButton();
    syncToggleLabel();
  }

  function enterFullscreen() {
    container.classList.add("tidplan-container-fullscreen");
    timeline.classList.add("tidplan-timeline-fullscreen");
    document.body.classList.add("tidplan-fullscreen-open");
    document.documentElement.classList.add("tidplan-fullscreen-open");
    isFullscreen = true;
    ensureCloseButton();
    syncToggleLabel();
  }

  fullscreenToggle.addEventListener("click", () => {
    if (isFullscreen) exitFullscreen();
    else enterFullscreen();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isFullscreen) {
      exitFullscreen();
    }
  });

  syncToggleLabel();
}

function initTidplanFullscreenControls() {
  bindTidplanViewportFullscreen();
  return;
  const fullscreenToggle = document.getElementById("tidplanFullscreenToggle");
  const timeline = document.getElementById("tidplanTimeline");

  if (!fullscreenToggle || !timeline) return;

  let isFullscreen = false;

  fullscreenToggle.addEventListener("click", () => {
    if (isFullscreen) {
      // Exit fullscreen
      timeline.classList.remove("tidplan-timeline-fullscreen");
      fullscreenToggle.classList.remove("fullscreen-active");
      fullscreenToggle.textContent = "⛶";
      fullscreenToggle.title = "Fullscreen Gantt";
      isFullscreen = false;
    } else {
      // Enter fullscreen
      timeline.classList.add("tidplan-timeline-fullscreen");
      fullscreenToggle.classList.add("fullscreen-active");
      fullscreenToggle.textContent = "✕";
      fullscreenToggle.title = "Exit Fullscreen";
      isFullscreen = true;
    }
  });

  // Exit fullscreen on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isFullscreen) {
      timeline.classList.remove("tidplan-timeline-fullscreen");
      fullscreenToggle.classList.remove("fullscreen-active");
      fullscreenToggle.textContent = "⛶";
      fullscreenToggle.title = "Fullscreen Gantt";
      isFullscreen = false;
    }
  });
}

