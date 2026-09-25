const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

/* =========================================================
GLOBAL STATE
========================================================= */

let maintenanceData = [];
let globalProjectsData = [];
let activeCharts = {};
let selectedMachine = null;
let modalRawData = [];
let pendingApprovalId = null;
let pendingCircleElement = null;

/* =========================================================
HELPER: SUPABASE PAGINATED FETCH
========================================================= */

async function fetchAllSupabaseData(queryBuilderFn) {
    let allData = [];
    const pageSize = 1000;
    let from = 0;
    let moreData = true;

    try {
        while (moreData) {
            let query = queryBuilderFn(supabaseClient.from("Projects")).range(from, from + pageSize - 1);
            const { data, error } = await query;

            if (error) throw error;

            if (data && data.length > 0) {
                allData = allData.concat(data);
                from += pageSize;
            } else {
                moreData = false;
            }
        }
        return { data: allData, error: null };
    } catch (error) {
        console.error("Supabase fetch error:", error);
        return { data: null, error };
    }
}

/* =========================================================
INYECCIÓN DINÁMICA DE HTML A JS (Submenú de Opciones)
========================================================= */

function renderDynamicDropdown() {
    const dropdownContainer = document.getElementById("dynamicNavDropdown");
    if (!dropdownContainer) return;

    dropdownContainer.innerHTML = `
        <div class="dropdown-submenu-container">
            <div class="custom-option has-nested">
                <span><i class="fa-solid fa-share-nodes" style="margin-right: 8px; color: #64748B;"></i>Share</span>
                <i class="fa-solid fa-chevron-right" style="font-size: 9px;"></i>
            </div>
            <div class="nested-dropdown">
                <div class="custom-option" onclick="alert('Exporting to XLS...')">
                    <i class="fa-solid fa-file-excel" style="margin-right: 8px; color: #107C41;"></i>Share to xls
                </div>
                <div class="custom-option" onclick="alert('Exporting to PDF...')">
                    <i class="fa-solid fa-file-pdf" style="margin-right: 8px; color: #E53E3E;"></i>Share to pdf
                </div>
            </div>
        </div>
        <div class="custom-option" id="dataMenuOption" onclick="handleDataClick()" style="opacity: 0.5; pointer-events: none; cursor: not-allowed;">
            <i class="fa-solid fa-database" style="margin-right: 8px; color: #2563EB;"></i>Data
        </div>
    `;
}

/* =========================================================
CELL FILTER
========================================================= */

function populateModalCellFilter() {
    const cellSelect = document.getElementById("modalCellFilter");
    if (!cellSelect) return;

    cellSelect.innerHTML = '<option value="">All Cells</option>';
}

/* =========================================================
RECORD MODAL
========================================================= */

function openRecordsModal() {
    const modal = document.getElementById("recordsModal");
    if (modal) modal.style.display = "flex";

    populateModalCellFilter();
    loadModalRecords();
}

function closeRecordsModal() {
    const modal = document.getElementById("recordsModal");
    if (modal) modal.style.display = "none";
}

function clearCellFilter() {
    const cellFilter = document.getElementById("modalCellFilter");
    if (cellFilter) cellFilter.value = "";
    filterModalTable();
}

/* =========================================================
LOAD RECORDS
========================================================= */

async function loadModalRecords() {
    const tbody = document.getElementById("modalTableBody");
    const thead = document.getElementById("modalTableHeaders");
    const counter = document.getElementById("recordsCount");

    if (!tbody || !thead) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="100" class="loading-table">
                <div class="table-loader"></div>
                Loading records...
            </td>
        </tr>
    `;
    if (counter) counter.textContent = "Loading records...";

    const { data: allData, error } = await fetchAllSupabaseData(query => query.select("*"));

    if (error) {
        tbody.innerHTML = `
            <tr>
                <td colspan="100" style="text-align:center; padding:40px; color:#EF4444;">
                    <i class="fa-solid fa-circle-exclamation"></i> Error loading data from Supabase.
                </td>
            </tr>
        `;
        if (counter) counter.textContent = "Unable to load records";
        return;
    }

    modalRawData = allData || [];

    if (modalRawData.length === 0) {
        thead.innerHTML = "<th>No Data</th>";
        tbody.innerHTML = `
            <tr>
                <td style="text-align:center; padding:40px;">
                    <i class="fa-solid fa-database" style="font-size:25px; color:#CBD5E1; display:block; margin-bottom:10px;"></i>
                    No records found.
                </td>
            </tr>
        `;
        if (counter) counter.textContent = "0 records";
        return;
    }

    const targetKeys = [
        "id", "DateStart", "Folio", "ProjectName", "Type", "Priority", "Department", "DateEnd", "Status", "Lead Manager", "Progress", "Approved"
    ];

    thead.innerHTML = targetKeys.map(key => `<th>${key}</th>`).join("");

    filterModalTable();
}

/* =========================================================
FILTER RECORD TABLE
========================================================= */

function filterModalTable() {
    const tbody = document.getElementById("modalTableBody");
    const counter = document.getElementById("recordsCount");

    if (!tbody) return;

    const filtered = modalRawData;

    if (counter) counter.textContent = `${filtered.length.toLocaleString()} records`;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="100" style="text-align:center; padding:40px;">
                    No matching records found.
                </td>
            </tr>
        `;
        return;
    }

    const targetKeys = [
        "id", "DateStart", "Folio", "ProjectName", "Type", "Priority", "Department", "DateEnd", "Status", "Lead Manager", "Progress", "Approved"
    ];

    tbody.innerHTML = filtered.map(row => 
        `<tr>${targetKeys.map(key => `<td>${row[key] !== null && row[key] !== undefined ? row[key] : ""}</td>`).join("")}</tr>`
    ).join("");
}

/* =========================================================
MODAL DE DATA (uploaddata.html)
========================================================= */

function handleDataClick() {
    if (sessionActiveUser) {
        const modal = document.getElementById("dataModal");
        const iframe = document.getElementById("dataIframe");
        if (iframe) iframe.src = "uploaddata.html?select=projects"; 
        if (modal) modal.style.display = "flex";
    } else {
        alert('Debe iniciar sesión para acceder a esta opción.');
    }
}

function closeDataModal() {
    const modal = document.getElementById("dataModal");
    const iframe = document.getElementById("dataIframe");
    if (modal) modal.style.display = "none";
    if (iframe) iframe.src = ""; 
}

/* =========================================================
FORMULARIO MODAL BLOQUEANTE: NUEVO PROYECTO
========================================================= */

function openNewProjectFormUI() {
    const formSection = document.getElementById("newProjectFormContainer");
    if (formSection) formSection.style.display = "flex"; 

    const form = document.getElementById("createProjectForm");
    if (form) form.reset();
}

function closeNewProjectForm() {
    const formSection = document.getElementById("newProjectFormContainer");
    if (formSection) formSection.style.display = "none";
}

async function submitNewProject(event) {
    event.preventDefault();

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const { count, error: countError } = await supabaseClient
        .from("Projects")
        .select("*", { count: 'exact', head: true });

    const nextIdNumber = (count !== null && !countError ? count + 1 : 1);
    const consecutive = String(nextIdNumber).padStart(4, '0');
    const generatedFolio = `PRJ-${year}-${month}-${consecutive}`;

    const currentDate = now.toISOString().split('T')[0];

    const newProjectPayload = {
        Folio: generatedFolio,
        DateStart: currentDate,
        Department: "Rough Cut",
        ProjectName: document.getElementById("formProjectName").value.trim(),
        Type: document.getElementById("formType").value,
        ProblemDescription: document.getElementById("formProblemDescription").value.trim(),
        EvidenceBefore: null,
        EvidenceAfter: null,
        Status: "New",
        Lead: document.getElementById("formLead").value,
        Manager: "Ernesto Guerrero",
        Approved: null, // Inicia vacío
        Progress: 0,
        is_active: true
    };

    const { data, error } = await supabaseClient
        .from("Projects")
        .insert([newProjectPayload])
        .select();

    if (error) {
        alert("Error al guardar el proyecto en Supabase: " + error.message);
        return;
    }

    alert(`¡Proyecto guardado exitosamente con Folio: ${generatedFolio}!`);
    
    closeNewProjectForm();
    loadMaintenance();
}

/* =========================================================
WINDOW EVENTS
========================================================= */

window.addEventListener("click", function(event) {
    const modal = document.getElementById("recordsModal");
    const loginModal = document.getElementById("loginModal");
    const dataModal = document.getElementById("dataModal");
    const customConfirmModal = document.getElementById("customConfirmModal");
    const userDropdown = document.getElementById("userDropdown");
    const avatarContainer = document.querySelector(".user-menu-container");

    if (event.target === modal) closeRecordsModal();
    if (event.target === loginModal) closeLoginModal();
    if (event.target === dataModal) closeDataModal();
    if (event.target === customConfirmModal) closeCustomConfirm(false);

    if (userDropdown && avatarContainer && !avatarContainer.contains(event.target)) {
        userDropdown.style.display = "none";
    }
});

/* =========================================================
LOAD MAINTENANCE DATA (PROJECTS)
========================================================= */

async function loadMaintenance() {
    const { data: allData, error } = await fetchAllSupabaseData(query => query.select("*"));

    if (error) {
        alert("Error loading Supabase data.");
        return;
    }

    maintenanceData = allData || [];
    globalProjectsData = allData || [];

    renderProjectsTable(globalProjectsData);
    calculateKPIs();
}

/* =========================================================
HELPER: OBTENER CLASE CSS SEGÚN EL STATUS
========================================================= */
function getStatusClass(status) {
    if (!status) return "";
    const cleanStatus = status.toLowerCase().trim();

    if (cleanStatus === "new") return "status-new";
    if (cleanStatus === "under review") return "status-under-review";
    if (cleanStatus === "in process") return "status-in-process";
    if (cleanStatus === "on hold") return "status-on-hold";
    if (cleanStatus === "completed") return "status-completed";
    if (cleanStatus === "closed") return "status-closed";
    if (cleanStatus === "canceled" || cleanStatus === "cancelled") return "status-canceled";

    return "";
}

/* =========================================================
RENDER PROJECTS TABLE
========================================================= */

function renderProjectsTable(data) {
    const tbody = document.getElementById("projectsTableBody");
    if (!tbody) return;

    const allowedStatuses = ["new", "under review", "in process"];

    const filteredData = data.filter(project => {
        const status = project.Status ? String(project.Status).toLowerCase().trim() : "";
        return allowedStatuses.some(allowed => status.includes(allowed));
    });

    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:40px; color: #94A3B8;">No se encontraron proyectos.</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredData.map(project => {
        const progressNum = parseFloat(project.Progress) || 0;
        const statusText = project.Status || '--';
        const statusClass = getStatusClass(statusText);
        
        // Lógica de aprobación: 'Yes', 'No' o Vacío (null, undefined, "")
        const approvedVal = project.Approved ? String(project.Approved).trim() : "";
        let approvalCellContent = "";

        if (approvedVal.toLowerCase() === 'yes') {
            approvalCellContent = `
                <div class="approve-indicator yes" title="Aprobado (Yes) - Clic para cambiar a No" onclick="updateProjectApproval(${project.id}, 'No')">
                    <i class="fa-solid fa-check"></i>
                </div>
            `;
        } else if (approvedVal.toLowerCase() === 'no') {
            approvalCellContent = `
                <div class="approve-indicator no" title="No Aprobado (No) - Clic para cambiar a Yes" onclick="updateProjectApproval(${project.id}, 'Yes')">
                    <i class="fa-solid fa-xmark"></i>
                </div>
            `;
        } else {
            approvalCellContent = `
                <select class="approval-select" onchange="updateProjectApproval(${project.id}, this.value)">
                    <option value="" selected disabled>Seleccionar...</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </select>
            `;
        }
        
        return `
            <tr id="project-row-${project.id}" data-id="${project.id}" ondblclick="openProjectDetail(${project.id})" style="cursor: pointer;" title="Doble clic para ver detalles">
                <td style="font-weight: 700; color: #64748B;">#${project.id !== undefined && project.id !== null ? project.id : '--'}</td>
                <td style="color: var(--primary); font-weight: 800;">${project.Folio || '--'}</td>
                <td style="font-weight: 700; color: #0F172A;">${project.ProjectName || '--'}</td>
                <td>${project.Type || '--'}</td>
                <td style="color: #64748B;">${project.DateStart || '--'}</td>
                <td class="status-cell">
                    <span class="panel-badge ${statusClass} status-display">
                        ${statusText}
                    </span>
                    <select class="status-select" style="display: none;" data-original="${statusText}">
                        <option value="New" ${statusText.toLowerCase() === 'new' ? 'selected' : ''}>New</option>
                        <option value="Under Review" ${statusText.toLowerCase() === 'under review' ? 'selected' : ''}>Under Review</option>
                        <option value="In Process" ${statusText.toLowerCase() === 'in process' ? 'selected' : ''}>In Process</option>
                        <option value="On Hold" ${statusText.toLowerCase() === 'on hold' ? 'selected' : ''}>On Hold</option>
                        <option value="Completed" ${statusText.toLowerCase() === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="Closed" ${statusText.toLowerCase() === 'closed' ? 'selected' : ''}>Closed</option>
                        <option value="Canceled" ${statusText.toLowerCase() === 'canceled' || statusText.toLowerCase() === 'cancelled' ? 'selected' : ''}>Canceled</option>
                    </select>
                </td>
                <td>${project.Manager || '--'}</td>
                
                <td style="text-align: center;" onclick="event.stopPropagation();">
                    ${approvalCellContent}
                </td>

                <td>
                    <div class="progress-wrapper-cell">
                        <div class="progress-header-info">
                            <span>Progreso</span>
                            <span style="font-weight: 800; color: var(--text);">${progressNum}%</span>
                        </div>
                        <div class="progress-container">
                            <div class="progress-fill" style="width: ${progressNum}%;"></div>
                        </div>
                    </div>
                </td>
                <td onclick="event.stopPropagation();">
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" title="Editar Status" onclick="enableProjectEdit(${project.id})">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="action-btn save-btn" title="Guardar Cambios" style="display: none;" onclick="saveProjectStatus(${project.id})">
                            <i class="fa-solid fa-floppy-disk"></i>
                        </button>
                        <button class="action-btn cancel-btn" title="Cancelar" style="display: none;" onclick="cancelProjectEdit(${project.id})">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

/* =========================================================
LÓGICA DE ACTUALIZACIÓN DE APPROVED EN SUPABASE
========================================================= */

async function updateProjectApproval(id, newValue) {
    try {
        const { error } = await supabaseClient
            .from("Projects")
            .update({ Approved: newValue })
            .eq("id", id);

        if (error) {
            alert("Error al actualizar la aprobación en Supabase: " + error.message);
            return;
        }

        // Actualizar en memoria local
        const pIndex = globalProjectsData.findIndex(p => p.id == id);
        if (pIndex !== -1) globalProjectsData[pIndex].Approved = newValue;

        const mIndex = maintenanceData.findIndex(p => p.id == id);
        if (mIndex !== -1) maintenanceData[mIndex].Approved = newValue;

        filterProjects();
    } catch (err) {
        console.error("Error inesperado al actualizar aprobación:", err);
        alert("Ocurrió un error al actualizar la aprobación.");
    }
}

// Nota: Conservada por compatibilidad por si se invoca desde otra parte de tu sistema
function handleCircleApprovalClick(id, element) {
    updateProjectApproval(id, 'Yes');
}

async function closeCustomConfirm(isConfirmed) {
    const modal = document.getElementById("customConfirmModal");
    if (modal) modal.style.display = "none";
    pendingApprovalId = null;
    pendingCircleElement = null;
}

/* =========================================================
ABRIR DETALLES DEL PROYECTO
========================================================= */

function openProjectDetail(id) {
    window.location.href = `Project_Detail.html?id=${id}`;
}

/* =========================================================
FUNCIONES DE EDICIÓN Y GUARDADO DE STATUS
========================================================= */

function enableProjectEdit(id) {
    const row = document.getElementById(`project-row-${id}`);
    if (!row) return;

    const statusDisplay = row.querySelector('.status-display');
    const statusSelect = row.querySelector('.status-select');
    const editBtn = row.querySelector('.edit-btn');
    const saveBtn = row.querySelector('.save-btn');
    const cancelBtn = row.querySelector('.cancel-btn');

    if (statusDisplay) statusDisplay.style.display = 'none';
    if (statusSelect) statusSelect.style.display = 'inline-block';
    if (editBtn) editBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'inline-flex';
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
}

function cancelProjectEdit(id) {
    const row = document.getElementById(`project-row-${id}`);
    if (!row) return;

    const statusDisplay = row.querySelector('.status-display');
    const statusSelect = row.querySelector('.status-select');
    const editBtn = row.querySelector('.edit-btn');
    const saveBtn = row.querySelector('.save-btn');
    const cancelBtn = row.querySelector('.cancel-btn');

    if (statusSelect) {
        statusSelect.value = statusSelect.getAttribute('data-original');
    }

    if (statusDisplay) statusDisplay.style.display = 'inline-block';
    if (statusSelect) statusSelect.style.display = 'none';
    if (editBtn) editBtn.style.display = 'inline-flex';
    if (saveBtn) saveBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
}

async function saveProjectStatus(id) {
    const row = document.getElementById(`project-row-${id}`);
    if (!row) return;

    const statusSelect = row.querySelector('.status-select');
    if (!statusSelect) return;

    const newStatus = statusSelect.value;

    const { error } = await supabaseClient
        .from("Projects")
        .update({ Status: newStatus })
        .eq("id", id);

    if (error) {
        alert("Error al actualizar el estatus en Supabase: " + error.message);
        return;
    }

    const projectIndex = globalProjectsData.findIndex(p => p.id == id);
    if (projectIndex !== -1) {
        globalProjectsData[projectIndex].Status = newStatus;
    }

    const mainIndex = maintenanceData.findIndex(p => p.id == id);
    if (mainIndex !== -1) {
        maintenanceData[mainIndex].Status = newStatus;
    }

    alert("¡Estatus actualizado y guardado exitosamente!");
    
    filterProjects();
    calculateKPIs();
}

/* =========================================================
SEARCH & FILTERS FOR PROJECTS TABLE
========================================================= */

function filterProjects() {
    const searchText = document.getElementById("projectSearchInput").value.toLowerCase();
    const allowedStatuses = ["new", "under review", "in process"];

    const filteredData = globalProjectsData.filter(project => {
        const status = project.Status ? String(project.Status).toLowerCase().trim() : "";
        const matchesStatus = allowedStatuses.some(allowed => status.includes(allowed));
        if (!matchesStatus) return false;

        return Object.values(project).some(val => 
            String(val).toLowerCase().includes(searchText)
        );
    });

    renderProjectsTable(filteredData);
}

function clearProjectFilter() {
    document.getElementById("projectSearchInput").value = "";
    renderProjectsTable(globalProjectsData);
}

/* =========================================================
KPI CALCULATIONS
========================================================= */

function calculateKPIs() {
    const totalProjects = maintenanceData.filter(row => row.Folio !== null && row.Folio !== undefined && row.Folio !== "").length;
    const totalIssuesElem = document.getElementById("totalIssues");
    if (totalIssuesElem) totalIssuesElem.innerText = totalProjects.toLocaleString();

    let openTotal = 0;
    let inProcessTotal = 0;
    let closedTotal = 0;
    let onHoldTotal = 0;
    let cancelledTotal = 0;

    maintenanceData.forEach(row => {
        const status = row.Status ? String(row.Status).toLowerCase().trim() : "";

        if (status.includes("open")) openTotal++;
        if (status.includes("in process") || status.includes("en proceso")) inProcessTotal++;
        if (status.includes("closed")) closedTotal++;
        if (status.includes("hold")) onHoldTotal++;
        if (status.includes("cancel") || status.includes("cancelado")) cancelledTotal++;
    });

    const topCellElem = document.getElementById("topCell");
    if (topCellElem) topCellElem.innerText = openTotal.toLocaleString();

    const topIssueElem = document.getElementById("topIssue");
    if (topIssueElem) topIssueElem.innerText = inProcessTotal.toLocaleString();

    const topOperationElem = document.getElementById("topOperation");
    if (topOperationElem) topOperationElem.innerText = closedTotal.toLocaleString();

    const onHoldElem = document.getElementById("onHoldCount");
    if (onHoldElem) onHoldElem.innerText = onHoldTotal.toLocaleString();

    const cancelledElem = document.getElementById("cancelledCount");
    if (cancelledElem) cancelledElem.innerText = cancelledTotal.toLocaleString();

    const avgCompletionElem = document.getElementById("avgCompletion");
    if (avgCompletionElem) {
        if (totalProjects > 0) {
            const completionRatio = (closedTotal + onHoldTotal) / totalProjects;
            avgCompletionElem.innerText = (completionRatio * 100).toFixed(2) + "%";
        } else {
            avgCompletionElem.innerText = "0.00%";
        }
    }
}

/* =========================================================
CONTROL DE SESIÓN, AVATAR Y MODAL DE LOGIN
========================================================= */

function toggleUserDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById("userDropdown");
    if (dropdown) dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

let sessionActiveUser = null;

function setProtectedElementsState(isLoggedIn, userName = "") {
    const dataOption = document.getElementById("dataMenuOption");
    const loginBtn = document.getElementById("loginMenuBtn");
    const logoutBtn = document.getElementById("logoutMenuBtn");
    const statusText = document.getElementById("userStatusText");
    const avatarText = document.getElementById("userAvatarText");

    if (isLoggedIn) {
        sessionActiveUser = userName;
        if (dataOption) {
            dataOption.style.opacity = "1";
            dataOption.style.pointerEvents = "auto";
            dataOption.style.cursor = "pointer";
        }
        if (loginBtn) loginBtn.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "flex";
        if (statusText) {
            statusText.textContent = userName || "Sesión Activa";
            statusText.style.color = "#10B981";
        }
        if (avatarText && userName) avatarText.textContent = userName.substring(0, 2).toUpperCase();
    } else {
        sessionActiveUser = null;
        if (dataOption) {
            dataOption.style.opacity = "0.5";
            dataOption.style.pointerEvents = "none";
            dataOption.style.cursor = "not-allowed";
        }
        if (loginBtn) loginBtn.style.display = "flex";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (statusText) {
            statusText.textContent = "No Iniciada";
            statusText.style.color = "#EF4444";
        }
        if (avatarText) avatarText.textContent = "RC";
    }
}

function openLoginPrompt() {
    const dropdown = document.getElementById("userDropdown");
    if (dropdown) dropdown.style.display = "none";
    const loginModal = document.getElementById("loginModal");
    if (loginModal) loginModal.style.display = "flex";
}

function closeLoginModal() {
    const loginModal = document.getElementById("loginModal");
    if (loginModal) loginModal.style.display = "none";
}

async function handleFormLogin(event) {
    event.preventDefault();
    const userInput = document.getElementById("loginUser").value.trim();
    const passwordInput = document.getElementById("loginPassword").value.trim();

    try {
        const { data, error } = await supabaseClient
            .from("Cuentas")
            .select("*")
            .eq("Usurio", userInput)
            .eq("Password", passwordInput);

        if (error) {
            alert("Error al verificar credenciales: " + error.message);
            return;
        }

        if (data && data.length > 0) {
            closeLoginModal();
            setProtectedElementsState(true, userInput);
            document.getElementById("loginUser").value = "";
            document.getElementById("loginPassword").value = "";
        } else {
            alert("Usuario o contraseña incorrectos.");
        }
    } catch (err) {
        console.error("Error inesperado:", err);
        alert("Ocurrió un error al intentar iniciar sesión.");
    }
}

function handleSignOut() {
    setProtectedElementsState(false);
    const dropdown = document.getElementById("userDropdown");
    if (dropdown) dropdown.style.display = "none";
}

/* =========================================================
INITIALIZATION
========================================================= */

window.addEventListener("load", function() {
    renderDynamicDropdown();
    loadMaintenance();
    setProtectedElementsState(false);
});

// ================================
// PROTECCIÓN DE LA PÁGINA
// ================================

document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("selectstart", (e) => e.preventDefault());
document.addEventListener("copy", (e) => e.preventDefault());
document.addEventListener("cut", (e) => e.preventDefault());
document.addEventListener("dragstart", (e) => e.preventDefault());

document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.key === "F12") { e.preventDefault(); return; }
    if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) { e.preventDefault(); return; }
    if (e.ctrlKey && ["u", "c", "x", "s", "a"].includes(key)) { e.preventDefault(); return; }
});