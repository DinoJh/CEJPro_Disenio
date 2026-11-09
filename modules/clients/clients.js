(() => {
  const D = window.CejProClientsData,
    esc = (v) =>
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
  let host,
    clients = D.load(),
    search = "",
    type = "all",
    caseCountFilter = "all",
    page = 1,
    selected = "";
  const size = 8;
  const $ = (id) => host.querySelector("#" + id),
    cases = () => window.CejProCasesData.load().cases;
  const linked = (c) => cases().filter((x) => c.caseIds.includes(x.id));
  function mount(el) {
    if (host) return;
    host = el;
    host.innerHTML = `<div id="clientsScreen"></div><p id="clientsNotice" class="cases-notice" role="status" aria-live="polite"></p>
 <dialog id="clientDialog" class="cases-dialog" aria-labelledby="clientDialogTitle"><form id="clientForm"><div class="cases-dialog-heading"><h2 id="clientDialogTitle">Nuevo cliente</h2><button type="button" class="cases-icon-button" data-client-close aria-label="Cerrar">×</button></div><div class="cases-form-body"><div class="client-main-fields"><label>Nombre completo o razón social<input name="name" required maxlength="180" placeholder="Ej. María Torres" autocomplete="off"></label><details id="clientAdditional" class="client-additional"><summary>Adicionales</summary><div class="client-additional-fields"><label>Documento<input name="document" maxlength="40" placeholder="DNI, RUC u otro"></label><div class="cases-form-row"><label>Teléfono<input name="phone" type="tel" maxlength="50" autocomplete="off"></label><label>Correo<input name="email" type="email" maxlength="180" autocomplete="off"></label></div><label>Tipo de cliente<select name="type"><option value="person">Persona natural</option><option value="company">Empresa u organización</option></select></label><details id="clientCasePicker" class="client-case-picker"><summary>Vincular casos</summary><div id="clientCaseOptions"></div></details></div></details></div><div id="clientNoteField" class="client-note-fields" hidden><label>Nota del cliente<textarea name="notes" disabled rows="4" maxlength="2000" placeholder="Información importante sobre este cliente…"></textarea></label></div><p id="clientError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" id="deleteClient" class="client-delete-button" hidden>Eliminar cliente</button><button type="button" class="cases-secondary" data-client-close>Cancelar</button><button type="submit" class="cases-primary">Guardar cliente</button></div></form></dialog>`;
    host.insertAdjacentHTML(
      "beforeend",
      `<dialog id="deleteClientDialog" class="cases-dialog" aria-labelledby="deleteClientTitle"><form id="deleteClientForm"><div class="cases-dialog-heading"><h2 id="deleteClientTitle">Eliminar cliente</h2><button type="button" class="cases-icon-button" id="closeDeleteClient" aria-label="Cerrar">×</button></div><div class="cases-form-body"><p id="deleteClientName"></p><p class="cases-form-note">Se eliminarán sus datos y pagos registrados. Los expedientes se conservarán. Esta acción no se puede deshacer.</p><p id="deleteClientError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" class="cases-secondary" id="cancelDeleteClient">Cancelar</button><button type="submit" class="cases-primary">Eliminar cliente</button></div></form></dialog>`,
    );
    $("closeDeleteClient").onclick = $("cancelDeleteClient").onclick = () =>
      $("deleteClientDialog").close();
    $("deleteClient").onclick = () => {
      if (!window.CejProWorkspaces.canEdit()) return;
      const c = clients.find((x) => x.id === $("clientForm").dataset.editing);
      if (!c) return;
      $("deleteClientForm").dataset.clientId = c.id;
      $("deleteClientName").textContent =
        "¿Eliminar a " + c.name + " (" + D.identifier(c) + ")?";
      $("deleteClientError").hidden = true;
      $("deleteClientDialog").showModal();
    };
    $("deleteClientForm").onsubmit = (e) => {
      e.preventDefault();
      const result = D.remove(e.target.dataset.clientId);
      if (!result.ok) {
        $("deleteClientError").textContent = result.error;
        $("deleteClientError").hidden = false;
        return;
      }
      clients = D.load();
      $("deleteClientDialog").close();
      $("clientDialog").close();
      selected = "";
      page = 1;
      if (location.hash !== "#clientes") location.hash = "clientes";
      else render();
    };
    host
      .querySelectorAll("[data-client-close]")
      .forEach((b) => (b.onclick = () => $("clientDialog").close()));
    $("clientForm").onsubmit = save;
  }
  function showRoute(route) {
    clients = D.load();
    selected = "";
    try {
      selected = decodeURIComponent(route.split("/")[1] || "");
    } catch (_) {
      selected = "invalid";
    }
    render();
  }
  function render() {
    if (!host) return;
    const c = clients.find((x) => x.id === selected);
    if (selected) {
      if (c) detail(c);
      else
        $("clientsScreen").innerHTML =
          '<a class="detail-back" href="#clientes">← Clientes</a><div class="clients-empty"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-3.87"/></svg></span><p>No encontramos este cliente</p></div>';
    } else list();
    window.dispatchEvent(new Event("cejpro:client-render"));
  }
  function list() {
    const term = D.normalize(search),
      filtered = clients.filter(
        (c) =>
          (type === "all" || c.type === type) &&
          (caseCountFilter === "all" ||
            linked(c).length === Number(caseCountFilter)) &&
          (!term ||
            D.normalize(
              [c.name, c.document, c.phone, c.email].join(" "),
            ).includes(term)),
      ),
      pages = Math.max(1, Math.ceil(filtered.length / size));
    page = Math.max(1, Math.min(page, pages));
    $("clientsScreen").innerHTML =
      `<section class="clients-panel" aria-label="Directorio de clientes"><div class="clients-toolbar"><label class="cases-search"><span class="icon">${window.CejProIcon("users")}</span><input id="clientSearch" type="search" placeholder="Buscar nombre, documento o contacto…" aria-label="Buscar clientes" maxlength="180" value="${esc(search)}"></label><label class="cases-status-filter"><span class="sr-only">Tipo de cliente</span><select id="clientTypeFilter"><option value="all">Todos los clientes</option><option value="person"${type === "person" ? " selected" : ""}>Personas naturales</option><option value="company"${type === "company" ? " selected" : ""}>Empresas</option></select></label><label class="cases-status-filter"><span class="sr-only">Cantidad de expedientes</span><select id="clientCaseCountFilter"><option value="all">Cualquier cantidad</option>${[
        ...new Set([0, ...clients.map((c) => linked(c).length)]),
      ]
        .sort((a, b) => a - b)
        .map(
          (count) =>
            `<option value="${count}"${caseCountFilter === String(count) ? " selected" : ""}>${count} ${count === 1 ? "caso" : "casos"}</option>`,
        )
        .join(
          "",
        )}</select></label><button id="newClient" class="cases-primary" type="button">＋ Nuevo cliente</button></div>
 ${
   filtered.length
     ? `<div class="clients-table-wrap"><table class="clients-table"><thead><tr><th>Cliente</th><th>Contacto</th><th>Casos</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${filtered
         .slice((page - 1) * size, page * size)
         .map(
           (c) =>
             `<tr><td><a class="client-name" href="#clientes/${encodeURIComponent(c.id)}"><span class="client-avatar">${esc(c.name.slice(0, 1).toUpperCase())}</span><span><strong>${esc(c.name)}</strong><small>${esc(D.identifier(c))}</small></span></a></td><td><span>${esc(c.phone || "—")}</span><small>${esc(c.email)}</small></td><td>${linked(c).length}</td><td><a class="cases-open-action" href="#clientes/${encodeURIComponent(c.id)}">Abrir ↗</a><button type="button" class="cases-row-action" data-edit-client="${esc(c.id)}" aria-label="Editar ${esc(c.name)}">⋯</button></td></tr>`,
         )
         .join("")}</tbody></table></div>`
     : `<div class="clients-empty"><span class="icon">${window.CejProIcon("users")}</span><p>${term || type !== "all" || caseCountFilter !== "all" ? "No encontramos coincidencias" : "Aún no hay clientes"}</p></div>`
 }
 <div class="cases-pagination"><span>${filtered.length ? `Mostrando ${(page - 1) * size + 1}–${Math.min(page * size, filtered.length)} de ${filtered.length}` : "0 clientes"}</span><div><button id="clientsPrev" type="button" aria-label="Página anterior"${page === 1 ? " disabled" : ""}>‹</button><span>${page} / ${pages}</span><button id="clientsNext" type="button" aria-label="Página siguiente"${page === pages ? " disabled" : ""}>›</button></div></div></section>`;
    $("newClient").onclick = () => open();
    $("clientSearch").oninput = (e) => {
      const input = e.target,
        position = input.selectionStart;
      search = input.value;
      page = 1;
      list();
      $("clientSearch").focus();
      try {
        $("clientSearch").setSelectionRange(position, position);
      } catch (_) {}
    };
    window.CejProTableFilters.mount(
      host.querySelector(".clients-toolbar"),
      "clients",
    );
    $("clientCaseCountFilter").onchange = (e) => {
      caseCountFilter = e.target.value;
      page = 1;
      list();
    };
    $("clientTypeFilter").onchange = (e) => {
      type = e.target.value;
      page = 1;
      list();
    };
    $("clientsPrev").onclick = () => {
      page--;
      list();
    };
    $("clientsNext").onclick = () => {
      page++;
      list();
    };
    host
      .querySelectorAll("[data-edit-client]")
      .forEach((b) => (b.onclick = () => open(b.dataset.editClient)));
  }
  function detail(c) {
    const related = linked(c);
    $("clientsScreen").innerHTML =
      `<header class="client-heading"><div><h1>${esc(c.name)}</h1><p>${esc(D.identifier(c))}</p></div><button class="cases-secondary" id="editClient" type="button">Editar cliente</button></header><section class="clients-panel"><nav class="client-tabs" aria-label="Secciones del cliente"><a href="#clientes/${encodeURIComponent(c.id)}" aria-current="page">Información</a><a href="#cobros/${encodeURIComponent(c.id)}">Cobros</a></nav><div id="clientInfo"><div class="client-contact"><h2>Datos de contacto</h2><dl><div><dt>Teléfono</dt><dd>${esc(c.phone || "Sin registrar")}</dd></div><div><dt>Correo electrónico</dt><dd>${esc(c.email || "Sin registrar")}</dd></div></dl></div><div class="client-related-heading"><h2>Expedientes asociados <span>${related.length}</span></h2><button type="button" class="detail-text-button" id="linkClientCases">Vincular casos</button></div>${related.length ? `<ul class="client-related">${related.map((x) => `<li><a href="#expedientes/${encodeURIComponent(x.id)}/resumen"><span class="icon">${window.CejProIcon("folder")}</span><span><strong>${esc(x.title)}</strong><small>${esc(x.number || "Sin número de expediente")}</small></span><span aria-hidden="true">↗</span></a></li>`).join("")}</ul>` : '<div class="clients-empty compact"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-3.87"/></svg></span><p>Este cliente todavía no tiene casos asociados.</p></div>'}${c.notes ? `<div class="client-note"><h2>Nota del cliente</h2><p>${esc(c.notes)}</p></div>` : ""}</div></section>`;
    $("editClient").onclick = () => open(c.id);
    $("linkClientCases").onclick = () => open(c.id, true);
  }
  function open(id, expand = false) {
    const c = clients.find((x) => x.id === id),
      form = $("clientForm");
    form.reset();
    form.dataset.editing = c?.id || "";
    $("clientDialogTitle").textContent = c ? "Editar cliente" : "Nuevo cliente";
    $("deleteClient").hidden = !c;
    for (const k of ["name", "type", "document", "phone", "email", "notes"])
      form.elements.namedItem(k).value =
        c?.[k] || (k === "type" ? "person" : "");
    $("clientAdditional").open = expand;
    $("clientCasePicker").open = expand;
    $("clientNoteField").hidden = !c;
    form.elements.namedItem("notes").disabled = !c;
    $("clientError").hidden = true;
    const all = cases();
    $("clientCaseOptions").innerHTML = all.length
      ? all
          .map(
            (x) =>
              `<label class="client-case-option"><input type="checkbox" name="caseIds" value="${esc(x.id)}"${c?.caseIds.includes(x.id) ? " checked" : ""}><span>${esc(x.title)}<small>${esc(x.number || "Sin número")}</small></span></label>`,
          )
          .join("")
      : '<p class="cases-form-note">Aún no hay casos para asociar.</p>';
    $("clientDialog").showModal();
  }
  function save(e) {
    e.preventDefault();
    const form = e.target,
      data = new FormData(form),
      name = String(data.get("name")).trim();
    if (!name) {
      $("clientError").textContent = "Escribe el nombre del cliente.";
      $("clientError").hidden = false;
      return;
    }
    const c = {
        id: form.dataset.editing || "client-" + crypto.randomUUID(),
        name,
        type: String(data.get("type")),
        document: String(data.get("document")).trim(),
        phone: String(data.get("phone")).trim(),
        email: String(data.get("email")).trim(),
        notes: String(data.get("notes") || "").trim(),
        caseIds: [...new Set(data.getAll("caseIds"))],
      },
      index = clients.findIndex((x) => x.id === c.id);
    if (index >= 0) clients[index] = c;
    else clients.unshift(c);
    const saved = D.save(clients);
    if (saved) clients = D.load();
    $("clientDialog").close();
    search = "";
    type = "all";
    caseCountFilter = "all";
    page = 1;
    render();
    $("clientsNotice").textContent = saved
      ? "Cliente guardado en este navegador."
      : "El cambio se mantiene durante esta visita; no se pudo guardar en este navegador.";
  }
  window.CejProClients = { mount, showRoute };
})();
