/* Carpetas de documentos y partes por caso. Almacenamiento local independiente. */
window.CejProCaseDetailData = (() => {
  const key = "cejpro.caseDetails.v1",
    records = new Map();
  const roles = [
    "Demandante",
    "Demandado",
    "Solicitante",
    "Denunciante",
    "Denunciado",
    "Abogado/a",
    "Representante",
    "Testigo",
    "Otro",
  ];
  const normalize = (value) => window.CejProCasesData.normalize(value);
  function valid(r) {
    return (
      r &&
      Array.isArray(r.folders) &&
      r.folders.every(
        (f) =>
          f &&
          typeof f.id === "string" &&
          typeof f.name === "string" &&
          f.name.trim() &&
          f.name.length <= 40,
      ) &&
      Array.isArray(r.parties) &&
      r.parties.every(
        (p) =>
          p &&
          typeof p.id === "string" &&
          typeof p.name === "string" &&
          p.name.trim() &&
          p.name.length <= 180 &&
          typeof p.role === "string" &&
          p.role.trim() &&
          p.role.length <= 80 &&
          typeof p.document === "string" &&
          p.document.length <= 40 &&
          typeof p.contact === "string" &&
          p.contact.length <= 180,
      )
    );
  }
  try {
    const saved = JSON.parse(window.CejProStorage.getItem(key));
    if (saved && typeof saved === "object" && !Array.isArray(saved))
      for (const [id, r] of Object.entries(saved))
        if (valid(r)) records.set(id, r);
  } catch (_) {}
  function get(id) {
    if (!records.has(id)) records.set(id, { folders: [], parties: [] });
    return records.get(id);
  }
  function save() {
    try {
      window.CejProStorage.setItem(
        key,
        JSON.stringify(Object.fromEntries(records)),
      );
      return true;
    } catch (_) {
      return false;
    }
  }
  function addFolder(id, name) {
    if (!window.CejProWorkspaces.canEdit())
      return { ok: false, error: "Solo lectura." };
    const r = get(id),
      trimmed = name.trim();
    if (!trimmed || trimmed.length > 40)
      return { ok: false, error: "Escribe un nombre de hasta 40 caracteres." };
    if (r.folders.some((f) => normalize(f.name) === normalize(trimmed)))
      return {
        ok: false,
        error: "Ya existe una carpeta con ese nombre en este caso.",
      };
    const f = { id: "docfolder-" + crypto.randomUUID(), name: trimmed };
    r.folders.push(f);
    return { ok: true, folder: f, saved: save() };
  }
  function saveParty(id, party) {
    if (!window.CejProWorkspaces.canEdit())
      return { ok: false, error: "Solo lectura." };
    const r = get(id);
    if (!valid({ folders: [], parties: [party] }))
      return {
        ok: false,
        error: "Revisa el nombre y los datos del involucrado.",
      };
    const i = r.parties.findIndex((p) => p.id === party.id);
    if (i < 0) r.parties.push(party);
    else r.parties[i] = party;
    return { ok: true, saved: save() };
  }
  return { get, addFolder, saveParty, roles };
})();
