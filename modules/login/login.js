/* Acceso visual de la maqueta. El botón de Google abre la sesión de demostración. */
window.CejProLogin = (() => {
  let screen;
  function mount() {
    screen = document.getElementById("loginScreen");
    const decoration = (name, position) =>
      `<span class="login-deco ${position}" aria-hidden="true">${window.CejProIcon(name)}</span>`;
    screen.innerHTML = `${decoration("folder", "d1")}${decoration("file", "d2")}<span class="login-deco d3" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 21h14M4 7h16M6 7l-4 9h8L6 7Zm12 0-4 9h8l-4-9Z"/></svg></span>${decoration("calendar", "d4")}
      <p class="login-note n1" aria-hidden="true">Tu trabajo<br>más organizado</p>
      <p class="login-note n2" aria-hidden="true">Cada expediente,<br>a un clic</p>
      <p class="login-note n3" aria-hidden="true">Tus notificaciones<br>SINOE ordenadas!!</p>
      <section class="login-card" aria-label="Acceso a CEJ PRO">
        <img class="login-logo" src="assets/images/cejpro-logo.png" alt="">
        <h1>Bienvenido a <span>CEJ PRO</span></h1>
        <p class="login-lead">Organiza tus expedientes, clientes y escritos en un solo lugar.</p>
        <button type="button" class="login-google" id="googleDemoLogin">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.7 2.9-4.2 2.9-7.4Z"/><path fill="#34a853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.4 14a6 6 0 0 1 0-4V7.4H3a10 10 0 0 0 0 9.2Z"/><path fill="#ea4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.5 9.5 0 0 0 12 2a10 10 0 0 0-9 5.4L6.4 10C7.2 7.6 9.4 5.9 12 5.9Z"/></svg>
          Continuar con Google
        </button>
      </section>`;
    document.getElementById("googleDemoLogin").onclick = () => {
      // Los datos anteriores del perfil y de los espacios se conservan.
      if (!window.CejProAccountData.loadProfile().name) {
        window.CejProAccountData.saveProfile({
          firstName: "Deyvis",
          lastName: "Mamani",
          email: "deyvis@example.com",
          phone: "",
          registration: "",
        });
        delete document.getElementById("profileModule").dataset.ready;
      }
      location.hash = "#" + window.CejProAccountData.loadPreferences().startPage;
    };
  }
  function show(visible) {
    if (!screen) mount();
    screen.hidden = !visible;
    document.body.classList.toggle("login-visible", visible);
    document.getElementById("sidebar").inert = visible;
    document.querySelector(".app-shell").inert = visible;
    if (visible) {
      document.title = "CEJ PRO · Iniciar sesión";
      document.getElementById("googleDemoLogin").focus();
    }
  }
  return { show };
})();
