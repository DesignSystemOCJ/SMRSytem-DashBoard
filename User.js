const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
let cuentaTemporalAEditar = null;

// Accordion handler function
function toggleAccordion(elementId) {
  const container = document.getElementById(elementId);
  container.classList.toggle('active');
}

// Password visualization
const toggleIcon = document.getElementById("toggleUserPassword");
const passwordInput = document.getElementById("inputPassword");
if (toggleIcon) {
  toggleIcon.addEventListener("mouseenter", () => { passwordInput.type = "text"; toggleIcon.style.color = "var(--primary-red)"; });
  toggleIcon.addEventListener("mouseleave", () => { passwordInput.type = "password"; toggleIcon.style.color = "var(--text-muted)"; });
}

const toggleEditIcon = document.getElementById("toggleEditPassword");
const editPasswordInput = document.getElementById("editPassword");
if (toggleEditIcon) {
  toggleEditIcon.addEventListener("mouseenter", () => { editPasswordInput.type = "text"; toggleEditIcon.style.color = "var(--primary-red)"; });
  toggleEditIcon.addEventListener("mouseleave", () => { editPasswordInput.type = "password"; toggleEditIcon.style.color = "var(--text-muted)"; });
}

function mostrarAlerta(mensaje, tipo) {
  const alertBox = document.getElementById("alertBox");
  alertBox.textContent = mensaje;
  alertBox.className = `alert-box ${tipo}`;
  alertBox.style.display = "flex";

  setTimeout(() => {
    alertBox.style.display = "none";
  }, 4000);
}

async function cargarCuentas() {
  const tbody = document.getElementById("accountsTableBody");
  
  const { data, error } = await supabaseClient
    .from("Cuentas")
    .select("id, Usurio, Password")
    .order("id", { ascending: false });

  if (error) {
    console.error("Error fetching accounts:", error);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--primary-red);">Error loading data</td></tr>`;
    return;
  }

  if (data && data.length > 0) {
    tbody.innerHTML = data.map(acc => {
      const username = acc.usurio || acc.Usurio || "";
      const password = acc.password || acc.Password || "";
      return `
        <tr>
          <td>#${acc.id}</td>
          <td><i class="fa-solid fa-user-shield" style="color: var(--primary-red); margin-right: 6px; font-size: 10px;"></i>${username}</td>
          <td>••••••••</td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
              <button type="button" class="btn-action btn-editar" data-id="${acc.id}" data-usuario="${username}" data-password="${password}" title="Edit">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button type="button" class="btn-action btn-eliminar" data-id="${acc.id}" style="color: #e74c3c;" title="Delete">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Assign events to edit buttons
    document.querySelectorAll('.btn-editar').forEach(button => {
      button.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        iniciarProcesoEdicion(
          parseInt(btn.getAttribute('data-id')),
          btn.getAttribute('data-usuario'),
          btn.getAttribute('data-password')
        );
      });
    });

    // Assign events to delete buttons
    document.querySelectorAll('.btn-eliminar').forEach(button => {
      button.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'));
        eliminarCuenta(id);
      });
    });

  } else {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No accounts registered yet.</td></tr>`;
  }
}

async function registrarUsuario(event) {
  event.preventDefault();
  const btn = document.getElementById("submitBtn");
  const usuarioVal = document.getElementById("inputUsuario").value.trim();
  const passwordVal = document.getElementById("inputPassword").value.trim();

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i> Saving...`;

  try {
    const { error } = await supabaseClient
      .from("Cuentas")
      .insert([{ Usurio: usuarioVal, Password: passwordVal }]);

    if (error) throw error;

    mostrarAlerta("Account successfully created in Supabase!", "success");
    document.getElementById("createAccountForm").reset();
    cargarCuentas();

  } catch (err) {
    console.error("Error registering:", err);
    mostrarAlerta("An error occurred: " + (err.message || "Could not save"), "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-floppy-disk" style="margin-right: 8px;"></i> Create an account`;
  }
}

async function eliminarCuenta(id) {
  if (!confirm("Are you sure you want to delete this account?")) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("Cuentas")
      .delete()
      .eq("id", id);

    if (error) throw error;

    mostrarAlerta("Account successfully deleted", "success");
    cargarCuentas();
  } catch (err) {
    console.error("Error deleting:", err);
    mostrarAlerta("Could not delete account: " + (err.message || ""), "error");
  }
}

function iniciarProcesoEdicion(id, usuario, password) {
  cuentaTemporalAEditar = { id, usuario, password };
  document.getElementById("inputAdminPass").value = "";
  document.getElementById("adminAuthModal").style.display = "flex";
}

function cerrarModalAdmin() {
  document.getElementById("adminAuthModal").style.display = "none";
}

async function verificarAdmin(event) {
  event.preventDefault();
  const passIngresada = document.getElementById("inputAdminPass").value.trim();
  const btnVerificar = document.getElementById("btnVerificarAdmin");

  btnVerificar.disabled = true;
  btnVerificar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying...`;

  try {
    const { data, error } = await supabaseClient
      .from("Cuentas")
      .select("id, Usurio, Password");

    if (error) throw error;

    if (!data || data.length === 0) {
      alert("There are no records in the Accounts table.");
      return;
    }

    const adminRecord = data.find(acc => {
      const userVal = acc.Usurio || acc.usurio || "";
      return userVal.trim().toLowerCase() === "admin";
    });

    if (!adminRecord) {
      alert("No user with the name 'admin' was found in the table.");
      return;
    }

    const passReal = adminRecord.Password || adminRecord.password || "";

    if (passIngresada === passReal.trim()) {
      if (!cuentaTemporalAEditar) {
        alert("Error: No account selected for editing. Please try again.");
        cerrarModalAdmin();
        return;
      }

      cerrarModalAdmin();
      document.getElementById("editId").value = cuentaTemporalAEditar.id;
      document.getElementById("editUsuario").value = cuentaTemporalAEditar.usuario;
      document.getElementById("editPassword").value = cuentaTemporalAEditar.password;
      document.getElementById("editAccountModal").style.display = "flex";
    } else {
      alert("Incorrect administrator password.");
    }
  } catch (err) {
    console.error("Detailed error:", err);
    alert("Supabase Error: " + (err.message || "Check permissions or connection"));
  } finally {
    btnVerificar.disabled = false;
    btnVerificar.innerHTML = "Verify";
  }
}

function cerrarModalEdicion() {
  document.getElementById("editAccountModal").style.display = "none";
  cuentaTemporalAEditar = null;
}

async function guardarEdicion(event) {
  event.preventDefault();
  const btn = document.getElementById("updateBtn");
  
  const idVal = document.getElementById("editId").value;
  const nuevoUsuario = document.getElementById("editUsuario").value.trim();
  const nuevoPassword = document.getElementById("editPassword").value.trim();

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right: 6px;"></i> Updating...`;

  try {
    const { error } = await supabaseClient
      .from("Cuentas")
      .update({ Usurio: nuevoUsuario, Password: nuevoPassword })
      .eq("id", idVal);

    if (error) throw error;

    mostrarAlerta("Account successfully updated!", "success");
    cerrarModalEdicion();
    cargarCuentas();
  } catch (err) {
    console.error("Error updating:", err);
    mostrarAlerta("Error updating: " + (err.message || "Unknown"), "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-floppy-disk" style="margin-right: 6px;"></i> Verify`;
  }
}

// DOM content loaded event listeners setup
document.addEventListener("DOMContentLoaded", () => {
  cargarCuentas();

  // Accordions
  document.getElementById("headerRegister").addEventListener("click", () => toggleAccordion('cardRegister'));
  document.getElementById("headerTable").addEventListener("click", () => toggleAccordion('cardTable'));

  // Forms
  document.getElementById("createAccountForm").addEventListener("submit", registrarUsuario);
  document.getElementById("adminAuthForm").addEventListener("submit", verificarAdmin);
  document.getElementById("editAccountForm").addEventListener("submit", guardarEdicion);

  // Modal cancel buttons
  document.getElementById("cancelAdminBtn").addEventListener("click", cerrarModalAdmin);
  document.getElementById("cancelEditBtn").addEventListener("click", cerrarModalEdicion);
});