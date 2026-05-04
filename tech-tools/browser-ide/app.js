(function () {
  const fileTypes = {
    html: { icon: "H", label: "HTML", lang: "HTML" },
    css: { icon: "C", label: "CSS", lang: "CSS" },
    js: { icon: "J", label: "JS", lang: "JavaScript" },
    json: { icon: "J", label: "JSON", lang: "JSON" },
    graphql: { icon: "G", label: "GraphQL", lang: "GraphQL" },
    python: { icon: "P", label: "Python", lang: "Python" },
    txt: { icon: "T", label: "Text", lang: "Plain text" },
  };

  const defaultFiles = [
    {
      id: "index.html",
      name: "index.html",
      type: "html",
      content: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Browser IDE demo</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <main>
      <h1>Hello from the browser IDE</h1>
      <p>Edit <code>index.html</code>, <code>styles.css</code>, and <code>script.js</code> to build small experiments.</p>
      <button id="click-me">Click me</button>
    </main>
    <script src="script.js"></script>
  </body>
</html>`,
    },
    {
      id: "styles.css",
      name: "styles.css",
      type: "css",
      content: `html, body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: radial-gradient(circle at top, #0f172a, #020617 55%, #020617);
  color: #e5e7eb;
}

main {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

h1 {
  font-size: 2rem;
  letter-spacing: 0.04em;
}

button {
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  border: 1px solid rgba(56, 189, 248, 0.9);
  background: radial-gradient(circle at top left, #0ea5e9, #0369a1);
  color: #f9fafb;
  font-weight: 500;
  cursor: pointer;
}

button:hover {
  filter: brightness(1.05);
}`,
    },
    {
      id: "script.js",
      name: "script.js",
      type: "js",
      content: `const button = document.getElementById('click-me');

if (button) {
  button.addEventListener('click', () => {
    console.log('Button clicked from the Browser IDE!');
    alert('Hello from the Browser IDE session.');
  });
}`,
    },
    {
      id: "example.json",
      name: "example.json",
      type: "json",
      content: `{
  "name": "Sample config",
  "enabled": true,
  "threshold": 0.85,
  "items": [
    { "id": 1, "label": "Alpha" },
    { "id": 2, "label": "Beta" }
  ]
}
`,
    },
    {
      id: "README.md",
      name: "README.md",
      type: "txt",
      content: `# Browser IDE Markdown Demo

This file demonstrates markdown preview support.

## Features

- Headings
- Lists
- Inline \`code\`
- Tables

## Example table

| File | Purpose | Status |
| --- | --- | --- |
| index.html | Main page markup | Ready |
| styles.css | Styling | Ready |
| script.js | Behavior | Ready |
`,
    },
  ];

  let files = [];
  let activeFileId = null;
  let autoRun = true;

  // simple in-memory tree: nodes are either folder or file
  // folders: { id, name, type: 'folder', children: [] }
  // files:   { id, name, type: 'file', ext, languageType, content, dirty }
  let rootNode = null;

  const $ = (id) => document.getElementById(id);

  const fileListEl = $("file-list");
  const fileCountLabelEl = $("file-count-label");
  const editorContainerEl = $("editor-container");
  const ideShellEl = $("ide-shell");
  const explorerResizeHandleEl = $("explorer-resize-handle");
  const previewResizeHandleEl = $("preview-resize-handle");
  const cursorPositionEl = $("cursor-position");
  const fileLanguageLabelEl = $("file-language-label");
  const editorStatusEl = $("editor-status");
  const previewFrameEl = $("preview-frame");
  const previewConsoleEl = $("preview-console");
  const previewSizeLabelEl = $("preview-size-label");
  const previewTimeLabelEl = $("preview-time-label");
  const autoRunToggleEl = $("auto-run-toggle");
  const resetWorkspaceBtnEl = $("reset-workspace-btn");
  const downloadWorkspaceBtnEl = $("download-workspace-btn");
  const previewPanelEl = $("preview-panel");
  const togglePreviewBtnEl = $("toggle-preview-btn");
  const toastContainerEl = $("toast-container");
  const contextMenuEl = $("context-menu");

  const fileIconColors = {
    folder: "#facc15",
    html: "#f97316",
    css: "#38bdf8",
    js: "#eab308",
    json: "#22c55e",
    graphql: "#e879f9",
    python: "#60a5fa",
    default: "#9ca3af",
  };

  let contextMenuNode = null;
  let lastContextMenuPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let dragNode = null;
  let monacoEditor = null;

  function init() {
    files = defaultFiles.map((f) => ({
      ...f,
      dirty: false,
    }));
    // initialize tree with a single root folder
    rootNode = {
      id: "root",
      name: "/",
      type: "folder",
      children: files.map((f) => fileToNode(f)),
    };
    activeFileId = files[0].id;
    autoRun = true;
    autoRunToggleEl.setAttribute("data-state", "on");
    renderAll();
    attachEvents();
    initPanelResizing();
    initMonaco();
    runPreview();
    togglePreviewBtnEl.textContent = document.body.classList.contains(
      "preview-collapsed"
    )
      ? "←"
      : "→";

    // expose file list for download helper
    window.__browserIdeGetFiles = () => files.slice();
  }

  function getMonacoLanguageForFile(file) {
    if (!file) return "plaintext";
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".html") || name.endsWith(".htm")) return "html";
    if (name.endsWith(".css")) return "css";
    if (name.endsWith(".js")) return "javascript";
    if (name.endsWith(".json")) return "json";
    if (name.endsWith(".md") || name.endsWith(".markdown")) return "markdown";
    if (name.endsWith(".py")) return "python";
    if (name.endsWith(".graphql") || name.endsWith(".gql")) return "javascript";
    return "plaintext";
  }

  function initMonaco() {
    if (!window.require || !editorContainerEl) return;

    window.require.config({
      paths: {
        vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.48.0/min/vs",
      },
    });

    window.require(["vs/editor/editor.main"], () => {
      const file = getActiveFile();
      monacoEditor = monaco.editor.create(editorContainerEl, {
        value: file ? file.content : "",
        language: getMonacoLanguageForFile(file),
        automaticLayout: true,
        theme: "vs-dark",
        minimap: { enabled: false },
        fontSize: 13,
        tabSize: 2,
      });

      const model = monacoEditor.getModel();
      if (model) {
        model.onDidChangeContent(() => {
          const current = getActiveFile();
          if (!current) return;
          current.content = monacoEditor.getValue();
          current.dirty = true;
          updateEditorStatus("Unsaved changes");
          renderFileList();
          if (autoRun) {
            debounceRunPreview();
          }
        });
      }

      monacoEditor.onDidChangeCursorPosition((e) => {
        const pos = e.position;
        cursorPositionEl.textContent =
          "Ln " + pos.lineNumber + ", Col " + pos.column;
      });
    });
  }

  function fileToNode(file) {
    return {
      id: file.id,
      name: file.name,
      type: "file",
      ext: file.type,
      languageType: fileTypes[file.type] ? file.type : "txt",
    };
  }

  function createFileIcon(kind) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.classList.add("file-icon");

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("fill", "currentColor");

    if (kind === "folder") {
      svg.classList.add("file-icon-folder");
      path.setAttribute(
        "d",
        "M2 4a1 1 0 0 1 1-1h3l1.2 1.6A1 1 0 0 0 8.2 5H13a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z"
      );
    } else {
      const key = fileIconColors[kind] ? kind : "default";
      svg.classList.add(
        key === "default" ? "file-icon-default" : "file-icon-" + key
      );
      path.setAttribute(
        "d",
        "M4 1.5h5l3 3V14a0.5 0.5 0 0 1-0.5 0.5h-7A0.5 0.5 0 0 1 4 14V1.5zm5 0V4h2.5"
      );
    }

    const color = fileIconColors[kind] || fileIconColors.default;
    svg.style.color = color;
    svg.appendChild(path);
    return svg;
  }

  function attachEvents() {
    // Ctrl/Cmd+Enter to run preview
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runPreview();
      }
    });

    window.addEventListener("resize", () => {
      updatePreviewSizeLabel();
      hideContextMenu();
    });

    autoRunToggleEl.addEventListener("click", () => {
      autoRun = !autoRun;
      autoRunToggleEl.setAttribute("data-state", autoRun ? "on" : "off");
    });

    resetWorkspaceBtnEl.addEventListener("click", () => {
      const confirmed = confirm(
        "Reset the workspace to the default boot files? This cannot be undone."
      );
      if (!confirmed) return;
      init();
    });

    downloadWorkspaceBtnEl.addEventListener("click", () => {
      downloadWorkspace();
    });

    // preview collapse
    togglePreviewBtnEl.addEventListener("click", () => {
      const collapsed = document.body.classList.toggle("preview-collapsed");
      togglePreviewBtnEl.textContent = collapsed ? "←" : "→";
      updatePreviewSizeLabel();
    });

    // close context menu on click elsewhere
    document.addEventListener("click", () => {
      hideContextMenu();
    });

    // right-click on empty workspace area -> root menu
    fileListEl.addEventListener("contextmenu", (e) => {
      // if the target is the UL itself or its padding (no li hit)
      if (e.target === fileListEl) {
        e.preventDefault();
        const rect = fileListEl.getBoundingClientRect();
        const x = e.clientX || rect.left + 12;
        const y = e.clientY || rect.top + 12;
        showContextMenu(x, y, rootNode);
      }
    });
  }

  function initPanelResizing() {
    if (!ideShellEl) return;
    makeHorizontalPanelResizable(explorerResizeHandleEl, {
      getStart: () => ideShellEl.getBoundingClientRect().left,
      getCurrent: () => parseFloat(getComputedStyle(ideShellEl).getPropertyValue("--explorer-width")) || 220,
      setCurrent: (value) => ideShellEl.style.setProperty("--explorer-width", `${Math.round(value)}px`),
      min: 160,
      maxFromRect: (rect) => Math.max(260, rect.width - 420),
      direction: "forward",
    });

    makeHorizontalPanelResizable(previewResizeHandleEl, {
      getStart: () => ideShellEl.getBoundingClientRect().left,
      getCurrent: () => parseFloat(getComputedStyle(ideShellEl).getPropertyValue("--preview-width")) || 420,
      setCurrent: (value) => ideShellEl.style.setProperty("--preview-width", `${Math.round(value)}px`),
      min: 220,
      maxFromRect: (rect) => Math.max(280, rect.width - 360),
      direction: "reverse",
      disabled: () => document.body.classList.contains("preview-collapsed"),
    });
  }

  function makeHorizontalPanelResizable(handle, config) {
    if (!handle || !config) return;
    handle.addEventListener("pointerdown", (event) => {
      if (config.disabled && config.disabled()) return;
      event.preventDefault();
      const shellRect = ideShellEl.getBoundingClientRect();
      const startX = event.clientX;
      const startSize = config.getCurrent();
      handle.classList.add("is-active");
      handle.setPointerCapture(event.pointerId);

      const onMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        const rawNext =
          config.direction === "reverse" ? startSize - delta : startSize + delta;
        const max = config.maxFromRect ? config.maxFromRect(shellRect) : shellRect.width;
        const next = Math.max(config.min || 120, Math.min(max, rawNext));
        config.setCurrent(next);
        updatePreviewSizeLabel();
      };

      const onUp = () => {
        handle.classList.remove("is-active");
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  }

  function getActiveFile() {
    return files.find((f) => f.id === activeFileId) || null;
  }

  function renderAll() {
    renderFileList();
    renderEditor();
    updateFileMeta();
    updatePreviewSizeLabel();
  }

  function renderFileList() {
    fileListEl.innerHTML = "";
    const fragment = document.createDocumentFragment();

    function renderNode(node, depth) {
      if (node.type === "folder") {
        const li = document.createElement("li");
        li.className = "file-item";
        li.dataset.nodeId = node.id;
        li.dataset.kind = "folder";
        li.draggable = true;

        const main = document.createElement("div");
        main.className = "file-item-main";
        main.style.paddingLeft = 0.3 + depth * 0.6 + "rem";

        const caret = document.createElement("span");
        caret.className = "folder-caret";
        caret.textContent = "▾";

        const badge = document.createElement("div");
        badge.className = "file-badge";
        badge.appendChild(createFileIcon("folder"));

        const name = document.createElement("span");
        name.className = "file-name";
        name.textContent = node.name;

        main.appendChild(caret);
        main.appendChild(badge);
        main.appendChild(name);

        const statusDot = document.createElement("div");
        statusDot.className = "file-status-dot";

        li.appendChild(main);
        li.appendChild(statusDot);

        li.addEventListener("click", (e) => {
          e.stopPropagation();
        });

        attachContextMenu(li, node);
        attachDragHandlers(li, node);

        fragment.appendChild(li);
        node.children.forEach((child) => renderNode(child, depth + 1));
      } else if (node.type === "file") {
        const file = files.find((f) => f.id === node.id);
        const li = document.createElement("li");
        li.className =
          "file-item" + (node.id === activeFileId ? " active" : "");
        if (file && file.dirty) li.classList.add("unsaved");
        li.dataset.nodeId = node.id;
        li.dataset.kind = "file";
        li.draggable = true;

        const main = document.createElement("div");
        main.className = "file-item-main";
        main.style.paddingLeft = 0.3 + depth * 0.6 + "rem";

        const badge = document.createElement("div");
        badge.className = "file-badge";
        const iconKind = file.type && fileIconColors[file.type] ? file.type : "default";
        badge.appendChild(createFileIcon(iconKind));

        const name = document.createElement("span");
        name.className = "file-name";
        name.textContent = file.name;

        main.appendChild(badge);
        main.appendChild(name);

        const statusDot = document.createElement("div");
        statusDot.className = "file-status-dot";

        li.appendChild(main);
        li.appendChild(statusDot);

        li.addEventListener("click", (e) => {
          e.stopPropagation();
          activeFileId = file.id;
          renderAll();
        });

        attachContextMenu(li, node);
        attachDragHandlers(li, node);

        fragment.appendChild(li);
      }
    }

    if (rootNode) {
      rootNode.children.forEach((child) => renderNode(child, 0));
    }

    fileListEl.appendChild(fragment);

    fileCountLabelEl.textContent =
      files.length === 1 ? "1 file" : files.length + " files";
  }

  function attachContextMenu(element, node) {
    element.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, node);
    });
  }

  function attachDragHandlers(element, node) {
    element.addEventListener("dragstart", (e) => {
      dragNode = node;
      e.dataTransfer.effectAllowed = "move";
      element.classList.add("file-item-dragging");
    });

    element.addEventListener("dragend", () => {
      element.classList.remove("file-item-dragging");
      dragNode = null;
      clearDropHighlights();
    });

    element.addEventListener("dragover", (e) => {
      if (!dragNode || dragNode === node) return;
      e.preventDefault();
      element.classList.add("file-item-drop-target");
    });

    element.addEventListener("dragleave", () => {
      element.classList.remove("file-item-drop-target");
    });

    element.addEventListener("drop", (e) => {
      if (!dragNode || dragNode === node) return;
      e.preventDefault();
      element.classList.remove("file-item-drop-target");
      const parentForDrop =
        node.type === "folder" ? node : findParent(rootNode, node);
      moveNode(dragNode, parentForDrop || rootNode);
      renderAll();
      showToast("Item moved");
    });
  }

  function clearDropHighlights() {
    document
      .querySelectorAll(".file-item-drop-target")
      .forEach((el) => el.classList.remove("file-item-drop-target"));
  }

  function findParent(parent, target) {
    if (!parent || !parent.children) return null;
    for (const child of parent.children) {
      if (child === target) return parent;
      const nested = findParent(child, target);
      if (nested) return nested;
    }
    return null;
  }

  function moveNode(node, newParent) {
    if (!newParent || newParent === node) return;
    deleteNode(node);
    if (!newParent.children) newParent.children = [];
    newParent.children.push(node);
  }

  function showContextMenu(x, y, node) {
    contextMenuNode = node;
    lastContextMenuPosition = { x, y };
    contextMenuEl.innerHTML = "";

    const isFolder = node.type === "folder";
    const items = isFolder
      ? [
          { id: "new-file", label: "New file" },
          { id: "new-folder", label: "New folder" },
          { id: "rename", label: "Rename" },
          { id: "delete", label: "Delete", danger: true },
        ]
      : [
          { id: "rename", label: "Rename" },
          { id: "delete", label: "Delete", danger: true },
        ];

    items.forEach((item) => {
      const div = document.createElement("div");
      div.className =
        "context-menu-item" +
        (item.danger ? " context-menu-item-danger" : "");
      const label = document.createElement("span");
      label.textContent = item.label;
      const hint = document.createElement("span");
      hint.textContent =
        item.id === "delete" ? "⌫" : item.id === "rename" ? "F2" : "";
      div.appendChild(label);
      div.appendChild(hint);
      div.addEventListener("click", (e) => {
        e.stopPropagation();
        handleContextAction(item.id, node);
        hideContextMenu();
      });
      contextMenuEl.appendChild(div);
    });

    const menuWidth = 180;
    const menuHeight = 8 + items.length * 28;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const left = Math.min(x, viewportWidth - menuWidth - 8);
    const top = Math.min(y, viewportHeight - menuHeight - 8);

    contextMenuEl.style.left = left + "px";
    contextMenuEl.style.top = top + "px";
    contextMenuEl.classList.add("open");
  }

  function hideContextMenu() {
    contextMenuNode = null;
    contextMenuEl.classList.remove("open");
  }

  function handleContextAction(actionId, node) {
    if (node.type === "folder") {
      if (actionId === "new-file") {
        showInputToast("New file name", "", {
          placeholder: "e.g. utils.js",
          anchorPoint: lastContextMenuPosition,
          onSubmit: (name) => {
            const trimmed = name.trim();
            if (!trimmed) return;
            if (files.some((f) => f.name === trimmed)) {
              showToast("A file with that name already exists.", {
                variant: "danger",
              });
              return;
            }
            const ext = (trimmed.split(".").pop() || "txt").toLowerCase();
            const type = fileTypes[ext] ? ext : "txt";
            const newFile = {
              id: trimmed,
              name: trimmed,
              type,
              content: "",
              dirty: false,
            };
            files.push(newFile);
            if (!node.children) node.children = [];
            node.children.push(fileToNode(newFile));
            activeFileId = newFile.id;
            renderAll();
            showToast(`Created file "${trimmed}"`);
          },
        });
      } else if (actionId === "new-folder") {
        showInputToast("New folder name", "", {
          placeholder: "e.g. components",
          anchorPoint: lastContextMenuPosition,
          onSubmit: (name) => {
            const trimmed = name.trim();
            if (!trimmed) return;
            const newFolder = {
              id: `${node.id}/${trimmed}-${Date.now()}`,
              name: trimmed,
              type: "folder",
              children: [],
            };
            if (!node.children) node.children = [];
            node.children.push(newFolder);
            renderAll();
            showToast(`Created folder "${trimmed}"`);
          },
        });
      } else if (actionId === "rename") {
        showInputToast("Rename folder", node.name, {
          onSubmit: (value) => {
            const trimmed = value.trim();
            if (!trimmed || trimmed === node.name) return;
            node.name = trimmed;
            renderAll();
            showToast("Folder renamed");
          },
        });
      } else if (actionId === "delete") {
        if (!confirm(`Delete folder "${node.name}" and all contents?`)) return;
        deleteNode(node);
        renderAll();
        showToast("Folder deleted");
      }
    } else if (node.type === "file") {
      const file = files.find((f) => f.id === node.id);
      if (!file) return;
      if (actionId === "rename") {
        showInputToast("Rename file", file.name, {
          onSubmit: (value) => {
            const trimmed = value.trim();
            if (!trimmed || trimmed === file.name) return;
            if (files.some((f) => f !== file && f.name === trimmed)) {
              showToast("Another file already has that name.", {
                variant: "danger",
              });
              return;
            }
            file.name = trimmed;
            file.id = trimmed;
            node.name = trimmed;
            node.id = trimmed;
            if (activeFileId === file.id) {
              activeFileId = file.id;
            }
            renderAll();
            showToast("File renamed");
          },
        });
      } else if (actionId === "delete") {
        if (!confirm(`Delete file "${file.name}"?`)) return;
        files = files.filter((f) => f !== file);
        deleteNode(node);
        if (activeFileId === file.id) {
          activeFileId = files[0] ? files[0].id : null;
        }
        renderAll();
        showToast("File deleted");
      }
    }
  }

  function deleteNode(target) {
    function walk(parent) {
      if (!parent.children) return;
      parent.children = parent.children.filter((child) => child !== target);
      parent.children.forEach((child) => walk(child));
    }
    if (rootNode) walk(rootNode);
  }

  function renderEditor() {
    const file = getActiveFile();
    if (!monacoEditor) return;
    const model = monacoEditor.getModel();
    if (!model) return;
    const value = file ? file.content : "";
    if (model.getValue() !== value) {
      model.setValue(value);
    }
    monaco.editor.setModelLanguage(model, getMonacoLanguageForFile(file));
  }

  function updateFileMeta() {
    const file = getActiveFile();
    const ft = file ? fileTypes[file.type] || fileTypes.txt : fileTypes.txt;
    fileLanguageLabelEl.textContent = file
      ? ft.lang + " · " + file.name
      : "";
  }

  function updateEditorStatus(text) {
    editorStatusEl.textContent = text;
  }

  function updatePreviewSizeLabel() {
    const rect = previewFrameEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      previewTimeLabelEl.textContent = "Preview hidden";
    } else {
      previewTimeLabelEl.textContent =
        Math.round(rect.width) + " × " + Math.round(rect.height) + "px";
    }
  }

  function clearConsole() {
    previewConsoleEl.innerHTML = "";
  }

  function appendConsoleLine(kind, message) {
    const line = document.createElement("div");
    line.className = "console-line" + (kind === "error" ? " error" : "");

    const tag = document.createElement("span");
    tag.className = "console-tag";
    tag.textContent = kind === "error" ? "error" : "log";

    const msg = document.createElement("span");
    msg.className = "console-message";
    msg.textContent = message;

    line.appendChild(tag);
    line.appendChild(msg);

    previewConsoleEl.appendChild(line);
    previewConsoleEl.scrollTop = previewConsoleEl.scrollHeight;
  }

  let runPreviewTimeout = null;
  function debounceRunPreview() {
    if (runPreviewTimeout) {
      clearTimeout(runPreviewTimeout);
    }
    runPreviewTimeout = setTimeout(runPreview, 350);
  }

  function buildPreviewHtml() {
    const activeFile = getActiveFile();
    const activeName = (activeFile && activeFile.name ? activeFile.name : "").toLowerCase();
    const activeType = (activeFile && activeFile.type ? activeFile.type : "").toLowerCase();

    const find = (name) => files.find((f) => f.name.toLowerCase() === name.toLowerCase());
    const defaultHtmlFile = find("index.html");
    const defaultCssFile = find("styles.css");
    const defaultJsFile = find("script.js");

    let htmlContent = defaultHtmlFile ? defaultHtmlFile.content : "<!-- No index.html -->";
    let cssContent = defaultCssFile ? defaultCssFile.content : "";
    let jsContent = defaultJsFile ? defaultJsFile.content : "";

    if (activeFile) {
      if (activeName.endsWith(".html") || activeName.endsWith(".htm")) {
        htmlContent = activeFile.content || "";
      } else if (activeName.endsWith(".md") || activeName.endsWith(".markdown")) {
        htmlContent = renderMarkdownDocument(activeFile.content || "", activeFile.name);
        cssContent = "";
        jsContent = "";
      } else if (activeType === "css") {
        cssContent = activeFile.content || "";
      } else if (activeType === "js") {
        jsContent = activeFile.content || "";
      }
    }

    const stylesBlock = cssContent
      ? `\n<style>\n${cssContent}\n</style>`
      : "";
    const scriptBlock = jsContent
      ? `\n<script>
window.parent.postMessage({ source: 'browser-ide-console', type: 'clear' }, '*');
${jsContent}
</script>`
      : "";

    const consoleProxyScript = `
<script>
  (function () {
    const channel = 'browser-ide-console';
    function send(type, args) {
      try {
        parent.postMessage(
          { source: channel, type, args: Array.from(args).map(String) },
          '*'
        );
      } catch (e) {}
    }
    const origLog = console.log;
    const origError = console.error;
    console.log = function () {
      send('log', arguments);
      origLog.apply(console, arguments);
    };
    console.error = function () {
      send('error', arguments);
      origError.apply(console, arguments);
    };
    window.addEventListener('error', function (e) {
      send('error', [
        e.message + ' @ ' + (e.filename || '') + ':' + (e.lineno || ''),
      ]);
    });
  })();
</script>`;

    return (
      "<!DOCTYPE html>\n" +
      "<html>\n" +
      "<head>\n" +
      '  <meta charset="UTF-8">\n' +
      "  <title>Preview · Browser IDE</title>\n" +
      stylesBlock +
      "\n</head>\n" +
      "<body>\n" +
      htmlContent +
      consoleProxyScript +
      scriptBlock +
      "\n</body>\n" +
      "</html>"
    );
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function renderInlineMarkdown(text) {
    const escaped = escapeHtml(text);
    return escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function renderMarkdownDocument(markdown, filename) {
    const lines = String(markdown || "").replace(/\r/g, "").split("\n");
    const html = [];
    let inCodeBlock = false;
    let codeBuffer = [];
    let inList = false;
    let tableBuffer = [];

    const parseTableCells = (line) => {
      const trimmed = line.trim();
      if (!trimmed.includes("|")) return null;
      const normalized = trimmed.replace(/^\|/, "").replace(/\|$/, "");
      return normalized.split("|").map((cell) => cell.trim());
    };

    const isTableDividerLine = (line) => {
      const cells = parseTableCells(line);
      if (!cells || !cells.length) return false;
      return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
    };

    const closeList = () => {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
    };

    const flushTable = () => {
      if (!tableBuffer.length) return;
      if (tableBuffer.length < 2 || !isTableDividerLine(tableBuffer[1])) {
        html.push(...tableBuffer.map((line) => `<p>${renderInlineMarkdown(line)}</p>`));
        tableBuffer = [];
        return;
      }

      const headers = parseTableCells(tableBuffer[0]) || [];
      const alignments = (parseTableCells(tableBuffer[1]) || []).map((cell) => {
        const startsWithColon = cell.startsWith(":");
        const endsWithColon = cell.endsWith(":");
        if (startsWithColon && endsWithColon) return "center";
        if (endsWithColon) return "right";
        return "left";
      });
      const bodyRows = tableBuffer.slice(2).map((line) => parseTableCells(line) || []);

      html.push("<table>");
      html.push("  <thead>");
      html.push("    <tr>");
      headers.forEach((header, idx) => {
        const align = alignments[idx] || "left";
        html.push(
          `      <th style="text-align:${align}">${renderInlineMarkdown(header)}</th>`
        );
      });
      html.push("    </tr>");
      html.push("  </thead>");
      html.push("  <tbody>");
      bodyRows.forEach((row) => {
        html.push("    <tr>");
        for (let i = 0; i < headers.length; i += 1) {
          const align = alignments[i] || "left";
          const cell = row[i] || "";
          html.push(
            `      <td style="text-align:${align}">${renderInlineMarkdown(cell)}</td>`
          );
        }
        html.push("    </tr>");
      });
      html.push("  </tbody>");
      html.push("</table>");
      tableBuffer = [];
    };

    for (const line of lines) {
      if (line.startsWith("```")) {
        flushTable();
        if (inCodeBlock) {
          html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          closeList();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushTable();
        closeList();
        const level = headingMatch[1].length;
        html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
        continue;
      }

      if (/^-\s+/.test(line)) {
        flushTable();
        if (!inList) {
          html.push("<ul>");
          inList = true;
        }
        html.push(`<li>${renderInlineMarkdown(line.replace(/^-\s+/, ""))}</li>`);
        continue;
      }

      if (!line.trim()) {
        flushTable();
        closeList();
        continue;
      }

      if (line.includes("|")) {
        closeList();
        tableBuffer.push(line);
        continue;
      }

      flushTable();
      closeList();
      html.push(`<p>${renderInlineMarkdown(line)}</p>`);
    }

    flushTable();
    closeList();
    if (inCodeBlock) {
      html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
    }

    return `
<article class="markdown-preview">
  ${html.join("\n  ")}
</article>
<style>
  :root { color-scheme: dark light; }
  body {
    margin: 0;
    padding: 1.5rem;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.55;
    background: #0b1220;
    color: #e5e7eb;
  }
  .markdown-preview { max-width: 860px; margin: 0 auto; }
  h1,h2,h3,h4,h5,h6 { margin: 1rem 0 0.4rem; }
  p { margin: 0.45rem 0; }
  ul { padding-left: 1.2rem; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.65rem 0;
    border: 1px solid rgba(51, 65, 85, 0.9);
    border-radius: 10px;
    overflow: hidden;
  }
  th, td {
    border-bottom: 1px solid rgba(51, 65, 85, 0.65);
    border-right: 1px solid rgba(51, 65, 85, 0.45);
    padding: 0.38rem 0.5rem;
  }
  th:last-child, td:last-child { border-right: none; }
  thead th {
    background: rgba(30, 41, 59, 0.8);
  }
  tbody tr:nth-child(even) {
    background: rgba(15, 23, 42, 0.45);
  }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    background: rgba(30, 41, 59, 0.7);
    padding: 0.08rem 0.35rem;
    border-radius: 6px;
  }
  pre {
    background: rgba(2, 6, 23, 0.95);
    border: 1px solid rgba(51, 65, 85, 0.9);
    border-radius: 10px;
    padding: 0.7rem;
    overflow: auto;
  }
  pre code { background: transparent; padding: 0; border-radius: 0; }
  a { color: #38bdf8; }
</style>
<!-- ${escapeHtml(filename || "markdown")} -->
`;
  }

  function runPreview() {
    const activeFile = getActiveFile();
    clearConsole();
    updateEditorStatus("Running preview…");
    if (previewSizeLabelEl) {
      previewSizeLabelEl.textContent = activeFile
        ? `Live: ${activeFile.name}`
        : "Live frame";
    }
    const html = buildPreviewHtml();
    previewFrameEl.srcdoc = html;
    const startedAt = performance.now();

    setTimeout(() => {
      const elapsed = performance.now() - startedAt;
      previewTimeLabelEl.textContent =
        "Rendered in " + Math.round(elapsed) + "ms";
      updateEditorStatus("Preview updated");
    }, 40);
  }

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.source !== "browser-ide-console") return;
    if (data.type === "clear") {
      clearConsole();
      return;
    }
    const kind = data.type === "error" ? "error" : "log";
    const msg =
      (data.args && data.args.length ? data.args.join(" ") : "") ||
      (kind === "error" ? "Unknown error" : "");
    appendConsoleLine(kind, msg);
  });

  init();
})();

let activeToastState = null;

function clearActiveToast() {
  if (!activeToastState) return;
  const { cleanup } = activeToastState;
  activeToastState = null;
  if (typeof cleanup === "function") {
    cleanup();
  }
}

function registerActiveToast(toast, cleanup) {
  clearActiveToast();
  activeToastState = { toast, cleanup };
}

function showToast(message, options = {}) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  container.innerHTML = "";
  const toast = document.createElement("div");
  toast.className = "toast" + (options.variant === "primary" ? " toast-primary" : "");

  const msg = document.createElement("div");
  msg.className = "toast-message";

  const dot = document.createElement("span");
  dot.className = "toast-dot";

  const text = document.createElement("span");
  text.textContent = message;

  msg.appendChild(dot);
  msg.appendChild(text);

  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.textContent = "✕";
  let timeoutId = null;
  let outsideHandler = null;

  function cleanup() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (outsideHandler) {
      document.removeEventListener("pointerdown", outsideHandler, true);
      outsideHandler = null;
    }
    if (container.contains(toast)) {
      container.removeChild(toast);
    }
  }

  closeBtn.addEventListener("click", () => {
    clearActiveToast();
  });

  toast.appendChild(msg);
  toast.appendChild(closeBtn);
  container.appendChild(toast);
  registerActiveToast(toast, cleanup);

  timeoutId = setTimeout(() => {
    if (activeToastState && activeToastState.toast === toast) {
      clearActiveToast();
    }
  }, options.duration || 3500);

  setTimeout(() => {
    outsideHandler = (event) => {
      if (!toast.contains(event.target)) {
        clearActiveToast();
      }
    };
    document.addEventListener("pointerdown", outsideHandler, true);
  }, 0);
}

function showInputToast(label, initialValue, options = {}) {
  clearActiveToast();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.style.position = "fixed";
  const anchorX = options.anchorPoint && Number.isFinite(options.anchorPoint.x)
    ? options.anchorPoint.x
    : Math.round(window.innerWidth / 2);
  const anchorY = options.anchorPoint && Number.isFinite(options.anchorPoint.y)
    ? options.anchorPoint.y
    : Math.round(window.innerHeight / 2);
  toast.style.top = `${Math.max(8, Math.min(window.innerHeight - 8, anchorY))}px`;
  toast.style.left = `${Math.max(8, Math.min(window.innerWidth - 8, anchorX))}px`;
  toast.style.transform = "translate(0, 0)";
  toast.style.zIndex = "50";

  const content = document.createElement("div");
  content.style.display = "flex";
  content.style.flexDirection = "column";
  content.style.gap = "0.25rem";

  const title = document.createElement("div");
  title.textContent = label;

  const input = document.createElement("input");
  input.type = "text";
  input.value = initialValue || "";
  input.placeholder = options.placeholder || "";
  input.style.background = "rgba(15,23,42,0.9)";
  input.style.border = "1px solid rgba(55,65,81,0.9)";
  input.style.borderRadius = "6px";
  input.style.padding = "0.2rem 0.4rem";
  input.style.color = "#e5e7eb";
  input.style.fontSize = "0.8rem";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "0.3rem";
  actions.style.justifyContent = "flex-end";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "toast-close";
  cancelBtn.textContent = "Cancel";

  const okBtn = document.createElement("button");
  okBtn.className = "toast-close";
  okBtn.textContent = "OK";

  actions.appendChild(cancelBtn);
  actions.appendChild(okBtn);

  content.appendChild(title);
  content.appendChild(input);
  content.appendChild(actions);

  toast.innerHTML = "";
  toast.appendChild(content);

  let outsideHandler = null;
  function cleanup() {
    if (outsideHandler) {
      document.removeEventListener("pointerdown", outsideHandler, true);
      outsideHandler = null;
    }
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }

  function submit() {
    const value = input.value;
    const onSubmit = options.onSubmit;
    clearActiveToast();
    if (onSubmit) {
      onSubmit(value);
    }
  }

  okBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    submit();
  });

  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearActiveToast();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      clearActiveToast();
    }
  });

  document.body.appendChild(toast);
  registerActiveToast(toast, cleanup);
  const rect = toast.getBoundingClientRect();
  const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
  const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
  toast.style.left = `${Math.max(8, Math.min(anchorX, maxLeft))}px`;
  toast.style.top = `${Math.max(8, Math.min(anchorY, maxTop))}px`;
  setTimeout(() => {
    outsideHandler = (event) => {
      if (!toast.contains(event.target)) {
        clearActiveToast();
      }
    };
    document.addEventListener("pointerdown", outsideHandler, true);
  }, 0);
  input.focus();
  input.select();
}

async function downloadWorkspace() {
  const files =
    window.__browserIdeGetFiles && window.__browserIdeGetFiles();
  if (!files || !files.length) {
    showToast("No files to download.", { variant: "danger" });
    return;
  }

  if (window.JSZip) {
    const zip = new window.JSZip();
    files.forEach((file) => {
      zip.file(file.name, file.content || "");
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "browser-ide-workspace.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Workspace downloaded as ZIP.", { variant: "primary" });
  } else {
    // fallback: download a single concatenated file
    const blob = new Blob(
      files.map(
        (f) =>
          `/* ---- ${f.name} ---- */\n${f.content || ""}\n\n`
      ),
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "browser-ide-workspace.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Workspace downloaded (text bundle).", {
      variant: "primary",
    });
  }
}


