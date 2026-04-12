// ═══════════════════════════════════════════════════════════
// Smart CivicFix — Admin Dashboard Logic
// ═══════════════════════════════════════════════════════════

// ── Auth Guard ──────────────────────────────────────────────
if (!Auth.requireAdmin()) {
  // Redirects to admin-login.html
}

// ── Global State ────────────────────────────────────────────
let allIssues = [];
let allUsers = [];
let currentFilter = "all";

// ── Initialize ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const user = Auth.getCurrentUser();
  if (user) {
    document.getElementById("adminGreeting").textContent = `Signed in as ${user.email}`;
  }

  // Tab switching
  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".admin-tab-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    });
  });

  // Filter buttons
  document.querySelectorAll(".admin-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderIssuesTable();
    });
  });

  // Load data
  loadAdminData();
});

// ── Load All Data ───────────────────────────────────────────
async function loadAdminData() {
  try {
    // Load issues, users, and stats in parallel
    const [issuesData, usersData, statsData] = await Promise.all([
      API.adminGetAllIssues().catch(() => []),
      API.adminGetAllUsers().catch(() => []),
      API.adminGetStats().catch(() => ({}))
    ]);

    allIssues = Array.isArray(issuesData) ? issuesData : (issuesData.issues || []);
    allUsers = Array.isArray(usersData) ? usersData : (usersData.users || []);

    // Update stats cards
    const stats = statsData;
    document.getElementById("sTotalReported").textContent = stats.totalReported || allIssues.length || 0;
    document.getElementById("sTotalResolved").textContent = stats.totalResolved || allIssues.filter(i => i.status === "resolved").length || 0;
    document.getElementById("sTotalProgress").textContent = stats.totalInProgress || allIssues.filter(i => i.status === "in-progress").length || 0;
    document.getElementById("sTotalPending").textContent = stats.totalPending || allIssues.filter(i => i.status === "reported").length || 0;
    document.getElementById("sTotalUsers").textContent = stats.totalUsers || allUsers.length || 0;

    // Render tables
    renderIssuesTable();
    renderUsersTable();

  } catch (err) {
    console.error("Admin data load error:", err);
    document.getElementById("issuesTbody").innerHTML = `
      <tr><td colspan="7" style="text-align:center; padding:40px; color:#ef4444;">
        Failed to load data. Ensure your API is configured correctly.
      </td></tr>`;
  }
}

// ── Render Issues Table ─────────────────────────────────────
function renderIssuesTable() {
  const tbody = document.getElementById("issuesTbody");
  
  const filtered = currentFilter === "all" 
    ? allIssues 
    : allIssues.filter(i => i.status === currentFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7" class="admin-empty">
        <p>📋</p>
        <p>No issues found${currentFilter !== "all" ? ` with status "${currentFilter}"` : ""}.</p>
      </td></tr>`;
    return;
  }

  // Sort by date (newest first)
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  tbody.innerHTML = filtered.map(issue => {
    const dateStr = issue.createdAt 
      ? new Date(issue.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
      : "—";

    // Find user name
    const user = allUsers.find(u => u.userId === issue.userId);
    const userName = user ? user.name : (issue.userName || issue.userId || "Unknown");

    return `
      <tr data-issue-id="${issue.issueId}" data-status="${issue.status}">
        <td><strong>${issue.refId || "—"}</strong></td>
        <td>${issue.type || "—"}</td>
        <td>📍 ${issue.location || "—"}</td>
        <td>${userName}</td>
        <td>${dateStr}</td>
        <td>
          <select class="status-select" onchange="changeStatus('${issue.issueId}', this.value)" ${issue.status === "resolved" ? "disabled" : ""}>
            <option value="reported" ${issue.status === "reported" ? "selected" : ""}>📋 Reported</option>
            <option value="in-progress" ${issue.status === "in-progress" ? "selected" : ""}>⏳ In Progress</option>
            <option value="resolved" ${issue.status === "resolved" ? "selected" : ""}>✅ Resolved</option>
          </select>
        </td>
        <td>
          <button class="admin-action-btn delete" onclick="deleteIssue('${issue.issueId}')">🗑️ Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

// ── Render Users Table ──────────────────────────────────────
function renderUsersTable() {
  const tbody = document.getElementById("usersTbody");

  if (allUsers.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="4" class="admin-empty">
        <p>👥</p>
        <p>No registered users yet.</p>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = allUsers.map(user => {
    const dateStr = user.createdAt 
      ? new Date(user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
      : "—";

    return `
      <tr>
        <td><strong>${user.name || "—"}</strong></td>
        <td>${user.email || "—"}</td>
        <td><span class="user-points">⭐ ${user.points || 0} pts</span></td>
        <td>${dateStr}</td>
      </tr>
    `;
  }).join("");
}

// ── Change Issue Status ─────────────────────────────────────
async function changeStatus(issueId, newStatus) {
  try {
    await API.adminUpdateIssueStatus(issueId, newStatus);

    // Update local state
    const issue = allIssues.find(i => i.issueId === issueId);
    if (issue) {
      issue.status = newStatus;
    }

    // Refresh stats
    const resolved = allIssues.filter(i => i.status === "resolved").length;
    const progress = allIssues.filter(i => i.status === "in-progress").length;
    const pending = allIssues.filter(i => i.status === "reported").length;

    document.getElementById("sTotalResolved").textContent = resolved;
    document.getElementById("sTotalProgress").textContent = progress;
    document.getElementById("sTotalPending").textContent = pending;

    // Re-render if filter is active
    if (currentFilter !== "all") {
      renderIssuesTable();
    }

  } catch (err) {
    alert("Failed to update status: " + err.message);
    // Reload to reset
    loadAdminData();
  }
}

// ── Delete Issue ────────────────────────────────────────────
async function deleteIssue(issueId) {
  const issue = allIssues.find(i => i.issueId === issueId);
  if (!confirm(`Delete issue ${issue ? issue.refId : issueId}? This cannot be undone.`)) {
    return;
  }

  try {
    await API.adminDeleteIssue(issueId);

    // Remove from local state
    allIssues = allIssues.filter(i => i.issueId !== issueId);

    // Update stats
    document.getElementById("sTotalReported").textContent = allIssues.length;
    document.getElementById("sTotalResolved").textContent = allIssues.filter(i => i.status === "resolved").length;
    document.getElementById("sTotalProgress").textContent = allIssues.filter(i => i.status === "in-progress").length;
    document.getElementById("sTotalPending").textContent = allIssues.filter(i => i.status === "reported").length;

    // Re-render
    renderIssuesTable();

  } catch (err) {
    alert("Failed to delete issue: " + err.message);
  }
}
