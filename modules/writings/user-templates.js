/* Biblioteca personal de formatos, independiente de los borradores. */
window.CejProUserTemplates = (() => {
  const key = "cejpro.writingTemplates.v1";
  function valid(items) {
    const ids = new Set();
    return (
      Array.isArray(items) &&
      items.every((t) => {
        if (
          !t ||
          typeof t.id !== "string" ||
          !t.id.startsWith("custom-template-") ||
          ids.has(t.id) ||
          typeof t.name !== "string" ||
          !t.name.trim() ||
          t.name.length > 100 ||
          typeof t.description !== "string" ||
          t.description.length > 240 ||
          typeof t.html !== "string" ||
          t.html.length > 500000 ||
          !window.CejProWritingsData.kinds.includes(t.kind) ||
          !Number.isSafeInteger(t.createdAt) ||
          !Number.isSafeInteger(t.updatedAt)
        )
          return false;
        ids.add(t.id);
        return true;
      })
    );
  }
  function load() {
    try {
      const data = JSON.parse(window.CejProStorage.getItem(key));
      if (valid(data)) return data;
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
  return { load, save };
})();
