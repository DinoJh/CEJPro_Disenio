/* Controles de cabecera del prototipo: sin conexión a servicios externos. */
(() => {
  const $ = (id) => document.getElementById(id);
  document
    .querySelectorAll("[data-header-close]")
    .forEach((el) => (el.onclick = () => $(el.dataset.headerClose).close()));
  $("extensionButton").onclick = () => $("extensionDialog").showModal();
  $("extensionDemoInstalled").onchange = (e) => {
    $("extensionLabel").textContent = e.target.checked
      ? "Extensión descargada"
      : "Descargar extensión";
    $("extensionButton").title = e.target.checked
      ? "Demostración: acceso a CEJ pendiente de vinculación"
      : "Descarga pendiente de vinculación";
  };
})();
