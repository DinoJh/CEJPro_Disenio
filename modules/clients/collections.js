(() => {
  const B = window.CejProBillingData,
    C = window.CejProClientsData,
    R = window.CejProReceivedPayments,
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
    clientId = "",
    caseId = "",
    search = "",
    currency = "all",
    conceptFilter = "all",
    movementSearch = "",
    page = 1,
    lastRoute = "",
    message = "";
  const size = 8;
  const conceptsPreset = [
    "Cobro de honorarios",
    "Consulta legal",
    "Asesoría legal",
    "Redacción de escritos",
    "Representación en audiencia",
  ];
  const $ = (id) => host.querySelector("#" + id),
    date = (v) => (v ? v.split("-").reverse().join("/") : "—"),
    link = (id, c = "") =>
      "#cobros/" +
      encodeURIComponent(id) +
      "/" +
      encodeURIComponent(c || "__unassigned"),
    icon = (name) =>
      '<span class="icon" aria-hidden="true">' +
      window.CejProIcon(name) +
      "</span>";
  const empty = (text) =>
    '<div class="clients-empty">' +
    icon("wallet") +
    "<p>" +
    text +
    "</p></div>";
  function mount(el) {
    host = el;
  }
  function showRoute(path) {
    if (lastRoute === path && host.querySelector("dialog[open]")) return;
    if (lastRoute !== path) conceptFilter = "all";
    lastRoute = path;
    const parts = path.split("/");
    try {
      clientId = decodeURIComponent(parts[1] || "");
      caseId = parts[2] ? decodeURIComponent(parts[2]) : "";
      if (caseId === "__unassigned") caseId = "";
    } catch (_) {
      clientId = "invalid";
    }
    page = 1;
    message = "";
    render();
  }
  function render() {
    if (!clientId) {
      directory();
      return;
    }
    const client = C.load().find((c) => c.id === clientId);
    if (!client) {
      host.innerHTML = empty("No encontramos este cliente");
      return;
    }
    ledger(client);
  }
  function directory() {
    const term = C.normalize(search),
      clients = C.load().filter(
        (c) =>
          !term || C.normalize(c.name + " " + C.identifier(c)).includes(term),
      ),
      pages = Math.max(1, Math.ceil(clients.length / size));
    page = Math.min(page, pages);
    host.innerHTML = `<section class="clients-panel"><div class="collections-toolbar"><label class="cases-search">${icon("users")}<input id="ledgerClientSearch" type="search" placeholder="Buscar cliente…" aria-label="Buscar cliente" value="${esc(search)}"></label></div>${
      clients.length
        ? `<div class="collection-client-grid">${clients
            .slice((page - 1) * size, page * size)
            .map(
              (c) =>
                `<a class="collection-client-card" href="${link(c.id)}"><span class="client-avatar">${esc(c.name.slice(0, 1).toUpperCase())}</span><div><strong>${esc(c.name)}</strong><small>${esc(C.identifier(c))}</small></div><span class="collection-client-open">Ver cobros ↗</span></a>`,
            )
            .join("")}</div>`
        : empty(
            term
              ? "No encontramos coincidencias"
              : "Agrega un cliente para gestionar sus cobros",
          )
    }${pagination(clients.length, pages)}</section>`;
    $("ledgerClientSearch").oninput = (e) => {
      search = e.target.value;
      page = 1;
      directory();
      $("ledgerClientSearch").focus();
    };
    bindPages(directory);
  }
  function pagination(count, pages) {
    return `<div class="cases-pagination"><span>${count} ${!clientId ? "clientes" : "registros"}</span><div><button type="button" id="ledgerPrev" aria-label="Página anterior"${page <= 1 ? " disabled" : ""}>‹</button><span>${page} / ${pages}</span><button type="button" id="ledgerNext" aria-label="Página siguiente"${page >= pages ? " disabled" : ""}>›</button></div></div>`;
  }
  function bindPages(fn) {
    $("ledgerPrev").onclick = () => {
      page--;
      fn();
    };
    $("ledgerNext").onclick = () => {
      page++;
      fn();
    };
  }
  function ledger(client) {
    const all = B.list(client.id),
      allCases = window.CejProCasesData.load().cases,
      groups = allCases.filter((c) => client.caseIds.includes(c.id));
    for (const c of [...all, ...R.list(client.id)])
      if (c.caseId && !groups.some((g) => g.id === c.caseId))
        groups.push(
          allCases.find((g) => g.id === c.caseId) || {
            id: c.caseId,
            title: "Expediente no disponible",
            number: "",
          },
        );
    const selected = groups.find((g) => g.id === caseId),
      title = caseId
        ? selected?.title || "Expediente no disponible"
        : "Sin expediente",
      scope = all.filter((c) => c.caseId === caseId),
      received = R.list(client.id).filter((p) => p.caseId === caseId),
      concepts = [
        ...new Set(
          [...scope.filter((c) => c.payments.length), ...received].map(
            (c) => c.concept,
          ),
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
      charges = scope.filter(
        (c) => currency === "all" || c.currency === currency,
      ),
      payments = charges.flatMap((c) =>
        c.payments.map((p) => ({ ...p, charge: c })),
      ),
      term = C.normalize(movementSearch),
      rows = [
        ...payments.map((p) => ({ ...p, kind: "payment" })),
        ...received
          .filter((p) => currency === "all" || p.currency === currency)
          .map((p) => ({
            ...p,
            reference: p.notes,
            kind: "received",
            charge: p,
          })),
      ]
        .filter(
          (row) =>
            (conceptFilter === "all" || row.charge.concept === conceptFilter) &&
            (!term ||
              C.normalize(
                [
                  row.charge.concept,
                  row.reference || "",
                  row.method || "",
                ].join(" "),
              ).includes(term)),
        )
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind),
        ),
      pages = Math.max(1, Math.ceil(rows.length / size));
    page = Math.max(1, Math.min(page, pages));
    const currencies =
        currency === "all"
          ? ["PEN", "USD"].filter((code) =>
              [...charges, ...received].some((c) => c.currency === code),
            )
          : [currency],
      totals = (currencies.length ? currencies : ["PEN"]).map((code) => ({
        currency: code,
        paid:
          charges
            .filter((c) => c.currency === code)
            .reduce((n, c) => n + B.paid(c), 0) +
          received
            .filter((p) => p.currency === code)
            .reduce((n, p) => n + p.amount, 0),
      }));
    host.innerHTML = `<header class="collection-detail-heading"><h1 class="collection-detail-title">${esc(client.name)}</h1><p class="collection-client-id">${esc(C.identifier(client))}</p></header><section class="collection-ledger clients-panel"><aside class="collection-case-sidebar"><h2>Expedientes</h2><button type="button" id="ledgerAddCase" class="cases-secondary">＋ Agregar expediente</button><nav aria-label="Cobros por expediente"><a class="collection-case-link" href="${link(client.id)}"${!caseId ? ' aria-current="page"' : ""}>${icon("wallet")}<span>Sin expediente<small>Servicios generales</small></span></a>${groups.map((c) => `<a class="collection-case-link" href="${link(client.id, c.id)}"${c.id === caseId ? ' aria-current="page"' : ""}>${icon("folder")}<span>${esc(c.title)}${c.number ? `<small>${esc(c.number)}</small>` : ""}</span></a>`).join("")}</nav></aside><div class="collection-ledger-main"><div class="collection-ledger-heading"><div><h2>${esc(title)}</h2>${selected?.number ? `<p>${esc(selected.number)}</p>` : ""}</div><div class="collection-entry-actions"><button type="button" id="ledgerNewPayment" class="cases-primary ledger-payment-button">＋ Registrar pago</button></div></div><div class="collection-ledger-summary"><div><span>Pagos recibidos</span>${totals.map((t) => `<strong class="ledger-credit">${B.money(t.paid, t.currency)}</strong>`).join("")}</div></div><div class="ledger-filter-toolbar"><label class="cases-search">${icon("wallet")}<input id="ledgerMovementSearch" type="search" maxlength="180" value="${esc(movementSearch)}" placeholder="Buscar movimiento…" aria-label="Buscar movimientos"></label><label class="cases-status-filter"><span class="sr-only">Concepto</span><select id="ledgerConceptFilter"><option value="all">Todos los conceptos</option>${concepts.map((concept) => `<option value="${esc(concept)}"${conceptFilter === concept ? " selected" : ""}>${esc(concept)}</option>`).join("")}</select></label><label class="cases-status-filter"><span class="sr-only">Moneda</span><select id="ledgerCurrency"><option value="all">Todas las monedas</option><option value="PEN"${currency === "PEN" ? " selected" : ""}>Soles (S/)</option><option value="USD"${currency === "USD" ? " selected" : ""}>Dólares (US$)</option></select></label></div>
 ${
   rows.length
     ? `<div class="billing-table-wrap ledger-table-wrap"><table class="billing-table ledger-table"><thead><tr><th>Fecha</th><th>Movimiento / concepto</th><th>Medio</th><th>Importe</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${rows
         .slice((page - 1) * size, page * size)
         .map(
           (row) =>
             `<tr data-movement="${row.kind}"><td>${date(row.date)}</td><td><span class="ledger-movement-label ledger-credit">Pago recibido</span><strong>${esc(row.charge.concept)}</strong>${row.reference ? `<small>${esc(row.reference)}</small>` : ""}</td><td>${esc(row.method)}</td><td class="ledger-credit"><strong>+ ${B.money(row.amount, row.charge.currency)}</strong></td><td>${rowActions(row.kind, row.charge.id, row.kind === "payment" ? row.id : "")}</td></tr>`,
         )
         .join("")}</tbody></table></div>`
     : empty(
         term || conceptFilter !== "all" || currency !== "all"
           ? "No hay movimientos que coincidan con los filtros"
           : "No hay movimientos registrados",
       )
 }${pagination(rows.length, pages)}<p class="collection-feedback" id="ledgerNotice" role="status">${esc(message)}</p></div></section>${dialogs()}`;
    window.CejProTableFilters.mount(
      host.querySelector(".ledger-filter-toolbar"),
      "ledger",
    );
    $("ledgerConceptFilter").onchange = (e) => {
      conceptFilter = e.target.value;
      page = 1;
      render();
    };
    $("ledgerCurrency").onchange = (e) => {
      currency = e.target.value;
      page = 1;
      render();
    };
    $("ledgerMovementSearch").oninput = (e) => {
      const position = e.target.selectionStart;
      movementSearch = e.target.value;
      page = 1;
      render();
      $("ledgerMovementSearch").focus();
      try {
        $("ledgerMovementSearch").setSelectionRange(position, position);
      } catch (_) {}
    };
    bindPages(render);
    $("ledgerAddCase").onclick = openAddCase;
    $("ledgerNewPayment").onclick = () => openPayment();
    host
      .querySelectorAll("[data-ledger-edit]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            b.dataset.kind === "received"
              ? openPayment(b.dataset.id)
              : openPayment(b.dataset.id, b.dataset.payment)),
      );
    host
      .querySelectorAll("[data-ledger-delete]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            openDelete(b.dataset.kind, b.dataset.id, b.dataset.payment)),
      );
    host
      .querySelectorAll("[data-ledger-close]")
      .forEach((b) => (b.onclick = () => $(b.dataset.ledgerClose).close()));
    $("ledgerPaymentForm").onsubmit = savePayment;
    $("ledgerDeleteForm").onsubmit = deleteEntry;
  }
  function openAddCase() {
    if (!window.CejProWorkspaces.canEdit()) return;
    const client = C.load().find((c) => c.id === clientId);
    if (!client) return;
    const all = window.CejProCasesData.load().cases.filter(
      (c) => !client.caseIds.includes(c.id),
    );
    $("ledgerCaseSelect").innerHTML =
      '<option value="">Selecciona un expediente</option>' +
      all
        .map(
          (c) =>
            `<option value="${esc(c.id)}">${esc(c.title)} · ${esc(c.number)}</option>`,
        )
        .join("");
    $("ledgerCaseSelect").disabled = !all.length;
    $("ledgerLinkCase").disabled = !all.length;
    $("ledgerCaseEmpty").hidden = !!all.length;
    $("ledgerCaseError").hidden = true;
    $("ledgerCaseForm").onsubmit = (e) => {
      e.preventDefault();
      linkCase(client.id, $("ledgerCaseSelect").value);
    };
    $("ledgerCreateCase").onclick = () => {
      $("ledgerCaseDialog").close();
      window.CejProCases.createForClient(client.name, (c) =>
        linkCase(client.id, c.id),
      );
    };
    $("ledgerCaseDialog").showModal();
  }
  function linkCase(id, linkedId) {
    if (!window.CejProWorkspaces.canEdit()) return;
    const clients = C.load(),
      client = clients.find((c) => c.id === id),
      exists = window.CejProCasesData.load().cases.some(
        (c) => c.id === linkedId,
      );
    if (!client || !exists) return;
    client.caseIds = [...new Set([...client.caseIds, linkedId])];
    if (!C.save(clients)) {
      message = "No se pudo vincular el expediente. Inténtalo de nuevo.";
      if ($("ledgerCaseDialog")?.open) {
        $("ledgerCaseError").textContent = message;
        $("ledgerCaseError").hidden = false;
      } else render();
      return;
    }
    $("ledgerCaseDialog")?.close();
    message = "Expediente agregado.";
    movementSearch = "";
    conceptFilter = "all";
    page = 1;
    caseId = linkedId;
    const destination = link(id, linkedId);
    if (location.hash === destination) render();
    else location.hash = destination;
  }
  function rowActions(kind, id, payment = "") {
    return `<div class="ledger-row-actions"><button type="button" class="detail-text-button" data-ledger-edit data-kind="${kind}" data-id="${esc(id)}" data-payment="${esc(payment)}">Editar</button><button type="button" class="detail-text-button" data-ledger-delete data-kind="${kind}" data-id="${esc(id)}" data-payment="${esc(payment)}">Eliminar</button></div>`;
  }
  function dialogs() {
    return `<dialog id="ledgerCaseDialog" class="cases-dialog" aria-labelledby="ledgerCaseTitle"><form id="ledgerCaseForm"><div class="cases-dialog-heading"><h2 id="ledgerCaseTitle">Agregar expediente</h2><button type="button" class="cases-icon-button" data-ledger-close="ledgerCaseDialog" aria-label="Cerrar">×</button></div><div class="cases-form-body"><label>Expediente existente<select name="caseId" id="ledgerCaseSelect" required></select></label><p id="ledgerCaseEmpty" class="cases-form-note" hidden>No hay otros expedientes disponibles. Puedes crear uno nuevo.</p><button type="button" class="cases-secondary" id="ledgerCreateCase">＋ Crear nuevo expediente</button><p id="ledgerCaseError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" class="cases-secondary" data-ledger-close="ledgerCaseDialog">Cancelar</button><button type="submit" class="cases-primary" id="ledgerLinkCase">Vincular expediente</button></div></form></dialog>
 <dialog id="ledgerPaymentDialog" class="cases-dialog" aria-labelledby="ledgerPaymentTitle"><form id="ledgerPaymentForm"><div class="cases-dialog-heading"><h2 id="ledgerPaymentTitle">Registrar pago</h2><button type="button" class="cases-icon-button" data-ledger-close="ledgerPaymentDialog" aria-label="Cerrar">×</button></div><div class="cases-form-body"><div class="ledger-payment-amount"><label>Importe recibido<input name="amount" inputmode="decimal" required placeholder="0.00"></label><label>Moneda<select name="currency"><option value="PEN">Soles (S/)</option><option value="USD">Dólares (US$)</option></select></label></div><label>Medio de pago<select name="method"><option>Efectivo</option><option>Yape / Plin</option><option>Transferencia</option><option>Depósito</option><option>Otro</option></select></label><div class="ledger-payment-concept"><label>Concepto<select name="conceptType" id="ledgerPaymentConcept"><option value="other">Otro</option>${conceptsPreset.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select></label><label id="ledgerCustomConceptField">Motivo del pago<input name="customConcept" maxlength="180" placeholder="Ej. Honorarios por asesoría laboral"></label></div><details id="ledgerPaymentAdditional" class="client-additional"><summary>Adicionales</summary><div class="client-additional-fields"><label>Fecha<input name="date" type="date" required></label><label>Notas<input name="notes" maxlength="180" placeholder="Añade un detalle si lo necesitas"></label></div></details><p id="ledgerPaymentError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" class="cases-secondary" data-ledger-close="ledgerPaymentDialog">Cancelar</button><button type="submit" class="cases-primary ledger-payment-button" id="ledgerPaymentSave">Guardar pago</button></div></form></dialog>
 <dialog id="ledgerDeleteDialog" class="cases-dialog" aria-labelledby="ledgerDeleteTitle"><form id="ledgerDeleteForm"><div class="cases-dialog-heading"><h2 id="ledgerDeleteTitle">Eliminar registro</h2><button type="button" class="cases-icon-button" data-ledger-close="ledgerDeleteDialog" aria-label="Cerrar">×</button></div><div class="cases-form-body"><p id="ledgerDeleteContext"></p><p id="ledgerDeleteError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" class="cases-secondary" data-ledger-close="ledgerDeleteDialog">Cancelar</button><button type="submit" class="cases-primary">Eliminar</button></div></form></dialog>`;
  }
  function syncPaymentConcept() {
    const f = $("ledgerPaymentForm"),
      custom = f.elements.namedItem("conceptType").value === "other";
    $("ledgerCustomConceptField").hidden = !custom;
    f.elements.namedItem("customConcept").disabled = !custom;
    f.elements.namedItem("customConcept").required = false;
  }
  function openPayment(id = "", legacyPaymentId = "") {
    if (!window.CejProWorkspaces.canEdit()) return;
    const legacy = legacyPaymentId
        ? B.list(clientId).find((c) => c.id === id)
        : null,
      payment = legacy
        ? legacy.payments.find((p) => p.id === legacyPaymentId)
        : R.list(clientId).find((p) => p.id === id),
      f = $("ledgerPaymentForm");
    f.reset();
    f.dataset.id = payment?.id || "";
    f.dataset.legacy = legacy?.id || "";
    $("ledgerPaymentTitle").textContent = payment
      ? "Editar pago"
      : "Registrar pago";
    $("ledgerPaymentAdditional").open = false;
    const concept = legacy?.concept || payment?.concept || "";
    f.elements.namedItem("conceptType").value = conceptsPreset.includes(concept)
      ? concept
      : "other";
    f.elements.namedItem("customConcept").value = concept;
    syncPaymentConcept();
    f.elements.namedItem("conceptType").disabled = !!legacy;
    f.elements.namedItem("customConcept").readOnly = !!legacy;
    f.elements.namedItem("amount").value = payment
      ? (payment.amount / 100).toFixed(2)
      : "";
    f.elements.namedItem("currency").value =
      legacy?.currency || payment?.currency || "PEN";
    f.elements.namedItem("currency").disabled = !!legacy;
    f.elements.namedItem("method").value = payment?.method || "Efectivo";
    f.elements.namedItem("date").value = payment?.date || B.today();
    f.elements.namedItem("notes").value = legacy
      ? payment?.reference || ""
      : payment?.notes || "";
    $("ledgerPaymentConcept").onchange = syncPaymentConcept;
    $("ledgerPaymentError").hidden = true;
    $("ledgerPaymentSave").disabled = false;
    $("ledgerPaymentDialog").showModal();
  }
  function savePayment(e) {
    e.preventDefault();
    const f = e.target,
      input = Object.fromEntries(new FormData(f));
    input.concept =
      f.elements.namedItem("conceptType").value === "other"
        ? String(input.customConcept || "").trim()
        : f.elements.namedItem("conceptType").value;
    input.currency = f.elements.namedItem("currency").value;
    input.id = f.dataset.id;
    input.caseId = caseId;
    let result;
    if (f.dataset.legacy)
      result = B.editPayment(clientId, f.dataset.legacy, f.dataset.id, {
        ...input,
        reference: input.notes || "",
      });
    else result = R.save(clientId, input);
    finish(
      result,
      "ledgerPaymentError",
      "ledgerPaymentDialog",
      "Pago guardado.",
    );
  }

  function openDelete(kind, id, paymentId) {
    if (!window.CejProWorkspaces.canEdit()) return;
    const c =
      kind === "received"
        ? R.list(clientId).find((p) => p.id === id)
        : B.list(clientId).find((c) => c.id === id);
    if (!c) return;
    const f = $("ledgerDeleteForm");
    Object.assign(f.dataset, { kind, id, payment: paymentId || "" });
    $("ledgerDeleteTitle").textContent = "Eliminar pago";
    $("ledgerDeleteContext").textContent = "¿Eliminar este pago registrado?";
    $("ledgerDeleteError").hidden = true;
    $("ledgerDeleteDialog").showModal();
  }
  function deleteEntry(e) {
    e.preventDefault();
    const f = e.target,
      result =
        f.dataset.kind === "received"
          ? R.remove(clientId, f.dataset.id)
          : B.removePayment(clientId, f.dataset.id, f.dataset.payment);
    finish(
      result,
      "ledgerDeleteError",
      "ledgerDeleteDialog",
      "Registro eliminado.",
    );
  }
  function finish(result, errorId, dialogId, text) {
    if (!result.ok) {
      $(errorId).textContent = result.error;
      $(errorId).hidden = false;
      return;
    }
    $(dialogId).close();
    if (
      conceptFilter !== "all" &&
      ![...B.list(clientId), ...R.list(clientId)].some(
        (c) => c.caseId === caseId && c.concept === conceptFilter,
      )
    )
      conceptFilter = "all";
    message = result.saved ? text : "No se pudo guardar en este navegador.";
    render();
  }
  window.addEventListener("hashchange", () => {
    if (location.hash.slice(1).split("/")[0] !== "cobros")
      host
        ?.querySelectorAll("dialog[open]")
        .forEach((dialog) => dialog.close());
  });
  window.CejProCollections = { mount, showRoute };
})();
