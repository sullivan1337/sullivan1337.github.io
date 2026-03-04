(function () {
  let rows = [];
  let selectedRow = -1;
  let selectedCol = -1;
  let hasHeader = true;
  let colWidths = [];
  let sortCol = -1;
  let sortDir = 1;
  let jsonFormatCols = [];
  let selectedRows = [];

  const $ = (id) => document.getElementById(id);
  const fileInput = $("file-input");
  const uploadBtn = $("upload-btn");
  const resetBtn = $("reset-btn");
  const downloadBtn = $("download-btn");
  const brandMark = $("brand-mark");
  const statusLabel = $("status-label");
  const addRowBtn = $("add-row-btn");
  const addColBtn = $("add-col-btn");
  const compareRowsBtn = $("compare-rows-btn");
  const headerCheckbox = $("header-row-checkbox");
  const wordWrapCheckbox = $("word-wrap-checkbox");
  const jsonDropdownBtn = $("json-dropdown-btn");
  const jsonDropdownPanel = $("json-dropdown-panel");
  const gridWrapper = $("grid-wrapper");
  const emptyState = $("empty-state");
  const gridContainer = $("grid-container");
  const gridBody = $("grid-body");
  const gridTableWrap = $("grid-table-wrap");
  const tableHeaderBar = $("table-header-bar");
  const tableHeaderWrap = $("table-header-wrap");
  const gridHScroll = $("grid-h-scroll");
  const gridHSpacer = $("grid-h-spacer");
  const csvThead = $("csv-thead");
  const csvTbody = $("csv-tbody");
  const pasteInlineTextarea = $("paste-inline-textarea");
  const pasteApplyInlineBtn = $("paste-apply-inline-btn");
  const uploadEmptyBtn = $("upload-empty-btn");
  const contextMenu = $("context-menu");
  const searchInput = $("search-input");
  const searchClear = $("search-clear");
  const compareModal = $("compare-modal");
  const compareTable = $("compare-table");
  const compareModalBackdrop = $("compare-modal-backdrop");
  const compareModalClose = $("compare-modal-close");

  function parseCSV(text) {
    const result = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cell += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ",") {
          row.push(cell);
          cell = "";
        } else if (c === "\n" || c === "\r") {
          if (c === "\r" && text[i + 1] === "\n") i++;
          row.push(cell);
          if (row.some((s) => s.length > 0)) result.push(row);
          row = [];
          cell = "";
        } else {
          cell += c;
        }
      }
    }

    row.push(cell);
    if (row.some((s) => s.length > 0)) result.push(row);
    return result;
  }

  function serializeCSV(data) {
    return data
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? "");
            if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
              return '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
          })
          .join(",")
      )
      .join("\n");
  }

  function normalizeRows(data) {
    if (!data.length) return data;
    const maxCols = Math.max(...data.map((r) => r.length));
    return data.map((r) => {
      const copy = r.slice();
      while (copy.length < maxCols) copy.push("");
      return copy;
    });
  }

  function loadData(data) {
    rows = normalizeRows(data);
    hasHeader = headerCheckbox.checked;
    selectedRow = -1;
    selectedCol = -1;
    selectedRows = [];
    const numCols = rows[0]?.length || 0;
    if (colWidths.length !== numCols) {
      colWidths = Array(numCols).fill(null);
    }
    jsonFormatCols = jsonFormatCols.filter((c) => c < numCols);
    updateJsonFormatSelect();
    render();
    updateUI();
  }

  function updateJsonFormatSelect() {
    jsonDropdownPanel.innerHTML = "";
    const numCols = rows[0]?.length || 0;
    if (numCols === 0) {
      jsonDropdownPanel.textContent = "No columns";
      return;
    }
    const headerRow = hasHeader ? rows[0] : null;
    for (let c = 0; c < numCols; c++) {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = c;
      cb.checked = jsonFormatCols.includes(c);
      cb.addEventListener("change", () => {
        if (cb.checked) jsonFormatCols.push(c);
        else jsonFormatCols = jsonFormatCols.filter((i) => i !== c);
        jsonFormatCols.sort((a, b) => a - b);
        updateJsonDropdownButton();
        if (rows.length) render();
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(headerRow ? (headerRow[c] || `Col ${c + 1}`) : `Col ${c + 1}`));
      jsonDropdownPanel.appendChild(label);
    }
    updateJsonDropdownButton();
  }

  function updateJsonDropdownButton() {
    const n = jsonFormatCols.length;
    if (n === 0) {
      jsonDropdownBtn.textContent = "None ▼";
    } else if (n === 1 && rows[0]) {
      const headerRow = hasHeader ? rows[0] : null;
      const name = headerRow ? (headerRow[jsonFormatCols[0]] || `Col ${jsonFormatCols[0] + 1}`) : `Col ${jsonFormatCols[0] + 1}`;
      jsonDropdownBtn.textContent = name + " ▼";
    } else {
      jsonDropdownBtn.textContent = n + " columns ▼";
    }
  }

  function prettyJson(val) {
    if (val == null || String(val).trim() === "") return val;
    try {
      const parsed = JSON.parse(String(val));
      return JSON.stringify(parsed, null, 2);
    } catch (_) {
      return val;
    }
  }

  function minifyJson(val) {
    if (val == null || String(val).trim() === "") return val;
    try {
      const parsed = JSON.parse(String(val));
      return JSON.stringify(parsed);
    } catch (_) {
      return String(val).replace(/\s+/g, " ").trim();
    }
  }

  function highlightJson(text) {
    if (!text || typeof text !== "string") return "";
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const re = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)|([{}\[\],:])/g;
    return escaped.replace(re, (m, str, colon, bool, num, punct) => {
      if (str) return `<span class="json-${colon ? "key" : "string"}">${str}</span>`;
      if (bool) return `<span class="json-bool">${bool}</span>`;
      if (num) return `<span class="json-num">${num}</span>`;
      if (punct) return `<span class="json-punct">${punct}</span>`;
      return m;
    });
  }

  function render() {
    if (!rows.length) {
      emptyState.style.display = "flex";
      gridContainer.style.display = "none";
      if (tableHeaderBar) tableHeaderBar.style.display = "none";
      statusLabel.textContent = "No data loaded";
      return;
    }

    emptyState.style.display = "none";
    gridContainer.style.display = "flex";
    if (tableHeaderBar) tableHeaderBar.style.display = "block";

    const numCols = rows[0].length;
    updateJsonFormatSelect();
    const headerRow = hasHeader ? rows[0] : null;
    let dataRows = hasHeader ? rows.slice(1) : rows.slice();

    let dataRowsWithIndex = dataRows.map((row, i) => ({
      row,
      dataIdx: hasHeader ? i + 1 : i,
    }));
    if (sortCol >= 0 && sortCol < numCols) {
      dataRowsWithIndex = dataRowsWithIndex.sort((a, b) => {
        const va = (a.row[sortCol] ?? "").toString();
        const vb = (b.row[sortCol] ?? "").toString();
        const cmp = va.localeCompare(vb, undefined, { numeric: true });
        return sortDir * cmp;
      });
    }

    const headerColgroup = $("csv-header-colgroup");
    const bodyColgroup = $("csv-body-colgroup");
    const buildColgroup = (cg) => {
      if (!cg) return;
      cg.innerHTML = "<col class=\"col-index\" style=\"width:3.5rem\">";
      for (let c = 0; c < numCols; c++) {
        const col = document.createElement("col");
        const w = colWidths[c];
        if (w) col.style.width = w + "px";
        cg.appendChild(col);
      }
    };
    buildColgroup(headerColgroup);
    buildColgroup(bodyColgroup);

    csvThead.innerHTML = "";
    const headerTr = document.createElement("tr");
    headerTr.appendChild(createRowIndexCell(-1, true));

    for (let c = 0; c < numCols; c++) {
      const th = document.createElement("th");
      th.dataset.col = c;
      if (jsonFormatCols.includes(c)) th.classList.add("col-json");
      th.style.minWidth = "80px";
      if (colWidths[c]) th.style.width = colWidths[c] + "px";
      th.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        selectedCol = c;
        showContextMenu(e.clientX, e.clientY, "col", c);
      });

      const colHeader = document.createElement("div");
      colHeader.className = "col-header";

      if (hasHeader && headerRow) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "cell-input col-header-input";
        input.value = headerRow[c] ?? "";
        input.dataset.col = c;
        input.placeholder = `Col ${c + 1}`;
        input.addEventListener("change", () => {
          rows[0][c] = input.value;
          updateJsonFormatSelect();
          updateUI();
        });
        input.addEventListener("focus", () => { selectedCol = c; updateUI(); });
        colHeader.appendChild(input);
      } else {
        const span = document.createElement("span");
        span.textContent = `Col ${c + 1}`;
        colHeader.appendChild(span);
      }

      const delBtn = document.createElement("button");
      delBtn.className = "col-delete";
      delBtn.dataset.col = c;
      delBtn.title = "Delete column";
      delBtn.textContent = "×";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteColumn(c);
      });
      colHeader.appendChild(delBtn);
      th.appendChild(colHeader);

      const sortBtn = document.createElement("button");
      sortBtn.className = "col-sort-btn";
      sortBtn.title = "Sort column";
      sortBtn.textContent = sortCol === c ? (sortDir > 0 ? "▲" : "▼") : "⇅";
      sortBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        sortCol = sortCol === c ? sortCol : c;
        sortDir = sortCol === c && sortDir > 0 ? -1 : 1;
        render();
      });
      colHeader.insertBefore(sortBtn, colHeader.firstChild);

      const resizeHandle = document.createElement("div");
      resizeHandle.className = "col-resize-handle";
      resizeHandle.addEventListener("mousedown", (e) => startResize(e, c));
      th.appendChild(resizeHandle);

      headerTr.appendChild(th);
    }
    csvThead.appendChild(headerTr);

    csvTbody.innerHTML = "";
    dataRowsWithIndex.forEach(({ row, dataIdx }, rIdx) => {
      const tr = document.createElement("tr");
      tr.dataset.row = rIdx;
      tr.dataset.dataIdx = dataIdx;
      tr.appendChild(createRowIndexCell(rIdx, false, dataIdx));

      row.forEach((cell, cIdx) => {
        const td = document.createElement("td");
        td.dataset.row = rIdx;
        td.dataset.col = cIdx;
        const isWrap = wordWrapCheckbox.checked || jsonFormatCols.includes(cIdx);
        if (isWrap) td.classList.add("cell-wrap");
        if (jsonFormatCols.includes(cIdx)) td.classList.add("col-json");

        const displayVal = jsonFormatCols.includes(cIdx) ? prettyJson(cell) : cell;
        const input = document.createElement("textarea");
        input.className = "cell-input" + (jsonFormatCols.includes(cIdx) ? " cell-input-json" : "");
        const str = String(displayVal || "");
        const newlineLines = (str.match(/\n/g) || []).length + 1;
        const estimatedWrapLines = Math.ceil(str.length / 35);
        const lineCount = isWrap ? Math.max(newlineLines, estimatedWrapLines, 1) : 1;
        input.rows = isWrap ? Math.min(30, lineCount) : 1;
        input.value = displayVal;
        input.dataset.dataIdx = dataIdx;
        input.dataset.col = cIdx;
        input.dataset.row = rIdx;

        if (jsonFormatCols.includes(cIdx)) {
          const wrap = document.createElement("div");
          wrap.className = "json-cell-wrap";
          const pre = document.createElement("pre");
          pre.className = "json-highlight";
          pre.innerHTML = highlightJson(displayVal);
          wrap.appendChild(pre);
          wrap.appendChild(input);
          td.appendChild(wrap);
          const updateHighlight = () => {
            pre.innerHTML = highlightJson(input.value);
            pre.scrollTop = input.scrollTop;
            pre.scrollLeft = input.scrollLeft;
          };
          const syncScroll = () => {
            pre.scrollTop = input.scrollTop;
            pre.scrollLeft = input.scrollLeft;
          };
        input.addEventListener("input", () => {
          updateHighlight();
          syncRows();
        });
        input.addEventListener("scroll", syncScroll);
        } else {
          td.appendChild(input);
        }

        function syncRows() {
          if (td.classList.contains("cell-wrap")) {
            const str = input.value;
            const newlineLines = (str.match(/\n/g) || []).length + 1;
            const estimatedWrapLines = Math.ceil(str.length / 35);
            const lines = Math.max(newlineLines, estimatedWrapLines, 1);
            input.rows = Math.min(30, lines);
            normalizeRowHeights(tr);
          }
        }
        if (!jsonFormatCols.includes(cIdx)) {
          input.addEventListener("input", syncRows);
        }
        input.addEventListener("change", () => {
          const dd = parseInt(input.dataset.dataIdx, 10);
          const cc = parseInt(input.dataset.col, 10);
          let val = input.value;
          if (jsonFormatCols.includes(cc)) val = minifyJson(val);
          rows[dd][cc] = val;
          updateUI();
        });

        input.addEventListener("focus", () => {
          selectedRow = rIdx;
          selectedCol = parseInt(input.dataset.col, 10);
          updateUI();
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const next = e.shiftKey ? getPrevCell(rIdx, cIdx) : getNextCell(rIdx, cIdx);
            if (next) next.focus();
          }
        });

        input.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          selectedRow = rIdx;
          selectedCol = cIdx;
          showContextMenu(e.clientX, e.clientY, "cell", rIdx, cIdx, dataIdx);
        });

        if (!jsonFormatCols.includes(cIdx)) td.appendChild(input);
        tr.appendChild(td);
      });

      tr.addEventListener("contextmenu", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        e.preventDefault();
        selectedRow = rIdx;
        showContextMenu(e.clientX, e.clientY, "row", rIdx, dataIdx);
      });

      csvTbody.appendChild(tr);
    });

    requestAnimationFrame(() => {
      csvTbody.querySelectorAll("tr").forEach((tr) => normalizeRowHeights(tr));
    });
    syncScrollAndSpacer();
    applySearchHighlights();

    const totalRows = rows.length;
    const totalCols = numCols;
    statusLabel.textContent = `${totalRows} rows × ${totalCols} columns`;
    updateUI();
  }

  function applySearchHighlights() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    if (!query) {
      csvTbody.querySelectorAll(".search-hit").forEach((el) => el.classList.remove("search-hit"));
      csvThead.querySelectorAll(".search-hit").forEach((el) => el.classList.remove("search-hit"));
      return;
    }
    csvTbody.querySelectorAll("td:not(.row-index-cell)").forEach((td) => {
      td.classList.remove("search-hit");
      const input = td.querySelector("textarea, input");
      const cellVal = input ? String(input.value || "").toLowerCase() : "";
      if (cellVal.includes(query)) td.classList.add("search-hit");
    });
    csvThead.querySelectorAll("th").forEach((th) => {
      th.classList.remove("search-hit");
      const input = th.querySelector("input");
      const span = th.querySelector("span");
      const cellVal = (input ? input.value : span?.textContent || "").toLowerCase();
      if (cellVal.includes(query)) th.classList.add("search-hit");
    });
  }

  function createRowIndexCell(index, isHeader = false, dataIdx = -1) {
    const cell = document.createElement(isHeader ? "th" : "td");
    cell.className = "row-index-cell";
    if (isHeader) {
      cell.innerHTML = "";
      cell.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, "corner");
      });
    } else {
      const inner = document.createElement("div");
      inner.className = "row-index-inner";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "row-select-checkbox";
      cb.dataset.dataIdx = String(dataIdx);
      cb.checked = selectedRows.includes(dataIdx);
      cb.title = "Select row to compare (max 4)";
      cb.addEventListener("click", (e) => e.stopPropagation());
      cb.addEventListener("change", () => {
        if (cb.checked) {
          if (selectedRows.length >= 4) selectedRows = selectedRows.slice(1);
          selectedRows.push(dataIdx);
        } else {
          selectedRows = selectedRows.filter((d) => d !== dataIdx);
        }
        updateCompareButton();
        syncRowCheckboxes();
      });
      const num = document.createElement("span");
      num.className = "row-index-num";
      num.textContent = hasHeader ? index + 2 : index + 1;
      const delBtn = document.createElement("button");
      delBtn.className = "row-delete";
      delBtn.title = "Delete row";
      delBtn.textContent = "×";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteRowByDataIdx(dataIdx);
      });
      inner.appendChild(cb);
      inner.appendChild(num);
      inner.appendChild(delBtn);
      cell.appendChild(inner);
      cell.dataset.row = index;
      cell.addEventListener("click", (e) => {
        if (e.target.classList.contains("row-delete")) return;
        selectedRow = index;
        updateUI();
      });
      cell.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        selectedRow = index;
        showContextMenu(e.clientX, e.clientY, "row", index, dataIdx);
      });
    }
    return cell;
  }

  function deleteRowByDataIdx(dataIdx) {
    if (dataIdx < 0 || dataIdx >= rows.length) return;
    rows.splice(dataIdx, 1);
    selectedRows = selectedRows
      .filter((d) => d !== dataIdx)
      .map((d) => (d > dataIdx ? d - 1 : d));
    render();
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function getNextCell(row, col) {
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const numCols = rows[0]?.length || 0;
    col++;
    if (col >= numCols) {
      col = 0;
      row++;
    }
    if (row >= dataRows.length) return null;
    return csvTbody.querySelector(`textarea[data-row="${row}"][data-col="${col}"]`);
  }

  function syncScrollAndSpacer() {
    if (!gridTableWrap || !gridHScroll || !gridHSpacer || !tableHeaderWrap) return;
    const table = document.getElementById("csv-table");
    const tableWidth = table ? table.scrollWidth : 0;
    gridHSpacer.style.width = tableWidth + "px";
    let scrollRaf = 0;
    const throttleSync = (fn) => () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        fn();
      });
    };
    const syncFromBody = throttleSync(() => {
      const v = gridTableWrap.scrollLeft;
      if (gridHScroll.scrollLeft !== v) gridHScroll.scrollLeft = v;
      if (tableHeaderWrap.scrollLeft !== v) tableHeaderWrap.scrollLeft = v;
    });
    const syncFromHScroll = throttleSync(() => {
      const v = gridHScroll.scrollLeft;
      if (gridTableWrap.scrollLeft !== v) gridTableWrap.scrollLeft = v;
      if (tableHeaderWrap.scrollLeft !== v) tableHeaderWrap.scrollLeft = v;
    });
    const syncFromHeader = throttleSync(() => {
      const v = tableHeaderWrap.scrollLeft;
      if (gridTableWrap.scrollLeft !== v) gridTableWrap.scrollLeft = v;
      if (gridHScroll.scrollLeft !== v) gridHScroll.scrollLeft = v;
    });
    gridTableWrap.onscroll = syncFromBody;
    gridHScroll.onscroll = syncFromHScroll;
    tableHeaderWrap.onscroll = syncFromHeader;
  }

  function normalizeRowHeights(tr) {
    const wrapCells = tr.querySelectorAll("td.cell-wrap");
    if (!wrapCells.length) return;
    let maxRows = 1;
    wrapCells.forEach((td) => {
      const ta = td.querySelector("textarea");
      if (ta) {
        const lines = (ta.value.match(/\n/g) || []).length + 1;
        const estWrap = Math.ceil((ta.value || "").length / 35);
        maxRows = Math.max(maxRows, lines, estWrap);
      }
    });
    const targetRows = Math.min(30, Math.max(1, maxRows));
    tr.querySelectorAll("td.cell-wrap textarea").forEach((ta) => {
      ta.rows = targetRows;
    });
  }

  function getPrevCell(row, col) {
    const dataRows = hasHeader ? rows.slice(1) : rows;
    col--;
    if (col < 0) {
      col = (rows[0]?.length || 1) - 1;
      row--;
    }
    if (row < 0) return null;
    return csvTbody.querySelector(`textarea[data-row="${row}"][data-col="${col}"]`);
  }

  function startResize(e, colIndex) {
    e.preventDefault();
    const th = e.target.closest("th");
    const startX = e.clientX;
    const startW = th.offsetWidth;
    const headerColgroup = document.querySelector("#csv-header-table colgroup");
    const bodyColgroup = document.querySelector("#csv-body-colgroup");
    const headerCol = headerColgroup?.children[colIndex + 1];
    const bodyCol = bodyColgroup?.children[colIndex + 1];
    let rafId = 0;
    let lastX = startX;

    function applyResize(x) {
      const dw = x - startX;
      const newW = Math.max(60, startW + dw);
      colWidths[colIndex] = newW;
      th.style.width = newW + "px";
      if (headerCol) headerCol.style.width = newW + "px";
      if (bodyCol) bodyCol.style.width = newW + "px";
      rafId = 0;
    }

    function onMove(e) {
      lastX = e.clientX;
      if (rafId) return;
      rafId = requestAnimationFrame(() => applyResize(lastX));
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (rafId) cancelAnimationFrame(rafId);
      applyResize(lastX);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function addRow() {
    if (!rows.length) {
      rows = [[""]];
    } else {
      const numCols = rows[0].length;
      rows.push(Array(numCols).fill(""));
    }
    render();
  }

  function addColumn() {
    if (!rows.length) {
      rows = [[""]];
    } else {
      rows.forEach((r) => r.push(""));
    }
    render();
  }

  function deleteColumn(index) {
    if (index < 0 || !rows.length) return;
    const numCols = rows[0].length;
    if (index >= numCols) return;
    rows.forEach((r) => r.splice(index, 1));
    jsonFormatCols = jsonFormatCols
      .filter((c) => c !== index)
      .map((c) => (c > index ? c - 1 : c));
    sortCol = sortCol === index ? -1 : sortCol > index ? sortCol - 1 : sortCol;
    colWidths.splice(index, 1);
    render();
  }

  function updateUI() {
    const hasData = rows.length > 0;
    downloadBtn.disabled = !hasData;
    addRowBtn.disabled = !hasData;
    addColBtn.disabled = !hasData;
    updateCompareButton();
  }

  function updateCompareButton() {
    if (compareRowsBtn) {
      compareRowsBtn.disabled = selectedRows.length < 2 || selectedRows.length > 4;
    }
  }

  function syncRowCheckboxes() {
    csvTbody.querySelectorAll(".row-select-checkbox").forEach((cb) => {
      const di = parseInt(cb.dataset.dataIdx, 10);
      cb.checked = selectedRows.includes(di);
    });
  }

  function showCompareModal() {
    const n = selectedRows.length;
    if (n < 2 || n > 4 || !rows.length) return;
    const indices = selectedRows.slice(0, n);
    const rowData = indices.map((idx) => rows[idx]).filter(Boolean);
    if (rowData.length !== n) return;
    const headerRow = hasHeader ? rows[0] : null;
    const numCols = Math.max(...rowData.map((r) => r.length));
    compareTable.innerHTML = "";
    const numHeaderCols = 1 + n;
    const colgroup = document.createElement("colgroup");
    const pct = 100 / numHeaderCols;
    for (let i = 0; i < numHeaderCols; i++) {
      const col = document.createElement("col");
      col.style.width = pct + "%";
      col.dataset.col = String(i);
      colgroup.appendChild(col);
    }
    compareTable.appendChild(colgroup);
    const thead = document.createElement("thead");
    const headerTr = document.createElement("tr");
    const th0 = document.createElement("th");
    th0.className = "compare-col-name";
    th0.textContent = "Column";
    th0.dataset.col = "0";
    const resize0 = document.createElement("div");
    resize0.className = "compare-resize-handle";
    resize0.addEventListener("mousedown", (e) => startCompareResize(e, 0));
    th0.appendChild(resize0);
    headerTr.appendChild(th0);
    indices.forEach((idx, i) => {
      const th = document.createElement("th");
      th.className = "compare-val";
      th.textContent = "Row " + (idx + 1);
      th.dataset.col = String(i + 1);
      const resize = document.createElement("div");
      resize.className = "compare-resize-handle";
      resize.addEventListener("mousedown", (e) => startCompareResize(e, i + 1));
      th.appendChild(resize);
      headerTr.appendChild(th);
    });
    thead.appendChild(headerTr);
    compareTable.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (let c = 0; c < numCols; c++) {
      const tr = document.createElement("tr");
      const colName = headerRow ? (headerRow[c] || `Col ${c + 1}`) : `Col ${c + 1}`;
      const vals = rowData.map((row) => String(row[c] ?? ""));
      const allSame = vals.every((v) => v === vals[0]);
      const isJsonCol = jsonFormatCols.includes(c);
      const td0 = document.createElement("td");
      td0.className = "compare-col-name";
      td0.textContent = colName || "—";
      tr.appendChild(td0);
      vals.forEach((val) => {
        const td = document.createElement("td");
        td.className = "compare-val" + (!allSame ? " compare-diff" : "") + (isJsonCol ? " compare-json" : "");
        if (isJsonCol) {
          const displayVal = prettyJson(val);
          const pre = document.createElement("pre");
          pre.className = "compare-json-highlight";
          pre.innerHTML = displayVal ? highlightJson(displayVal) : "";
          if (!pre.textContent) pre.textContent = "—";
          td.appendChild(pre);
        } else {
          td.textContent = val || "—";
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    compareTable.appendChild(tbody);
    if (compareModal) compareModal.classList.add("open");
  }

  function startCompareResize(e, colIndex) {
    e.preventDefault();
    const th = e.target.closest("th");
    if (!th || !compareTable) return;
    const initX = e.clientX;
    const cols = compareTable.querySelectorAll("colgroup col");
    const thead = compareTable.querySelector("thead tr");
    const numCols = cols.length;
    const headerCells = thead ? Array.from(thead.children) : [];
    const startWidths = headerCells.map((c) => c.offsetWidth);
    let rafId = 0;
    let lastX = initX;

    function applyResize(x) {
      const dw = x - initX;
      if (colIndex >= startWidths.length) return;
      const nextIdx = colIndex + 1;
      const prevIdx = colIndex - 1;
      const newCurr = Math.max(50, (startWidths[colIndex] || 100) + dw);
      if (nextIdx < numCols) {
        const newNext = Math.max(50, (startWidths[nextIdx] || 100) - dw);
        cols[colIndex].style.width = newCurr + "px";
        cols[nextIdx].style.width = newNext + "px";
      } else if (prevIdx >= 0) {
        const newPrev = Math.max(50, (startWidths[prevIdx] || 100) - dw);
        cols[colIndex].style.width = newCurr + "px";
        cols[prevIdx].style.width = newPrev + "px";
      } else {
        cols[colIndex].style.width = newCurr + "px";
      }
      rafId = 0;
    }

    function onMove(ev) {
      lastX = ev.clientX;
      if (rafId) return;
      rafId = requestAnimationFrame(() => applyResize(lastX));
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (rafId) cancelAnimationFrame(rafId);
      applyResize(lastX);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function hideCompareModal() {
    if (compareModal) compareModal.classList.remove("open");
  }

  function showContextMenu(x, y, type, ...args) {
    contextMenu.innerHTML = "";

    const add = (label, onClick, danger = false) => {
      const item = document.createElement("div");
      item.className = "context-menu-item" + (danger ? " danger" : "");
      item.textContent = label;
      item.addEventListener("click", () => {
        onClick();
        hideContextMenu();
      });
      contextMenu.appendChild(item);
    };

    if (type === "row") {
      const dataIdx = args[1] ?? (hasHeader ? args[0] + 1 : args[0]);
      add("Insert row above", () => {
        const numCols = rows[0]?.length || 1;
        rows.splice(dataIdx, 0, Array(numCols).fill(""));
        render();
      });
      add("Delete row", () => deleteRowByDataIdx(dataIdx), true);
    } else if (type === "col") {
      add("Insert column before", () => {
        rows.forEach((r) => r.splice(args[0], 0, ""));
        render();
      });
      add("Delete column", () => deleteColumn(args[0]), true);
    } else if (type === "cell") {
      const dataIdx = args[2] ?? (hasHeader ? args[0] + 1 : args[0]);
      add("Insert row above", () => {
        const numCols = rows[0]?.length || 1;
        rows.splice(dataIdx, 0, Array(numCols).fill(""));
        render();
      });
      add("Insert column before", () => {
        rows.forEach((r) => r.splice(args[1], 0, ""));
        render();
      });
      add("Delete row", () => deleteRowByDataIdx(dataIdx), true);
      add("Delete column", () => deleteColumn(args[1]), true);
    } else if (type === "corner") {
      add("Add row", addRow);
      add("Add column", addColumn);
    }

    if (!contextMenu.children.length) return;

    contextMenu.classList.add("open");
    const rect = contextMenu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x;
    let top = y;
    if (left + rect.width > vw - 8) left = vw - rect.width - 8;
    if (top + rect.height > vh - 8) top = vh - rect.height - 8;
    contextMenu.style.left = left + "px";
    contextMenu.style.top = top + "px";
  }

  function hideContextMenu() {
    contextMenu.classList.remove("open");
  }

  function handleUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const data = parseCSV(text);
        loadData(data);
      } catch (err) {
        alert("Failed to parse CSV: " + err.message);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  function handlePaste(text) {
    try {
      const data = parseCSV(text.trim());
      if (!data.length) return;
      loadData(data);
      pasteInlineTextarea.value = "";
    } catch (err) {
      alert("Failed to parse CSV: " + err.message);
    }
  }

  function reset() {
    rows = [];
    selectedRow = -1;
    selectedCol = -1;
    selectedRows = [];
    colWidths = [];
    if (wordWrapCheckbox) wordWrapCheckbox.checked = true;
    sortCol = -1;
    sortDir = 1;
    jsonFormatCols = [];
    pasteInlineTextarea.value = "";
    updateJsonFormatSelect();
    render();
    updateUI();
  }

  function handleDownload() {
    if (!rows.length) return;
    const csv = serializeCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  uploadBtn.addEventListener("click", () => fileInput.click());
  uploadEmptyBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  });

  resetBtn.addEventListener("click", reset);
  brandMark.addEventListener("click", reset);

  pasteApplyInlineBtn.addEventListener("click", () => {
    handlePaste(pasteInlineTextarea.value);
  });

  function setupDragDrop() {
    const handleDrop = (e) => {
      e.preventDefault();
      gridWrapper.classList.remove("drag-over");
      const file = e.dataTransfer?.files?.[0];
      if (file && (file.name.endsWith(".csv") || file.type === "text/csv" || file.type === "text/plain")) {
        handleUpload(file);
      }
    };

    gridWrapper.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      gridWrapper.classList.add("drag-over");
    });
    gridWrapper.addEventListener("dragleave", (e) => {
      if (!gridWrapper.contains(e.relatedTarget)) gridWrapper.classList.remove("drag-over");
    });
    gridWrapper.addEventListener("drop", handleDrop);
  }
  setupDragDrop();

  document.addEventListener("click", hideContextMenu);

  downloadBtn.addEventListener("click", handleDownload);

  addRowBtn.addEventListener("click", addRow);
  addColBtn.addEventListener("click", addColumn);

  if (compareRowsBtn) {
    compareRowsBtn.addEventListener("click", showCompareModal);
  }
  if (compareModalBackdrop) {
    compareModalBackdrop.addEventListener("click", hideCompareModal);
  }
  if (compareModalClose) {
    compareModalClose.addEventListener("click", hideCompareModal);
  }

  headerCheckbox.addEventListener("change", () => {
    hasHeader = headerCheckbox.checked;
    if (rows.length) render();
  });

  wordWrapCheckbox.addEventListener("change", () => {
    if (rows.length) render();
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => applySearchHighlights());
    searchInput.addEventListener("change", () => applySearchHighlights());
  }
  if (searchClear) {
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      searchInput.focus();
      applySearchHighlights();
    });
  }

  jsonDropdownBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    jsonDropdownPanel.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (!jsonDropdownBtn.contains(e.target) && !jsonDropdownPanel.contains(e.target)) {
      jsonDropdownPanel.classList.remove("open");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideContextMenu();
      hideCompareModal();
    }
  });

  window.addEventListener("paste", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const text = e.clipboardData?.getData("text");
    if (text) {
      e.preventDefault();
      handlePaste(text);
    }
  });

  loadData([]);
})();
