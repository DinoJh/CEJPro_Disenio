/* Datos ficticios relativos a hoy. No provienen del CEJ ni del SINOE. */
window.CejProCalendarData = (() => {
  const dateKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fromKey = (key) => new Date(`${key}T12:00:00`);
  function demo(today) {
    const date = (offset) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return dateKey(d);
    };
    return [
      {
        id: "demo-1",
        title: "Audiencia de conciliación",
        type: "audiencia",
        date: date(0),
        time: "09:00",
        caseRef: "Caso laboral · Ejemplo 01",
        client: "María Torres · Ejemplo",
        location: "Sala virtual",
        notes: "Revisar los documentos antes de la audiencia.",
        done: false,
      },
      {
        id: "demo-2",
        title: "Presentar escrito de subsanación",
        type: "plazo",
        date: date(0),
        time: "16:00",
        caseRef: "Caso civil · Ejemplo 02",
        client: "Carlos Mendoza · Ejemplo",
        location: "",
        notes: "Fecha ingresada manualmente para esta demostración.",
        done: false,
      },
      {
        id: "demo-3",
        title: "Reunión con cliente",
        type: "reunion",
        date: date(3),
        time: "11:00",
        caseRef: "Caso civil · Ejemplo 02",
        client: "Carlos Mendoza · Ejemplo",
        location: "Oficina del estudio",
        notes: "Revisar avances y próximos pasos.",
        done: false,
      },
      {
        id: "demo-4",
        title: "Vence plazo de contestación",
        type: "plazo",
        date: date(5),
        time: "15:00",
        caseRef: "Caso laboral · Ejemplo 03",
        client: "Empresa Andina · Ejemplo",
        location: "",
        notes: "Fecha de ejemplo; no es un cálculo de plazo judicial.",
        done: false,
      },
      {
        id: "demo-5",
        title: "Diligencia en juzgado",
        type: "diligencia",
        date: date(7),
        time: "10:30",
        caseRef: "Caso civil · Ejemplo 04",
        client: "Lucía Rojas · Ejemplo",
        location: "Sede judicial",
        notes: "",
        done: false,
      },
      {
        id: "demo-6",
        title: "Audiencia de pruebas",
        type: "audiencia",
        date: date(10),
        time: "08:30",
        caseRef: "Caso civil · Ejemplo 04",
        client: "Lucía Rojas · Ejemplo",
        location: "Sala virtual",
        notes: "",
        done: false,
      },
    ];
  }
  const types = {
    audiencia: "Audiencias",
    plazo: "Plazos",
    reunion: "Reuniones",
    diligencia: "Diligencias",
  };
  const singular = {
    audiencia: "Audiencia",
    plazo: "Plazo",
    reunion: "Reunión",
    diligencia: "Diligencia",
  };
  const storageKey = "cejpro.v02.calendar";
  let cachedEvents = null;
  function valid(e) {
    return (
      e &&
      typeof e.id === "string" &&
      typeof e.title === "string" &&
      e.title.trim() &&
      e.title.length <= 120 &&
      Object.hasOwn(types, e.type) &&
      /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
      !Number.isNaN(fromKey(e.date).getTime()) &&
      dateKey(fromKey(e.date)) === e.date &&
      (!e.time || /^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)) &&
      ["caseRef", "client", "location", "notes"].every(
        (k) => typeof e[k] === "string",
      ) &&
      typeof e.done === "boolean" &&
      (e.caseId === undefined || typeof e.caseId === "string") &&
      (e.clientId === undefined || typeof e.clientId === "string")
    );
  }
  function load(today = new Date()) {
    if (cachedEvents) return cachedEvents;
    try {
      const raw = window.CejProStorage.getItem(storageKey);
      if (raw !== null) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.every(valid)) {
          cachedEvents = saved;
          return cachedEvents;
        }
      }
    } catch (_) {}
    cachedEvents = window.CejProWorkspaces.isPersonal ? demo(today) : [];
    return cachedEvents;
  }
  function save(events) {
    if (!window.CejProWorkspaces.canEdit()) return false;
    cachedEvents = events;
    let stored = true;
    try {
      window.CejProStorage.setItem(storageKey, JSON.stringify(events));
    } catch (_) {
      stored = false;
    }
    window.dispatchEvent(new CustomEvent("cejpro:calendar-change"));
    return stored;
  }
  return { dateKey, fromKey, demo, types, singular, load, save };
})();
