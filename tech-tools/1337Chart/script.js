/****************************************************
 * 1) GLOBAL VARIABLES & STORAGE
 ****************************************************/
let people = []; 
// Each person: { id, name, title, image, x, y, managerId }

let currentZIndex = 1;
let linkedInAccessToken = null;

/** 
 * If you have a LinkedIn Dev App with “openid, profile, email” 
 * enabled, you can do an OIDC flow.
 * 
 * WARNING: Storing client_secret in JS is not secure. 
 */

// Your App's Client ID + Secret
const LINKEDIN_CLIENT_ID = "78qsr9zwrk1nou";
const LINKEDIN_CLIENT_SECRET = "WPL_AP1.JS2imcsb02toiK1D.Uul9zw==";

// GitHub Pages redirect
const REDIRECT_URI = "https://sullivan1337.github.io/tech-tools/OrgChart/index.html";

// OIDC Scopes for "Sign in with LinkedIn V2"
const LINKEDIN_SCOPES = "openid%20profile%20email";

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

  // 1) Check if returning from LinkedIn with ?code=...
  checkForLinkedInRedirect();

  // 2) "Add Person" button -> open modal
  btnAddEntry.addEventListener('click', () => {
    populateManagerSelect();
    entryModal.style.display = 'block';
  });

  // 3) Modal close
  closeModal.addEventListener('click', () => {
    entryModal.style.display = 'none';
    clearModalFields();
  });

  window.addEventListener('click', (e) => {
    if (e.target === entryModal) {
      entryModal.style.display = 'none';
      clearModalFields();
    }
  });

  // 4) Submitting the "Add Person" form
  btnSubmitEntry.addEventListener('click', () => {
    const linkedInLink = document.getElementById('linkedinLink').value.trim();
    const nameInput = document.getElementById('nameInput').value.trim();
    const titleInput = document.getElementById('titleInput').value.trim();
    const imageInput = document.getElementById('imageInput').value.trim();
    const managerSelect = document.getElementById('managerSelect').value;

    let personName = nameInput || "John Doe";
    let personTitle = titleInput || "Sample Title";
    let personImage = imageInput || "https://via.placeholder.com/60";

    // If user typed a LinkedIn link, we *could* fetch real data via userinfo if we have a token
    // But for demonstration, we just do a mock if there's no token
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

  // 5) Start the LinkedIn OIDC flow (PKCE)
  btnLinkedInOAuth.addEventListener('click', async () => {
    // 1) Generate code verifier
    codeVerifier = generateRandomString(50);
    // 2) Generate a code challenge from it
    const codeChallenge = await sha256ToBase64Url(codeVerifier);
    // 3) Generate random state
    stateParam = generateRandomString(16);

    // 4) Build Auth URL
    const authUrl = `${AUTH_BASE}?response_type=code&client_id=${LINKEDIN_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${LINKEDIN_SCOPES}&state=${stateParam}` +
      `&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    // 5) Redirect the browser to LinkedIn
    window.location.href = authUrl;
  });
});

/****************************************************
 * 3) CHECK FOR LINKEDIN REDIRECT (OIDC)
 ****************************************************/
function checkForLinkedInRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const error = urlParams.get('error');
  const errorDesc = urlParams.get('error_description');

  if (error) {
    console.log("LinkedIn OAuth error:", error, errorDesc);
    return;
  }

  // If we have 'code' and 'state' from LinkedIn
  if (code && state) {
    // We could verify 'state' matches stateParam, but it’s lost if the page is reloaded
    // For demonstration, let's proceed with exchanging the code
    exchangeCodeForToken(code)
      .then(token => {
        linkedInAccessToken = token;
        console.log("LinkedIn Access Token acquired:", token);

        // Optionally fetch actual user info (OIDC userinfo endpoint)
        fetchLinkedInUserInfo()
          .then(userinfo => {
            console.log("Fetched LinkedIn UserInfo:", userinfo);
            /**
             * userinfo might contain:
             * {
             *   sub: "abcdefg12345",
             *   email_verified: true,
             *   email: "someone@example.com",
             *   name: "Jane Doe",
             *   given_name: "Jane",
             *   family_name: "Doe",
             *   picture: "https://media.licdn.com/..."
             * }
             * 
             * You can create an org chart entry automatically or
             * fill the "Add Person" form with this data.
             */
          })
          .catch(e => console.error("Error fetching LinkedIn userinfo:", e));
      })
      .catch(e => console.error("Token exchange error:", e));
  }
}

/****************************************************
 * 4) EXCHANGE CODE FOR ACCESS TOKEN (CLIENT-SIDE)
 *    Not recommended in production if secret is required.
 ****************************************************/
async function exchangeCodeForToken(code) {
  // If your app's OIDC flow requires client_secret, we include it here
  // but for pure PKCE, ideally we omit it in front-end code or do the exchange server-side.
  
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
  // data: { "access_token": "...", "expires_in": 1234, "id_token": "...", ... }
  return data.access_token;
}

/****************************************************
 * 5) FETCH THE USER'S PROFILE (OIDC /userinfo)
 ****************************************************/
async function fetchLinkedInUserInfo() {
  if (!linkedInAccessToken) {
    throw new Error("No LinkedIn access token available.");
  }

  // "Sign In with LinkedIn" OIDC provides:
  // GET https://api.linkedin.com/v2/userinfo
  // with Bearer token
  const resp = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      "Authorization": `Bearer ${linkedInAccessToken}`
    }
  });
  if (!resp.ok) {
    throw new Error(`UserInfo fetch failed: ${resp.status}`);
  }
  const userinfo = await resp.json();
  return userinfo;
}

/****************************************************
 * 6) ORG CHART: ADD/EDIT PERSON
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
 * 7) DRAG & DROP + CONNECTION LINES
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
 * 8) DRAW LINES BETWEEN MANAGER AND SUBORDINATE
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
 * 9) HELPER FUNCTIONS: PKCE, etc.
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
