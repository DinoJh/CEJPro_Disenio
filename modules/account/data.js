/* Preferencias personales: no pertenecen al contenido compartido de un espacio. */
window.CejProAccountData = (() => {
  const profileKey = "cejpro.profile.v1",
    preferencesKey = "cejpro.preferences.v1";
  const startPages = {
    inicio: "Inicio",
    calendario: "Calendario",
    expedientes: "Mis expedientes",
    clientes: "Clientes",
    cobros: "Cobros",
    escritos: "Redactar escritos",
  };
  const blank = () => ({ name: "", email: "", phone: "", registration: "" });
  function loadProfile() {
    try {
      const value = JSON.parse(localStorage.getItem(profileKey));
      if (
        value &&
        Object.keys(blank()).every((k) => typeof value[k] === "string")
      )
        return {
          name: value.name,
          email: value.email,
          phone: value.phone,
          registration: value.registration,
          firstName:
            typeof value.firstName === "string" ? value.firstName : value.name,
          lastName: typeof value.lastName === "string" ? value.lastName : "",
        };
    } catch (_) {}
    return { ...blank(), firstName: "", lastName: "" };
  }
  function loadPreferences() {
    try {
      const value = JSON.parse(localStorage.getItem(preferencesKey));
      if (value && Object.hasOwn(startPages, value.startPage))
        return { startPage: value.startPage };
    } catch (_) {}
    return { startPage: "inicio" };
  }
  function persist(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return { ok: true };
    } catch (_) {
      return {
        ok: false,
        error: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
      };
    }
  }
  function saveProfile(input) {
    const separated =
      Object.hasOwn(input, "firstName") || Object.hasOwn(input, "lastName");
    const firstName = String(input.firstName || "").trim(),
      lastName = String(input.lastName || "").trim();
    if (
      separated &&
      (!firstName || !lastName || firstName.length > 60 || lastName.length > 60)
    )
      return {
        ok: false,
        error: "Completa tu nombre y apellidos (hasta 60 caracteres cada uno).",
      };
    const value = Object.fromEntries(
      Object.keys(blank()).map((k) => [k, String(input[k] || "").trim()]),
    );
    if (separated) {
      value.firstName = firstName;
      value.lastName = lastName;
      value.name = [firstName, lastName].join(" ");
    }
    if (!value.name || value.name.length > 121)
      return { ok: false, error: "Escribe un nombre de hasta 120 caracteres." };
    if (
      value.email &&
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) ||
        value.email.length > 180)
    )
      return { ok: false, error: "Revisa el correo de contacto." };
    if (value.phone.length > 40 || value.registration.length > 80)
      return { ok: false, error: "Revisa el teléfono y la colegiatura." };
    const result = persist(profileKey, value);
    if (result.ok) window.dispatchEvent(new Event("cejpro:profile-change"));
    return result;
  }
  function savePreferences(input) {
    if (!Object.hasOwn(startPages, input.startPage))
      return { ok: false, error: "Selecciona una página de inicio." };
    return persist(preferencesKey, { startPage: input.startPage });
  }
  return {
    loadProfile,
    loadPreferences,
    saveProfile,
    savePreferences,
    startPages,
  };
})();
