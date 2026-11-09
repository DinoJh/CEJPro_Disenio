(() => {
  const C = window.CejProCalendarData,
    esc = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  let host,
    selected = C.dateKey(new Date()),
    month = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
  const key = "cejpro.recentCases.v1",
    $ = (id) => host.querySelector("#" + id),
    icon = (name) => `<span class="icon">${window.CejProIcon(name)}</span>`;
  function history() {
    try {
      const ids = JSON.parse(window.CejProStorage.getItem(key));
      if (Array.isArray(ids) && ids.every((id) => typeof id === "string"))
        return ids;
    } catch (_) {}
    return [];
  }
  function recordCase(id) {
    if (!window.CejProCasesData.load().cases.some((c) => c.id === id)) return;
    const ids = [id, ...history().filter((x) => x !== id)].slice(0, 20);
    try {
      window.CejProStorage.setItem(key, JSON.stringify(ids));
    } catch (_) {}
  }
  function empty(name, title, text, href, label) {
    return `<div class="home-empty">${icon(name)}<p>${text}</p></div>`;
  }
  function mount(el) {
    host = el;
    render();
  }
  function render() {
    const now = new Date(),
      today = C.dateKey(now),
      allCases = window.CejProCasesData.load().cases,
      recents = history(),
      ordered = [...allCases].sort((a, b) => {
        const ai = recents.indexOf(a.id),
          bi = recents.indexOf(b.id);
        if (ai !== -1 || bi !== -1)
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        return 0;
      }),
      drafts = window.CejProWritingsData.load().sort(
        (a, b) => b.updatedAt - a.updatedAt,
      ),
      linked = !!window.CejProSinoeData.linkedAccount(),
      notifications = linked
        ? window.CejProSinoeData.load().sort(
            (a, b) =>
              Number(a.read) - Number(b.read) || b.date.localeCompare(a.date),
          )
        : [],
      unread = notifications.filter((n) => !n.read).length;
    const first = new Date(month.getFullYear(), month.getMonth(), 1, 12),
      offset = (first.getDay() + 6) % 7,
      start = new Date(first);
    start.setDate(1 - offset);
    const events = C.load(now).filter((e) => !e.done),
      daily = events
        .filter((e) => e.date === selected)
        .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")),
      selectedLabel = C.fromKey(selected).toLocaleDateString("es-PE", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    host.innerHTML = `<div class="home-grid">
 <section class="home-card home-calendar" aria-labelledby="homeAgendaTitle"><div class="home-card-heading"><div class="home-card-title">${icon("calendar")}<div class="home-agenda-title"><h2 id="homeAgendaTitle">Tu agenda</h2><p class="home-agenda-date">${now.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p></div></div><a class="home-card-link" href="#calendario/dia/${selected}">Abrir calendario ↗</a></div><div class="home-agenda-content"><div class="home-mini-calendar"><div class="home-month-heading"><h3>${month.toLocaleDateString("es-PE", { month: "long", year: "numeric" })}</h3><div><button type="button" id="homePrevMonth" aria-label="Mes anterior">‹</button><button type="button" id="homeNextMonth" aria-label="Mes siguiente">›</button></div></div><div class="home-calendar-week" aria-hidden="true">${["L", "M", "M", "J", "V", "S", "D"].map((d) => `<span>${d}</span>`).join("")}</div><div class="home-calendar-days">${Array.from(
   { length: 42 },
   (_, i) => {
     const d = new Date(start);
     d.setDate(start.getDate() + i);
     const date = C.dateKey(d),
       has = events.some((e) => e.date === date);
     return `<button type="button" data-home-day="${date}" class="${d.getMonth() !== month.getMonth() ? "outside-month " : ""}${date === today ? "is-today " : ""}${date === selected ? "is-selected" : ""}" aria-label="${d.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}${has ? ", con eventos" : ""}" aria-pressed="${date === selected}"${date === today ? ' aria-current="date"' : ""}>${d.getDate()}${has ? '<i aria-hidden="true"></i>' : ""}</button>`;
   },
 ).join(
   "",
 )}</div><button type="button" id="homeCalendarToday" class="detail-text-button">Volver a hoy</button></div><div class="home-day-agenda"><div class="home-day-heading"><h3>${selected === today ? "Hoy" : esc(selectedLabel)}</h3><span>${daily.length} ${daily.length === 1 ? "compromiso" : "compromisos"}</span></div>${
   daily.length
     ? `<ul>${daily
         .slice(0, 3)
         .map(
           (e) =>
             `<li><a href="#calendario/evento/${encodeURIComponent(e.id)}"><time>${esc(e.time || "Sin hora")}</time><span><strong>${esc(e.title)}</strong><small>${esc(C.singular[e.type])}</small></span></a></li>`,
         )
         .join("")}</ul>`
     : '<div class="home-day-empty"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18v16H3Z M7 2v6 M17 2v6 M3 10h18"/></svg></span><span>Sin compromisos para este día.</span><a href="#calendario/nuevo/' +
       selected +
       '" class="detail-text-button">＋ Agregar evento</a></div>'
 }${daily.length > 3 ? `<a class="detail-text-button" href="#calendario/dia/${selected}">Ver los ${daily.length} compromisos ↗</a>` : ""}</div></div><div class="home-card-footer"><span>${events.filter((e) => e.type === "plazo" && e.date === selected).length} plazos en esta fecha</span><a href="#calendario/nuevo/${selected}" class="detail-text-button">＋ Agendar</a></div></section>
 <section class="home-card" aria-labelledby="homeCasesTitle"><div class="home-card-heading"><div class="home-card-title">${icon("folder")}<h2 id="homeCasesTitle">Continuar con expedientes</h2></div><span class="home-count">${allCases.length}</span></div>${
   ordered.length
     ? `<ul class="home-work-list">${ordered
         .slice(0, 3)
         .map(
           (c) =>
             `<li><a href="#expedientes/${encodeURIComponent(c.id)}/documentos"><span class="home-case-mark">${icon("folder")}</span><span class="home-work-info"><strong>${esc(c.title)}</strong><small>${esc(c.number || "Sin número de expediente")}</small><span>${esc(c.client || "Sin cliente asociado")}</span></span><span class="home-arrow" aria-hidden="true">↗</span></a></li>`,
         )
         .join("")}</ul>`
     : empty(
         "folder",
         "Tu archivo de trabajo",
         "Organiza tus casos y retómalos desde aquí.",
         "#expedientes",
         "Ir a mis expedientes",
       )
 }<div class="home-card-footer"><span>${ordered.some((c) => recents.includes(c.id)) ? "Vistos recientemente" : "Tus expedientes a mano"}</span><a href="#expedientes" class="home-card-link">Ver todos los expedientes ↗</a></div></section>
 <section class="home-card" aria-labelledby="homeWritingsTitle"><div class="home-card-heading"><div class="home-card-title">${icon("file")}<h2 id="homeWritingsTitle">Retomar escritos</h2></div><span class="home-count">${drafts.length}</span></div>${
   drafts.length
     ? `<ul class="home-writing-list">${drafts
         .slice(0, 3)
         .map(
           (x, i) =>
             `<li><a class="${i === 0 ? "is-last-draft" : ""}" href="#escritos/${encodeURIComponent(x.id)}"><span class="home-writing-paper">${icon("file")}</span><span class="home-work-info"><strong>${esc(x.title)}</strong><small>${esc(x.kind)} · ${window.CejProWritingsData.statuses[x.status]}</small><span>${new Date(x.updatedAt).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}</span></span><span class="home-writing-action">Continuar ↗</span></a></li>`,
         )
         .join("")}</ul>`
     : empty(
         "file",
         "Continúa tus ideas",
         "Prepara un escrito o empieza desde una plantilla.",
         "#escritos",
         "Ir al redactor",
       )
 }<div class="home-card-footer"><span>Borradores y plantillas</span><a href="#escritos" class="home-card-link">Ver mis escritos ↗</a></div></section>
 <section class="home-card" aria-labelledby="homeSinoeTitle"><div class="home-card-heading"><div class="home-card-title">${icon("inbox")}<h2 id="homeSinoeTitle">Notificaciones SINOE</h2></div>${linked ? `<span class="home-unread-count">${unread} sin leer</span>` : ""}</div>${
   !linked
     ? empty(
         "inbox",
         "Tu casilla, a un clic",
         "Accede a tus notificaciones y documentos.",
         "#sinoe",
         "Conectar casilla",
       )
     : notifications.length
       ? `<ul class="home-notification-list">${notifications
           .slice(0, 3)
           .map(
             (n) =>
               `<li><a href="#sinoe/${encodeURIComponent(n.id)}"><span class="home-notification-dot${n.read ? " is-read" : ""}" aria-label="${n.read ? "Leída" : "Sin leer"}"></span><span class="home-work-info"><strong>${esc(n.title)}</strong><small>${esc(n.number || "Sin número")} · ${n.date.split("-").reverse().join("/")}</small><span>${n.attachments.length} ${n.attachments.length === 1 ? "documento" : "documentos"}</span></span><span class="home-arrow" aria-hidden="true">↗</span></a></li>`,
           )
           .join("")}</ul>`
       : empty(
           "inbox",
           "Tu bandeja está al día",
           "No hay notificaciones para mostrar.",
           "#sinoe",
           "Abrir casilla",
         )
 }<div class="home-card-footer"><span>${linked ? "Notificaciones de tu casilla" : "Casilla SINOE"}</span><a href="#sinoe" class="home-card-link">Ir a la bandeja ↗</a></div></section>
 </div>`;
    $("homePrevMonth").onclick = () => {
      month = new Date(month.getFullYear(), month.getMonth() - 1, 1, 12);
      render();
    };
    $("homeNextMonth").onclick = () => {
      month = new Date(month.getFullYear(), month.getMonth() + 1, 1, 12);
      render();
    };
    $("homeCalendarToday").onclick = () => {
      const d = new Date();
      selected = C.dateKey(d);
      month = new Date(d.getFullYear(), d.getMonth(), 1, 12);
      render();
    };
    host.querySelectorAll("[data-home-day]").forEach(
      (b) =>
        (b.onclick = () => {
          selected = b.dataset.homeDay;
          const d = C.fromKey(selected);
          month = new Date(d.getFullYear(), d.getMonth(), 1, 12);
          render();
        }),
    );
  }
  window.addEventListener("cejpro:calendar-change", () => {
    if (host && !host.hidden) render();
  });
  window.addEventListener("storage", () => {
    if (host && !host.hidden) render();
  });
  window.CejProHome = { mount, recordCase };
})();
