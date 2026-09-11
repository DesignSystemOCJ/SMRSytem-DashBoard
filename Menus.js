// --- CONFIGURACIÓN E INICIALIZACIÓN DE SUPABASE ---
const SUPABASE_CONFIG = {
  url: "https://mrxtqmvufmlozplszfxc.supabase.co",
  key: "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-"
};

let supabaseClient = null;
try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
    window.supabaseClient = supabaseClient;
  }
} catch (e) {
  console.error("Error al crear cliente Supabase:", e);
}

// --- CONFIGURACIÓN DINÁMICA DE MENÚS ---
const menuConfig = [
  {
    type: "dropdown",
    toggleId: "roughcut-toggle",
    tooltip: "RoughCut Summarys",
    icon: "fa-solid fa-layer-group",
    label: "RoughCut Summarys",
    subItems: [
      { href: "ManttoIssues.html", icon: "fa-solid fa-screwdriver-wrench", label: "Maintenance Issues" },
      { href: "PilotBore.html", icon: "fa-solid fa-file-lines", label: "Pilot Bore Report" }
    ]
  },
  {
    type: "dropdown",
    toggleId: "ehs-toggle",
    tooltip: "Safety and Hygiene",
    icon: "fa-solid fa-shield-halved",
    label: "Safety and Hygiene",
    subItems: [
      { href: "EhsAudits.html", icon: "fa-solid fa-clipboard-check", label: "EHS Audits" },
      { href: "Accidents.html", icon: "fa-solid fa-triangle-exclamation", label: "Accidents" },
      { href: "Plant.html", icon: "fa-solid fa-map", label: "Layout CNC" }
    ]
  },
  { type: "link", href: "ScrapMRB.html", tooltip: "ScrapMRB", icon: "fa-solid fa-recycle", label: "ScrapMRB" },
  { type: "link", href: "bu.html", tooltip: "B&U", icon: "fa-solid fa-building", label: "B&amp;U" },
  { type: "link", href: "Projects.html", tooltip: "Projects", icon: "fa-solid fa-diagram-project", label: "Projects" },
  { type: "link", href: "#", id: "admin-toggle", tooltip: "Settings", icon: "fa-solid fa-sliders", label: "Settings" }
];

const mobileMenuConfig = [
  { home: true, icon: "fa-solid fa-house", title: "Home", aria: "Home" },
  { href: "ManttoIssues.html", icon: "fa-solid fa-screwdriver-wrench", title: "Maintenance Issues", aria: "Maintenance Issues" },
  { href: "PilotBore.html", icon: "fa-solid fa-file-lines", title: "Pilot Bore Report", aria: "Pilot Bore Report" },
  { href: "ScrapMRB.html", icon: "fa-solid fa-recycle", title: "Scrap", aria: "Scrap" },
  { href: "EhsAudits.html", icon: "fa-solid fa-shield-halved", title: "EHS Audits", aria: "EHS Audits" },
  { href: "Accidents.html", icon: "fa-solid fa-triangle-exclamation", title: "Accidents", aria: "Accidents" },
  { href: "Plant.html", icon: "fa-solid fa-map", title: "Layout CNC", aria: "Layout CNC" },
  { href: "bu.html", icon: "fa-solid fa-building", title: "B&amp;U", aria: "B&amp;U" },
  { href: "Projects.html", icon: "fa-solid fa-diagram-project", title: "Projects", aria: "Projects" },
  { id: "mobile-settings-link", href: "#", icon: "fa-solid fa-sliders", title: "Settings", aria: "Settings" }
];

function renderMenus() {
  const sidebarMenu = document.getElementById("dynamic-sidebar-menu");
  const mobileNav = document.getElementById("dynamic-mobile-nav");

  if (sidebarMenu) {
    sidebarMenu.innerHTML = menuConfig.map(item => {
      if (item.type === "dropdown") {
        const subHtml = item.subItems.map(sub => `
          <li class="sidebar-item">
            <a href="${sub.href}" target="content-frame" class="sidebar-link sub-link">
              <span class="nav-icon"><i class="${sub.icon}" aria-hidden="true"></i></span>
              <span class="nav-label">${sub.label}</span>
            </a>
          </li>
        `).join('');

        return `
          <li class="sidebar-item dropdown-item">
            <a href="#" class="sidebar-link dropdown-toggle" id="${item.toggleId}" data-tooltip="${item.tooltip}">
              <span class="nav-icon"><i class="${item.icon}" aria-hidden="true"></i></span>
              <span class="nav-label">${item.label}</span>
              <span class="nav-arrow"><i class="fa-solid fa-chevron-right dropdown-chevron" aria-hidden="true"></i></span>
            </a>
            <ul class="sidebar-submenu">${subHtml}</ul>
          </li>
        `;
      } else {
        const idAttr = item.id ? `id="${item.id}"` : '';
        return `
          <li class="sidebar-item">
            <a href="${item.href}" target="content-frame" class="sidebar-link" ${idAttr} data-tooltip="${item.tooltip}">
              <span class="nav-icon"><i class="${item.icon}" aria-hidden="true"></i></span>
              <span class="nav-label">${item.label}</span>
            </a>
          </li>
        `;
      }
    }).join('');
  }

  if (mobileNav) {
    mobileNav.innerHTML = mobileMenuConfig.map((m, index) => {
      const activeClass = index === 0 ? "mobile-nav-item active" : "mobile-nav-item";
      const homeAttr = m.home ? 'data-home="true"' : '';
      const idAttr = m.id ? `id="${m.id}"` : '';
      const hrefAttr = m.href || '#';
      
      return `
        <a href="${hrefAttr}" ${m.home ? '' : 'target="content-frame"'} class="${activeClass}" ${homeAttr} ${idAttr} title="${m.title}" aria-label="${m.aria}">
          <i class="${m.icon}" aria-hidden="true"></i>
        </a>
      `;
    }).join('');
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderMenus();

  const DOM = {
    sidebar: document.querySelector(".sidebar"),
    time: document.getElementById("time"),
    date: document.getElementById("date"),
    welcomeScreen: document.getElementById("welcome-screen"),
    iframe: document.getElementById("main-iframe"),
    iframeLoader: document.getElementById("iframe-loader"),
    mobileNavItems: document.querySelectorAll(".mobile-nav-item"),
    loginSublink: document.getElementById("login-sublink"),
    mobileSettingsLink: document.getElementById("mobile-settings-link"),
    togglePasswordIcon: document.getElementById("togglePasswordIcon"),
    mainLoginPassword: document.getElementById("mainLoginPassword"),
    mainLoginForm: document.getElementById("mainLoginForm")
  };

  DOM.sidebar.addEventListener("mouseenter", () => {
    if (window.innerWidth > 1024) DOM.sidebar.classList.add("expanded");
  });
  
  DOM.sidebar.addEventListener("mouseleave", () => {
    if (window.innerWidth > 1024) resetSidebarState();
  });

  DOM.sidebar.addEventListener("mouseover", (event) => {
    if (window.innerWidth <= 1024 || !DOM.sidebar.classList.contains("expanded")) return;
    const dropdownItem = event.target.closest(".dropdown-item");
    if (dropdownItem) {
      document.querySelectorAll(".dropdown-item").forEach(item => {
        if (item !== dropdownItem) item.classList.remove("open");
      });
      dropdownItem.classList.add("open");
    }
  });

  function resetSidebarState() {
    document.querySelectorAll(".dropdown-item").forEach(item => item.classList.remove("open"));
    if (window.innerWidth > 1024) {
      DOM.sidebar.classList.remove("expanded");
    }
  }

  DOM.sidebar.addEventListener("click", (event) => {
    const subLink = event.target.closest(".sub-link");
    const link = event.target.closest(".sidebar-link");
    if (!link) return;

    if (link.classList.contains("dropdown-toggle")) {
      event.preventDefault();
      event.stopPropagation();
      
      if (!DOM.sidebar.classList.contains("expanded")) {
        DOM.sidebar.classList.add("expanded");
      }
      
      const parentDropdown = link.closest(".dropdown-item");
      document.querySelectorAll(".dropdown-item").forEach(item => {
        if (item !== parentDropdown) item.classList.remove("open");
      });

      parentDropdown.classList.toggle("open");
      return;
    }

    if (subLink && subLink.id === "login-sublink") return; 

    if (subLink) {
      event.preventDefault();
      openModule(subLink);
      resetSidebarState();
      return;
    }

    event.preventDefault();
    resetSidebarState();
    openModule(link);
  });

  if (DOM.togglePasswordIcon && DOM.mainLoginPassword) {
    DOM.togglePasswordIcon.addEventListener("mouseenter", () => {
      DOM.mainLoginPassword.type = 'text';
      DOM.togglePasswordIcon.style.color = 'var(--primary-red)';
    });
    DOM.togglePasswordIcon.addEventListener("mouseleave", () => {
      DOM.mainLoginPassword.type = 'password';
      DOM.togglePasswordIcon.style.color = 'var(--text-muted)';
    });
  }

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
    document.querySelectorAll(".dropdown-item").forEach(item => item.classList.remove("has-active-child"));

    link.classList.add("active");

    const parentDropdown = link.closest(".dropdown-item");
    if (parentDropdown && link.classList.contains("sub-link")) {
      parentDropdown.classList.add("has-active-child");
    }

    DOM.welcomeScreen.style.display = "none";
    DOM.iframe.style.display = "block";
    
    if (DOM.iframeLoader) DOM.iframeLoader.classList.add("active");
    DOM.iframe.src = href;
  }

  DOM.iframe.addEventListener("load", () => {
    if (DOM.iframeLoader) DOM.iframeLoader.classList.remove("active");
  });

  function showHome() {
    DOM.welcomeScreen.style.display = "flex";
    DOM.iframe.style.display = "none";
    DOM.iframe.src = "";
    document.querySelectorAll(".sidebar-link, .sub-link").forEach(item => item.classList.remove("active"));
    document.querySelectorAll(".dropdown-item").forEach(item => item.classList.remove("has-active-child"));
    if (DOM.iframeLoader) DOM.iframeLoader.classList.remove("active");
    resetSidebarState();
  }

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
      if (DOM.iframeLoader) DOM.iframeLoader.classList.add("active");
    });
  });

  function openLoginModal(e) {
    e.preventDefault();
    if (!currentSessionUser) {
      const modal = document.getElementById("mainLoginModal");
      if (modal) {
        modal.style.display = "flex";
        setTimeout(() => {
          const userInput = document.getElementById("mainLoginUser");
          if (userInput) userInput.focus();
        }, 50);
      }
    }
    resetSidebarState();
  }

  if (DOM.loginSublink) DOM.loginSublink.addEventListener("click", openLoginModal);
  if (DOM.mobileSettingsLink) DOM.mobileSettingsLink.addEventListener("click", openLoginModal);

  showHome();
  updateMenuLoginState();
});

document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("keydown", (e) => {
  if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) || (e.ctrlKey && e.key === "U")) {
    e.preventDefault();
  }
});

// --- GESTIÓN DE SESIÓN Y MODAL ---
let currentSessionUser = localStorage.getItem("smrc_logged_user");

function updateMenuLoginState() {
  const loginSublink = document.getElementById("login-sublink");
  if (!loginSublink) return;
  
  const userNameLabel = document.getElementById("userNameLabel");
  const userEmailLabel = document.getElementById("userEmailLabel");
  const userActionIcon = document.getElementById("userActionIcon");
  const userDefaultIcon = document.getElementById("userDefaultIcon");
  const userAvatarImg = document.getElementById("userAvatarImg");

  if (currentSessionUser) {
    if (userNameLabel) userNameLabel.textContent = currentSessionUser;
    if (userEmailLabel) userEmailLabel.textContent = "Active Session";
    
    if (userActionIcon) {
      userActionIcon.innerHTML = '<i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>';
      userActionIcon.title = "Sign out";
    }

    if (userDefaultIcon) userDefaultIcon.style.display = "none";
    if (userAvatarImg) {
      userAvatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentSessionUser)}&background=c00d0d&color=fff`;
      userAvatarImg.style.display = "block";
    }

    if (loginSublink) loginSublink.setAttribute("data-tooltip", "Sign out");
  } else {
    if (userNameLabel) userNameLabel.textContent = "Sign in";
    if (userEmailLabel) userEmailLabel.textContent = "Access system";
    
    if (userActionIcon) {
      userActionIcon.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket" aria-hidden="true"></i>';
      userActionIcon.title = "Sign in";
    }

    if (userDefaultIcon) userDefaultIcon.style.display = "block";
    if (userAvatarImg) userAvatarImg.style.display = "none";

    if (loginSublink) loginSublink.setAttribute("data-tooltip", "Sign in");
  }
}

document.addEventListener("click", async (e) => {
  const loginSublinkTarget = e.target.closest("#login-sublink");
  if (loginSublinkTarget) {
    e.preventDefault();
    if (currentSessionUser) {
      if (confirm("Are you sure you want to sign out?")) {
        localStorage.removeItem("smrc_logged_user");
        currentSessionUser = null;
        updateMenuLoginState();
        
        const iframe = document.getElementById("main-iframe");
        if (iframe && iframe.src) iframe.src = iframe.src;
      }
    } else {
      const modal = document.getElementById("mainLoginModal");
      if (modal) {
        modal.style.display = "flex";
        setTimeout(() => {
          const userInput = document.getElementById("mainLoginUser");
          if (userInput) userInput.focus();
        }, 50);
      }
    }
  }
});

window.closeMainLoginModal = function() {
  const modal = document.getElementById("mainLoginModal");
  if (modal) modal.style.display = "none";
};

window.handleMainLogin = async function(event) {
  event.preventDefault();
  const userInput = document.getElementById("mainLoginUser").value.trim();
  const passwordInput = document.getElementById("mainLoginPassword").value.trim();

  try {
    const client = window.supabaseClient;
    if (!client) {
      alert("Error: Supabase no está inicializado. Revisa que el script cargue correctamente en el HTML.");
      return;
    }

    const { data, error } = await client
      .from("Cuentas")
      .select("*")
      .eq("Usurio", userInput)
      .eq("Password", passwordInput);

    if (error) {
      console.error("Supabase Error:", error);
      alert("Error en la base de datos: " + error.message);
      return;
    }

    if (data && data.length > 0) {
      currentSessionUser = userInput;
      localStorage.setItem("smrc_logged_user", userInput);
      updateMenuLoginState();
      closeMainLoginModal();
      document.getElementById("mainLoginForm").reset();
      
      const iframe = document.getElementById("main-iframe");
      if (iframe && iframe.src) iframe.src = iframe.src;
    } else {
      alert("Usuario o contraseña incorrectos.");
    }
  } catch (err) {
    console.error("Error inesperado en login:", err);
    alert("Ocurrió un error al intentar conectar con la base de datos: " + (err.message || err));
  }
};
