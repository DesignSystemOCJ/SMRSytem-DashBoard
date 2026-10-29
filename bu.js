const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let maintenanceData = [];
let activeCharts = {};
let selectedMachine = null;
let currentSelectedMonth = "";
let selectedWeek = null;
let selectedDay = null; 
let modalRawData = [];
let columnFilters = {}; 
let selectedModalRowElement = null; 
let performanceViewMode = "balance_uniformity"; 
let sessionActiveUser = null;

const MACHINES = ["C01","C02","C03","C04","C05","C06","C07","C08","C09","C10","C11","C12","C13","C14","C15","C16","C17","C18","C19","C20","C21","C22","C23","C24","C25","C26","C27","C28","C29","C30","C33","C34","C35","C36"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

Chart.defaults.font.family = '"Segoe UI", Inter, Arial, sans-serif';
Chart.defaults.color = "#000000";
Chart.defaults.animation.duration = 600;

function setModalDisplay(modalId, displayValue) {
    document.getElementById(modalId)?.style.setProperty("display", displayValue);
}

function parseNum(val) {
    return parseFloat(val) || 0;
}

function renderDynamicComponents() {
    const kpiContainer = document.getElementById("kpiGridContainer");
    if (!kpiContainer) return;

    const kpiData = [
        { id: "totalIssues", icon: "fa-solid fa-triangle-exclamation", type: "danger", label: "TOTAL B&U", sub: "Scrap Events", val: "0" },
        { id: "topCell", icon: "fa-solid fa-industry", type: "blue", label: "BALANCE", sub: "Balance Total", val: "0" },
        { id: "topIssue", icon: "fa-solid fa-screwdriver-wrench", type: "orange", label: "UNIFORMITY", sub: "Uniformity Total", val: "0" },
        { id: "topOperation", icon: "fa-solid fa-gears", type: "purple", label: "%B&U", sub: "Average Balance & Uniformity", val: "0.00%" }
    ];

    kpiContainer.innerHTML = kpiData.map(kpi => `
        <article class="kpi-card">
            <div class="kpi-icon ${kpi.type}"><i class="${kpi.icon}"></i></div>
            <div class="kpi-content">
                <span class="kpi-label">${kpi.label}</span>
                <strong id="${kpi.id}">${kpi.val}</strong>
                <small>${kpi.sub}</small>
            </div>
        </article>
    `).join("");
}

async function fetchAllSupabaseData(queryBuilderFn) {
    let allData = [];
    const pageSize = 1000;
    let from = 0;
    let moreData = true;

    try {
        while (moreData) {
            const query = queryBuilderFn(supabaseClient.from("bu")).range(from, from + pageSize - 1);
            const { data, error } = await query;
            if (error) throw error;
            if (data?.length > 0) {
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

function populateMonthDropdowns() {
    const monthContainer = document.getElementById("monthOptionsContainer");
    if (monthContainer) {
        monthContainer.innerHTML = MONTHS.map(m => `<div class="custom-option month-option-item" data-month="${m}">${m}</div>`).join("");
    }
    const modalSelect = document.getElementById("modalMonthFilter");
    if (modalSelect) {
        modalSelect.innerHTML = MONTHS.map(m => `<option value="${m}">${m}</option>`).join("");
    }
    const exportMonthSelect = document.getElementById("exportMonthSelect");
    if (exportMonthSelect) {
        exportMonthSelect.innerHTML = MONTHS.map(m => `<option value="${m}">${m}</option>`).join("");
    }
}

function setCurrentMonth() {
    const month = MONTHS[new Date().getMonth()] || "August";
    selectMonth(month);
    const modalSelect = document.getElementById("modalMonthFilter");
    if (modalSelect) modalSelect.value = month;
    populateModalCellFilter();
}

function populateModalCellFilter() {
    const cellSelect = document.getElementById("modalCellFilter");
    if (!cellSelect) return;
    cellSelect.innerHTML = '<option value="">All Cells</option>' + MACHINES.map(m => `<option value="${m}">${m}</option>`).join("");
}

function openRecordsModal() {
    setModalDisplay("recordsModal", "flex");
    const currentMonth = currentSelectedMonth || MONTHS[new Date().getMonth()];
    const modalMonthFilter = document.getElementById("modalMonthFilter");
    if (modalMonthFilter) modalMonthFilter.value = currentMonth;
    loadModalRecords();
}

function closeRecordsModal() { setModalDisplay("recordsModal", "none"); }
function openExportRangeModal() { setModalDisplay("exportRangeModal", "flex"); }
function closeExportRangeModal() { setModalDisplay("exportRangeModal", "none"); }
function closeLoginModal() { setModalDisplay("loginModal", "none"); }
function openLoginPrompt() {
    setModalDisplay("userDropdown", "none");
    setModalDisplay("loginModal", "flex");
}

function clearCellFilter() {
    const cellFilter = document.getElementById("modalCellFilter");
    if (cellFilter) cellFilter.value = "";
    columnFilters = {};
    document.querySelectorAll(".modal-table-container th input").forEach(input => input.value = "");
    filterModalTable();
}

async function loadModalRecords() {
    const selectedMonth = document.getElementById("modalMonthFilter")?.value || "August";
    const tbody = document.getElementById("modalTableBody");
    const thead = document.getElementById("modalTableHeaders");
    const counter = document.getElementById("recordsCount");

    if (!tbody || !thead) return;

    tbody.innerHTML = `<tr><td colspan="100" class="loading-table">Loading records...</td></tr>`;
    if (counter) counter.textContent = "Loading records...";

    const { data, error } = await fetchAllSupabaseData(q => q.select("*").eq("Month", selectedMonth));

    if (error) {
        tbody.innerHTML = `<tr><td colspan="100" style="text-align:center; padding:40px; color:#EF4444;"><i class="fa-solid fa-circle-exclamation"></i> Error loading data.</td></tr>`;
        if (counter) counter.textContent = "Unable to load records";
        return;
    }

    modalRawData = data || [];
    columnFilters = {};

    if (modalRawData.length === 0) {
        thead.innerHTML = "<th>No Data</th>";
        tbody.innerHTML = `<tr><td style="text-align:center; padding:40px;">No records found for <strong>${selectedMonth}</strong></td></tr>`;
        if (counter) counter.textContent = "0 records";
        return;
    }

    const keys = Object.keys(modalRawData[0]);
    thead.innerHTML = keys.map(k => `
        <th>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                <span>${k}</span>
                <input type="text" placeholder="Filter..." data-column="${k}" class="column-filter-input" 
                    style="padding: 4px 6px; font-size: 10px; font-weight: normal; border: 1px solid #CBD5E1; border-radius: 4px; outline: none; width: 100%; text-align: center;">
            </div>
        </th>
    `).join("");

    document.querySelectorAll(".column-filter-input").forEach(input => {
        input.addEventListener("input", handleColumnFilterInput);
    });

    filterModalTable();
}

function handleColumnFilterInput(event) {
    const column = event.target.getAttribute("data-column");
    const value = event.target.value.toLowerCase().trim();
    if (value) columnFilters[column] = value;
    else delete columnFilters[column];
    filterModalTable();
}

function filterModalTable() {
    const selectedCell = document.getElementById("modalCellFilter")?.value || "";
    const tbody = document.getElementById("modalTableBody");
    const counter = document.getElementById("recordsCount");
    if (!tbody) return;

    let filtered = modalRawData.filter(r => {
        if (selectedCell && r.Maq !== selectedCell) return false;
        for (const [col, filterVal] of Object.entries(columnFilters)) {
            if (!String(r[col] ?? "").toLowerCase().includes(filterVal)) return false;
        }
        return true;
    });

    if (counter) counter.textContent = `${filtered.length.toLocaleString()} records`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="100" style="text-align:center; padding:40px;">No records match the selected filters.</td></tr>`;
        return;
    }

    const keys = modalRawData.length > 0 ? Object.keys(modalRawData[0]) : [];
    
    const formatDateToCustom = (dateStr) => {
        if (!dateStr) return "";
        const parts = String(dateStr).split("-");
        if (parts.length === 3) {
            const year = parts[0].slice(-2);
            const monthIdx = parseInt(parts[1], 10) - 1;
            const monthStr = MONTH_NAMES_SHORT[monthIdx] || parts[1];
            const day = parts[2];
            return `${day}-${monthStr}-${year}`;
        }
        return dateStr;
    };

    tbody.innerHTML = filtered.map((row, index) => `
        <tr class="modal-data-row" data-index="${index}">
            ${keys.map(k => {
                let cellValue = row[k] ?? "";
                if (k.toLowerCase() === 'date') cellValue = formatDateToCustom(cellValue);
                return `<td>${cellValue}</td>`;
            }).join("")}
        </tr>
    `).join("");

    document.querySelectorAll(".modal-data-row").forEach(rowEl => {
        rowEl.addEventListener("click", function() {
            highlightModalRow(this);
        });
    });

    selectedModalRowElement = null;
}

function highlightModalRow(rowElement) {
    if (selectedModalRowElement) selectedModalRowElement.classList.remove("selected-modal-row");
    rowElement.classList.add("selected-modal-row");
    selectedModalRowElement = rowElement;
}

function toggleExportInputs() {
    const type = document.getElementById("exportFilterType").value;
    document.getElementById("filterRangeContainer").style.display = type === "range" ? "block" : "none";
    document.getElementById("filterDayContainer").style.display = type === "day" ? "block" : "none";
    document.getElementById("filterMonthContainer").style.display = type === "month" ? "block" : "none";
}

function exportCurrentTableToExcel() {
    if (!modalRawData?.length) { alert("No visible records to export."); return; }
    downloadStyledExcel(modalRawData, "Current_Maintenance_Report.xlsx");
}

async function processAndExportCustomData() {
    const filterType = document.getElementById('exportFilterType').value;
    let query = supabaseClient.from("bu").select("*");

    if (filterType === 'range') {
        const start = document.getElementById('exportDateStart').value;
        const end = document.getElementById('exportDateEnd').value;
        if (!start || !end) { alert("Please select both dates."); return; }
        query = query.gte("Date", start).lte("Date", end);
    } else if (filterType === 'day') {
        const day = document.getElementById('exportSingleDay').value;
        if (!day) { alert("Please select a day."); return; }
        query = query.eq("Date", day);
    } else if (filterType === 'month') {
        query = query.eq("Month", document.getElementById('exportMonthSelect').value);
    }

    const { data, error } = await query;
    if (error) { alert("Error fetching data: " + error.message); return; }
    if (!data?.length) { alert("No records found."); return; }

    closeExportRangeModal();
    downloadStyledExcel(data, `Maintenance_Report_${filterType}.xlsx`);
}

function exportDashboardToPDF() {
    const element = document.querySelector(".dashboard-container");
    if (!element) { alert("Dashboard container not found."); return; }

    const loadingAlert = document.createElement("div");
    loadingAlert.style.cssText = "position:fixed; bottom:20px; right:20px; padding:12px 20px; background:#2563EB; color:#FFF; border-radius:8px; z-index:5000; font-weight:bold;";
    loadingAlert.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando PDF...';
    document.body.appendChild(loadingAlert);

    html2pdf().from(element).set({
        margin: 1, filename: 'Maintenance_Intelligence_Report.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    }).save().then(() => loadingAlert.remove()).catch(() => {
        loadingAlert.remove();
        alert("Hubo un error al generar el PDF.");
    });
}

async function downloadStyledExcel(dataArray, filename = "Maintenance_Report.xlsx") {
    if (!dataArray?.length) return;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Records");
    const keys = Object.keys(dataArray[0]);
    
    worksheet.addRow(keys);
    const headerRow = worksheet.getRow(1);
    headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2D2DFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    dataArray.forEach(item => worksheet.addRow(keys.map(key => item[key] ?? "")));

    worksheet.eachRow((row, rowNumber) => {
        row.eachCell(cell => {
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            if (rowNumber > 1) {
                cell.font = { name: 'Segoe UI', size: 10 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function handleDataClick() {
    if (sessionActiveUser) {
        document.getElementById("dataIframe").src = "uploadbu.html";
        setModalDisplay("dataModal", "flex");
    } else {
        alert('You must log in to access this option.');
    }
}

function closeDataModal() {
    setModalDisplay("dataModal", "none");
    document.getElementById("dataIframe").src = "";
}

window.addEventListener("click", function(event) {
    if (event.target === document.getElementById("recordsModal")) closeRecordsModal();
    if (event.target === document.getElementById("loginModal")) closeLoginModal();
    if (event.target === document.getElementById("dataModal")) closeDataModal();
    if (event.target === document.getElementById("exportRangeModal")) closeExportRangeModal();

    if (!document.querySelector(".user-menu-container")?.contains(event.target)) {
        setModalDisplay("userDropdown", "none");
    }

    if (!document.getElementById("daySelectorWrapper")?.contains(event.target)) {
        setModalDisplay("dayDropdownMenu", "none");
    }

    if (!document.getElementById("filterBox")?.contains(event.target)) {
        setModalDisplay("monthDropdown", "none");
    }
});

function selectMonth(monthName, event) {
    event?.stopPropagation();
    currentSelectedMonth = monthName;
    const monthTextElement = document.getElementById("selectedMonthText");
    if (monthTextElement) monthTextElement.innerText = monthName;

    document.querySelectorAll(".month-option-item").forEach(opt => {
        if (opt.getAttribute("data-month") === monthName) {
            opt.classList.add("selected");
        } else {
            opt.classList.remove("selected");
        }
    });

    setModalDisplay("monthDropdown", "none");
    loadMaintenance();
}

async function loadMaintenance() {
    if (!currentSelectedMonth) return;
    const { data, error } = await fetchAllSupabaseData(q => q.select("*").eq("Month", currentSelectedMonth));
    if (error) { alert("Error loading Supabase data."); return; }

    maintenanceData = data || [];
    selectedMachine = null;
    selectedWeek = null; 
    selectedDay = null; 
    
    renderWeekButtons(); 
    renderDayDropdownOptions(); 
    updateDashboard();
}

function renderWeekButtons() {
    const container = document.getElementById("weekButtonsContainer");
    if (!container) return;

    const weeksSet = new Set();
    maintenanceData.forEach(row => {
        if (row.Week != null && String(row.Week).trim() !== "") {
            weeksSet.add(String(row.Week).trim());
        }
    });

    const uniqueWeeks = Array.from(weeksSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    if (uniqueWeeks.length === 0) {
        container.innerHTML = `<span style="font-size: 11px; color: #94A3B8; font-weight: 600;">No weeks available</span>`;
        return;
    }

    let html = `<button class="week-pill-btn ${selectedWeek === null ? 'active' : ''}" data-week="null">All Weeks</button>`;
    html += uniqueWeeks.map(week => `<button class="week-pill-btn ${selectedWeek === week ? 'active' : ''}" data-week="${week}">Week ${week}</button>`).join("");
    container.innerHTML = html;

    container.querySelectorAll(".week-pill-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const w = this.getAttribute("data-week");
            filterByWeek(w === "null" ? null : w);
        });
    });
}

function filterByWeek(week) {
    selectedWeek = week;
    selectedDay = null; 
    renderWeekButtons();
    renderDayDropdownOptions(); 
    updateDashboard();
}

function renderDayDropdownOptions() {
    const container = document.getElementById("dayOptionsContainer");
    const dayTextElem = document.getElementById("selectedDayText");
    const dayBtnElem = document.getElementById("selectedDayTextBtn");
    if (!container) return;

    let baseData = maintenanceData;
    if (selectedWeek) {
        baseData = baseData.filter(row => String(row.Week).trim() === String(selectedWeek));
    }

    const daysSet = new Set();
    baseData.forEach(row => {
        if (row.Date != null && String(row.Date).trim() !== "") {
            daysSet.add(String(row.Date).trim());
        }
    });

    const uniqueDays = Array.from(daysSet).sort((a, b) => new Date(a) - new Date(b));

    if (selectedDay === null) {
        if (dayTextElem) dayTextElem.innerText = `All Days (${currentSelectedMonth})`;
        dayBtnElem?.classList.remove("active-day");
    } else {
        const parts = selectedDay.split("-");
        const formatted = parts.length === 3 ? `${parseInt(parts[2], 10)} ${MONTH_NAMES_SHORT[parseInt(parts[1], 10) - 1] || ""}` : selectedDay;
        if (dayTextElem) dayTextElem.innerText = formatted;
        dayBtnElem?.classList.add("active-day");
    }

    if (uniqueDays.length === 0) {
        container.innerHTML = `<div style="padding: 8px 12px; font-size: 11px; color: #94A3B8;">No days available</div>`;
        return;
    }

    let html = `<div class="day-dropdown-option ${selectedDay === null ? 'selected' : ''}" data-day="null"><span>All Days</span></div>`;
    html += uniqueDays.map(day => {
        const parts = day.split("-");
        const formattedLabel = parts.length === 3 ? `${parseInt(parts[2], 10)} ${MONTH_NAMES_SHORT[parseInt(parts[1], 10) - 1] || ""}` : day;
        const isSelected = selectedDay === day ? 'selected' : '';
        return `<div class="day-dropdown-option ${isSelected}" data-day="${day}"><span>${formattedLabel}</span></div>`;
    }).join("");
    container.innerHTML = html;

    container.querySelectorAll(".day-dropdown-option").forEach(opt => {
        opt.addEventListener("click", function() {
            const d = this.getAttribute("data-day");
            filterByDay(d === "null" ? null : d);
            setModalDisplay("dayDropdownMenu", "none");
        });
    });
}

function filterByDay(day) {
    selectedDay = day;
    renderDayDropdownOptions();
    updateDashboard();
}

function getActiveFilteredData() {
    let filtered = maintenanceData;
    if (selectedWeek) filtered = filtered.filter(row => String(row.Week).trim() === String(selectedWeek));
    if (selectedDay) filtered = filtered.filter(row => String(row.Date).trim() === String(selectedDay));
    return filtered;
}

function updateDashboard() {
    calculateKPIs();
    createOperationChart();
    loadIndependentMonthlyChart();
    createCellChart();
    createIssueChart();
    createMachineChart();
}

async function calculateKPIs() {
    const activeData = getActiveFilteredData();
    const totalIssuesElem = document.getElementById("totalIssues");
    
    let totalQtySum = 0, totalQtyB = 0, totalQtyU = 0;

    activeData.forEach(row => {
        const qty = parseNum(row.Qty);
        totalQtySum += qty;
        const typeValue = row.Type ? String(row.Type).toUpperCase() : "";
        if (typeValue.includes("B")) totalQtyB += qty;
        if (typeValue.includes("U")) totalQtyU += qty;
    });

    if (totalIssuesElem) totalIssuesElem.innerText = totalQtySum.toLocaleString();
    if (document.getElementById("topCell")) document.getElementById("topCell").innerText = totalQtyB.toLocaleString();
    if (document.getElementById("topIssue")) document.getElementById("topIssue").innerText = totalQtyU.toLocaleString();

    const topOpElem = document.getElementById("topOperation");
    if (topOpElem) {
        try {
            const { data: percentData } = await supabaseClient
                .from("bupercen")
                .select("Percent, Week, Date")
                .eq("Month", currentSelectedMonth);

            if (percentData?.length > 0) {
                let filteredPercentData = selectedWeek ? percentData.filter(item => String(item.Week).trim() === String(selectedWeek)) : percentData;
                if (selectedDay) filteredPercentData = filteredPercentData.filter(item => String(item.Date).trim() === String(selectedDay));

                let sumPercent = 0, countPercent = 0;
                filteredPercentData.forEach(item => {
                    const val = parseNum(item.Percent);
                    if (!isNaN(val)) { sumPercent += val; countPercent++; }
                });

                topOpElem.innerText = countPercent > 0 ? (sumPercent / countPercent * 100).toFixed(2) + "%" : "0.00%";
            } else {
                topOpElem.innerText = "0.00%";
            }
        } catch {
            topOpElem.innerText = "0.00%";
        }
    }
}

function renderChart(canvasId, config) {
    if (activeCharts[canvasId]) activeCharts[canvasId].destroy();
    const canvas = document.getElementById(canvasId);
    if (canvas) activeCharts[canvasId] = new Chart(canvas, config);
}

function baseChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "#07111F", titleColor: "#FFFFFF", bodyColor: "#CBD5E1",
                borderColor: "rgba(255,255,255,.1)", borderWidth: 1, padding: 12, cornerRadius: 10, displayColors: true
            },
            datalabels: { color: "#000000", anchor: "end", align: "top", offset: 4, font: { weight: "normal", size: 11 } }
        },
        scales: {
            y: { beginAtZero: true, grace: "15%", ticks: { precision: 0, color: "#000000", font: { size: 11, weight: "normal" } }, grid: { color: "rgba(148,163,184,.13)" }, border: { display: false } },
            x: { ticks: { color: "#000000", font: { size: 11, weight: "normal" }, maxRotation: 45, minRotation: 30 }, grid: { display: false }, border: { display: false } }
        }
    };
}

function createOperationChart() {
    const modelTotals = {};
    getActiveFilteredData().forEach(row => {
        if (row.Type && String(row.Type).toUpperCase().includes("B")) {
            const modelName = row.Model ? String(row.Model).trim() : "Unassigned";
            modelTotals[modelName] = (modelTotals[modelName] || 0) + parseNum(row.Qty);
        }
    });

    const sortedTop10 = Object.entries(modelTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
    renderChart("operationChart", {
        type: "bar",
        data: { 
            labels: sortedTop10.map(i => i[0]), 
            datasets: [{ label: "Qty Sum (Top 10 B)", data: sortedTop10.map(i => i[1]), backgroundColor: "rgba(37, 99, 235, 0.55)", hoverBackgroundColor: "#2563EB", borderRadius: 7, borderSkipped: false, barPercentage: .68 }] 
        },
        options: baseChartOptions(),
        plugins: [ChartDataLabels]
    });
}

async function loadIndependentMonthlyChart() {
    const cellTotals = {};
    getActiveFilteredData().forEach(row => {
        if (row.Type && String(row.Type).toUpperCase().includes("B")) {
            const cellName = row.Cell ? String(row.Cell).trim() : (row.Maq ? String(row.Maq).trim() : "Unassigned");
            cellTotals[cellName] = (cellTotals[cellName] || 0) + parseNum(row.Qty);
        }
    });

    const sortedTop10 = Object.entries(cellTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
    renderChart("monthlyIssuesChart", {
        type: "bar",
        data: { 
            labels: sortedTop10.map(i => i[0]), 
            datasets: [{ label: "Top 10 Qty (Type B)", data: sortedTop10.map(i => i[1]), backgroundColor: "rgba(124, 58, 237, 0.55)", hoverBackgroundColor: "#7C3AED", borderRadius: 7, borderSkipped: false, barPercentage: 0.68 }] 
        },
        options: baseChartOptions(),
        plugins: [ChartDataLabels]
    });
}

async function createCellChart() {
    const modelTotals = {};
    getActiveFilteredData().forEach(row => {
        if (row.Type && String(row.Type).toUpperCase().includes("U")) {
            const modelName = row.Model ? String(row.Model).trim() : "Unassigned";
            modelTotals[modelName] = (modelTotals[modelName] || 0) + parseNum(row.Qty);
        }
    });

    const sortedTop10 = Object.entries(modelTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const options = baseChartOptions();
    options.scales.x.ticks.autoSkip = true;
    options.scales.x.ticks.maxTicksLimit = 10;

    renderChart("cellChart", {
        type: "bar",
        data: { 
            labels: sortedTop10.map(i => i[0]), 
            datasets: [{ label: "Top 10 Qty (Type U)", data: sortedTop10.map(i => i[1]), backgroundColor: "rgba(37, 99, 235, 0.55)", hoverBackgroundColor: "#2563EB", borderRadius: 7, borderSkipped: false, barPercentage: 0.68 }] 
        },
        options,
        plugins: [ChartDataLabels]
    });
}

function createIssueChart() {
    const cellTotals = {};
    getActiveFilteredData().forEach(row => {
        if (row.Type && String(row.Type).toUpperCase().includes("U")) {
            const cellName = row.Cell ? String(row.Cell).trim() : (row.Maq ? String(row.Maq).trim() : "Unassigned");
            cellTotals[cellName] = (cellTotals[cellName] || 0) + parseNum(row.Qty);
        }
    });

    const sortedTop10 = Object.entries(cellTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const values = sortedTop10.map(i => i[1]);

    renderChart("issueChart", {
        type: "bar",
        data: {
            labels: sortedTop10.map(i => i[0]),
            datasets: [{
                label: "Top 10 Qty (Type U)",
                data: values,
                backgroundColor: values.map((_, i) => i === 0 ? "rgba(245, 158, 11, 0.65)" : "rgba(37, 99, 235, 0.55)"),
                hoverBackgroundColor: "#2563EB", borderRadius: 7, borderSkipped: false, barPercentage: 0.68
            }]
        },
        options: baseChartOptions(),
        plugins: [ChartDataLabels]
    });
}

function setPerformanceMode(mode, event) {
    event?.stopPropagation();
    performanceViewMode = mode;
    const title = document.getElementById("machineChartTitle");

    document.querySelectorAll(".perf-mode-btn").forEach(btn => {
        if (btn.getAttribute("data-mode") === mode) {
            btn.style.backgroundColor = "#2563EB";
            btn.style.color = "white";
            btn.style.border = "none";
            btn.style.boxShadow = "0 2px 4px rgba(37,99,235,0.2)";
        } else {
            btn.style.backgroundColor = "#F1F5F9";
            btn.style.color = "#475569";
            btn.style.border = "1px solid #CBD5E1";
            btn.style.boxShadow = "none";
        }
    });

    const titles = {
        'daily_perf': '<i class="fa-solid fa-robot"></i>Dayly Percent Performance',
        'balance_uniformity': '<i class="fa-solid fa-robot"></i>Rendimiento Diario: Balance y Uniformidad',
        'monthly_overview': '<i class="fa-solid fa-robot"></i>Monthly Performance Overview'
    };

    if (titles[mode] && title) title.innerHTML = titles[mode];
    createMachineChart();
}

async function createMachineChart() {
    try {
        if (performanceViewMode === 'balance_uniformity') {
            const { data: percentData } = await supabaseClient.from("bupercen").select("*").eq("Month", currentSelectedMonth);
            let activePercentData = percentData || [];
            if (selectedWeek) activePercentData = activePercentData.filter(item => String(item.Week).trim() === String(selectedWeek));
            if (selectedDay) activePercentData = activePercentData.filter(item => String(item.Date).trim() === String(selectedDay));
            activePercentData.sort((a, b) => new Date(a.Date) - new Date(b.Date));

            const { data: buData } = await fetchAllSupabaseData(q => q.select("*").eq("Month", currentSelectedMonth));
            
            const labels = [];
            const lineBValues = [], lineUValues = [];

            activePercentData.forEach(row => {
                const rowDate = row.Date;
                if (rowDate) {
                    const parts = String(rowDate).split("-");
                    labels.push(parts.length === 3 ? `${parseInt(parts[2], 10)}-${MONTH_NAMES_SHORT[parseInt(parts[1], 10) - 1] || ""}` : rowDate);
                } else {
                    labels.push("");
                }

                const buRows = (buData || []).filter(b => String(b.Date) === String(rowDate));
                let sumB = 0, sumU = 0;
                buRows.forEach(b => {
                    const t = b.Type ? String(b.Type).toUpperCase() : "";
                    if (t.includes("B")) sumB += parseNum(b.Qty);
                    if (t.includes("U")) sumU += parseNum(b.Qty);
                });

                const prodVal = parseNum(row.Prod);
                lineBValues.push(prodVal > 0 ? Number(((sumB / prodVal) * 100).toFixed(2)) : 0);
                lineUValues.push(prodVal > 0 ? Number(((sumU / prodVal) * 100).toFixed(2)) : 0);
            });

            const options = baseChartOptions();
            options.scales.y.ticks.callback = v => v + "%";
            options.plugins.datalabels = { color: "#000000", anchor: "end", align: "top", offset: 4, font: { weight: "normal", size: 11 }, formatter: v => v.toFixed(2) + "%" };

            renderChart("machineChart", {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        { label: 'Balance (Type B)', data: lineBValues, borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.1)', borderWidth: 2, pointRadius: 4, tension: 0.1 },
                        { label: 'Uniformity (Type U)', data: lineUValues, borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.1)', borderWidth: 2, pointRadius: 4, tension: 0.1 }
                    ]
                },
                options,
                plugins: [ChartDataLabels]
            });

        } else if (performanceViewMode === 'monthly_overview') {
            const { data: percentData } = await supabaseClient.from("bupercen").select("Month, Percent");
            const monthlyAverages = {};
            MONTHS.forEach(m => monthlyAverages[m] = { sum: 0, count: 0 });

            if (percentData) {
                percentData.forEach(row => {
                    const mName = row.Month ? String(row.Month).trim() : "";
                    const pVal = parseNum(row.Percent);
                    if (monthlyAverages[mName] && !isNaN(pVal)) {
                        monthlyAverages[mName].sum += pVal;
                        monthlyAverages[mName].count += 1;
                    }
                });
            }

            const monthlyValues = MONTHS.map(m => monthlyAverages[m].count > 0 ? Number((monthlyAverages[m].sum / monthlyAverages[m].count * 100).toFixed(2)) : 0);
            const options = baseChartOptions();
            options.scales.y.ticks.callback = v => v + "%";
            options.plugins.datalabels = { color: "#000000", anchor: "end", align: "top", offset: 4, font: { weight: "normal", size: 11 }, formatter: v => v + "%" };

            renderChart("machineChart", {
                type: "line",
                data: {
                    labels: MONTHS,
                    datasets: [{ label: 'Monthly Average Percent', data: monthlyValues, borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.15)', borderWidth: 3, pointRadius: 5, fill: true, tension: 0.2 }]
                },
                options,
                plugins: [ChartDataLabels]
            });

        } else {
            const { data: percentData } = await supabaseClient.from("bupercen").select("*").eq("Month", currentSelectedMonth);
            let activePercentData = percentData || [];
            if (selectedWeek) activePercentData = activePercentData.filter(item => String(item.Week).trim() === String(selectedWeek));
            if (selectedDay) activePercentData = activePercentData.filter(item => String(item.Date).trim() === String(selectedDay));
            activePercentData.sort((a, b) => new Date(a.Date) - new Date(b.Date));

            const labels = [], percentValues = [], goalValues = [];
            activePercentData.forEach(row => {
                if (row.Date) {
                    const parts = String(row.Date).split("-");
                    labels.push(parts.length === 3 ? `${parseInt(parts[2], 10)}-${MONTH_NAMES_SHORT[parseInt(parts[1], 10) - 1] || ""}` : row.Date);
                } else {
                    labels.push("");
                }
                percentValues.push(Number((parseNum(row.Percent) * 100).toFixed(2)));
                goalValues.push(Number((parseNum(row.Goal) * 100).toFixed(2)));
            });

            const options = baseChartOptions();
            options.scales.y.ticks.callback = v => v + "%";

            renderChart("machineChart", {
                type: "bar",
                data: {
                    labels,
                    datasets: [
                        { type: 'bar', label: 'Percent', data: percentValues, backgroundColor: 'rgba(37,99,235,0.65)', borderRadius: 6, barPercentage: 0.65 },
                        { type: 'line', label: 'Goal', data: goalValues, borderColor: '#EF4444', borderWidth: 2, pointRadius: 3, fill: false }
                    ]
                },
                options,
                plugins: [ChartDataLabels]
            });
        }
    } catch (e) {
        console.error("Error in createMachineChart:", e);
    }
}

function setProtectedElementsState(isLoggedIn, userName = "") {
    sessionActiveUser = isLoggedIn ? userName : null;
    const dataOption = document.getElementById("dataMenuOption");
    const loginBtn = document.getElementById("loginMenuBtn");
    const logoutBtn = document.getElementById("logoutMenuBtn");
    const exportTableExcelBtn = document.getElementById("exportTableExcelBtn");
    const openExportRangeBtn = document.getElementById("openExportRangeBtn");

    if (dataOption) {
        dataOption.style.opacity = isLoggedIn ? "1" : "0.5";
        dataOption.style.pointerEvents = isLoggedIn ? "auto" : "none";
        dataOption.style.cursor = isLoggedIn ? "pointer" : "not-allowed";
    }
    if (loginBtn) loginBtn.style.display = isLoggedIn ? "none" : "flex";
    if (logoutBtn) logoutBtn.style.display = isLoggedIn ? "flex" : "none";
    if (exportTableExcelBtn) exportTableExcelBtn.style.display = isLoggedIn ? "block" : "none";
    if (openExportRangeBtn) openExportRangeBtn.style.display = isLoggedIn ? "block" : "none";

    document.getElementById("userAvatarText").textContent = isLoggedIn ? userName.substring(0, 2).toUpperCase() : "RC";
    document.getElementById("userAvatarLargeText").textContent = isLoggedIn ? userName.substring(0, 2).toUpperCase() : "LA";
    document.getElementById("userFullNameText").textContent = isLoggedIn ? userName : "No Log In";
    document.getElementById("userEmailText").textContent = isLoggedIn ? `${userName.toLowerCase()}@primewheel.com` : "Sign in to continue";
}

async function handleFormLogin(event) {
    event.preventDefault();
    const userInput = document.getElementById("loginUser").value.trim();
    const passwordInput = document.getElementById("loginPassword").value.trim();

    try {
        const { data, error } = await supabaseClient.from("Cuentas").select("*").eq("Usurio", userInput).eq("Password", passwordInput);
        if (error) { alert("Error verifying credentials: " + error.message); return; }

        if (data?.length > 0) {
            closeLoginModal();
            setProtectedElementsState(true, userInput);
            localStorage.setItem("smrc_logged_user", userInput);
            document.getElementById("loginForm").reset();
        } else {
            alert("Incorrect username or password.");
        }
    } catch (err) {
        console.error("Unexpected error:", err);
        alert("An error occurred while attempting to log in.");
    }
}

window.addEventListener("load", function() {
    renderDynamicComponents();
    populateMonthDropdowns();
    if (!currentSelectedMonth) {
        currentSelectedMonth = MONTHS[new Date().getMonth()] || "August";
        const monthTextElem = document.getElementById("selectedMonthText");
        if (monthTextElem) monthTextElem.innerText = currentSelectedMonth;
    }
    setCurrentMonth();
    
    const savedUser = localStorage.getItem("smrc_logged_user");
    setProtectedElementsState(!!savedUser, savedUser || "");

    document.getElementById("filterBox")?.addEventListener("click", function(e) {
        e.stopPropagation();
        const dropdown = document.getElementById("monthDropdown");
        if (dropdown) dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    });

    document.getElementById("recordsMenuLink")?.addEventListener("click", function(e) {
        e.preventDefault();
        openRecordsModal();
    });

    document.getElementById("shareExcelOpt")?.addEventListener("click", () => alert('Exporting to XLS...'));
    document.getElementById("sharePdfOpt")?.addEventListener("click", exportDashboardToPDF);
    document.getElementById("dataMenuOption")?.addEventListener("click", handleDataClick);

    document.getElementById("userAvatarContainerBtn")?.addEventListener("click", function(e) {
        e.stopPropagation();
        const dropdown = document.getElementById("userDropdown");
        if (dropdown) dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    });

    document.getElementById("selectedDayTextBtn")?.addEventListener("click", function(e) {
        e.stopPropagation();
        const dropdown = document.getElementById("dayDropdownMenu");
        if (dropdown) dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    });

    document.getElementById("loginMenuBtn")?.addEventListener("click", openLoginPrompt);

    document.querySelectorAll(".perf-mode-btn").forEach(btn => {
        btn.addEventListener("click", function(e) {
            setPerformanceMode(this.getAttribute("data-mode"), e);
        });
    });

    document.getElementById("loginCloseBtn")?.addEventListener("click", closeLoginModal);
    document.getElementById("loginForm")?.addEventListener("submit", handleFormLogin);
    document.getElementById("recordsModalCloseBtn")?.addEventListener("click", closeRecordsModal);
    document.getElementById("modalMonthFilter")?.addEventListener("change", loadModalRecords);
    document.getElementById("modalCellFilter")?.addEventListener("change", filterModalTable);
    document.getElementById("clearCellFilterBtn")?.addEventListener("click", clearCellFilter);
    document.getElementById("exportTableExcelBtn")?.addEventListener("click", exportCurrentTableToExcel);
    document.getElementById("openExportRangeBtn")?.addEventListener("click", openExportRangeModal);
    document.getElementById("exportFilterType")?.addEventListener("change", toggleExportInputs);
    document.getElementById("exportRangeCancelBtn")?.addEventListener("click", closeExportRangeModal);
    document.getElementById("exportRangeSubmitBtn")?.addEventListener("click", processAndExportCustomData);
    document.getElementById("dataModalCloseBtn")?.addEventListener("click", closeDataModal);

    document.getElementById("monthOptionsContent")?.addEventListener("click", function(e) {
        const optionItem = e.target.closest(".month-option-item");
        if (optionItem) selectMonth(optionItem.getAttribute("data-month"), e);
    });
});