/* Borradores de texto locales, sin presentación judicial ni servicios externos. */
window.CejProWritingsData = (() => {
  const key = "cejpro.writings.v1",
    kinds = [
      "Escrito",
      "Demanda",
      "Contestación",
      "Solicitud",
      "Recurso",
      "Otro",
    ],
    statuses = { draft: "Borrador", review: "Para revisión" };
  function valid(items) {
    const ids = new Set();
    return (
      Array.isArray(items) &&
      items.every((x) => {
        if (
          !x ||
          typeof x.id !== "string" ||
          !x.id ||
          ids.has(x.id) ||
          typeof x.title !== "string" ||
          !x.title.trim() ||
          x.title.length > 180 ||
          typeof x.content !== "string" ||
          x.content.length > 50000 ||
          (x.html !== undefined &&
            (typeof x.html !== "string" || x.html.length > 500000)) ||
          typeof x.caseId !== "string" ||
          !kinds.includes(x.kind) ||
          !Object.hasOwn(statuses, x.status) ||
          !Number.isSafeInteger(x.createdAt) ||
          !Number.isSafeInteger(x.updatedAt)
        )
          return false;
        ids.add(x.id);
        return true;
      })
    );
  }
  function load() {
    try {
      const saved = JSON.parse(window.CejProStorage.getItem(key));
      if (valid(saved)) return saved;
    } catch (_) {}
    return [];
  }
  function save(items) {
    try {
      window.CejProStorage.setItem(key, JSON.stringify(items));
      return true;
    } catch (_) {
      return false;
    }
  }
  function create() {
    const now = Date.now();
    return {
      id: "writing-" + crypto.randomUUID(),
      title: "Sin título",
      content: "",
      caseId: "",
      kind: "Escrito",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
  }
  return { load, save, create, kinds, statuses };
})();
