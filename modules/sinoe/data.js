/* Organización local de notificaciones. No consulta el servicio SINOE. */
window.CejProSinoeData = (() => {
  const key = "cejpro.sinoe.v1",
    activeKey = "cejpro.sinoe.linkedAccount.v1";
  let account = "";
  try {
    const id = window.CejProStorage.getItem(activeKey);
    if (typeof id === "string" && id.trim() && id.length <= 180) account = id;
  } catch (_) {}
  const accountKey = (base) =>
    account ? base + ":account:" + encodeURIComponent(account) : base;
  const linkedAccount = () => account;
  function link(user) {
    if (!window.CejProWorkspaces.canEdit()) return false;
    const id = String(user).trim().toLocaleLowerCase("es");
    if (!id || id.length > 180) return false;
    account = id;
    try {
      // Asignar los datos anteriores a la primera cuenta, sin borrar los originales.
      const ownerKey = "cejpro.sinoe.legacyOwner.v1";
      let owner = window.CejProStorage.getItem(ownerKey);
      if (!owner) {
        window.CejProStorage.setItem(ownerKey, id);
        owner = id;
      }
      if (owner === id)
        for (const base of [
          key,
          "cejpro.sinoe.folders.v1",
          "cejpro.sinoe.examples.v1",
        ]) {
          const scoped = accountKey(base),
            legacy = window.CejProStorage.getItem(base);
          if (window.CejProStorage.getItem(scoped) === null && legacy !== null)
            window.CejProStorage.setItem(scoped, legacy);
        }
      window.CejProStorage.setItem(activeKey, id);
    } catch (_) {}
    return true;
  }
  function unlink() {
    if (!window.CejProWorkspaces.canEdit()) return;
    account = "";
    try {
      window.CejProStorage.removeItem(activeKey);
      sessionStorage.removeItem("cejpro.sinoe.preview");
    } catch (_) {}
  }

  function date(v) {
    if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v + "T12:00:00");
    return (
      !isNaN(d) &&
      d.getFullYear() === Number(v.slice(0, 4)) &&
      d.getMonth() + 1 === Number(v.slice(5, 7)) &&
      d.getDate() === Number(v.slice(8, 10))
    );
  }
  function valid(items) {
    const ids = new Set();
    return (
      Array.isArray(items) &&
      items.every((n) => {
        if (
          !n ||
          typeof n.id !== "string" ||
          !n.id ||
          ids.has(n.id) ||
          !["title", "number", "organ", "caseId", "note"].every(
            (k) => typeof n[k] === "string",
          ) ||
          !n.title.trim() ||
          n.title.length > 180 ||
          n.number.length > 100 ||
          n.organ.length > 180 ||
          n.note.length > 2000 ||
          !date(n.date) ||
          typeof n.read !== "boolean" ||
          !Array.isArray(n.attachments) ||
          !n.attachments.every(
            (f) =>
              f &&
              typeof f.id === "string" &&
              typeof f.name === "string" &&
              Number.isSafeInteger(f.size) &&
              f.size >= 0,
          )
        )
          return false;
        ids.add(n.id);
        return true;
      })
    );
  }
  function load() {
    try {
      const data = JSON.parse(window.CejProStorage.getItem(accountKey(key)));
      if (valid(data))
        return data.map((n) => ({
          ...n,
          folderId: typeof n.folderId === "string" ? n.folderId : "",
        }));
    } catch (_) {}
    return [];
  }
  function save(items) {
    try {
      window.CejProStorage.setItem(accountKey(key), JSON.stringify(items));
      return true;
    } catch (_) {
      return false;
    }
  }
  const folderKey = "cejpro.sinoe.folders.v1";
  function loadFolders() {
    try {
      const data = JSON.parse(
          window.CejProStorage.getItem(accountKey(folderKey)),
        ),
        ids = new Set(),
        names = new Set();
      if (
        Array.isArray(data) &&
        data.every((f) => {
          if (
            !f ||
            typeof f.id !== "string" ||
            !f.id ||
            typeof f.name !== "string" ||
            !f.name.trim() ||
            f.name.length > (f.autoCaseKey ? 180 : 40) ||
            ids.has(f.id) ||
            names.has(window.CejProCasesData.normalize(f.name))
          )
            return false;
          ids.add(f.id);
          names.add(window.CejProCasesData.normalize(f.name));
          return true;
        })
      )
        return data;
    } catch (_) {}
    return [];
  }
  function saveFolders(folders) {
    try {
      window.CejProStorage.setItem(
        accountKey(folderKey),
        JSON.stringify(folders),
      );
      return true;
    } catch (_) {
      return false;
    }
  }
  // Agrupa por número de expediente, respetando la organización manual.
  function organizeByCase(items, folders) {
    if (!account || !window.CejProWorkspaces.canEdit())
      return { items, folders };
    const all = window.CejProCasesData.load().cases;
    let foldersChanged = false,
      itemsChanged = false;
    for (const n of items) {
      if (n.folderMode === "manual") continue;
      const current = folders.find((f) => f.id === n.folderId);
      if (current && !current.autoCaseKey) continue;
      const c = all.find((c) => c.id === n.caseId),
        number = String(n.caseNumber || c?.number || "").trim();
      if (!number || number.length > 180) continue;
      const normalized = number
        .normalize("NFKC")
        .replace(/[‐-―]/g, "-")
        .replace(/\s+/g, "")
        .toUpperCase();
      let target = folders.find((f) => f.autoCaseKey === normalized);
      if (!target) {
        target = folders.find(
          (f) =>
            window.CejProCasesData.normalize(f.name) ===
            window.CejProCasesData.normalize(number),
        );
        if (!target) {
          target = {
            id: "sinoe-case-" + encodeURIComponent(normalized),
            name: number,
            autoCaseKey: normalized,
          };
          folders.push(target);
          foldersChanged = true;
        }
      }
      if (n.folderId !== target.id) {
        n.folderId = target.id;
        itemsChanged = true;
      }
    }
    const occupied = new Set(items.flatMap((n) => [n.folderId, ...(n.copiedFolderIds || [])]));
    const kept = folders.filter((f) => !f.autoCaseKey || occupied.has(f.id));
    if (kept.length !== folders.length) {
      folders = kept;
      foldersChanged = true;
    }
    if (foldersChanged) saveFolders(folders);
    if (itemsChanged) save(items);
    return { items, folders };
  }
  function loadView() {
    try {
      const v = JSON.parse(
        window.CejProStorage.getItem(accountKey("cejpro.sinoe.view.v1")),
      );
      if (
        v &&
        typeof v.folder === "string" &&
        ["all", "read", "unread"].includes(v.filter) &&
        typeof v.search === "string" &&
        v.search.length <= 180 &&
        Number.isSafeInteger(v.page) &&
        v.page > 0
      )
        return {
          ...v,
          organFilter:
            typeof v.organFilter === "string" && v.organFilter.length <= 200
              ? v.organFilter
              : "all",
          monthFilter: /^(all|0[1-9]|1[0-2])$/.test(v.monthFilter)
            ? v.monthFilter
            : "all",
          yearFilter: /^(all|[0-9]{4})$/.test(v.yearFilter)
            ? v.yearFilter
            : "all",
        };
    } catch (_) {}
    return { folder: "all", filter: "all", search: "", page: 1 };
  }
  function saveView(view) {
    try {
      window.CejProStorage.setItem(
        accountKey("cejpro.sinoe.view.v1"),
        JSON.stringify(view),
      );
    } catch (_) {}
  }
  function seedExamples(items) {
    if (
      !window.CejProWorkspaces.isPersonal ||
      !window.CejProWorkspaces.canEdit()
    )
      return items;
    let seeded = false;
    try {
      seeded =
        window.CejProStorage.getItem(accountKey("cejpro.sinoe.examples.v1")) ===
        "3";
    } catch (_) {}
    if (seeded) return items;
    const all = window.CejProCasesData.load().cases,
      today = window.CejProBillingData.today();
    const examples = [
      {
        id: "sinoe-example-1",
        title: "Resolución: programación de audiencia",
        number: "EJEMPLO-001",
        date: today,
        organ: "Juzgado de Trabajo · Ejemplo",
        caseId: all[0]?.id || "",
        note: "Revisar la resolución y sus documentos adjuntos.",
        read: false,
        folderId: "",
        demo: true,
        attachments: [
          {
            id: "sinoe-demo-audiencia-resolucion",
            name: "Resolución - audiencia.pdf",
            size: 0,
          },
          {
            id: "sinoe-demo-audiencia-anexo",
            name: "Anexo de la notificación.pdf",
            size: 0,
          },
        ],
      },
      {
        id: "sinoe-example-2",
        title: "Resolución: traslado de escrito",
        number: "EJEMPLO-002",
        date: today,
        organ: "Juzgado Civil · Ejemplo",
        caseId: all[1]?.id || "",
        note: "",
        read: true,
        folderId: "",
        demo: true,
        attachments: [
          {
            id: "sinoe-demo-traslado-resolucion",
            name: "Resolución - traslado.pdf",
            size: 0,
          },
        ],
      },
    ];
    const reference =
      items.find((n) => n.id === "sinoe-example-1") || examples[0];
    examples.push({
      id: "sinoe-example-3",
      title: "Resolución: traslado de escrito",
      number: "EJEMPLO-003",
      date: today,
      organ: reference.organ,
      caseId: reference.caseId,
      caseNumber: reference.caseNumber || "",
      note: "Segunda notificación del mismo expediente que la programación de audiencia.",
      read: true,
      folderId: "",
      demo: true,
      attachments: [
        {
          id: "sinoe-demo-traslado-resolucion",
          name: "Resolución - traslado.pdf",
          size: 0,
        },
      ],
    });
    const merged = [
      ...items,
      ...examples.filter((n) => !items.some((x) => x.id === n.id)),
    ];
    const exampleNumber = "00705-2025-0-2101-JR-CI-02",
      exampleCase = all.find(
        (c) =>
          String(c.number || "")
            .trim()
            .toUpperCase() === exampleNumber,
      );
    for (const n of merged) {
      if (["sinoe-example-1", "sinoe-example-3"].includes(n.id)) {
        n.caseNumber = exampleNumber;
        n.caseId = exampleCase?.id || "";
        n.organ = "Juzgado Civil · Ejemplo";
        n.folderId = "";
        n.folderMode = "auto";
      }
    }
    const saved = save(merged);
    if (saved)
      try {
        window.CejProStorage.setItem(
          accountKey("cejpro.sinoe.examples.v1"),
          "3",
        );
      } catch (_) {}
    return merged;
  }
  return {
    organizeByCase,
    load,
    save,
    date,
    loadFolders,
    saveFolders,
    seedExamples,
    linkedAccount,
    link,
    unlink,
    loadView,
    saveView,
  };
})();
