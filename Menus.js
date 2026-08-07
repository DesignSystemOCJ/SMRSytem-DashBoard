document.addEventListener("DOMContentLoaded", () => {
  // Credenciales de Supabase
  const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
  const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
  const db = supabase.createClient(supabaseUrl, supabaseKey);

  // Referencias del DOM
  const timeElement = document.getElementById("time");
  const dateElement = document.getElementById("date");
  const sidebarMenu = document.querySelector('.sidebar-menu');
  const settingsLink = document.getElementById('settings-link');
  const welcomeLogo = document.getElementById('welcome-logo');
  const iframe = document.getElementById('main-iframe');
  const settingsCards = document.getElementById('settings-cards');
  const loginModal = document.getElementById("login-modal");
  const loginCloseBtn = document.getElementById('login-close');
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('username-input');
  const passwordInput = document.getElementById('password-input');
  const submitBtn = loginForm.querySelector('.login-btn');

  // Reloj
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  function updateClock() {
    const now = new Date();
    timeElement.textContent = now.toTimeString().split(' ')[0];
    dateElement.textContent = dateFormatter.format(now);
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Navegación Sidebar (Delegación de eventos)
  sidebarMenu.addEventListener('click', (e) => {
    const link = e.target.closest('.sidebar-link');
    if (!link) return;

    if (link.id === 'settings-link') {
      e.preventDefault();
      usernameInput.value = '';
      passwordInput.value = '';
      loginModal.style.display = 'flex';
      usernameInput.focus();
      return;
    }

    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    
    welcomeLogo.style.display = 'none';
    settingsCards.style.display = 'none';
    iframe.style.display = 'block';
    loginModal.style.display = 'none';
  });

  // Cierre de modal (clic en X o tecla Escape)
  loginCloseBtn.addEventListener('click', () => loginModal.style.display = 'none');
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && loginModal.style.display === 'flex') {
      loginModal.style.display = 'none';
    }
  });

  // Validación de Login con Supabase
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userVal = usernameInput.value.trim();
    const passVal = passwordInput.value.trim();

    submitBtn.disabled = true;

    try {
      const { data, error } = await db
        .from('Cuentas')
        .select('id')
        .eq('Usurio', userVal)
        .eq('Password', passVal)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        loginModal.style.display = 'none';
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        settingsLink.classList.add('active');
        welcomeLogo.style.display = 'none';
        iframe.style.display = 'none';
        iframe.src = '';
        settingsCards.style.display = 'flex';
      } else {
        alert('Acceso denegado: Usuario o contraseña incorrectos.');
      }
    } catch (err) {
      console.error("Error al autenticar:", err);
      alert('Ocurrió un error al procesar el inicio de sesión.');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Navegación de tarjetas de configuración
  settingsCards.addEventListener('click', (e) => {
    const card = e.target.closest('.setting-card');
    if (!card) return;

    const url = card.dataset.url;
    settingsCards.style.display = 'none';
    iframe.src = url;
    iframe.style.display = 'block';
  });
});