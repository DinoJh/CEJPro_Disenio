/* Agenda del caso: utiliza los mismos eventos que el calendario general. */
window.CejProCaseAgenda = (() => {
  const D = window.CejProCalendarData;
  const esc = (v) =>
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
  let root, currentCase;
  const $ = (id) => root.querySelector("#" + id);
  const forCase = (id) =>
    D.load()
      .filter((e) => e.caseId === id)
      .sort((a, b) =>
        (a.date + (a.time || "00:00")).localeCompare(
          b.date + (b.time || "00:00"),
        ),
      );
  function render(element, c) {
    root = element;
    currentCase = c;
    const events = forCase(c.id);
    const badge = document.querySelector("[data-case-agenda-count]");
    if (badge) badge.textContent = events.length;
    root.innerHTML = `<section class="detail-card"><div class="detail-card-heading"><div><h2>Agenda del caso</h2><p>Audiencias, reuniones, diligencias y plazos de este expediente.</p></div><button type="button" id="caseAgendaAdd" class="cases-primary">＋ Agendar evento</button></div><p class="case-agenda-shared">Los eventos de este caso también aparecen en <a href="#calendario">Calendario ↗</a>.</p>${events.length ? `<div class="case-agenda-list">${events.map((e) => `<button type="button" class="case-agenda-event${e.done ? " is-done" : ""}" data-case-event="${esc(e.id)}"><span class="case-agenda-date"><strong>${D.fromKey(e.date).getDate()}</strong><small>${esc(D.fromKey(e.date).toLocaleDateString("es-PE", { month: "short" }).replace(".", ""))}</small></span><span class="case-agenda-event-info"><span>${D.singular[e.type]} · ${esc(e.time || "Sin hora")}</span><strong>${esc(e.title)}</strong><small>${esc(D.fromKey(e.date).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</small></span><span class="case-agenda-state">${e.done ? "Completado" : "Programado"} <span aria-hidden="true">↗</span></span></button>`).join("")}</div>` : `<div class="detail-empty"><span class="icon">${window.CejProIcon("calendar")}</span><p>No hay eventos para este expediente.</p></div>`}<p class="detail-reference-hint">Fechas y horas registradas manualmente. No hay cálculo automático de plazos ni envío de recordatorios.</p></section><p id="caseAgendaNotice" class="cases-notice" role="status" aria-live="polite"></p>
 <dialog id="caseAgendaDialog" class="cal-dialog" aria-labelledby="caseAgendaTitle"><form id="caseAgendaForm"><div class="cal-dialog-header"><div><p class="cal-overline">AGENDA DEL CASO</p><h2 id="caseAgendaTitle">Agendar evento</h2></div><button type="button" id="caseAgendaClose" class="cal-icon-btn" aria-label="Cerrar evento del caso">×</button></div><div class="cal-form-body"><p class="case-agenda-linked">Vinculado a <strong>${esc(c.title)}</strong></p><label>Título del evento<input name="title" required maxlength="120" placeholder="Ej. Audiencia de conciliación"></label><div class="cal-form-row"><label>Tipo<select name="type">${Object.entries(
   D.singular,
 )
   .map(([k, v]) => `<option value="${k}">${v}</option>`)
   .join(
     "",
   )}</select></label><label>Fecha<input type="date" name="date" required></label></div><div class="cal-form-row"><label>Hora<input type="time" name="time"></label><label>Enlace<input name="location" maxlength="300" inputmode="url" placeholder="https://..."></label></div><details class="cal-additional" id="caseAgendaAdditional"><summary>Adicionales<span aria-hidden="true">⌄</span></summary><div class="cal-additional-fields"><label>Notas<textarea name="notes" rows="3" maxlength="2000" placeholder="Detalles que necesitas recordar"></textarea></label><label class="cal-done-check" id="caseAgendaCompletion"><input type="checkbox" name="done">Marcar como completado</label></div></details></div><div class="cal-dialog-footer"><button type="button" id="caseAgendaDelete" class="cal-delete" hidden>Eliminar</button><span class="cal-form-spacer"></span><button type="button" id="caseAgendaCancel" class="cal-secondary">Cancelar</button><button type="submit" class="cal-primary">Guardar evento</button></div></form></dialog>`;
    $("caseAgendaAdd").onclick = () => open();
    root
      .querySelectorAll("[data-case-event]")
      .forEach((b) => (b.onclick = () => open(b.dataset.caseEvent)));
    $("caseAgendaClose").onclick = () => $("caseAgendaDialog").close();
    $("caseAgendaCancel").onclick = () => $("caseAgendaDialog").close();
    $("caseAgendaForm").onsubmit = save;
    $("caseAgendaDelete").onclick = () => {
      const id = $("caseAgendaForm").dataset.editing,
        remaining = D.load().filter(
          (e) => !(e.id === id && e.caseId === currentCase.id),
        );
      $("caseAgendaDialog").close();
      const stored = D.save(remaining);
      render(root, currentCase);
      notice("Evento eliminado de la agenda y el calendario.", stored);
    };
  }
  function notice(text, saved) {
    $("caseAgendaNotice").textContent =
      text +
      (saved
        ? " Guardado en este navegador."
        : " No se pudo guardar; el cambio durará durante esta visita.");
  }
  function open(id) {
    if (!id && !window.CejProWorkspaces.canEdit()) return;
    const e = forCase(currentCase.id).find((e) => e.id === id),
      form = $("caseAgendaForm");
    form.reset();
    form.dataset.editing = e?.id || "";
    form.elements.title.setCustomValidity("");
    $("caseAgendaAdditional").open = false;
    $("caseAgendaCompletion").hidden = !e;
    $("caseAgendaDelete").hidden = !e;
    $("caseAgendaTitle").textContent = e
      ? window.CejProWorkspaces.canEdit()
        ? "Editar evento"
        : "Detalle del evento"
      : "Agendar evento";
    const values = e || {
      title: "",
      type: "audiencia",
      date: D.dateKey(new Date()),
      time: "",
      location: "",
      notes: "",
      done: false,
    };
    for (const key of ["title", "type", "date", "time", "location", "notes"])
      form.elements.namedItem(key).value = values[key] || "";
    form.elements.done.checked = !!values.done;
    $("caseAgendaDialog").showModal();
  }
  function save(e) {
    e.preventDefault();
    const form = e.target,
      data = new FormData(form),
      title = String(data.get("title")).trim();
    if (!title) {
      form.elements.title.setCustomValidity(
        "Escribe un título para el evento.",
      );
      form.elements.title.reportValidity();
      form.elements.title.addEventListener(
        "input",
        () => form.elements.title.setCustomValidity(""),
        { once: true },
      );
      return;
    }
    const item = {
      id: form.dataset.editing || "event-" + crypto.randomUUID(),
      caseId: currentCase.id,
      title,
      type: data.get("type"),
      date: data.get("date"),
      time: data.get("time"),
      location: String(data.get("location")).trim(),
      notes: String(data.get("notes")).trim(),
      caseRef: currentCase.number || currentCase.title,
      client: currentCase.client || "",
      done: data.has("done"),
    };
    const events = [...D.load()],
      index = events.findIndex(
        (e) => e.id === item.id && e.caseId === currentCase.id,
      );
    if (index >= 0) events[index] = item;
    else events.push(item);
    $("caseAgendaDialog").close();
    const stored = D.save(events);
    render(root, currentCase);
    notice("Evento vinculado al caso y al calendario.", stored);
  }
  return { render, count: (id) => forCase(id).length };
})();
