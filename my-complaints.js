const list = document.getElementById("complaint-list");
const message = document.getElementById("message");
const summary = document.getElementById("list-summary");
const user = readUser();

document.getElementById("year").textContent = new Date().getFullYear();

function readUser() {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const value = storage.getItem("campusCareUser");
      if (value) return JSON.parse(value);
    } catch (error) {
      // Ignore malformed saved data and try the other storage area.
    }
  }
  return null;
}

function escapeText(value) {
  const element = document.createElement("span");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

function showEmpty(title, detail) {
  list.innerHTML = '<div class="empty"><strong>' + escapeText(title) +
    "</strong>" + escapeText(detail) + "</div>";
}

async function loadMyComplaints() {
  const token = localStorage.getItem("campusCareToken") ||
    sessionStorage.getItem("campusCareToken");

  if (!user || user.role !== "student" || !token) {
    window.location.replace("index.html");
    return;
  }

  document.getElementById("account-name").textContent = "Signed in as " + user.username;

  try {
    const response = await fetch("/api/complaints/" + encodeURIComponent(user.username), {
      headers: { Authorization: "Bearer " + token }
    });
    const result = await response.json();

    if (!response.ok) throw new Error(result.message || "Complaints load nahi hui.");

    summary.textContent = result.length + (result.length === 1 ? " complaint" : " complaints");
    if (!result.length) {
      showEmpty("Abhi koi complaint nahi hai", "Dashboard se complaint submit karne ke baad woh yahan dikh jayegi.");
      return;
    }

    list.replaceChildren();
    result.forEach(function (complaint) {
      const card = document.createElement("article");
      card.className = "complaint-card";
      card.innerHTML =
        '<div class="card-top"><div><h3>' + escapeText(complaint.title || "Untitled complaint") +
        '</h3><p class="category">' + escapeText(complaint.category || "Other") +
        '</p></div><span class="status">' + escapeText(complaint.status || "Submitted") +
        '</span></div><p class="description">' + escapeText(complaint.description || "No description") +
        '</p><div class="meta"><span>Submitted: ' + escapeText(formatDate(complaint.date)) +
        '</span><span>Department: ' + escapeText(complaint.assignedDepartment || "Not assigned yet") +
        '</span></div>';
      list.appendChild(card);
    });
  } catch (error) {
    summary.textContent = "Could not load complaints";
    message.textContent = error.message || "Server se connect nahi ho pa raha.";
  }
}

loadMyComplaints();
