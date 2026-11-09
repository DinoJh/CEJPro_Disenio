/* Menú de cuenta y gestión de miembros. Las invitaciones se guardan localmente. */
window.CejProWorkspacesUI = (() => {
  const W = window.CejProWorkspaces,
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
  const $ = (id) => document.getElementById(id);
  let host,
    initialized = false,
    view = "spaces",
    inviteEmail = "",
    inviteRole = "reader",
    inviteReturnFocus = null;
  const initials = (name) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase();
  function closeSwitcher(focus = false) {
    const panel = $("workspaceSwitcher");
    if (!panel || panel.hidden) return false;
    panel.hidden = true;
    $("workspaceMenuButton").setAttribute("aria-expanded", "false");
    if (focus) $("workspaceMenuButton").focus();
    return true;
  }
  function closeAccount() {
    closeSwitcher();
    $("accountMenu").hidden = true;
    $("accountButton").setAttribute("aria-expanded", "false");
  }
  function notice(message) {
    const target = $("workspaceInviteDialog")?.open
      ? $("workspaceInviteNotice")
      : $("workspaceNotice");
    if (target) target.textContent = message;
  }
  function showError(id, result) {
    const target = $(id);
    if (target) {
      target.textContent = result.error || "";
      target.hidden = !!result.ok;
    }
  }
  function ensure() {
    if ($("workspaceNameDialog")) return;
    const root = document.createElement("div");
    root.id = "workspaceDialogs";
    root.innerHTML = `
 <dialog id="workspaceNameDialog" class="cases-dialog workspace-dialog" aria-labelledby="workspaceNameTitle"><form id="workspaceNameForm"><div class="cases-dialog-heading"><h2 id="workspaceNameTitle">Crear espacio de trabajo</h2><button type="button" class="cases-icon-button" data-workspace-close="workspaceNameDialog" aria-label="Cerrar">×</button></div><div class="cases-form-body"><label>Nombre del espacio<input name="name" required maxlength="60" autocomplete="off" placeholder="Ej. Estudio jurídico Andina"></label><p class="workspace-dialog-context" id="workspaceCreateDescription">Empezarás con expedientes, clientes y calendario vacíos. Tu espacio actual se conservará.</p><p id="workspaceNameError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" class="cases-secondary" data-workspace-close="workspaceNameDialog">Cancelar</button><button type="submit" class="cases-primary" id="workspaceNameSave">Crear espacio</button></div></form></dialog>
 <dialog id="workspaceInviteDialog" class="cases-dialog workspace-dialog workspace-invite-dialog" aria-labelledby="workspaceInviteTitle"><div class="cases-dialog-heading"><div><h2 id="workspaceInviteTitle">Invitar a un amigo</h2></div><button type="button" class="cases-icon-button" data-workspace-close="workspaceInviteDialog" aria-label="Cerrar invitaciones">×</button></div><p id="workspaceInviteContext" class="workspace-dialog-context"></p><div id="workspaceInviteContent" class="workspace-invite-content"></div></dialog>
 <dialog id="workspaceRemoveDialog" class="cases-dialog workspace-dialog" aria-labelledby="workspaceRemoveTitle"><div class="cases-dialog-heading"><h2 id="workspaceRemoveTitle">Cancelar invitación</h2><button type="button" class="cases-icon-button" data-workspace-close="workspaceRemoveDialog" aria-label="Cerrar">×</button></div><div class="cases-form-body"><p class="workspace-dialog-context" id="workspaceRemoveContext"></p><p id="workspaceRemoveError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" class="cases-secondary" data-workspace-close="workspaceRemoveDialog">Volver</button><button type="button" class="cases-primary" id="workspaceRemoveConfirm">Cancelar invitación</button></div></dialog>
 <dialog id="workspaceSettingsDialog" class="cases-dialog workspace-dialog" aria-labelledby="workspaceSettingsTitle"><form id="workspaceSettingsForm"><div class="cases-dialog-heading"><h2 id="workspaceSettingsTitle">Configurar espacio</h2><button type="button" class="cases-icon-button" data-workspace-close="workspaceSettingsDialog" aria-label="Cerrar">×</button></div><div class="cases-form-body"><label>Nombre del espacio<input name="name" required maxlength="60"></label><p id="workspaceSettingsError" class="cases-form-error" role="alert" hidden></p><button type="button" id="workspaceDeleteButton" class="workspace-delete-space">Eliminar espacio de trabajo</button></div><div class="cases-dialog-footer"><button type="button" class="cases-secondary" data-workspace-close="workspaceSettingsDialog">Cancelar</button><button type="submit" class="cases-primary">Guardar cambios</button></div></form></dialog>
 <dialog id="workspaceDeleteDialog" class="cases-dialog workspace-dialog" aria-labelledby="workspaceDeleteTitle"><form id="workspaceDeleteForm"><div class="cases-dialog-heading"><h2 id="workspaceDeleteTitle">Eliminar espacio de trabajo</h2><button type="button" class="cases-icon-button" data-workspace-close="workspaceDeleteDialog" aria-label="Cerrar">×</button></div><div class="cases-form-body"><p id="workspaceDeleteContext" class="workspace-dialog-context"></p><p class="workspace-dialog-context">Se eliminarán sus expedientes, documentos, clientes, pagos y miembros. Esta acción no se puede deshacer.</p><label>Escribe el nombre del espacio para confirmar<input name="confirmation" required autocomplete="off"></label><p id="workspaceDeleteError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" class="cases-secondary" data-workspace-close="workspaceDeleteDialog">Cancelar</button><button type="submit" class="cases-primary">Eliminar espacio</button></div></form></dialog>`;
    document.body.append(root);
    root
      .querySelectorAll("[data-workspace-close]")
      .forEach((b) => (b.onclick = () => $(b.dataset.workspaceClose).close()));
    $("workspaceInviteDialog").addEventListener("close", () => {
      const target =
        inviteReturnFocus?.isConnected && !inviteReturnFocus.closest("[hidden]")
          ? inviteReturnFocus
          : $("accountButton");
      target.focus();
      inviteReturnFocus = null;
    });
    $("workspaceNameForm").onsubmit = (e) => {
      e.preventDefault();
      const form = e.target,
        result =
          form.dataset.mode === "rename"
            ? W.rename(form.elements.namedItem("name").value)
            : W.create(form.elements.namedItem("name").value);
      showError("workspaceNameError", result);
      if (!result.ok) return;
      if (result.space) {
        const switched = W.activate(result.space.id);
        if (!switched.ok) {
          showError("workspaceNameError", switched);
          render();
        }
      } else {
        $("workspaceNameDialog").close();
        render();
      }
    };
    $("workspaceSettingsForm").onsubmit = (e) => {
      e.preventDefault();
      const result = W.rename(
        e.target.elements.namedItem("name").value,
        e.target.dataset.spaceId,
      );
      showError("workspaceSettingsError", result);
      if (result.ok) $("workspaceSettingsDialog").close();
    };
    $("workspaceDeleteButton").onclick = () => {
      const id = $("workspaceSettingsForm").dataset.spaceId,
        space = W.all().find((s) => s.id === id);
      if (!space || id === "personal") return;
      const f = $("workspaceDeleteForm");
      f.reset();
      f.dataset.spaceId = id;
      $("workspaceDeleteContext").textContent =
        "Vas a eliminar «" + space.name + "».";
      $("workspaceDeleteError").hidden = true;
      $("workspaceDeleteDialog").showModal();
    };
    $("workspaceDeleteForm").onsubmit = (e) => {
      e.preventDefault();
      const space = W.all().find((s) => s.id === e.target.dataset.spaceId);
      if (
        !space ||
        e.target.elements.namedItem("confirmation").value !== space.name
      ) {
        showError("workspaceDeleteError", {
          ok: false,
          error: "Escribe el nombre exacto del espacio.",
        });
        return;
      }
      const result = W.removeSpace(space.id);
      showError("workspaceDeleteError", result);
      if (result.ok) {
        $("workspaceDeleteDialog").close();
        $("workspaceSettingsDialog").close();
        render();
      }
    };
    $("workspaceRemoveConfirm").onclick = () => {
      const pending = $("workspaceRemoveDialog").dataset.pending === "true";
      const result = W.removeMember(
        $("workspaceRemoveDialog").dataset.memberId,
      );
      showError("workspaceRemoveError", result);
      if (result.ok) {
        $("workspaceRemoveDialog").close();
        render();
        notice(pending ? "Invitación cancelada." : "Miembro eliminado.");
      }
    };
  }
  function openName(rename = false) {
    if (!W.canManage()) {
      if (!rename && W.isPreview) {
        const result = W.continueAsOwner("create");
        if (!result.ok) notice(result.error);
      }
      return;
    }
    ensure();
    closeAccount();
    const form = $("workspaceNameForm");
    form.reset();
    form.dataset.mode = rename ? "rename" : "create";
    form.elements.namedItem("name").value = rename ? W.current().name : "";
    $("workspaceNameTitle").textContent = rename
      ? "Editar nombre del espacio"
      : "Crear espacio de trabajo";
    $("workspaceNameSave").textContent = rename
      ? "Guardar nombre"
      : "Crear espacio";
    $("workspaceCreateDescription").hidden = rename;
    $("workspaceNameError").hidden = true;
    $("workspaceNameDialog").showModal();
    form.elements.namedItem("name").focus();
  }
  function openInvite() {
    if (!W.canManage()) {
      if (W.isPreview) {
        const result = W.continueAsOwner("invite");
        if (!result.ok) notice(result.error);
      }
      return;
    }
    ensure();
    inviteReturnFocus = document.activeElement?.matches(
      "button,a,input,select,textarea",
    )
      ? document.activeElement
      : $("accountButton");
    closeAccount();
    renderInvite();
    if (!$("workspaceInviteDialog").open)
      $("workspaceInviteDialog").showModal();
    $("workspaceInviteEmail").focus();
  }
  function openSettings(id = W.activeId) {
    if (!W.canManage()) return;
    ensure();
    const space = W.all().find((s) => s.id === id);
    if (!space) return;
    closeAccount();
    const f = $("workspaceSettingsForm");
    f.dataset.spaceId = id;
    f.elements.namedItem("name").value = space.name;
    $("workspaceDeleteButton").hidden = id === "personal";
    $("workspaceSettingsError").hidden = true;
    if (!$("workspaceSettingsDialog").open)
      $("workspaceSettingsDialog").showModal();
  }
  function positionSwitcher() {
    const panel = $("workspaceSwitcher");
    if (panel.hidden) return;
    const menu = $("accountMenu").getBoundingClientRect(),
      anchor = $("workspaceMenuButton").getBoundingClientRect(),
      width = Math.min(300, window.innerWidth - 24),
      mobile = window.innerWidth <= 760;
    panel.style.width = width + "px";
    let left = mobile ? menu.left : menu.right + 8;
    if (left + width > window.innerWidth - 12) left = menu.left - width - 8;
    if (left < 12) left = 12;
    const height = panel.getBoundingClientRect().height;
    panel.style.left = left + "px";
    panel.style.top =
      Math.max(
        12,
        Math.min(
          mobile ? menu.top : anchor.top,
          window.innerHeight - height - 12,
        ),
      ) + "px";
  }
  function toggleSwitcher() {
    const panel = $("workspaceSwitcher");
    if (!panel.hidden) {
      closeSwitcher(true);
      return;
    }
    panel.hidden = false;
    $("workspaceMenuButton").setAttribute("aria-expanded", "true");
    positionSwitcher();
    panel.querySelector("[data-switch-workspace]")?.focus();
  }
  function spaceRows(settings = false) {
    return W.all()
      .map(
        (s) =>
          `<div class="workspace-switch-row"><button type="button" class="workspace-switch-option${s.id === W.activeId ? " is-current" : ""}" data-switch-workspace="${esc(s.id)}" aria-pressed="${s.id === W.activeId}"><span class="workspace-mini-avatar">${esc(initials(s.name))}</span><span><strong>${esc(s.name)}</strong><small>${s.id === "personal" ? "Personal" : "Espacio de trabajo"}</small></span>${s.id === W.activeId ? '<span class="workspace-check" aria-hidden="true">✓</span>' : ""}</button>${settings && W.canManage() ? `<button type="button" class="workspace-settings-icon" data-settings-workspace="${esc(s.id)}" aria-label="Configurar ${esc(s.name)}" title="Configurar espacio">${window.CejProIcon("settings")}</button>` : ""}</div>`,
      )
      .join("");
  }
  function bindSpaceRows(root) {
    root
      .querySelectorAll("[data-settings-workspace]")
      .forEach(
        (b) => (b.onclick = () => openSettings(b.dataset.settingsWorkspace)),
      );
    root.querySelectorAll("[data-switch-workspace]").forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.switchWorkspace === W.activeId) {
            closeAccount();
            view = root.id === "workspaceSpacesPanel" ? "spaces" : "members";
            if (location.hash === "#espacios") render();
            else location.hash = "espacios";
            return;
          }
          const result = W.activate(
            b.dataset.switchWorkspace,
            root.id === "workspaceSpacesPanel" ? "espacios" : "inicio",
          );
          if (!result.ok) {
            notice(result.error);
            location.hash = "espacios";
          }
        }),
    );
  }
  function switcher() {
    const space = W.current(),
      role = W.roles[W.role()];
    $("workspaceSwitcher").innerHTML =
      `<div class="workspace-switcher-heading"><button type="button" id="closeWorkspaceSwitcher" aria-label="Volver al menú de cuenta">‹</button><span>Espacios de trabajo</span></div><div class="workspace-menu-list">${spaceRows()}</div>${W.canManage() || W.isPreview ? '<div class="workspace-switcher-footer"><button type="button" id="createWorkspaceMenu">＋ Añadir espacio de trabajo</button>' + (W.canManage() ? `<button type="button" id="workspaceGeneralSettings" class="workspace-settings-icon" aria-label="Configurar espacios de trabajo" title="Configurar espacios de trabajo">${window.CejProIcon("settings")}</button>` : "") + "</div>" : ""}`;
    $("accountButton").querySelector("strong").textContent = space.name;
    $("accountButton").querySelector("small").textContent = role;
    $("accountButton").title = space.name + " · " + role;
    $("accountButton").querySelector(".avatar").textContent =
      space.id === "personal" ? "TU" : initials(space.name);
    $("inviteWorkspaceMenu").hidden = !W.canManage() && !W.isPreview;
    document.querySelector(".breadcrumb-home").textContent =
      space.id === "personal" ? "Mi espacio" : space.name;
    document.querySelector(".breadcrumb-home").title = space.name;
    if ($("workspaceGeneralSettings"))
      $("workspaceGeneralSettings").onclick = () => {
        closeAccount();
        view = "spaces";
        if (location.hash === "#espacios") render();
        else location.hash = "espacios";
      };
    bindSpaceRows($("workspaceSwitcher"));
    $("closeWorkspaceSwitcher").onclick = () => closeSwitcher(true);
    if ($("createWorkspaceMenu"))
      $("createWorkspaceMenu").onclick = () => openName();
    positionSwitcher();
  }
  function memberRows(space, manage) {
    return space.members
      .map(
        (m) =>
          `<li class="workspace-member-row"><span class="workspace-member-avatar">${m.role === "owner" ? "TU" : esc(initials(m.email.split("@")[0]))}</span><div class="workspace-member-info"><strong>${m.role === "owner" ? "Tú" : esc(m.email)}</strong><small>${m.role === "owner" ? "Propietario del espacio" : m.status === "pending" ? "Invitación pendiente de envío" : "Miembro del espacio"}</small></div><div class="workspace-member-controls">${manage && m.role !== "owner" ? `${m.status === "pending" ? `<button type="button" class="workspace-member-remove" data-workspace-resend="${esc(m.id)}">Reenviar</button>` : ""}<button type="button" class="workspace-member-remove" data-workspace-remove="${esc(m.id)}" aria-label="${m.status === "pending" ? "Cancelar invitación de" : "Eliminar miembro"} ${esc(m.email)}" title="${m.status === "pending" ? "Cancelar invitación" : "Eliminar miembro"}">${m.status === "pending" ? "Cancelar invitación" : "Eliminar"}</button><select data-workspace-role="${esc(m.id)}" aria-label="Rol de ${esc(m.email)}"><option value="reader"${m.role === "reader" ? " selected" : ""}>Lector</option><option value="editor"${m.role === "editor" ? " selected" : ""}>Editor</option></select>` : `<span class="workspace-owner-badge">${W.roles[m.role]}</span>`}</div></li>`,
      )
      .join("");
  }
  function bindMemberControls(root) {
    root.querySelectorAll("[data-workspace-resend]").forEach((button) => {
      button.onclick = () => {
        notice("Invitación pendiente.");
      };
    });
    root.querySelectorAll("[data-workspace-role]").forEach(
      (select) =>
        (select.onchange = () => {
          const result = W.updateMember(
            select.dataset.workspaceRole,
            select.value,
          );
          render();
          notice(result.ok ? "Permiso actualizado." : result.error);
        }),
    );
    root.querySelectorAll("[data-workspace-remove]").forEach(
      (button) =>
        (button.onclick = () => {
          ensure();
          const m = W.current().members.find(
            (m) => m.id === button.dataset.workspaceRemove,
          );
          if (!m) return;
          $("workspaceRemoveDialog").dataset.memberId = m.id;
          const pending = m.status === "pending";
          $("workspaceRemoveDialog").dataset.pending = String(pending);
          $("workspaceRemoveTitle").textContent = pending
            ? "Cancelar invitación"
            : "Eliminar miembro";
          $("workspaceRemoveConfirm").textContent = pending
            ? "Cancelar invitación"
            : "Eliminar miembro";
          $("workspaceRemoveContext").textContent = pending
            ? "¿Cancelar la invitación de " + m.email + "?"
            : "¿Eliminar a " + m.email + " del espacio de trabajo?";
          $("workspaceRemoveError").hidden = true;
          $("workspaceRemoveDialog").showModal();
        }),
    );
  }
  function renderInvite() {
    const space = W.current(),
      manage = W.canManage();
    $("workspaceInviteContext").innerHTML =
      "Invitar al espacio de trabajo: <strong>" + esc(space.name) + "</strong>";
    $("workspaceInviteContent").innerHTML =
      `${manage ? `<form id="workspaceInviteForm" class="workspace-inline-invite"><label class="sr-only" for="workspaceInviteEmail">Correo electrónico</label><input id="workspaceInviteEmail" name="email" type="email" required maxlength="180" autocomplete="email" placeholder="colega@empresa.com" value="${esc(inviteEmail)}"><label class="sr-only" for="workspaceInviteRole">Rol del invitado</label><select id="workspaceInviteRole" name="role"><option value="reader"${inviteRole === "reader" ? " selected" : ""}>Lector</option><option value="editor"${inviteRole === "editor" ? " selected" : ""}>Editor</option></select><button type="submit" class="cases-primary">Invitar</button><p id="workspaceInviteError" class="cases-form-error" role="alert" hidden></p></form>` : ""}<h3 class="workspace-invite-members-heading">Miembros <span>${space.members.length}</span></h3><ul class="workspace-member-list" aria-label="Miembros e invitaciones">${memberRows(space, manage)}</ul><p id="workspaceInviteNotice" class="workspace-notice" role="status" aria-live="polite"></p>`;
    const form = $("workspaceInviteForm");
    if (form) {
      form.elements.namedItem("email").oninput = (e) =>
        (inviteEmail = e.target.value);
      form.elements.namedItem("role").onchange = (e) =>
        (inviteRole = e.target.value);
      form.onsubmit = (e) => {
        e.preventDefault();
        inviteEmail = form.elements.namedItem("email").value;
        inviteRole = form.elements.namedItem("role").value;
        const result = W.invite(inviteEmail, inviteRole);
        if (!result.ok) {
          showError("workspaceInviteError", result);
          return;
        }
        inviteEmail = "";
        renderInvite();
        notice("Invitación guardada. Pendiente de envío.");
        $("workspaceInviteEmail").focus();
      };
    }
    bindMemberControls($("workspaceInviteContent"));
  }
  function render() {
    switcher();
    if ($("workspaceInviteDialog")?.open) renderInvite();
    if (!host) return;
    const space = W.current(),
      manage = W.canManage();
    host.innerHTML = `<section class="workspace-settings-panel"><header class="workspace-settings-heading"><div><h2>${esc(space.name)}</h2><p>${W.roles[W.role()]}</p></div>${manage ? '<button type="button" class="detail-text-button" id="workspaceRename">Editar nombre</button>' : ""}</header><div class="workspace-settings-tabs" role="tablist" aria-label="Administrar espacio"><button type="button" role="tab" id="workspaceSpacesTab" aria-controls="workspaceSpacesPanel" aria-selected="${view === "spaces"}">Espacios</button><button type="button" role="tab" id="workspaceMembersTab" aria-controls="workspaceMembersPanel" aria-selected="${view === "members"}">Miembros <span>${space.members.length}</span></button></div>
 <section id="workspaceMembersPanel" class="workspace-settings-body" role="tabpanel" aria-labelledby="workspaceMembersTab"${view !== "members" ? " hidden" : ""}>${manage ? '<button type="button" class="cases-primary workspace-invite-launch" id="workspaceInviteLaunch">＋ Invitar a un amigo</button>' : ""}<ul class="workspace-member-list" aria-label="Miembros e invitaciones">${memberRows(space, manage)}</ul><details class="workspace-preview-options"><summary>Permisos del espacio</summary><div class="workspace-permission-grid"><div><strong>Lector</strong><p>Consulta expedientes y documentos.</p></div><div><strong>Editor</strong><p>Crea y modifica el contenido.</p></div><div><strong>Propietario</strong><p>También administra miembros y roles.</p></div></div>${manage ? '<div class="workspace-preview-actions"><button type="button" class="detail-text-button" data-preview-role="reader">Probar vista de lector</button><button type="button" class="detail-text-button" data-preview-role="editor">Probar vista de editor</button></div>' : ""}</details></section>
 <section id="workspaceSpacesPanel" class="workspace-settings-body" role="tabpanel" aria-labelledby="workspaceSpacesTab"${view !== "spaces" ? " hidden" : ""}><div class="workspace-page-spaces">${spaceRows(true)}</div>${manage ? '<button type="button" class="cases-secondary" id="createWorkspacePage">＋ Añadir espacio de trabajo</button>' : ""}</section><p id="workspaceNotice" class="workspace-notice" role="status" aria-live="polite">${esc(W.error)}</p></section>`;
    $("workspaceMembersTab").onclick = () => {
      view = "members";
      render();
      $("workspaceMembersTab").focus();
    };
    $("workspaceSpacesTab").onclick = () => {
      view = "spaces";
      render();
      $("workspaceSpacesTab").focus();
    };
    const tabs = [$("workspaceSpacesTab"), $("workspaceMembersTab")];
    tabs.forEach((tab, i) => {
      tab.tabIndex = (view === "spaces" ? i === 0 : i === 1) ? 0 : -1;
      tab.onkeydown = (e) => {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const next = e.key === "Home" ? 0 : e.key === "End" ? 1 : 1 - i;
          tabs[next].click();
        }
      };
    });
    if (manage) {
      $("workspaceRename").onclick = () => openName(true);
      $("createWorkspacePage").onclick = () => openName();
      $("workspaceInviteLaunch").onclick = openInvite;
    }
    bindMemberControls(host);
    host.querySelectorAll("[data-preview-role]").forEach(
      (button) =>
        (button.onclick = () => {
          const result = W.previewRole(button.dataset.previewRole);
          if (!result.ok) notice(result.error);
        }),
    );
    bindSpaceRows($("workspaceSpacesPanel"));
  }
  function init() {
    if (initialized) return;
    initialized = true;
    ensure();
    document.body.append($("workspaceSwitcher"));
    switcher();
    $("workspaceMenuButton").onclick = toggleSwitcher;
    $("workspaceMenuButton").onkeydown = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if ($("workspaceSwitcher").hidden) toggleSwitcher();
      }
    };
    $("workspaceSwitcher").onkeydown = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        closeSwitcher(true);
      }
    };
    $("inviteWorkspaceMenu").onclick = openInvite;
    window.addEventListener("resize", positionSwitcher);
    if (W.role() !== "owner") {
      const banner = document.createElement("div");
      banner.className = "workspace-role-banner";
      banner.innerHTML = `<span>Vista de ${W.roles[W.role()].toLowerCase()} · ${esc(W.current().name)}</span><button type="button" class="detail-text-button">Volver como propietario</button>`;
      document.querySelector("main").prepend(banner);
      banner.querySelector("button").onclick = () => {
        const result = W.previewRole("owner");
        if (!result.ok) notice(result.error);
      };
    }
    window.addEventListener("cejpro:workspaces-change", render);
    window.addEventListener("storage", (e) => {
      if (e.key === "cejpro.workspaces.v1") render();
    });
    const pending = W.takeOwnerAction();
    if (pending)
      queueMicrotask(() => {
        if (pending === "create") openName();
        else openInvite();
      });
  }
  function mount(element) {
    host = element;
    render();
  }
  return { init, mount, openInvite, openName, closeSwitcher };
})();
