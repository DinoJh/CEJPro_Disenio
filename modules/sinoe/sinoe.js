(() => {
  const D = window.CejProSinoeData,
    F = window.CejProSinoeFiles,
    N = window.CejProCasesData.normalize;
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
  const demoDocuments = {
    "sinoe-demo-audiencia-resolucion":
      "assets/documents/sinoe-demo/audiencia-resolucion.pdf",
    "sinoe-demo-audiencia-anexo":
      "assets/documents/sinoe-demo/audiencia-anexo.pdf",
    "sinoe-demo-traslado-resolucion":
      "assets/documents/sinoe-demo/traslado-resolucion.pdf",
  };
  let host,
    items = D.load(),
    folders = D.loadFolders(),
    selected = "",
    folder = "all",
    folderSearch = "",
    filter = "all",
    organFilter = "all",
    monthFilter = "all",
    yearFilter = "all",
    search = "",
    page = 1,
    linked = !!D.linkedAccount(),
    checkedRows = new Set();
  const belongsTo = (n, id) => n.folderId === id || (n.copiedFolderIds || []).includes(id);
  const size = 8,
    $ = (id) => host.querySelector("#" + id),
    cases = () => window.CejProCasesData.load().cases,
    day = (v) => v.split("-").reverse().join("/");
  function restoreView() {
    const view = D.loadView();
    folder = view.folder;
    filter = view.filter;
    organFilter = view.organFilter || "all";
    monthFilter = view.monthFilter || "all";
    yearFilter = view.yearFilter || "all";
    search = view.search;
    page = view.page;
  }
  if (linked) restoreView();
  const folderName = (id) =>
    folders.find((f) => f.id === id)?.name || "Sin carpeta";
  function folderOptions(id) {
    return (
      '<option value="">Sin carpeta</option>' +
      folders
        .map(
          (f) =>
            `<option value="${esc(f.id)}"${id === f.id ? " selected" : ""}>${esc(f.name)}</option>`,
        )
        .join("")
    );
  }
  function mount(el) {
    if (host) return;
    host = el;
    host.innerHTML = `<div id="sinoeScreen"></div><p id="sinoeNotice" class="cases-notice" role="status" aria-live="polite"></p>
 <dialog id="sinoeFolderDialog" class="cases-dialog cases-folder-dialog" aria-labelledby="sinoeFolderTitle"><form id="sinoeFolderForm"><div class="cases-dialog-heading"><h2 id="sinoeFolderTitle">Nueva carpeta</h2><button type="button" class="cases-icon-button" data-sinoe-close="sinoeFolderDialog" aria-label="Cerrar">×</button></div><div class="cases-form-body"><label>Nombre de la carpeta<input name="name" required maxlength="40" placeholder="Ej. Audiencias o por revisar"></label><p id="sinoeFolderError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" id="deleteSinoeFolder" class="detail-text-button" hidden>Eliminar carpeta</button><button type="button" class="cases-secondary" data-sinoe-close="sinoeFolderDialog">Cancelar</button><button type="submit" id="saveSinoeFolder" class="cases-primary">Crear carpeta</button></div></form></dialog>`;
    host
      .querySelectorAll("[data-sinoe-close]")
      .forEach((b) => (b.onclick = () => $(b.dataset.sinoeClose).close()));
    $("sinoeFolderForm").onsubmit = (e) => {
      e.preventDefault();
      const form = e.target,
        id = form.dataset.editing || "",
        name = String(new FormData(form).get("name")).trim();
      if (!name || folders.some((f) => f.id !== id && N(f.name) === N(name))) {
        $("sinoeFolderError").hidden = false;
        $("sinoeFolderError").textContent = name
          ? "Ya existe una carpeta con ese nombre."
          : "Escribe un nombre para la carpeta.";
        return;
      }
      let f = folders.find((f) => f.id === id);
      if (f) f.name = name;
      else {
        f = { id: "sinoe-folder-" + crypto.randomUUID(), name };
        folders.push(f);
      }
      const saved = D.saveFolders(folders);
      folder = f.id;
      page = 1;
      $("sinoeFolderDialog").close();
      render();
      notice(id ? "Carpeta actualizada." : "Carpeta creada.", saved);
    };
    $("deleteSinoeFolder").onclick = () => {
      const id = $("sinoeFolderForm").dataset.editing,
        f = folders.find((f) => f.id === id);
      if (!f) return;
      const count = items.filter((n) => belongsTo(n, id)).length;
      if (
        !window.confirm(
          `¿Eliminar la carpeta «${f.name}»?${count ? " Sus notificaciones pasarán a Sin carpeta." : ""}`,
        )
      )
        return;
      items.forEach((n) => {
        n.copiedFolderIds = (n.copiedFolderIds || []).filter((folderId) => folderId !== id);
        if (n.folderId === id) {
          n.folderId = "";
          n.folderMode = "manual";
        }
      });
      folders = folders.filter((f) => f.id !== id);
      const savedItems = D.save(items),
        savedFolders = D.saveFolders(folders);
      folder = "all";
      page = 1;
      $("sinoeFolderDialog").close();
      render();
      notice("Carpeta eliminada.", savedItems && savedFolders);
    };
  }

  function notice(text, saved = true) {
    $("sinoeNotice").textContent =
      text +
      (saved
        ? ""
        : " No se pudo guardar; el cambio durará durante esta visita.");
  }
  function showRoute(route) {
    $("sinoeAnnexDialog")?.remove();
    try {
      selected = decodeURIComponent(route.split("/")[1] || "");
    } catch (_) {
      selected = "invalid";
    }
    render();
  }
  function render() {
    if (!host) return;
    $("sinoeNotice").textContent = "";
    $("sinoeAnnexDialog")?.remove();
    if (!linked) connect();
    else {
      items = D.seedExamples(items);
      ({ items, folders } = D.organizeByCase(items, folders));
      if (selected) {
        const n = items.find((n) => n.id === selected);
        if (n) detail(n);
        else
          $("sinoeScreen").innerHTML =
            '<a href="#sinoe" class="detail-back">← Notificaciones</a><div class="clients-empty"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h18v16H3Z M3 13h5l2 3h4l2-3h5"/></svg></span><p>No encontramos esta notificación</p></div>';
      } else list();
    }
    window.dispatchEvent(new Event("cejpro:sinoe-render"));
  }
  function connect() {
    $("sinoeScreen").innerHTML =
      `<section class="sinoe-panel sinoe-connect" aria-labelledby="sinoeConnectTitle"><div class="sinoe-connect-intro"><span class="sinoe-connect-icon icon">${window.CejProIcon("inbox")}</span><h2 id="sinoeConnectTitle">Conecta tu casilla SINOE</h2><p>Reúne las notificaciones de tus expedientes y organízalas desde CEJ PRO.</p><a href="https://casillas.pj.gob.pe/sinoe/login.xhtml" target="_blank" rel="noopener noreferrer" class="detail-text-button">Abrir portal SINOE ↗</a></div><form id="sinoeConnectForm" class="sinoe-connect-form"><label>Usuario de SINOE<input name="sinoeUser" required maxlength="180" autocomplete="off" placeholder="Tu usuario o número de casilla"></label><label>Contraseña<span class="sinoe-password"><input id="sinoePassword" name="sinoePassword" required type="password" autocomplete="off"><button type="button" id="toggleSinoePassword" aria-label="Mostrar contraseña" title="Mostrar contraseña" aria-controls="sinoePassword" aria-pressed="false"><span class="icon" aria-hidden="true">${window.CejProIcon("eye")}</span></button></span></label><p id="sinoeConnectError" class="cases-form-error" role="status" hidden></p><button type="submit" class="cases-primary">Conectar SINOE</button></form></section>`;
    $("toggleSinoePassword").onclick = () => {
      const input = $("sinoePassword"),
        visible = input.type === "password";
      input.type = visible ? "text" : "password";
      $("toggleSinoePassword").innerHTML =
        '<span class="icon" aria-hidden="true">' +
        window.CejProIcon(visible ? "eyeOff" : "eye") +
        "</span>";
      $("toggleSinoePassword").title = visible
        ? "Ocultar contraseña"
        : "Mostrar contraseña";
      $("toggleSinoePassword").setAttribute(
        "aria-label",
        visible ? "Ocultar contraseña" : "Mostrar contraseña",
      );
      $("toggleSinoePassword").setAttribute("aria-pressed", String(visible));
    };
    $("sinoeConnectForm").onsubmit = (e) => {
      e.preventDefault();
      const form = e.target,
        user = form.elements.namedItem("sinoeUser").value.trim();
      if (!user) {
        $("sinoeConnectError").hidden = false;
        $("sinoeConnectError").textContent = "Ingresa tu usuario de SINOE.";
        return;
      }
      if (!form.elements.namedItem("sinoePassword").value) {
        $("sinoeConnectError").hidden = false;
        $("sinoeConnectError").textContent = "Ingresa tu contraseña.";
        return;
      }
      // Solo interacción de maqueta: la contraseña se descarta sin almacenarla ni transmitirla.
      form.reset();
      D.link(user);
      linked = true;
      items = D.load();
      folders = D.loadFolders();
      restoreView();
      selected = "";
      if (location.hash !== "#sinoe") location.hash = "#sinoe";
      else render();
    };
  }
  function disconnect() {
    D.unlink();
    linked = false;
    items = [];
    folders = [];
    folder = "all";
    folderSearch = "";
    filter = "all";
    organFilter = "all";
    monthFilter = "all";
    yearFilter = "all";
    search = "";
    page = 1;
    selected = "";
    if (location.hash !== "#sinoe") location.hash = "#sinoe";
    else render();
  }

  function toggle(id) {
    const n = items.find((n) => n.id === id);
    if (!n) return;
    n.read = !n.read;
    const saved = D.save(items);
    render();
    if (!saved) notice("Estado actualizado.", false);
  }
  function folderButton(id, label, count) {
    return `<button class="sinoe-folder${folder === id ? " is-active" : ""}" type="button" data-notification-folder="${esc(id)}" aria-pressed="${folder === id}"><span>${esc(label)}</span><small>${count}</small></button>`;
  }
  function newFolder(id) {
    const f = typeof id === "string" ? folders.find((f) => f.id === id) : null,
      form = $("sinoeFolderForm");
    form.reset();
    form.dataset.editing = f?.id || "";
    form.elements.namedItem("name").value = f?.name || "";
    form.elements.namedItem("name").maxLength = f?.autoCaseKey ? 180 : 40;
    $("sinoeFolderTitle").textContent = f ? "Editar carpeta" : "Nueva carpeta";
    $("saveSinoeFolder").textContent = f ? "Guardar cambios" : "Crear carpeta";
    $("deleteSinoeFolder").hidden = !f;
    $("sinoeFolderError").hidden = true;
    $("sinoeFolderDialog").showModal();
  }
  function list() {
    checkedRows.clear();
    if (folder !== "all" && !folders.some((f) => f.id === folder))
      folder = "all";
    const allCases = cases(),
      term = N(search),
      filtered = items
        .filter(
          (n) =>
            (folder === "all" ||
              belongsTo(n, folder === "unfiled" ? "" : folder)) &&
            (filter === "all" || n.read === (filter === "read")) &&
            (organFilter === "all" ||
              (n.organ.trim() ? "organ:" + N(n.organ) : "none") ===
                organFilter) &&
            (monthFilter === "all" || n.date.slice(5, 7) === monthFilter) &&
            (yearFilter === "all" || n.date.slice(0, 4) === yearFilter) &&
            (!term ||
              N(
                [
                  n.title,
                  n.number,
                  n.organ,
                  n.caseNumber ||
                    allCases.find((c) => c.id === n.caseId)?.number ||
                    "",
                  allCases.find((c) => c.id === n.caseId)?.title || "",
                ].join(" "),
              ).includes(term)),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
      pages = Math.max(1, Math.ceil(filtered.length / size));
    page = Math.max(1, Math.min(page, pages));
    D.saveView({
      folder,
      filter,
      organFilter,
      monthFilter,
      yearFilter,
      search,
      page,
    });
    const organs = new Map();
    items.forEach((n) => {
      if (n.organ.trim()) organs.set("organ:" + N(n.organ), n.organ.trim());
    });
    const years = [...new Set(items.map((n) => n.date.slice(0, 4)))]
      .sort()
      .reverse();
    const folderTitle =
      folder === "all"
        ? "Todas las notificaciones"
        : folder === "unfiled"
          ? "Sin carpeta"
          : folderName(folder);
    $("sinoeScreen").innerHTML =
      `<section class="sinoe-panel"><div class="sinoe-toolbar"><div class="sinoe-count"><strong>Bandeja SINOE</strong><span>${items.filter((n) => !n.read).length} sin leer</span><small class="sinoe-account-label">${esc(D.linkedAccount())}</small></div><div class="sinoe-mailbox-actions"><a class="cases-secondary" href="https://casillas.pj.gob.pe/sinoe/login.xhtml" target="_blank" rel="noopener noreferrer">Abrir SINOE ↗</a><button type="button" id="refreshSinoe" class="cases-primary">Actualizar casilla</button></div></div><div class="sinoe-status"><p id="sinoeSyncStatus">${syncLabel()}</p><button type="button" id="disconnectSinoe" class="detail-text-button sinoe-unlink">Desvincular casilla</button></div><div class="sinoe-layout"><aside class="sinoe-folders"><h2>Carpetas</h2><button type="button" id="newSinoeFolder" class="cases-new-folder">＋ Nueva carpeta</button><label class="sinoe-folder-search"><span class="sr-only">Buscar carpeta</span><input id="sinoeFolderSearch" type="search" maxlength="180" placeholder="Buscar carpeta" value="${esc(folderSearch)}"></label><nav aria-label="Carpetas de notificaciones">${folderButton("all", "Todas", items.length)}${folders.map((f) => `<div class="sinoe-folder-row" data-folder-name="${esc(f.name)}"${folderSearch && !N(f.name).includes(N(folderSearch)) ? " hidden" : ""}>${folderButton(f.id, f.name, items.filter((n) => belongsTo(n, f.id)).length)}<button type="button" class="sinoe-folder-edit" data-edit-sinoe-folder="${esc(f.id)}" aria-label="Editar carpeta ${esc(f.name)}" title="Editar o eliminar carpeta">⋯</button></div>`).join("")}</nav><p id="sinoeFolderSearchEmpty" class="sinoe-folder-search-empty"${folderSearch && !folders.some((f) => N(f.name).includes(N(folderSearch))) ? "" : " hidden"}>No hay carpetas con ese nombre.</p></aside><div class="sinoe-main"><div class="sinoe-folder-heading"><h2>${esc(folderTitle)}</h2><span>${filtered.length} ${filtered.length === 1 ? "notificación" : "notificaciones"}</span></div><div class="sinoe-filters"><label class="cases-search"><span class="icon">${window.CejProIcon("inbox")}</span><input id="notificationSearch" type="search" aria-label="Buscar notificaciones" maxlength="180" value="${esc(search)}" placeholder="Buscar asunto, número o expediente…"></label><label class="cases-status-filter"><span class="sr-only">Estado de lectura</span><select id="notificationFilter"><option value="all">Todas</option><option value="unread"${filter === "unread" ? " selected" : ""}>Sin leer</option><option value="read"${filter === "read" ? " selected" : ""}>Leídas</option></select></label><label class="cases-status-filter"><span class="sr-only">Órgano jurisdiccional (O.J.)</span><select id="notificationOrganFilter"><option value="all">Todos los órganos</option><option value="none"${organFilter === "none" ? " selected" : ""}>Sin órgano registrado</option>${[
        ...organs,
      ]
        .sort((a, b) => a[1].localeCompare(b[1], "es"))
        .map(
          ([value, label]) =>
            `<option value="${esc(value)}"${organFilter === value ? " selected" : ""}>${esc(label)}</option>`,
        )
        .join(
          "",
        )}</select></label><label class="cases-status-filter"><span class="sr-only">Mes de notificación</span><select id="notificationMonthFilter"><option value="all">Todos los meses</option>${[
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
      ]
        .map((label, i) => {
          const value = String(i + 1).padStart(2, "0");
          return `<option value="${value}"${monthFilter === value ? " selected" : ""}>${label}</option>`;
        })
        .join(
          "",
        )}</select></label><label class="cases-status-filter"><span class="sr-only">Año de notificación</span><select id="notificationYearFilter"><option value="all">Todos los años</option>${years.map((value) => `<option value="${value}"${yearFilter === value ? " selected" : ""}>${value}</option>`).join("")}</select></label></div>
 <div class="sinoe-table-tools"><span id="sinoeSelectionCount" role="status" aria-live="polite">${filtered.length} ${filtered.length === 1 ? "registro" : "registros"}</span><div class="sinoe-organize"><label><span class="sr-only">Mover notificaciones seleccionadas</span><select id="sinoeBulkMove" disabled><option value="__choose" selected>Mover a…</option>${folderOptions("")}</select></label><label><span class="sr-only">Copiar notificaciones seleccionadas</span><select id="sinoeBulkCopy" disabled><option value="__choose">Copiar a…</option>${folderOptions("")}</select></label></div></div>
 ${
   filtered.length
     ? `<div class="sinoe-table-wrap"><table class="sinoe-table"><caption class="sr-only">Notificaciones de la casilla SINOE</caption><thead><tr><th scope="col"><input type="checkbox" id="sinoeSelectAll" aria-label="Seleccionar todas las notificaciones de esta página"></th><th scope="col"><span class="sr-only">Lectura</span></th><th scope="col">N.º</th><th scope="col">N.º notificación</th><th scope="col">N.º expediente</th><th scope="col">Sumilla</th><th scope="col"><abbr title="Órgano jurisdiccional">O.J.</abbr></th><th scope="col">Fecha</th><th scope="col"><span class="sr-only">Documentos</span></th></tr></thead><tbody>${filtered
         .slice((page - 1) * size, page * size)
         .map((n, i) => {
           const c = allCases.find((c) => c.id === n.caseId || (n.caseNumber && N(c.number) === N(n.caseNumber)));
           return `<tr class="${n.read ? "" : "is-unread"}"><td><input type="checkbox" data-select-notification="${esc(n.id)}" aria-label="Seleccionar ${esc(n.title)}"></td><td><button type="button" class="sinoe-envelope${n.read ? " is-read" : ""}" data-toggle-notification="${esc(n.id)}" aria-label="${n.read ? "Marcar sin leer" : "Marcar leída"}: ${esc(n.title)}" title="${n.read ? "Leída · Marcar sin leer" : "Sin leer · Marcar leída"}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${n.read ? '<path d="m3 10 9-7 9 7v11H3Z M3 10l9 7 9-7 M3 21l6-6m12 6-6-6"/>' : '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="m3 6 9 7 9-7"/>'}</svg></button></td><td>${(page - 1) * size + i + 1}</td><td><a class="sinoe-number-link" href="#sinoe/${encodeURIComponent(n.id)}">${esc(n.number || "Sin número")}</a></td><td>${c ? `<a href="#expedientes/${encodeURIComponent(c.id)}/documentos" class="sinoe-number-link">${esc(n.caseNumber || c.number)} ↗</a>` : esc(n.caseNumber || "Sin vincular")}</td><td><a class="sinoe-summary-link" href="#sinoe/${encodeURIComponent(n.id)}">${esc(n.title)}</a></td><td>${esc(n.organ || "Sin registrar")}</td><td><time datetime="${n.date}">${day(n.date)}</time></td><td><a class="sinoe-open-documents" href="#sinoe/${encodeURIComponent(n.id)}" aria-label="Abrir ${n.attachments.length} documentos de ${esc(n.title)}" title="Ver notificación y documentos"><span class="icon">${window.CejProIcon("file")}</span><small>${n.attachments.length}</small></a></td></tr>`;
         })
         .join("")}</tbody></table></div>`
     : `<div class="clients-empty"><span class="icon">${window.CejProIcon("inbox")}</span><p>${term || filter !== "all" || organFilter !== "all" || monthFilter !== "all" || yearFilter !== "all" ? "No encontramos coincidencias" : "Esta carpeta está vacía"}</p></div>`
 }

 <div class="cases-pagination"><span>${filtered.length ? `Mostrando ${(page - 1) * size + 1}–${Math.min(page * size, filtered.length)} de ${filtered.length}` : ""}</span><div><button type="button" id="notificationPrev" aria-label="Página anterior"${page === 1 ? " disabled" : ""}>‹</button><span>${page} / ${pages}</span><button type="button" id="notificationNext" aria-label="Página siguiente"${page === pages ? " disabled" : ""}>›</button></div></div></div></div></section>`;
    $("disconnectSinoe").onclick = disconnect;
    $("refreshSinoe").onclick = refreshMailbox;
    $("newSinoeFolder").onclick = () => newFolder();
    host
      .querySelectorAll("[data-edit-sinoe-folder]")
      .forEach((b) => (b.onclick = () => newFolder(b.dataset.editSinoeFolder)));
    host.querySelectorAll("[data-notification-folder]").forEach(
      (b) =>
        (b.onclick = () => {
          folder = b.dataset.notificationFolder;
          page = 1;
          list();
        }),
    );
    host
      .querySelectorAll("[data-toggle-notification]")
      .forEach((b) => (b.onclick = () => toggle(b.dataset.toggleNotification)));
    function syncSelection() {
      const boxes = [...host.querySelectorAll("[data-select-notification]")],
        count = checkedRows.size;
      const all = $("sinoeSelectAll");
      if (all) {
        all.checked = boxes.length > 0 && count === boxes.length;
        all.indeterminate = count > 0 && count < boxes.length;
      }
      $("sinoeBulkMove").disabled = !count;
      $("sinoeBulkCopy").disabled = !count;
      $("sinoeSelectionCount").textContent = count
        ? count + " seleccionadas"
        : filtered.length +
          " " +
          (filtered.length === 1 ? "registro" : "registros");
    }
    host.querySelectorAll("[data-select-notification]").forEach(
      (box) =>
        (box.onchange = () => {
          if (box.checked) checkedRows.add(box.dataset.selectNotification);
          else checkedRows.delete(box.dataset.selectNotification);
          syncSelection();
        }),
    );
    if ($("sinoeSelectAll"))
      $("sinoeSelectAll").onchange = (e) => {
        host.querySelectorAll("[data-select-notification]").forEach((box) => {
          box.checked = e.target.checked;
          if (box.checked) checkedRows.add(box.dataset.selectNotification);
          else checkedRows.delete(box.dataset.selectNotification);
        });
        syncSelection();
      };
    $("sinoeBulkMove").onchange = (e) => {
      const id = e.target.value;
      if (id === "__choose" || !checkedRows.size) return;
      if (id && !folders.some((f) => f.id === id)) return;
      const count = checkedRows.size;
      items.forEach((n) => {
        if (checkedRows.has(n.id)) {
          n.folderId = id;
          n.copiedFolderIds = [];
          n.folderMode =
            id && folders.find((f) => f.id === id)?.autoCaseKey
              ? "auto"
              : "manual";
        }
      });
      const saved = D.save(items);
      render();
      notice(
        count === 1
          ? "Notificación movida de carpeta."
          : count + " notificaciones movidas de carpeta.",
        saved,
      );
    };
    $("sinoeBulkCopy").onchange = (event) => {
      const id = event.target.value;
      if (id === "__choose" || !id || !checkedRows.size || !folders.some((f) => f.id === id)) return;
      items.forEach((n) => {
        if (checkedRows.has(n.id) && !belongsTo(n, id)) n.copiedFolderIds = [...(n.copiedFolderIds || []), id];
      });
      const saved = D.save(items);
      render();
      notice("Notificaciones copiadas de carpeta.", saved);
    };
    $("sinoeFolderSearch").oninput = (e) => {
      folderSearch = e.target.value;
      const term = N(folderSearch);
      let visible = 0;
      host.querySelectorAll(".sinoe-folder-row").forEach((row) => {
        row.hidden = !!term && !N(row.dataset.folderName).includes(term);
        if (!row.hidden) visible++;
      });
      $("sinoeFolderSearchEmpty").hidden = !term || visible > 0;
    };
    window.CejProTableFilters.mount(
      host.querySelector(".sinoe-filters"),
      "sinoe",
    );
    $("notificationOrganFilter").onchange = (e) => {
      organFilter = e.target.value;
      page = 1;
      list();
    };
    $("notificationMonthFilter").onchange = (e) => {
      monthFilter = e.target.value;
      page = 1;
      list();
    };
    $("notificationYearFilter").onchange = (e) => {
      yearFilter = e.target.value;
      page = 1;
      list();
    };
    $("notificationSearch").oninput = (e) => {
      search = e.target.value;
      page = 1;
      list();
      $("notificationSearch").focus();
    };
    $("notificationFilter").onchange = (e) => {
      filter = e.target.value;
      page = 1;
      list();
    };
    $("notificationPrev").onclick = () => {
      page--;
      list();
    };
    $("notificationNext").onclick = () => {
      page++;
      list();
    };
  }
  function syncState() {
    try {
      return JSON.parse(window.CejProStorage.getItem("cejpro.sinoe.sync.v1:" + D.linkedAccount())) || {};
    } catch (_) { return {}; }
  }
  function syncLabel() {
    const state = syncState(), today = window.CejProBillingData.today();
    const remaining = Math.max(0, 3 - (state.day === today ? state.count || 0 : 0));
    return `${state.updatedAt ? "Última actualización: " + new Date(state.updatedAt).toLocaleString("es-PE") : "Sin actualizaciones recientes"}<br>${remaining} de 3 actualizaciones disponibles hoy`;
  }
  function refreshMailbox() {
    if (!window.CejProWorkspaces.canEdit()) return;
    const state = syncState(), today = window.CejProBillingData.today();
    const count = state.day === today ? state.count || 0 : 0;
    if (count >= 3) { notice("Alcanzaste el límite de actualizaciones de hoy."); return; }
    const button = $("refreshSinoe"), account = D.linkedAccount();
    button.disabled = true;
    button.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> Actualizando…';
    setTimeout(() => {
      if (D.linkedAccount() !== account) return;
      try {
        window.CejProStorage.setItem("cejpro.sinoe.sync.v1:" + account, JSON.stringify({ day: today, count: count + 1, updatedAt: Date.now() }));
        render();
        notice("Casilla actualizada.");
      } catch (_) {
        button.disabled = false;
        button.textContent = "Actualizar casilla";
        notice("No se pudo guardar la actualización.");
      }
    }, 600);
  }
  function detail(n) {
    list();
    $("sinoeAnnexDialog")?.remove();
    const available = n.read ? n.attachments : [];
    const consolidated = available.length > 1 && available.every((f) => ["sinoe-demo-audiencia-resolucion", "sinoe-demo-audiencia-anexo"].includes(f.id));
    const dialog = document.createElement("dialog");
    dialog.id = "sinoeAnnexDialog";
    dialog.className = "cases-dialog sinoe-annex-dialog";
    dialog.setAttribute("aria-labelledby", "sinoeAnnexTitle");
    const documentWeight = (file) => {
      const sampleSizes = { "sinoe-demo-audiencia-resolucion": 2410, "sinoe-demo-audiencia-anexo": 2377, "sinoe-demo-traslado-resolucion": 2399 };
      const bytes = file.size || sampleSizes[file.id];
      return bytes ? (bytes / 1024).toFixed(1) + " KB" : "—";
    };
    dialog.innerHTML = `<div class="cases-dialog-heading"><h2 id="sinoeAnnexTitle">Lista de anexos de ${esc(n.number)}</h2><button type="button" class="cases-icon-button" id="closeSinoeAnnex" aria-label="Cerrar anexos">×</button></div><div class="annex-panel">${available.length ? `<div class="annex-note"><div><p class="annex-note-title">Descarga de documentos</p><p>Descarga cada anexo por separado o reúne los documentos en un consolidado.</p></div>${consolidated ? `<a class="annex-btn" href="assets/documents/sinoe-demo/audiencia-consolidado.pdf" download="${esc('Exp. ' + n.caseNumber + ' - Consolidado - ' + n.number + '.pdf')}">Descargar consolidado</a>` : ""}</div><div class="annex-table-wrap"><table class="annex-table"><thead><tr><th>Tipo</th><th>Identificación de anexo</th><th>Nro. de páginas</th><th>Peso de archivo</th><th>Documento</th></tr></thead><tbody>${available.map((f, i) => `<tr><td>${i ? "Anexo" : "Resolución"}</td><td>${esc(f.name)}</td><td>${demoDocuments[f.id] ? "1" : "—"}</td><td>${documentWeight(f)}</td><td><div class="annex-actions">${demoDocuments[f.id] ? `<a class="annex-btn" href="${demoDocuments[f.id]}" download="${esc(f.name)}">Descarga individual</a><a class="annex-btn is-light" href="${demoDocuments[f.id]}" target="_blank" rel="noopener noreferrer">Ver PDF ↗</a>` : `<button type="button" class="annex-btn" data-annex-download="${esc(f.id)}">Descarga individual</button>`}</div></td></tr>`).join("")}</tbody></table></div>` : `<div class="clients-empty"><span class="icon">${window.CejProIcon("file")}</span><p>${n.read ? "Sin documentos adjuntos" : "Documentos disponibles al revisar la notificación en SINOE"}</p></div>`}</div><div class="cases-dialog-footer"><button type="button" id="closeSinoeAnnexFooter" class="cases-secondary">Cerrar</button></div>`;
    host.append(dialog);
    const close = () => dialog.close();
    $("closeSinoeAnnex").onclick = close;
    $("closeSinoeAnnexFooter").onclick = close;
    dialog.addEventListener("close", () => { dialog.remove(); location.hash = "#sinoe"; });
    dialog.querySelectorAll("[data-annex-download]").forEach((button) => {
      button.onclick = async () => {
        const file = n.attachments.find((f) => f.id === button.dataset.annexDownload);
        const blob = await F.get(file.id).catch(() => null);
        if (!blob) { notice("Este PDF no está disponible en este navegador."); return; }
        const url = URL.createObjectURL(blob), link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      };
    });
    dialog.showModal();
  }
  window.CejProSinoe = { mount, showRoute };
})();
