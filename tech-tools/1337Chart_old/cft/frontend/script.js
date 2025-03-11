// Configuration – update these with your deployed API Gateway endpoint and LinkedIn Client ID
const API_BASE_URL = "https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/Prod";
const LINKEDIN_CLIENT_ID = "YOUR_LINKEDIN_CLIENT_ID";
const REDIRECT_URI = window.location.origin + window.location.pathname; 
const SCOPE = "openid profile email";  
const STATE = "staticStateForDemo";  // For demo only; in production, generate random state

// PKCE helper functions
function generateCodeVerifier() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let verifier = "";
  for (let i = 0; i < 128; i++) {
    verifier += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return verifier;
}
function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

// On load, check for auth code in URL
window.onload = async function() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("code")) {
    const code = params.get("code");
    const storedVerifier = sessionStorage.getItem("linkedin_code_verifier");
    if (!storedVerifier) {
      alert("Missing code verifier. Please try again.");
      return;
    }
    // Exchange code for token and get user info via backend API
    const resp = await fetch(API_BASE_URL + "/auth", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ code: code, codeVerifier: storedVerifier })
    });
    const data = await resp.json();
    if (data.status === "ok") {
      sessionStorage.removeItem("linkedin_code_verifier");
      history.replaceState({}, "", window.location.pathname);
      document.getElementById("loginSection").style.display = "none";
      document.getElementById("appSection").style.display = "block";
      document.getElementById("userName").innerText = data.user.name;
      window.currentUser = data.user;
      loadOrgChart();
    } else {
      alert("Authentication failed.");
    }
  }
};

// Login button handler
document.getElementById("loginBtn").onclick = async function() {
  const codeVerifier = generateCodeVerifier();
  sessionStorage.setItem("linkedin_code_verifier", codeVerifier);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const authUrl = "https://www.linkedin.com/oauth/v2/authorization" +
    `?response_type=code&client_id=${encodeURIComponent(LINKEDIN_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPE)}` +
    `&state=${encodeURIComponent(STATE)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    "&code_challenge_method=S256";
  window.location.href = authUrl;
};

// Load org chart from backend API
async function loadOrgChart() {
  if (!window.currentUser) return;
  const resp = await fetch(API_BASE_URL + "/orgchart?userId=" + encodeURIComponent(window.currentUser.id));
  const data = await resp.json();
  const container = document.getElementById("orgChart");
  container.innerHTML = JSON.stringify(data, null, 2);
}

// Add member handler
document.getElementById("addMemberBtn").onclick = async function() {
  const name = document.getElementById("newName").value;
  const title = document.getElementById("newTitle").value;
  if (!name || !title) { alert("Please fill in both fields."); return; }
  const resp = await fetch(API_BASE_URL + "/orgchart", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ userId: window.currentUser.id, name: name, title: title })
  });
  const result = await resp.json();
  if (result.status === "ok") {
    loadOrgChart();
  } else {
    alert("Failed to add member.");
  }
};
