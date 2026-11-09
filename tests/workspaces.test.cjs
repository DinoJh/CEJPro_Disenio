/* Ejecutar: node tests/workspaces.test.cjs (requiere jsdom disponible fuera del proyecto). */
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { JSDOM, VirtualConsole } = require(
  process.env.CEJPRO_JSDOM ||
    path.join(process.env.TEMP, "cejpro-ui-check", "node_modules", "jsdom"),
);
const root = path.resolve(__dirname, "..");
const activeKey = "cejpro.workspace.active.v1",
  previewKey = "cejpro.workspace.preview.v1";
let checks = 0;
function check(test, message) {
  assert.ok(test, message);
  checks++;
}
function boot(
  storage = {},
  active = "personal",
  role = "owner",
  hash = "inicio",
  mobile = false,
  session = {},
) {
  const errors = [],
    vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    if (!/Not implemented: navigation/.test(e.message)) errors.push(e);
  });
  const dom = new JSDOM(
    fs.readFileSync(path.join(root, "index.html"), "utf8"),
    {
      url: "http://localhost/#" + hash,
      runScripts: "outside-only",
      virtualConsole: vc,
    },
  );
  const w = dom.window,
    d = w.document;
  for (const [key, value] of Object.entries(storage))
    w.localStorage.setItem(key, value);
  w.sessionStorage.setItem(activeKey, active);
  for (const [key, value] of Object.entries(session))
    w.sessionStorage.setItem(key, value);
  if (role !== "owner")
    w.sessionStorage.setItem(
      previewKey,
      JSON.stringify({ workspaceId: active, role }),
    );
  w.matchMedia = () => ({ matches: mobile, addEventListener() {} });
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new w.Event("close"));
  };
  w.Range.prototype.getBoundingClientRect = () => ({
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
  });
  w.Range.prototype.getClientRects = () => [];
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.scrollTo = () => {};
  for (const script of d.querySelectorAll("script[src]"))
    w.eval(
      fs.readFileSync(path.join(root, script.getAttribute("src")), "utf8"),
    );
  function route(hash) {
    w.location.hash = hash;
    w.dispatchEvent(new w.HashChangeEvent("hashchange"));
    w.CejProWorkspacePermissions.sync();
    check(
      !errors.length,
      "No debe haber errores al navegar: " +
        errors.map((e) => e.message).join(),
    );
  }
  return {
    w,
    d,
    errors,
    route,
    snapshot: () =>
      Object.fromEntries(
        Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]),
      ),
    close: () =>
      new Promise((resolve) =>
        setTimeout(() => {
          w.dispatchEvent(new w.Event("pagehide"));
          w.close();
          resolve();
        }, 35),
      ),
  };
}
(async () => {
  let p = boot(),
    W = p.w.CejProWorkspaces;
  check(
    W.current().id === "personal",
    "El inicio conserva el espacio personal",
  );
  check(
    !p.d.querySelector('#primaryNav [href="#equipo"]'),
    "Equipo no debe aparecer en la navegación",
  );
  check(
    p.w.CejProCasesData.load().cases.length === 7,
    "Los expedientes anteriores se conservan",
  );
  const personal = p.w.CejProCasesData.load();
  personal.cases[0].note = "Nota personal anterior";
  p.w.CejProCasesData.save(personal);
  const identity = p.w.CejProIdentitiesData.save({
    alias: "Personal",
    documentType: "dni",
    documentNumber: "11111111",
    birthDate: "1990-01-01",
    digit: "123",
    issueDate: "2020-01-01",
  });
  check(identity.ok, "Identidad personal guardada");
  const a = W.create("Estudio Andina"),
    b = W.create("Área civil");
  check(a.ok && b.ok, "Crear dos espacios");
  check(!W.create(" estudio andina ").ok, "No duplicar nombres de espacios");
  const aid = a.space.id,
    bid = b.space.id,
    legacyCases = p.w.localStorage.getItem("cejpro.cases.v1");
  let storage = p.snapshot();
  await p.close();
  p = boot(storage, aid);
  W = p.w.CejProWorkspaces;
  check(
    p.w.CejProCasesData.load().cases.length === 0 &&
      p.w.CejProCasesData.load().folders.length === 0,
    "Espacio nuevo sin expedientes ni carpetas",
  );
  check(p.w.CejProCalendarData.load().length === 0, "Calendario nuevo vacío");
  check(p.w.CejProClientsData.load().length === 0, "Clientes nuevos vacíos");
  check(
    p.w.CejProIdentitiesData.load().length === 0,
    "Identidades nuevas vacías",
  );
  check(
    p.w.CejProWritingsData.load().length === 0 &&
      p.w.CejProUserTemplates.load().length === 0,
    "Borradores y plantillas personales aislados",
  );
  check(
    !p.w.CejProSinoeData.linkedAccount() &&
      p.w.CejProSinoeData.load().length === 0,
    "SINOE nuevo sin conexión ni avisos",
  );
  check(
    p.w.CejProSinoeData.seedExamples([]).length === 0,
    "No sembrar notificaciones ficticias en espacios nuevos",
  );
  check(
    p.w.CejProCaseFiles.list("case-demo-1").length === 0,
    "Documentos aislados",
  );
  for (const [route, selector] of [
    ["expedientes", "#casesEmpty"],
    ["identidades", "#identitiesModule .clients-empty"],
    ["clientes", "#clientsModule .clients-empty"],
    ["escritos", "#writingsModule .clients-empty"],
  ]) {
    p.route(route);
    const empty = p.d.querySelector(selector);
    check(
      empty && empty.querySelector(".icon svg"),
      "Estado vacío con icono en " + route,
    );
    check(
      empty.querySelectorAll("p").length === 1 &&
        !empty.querySelector("h2,h3,strong"),
      "Un solo mensaje sin título pesado en " + route,
    );
    if (["expedientes", "identidades"].includes(route))
      check(
        !p.d.querySelector("#expedientesMenu").classList.contains("active") &&
          p.d.querySelector(".nav-submenu .active")?.hash === "#" + route,
        "Solo la opción hija está seleccionada",
      );
  }
  p.route("expedientes");
  p.d.querySelector("#newCase").click();
  const form = p.d.querySelector("#caseForm");
  check(
    !form.elements.namedItem("status") && !p.d.querySelector("#caseStatus"),
    "Expedientes sin campo ni filtro de estado",
  );
  check(
    form.elements.namedItem("number").required &&
      !form.elements.namedItem("number").closest("details"),
    "Número obligatorio y visible fuera de adicionales",
  );
  check(
    p.d.querySelector("#caseNoteField").hidden &&
      form.elements.namedItem("note").disabled,
    "Nota oculta y deshabilitada al crear",
  );
  check(
    !p.d.querySelector("#caseDialog .cases-overline") &&
      !p.d.querySelector("#caseListDescription"),
    "Sin textos adicionales del archivo",
  );
  form.elements.namedItem("title").value = "Número vacío";
  form.elements.namedItem("number").value = "   ";
  form.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    !p.w.CejProCasesData.load().cases.length,
    "Rechazar número de expediente compuesto por espacios",
  );
  form.elements.namedItem("number").dispatchEvent(new p.w.Event("input"));
  form.elements.namedItem("title").value = "Expediente compartido";
  form.elements.namedItem("number").value = "00705-2025-0-2101-JR-CI-02";
  form.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  const c = p.w.CejProCasesData.load().cases[0];
  check(
    c?.title === "Expediente compartido",
    "Crear expediente desde formulario en espacio nuevo",
  );
  p.d.querySelector("[data-edit-case]").click();
  check(
    !p.d.querySelector("#caseNoteField").hidden &&
      !form.elements.namedItem("note").disabled,
    "Nota disponible al editar",
  );
  form.elements.namedItem("note").value = "Nota conservada del expediente";
  form.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    p.w.CejProCasesData.load().cases[0].note ===
      "Nota conservada del expediente",
    "Guardar nota desde edición",
  );
  check(
    !p.d.querySelector('#caseRows [data-label="Estado"]'),
    "Listado sin columna de estado",
  );
  p.w.CejProIdentities.openEditor();
  const identityForm = p.d.querySelector("#identityEditorForm");
  identityForm.elements.namedItem("documentType").value = "ce";
  p.d
    .querySelector("#identityDocumentType")
    .dispatchEvent(new p.w.Event("change"));
  check(
    p.d.querySelector("#identityNumberLabel").textContent ===
      "Número de carné de extranjería" &&
      identityForm.elements.namedItem("birthDate").required &&
      identityForm.elements.namedItem("issueDate").required &&
      !identityForm.elements.namedItem("issueDate").disabled,
    "Carné solicita su número y ambas fechas",
  );
  check(
    identityForm.elements.namedItem("digit").disabled,
    "Carné no solicita código de verificación del DNI",
  );
  const ceInput = {
    documentType: "ce",
    documentNumber: "123456789",
    birthDate: "1990-01-01",
    issueDate: "2020-01-01",
    alias: "Carné de prueba",
  };
  check(
    !p.w.CejProIdentitiesData.save({ ...ceInput, issueDate: "" }).ok,
    "Carné exige fecha de emisión al guardar",
  );
  const savedCe = p.w.CejProIdentitiesData.save(ceInput);
  check(
    savedCe.ok &&
      p.w.CejProIdentitiesData.get(savedCe.identity.id).issueDate ===
        "2020-01-01",
    "Persistir fecha de emisión del carné",
  );
  p.d.querySelector("#identityEditorDialog").close();

  p.w.CejProCaseFiles.add(c.id, "", [
    { name: "Archivo del espacio.pdf", size: 12, type: "application/pdf" },
  ]);
  p.w.CejProCaseDetailData.addFolder(c.id, "Documentos de Andina");
  p.w.CejProCalendarData.save([
    {
      id: "event-a",
      title: "Audiencia de Andina",
      type: "audiencia",
      date: "2026-11-02",
      time: "09:00",
      caseRef: c.number,
      caseId: c.id,
      client: "",
      location: "",
      notes: "",
      done: false,
    },
  ]);
  const draft = p.w.CejProWritingsData.create();
  draft.title = "Borrador de Andina";
  p.w.CejProWritingsData.save([draft]);
  p.w.CejProSinoeData.link("casilla-local");
  check(
    p.w.CejProSinoeData.seedExamples([]).length === 0,
    "Conectar SINOE tampoco crea ejemplos en espacio nuevo",
  );
  const invited = W.invite("COLEGA@example.com", "reader");
  check(
    invited.ok && invited.member.status === "pending",
    "Invitación local pendiente",
  );
  check(
    !W.invite("colega@example.com", "editor").ok,
    "Duplicados de correo bloqueados",
  );
  check(
    !W.invite("correo-invalido", "reader").ok &&
      !W.invite("otro@example.com", "owner").ok,
    "Validación de correo y rol",
  );
  check(W.updateMember(invited.member.id, "editor").ok, "Actualizar a editor");
  check(
    W.current().members.find((m) => m.id === invited.member.id).role ===
      "editor",
    "Rol nuevo persistido",
  );
  check(
    !W.removeMember("owner").ok && !W.updateMember("owner", "reader").ok,
    "No eliminar ni degradar propietario",
  );
  check(W.rename("Estudio Andina actualizado").ok, "Editar nombre de espacio");
  p.route("espacios");
  check(
    p.d
      .querySelector(".workspace-member-list")
      .textContent.includes("colega@example.com"),
    "Invitación visible en gestor",
  );
  check(
    p.d
      .querySelector(".workspace-member-list")
      .textContent.toLowerCase()
      .includes("pendiente de envío"),
    "Estado honesto de invitación",
  );
  check(
    [...p.d.querySelector("#accountMenu").children]
      .filter((el) => el.getAttribute("role") !== "separator")
      .map((el) => el.textContent.trim())
      .join("|") ===
      "Espacios de trabajo|Invitar a un amigo|Mi perfil|Personalizar|Configuración|Cerrar sesión",
    "Orden de las opciones de cuenta con cierre de sesión",
  );
  check(
    !p.d.querySelector("#workspaceInviteDialog").open,
    "Ventana de invitación cerrada inicialmente",
  );
  p.w.CejProWorkspacesUI.openInvite();
  check(
    p.d.querySelector("#workspaceInviteDialog").open,
    "Abrir invitaciones en ventana modal",
  );
  check(
    p.w.location.hash === "#espacios",
    "Abrir la ventana conserva la ruta actual",
  );
  const inviteForm = p.d.querySelector("#workspaceInviteForm");
  inviteForm.elements.namedItem("email").value = "nuevo@example.com";
  inviteForm.elements.namedItem("role").value = "editor";
  inviteForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    W.current().members.some(
      (m) => m.email === "nuevo@example.com" && m.role === "editor",
    ),
    "Invitar desde la fila de correo y rol",
  );
  check(
    p.d.querySelector("#workspaceInviteEmail").value === "",
    "Vaciar correo al guardar invitación",
  );
  check(
    p.d.querySelector("#workspaceInviteDialog").open,
    "Guardar conserva la ventana abierta para invitar a más personas",
  );
  const duplicate = p.d.querySelector("#workspaceInviteForm");
  duplicate.elements.namedItem("email").value = "nuevo@example.com";
  duplicate.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    !p.d.querySelector("#workspaceInviteError").hidden &&
      p.d.querySelector("#workspaceInviteDialog").open,
    "Duplicados muestran error dentro de la ventana",
  );
  const roleSelect = p.d.querySelector(
    "#workspaceInviteContent [data-workspace-role]",
  );
  const memberId = roleSelect.dataset.workspaceRole;
  roleSelect.value = "reader";
  roleSelect.dispatchEvent(new p.w.Event("change", { bubbles: true }));
  check(
    W.current().members.find((m) => m.id === memberId).role === "reader",
    "Cambiar rol desde la ventana",
  );
  p.d.querySelector('[data-workspace-close="workspaceInviteDialog"]').click();
  check(
    !p.d.querySelector("#workspaceInviteDialog").open,
    "Cerrar ventana de invitaciones",
  );
  p.d.querySelector("#workspaceSpacesTab").click();
  check(
    !p.d.querySelector("#workspaceSpacesPanel").hidden &&
      p.d.querySelector("#workspaceMembersPanel").hidden,
    "Pestaña Espacios muestra cuentas",
  );
  p.d.querySelector("#workspaceMembersTab").click();
  check(
    !p.d.querySelector("#workspaceMembersPanel").hidden,
    "Volver a Miembros",
  );
  p.d.querySelector("#accountButton").click();
  p.d.querySelector("#workspaceMenuButton").click();
  check(
    !p.d.querySelector("#workspaceSwitcher").hidden,
    "Abrir selector secundario",
  );
  p.d.dispatchEvent(
    new p.w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  check(
    p.d.querySelector("#workspaceSwitcher").hidden &&
      !p.d.querySelector("#accountMenu").hidden,
    "Escape cierra solo el panel secundario",
  );
  p.d.querySelector("#workspaceMenuButton").click();
  p.d
    .querySelector("main")
    .dispatchEvent(new p.w.MouseEvent("click", { bubbles: true }));
  check(
    p.d.querySelector("#workspaceSwitcher").hidden &&
      p.d.querySelector("#accountMenu").hidden,
    "Clic fuera cierra ambos paneles",
  );
  p.d.querySelector("#accountButton").click();
  p.d.querySelector("#inviteWorkspaceMenu").click();
  check(
    p.d.querySelector("#workspaceInviteDialog").open &&
      p.d.activeElement.id === "workspaceInviteEmail",
    "Invitar abre la ventana y enfoca el correo",
  );
  p.d.querySelector('[data-workspace-close="workspaceInviteDialog"]').click();
  p.route("inicio");
  await new Promise((resolve) => setTimeout(resolve, 20));
  p.d.querySelector("#accountButton").click();
  p.d.querySelector("#inviteWorkspaceMenu").click();
  await new Promise((resolve) => setTimeout(resolve, 20));
  check(
    p.w.location.hash === "#inicio" &&
      p.d.querySelector("#workspaceInviteDialog").open &&
      p.d.activeElement.id === "workspaceInviteEmail",
    "Invitar desde Inicio abre ventana sin abandonar Inicio",
  );
  p.d.querySelector('[data-workspace-close="workspaceInviteDialog"]').click();
  check(
    p.d.activeElement.id === "accountButton",
    "Cerrar devuelve el foco a la cuenta: " + p.d.activeElement.id,
  );

  const extra = W.invite("extra@example.com", "reader");
  check(W.removeMember(extra.member.id).ok, "Cancelar invitación");
  check(
    p.w.localStorage.getItem("cejpro.cases.v1") === legacyCases,
    "Los datos personales permanecen intactos",
  );
  check(W.activate(bid).ok, "Cambiar de espacio");
  check(
    p.w.sessionStorage.getItem(activeKey) === bid,
    "Elección persistida por pestaña",
  );
  p.w.CejProStorage.setItem("test.delayed", "guardado anterior");
  check(
    p.w.localStorage.getItem(W.scopeKey("test.delayed")) ===
      "guardado anterior",
    "Guardado pendiente permanece en el ámbito original",
  );
  storage = p.snapshot();
  await p.close();
  p = boot(storage, bid);
  check(
    p.w.CejProCasesData.load().cases.length === 0 &&
      p.w.CejProCalendarData.load().length === 0 &&
      p.w.CejProWritingsData.load().length === 0,
    "Segundo espacio independiente",
  );
  check(
    !p.w.CejProSinoeData.linkedAccount(),
    "La conexión SINOE no se comparte entre espacios",
  );
  await p.close();
  p = boot(storage, "personal");
  check(
    p.w.CejProCasesData.load().cases[0].note === "Nota personal anterior",
    "Volver conserva notas personales",
  );
  check(
    p.w.CejProIdentitiesData.load().length === 1,
    "Volver conserva identidad personal",
  );
  await p.close();
  p = boot(storage, aid, "reader", "expedientes");
  W = p.w.CejProWorkspaces;
  p.w.CejProWorkspacePermissions.sync();
  check(!W.canEdit() && !W.canManage(), "Lector sin edición ni administración");
  check(
    p.d.querySelector("#newCase").disabled,
    "Botón de alta deshabilitado para lector",
  );
  check(
    !p.d.querySelector("#caseClientFilter").disabled,
    "Lector puede usar filtros",
  );
  check(
    p.w.CejProCasesData.load().cases[0].id === c.id,
    "Lector puede consultar expedientes existentes",
  );
  check(
    !p.w.CejProCasesData.save({ cases: [], folders: [] }) &&
      p.w.CejProCasesData.load().cases.length === 1,
    "Lector no puede persistir cambios de expedientes",
  );
  check(
    !p.w.CejProCaseFiles.add(c.id, "", [
      { name: "No.pdf", size: 0, type: "application/pdf" },
    ]) && p.w.CejProCaseFiles.list(c.id).length === 1,
    "Lector no puede subir archivos ni cambiar memoria",
  );
  check(
    !p.w.CejProCaseDetailData.addFolder(c.id, "No permitida").ok,
    "Lector no crea carpetas",
  );
  check(
    !p.w.CejProCalendarData.save([]) &&
      p.w.CejProCalendarData.load().length === 1,
    "Lector no modifica calendario",
  );
  check(
    !p.w.CejProReceivedPayments.save("cliente", {}).ok,
    "Lector no modifica pagos",
  );
  check(
    !p.w.CejProSinoeData.link("otra-casilla") &&
      p.w.CejProSinoeData.linkedAccount() === "casilla-local",
    "Lector no modifica conexión",
  );
  check(
    !W.invite("no@example.com", "editor").ok && !W.rename("No").ok,
    "Lector no administra miembros",
  );
  for (const hash of [
    "identidades",
    "clientes",
    "sinoe",
    "calendario",
    "espacios",
    "escritos/" + draft.id,
  ])
    p.route(hash);
  check(
    p.d.querySelector(".ql-editor").getAttribute("contenteditable") === "false",
    "Escrito de solo lectura",
  );
  check(
    p.d.querySelector("#writingSave").disabled &&
      p.d.querySelector("#writingTitle").disabled,
    "Campos de escrito bloqueados",
  );
  check(
    p.d.querySelector("#createWorkspaceMenu") &&
      !p.d.querySelector("#inviteWorkspaceMenu").hidden,
    "Accesos de añadir e invitar visibles en la prueba de lector",
  );
  check(
    p.d.querySelector(".workspace-role-banner"),
    "Vista de rol identificada",
  );
  check(!p.errors.length, "Lector sin errores de ejecución");
  await p.close();
  p = boot(storage, aid, "editor", "expedientes");
  W = p.w.CejProWorkspaces;
  check(
    W.canEdit() && !W.canManage() && !p.d.querySelector("#newCase").disabled,
    "Editor puede editar",
  );
  check(!W.invite("no@example.com", "reader").ok, "Editor no invita miembros");
  check(
    p.w.CejProCaseFiles.list(c.id).length === 1 &&
      p.w.CejProCalendarData.load().length === 1,
    "Persistencia de documentos y calendario",
  );
  p.route("escritos/" + draft.id);
  const title = p.d.querySelector("#writingTitle");
  title.value = "Cambio pendiente de autoguardado";
  title.dispatchEvent(new p.w.Event("input", { bubbles: true }));
  check(W.activate(bid).ok, "Cambiar con borrador pendiente");
  check(
    JSON.parse(p.w.localStorage.getItem(W.scopeKey("cejpro.writings.v1")))[0]
      .title === "Cambio pendiente de autoguardado",
    "Cambio de espacio guarda el borrador en su ámbito",
  );
  await p.close();
  for (const theme of ["elegante", "claro", "oscuro"]) {
    p = boot(
      { ...storage, "cejpro.theme": theme },
      aid,
      "owner",
      "espacios",
      true,
    );
    check(
      p.d.documentElement.dataset.theme === theme,
      "Tema conservado " + theme,
    );
    p.d.querySelector("#accountButton").click();
    check(
      !p.d.querySelector("#accountMenu").hidden,
      "Menú disponible en escenario móvil",
    );
    check(
      p.d.querySelector("#workspaceSwitcher").hidden,
      "Selector cerrado inicialmente",
    );
    p.d.querySelector("#workspaceMenuButton").click();
    check(
      !p.d.querySelector("#workspaceSwitcher").hidden,
      "Selector abierto al pulsar Espacios",
    );
    check(
      p.d.querySelectorAll("#workspaceSwitcher [data-switch-workspace]")
        .length === 3,
      "Los tres espacios están disponibles",
    );
    await p.close();
  }
  p = boot(storage, aid, "owner", "equipo");
  check(
    p.w.location.hash === "#espacios",
    "Ruta anterior redirige al nuevo gestor",
  );
  await p.close();
  p = boot(storage, aid);
  W = p.w.CejProWorkspaces;
  const originalSet = p.w.Storage.prototype.setItem;
  p.w.Storage.prototype.setItem = function (key, value) {
    if (key === "cejpro.workspaces.v1")
      throw new p.w.DOMException("Sin espacio", "QuotaExceededError");
    return originalSet.call(this, key, value);
  };
  check(
    !W.create("No guardado").ok && !W.invite("fallo@example.com", "reader").ok,
    "Fallo de almacenamiento informado",
  );
  check(
    !W.all().some((s) => s.name === "No guardado") &&
      !W.current().members.some((m) => m.email === "fallo@example.com"),
    "Sin registros fantasma al fallar",
  );
  p.w.Storage.prototype.setItem = originalSet;
  await p.close();
  p = boot(storage, aid);
  W = p.w.CejProWorkspaces;
  p.w.CejProWritings.flush = () => false;
  check(
    !W.activate(bid).ok && p.w.sessionStorage.getItem(activeKey) === aid,
    "No cambiar con borrador que no se pudo guardar",
  );
  await p.close();
  p = boot(storage, aid, "owner", "calendario");
  check(
    p.d.querySelector("#selectedDate").textContent === "Hoy en tu agenda",
    "Un único título para la agenda de hoy",
  );
  check(
    !p.d.querySelector("#dayOverline") &&
      !p.d.querySelector(".cal-next .cal-overline"),
    "Sin rótulos repetidos en paneles laterales",
  );
  const date = p.d.querySelector('.cal-date:not([aria-pressed="true"])');
  date.click();
  check(
    p.d.querySelector("#selectedDate").textContent === "Agenda del día",
    "Seleccionar otra fecha conserva un título correcto",
  );
  check(
    p.d.querySelector("#calendarContents .cal-grid"),
    "Cuadrícula dentro de su tarjeta",
  );
  await p.close();
  p = boot(storage, aid, "owner", "calendario");
  const knownClient = {
    id: "client-select-test",
    name: "Cliente registrado",
    type: "person",
    document: "",
    phone: "",
    email: "",
    notes: "",
    caseIds: [c.id],
  };
  p.w.CejProClientsData.save([knownClient]);
  p.d.querySelector("#addEvent").click();
  let eventForm = p.d.querySelector("#eventForm");
  p.w.CejProFormLabels.sync();
  check(
    eventForm.elements
      .namedItem("title")
      .closest("label")
      .querySelector(".form-required"),
    "Asterisco en título obligatorio",
  );
  check(
    !eventForm.elements
      .namedItem("caseId")
      .closest("label")
      .querySelector(".form-required"),
    "Sin asterisco en expediente opcional",
  );
  check(
    !/opcional/i.test(eventForm.textContent),
    "Etiquetas sin la palabra opcional",
  );
  check(
    eventForm.elements.namedItem("caseId").tagName === "SELECT" &&
      eventForm.elements.namedItem("clientId").tagName === "SELECT",
    "Selectores de expediente y cliente",
  );
  check(
    [...eventForm.elements.namedItem("caseId").options].some(
      (o) => o.value === c.id,
    ) &&
      [...eventForm.elements.namedItem("clientId").options].some(
        (o) => o.value === knownClient.id,
      ),
    "Opciones del espacio actual",
  );
  eventForm.elements.namedItem("title").value = "Evento con vínculos";
  eventForm.elements.namedItem("date").value = "2026-11-05";
  eventForm.elements.namedItem("caseId").value = c.id;
  eventForm.elements.namedItem("clientId").value = knownClient.id;
  eventForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  let savedEvent = p.w.CejProCalendarData.load().find(
    (e) => e.title === "Evento con vínculos",
  );
  check(
    savedEvent.caseId === c.id &&
      savedEvent.clientId === knownClient.id &&
      savedEvent.client === knownClient.name,
    "Guardar vínculos reales y referencias",
  );
  p.route("calendario/evento/" + savedEvent.id);
  eventForm = p.d.querySelector("#eventForm");
  check(
    eventForm.elements.namedItem("caseId").value === c.id &&
      eventForm.elements.namedItem("clientId").value === knownClient.id,
    "Restaurar selección al editar",
  );
  eventForm.elements.namedItem("caseId").value = "";
  eventForm.elements.namedItem("clientId").value = "";
  eventForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  savedEvent = p.w.CejProCalendarData.load().find(
    (e) => e.id === savedEvent.id,
  );
  check(
    !savedEvent.caseId &&
      !savedEvent.clientId &&
      !savedEvent.caseRef &&
      !savedEvent.client,
    "Quitar vínculos opcionales",
  );
  const legacy = {
    ...savedEvent,
    id: "legacy-choice",
    title: "Anterior",
    caseRef: "Referencia antigua",
    client: "Cliente anterior",
  };
  delete legacy.clientId;
  delete legacy.caseId;
  p.w.CejProCalendarData.save([...p.w.CejProCalendarData.load(), legacy]);
  p.route("calendario/evento/legacy-choice");
  eventForm = p.d.querySelector("#eventForm");
  eventForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    p.w.CejProCalendarData.load().find((e) => e.id === legacy.id).client ===
      "Cliente anterior",
    "Conservar datos anteriores sin coincidencia",
  );
  await p.close();
  p = boot(storage, bid, "owner", "sinoe");
  p.w.CejProFormLabels.sync();
  const password = p.d.querySelector("#sinoePassword"),
    toggle = p.d.querySelector("#toggleSinoePassword");
  password.value = "clave-de-prueba";
  check(
    toggle.querySelector("svg") && !toggle.textContent.trim(),
    "Ojo en lugar de texto",
  );
  toggle.click();
  check(
    password.type === "text" &&
      toggle.getAttribute("aria-label") === "Ocultar contraseña" &&
      toggle.getAttribute("aria-pressed") === "true",
    "Mostrar contraseña",
  );
  toggle.click();
  check(
    password.type === "password" &&
      password.value === "clave-de-prueba" &&
      toggle.getAttribute("aria-pressed") === "false",
    "Ocultar conservando el valor",
  );
  check(
    password
      .closest("label")
      .querySelector(".form-field-caption .form-required") &&
      !password.closest(".form-field-caption"),
    "Asterisco junto a la etiqueta del campo compuesto",
  );
  await p.close();
  const ownerActionKey = "cejpro.workspace.ownerAction.v1";
  for (const action of ["create", "invite"]) {
    p = boot(storage, "personal", "reader");
    const oldCount = p.w.CejProWorkspaces.all().length;
    if (action === "create") {
      p.d.querySelector("#accountButton").click();
      p.d.querySelector("#workspaceMenuButton").click();
      check(
        p.d
          .querySelector("#createWorkspaceMenu")
          .textContent.includes("Añadir espacio de trabajo"),
        "Etiqueta Añadir al final del panel",
      );
      p.d.querySelector("#createWorkspaceMenu").click();
    } else {
      p.d.querySelector("#accountButton").click();
      p.d.querySelector("#inviteWorkspaceMenu").click();
    }
    const pending = p.w.sessionStorage.getItem(ownerActionKey);
    check(
      JSON.parse(pending).action === action,
      "Continuar la acción después de salir de la prueba",
    );
    check(
      !p.w.sessionStorage.getItem(previewKey),
      "La vista de prueba se desactiva antes de continuar",
    );
    check(
      p.w.CejProWorkspaces.all().length === oldCount &&
        !p.w.CejProWorkspaces.canManage(),
      "Sin crear ni elevar permisos dentro de la prueba",
    );
    await p.close();
    p = boot(storage, "personal", "owner", "inicio", false, {
      [ownerActionKey]: pending,
    });
    await new Promise((resolve) => setTimeout(resolve, 25));
    check(
      action === "create"
        ? p.d.querySelector("#workspaceNameDialog").open
        : p.d.querySelector("#workspaceInviteDialog").open &&
            p.w.location.hash === "#inicio",
      "La vista propietaria retoma el formulario correcto",
    );
    check(
      !p.w.sessionStorage.getItem(ownerActionKey),
      "La acción pendiente se consume una sola vez",
    );
    await p.close();
  }
  p = boot(storage, "personal", "owner", "escritos");
  const draftCount = p.w.CejProWritingsData.load().length;
  check(
    !p.d.querySelector("#listWritingTemplates") &&
      !p.d.querySelector("#writingCaseFilter"),
    "Listado simple sin botón Plantillas ni filtro de vinculación",
  );
  p.d.querySelector("#newWriting").click();
  check(
    p.d.querySelector("#writingTemplatesDialog").open &&
      p.w.CejProWritingsData.load().length === draftCount,
    "Nuevo borrador abre plantillas sin crear documento vacío",
  );
  check(
    !p.d.querySelector("#writingTemplateCase"),
    "Catálogo sin vinculación con expedientes",
  );
  p.d
    .querySelector("#writingTemplateForm")
    .dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  const templateDraft = p.w.CejProWritingsData.load()[0];
  check(
    templateDraft.content.trim().length > 0 && !templateDraft.caseId,
    "Crear borrador con contenido de plantilla",
  );
  p.route("escritos/" + templateDraft.id);
  check(
    p.d.querySelector("#writingTitle") &&
      !p.d.querySelector("#writingFillFields") &&
      p.d.querySelector("#writingSaveAsTemplate"),
    "Acciones principales del panel derecho",
  );
  check(
    !p.d.querySelector("#writingCase") &&
      !p.d.querySelector("#writingDraftPicker") &&
      !p.d.querySelector("#writingKind") &&
      !p.d.querySelector("#writingStatus") &&
      !p.d.querySelector("#writingDownload"),
    "Panel sin controles secundarios redundantes",
  );
  check(
    !p.d.querySelector("#editorDeleteWriting").closest("details") &&
      !p.d.querySelector("#writingTemplates"),
    "Eliminar visible y sin Nuevo borrador en el editor",
  );
  check(
    p.d.querySelector("#writingSave") && p.d.querySelector("#writingPrint"),
    "Conservar guardado y PDF",
  );
  let printCalls = 0;
  p.w.print = () => {
    printCalls++;
    check(
      p.d.querySelector("#writingPrintArea").textContent.trim().length > 0,
      "PDF prepara el contenido para imprimir",
    );
  };
  p.d.querySelector("#writingPrint").click();
  check(
    printCalls === 1 && !p.d.querySelector("#writingPdfDialog"),
    "PDF abre impresión directamente",
  );
  check(
    !p.d.body.classList.contains("writing-print"),
    "La impresión devuelve el editor",
  );
  const firstDraftTitle = p.d.querySelector("#writingTitle").value;
  p.route("escritos");
  p.d.querySelector("#newWriting").click();
  p.d
    .querySelector("#writingTemplateForm")
    .dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  await new Promise((r) => setTimeout(r, 20));
  const numbered = p.w.CejProWritingsData.load().find(
    (x) => x.title === firstDraftTitle + " 2",
  );
  check(!!numbered, "Plantilla repetida crea borrador con sufijo 2");
  p.route("escritos");
  p.d.querySelector("#newWriting").click();
  p.d
    .querySelector("#writingTemplateForm")
    .dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  await new Promise((r) => setTimeout(r, 20));
  check(
    p.w.CejProWritingsData.load().some(
      (x) => x.title === firstDraftTitle + " 3",
    ),
    "Siguiente borrador conserva los anteriores y usa sufijo 3",
  );
  await p.close();
  p = boot(storage, "personal", "owner", "cobros");
  const billingClient = p.w.CejProClientsData.load().find(
      (c) => c.caseIds.length,
    ),
    billingCaseId = billingClient.caseIds[0],
    billing = p.w.CejProBillingData;
  const chargeA = {
    id: "legacy-charge",
    clientId: billingClient.id,
    concept: "Servicio anterior",
    currency: "PEN",
    amount: 100000,
    date: "2020-01-01",
    dueDate: "2020-01-10",
    caseId: billingCaseId,
    payments: [
      {
        id: "legacy-payment",
        amount: 20000,
        date: "2020-01-02",
        method: "Transferencia",
        reference: "Abono anterior",
      },
    ],
  };
  p.w.CejProStorage.setItem("cejpro.billing.v1", JSON.stringify([chargeA]));
  billing.reload();
  check(
    billing.list(billingClient.id).length === 1,
    "Conservar pagos almacenados anteriormente",
  );
  p.route("cobros/" + billingClient.id);
  check(!p.d.querySelector("#ledgerNewCharge"), "Sin botón Registrar cobro");
  check(
    p.d
      .querySelector(".collection-client-id")
      .textContent.startsWith("Cliente "),
    "Identificador sin documento en encabezado",
  );
  p.d.querySelector("#ledgerNewPayment").click();
  let paymentForm = p.d.querySelector("#ledgerPaymentForm");
  check(
    paymentForm.elements.namedItem("conceptType").value === "other" &&
      paymentForm.elements.namedItem("method").value === "Efectivo",
    "Otro y efectivo predeterminados",
  );
  check(
    !paymentForm.elements.namedItem("customConcept").required &&
      !p.d.querySelector("#ledgerCustomConceptField").hidden,
    "Otro muestra motivo opcional",
  );
  check(
    !p.d.querySelector("#ledgerPaymentAdditional").open &&
      paymentForm.elements.namedItem("date").value === billing.today() &&
      paymentForm.elements.namedItem("date").closest("details"),
    "Fecha actual dentro de Adicionales cerrado",
  );
  check(
    !paymentForm.elements.namedItem("notes").required &&
      paymentForm.elements.namedItem("notes").closest("details"),
    "Notas no obligatorias en Adicionales",
  );
  paymentForm.elements.namedItem("amount").value = "300";
  paymentForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    p.w.CejProReceivedPayments.list(billingClient.id)[0]?.concept === "Otro",
    "Guardar pago sin motivo",
  );
  p.d.querySelector('[data-ledger-edit][data-kind="received"]').click();
  paymentForm = p.d.querySelector("#ledgerPaymentForm");
  paymentForm.elements.namedItem("customConcept").value =
    "Honorarios recibidos";
  paymentForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  let direct = p.w.CejProReceivedPayments.list(billingClient.id)[0];
  check(
    direct?.amount === 30000 &&
      direct.caseId === "" &&
      direct.method === "Efectivo",
    "Pago directo sin deuda ni expediente",
  );
  check(
    p.w.CejProBillingData.list(billingClient.id).length === 1,
    "Pago directo no crea cobro fantasma",
  );
  check(
    p.d.querySelector('[data-movement="received"] .ledger-credit'),
    "Pago directo en verde",
  );
  p.d.querySelector('[data-ledger-edit][data-kind="received"]').click();
  paymentForm = p.d.querySelector("#ledgerPaymentForm");
  paymentForm.elements.namedItem("amount").value = "350";
  paymentForm.elements.namedItem("notes").value = "Canceló en oficina";
  paymentForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    p.w.CejProReceivedPayments.list(billingClient.id)[0].amount === 35000 &&
      p.d
        .querySelector(".ledger-table")
        .textContent.includes("Canceló en oficina"),
    "Editar pago y mostrar notas",
  );
  p.d.querySelector("#ledgerNewPayment").click();
  paymentForm = p.d.querySelector("#ledgerPaymentForm");
  paymentForm.elements.namedItem("conceptType").value = "Cobro de honorarios";
  paymentForm.elements
    .namedItem("conceptType")
    .dispatchEvent(new p.w.Event("change"));
  check(
    p.d.querySelector("#ledgerCustomConceptField").hidden &&
      !paymentForm.elements.namedItem("customConcept").required,
    "Concepto habitual no exige motivo libre",
  );
  paymentForm.elements.namedItem("amount").value = "50";
  paymentForm.elements.namedItem("currency").value = "USD";
  paymentForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    p.w.CejProReceivedPayments.list(billingClient.id).length === 2 &&
      p.d
        .querySelector(".collection-ledger-summary")
        .textContent.includes("US$ 50.00"),
    "Pago USD separado de soles",
  );
  p.d.querySelector("#ledgerConceptFilter").value = "Cobro de honorarios";
  p.d
    .querySelector("#ledgerConceptFilter")
    .dispatchEvent(new p.w.Event("change"));
  check(
    p.d.querySelectorAll(".ledger-table tbody tr").length === 1,
    "Filtro de concepto incluye pagos directos",
  );
  p.d.querySelector("#ledgerConceptFilter").value = "all";
  p.d
    .querySelector("#ledgerConceptFilter")
    .dispatchEvent(new p.w.Event("change"));
  p.route("cobros/" + billingClient.id + "/" + billingCaseId);
  check(
    !p.d.querySelector('[data-movement="charge"]') &&
      p.d.querySelector('[data-movement="payment"]') &&
      !p.d
        .querySelector(".collection-ledger-summary")
        .textContent.includes("Por cobrar"),
    "Solo pagos recibidos, incluidos los anteriores",
  );
  p.d.querySelector('[data-ledger-edit][data-kind="payment"]').click();
  paymentForm = p.d.querySelector("#ledgerPaymentForm");
  paymentForm.elements.namedItem("amount").value = "250";
  paymentForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    billing.paid(billing.list(billingClient.id)[0]) === 25000,
    "Editar pago anterior conserva relación",
  );
  p.d.querySelector("#ledgerNewPayment").click();
  paymentForm = p.d.querySelector("#ledgerPaymentForm");
  paymentForm.elements.namedItem("customConcept").value = "Audiencia";
  paymentForm.elements.namedItem("amount").value = "100";
  paymentForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    p.w.CejProReceivedPayments.list(billingClient.id).some(
      (x) => x.caseId === billingCaseId,
    ),
    "Pago directo pertenece al expediente seleccionado",
  );
  p.d.querySelector('[data-ledger-delete][data-kind="received"]').click();
  p.d
    .querySelector("#ledgerDeleteForm")
    .dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    !p.w.CejProReceivedPayments.list(billingClient.id).some(
      (x) => x.caseId === billingCaseId,
    ) && billing.list(billingClient.id)[0].payments.length === 1,
    "Eliminar pago directo sin alterar pagos anteriores",
  );
  const noCaseClient = {
      id: "client-without-case",
      name: "Mamani",
      type: "person",
      document: "",
      phone: "",
      email: "",
      notes: "",
      caseIds: [],
    },
    sameName = {
      ...noCaseClient,
      id: "client-same-name",
      document: "12345678",
    },
    sameNameNoDoc = { ...noCaseClient, id: "client-same-name-no-doc" };
  p.w.CejProClientsData.save([
    ...p.w.CejProClientsData.load(),
    noCaseClient,
    sameName,
    sameNameNoDoc,
  ]);
  p.route("cobros");
  const named = p.w.CejProClientsData.load().filter((c) => c.name === "Mamani");
  check(
    new Set(named.map((c) => p.w.CejProClientsData.identifier(c))).size === 3,
    "Mismo nombre con documento o códigos diferentes",
  );
  const originalCode = p.w.CejProClientsData.load().find(
    (c) => c.id === noCaseClient.id,
  ).code;
  p.w.CejProClientsData.save(p.w.CejProClientsData.load().reverse());
  check(
    p.w.CejProClientsData.load().find((c) => c.id === noCaseClient.id).code ===
      originalCode,
    "Código estable al reordenar clientes",
  );
  p.route("cobros/" + noCaseClient.id);
  p.d.querySelector("#ledgerNewPayment").click();
  paymentForm = p.d.querySelector("#ledgerPaymentForm");
  paymentForm.elements.namedItem("customConcept").value = "Consulta";
  paymentForm.elements.namedItem("amount").value = "80";
  paymentForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    p.w.CejProReceivedPayments.list(noCaseClient.id)[0]?.caseId === "",
    "Cliente sin casos registra pago directamente",
  );
  const collectionStorage = p.snapshot();
  await p.close();
  p = boot(
    collectionStorage,
    "personal",
    "reader",
    "cobros/" + billingClient.id,
  );
  p.w.CejProWorkspacePermissions.sync();
  check(
    p.d.querySelector("#ledgerNewPayment").disabled &&
      p.d.querySelector("[data-ledger-edit]").disabled,
    "Lector no registra ni edita pagos",
  );
  check(
    !p.w.CejProReceivedPayments.remove(billingClient.id, direct.id).ok,
    "Lector no elimina pagos por API local",
  );
  check(
    p.w.CejProReceivedPayments.list(billingClient.id).some(
      (x) => x.id === direct.id && x.amount === 35000,
    ),
    "Persistencia de pagos directos",
  );
  await p.close();
  p = boot(collectionStorage, bid, "owner", "cobros", true);
  check(
    !p.d.querySelector(".collection-client-card") &&
      p.d.querySelector(".clients-empty .icon"),
    "Aislamiento entre espacios",
  );
  await p.close();
  for (const theme of ["elegante", "claro", "oscuro"]) {
    p = boot(
      collectionStorage,
      "personal",
      "owner",
      "cobros/" + billingClient.id,
      true,
    );
    p.d.documentElement.dataset.theme = theme;
    check(
      p.d.querySelector(".collection-case-sidebar") &&
        p.d.querySelector(".ledger-table"),
      "Disponible en móvil y tema " + theme,
    );
    await p.close();
  }
  p = boot(collectionStorage, "personal", "owner", "clientes");
  p.d.querySelector("#newClient").click();
  let clientForm = p.d.querySelector("#clientForm");
  check(
    p.d.querySelector("#clientNoteField").hidden &&
      clientForm.elements.namedItem("notes").disabled,
    "Nuevo cliente sin campo de nota",
  );
  check(
    !p.d.querySelector("#clientAdditional").open &&
      clientForm.elements.namedItem("type").closest("#clientAdditional") &&
      p.d.querySelector("#clientCaseOptions").closest("#clientAdditional"),
    "Tipo de cliente y casos dentro de Adicionales cerrado",
  );
  clientForm.elements.namedItem("name").value = "Cliente de una columna";
  clientForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  const oneColumnClient = p.w.CejProClientsData.load().find(
    (c) => c.name === "Cliente de una columna",
  );
  check(
    oneColumnClient?.notes === "" && oneColumnClient.type === "person",
    "Crear sin nota guarda datos válidos",
  );
  p.route("clientes/" + oneColumnClient.id);
  p.d.querySelector("#editClient").click();
  clientForm = p.d.querySelector("#clientForm");
  check(
    !p.d.querySelector("#clientNoteField").hidden &&
      !clientForm.elements.namedItem("notes").disabled,
    "Nota visible al editar cliente",
  );
  clientForm.elements.namedItem("notes").value = "Nota importante del cliente";
  clientForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    p.w.CejProClientsData.load().find((c) => c.id === oneColumnClient.id)
      .notes === "Nota importante del cliente",
    "Editar conserva y guarda nota",
  );
  await p.close();
  p = boot(collectionStorage, "personal", "owner", "cobros/" + noCaseClient.id);
  p.d.querySelector("#ledgerAddCase").click();
  check(
    p.d.querySelector("#ledgerCaseDialog").open,
    "Agregar expediente desde Cobros",
  );
  p.d.querySelector("#ledgerCaseSelect").value = billingCaseId;
  p.d
    .querySelector("#ledgerCaseForm")
    .dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  check(
    p.w.CejProClientsData.load()
      .find((c) => c.id === noCaseClient.id)
      .caseIds.includes(billingCaseId) &&
      p.d
        .querySelector(".collection-case-link[aria-current]")
        .href.includes(encodeURIComponent(billingCaseId)),
    "Vincular expediente existente y seleccionarlo",
  );
  p.d.querySelector("#ledgerAddCase").click();
  check(
    ![...p.d.querySelector("#ledgerCaseSelect").options].some(
      (o) => o.value === billingCaseId,
    ),
    "No ofrecer vínculos duplicados",
  );
  p.d.querySelector("#ledgerCreateCase").click();
  check(
    p.d.querySelector("#caseDialog").open &&
      p.d.querySelector("#caseDialog").parentElement === p.d.body,
    "Crear expediente abre formulario visible fuera del módulo oculto",
  );
  const newCaseForm = p.d.querySelector("#caseForm");
  newCaseForm.elements.namedItem("number").value = "00999-2026-0-2101-JR-CI-01";
  newCaseForm.elements.namedItem("title").value = "Expediente desde Cobros";
  newCaseForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  const fromBilling = p.w.CejProCasesData.load().cases.find(
    (c) => c.number === "00999-2026-0-2101-JR-CI-01",
  );
  check(
    fromBilling &&
      p.w.CejProClientsData.load()
        .find((c) => c.id === noCaseClient.id)
        .caseIds.includes(fromBilling.id),
    "Nuevo expediente se guarda y asocia al cliente",
  );
  check(
    p.w.location.hash.includes(encodeURIComponent(fromBilling.id)) &&
      p.d
        .querySelector(".collection-case-link[aria-current]")
        .textContent.includes("Expediente desde Cobros"),
    "Volver a Cobros con el expediente nuevo seleccionado",
  );
  p.route("clientes/" + noCaseClient.id);
  check(
    p.d
      .querySelector(".client-related")
      .textContent.includes("Expediente desde Cobros"),
    "Ficha de cliente refleja nuevas asociaciones",
  );
  p.route("expedientes");
  check(
    p.d
      .querySelector("#caseRows")
      .textContent.includes("Expediente desde Cobros"),
    "Expediente disponible en Mis expedientes",
  );
  await p.close();
  p = boot(
    collectionStorage,
    "personal",
    "reader",
    "cobros/" + billingClient.id,
  );
  p.w.CejProWorkspacePermissions.sync();
  check(
    p.d.querySelector("#ledgerAddCase").disabled,
    "Lector no vincula ni crea expedientes",
  );
  await p.close();
  p = boot(collectionStorage, "personal", "owner", "perfil");
  check(
    !p.d.querySelector("#profileModule").hidden &&
      !p.d.querySelector(".workspace-canvas"),
    "Mi perfil sustituye pantalla vacía",
  );
  let profileForm = p.d.querySelector("#profileForm");
  p.w.CejProFormLabels.sync();
  check(
    profileForm.querySelector('[name="firstName"]').required &&
      profileForm.querySelector(".form-required"),
    "Nombre de perfil obligatorio con indicador",
  );
  profileForm.elements.namedItem("firstName").value = "   ";
  profileForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    p.d.querySelector("#profileFeedback").getAttribute("role") === "alert",
    "Validar nombre vacío en perfil",
  );
  p.w.CejProAccountData.saveProfile({
    name: "Anterior",
    email: "ana@example.com",
    phone: "",
    registration: "",
  });
  profileForm.elements.namedItem("firstName").value = "Ana";
  profileForm.elements.namedItem("lastName").value = "López";
  check(
    !profileForm.elements.namedItem("email"),
    "Correo de Google sin campo de contacto duplicado",
  );
  profileForm.elements.namedItem("phone").value = "987654321";
  check(
    !profileForm.elements.namedItem("registration") &&
      p.d.querySelector(".profile-google-account"),
    "Perfil sin colegiatura y con acceso Google previsto",
  );
  profileForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    p.w.CejProAccountData.loadProfile().name === "Ana López" &&
      p.d.querySelector("#profileAvatar").textContent === "AL",
    "Guardar perfil y mostrar iniciales",
  );
  check(
    !p.w.CejProAccountData.saveProfile({ name: "Prueba", email: "mal-correo" })
      .ok && p.w.CejProAccountData.loadProfile().email === "ana@example.com",
    "Rechazar correo inválido sin perder perfil",
  );
  p.route("configuracion");
  check(
    !p.d.querySelector("#settingsModule").hidden &&
      p.d.querySelector('#settingsModule [href="#personalizar"]') &&
      p.d.querySelector('#settingsModule [href="#espacios"]'),
    "Configuración reutiliza apariencia y espacios",
  );
  p.d.querySelector("#preferencesForm select").value = "calendario";
  p.d
    .querySelector("#preferencesForm")
    .dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    p.w.CejProAccountData.loadPreferences().startPage === "calendario",
    "Guardar página de inicio",
  );
  check(
    !p.w.CejProAccountData.savePreferences({ startPage: "invalid" }).ok,
    "Página de inicio limitada a rutas existentes",
  );
  p.route("soporte");
  const whatsapp = p.d.querySelector("#supportWhatsApp");
  check(
    !whatsapp.hasAttribute("href") &&
      whatsapp.getAttribute("aria-disabled") === "true" &&
      p.d
        .querySelector(".support-contact")
        .textContent.includes("+51 000 000 000"),
    "Soporte muestra número ficticio sin abrir contacto real",
  );
  check(
    p.d.querySelectorAll(".support-faq details").length === 8,
    "Preguntas frecuentes paginadas y plegables",
  );
  const accountSnapshot = p.snapshot();
  await p.close();
  p = boot(accountSnapshot, bid, "reader", "perfil", true);
  p.w.CejProWorkspacePermissions.sync();
  check(
    !p.d.querySelector('#profileForm [name="firstName"]').disabled,
    "Lector puede editar su perfil personal",
  );
  check(
    p.w.CejProAccountData.loadProfile().email === "ana@example.com",
    "Perfil personal persiste entre espacios",
  );
  profileForm = p.d.querySelector("#profileForm");
  profileForm.elements.namedItem("firstName").value = "Ana";
  profileForm.elements.namedItem("lastName").value = "López Pérez";
  profileForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    p.w.CejProAccountData.loadProfile().name === "Ana López Pérez",
    "Guardar perfil en modo lector sin cambiar permisos del espacio",
  );
  await p.close();
  p = boot(accountSnapshot, "personal", "owner", "");
  check(
    p.w.location.hash === "#login" && !p.d.querySelector("#loginScreen").hidden,
    "Sin ruta se abre la pantalla de login",
  );
  p.d.querySelector("#googleDemoLogin").click();
  p.route(p.w.location.hash.slice(1));
  check(
    p.w.location.hash === "#calendario" &&
      !p.d.querySelector("#calendarModule").hidden,
    "El acceso simulado respeta la página de inicio elegida",
  );
  await p.close();
  p = boot(accountSnapshot, "personal", "owner", "clientes");
  check(
    p.w.location.hash === "#clientes",
    "Enlace directo respeta ruta explícita",
  );
  await p.close();
  for (const theme of ["elegante", "claro", "oscuro"]) {
    p = boot(accountSnapshot, "personal", "owner", "perfil", true);
    p.d.documentElement.dataset.theme = theme;
    p.route("configuracion");
    check(
      p.d
        .querySelector(".account-setting-description")
        .textContent.toLowerCase()
        .includes(theme),
      "Configuración refleja tema " + theme,
    );
    p.route("soporte");
    check(
      p.d.querySelector("#supportWhatsApp") &&
        p.d.querySelector(".support-faq"),
      "Soporte disponible en móvil y tema " + theme,
    );
    await p.close();
  }
  p = boot({}, "personal", "owner", "clientes");
  const beforeNumbers = p.w.CejProClientsData.load(),
    firstNumbers = new Map(beforeNumbers.map((c) => [c.id, c.code]));
  for (let i = 0; i < 3; i++) {
    p.d.querySelector("#newClient").click();
    const f = p.d.querySelector("#clientForm");
    f.elements.namedItem("name").value = "Nuevo cliente " + i;
    f.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
    const saved = p.w.CejProClientsData.load(),
      created = saved.find((c) => c.name === "Nuevo cliente " + i);
    check(
      created.code ===
        "Cliente " + String(beforeNumbers.length + i + 1).padStart(3, "0"),
      "Cliente nuevo recibe el siguiente número " + i,
    );
    check(
      beforeNumbers.every(
        (c) => saved.find((x) => x.id === c.id).code === firstNumbers.get(c.id),
      ),
      "Clientes anteriores mantienen sus números " + i,
    );
  }
  const numberSnapshot = p.snapshot();
  await p.close();
  p = boot(numberSnapshot, "personal", "owner", "clientes");
  check(
    p.w.CejProClientsData.load().find((c) => c.name === "Nuevo cliente 2")
      .code ===
      "Cliente " + String(beforeNumbers.length + 3).padStart(3, "0"),
    "Numeración persiste al recargar",
  );
  await p.close();
  p = boot();
  W = p.w.CejProWorkspaces;
  const disposable = W.create("Espacio temporal").space,
    keep = W.create("Conservar").space;
  const deleteKey = "cejpro.workspace:" + disposable.id + ":cejpro.clients.v1",
    keepKey = "cejpro.workspace:" + keep.id + ":cejpro.clients.v1";
  p.w.localStorage.setItem(deleteKey, "[]");
  p.w.localStorage.setItem(keepKey, "[]");
  p.d.querySelector("#workspaceGeneralSettings").click();
  p.route("espacios");
  check(
    !p.d.querySelector("#workspaceSettingsDialog").open &&
      !p.d.querySelector("#workspaceSpacesPanel").hidden,
    "Icono general abre página Espacios sin nueva ventana",
  );
  check(
    p.d.querySelector(".workspace-settings-tabs button").id ===
      "workspaceSpacesTab",
    "Espacios aparece primero",
  );
  p.d
    .querySelector(
      '#workspaceSpacesPanel [data-settings-workspace="' + disposable.id + '"]',
    )
    .click();
  check(
    p.d.querySelector("#workspaceSettingsDialog").open,
    "Configuración general permite elegir un espacio",
  );
  let sf = p.d.querySelector("#workspaceSettingsForm");
  sf.elements.namedItem("name").value = "Espacio renombrado";
  sf.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    W.all().find((s) => s.id === disposable.id).name === "Espacio renombrado" &&
      W.current().id === "personal",
    "Editar nombre sin cambiar de espacio",
  );
  p.d.querySelector("#workspaceGeneralSettings").click();
  p.route("espacios");
  check(
    !p.d.querySelector("#workspaceSettingsDialog").open &&
      !p.d.querySelector("#workspaceSpacesPanel").hidden,
    "Icono general abre página Espacios sin nueva ventana",
  );
  check(
    p.d.querySelector(".workspace-settings-tabs button").id ===
      "workspaceSpacesTab",
    "Espacios aparece primero",
  );
  p.d
    .querySelector(
      '#workspaceSpacesPanel [data-settings-workspace="' + disposable.id + '"]',
    )
    .click();
  p.d.querySelector("#workspaceDeleteButton").click();
  let df = p.d.querySelector("#workspaceDeleteForm");
  df.elements.namedItem("confirmation").value = "incorrecto";
  df.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    W.all().some((s) => s.id === disposable.id),
    "Eliminar requiere nombre exacto",
  );
  df.elements.namedItem("confirmation").value = "Espacio renombrado";
  df.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    !W.all().some((s) => s.id === disposable.id) &&
      p.w.localStorage.getItem(deleteKey) === null &&
      p.w.localStorage.getItem(keepKey) === "[]",
    "Eliminar limpia solo los datos del espacio seleccionado",
  );
  check(!W.removeSpace("personal").ok, "Espacio personal protegido");
  W.invite("pendiente@example.com", "reader");
  p.w.CejProWorkspacesUI.openInvite();
  let remove = p.d.querySelector(
    "#workspaceInviteContent [data-workspace-remove]",
  );
  check(
    remove.textContent === "Cancelar invitación",
    "Acción explícita para pendientes",
  );
  remove.click();
  p.d.querySelector("#workspaceRemoveConfirm").click();
  check(
    W.current().members.length === 1,
    "Cancelar invitación desde la ventana",
  );
  const activeMember = W.invite("activo@example.com", "reader").member;
  let registry = JSON.parse(p.w.localStorage.getItem("cejpro.workspaces.v1"));
  registry.spaces
    .find((s) => s.id === "personal")
    .members.find((m) => m.id === activeMember.id).status = "active";
  p.w.localStorage.setItem("cejpro.workspaces.v1", JSON.stringify(registry));
  p.w.CejProWorkspacesUI.openInvite();
  let rs = p.d.querySelector("#workspaceInviteContent [data-workspace-role]");
  rs.value = "editor";
  rs.dispatchEvent(new p.w.Event("change"));
  check(
    W.current().members.find((m) => m.id === activeMember.id).role === "editor",
    "Cambiar miembro activo a editor",
  );
  remove = p.d.querySelector("#workspaceInviteContent [data-workspace-remove]");
  check(remove.textContent === "Eliminar", "Miembro activo ofrece eliminar");
  remove.click();
  check(
    p.d.querySelector("#workspaceRemoveTitle").textContent ===
      "Eliminar miembro",
    "Confirmación distingue miembro activo",
  );
  p.d.querySelector("#workspaceRemoveConfirm").click();
  check(W.current().members.length === 1, "Eliminar miembro activo");
  check(!p.errors.length, "Gestión de espacios sin errores");
  await p.close();
  p = boot();
  W = p.w.CejProWorkspaces;
  const stay = W.create("Permanecer en configuración").space;
  check(
    p.d.querySelector("#workspaceGeneralSettings").parentElement ===
      p.d.querySelector("#createWorkspaceMenu").parentElement,
    "Configuración junto a Añadir espacio",
  );
  p.d.querySelector("#workspaceGeneralSettings").click();
  p.route("espacios");
  p.d
    .querySelector(
      '#workspaceSpacesPanel [data-settings-workspace="' + stay.id + '"]',
    )
    .click();
  check(
    !p.d.querySelector("#workspaceSettingsSelect") &&
      p.d.querySelector("#workspaceSettingsForm").elements.namedItem("name")
        .value === stay.name,
    "Configurar directamente el espacio elegido sin selector",
  );
  p.d.querySelector('[data-workspace-close="workspaceSettingsDialog"]').click();
  p.d
    .querySelector(
      '#workspaceSpacesPanel [data-switch-workspace="' + stay.id + '"]',
    )
    .click();
  check(
    p.w.location.hash === "#espacios" &&
      p.w.sessionStorage.getItem(activeKey) === stay.id,
    "Cambiar desde Espacios mantiene la página de gestión",
  );
  const stayStorage = p.snapshot();
  await p.close();
  p = boot(stayStorage, stay.id, "owner", "espacios");
  p.d.querySelector("#workspaceMembersTab").click();
  check(
    !p.d.querySelector("#workspaceMembersPanel").hidden &&
      p.d.querySelector(".workspace-settings-heading h2").textContent ===
        stay.name,
    "Miembros corresponde al espacio elegido tras recargar",
  );
  p.w.CejProWorkspaces.invite("izquierda@example.com", "reader");
  check(
    p.d
      .querySelector("#workspaceMembersPanel [data-workspace-remove]")
      .nextElementSibling?.matches("select"),
    "Cancelar invitación a la izquierda del rol",
  );
  await p.close();
  p = boot({}, "personal", "owner", "soporte");
  check(
    p.d.querySelectorAll("#supportFaqPages button").length === 3,
    "Soporte distribuido en tres páginas",
  );
  p.d.querySelector("#supportFaqPages button:nth-child(2)").click();
  check(
    p.d.querySelector("#supportFaqPages [aria-current]").textContent === "2",
    "Navegar a la segunda página",
  );
  let faqSearch = p.d.querySelector("#supportSearch");
  faqSearch.value = "IDENTIDADES";
  faqSearch.dispatchEvent(new p.w.Event("input"));
  check(
    p.d
      .querySelector("#supportFaqResults")
      .textContent.includes("identidades CEJ") &&
      p.d.querySelector("#supportFaqPages [aria-current]").textContent === "1",
    "Buscar en todas las páginas y reiniciar paginación",
  );
  faqSearch.value = "";
  faqSearch.dispatchEvent(new p.w.Event("input"));
  const faqFilter = p.d.querySelector("#supportModuleFilter");
  faqFilter.value = "Cobros";
  faqFilter.dispatchEvent(new p.w.Event("change"));
  check(
    p.d.querySelectorAll(".support-faq details").length === 3 &&
      p.d.querySelectorAll(".support-faq-group").length === 1,
    "Filtrar preguntas por módulo",
  );
  faqSearch.value = "zzzz";
  faqSearch.dispatchEvent(new p.w.Event("input"));
  check(
    p.d.querySelector("#supportFaqResults .clients-empty svg"),
    "Búsqueda sin resultados con icono",
  );
  await p.close();
  p = boot({}, "personal", "owner", "clientes");
  p.d.querySelector("#newClient").click();
  check(
    p.d.querySelector("#deleteClient").hidden,
    "Eliminar solo aparece al editar",
  );
  let newClientForm = p.d.querySelector("#clientForm");
  newClientForm.elements.namedItem("name").value = "Eliminar de prueba";
  newClientForm.dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  const removedClient = p.w.CejProClientsData.load().find(
    (c) => c.name === "Eliminar de prueba",
  );
  p.w.CejProReceivedPayments.save(removedClient.id, {
    concept: "Consulta",
    amount: "100",
    currency: "PEN",
    date: "2026-11-04",
    method: "Efectivo",
    caseId: "",
  });
  const casesBefore = p.w.CejProCasesData.load().cases.length;
  p.d.querySelector('[data-edit-client="' + removedClient.id + '"]').click();
  p.d.querySelector("#deleteClient").click();
  check(
    p.d.querySelector("#deleteClientDialog").open &&
      p.w.CejProClientsData.load().some((c) => c.id === removedClient.id),
    "Eliminar requiere confirmación",
  );
  p.d.querySelector("#cancelDeleteClient").click();
  check(
    p.w.CejProClientsData.load().some((c) => c.id === removedClient.id),
    "Cancelar conserva cliente",
  );
  p.d.querySelector("#deleteClient").click();
  p.d
    .querySelector("#deleteClientForm")
    .dispatchEvent(new p.w.Event("submit", { cancelable: true }));
  check(
    !p.w.CejProClientsData.load().some((c) => c.id === removedClient.id) &&
      !p.w.CejProReceivedPayments.list(removedClient.id).length,
    "Confirmar elimina cliente y sus pagos",
  );
  check(
    p.w.CejProCasesData.load().cases.length === casesBefore,
    "Eliminar cliente conserva expedientes",
  );
  await p.close();
  p = boot({}, "personal", "owner", "");
  check(!p.d.querySelector("#loginScreen").hidden, "Login visible al abrir el diseño");
  p.d.querySelector("#googleDemoLogin").click();
  p.route("inicio");
  check(p.d.querySelector("#pageTitle").textContent === "Buenos días, Deyvis", "Saludo de demostración solicitado");
  check(p.w.CejProAccountData.loadProfile().firstName === "Deyvis", "Google simulado inicializa el perfil ficticio");
  const documentCase = p.w.CejProCasesData.load().cases[0];
  const sampleFile = new p.w.File(["contenido de prueba"], "documento.txt", { type: "text/plain" });
  p.w.CejProCaseFiles.add(documentCase.id, documentCase.folderId, [sampleFile]);
  p.route("expedientes/" + documentCase.id);
  check(!!p.d.querySelector(".detail-documents-table"), "Expediente abre Documentos por defecto");
  const firstDocument = p.w.CejProCaseFiles.list(documentCase.id)[0];
  const destination = p.w.CejProCaseDetailData.addFolder(documentCase.id, "Copias");
  const documentFolder = p.w.CejProCaseDetailData.get(documentCase.id).folders.find((f) => f.name === "Copias");
  check(destination.ok && p.w.CejProCaseFiles.organize(documentCase.id, [firstDocument.id], documentFolder.id, true), "Copiar documento a carpeta interna");
  check(p.w.CejProCaseFiles.list(documentCase.id).length === 2, "Copia conserva el documento original");
  p.route("expedientes/" + documentCase.id + "/resumen");
  check(!!p.d.querySelector(".detail-summary-side #summaryParties #addParty"), "Partes junto a Organización en Resumen");
  const sinoeData = p.w.CejProSinoeData;
  sinoeData.link("casilla-demo");
  const copiedFolder = { id: "copias-locales", name: "Copias" };
  sinoeData.saveFolders([copiedFolder]);
  p = await (async () => {
    const snapshot = p.snapshot();
    await p.close();
    return boot(snapshot, "personal", "owner", "sinoe");
  })();
  const originalNotifications = p.w.CejProSinoeData.load();
  const notification = originalNotifications[0];
  const selector = p.d.querySelector('[data-select-notification="' + notification.id + '"]');
  selector.checked = true;
  selector.dispatchEvent(new p.w.Event("change"));
  const copySelect = p.d.querySelector("#sinoeBulkCopy");
  copySelect.value = copiedFolder.id;
  copySelect.dispatchEvent(new p.w.Event("change"));
  const copiedNotifications = p.w.CejProSinoeData.load();
  check(copiedNotifications.length === originalNotifications.length, "Copiar notificación conserva un registro en Todas");
  check(copiedNotifications.find((n) => n.id === notification.id).copiedFolderIds.includes(copiedFolder.id), "Copia persiste vínculo a segunda carpeta");
  p.route("sinoe/" + notification.id);
  check(p.d.querySelector("#sinoeAnnexDialog").open, "Anexos se abren en ventana modal");
  check(p.w.CejProSinoeData.load().find((n) => n.id === notification.id).read === notification.read, "Abrir anexos conserva lectura original");
  p.d.querySelector("#closeSinoeAnnex").click();
  p.route("login");
  check(!p.d.querySelector("#loginScreen").hidden, "Cerrar sesión vuelve al login");
  check(p.w.CejProCaseFiles.list(documentCase.id).length === 2, "Volver al login conserva documentos locales");
  check(!p.errors.length, "Cambios del software sin errores de ejecución");
  await p.close();
  console.log("Workspaces: " + checks + " comprobaciones correctas.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
