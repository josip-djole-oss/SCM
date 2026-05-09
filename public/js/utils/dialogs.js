function normalizeText(value) {
  if (typeof value !== "string") return value;
  if (!/[ÃÂâÅÄ]/.test(value)) return value;
  try {
    return decodeURIComponent(escape(value));
  } catch {
    return value;
  }
}

function showAlert(message, icon, callback) {
  const overlay = document.getElementById("customDialogOverlay");
  document.getElementById("dialogIcon").textContent =
    normalizeText(icon || "\u26A0\uFE0F");
  document.getElementById("dialogMessage").textContent =
    normalizeText(message);
  document.getElementById("dialogInput").style.display = "none";

  const btns = document.getElementById("dialogButtons");
  btns.innerHTML = "";
  const okBtn = document.createElement("button");
  okBtn.className = "btn";
  okBtn.textContent = t("btnOk");
  okBtn.onclick = () => {
    overlay.style.display = "none";
    if (callback) callback();
  };
  btns.appendChild(okBtn);
  overlay.style.display = "flex";
}

function showConfirm(message, title, icon, onYes, onNo) {
  const overlay = document.getElementById("customDialogOverlay");
  document.getElementById("dialogIcon").textContent =
    normalizeText(icon || "\u2753");
  const safeTitle = normalizeText(title);
  const safeMessage = normalizeText(message);
  document.getElementById("dialogMessage").innerHTML =
    (safeTitle ? `<strong>${safeTitle}</strong><br><br>` : "") + safeMessage;
  document.getElementById("dialogInput").style.display = "none";

  const btns = document.getElementById("dialogButtons");
  btns.innerHTML = "";

  const noBtn = document.createElement("button");
  noBtn.className = "btn btn-secondary";
  noBtn.textContent = safeTitle === "Print Tidplan" ? "Trenutni prikaz" : t("btnNo");
  noBtn.onclick = () => {
    overlay.style.display = "none";
    if (onNo) onNo();
  };

  const yesBtn = document.createElement("button");
  yesBtn.className = "btn";
  yesBtn.textContent = safeTitle === "Print Tidplan" ? "Cijeli Tidplan" : t("btnYes");
  yesBtn.onclick = () => {
    overlay.style.display = "none";
    if (onYes) onYes();
  };

  btns.appendChild(noBtn);
  btns.appendChild(yesBtn);
  overlay.style.display = "flex";
}

function showPromptDialog(message, icon, placeholder, callback) {
  const overlay = document.getElementById("customDialogOverlay");
  document.getElementById("dialogIcon").textContent =
    normalizeText(icon || "\u270F\uFE0F");
  document.getElementById("dialogMessage").textContent =
    normalizeText(message);

  const inp = document.getElementById("dialogInput");
  inp.style.display = "block";
  inp.value = "";
  inp.placeholder = placeholder || "";

  const btns = document.getElementById("dialogButtons");
  btns.innerHTML = "";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn-secondary";
  cancelBtn.textContent = t("btnCancel");
  cancelBtn.onclick = () => {
    overlay.style.display = "none";
    callback(null);
  };

  const okBtn = document.createElement("button");
  okBtn.className = "btn";
  okBtn.textContent = t("btnOk");
  okBtn.onclick = () => {
    overlay.style.display = "none";
    callback(inp.value.trim());
  };

  inp.onkeypress = (e) => {
    if (e.key === "Enter") {
      overlay.style.display = "none";
      callback(inp.value.trim());
    }
  };

  btns.appendChild(cancelBtn);
  btns.appendChild(okBtn);
  overlay.style.display = "flex";
  setTimeout(() => inp.focus(), 100);
}

/* ==================== TOAST NOTIFICATION ==================== */
function showToast(message, type = "default") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.textContent = normalizeText(message);
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/* ==================== MANAGE PANEL ==================== */
