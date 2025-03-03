/****************************************************
 * 1) GLOBAL VARIABLES & STORAGE
 ****************************************************/
let people = []; 
// Each person object: { id, name, title, image, managerId, x, y }

let currentZIndex = 1;
let linkedInAccessToken = null;

// If your LinkedIn Dev App uses “openid, profile, email”
const LINKEDIN_CLIENT_ID = "78qsr9zwrk1nou";
const LINKEDIN_CLIENT_SECRET = "WPL_AP1.JS2imcsb02toiK1D.Uul9zw==";

// Your GitHub Pages redirect
const REDIRECT_URI = "https://sullivan1337.github.io/tech-tools/1337Chart/index.html";

// OIDC scopes
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

  checkForLinkedInRedirect();

  btnAddEntry.addEventListener('click', () => {
    populateManagerSelect();
    entryModal.style.display = 'block';
  });

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

  // Add a person
  btnSubmitEntry.addEventListener('click', () => {
    const linkedInLink = document.getElementById('linkedinLink').value.trim();
    const nameInput = document.getElementById('nameInput').value.trim();
    const titleInput = document.getElementById('titleInput').value.trim();
    const imageInput = document.getElementById('imageInput').value.trim();
    const managerSelect = document.getElementById('managerSelect').value;

    let personName = nameInput || "John Doe";
    let personTitle = titleInput || "Sample Title";
    let personImage = imageInput || "https://via.placeholder.com/60";

    // If user typed a LinkedIn link, but we can't fetch data from it (no open API for others),
    // we'll just do a mock name if there's no actual access token usage
    if (linkedInLink && !linkedInAccessToken) {
      personName = "LinkedIn (mock)";
      personTitle = "Fetched Title (mock)";
    }

    const newPerson = {
      id: Date.now(),
      name: personName,
      title: personTitle,
      image: personImage,
      managerId: managerSelect ? parseInt(managerSelect, 10) : null,
      x: 0, // Will be set by autoLayout
      y: 0
    };

    people.push(newPerson);

    // auto-layout so cards don't overlap
    autoLayout();

    entryModal.style.display = 'none';
    clearModalFields();
    drawAllLines();
  });

  // Start the LinkedIn OIDC flow (PKCE)
  btnLinkedInOAuth.addEventListener('click', async () => {
    codeVerifier = generateRandomString(50);
    const codeChallenge = await sha256ToBase64Url(codeVerifier);
    stateParam = generateRandomString(16);

    const authUrl = `${AUTH_BASE}?response_type=code&client_id=${LINKEDIN_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${LINKEDIN_SCOPES}&state=${stateParam}` +
      `&code_challenge=${codeChallenge}&code_challenge_method=S256`;

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

  if (code && state) {
    // (Ideally we compare 'state' with our stored stateParam, but for demonstration we skip that.)
    exchangeCodeForToken(code)
      .then(token => {
        linkedInAccessToken = token;
        console.log("LinkedIn Access Token acquired:", token);

        // If you want to get the user's basic info:
        fetchLinkedInUserInfo()
          .then(userinfo => {
            console.log("Fetched LinkedIn UserInfo:", userinfo);
            // userinfo might have { email, name, picture, sub, ... }
          })
          .catch(e => console.error("Error fetching LinkedIn userinfo:", e));
      })
      .catch(e => console.error("Token exchange error:", e));
  }
}

/****************************************************
 * 4) EXCHANGE CODE FOR ACCESS TOKEN (CLIENT-SIDE PKCE)
 *    Not recommended for production if secret is required
 ****************************************************/
async function exchangeCodeForToken(code) {
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
  return data.access_token; // or data.id_token if using OIDC ID tokens
}

/****************************************************
 * 5) FETCH USERINFO FROM LINKEDIN OIDC
 ****************************************************/
async function fetchLinkedInUserInfo() {
  if (!linkedInAccessToken) {
    throw new Error("No LinkedIn access token available.");
  }

  const resp = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      "Authorization": `Bearer ${linkedInAccessToken}`
    }
  });
  if (!resp.ok) {
    throw new Error(`UserInfo fetch failed: ${resp.status}`);
  }
  return await resp.json();
}

/****************************************************
 * 6) AUTO-LAYOUT SO CARDS DON'T OVERLAP
 *    This arranges a top-down hierarchy.
 *    The "highest ranking" = those with no manager.
 ****************************************************/
function autoLayout() {
  // We'll do a BFS for each "root" (person with no manager).
  // Then place them in rows, spaced out so they don't overlap.
  // For demonstration, each "generation" is one row down.
  // We'll place siblings in horizontal order.

  // 1) Identify root nodes (managerId == null)
  const roots = people.filter(p => !p.managerId);

  // 2) We'll do a BFS from each root, assigning rows
  let rowHeight = 150;  // vertical distance per generation
  let colWidth = 250;   // horizontal distance per sibling
  let cardWidth = 200;  // approximate width of each card

  // We'll keep track of the "row" each node is on and the "column index" among siblings
  // Then we'll update p.x, p.y accordingly.

  // We'll maintain a queue of { personId, level, siblingIndex }
  // We'll track how many nodes are in each level to align them horizontally.

  // Step A: Build adjacency: manager -> list of subordinates
  const adjacency = {};
  people.forEach(p => {
    adjacency[p.id] = [];
  });
  people.forEach(p => {
    if (p.managerId) {
      adjacency[p.managerId].push(p.id);
    }
  });

  // Step B: BFS from each root
  let queue = [];
  roots.forEach((rootId, i) => {
    // i is siblingIndex among root-level nodes
    queue.push({ personId: rootId.id, level: 0, siblingIndex: i });
  });

  // For convenience, group nodes by level
  const levelsMap = {};

  while (queue.length > 0) {
    const { personId, level, siblingIndex } = queue.shift();

    // Add this node to levelsMap
    if (!levelsMap[level]) levelsMap[level] = [];
    levelsMap[level].push({ personId, siblingIndex });

    // Enqueue children
    const children = adjacency[personId] || [];
    children.forEach((childId, idx) => {
      queue.push({ personId: childId, level: level + 1, siblingIndex: idx });
    });
  }

  // Step C: For each level in levelsMap, position them horizontally
  // so they don't overlap. We'll do a simple approach: place each node
  // in that level side by side with colWidth spacing
  // We'll also try to center them around 0 so the tree is not forced far left.

  // Actually, to avoid overlap, we just place siblingIndex * colWidth for x
  // row * rowHeight for y

  Object.keys(levelsMap).forEach(levelStr => {
    const level = parseInt(levelStr);
    const nodesInLevel = levelsMap[level];
    nodesInLevel.forEach((n, i) => {
      const p = people.find(x => x.id === n.personId);
      if (p) {
        p.x = n.siblingIndex * colWidth;
        p.y = level * rowHeight;
      }
    });
  });

  // Step D: Shift the entire layout so it’s not negative
  // in case siblingIndex starts from 0. Let’s find minX
  let minX = Math.min(...people.map(p => p.x));
  if (minX < 0) {
    people.forEach(p => {
      p.x -= minX - 50; // a little padding
    });
  }

  // Also ensure no negative y
  let minY = Math.min(...people.map(p => p.y));
  if (minY < 0) {
    people.forEach(p => {
      p.y -= minY - 50;
    });
  }

  // Finally, update each card's DOM position
  renderAllCards();
}

/****************************************************
 * 7) RENDER ALL CARDS / CREATE THEM IF NOT EXIST
 ****************************************************/
function renderAllCards() {
  const chartArea = document.getElementById('chartArea');

  // We'll see which cards already exist, which ones need creation
  // A simple approach: remove all cards from DOM and re-create them
  // so they are placed at the updated positions
  Array.from(chartArea.getElementsByClassName('person-card')).forEach(card => {
    chartArea.removeChild(card);
  });

  people.forEach(person => {
    createOrUpdatePersonCard(person);
  });
  
  drawAllLines();
}

function createOrUpdatePersonCard(person) {
  const chartArea = document.getElementById('chartArea');

  // create a new card
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

  card.addEventListener('mousedown', () => {
    card.style.zIndex = ++currentZIndex;
  });

  // Make it draggable
  makeDraggable(card, person.id);

  // Delete
  card.querySelector('.delete-btn').addEventListener('click', () => {
    chartArea.removeChild(card);
    // remove from people
    people = people.filter(p => p.id !== person.id);
    // remove subordinates' references
    people.forEach(p => {
      if (p.managerId === person.id) {
        p.managerId = null;
      }
    });
    autoLayout(); // reflow
  });

  chartArea.appendChild(card);
}

/****************************************************
 * 8) DRAG & DROP + LINE RE-DRAW
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
 * 9) DRAW CONNECTION LINES
 ****************************************************/
function drawAllLines() {
  const svg = document.getElementById('connectionSVG');
  svg.innerHTML = ""; // Clear existing

  // for each person, if they have a manager, draw a line
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

  // center of the card, relative to the chartArea
  const centerX = rect.left + rect.width / 2 - chartRect.left + chartArea.scrollLeft;
  const centerY = rect.top + rect.height / 2 - chartRect.top + chartArea.scrollTop;
  return { x: centerX, y: centerY };
}

/****************************************************
 * 10) HELPER FUNCTIONS: PKCE, ETC.
 ****************************************************/
function generateRandomString(n) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let randomString = '';
  for (let i = 0; i < n; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return randomString;
}

async function sha256ToBase64Url(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  let base64 = btoa(String.fromCharCode(...hashArray));
  base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base64;
}

/****************************************************
 * 11) MISC
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
