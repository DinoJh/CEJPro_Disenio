/* Estado local del listado. Todos los registros iniciales son ficticios. */
window.CejProCasesData = (() => {
  const key = "cejpro.cases.v1";
  const statuses = {
    active: "En trámite",
    pending: "Pendiente",
    archived: "Archivado",
  };
  const normalize = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .trim();
  function demo() {
    return {
      folders: [
        { id: "laboral", name: "Laboral" },
        { id: "civil", name: "Civil" },
        { id: "familia", name: "Familia" },
      ],
      cases: [
        {
          id: "case-demo-1",
          title: "Beneficios sociales",
          number: "DEMO-LAB-001",
          client: "María Torres",
          status: "active",
          folderId: "laboral",
          note: "Confirmar con la cliente la entrega de las boletas de pago.",
        },
        {
          id: "case-demo-2",
          title: "Obligación de dar suma de dinero",
          number: "DEMO-CIV-002",
          client: "Carlos Mendoza",
          status: "pending",
          folderId: "civil",
        },
        {
          id: "case-demo-3",
          title: "Reposición laboral",
          number: "DEMO-LAB-003",
          client: "Empresa Andina",
          status: "active",
          folderId: "laboral",
        },
        {
          id: "case-demo-4",
          title: "División y partición",
          number: "DEMO-CIV-004",
          client: "Lucía Rojas",
          status: "active",
          folderId: "civil",
        },
        {
          id: "case-demo-5",
          title: "Alimentos",
          number: "DEMO-FAM-005",
          client: "Ana Salazar",
          status: "pending",
          folderId: "familia",
        },
        {
          id: "case-demo-6",
          title: "Liquidación de beneficios",
          number: "DEMO-LAB-006",
          client: "Diego Herrera",
          status: "archived",
          folderId: "laboral",
        },
        {
          id: "case-demo-7",
          title: "Acuerdo de tenencia",
          number: "DEMO-FAM-007",
          client: "Javier Medina",
          status: "active",
          folderId: "familia",
        },
      ],
    };
  }
  function valid(state) {
    if (!state || !Array.isArray(state.cases) || !Array.isArray(state.folders))
      return false;
    const ids = new Set(),
      names = new Set();
    for (const f of state.folders) {
      if (
        !f ||
        typeof f.id !== "string" ||
        !f.id ||
        typeof f.name !== "string" ||
        !f.name.trim() ||
        f.name.length > 40 ||
        ids.has(f.id) ||
        names.has(normalize(f.name))
      )
        return false;
      ids.add(f.id);
      names.add(normalize(f.name));
    }
    const caseIds = new Set();
    return state.cases.every((c) => {
      if (
        !c ||
        typeof c.id !== "string" ||
        !c.id ||
        caseIds.has(c.id) ||
        typeof c.title !== "string" ||
        !c.title.trim() ||
        c.title.length > 120 ||
        !["number", "client"].every(
          (k) => typeof c[k] === "string" && c[k].length <= 180,
        ) ||
        (c.note !== undefined &&
          (typeof c.note !== "string" || c.note.length > 2000)) ||
        (c.identityId !== undefined && typeof c.identityId !== "string") ||
        !Object.hasOwn(statuses, c.status) ||
        (c.folderId !== "" && !ids.has(c.folderId))
      )
        return false;
      caseIds.add(c.id);
      return true;
    });
  }
  function load() {
    try {
      const saved = JSON.parse(window.CejProStorage.getItem(key));
      if (valid(saved)) return saved;
    } catch (_) {}
    return window.CejProWorkspaces.isPersonal
      ? demo()
      : { folders: [], cases: [] };
  }
  function save(state) {
    try {
      window.CejProStorage.setItem(key, JSON.stringify(state));
      return true;
    } catch (_) {
      return false;
    }
  }
  function query(state, { folder = "all", status = "all", search = "" } = {}) {
    const term = normalize(search);
    return state.cases.filter(
      (c) =>
        (folder === "all" ||
          c.folderId === (folder === "unfiled" ? "" : folder)) &&
        (status === "all" || c.status === status) &&
        (!term ||
          normalize([c.title, c.number, c.client].join(" ")).includes(term)),
    );
  }
  return { statuses, normalize, demo, valid, load, save, query };
})();
