/* Adjuntos opcionales por caso. Solo se guardan referencias, nunca contenido. */
window.CejProCaseFiles = (() => {
  const key = "cejpro.files.preview.v1";
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  let files = [],
    root,
    editing = "",
    pending = [];
  const contents = new Map();
  try {
    const saved = JSON.parse(window.CejProStorage.getItem(key));
    if (
      Array.isArray(saved) &&
      saved.every(
        (f) =>
          f &&
          typeof f.id === "string" &&
          typeof f.name === "string" &&
          typeof f.folderId === "string" &&
          Number.isFinite(f.size) &&
          f.size >= 0 &&
          typeof f.type === "string",
      )
    )
      files = saved;
  } catch (_) {}
  const $ = (id) => root.querySelector("#" + id);
  const count = (id) => (id ? files.filter((f) => f.caseId === id).length : 0);
  const size = (b) =>
    b < 1024
      ? `${b} B`
      : b < 1048576
        ? `${(b / 1024).toFixed(1)} KB`
        : `${(b / 1048576).toFixed(1)} MB`;
  function mount(element) {
    root = element;
    root.innerHTML = `<div class="files-inline-heading"><span>Subir archivos</span><button type="button" id="chooseCaseFiles" class="cases-secondary">Seleccionar archivos</button></div><input type="file" multiple id="caseFilesInput" class="sr-only" aria-label="Seleccionar archivos opcionales del caso"><p class="files-inline-hint">Puedes agregarlos ahora o más adelante al editar el caso.</p><ul class="files-pending" id="caseFilesList" aria-label="Archivos del caso"></ul>`;
    $("chooseCaseFiles").onclick = () => $("caseFilesInput").click();
    $("caseFilesInput").addEventListener("change", (e) => {
      for (const f of e.target.files)
        if (
          !pending.some(
            (p) =>
              p.name === f.name &&
              p.size === f.size &&
              p.lastModified === f.lastModified,
          )
        )
          pending.push(f);
      render();
    });
    $("caseFilesList").addEventListener("click", (e) => {
      const b = e.target.closest("[data-remove-pending]");
      if (b) {
        pending.splice(Number(b.dataset.removePending), 1);
        render();
      }
    });
  }
  function render() {
    const saved = editing ? files.filter((f) => f.caseId === editing) : [];
    $("caseFilesList").innerHTML =
      saved
        .map(
          (f) =>
            `<li><span><strong>${esc(f.name)}</strong><small>${size(f.size)} · Referencia guardada</small></span></li>`,
        )
        .join("") +
      pending
        .map(
          (f, i) =>
            `<li><span><strong>${esc(f.name)}</strong><small>${size(f.size)} · Se agregará al guardar el caso</small></span><button type="button" class="cases-icon-button" data-remove-pending="${i}" aria-label="Quitar ${esc(f.name)}">×</button></li>`,
        )
        .join("");
  }
  function begin(id) {
    editing = id;
    pending = [];
    $("caseFilesInput").value = "";
    render();
  }
  function commit(caseId, folderId) {
    if (!window.CejProWorkspaces.canEdit()) return false;
    for (const f of files) if (f.caseId === caseId) f.folderId = folderId;
    for (const f of pending)
      files.push({
        id:
          "file-" +
          (crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2)),
        caseId,
        folderId,
        name: f.name,
        size: f.size,
        type: f.type || "",
      });
    pending = [];
    editing = caseId;
    try {
      window.CejProStorage.setItem(key, JSON.stringify(files));
      return true;
    } catch (_) {
      return false;
    }
  }
  function list(caseId) {
    return files
      .filter((f) => f.caseId === caseId)
      .map((f) => ({ ...f, documentFolderId: f.documentFolderId || "" }));
  }
  function persist() {
    try {
      window.CejProStorage.setItem(key, JSON.stringify(files));
      return true;
    } catch (_) {
      return false;
    }
  }
  function add(caseId, folderId, selection, documentFolderId = "") {
    if (!window.CejProWorkspaces.canEdit()) return false;
    for (const f of selection) {
      const id = "file-" + crypto.randomUUID();
      contents.set(id, f);
      files.push({
        id,
        caseId,
        folderId,
        documentFolderId,
        name: f.name,
        size: f.size,
        type: f.type || "",
        createdAt: Date.now(),
      });
    }
    return persist();
  }
  function move(caseId, fileId, documentFolderId) {
    if (!window.CejProWorkspaces.canEdit()) return false;
    const f = files.find((f) => f.caseId === caseId && f.id === fileId);
    if (!f) return false;
    f.documentFolderId = documentFolderId;
    return persist();
  }
  function organize(caseId, ids, destination, copy = false) {
    if (!window.CejProWorkspaces.canEdit()) return false;
    const selected = files.filter((f) => f.caseId === caseId && ids.includes(f.id));
    for (const file of selected) {
      if (copy) {
        const id = "file-" + crypto.randomUUID();
        files.push({ ...file, id, documentFolderId: destination, createdAt: Date.now() });
        if (contents.has(file.id)) contents.set(id, contents.get(file.id));
      } else file.documentFolderId = destination;
    }
    return persist();
  }
  function remove(caseId, id) {
    if (!window.CejProWorkspaces.canEdit()) return false;
    files = files.filter((f) => f.caseId !== caseId || f.id !== id);
    contents.delete(id);
    return persist();
  }
  function download(id) {
    const file = files.find((f) => f.id === id), blob = contents.get(id);
    if (!file || !blob) return false;
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return true;
  }
  return { mount, begin, commit, count, list, add, move, organize, remove, download, available: (id) => contents.has(id) };
})();
