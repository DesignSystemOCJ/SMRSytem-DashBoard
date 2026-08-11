document.addEventListener("DOMContentLoaded", () => {

/* =========================================
SUPABASE
========================================= */

const supabaseUrl =
"https://mrxtqmvufmlozplszfxc.supabase.co";

const supabaseKey =
"sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const db = supabase.createClient(
supabaseUrl,
supabaseKey
);

/* =========================================
DOM ELEMENTS
========================================= */

const timeElement =
document.getElementById("time");

const dateElement =
document.getElementById("date");

const sidebarMenu =
document.querySelector(".sidebar-menu");

const settingsLink =
document.getElementById("settings-link");

const mobileSettingsLink =
document.getElementById("mobile-settings-link");

const welcomeScreen =
document.getElementById("welcome-screen");

const welcomeLogo =
document.getElementById("welcome-logo");

const iframe =
document.getElementById("main-iframe");

const settingsCards =
document.getElementById("settings-cards");

const loginModal =
document.getElementById("login-modal");

const loginCloseBtn =
document.getElementById("login-close");

const loginForm =
document.getElementById("login-form");

const usernameInput =
document.getElementById("username-input");

const passwordInput =
document.getElementById("password-input");

const passwordToggle =
document.getElementById("password-toggle");

const submitBtn =
loginForm.querySelector(".login-btn");

const pageTitle =
document.getElementById("page-title");

const mobileNavItems =
document.querySelectorAll(".mobile-nav-item");

/* =========================================
CLOCK
========================================= */

const dateFormatter =
new Intl.DateTimeFormat("en-US", {
weekday: "short",
year: "numeric",
month: "short",
day: "numeric"
});

function updateClock() {

const now = new Date();

timeElement.textContent =
  now.toLocaleTimeString("en-US", {
    hour12: false
  });

dateElement.textContent =
  dateFormatter.format(now);

}

updateClock();

setInterval(updateClock, 1000);

/* =========================================
PAGE TITLES
========================================= */

const moduleTitles = {

"ManttoIssues.html":
  "Maintenance Issues",

"ScrapMrb.html":
  "Scrap Management",

"EhsAudits.html":
  "EHS Audits",

"Accidents.html":
  "Accident Management",

"bu.html":
  "B&U Management",

"Projects.html":
  "Projects",

"AccidentesIngresar.html":
  "Enter Accidents",

"HallazgosEHSEditar.html":
  "Edit Findings",

"HallazgosEHSIngresar.html":
  "Enter Findings"

};

/* =========================================
OPEN MODULE
========================================= */

function openModule(link) {

if (!link) return;

const href =
  link.getAttribute("href");

if (!href || href === "#") return;

document
  .querySelectorAll(".sidebar-link")
  .forEach(item =>
    item.classList.remove("active")
  );

link.classList.add("active");

const title =
  moduleTitles[href] ||
  "Industrial Operations";

pageTitle.textContent = title;

welcomeScreen.style.display = "none";

settingsCards.style.display = "none";

iframe.style.display = "block";

loginModal.style.display = "none";

}

/* =========================================
SIDEBAR NAVIGATION
========================================= */

sidebarMenu.addEventListener("click", (event) => {

const link =
  event.target.closest(".sidebar-link");

if (!link) return;

if (link.id === "settings-link") {

  event.preventDefault();

  openLogin();

  return;
}

openModule(link);

});

/* =========================================
MOBILE NAVIGATION
========================================= */

mobileNavItems.forEach(item => {

item.addEventListener("click", event => {

  if (item.id === "mobile-settings-link") {

    event.preventDefault();

    openLogin();

    return;
  }

  if (item.dataset.home === "true") {

    event.preventDefault();

    showHome();

    mobileNavItems.forEach(nav =>
      nav.classList.remove("active")
    );

    item.classList.add("active");

    return;
  }

  mobileNavItems.forEach(nav =>
    nav.classList.remove("active")
  );

  item.classList.add("active");

  welcomeScreen.style.display = "none";

  settingsCards.style.display = "none";

  iframe.style.display = "block";
});

});

/* =========================================
HOME
========================================= */

function showHome() {

welcomeScreen.style.display = "flex";

settingsCards.style.display = "none";

iframe.style.display = "none";

iframe.src = "";

pageTitle.textContent =
  "Industrial Operations";

document
  .querySelectorAll(".sidebar-link")
  .forEach(item =>
    item.classList.remove("active")
  );

}

/* =========================================
LOGIN
========================================= */

function openLogin() {

usernameInput.value = "";

passwordInput.value = "";

passwordInput.type = "password";

const icon =
  passwordToggle.querySelector("i");

icon.className =
  "fa-solid fa-eye";

loginModal.style.display = "flex";

setTimeout(() => {
  usernameInput.focus();
}, 100);

}

function closeLogin() {

loginModal.style.display = "none";

}

loginCloseBtn.addEventListener(
"click",
closeLogin
);

loginModal.addEventListener(
"click",
event => {

  if (
    event.target === loginModal
  ) {
    closeLogin();
  }
}

);

window.addEventListener(
"keydown",
event => {

  if (
    event.key === "Escape" &&
    loginModal.style.display === "flex"
  ) {

    closeLogin();
  }
}

);

/* =========================================
PASSWORD VISIBILITY
========================================= */

passwordToggle.addEventListener(
"click",
() => {

  const isPassword =
    passwordInput.type === "password";

  passwordInput.type =
    isPassword
      ? "text"
      : "password";

  const icon =
    passwordToggle.querySelector("i");

  icon.className =
    isPassword
      ? "fa-solid fa-eye-slash"
      : "fa-solid fa-eye";
}

);

/* =========================================
SUPABASE LOGIN
========================================= */

loginForm.addEventListener(
"submit",
async event => {

  event.preventDefault();

  const userVal =
    usernameInput.value.trim();

  const passVal =
    passwordInput.value.trim();

  if (!userVal || !passVal) {

    alert(
      "Please enter your username and password."
    );

    return;
  }

  submitBtn.disabled = true;

  const buttonText =
    submitBtn.querySelector(
      ".login-btn-text"
    );

  const originalText =
    buttonText.textContent;

  buttonText.textContent =
    "Authenticating...";

  try {

    const {
      data,
      error
    } = await db

      .from("Cuentas")

      .select("id")

      .eq("Usurio", userVal)

      .eq("Password", passVal)

      .maybeSingle();


    if (error) {
      throw error;
    }


    if (data) {

      closeLogin();

      document
        .querySelectorAll(".sidebar-link")
        .forEach(item =>
          item.classList.remove("active")
        );

      settingsLink.classList.add(
        "active"
      );

      welcomeScreen.style.display =
        "none";

      iframe.style.display =
        "none";

      iframe.src = "";

      settingsCards.style.display =
        "flex";

      pageTitle.textContent =
        "Administration";

      mobileNavItems.forEach(item =>
        item.classList.remove("active")
      );

    } else {

      alert(
        "Access denied: Invalid username or password."
      );
    }

  } catch (error) {

    console.error(
      "Authentication error:",
      error
    );

    alert(
      "An error occurred while processing your login."
    );

  } finally {

    submitBtn.disabled = false;

    buttonText.textContent =
      originalText;
  }
}

);

/* =========================================
ADMINISTRATION CARDS
========================================= */

settingsCards.addEventListener(
"click",
event => {

  const card =
    event.target.closest(".setting-card");

  if (!card) return;

  const url =
    card.dataset.url;

  if (!url) return;

  settingsCards.style.display =
    "none";

  iframe.src = url;

  iframe.style.display =
    "block";

  pageTitle.textContent =
    moduleTitles[url] ||
    "Administration";
}

);

/* =========================================
IFRAME LOAD
========================================= */

iframe.addEventListener(
"load",
() => {

  if (
    iframe.style.display === "block"
  ) {

    console.log(
      "SMRC module loaded:",
      iframe.src
    );
  }
}

);

/* =========================================
INITIAL STATE
========================================= */

showHome();

});