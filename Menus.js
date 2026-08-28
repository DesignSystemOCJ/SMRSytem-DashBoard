document.addEventListener("DOMContentLoaded", () => {
  const DOM = {
    sidebar: document.querySelector(".sidebar"),
    time: document.getElementById("time"),
    date: document.getElementById("date"),
    welcomeScreen: document.getElementById("welcome-screen"),
    iframe: document.getElementById("main-iframe"),
    mobileNavItems: document.querySelectorAll(".mobile-nav-item")
  };

  // Manejo adaptativo para Mouse (Desktop) y Touch (Tablets/Móviles grandes)
  DOM.sidebar.addEventListener("mouseenter", () => {
    if (window.innerWidth > 900) DOM.sidebar.classList.add("expanded");
  });
  
  DOM.sidebar.addEventListener("mouseleave", () => {
    if (window.innerWidth > 900) DOM.sidebar.classList.remove("expanded");
  });

  function resetSidebarState() {
    document.querySelectorAll(".dropdown-item").forEach(item => item.classList.remove("open"));
    if (window.innerWidth > 900) {
      DOM.sidebar.classList.remove("expanded");
    }
  }

  // Delegación de eventos unificada para el menú, submenús y soporte táctil
  DOM.sidebar.addEventListener("click", (event) => {
    // Soporte táctil en tablets para expandir/colapsar el menú al tocar la cabecera
    const brandHeader = event.target.closest(".sidebar-header");
    if (brandHeader && window.innerWidth <= 1024) {
      DOM.sidebar.classList.toggle("expanded");
      return;
    }

    const subLink = event.target.closest(".sub-link");
    const link = event.target.closest(".sidebar-link");
    if (!link) return;

    if (link.id === "roughcut-toggle") {
      event.preventDefault();
      event.stopPropagation();
      if (!DOM.sidebar.classList.contains("expanded")) DOM.sidebar.classList.add("expanded");
      link.closest(".dropdown-item").classList.toggle("open");
      return;
    }

    if (subLink) {
      openModule(subLink);
      resetSidebarState();
      return;
    }

    // Excluimos administration (#settings-link) para que no abra en el iframe principal
    if (link.id !== "settings-link") {
      resetSidebarState();
      openModule(link);
    }
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

    document.querySelectorAll(".sidebar-link").forEach(item => item.classList.remove("active"));
    link.classList.add("active");

    DOM.welcomeScreen.style.display = "none";
    DOM.iframe.style.display = "block";
    DOM.iframe.src = href;
  }

  function showHome() {
    DOM.welcomeScreen.style.display = "flex";
    DOM.iframe.style.display = "none";
    DOM.iframe.src = "";
    document.querySelectorAll(".sidebar-link").forEach(item => item.classList.remove("active"));
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
      
      // Si el ítem es el de administración móvil, dejamos que lo maneje el script del modal
      if (item.id === "mobile-settings-link") return;

      DOM.welcomeScreen.style.display = "none";
      DOM.iframe.style.display = "block";
    });
  });

  // --- CONTROL DE LA VENTANA MODAL DE ADMINISTRACIÓN ---
  const adminModal = document.getElementById("admin-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const settingsLink = document.getElementById("settings-link");
  const mobileSettingsLink = document.getElementById("mobile-settings-link");

  function openAdminModal(e) {
    e.preventDefault();
    if (adminModal) {
      adminModal.showModal(); // Abre el diálogo nativo de forma flotante
    }
    resetSidebarState();
  }

  if (settingsLink) {
    settingsLink.addEventListener("click", openAdminModal);
  }

  if (mobileSettingsLink) {
    mobileSettingsLink.addEventListener("click", openAdminModal);
  }

  if (closeModalBtn && adminModal) {
    closeModalBtn.addEventListener("click", () => {
      adminModal.close();
    });

    // Permitir cerrar haciendo clic fuera del contenedor del modal (en la zona oscura)
    adminModal.addEventListener("click", (event) => {
      const rect = adminModal.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        adminModal.close();
      }
    });
  }

  showHome();
});

// --- BLOQUEO DE CLIC DERECHO Y CÓDIGO FUENTE ---
document.addEventListener("contextmenu", (e) => e.preventDefault());

document.addEventListener("keydown", (e) => {
  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
    (e.ctrlKey && e.key === "U")
  ) {
    e.preventDefault();
  }
});
