/* Importes en céntimos y compatibilidad con pagos almacenados en cejpro.billing.v1.
 * La interfaz vigente registra pagos nuevos mediante received-payments.js.
 */
window.CejProBillingData = (() => {
  const key = "cejpro.billing.v1",
    limit = 100000000000;
  const money = (n, currency = "PEN") =>
    (currency === "USD" ? "US$ " : "S/ ") +
    (n / 100).toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
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
  function cents(v) {
    const s = String(v).trim().replace(",", ".");
    if (!/^\d+(?:\.\d{1,2})?$/.test(s)) return null;
    const [whole, part = ""] = s.split("."),
      n = Number(whole) * 100 + Number(part.padEnd(2, "0"));
    return Number.isSafeInteger(n) && n > 0 && n <= limit ? n : null;
  }
  const amount = (n) => Number.isSafeInteger(n) && n > 0 && n <= limit;
  const paid = (c) => c.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = (c) => c.amount - paid(c);
  function valid(items) {
    const ids = new Set(),
      paymentIds = new Set();
    return (
      Array.isArray(items) &&
      items.every((c) => {
        if (
          !c ||
          typeof c.id !== "string" ||
          !c.id ||
          ids.has(c.id) ||
          typeof c.clientId !== "string" ||
          !c.clientId ||
          typeof c.concept !== "string" ||
          !c.concept.trim() ||
          c.concept.length > 180 ||
          !amount(c.amount) ||
          (c.currency !== undefined && !["PEN", "USD"].includes(c.currency)) ||
          !date(c.date) ||
          !(c.dueDate === "" || date(c.dueDate)) ||
          typeof c.caseId !== "string" ||
          !Array.isArray(c.payments)
        )
          return false;
        ids.add(c.id);
        return (
          c.payments.every((p) => {
            if (
              !p ||
              typeof p.id !== "string" ||
              !p.id ||
              paymentIds.has(p.id) ||
              !amount(p.amount) ||
              !date(p.date) ||
              typeof p.method !== "string" ||
              typeof p.reference !== "string" ||
              p.reference.length > 180
            )
              return false;
            paymentIds.add(p.id);
            return true;
          }) && paid(c) <= c.amount
        );
      })
    );
  }
  let items = [];
  try {
    const data = JSON.parse(window.CejProStorage.getItem(key));
    if (valid(data))
      items = data.map((c) => ({ ...c, currency: c.currency || "PEN" }));
  } catch (_) {}
  function persist() {
    try {
      window.CejProStorage.setItem(key, JSON.stringify(items));
      return true;
    } catch (_) {
      return false;
    }
  }
  const list = (id) =>
    items
      .filter((c) => c.clientId === id)
      .map((c) => ({ ...c, payments: c.payments.map((p) => ({ ...p })) }));
  function removePayment(clientId, id, paymentId) {
    if (!window.CejProWorkspaces.canEdit())
      return { ok: false, error: "Solo lectura." };
    const c = items.find((c) => c.id === id && c.clientId === clientId),
      p = c?.payments.find((p) => p.id === paymentId);
    if (!p) return { ok: false, error: "No encontramos este pago." };
    c.payments = c.payments.filter((x) => x.id !== paymentId);
    return { ok: true, saved: persist() };
  }
  function editPayment(clientId, id, paymentId, input) {
    if (!window.CejProWorkspaces.canEdit())
      return { ok: false, error: "Solo lectura." };
    const c = items.find((c) => c.id === id && c.clientId === clientId),
      p = c?.payments.find((p) => p.id === paymentId),
      value = cents(input.amount);
    if (!p) return { ok: false, error: "No encontramos este pago." };
    if (value === null)
      return { ok: false, error: "Ingresa un importe mayor a cero." };
    if (value > balance(c) + p.amount)
      return {
        ok: false,
        error: "El pago no puede superar el saldo del cobro.",
      };
    if (!date(input.date))
      return { ok: false, error: "Revisa la fecha del pago." };
    Object.assign(p, {
      amount: value,
      date: input.date,
      method: input.method || "Otro",
      reference: String(input.reference || "")
        .trim()
        .slice(0, 180),
    });
    return { ok: true, saved: persist() };
  }
  function reload() {
    const data = JSON.parse(window.CejProStorage.getItem(key) || "[]");
    if (valid(data))
      items = data.map((c) => ({ ...c, currency: c.currency || "PEN" }));
  }
  return {
    reload,
    money,
    today,
    cents,
    paid,
    list,
    removePayment,
    editPayment,
  };
})();
