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
DYNAMIC HTML INJECTION TO JS (Options Submenu)
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
        <div class="custom-option" onclick="openPresentationModal()">
            <i class="fa-solid fa-file-powerpoint" style="margin-right: 8px; color: #D97706;"></i>Presentation
        </div>
        <div class="custom-option" id="dataMenuOption" onclick="handleDataClick()" style="opacity: 0.5; pointer-events: none; cursor: not-allowed;">
            <i class="fa-solid fa-database" style="margin-right: 8px; color: #2563EB;"></i>Data
        </div>
    `;
}

/* =========================================================
PRESENTATION STORAGE MODAL & FILES LISTING
========================================================= */

async function openPresentationModal() {
    const modal = document.getElementById("presentationModal");
    if (modal) modal.style.display = "flex";
    await loadPresentationFiles();
}

function closePresentationModal() {
    const modal = document.getElementById("presentationModal");
    if (modal) modal.style.display = "none";
}

async function loadPresentationFiles() {
    const container = document.getElementById("presentationFilesContainer");
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #64748B;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
            <p>Loading files from Supabase Storage...</p>
        </div>
    `;

    try {
        const { data, error } = await supabaseClient.storage.from('Presentation').list('', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' }
        });

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94A3B8;">
                    <i class="fa-solid fa-folder-open" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                    No files found in the Presentation storage.
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px;">
                ${data.map(file => {
                    const { data: publicUrlData } = supabaseClient.storage.from('Presentation').getPublicUrl(file.name);
                    const fileUrl = publicUrlData ? publicUrlData.publicUrl : '#';
                    
                    return `
                        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; transition: all 0.2s ease;">
                            <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                                <i class="fa-solid fa-file-lines" style="font-size: 20px; color: var(--primary); flex-shrink: 0;"></i>
                                <span style="font-size: 13px; font-weight: 700; color: #1E293B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${file.name}">${file.name}</span>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <a href="${fileUrl}" target="_blank" style="flex: 1; text-align: center; padding: 8px; background: #EFF6FF; color: var(--primary); border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none;">
                                    <i class="fa-solid fa-eye"></i> View
                                </a>
                                <a href="${fileUrl}" download style="flex: 1; text-align: center; padding: 8px; background: #F1F5F9; color: #475569; border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none;">
                                    <i class="fa-solid fa-download"></i> Download
                                </a>
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;

    } catch (err) {
        console.error("Error loading presentation files:", err);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #EF4444;">
                <i class="fa-solid fa-circle-exclamation" style="font-size: 24px; margin-bottom: 10px;"></i>
                <p>Error loading files from storage. Make sure the bucket 'Presentation' is public.</p>
            </div>
        `;
    }
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
DATA MODAL
========================================================= */

function handleDataClick() {
    if (sessionActiveUser) {
        const modal = document.getElementById("dataModal");
        const iframe = document.getElementById("dataIframe");
        if (iframe) iframe.src = "uploaddata.html?select=projects"; 
        if (modal) modal.style.display = "flex";
    } else {
        alert('You must log in to access this option.');
    }
}

function closeDataModal() {
    const modal = document.getElementById("dataModal");
    const iframe = document.getElementById("dataIframe");
    if (modal) modal.style.display = "none";
    if (iframe) iframe.src = ""; 
}

/* =========================================================
NEW PROJECT MODAL FORM
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
        Approved: null,
        Progress: 0,
        is_active: true
    };

    const { data, error } = await supabaseClient
        .from("Projects")
        .insert([newProjectPayload])
        .select();

    if (error) {
        alert("Error saving project to Supabase: " + error.message);
        return;
    }

    alert(`Project successfully saved with Folio: ${generatedFolio}!`);
    
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
    const presentationModal = document.getElementById("presentationModal");
    const customConfirmModal = document.getElementById("customConfirmModal");
    const userDropdown = document.getElementById("userDropdown");
    const avatarContainer = document.querySelector(".user-menu-container");

    if (event.target === modal) closeRecordsModal();
    if (event.target === loginModal) closeLoginModal();
    if (event.target === dataModal) closeDataModal();
    if (event.target === presentationModal) closePresentationModal();
    if (event.target === customConfirmModal) closeCustomConfirm(false);

    if (userDropdown && avatarContainer && !avatarContainer.contains(event.target)) {
        userDropdown.style.display = "none";
    }
});

/* =========================================================
LOAD MAINTENANCE DATA (PROJECTS) - ORDENADO POR FOLIO ASCENDENTE
========================================================= */

async function loadMaintenance() {
    const { data: allData, error } = await fetchAllSupabaseData(query => 
        query.select("*").order('Folio', { ascending: true })
    );

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
HELPER: GET CSS CLASS BY STATUS
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

    const allowedStatuses = ["new", "under review", "in process", "canceled", "cancelled"];

    const filteredData = data.filter(project => {
        const status = project.Status ? String(project.Status).toLowerCase().trim() : "";
        return allowedStatuses.some(allowed => status.includes(allowed));
    });

    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:40px; color: #94A3B8;">No projects found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredData.map(project => {
        const progressNum = parseFloat(project.Progress) || 0;
        const statusText = project.Status || '--';
        const statusClass = getStatusClass(statusText);
        
        const hue = Math.round((progressNum / 100) * 120);
        const progressColor = `hsl(${hue}, 85%, 45%)`;
        
        const approvedVal = project.Approved ? String(project.Approved).trim() : "";
        let approvalCellContent = "";

        if (approvedVal.toLowerCase() === 'yes') {
            approvalCellContent = `
                <div class="approve-indicator yes" title="Approved (Yes) - Click to change to No" onclick="updateProjectApproval(${project.id}, 'No')">
                    <i class="fa-solid fa-check"></i>
                </div>
            `;
        } else if (approvedVal.toLowerCase() === 'no') {
            approvalCellContent = `
                <div class="approve-indicator no" title="Not Approved (No) - Click to clear approval" onclick="updateProjectApproval(${project.id}, '')">
                    <i class="fa-solid fa-xmark"></i>
                </div>
            `;
        } else {
            approvalCellContent = `
                <select class="approval-select" onchange="updateProjectApproval(${project.id}, this.value)">
                    <option value="" selected disabled>Select...</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </select>
            `;
        }
        
        return `
            <tr id="project-row-${project.id}" data-id="${project.id}" ondblclick="openProjectDetail(${project.id})" style="cursor: pointer;" title="Double click to view details">
                <td style="font-weight: 700; color: #64748B;">#${project.id !== undefined && project.id !== null ? project.id : '--'}</td>
                <td style="color: var(--primary); font-weight: normal;">${project.Folio || '--'}</td>
                <td style="color: var(--text); font-weight: normal;">${project.ProjectName || '--'}</td>
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
                            <span>Progress</span>
                            <span style="font-weight: 800; color: var(--text);">${progressNum}%</span>
                        </div>
                        <div class="progress-container">
                            <div class="progress-fill" style="width: ${progressNum}%; background-color: ${progressColor};"></div>
                        </div>
                    </div>
                </td>
                <td onclick="event.stopPropagation();">
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" title="Edit Status" onclick="enableProjectEdit(${project.id})">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="action-btn save-btn" title="Save Changes" style="display: none;" onclick="saveProjectStatus(${project.id})">
                            <i class="fa-solid fa-floppy-disk"></i>
                        </button>
                        <button class="action-btn cancel-btn" title="Cancel" style="display: none;" onclick="cancelProjectEdit(${project.id})">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

/* =========================================================
APPROVED AND STATUS UPDATE LOGIC IN SUPABASE
========================================================= */

async function updateProjectApproval(id, newValue) {
    try {
        let updateData = { Approved: newValue || null };

        const cleanVal = newValue ? newValue.toLowerCase().trim() : "";
        
        if (cleanVal === 'yes') {
            updateData.Status = "In Process";
        } else if (cleanVal === 'no') {
            updateData.Status = "Canceled";
        } else {
            updateData.Status = "New";
        }

        const { error } = await supabaseClient
            .from("Projects")
            .update(updateData)
            .eq("id", id);

        if (error) {
            alert("Error updating approval in Supabase: " + error.message);
            return;
        }

        const pIndex = globalProjectsData.findIndex(p => p.id == id);
        if (pIndex !== -1) {
            globalProjectsData[pIndex].Approved = updateData.Approved;
            globalProjectsData[pIndex].Status = updateData.Status;
        }

        const mIndex = maintenanceData.findIndex(p => p.id == id);
        if (mIndex !== -1) {
            maintenanceData[mIndex].Approved = updateData.Approved;
            maintenanceData[mIndex].Status = updateData.Status;
        }

        filterProjects();
        calculateKPIs();

    } catch (err) {
        console.error("Unexpected error updating approval:", err);
        alert("An error occurred while updating approval.");
    }
}

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
OPEN PROJECT DETAIL
========================================================= */

function openProjectDetail(id) {
    window.location.href = `Project_Detail.html?id=${id}`;
}

/* =========================================================
STATUS EDIT AND SAVE FUNCTIONS
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
        alert("Error updating status in Supabase: " + error.message);
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

    alert("Status successfully updated and saved!");
    
    filterProjects();
    calculateKPIs();
}

/* =========================================================
SEARCH & FILTERS FOR PROJECTS TABLE
========================================================= */

function filterProjects() {
    const searchText = document.getElementById("projectSearchInput").value.toLowerCase();
    const allowedStatuses = ["new", "under review", "in process", "canceled", "cancelled"];

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

        if (status.includes("new")) openTotal++;
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
            const completionRatio = (closedTotal + onHoldTotal + openTotal) / totalProjects;
            avgCompletionElem.innerText = (completionRatio * 100).toFixed(2) + "%";
        } else {
            avgCompletionElem.innerText = "0.00%";
        }
    }
}

/* =========================================================
SESSION, AVATAR AND LOGIN MODAL CONTROL
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
            statusText.textContent = userName || "Active Session";
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
            statusText.textContent = "NO LOG IN";
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
            alert("Error verifying credentials: " + error.message);
            return;
        }

        if (data && data.length > 0) {
            closeLoginModal();
            setProtectedElementsState(true, userInput);
            document.getElementById("loginUser").value = "";
            document.getElementById("loginPassword").value = "";
        } else {
            alert("Incorrect user or password.");
        }
    } catch (err) {
        console.error("Unexpected error:", err);
        alert("An error occurred while attempting to log in.");
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
// PAGE PROTECTION
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