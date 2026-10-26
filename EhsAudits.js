const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let maintenanceData = [];
let activeCharts = {};
let currentSelectedYear = "2026";
let currentSelectedMonth = "All";
let modalRawData = [];
let isUserLoggedIn = false; // Global session state
let selectedPdfFile = null;

const desiredModalColumns = ["Id", "Folio", "Plant", "Shift", "Area", "EHSName", "Gerente", "Fecha", "Status", "C/O", "PDF", "Evidence", "Actions"];
const availableYears = ["2025", "2026", "2027", "2028", "2029", "2030"];

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

// Helper function to show web app native-like dialog boxes
function showAppAlert(message, title = "Success") {
    return new Promise((resolve) => {
        const alertModal = document.getElementById("customAlertModal");
        const titleElem = document.getElementById("customAlertTitle");
        const msgElem = document.getElementById("customAlertMessage");
        const okBtn = document.getElementById("customAlertOkBtn");

        if (!alertModal) {
            alert(message);
            resolve();
            return;
        }

        if (titleElem) titleElem.textContent = title;
        if (msgElem) msgElem.textContent = message;

        alertModal.style.display = "flex";

        const handleClose = () => {
            alertModal.style.display = "none";
            okBtn.removeEventListener("click", handleClose);
            resolve();
        };

        okBtn.addEventListener("click", handleClose);
    });
}

async function fetchAllSupabaseData(queryBuilderFn) {
    let allData = [];
    const pageSize = 1000;
    let from = 0;
    let moreData = true;

    try {
        while (moreData) {
            let query = queryBuilderFn(supabaseClient.from("Auditorias_Gestion_EHS")).range(from, from + pageSize - 1);
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

async function loadEhsNamesForDropdown() {
    const datalist = document.getElementById("ehsNameOptions");
    if (!datalist) return;

    try {
        let allData = [];
        const pageSize = 1000;
        let from = 0;
        let moreData = true;

        while (moreData) {
            const { data, error } = await supabaseClient
                .from("Datageneral")
                .select("EHSNamee")
                .range(from, from + pageSize - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                allData = allData.concat(data);
                from += pageSize;
            } else {
                moreData = false;
            }
        }

        if (allData.length > 0) {
            const uniqueNames = [...new Set(
                allData.map(item => item.EHSNamee)
                    .filter(name => name !== null && name !== undefined && String(name).trim() !== "")
            )].sort((a, b) => a.localeCompare(b));

            datalist.innerHTML = uniqueNames.map(name => `<option value="${name}">`).join("");
        } else {
            datalist.innerHTML = "";
        }
    } catch (err) {
        console.error("Error loading EHSNamee from Datageneral:", err);
    }
}

function populateYearDropdowns() {
    const yearDropdown = document.getElementById("yearDropdown");
    if (yearDropdown) {
        let html = '<div class="dropdown-title">Select Year Period</div>';
        availableYears.forEach(year => {
            html += `<div class="custom-option" data-year="${year}">${year}</div>`;
        });
        yearDropdown.innerHTML = html;
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

function openAddAuditModal() {
    const modal = document.getElementById("addAuditModal");
    if (modal) modal.style.display = "flex";

    const form = document.getElementById("newAuditForm");
    if (form) form.reset();
    selectedPdfFile = null;
    const fileNameDisplay = document.getElementById("fileNameDisplay");
    if (fileNameDisplay) fileNameDisplay.textContent = "";

    loadEhsNamesForDropdown();
}

function closeAddAuditModal() {
    const modal = document.getElementById("addAuditModal");
    if (modal) modal.style.display = "none";
}

function clearCellFilter() {
    const cellFilter = document.getElementById("modalCellFilter");
    if (cellFilter) cellFilter.value = "";

    const searchInputElem = document.getElementById("modalGlobalSearch");
    if (searchInputElem) searchInputElem.value = "";

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
        return row.Year == selectedYear || (row.Fecha && row.Fecha.startsWith(selectedYear));
    });

    if (modalRawData.length === 0) {
        thead.innerHTML = "<th>No Data</th>";
        tbody.innerHTML = `<tr><td style="text-align:center; padding:40px;">No records found for <strong>${selectedYear}</strong></td></tr>`;
        if (counter) counter.textContent = "0 records";
        return;
    }

    const columnsToDisplay = isUserLoggedIn ? desiredModalColumns : desiredModalColumns.filter(col => col !== "Actions");
    thead.innerHTML = columnsToDisplay.map(key => `<th>${key}</th>`).join("");
    filterModalTable();
}

function filterModalTable() {
    const cellFilterElem = document.getElementById("modalCellFilter");
    const selectedCell = cellFilterElem ? cellFilterElem.value : "";
    
    const searchInputElem = document.getElementById("modalGlobalSearch");
    const searchText = searchInputElem ? searchInputElem.value.toLowerCase().trim() : "";

    const tbody = document.getElementById("modalTableBody");
    const counter = document.getElementById("recordsCount");

    if (!tbody) return;

    let filtered = selectedCell ? modalRawData.filter(row => row.Maq === selectedCell) : modalRawData;

    if (searchText) {
        filtered = filtered.filter(row => {
            return desiredModalColumns.some(key => {
                const val = row[key];
                return val !== null && val !== undefined && String(val).toLowerCase().includes(searchText);
            });
        });
    }

    filtered.sort((a, b) => {
        const folioA = parseInt(a.Folio, 10) || 0;
        const folioB = parseInt(b.Folio, 10) || 0;
        return folioB - folioA;
    });

    if (counter) counter.textContent = `${filtered.length.toLocaleString()} records`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="100" style="text-align:center; padding:40px;">No records match your filter criteria.</td></tr>`;
        return;
    }

    const columnsToDisplay = isUserLoggedIn ? desiredModalColumns : desiredModalColumns.filter(col => col !== "Actions");

    tbody.innerHTML = filtered.map(row => {
        const rowId = row.id !== undefined && row.id !== null ? row.id : (row.Id !== undefined ? row.Id : "");
        return `
            <tr data-id="${rowId}">
                ${columnsToDisplay.map(key => {
                    let val = row[key] !== null && row[key] !== undefined ? row[key] : "";
                    
                    if (key === "PDF" || key === "Evidence") {
                        if (val && (String(val).startsWith("http://") || String(val).startsWith("https://"))) {
                            const iconClass = key === "PDF" ? "fa-file-lines" : "fa-eye";
                            const iconColor = "var(--primary)"; // Azul para PDF y para el ojo de Evidence
                            const tooltipTitle = key === "PDF" ? "View Report" : "View Evidence";
                            val = `
                                <div style="display:flex; align-items:center; justify-content:center; gap:6px;">
                                    <a href="${val}" target="_blank" title="${tooltipTitle}" style="font-size: 16px; color: ${iconColor}; text-decoration: none;"><i class="fa-solid ${iconClass}"></i></a>
                                    ${key === "Evidence" && isUserLoggedIn ? `<i class="fa-solid fa-upload" style="font-size: 12px; color: #EF4444;" onclick="handleModalEvidenceCellClick('${rowId}', event)" title="Update evidence file"></i>` : ''}
                                </div>
                            `;
                        } else {
                            if (key === "Evidence") {
                                val = `
                                    <div style="display: flex; align-items: center; justify-content: center; cursor: pointer; color: #EF4444;" onclick="handleModalEvidenceCellClick('${rowId}', event)" title="Upload evidence document">
                                        <i class="fa-solid fa-cloud-arrow-up" style="font-size: 16px; color: #EF4444;"></i>
                                    </div>
                                `;
                            } else {
                                val = `<span style="color: #94A3B8; font-size: 11px;">N/A</span>`;
                            }
                        }
                    } else if (key === "Fecha" && val) {
                        const parts = String(val).split("-");
                        if (parts.length === 3) {
                            const year = parts[0].slice(-2);
                            const monthIndex = parseInt(parts[1], 10) - 1;
                            const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            const monthStr = monthsShort[monthIndex] || parts[1];
                            const day = parts[2];
                            val = `${day}-${monthStr}-${year}`;
                        }
                    } else if (key === "Actions") {
                        val = `<div class="action-buttons-cell"></div>`;
                    }

                    return `<td data-field="${key}">${val}</td>`;
                }).join("")}
            </tr>
        `;
    }).join("");

    const rows = tbody.querySelectorAll("tr");
    rows.forEach(row => {
        row.addEventListener("click", (e) => {
            if (e.target.closest("button") || e.target.closest("input") || e.target.closest("select") || e.target.closest("a") || e.target.closest("div[onclick]")) {
                return;
            }

            rows.forEach(r => r.classList.remove("selected-row"));
            row.classList.add("selected-row");

            if (isUserLoggedIn) {
                enableModalRowEdit(row);
            }
        });
    });
}

async function handleModalEvidenceCellClick(rowId, event) {
    if (event) event.stopPropagation();

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/pdf";

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `evidence_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabaseClient.storage
                .from("pdfs")
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                throw new Error("Error uploading file to storage: " + uploadError.message);
            }

            const { data: urlData } = supabaseClient.storage
                .from("pdfs")
                .getPublicUrl(filePath);

            if (!urlData || !urlData.publicUrl) {
                throw new Error("Could not retrieve public URL for the file.");
            }

            const publicUrl = urlData.publicUrl;
            const numericId = parseInt(rowId, 10);

            const { error: updateError } = await supabaseClient
                .from("Auditorias_Gestion_EHS")
                .update({ Evidence: publicUrl })
                .eq('id', numericId);

            if (updateError) {
                throw new Error("Error updating database: " + updateError.message);
            }

            await showAppAlert("PDF evidence successfully uploaded and updated.", "Successful Operation");
            await loadModalRecords();
            await loadMaintenance();

        } catch (err) {
            console.error("Error uploading evidence:", err);
            await showAppAlert("Error uploading file: " + (err.message || err), "Error");
        }
    };

    fileInput.click();
}
window.handleModalEvidenceCellClick = handleModalEvidenceCellClick;

function enableModalRowEdit(tr) {
    if (tr.classList.contains("editing-row")) return;
    
    document.querySelectorAll("#modalTableBody tr.editing-row").forEach(r => {
        if (r !== tr) cancelModalRowEdit(r);
    });

    tr.classList.add("editing-row");
    tr.dataset.originalHtml = tr.innerHTML;

    loadEhsNamesForDropdown();

    const rowId = tr.getAttribute("data-id");
    const cells = tr.querySelectorAll("td");

    cells.forEach(td => {
        const fieldName = td.getAttribute("data-field");
        if (!fieldName || fieldName === "Id" || fieldName === "PDF" || fieldName === "Actions") return;

        let currentValue = td.innerText.trim();

        if (fieldName === "Evidence") {
            td.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; color: #EF4444;" onclick="handleModalEvidenceCellClick('${rowId}', event)" title="Click to update Evidence file">
                    <i class="fa-solid fa-cloud-arrow-up" style="font-size: 15px; color: #EF4444;"></i>
                    <span style="font-size: 10px; font-weight: 700; text-decoration: underline; color: #EF4444;">Upload/Change</span>
                </div>
            `;
            return;
        }

        if (fieldName === "Status") {
            td.innerHTML = `
                <select style="width: 100%; padding: 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    <option value="In Process" ${currentValue === "In Process" ? "selected" : ""}>In Process</option>
                    <option value="Completed" ${currentValue === "Completed" ? "selected" : ""}>Completed</option>
                    <option value="New" ${currentValue === "New" ? "selected" : ""}>New</option>
                </select>
            `;
        } else if (fieldName === "C/O") {
            td.innerHTML = `
                <select style="width: 100%; padding: 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    <option value="Open" ${currentValue === "Open" ? "selected" : ""}>Open</option>
                    <option value="Closed" ${currentValue === "Closed" ? "selected" : ""}>Closed</option>
                </select>
            `;
        } else if (fieldName === "EHSName") {
            td.innerHTML = `<input type="text" list="ehsNameOptions" value="${currentValue}" autocomplete="off" style="width: 100%; padding: 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px;">`;
        } else {
            td.innerHTML = `<input type="text" value="${currentValue}" style="width: 100%; padding: 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px;">`;
        }
    });

    const actionsTd = tr.querySelector("td[data-field='Actions']") || cells[cells.length - 1];
    if (actionsTd) {
        actionsTd.innerHTML = `
            <div class="action-buttons-cell">
                <button type="button" onclick="saveModalRowEdit(this)" title="Save changes" style="background:#10B981; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;"><i class="fa-solid fa-check"></i></button>
                <button type="button" onclick="cancelModalRowEditFromBtn(this)" title="Cancel modification" style="background:#EF4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `;
    }
}

async function saveModalRowEdit(buttonElem) {
    const tr = buttonElem.closest("tr");
    if (!tr) return;

    const rowId = tr.getAttribute("data-id");
    const updatedData = {};

    const cells = tr.querySelectorAll("td");
    cells.forEach(td => {
        const fieldName = td.getAttribute("data-field");
        if (!fieldName || fieldName === "Id" || fieldName === "PDF" || fieldName === "Evidence" || fieldName === "Actions") return;

        const input = td.querySelector("input");
        const select = td.querySelector("select");

        if (input) {
            updatedData[fieldName] = input.value.trim();
        } else if (select) {
            updatedData[fieldName] = select.value;
        }
    });

    const numericId = parseInt(rowId, 10);
    if (isNaN(numericId)) {
        await showAppAlert("Invalid record ID.", "Notice");
        return;
    }

    const { error } = await supabaseClient
        .from("Auditorias_Gestion_EHS")
        .update(updatedData)
        .eq('id', numericId);

    if (error) {
        await showAppAlert("Error updating data: " + error.message, "Error");
        return;
    }

    await showAppAlert("Data updated successfully.", "Success");
    await loadModalRecords();
    await loadMaintenance();
}

function cancelModalRowEdit(tr) {
    if (tr && tr.dataset.originalHtml) {
        tr.innerHTML = tr.dataset.originalHtml;
        tr.classList.remove("editing-row");
    }
}

function cancelModalRowEditFromBtn(buttonElem) {
    const tr = buttonElem.closest("tr");
    cancelModalRowEdit(tr);
}

// Control del menú de años (Apertura por Clic y Cierre automático)
function toggleYearDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("yearDropdown");
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    }
}

function selectYear(yearStr, event) {
    if (event) event.stopPropagation();
    currentSelectedYear = yearStr;

    const yearTextElement = document.getElementById("selectedYearText");
    if (yearTextElement) yearTextElement.innerText = yearStr;

    document.querySelectorAll(".custom-option").forEach(option => {
        option.classList.toggle("selected", option.innerText === yearStr);
    });

    // Ocultar el menú desplegable al seleccionar un año
    const yearDropdown = document.getElementById("yearDropdown");
    if (yearDropdown) {
        yearDropdown.style.display = "none";
    }

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
        await showAppAlert("Error loading Supabase data.", "Error");
        return;
    }

    maintenanceData = (allData || []).filter(row => {
        return row.Year == currentSelectedYear || (row.Fecha && row.Fecha.startsWith(currentSelectedYear));
    });

    updateDashboard();
}

function updateDashboard() {
    calculateKPIs();
    createOperationChart();
    loadIndependentMonthlyChart();
    renderOpenAuditsTable(); 
}

function calculateKPIs() {
    const filteredByMonth = maintenanceData.filter(row => {
        if (currentSelectedMonth === "All" || !currentSelectedMonth) return true;
        
        let monthName = null;
        if (row.Fecha && typeof row.Fecha === "string" && row.Fecha.length >= 7) {
            const parts = row.Fecha.split("-");
            if (parts.length >= 2) {
                const monthIndex = parseInt(parts[1], 10) - 1;
                if (monthIndex >= 0 && monthIndex < 12) monthName = months[monthIndex];
            }
        }
        if (!monthName && row.Month) monthName = row.Month.trim();

        return monthName && monthName.toLowerCase() === currentSelectedMonth.toLowerCase();
    });

    const totalAuditsCount = filteredByMonth.filter(row => row.Fecha !== null && row.Fecha !== undefined && row.Fecha !== "").length;
    const totalAuditsElem = document.getElementById("totalAudits");
    if (totalAuditsElem) totalAuditsElem.innerText = totalAuditsCount.toLocaleString();

    const openCount = filteredByMonth.filter(row => row["C/O"] && row["C/O"].trim().toLowerCase() === "open").length;
    const openElem = document.getElementById("openCount");
    if (openElem) openElem.innerText = openCount.toLocaleString();

    const closedCount = filteredByMonth.filter(row => row["C/O"] && row["C/O"].trim().toLowerCase() === "closed").length;
    const closedElem = document.getElementById("closedCount");
    if (closedElem) closedElem.innerText = closedCount.toLocaleString();

    const inProcessCount = filteredByMonth.filter(row => row.Status && row.Status.trim().toLowerCase() === "in process").length;
    const inProcessElem = document.getElementById("inProcessCount");
    if (inProcessElem) inProcessElem.innerText = inProcessCount.toLocaleString();

    const progressElem = document.getElementById("progressPercent");
    if (progressElem) {
        if (totalAuditsCount > 0) {
            const ratio = closedCount / totalAuditsCount;
            const percentage = (ratio * 100).toFixed(2) + "%";
            progressElem.innerText = percentage;
        } else {
            progressElem.innerText = "0.00%";
        }
    }
}

async function handleEvidenceCellClick(rowId, currentEvidenceVal, event) {
    if (event && event.target.closest("a")) {
        return;
    }

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/pdf";

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `evidence_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabaseClient.storage
                .from("pdfs")
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                throw new Error("Error uploading file to storage: " + uploadError.message);
            }

            const { data: urlData } = supabaseClient.storage
                .from("pdfs")
                .getPublicUrl(filePath);

            if (!urlData || !urlData.publicUrl) {
                throw new Error("Could not retrieve public URL for the file.");
            }

            const publicUrl = urlData.publicUrl;
            const numericId = parseInt(rowId, 10);

            const { error: updateError } = await supabaseClient
                .from("Auditorias_Gestion_EHS")
                .update({ Evidence: publicUrl })
                .eq('id', numericId);

            if (updateError) {
                throw new Error("Error updating database: " + updateError.message);
            }

            await showAppAlert("PDF evidence successfully uploaded and updated.", "Successful Operation");
            await loadMaintenance();

        } catch (err) {
            console.error("Error uploading evidence:", err);
            await showAppAlert("Error uploading file: " + (err.message || err), "Error");
        }
    };

    fileInput.click();
}
window.handleEvidenceCellClick = handleEvidenceCellClick;

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

    const colSpanCount = isUserLoggedIn ? 12 : 10;

    if (openAudits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colSpanCount}" style="text-align:center; padding:30px; color:#64748B;">No open audits found for ${currentSelectedYear}</td></tr>`;
        return;
    }

    tbody.innerHTML = openAudits.map(row => {
        const primaryKeyVal = row.id !== undefined && row.id !== null ? row.id : (row.Id !== undefined ? row.Id : null);
        const folioVal = row.Folio !== undefined && row.Folio !== null ? row.Folio : "";
        const shiftVal = row.Shift !== undefined ? row.Shift : (row.shift !== undefined ? row.shift : (row.Turno || ""));
        const areaVal = row.Area !== undefined && row.Area !== null ? row.Area : "";
        const ehsNameVal = row.EHSName !== undefined && row.EHSName !== null ? row.EHSName : (row.EhsName || "");
        const gerenteVal = row.Gerente !== undefined && row.Gerente !== null ? row.Gerente : "";
        const fechaVal = row.Fecha !== undefined && row.Fecha !== null ? row.Fecha : "";
        
        let formattedFecha = fechaVal;
        if (fechaVal) {
            const parts = String(fechaVal).split("-");
            if (parts.length === 3) {
                const year = parts[0].slice(-2);
                const monthIndex = parseInt(parts[1], 10) - 1;
                const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const monthStr = monthsShort[monthIndex] || parts[1];
                const day = parts[2];
                formattedFecha = `${day}-${monthStr}-${year}`;
            }
        }

        const statusVal = row.Status !== undefined && row.Status !== null ? row.Status : "";
        const coVal = row["C/O"] !== undefined && row["C/O"] !== null ? row["C/O"] : "";
        
        let pdfVal = row.PDF !== undefined && row.PDF !== null ? row.PDF : "";
        let pdfCellHtml = pdfVal;
        if (pdfVal && (pdfVal.startsWith("http://") || pdfVal.startsWith("https://"))) {
            pdfCellHtml = `<a href="${pdfVal}" target="_blank" title="View Report" style="color: var(--primary); font-size: 16px; text-decoration: none;"><i class="fa-solid fa-file-lines"></i></a>`;
        } else if (pdfVal) {
            pdfCellHtml = `<a href="${pdfVal}" target="_blank" title="${pdfVal}" style="font-size: 16px; color: var(--primary); text-decoration: none;"><i class="fa-solid fa-file-lines" style="color: var(--primary);"></i></a>`;
        }

        let evidenceCellHtml = "";
        if (isUserLoggedIn) {
            let evidenceVal = row.Evidence !== undefined && row.Evidence !== null ? row.Evidence : "";
            let innerEvidenceHtml = "";
            if (evidenceVal && (evidenceVal.startsWith("http://") || evidenceVal.startsWith("https://"))) {
                innerEvidenceHtml = `
                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;" onclick="handleEvidenceCellClick('${primaryKeyVal}', '${evidenceVal}', event)" title="Click to view or change PDF">
                        <a href="${evidenceVal}" target="_blank" title="View Evidence" style="color:var(--primary); font-size: 16px; text-decoration:none;"><i class="fa-solid fa-eye"></i></a>
                        <i class="fa-solid fa-upload" style="font-size: 12px; color: #EF4444;" title="Change file"></i>
                    </div>
                `;
            } else {
                innerEvidenceHtml = `
                    <div style="display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; color: #EF4444;" onclick="handleEvidenceCellClick('${primaryKeyVal}', '', event)" title="Click to upload PDF">
                        <i class="fa-solid fa-cloud-arrow-up" style="font-size: 14px; color: #EF4444;"></i>
                    </div>
                `;
            }
            evidenceCellHtml = `<td data-field="Evidence">${innerEvidenceHtml}</td>`;
        } else {
            evidenceCellHtml = `<td style="display: none;"></td>`;
        }

        let actionCellHtml = "";
        if (isUserLoggedIn) {
            const editButtonHtml = `<button type="button" onclick="enableEditRow(this, '${primaryKeyVal}')" title="Edit" style="background: transparent; border: none; color: #2563EB; cursor: pointer; font-size: 14px; margin-right: 6px;"><i class="fa-solid fa-pen-to-square"></i></button>`;
            const deleteButtonHtml = `<button type="button" onclick="deleteRow('${primaryKeyVal}')" title="Delete" style="background: transparent; border: none; color: #EF4444; cursor: pointer; font-size: 14px;"><i class="fa-solid fa-trash-can"></i></button>`;
            actionCellHtml = `<td style="text-align: center; white-space: nowrap;"><div class="action-buttons-cell">${editButtonHtml}${deleteButtonHtml}</div></td>`;
        } else {
            actionCellHtml = `<td style="display: none;"></td>`;
        }

        return `
            <tr data-id="${primaryKeyVal}">
                <td>${primaryKeyVal}</td>
                <td data-field="Folio">${folioVal}</td>
                <td data-field="Shift">${shiftVal}</td>
                <td data-field="Area">${areaVal}</td>
                <td data-field="EHSName">${ehsNameVal}</td>
                <td data-field="Gerente">${gerenteVal}</td>
                <td data-field="Fecha" data-raw-fecha="${fechaVal}">${formattedFecha}</td>
                <td data-field="Status"><span style="padding: 3px 8px; border-radius: 6px; background: #FEF2F2; color: #DC2626; font-weight: 800; font-size: 10px;">${statusVal}</span></td>
                <td data-field="C/O"><span style="padding: 3px 8px; border-radius: 6px; background: #EFF6FF; color: #2563EB; font-weight: 800; font-size: 10px;">${coVal}</span></td>
                <td>${pdfCellHtml}</td>
                ${evidenceCellHtml}
                ${actionCellHtml}
            </tr>
        `;
    }).join("");

    const rows = tbody.querySelectorAll("tr");
    rows.forEach(row => {
        row.addEventListener("click", (e) => {
            if (e.target.closest("button") || e.target.closest("input") || e.target.closest("select") || e.target.closest("a") || e.target.closest("div[onclick]")) {
                return;
            }

            rows.forEach(r => r.classList.remove("selected-row"));
            row.classList.add("selected-row");

            if (isUserLoggedIn) {
                if (!row.classList.contains("editing-row")) {
                    enableEditRowDirect(row, row.getAttribute("data-id"));
                }
            }
        });
    });
}

function enableEditRowDirect(tr, rowId) {
    if (tr.classList.contains("editing-row")) return;
    
    document.querySelectorAll("#openAuditsTableBody tr.editing-row").forEach(r => {
        if (r !== tr) cancelEditRow(r.querySelector("button[title='Cancel']") || r);
    });

    tr.classList.add("editing-row");
    tr.dataset.originalHtml = tr.innerHTML;

    loadEhsNamesForDropdown();

    const fieldsToEdit = ["Folio", "Shift", "Area", "EHSName", "Gerente", "Fecha", "Evidence"];
    fieldsToEdit.forEach(fieldName => {
        const td = tr.querySelector(`td[data-field="${fieldName}"]`);
        if (td) {
            let currentValue = td.innerText.trim();
            if (fieldName === "Fecha" && td.dataset.rawFecha) {
                currentValue = td.dataset.rawFecha;
            }
            
            if (fieldName === "Evidence") {
                td.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; color: #EF4444;" onclick="handleEvidenceCellClick('${rowId}', '', event)" title="Click to update Evidence file">
                        <i class="fa-solid fa-cloud-arrow-up" style="font-size: 15px; color: #EF4444;"></i>
                        <span style="font-size: 10px; font-weight: 700; text-decoration: underline; color: #EF4444;">Upload/Change</span>
                    </div>
                `;
            } else if (fieldName === "EHSName") {
                td.innerHTML = `<input type="text" list="ehsNameOptions" value="${currentValue}" autocomplete="off" style="width: 100%; padding: 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px;">`;
            } else {
                td.innerHTML = `<input type="text" value="${currentValue}" style="width: 100%; padding: 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px;">`;
            }
        }
    });

    const statusTd = tr.querySelector(`td[data-field="Status"]`);
    if (statusTd) {
        const currentStatus = statusTd.innerText.trim();
        statusTd.innerHTML = `
            <select style="padding: 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px;">
                <option value="In Process" ${currentStatus === "In Process" ? "selected" : ""}>In Process</option>
                <option value="Completed" ${currentStatus === "Completed" ? "selected" : ""}>Completed</option>
                <option value="New" ${currentStatus === "New" ? "selected" : ""}>New</option>
            </select>
        `;
    }

    const coTd = tr.querySelector(`td[data-field="C/O"]`);
    if (coTd) {
        const currentCO = coTd.innerText.trim();
        coTd.innerHTML = `
            <select style="padding: 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px;">
                <option value="Open" ${currentCO === "Open" ? "selected" : ""}>Open</option>
                <option value="Closed" ${currentCO === "Closed" ? "selected" : ""}>Closed</option>
            </select>
        `;
    }

    const actionTd = tr.querySelector("td:last-child");
    if (actionTd) {
        actionTd.innerHTML = `
            <div class="action-buttons-cell">
                <button type="button" onclick="saveEditedRow(this, '${rowId}')" title="Save Changes" style="background:#10B981; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;"><i class="fa-solid fa-floppy-disk"></i></button>
                <button type="button" onclick="cancelEditRow(this)" title="Cancel" style="background:#EF4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `;
    }
}

function enableEditRow(buttonElement, rowId) {
    const tr = buttonElement.closest("tr");
    if (!tr) return;
    enableEditRowDirect(tr, rowId);
}

function cancelEditRow(buttonElement) {
    const tr = buttonElement.closest("tr") || buttonElement;
    if (tr && tr.dataset.originalHtml) {
        tr.innerHTML = tr.dataset.originalHtml;
        tr.classList.remove("editing-row");
    }
}

async function saveEditedRow(buttonElement, rowId) {
    const tr = buttonElement.closest("tr");
    if (!tr) return;

    const updatedData = {};

    const fieldsToEdit = ["Folio", "Shift", "Area", "EHSName", "Gerente", "Fecha"];
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

    const numericId = parseInt(rowId, 10);

    const { data, error } = await supabaseClient
        .from("Auditorias_Gestion_EHS")
        .update(updatedData)
        .eq('id', numericId)
        .select();

    if (error) {
        await showAppAlert("Error updating data in Supabase: " + error.message, "Error");
        return;
    }

    if (!data || data.length === 0) {
        await showAppAlert("Notice: No record found with ID: " + rowId + " to update.", "Notice");
        return;
    }

    await showAppAlert("Data saved and updated correctly", "Success");
    await loadMaintenance();
}

async function deleteRow(rowId) {
    if (!confirm("Are you sure you want to delete this record?")) return;

    const numericId = parseInt(rowId, 10);
    const { error } = await supabaseClient
        .from("Auditorias_Gestion_EHS")
        .delete()
        .eq('id', numericId);

    if (error) {
        await showAppAlert("Error deleting record in Supabase: " + error.message, "Error");
        return;
    }

    await showAppAlert("Record deleted successfully", "Success");
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
        const shiftValue = row.Shift || row.shift || row.TURNO || row.Turno || "Unassigned";
        shiftCounts[shiftValue] = (shiftCounts[shiftValue] || 0) + 1;
    });

    const labels = Object.keys(shiftCounts);
    const dataValues = Object.values(shiftCounts);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { boxWidth: 12, font: { size: 11, weight: '600' } }
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
                color: "#FFFFFF",
                font: { weight: "800", size: 12 },
                formatter: (value) => value
            }
        }
    };

    renderChart("operationChart", {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: [
                    "#2563EB", "#00B8D9", "#7C3AED", "#F59E0B", 
                    "#EF4444", "#10B981", "#6366F1", "#EC4899"
                ],
                borderWidth: 2,
                borderColor: "#FFFFFF"
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
        
        if (row.Fecha && typeof row.Fecha === "string" && row.Fecha.length >= 7) {
            const parts = row.Fecha.split("-");
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

    options.scales.x.ticks.color = "#000000";
    options.scales.x.ticks.font = { size: 11, weight: "normal" };

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

let sessionActiveUser = null;

function setProtectedElementsState(isLoggedIn, userName = "") {
    isUserLoggedIn = isLoggedIn;
    const loginBtn = document.getElementById("loginMenuBtn");
    const logoutBtn = document.getElementById("logoutMenuBtn");
    const statusText = document.getElementById("userStatusText");
    const avatarText = document.getElementById("userAvatarText");
    const addAuditBtn = document.getElementById("addAuditBtn");
    const evidenceHeaderTh = document.getElementById("evidenceHeaderTh");
    const actionsHeaderTh = document.getElementById("actionsHeaderTh");

    if (isLoggedIn) {
        sessionActiveUser = userName;
        if (addAuditBtn) {
            addAuditBtn.style.display = "flex";
            addAuditBtn.removeAttribute("disabled");
            addAuditBtn.style.background = "#2563EB";
            addAuditBtn.style.color = "#FFFFFF";
            addAuditBtn.style.cursor = "pointer";
            addAuditBtn.style.opacity = "1";
            addAuditBtn.style.pointerEvents = "auto";
            addAuditBtn.title = "Add Audit";
        }
        if (evidenceHeaderTh) evidenceHeaderTh.style.display = "";
        if (actionsHeaderTh) actionsHeaderTh.style.display = "";

        if (loginBtn) loginBtn.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "flex";
        if (statusText) {
            statusText.textContent = userName || "Active Session";
            statusText.style.color = "#10B981";
        }
        if (avatarText && userName) avatarText.textContent = userName.substring(0, 2).toUpperCase();
    } else {
        sessionActiveUser = null;
        if (addAuditBtn) {
            addAuditBtn.style.display = "none";
            addAuditBtn.setAttribute("disabled", "true");
            addAuditBtn.style.pointerEvents = "none";
        }
        if (evidenceHeaderTh) evidenceHeaderTh.style.display = "none";
        if (actionsHeaderTh) actionsHeaderTh.style.display = "none";

        if (loginBtn) loginBtn.style.display = "flex";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (statusText) {
            statusText.textContent = "Not Logged In";
            statusText.style.color = "#EF4444";
        }
        if (avatarText) avatarText.textContent = "RC";
    }

    renderOpenAuditsTable();
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
            await showAppAlert("Error verifying credentials: " + error.message, "Error");
            return;
        }

        if (data && data.length > 0) {
            closeLoginModal();
            localStorage.setItem("smrc_logged_user", userInput);
            setProtectedElementsState(true, userInput);
            document.getElementById("loginUser").value = "";
            document.getElementById("loginPassword").value = "";
        } else {
            await showAppAlert("Incorrect username or password.", "Notice");
        }
    } catch (err) {
        console.error("Unexpected error:", err);
        await showAppAlert("An error occurred while trying to log in.", "Error");
    }
}

function handleSignOut() {
    localStorage.removeItem("smrc_logged_user");
    setProtectedElementsState(false);
    const dropdown = document.getElementById("userDropdown");
    if (dropdown) dropdown.style.display = "none";
}

async function handleSaveNewAudit(event) {
    event.preventDefault();

    const saveBtn = document.getElementById("saveAuditBtn");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
    }

    try {
        let pdfPublicUrl = "";

        if (selectedPdfFile) {
            const fileExt = selectedPdfFile.name.split('.').pop();
            const fileName = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from("pdfs")
                .upload(filePath, selectedPdfFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                throw new Error("Error uploading file to storage: " + uploadError.message);
            }

            const { data: urlData } = supabaseClient.storage
                .from("pdfs")
                .getPublicUrl(filePath);

            if (urlData) {
                pdfPublicUrl = urlData.publicUrl;
            }
        }

        const { data: existingRecords, error: fetchError } = await supabaseClient
            .from("Auditorias_Gestion_EHS")
            .select("id");

        if (fetchError) throw fetchError;

        let nextId = 1;
        if (existingRecords && existingRecords.length > 0) {
            const ids = existingRecords.map(r => parseInt(r.id, 10)).filter(n => !isNaN(n));
            if (ids.length > 0) {
                nextId = Math.max(...ids) + 1;
            }
        }

        const newRecord = {
            id: nextId,
            Folio: document.getElementById("inputFolio").value.trim(),
            Plant: "Plant1",
            Shift: document.getElementById("inputShift").value.trim(),
            Area: "Rough Cut",
            EHSName: document.getElementById("inputEhsName").value.trim(),
            Gerente: "Ernesto Guerrero",
            Fecha: document.getElementById("inputFecha").value,
            Status: "New",
            "C/O": "Open",
            PDF: pdfPublicUrl
        };

        const { data, error: insertError } = await supabaseClient
            .from("Auditorias_Gestion_EHS")
            .insert([newRecord])
            .select();

        if (insertError) throw insertError;

        await showAppAlert("Audit and PDF file successfully saved.", "Success");
        closeAddAuditModal();
        await loadMaintenance();

    } catch (err) {
        console.error("Error saving new audit:", err);
        await showAppAlert("An error occurred while saving the record: " + (err.message || err), "Error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Record`;
        }
    }
}

document.addEventListener("DOMContentLoaded", function() {
    populateYearDropdowns();
    setCurrentYear();

    const savedUser = localStorage.getItem("smrc_logged_user");
    if (savedUser) {
        setProtectedElementsState(true, savedUser);
    } else {
        setProtectedElementsState(false);
    }

    const filterBox = document.getElementById("filterBox");
    if (filterBox) {
        filterBox.addEventListener("click", toggleYearDropdown);
    }

    const yearDropdown = document.getElementById("yearDropdown");
    if (yearDropdown) {
        yearDropdown.addEventListener("click", function(event) {
            const option = event.target.closest(".custom-option");
            if (option && option.dataset.year) {
                selectYear(option.dataset.year, event);
            }
        });
    }

    const navRecordsBtn = document.getElementById("navRecordsBtn");
    if (navRecordsBtn) {
        navRecordsBtn.addEventListener("click", function(e) {
            e.preventDefault();
            openRecordsModal();
        });
    }

    const shareXlsBtn = document.getElementById("shareXlsBtn");
    if (shareXlsBtn) {
        shareXlsBtn.addEventListener("click", () => alert('Exporting to XLS...'));
    }

    const sharePdfBtn = document.getElementById("sharePdfBtn");
    if (sharePdfBtn) {
        sharePdfBtn.addEventListener("click", () => alert('Exporting to PDF...'));
    }

    const userAvatarBtn = document.getElementById("userAvatarBtn");
    if (userAvatarBtn) {
        userAvatarBtn.addEventListener("click", function(event) {
            if (event) event.stopPropagation();
            const dropdown = document.getElementById("userDropdown");
            if (dropdown) dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
        });
    }

    const loginMenuBtn = document.getElementById("loginMenuBtn");
    if (loginMenuBtn) {
        loginMenuBtn.addEventListener("click", openLoginPrompt);
    }

    const logoutMenuBtn = document.getElementById("logoutMenuBtn");
    if (logoutMenuBtn) {
        logoutMenuBtn.addEventListener("click", handleSignOut);
    }

    const addAuditBtn = document.getElementById("addAuditBtn");
    if (addAuditBtn) {
        addAuditBtn.addEventListener("click", openAddAuditModal);
    }

    const loginCloseBtn = document.getElementById("loginCloseBtn");
    if (loginCloseBtn) {
        loginCloseBtn.addEventListener("click", closeLoginModal);
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleFormLogin);
    }

    const recordsCloseBtn = document.getElementById("recordsCloseBtn");
    if (recordsCloseBtn) {
        recordsCloseBtn.addEventListener("click", closeRecordsModal);
    }

    const modalYearFilter = document.getElementById("modalYearFilter");
    if (modalYearFilter) {
        modalYearFilter.addEventListener("change", loadModalRecords);
    }

    const modalCellFilter = document.getElementById("modalCellFilter");
    if (modalCellFilter) {
        modalCellFilter.addEventListener("change", filterModalTable);
    }

    const modalGlobalSearch = document.getElementById("modalGlobalSearch");
    if (modalGlobalSearch) {
        modalGlobalSearch.addEventListener("input", filterModalTable);
    }

    const clearFilterBtn = document.getElementById("clearFilterBtn");
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener("click", clearCellFilter);
    }

    const addAuditCloseBtn = document.getElementById("addAuditCloseBtn");
    if (addAuditCloseBtn) {
        addAuditCloseBtn.addEventListener("click", closeAddAuditModal);
    }

    const cancelAuditBtn = document.getElementById("cancelAuditBtn");
    if (cancelAuditBtn) {
        cancelAuditBtn.addEventListener("click", closeAddAuditModal);
    }

    const newAuditForm = document.getElementById("newAuditForm");
    if (newAuditForm) {
        newAuditForm.addEventListener("submit", handleSaveNewAudit);
    }

    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("inputPdfFile");
    const fileNameDisplay = document.getElementById("fileNameDisplay");

    if (dropZone && fileInput) {
        dropZone.addEventListener("click", () => fileInput.click());

        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.style.borderColor = "var(--primary)";
            dropZone.style.background = "#EFF6FF";
        });

        dropZone.addEventListener("dragleave", (e) => {
            e.preventDefault();
            dropZone.style.borderColor = "#CBD5E1";
            dropZone.style.background = "#F8FAFC";
        });

        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.style.borderColor = "#CBD5E1";
            dropZone.style.background = "#F8FAFC";
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                selectedPdfFile = e.dataTransfer.files[0];
                if (fileNameDisplay) fileNameDisplay.textContent = `Selected file: ${selectedPdfFile.name}`;
            }
        });

        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files.length > 0) {
                selectedPdfFile = e.target.files[0];
                if (fileNameDisplay) fileNameDisplay.textContent = `Selected file: ${selectedPdfFile.name}`;
            }
        });
    }
});

document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("recordsModal");
    if (!modal || modal.style.display !== "flex") return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const rows = Array.from(document.querySelectorAll("#modalTableBody tr"));
        if (rows.length === 0) return;

        let currentIndex = rows.findIndex(r => r.classList.contains("selected-row"));

        if (currentIndex === -1) {
            currentIndex = 0;
        } else {
            rows[currentIndex].classList.remove("selected-row");
            if (e.key === "ArrowDown") {
                currentIndex = (currentIndex + 1) % rows.length;
            } else {
                currentIndex = (currentIndex - 1 + rows.length) % rows.length;
            }
        }

        const targetRow = rows[currentIndex];
        targetRow.classList.add("selected-row");
        targetRow.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
});

window.addEventListener("click", function(event) {
    const modal = document.getElementById("recordsModal");
    const loginModal = document.getElementById("loginModal");
    const addAuditModal = document.getElementById("addAuditModal");
    const userDropdown = document.getElementById("userDropdown");
    const avatarContainer = document.querySelector(".user-menu-container");
    const yearDropdown = document.getElementById("yearDropdown");
    const filterBox = document.getElementById("filterBox");

    if (event.target === modal) closeRecordsModal();
    if (event.target === loginModal) closeLoginModal();
    if (event.target === addAuditModal) closeAddAuditModal();

    if (userDropdown && avatarContainer && !avatarContainer.contains(event.target)) {
        userDropdown.style.display = "none";
    }

    if (yearDropdown && filterBox && !filterBox.contains(event.target)) {
        yearDropdown.style.display = "none";
    }
});

document.addEventListener("contextmenu", (e) => { e.preventDefault(); });
document.addEventListener("selectstart", (e) => { e.preventDefault(); });
document.addEventListener("copy", (e) => { e.preventDefault(); });
document.addEventListener("cut", (e) => { e.preventDefault(); });
document.addEventListener("dragstart", (e) => { e.preventDefault(); });

document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("recordsModal");
    const isModalOpen = modal && modal.style.display === "flex";
    if (isModalOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) return;

    const key = e.key.toLowerCase();
    if (e.key === "F12") { e.preventDefault(); return; }
    if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) { e.preventDefault(); return; }
    if (e.ctrlKey && key === "u") { e.preventDefault(); return; }
    if (e.ctrlKey && key === "c") { e.preventDefault(); return; }
    if (e.ctrlKey && key === "x") { e.preventDefault(); return; }
    if (e.ctrlKey && key === "s") { e.preventDefault(); return; }
    if (e.ctrlKey && key === "a") { e.preventDefault(); return; }
});