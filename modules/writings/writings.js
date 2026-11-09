(() => {
  const D = window.CejProWritingsData,
    T = window.CejProWritingTemplates,
    U = window.CejProUserTemplates,
    N = window.CejProCasesData.normalize,
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
    items = D.load(),
    customTemplates = U.load(),
    lastTemplateChoice = T[0].id,
    selected = "",
    search = "",
    page = 1,
    timer = null,
    dirty = false,
    lastSaved = true;
  const size = 8;
  const $ = (id) => host?.querySelector("#" + id),
    cases = () => window.CejProCasesData.load().cases;
  const date = (n) =>
    new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(n));
  const signal = () => window.dispatchEvent(new Event("cejpro:writing-render"));
  function saveNow() {
    clearTimeout(timer);
    timer = null;
    if (!dirty) return lastSaved;
    lastSaved = D.save(items);
    dirty = !lastSaved;
    if ($("writingSaveState"))
      $("writingSaveState").textContent = lastSaved
        ? "Guardado"
        : "No se pudo guardar en este navegador";
    return lastSaved;
  }
  function schedule() {
    if (!window.CejProWorkspaces.canEdit()) return;
    dirty = true;
    clearTimeout(timer);
    if ($("writingSaveState")) $("writingSaveState").textContent = "Guardando…";
    timer = setTimeout(saveNow, 400);
  }
  window.addEventListener("hashchange", saveNow);
  window.addEventListener("beforeunload", (e) => {
    saveNow();
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  function safeHTML(html) {
    const clean = window.DOMPurify.sanitize(String(html || ""), {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "s",
        "h1",
        "h2",
        "h3",
        "ol",
        "ul",
        "li",
        "span",
        "blockquote",
      ],
      ALLOWED_ATTR: ["class", "style"],
    });
    const fragment = document.createElement("template");
    fragment.innerHTML = clean;
    fragment.content.querySelectorAll("*").forEach((el) => {
      if (el.hasAttribute("class")) {
        const classes = [...el.classList].filter((c) =>
          /^ql-(align-(center|right|justify)|indent-[1-8]|size-(small|large|huge))$/.test(
            c,
          ),
        );
        if (classes.length) el.className = classes.join(" ");
        else el.removeAttribute("class");
      }
      if (el.hasAttribute("style")) {
        const align = el.style.textAlign,
          background = el.style.backgroundColor;
        el.removeAttribute("style");
        if (["left", "center", "right", "justify"].includes(align))
          el.style.textAlign = align;
        if (["rgb(249, 225, 231)", "#f9e1e7"].includes(background))
          el.style.backgroundColor = "#f9e1e7";
      }
    });
    return fragment.innerHTML;
  }
  function plainHTML(text) {
    return String(text || "")
      .split("\n")
      .map((line) => "<p>" + (line ? esc(line) : "<br>") + "</p>")
      .join("");
  }
  function replaceText(html, replacements) {
    const box = document.createElement("div");
    box.innerHTML = safeHTML(html);
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT),
      nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let text = node.nodeValue;
      for (const [from, to] of replacements)
        if (from) {
          const pattern = from
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/[\s\u00a0]+/g, "[\\s\\u00a0]+");
          text = text.replace(new RegExp(pattern, "gu"), () => to);
        }
      node.nodeValue = text;
    }
    return safeHTML(box.innerHTML);
  }
  function personalHTML(t, c) {
    if (!c) return safeHTML(t.html);
    return replaceText(t.html, [
      ["[N.º de expediente]", c.number || "[N.º de expediente]"],
      ["[Número de expediente]", c.number || "[Número de expediente]"],
      [
        "[Nombre completo o razón social]",
        c.client || "[Nombre completo o razón social]",
      ],
      ["[Nombre de la parte]", c.client || "[Nombre de la parte]"],
    ]);
  }
  function getTemplate(id) {
    return (
      T.find((t) => t.id === id) ||
      customTemplates
        .map((t) => ({ ...t, custom: true, html: (c) => personalHTML(t, c) }))
        .find((t) => t.id === id)
    );
  }
  function catalogPreview() {
    const id = $("writingTemplateForm").elements.namedItem("templateId")?.value,
      template = getTemplate(id);
    if (!template) return;
    lastTemplateChoice = id;
    const c = null;
    $("writingTemplatePreview").innerHTML = safeHTML(template.html(c));
    $("writingTemplatePreview").scrollTop = 0;
  }
  function renderCatalog() {
    if (!getTemplate(lastTemplateChoice)) lastTemplateChoice = T[0].id;
    const option = (t) =>
      `<label class="writing-template-option"><input type="radio" name="templateId" value="${esc(t.id)}"${t.id === lastTemplateChoice ? " checked" : ""}><span><strong>${esc(t.name)}</strong><small>${esc(t.description || t.kind)}</small></span></label>`;
    $("writingTemplateOptions").innerHTML =
      (customTemplates.length
        ? '<p class="writing-template-group">Mis plantillas</p>' +
          customTemplates
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map(option)
            .join("")
        : "") +
      '<p class="writing-template-group">Plantillas de CEJ PRO</p>' +
      T.map(option).join("");
    $("writingTemplateOptions")
      .querySelectorAll("input")
      .forEach((input) => (input.onchange = catalogPreview));
    catalogPreview();
  }
  function mount(el) {
    if (host) return;
    host = el;
    host.innerHTML = `<div id="writingsScreen"></div>
 <dialog id="writingTemplatesDialog" class="cases-dialog writing-catalog-dialog" aria-labelledby="writingTemplatesTitle"><form id="writingTemplateForm"><div class="cases-dialog-heading"><h2 id="writingTemplatesTitle">Elegir plantilla</h2><button type="button" class="cases-icon-button" data-close-writing-templates aria-label="Cerrar">×</button></div><div class="writing-catalog-body"><div class="writing-catalog-sidebar"><div id="writingTemplateOptions" class="writing-template-options"></div></div><div class="writing-catalog-preview"><article id="writingTemplatePreview" class="writing-template-sheet ql-editor" aria-label="Vista previa de la plantilla"></article></div></div><div class="cases-dialog-footer"><button type="button" class="cases-secondary" data-close-writing-templates>Cancelar</button><button type="submit" class="cases-primary">Crear borrador</button></div></form></dialog>

 <dialog id="saveUserTemplateDialog" class="cases-dialog" aria-labelledby="saveUserTemplateTitle"><form id="saveUserTemplateForm"><div class="cases-dialog-heading"><h2 id="saveUserTemplateTitle">Guardar como plantilla</h2><button type="button" class="cases-icon-button" data-close-user-template aria-label="Cerrar">×</button></div><div class="cases-form-body"><label>Guardar como<select name="targetId" id="userTemplateTarget"></select></label><label>Nombre de la plantilla<input name="name" required maxlength="100" placeholder="Ej. Mi contestación laboral"></label><label>Descripción<input name="description" maxlength="240" placeholder="Para qué utilizas este formato"></label><label id="userTemplateCaseFields" class="writing-user-template-check"><input name="replaceCase" type="checkbox" checked><span>Convertir el expediente y el cliente en campos reutilizables</span></label><p id="userTemplateError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" class="cases-secondary" data-close-user-template>Cancelar</button><button type="submit" class="cases-primary" id="saveUserTemplateButton">Guardar plantilla</button></div></form></dialog>`;
    host.insertAdjacentHTML(
      "beforeend",
      `<dialog id="deleteWritingDialog" class="cases-dialog cases-folder-dialog" aria-labelledby="deleteWritingTitle"><form id="deleteWritingForm"><div class="cases-dialog-heading"><h2 id="deleteWritingTitle">Eliminar borrador</h2><button type="button" class="cases-icon-button" data-cancel-writing-delete aria-label="Cerrar">×</button></div><div class="cases-form-body"><p class="writing-delete-question">¿Eliminar <strong id="deleteWritingName"></strong>?</p><p class="cases-form-note">Las plantillas que hayas guardado se conservarán.</p><p id="deleteWritingError" class="cases-form-error" role="alert" hidden></p></div><div class="cases-dialog-footer"><button type="button" class="cases-secondary" data-cancel-writing-delete>Cancelar</button><button type="submit" class="cases-primary">Eliminar borrador</button></div></form></dialog>`,
    );
    host
      .querySelectorAll("[data-cancel-writing-delete]")
      .forEach((b) => (b.onclick = () => $("deleteWritingDialog").close()));
    $("deleteWritingForm").onsubmit = (e) => {
      e.preventDefault();
      const id = $("deleteWritingDialog").dataset.writingId;
      if (!items.some((x) => x.id === id)) {
        $("deleteWritingDialog").close();
        return;
      }
      clearTimeout(timer);
      timer = null;
      const remaining = items.filter((x) => x.id !== id);
      if (!D.save(remaining)) {
        $("deleteWritingError").textContent =
          "No se pudo eliminar el borrador. Inténtalo de nuevo.";
        $("deleteWritingError").hidden = false;
        return;
      }
      items = remaining;
      dirty = false;
      lastSaved = true;
      $("deleteWritingDialog").close();
      if (selected === id) {
        selected = "";
        search = "";
        page = 1;
        location.hash = "#escritos";
      } else render();
    };
    host
      .querySelectorAll("[data-close-writing-templates]")
      .forEach((b) => (b.onclick = () => $("writingTemplatesDialog").close()));
    host
      .querySelectorAll("[data-close-user-template]")
      .forEach((b) => (b.onclick = () => $("saveUserTemplateDialog").close()));
    $("writingTemplateForm").onsubmit = (e) => {
      e.preventDefault();
      const data = new FormData(e.target),
        template = getTemplate(data.get("templateId"));
      if (!template) return;
      const x = D.create(),
        c = null;
      x.title = uniqueDraftTitle(template.name);
      x.kind = template.kind;
      x.caseId = c?.id || "";
      x.html = safeHTML(template.html(c));
      const doc = document.createElement("div");
      doc.innerHTML = x.html;
      x.content = [...doc.children].map((el) => el.textContent).join("\n");
      items.unshift(x);
      search = "";
      page = 1;
      dirty = true;
      saveNow();
      $("writingTemplatesDialog").close();
      location.hash = "escritos/" + encodeURIComponent(x.id);
    };
    $("userTemplateTarget").onchange = (e) => {
      const t = customTemplates.find((t) => t.id === e.target.value),
        f = $("saveUserTemplateForm");
      if (t) {
        f.elements.namedItem("name").value = t.name;
        f.elements.namedItem("description").value = t.description;
      }
      $("saveUserTemplateButton").textContent = t
        ? "Actualizar plantilla"
        : "Guardar plantilla";
      $("userTemplateError").hidden = true;
    };
    $("saveUserTemplateForm").onsubmit = (e) => {
      e.preventDefault();
      const f = e.target,
        data = new FormData(f),
        x = items.find((x) => x.id === f.dataset.writingId);
      if (!x) return;
      const target = String(data.get("targetId")),
        old = customTemplates.find((t) => t.id === target),
        name = String(data.get("name")).trim();
      let error = !name
        ? "Escribe un nombre para la plantilla."
        : target && !old
          ? "No encontramos la plantilla que quieres actualizar."
          : customTemplates.some(
                (t) => t.id !== target && N(t.name) === N(name),
              )
            ? "Ya tienes una plantilla con este nombre."
            : "";
      if (error) {
        $("userTemplateError").textContent = error;
        $("userTemplateError").hidden = false;
        return;
      }
      let html = safeHTML(x.html || plainHTML(x.content));
      const c = cases().find((c) => c.id === x.caseId);
      if (data.get("replaceCase") && c)
        html = replaceText(html, [
          [c.number, "[N.º de expediente]"],
          [c.client, "[Nombre completo o razón social]"],
        ]);
      const now = Date.now(),
        t = {
          id: old?.id || "custom-template-" + crypto.randomUUID(),
          name,
          description: String(data.get("description")).trim(),
          kind: x.kind,
          html,
          createdAt: old?.createdAt || now,
          updatedAt: now,
        };
      if (old) customTemplates[customTemplates.indexOf(old)] = t;
      else customTemplates.unshift(t);
      const saved = U.save(customTemplates);
      lastTemplateChoice = t.id;
      $("saveUserTemplateDialog").close();
      if ($("writingSaveState"))
        $("writingSaveState").textContent = saved
          ? old
            ? "Plantilla actualizada"
            : "Plantilla guardada"
          : "Plantilla disponible durante esta visita; no se pudo guardar";
    };
  }
  function openTemplates() {
    if (!window.CejProWorkspaces.canEdit()) return;
    saveNow();
    renderCatalog();
    $("writingTemplatesDialog").showModal();
  }
  function openSaveTemplate(x) {
    saveNow();
    if (!x.content.trim()) return;
    const f = $("saveUserTemplateForm");
    f.reset();
    f.dataset.writingId = x.id;
    f.elements.namedItem("name").value =
      x.title === "Sin título" ? "Mi plantilla" : x.title.slice(0, 100);
    $("userTemplateTarget").innerHTML =
      '<option value="">Nueva plantilla</option>' +
      customTemplates
        .map(
          (t) =>
            `<option value="${esc(t.id)}">Actualizar: ${esc(t.name)}</option>`,
        )
        .join("");
    const c = cases().find((c) => c.id === x.caseId);
    $("userTemplateCaseFields").hidden = !c;
    f.elements.namedItem("replaceCase").checked = !!c;
    $("userTemplateError").hidden = true;
    $("saveUserTemplateButton").textContent = "Guardar plantilla";
    $("saveUserTemplateDialog").showModal();
  }
  function openDelete(id) {
    const x = items.find((x) => x.id === id);
    if (!x) return;
    saveNow();
    $("deleteWritingDialog").dataset.writingId = id;
    $("deleteWritingName").textContent = x.title;
    $("deleteWritingError").hidden = true;
    $("deleteWritingDialog").showModal();
  }
  function uniqueDraftTitle(name) {
    const base = name.trim().slice(0, 170),
      names = new Set(items.map((x) => N(x.title)));
    if (!names.has(N(base))) return base;
    let suffix = 2;
    while (names.has(N(base + " " + suffix))) suffix++;
    return base + " " + suffix;
  }
  function newWriting() {
    openTemplates();
  }
  let printTitle = null;
  function clearPrint() {
    document.body.classList.remove("writing-print");
    document.getElementById("writingPrintArea")?.remove();
    if (printTitle !== null) {
      document.title = printTitle;
      printTitle = null;
    }
  }
  function preparePrint() {
    const x = items.find((x) => x.id === selected);
    if (location.hash.slice(1).split("/")[0] !== "escritos" || !x) {
      clearPrint();
      return;
    }
    saveNow();
    let area = document.getElementById("writingPrintArea");
    if (!area) {
      area = document.createElement("div");
      area.id = "writingPrintArea";
      document.body.append(area);
    }
    area.innerHTML = safeHTML(x.html || plainHTML(x.content));
    if (printTitle === null) printTitle = document.title;
    document.title = x.title;
    document.body.classList.add("writing-print");
  }
  window.addEventListener("beforeprint", preparePrint);
  window.addEventListener("afterprint", clearPrint);
  function showRoute(route) {
    saveNow();
    try {
      selected = decodeURIComponent(route.split("/")[1] || "");
    } catch (_) {
      selected = "invalid";
    }
    render();
  }
  function render() {
    if (!host) return;
    if (selected) {
      const x = items.find((x) => x.id === selected);
      if (x) editor(x);
      else
        $("writingsScreen").innerHTML =
          '<a href="#escritos" class="detail-back">← Escritos</a><div class="clients-empty"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H5v20h14V7Z M14 2v5h5 M8 12h8 M8 16h8"/></svg></span><p>No encontramos este escrito</p></div>';
    } else list();
    signal();
  }
  function list() {
    const term = N(search),
      allCases = cases(),
      filtered = items
        .filter(
          (x) =>
            !term ||
            N(
              [
                x.title,
                x.kind,
                allCases.find((c) => c.id === x.caseId)?.title || "",
                allCases.find((c) => c.id === x.caseId)?.number || "",
              ].join(" "),
            ).includes(term),
        )
        .sort((a, b) => b.updatedAt - a.updatedAt),
      pages = Math.max(1, Math.ceil(filtered.length / size));
    page = Math.min(pages, Math.max(1, page));
    $("writingsScreen").innerHTML =
      `<section class="writings-panel"><div class="writings-list-toolbar"><label class="cases-search"><span class="icon">${window.CejProIcon("file")}</span><input id="writingSearch" type="search" maxlength="180" aria-label="Buscar escritos" placeholder="Buscar borrador…" value="${esc(search)}"></label><button type="button" class="cases-primary" id="newWriting">＋ Nuevo borrador</button></div>
 ${
   filtered.length
     ? `<div class="writings-table-wrap"><table class="writings-table"><thead><tr><th>Escrito</th><th>Actualizado</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${filtered
         .slice((page - 1) * size, page * size)
         .map((x) => {
           const c = allCases.find((c) => c.id === x.caseId);
           return `<tr><td><a class="writing-title-link" href="#escritos/${encodeURIComponent(x.id)}">${esc(x.title)}</a><small>${esc(x.kind)}</small></td><td>${date(x.updatedAt)}</td><td><div class="writing-row-actions"><a class="cases-open-action" href="#escritos/${encodeURIComponent(x.id)}">Editar borrador ↗</a><button type="button" class="writing-delete-icon" data-delete-writing="${esc(x.id)}" aria-label="Eliminar borrador: ${esc(x.title)}" title="Eliminar borrador"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg></button></div></td></tr>`;
         })
         .join("")}</tbody></table></div>`
     : '<div class="clients-empty"><span class="icon">' +
       window.CejProIcon("file") +
       "</span><p>" +
       (term ? "No encontramos coincidencias" : "Aún no hay escritos") +
       "</p></div>"
 }
 <div class="cases-pagination"><span>${filtered.length ? `Mostrando ${(page - 1) * size + 1}–${Math.min(page * size, filtered.length)} de ${filtered.length}` : "0 escritos"}</span><div><button type="button" id="writingsPrev" aria-label="Página anterior"${page === 1 ? " disabled" : ""}>‹</button><span>${page} / ${pages}</span><button type="button" id="writingsNext" aria-label="Página siguiente"${page === pages ? " disabled" : ""}>›</button></div></div></section>`;
    $("newWriting").onclick = newWriting;
    host
      .querySelectorAll("[data-delete-writing]")
      .forEach((b) => (b.onclick = () => openDelete(b.dataset.deleteWriting)));
    $("writingSearch").oninput = (e) => {
      search = e.target.value;
      page = 1;
      list();
      $("writingSearch").focus();
    };
    $("writingsPrev").onclick = () => {
      page--;
      list();
    };
    $("writingsNext").onclick = () => {
      page++;
      list();
    };
  }
  function editor(x) {
    $("writingsScreen").innerHTML =
      `<header class="writing-heading"><div><h1>${esc(x.title)}</h1></div><div class="writing-header-actions"><details class="writing-export"><summary class="writing-export-trigger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5"/></svg><span>Exportar</span><svg class="writing-export-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></summary><div class="writing-export-menu"><button type="button" id="writingPrint"${!x.content.trim() ? " disabled" : ""}>PDF</button><button type="button" id="writingWord"${!x.content.trim() ? " disabled" : ""}>Word (.docx)</button></div></details></div></header><section class="writings-panel"><div class="writing-toolbar"><div class="writing-view-switch" role="group" aria-label="Vista del escrito"><button type="button" id="writingEditMode" aria-pressed="true">Editar</button><button type="button" id="writingPreviewMode" aria-pressed="false">Vista previa</button></div><span id="writingSaveState" role="status" aria-live="polite">${dirty ? "Cambios sin guardar" : lastSaved ? "Guardado" : "No se pudo guardar en este navegador"}</span></div><div id="writingFormatting" class="writing-formatting"><span class="ql-formats"><button type="button" id="writingUndo" aria-label="Deshacer" title="Deshacer">↶</button><button type="button" id="writingRedo" aria-label="Rehacer" title="Rehacer">↷</button></span><span class="ql-formats"><select class="ql-header" aria-label="Estilo de párrafo"><option value="" selected>Texto</option><option value="1">Título</option><option value="2">Subtítulo</option><option value="3">Sección</option></select></span><span class="ql-formats"><button type="button" class="ql-bold" aria-label="Negrita" title="Negrita"></button><button type="button" class="ql-italic" aria-label="Cursiva" title="Cursiva"></button><button type="button" class="ql-underline" aria-label="Subrayado" title="Subrayado"></button><button type="button" class="ql-strike" aria-label="Tachado" title="Tachado"></button></span><span class="ql-formats"><button type="button" class="ql-list" value="ordered" aria-label="Lista numerada" title="Lista numerada"></button><button type="button" class="ql-list" value="bullet" aria-label="Lista con viñetas" title="Lista con viñetas"></button><select class="ql-align" aria-label="Alineación"><option value="" selected>Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option><option value="justify">Justificar</option></select></span><span class="ql-formats"><button type="button" class="ql-indent" value="-1" aria-label="Reducir sangría" title="Reducir sangría"></button><button type="button" class="ql-indent" value="+1" aria-label="Aumentar sangría" title="Aumentar sangría"></button><button type="button" class="ql-background" value="#f9e1e7" aria-label="Resaltar campo" title="Resaltar campo"></button><button type="button" class="ql-clean" aria-label="Quitar formato" title="Quitar formato"></button></span></div><div class="writing-workspace"><div class="writing-document"><div class="writing-page-canvas"><div class="writing-paper"><div id="writingContent"></div><article id="writingPreview" class="ql-editor writing-rich-preview" aria-label="Vista previa del escrito" hidden></article></div></div><div class="writing-wordcount"><span id="writingWordCount"></span><span>A4 · 50 000 caracteres máximo</span></div><p id="writingContentError" role="alert" class="writing-content-error" hidden></p></div><aside class="writing-properties" aria-label="Detalles del escrito"><h2>Mi borrador</h2><label>Título<input id="writingTitle" maxlength="180" value="${esc(x.title)}"></label><button type="button" class="cases-secondary" id="writingSaveAsTemplate">Guardar como plantilla</button><button type="button" class="cases-primary" id="writingSave">Guardar borrador</button><button type="button" class="writing-delete-button" id="editorDeleteWriting">Eliminar borrador</button></aside></div></section>`;
    const quill = new window.Quill($("writingContent"), {
      theme: "snow",
      readOnly: !window.CejProWorkspaces.canEdit(),
      placeholder: "Comienza a redactar tu escrito…",
      formats: [
        "bold",
        "italic",
        "underline",
        "strike",
        "header",
        "list",
        "align",
        "indent",
        "background",
      ],
      modules: {
        toolbar: $("writingFormatting"),
        history: { delay: 500, maxStack: 100, userOnly: true },
      },
    });
    quill.root.setAttribute("aria-label", "Contenido del escrito");
    quill.root.setAttribute("role", "textbox");
    quill.root.setAttribute("aria-multiline", "true");
    quill.root.setAttribute("spellcheck", "true");
    if (x.html)
      quill.setContents(
        quill.clipboard.convert({ html: safeHTML(x.html) }),
        "silent",
      );
    else quill.setText(x.content, "silent");
    quill.history.clear();
    function updatePreview() {
      $("writingPreview").innerHTML = safeHTML(x.html || plainHTML(x.content));
      const words = x.content.trim()
        ? x.content.trim().split(/\s+/u).length
        : 0;
      $("writingWordCount").textContent =
        words + " " + (words === 1 ? "palabra" : "palabras");
      $("writingPrint").disabled = !x.content.trim();
      $("writingWord").disabled = !x.content.trim();
      $("writingSaveAsTemplate").disabled = !x.content.trim();
    }
    let limiting = false;
    quill.on("text-change", () => {
      if (limiting || !quill.root.isConnected) return;
      const length = quill.getLength() - 1;
      if (length > 50000) {
        limiting = true;
        quill.deleteText(50000, length - 50000, "silent");
        limiting = false;
        $("writingContentError").hidden = false;
        $("writingContentError").textContent =
          "El escrito admite hasta 50 000 caracteres.";
      } else $("writingContentError").hidden = true;
      x.content = quill.getText().replace(/\n$/, "");
      x.html = safeHTML(quill.getSemanticHTML());
      x.updatedAt = Date.now();
      updatePreview();
      schedule();
    });
    // Normalizar la representación de textos anteriores sin cambiar su contenido.
    x.html = safeHTML(quill.getSemanticHTML());
    x.content = quill.getText().replace(/\n$/, "");
    function update(key, value) {
      x[key] = value;
      x.updatedAt = Date.now();
      updatePreview();
      schedule();
    }
    $("writingTitle").oninput = (e) => {
      update("title", e.target.value.trim() || "Sin título");
      host.querySelector(".writing-heading h1").textContent = x.title;
      signal();
    };
    $("editorDeleteWriting").onclick = () => openDelete(x.id);
    const mode = (preview) => {
      $("writingContent").hidden = preview;
      $("writingPreview").hidden = !preview;
      $("writingFormatting").hidden = preview;
      $("writingEditMode").setAttribute("aria-pressed", String(!preview));
      $("writingPreviewMode").setAttribute("aria-pressed", String(preview));
      if (preview) updatePreview();
    };
    $("writingEditMode").onclick = () => mode(false);
    $("writingPreviewMode").onclick = () => mode(true);
    $("writingSave").onclick = () => {
      dirty = true;
      saveNow();
    };
    $("writingUndo").onclick = () => quill.history.undo();
    $("writingRedo").onclick = () => quill.history.redo();
    $("writingSaveAsTemplate").onclick = () => openSaveTemplate(x);
    $("writingWord").onclick = () => {
      saveNow();
      host.querySelector(".writing-export").open = false;
      window.CejProWritingExport.download(
        safeHTML(x.html || plainHTML(x.content)),
        x.title,
      );
    };
    $("writingPrint").onclick = () => {
      saveNow();
      host.querySelector(".writing-export").open = false;
      preparePrint();
      try {
        window.print();
      } finally {
        clearPrint();
      }
    };
    updatePreview();
  }

  window.CejProWritings = { mount, showRoute, flush: saveNow };
})();
