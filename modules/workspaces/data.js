/* Registro local de espacios. La autenticación y la colaboración remota requieren servidor. */
window.CejProWorkspaces = (() => {
  const registryKey = "cejpro.workspaces.v1",
    activeKey = "cejpro.workspace.active.v1",
    previewKey = "cejpro.workspace.preview.v1";
  const roles = { owner: "Propietario", editor: "Editor", reader: "Lector" };
  const personal = () => ({
    id: "personal",
    name: "Espacio personal",
    personal: true,
    createdAt: Date.now(),
    members: [
      { id: "owner", name: "Tú", email: "", role: "owner", status: "active" },
    ],
  });
  function valid(s) {
    return (
      s &&
      typeof s.id === "string" &&
      /^(personal|ws-[a-zA-Z0-9-]+)$/.test(s.id) &&
      typeof s.name === "string" &&
      s.name.trim() &&
      s.name.length <= 60 &&
      Array.isArray(s.members) &&
      s.members.length &&
      s.members.filter((m) => m.role === "owner").length === 1 &&
      s.members.every(
        (m) =>
          m &&
          typeof m.id === "string" &&
          typeof m.email === "string" &&
          ["owner", "editor", "reader"].includes(m.role) &&
          ["active", "pending"].includes(m.status),
      )
    );
  }
  function load() {
    const raw = localStorage.getItem(registryKey);
    if (raw === null) return { version: 1, spaces: [personal()] };
    const value = JSON.parse(raw);
    if (
      !value ||
      value.version !== 1 ||
      !Array.isArray(value.spaces) ||
      !value.spaces.every(valid) ||
      !value.spaces.some((s) => s.id === "personal") ||
      new Set(value.spaces.map((s) => s.id)).size !== value.spaces.length
    )
      throw Error(
        "No se pudo leer el registro de espacios. Tus datos se conservan.",
      );
    return value;
  }
  let initial,
    error = "";
  try {
    initial = load();
    if (localStorage.getItem(registryKey) === null)
      localStorage.setItem(registryKey, JSON.stringify(initial));
  } catch (e) {
    error = e.message;
    initial = { version: 1, spaces: [personal()] };
  }
  let requested;
  try {
    requested =
      sessionStorage.getItem(activeKey) || localStorage.getItem(activeKey);
  } catch (_) {}
  const activeId = initial.spaces.some((s) => s.id === requested)
    ? requested
    : "personal";
  let preview = "";
  try {
    const p = JSON.parse(sessionStorage.getItem(previewKey));
    if (p?.workspaceId === activeId && ["reader", "editor"].includes(p.role))
      preview = p.role;
  } catch (_) {}
  function all() {
    try {
      return load().spaces;
    } catch (_) {
      return initial.spaces;
    }
  }
  function current() {
    return (
      all().find((s) => s.id === activeId) ||
      initial.spaces.find((s) => s.id === activeId) ||
      personal()
    );
  }
  const role = () => preview || "owner",
    canEdit = () => role() !== "reader",
    canManage = () => role() === "owner";
  function assertEdit() {
    if (!canEdit())
      throw new DOMException(
        "El rol Lector solo permite consultar.",
        "NotAllowedError",
      );
  }
  const scopeKey = (key) =>
    activeId === "personal" ? key : "cejpro.workspace:" + activeId + ":" + key;
  function store(registry) {
    localStorage.setItem(registryKey, JSON.stringify(registry));
    initial = registry;
    window.dispatchEvent(new Event("cejpro:workspaces-change"));
  }
  function change(mutator) {
    if (!canManage())
      return {
        ok: false,
        error: "Solo el propietario puede gestionar este espacio.",
      };
    try {
      if (error) return { ok: false, error };
      const registry = load(),
        value = mutator(registry);
      store(registry);
      return { ok: true, ...value };
    } catch (e) {
      return {
        ok: false,
        error: e.message || "No se pudo guardar. Inténtalo de nuevo.",
      };
    }
  }
  function create(name) {
    return change((r) => {
      name = String(name || "").trim();
      if (!name || name.length > 60)
        throw Error("Escribe un nombre de hasta 60 caracteres.");
      if (
        r.spaces.some(
          (s) =>
            s.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"),
        )
      )
        throw Error("Ya existe un espacio con ese nombre.");
      const space = {
        ...personal(),
        id: "ws-" + crypto.randomUUID(),
        name,
        personal: false,
      };
      r.spaces.push(space);
      return { space };
    });
  }
  function rename(name, id = activeId) {
    return change((r) => {
      name = String(name || "").trim();
      if (!name || name.length > 60)
        throw Error("Escribe un nombre de hasta 60 caracteres.");
      if (
        r.spaces.some(
          (s) =>
            s.id !== id &&
            s.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"),
        )
      )
        throw Error("Ya existe un espacio con ese nombre.");
      const space = r.spaces.find((s) => s.id === id);
      if (!space) throw Error("No encontramos ese espacio.");
      space.name = name;
    });
  }
  function removeSpace(id) {
    if (id === "personal")
      return { ok: false, error: "El espacio personal no se puede eliminar." };
    if (!canManage())
      return {
        ok: false,
        error: "Solo el propietario puede eliminar espacios.",
      };
    if (!flush())
      return {
        ok: false,
        error: "Guarda el escrito pendiente antes de eliminar el espacio.",
      };
    const result = change((r) => {
      if (!r.spaces.some((s) => s.id === id))
        throw Error("No encontramos ese espacio.");
      r.spaces = r.spaces.filter((s) => s.id !== id);
    });
    if (!result.ok) return result;
    const prefix = "cejpro.workspace:" + id + ":";
    for (const key of Object.keys(localStorage))
      if (key.startsWith(prefix)) localStorage.removeItem(key);
    if (id === activeId) {
      sessionStorage.setItem(activeKey, "personal");
      sessionStorage.removeItem(previewKey);
      localStorage.setItem(activeKey, "personal");
      location.hash = "inicio";
      location.reload();
    }
    return result;
  }
  function invite(email, memberRole) {
    return change((r) => {
      email = String(email || "")
        .trim()
        .toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180)
        throw Error("Escribe un correo válido.");
      if (!["reader", "editor"].includes(memberRole))
        throw Error("Selecciona Lector o Editor.");
      const space = r.spaces.find((s) => s.id === activeId);
      if (space.members.some((m) => m.email.toLowerCase() === email))
        throw Error("Este correo ya tiene una invitación en el espacio.");
      const member = {
        id: "member-" + crypto.randomUUID(),
        name: "",
        email,
        role: memberRole,
        status: "pending",
      };
      space.members.push(member);
      return { member };
    });
  }
  function updateMember(id, memberRole) {
    return change((r) => {
      const m = r.spaces
        .find((s) => s.id === activeId)
        .members.find((m) => m.id === id);
      if (!m || m.role === "owner")
        throw Error("No se puede cambiar al propietario.");
      if (!["reader", "editor"].includes(memberRole))
        throw Error("Selecciona un rol válido.");
      m.role = memberRole;
    });
  }
  function removeMember(id) {
    return change((r) => {
      const space = r.spaces.find((s) => s.id === activeId),
        m = space.members.find((m) => m.id === id);
      if (!m || m.role === "owner")
        throw Error("No se puede eliminar al propietario.");
      space.members = space.members.filter((m) => m.id !== id);
    });
  }
  function flush() {
    return !window.CejProWritings?.flush || window.CejProWritings.flush();
  }
  function activate(id, destination = "inicio") {
    if (!all().some((s) => s.id === id))
      return { ok: false, error: "No encontramos ese espacio." };
    if (!flush())
      return {
        ok: false,
        error: "Guarda el escrito pendiente antes de cambiar de espacio.",
      };
    try {
      sessionStorage.setItem(activeKey, id);
      sessionStorage.removeItem(previewKey);
      try {
        localStorage.setItem(activeKey, id);
      } catch (_) {}
      location.hash = destination === "espacios" ? "espacios" : "inicio";
      location.reload();
      return { ok: true };
    } catch (_) {
      return {
        ok: false,
        error: "No se pudo cambiar de espacio en este navegador.",
      };
    }
  }
  function previewRole(value) {
    if (!["owner", "reader", "editor"].includes(value))
      return { ok: false, error: "Rol no válido." };
    if (!flush())
      return { ok: false, error: "No se pudo guardar el escrito pendiente." };
    try {
      if (value === "owner") sessionStorage.removeItem(previewKey);
      else
        sessionStorage.setItem(
          previewKey,
          JSON.stringify({ workspaceId: activeId, role: value }),
        );
      location.reload();
      return { ok: true };
    } catch (_) {
      return { ok: false, error: "No se pudo abrir la vista del rol." };
    }
  }
  const ownerActionKey = "cejpro.workspace.ownerAction.v1";
  function continueAsOwner(action) {
    if (!preview || !["create", "invite"].includes(action))
      return { ok: false, error: "Acción no disponible." };
    try {
      sessionStorage.setItem(
        ownerActionKey,
        JSON.stringify({ workspaceId: activeId, action }),
      );
      const result = previewRole("owner");
      if (!result.ok) sessionStorage.removeItem(ownerActionKey);
      return result;
    } catch (_) {
      return {
        ok: false,
        error: "No se pudo volver a la vista de propietario.",
      };
    }
  }
  function takeOwnerAction() {
    if (!canManage()) return "";
    try {
      const pending = JSON.parse(sessionStorage.getItem(ownerActionKey));
      sessionStorage.removeItem(ownerActionKey);
      return pending?.workspaceId === activeId &&
        ["create", "invite"].includes(pending.action)
        ? pending.action
        : "";
    } catch (_) {
      return "";
    }
  }
  return {
    all,
    current,
    activeId,
    isPersonal: activeId === "personal",
    isPreview: !!preview,
    roles,
    role,
    canEdit,
    canManage,
    assertEdit,
    scopeKey,
    create,
    rename,
    removeSpace,
    invite,
    updateMember,
    removeMember,
    activate,
    previewRole,
    continueAsOwner,
    takeOwnerAction,
    error,
  };
})();
/* El ámbito se captura al cargar: los guardados pendientes nunca cambian de espacio. */
window.CejProStorage = (() => {
  const W = window.CejProWorkspaces;
  const viewKey = (key) =>
    key === "cejpro.recentCases.v1" || key.startsWith("cejpro.sinoe.view.v1");
  return {
    getItem: (key) => localStorage.getItem(W.scopeKey(key)),
    setItem(key, value) {
      if (!viewKey(key)) W.assertEdit();
      localStorage.setItem(W.scopeKey(key), value);
    },
    removeItem(key) {
      W.assertEdit();
      localStorage.removeItem(W.scopeKey(key));
    },
  };
})();
