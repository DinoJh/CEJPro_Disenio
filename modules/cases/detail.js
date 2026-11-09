(() => {
  const D = window.CejProCaseDetailData,
    F = window.CejProCaseFiles;
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
  const size = (b) =>
    b < 1024
      ? `${b} B`
      : b < 1048576
        ? `${(b / 1024).toFixed(1)} KB`
        : `${(b / 1048576).toFixed(1)} MB`;
  const tabs = {
    resumen: "Resumen",
    documentos: "Documentos",
    notas: "Notas",
    agenda: "Agenda",
  };
  const sectionIcons = {
    resumen: "home",
    documentos: "folder",
    notas: "file",
    agenda: "calendar",
  };
  let root,
    services,
    caseId,
    tab = "resumen",
    folder = "all",
    pending = [];
  const folderSelections = new Map();
  const $ = (id) => root.querySelector("#" + id);
  const href = (t) => `#expedientes/${encodeURIComponent(caseId)}/${t}`;
  function mount(element, api) {
    root = element;
    services = api;
  }
  function folderOptions(folders, selected = "") {
    return (
      `<option value="">Sin carpeta</option>` +
      folders
        .map(
          (f) =>
            `<option value="${esc(f.id)}"${f.id === selected ? " selected" : ""}>${esc(f.name)}</option>`,
        )
        .join("")
    );
  }
  function flash(text, saved = true) {
    $("detailNotice").textContent =
      text +
      (saved
        ? " Guardado en este navegador."
        : " No se pudo guardar; el cambio durará durante esta visita.");
  }
  function empty(icon, title, text) {
    return `<div class="detail-empty"><span class="icon">${window.CejProIcon(icon)}</span><p>${text}</p></div>`;
  }
  function render(id, requested = "documentos") {
    if (requested === "partes") {
      requested = "resumen";
      history.replaceState(
        null,
        "",
        `#expedientes/${encodeURIComponent(id)}/resumen`,
      );
    }
    caseId = id;
    tab = Object.hasOwn(tabs, requested) ? requested : "resumen";
    folder = folderSelections.get(id) || "all";
    const c = services.getCase(id);
    if (!c) {
      root.innerHTML = `<div class="detail-missing"><a href="#expedientes" class="detail-back">← Volver a mis casos</a>${empty("folder", "No encontramos este caso", "Regresa al listado para seleccionar un caso disponible.")}</div>`;
      return;
    }
    const r = D.get(id),
      files = F.list(id);
    if (
      folder !== "all" &&
      folder !== "" &&
      !r.folders.some((f) => f.id === folder)
    )
      folder = "all";
    root.innerHTML = `<header class="detail-shell-header"><div class="detail-heading"><div><h1>${esc(c.title)}</h1><p class="detail-reference">${esc(c.number || "Sin número de expediente")}<span>·</span>${esc(c.client || "Sin cliente asociado")}</p></div><div class="detail-heading-actions"><button type="button" id="editDetailCase" class="cases-secondary">Editar expediente</button></div></div></header>
  <section class="detail-shell" aria-label="Ficha del caso"><div class="detail-workspace"><aside class="detail-case-sidebar" aria-label="Navegación dentro del caso"><p>ESTE CASO</p><nav aria-label="Secciones del caso">${Object.entries(
    tabs,
  )
    .map(
      ([key, name]) =>
        `<a href="${href(key)}"${key === tab ? ' aria-current="page"' : ""}><span class="icon">${window.CejProIcon(sectionIcons[key])}</span><span>${name}</span>${key === "documentos" ? `<small>${files.length}</small>` : key === "agenda" ? `<small data-case-agenda-count>${window.CejProCaseAgenda.count(id)}</small>` : ""}</a>`,
    )
    .join(
      "",
    )}</nav></aside><div class="detail-section"><div id="detailContents"></div><p id="detailNotice" class="cases-notice" role="status" aria-live="polite"></p></div></div></section>
  <dialog id="detailFolderDialog" class="cases-dialog cases-folder-dialog" aria-labelledby="detailFolderTitle"><form id="detailFolderForm"><div class="cases-dialog-heading"><h2 id="detailFolderTitle">Nueva carpeta</h2><button type="button" data-close="detailFolderDialog" class="cases-icon-button" aria-label="Cerrar carpeta de documentos">×</button></div><div class="cases-form-body"><label>Nombre de la carpeta<input name="name" maxlength="40" required placeholder="Ej. Resoluciones"></label><p class="cases-form-note">Esta carpeta organizará documentos dentro de este caso.</p><p id="detailFolderError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" data-close="detailFolderDialog" class="cases-secondary">Cancelar</button><button type="submit" class="cases-primary">Crear carpeta</button></div></form></dialog>
  <dialog id="detailUploadDialog" class="cases-dialog" aria-labelledby="detailUploadTitle"><form id="detailUploadForm"><div class="cases-dialog-heading"><h2 id="detailUploadTitle">Agregar documentos</h2><button type="button" data-close="detailUploadDialog" class="cases-icon-button" aria-label="Cerrar documentos">×</button></div><div class="cases-form-body"><label>Carpeta dentro del caso<select id="detailUploadFolder">${folderOptions(r.folders, folder === "all" ? "" : folder)}</select></label><label class="detail-upload-zone" for="detailFileInput"><span class="icon">${window.CejProIcon("file")}</span><strong>Seleccionar archivos</strong><span>También puedes arrastrarlos aquí</span></label><input type="file" multiple id="detailFileInput" class="sr-only" aria-label="Seleccionar documentos del caso"><ul id="detailPendingFiles" class="files-pending"></ul></div><div class="cases-dialog-footer"><button type="button" data-close="detailUploadDialog" class="cases-secondary">Cancelar</button><button type="submit" id="detailSaveFiles" class="cases-primary" disabled>Agregar documentos</button></div></form></dialog>
  <dialog id="partyDialog" class="cases-dialog" aria-labelledby="partyDialogTitle"><form id="partyForm"><div class="cases-dialog-heading"><h2 id="partyDialogTitle">Agregar involucrado</h2><button type="button" data-close="partyDialog" class="cases-icon-button" aria-label="Cerrar involucrado">×</button></div><div class="cases-form-body"><label>Nombre o razón social<input name="name" maxlength="180" required placeholder="Nombre completo o empresa"></label><label>Rol en este caso<select name="role">${D.roles.map((role) => `<option>${role}</option>`).join("")}</select></label><label id="partyCustomRoleField" hidden>Especifica el rol<input name="customRole" maxlength="80" placeholder="Ej. Perito"></label><p id="partyError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" data-close="partyDialog" class="cases-secondary">Cancelar</button><button type="submit" class="cases-primary">Guardar involucrado</button></div></form></dialog>`;
    $("editDetailCase").onclick = () => services.editCase(id);
    root
      .querySelectorAll("[data-close]")
      .forEach((b) => (b.onclick = () => $(b.dataset.close).close()));
    if (tab === "resumen") renderSummary(c, r, files);
    if (tab === "documentos") renderDocuments(c, r, files);
    if (tab === "notas") renderNotes(c);
    if (tab === "agenda")
      window.CejProCaseAgenda.render($("detailContents"), c);
    bindDialogs(c);
    window.dispatchEvent(new Event("cejpro:case-render"));
  }
  function renderSummary(c, r, files) {
    $("detailContents").innerHTML =
      `<div class="detail-summary"><section class="detail-card"><div class="detail-card-heading"><h2>Información general</h2><button type="button" id="editSummary" class="detail-text-button">Editar</button></div><dl class="detail-info"><div><dt>Número de expediente</dt><dd>${esc(c.number || "Sin registrar")}</dd></div><div><dt>Cliente asociado</dt><dd>${esc(c.client || "Sin registrar")}</dd></div><div><dt>Identidad CEJ</dt><dd class="case-identity-summary"><span>${esc(c.identityId ? window.CejProIdentitiesData.label(window.CejProIdentitiesData.get(c.identityId)) : "Sin identidad asignada")}</span><button type="button" id="changeSummaryIdentity" class="detail-text-button">Cambiar</button></dd></div><div><dt>Carpeta del listado</dt><dd>${esc(services.folderName(c.folderId))}</dd></div></dl></section><div class="detail-summary-side"><section class="detail-card"><div class="detail-card-heading"><h2>Organización del caso</h2></div><a class="detail-summary-link" href="${href("documentos")}"><span>Documentos <small>${r.folders.length} ${r.folders.length === 1 ? "carpeta interna" : "carpetas internas"}</small></span><strong>${files.length} ↗</strong></a></section><section id="summaryParties" class="detail-card detail-summary-note"></section></div></div>`;
    $("editSummary").onclick = () => services.editCase(c.id);
    $("changeSummaryIdentity").onclick = () => services.editCase(c.id);
    renderParties(r, $("summaryParties"));
  }
  function renderDocuments(c, r, files) {
    const filtered = files.filter((f) => folder === "all" || f.documentFolderId === folder);
    const folderButton = (id, name, number) =>
      `<button type="button" class="detail-folder-chip${folder === id ? " is-active" : ""}" data-docfolder="${esc(id)}" aria-pressed="${folder === id}"><span class="icon">${window.CejProIcon("folder")}</span>${esc(name)}<span>${number}</span></button>`;
    $("detailContents").innerHTML = `<section class="detail-card detail-documents">
      <div class="detail-card-heading"><div><h2>Documentos del caso</h2><p>Reúne y organiza el material de este expediente.</p></div><div class="detail-toolbar-actions"><button id="detailNewFolder" class="cases-secondary" type="button">＋ Nueva carpeta</button><button id="detailUpload" class="cases-primary" type="button">↑ Agregar archivos</button></div></div>
      <nav class="detail-document-folders" aria-label="Carpetas de documentos">${folderButton("all", "Todos", files.length)}${folderButton("", "Sin carpeta", files.filter((f) => !f.documentFolderId).length)}${r.folders.map((f) => folderButton(f.id, f.name, files.filter((x) => x.documentFolderId === f.id).length)).join("")}</nav>
      <div class="detail-bulk-bar" id="documentBulkBar" hidden><span id="documentSelectedCount" role="status"></span><label>Carpeta<select id="documentDestination">${folderOptions(r.folders)}</select></label><button type="button" id="documentMove" class="cases-secondary">Mover</button><button type="button" id="documentCopy" class="cases-secondary">Copiar</button></div>
      ${filtered.length ? `<div class="detail-documents-table cases-table-wrap"><table class="cases-table"><caption class="sr-only">Documentos del expediente</caption><thead><tr><th class="col-check"><input type="checkbox" id="documentSelectAll" aria-label="Seleccionar todos los documentos"></th><th>Documento</th><th class="col-size">Tamaño</th><th class="col-date">Fecha</th><th class="col-actions">Acciones</th></tr></thead><tbody>${filtered.map((f) => `<tr><td class="col-check"><input type="checkbox" data-document-check="${esc(f.id)}" aria-label="Seleccionar ${esc(f.name)}"></td><td class="cases-title-cell"><strong class="detail-document-title"><span class="detail-document-icon icon">${window.CejProIcon("file")}</span>${esc(f.name)}</strong><small class="detail-document-folder">${esc(r.folders.find((x) => x.id === f.documentFolderId)?.name || "Sin carpeta")}</small></td><td>${size(f.size)}</td><td>${f.createdAt ? new Date(f.createdAt).toLocaleDateString("es-PE") : "—"}</td><td><div class="detail-toolbar-actions"><button type="button" class="detail-text-button" data-document-download="${esc(f.id)}"${F.available(f.id) ? "" : ' disabled title="Vuelve a seleccionar el archivo para descargarlo en esta vista local"'}>Descargar</button><button type="button" class="cases-icon-button" data-document-delete="${esc(f.id)}" aria-label="Eliminar ${esc(f.name)}">×</button></div></td></tr>`).join("")}</tbody></table></div>` : empty("folder", "", "Agrega archivos aquí o crea una carpeta para organizarlos.")}</section>`;
    $("detailNewFolder").onclick = () => {
      $("detailFolderForm").reset();
      $("detailFolderError").hidden = true;
      $("detailFolderDialog").showModal();
    };
    $("detailUpload").onclick = openUpload;
    root.querySelectorAll("[data-docfolder]").forEach((button) => {
      button.onclick = () => {
        folderSelections.set(caseId, button.dataset.docfolder);
        render(caseId, "documentos");
      };
    });
    const selection = () => [...root.querySelectorAll("[data-document-check]:checked")].map((box) => box.dataset.documentCheck);
    function syncSelection() {
      const count = selection().length;
      $("documentBulkBar").hidden = count === 0;
      $("documentSelectedCount").textContent = `${count} seleccionados`;
      const all = $("documentSelectAll");
      if (all) {
        all.checked = count === filtered.length;
        all.indeterminate = count > 0 && count < filtered.length;
      }
    }
    root.querySelectorAll("[data-document-check]").forEach((box) => { box.onchange = syncSelection; });
    if ($("documentSelectAll")) $("documentSelectAll").onchange = (event) => {
      root.querySelectorAll("[data-document-check]").forEach((box) => { box.checked = event.target.checked; });
      syncSelection();
    };
    function organize(copy) {
      const saved = F.organize(caseId, selection(), $("documentDestination").value, copy);
      render(caseId, "documentos");
      services.refreshList();
      flash(copy ? "Documentos copiados." : "Documentos movidos.", saved);
    }
    $("documentMove").onclick = () => organize(false);
    $("documentCopy").onclick = () => organize(true);
    root.querySelectorAll("[data-document-download]").forEach((button) => { button.onclick = () => F.download(button.dataset.documentDownload); });
    root.querySelectorAll("[data-document-delete]").forEach((button) => {
      button.onclick = () => {
        if (!confirm("¿Eliminar este documento del expediente?")) return;
        const saved = F.remove(caseId, button.dataset.documentDelete);
        render(caseId, "documentos");
        services.refreshList();
        flash("Documento eliminado.", saved);
      };
    });
  }
  function renderParties(r, target) {
    target.innerHTML = `<div><div class="detail-card-heading"><div><h2>Partes e involucrados <small class="detail-parties-count">${r.parties.length}</small></h2></div><button type="button" id="addParty" class="cases-secondary detail-add-party">＋ Agregar involucrado</button></div>${r.parties.length ? `<div class="detail-party-list">${r.parties.map((p) => `<article class="detail-party"><span class="detail-party-avatar">${esc(p.name.slice(0, 1).toLocaleUpperCase())}</span><div><strong>${esc(p.name)}</strong><span>${esc(p.role)}</span></div><button type="button" data-edit-party="${esc(p.id)}" class="detail-text-button">Editar</button></article>`).join("")}</div>` : '<p class="detail-parties-empty">Aún no has agregado partes a este caso.</p>'}</div>`;
    $("addParty").onclick = () => openParty();
    root
      .querySelectorAll("[data-edit-party]")
      .forEach((b) => (b.onclick = () => openParty(b.dataset.editParty)));
  }
  function renderNotes(c) {
    $("detailContents").innerHTML =
      `<section class="detail-card"><div class="detail-card-heading"><div><h2>Notas del caso</h2><p>Apuntes internos para tu trabajo. No modifican el expediente judicial.</p></div></div><form id="detailNoteForm" class="detail-notes-form"><label for="detailNote">Tu nota de trabajo</label><textarea id="detailNote" maxlength="2000" rows="9" placeholder="Escribe los detalles que necesitas recordar…">${esc(c.note || "")}</textarea><div><span>Hasta 2000 caracteres</span><button type="submit" class="cases-primary">Guardar nota</button></div></form></section>`;
    $("detailNoteForm").onsubmit = (e) => {
      e.preventDefault();
      const saved = services.updateNote(caseId, $("detailNote").value.trim());
      flash("Nota actualizada.", saved);
    };
  }
  function syncPartyRole() {
    const form = $("partyForm"),
      custom = form.elements.namedItem("customRole"),
      isOther = form.elements.namedItem("role").value === "Otro";
    $("partyCustomRoleField").hidden = !isOther;
    custom.required = isOther;
    custom.disabled = !isOther;
  }
  function openParty(id) {
    const p = D.get(caseId).parties.find((p) => p.id === id),
      form = $("partyForm");
    form.reset();
    form.dataset.editing = p?.id || "";
    $("partyError").hidden = true;
    $("partyDialogTitle").textContent = p
      ? "Editar involucrado"
      : "Agregar involucrado";
    form.elements.namedItem("name").value = p?.name || "";
    form.elements.namedItem("role").value = p
      ? D.roles.includes(p.role)
        ? p.role
        : "Otro"
      : D.roles[0];
    form.elements.namedItem("customRole").value =
      p && !D.roles.includes(p.role) ? p.role : "";
    syncPartyRole();
    $("partyDialog").showModal();
  }
  function openUpload() {
    pending = [];
    $("detailUploadForm").reset();
    $("detailUploadFolder").value = folder === "all" ? "" : folder;
    showPending();
    $("detailUploadDialog").showModal();
  }
  function addPending(incoming) {
    for (const f of incoming)
      if (
        !pending.some(
          (p) =>
            p.name === f.name &&
            p.size === f.size &&
            p.lastModified === f.lastModified,
        )
      )
        pending.push(f);
    showPending();
  }
  function showPending() {
    $("detailPendingFiles").innerHTML = pending
      .map(
        (f, i) =>
          `<li><span><strong>${esc(f.name)}</strong><small>${size(f.size)}</small></span><button type="button" class="cases-icon-button" data-remove-file="${i}" aria-label="Quitar ${esc(f.name)}">×</button></li>`,
      )
      .join("");
    $("detailSaveFiles").disabled = !pending.length;
    root.querySelectorAll("[data-remove-file]").forEach(
      (b) =>
        (b.onclick = () => {
          pending.splice(Number(b.dataset.removeFile), 1);
          showPending();
        }),
    );
  }
  function bindDialogs(c) {
    $("detailFolderForm").onsubmit = (e) => {
      e.preventDefault();
      const result = D.addFolder(
        caseId,
        String(new FormData(e.target).get("name")),
      );
      if (!result.ok) {
        $("detailFolderError").hidden = false;
        $("detailFolderError").textContent = result.error;
        return;
      }
      $("detailFolderDialog").close();
      folderSelections.set(caseId, result.folder.id);
      render(caseId, "documentos");
      flash("Carpeta creada dentro del caso.", result.saved);
    };
    $("partyForm").elements.namedItem("role").onchange = syncPartyRole;
    $("partyForm").onsubmit = (e) => {
      e.preventDefault();
      const form = e.target,
        data = new FormData(form),
        previous = D.get(caseId).parties.find(
          (p) => p.id === form.dataset.editing,
        ),
        p = {
          id: form.dataset.editing || "party-" + crypto.randomUUID(),
          name: String(data.get("name")).trim(),
          role:
            data.get("role") === "Otro"
              ? String(data.get("customRole") || "").trim()
              : data.get("role"),
          document: previous?.document || "",
          contact: previous?.contact || "",
        },
        result = D.saveParty(caseId, p);
      if (!result.ok) {
        $("partyError").hidden = false;
        $("partyError").textContent = result.error;
        return;
      }
      $("partyDialog").close();
      render(caseId, "resumen");
      flash("Involucrado guardado.", result.saved);
    };
    $("detailFileInput").onchange = (e) => addPending([...e.target.files]);
    const zone = root.querySelector(".detail-upload-zone");
    zone.ondragover = (e) => {
      e.preventDefault();
      zone.classList.add("is-dragging");
    };
    zone.ondragleave = () => zone.classList.remove("is-dragging");
    zone.ondrop = (e) => {
      e.preventDefault();
      zone.classList.remove("is-dragging");
      addPending([...e.dataTransfer.files]);
    };
    $("detailUploadForm").onsubmit = (e) => {
      e.preventDefault();
      if (!pending.length) return;
      const folderId = $("detailUploadFolder").value,
        saved = F.add(caseId, c.folderId, pending, folderId);
      pending = [];
      $("detailUploadDialog").close();
      folderSelections.set(caseId, folderId);
      render(caseId, "documentos");
      services.refreshList();
      flash("Referencias de documentos agregadas.", saved);
    };
  }
  window.CejProCaseDetail = { mount, render };
})();
