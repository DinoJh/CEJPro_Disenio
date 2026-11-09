/* Clientes locales. Las asociaciones se conservan mediante el ID del caso. */
window.CejProClientsData = (() => {
  const key = "cejpro.clients.v1",
    normalize = window.CejProCasesData.normalize;
  function initial() {
    const clients = [];
    for (const c of window.CejProCasesData.load().cases) {
      if (!c.client.trim()) continue;
      let client = clients.find(
        (x) => normalize(x.name) === normalize(c.client),
      );
      if (!client) {
        client = {
          id: "client-" + crypto.randomUUID(),
          name: c.client,
          type: "person",
          document: "",
          phone: "",
          email: "",
          notes: "",
          caseIds: [],
        };
        clients.push(client);
      }
      client.caseIds.push(c.id);
    }
    return clients;
  }
  function valid(items) {
    const ids = new Set();
    return (
      Array.isArray(items) &&
      items.every((c) => {
        if (
          !c ||
          typeof c.id !== "string" ||
          !c.id ||
          ids.has(c.id) ||
          !["person", "company"].includes(c.type) ||
          !["name", "document", "phone", "email", "notes"].every(
            (k) => typeof c[k] === "string",
          ) ||
          !c.name.trim() ||
          c.name.length > 180 ||
          c.document.length > 40 ||
          c.phone.length > 50 ||
          c.email.length > 180 ||
          c.notes.length > 2000 ||
          !Array.isArray(c.caseIds) ||
          !c.caseIds.every((id) => typeof id === "string")
        )
          return false;
        ids.add(c.id);
        return true;
      })
    );
  }
  function withCodes(items) {
    let old = [];
    try {
      const raw = JSON.parse(window.CejProStorage.getItem(key));
      if (Array.isArray(raw)) old = raw;
    } catch (_) {}
    const number = (code) => {
      const m = /^(?:CL-|Cliente )(\d+)$/.exec(String(code || ""));
      return m && Number.isSafeInteger(+m[1]) && +m[1] > 0 ? +m[1] : 0;
    };
    let next =
      Math.max(0, ...[...old, ...items].map((c) => number(c.code))) + 1;
    const assigned = new Map(),
      used = new Set(),
      format = (n) => "Cliente " + String(n).padStart(3, "0");
    // Reservar primero los números persistidos, sin depender del orden del listado.
    for (const c of old) {
      const n = number(c.code);
      if (n && !used.has(n)) {
        assigned.set(c.id, n);
        used.add(n);
      }
    }
    // Los clientes anteriores sin número reciben uno antes que los recién creados.
    for (const c of old)
      if (!assigned.has(c.id)) {
        while (used.has(next)) next++;
        assigned.set(c.id, next);
        used.add(next++);
      }
    return items.map((c) => {
      let n = assigned.get(c.id);
      if (!n) {
        n = number(c.code);
        if (!n || used.has(n)) {
          while (used.has(next)) next++;
          n = next++;
        }
        used.add(n);
        assigned.set(c.id, n);
      }
      return { ...c, code: format(n) };
    });
  }
  function save(items) {
    try {
      items = withCodes(items);
      window.CejProStorage.setItem(key, JSON.stringify(items));
      return true;
    } catch (_) {
      return false;
    }
  }
  function load() {
    try {
      const raw = window.CejProStorage.getItem(key);
      if (raw !== null) {
        const data = JSON.parse(raw);
        if (valid(data)) {
          const coded = withCodes(data);
          if (coded.some((c, i) => c.code !== data[i].code)) save(coded);
          return coded;
        }
      }
    } catch (_) {}
    const items = initial();
    const coded = withCodes(items);
    save(coded);
    return coded;
  }
  function remove(id) {
    if (!window.CejProWorkspaces.canEdit())
      return { ok: false, error: "Solo lectura." };
    const storage = window.CejProStorage,
      keys = [key, "cejpro.billing.v1", "cejpro.receivedPayments.v1"],
      before = new Map();
    try {
      for (const k of keys) before.set(k, storage.getItem(k));
      const clients = load();
      if (!clients.some((c) => c.id === id))
        return { ok: false, error: "No encontramos este cliente." };
      const writes = keys.map((k) => {
        const raw = before.get(k);
        if (raw === null && k !== key) return [k, null];
        const rows = k === key ? clients : JSON.parse(raw);
        if (!Array.isArray(rows)) throw Error("Datos no válidos.");
        return [
          k,
          JSON.stringify(
            rows.filter((row) =>
              k === key ? row.id !== id : row.clientId !== id,
            ),
          ),
        ];
      });
      for (const [k, value] of writes)
        if (value !== null) storage.setItem(k, value);
      window.CejProBillingData?.reload();
      return { ok: true };
    } catch (_) {
      for (const [k, raw] of before)
        try {
          if (raw === null) storage.removeItem(k);
          else storage.setItem(k, raw);
        } catch (_) {}
      return {
        ok: false,
        error: "No se pudo eliminar el cliente. Inténtalo de nuevo.",
      };
    }
  }
  const identifier = (c) =>
    c.document?.trim()
      ? (/^\d{8}$/.test(c.document.trim())
          ? "DNI "
          : /^\d{11}$/.test(c.document.trim())
            ? "RUC "
            : "Documento ") + c.document.trim()
      : c.code || load().find((x) => x.id === c.id)?.code || "Sin documento";
  return { load, save, remove, normalize, identifier };
})();
