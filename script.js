
const rolePicker = document.getElementById("role-picker");
const complaintModal = document.getElementById("complaint-modal");
const complaintForm = document.getElementById("complaint-form");
const complaintList = document.getElementById("complaint-list");
const toast = document.getElementById("toast");
const searchInput = document.getElementById("search-input");
const sidebar = document.getElementById("sidebar");
const mobileScrim = document.getElementById("mobile-scrim");

let complaints = [];
let activeStatusFilter = "all";
let complaintStatistics = null;
let recentActivityEvents = [];
const signedInUser = localStorage.getItem("campusCareUser");
let toastTimer;

const dashboardContent = {
  student: {
    role: "Student",
    label: "STUDENT DASHBOARD",
    welcome: "Welcome back, Student!",
    subtitle: "Raise concerns. Track progress. Improve your campus.",
    navLabel: "My Complaints",
    listTitle: "Recent Complaints",
    listSubtitle: "Your submitted complaints will appear here."
  },
  admin: {
    role: "Admin",
    label: "ADMIN DASHBOARD",
    welcome: "Welcome back, Admin!",
    subtitle: "Manage complaints. Monitor progress. Improve your campus.",
    navLabel: "All Complaints",
    listTitle: "All Complaints",
    listSubtitle: "Review and manage complaints submitted by students."
  },
  department: {
    role: "Department",
    label: "DEPARTMENT DASHBOARD",
    welcome: "Welcome back, Department!",
    subtitle: "Review assigned complaints and resolve campus issues.",
    navLabel: "Assigned Complaints",
    listTitle: "Department Complaints",
    listSubtitle: "Review complaints assigned to your department."
  }
};

function showMessage(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 2500);
}

function openComplaintForm() {
  complaintModal.hidden = false;
  document.getElementById("complaint-title").focus();
}

function closeComplaintForm() {
  complaintModal.hidden = true;
}

function closeMenu() {
  sidebar.classList.remove("open");
  mobileScrim.classList.remove("show");
}

function showComplaints(statusFilter) {
  activeStatusFilter = statusFilter || "all";
  showComplaintsList(searchInput.value);

  const section = document.getElementById("complaints");
  section.scrollIntoView({
    behavior: "smooth"
  });
  section.style.borderColor = "#9b74d1";
  section.style.boxShadow = "0 0 0 3px #9b74d144";
  setTimeout(function () {
    section.style.borderColor = "";
    section.style.boxShadow = "";
  }, 1400);
  closeMenu();
}

function escapeText(text) {
  const safeText = document.createElement("span");
  safeText.textContent = String(text ?? "");
  return safeText.innerHTML;
}
function getStoredUser() {
  const savedUser =
    localStorage.getItem("campusCareUser") ||
    sessionStorage.getItem("campusCareUser");

  try {
    return savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    return null;
  }
}

function updateDashboard(roleValue) {
  const data = dashboardContent[roleValue];
  if (!data) return;

  const user = getStoredUser();
  const username = user && user.username ? user.username : "Campus user";

  document.getElementById("dashboard-label").textContent = data.label;
  document.getElementById("welcome-title").textContent = data.welcome;
  document.getElementById("welcome-subtitle").textContent = data.subtitle;
  document.getElementById("top-user-name").textContent = username;
  document.getElementById("sidebar-user-name").textContent = username;
  document.getElementById("top-role").textContent = data.role;
  document.getElementById("profile-role").textContent =
    data.role + " account";
  document.getElementById("profile-modal-role").textContent = data.role;
  document.getElementById("profile-modal-username").textContent = username;
  document.getElementById("profile-modal-department").textContent =
    user && user.department ? user.department : "IT";
  document.getElementById("complaint-nav-label").textContent = data.navLabel;
  document.getElementById("list-title").textContent = data.listTitle;
  document.getElementById("list-subtitle").textContent = data.listSubtitle;
}

function updateLiveWidgets() {
  const categoryCounts = complaintStatistics && complaintStatistics.categories
    ? complaintStatistics.categories
    : complaints.reduce(function (counts, complaint) {
        const category = String(complaint.category || "Other");
        counts[category] = (counts[category] || 0) + 1;
        return counts;
      }, {});

  const topCategories = Object.entries(categoryCounts)
    .sort(function (a, b) { return b[1] - a[1]; })
    .slice(0, 5);
  const chartBars = document.querySelectorAll(".chart-bars i");
  const maxCategoryCount = Math.max(1, ...topCategories.map(function (item) { return item[1]; }));
  chartBars.forEach(function (bar, index) {
    const item = topCategories[index];
    if (!item) {
      bar.style.height = "8px";
      bar.title = "No complaint data";
      return;
    }
    bar.style.height = Math.max(12, Math.round((item[1] / maxCategoryCount) * 54)) + "px";
    bar.title = item[0] + ": " + item[1];
  });

  const chartLabel = document.querySelector(".chart-empty > span");
  if (chartLabel) {
    chartLabel.textContent = topCategories.length
      ? topCategories.map(function (item) { return item[0] + ": " + item[1]; }).join(" · ")
      : "No complaint data yet";
  }

  const statuses = complaintStatistics && complaintStatistics.statuses
    ? complaintStatistics.statuses
    : complaints.reduce(function (counts, complaint) {
        const status = String(complaint.status || "Submitted");
        counts[status] = (counts[status] || 0) + 1;
        return counts;
      }, {});
  const total = complaintStatistics ? complaintStatistics.total : complaints.length;
  const ring = document.querySelector(".status-empty .empty-ring");
  if (ring) {
    const totalText = ring.firstChild;
    if (totalText && totalText.nodeType === Node.TEXT_NODE) totalText.textContent = String(total);
  }
  const statusLabel = document.querySelector(".status-empty > span");
  if (statusLabel) {
    statusLabel.textContent = total
      ? "Submitted " + (statuses.Submitted || 0) + " · Assigned " + (statuses.Assigned || 0) +
        " · In Progress " + (statuses["In Progress"] || 0) + " · Resolved " + (statuses.Resolved || 0)
      : "No status data yet";
  }
}
function updateActivityFeed() {
  const activityBox = document.querySelector(".activity-empty");
  if (!activityBox) return;

  const events = [];
  complaints.forEach(function (complaint) {
    if (Array.isArray(complaint.activity) && complaint.activity.length > 0) {
      complaint.activity.forEach(function (item) {
        events.push({
          title: String(item.action || "Complaint updated"),
          by: String(item.by || ""),
          role: String(item.role || ""),
          date: item.date || complaint.date,
          complaintId: String(complaint._id || ""),
          complaintTitle: String(complaint.title || "Complaint")
        });
      });
    } else if (complaint.date) {
      events.push({
        title: "Complaint submitted",
        by: String(complaint.studentId || ""),
        role: "student",
        date: complaint.date,
        complaintId: String(complaint._id || ""),
        complaintTitle: String(complaint.title || "Complaint")
      });
    }
  });

  events.sort(function (a, b) {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  recentActivityEvents = events;

  activityBox.replaceChildren();
  activityBox.style.display = "grid";
  activityBox.style.gap = "8px";
  activityBox.style.textAlign = "left";

  if (events.length === 0) {
    const emptyTitle = document.createElement("strong");
    emptyTitle.textContent = "No recent activity";
    const emptyText = document.createElement("small");
    emptyText.textContent = "Updates will appear here when complaint activity is recorded.";
    activityBox.append(emptyTitle, emptyText);
    return;
  }

  const summary = document.createElement("strong");
  summary.textContent = events.length + (events.length === 1 ? " recent update" : " recent updates");
  const hint = document.createElement("small");
  hint.textContent = "View submission and status history for your complaints.";
  const viewAllButton = document.createElement("button");
  viewAllButton.type = "button";
  viewAllButton.className = "activity-view-button";
  viewAllButton.dataset.viewAllActivity = "true";
  viewAllButton.textContent = "View all activities";
  activityBox.append(summary, hint, viewAllButton);
}

const activityHistoryList = document.getElementById("activity-history-list");
const activityModal = document.getElementById("activity-modal");
const activityBox = document.querySelector(".activity-empty");

activityBox.addEventListener("click", function (event) {
  const button = event.target.closest("[data-view-all-activity]");
  if (!button) return;

  document.getElementById("activity-modal-title").textContent = "All complaint activities";
  const complaintCount = new Set(recentActivityEvents.map(function (item) {
    return item.complaintId;
  })).size;
  document.getElementById("activity-modal-subtitle").textContent =
    recentActivityEvents.length + " updates across " + complaintCount +
    (complaintCount === 1 ? " complaint" : " complaints");
  activityHistoryList.replaceChildren();

  recentActivityEvents.forEach(function (item) {
    const row = document.createElement("div");
    row.className = "activity-history-item";
    const action = document.createElement("strong");
    action.textContent = item.title;
    const complaint = document.createElement("small");
    complaint.textContent = item.complaintTitle +
      (item.complaintId ? " · #" + item.complaintId.slice(0, 8) : "");
    const details = document.createElement("small");
    const date = item.date ? new Date(item.date).toLocaleString() : "";
    details.textContent = [item.by, item.role, date].filter(Boolean).join(" · ");
    row.append(action, complaint, details);
    activityHistoryList.appendChild(row);
  });

  activityModal.hidden = false;
});
async function loadImportantNotice() {
  const titleElement = document.getElementById("important-notice-title");
  const messageElement = document.getElementById("important-notice-message");
  const token = localStorage.getItem("campusCareToken") ||
    sessionStorage.getItem("campusCareToken");
  if (!titleElement || !messageElement || !token) return;

  try {
    const response = await fetch("/api/notices", {
      headers: { "Authorization": "Bearer " + token }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Notice could not be loaded.");
    if (result.length) {
      titleElement.hidden = false;
      messageElement.hidden = false;
      titleElement.textContent = result[0].title || "Campus notice";
      messageElement.textContent = result[0].message || "Open all notices for details.";
    } else {
      titleElement.hidden = true;
      messageElement.hidden = true;
    }
  } catch (error) {
    titleElement.hidden = true;
    messageElement.hidden = true;
  }
}
function openNotifications() {
  if (!notificationSetting.checked) {
    showMessage("Notifications are disabled in Settings.");
    return;
  }
  window.location.href = "notices.html";
}

rolePicker.addEventListener("change", function () {
  updateDashboard(this.value);
});

const initialUser = getStoredUser();
if (initialUser && dashboardContent[initialUser.role]) {
  rolePicker.value = initialUser.role;
  rolePicker.disabled = true;
  updateDashboard(initialUser.role);
} else {
  window.location.replace("index.html");
}

const topActions = document.querySelector(".top-actions");
if (topActions) {
  const logoutButton = document.createElement("button");
  logoutButton.type = "button";
  logoutButton.className = "link-button";
  logoutButton.textContent = "Log out";
  logoutButton.addEventListener("click", function () {
    [localStorage, sessionStorage].forEach(function (storage) {
      storage.removeItem("campusCareToken");
      storage.removeItem("campusCareUser");
      storage.removeItem("campusCareCurrentUser");
    });
    window.location.replace("index.html");
  });
  topActions.appendChild(logoutButton);
}

function showComplaintsList(searchText) {
  const search = (searchText || "").toLowerCase();

  const matchingComplaints = complaints.filter(function (complaint) {
    const matchesSearch = (
      String(complaint._id || "").toLowerCase().includes(search) ||
      String(complaint.title || "").toLowerCase().includes(search) ||
      String(complaint.category || "").toLowerCase().includes(search) ||
      String(complaint.status || "").toLowerCase().includes(search)
    );

    const status = String(complaint.status || "Submitted");
    const matchesStatus =
      activeStatusFilter === "all" ||
      (activeStatusFilter === "pending" && status === "Submitted") ||
      (activeStatusFilter === "resolved" && status === "Resolved") ||
      (activeStatusFilter === "review" &&
        ["Assigned", "In Progress", "Under Review"].includes(status));

    return matchesSearch && matchesStatus;
  });

  const pendingCount = complaints.filter(function (complaint) {
    return !["Resolved", "In Progress", "Under Review"].includes(complaint.status);
  }).length;

  const resolvedCount = complaints.filter(function (complaint) {
    return complaint.status === "Resolved";
  }).length;

  const reviewCount = complaints.filter(function (complaint) {
    return complaint.status === "In Progress" || complaint.status === "Under Review";
  }).length;

  document.getElementById("total-count").textContent = complaints.length;
  document.getElementById("pending-count").textContent = pendingCount;
  document.getElementById("resolved-count").textContent = resolvedCount;
  document.getElementById("review-count").textContent = reviewCount;
  updateLiveWidgets();
  updateActivityFeed();

  if (matchingComplaints.length === 0) {
    const title = complaints.length
      ? "No matching complaints"
      : "No complaints submitted";

    const helpText = complaints.length
      ? "Try another search."
      : "Use “Submit a New Complaint” to get started.";

    complaintList.innerHTML =
      '<tr><td colspan="6">' +
      '<div class="empty-state">' +
      "<span>▤</span>" +
      "<strong>" + title + "</strong>" +
      "<small>" + helpText + "</small>" +
      "</div></td></tr>";

    return;
  }

  complaintList.innerHTML = "";

  matchingComplaints.forEach(function (complaint, index) {
    const row = document.createElement("tr");

    const role = getStoredUser()?.role;
    const fullComplaintId = String(complaint._id || "");
    const complaintId = escapeText(fullComplaintId ? fullComplaintId.slice(0, 8) : "—");
    let actionHtml = "—";

    if (role === "department") {
      actionHtml = complaint.status === "Resolved"
        ? "Resolved"
        : '<button class="view-button" type="button" data-complaint-status="In Progress" data-id="' +
          escapeText(complaint._id) +
          '">In Progress</button> ' +
          '<button class="view-button" type="button" data-complaint-status="Resolved" data-id="' +
          escapeText(complaint._id) +
          '">Resolved</button>';
    } else if (role === "admin") {
      const recommendation = complaint.assignment || "";
      const recommendationLabel = !complaint.assignedTo &&
        recommendation.indexOf("Recommended department:") === 0
        ? '<small class="assignment-recommendation">' + escapeText(recommendation) + '</small> '
        : "";
      actionHtml = recommendationLabel +
        (complaint.assignedTo
          ? "Assigned to " + escapeText(complaint.assignedTo) + " "
          : "Not assigned ") +
        '<button class="view-button" type="button" data-assign-complaint data-id="' +
        escapeText(complaint._id) +
        '">' + (complaint.assignedTo ? "Reassign" : "Assign") + "</button>";
    }

    const statusText = String(complaint.status || "Pending");
    const statusClass = ({
      submitted: "submitted",
      pending: "pending",
      assigned: "assigned",
      "in progress": "in-progress",
      "under review": "under-review",
      resolved: "resolved",
      success: "success",
      error: "error"
    })[statusText.toLowerCase()] || "pending";

    row.innerHTML =
      '<td class="complaint-id" title="' + escapeText(fullComplaintId) + '">' + complaintId + "</td>" +
      "<td>" + escapeText(complaint.title) + "</td>" +
      "<td>" + escapeText(complaint.category || "Other") + "</td>" +
      "<td>" + escapeText(complaint.priority || "—") + "</td>" +
      "<td>" + escapeText(complaint.date || "—") + "</td>" +
      '<td><span class="status-label status-' + statusClass + '">' +
      escapeText(statusText) +
      "</span></td>" +
      "<td>" + actionHtml + "</td>";

    complaintList.appendChild(row);
  });
}
complaintList.addEventListener("click", async function (event) {
  const assignButton = event.target.closest("[data-assign-complaint]");
  if (assignButton) {
    const staffUsername = prompt("Enter the department staff login username:");
    if (!staffUsername || !staffUsername.trim()) return;

    const token =
      localStorage.getItem("campusCareToken") ||
      sessionStorage.getItem("campusCareToken");

    try {
      const response = await fetch(
        "/api/admin/complaints/" +
          encodeURIComponent(assignButton.dataset.id) +
          "/assign",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify({ staffUsername: staffUsername.trim() })
        }
      );

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (error) {
        throw new Error(
          "Server response (HTTP " + response.status + "): " +
          responseText.slice(0, 150)
        );
      }

      if (!response.ok) {
        throw new Error(result.message || "Complaint could not be assigned.");
      }

      showMessage(result.message || "Complaint assigned.");
      await loadComplaints();
    } catch (error) {
      showMessage(error.message || "Complaint could not be assigned.");
    }
    return;
  }

  const button = event.target.closest("[data-complaint-status]");
  if (!button) return;

  const token =
    localStorage.getItem("campusCareToken") ||
    sessionStorage.getItem("campusCareToken");

  if (!token) {
    showMessage("Please sign in again.");
    return;
  }

  try {
    const response = await fetch(
      "/api/department/complaints/" +
        encodeURIComponent(button.dataset.id) +
        "/status",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          status: button.dataset.complaintStatus
        })
      }
    );

   const responseText = await response.text();
let result;

try {
  result = JSON.parse(responseText);
} catch (error) {
  throw new Error(
    "Server response (HTTP " + response.status + "): " +
    responseText.slice(0, 150)
  );
}
    if (!response.ok) {
      throw new Error(result.message || "Status could not be updated.");
    }

    showMessage(result.message);
    await loadComplaints();
  } catch (error) {
    showMessage(error.message || "Unable to connect to the server.");
  }
});


document.addEventListener("click", function (event) {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  const action = actionButton.dataset.action;

  if (action === "new") {
    event.preventDefault();
    openComplaintForm();
    closeMenu();
  } else if (action === "complaints") {
    event.preventDefault();
    if (getStoredUser()?.role === "student" && !actionButton.dataset.statusFilter) {
      window.location.href = "my-complaints.html";
    } else {
      showComplaints(actionButton.dataset.statusFilter || "all");
    }
  } else if (action === "notifications") {
    event.preventDefault();
    openNotifications();
  } else if (action === "profile") {
    event.preventDefault();
    document.getElementById("profile-modal").hidden = false;
    closeMenu();
  } else if (action === "settings") {
    event.preventDefault();
    document.getElementById("settings-modal").hidden = false;
    closeMenu();
  }
});

document.getElementById("close-modal").addEventListener(
  "click",
  closeComplaintForm
);

complaintModal.addEventListener("click", function (event) {
  if (event.target === complaintModal) {
    closeComplaintForm();
  }
});

document.querySelectorAll("[data-close-modal]").forEach(function (button) {
  button.addEventListener("click", function () {
    document.getElementById(button.dataset.closeModal).hidden = true;
  });
});

document.querySelectorAll(".modal-backdrop").forEach(function (backdrop) {
  backdrop.addEventListener("click", function (event) {
    if (event.target === backdrop) {
      backdrop.hidden = true;
    }
  });
});

complaintForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const savedUser =
    localStorage.getItem("campusCareUser") ||
    sessionStorage.getItem("campusCareUser");

  const token =
    localStorage.getItem("campusCareToken") ||
    sessionStorage.getItem("campusCareToken");

  let user = null;

  try {
    user = savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    user = null;
  }

  if (!token || !user) {
    showMessage("Please sign in before submitting a complaint.");
    return;
  }

  if (user.role !== "student") {
    showMessage("Please sign in with a student account to submit a complaint.");
    return;
  }

  const complaint = {
    title: document.getElementById("complaint-title").value.trim(),
    description: document.getElementById("complaint-description").value.trim()
  };

  if (!complaint.title || !complaint.description) {
    showMessage("Title and description are required.");
    return;
  }
  try {
    const response = await fetch("/api/complaints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(complaint)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "complaint could not be submitted.");
    }

    complaintForm.reset();
    closeComplaintForm();
    const savedComplaint = result.complaint || {};
    const duplicateIds = Array.isArray(result.possibleDuplicateIds)
      ? result.possibleDuplicateIds
      : [];
    const duplicateNote = duplicateIds.length
      ? " Similar complaint may already exist: " + duplicateIds.map(function (id) {
          return "#" + String(id).slice(0, 8);
        }).join(", ") + "."
      : "";
    showMessage(
      "Complaint submit ho gayi. Category: " +
      (savedComplaint.category || "Other") +
      " | Priority: " + (savedComplaint.priority || "Low") +
      "." + duplicateNote
    );
    await loadComplaints();
  } catch (error) {
    showMessage(error.message || "Unable to connect to the server.");
  }
});


const notificationSetting =
  document.getElementById("notification-setting");

function updateNotificationSettings() {
  const enabled = notificationSetting.checked;

  localStorage.setItem(
    "campFixrNotifications",
    enabled ? "on" : "off"
  );

  document.querySelectorAll(".notice-card").forEach(function (item) {
    item.hidden = !enabled;
  });

  const notificationLink =
    document.querySelector('[data-action="notifications"]');

  if (notificationLink) {
    notificationLink.hidden = !enabled;
  }

  document.getElementById("bell-button").setAttribute(
    "aria-label",
    enabled ? "Notifications" : "Notifications disabled"
  );
}

notificationSetting.checked =
  localStorage.getItem("campFixrNotifications") !== "off";

updateNotificationSettings();

notificationSetting.addEventListener(
  "change",
  updateNotificationSettings
);

document.getElementById("bell-button").addEventListener("click", function () {
  openNotifications();
});

document.getElementById("mobile-menu").addEventListener("click", function () {
  sidebar.classList.add("open");
  mobileScrim.classList.add("show");
});

mobileScrim.addEventListener("click", closeMenu);


searchInput.addEventListener("input", function () {
  showComplaintsList(searchInput.value);
});

document.getElementById("year").textContent = new Date().getFullYear();

async function loadComplaintStatistics() {
  const token = localStorage.getItem("campusCareToken") ||
    sessionStorage.getItem("campusCareToken");
  if (!token) return;
  try {
    const response = await fetch("/api/complaint-statistics", {
      headers: { "Authorization": "Bearer " + token }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Statistics could not be loaded.");
    complaintStatistics = result;
    updateLiveWidgets();
  } catch (error) {
    complaintStatistics = null;
  }
}

async function loadComplaints() {
  const savedUser =
    localStorage.getItem("campusCareUser") ||
    sessionStorage.getItem("campusCareUser");

  const token =
    localStorage.getItem("campusCareToken") ||
    sessionStorage.getItem("campusCareToken");

  let user = null;

  try {
    user = savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    user = null;
  }

  if (!token || !user) {
    complaints = [];
    showComplaintsList(searchInput.value);
    return;
  }

  let url;

    if (user.role === "student") {
    url = "/api/complaints/" + encodeURIComponent(user.username);
  } else if (user.role === "admin") {
    url = "/api/admin/complaints";
  } else if (user.role === "department") {
    url = "/api/department/complaints";
  } else {
    complaints = [];
    showComplaintsList(searchInput.value);
    showMessage("Account role could not be identified.");
    return;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Complaints could not be loaded.");
    }

    complaints = result;
    complaintStatistics = null;
    showComplaintsList(searchInput.value);
    await loadComplaintStatistics();
  } catch (error) {
    showMessage(error.message || "Complaints could not be loaded.");
  }
}

loadComplaints();
loadImportantNotice();