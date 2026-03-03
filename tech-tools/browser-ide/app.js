(function () {
  const fileTypes = {
    html: { icon: "H", label: "HTML", lang: "HTML" },
    css: { icon: "C", label: "CSS", lang: "CSS" },
    js: { icon: "J", label: "JS", lang: "JavaScript" },
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
  const editorEl = $("editor");
  const editorGutterEl = $("editor-gutter");
  const cursorPositionEl = $("cursor-position");
  const fileLanguageLabelEl = $("file-language-label");
  const editorStatusEl = $("editor-status");
  const previewFrameEl = $("preview-frame");
  const previewConsoleEl = $("preview-console");
  const previewTimeLabelEl = $("preview-time-label");
  const autoRunToggleEl = $("auto-run-toggle");
  const resetWorkspaceBtnEl = $("reset-workspace-btn");
  const downloadWorkspaceBtnEl = $("download-workspace-btn");
  const previewPanelEl = $("preview-panel");
  const togglePreviewBtnEl = $("toggle-preview-btn");
  const toastContainerEl = $("toast-container");
  const contextMenuEl = $("context-menu");

  let contextMenuNode = null;
  let dragNode = null;

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
    runPreview();
    togglePreviewBtnEl.textContent = "→";

    // expose file list for download helper
    window.__browserIdeGetFiles = () => files.slice();
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

  function attachEvents() {
    editorEl.addEventListener("input", () => {
      const file = getActiveFile();
      if (!file) return;
      file.content = editorEl.value;
      file.dirty = true;
      updateEditorStatus("Unsaved changes");
      renderFileList();
      updateLineNumbers();
      if (autoRun) {
        debounceRunPreview();
      }
    });

    editorEl.addEventListener("keyup", updateCursorPositionFromSelection);
    editorEl.addEventListener("click", updateCursorPositionFromSelection);
    editorEl.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = editorEl.selectionStart;
        const end = editorEl.selectionEnd;
        const value = editorEl.value;
        editorEl.value =
          value.substring(0, start) + "  " + value.substring(end);
        editorEl.selectionStart = editorEl.selectionEnd = start + 2;
        editorEl.dispatchEvent(new Event("input"));
      }

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

  function getActiveFile() {
    return files.find((f) => f.id === activeFileId) || null;
  }

  function renderAll() {
    renderFileList();
    renderEditor();
    updateLineNumbers();
    updateCursorPositionFromSelection();
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
        badge.textContent = "F";

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
        const ft = fileTypes[file.type] || fileTypes.txt;
        badge.textContent = ft.icon;

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
    editorEl.value = file ? file.content : "";
  }

  function updateLineNumbers() {
    const lines = editorEl.value.split("\n").length || 1;
    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= lines; i++) {
      const div = document.createElement("div");
      div.className = "editor-gutter-line";
      div.textContent = i;
      fragment.appendChild(div);
    }
    editorGutterEl.innerHTML = "";
    editorGutterEl.appendChild(fragment);
  }

  function updateCursorPositionFromSelection() {
    const text = editorEl.value.substring(0, editorEl.selectionStart);
    const lines = text.split("\n");
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    cursorPositionEl.textContent = "Ln " + line + ", Col " + col;
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
    const find = (name) =>
      files.find((f) => f.name.toLowerCase() === name.toLowerCase());
    const htmlFile = find("index.html");
    const cssFile = find("styles.css");
    const jsFile = find("script.js");

    const htmlContent = htmlFile ? htmlFile.content : "<!-- No index.html -->";
    const cssContent = cssFile ? cssFile.content : "";
    const jsContent = jsFile ? jsFile.content : "";

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

  function runPreview() {
    clearConsole();
    updateEditorStatus("Running preview…");
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

function showToast(message, options = {}) {
  const container = document.getElementById("toast-container");
  if (!container) return;
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
  closeBtn.addEventListener("click", () => {
    container.removeChild(toast);
  });

  toast.appendChild(msg);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  setTimeout(() => {
    if (container.contains(toast)) {
      container.removeChild(toast);
    }
  }, options.duration || 3500);
}

function showInputToast(label, initialValue, options = {}) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.style.position = "fixed";
  toast.style.top = "50%";
  toast.style.left = "1.5rem";
  toast.style.transform = "translateY(-50%)";
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

  function cleanup() {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }

  function submit() {
    const value = input.value;
    if (options.onSubmit) {
      options.onSubmit(value);
    }
    cleanup();
  }

  okBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    submit();
  });

  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    cleanup();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cleanup();
    }
  });

  document.body.appendChild(toast);
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


