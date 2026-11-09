/* Aplicar la preferencia antes de pintar la página y migrar los temas anteriores. */
(() => {
  let theme = "elegante";
  try {
    const saved = localStorage.getItem("cejpro.theme");
    const renamed = { vino: "elegante", malva: "claro", rojo: "elegante" };
    const resolved = renamed[saved] || saved;
    if (["elegante", "claro", "oscuro"].includes(resolved)) theme = resolved;
    if (saved && saved !== theme) localStorage.setItem("cejpro.theme", theme);
  } catch (_) {
    /* El tema sigue funcionando sin almacenamiento. */
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme =
    theme === "oscuro" ? "dark" : "light";
})();
