(() => {
  function mount(el) {
    if (el.dataset.ready) return;
    el.dataset.ready = "true";
    const contact = window.CejProSupportData.contact,
      url =
        "https://wa.me/" +
        contact.phone +
        "?text=" +
        encodeURIComponent("Hola, equipo de CEJ PRO. Necesito ayuda.");
    el.innerHTML = `<section class="support-contact" aria-labelledby="supportWhatsAppTitle"><div class="support-contact-heading"><span class="support-whatsapp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a9 9 0 0 1-13.3 7.9L3 21l1.6-4.7A9 9 0 1 1 21 11.5Z"/><path d="M9 7.5c-.7 0-1 1-1 1.5 0 2.5 3.5 6 6 6 .5 0 1.5-.3 1.5-1l-2-1-1 1c-1.2-.5-2.5-1.8-3-3l1-1Z"/></svg></span><div><h2 id="supportWhatsAppTitle">Habla con nosotros</h2><p>${contact.display}</p></div></div><a id="supportWhatsApp" class="cases-primary" ${contact.example ? 'aria-disabled="true" title="Contactar soporte"' : `href="${url}" target="_blank" rel="noopener noreferrer"`}>Escribir por WhatsApp ↗</a></section><section class="support-faq" aria-labelledby="supportFaqTitle"><h2 id="supportFaqTitle">Preguntas frecuentes</h2><div class="support-faq-tools"><label class="cases-search"><span class="icon" aria-hidden="true">${window.CejProIcon("search")}</span><input id="supportSearch" type="search" placeholder="Buscar una pregunta…" aria-label="Buscar en todas las preguntas"></label><label class="support-module-filter"><span class="sr-only">Módulo</span><select id="supportModuleFilter"><option value="">Todos los módulos</option>${[...new Set(window.CejProSupportData.faq.map((q) => q.module))].map((m) => `<option>${m}</option>`).join("")}</select></label></div><div id="supportFaqResults"></div><div class="support-pagination"><span id="supportFaqCount" role="status" aria-live="polite"></span><nav id="supportFaqPages" aria-label="Páginas de preguntas frecuentes"></nav></div></section>`;
    let page = 1;
    const size = 8,
      normalize = (text) =>
        text
          .toLocaleLowerCase("es")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
    const search = el.querySelector("#supportSearch"),
      filter = el.querySelector("#supportModuleFilter"),
      results = el.querySelector("#supportFaqResults"),
      pages = el.querySelector("#supportFaqPages");
    function render() {
      const term = normalize(search.value.trim()),
        questions = window.CejProSupportData.faq.filter(
          (q) =>
            (!filter.value || q.module === filter.value) &&
            (!term ||
              normalize(q.module + " " + q.question + " " + q.answer).includes(
                term,
              )),
        ),
        total = Math.max(1, Math.ceil(questions.length / size));
      page = Math.max(1, Math.min(page, total));
      results.replaceChildren();
      let group;
      for (const q of questions.slice((page - 1) * size, page * size)) {
        if (!group || group.dataset.module !== q.module) {
          group = document.createElement("section");
          group.className = "support-faq-group";
          group.dataset.module = q.module;
          const title = document.createElement("h3");
          title.textContent = q.module;
          group.append(title);
          results.append(group);
        }
        const item = document.createElement("details"),
          summary = document.createElement("summary"),
          answer = document.createElement("p");
        summary.textContent = q.question;
        answer.textContent = q.answer;
        item.append(summary, answer);
        group.append(item);
      }
      if (!questions.length) {
        const empty = document.createElement("div");
        empty.className = "clients-empty";
        empty.innerHTML =
          '<span class="icon" aria-hidden="true">' +
          window.CejProIcon("search") +
          "</span><p>No encontramos preguntas</p>";
        results.append(empty);
      }
      el.querySelector("#supportFaqCount").textContent = questions.length
        ? `${(page - 1) * size + 1}–${Math.min(page * size, questions.length)} de ${questions.length} preguntas`
        : "0 preguntas";
      pages.replaceChildren();
      for (let n = 1; n <= total; n++) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = n;
        button.setAttribute("aria-label", "Página " + n);
        if (n === page) button.setAttribute("aria-current", "page");
        button.onclick = () => {
          page = n;
          render();
          pages.querySelector("[aria-current]").focus();
        };
        pages.append(button);
      }
    }
    search.oninput = filter.onchange = () => {
      page = 1;
      render();
    };
    render();
  }
  window.CejProSupport = { mount };
})();
