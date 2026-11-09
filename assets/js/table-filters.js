/* Controles de filtrado plegables compartidos por los listados. */
window.CejProTableFilters = (() => {
  const opened = new Map();
  function mount(toolbar, key) {
    if (!toolbar) return;
    if (toolbar.dataset.filtersReady) {
      update(toolbar);
      return;
    }
    const labels = [...toolbar.querySelectorAll(".cases-status-filter")];
    if (!labels.length) return;
    toolbar.dataset.filtersReady = key;
    const panel = document.createElement("div");
    panel.className = "table-filters-panel";
    panel.id = "tableFilters-" + key;
    panel.hidden = !opened.get(key);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cases-secondary table-filters-toggle";
    button.setAttribute("aria-controls", panel.id);
    button.innerHTML =
      '<span aria-hidden="true">☷</span> Filtros <span class="table-filter-count" hidden></span>';
    const action = [...toolbar.children].find((el) => el.tagName === "BUTTON");
    toolbar.insertBefore(button, action || null);
    toolbar.after(panel);
    const fields = document.createElement("div");
    fields.className = "table-filter-fields";
    panel.append(fields);
    labels.forEach((label) => {
      fields.append(label);
      const span = label.querySelector(".sr-only");
      if (span) {
        span.classList.remove("sr-only");
        span.classList.add("table-filter-label");
      }
    });
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "detail-text-button table-filter-clear";
    clear.textContent = "Limpiar filtros";
    panel.append(clear);
    button.onclick = () => {
      panel.hidden = !panel.hidden;
      opened.set(key, !panel.hidden);
      update(toolbar);
    };
    clear.onclick = () => {
      const ids = [...panel.querySelectorAll("select")].map((s) => s.id);
      for (const id of ids) {
        const select = document.getElementById(id);
        if (!select) continue;
        const value = [...select.options].some((o) => o.value === "all")
          ? "all"
          : "";
        if (select.value !== value) {
          select.value = value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      update(document.querySelector('[data-filters-ready="' + key + '"]'));
    };
    panel.addEventListener("change", () => update(toolbar));
    update(toolbar);
  }
  function update(toolbar) {
    if (!toolbar) return;
    const key = toolbar.dataset.filtersReady,
      panel = document.getElementById("tableFilters-" + key),
      button = toolbar.querySelector(".table-filters-toggle");
    if (!panel || !button) return;
    const count = [...panel.querySelectorAll("select")].filter(
      (s) => s.value !== "" && s.value !== "all",
    ).length;
    button.setAttribute("aria-expanded", String(!panel.hidden));
    button.classList.toggle("is-filtered", count > 0);
    const badge = button.querySelector(".table-filter-count");
    badge.textContent = count;
    badge.hidden = !count;
    panel.querySelector(".table-filter-clear").disabled = !count;
  }
  return { mount };
})();
