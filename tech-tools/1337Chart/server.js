const express = require('express');
const bodyParser = require('body-parser');
// Node.js v18+ provides a global fetch.
const app = express();
const PORT = process.env.PORT || 3000;

// Set CORS headers for all responses (adjust origin as needed)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all for now
  next();
});

// Use the exact redirect URI as registered in your LinkedIn Developer App.
const REDIRECT_URI = "https://1337chart.elysiuma.com/index.html";

const LINKEDIN_CLIENT_ID = "78qsr9zwrk1nou";
const LINKEDIN_CLIENT_SECRET = "WPL_AP1.JS2imcsb02toiK1D.Uul9zw==";
const TOKEN_BASE = "https://www.linkedin.com/oauth/v2/accessToken";

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/**
 * Token exchange endpoint (without PKCE).
 * Expects JSON body: { code: "authorization_code" }
 */
app.post('/exchangeToken', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', REDIRECT_URI);
  params.append('client_id', LINKEDIN_CLIENT_ID.trim());
  params.append('client_secret', LINKEDIN_CLIENT_SECRET.trim());

  console.log("Token exchange params:", params.toString());

  try {
    const tokenRes = await fetch(TOKEN_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return res.status(tokenRes.status).json({ error: text });
    }
    const data = await tokenRes.json();
    return res.json(data);
  } catch(err) {
    console.error("Token exchange error:", err);
    return res.status(500).json({ error: err.toString() });
  }
});

/**
 * New endpoint to proxy the LinkedIn user info request.
 * Expects a query parameter: access_token
 */
app.get('/fetchUserInfo', async (req, res) => {
  const token = req.query.access_token;
  if (!token) {
    return res.status(400).json({ error: "Missing access_token" });
  }

  try {
    const userInfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      method: 'GET',
      headers: {
        "Authorization": `Bearer ${token}`,
        "Connection": "Keep-Alive"
      }
    });
    if (!userInfoRes.ok) {
      const text = await userInfoRes.text();
      return res.status(userInfoRes.status).json({ error: text });
    }
    const data = await userInfoRes.json();
    return res.json(data);
  } catch(err) {
    console.error("User info fetch error:", err);
    return res.status(500).json({ error: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
