const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let maintenanceData = [];
let activeCharts = {};
let currentSelectedYear = "2026";
let currentSelectedMonth = "All";
let modalRawData = [];
let isUserLoggedIn = false; // Estado global de sesión

const desiredModalColumns = ["Id", "Folio", "Plant", "Shift", "Area", "EHSName", "Gerente", "Fecha", "Status", "C/O"];

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

// FUNCIONES PARA EL MODAL DE AGREGAR AUDITORÍA (HallazgosEHSIngresar.html)
function openAddAuditModal() {
    const modal = document.getElementById("addAuditModal");
    const iframe = document.getElementById("addAuditFrame");
    if (iframe && (!iframe.src || iframe.src === "" || iframe.src === window.location.href)) {
        iframe.src = "HallazgosEHSIngresar.html";
    }
    if (modal) modal.style.display = "flex";
}

function closeAddAuditModal() {
    const modal = document.getElementById("addAuditModal");
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
        return row.Year == selectedYear || (row.Fecha && row.Fecha.startsWith(selectedYear));
    });

    if (modalRawData.length === 0) {
        thead.innerHTML = "<th>No Data</th>";
        tbody.innerHTML = `<tr><td style="text-align:center; padding:40px;">No records found for <strong>${selectedYear}</strong></td></tr>`;
        if (counter) counter.textContent = "0 records";
        return;
    }

    thead.innerHTML = desiredModalColumns.map(key => `<th>${key}</th>`).join("");
    filterModalTable();
}

function filterModalTable() {
    const cellFilterElem = document.getElementById("modalCellFilter");
    const selectedCell = cellFilterElem ? cellFilterElem.value : "";
    const tbody = document.getElementById("modalTableBody");
    const counter = document.getElementById("recordsCount");

    if (!tbody) return;

    const filtered = selectedCell ? modalRawData.filter(row => row.Maq === selectedCell) : modalRawData;
    if (counter) counter.textContent = `${filtered.length.toLocaleString()} records`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="100" style="text-align:center; padding:40px;">No records match the selected cell.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(row => 
        `<tr>${desiredModalColumns.map(key => `<td>${row[key] !== null && row[key] !== undefined ? row[key] : ""}</td>`).join("")}</tr>`
    ).join("");
}

function toggleYearDropdown(event) {
    if (event) event.stopPropagation();
}

window.addEventListener("click", function(event) {
    const modal = document.getElementById("recordsModal");
    const loginModal = document.getElementById("loginModal");
    const addAuditModal = document.getElementById("addAuditModal");
    const userDropdown = document.getElementById("userDropdown");
    const avatarContainer = document.querySelector(".user-menu-container");

    if (event.target === modal) closeRecordsModal();
    if (event.target === loginModal) closeLoginModal();
    if (event.target === addAuditModal) closeAddAuditModal();

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
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px; color:#64748B;">No open audits found for ${currentSelectedYear}</td></tr>`;
        return;
    }

    tbody.innerHTML = openAudits.map(row => {
        const primaryKeyVal = row.Id !== undefined && row.Id !== null ? row.Id : (row.id !== undefined ? row.id : null);
        const folioVal = row.Folio !== undefined && row.Folio !== null ? row.Folio : "";
        const shiftVal = row.Shift !== undefined ? row.Shift : (row.shift !== undefined ? row.shift : (row.Turno || ""));
        const areaVal = row.Area !== undefined && row.Area !== null ? row.Area : "";
        const ehsNameVal = row.EHSName !== undefined && row.EHSName !== null ? row.EHSName : (row.EhsName || "");
        const gerenteVal = row.Gerente !== undefined && row.Gerente !== null ? row.Gerente : "";
        const fechaVal = row.Fecha !== undefined && row.Fecha !== null ? row.Fecha : "";
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
                <td data-field="Fecha">${fechaVal}</td>
                <td data-field="Status"><span style="padding: 3px 8px; border-radius: 6px; background: #FEF2F2; color: #DC2626; font-weight: 800; font-size: 10px;">${statusVal}</span></td>
                <td data-field="C/O"><span style="padding: 3px 8px; border-radius: 6px; background: #EFF6FF; color: #2563EB; font-weight: 800; font-size: 10px;">${coVal}</span></td>
                <td>${pdfCellHtml}</td>
                <td style="text-align: center;">${editButtonHtml}</td>
            </tr>
        `;
    }).join("");
}

function enableEditRow(buttonElement, rowId) {
    const tr = buttonElement.closest("tr");
    if (!tr) return;

    const fieldsToEdit = ["Folio", "Shift", "Area", "EHSName", "Gerente", "Fecha"];
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
                <option value="In Process" ${currentStatus === "In Process" ? "selected" : ""}>In Process</option>
                <option value="Completed" ${currentStatus === "Completed" ? "selected" : ""}>Completed</option>
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

    const { error } = await supabaseClient
        .from("Auditorias_Gestion_EHS")
        .update(updatedData)
        .eq('id', rowId);

    if (error) {
        alert("Error al actualizar los datos en Supabase: " + error.message);
        return;
    }

    alert("Data saved and updated correctly");
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

let sessionActiveUser = null;

function setProtectedElementsState(isLoggedIn, userName = "") {
    isUserLoggedIn = isLoggedIn;
    const loginBtn = document.getElementById("loginMenuBtn");
    const logoutBtn = document.getElementById("logoutMenuBtn");
    const statusText = document.getElementById("userStatusText");
    const avatarText = document.getElementById("userAvatarText");
    const addAuditBtn = document.getElementById("addAuditBtn");

    if (isLoggedIn) {
        sessionActiveUser = userName;
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
            localStorage.setItem("smrc_logged_user", userInput);
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
    localStorage.removeItem("smrc_logged_user");
    setProtectedElementsState(false);
    const dropdown = document.getElementById("userDropdown");
    if (dropdown) dropdown.style.display = "none";
}

window.addEventListener("load", function() {
    setCurrentYear();
    const savedUser = localStorage.getItem("smrc_logged_user");
    if (savedUser) {
        setProtectedElementsState(true, savedUser);
    } else {
        setProtectedElementsState(false);
    }
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