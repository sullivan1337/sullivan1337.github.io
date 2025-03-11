/****************************************************
 * GLOBAL VARIABLES & LINKEDIN OIDC CONFIGURATION
 ****************************************************/
let linkedInAccessToken = null;
const LINKEDIN_CLIENT_ID = "78qsr9zwrk1nou";
const LINKEDIN_CLIENT_SECRET = "WPL_AP1.JS2imcsb02toiK1D.Uul9zw==";
const REDIRECT_URI = "https://1337chart.elysiuma.com";
const LINKEDIN_SCOPES = "openid%20profile%20email";
const AUTH_BASE = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_BASE = "https://www.linkedin.com/oauth/v2/accessToken";

let myDiagram;

/****************************************************
 * PKCE HELPER FUNCTIONS
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
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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
    // Retrieve stored PKCE values from sessionStorage
    const codeVerifier = sessionStorage.getItem("pkce_code_verifier");
    const storedState = sessionStorage.getItem("pkce_state");

    if (storedState && state !== storedState) {
      console.error("State mismatch! Potential CSRF or session lost.");
      return;
    }

    if (codeVerifier) {
      exchangeCodeForToken(code, codeVerifier)
        .then(token => {
          linkedInAccessToken = token;
          console.log("LinkedIn Access Token acquired:", token);
          // Optionally auto-populate the add dialog with user info:
          fetchLinkedInUserInfo()
            .then(userinfo => {
              console.log("Fetched LinkedIn UserInfo:", userinfo);
              document.getElementById("personName").value =
                `${userinfo.localizedFirstName || ""} ${userinfo.localizedLastName || ""}`.trim();
              if (userinfo.localizedHeadline) {
                const headline = userinfo.localizedHeadline;
                const atIndex = headline.indexOf(" at ");
                if (atIndex > 0) {
                  document.getElementById("personTitle").value = headline.substring(0, atIndex);
                  document.getElementById("personCompany").value = headline.substring(atIndex + 4);
                } else {
                  document.getElementById("personTitle").value = headline;
                }
              }
              if (userinfo.profilePicture && userinfo.profilePicture["displayImage~"]) {
                const imgRecords = userinfo.profilePicture["displayImage~"].elements;
                if (imgRecords && imgRecords.length > 0) {
                  const identifiers = imgRecords[imgRecords.length - 1].identifiers;
                  if (identifiers && identifiers.length > 0) {
                    document.getElementById("personPhoto").dataset.url = identifiers[0].identifier;
                  }
                }
              }
            })
            .catch(e => console.error("Error fetching LinkedIn userinfo:", e));
        })
        .catch(e => console.error("Token exchange error:", e))
        .finally(() => {
          // Clean up PKCE values
          sessionStorage.removeItem("pkce_code_verifier");
          sessionStorage.removeItem("pkce_state");
        });
    } else {
      console.error("No codeVerifier in sessionStorage. PKCE lost.");
    }
  }
}

async function exchangeCodeForToken(code, codeVerifier) {
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
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: bodyParams.toString()
  });

  if (!response.ok) {
    const respText = await response.text();
    throw new Error(`Token request failed: ${respText}`);
  }
  const data = await response.json();
  return data.access_token;
}

async function fetchLinkedInUserInfo() {
  if (!linkedInAccessToken) throw new Error("No LinkedIn access token available.");
  // Use /v2/me endpoint; if you get a 404, try adjusting the endpoint
  const resp = await fetch("https://api.linkedin.com/v2/me", {
    headers: { "Authorization": `Bearer ${linkedInAccessToken}` }
  });
  if (!resp.ok) throw new Error(`UserInfo fetch failed: ${resp.status}`);
  return resp.json();
}

/****************************************************
 * GOJS ORG CHART INITIALIZATION & FUNCTIONS
 ****************************************************/
function initDiagram() {
  // Ensure go.CycleMode is defined
  if (!go.CycleMode) { go.CycleMode = { DestinationTree: "destinationTree" }; }

  const $ = go.GraphObject.make;
  myDiagram = $(go.Diagram, "myDiagramDiv", {
    initialAutoScale: go.Diagram.UniformToFill,
    contentAlignment: go.Spot.Top,
    maxSelectionCount: 1,
    validCycle: go.CycleMode.DestinationTree,
    "undoManager.isEnabled": true
  });

  // Use a TreeLayout for arranging nodes
  myDiagram.layout = $(go.TreeLayout, { angle: 90, layerSpacing: 35 });

  function mayWorkFor(node, boss) {
    if (!(node instanceof go.Node)) return false;
    if (node === boss) return false;
    return !boss.isInTreeOf(node);
  }

  myDiagram.nodeTemplate = $(
    go.Node, "Auto",
    { deletable: false,
      mouseDrop: function(e, node) {
        const draggedNode = myDiagram.selection.first();
        if (mayWorkFor(draggedNode, node)) {
          const link = draggedNode.findTreeParentLink();
          if (link !== null) {
            link.fromNode = node;
          } else {
            myDiagram.toolManager.linkingTool.insertLink(node, node.port, draggedNode, draggedNode.port);
          }
        }
      }
    },
    $(go.Shape, "RoundedRectangle", { fill: "#ffffff", stroke: "#cccccc", strokeWidth: 1 }),
    $(go.Panel, "Horizontal", { padding: 5, margin: 3 },
      $(go.Panel, "Spot",
        { margin: new go.Margin(0, 5, 0, 0) },
        $(go.Shape, "Circle", { desiredSize: new go.Size(50, 50), fill: "#999", strokeWidth: 0 }),
        $(go.Picture, { desiredSize: new go.Size(50, 50) },
          new go.Binding("source", "pic", findImage)
        )
      ),
      $(go.Panel, "Table", { defaultAlignment: go.Spot.Left },
        $(go.TextBlock, {
            row: 0, font: "bold 14px sans-serif", stroke: "#333",
            editable: true, isMultiline: false, minSize: new go.Size(10, 16)
          },
          new go.Binding("text", "name").makeTwoWay()
        ),
        $(go.TextBlock, {
            row: 1, font: "12px sans-serif", stroke: "#555",
            editable: true, isMultiline: false, minSize: new go.Size(10, 14)
          },
          new go.Binding("text", "title").makeTwoWay()
        ),
        $(go.TextBlock, {
            row: 2, font: "11px sans-serif", stroke: "#777",
            editable: true, isMultiline: false, minSize: new go.Size(10, 12)
          },
          new go.Binding("text", "company").makeTwoWay()
        )
      )
    ),
    $("TreeExpanderButton",
      {
        alignment: go.Spot.Bottom,
        alignmentFocus: go.Spot.Center,
        visible: false
      },
      new go.Binding("visible", "isTreeLeaf", function(leaf) { return !leaf; }).ofObject()
    ),
    {
      contextMenu: $(
        "ContextMenu",
        $(
          "ContextMenuButton",
          $(go.TextBlock, "Add Employee"),
          {
            click: function(e, button) {
              const node = button.part.adornedPart;
              if (!node) return;
              addEmployee(node.data.key);
            }
          }
        ),
        $(
          "ContextMenuButton",
          $(go.TextBlock, "Remove Role"),
          {
            click: function(e, button) {
              const node = button.part.adornedPart;
              if (!node) return;
              myDiagram.startTransaction("remove role");
              const parentData = myDiagram.model.findNodeDataForKey(node.data.parent);
              myDiagram.model.removeNodeData(node.data);
              if (parentData) {
                const childNodes = myDiagram.findTreeChildrenNodes(node);
                while (childNodes.next()) {
                  const child = childNodes.value;
                  myDiagram.model.setParentKeyForNodeData(child.data, parentData.key);
                }
              }
              myDiagram.commitTransaction("remove role");
            }
          }
        ),
        $(
          "ContextMenuButton",
          $(go.TextBlock, "Remove Department"),
          {
            click: function(e, button) {
              const node = button.part.adornedPart;
              if (!node) return;
              myDiagram.startTransaction("remove department");
              myDiagram.removeParts(node.findTreeParts());
              myDiagram.commitTransaction("remove department");
            }
          }
        )
      )
    }
  );

  // Initialize the diagram with a root node
  myDiagram.model = new go.TreeModel();
  myDiagram.model.addNodeData({
    key: 1, name: "Root Person", title: "CEO", company: "My Company", pic: ""
  });

  myDiagram.model.makeUniqueKeyFunction = function(model, data) {
    let key = data.key || model.nodeDataArray.length + 1;
    while (model.findNodeDataForKey(key)) key++;
    data.key = key;
    return key;
  };
}

function findImage(pic) {
  if (!pic) return generateAvatar(this.part.data.name || "");
  if (pic.startsWith("data:") || pic.startsWith("http")) return pic;
  return pic;
}

function generateAvatar(name) {
  const initials = name.split(" ").map(n => n[0] || "").join("").toUpperCase().substring(0, 2);
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.fillStyle = "#777";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials || "?", size/2, size/2);
  return canvas.toDataURL("image/png");
}

function addEmployee(managerKey) {
  myDiagram.startTransaction("add employee");
  const newNode = {
    key: undefined,
    name: "New Person",
    title: "Title",
    company: "",
    pic: "",
    parent: managerKey
  };
  myDiagram.model.addNodeData(newNode);
  myDiagram.commitTransaction("add employee");
  const newNodeData = myDiagram.findNodeForData(newNode);
  if (newNodeData) {
    myDiagram.select(newNodeData);
    myDiagram.commandHandler.scrollToPart(newNodeData);
  }
}

/****************************************************
 * DOM CONTENT LOADED – INITIALIZATION & EVENT HANDLERS
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Check if returning from LinkedIn (OIDC redirect)
  checkForLinkedInRedirect();

  initDiagram();

  // Get element references
  const addDialog = document.getElementById("addDialog");
  const btnAdd = document.getElementById("btnAdd");
  const btnLinkedInOAuth = document.getElementById("btnLinkedInOAuth");
  const btnImport = document.getElementById("btnImport");
  const btnExport = document.getElementById("btnExport");
  const fileInput = document.getElementById("fileInput");
  const addForm = document.getElementById("addForm");
  const liProfileUrl = document.getElementById("liProfileUrl");
  const btnFetchLinkedIn = document.getElementById("btnFetchLinkedIn");
  const fetchStatus = document.getElementById("fetchStatus");
  const nameInput = document.getElementById("personName");
  const titleInput = document.getElementById("personTitle");
  const compInput = document.getElementById("personCompany");
  const photoInput = document.getElementById("personPhoto");
  const btnAddPerson = document.getElementById("btnAddPerson");
  const btnCancel = document.getElementById("btnCancel");

  // Open the "Add Person" dialog
  btnAdd.addEventListener("click", () => {
    liProfileUrl.value = "";
    nameInput.value = "";
    titleInput.value = "";
    compInput.value = "";
    photoInput.value = "";
    fetchStatus.textContent = "";
    addDialog.showModal();
  });

  btnCancel.addEventListener("click", () => {
    addDialog.close();
  });

  // "Fetch from LinkedIn" inside the add dialog
  btnFetchLinkedIn.addEventListener("click", () => {
    if (!linkedInAccessToken) {
      fetchStatus.textContent = "Please sign in with LinkedIn first.";
      fetchStatus.style.color = "red";
      return;
    }
    fetchStatus.textContent = "Fetching from LinkedIn...";
    fetchStatus.style.color = "black";
    fetch("https://api.linkedin.com/v2/me", {
      headers: { "Authorization": "Bearer " + linkedInAccessToken }
    })
    .then(response => response.json())
    .then(data => {
      let fullName = "";
      if (data.localizedFirstName) fullName += data.localizedFirstName + " ";
      if (data.localizedLastName) fullName += data.localizedLastName;
      nameInput.value = fullName.trim();
      if (data.localizedHeadline) {
        const headline = data.localizedHeadline;
        const atIndex = headline.indexOf(" at ");
        if (atIndex > 0) {
          titleInput.value = headline.substring(0, atIndex);
          compInput.value = headline.substring(atIndex + 4);
        } else {
          titleInput.value = headline;
          compInput.value = "";
        }
      }
      if (data.profilePicture && data.profilePicture["displayImage~"]) {
        const imgRecords = data.profilePicture["displayImage~"].elements;
        if (imgRecords && imgRecords.length > 0) {
          const identifiers = imgRecords[imgRecords.length - 1].identifiers;
          if (identifiers && identifiers.length > 0) {
            photoInput.dataset.url = identifiers[0].identifier;
          }
        }
      }
      fetchStatus.textContent = "LinkedIn data fetched. Review and add.";
      fetchStatus.style.color = "green";
    })
    .catch(err => {
      console.error("LinkedIn fetch error:", err);
      fetchStatus.textContent = "Failed to fetch from LinkedIn.";
      fetchStatus.style.color = "red";
    });
  });

  // When a photo file is selected, convert it to Base64
  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { photoInput.dataset.url = reader.result; };
      reader.readAsDataURL(file);
    } else {
      delete photoInput.dataset.url;
    }
  });

  // On form submit, add the new person to the chart
  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameVal = nameInput.value.trim() || "(Unnamed)";
    const titleVal = titleInput.value.trim() || "";
    const compVal = compInput.value.trim() || "";
    let picVal = "";
    if (photoInput.dataset.url) { picVal = photoInput.dataset.url; }
    myDiagram.startTransaction("add new person");
    const newNodeData = {
      key: undefined,
      name: nameVal,
      title: titleVal,
      company: compVal,
      pic: picVal,
      parent: undefined
    };
    myDiagram.model.addNodeData(newNodeData);
    myDiagram.commitTransaction("add new person");
    addDialog.close();
  });

  // Import JSON functionality
  btnImport.addEventListener("click", () => { fileInput.click(); });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = reader.result;
        myDiagram.model = go.Model.fromJson(json);
        myDiagram.model.makeUniqueKeyFunction = function(model, data) {
          let key = data.key || model.nodeDataArray.length + 1;
          while (model.findNodeDataForKey(key)) key++;
          data.key = key;
          return key;
        };
        alert("Organization chart loaded from JSON.");
      } catch (err) {
        alert("Failed to load JSON: " + err);
      }
    };
    reader.readAsText(file);
  });

  // Export JSON functionality
  btnExport.addEventListener("click", () => {
    const jsonData = myDiagram.model.toJson();
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "orgchart.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Initiate LinkedIn OIDC (PKCE) flow when the "Sign in with LinkedIn" button is clicked
  btnLinkedInOAuth.addEventListener("click", async () => {
    const codeVerifier = generateRandomString(50);
    const codeChallenge = await sha256ToBase64Url(codeVerifier);
    const stateParam = generateRandomString(16);
    sessionStorage.setItem("pkce_code_verifier", codeVerifier);
    sessionStorage.setItem("pkce_state", stateParam);
    const authUrl = `${AUTH_BASE}?response_type=code&client_id=${LINKEDIN_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${LINKEDIN_SCOPES}&state=${stateParam}` +
      `&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    window.location.href = authUrl;
  });
});
