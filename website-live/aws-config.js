// ═══════════════════════════════════════════════════════════
// Smart CivicFix — AWS Configuration
// ═══════════════════════════════════════════════════════════
// INSTRUCTIONS: Replace the placeholder values below with
// your actual AWS Cognito and API Gateway values.
// ═══════════════════════════════════════════════════════════

const AWS_CONFIG = {
  region: "ap-south-1",                                    // ← your AWS region (Mumbai)
  cognito: {
    userPoolId: "ap-south-1_bq7OXcPNM",                    // ← from Cognito console
    clientId: "51umr59rap4m88223cgno5bnf5",                // ← App Client ID
  },
  apiBaseUrl: "https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com/prod"  // ← API Gateway URL
};

// ─── Cognito Auth Helpers ───────────────────────────────────

const Auth = {

  // Get the currently stored tokens
  getTokens() {
    const tokens = localStorage.getItem("civicfix_tokens");
    return tokens ? JSON.parse(tokens) : null;
  },

  // Store tokens after login
  setTokens(tokens) {
    localStorage.setItem("civicfix_tokens", JSON.stringify(tokens));
  },

  // Clear tokens on logout
  clearTokens() {
    localStorage.removeItem("civicfix_tokens");
  },

  // Get the ID token (used for API auth)
  getIdToken() {
    const tokens = this.getTokens();
    return tokens ? tokens.idToken : null;
  },

  // Get the access token
  getAccessToken() {
    const tokens = this.getTokens();
    return tokens ? tokens.accessToken : null;
  },

  // Decode a JWT token payload (no verification — that's server-side)
  decodeToken(token) {
    try {
      const payload = token.split(".")[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  },

  // Get current user info from the stored ID token
  getCurrentUser() {
    const idToken = this.getIdToken();
    if (!idToken) return null;
    const decoded = this.decodeToken(idToken);
    if (!decoded) return null;

    // Check expiry
    if (decoded.exp * 1000 < Date.now()) {
      this.clearTokens();
      return null;
    }

    return {
      userId: decoded.sub,
      email: decoded.email,
      name: decoded.name || decoded.email,
      groups: decoded["cognito:groups"] || []
    };
  },

  // Check if the user is logged in
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  // Check if user is an admin
  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.groups.includes("admin");
  },

  // Require auth — redirect to login if not authenticated
  requireAuth(redirectUrl = "login.html") {
    if (!this.isLoggedIn()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  },

  // Require admin — redirect if not admin
  requireAdmin(redirectUrl = "admin-login.html") {
    if (!this.isAdmin()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  },

  // ─── Cognito Auth API calls ──────────────────────────────

  // Sign up a new user
  async signUp(name, email, password) {
    const response = await fetch(
      `https://cognito-idp.${AWS_CONFIG.region}.amazonaws.com/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": "AWSCognitoIdentityProviderService.SignUp" },
        body: JSON.stringify({
          ClientId: AWS_CONFIG.cognito.clientId,
          Username: email,
          Password: password,
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "name", Value: name }
          ]
        })
      }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.__type || "Sign up failed");
    return data;
  },

  // Confirm sign-up (verification code)
  async confirmSignUp(email, code) {
    const response = await fetch(
      `https://cognito-idp.${AWS_CONFIG.region}.amazonaws.com/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": "AWSCognitoIdentityProviderService.ConfirmSignUp" },
        body: JSON.stringify({
          ClientId: AWS_CONFIG.cognito.clientId,
          Username: email,
          ConfirmationCode: code
        })
      }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.__type || "Confirmation failed");
    return data;
  },

  // Sign in
  async signIn(email, password) {
    const response = await fetch(
      `https://cognito-idp.${AWS_CONFIG.region}.amazonaws.com/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth" },
        body: JSON.stringify({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: AWS_CONFIG.cognito.clientId,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password
          }
        })
      }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.__type || "Sign in failed");

    // Store tokens
    const result = data.AuthenticationResult;
    this.setTokens({
      idToken: result.IdToken,
      accessToken: result.AccessToken,
      refreshToken: result.RefreshToken
    });

    return this.getCurrentUser();
  },

  // Sign out
  signOut() {
    this.clearTokens();
    window.location.href = "index.html";
  },

  // Admin sign out
  adminSignOut() {
    this.clearTokens();
    window.location.href = "admin-login.html";
  }
};
