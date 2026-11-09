/* Identidades de prueba locales. No sincroniza datos con CEJ ni con la extensión. */
window.CejProIdentitiesData = (() => {
  const key = "cejpro.identities.v1";
  const normalizeNumber = (v) =>
    String(v || "")
      .trim()
      .toUpperCase();
  function date(v) {
    if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v + "T12:00:00");
    return (
      !isNaN(d) &&
      d.getFullYear() === +v.slice(0, 4) &&
      d.getMonth() + 1 === +v.slice(5, 7) &&
      d.getDate() === +v.slice(8, 10)
    );
  }
  function valid(x) {
    return (
      x &&
      typeof x.id === "string" &&
      x.id &&
      typeof x.alias === "string" &&
      x.alias.length <= 60 &&
      ["dni", "ce"].includes(x.documentType) &&
      typeof x.documentNumber === "string" &&
      (x.documentType === "dni" ? /^[0-9]{8}$/ : /^[A-Z0-9]{9,12}$/).test(
        x.documentNumber,
      ) &&
      date(x.birthDate) &&
      typeof x.digit === "string" &&
      typeof x.issueDate === "string" &&
      (x.documentType !== "dni" ||
        (/^[0-9]{1,3}$/.test(x.digit) && date(x.issueDate)))
    );
  }
  function load() {
    try {
      const data = JSON.parse(window.CejProStorage.getItem(key));
      if (
        Array.isArray(data) &&
        data.every(valid) &&
        new Set(data.map((x) => x.id)).size === data.length
      )
        return data;
    } catch (_) {}
    return [];
  }
  const linked = (id) =>
    window.CejProCasesData.load().cases.filter((c) => c.identityId === id);
  const get = (id) => load().find((x) => x.id === id);
  const label = (x) =>
    x
      ? (x.alias ? x.alias + " · " : "") +
        (x.documentType === "dni" ? "DNI " : "CE ") +
        x.documentNumber
      : "Sin identidad asignada";
  function save(input) {
    if (!window.CejProWorkspaces.canEdit())
      return { ok: false, error: "Solo lectura." };
    const all = load(),
      existing = all.find((x) => x.id === input.id);
    if (input.id && !existing)
      return { ok: false, error: "No encontramos esta identidad." };
    const dni = input.documentType === "dni",
      x = {
        id: existing?.id || "identity-" + crypto.randomUUID(),
        alias: String(input.alias || "").trim(),
        documentType: input.documentType,
        documentNumber: normalizeNumber(input.documentNumber),
        birthDate: String(input.birthDate || ""),
        digit: dni ? String(input.digit || "").trim() : "",
        issueDate: String(input.issueDate || ""),
      };
    if (!valid(x) || !date(x.issueDate))
      return {
        ok: false,
        error: "Revisa el documento, las fechas y los campos requeridos.",
      };
    if (
      all.some(
        (y) =>
          y.id !== x.id &&
          y.documentType === x.documentType &&
          y.documentNumber === x.documentNumber,
      )
    )
      return {
        ok: false,
        error: "Ya existe una identidad con este tipo y número de documento.",
      };
    const index = all.findIndex((y) => y.id === x.id);
    if (index < 0) all.push(x);
    else all[index] = x;
    try {
      window.CejProStorage.setItem(key, JSON.stringify(all));
    } catch (_) {
      return {
        ok: false,
        error:
          "No se pudo guardar la identidad en este navegador. Inténtalo nuevamente.",
      };
    }
    return { ok: true, identity: x };
  }
  function remove(id) {
    if (!window.CejProWorkspaces.canEdit())
      return { ok: false, error: "Solo lectura." };
    if (linked(id).length)
      return {
        ok: false,
        error:
          "Reasigna los expedientes vinculados antes de eliminar esta identidad.",
      };
    const all = load();
    if (!all.some((x) => x.id === id))
      return { ok: false, error: "No encontramos esta identidad." };
    try {
      window.CejProStorage.setItem(
        key,
        JSON.stringify(all.filter((x) => x.id !== id)),
      );
      return { ok: true };
    } catch (_) {
      return { ok: false, error: "No se pudo eliminar la identidad." };
    }
  }
  return { load, get, label, linked, save, remove };
})();
