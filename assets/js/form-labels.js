/* El asterisco refleja la validación real, incluso en campos condicionales. */
window.CejProFormLabels = (() => {
  function sync() {
    document.querySelectorAll("form label").forEach((label) => {
      const control =
        label.control || label.querySelector("input,select,textarea");
      if (!control) return;
      const required =
        control.required && !control.disabled && !control.closest("[hidden]");
      let caption = label.querySelector(":scope > .form-field-caption"),
        marker = label.querySelector(".form-required");
      if (required && !marker) {
        if (!caption) {
          let branch = control;
          while (branch.parentNode && branch.parentNode !== label)
            branch = branch.parentNode;
          const nodes = [...label.childNodes],
            before = nodes.indexOf(branch),
            prefix = before >= 0 ? nodes.slice(0, before) : nodes;
          if (!prefix.length) return;
          caption = document.createElement("span");
          caption.className = "form-field-caption";
          label.insertBefore(caption, prefix[0]);
          prefix.forEach((node) => caption.append(node));
        }
        marker = document.createElement("span");
        marker.className = "form-required";
        marker.textContent = " *";
        marker.setAttribute("aria-hidden", "true");
        caption.append(marker);
      } else if (!required && marker) marker.remove();
      if (label.classList.contains("sr-only") && control.tagName === "INPUT") {
        const original =
          control.dataset.fieldPlaceholder ??
          control.getAttribute("placeholder");
        if (original !== null) {
          control.dataset.fieldPlaceholder = original;
          const value = original + (required ? " *" : "");
          if (control.getAttribute("placeholder") !== value)
            control.setAttribute("placeholder", value);
        }
      }
    });
  }
  let queued = false,
    stopped = false;
  const observer = new MutationObserver(() => {
    if (queued || stopped) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (!stopped) sync();
    });
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["required", "disabled", "hidden"],
  });
  window.addEventListener("pagehide", () => {
    stopped = true;
    observer.disconnect();
  });
  sync();
  return { sync };
})();
