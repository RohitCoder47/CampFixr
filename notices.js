const noticeList = document.getElementById("notice-list");
const noticeCount = document.getElementById("notice-count");
const user = readUser();

document.getElementById("year").textContent = new Date().getFullYear();

function readUser() {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const value = storage.getItem("campusCareUser");
      if (value) return JSON.parse(value);
    } catch (error) {

    }
  }
  return null;
}

function escapeText(value) {
  const node = document.createElement("span");
  node.textContent = String(value ?? "");
  return node.innerHTML;
}

function dateText(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function tokenValue() {
  return localStorage.getItem("campusCareToken") ||
    sessionStorage.getItem("campusCareToken");
}

async function loadNotices() {
  const token = tokenValue();
  if (!user || !token) {
    window.location.replace("index.html");
    return;
  }

  document.getElementById("account-name").textContent =
    "Signed in as " + user.username + " · " + user.role;

  if (user.role === "admin") {
    document.getElementById("admin-panel").hidden = false;
    document.getElementById("password-reset-panel").hidden = false;
  }

  try {
    const response = await fetch("/api/notices", {
      headers: { Authorization: "Bearer " + token }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Notices could not be loaded.");

    noticeCount.textContent = result.length + (result.length === 1 ? " notice" : " notices");
    if (result.length === 0) {
      noticeList.innerHTML = '<p class="empty">No campus notices have been published yet.</p>';
      return;
    }

    noticeList.replaceChildren();
    result.forEach(function (notice) {
      const article = document.createElement("article");
      article.className = "notice-card";
      article.innerHTML = "<h3>" + escapeText(notice.title) +
        "</h3><p>" + escapeText(notice.message) +
        '</p><div class="notice-meta">Posted by ' + escapeText(notice.postedBy) +
        " · " + escapeText(dateText(notice.date)) + "</div>";
      noticeList.appendChild(article);
    });
  } catch (error) {
    noticeCount.textContent = "";
    noticeList.innerHTML = '<p class="error">' + escapeText(error.message || "Notices could not be loaded.") + "</p>";
  }
}

const noticeForm = document.getElementById("notice-form");
noticeForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  const feedback = document.getElementById("form-message");
  const submitButton = noticeForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  feedback.textContent = "Publishing…";

  try {
    const response = await fetch("/api/admin/notices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + tokenValue()
      },
      body: JSON.stringify({
        title: document.getElementById("notice-title").value.trim(),
        message: document.getElementById("notice-message").value.trim()
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "The notice could not be published.");
    noticeForm.reset();
    feedback.textContent = result.message;
    await loadNotices();
  } catch (error) {
    feedback.textContent = error.message || "Unable to connect to the server.";
  } finally {
    submitButton.disabled = false;
  }
});

document.getElementById("password-reset-code-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const feedback = document.getElementById("reset-code-result");
  feedback.textContent = "Generating code…";

  try {
    const response = await fetch("/api/admin/password-reset-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + tokenValue()
      },
      body: JSON.stringify({
        username: document.getElementById("reset-student-id").value.trim()
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Failed to generate the password reset code.");
    feedback.textContent = result.message + " Code: " + result.resetCode;
  } catch (error) {
    feedback.textContent = error.message || "Unable to connect to the server.";
  }
});

loadNotices();
