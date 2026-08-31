document.addEventListener("DOMContentLoaded", () => {
  const DOM = {
    sidebar: document.querySelector(".sidebar"),
    time: document.getElementById("time"),
    date: document.getElementById("date"),
    welcomeScreen: document.getElementById("welcome-screen"),
    iframe: document.getElementById("main-iframe"),
    mobileNavItems: document.querySelectorAll(".mobile-nav-item"),
    adminModal: document.getElementById("admin-modal"),
    closeModalBtn: document.getElementById("close-modal-btn"),
    loginSublink: document.getElementById("login-sublink"),
    mobileSettingsLink: document.getElementById("mobile-settings-link")
  };

  // Manejo adaptativo para Mouse (Desktop)
  DOM.sidebar.addEventListener("mouseenter", () => {
    if (window.innerWidth > 900) DOM.sidebar.classList.add("expanded");
  });
  
  DOM.sidebar.addEventListener("mouseleave", () => {
    if (window.innerWidth > 900) {
      resetSidebarState();
    }
  });

  function resetSidebarState() {
    document.querySelectorAll(".dropdown-item").forEach(item => item.classList.remove("open"));
    if (window.innerWidth > 900) {
      DOM.sidebar.classList.remove("expanded");
    }
  }

  // Delegación de eventos unificada para el menú y submenús
  DOM.sidebar.addEventListener("click", (event) => {
    const brandHeader = event.target.closest(".sidebar-header");
    if (brandHeader && window.innerWidth <= 1024) {
      DOM.sidebar.classList.toggle("expanded");
      return;
    }

    const subLink = event.target.closest(".sub-link");
    const link = event.target.closest(".sidebar-link");
    if (!link) return;

    if (link.classList.contains("dropdown-toggle")) {
      event.preventDefault();
      event.stopPropagation();
      if (!DOM.sidebar.classList.contains("expanded")) DOM.sidebar.classList.add("expanded");
      
      const parentDropdown = link.closest(".dropdown-item");
      document.querySelectorAll(".dropdown-item").forEach(item => {
        if (item !== parentDropdown) item.classList.remove("open");
      });

      parentDropdown.classList.toggle("open");
      return;
    }

    if (subLink && subLink.id === "login-sublink") return; 

    if (subLink) {
      openModule(subLink);
      resetSidebarState();
      return;
    }

    resetSidebarState();
    openModule(link);
  });

  // Reloj en tiempo real optimizado
  const dateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  setInterval(() => {
    const now = new Date();
    DOM.time.textContent = now.toLocaleTimeString("en-US", { hour12: false });
    DOM.date.textContent = dateFormatter.format(now);
  }, 1000);

  function openModule(link) {
    const href = link.getAttribute("href");
    if (!href || href === "#") return;

    document.querySelectorAll(".sidebar-link, .sub-link").forEach(item => item.classList.remove("active"));
    link.classList.add("active");

    DOM.welcomeScreen.style.display = "none";
    DOM.iframe.style.display = "block";
    DOM.iframe.src = href;
  }

  function showHome() {
    DOM.welcomeScreen.style.display = "flex";
    DOM.iframe.style.display = "none";
    DOM.iframe.src = "";
    document.querySelectorAll(".sidebar-link, .sub-link").forEach(item => item.classList.remove("active"));
    resetSidebarState();
  }

  // Navegación Móvil
  DOM.mobileNavItems.forEach(item => {
    item.addEventListener("click", event => {
      DOM.mobileNavItems.forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");

      if (item.dataset.home === "true") {
        event.preventDefault();
        showHome();
        return;
      }
      
      if (item.id === "mobile-settings-link") return;

      DOM.welcomeScreen.style.display = "none";
      DOM.iframe.style.display = "block";
    });
  });

  // Control de Modal de Administración
  function openAdminModal(e) {
    e.preventDefault();
    if (DOM.adminModal) DOM.adminModal.showModal();
    resetSidebarState();
  }

  if (DOM.loginSublink) DOM.loginSublink.addEventListener("click", openAdminModal);
  if (DOM.mobileSettingsLink) DOM.mobileSettingsLink.addEventListener("click", openAdminModal);

  if (DOM.closeModalBtn && DOM.adminModal) {
    DOM.closeModalBtn.addEventListener("click", () => DOM.adminModal.close());

    DOM.adminModal.addEventListener("click", (event) => {
      const rect = DOM.adminModal.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
        DOM.adminModal.close();
      }
    });
  }

  showHome();
});

// Bloqueo de atajos de desarrollo e inspección
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("keydown", (e) => {
  if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) || (e.ctrlKey && e.key === "U")) {
    e.preventDefault();
  }
});
