/* Pagos recibidos directamente, sin crear una deuda previa. */
window.CejProReceivedPayments = (() => {
  const key = "cejpro.receivedPayments.v1",
    B = window.CejProBillingData;
  function load() {
    const raw = window.CejProStorage.getItem(key);
    if (raw === null) return [];
    const rows = JSON.parse(raw);
    if (
      !Array.isArray(rows) ||
      !rows.every(
        (x) =>
          x &&
          typeof x.id === "string" &&
          typeof x.clientId === "string" &&
          typeof x.caseId === "string" &&
          typeof x.concept === "string" &&
          x.concept.trim() &&
          ["PEN", "USD"].includes(x.currency) &&
          Number.isSafeInteger(x.amount) &&
          x.amount > 0 &&
          typeof x.date === "string" &&
          typeof x.method === "string" &&
          typeof x.notes === "string",
      )
    )
      throw Error("No se pudieron leer los pagos guardados.");
    return rows;
  }
  function date(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v || "")) return false;
    const d = new Date(v + "T12:00:00");
    return (
      !isNaN(d) &&
      d.getFullYear() === +v.slice(0, 4) &&
      d.getMonth() + 1 === +v.slice(5, 7) &&
      d.getDate() === +v.slice(8, 10)
    );
  }
  function write(rows) {
    window.CejProStorage.setItem(key, JSON.stringify(rows));
  }
  function save(clientId, input) {
    if (!window.CejProWorkspaces.canEdit())
      return { ok: false, error: "Solo lectura." };
    try {
      const rows = load(),
        old = rows.find((x) => x.id === input.id && x.clientId === clientId);
      if (input.id && !old)
        return { ok: false, error: "No encontramos este pago." };
      const amount = B.cents(input.amount),
        concept = String(input.concept || "").trim() || "Otro";
      if (amount === null)
        return {
          ok: false,
          error: "Ingresa un importe mayor a cero, con hasta dos decimales.",
        };
      if (concept.length > 180)
        return {
          ok: false,
          error: "El motivo del pago admite hasta 180 caracteres.",
        };
      if (!["PEN", "USD"].includes(input.currency) || !date(input.date))
        return { ok: false, error: "Revisa la moneda y la fecha." };
      const row = {
        id: old?.id || "received-" + crypto.randomUUID(),
        clientId,
        caseId: String(input.caseId || ""),
        concept,
        amount,
        currency: input.currency,
        date: input.date,
        method: String(input.method || "Efectivo"),
        notes: String(input.notes || "")
          .trim()
          .slice(0, 180),
      };
      if (old) rows[rows.indexOf(old)] = row;
      else rows.unshift(row);
      write(rows);
      return { ok: true, saved: true, id: row.id };
    } catch (_) {
      return {
        ok: false,
        error: "No se pudo guardar el pago. Inténtalo de nuevo.",
      };
    }
  }
  function remove(clientId, id) {
    if (!window.CejProWorkspaces.canEdit())
      return { ok: false, error: "Solo lectura." };
    try {
      const rows = load();
      if (!rows.some((x) => x.id === id && x.clientId === clientId))
        return { ok: false, error: "No encontramos este pago." };
      write(rows.filter((x) => !(x.id === id && x.clientId === clientId)));
      return { ok: true, saved: true };
    } catch (_) {
      return { ok: false, error: "No se pudo eliminar el pago." };
    }
  }
  return {
    list: (clientId) => load().filter((x) => x.clientId === clientId),
    save,
    remove,
  };
})();
