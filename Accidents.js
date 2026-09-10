const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let maintenanceData = [];
let activeCharts = {};
let currentSelectedYear = "2026";
let currentSelectedMonth = "All";
let modalRawData = [];
let isUserLoggedIn = false; 
let sessionActiveUser = null;

const desiredModalColumns = ["id", "#Empl", "Name", "Description", "Position", "PartBody", "Depart", "Shift", "EPP", "Date", "Hour", "Type", "Status"];

const machines = [
"C01","C02","C03","C04","C05","C06","C07","C08","C09","C10",
"C11","C12","C13","C14","C15","C16","C17","C18","C19","C20",
"C21","C22","C23","C24","C25","C26","C27","C28","C29","C30",
"C33","C34","C35","C36"
];

const months = [
"January", "February", "March", "April", "May", "June",
"July", "August", "September", "October", "November", "December"
];

Chart.defaults.font.family = '"Segoe UI", Inter, Arial, sans-serif';
Chart.defaults.color = "#64748B";
Chart.defaults.animation.duration = 800;

async function fetchAllSupabaseData(queryBuilderFn) {
    let allData = [];
    const pageSize = 1000;
    let from = 0;
    let moreData = true;

    try {
        while (moreData) {
            let query = queryBuilderFn(supabaseClient.from("Accidentes")).range(from, from + pageSize - 1);
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

function setCurrentYear() {
    const currentYearNum = new Date().getFullYear();
    currentSelectedYear = currentYearNum.toString();

    const yearTextElement = document.getElementById("selectedYearText");
    if (yearTextElement) yearTextElement.innerText = currentSelectedYear;

    const modalSelect = document.getElementById("modalYearFilter");
    if (modalSelect) modalSelect.value = currentSelectedYear;

    document.querySelectorAll(".custom-option").forEach(option => {
        if (option.innerText.trim() === currentSelectedYear) {
            option.classList.add("selected");
        }
    });

    populateModalCellFilter();
    loadMaintenance();
}

function populateModalCellFilter() {
    const cellSelect = document.getElementById("modalCellFilter");
    if (!cellSelect) return;

    cellSelect.innerHTML = '<option value="">All Cells</option>';
    machines.forEach(machine => {
        const option = document.createElement("option");
        option.value = machine;
        option.textContent = machine;
        cellSelect.appendChild(option);
    });
}

function openRecordsModal() {
    const modal = document.getElementById("recordsModal");
    if (modal) modal.style.display = "flex";

    const modalYearFilter = document.getElementById("modalYearFilter");
    if (modalYearFilter) modalYearFilter.value = currentSelectedYear;

    loadModalRecords();
}

function closeRecordsModal() {
    const modal = document.getElementById("recordsModal");
    if (modal) modal.style.display = "none";
}

function openAccidentModal() {
    if (sessionActiveUser || localStorage.getItem("smrc_logged_user")) {
        const modal = document.getElementById("accidentModal");
        if (modal) modal.style.display = "flex";
    } else {
        alert('Debe iniciar sesión para acceder a esta opción.');
    }
}

function closeAccidentModal() {
    const modal = document.getElementById("accidentModal");
    if (modal) modal.style.display = "none";
}

function clearCellFilter() {
    const cellFilter = document.getElementById("modalCellFilter");
    if (cellFilter) cellFilter.value = "";
    filterModalTable();
}

async function loadModalRecords() {
    const yearFilterElem = document.getElementById("modalYearFilter");
    const selectedYear = yearFilterElem ? yearFilterElem.value : currentSelectedYear;

    const tbody = document.getElementById("modalTableBody");
    const thead = document.getElementById("modalTableHeaders");
    const counter = document.getElementById("recordsCount");

    if (!tbody || !thead) return;

    tbody.innerHTML = `<tr><td colspan="100" class="loading-table"><div class="table-loader"></div>Loading records...</td></tr>`;
    if (counter) counter.textContent = "Loading records...";

    const { data: allData, error } = await fetchAllSupabaseData(query => query.select("*"));

    if (error) {
        tbody.innerHTML = `<tr><td colspan="100" style="text-align:center; padding:40px; color:#EF4444;"><i class="fa-solid fa-circle-exclamation"></i> Error loading data.</td></tr>`;
        if (counter) counter.textContent = "Unable to load records";
        return;
    }

    modalRawData = (allData || []).filter(row => {
        if (!row.Date) return false;
        let yearPart = "";
        const dateStr = String(row.Date).trim();
        if (dateStr.includes("-")) {
            yearPart = dateStr.split("-")[0];
        } else if (dateStr.includes("/")) {
            const parts = dateStr.split("/");
            yearPart = parts[parts.length - 1];
        } else {
            yearPart = dateStr.substring(0, 4);
        }
        return yearPart === selectedYear;
    });

    if (modalRawData.length === 0) {
        thead.innerHTML = desiredModalColumns.map(key => `<th>${key}</th>`).join("") + `<th>Acción</th>`;
        tbody.innerHTML = `<tr><td colspan="${desiredModalColumns.length + 1}" style="text-align:center; padding:40px;">No records found for <strong>${selectedYear}</strong></td></tr>`;
        if (counter) counter.textContent = "0 records";
        return;
    }

    thead.innerHTML = desiredModalColumns.map(key => `<th>${key}</th>`).join("") + `<th>Acción</th>`;
    filterModalTable();
}

function filterModalTable() {
    const cellFilterElem = document.getElementById("modalCellFilter");
    const selectedCell = cellFilterElem ? cellFilterElem.value : "";
    const tbody = document.getElementById("modalTableBody");
    const counter = document.getElementById("recordsCount");

    if (!tbody) return;

    const filtered = selectedCell 
        ? modalRawData.filter(row => (row.Depart && row.Depart.trim() === selectedCell) || (row.Maq && row.Maq.trim() === selectedCell)) 
        : modalRawData;

    if (counter) counter.textContent = `${filtered.length.toLocaleString()} records`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${desiredModalColumns.length + 1}" style="text-align:center; padding:40px;">No records match the selected filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(row => {
        const rowId = row.id !== undefined && row.id !== null ? row.id : (row.Id !== undefined ? row.Id : "");
        return `
            <tr data-id="${rowId}" ondblclick="enableModalRowEdit(this)">
                ${desiredModalColumns.map(key => `<td data-field="${key}">${row[key] !== null && row[key] !== undefined ? row[key] : ""}</td>`).join("")}
                <td style="text-align: center; white-space: nowrap;">
                    <button class="save-row-btn" style="display: none;" onclick="saveModalRowEdit(this, '${rowId}')" title="Guardar Cambios">
                        <i class="fa-solid fa-floppy-disk"></i> Guardar
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function enableModalRowEdit(tr) {
    if (tr.classList.contains("editing")) return;
    tr.classList.add("editing");
    tr.style.backgroundColor = "#FEFCE8";

    const tdElements = tr.querySelectorAll("td[data-field]");
    tdElements.forEach(td => {
        const fieldName = td.getAttribute("data-field");
        if (fieldName === "id") return; 

        const currentValue = td.innerText.trim();
        td.innerHTML = `<input type="text" class="modal-inline-input" value="${currentValue}" data-original="${currentValue}" />`;
    });

    const saveBtn = tr.querySelector(".save-row-btn");
    if (saveBtn) {
        saveBtn.style.display = "inline-flex";
    }
}

async function saveModalRowEdit(buttonElement, rowId) {
    const tr = buttonElement.closest("tr");
    if (!tr) return;

    const updatedData = {};
    const tdElements = tr.querySelectorAll("td[data-field]");
    
    tdElements.forEach(td => {
        const fieldName = td.getAttribute("data-field");
        if (fieldName === "id") return;
        
        const input = td.querySelector("input");
        if (input) {
            updatedData[fieldName] = input.value.trim();
        }
    });

    if (!rowId) {
        alert("Error: No se encontró el identificador (id) de este registro.");
        return;
    }

    const { error } = await supabaseClient
        .from("Accidentes")
        .update(updatedData)
        .eq("id", rowId);

    if (error) {
        alert("Error al actualizar en Supabase: " + error.message);
        return;
    }

    alert("¡Cambios guardados correctamente en la base de datos!");
    
    loadModalRecords();
    loadMaintenance();
}

function toggleYearDropdown(event) {
    if (event) event.stopPropagation();
}

window.addEventListener("click", function(event) {
    const modal = document.getElementById("recordsModal");
    const loginModal = document.getElementById("loginModal");
    const accidentModal = document.getElementById("accidentModal");
    const userDropdown = document.getElementById("userDropdown");
    const avatarContainer = document.querySelector(".user-menu-container");

    if (event.target === modal) closeRecordsModal();
    if (event.target === loginModal) closeLoginModal();
    if (event.target === accidentModal) closeAccidentModal();

    if (userDropdown && avatarContainer && !avatarContainer.contains(event.target)) {
        userDropdown.style.display = "none";
    }
});

function selectYear(yearStr, event) {
    if (event) event.stopPropagation();
    currentSelectedYear = yearStr;

    const yearTextElement = document.getElementById("selectedYearText");
    if (yearTextElement) yearTextElement.innerText = yearStr;

    document.querySelectorAll(".custom-option").forEach(option => {
        option.classList.toggle("selected", option.innerText === yearStr);
    });

    loadMaintenance();
}

function selectMonth(monthStr) {
    currentSelectedMonth = monthStr;
    updateDashboard();
}

async function loadMaintenance() {
    if (!currentSelectedYear) return;

    const { data: allData, error } = await fetchAllSupabaseData(query => query.select("*"));

    if (error) {
        alert("Error loading Supabase data.");
        return;
    }

    maintenanceData = (allData || []).filter(row => {
        if (!row.Date) return false;
        const yearPart = String(row.Date).trim().split("-")[0];
        return yearPart === currentSelectedYear;
    });

    updateDashboard();
}

function updateDashboard() {
    calculateKPIs();
    createOperationChart();
    loadIndependentMonthlyChart();
    createShiftPieChart();
    createTypeOfAccidentChart();
    createBodyPartAnalysisChart();
    renderOpenAuditsTable(); 
    updateBodyHeatmap(); 
}

function calculateKPIs() {
    const filteredByYear = maintenanceData.filter(row => {
        if (!row.Date) return false;
        const yearPart = String(row.Date).trim().split("-")[0];
        return yearPart === currentSelectedYear;
    });

    const daysWithoutAccidentsElem = document.getElementById("totalAudits");
    if (daysWithoutAccidentsElem) {
        if (filteredByYear.length > 0) {
            const sortedDates = filteredByYear
                .map(row => new Date(row.Date))
                .filter(date => !isNaN(date))
                .sort((a, b) => b - a);

            if (sortedDates.length > 0) {
                const lastDate = sortedDates[0];
                const currentDate = new Date();
                const diffTime = Math.abs(currentDate - lastDate);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                daysWithoutAccidentsElem.innerText = diffDays.toLocaleString();
            } else {
                daysWithoutAccidentsElem.innerText = "0";
            }
        } else {
            daysWithoutAccidentsElem.innerText = "0";
        }
    }

    const totalIncidentsCount = filteredByYear.length;
    const openElem = document.getElementById("openCount");
    if (openElem) openElem.innerText = totalIncidentsCount.toLocaleString();

    const affectedEmployesCount = filteredByYear.filter(row => {
        return row.Status && row.Status.trim().toLowerCase() === "open";
    }).length;
    const closedElem = document.getElementById("closedCount");
    if (closedElem) closedElem.innerText = affectedEmployesCount.toLocaleString();

    const openAccidentsCount = filteredByYear.filter(row => {
        return row.Status && row.Status.trim().toLowerCase() === "closed";
    }).length;
    const inProcessElem = document.getElementById("inProcessCount");
    if (inProcessElem) inProcessElem.innerText = openAccidentsCount.toLocaleString();

    const progressElem = document.getElementById("progressPercent");
    if (progressElem) {
        if (affectedEmployesCount > 0) {
            const ratio = openAccidentsCount / affectedEmployesCount;
            const percentage = (ratio * 100).toFixed(2) + "%";
            progressElem.innerText = percentage;
        } else {
            progressElem.innerText = "0.00%";
        }
    }
}

function renderOpenAuditsTable() {
    const yearLabel = document.getElementById("tableYearLabel");
    if (yearLabel) yearLabel.textContent = currentSelectedYear;

    const tbody = document.getElementById("openAuditsTableBody");
    if (!tbody) return;

    const openAudits = maintenanceData.filter(row => {
        const coValue = row["C/O"] ? row["C/O"].trim() : "";
        return coValue === "Open";
    });

    openAudits.sort((a, b) => {
        const folioA = parseInt(a.Folio, 10) || 0;
        const folioB = parseInt(b.Folio, 10) || 0;
        return folioB - folioA;
    });

    if (openAudits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px; color:#64748B;">No open accidents found for ${currentSelectedYear}</td></tr>`;
        return;
    }

    tbody.innerHTML = openAudits.map(row => {
        const primaryKeyVal = row.id !== undefined && row.id !== null ? row.id : (row.Id !== undefined ? row.Id : null);
        const folioVal = row.Folio !== undefined && row.Folio !== null ? row.Folio : "";
        const shiftVal = row.Shift !== undefined ? row.Shift : (row.shift !== undefined ? row.shift : (row.Turno || ""));
        const areaVal = row.Depart !== undefined && row.Depart !== null ? row.Depart : (row.Area || "");
        const ehsNameVal = row.Name !== undefined && row.Name !== null ? row.Name : (row.EHSName || "");
        const gerenteVal = row.Gerente !== undefined && row.Gerente !== null ? row.Gerente : "";
        const fechaVal = row.Date !== undefined && row.Date !== null ? row.Date : "";
        const statusVal = row.Status !== undefined && row.Status !== null ? row.Status : "";
        const coVal = row["C/O"] !== undefined && row["C/O"] !== null ? row["C/O"] : "";
        
        let pdfVal = row.PDF !== undefined && row.PDF !== null ? row.PDF : "";
        let pdfCellHtml = pdfVal;
        if (pdfVal && (pdfVal.startsWith("http://") || pdfVal.startsWith("https://"))) {
            pdfCellHtml = `<a href="${pdfVal}" target="_blank" title="View PDF" style="color:var(--primary); font-size: 16px; text-decoration:none;"><i class="fa-solid fa-eye"></i></a>`;
        }

        let editButtonHtml = "";
        if (isUserLoggedIn) {
            editButtonHtml = `<button type="button" onclick="enableEditRow(this, '${primaryKeyVal}')" title="Editar" style="background: transparent; border: none; color: #2563EB; cursor: pointer; font-size: 14px;"><i class="fa-solid fa-pen-to-square"></i></button>`;
        } else {
            editButtonHtml = `<button title="Editar (Deshabilitado)" disabled style="background: transparent; border: none; color: #94A3B8; cursor: not-allowed; font-size: 14px; opacity: 0.4;"><i class="fa-solid fa-pen-to-square"></i></button>`;
        }

        return `
            <tr data-id="${primaryKeyVal}">
                <td>${primaryKeyVal}</td>
                <td data-field="Folio">${folioVal}</td>
                <td data-field="Shift">${shiftVal}</td>
                <td data-field="Area">${areaVal}</td>
                <td data-field="EHSName">${ehsNameVal}</td>
                <td data-field="Gerente">${gerenteVal}</td>
                <td data-field="Date">${fechaVal}</td>
                <td data-field="Status"><span style="padding: 3px 8px; border-radius: 6px; background: #FEF2F2; color: #DC2626; font-weight: 800; font-size: 10px;">${statusVal}</span></td>
                <td data-field="C/O"><span style="padding: 3px 8px; border-radius: 6px; background: #EFF6FF; color: #2563EB; font-weight: 800; font-size: 10px;">${coVal}</span></td>
                <td>${pdfCellHtml}</td>
                <td style="text-align: center;">${editButtonHtml}</td>
            </tr>
        `;
    }).join("");
}

function updateBodyHeatmap() {
    const zoneCounts = {
        "Cabeza": 0, "Cara": 0, "Ojos": 0, "Cuello": 0,
        "Hombros": 0, "Pecho": 0, "Espalda": 0, "Cintura": 0,
        "Brazos": 0, "Manos": 0, "Dedos": 0, "Cadera": 0,
        "Pierna": 0, "Rodilla": 0, "Tobillo": 0, "Pie": 0
    };

    maintenanceData.forEach(row => {
        const partBody = (row.PartBody || row.partbody || "").trim().toLowerCase();
        
        if (partBody.includes("cabeza") || partBody.includes("head")) zoneCounts["Cabeza"]++;
        if (partBody.includes("cara") || partBody.includes("face")) zoneCounts["Cara"]++;
        if (partBody.includes("ojo") || partBody.includes("eye")) zoneCounts["Ojos"]++;
        if (partBody.includes("cuello") || partBody.includes("neck")) zoneCounts["Cuello"]++;
        if (partBody.includes("hombro") || partBody.includes("shoulder")) zoneCounts["Hombros"]++;
        if (partBody.includes("pecho") || partBody.includes("chest")) zoneCounts["Pecho"]++;
        if (partBody.includes("espalda") || partBody.includes("back")) zoneCounts["Espalda"]++;
        if (partBody.includes("cintura") || partBody.includes("waist")) zoneCounts["Cintura"]++;
        if (partBody.includes("brazo") || partBody.includes("arm")) zoneCounts["Brazos"]++;
        if (partBody.includes("mano") || partBody.includes("hand")) zoneCounts["Manos"]++;
        if (partBody.includes("dedo") || partBody.includes("finger")) zoneCounts["Dedos"]++;
        if (partBody.includes("cadera") || partBody.includes("hip")) zoneCounts["Cadera"]++;
        if (partBody.includes("pierna") || partBody.includes("leg") || partBody.includes("pantorrilla")) zoneCounts["Pierna"]++;
        if (partBody.includes("rodilla") || partBody.includes("knee")) zoneCounts["Rodilla"]++;
        if (partBody.includes("tobillo") || partBody.includes("ankle")) zoneCounts["Tobillo"]++;
        if (partBody.includes("pie") || partBody.includes("foot")) zoneCounts["Pie"]++;
    });

    const partMapping = {
        "Cabeza": ["part-cabeza"], 
        "Cara": ["part-cara"], 
        "Ojos": ["part-ojos"], 
        "Cuello": ["part-cuello"],
        "Hombros": ["part-hombros"], 
        "Pecho": ["part-pecho"], 
        "Espalda": ["part-espalda"], 
        "Cintura": ["part-cintura"],
        "Brazos": ["part-brazos", "part-brazos-der"], 
        "Manos": ["part-manos", "part-manos-der"],
        "Dedos": ["part-dedos", "part-dedos-der"], 
        "Cadera": ["part-cadera"],
        "Pierna": ["part-pierna", "part-pierna-der", "part-pantorrilla", "part-pantorrilla-der"],
        "Rodilla": ["part-rodilla", "part-rodilla-der"],
        "Tobillo": ["part-tobillo", "part-tobillo-der"],
        "Pie": ["part-pie", "part-pie-der"]
    };

    Object.keys(partMapping).forEach(zone => {
        const count = zoneCounts[zone] || 0;
        const selectorList = partMapping[zone];
        selectorList.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (count > 0) {
                    el.style.fill = count > 3 ? "#DC2626" : (count > 1 ? "#F59E0B" : "#60A5FA");
                } else {
                    el.style.fill = "#CBD5E1";
                }
            }
        });
    });

    const bodyStatsList = document.getElementById("bodyStatsList");
    if (bodyStatsList) {
        let html = "";
        Object.keys(zoneCounts).forEach(zone => {
            const count = zoneCounts[zone];
            if (count > 0) {
                html += `
                    <div class="body-stat-item">
                        <span>${zone}</span>
                        <span class="body-stat-badge" style="background: #FEF2F2; color: #DC2626;">${count}</span>
                    </div>
                `;
            }
        });
        if (html === "") {
            html = `
                <div class="body-stat-item">
                    <span>Sin registros en zonas</span>
                    <span class="body-stat-badge" style="background: #E2E8F0; color: #64748B;">0</span>
                </div>
            `;
        }
        bodyStatsList.innerHTML = html;
    }
}

function filterByBodyPart(partName) {
    alert(`Filtrando incidencias para la zona: ${partName}`);
}

function enableEditRow(buttonElement, rowId) {
    const tr = buttonElement.closest("tr");
    if (!tr) return;

    const fieldsToEdit = ["Folio", "Shift", "Area", "EHSName", "Gerente", "Date"];
    fieldsToEdit.forEach(fieldName => {
        const td = tr.querySelector(`td[data-field="${fieldName}"]`);
        if (td) {
            const currentValue = td.innerText.trim();
            td.innerHTML = `<input type="text" value="${currentValue}" style="width: 100%; padding: 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px;" data-original="${currentValue}">`;
        }
    });

    const statusTd = tr.querySelector(`td[data-field="Status"]`);
    if (statusTd) {
        const currentStatus = statusTd.innerText.trim();
        statusTd.innerHTML = `
            <select style="padding: 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px;" data-original="${currentStatus}">
                <option value="Open" ${currentStatus === "Open" ? "selected" : ""}>Open</option>
                <option value="Closed" ${currentStatus === "Closed" ? "selected" : ""}>Closed</option>
            </select>
        `;
    }

    const coTd = tr.querySelector(`td[data-field="C/O"]`);
    if (coTd) {
        const currentCO = coTd.innerText.trim();
        coTd.innerHTML = `
            <select style="padding: 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px;" data-original="${currentCO}">
                <option value="Open" ${currentCO === "Open" ? "selected" : ""}>Open</option>
                <option value="Closed" ${currentCO === "Closed" ? "selected" : ""}>Closed</option>
            </select>
        `;
    }

    const actionTd = tr.querySelector("td:last-child");
    if (actionTd) {
        actionTd.innerHTML = `<button type="button" onclick="saveEditedRow(this, '${rowId}')" title="Guardar Cambios" style="background: transparent; border: none; color: #10B981; cursor: pointer; font-size: 14px;"><i class="fa-solid fa-floppy-disk"></i></button>`;
    }
}

async function saveEditedRow(buttonElement, rowId) {
    const tr = buttonElement.closest("tr");
    if (!tr) return;

    const updatedData = {};
    const fieldsToEdit = ["Folio", "Shift", "Area", "EHSName", "Gerente", "Date"];
    fieldsToEdit.forEach(fieldName => {
        const td = tr.querySelector(`td[data-field="${fieldName}"]`);
        if (td) {
            const input = td.querySelector("input");
            if (input) updatedData[fieldName] = input.value.trim();
        }
    });

    const statusTd = tr.querySelector(`td[data-field="Status"]`);
    if (statusTd) {
        const select = statusTd.querySelector("select");
        if (select) updatedData["Status"] = select.value;
    }

    const coTd = tr.querySelector(`td[data-field="C/O"]`);
    if (coTd) {
        const select = coTd.querySelector("select");
        if (select) updatedData["C/O"] = select.value;
    }

    const { error } = await supabaseClient
        .from("Accidentes")
        .update(updatedData)
        .eq("id", rowId);

    if (error) {
        alert("Error al actualizar los datos en Supabase: " + error.message);
        return;
    }

    alert("¡Datos guardados y actualizados correctamente en Supabase!");
    await loadMaintenance(); 
}

function renderChart(canvasId, config) {
    if (activeCharts[canvasId]) activeCharts[canvasId].destroy();
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    activeCharts[canvasId] = new Chart(canvas, config);
}

function baseChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "#07111F",
                titleColor: "#FFFFFF",
                bodyColor: "#CBD5E1",
                borderColor: "rgba(255,255,255,.1)",
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10,
                displayColors: true
            },
            datalabels: {
                color: "#334155",
                anchor: "end",
                align: "top",
                offset: 4,
                font: { weight: "800", size: 10 }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grace: "15%",
                ticks: { precision: 0, color: "#64748B", font: { size: 10 } },
                grid: { color: "rgba(148,163,184,.13)" },
                border: { display: false }
            },
            x: {
                ticks: { color: "#64748B", font: { size: 9, weight: "600" } },
                grid: { display: false },
                border: { display: false }
            }
        }
    };
}

function createOperationChart() {
    const shiftCounts = {};
    
    maintenanceData.forEach(row => {
        if (!row.Date) return;
        const yearPart = String(row.Date).trim().split("-")[0];
        
        if (yearPart === currentSelectedYear) {
            const shiftVal = row.Shift !== undefined ? row.Shift : (row.shift !== undefined ? row.shift : (row.Turno || "Unassigned"));
            const cleanShift = shiftVal !== null && shiftVal !== "" ? String(shiftVal).trim() : "Unassigned";
            
            shiftCounts[cleanShift] = (shiftCounts[cleanShift] || 0) + 1;
        }
    });

    const labels = Object.keys(shiftCounts);
    const dataValues = Object.values(shiftCounts);

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    boxWidth: 12,
                    font: { size: 11, weight: '600' },
                    color: '#64748B'
                }
            },
            tooltip: {
                backgroundColor: "#07111F",
                titleColor: "#FFFFFF",
                bodyColor: "#CBD5E1",
                borderColor: "rgba(255,255,255,.1)",
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10
            },
            datalabels: {
                display: true,
                color: "#FFFFFF",
                font: { weight: "800", size: 11 },
                formatter: (value) => value > 0 ? value : ''
            }
        }
    };

    const backgroundColors = [
        "#2563EB", "#7C3AED", "#DB2777", "#EA580C", 
        "#16A34A", "#0284C7", "#9333EA", "#CA8A04"
    ];

    renderChart("operationChart", {
        type: "doughnut",
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: "#FFFFFF"
            }]
        },
        options: pieOptions,
        plugins: [ChartDataLabels]
    });
}

function createShiftPieChart() {
    const shiftCounts = {};

    maintenanceData.forEach(row => {
        if (!row.Date) return;
        const yearPart = String(row.Date).trim().split("-")[0];

        if (yearPart === currentSelectedYear) {
            const shiftVal = row.Shift !== undefined ? row.Shift : (row.shift !== undefined ? row.shift : (row.Turno || "Unassigned"));
            const cleanShift = shiftVal !== null && shiftVal !== "" ? String(shiftVal).trim() : "Unassigned";
            
            shiftCounts[cleanShift] = (shiftCounts[cleanShift] || 0) + 1;
        }
    });

    const labels = Object.keys(shiftCounts);
    const dataValues = Object.values(shiftCounts);

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    boxWidth: 12,
                    font: { size: 11, weight: '600' },
                    color: '#64748B'
                }
            },
            tooltip: {
                backgroundColor: "#07111F",
                titleColor: "#FFFFFF",
                bodyColor: "#CBD5E1",
                borderColor: "rgba(255,255,255,.1)",
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10
            },
            datalabels: {
                display: true,
                color: "#FFFFFF",
                font: { weight: "800", size: 11 },
                formatter: (value) => value > 0 ? value : ''
            }
        }
    };

    const backgroundColors = [
        "#2563EB", "#7C3AED", "#DB2777", "#EA580C", 
        "#16A34A", "#0284C7", "#9333EA", "#CA8A04"
    ];

    renderChart("shiftPieChart", {
        type: "doughnut",
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: "#FFFFFF"
            }]
        },
        options: pieOptions,
        plugins: [ChartDataLabels]
    });
}

function createTypeOfAccidentChart() {
    const typeCounts = {};
    
    maintenanceData.forEach(row => {
        if (!row.Date) return;
        const yearPart = String(row.Date).trim().split("-")[0];
        
        if (yearPart === currentSelectedYear) {
            const accidentType = row.Type || row.Tipo || row.AccidentType || "Unassigned";
            typeCounts[accidentType] = (typeCounts[accidentType] || 0) + 1;
        }
    });

    const labels = Object.keys(typeCounts);
    const dataValues = Object.values(typeCounts);
    const options = baseChartOptions();
    
    options.plugins.datalabels = {
        display: true,
        color: "#334155",
        anchor: "end",
        align: "top",
        offset: 4,
        font: { weight: "800", size: 10 }
    };

    renderChart("typeOfAccidentChart", {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Type of Accident",
                data: dataValues,
                backgroundColor: "rgba(245, 158, 11, 0.75)",
                hoverBackgroundColor: "#F59E0B",
                borderRadius: 7,
                borderSkipped: false,
                barPercentage: 0.65
            }]
        },
        options: options,
        plugins: [ChartDataLabels]
    });
}

function createBodyPartAnalysisChart() {
    const partBodyCounts = {};
    
    maintenanceData.forEach(row => {
        if (!row.Date) return;
        const yearPart = String(row.Date).trim().split("-")[0];
        
        if (yearPart === currentSelectedYear) {
            const bodyPartVal = row.PartBody || row.partbody || row.Area || "Unassigned";
            partBodyCounts[bodyPartVal] = (partBodyCounts[bodyPartVal] || 0) + 1;
        }
    });

    const labels = Object.keys(partBodyCounts);
    const dataValues = Object.values(partBodyCounts);
    const options = baseChartOptions();
    
    options.plugins.datalabels = {
        display: true,
        color: "#334155",
        anchor: "end",
        align: "top",
        offset: 4,
        font: { weight: "800", size: 10 }
    };

    renderChart("bodyPartAnalysisChart", {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "BodyPart Analysis",
                data: dataValues,
                backgroundColor: "rgba(124, 58, 237, 0.75)",
                hoverBackgroundColor: "#7C3AED",
                borderRadius: 7,
                borderSkipped: false,
                barPercentage: 0.65
            }]
        },
        options: options,
        plugins: [ChartDataLabels]
    });
}

async function loadIndependentMonthlyChart() {
    const monthlyCount = {};
    months.forEach(m => monthlyCount[m] = 0);

    maintenanceData.forEach(row => {
        let monthName = null;
        
        if (row.Date && typeof row.Date === "string" && row.Date.length >= 7) {
            const parts = row.Date.split("-");
            if (parts.length >= 2) {
                const monthIndex = parseInt(parts[1], 10) - 1;
                if (monthIndex >= 0 && monthIndex < 12) {
                    monthName = months[monthIndex];
                }
            }
        }
        
        if (!monthName && row.Month) {
            const matched = months.find(m => m.toLowerCase() === row.Month.trim().toLowerCase());
            if (matched) monthName = matched;
        }

        if (monthName && monthlyCount.hasOwnProperty(monthName)) {
            monthlyCount[monthName]++;
        }
    });

    const values = months.map(m => monthlyCount[m]);
    const changes = values.map((val, idx) => {
        if (idx === 0) return null;
        const prev = values[idx - 1];
        if (prev === 0) return val > 0 ? 100 : 0;
        return Math.round(((val - prev) / prev) * 100);
    });

    const options = baseChartOptions();
    options.scales.x.ticks.maxRotation = 40;
    options.scales.x.ticks.minRotation = 40;
    options.scales.y.grace = "35%";
    options.plugins.datalabels = { display: false };

    const monthlyTrendPlugin = {
        id: 'monthlyTrendPlugin',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            const datasetMeta = chart.getDatasetMeta(0);
            
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            datasetMeta.data.forEach((bar, index) => {
                const value = values[index];
                const barX = bar.x;
                const barY = bar.y;
                const barBase = bar.base;
                
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '700 11px "Segoe UI", Inter, sans-serif';
                const textY = barY + (barBase - barY) / 2;
                ctx.fillText(value, barX, textY);

                if (index > 0 && changes[index] !== null) {
                    const change = changes[index];
                    const isPositive = change >= 0;
                    const changeText = `${isPositive ? '+' : ''}${change}%`;
                    
                    const badgeWidth = 42;
                    const badgeHeight = 18;
                    const badgeX = barX - badgeWidth / 2;
                    const badgeY = barY - 26;

                    ctx.fillStyle = isPositive ? '#FCA5A5' : '#6EE7B7';
                    ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

                    ctx.fillStyle = '#000000';
                    ctx.font = '800 9px "Segoe UI", Inter, sans-serif';
                    ctx.fillText(changeText, barX, badgeY + badgeHeight / 2);
                }
            });
            ctx.restore();
        }
    };

    renderChart("monthlyIssuesChart", {
        type: "bar",
        data: {
            labels: months,
            datasets: [{ label: "Issues", data: values, backgroundColor: "rgba(124, 58, 237, 0.55)", hoverBackgroundColor: "#7C3AED", borderRadius: 7, borderSkipped: false, barPercentage: 0.68 }]
        },
        options,
        plugins: [monthlyTrendPlugin]
    });
}

function toggleUserDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById("userDropdown");
    if (dropdown) dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

function setProtectedElementsState(isLoggedIn, userName = "") {
    isUserLoggedIn = isLoggedIn; 
    const dataOption = document.getElementById("dataMenuOption");
    const loginBtn = document.getElementById("loginMenuBtn");
    const logoutBtn = document.getElementById("logoutMenuBtn");
    const statusText = document.getElementById("userStatusText");
    const avatarText = document.getElementById("userAvatarText");
    const addAuditBtn = document.getElementById("addAuditBtn");

    if (isLoggedIn) {
        sessionActiveUser = userName;
        localStorage.setItem("smrc_logged_user", userName);
        if (dataOption) {
            dataOption.style.opacity = "1";
            dataOption.style.pointerEvents = "auto";
            dataOption.style.cursor = "pointer";
        }
        if (addAuditBtn) {
            addAuditBtn.removeAttribute("disabled");
            addAuditBtn.style.background = "#2563EB";
            addAuditBtn.style.color = "#FFFFFF";
            addAuditBtn.style.cursor = "pointer";
            addAuditBtn.style.opacity = "1";
            addAuditBtn.style.pointerEvents = "auto";
            addAuditBtn.title = "Agregar Auditoría";
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
        localStorage.removeItem("smrc_logged_user");
        if (dataOption) {
            dataOption.style.opacity = "0.5";
            dataOption.style.pointerEvents = "none";
            dataOption.style.cursor = "not-allowed";
        }
        if (addAuditBtn) {
            addAuditBtn.setAttribute("disabled", "true");
            addAuditBtn.style.background = "#E2E8F0";
            addAuditBtn.style.color = "#94A3B8";
            addAuditBtn.style.cursor = "not-allowed";
            addAuditBtn.style.opacity = "0.6";
            addAuditBtn.style.pointerEvents = "none";
            addAuditBtn.title = "Agregar Auditoría (Deshabilitado)";
        }
        if (loginBtn) loginBtn.style.display = "flex";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (statusText) {
            statusText.textContent = "No Iniciada";
            statusText.style.color = "#EF4444";
        }
        if (avatarText) avatarText.textContent = "RC";
    }

    renderOpenAuditsTable();
}

function checkAccidentsSession() {
    const loggedUser = localStorage.getItem("smrc_logged_user");
    if (loggedUser) {
        setProtectedElementsState(true, loggedUser);
    } else {
        setProtectedElementsState(false);
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

window.addEventListener("load", function() {
    setCurrentYear();
    checkAccidentsSession();
});

// ================================
// PROTECCIÓN DE LA PÁGINA
// ================================

// Bloquear clic derecho
document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

// Bloquear selección de texto
document.addEventListener("selectstart", (e) => {
    e.preventDefault();
});

// Bloquear copiar
document.addEventListener("copy", (e) => {
    e.preventDefault();
});

// Bloquear cortar
document.addEventListener("cut", (e) => {
    e.preventDefault();
});

// Bloquear arrastrar contenido
document.addEventListener("dragstart", (e) => {
    e.preventDefault();
});

// Bloquear teclas comunes para inspeccionar/copiar
document.addEventListener("keydown", (e) => {

    const key = e.key.toLowerCase();

    // F12
    if (e.key === "F12") {
        e.preventDefault();
        return;
    }

    // Ctrl + Shift + I/J/C
    if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) {
        e.preventDefault();
        return;
    }

    // Ctrl + U
    if (e.ctrlKey && key === "u") {
        e.preventDefault();
        return;
    }

    // Ctrl + C
    if (e.ctrlKey && key === "c") {
        e.preventDefault();
        return;
    }

    // Ctrl + X
    if (e.ctrlKey && key === "x") {
        e.preventDefault();
        return;
    }

    // Ctrl + S
    if (e.ctrlKey && key === "s") {
        e.preventDefault();
        return;
    }

    // Ctrl + A
    if (e.ctrlKey && key === "a") {
        e.preventDefault();
        return;
    }
});