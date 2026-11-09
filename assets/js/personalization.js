(() => {
  const names = { elegante: "Elegante", claro: "Claro", oscuro: "Oscuro" };
  const options = document.querySelectorAll('input[name="theme"]');
  const feedback = document.getElementById("themeFeedback");
  function apply(theme, save) {
    if (!names[theme]) theme = "elegante";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme =
      theme === "oscuro" ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]').content = {
      elegante: "#702338",
      claro: "#7a5865",
      oscuro: "#15191d",
    }[theme];
    options.forEach((input) => {
      input.checked = input.value === theme;
    });
    let stored = true;
    if (save) {
      try {
        localStorage.setItem("cejpro.theme", theme);
      } catch (_) {
        stored = false;
      }
    }
    feedback.textContent = save
      ? stored
        ? `Tema ${names[theme]} aplicado y guardado en este navegador.`
        : `Tema ${names[theme]} aplicado. Este navegador no permite guardar la preferencia.`
      : `Tema actual: ${names[theme]}.`;
  }
  options.forEach((input) =>
    input.addEventListener("change", () => {
      if (input.checked) apply(input.value, true);
    }),
  );
  apply(document.documentElement.dataset.theme, false);
})();
