(() => {
  const D = window.CejProAccountData,
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
  const icon = (name) =>
    '<span class="icon" aria-hidden="true">' +
    window.CejProIcon(name) +
    "</span>";
  const initials = (name) =>
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toLocaleUpperCase("es") || "TU";
  function status(root, id, result, success) {
    const el = root.querySelector("#" + id);
    el.textContent = result.ok ? success : result.error;
    el.classList.toggle("is-error", !result.ok);
    el.setAttribute("role", result.ok ? "status" : "alert");
  }
  function profile(root) {
    if (root.dataset.ready) return;
    root.dataset.ready = "true";
    const value = D.loadProfile();
    root.innerHTML = `<section class="account-card" aria-label="Datos del perfil"><div class="profile-overview"><span class="profile-avatar" id="profileAvatar" aria-hidden="true">${esc(initials(value.name))}</span><div><h2 id="profileDisplayName">${esc(value.name || "Tu perfil")}</h2><p>Tu información de cuenta</p></div></div><div class="profile-google-account"><span class="profile-google-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.7 2.9-4.2 2.9-7.4Z"/><path fill="#34a853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.4 14a6 6 0 0 1 0-4V7.4H3a10 10 0 0 0 0 9.2Z"/><path fill="#ea4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.5 9.5 0 0 0 12 2a10 10 0 0 0-9 5.4L6.4 10C7.2 7.6 9.4 5.9 12 5.9Z"/></svg></span><div><h3>Cuenta de Google</h3><p id="profileGoogleEmail">${esc(value.email || "usuario@example.com")}</p></div><span class="profile-google-badge"><span aria-hidden="true">✓</span> Vinculada</span></div><form id="profileForm" class="account-form"><div class="account-fields"><label>Nombre<input name="firstName" required maxlength="60" autocomplete="given-name" placeholder="Tu nombre" value="${esc(value.firstName)}"></label><label>Apellidos<input name="lastName" required maxlength="60" autocomplete="family-name" placeholder="Tus apellidos" value="${esc(value.lastName)}"></label><label>Teléfono<input name="phone" type="tel" maxlength="40" autocomplete="tel" placeholder="Número de contacto" value="${esc(value.phone)}"></label></div><div class="account-card-footer"><p class="account-feedback" id="profileFeedback" role="status" aria-live="polite"></p><button type="submit" class="cases-primary">Guardar cambios</button></div></form></section>`;
    root.querySelector("#profileForm").onsubmit = (e) => {
      e.preventDefault();
      const result = D.saveProfile({
        ...D.loadProfile(),
        ...Object.fromEntries(new FormData(e.target)),
      });
      status(root, "profileFeedback", result, "Cambios guardados.");
      if (result.ok) {
        const saved = D.loadProfile();
        root.querySelector("#profileDisplayName").textContent = saved.name;
        root.querySelector("#profileGoogleEmail").textContent =
          saved.email || "usuario@example.com";
        root.querySelector("#profileAvatar").textContent = initials(saved.name);
      }
    };
    root.querySelectorAll('[name="firstName"],[name="lastName"]').forEach(
      (input) =>
        (input.oninput = () => {
          const f = root.querySelector("#profileForm");
          root.querySelector("#profileAvatar").textContent = initials(
            f.elements.firstName.value + " " + f.elements.lastName.value,
          );
          root.querySelector("#profileFeedback").textContent = "";
        }),
    );
  }
  function settings(root) {
    const prefs = D.loadPreferences(),
      names = { elegante: "Elegante", claro: "Claro", oscuro: "Oscuro" },
      theme = names[document.documentElement.dataset.theme] || "Elegante",
      space = window.CejProWorkspaces.current();
    root.innerHTML = `<section class="account-card" aria-label="Preferencias de la cuenta"><div class="account-setting-row"><div class="account-setting-description">${icon("palette")}<div><h2>Apariencia</h2><p>Tema ${theme}</p></div></div><a class="cases-secondary" href="#personalizar">Cambiar</a></div><div class="account-setting-row"><div class="account-setting-description">${icon("layers")}<div><h2>Espacio de trabajo</h2><p>${esc(space.name)}</p></div></div><a class="cases-secondary" href="#espacios">Gestionar</a></div><form id="preferencesForm" class="account-form"><div class="account-fields"><label>Página al abrir CEJ PRO<select name="startPage">${Object.entries(
      D.startPages,
    )
      .map(
        ([id, name]) =>
          `<option value="${id}"${id === prefs.startPage ? " selected" : ""}>${name}</option>`,
      )
      .join(
        "",
      )}</select></label></div><div class="account-card-footer"><p class="account-feedback" id="preferencesFeedback" role="status" aria-live="polite"></p><button type="submit" class="cases-primary">Guardar preferencias</button></div></form></section>`;
    root.querySelector("#preferencesForm").onsubmit = (e) => {
      e.preventDefault();
      status(
        root,
        "preferencesFeedback",
        D.savePreferences(Object.fromEntries(new FormData(e.target))),
        "Preferencias guardadas.",
      );
    };
  }
  window.CejProAccount = { profile, settings };
})();
