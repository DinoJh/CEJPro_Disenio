(() => {
  const $ = (id) => document.getElementById(id);
  const modules = window.CejProModules;
  const icon = window.CejProIcon;
  const navItem = (m) =>
    `<a href="#${m.id}" class="nav-item" title="${m.label}"><span class="icon">${icon(m.icon)}</span><span class="nav-copy">${m.label}</span></a>`;
  $("primaryNav").innerHTML = modules
    .filter((m) => !m.utility && !m.account && !m.parent)
    .map((m) =>
      m.id === "expedientes"
        ? `<div class="nav-group"><button type="button" id="expedientesMenu" class="nav-item nav-group-toggle" aria-expanded="false" aria-controls="expedientesSubmenu" title="Expedientes"><span class="icon">${icon("folder")}</span><span class="nav-copy">Expedientes</span><span class="nav-chevron" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button><div id="expedientesSubmenu" class="nav-submenu" hidden>${navItem({ ...m, label: "Mis expedientes" })}${navItem(modules.find((x) => x.id === "identidades"))}</div></div>`
        : m.id === "clientes"
          ? `<div class="nav-group"><button type="button" id="clientesMenu" class="nav-item nav-group-toggle" aria-expanded="false" aria-controls="clientesSubmenu" title="Clientes"><span class="icon">${icon("users")}</span><span class="nav-copy">Clientes</span><span class="nav-chevron" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button><div id="clientesSubmenu" class="nav-submenu" hidden>${navItem(m)}${navItem(modules.find((x) => x.id === "cobros"))}</div></div>`
          : navItem(m),
    )
    .join("");
  $("utilityNav").innerHTML = modules
    .filter((m) => m.utility)
    .map(navItem)
    .join("");
  document
    .querySelectorAll("[data-icon]")
    .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
  const mobile = window.matchMedia("(max-width: 760px)");
  let collapsed = false;
  function setExpedientesOpen(open) {
    $("expedientesMenu").setAttribute("aria-expanded", String(open));
    $("expedientesSubmenu").hidden = !open;
  }
  $("clientesMenu").onclick = () => {
    if (collapsed && !mobile.matches) {
      collapsed = false;
      document.body.classList.remove("sidebar-collapsed");
      syncMenu();
    }
    const open = $("clientesSubmenu").hidden;
    $("clientesMenu").setAttribute("aria-expanded", String(open));
    $("clientesSubmenu").hidden = !open;
  };
  $("expedientesMenu").onclick = () => {
    if (collapsed && !mobile.matches) {
      collapsed = false;
      document.body.classList.remove("sidebar-collapsed");
      syncMenu();
    }
    setExpedientesOpen($("expedientesSubmenu").hidden);
  };
  function syncMenu() {
    const open = document.body.classList.contains("mobile-open");
    $("menuButton").setAttribute(
      "aria-expanded",
      String(mobile.matches ? open : !collapsed),
    );
    $("menuButton").setAttribute(
      "aria-label",
      mobile.matches
        ? open
          ? "Cerrar navegación"
          : "Abrir navegación"
        : collapsed
          ? "Expandir navegación"
          : "Contraer navegación",
    );
    $("backdrop").hidden = !mobile.matches || !open;
    if (mobile.matches && !open) $("sidebar").setAttribute("inert", "");
    else $("sidebar").removeAttribute("inert");
  }
  function closeMenu() {
    document.body.classList.remove("mobile-open");
    syncMenu();
    closeAccount();
  }
  function closeAccount() {
    window.CejProWorkspacesUI?.closeSwitcher();
    $("accountMenu").hidden = true;
    $("accountButton").setAttribute("aria-expanded", "false");
  }
  function updateBreadcrumb(
    m = modules.find((m) => m.id === location.hash.slice(1).split("/")[0]) ||
      modules[0],
  ) {
    const current = $("breadcrumbCurrent");
    current.replaceChildren();
    const caseTitle =
      m.id === "expedientes" && location.hash.split("/")[1] === "carpetas"
        ? document.querySelector("#caseListTitle")?.textContent
        : m.id === "expedientes" && location.hash.split("/")[1]
          ? document.querySelector("#caseDetailScreen .detail-heading h1")
              ?.textContent
          : m.id === "clientes" && location.hash.split("/")[1]
            ? document.querySelector("#clientsScreen .client-heading h1")
                ?.textContent
            : m.id === "sinoe" && location.hash.split("/")[1]
              ? document.querySelector("#sinoeScreen .sinoe-heading h1")
                  ?.textContent
              : m.id === "escritos" && location.hash.split("/")[1]
                ? document.querySelector("#writingsScreen .writing-heading h1")
                    ?.textContent
                : null;
    if (caseTitle) {
      const link = document.createElement("a");
      link.href = "#" + m.id;
      link.textContent = m.label;
      const divider = document.createElement("span");
      divider.className = "breadcrumb-divider";
      divider.textContent = "/";
      const title = document.createElement("span");
      title.textContent = caseTitle;
      title.setAttribute("aria-current", "page");
      current.append(link, divider, title);
    } else current.textContent = m.label;
    if (m.id === "cobros") {
      const name = document.querySelector(
        "#collectionsModule .collection-detail-title",
      )?.textContent;
      current.innerHTML =
        '<a href="#clientes">Clientes</a><span class="breadcrumb-divider">/</span><a href="#cobros">Cobros</a>';
      if (name) {
        const sep = document.createElement("span");
        sep.className = "breadcrumb-divider";
        sep.textContent = "/";
        const title = document.createElement("span");
        title.textContent = name;
        current.append(sep, title);
      }
    }
    if (m.id === "identidades") {
      const parent = document.createElement("a");
      parent.href = "#expedientes";
      parent.textContent = "Expedientes";
      const divider = document.createElement("span");
      divider.className = "breadcrumb-divider";
      divider.textContent = "/";
      const title = document.createElement("span");
      title.textContent = "Identidades";
      title.setAttribute("aria-current", "page");
      current.replaceChildren(parent, divider, title);
    }
    if (
      m.id === "clientes" &&
      location.hash.split("/")[2] === "cobros" &&
      location.hash.split("/")[3]
    ) {
      const heading = document.querySelector(
        "#clientBilling .billing-case-heading h3",
      );
      if (heading && caseTitle) {
        const clientNode = current.querySelector("[aria-current]"),
          link = document.createElement("a");
        link.href = "#clientes/" + location.hash.split("/")[1] + "/cobros";
        link.textContent = caseTitle;
        clientNode.replaceWith(link);
        const divider = document.createElement("span");
        divider.className = "breadcrumb-divider";
        divider.textContent = "/";
        const title = document.createElement("span");
        title.textContent = heading.textContent;
        title.setAttribute("aria-current", "page");
        current.append(divider, title);
      }
    }
  }
  window.addEventListener("cejpro:case-render", () => updateBreadcrumb());
  window.addEventListener("cejpro:client-render", () => updateBreadcrumb());
  window.addEventListener("cejpro:writing-render", () => updateBreadcrumb());
  window.addEventListener("cejpro:sinoe-render", () => {
    updateBreadcrumb();
    if (location.hash.slice(1).split("/")[0] === "sinoe")
      document.querySelector(".page-heading").hidden = !!document.querySelector(
        "#sinoeScreen .sinoe-heading",
      );
  });
  function render() {
    const login = location.hash === "#login";
    window.CejProLogin.show(login);
    if (login) {
      closeMenu();
      closeAccount();
      return;
    }
    if (location.hash.slice(1).split("/")[0] === "equipo") {
      history.replaceState(null, "", "#espacios");
    }
    const legacy = location.hash.slice(1).split("/");
    if (legacy[0] === "clientes" && legacy[2] === "cobros") {
      history.replaceState(
        null,
        "",
        "#cobros/" + legacy[1] + (legacy[3] ? "/" + legacy[3] : ""),
      );
    }
    const route = location.hash.slice(1) || "inicio";
    const id = route.split("/")[0];
    const m = modules.find((m) => m.id === id) || modules[0];
    document.querySelectorAll(".nav-item").forEach((a) => {
      const active = a.hash === "#" + m.id;
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    $("expedientesMenu").classList.remove("active");
    $("clientesMenu").classList.remove("active");
    $("collectionsModule").hidden = m.id !== "cobros";
    if (m.id === "cobros") {
      window.CejProCollections.mount($("collectionsModule"));
      window.CejProCollections.showRoute(route);
    }
    $("identitiesModule").hidden = m.id !== "identidades";
    if (m.id === "identidades")
      window.CejProIdentities.mount($("identitiesModule"));
    $("homeModule").hidden = m.id !== "inicio";
    if (m.id === "inicio") window.CejProHome.mount($("homeModule"));
    $("personalization").hidden = m.id !== "personalizar";
    $("casesModule").hidden = m.id !== "expedientes";
    if (m.id === "expedientes") {
      window.CejProCases.mount($("casesModule"));
      window.CejProCases.showRoute(route);
      if (
        route.split("/")[1] &&
        document.querySelector("#caseDetailScreen .detail-heading h1")
      ) {
        try {
          window.CejProHome.recordCase(decodeURIComponent(route.split("/")[1]));
        } catch (_) {}
      }
    }
    $("clientsModule").hidden = m.id !== "clientes";
    if (m.id === "clientes") {
      window.CejProClients.mount($("clientsModule"));
      window.CejProClients.showRoute(route);
    }
    $("workspacesModule").hidden = m.id !== "espacios";
    if (m.id === "espacios")
      window.CejProWorkspacesUI.mount($("workspacesModule"));
    $("sinoeModule").hidden = m.id !== "sinoe";
    if (m.id === "sinoe") {
      window.CejProSinoe.mount($("sinoeModule"));
      window.CejProSinoe.showRoute(route);
    }
    $("writingsModule").hidden = m.id !== "escritos";
    if (m.id === "escritos") {
      window.CejProWritings.mount($("writingsModule"));
      window.CejProWritings.showRoute(route);
    }
    document.querySelector(".page-heading").hidden =
      [
        "expedientes",
        "clientes",
        "cobros",
        "espacios",
        "sinoe",
        "escritos",
      ].includes(m.id) &&
      !!route.split("/")[1] &&
      !(m.id === "expedientes" && route.split("/")[1] === "carpetas") &&
      (m.id !== "sinoe" ||
        !!document.querySelector("#sinoeScreen .sinoe-heading"));
    $("profileModule").hidden = m.id !== "perfil";
    if (m.id === "perfil") window.CejProAccount.profile($("profileModule"));
    $("settingsModule").hidden = m.id !== "configuracion";
    if (m.id === "configuracion")
      window.CejProAccount.settings($("settingsModule"));
    $("supportModule").hidden = m.id !== "soporte";
    if (m.id === "soporte") window.CejProSupport.mount($("supportModule"));
    $("calendarModule").hidden = m.id !== "calendario";
    if (m.id === "calendario") {
      window.CejProCalendar.mount($("calendarModule"));
      window.CejProCalendar.showRoute(route);
    }
    // Keep primary list actions beside the page title, without an extra toolbar row.
    const pageHeading = document.querySelector(".page-heading");
    for (const [selector, moduleId] of [
      [".cal-top", "calendario"],
      [".cases-top", "expedientes"],
    ]) {
      const actions = document.querySelector(selector);
      if (actions) {
        actions.classList.add("page-heading-actions");
        pageHeading.append(actions);
        actions.hidden =
          m.id !== moduleId ||
          (moduleId === "expedientes" &&
            !!route.split("/")[1] &&
            route.split("/")[1] !== "carpetas");
      }
    }
    $("pageTitle").textContent = m.title || m.label;
    $("pageDescription").textContent = m.description;
    $("eyebrow").textContent = m.account
      ? "MI CUENTA"
      : m.utility
        ? "CENTRO DE AYUDA"
        : "ESPACIO DE TRABAJO";
    updateBreadcrumb(m);
    document.title = "CEJ PRO · " + m.label;
    closeMenu();
    closeAccount();
  }
  $("menuButton").addEventListener("click", () => {
    if (mobile.matches) document.body.classList.toggle("mobile-open");
    else {
      collapsed = !collapsed;
      document.body.classList.toggle("sidebar-collapsed", collapsed);
    }
    syncMenu();
  });
  $("backdrop").addEventListener("click", closeMenu);
  $("accountButton").addEventListener("click", () => {
    const open = $("accountMenu").hidden;
    $("accountMenu").hidden = !open;
    $("accountButton").setAttribute("aria-expanded", String(open));
    if (!open) window.CejProWorkspacesUI.closeSwitcher();
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".sidebar-bottom,.workspace-switcher"))
      closeAccount();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (document.querySelector("dialog[open]")) return;
      if (window.CejProWorkspacesUI.closeSwitcher(true)) return;
      closeAccount();
      closeMenu();
      $("menuButton").focus();
    }
  });
  mobile.addEventListener("change", closeMenu);
  window.addEventListener("hashchange", () => {
    if (location.hash === "#main") return;
    render();
    if (location.hash !== "#login") $("main").focus({ preventScroll: true });
  });
  window.CejProWorkspacesUI.init();
  if (!location.hash) history.replaceState(null, "", "#login");
  render();
})();
