document.addEventListener("DOMContentLoaded", () => {

  /* =========================================
     1. CONFIGURACIÓN DE SUPABASE
     ========================================= */
  const SUPABASE_URL = "https://mrxtqmvufmlozplszfxc.supabase.co";
  const SUPABASE_KEY = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
  const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* =========================================
     2. REFERENCIAS AL DOM
     ========================================= */
  const DOM = {
    sidebar: document.querySelector(".sidebar"),
    time: document.getElementById("time"),
    date: document.getElementById("date"),
    settingsLink: document.getElementById("settings-link"),
    welcomeScreen: document.getElementById("welcome-screen"),
    iframe: document.getElementById("main-iframe"),
    settingsCards: document.getElementById("settings-cards"),
    loginModal: document.getElementById("login-modal"),
    loginCloseBtn: document.getElementById("login-close"),
    loginForm: document.getElementById("login-form"),
    usernameInput: document.getElementById("username-input"),
    passwordInput: document.getElementById("password-input"),
    passwordToggle: document.getElementById("password-toggle"),
    submitBtn: document.querySelector("#login-form .login-btn"),
    mobileNavItems: document.querySelectorAll(".mobile-nav-item")
  };

  /* =========================================
     3. DICCIONARIO DE MÓDULOS
     ========================================= */
  const MODULE_TITLES = {
    "ManttoIssues.html": "Manufacturing Performance Dashboard",
    "ScrapMrb.html": "Scrap Quality Summary",
    "EhsAudits.html": "EHS Audits Dashboard",
    "Accidents.html": "EHS Accident Management",
    "bu.html": "B&U Performance Dashboard",
    "Projects.html": "Projects Management",
    "AccidentesIngresar.html": "Enter Accidents",
    "HallazgosEHSEditar.html": "Edit Findings",
    "HallazgosEHSIngresar.html": "Enter Findings"
  };

  /* =========================================
     4. CONTROL DEL SIDEBAR
     ========================================= */
  DOM.sidebar.addEventListener("mouseenter", () => DOM.sidebar.classList.add("expanded"));
  DOM.sidebar.addEventListener("mouseleave", () => DOM.sidebar.classList.remove("expanded"));

  DOM.sidebar.addEventListener("click", (event) => {
    const link = event.target.closest(".sidebar-link");
    if (!link) return;
    
    DOM.sidebar.classList.remove("expanded");
    if (link.id !== "settings-link") {
      openModule(link);
    } else {
      openLogin();
    }
  });

  /* =========================================
     5. RELOJ EN TIEMPO REAL
     ========================================= */
  const dateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  
  function updateClock() {
    const now = new Date();
    DOM.time.textContent = now.toLocaleTimeString("en-US", { hour12: false });
    DOM.date.textContent = dateFormatter.format(now);
  }
  
  updateClock();
  setInterval(updateClock, 1000);

  /* =========================================
     6. GESTIÓN DE VISTAS Y MÓDULOS
     ========================================= */
  function openModule(link) {
    const href = link.getAttribute("href");
    if (!href || href === "#") return;

    document.querySelectorAll(".sidebar-link").forEach(item => item.classList.remove("active"));
    link.classList.add("active");

    DOM.welcomeScreen.style.display = "none";
    DOM.settingsCards.style.display = "none";
    DOM.iframe.style.display = "block";
    DOM.iframe.src = href;
    DOM.loginModal.style.display = "none";
  }

  function showHome() {
    DOM.welcomeScreen.style.display = "flex";
    DOM.settingsCards.style.display = "none";
    DOM.iframe.style.display = "none";
    DOM.iframe.src = "";
    document.querySelectorAll(".sidebar-link").forEach(item => item.classList.remove("active"));
  }

  /* =========================================
     7. NAVEGACIÓN MÓVIL
     ========================================= */
  DOM.mobileNavItems.forEach(item => {
    item.addEventListener("click", event => {
      if (item.id === "mobile-settings-link") {
        event.preventDefault();
        openLogin();
        return;
      }
      if (item.dataset.home === "true") {
        event.preventDefault();
        showHome();
        setActiveMobileNav(item);
        return;
      }
      setActiveMobileNav(item);
      DOM.welcomeScreen.style.display = "none";
      DOM.settingsCards.style.display = "none";
      DOM.iframe.style.display = "block";
    });
  });

  function setActiveMobileNav(activeItem) {
    DOM.mobileNavItems.forEach(nav => nav.classList.remove("active"));
    activeItem.classList.add("active");
  }

  /* =========================================
     8. AUTENTICACIÓN Y ADMIN
     ========================================= */
  function openLogin() {
    DOM.usernameInput.value = "";
    DOM.passwordInput.value = "";
    DOM.passwordInput.type = "password";
    DOM.loginModal.style.display = "flex";
    setTimeout(() => DOM.usernameInput.focus(), 100);
  }

  function closeLogin() { 
    DOM.loginModal.style.display = "none"; 
  }

  DOM.loginCloseBtn.addEventListener("click", closeLogin);
  DOM.loginModal.addEventListener("click", event => { 
    if (event.target === DOM.loginModal) closeLogin(); 
  });

  DOM.passwordToggle.addEventListener("click", () => {
    const isPassword = DOM.passwordInput.type === "password";
    DOM.passwordInput.type = isPassword ? "text" : "password";
    DOM.passwordToggle.querySelector("i").className = isPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
  });

  DOM.loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    const userVal = DOM.usernameInput.value.trim();
    const passVal = DOM.passwordInput.value.trim();
    if (!userVal || !passVal) return;

    DOM.submitBtn.disabled = true;
    const buttonText = DOM.submitBtn.querySelector(".login-btn-text");
    const originalText = buttonText.textContent;
    buttonText.textContent = "Authenticating...";

    try {
      const { data, error } = await db
        .from("Cuentas")
        .select("id")
        .eq("Usurio", userVal)
        .eq("Password", passVal)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        closeLogin();
        document.querySelectorAll(".sidebar-link").forEach(item => item.classList.remove("active"));
        DOM.settingsLink.classList.add("active");
        DOM.welcomeScreen.style.display = "none";
        DOM.iframe.style.display = "none";
        DOM.settingsCards.style.display = "flex";
      } else {
        alert("Access denied: Invalid username or password.");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      alert("An error occurred during authentication.");
    } finally {
      DOM.submitBtn.disabled = false;
      buttonText.textContent = originalText;
    }
  });

  DOM.settingsCards.addEventListener("click", event => {
    const card = event.target.closest(".setting-card");
    if (!card) return;
    const url = card.dataset.url;
    DOM.settingsCards.style.display = "none";
    DOM.iframe.src = url;
    DOM.iframe.style.display = "block";
  });

  // Inicialización
  showHome();
});
