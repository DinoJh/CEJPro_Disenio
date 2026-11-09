/* Restricción de interfaz para la vista local de lector; no sustituye permisos de servidor. */
(() => {
  const W = window.CejProWorkspaces;
  const writeSelectors = [
    "#newCase",
    "#addFirstCase",
    "#newFolder",
    "[data-edit-case]",
    "#editDetailCase",
    "#editSummary",
    "#changeSummaryIdentity",
    "#addParty",
    "[data-edit-party]",
    "#detailNewFolder",
    "#detailUpload",
    "[data-move-file]",
    "#documentMove",
    "#documentCopy",
    "[data-document-delete]",
    "#sinoeBulkCopy",
    "#refreshSinoe",
    "#caseNewIdentity",
    "#caseAgendaAdd",
    "#ledgerAddCase",
    "#ledgerCreateCase",
    "#ledgerLinkCase",
    "#ledgerNewPayment",
    "[data-ledger-edit]",
    "[data-ledger-delete]",
    "#deleteClient",
    "#newClient",
    "[data-edit-client]",
    "#editClient",
    "#linkClientCases",
    "#newIdentity",
    "[data-identity-edit]",
    "[data-identity-delete]",
    "#confirmDeleteIdentity",
    "#addEvent",
    "#addSelected",
    "#deleteEvent",
    "#caseAgendaDelete",
    'a[href^="#calendario/nuevo"]',
    "#newSinoeFolder",
    "[data-edit-sinoe-folder]",
    "#disconnectSinoe",
    "#sinoeBulkMove",
    "[data-toggle-notification]",
    "#toggleNotification",
    "#organizeNotification",
    "#newWriting",
    "[data-delete-writing]",
    "#editorDeleteWriting",
    "#writingSave",
    "#writingSaveAsTemplate",
    "#writingUndo",
    "#writingRedo",
    "#writingTitle",
    "#detailNote",
    ".ql-toolbar button",
    ".ql-toolbar select",
  ].join(",");
  function block(el) {
    if (el.hasAttribute("data-workspace-blocked")) return;
    el.dataset.workspaceBlocked = "";
    el.setAttribute("aria-disabled", "true");
    el.title = "Solo lectura";
    if ("disabled" in el) el.disabled = true;
    else if (el.tagName === "A") el.tabIndex = -1;
  }
  let stopped = false;
  function sync() {
    if (stopped || W.canEdit()) return;
    document.querySelectorAll(writeSelectors).forEach(block);
    document.querySelectorAll("form").forEach((form) => {
      if (["profileForm", "preferencesForm"].includes(form.id)) return;
      form
        .querySelectorAll('input,select,textarea,button[type="submit"]')
        .forEach(block);
    });
    document
      .querySelectorAll('.ql-editor[contenteditable="true"]')
      .forEach((el) => {
        el.contentEditable = "false";
        el.setAttribute("aria-readonly", "true");
      });
  }
  function intercept(e) {
    if (W.canEdit() || e.target.closest?.("#profileForm,#preferencesForm"))
      return;
    if (e.type === "submit" || e.target.closest?.("[data-workspace-blocked]")) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }
  for (const event of ["click", "submit", "change", "input", "beforeinput"])
    document.addEventListener(event, intercept, true);
  document.addEventListener(
    "drop",
    (e) => {
      if (!W.canEdit() && e.target.closest("main,dialog")) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  let queued = false;
  const observer = new MutationObserver(() => {
    if (stopped || queued || W.canEdit()) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      sync();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("pagehide", () => {
    stopped = true;
    observer.disconnect();
  });
  window.addEventListener("hashchange", sync);
  window.CejProWorkspacePermissions = { sync };
  sync();
})();
