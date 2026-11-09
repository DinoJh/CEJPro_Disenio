(() => {
  const D = window.CejProIdentitiesData,
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
    search = "",
    type = "all",
    page = 1,
    callback = null,
    returnFocus = null;
  const size = 8,
    $ = (id) => document.getElementById(id);
  function ensure() {
    if ($("identityEditorDialog")) return;
    const container = document.createElement("div");
    container.id = "identityDialogs";
    container.innerHTML = `<dialog id="identityEditorDialog" class="cases-dialog" aria-labelledby="identityEditorTitle"><form id="identityEditorForm"><div class="cases-dialog-heading"><h2 id="identityEditorTitle">Nueva identidad</h2><button type="button" data-identity-close="identityEditorDialog" class="cases-icon-button" aria-label="Cerrar">×</button></div><div class="cases-form-body"><label>Alias<input name="alias" maxlength="60" placeholder="Nombre para reconocerla" autocomplete="off"></label><label>Tipo de documento<select name="documentType" id="identityDocumentType"><option value="dni">DNI</option><option value="ce">Carné de extranjería</option></select></label><label><span id="identityNumberLabel">Número de documento</span><input name="documentNumber" required autocomplete="off"></label><label id="identityVerificationField">Código de verificación<input name="digit" inputmode="numeric" maxlength="3" pattern="[0-9]{1,3}"></label><label>Fecha de nacimiento<input name="birthDate" type="date" required></label><label id="identityEmissionField">Fecha de emisión<input name="issueDate" type="date"></label><p id="identityEditorError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" data-identity-close="identityEditorDialog" class="cases-secondary">Cancelar</button><button type="submit" class="cases-primary">Guardar identidad</button></div></form></dialog><dialog id="identityLinksDialog" class="cases-dialog" aria-labelledby="identityLinksTitle"><div class="cases-dialog-heading"><h2 id="identityLinksTitle">Expedientes vinculados</h2><button type="button" data-identity-close="identityLinksDialog" class="cases-icon-button" aria-label="Cerrar">×</button></div><div id="identityLinkedCases" class="cases-form-body"></div><p id="identityDeleteError" class="cases-form-error identity-dialog-notice" role="alert" hidden></p><div class="cases-dialog-footer"><button type="button" data-identity-close="identityLinksDialog" class="cases-secondary">Cerrar</button><button type="button" id="confirmDeleteIdentity" class="cases-primary" hidden>Eliminar identidad</button></div></dialog>`;
    document.body.append(container);
    container
      .querySelectorAll("[data-identity-close]")
      .forEach((b) => (b.onclick = () => $(b.dataset.identityClose).close()));
    $("identityDocumentType").onchange = syncType;
    $("identityEditorDialog").addEventListener("close", () => {
      callback = null;
      if (returnFocus?.isConnected) returnFocus.focus();
      returnFocus = null;
    });
    $("identityEditorForm").onsubmit = (e) => {
      e.preventDefault();
      const form = e.target,
        result = D.save({
          ...Object.fromEntries(new FormData(form)),
          id: form.dataset.editing,
        });
      if (!result.ok) {
        $("identityEditorError").textContent = result.error;
        $("identityEditorError").hidden = false;
        return;
      }
      const done = callback;
      callback = null;
      $("identityEditorDialog").close();
      window.dispatchEvent(new Event("cejpro:identities-change"));
      if (host && !host.hidden) render();
      if (done) done(result.identity);
    };
    $("confirmDeleteIdentity").onclick = () => {
      const result = D.remove($("identityLinksDialog").dataset.identityId);
      if (!result.ok) {
        $("identityDeleteError").hidden = false;
        $("identityDeleteError").textContent = result.error;
        return;
      }
      $("identityLinksDialog").close();
      window.dispatchEvent(new Event("cejpro:identities-change"));
      render();
    };
    window.addEventListener("hashchange", () => {
      for (const dialog of container.querySelectorAll("dialog[open]"))
        dialog.close();
    });
  }
  function syncType() {
    const form = $("identityEditorForm"),
      dni = form.elements.namedItem("documentType").value === "dni";
    $("identityVerificationField").hidden = !dni;
    form.elements.namedItem("digit").disabled = !dni;
    form.elements.namedItem("digit").required = dni;
    $("identityEmissionField").hidden = false;
    form.elements.namedItem("issueDate").disabled = false;
    form.elements.namedItem("issueDate").required = true;
    $("identityNumberLabel").textContent = dni
      ? "Número de DNI"
      : "Número de carné de extranjería";
    const input = form.elements.namedItem("documentNumber");
    input.maxLength = dni ? 8 : 12;
    input.pattern = dni ? "[0-9]{8}" : "[A-Za-z0-9]{9,12}";
    input.inputMode = dni ? "numeric" : "text";
  }
  function openEditor(id = "", onSaved = null) {
    if (!window.CejProWorkspaces.canEdit()) return;
    ensure();
    const x = id ? D.get(id) : null;
    if (id && !x) return;
    const form = $("identityEditorForm");
    form.reset();
    callback = onSaved;
    returnFocus = document.activeElement;
    form.dataset.editing = x?.id || "";
    for (const key of [
      "alias",
      "documentType",
      "documentNumber",
      "birthDate",
      "digit",
      "issueDate",
    ])
      form.elements.namedItem(key).value =
        x?.[key] || (key === "documentType" ? "dni" : "");
    syncType();
    $("identityEditorTitle").textContent = x
      ? "Editar identidad"
      : "Nueva identidad";
    $("identityEditorError").hidden = true;
    $("identityEditorDialog").showModal();
    form.elements.namedItem("alias").focus();
  }
  function showLinks(id, deleting = false) {
    const x = D.get(id);
    if (!x) return;
    ensure();
    const links = D.linked(id);
    $("identityLinksDialog").dataset.identityId = id;
    $("identityLinksTitle").textContent = deleting
      ? "Eliminar identidad"
      : "Expedientes vinculados";
    $("identityDeleteError").hidden = true;
    $("identityLinkedCases").innerHTML =
      `<p class="identity-context">${esc(D.label(x))}</p>${deleting ? `<p class="identity-context">${links.length ? "Cambia la identidad asignada en estos expedientes antes de eliminarla." : "¿Eliminar esta identidad? Esta acción no elimina expedientes."}</p>` : ""}${links.length ? `<ul class="identity-linked-list">${links.map((c) => `<li><a href="#expedientes/${encodeURIComponent(c.id)}/resumen"><strong>${esc(c.title)}</strong><small>${esc(c.number || "Sin número de expediente")}</small><span>Abrir expediente ↗</span></a></li>`).join("")}</ul>` : deleting ? "" : '<p class="identity-context">Esta identidad todavía no tiene expedientes vinculados.</p>'}`;
    $("confirmDeleteIdentity").hidden = !deleting || !!links.length;
    $("identityLinksDialog").showModal();
  }
  function mount(el) {
    host = el;
    ensure();
    render();
  }
  function render() {
    if (!host) return;
    const term = window.CejProCasesData.normalize(search),
      all = D.load(),
      filtered = all.filter(
        (x) =>
          (type === "all" || x.documentType === type) &&
          (!term ||
            window.CejProCasesData.normalize(
              x.alias + " " + x.documentNumber,
            ).includes(term)),
      ),
      pages = Math.max(1, Math.ceil(filtered.length / size));
    page = Math.min(pages, Math.max(1, page));
    host.innerHTML = `<section class="identities-panel"><div class="identities-toolbar"><label class="cases-search"><input id="identitySearch" type="search" maxlength="180" aria-label="Buscar identidades" placeholder="Buscar alias o documento…" value="${esc(search)}"></label><label class="cases-status-filter"><span class="sr-only">Tipo de documento</span><select id="identityTypeFilter"><option value="all">Todos los documentos</option><option value="dni"${type === "dni" ? " selected" : ""}>DNI</option><option value="ce"${type === "ce" ? " selected" : ""}>Carné de extranjería</option></select></label><button type="button" id="newIdentity" class="cases-primary">＋ Nueva identidad</button></div>${
      filtered.length
        ? `<div class="identities-table-wrap"><table class="identities-table"><caption class="sr-only">Identidades guardadas</caption><thead><tr><th scope="col">Alias</th><th scope="col">Documento</th><th scope="col">Expedientes vinculados</th><th scope="col">Acciones</th></tr></thead><tbody>${filtered
            .slice((page - 1) * size, page * size)
            .map(
              (x) =>
                `<tr><td>${esc(x.alias || "Sin alias")}</td><td>${esc((x.documentType === "dni" ? "DNI " : "CE ") + x.documentNumber)}</td><td><button type="button" class="detail-text-button" data-identity-links="${esc(x.id)}">${D.linked(x.id).length} expedientes ↗</button></td><td><div class="identity-row-actions"><button type="button" class="detail-text-button" data-identity-edit="${esc(x.id)}">Editar</button><button type="button" class="detail-text-button" data-identity-delete="${esc(x.id)}">Eliminar</button></div></td></tr>`,
            )
            .join("")}</tbody></table></div>`
        : `<div class="clients-empty"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a7 7 0 0 0-14 0v2 M13 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/></svg></span><p>${term || type !== "all" ? "No encontramos identidades" : "Aún no hay identidades"}</p></div>`
    }<div class="cases-pagination"><span>${filtered.length} identidades</span><div><button type="button" id="identitiesPrev" aria-label="Página anterior"${page === 1 ? " disabled" : ""}>‹</button><span>${page} / ${pages}</span><button type="button" id="identitiesNext" aria-label="Página siguiente"${page === pages ? " disabled" : ""}>›</button></div></div></section>`;
    $("newIdentity").onclick = () => openEditor();
    $("identitySearch").oninput = (e) => {
      search = e.target.value;
      page = 1;
      render();
      $("identitySearch").focus();
    };
    $("identityTypeFilter").onchange = (e) => {
      type = e.target.value;
      page = 1;
      render();
    };
    $("identitiesPrev").onclick = () => {
      page--;
      render();
    };
    $("identitiesNext").onclick = () => {
      page++;
      render();
    };
    host
      .querySelectorAll("[data-identity-edit]")
      .forEach((b) => (b.onclick = () => openEditor(b.dataset.identityEdit)));
    host
      .querySelectorAll("[data-identity-links]")
      .forEach((b) => (b.onclick = () => showLinks(b.dataset.identityLinks)));
    host
      .querySelectorAll("[data-identity-delete]")
      .forEach(
        (b) => (b.onclick = () => showLinks(b.dataset.identityDelete, true)),
      );
    window.CejProTableFilters.mount(
      host.querySelector(".identities-toolbar"),
      "identities",
    );
  }
  return (window.CejProIdentities = { mount, openEditor });
})();
