// 1337Chart script – handles org chart initialization, LinkedIn API, and UI events

// LinkedIn OAuth credentials
const LINKEDIN_CLIENT_ID = "78qsr9zwrk1nou";
const LINKEDIN_CLIENT_SECRET = "WPL_AP1.JS2imcsb02toiK1D.Uul9zw=="; // (for reference; in client-side OAuth implicit flow, only the client ID is used)

let linkedInAccessToken = null;
const linkedInAuthUrl = "https://www.linkedin.com/oauth/v2/authorization";
const linkedInRedirectUri = window.location.href.replace(/[#?].*$/, "");
const linkedInScopes = ["r_liteprofile", "r_basicprofile"];

// Check URL fragment for LinkedIn access token (implicit flow)
if (window.location.hash && window.location.hash.includes("access_token")) {
  const params = new URLSearchParams(window.location.hash.slice(1));
  linkedInAccessToken = params.get("access_token");
  if (linkedInAccessToken) {
    localStorage.setItem("linkedInToken", linkedInAccessToken);
  }
  history.replaceState({}, document.title, window.location.pathname);
}
if (!linkedInAccessToken) {
  linkedInAccessToken = localStorage.getItem("linkedInToken");
}

let myDiagram;
function initDiagram() {
  // Ensure that CycleMode is defined (if not, define a basic fallback)
  if (!go.CycleMode) {
    go.CycleMode = { DestinationTree: "destinationTree" };
  }

  const $ = go.GraphObject.make;
  myDiagram = $(go.Diagram, "myDiagramDiv", {
    initialAutoScale: go.Diagram.UniformToFill,  // scale to fill container
    contentAlignment: go.Spot.Top,
    maxSelectionCount: 1,
    validCycle: go.CycleMode.DestinationTree,      // enforce tree structure
    "undoManager.isEnabled": true
  });

  // Use a TreeLayout for arranging nodes
  myDiagram.layout = $(go.TreeLayout, { angle: 90, layerSpacing: 35 });

  // Helper to prevent a node from being dropped onto itself or its descendant
  function mayWorkFor(node, boss) {
    if (!(node instanceof go.Node)) return false;
    if (node === boss) return false;
    return !boss.isInTreeOf(node);
  }

  myDiagram.nodeTemplate = $(
    go.Node, "Auto",
    { 
      deletable: false,  
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
    $(go.Shape, "RoundedRectangle",
      { fill: "#ffffff", stroke: "#cccccc", strokeWidth: 1 }
    ),
    $(go.Panel, "Horizontal", { padding: 5, margin: 3 },
      $(go.Panel, "Spot",
        { margin: new go.Margin(0, 5, 0, 0) },
        $(go.Shape, "Circle", { desiredSize: new go.Size(50, 50), fill: "#999", strokeWidth: 0 }),
        $(go.Picture,
          { desiredSize: new go.Size(50, 50) },
          new go.Binding("source", "pic", findImage)
        )
      ),
      $(go.Panel, "Table",
        { defaultAlignment: go.Spot.Left },
        $(go.TextBlock,
          {
            row: 0, font: "bold 14px sans-serif", stroke: "#333",
            editable: true, isMultiline: false,
            minSize: new go.Size(10, 16)
          },
          new go.Binding("text", "name").makeTwoWay()
        ),
        $(go.TextBlock,
          {
            row: 1, font: "12px sans-serif", stroke: "#555",
            editable: true, isMultiline: false,
            minSize: new go.Size(10, 14)
          },
          new go.Binding("text", "title").makeTwoWay()
        ),
        $(go.TextBlock,
          {
            row: 2, font: "11px sans-serif", stroke: "#777",
            editable: true, isMultiline: false,
            minSize: new go.Size(10, 12)
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

  // Define a basic tree model
  myDiagram.model = new go.TreeModel();
  myDiagram.model.addNodeData({
    key: 1, name: "Root Person", title: "CEO", company: "My Company", pic: ""
  });

  // Ensure new nodes get unique keys
  myDiagram.model.makeUniqueKeyFunction = function(model, data) {
    let key = data.key || model.nodeDataArray.length + 1;
    while (model.findNodeDataForKey(key)) key++;
    data.key = key;
    return key;
  };
}

// Helper to select an image source or generate an avatar
function findImage(pic) {
  if (!pic) {
    return generateAvatar(this.part.data.name || "");
  }
  if (pic.startsWith("data:") || pic.startsWith("http")) {
    return pic;
  }
  return pic;
}

// Generate an avatar (canvas-based) using initials from a name
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

window.addEventListener("DOMContentLoaded", () => {
  initDiagram();

  const addDialog = document.getElementById("addDialog");
  const btnAdd = document.getElementById("btnAdd");
  const btnLinkedIn = document.getElementById("btnLinkedIn");
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

  btnLinkedIn.addEventListener("click", () => {
    const state = Math.random().toString(36).substring(2);
    const authURL = `${linkedInAuthUrl}?response_type=token&client_id=${LINKEDIN_CLIENT_ID}` +
                    `&redirect_uri=${encodeURIComponent(linkedInRedirectUri)}` +
                    `&scope=${linkedInScopes.join("%20")}&state=${state}`;
    window.location.href = authURL;
  });

  btnFetchLinkedIn.addEventListener("click", () => {
    if (!linkedInAccessToken) {
      fetchStatus.textContent = "Please log in with LinkedIn first.";
      fetchStatus.style.color = "red";
      return;
    }
    fetchStatus.textContent = "Fetching from LinkedIn...";
    fetchStatus.style.color = "black";
    const profileUrl = liProfileUrl.value.trim();
    // For this demo, we fetch the current user’s profile
    fetch("https://api.linkedin.com/v2/me?projection=(localizedFirstName,localizedLastName,localizedHeadline,profilePicture(displayImage~:playableStreams))", {
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
      fetchStatus.textContent = "LinkedIn data fetched. You can review and add.";
      fetchStatus.style.color = "green";
    })
    .catch(err => {
      console.error("LinkedIn fetch error:", err);
      fetchStatus.textContent = "Failed to fetch from LinkedIn.";
      fetchStatus.style.color = "red";
    });
  });

  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        photoInput.dataset.url = reader.result;
      };
      reader.readAsDataURL(file);
    } else {
      delete photoInput.dataset.url;
    }
  });

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameVal = nameInput.value.trim() || "(Unnamed)";
    const titleVal = titleInput.value.trim() || "";
    const compVal = compInput.value.trim() || "";
    let picVal = "";
    if (photoInput.dataset.url) {
      picVal = photoInput.dataset.url;
    }
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

  btnImport.addEventListener("click", () => {
    fileInput.click();
  });
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
});
