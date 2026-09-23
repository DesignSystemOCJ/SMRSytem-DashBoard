// --- BLOQUEO DE INSPECCIÓN, CLIC DERECHO, COPIA Y PRINT SCREEN ---

// 1. Deshabilitar Clic Derecho
document.addEventListener("contextmenu", (e) => e.preventDefault());

// 2. Deshabilitar atajos de teclado para Inspeccionar, Ver Código Fuente y Capturas
document.addEventListener("keydown", (e) => {
  // F12
  if (e.key === "F12") {
    e.preventDefault();
    return false;
  }
  // Ctrl+Shift+I / Cmd+Option+I (Inspeccionar)
  // Ctrl+Shift+J / Cmd+Option+J (Consola)
  // Ctrl+Shift+C (Elemento)
  // Ctrl+U / Cmd+U (Ver Código Fuente)
  if (
    (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
    (e.ctrlKey && (e.key === "U" || e.key === "u")) ||
    (e.metaKey && e.altKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j")) ||
    (e.metaKey && (e.key === "U" || e.key === "u"))
  ) {
    e.preventDefault();
    return false;
  }

  // Bloquear o limpiar portapapeles si presionan PrintScreen (Impr Pant)
  if (e.key === "PrintScreen") {
    e.preventDefault();
    navigator.clipboard.writeText(""); // Vacía el portapapeles
    alert("La captura de pantalla está desactivada en este sistema.");
    return false;
  }
});

// 3. Mitigación extra para PrintScreen: Borrar portapapeles si detecta intento o pérdida de foco
window.addEventListener("keyup", (e) => {
  if (e.key === "PrintScreen") {
    navigator.clipboard.writeText("");
  }
});

// Opcional: Difuminar la pantalla si el usuario intenta cambiar de ventana (evita recortes rápidos con Snipping Tool)
window.addEventListener("blur", () => {
  document.body.classList.add("blurred");
});
window.addEventListener("focus", () => {
  document.body.classList.remove("blurred");
});

// --- FIN DEL BLOQUEO DE SEGURIDAD ---


const SUPABASE_URL = "https://mrxtqmvufmlozplszfxc.supabase.co";
const SUPABASE_KEY = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allEmployees = [];

// Definición centralizada de opciones para evitar duplicar código HTML
const POSITION_OPTIONS = ["Operador", "Setup-Man A", "Setup-Man B", "Setup-Man C", "Setup Leader", "Engineer", "Supervisor"];
const SHIFT_OPTIONS = ["A", "B", "C", "D", "17", "03", "L-V"];

document.addEventListener("DOMContentLoaded", () => {
  populateFormSelects();
  fetchEmployees();
});

// Llena los selectores del formulario principal dinámicamente desde JS
function populateFormSelects() {
  const posSelect = document.getElementById("empPosition");
  if (posSelect) {
    posSelect.innerHTML = `<option value="" disabled selected>Select</option>` + 
      POSITION_OPTIONS.map(pos => `<option value="${pos}">${pos === 'Operador' ? 'Operator' : pos}</option>`).join('');
  }

  const shiftSelect = document.getElementById("empShift");
  if (shiftSelect) {
    shiftSelect.innerHTML = `<option value="" disabled selected>Select</option>` + 
      SHIFT_OPTIONS.map(shift => `<option value="${shift}">${shift === 'L-V' ? 'M-F' : shift}</option>`).join('');
  }
}

async function fetchEmployees() {
  const tbody = document.getElementById("employeeTableBody");
  try {
    const { data, error } = await supabaseClient
      .from("Empleados")
      .select("*")
      .order("id", { ascending: false });

    if (error) throw error;

    allEmployees = data || [];
    renderTable(allEmployees);
  } catch (err) {
    console.error("Error loading:", err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--primary-red);">Error connecting to database: ${err.message || 'Check console (F12)'}</td></tr>`;
  }
}

function getPositionOptions(currentValue) {
  return POSITION_OPTIONS.map(pos => `<option value="${pos}" ${pos === currentValue ? 'selected' : ''}>${pos === 'Operador' ? 'Operator' : pos}</option>`).join('');
}

function getShiftOptions(currentValue) {
  return SHIFT_OPTIONS.map(shift => `<option value="${shift}" ${shift === currentValue ? 'selected' : ''}>${shift === 'L-V' ? 'M-F' : shift}</option>`).join('');
}

function renderTable(data) {
  const tbody = document.getElementById("employeeTableBody");
  document.getElementById("totalCount").textContent = `${data.length} Records`;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No registered employees found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(emp => `
    <tr id="row-${emp.id}">
      <td style="color: var(--text-muted); font-weight: 600;">${emp.id}</td>
      <td>
        <span class="view-mode">${escapeHtml(emp.Empleado || '')}</span>
        <input type="text" class="table-input edit-mode" value="${escapeHtml(emp.Empleado || '')}" style="display:none;" />
      </td>
      <td>
        <span class="view-mode">${escapeHtml(emp.Nombre || '')}</span>
        <input type="text" class="table-input edit-mode" value="${escapeHtml(emp.Nombre || '')}" style="display:none;" />
      </td>
      <td>
        <span class="view-mode">${escapeHtml(emp.Puesto === 'Operador' ? 'Operator' : (emp.Puesto || ''))}</span>
        <select class="table-input edit-mode" style="display:none;">
          ${getPositionOptions(emp.Puesto)}
        </select>
      </td>
      <td>
        <span class="view-mode" style="font-weight:600; color:var(--text-secondary);">${escapeHtml(emp.Departamento || '')}</span>
        <input type="text" class="table-input edit-mode" value="${escapeHtml(emp.Departamento || '')}" style="display:none;" />
      </td>
      <td>
        <span class="view-mode">${escapeHtml(emp.Turno === 'L-V' ? 'M-F' : (emp.Turno || ''))}</span>
        <select class="table-input edit-mode" style="display:none;">
          ${getShiftOptions(emp.Turno)}
        </select>
      </td>
      <td style="text-align: center;" id="actions-${emp.id}">
        <button class="action-btn edit" title="Edit" onclick="toggleEdit(${emp.id}, true)">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="action-btn delete" title="Delete" onclick="deleteEmployee(${emp.id})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function toggleEdit(id, isEditing) {
  const row = document.getElementById(`row-${id}`);
  const actionsCell = document.getElementById(`actions-${id}`);
  const viewModes = row.querySelectorAll('.view-mode');
  const editModes = row.querySelectorAll('.edit-mode');

  if (isEditing) {
    viewModes.forEach(el => el.style.display = 'none');
    editModes.forEach(el => el.style.display = 'block');
    
    actionsCell.innerHTML = `
      <button class="action-btn save" title="Save" onclick="updateEmployee(${id})">
        <i class="fa-solid fa-check"></i>
      </button>
      <button class="action-btn cancel" title="Cancel" onclick="toggleEdit(${id}, false)">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
  } else {
    viewModes.forEach(el => el.style.display = 'block');
    editModes.forEach(el => el.style.display = 'none');

    actionsCell.innerHTML = `
      <button class="action-btn edit" title="Edit" onclick="toggleEdit(${id}, true)">
        <i class="fa-solid fa-pen-to-square"></i>
      </button>
      <button class="action-btn delete" title="Delete" onclick="deleteEmployee(${id})">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;
  }
}

async function updateEmployee(id) {
  const row = document.getElementById(`row-${id}`);
  const inputs = row.querySelectorAll('.edit-mode');

  const updatedData = {
    Empleado: inputs[0].value.trim(),
    Nombre: inputs[1].value.trim(),
    Puesto: inputs[2].value,
    Departamento: inputs[3].value.trim(),
    Turno: inputs[4].value
  };

  try {
    const { error } = await supabaseClient
      .from("Empleados")
      .update(updatedData)
      .eq("id", id);

    if (error) throw error;
    await fetchEmployees();
  } catch (err) {
    console.error("Error updating:", err);
    alert("Failed to update record: " + err.message);
  }
}

async function saveEmployee(e) {
  e.preventDefault();
  const btn = document.getElementById("submitBtn");
  
  const nuevoEmpleado = {
    Empleado: document.getElementById("empNumber").value.trim(),
    Nombre: document.getElementById("empName").value.trim(),
    Puesto: document.getElementById("empPosition").value,
    Departamento: "Rough Cut",
    Turno: document.getElementById("empShift").value
  };

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

  try {
    const { error } = await supabaseClient
      .from("Empleados")
      .insert([nuevoEmpleado]);

    if (error) throw error;

    document.getElementById("employeeForm").reset();
    await fetchEmployees();
  } catch (err) {
    console.error("Error saving:", err);
    alert("Failed to save record: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-check"></i> Save Employee`;
  }
}

async function deleteEmployee(id) {
  if (!confirm("Are you sure you want to delete this employee from the database?")) return;

  try {
    const { error } = await supabaseClient
      .from("Empleados")
      .delete()
      .eq("id", id);

    if (error) throw error;
    await fetchEmployees();
  } catch (err) {
    console.error("Error deleting:", err);
    alert("Error trying to delete the record.");
  }
}

function filterTable() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const filtered = allEmployees.filter(emp => 
    (emp.id && String(emp.id).toLowerCase().includes(query)) ||
    (emp.Empleado && emp.Empleado.toLowerCase().includes(query)) ||
    (emp.Nombre && emp.Nombre.toLowerCase().includes(query)) ||
    (emp.Puesto && emp.Puesto.toLowerCase().includes(query)) ||
    (emp.Departamento && emp.Departamento.toLowerCase().includes(query)) ||
    (emp.Turno && emp.Turno.toLowerCase().includes(query))
  );
  renderTable(filtered);
}

function clearFilter() {
  const searchInput = document.getElementById("searchInput");
  searchInput.value = "";
  renderTable(allEmployees);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}