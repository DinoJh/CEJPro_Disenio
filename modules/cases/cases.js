(() => {
  const D = window.CejProCasesData;
  const F = window.CejProCaseFiles;
  const esc = (value) =>
    String(value ?? "").replace(
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
  const uid = (prefix) =>
    prefix +
    "-" +
    (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36));
  let state = D.load(),
    host,
    folder = "all",
    clientFilter = "all",
    identityFilter = "all",
    search = "",
    page = 1;
  const pageSize = 6;
  let afterCaseSaved = null;
  const $ = (id) => host.querySelector("#" + id) || document.getElementById(id);
  const folderName = (id) =>
    state.folders.find((f) => f.id === id)?.name || "Sin carpeta";
  function folderOptions(value) {
    return (
      `<option value="">Sin carpeta</option>` +
      state.folders
        .map(
          (f) =>
            `<option value="${esc(f.id)}"${value === f.id ? " selected" : ""}>${esc(f.name)}</option>`,
        )
        .join("")
    );
  }
  function folderButton(id, name, count, icon) {
    return `<button type="button" data-folder="${esc(id)}" class="cases-folder${folder === id ? " is-active" : ""}" aria-pressed="${folder === id}"><span class="icon">${window.CejProIcon(icon)}</span><span class="cases-folder-name">${esc(name)}</span><span class="cases-folder-count">${count}</span></button>`;
  }
  function mount(element) {
    if (host) return;
    host = element;
    host.innerHTML = `<div id="caseListScreen" class="cases-list-shell"><div class="cases-top"><button type="button" id="newCase" class="cases-primary"><span aria-hidden="true">＋</span> Nuevo expediente</button></div>
 <div class="cases-layout"><aside class="cases-folders" aria-label="Carpetas de casos"><div class="cases-folder-heading"><h2>Carpetas</h2></div><button type="button" id="newFolder" class="cases-new-folder"><span aria-hidden="true">＋</span> Nueva carpeta</button><nav id="caseFolderNav" aria-label="Filtrar casos por carpeta"></nav></aside>
 <section class="cases-panel" aria-labelledby="caseListTitle"><div class="cases-panel-heading"><div><h2 id="caseListTitle">Todos los expedientes</h2></div><span id="caseListCount" class="cases-result-count" role="status" aria-live="polite"></span></div>
 <div class="cases-toolbar"><label class="cases-search"><span class="cases-search-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></span><input type="search" id="caseSearch" aria-label="Buscar casos" placeholder="Buscar caso, expediente o cliente…" maxlength="180"></label><label class="cases-status-filter"><span class="sr-only">Cliente</span><select id="caseClientFilter"><option value="all">Todos los clientes</option></select></label><label class="cases-status-filter"><span class="sr-only">Identidad CEJ</span><select id="caseIdentityFilter"><option value="all">Todas las identidades</option></select></label></div>
 <div class="cases-table-wrap" id="caseTableWrap"><table class="cases-table"><caption class="sr-only">Listado de casos registrados manualmente</caption><thead><tr><th scope="col">Expediente</th><th scope="col">Cliente</th><th scope="col">Carpeta</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody id="caseRows"></tbody></table></div>
 <div id="casesEmpty" class="cases-empty" hidden><span class="cases-empty-icon icon">${window.CejProIcon("folder")}</span><p id="casesEmptyTitle">No hay resultados</p></div>
 <div class="cases-pagination" id="casePagination"><span id="casePageSummary"></span><div><button type="button" id="casesPrev" aria-label="Página anterior">‹</button><span id="casePageLabel"></span><button type="button" id="casesNext" aria-label="Página siguiente">›</button></div></div></section></div>
 <p class="cases-notice" id="casesNotice" role="status" aria-live="polite"></p>
 </div><section id="caseDetailScreen" hidden aria-label="Ficha del caso"></section>
 <dialog id="caseDialog" class="cases-dialog" aria-labelledby="caseDialogTitle"><form id="caseForm"><div class="cases-dialog-heading"><h2 id="caseDialogTitle">Nuevo expediente</h2><button type="button" class="cases-icon-button" id="closeCaseDialog" aria-label="Cerrar expediente">×</button></div><div class="cases-form-body"><label>Título del expediente<input name="title" maxlength="120" placeholder="Ej. Beneficios sociales"></label><label>Número de expediente<input name="number" required maxlength="180" placeholder="Ej. 00705-2025-0-2101-JR-CI-02"></label><div class="case-identity-field"><label>Identidad CEJ<select name="identityId" id="caseIdentitySelect"></select></label><button type="button" class="detail-text-button" id="caseNewIdentity">＋ Nueva identidad</button></div><label>Carpeta<select name="folderId"></select></label><details class="cases-additional-fields" id="caseAdditionalFields"><summary>Adicionales<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></summary><div class="cases-additional-body"><label>Cliente<input name="client" maxlength="180" placeholder="Nombre del cliente"></label></div></details><label id="caseNoteField" class="cases-note-field" hidden>Nota<textarea name="note" rows="4" maxlength="2000" placeholder="Anota lo que necesitas recordar sobre este expediente…" disabled></textarea></label></div><div class="cases-dialog-footer"><button type="button" class="cases-secondary" id="cancelCase">Cancelar</button><button type="submit" class="cases-primary">Guardar expediente</button></div></form></dialog>
 <dialog id="folderDialog" class="cases-dialog cases-folder-dialog" aria-labelledby="folderDialogTitle"><form id="folderForm"><div class="cases-dialog-heading"><div><p class="cases-overline">ORGANIZAR</p><h2 id="folderDialogTitle">Nueva carpeta</h2></div><button type="button" class="cases-icon-button" id="closeFolderDialog" aria-label="Cerrar carpeta">×</button></div><div class="cases-form-body"><label>Nombre de la carpeta<input name="name" required maxlength="40" placeholder="Ej. Casos de mi estudio"></label><p id="folderError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" id="cancelFolder" class="cases-secondary">Cancelar</button><button type="submit" class="cases-primary">Crear carpeta</button></div></form></dialog>`;
    window.CejProCaseDetail.mount($("caseDetailScreen"), {
      getCase: (id) => state.cases.find((c) => c.id === id),
      folderName,
      editCase: openCase,
      refreshList: render,
      updateNote: (id, note) => {
        const c = state.cases.find((c) => c.id === id);
        if (!c) return false;
        c.note = note;
        const saved = D.save(state);
        render();
        return saved;
      },
    });
    $("caseIdentitySelect").onchange = () => {
      $("caseIdentitySelect").setCustomValidity("");
    };
    $("caseNewIdentity").onclick = () =>
      window.CejProIdentities.openEditor("", (identity) => {
        populateIdentities(identity.id);
      });
    window.addEventListener("cejpro:identities-change", () => {
      if (host) {
        populateIdentities($("caseIdentitySelect").value);
        render();
      }
    });
    $("newCase").onclick = () => openCase();
    $("newFolder").onclick = openFolder;
    $("caseSearch").addEventListener("input", (e) => {
      search = e.target.value;
      page = 1;
      render();
    });
    $("caseClientFilter").onchange = (e) => {
      clientFilter = e.target.value;
      page = 1;
      render();
    };
    $("caseIdentityFilter").onchange = (e) => {
      identityFilter = e.target.value;
      page = 1;
      render();
    };
    $("caseFolderNav").addEventListener("click", (e) => {
      const b = e.target.closest("[data-folder]");
      if (b) {
        folder = b.dataset.folder;
        page = 1;
        render();
      }
    });
    $("caseRows").addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit-case]");
      if (edit) {
        openCase(edit.dataset.editCase);
        return;
      }
      if (
        e.target.closest("a,button,input,select,textarea,label") ||
        e.button !== 0 ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      if (window.getSelection()?.toString()) return;
      const row = e.target.closest("[data-open-case]");
      if (row)
        location.hash =
          "expedientes/" +
          encodeURIComponent(row.dataset.openCase) +
          "/documentos";
    });
    $("casesPrev").onclick = () => {
      page--;
      render();
    };
    $("casesNext").onclick = () => {
      page++;
      render();
    };
    for (const [button, dialog] of [
      ["closeCaseDialog", "caseDialog"],
      ["cancelCase", "caseDialog"],
      ["closeFolderDialog", "folderDialog"],
      ["cancelFolder", "folderDialog"],
    ])
      $(button).onclick = () => $(dialog).close();
    $("caseDialog").addEventListener("close", () => {
      afterCaseSaved = null;
    });
    $("caseForm").addEventListener("submit", saveCase);
    $("folderForm").addEventListener("submit", saveFolder);
    $("folderForm")
      .elements.namedItem("name")
      .addEventListener("input", () => {
        $("folderError").hidden = true;
      });
    render();
  }
  function render() {
    populateIdentityFilter();
    const list = D.query(state, { folder, search })
        .filter(
          (c) =>
            clientFilter === "all" ||
            (c.client?.trim() ? "client:" + D.normalize(c.client) : "none") ===
              clientFilter,
        )
        .filter(
          (c) =>
            identityFilter === "all" ||
            (c.identityId ? "identity:" + c.identityId : "none") ===
              identityFilter,
        ),
      pages = Math.max(1, Math.ceil(list.length / pageSize));
    page = Math.max(1, Math.min(page, pages));
    const names = new Map();
    state.cases.forEach((c) => {
      if (c.client?.trim())
        names.set("client:" + D.normalize(c.client), c.client.trim());
    });
    $("caseClientFilter").innerHTML =
      '<option value="all">Todos los clientes</option><option value="none">Sin cliente asociado</option>' +
      [...names]
        .sort((a, b) => a[1].localeCompare(b[1], "es"))
        .map(
          ([value, label]) =>
            `<option value="${esc(value)}">${esc(label)}</option>`,
        )
        .join("");
    $("caseClientFilter").value = clientFilter;
    const current = list.slice((page - 1) * pageSize, page * pageSize);
    const countFor = (id) =>
      state.cases.filter(
        (c) => id === "all" || c.folderId === (id === "unfiled" ? "" : id),
      ).length;
    $("caseFolderNav").innerHTML =
      folderButton("all", "Todos los expedientes", countFor("all"), "layers") +
      folderButton("unfiled", "Sin carpeta", countFor("unfiled"), "file") +
      '<div class="cases-folder-divider"></div>' +
      state.folders
        .map((f) => folderButton(f.id, f.name, countFor(f.id), "folder"))
        .join("");
    $("caseListTitle").textContent =
      folder === "all"
        ? "Todos los expedientes"
        : folder === "unfiled"
          ? "Sin carpeta"
          : folderName(folder);
    $("caseListCount").textContent =
      `${list.length} ${list.length === 1 ? "caso" : "casos"}`;
    $("caseRows").innerHTML = current
      .map(
        (c) =>
          `<tr data-open-case="${esc(c.id)}"><td data-label="Expediente" class="cases-title-cell"><strong><a class="cases-open-link" href="#expedientes/${encodeURIComponent(c.id)}/documentos">${esc(c.title)}</a></strong><span>${esc(c.number || "Sin número de expediente")}</span>${c.note ? `<div class="cases-note-preview"><p>${esc(c.note)}</p><a href="#expedientes/${encodeURIComponent(c.id)}/notas" class="cases-read-note" aria-label="Ver nota de ${esc(c.title)}">Ver nota</a></div>` : ""}${F.count(c.id) ? `<a href="#expedientes/${encodeURIComponent(c.id)}/documentos" class="cases-read-note cases-file-count">${F.count(c.id)} ${F.count(c.id) === 1 ? "archivo" : "archivos"}</a>` : ""}</td><td data-label="Cliente">${esc(c.client || "Sin cliente asociado")}</td><td data-label="Carpeta"><span class="cases-folder-tag">${esc(folderName(c.folderId))}</span></td><td class="cases-actions"><div class="cases-row-actions"><a class="cases-open-action" href="#expedientes/${encodeURIComponent(c.id)}/documentos" aria-label="Abrir ficha de ${esc(c.title)}">Abrir <span aria-hidden="true">↗</span></a><button type="button" class="cases-row-action" data-edit-case="${esc(c.id)}" aria-label="Editar o mover ${esc(c.title)}" title="Editar o mover caso">⋯</button></div></td></tr>`,
      )
      .join("");
    $("caseTableWrap").hidden = !list.length;
    $("casesEmpty").hidden = !!list.length;
    const filtered =
      !!search.trim() || clientFilter !== "all" || identityFilter !== "all";
    $("casesEmptyTitle").textContent = filtered
      ? "No encontramos coincidencias"
      : "No hay expedientes en esta carpeta.";
    window.CejProTableFilters.mount(
      host.querySelector(".cases-toolbar"),
      "cases",
    );
    $("casePageSummary").textContent = list.length
      ? `Mostrando ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, list.length)} de ${list.length}`
      : "";
    $("casePageLabel").textContent = `${page} / ${pages}`;
    $("casesPrev").disabled = page <= 1;
    $("casesNext").disabled = page >= pages;
  }
  function populateIdentityFilter() {
    const identities = window.CejProIdentitiesData.load(),
      options = identities.map((x) => ({
        value: "identity:" + x.id,
        label: window.CejProIdentitiesData.label(x),
      }));
    for (const c of state.cases)
      if (
        c.identityId &&
        !options.some((x) => x.value === "identity:" + c.identityId)
      )
        options.push({
          value: "identity:" + c.identityId,
          label: "Identidad no disponible",
        });
    if (
      identityFilter !== "all" &&
      identityFilter !== "none" &&
      !options.some((x) => x.value === identityFilter)
    )
      identityFilter = "all";
    $("caseIdentityFilter").innerHTML =
      '<option value="all">Todas las identidades</option><option value="none">Sin identidad asignada</option>' +
      options
        .sort((a, b) => a.label.localeCompare(b.label, "es"))
        .map((x) => `<option value="${esc(x.value)}">${esc(x.label)}</option>`)
        .join("");
    $("caseIdentityFilter").value = identityFilter;
  }
  function populateIdentities(selected = "") {
    const identities = window.CejProIdentitiesData.load(),
      select = $("caseIdentitySelect");
    select.innerHTML =
      '<option value="">Sin identidad asignada</option>' +
      identities
        .map(
          (x) =>
            `<option value="${esc(x.id)}">${esc(window.CejProIdentitiesData.label(x))}</option>`,
        )
        .join("");
    if (selected && !identities.some((x) => x.id === selected))
      select.insertAdjacentHTML(
        "beforeend",
        `<option value="${esc(selected)}">Identidad no disponible</option>`,
      );
    select.value = selected;
  }
  function openCase(id, onSaved = null) {
    if (!window.CejProWorkspaces.canEdit()) return;
    afterCaseSaved = onSaved;
    const form = $("caseForm"),
      c = state.cases.find((c) => c.id === id);
    form.reset();
    $("caseFormSaveError")?.remove();
    $("caseAdditionalFields").open = false;
    form.dataset.editing = c?.id || "";
    $("caseDialogTitle").textContent = c
      ? "Editar expediente"
      : "Nuevo expediente";
    const values = c || {
      title: "",
      number: "",
      client: "",
      status: "active",
      folderId: state.folders.some((f) => f.id === folder) ? folder : "",
      note: "",
    };
    form.elements.namedItem("folderId").innerHTML = folderOptions(
      values.folderId,
    );
    for (const key of ["title", "number", "client", "folderId"])
      form.elements.namedItem(key).value = values[key];
    $("caseNoteField").hidden = !c;
    form.elements.namedItem("note").disabled = !c;
    form.elements.namedItem("note").value = values.note || "";
    form.elements.namedItem("number").setCustomValidity("");
    populateIdentities(c?.identityId || "");
    $("caseIdentitySelect").setCustomValidity("");
    form.elements.namedItem("title").setCustomValidity("");
    $("caseDialog").showModal();
  }
  function notify(message) {
    const saved = D.save(state);
    $("casesNotice").textContent =
      message +
      (saved
        ? " Guardado en este navegador."
        : " No se pudo guardar: los cambios durarán solo durante esta visita.");
    return saved;
  }
  function saveCase(e) {
    e.preventDefault();
    const form = $("caseForm"),
      data = new FormData(form),
      title = String(data.get("title")).trim();
    const number = String(data.get("number") || "").trim();
    if (!number) {
      const input = form.elements.namedItem("number");
      input.setCustomValidity("Escribe el número de expediente.");
      input.reportValidity();
      input.addEventListener("input", () => input.setCustomValidity(""), {
        once: true,
      });
      return;
    }
    const previous = state.cases.find(
      (item) => item.id === form.dataset.editing,
    );
    const c = {
      id: form.dataset.editing || uid("case"),
      title: title || number,
      number,
      client: String(data.get("client")).trim(),
      status: previous?.status || "active",
      folderId: data.get("folderId"),
      note: String(data.get("note") || "").trim(),
      identityId: String(data.get("identityId") || ""),
    };
    if (c.identityId && !window.CejProIdentitiesData.get(c.identityId)) {
      form.elements
        .namedItem("identityId")
        .setCustomValidity("Selecciona una identidad disponible.");
      form.elements.namedItem("identityId").reportValidity();
      return;
    }
    form.elements.namedItem("identityId").setCustomValidity("");
    const index = state.cases.findIndex((item) => item.id === c.id);
    if (index >= 0) state.cases[index] = c;
    else state.cases.unshift(c);
    folder = c.folderId || "unfiled";
    clientFilter = "all";
    identityFilter = "all";
    search = "";
    page = 1;
    $("caseSearch").value = "";
    const filesSaved = F.commit(c.id, c.folderId);
    const saved = notify(index >= 0 ? "Caso actualizado." : "Caso creado.");
    if (afterCaseSaved && !saved) {
      let error = $("caseFormSaveError");
      if (!error) {
        error = document.createElement("p");
        error.id = "caseFormSaveError";
        error.className = "cases-form-error";
        error.setAttribute("role", "alert");
        $("caseForm").querySelector(".cases-form-body").append(error);
      }
      error.textContent =
        "No se pudo guardar el expediente. Inténtalo de nuevo.";
      return;
    }
    if (!filesSaved)
      $("casesNotice").textContent +=
        " No se pudieron guardar las referencias de los archivos; estarán disponibles durante esta visita.";
    const done = afterCaseSaved;
    afterCaseSaved = null;
    $("caseDialog").close();
    render();
    if (done) done(c);
    else showRoute(location.hash.slice(1));
  }
  function openFolder() {
    $("folderForm").reset();
    $("folderError").hidden = true;
    $("folderDialog").showModal();
  }
  function saveFolder(e) {
    e.preventDefault();
    const name = String(new FormData($("folderForm")).get("name")).trim();
    if (
      !name ||
      state.folders.some((f) => D.normalize(f.name) === D.normalize(name))
    ) {
      $("folderError").textContent = !name
        ? "Escribe un nombre para la carpeta."
        : "Ya existe una carpeta con ese nombre.";
      $("folderError").hidden = false;
      return;
    }
    const f = { id: uid("folder"), name };
    state.folders.push(f);
    folder = f.id;
    search = "";
    clientFilter = "all";
    identityFilter = "all";
    page = 1;
    $("caseSearch").value = "";
    notify("Carpeta creada.");
    $("folderDialog").close();
    render();
  }
  function showRoute(route = "expedientes") {
    const parts = route.split("/");
    if (parts[1] === "carpetas") {
      let requested = "";
      try {
        requested = decodeURIComponent(parts[2] || "");
      } catch (_) {}
      folder = state.folders.some((f) => f.id === requested)
        ? requested
        : "all";
      clientFilter = "all";
      identityFilter = "all";
      search = "";
      page = 1;
      $("caseSearch").value = "";
      $("caseListScreen").hidden = false;
      $("caseDetailScreen").hidden = true;
      render();
      return;
    }
    let id = "";
    try {
      id = parts[1] ? decodeURIComponent(parts[1]) : "";
    } catch (_) {
      id = "invalid";
    }
    $("caseListScreen").hidden = !!id;
    $("caseDetailScreen").hidden = !id;
    if (id) window.CejProCaseDetail.render(id, parts[2] || "documentos");
  }
  function createForClient(clientName, onSaved) {
    if (!window.CejProWorkspaces.canEdit()) return;
    mount(document.getElementById("casesModule"));
    const dialog = $("caseDialog");
    document.body.append(dialog);
    dialog.addEventListener("close", () => host.append(dialog), { once: true });
    openCase(undefined, onSaved);
    $("caseForm").elements.namedItem("client").value = clientName;
  }
  window.CejProCases = { mount, showRoute, createForClient };
})();
