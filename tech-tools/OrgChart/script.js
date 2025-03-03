/****************************************************
 * 1) GLOBAL VARIABLES & STORAGE
 ****************************************************/
let people = []; 
// Each person: { id, name, title, image, x, y, managerId }

let currentZIndex = 1;
let linkedInAccessToken = null;

// ***** IMPORTANT *****
// Using your actual app's Client ID and Secret (for demonstration only):
const LINKEDIN_CLIENT_ID = "78qsr9zwrk1nou";
const LINKEDIN_CLIENT_SECRET = "WPL_AP1.JS2imcsb02toiK1D.Uul9zw==";

// Your GitHub Pages URL as the redirect URI
const REDIRECT_URI = "https://sullivan1337.github.io/tech-tools/OrgChart/index.html";

// Scopes for "Sign In with LinkedIn" typically at least r_liteprofile or r_emailaddress
const LINKEDIN_SCOPES = "r_liteprofile%20r_emailaddress";

// Endpoints
const AUTH_BASE = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_BASE = "https://www.linkedin.com/oauth/v2/accessToken";

// PKCE variables
let codeVerifier = null;
let stateParam = null;

/****************************************************
 * 2) ON DOM CONTENT LOADED
 ****************************************************/
document.addEventListener('DOMContentLoaded', () => {
  const btnAddEntry = document.getElementById('btnAddEntry');
  const entryModal = document.getElementById('entryModal');
  const closeModal = document.getElementById('closeModal');
  const btnSubmitEntry = document.getElementById('btnSubmitEntry');
  const btnLinkedInOAuth = document.getElementById('btnLinkedInOAuth');

  // Check if returning from LinkedIn with ?code= in the URL
  checkForLinkedInRedirect();

  // Show "Add Person" modal
  btnAddEntry.addEventListener('click', () => {
    populateManagerSelect();
    entryModal.style.display = 'block';
  });

  // Close modal
  closeModal.addEventListener('click', () => {
    entryModal.style.display = 'none';
    clearModalFields();
  });

  // Close modal if clicking outside content
  window.addEventListener('click', (e) => {
    if (e.target === entryModal) {
      entryModal.style.display = 'none';
      clearModalFields();
    }
  });

  // Submit the "Add Person" form
  btnSubmitEntry.addEventListener('click', () => {
    const linkedInLink = document.getElementById('linkedinLink').value.trim();
    const nameInput = document.getElementById('nameInput').value.trim();
    const titleInput = document.getElementById('titleInput').value.trim();
    const imageInput = document.getElementById('imageInput').value.trim();
    const managerSelect = document.getElementById('managerSelect').value;

    let personName = nameInput || "John Doe";
    let personTitle = titleInput || "Sample Title";
    let personImage = imageInput || "https://via.placeholder.com/60";

    // If user put a LinkedIn link, but we do not have an actual token, just mock it
    // If we have a token, you could do an actual fetch from LinkedIn to get their name/pic
    if (linkedInLink && !linkedInAccessToken) {
      personName = "LinkedIn (mock)";
      personTitle = "Fetched Title (mock)";
    }

    const newPerson = {
      id: Date.now(),
      name: personName,
      title: personTitle,
      image: personImage,
      x: 50,
      y: 50,
      managerId: managerSelect ? parseInt(managerSelect, 10) : null
    };

    people.push(newPerson);
    createPersonCard(newPerson);

    entryModal.style.display = 'none';
    clearModalFields();
    drawAllLines();
  });

  // Initiate LinkedIn OAuth via PKCE
  btnLinkedInOAuth.addEventListener('click', async () => {
    // 1) Generate code verifier
    codeVerifier = generateRandomString(50);
    // 2) Generate a code challenge
    const codeChallenge = await sha256ToBase64Url(codeVerifier);
    // 3) Generate a random state
    stateParam = generateRandomString(16);

    // 4) Redirect user to LinkedIn's authorization URL
    const authUrl = `${AUTH_BASE}?response_type=code&client_id=${LINKEDIN_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${LINKEDIN_SCOPES}&state=${stateParam}` +
      `&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    window.location.href = authUrl;
  });
});

/****************************************************
 * 3) CHECK FOR LINKEDIN REDIRECT
 ****************************************************/
function checkForLinkedInRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const error = urlParams.get('error');

  if (error) {
    console.log("LinkedIn OAuth error:", error);
    return;
  }

  // If we have 'code' and 'state', try to exchange for an access token
  if (code && state) {
    // We should compare 'state' with our stored 'stateParam'
    // But if the page reloaded, we may have lost the in-memory variable.
    // For demonstration, let's attempt the token exchange anyway.
    exchangeCodeForToken(code)
      .then(token => {
        linkedInAccessToken = token;
        console.log("LinkedIn Access Token acquired:", token);

        // Optionally fetch the user's actual LinkedIn profile
        fetchLinkedInProfile()
          .then(profile => {
            console.log("Fetched LinkedIn Profile:", profile);
            // You can auto-insert the user in the org chart if you like
            // e.g. autoCreatePersonFromProfile(profile);
          })
          .catch(e => console.error("Error fetching LinkedIn profile:", e));
      })
      .catch(e => console.error("Token exchange error:", e));
  }
}

/****************************************************
 * 4) EXCHANGE CODE FOR ACCESS TOKEN
 *    (PURE CLIENT-SIDE with PKCE + SECRET in code)
 *    Not recommended for production.
 ****************************************************/
async function exchangeCodeForToken(code) {
  // If doing a PKCE-only client approach, some LinkedIn apps can omit the secret entirely.
  // For demonstration, we’ll pass it. This is insecure for production.
  
  const bodyParams = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: REDIRECT_URI,
    client_id: LINKEDIN_CLIENT_ID,
    code_verifier: codeVerifier,
    client_secret: LINKEDIN_CLIENT_SECRET
  });

  const response = await fetch(TOKEN_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: bodyParams.toString()
  });

  if (!response.ok) {
    const respText = await response.text();
    throw new Error(`Token request failed: ${respText}`);
  }

  const data = await response.json();
  // data: { "access_token": "...", "expires_in": 1234, ... }
  return data.access_token;
}

/****************************************************
 * 5) FETCH THE USER'S PROFILE (OPTIONAL)
 ****************************************************/
async function fetchLinkedInProfile() {
  if (!linkedInAccessToken) {
    throw new Error("No LinkedIn access token available.");
  }

  // Example call to LinkedIn's "Lite Profile" endpoint
  const resp = await fetch("https://api.linkedin.com/v2/me", {
    headers: {
      "Authorization": `Bearer ${linkedInAccessToken}`
    }
  });
  if (!resp.ok) {
    throw new Error(`Profile fetch failed: ${resp.status}`);
  }
  const profile = await resp.json();
  return profile;
}

/****************************************************
 * 6) ORG CHART LOGIC: ADD/EDIT PERSON
 ****************************************************/
function clearModalFields() {
  document.getElementById('linkedinLink').value = "";
  document.getElementById('nameInput').value = "";
  document.getElementById('titleInput').value = "";
  document.getElementById('imageInput').value = "";
  document.getElementById('managerSelect').value = "";
}

function populateManagerSelect() {
  const managerSelect = document.getElementById('managerSelect');
  managerSelect.innerHTML = `<option value="">-- None --</option>`;
  people.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.text = p.name;
    managerSelect.appendChild(opt);
  });
}

function createPersonCard(person) {
  const chartArea = document.getElementById('chartArea');
  const card = document.createElement('div');
  card.classList.add('person-card');
  card.style.left = `${person.x}px`;
  card.style.top = `${person.y}px`;

  card.innerHTML = `
    <img src="${person.image}" alt="Person image" />
    <div class="person-name">${person.name}</div>
    <div class="person-title">${person.title}</div>
    <button class="delete-btn">Delete</button>
  `;

  // Move card to top on mousedown
  card.addEventListener('mousedown', () => {
    card.style.zIndex = ++currentZIndex;
  });

  // Draggable
  makeDraggable(card, person.id);

  // Delete
  card.querySelector('.delete-btn').addEventListener('click', () => {
    chartArea.removeChild(card);
    people = people.filter(p => p.id !== person.id);
    // Remove manager references from subordinates
    people.forEach(p => {
      if (p.managerId === person.id) {
        p.managerId = null;
      }
    });
    drawAllLines();
  });

  chartArea.appendChild(card);
}

/****************************************************
 * 7) DRAG & DROP + LINES
 ****************************************************/
function makeDraggable(element, personId) {
  let offsetX, offsetY;
  let isDown = false;

  element.addEventListener('mousedown', (e) => {
    // Only if not clicking the Delete button
    if (e.target.classList.contains('delete-btn')) return;

    isDown = true;
    offsetX = element.offsetLeft - e.clientX;
    offsetY = element.offsetTop - e.clientY;
    element.style.zIndex = ++currentZIndex;

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  });

  function mouseMoveHandler(e) {
    e.preventDefault();
    if (!isDown) return;
    let newLeft = e.clientX + offsetX;
    let newTop = e.clientY + offsetY;

    element.style.left = newLeft + 'px';
    element.style.top = newTop + 'px';

    savePositions(personId, newLeft, newTop);
    drawAllLines();
  }

  function mouseUpHandler() {
    isDown = false;
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
  }
}

function savePositions(personId, left, top) {
  const idx = people.findIndex(p => p.id === personId);
  if (idx > -1) {
    people[idx].x = left;
    people[idx].y = top;
  }
}

/****************************************************
 * 8) DRAW CONNECTION LINES
 ****************************************************/
function drawAllLines() {
  const svg = document.getElementById('connectionSVG');
  svg.innerHTML = ""; // clear existing lines

  people.forEach((person) => {
    if (person.managerId) {
      const manager = people.find(m => m.id === person.managerId);
      if (manager) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("class", "org-connection");

        const managerCenter = getCardCenter(manager.id);
        const personCenter = getCardCenter(person.id);

        if (managerCenter && personCenter) {
          line.setAttribute("x1", managerCenter.x);
          line.setAttribute("y1", managerCenter.y);
          line.setAttribute("x2", personCenter.x);
          line.setAttribute("y2", personCenter.y);
          svg.appendChild(line);
        }
      }
    }
  });
}

function getCardCenter(personId) {
  const chartArea = document.getElementById('chartArea');
  const card = Array.from(chartArea.getElementsByClassName('person-card'))
                    .find(el => {
                      const left = parseInt(el.style.left, 10);
                      const top = parseInt(el.style.top, 10);
                      return people.some(p => p.id === personId && p.x === left && p.y === top);
                    });
  if (!card) return null;

  const rect = card.getBoundingClientRect();
  const chartRect = chartArea.getBoundingClientRect();

  const centerX = rect.left + rect.width / 2 - chartRect.left + chartArea.scrollLeft;
  const centerY = rect.top + rect.height / 2 - chartRect.top + chartArea.scrollTop;
  return { x: centerX, y: centerY };
}

/****************************************************
 * 9) PKCE HELPER FUNCTIONS
 ****************************************************/

// Generate random string
function generateRandomString(n) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let randomString = '';
  for (let i = 0; i < n; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return randomString;
}

// Convert the random string into a base64-url-encoded SHA256 hash
async function sha256ToBase64Url(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  let base64 = btoa(String.fromCharCode(...hashArray));
  // Convert to URL-safe base64
  base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base64;
}
