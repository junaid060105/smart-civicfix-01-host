// ═══════════════════════════════════════════════════════════
// Smart CivicFix — API Client
// ═══════════════════════════════════════════════════════════
// Centralized fetch wrapper that talks to the API Gateway
// endpoints and automatically attaches the auth token.
// ═══════════════════════════════════════════════════════════

const API = {

  // Base fetch helper
  async _fetch(endpoint, options = {}) {
    const url = `${AWS_CONFIG.apiBaseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers
    };

    // Attach auth token if available
    const token = Auth.getIdToken();
    if (token) {
      headers["Authorization"] = token;
    }

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || `API error: ${response.status}`);
    }

    return data;
  },

  // ─── User Endpoints ──────────────────────────────────────

  // Create user profile (called after Cognito sign-up)
  async createUser(userId, name, email) {
    return this._fetch("/api/users", {
      method: "POST",
      body: JSON.stringify({ userId, name, email })
    });
  },

  // Get user profile
  async getUser(userId) {
    return this._fetch(`/api/users/${userId}`);
  },

  // ─── Issue Endpoints ─────────────────────────────────────

  // Submit a new issue
  async submitIssue(issueData) {
    return this._fetch("/api/issues", {
      method: "POST",
      body: JSON.stringify(issueData)
    });
  },

  // Get issues by user ID (for dashboard & history)
  async getUserIssues(userId) {
    return this._fetch(`/api/issues?userId=${userId}`);
  },

  // Get all issues (for map — limited fields)
  async getAllIssues() {
    return this._fetch("/api/issues/all");
  },

  // Track an issue by reference ID
  async trackIssue(refId) {
    return this._fetch(`/api/issues/track/${encodeURIComponent(refId)}`);
  },

  // ─── Stats Endpoints ─────────────────────────────────────

  // Get global stats (for homepage counters)
  async getStats() {
    return this._fetch("/api/stats");
  },

  // ─── Rewards Endpoints ───────────────────────────────────

  // Redeem a reward
  async redeemReward(userId, reward, cost) {
    return this._fetch("/api/rewards/redeem", {
      method: "POST",
      body: JSON.stringify({ userId, reward, cost })
    });
  },

  // ─── Admin Endpoints ─────────────────────────────────────

  // Get all issues (admin)
  async adminGetAllIssues(status = "all", page = 1) {
    let endpoint = `/api/admin/issues?page=${page}`;
    if (status && status !== "all") endpoint += `&status=${status}`;
    return this._fetch(endpoint);
  },

  // Update issue status (admin)
  async adminUpdateIssueStatus(issueId, status) {
    return this._fetch(`/api/admin/issues/${issueId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },

  // Delete issue (admin)
  async adminDeleteIssue(issueId) {
    return this._fetch(`/api/admin/issues/${issueId}`, {
      method: "DELETE"
    });
  },

  // Get all users (admin)
  async adminGetAllUsers() {
    return this._fetch("/api/admin/users");
  },

  // Get admin dashboard stats
  async adminGetStats() {
    return this._fetch("/api/admin/stats");
  }
};
