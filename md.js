const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let maintenanceData = [];
let activeCharts = {};
let selectedMachine = null;
let currentSelectedMonth = "";
let selectedWeek = null;
let modalRawData = [];
let columnFilters = {}; 
let selectedModalRowElement = null; 
let sessionActiveUser = null;
let activeTrendTab = "md"; // 'md' | 'time'

const MACHINES = ["C01","C02","C03","C04","C05","C06","C07","C08","C09","C10","C11","C12","C13","C14","C15","C16","C17","C18","C19","C20","C21","C22","C23","C24","C25","C26","C27","C28","C29","C30","C33","C34","C35","C36"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

Chart.defaults.font.family = '"Segoe UI", Inter, Arial, sans-serif';
Chart.defaults.color = "#64748B";
Chart.defaults.animation.duration = 600;

// --- UTILIDADES GENERALES ---
function setModalDisplay(modalId, displayValue) {
    document.getElementById(modalId)?.style.setProperty("display", displayValue);
}

function parseNum(val) {
    return parseFloat(val) || 0;
}

// --- RENDERIZADO INICIAL Y COMPONENTES ---
function renderDynamicComponents() {
    const kpiContainer = document.getElementById("kpiGridContainer");
    if (!kpiContainer) return;

    const kpiData = [
        { id: "totalIssues", icon: "fa-solid fa-triangle-exclamation", type: "danger", label: "TOTAL EVENTS", sub: "Maintenance Issues", val: "0" },
        { id: "topCell", icon: "fa-solid fa-clock", type: "blue", label: "TOTAL TIME", sub: "Downtime (Hours/Min)", val: "0" },
        { id: "topIssue", icon: "fa-solid fa-industry", type: "orange", label: "ACTIVE CELLS", sub: "Cells Reporting Issues", val: "0" }
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
            const query = queryBuilderFn(supabaseClient.from("MDMachine")).range(from, from + pageSize - 1);
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

// --- MODALES ---
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

// Función auxiliar global para definir el ancho según el nombre de la columna
function getColumnWidth(columnName) {
    const col = columnName.toUpperCase();
    switch (col) {
        case 'ID':
            return '55px';
        case 'WEEK':
        case 'TIME':
        case 'SHIFT':
            return '65px';
        case 'CELL':
        case 'CODE':
            return '75px';
        case 'DATE':
        case 'MONTH':
            return '95px';
        default:
            return 'auto';
    }
}

async function loadModalRecords() {
    const selectedMonth = document.getElementById("modalMonthFilter")?.value || "August";
    const tbody = document.getElementById("modalTableBody");
    const thead = document.getElementById("modalTableHeaders");
    const counter = document.getElementById("recordsCount");

    if (!tbody || !thead) return;

    tbody.innerHTML = `<tr><td colspan="100" class="loading-table"><div class="table-loader"></div>Loading records...</td></tr>`;
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
        tbody.innerHTML = `<tr><td style="text-align:center; padding:40px;"><i class="fa-solid fa-database" style="font-size:25px; color:#CBD5E1; display:block; margin-bottom:10px;"></i>No records found for <strong>${selectedMonth}</strong></td></tr>`;
        if (counter) counter.textContent = "0 records";
        return;
    }

    const keys = Object.keys(modalRawData[0]).filter(k => k !== 'created_at');

    thead.innerHTML = keys.map(k => {
        const width = getColumnWidth(k);
        const isCustomWidth = width !== 'auto';
        const colStyle = isCustomWidth ? `width: ${width}; min-width: ${width}; max-width: ${width};` : '';
        const inputPlaceholder = isCustomWidth ? '...' : 'Filter...';
        const fontSize = isCustomWidth ? '9px' : '10px';

        return `
        <th style="${colStyle}">
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <span>${k}</span>
                <input type="text" placeholder="${inputPlaceholder}" data-column="${k}" class="column-filter-input" 
                    style="padding: 3px 4px; font-size: ${fontSize}; font-weight: normal; border: 1px solid #CBD5E1; border-radius: 4px; outline: none; width: 100%; box-sizing: border-box;">
            </div>
        </th>
    `;
    }).join("");

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
        if (selectedCell && r.Cell !== selectedCell) return false;
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

    const keys = modalRawData.length > 0 ? Object.keys(modalRawData[0]).filter(k => k !== 'created_at') : [];
    
    function formatDateToCustom(val) {
        if (!val) return "";
        let strVal = String(val).trim();
        if (strVal.includes("T")) strVal = strVal.split("T")[0];
        else if (strVal.includes(" ")) strVal = strVal.split(" ")[0];

        const parts = strVal.split("-");
        if (parts.length === 3) {
            const year = parts[0];
            const monthIndex = parseInt(parts[1], 10) - 1;
            const day = parts[2];
            
            if (monthIndex >= 0 && monthIndex < MONTH_NAMES_SHORT.length) {
                const shortYear = year.length === 4 ? year.slice(-2) : year;
                return `${day}-${MONTH_NAMES_SHORT[monthIndex]}-${shortYear}`;
            }
        }
        return val;
    }

    tbody.innerHTML = filtered.map((row, index) => `
        <tr class="modal-data-row" data-index="${index}">
            ${keys.map(k => {
                let cellValue = row[k] ?? "";
                if (k.toLowerCase() === "date") {
                    cellValue = formatDateToCustom(cellValue);
                }
                const width = getColumnWidth(k);
                const isCustomWidth = width !== 'auto';
                const colStyle = isCustomWidth ? `width: ${width}; min-width: ${width}; max-width: ${width}; overflow: hidden; text-overflow: ellipsis;` : '';
                return `<td style="${colStyle}">${cellValue}</td>`;
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
    let query = supabaseClient.from("MDMachine").select("*");

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
        document.getElementById("dataIframe").src = "uploadmtto.html";
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
});

function selectMonth(monthName, event) {
    event?.stopPropagation();
    currentSelectedMonth = monthName;
    const monthTextElement = document.getElementById("selectedMonthText");
    if (monthTextElement) monthTextElement.innerText = monthName;

    document.querySelectorAll(".custom-option").forEach(opt => {
        if (opt.innerText === monthName) opt.classList.add("selected");
    });
    loadMaintenance();
}

async function loadMaintenance() {
    if (!currentSelectedMonth) return;
    const { data, error } = await fetchAllSupabaseData(q => q.select("*").eq("Month", currentSelectedMonth));
    if (error) { alert("Error loading Supabase data."); return; }

    maintenanceData = data || [];
    selectedMachine = null;
    selectedWeek = null; 
    const selectedCellElem = document.getElementById("selectedCell");
    if (selectedCellElem) selectedCellElem.innerText = "ALL";
    
    renderWeekButtons(); 
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
    renderWeekButtons();
    updateDashboard();
}

function getActiveFilteredData() {
    if (!selectedWeek) return maintenanceData;
    return maintenanceData.filter(row => String(row.Week).trim() === String(selectedWeek));
}

function updateDashboard() {
    calculateKPIs();
    createOperationChart();
    loadIndependentMonthlyChart();
    createCellChart();
    createIssueChart();
    if (activeTrendTab === "time") {
        createTimeTrendChart();
    } else {
        createDailyTrendChart();
    }
    createShiftCountChart();
}

async function calculateKPIs() {
    const activeData = getActiveFilteredData();
    const totalIssuesElem = document.getElementById("totalIssues");
    
    let totalEvents = activeData.length;
    let totalTime = 0;
    const uniqueCells = new Set();

    activeData.forEach(row => {
        totalTime += parseNum(row.Time);
        if (row.Cell) uniqueCells.add(row.Cell.trim());
    });

    if (totalIssuesElem) totalIssuesElem.innerText = totalEvents.toLocaleString();
    if (document.getElementById("topCell")) document.getElementById("topCell").innerText = totalTime.toFixed(1);
    if (document.getElementById("topIssue")) document.getElementById("topIssue").innerText = uniqueCells.size.toString();
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
            datalabels: { color: "#334155", anchor: "end", align: "top", offset: 4, font: { weight: "800", size: 11 } }
        },
        scales: {
            y: { 
                beginAtZero: true, 
                grace: "15%", 
                ticks: { precision: 0, color: "#000000", font: { size: 11, weight: "normal" } }, 
                grid: { color: "rgba(148,163,184,.13)" }, 
                border: { display: false } 
            },
            x: { 
                ticks: { color: "#111111", font: { size: 10.5, weight: "normal" }, maxRotation: 45, minRotation: 30 }, 
                grid: { display: false }, 
                border: { display: false } 
            }
        }
    };
}

function createOperationChart() {
    const codeTotals = {};
    getActiveFilteredData().forEach(row => {
        const code = row.Code ? String(row.Code).trim() : "N/A";
        codeTotals[code] = (codeTotals[code] || 0) + 1;
    });

    const sortedTop10 = Object.entries(codeTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
    renderChart("operationChart", {
        type: "bar",
        data: { 
            labels: sortedTop10.map(i => i[0]), 
            datasets: [{ label: "Top Codes", data: sortedTop10.map(i => i[1]), backgroundColor: "rgba(37, 99, 235, 0.55)", hoverBackgroundColor: "#2563EB", borderRadius: 7, borderSkipped: false, barPercentage: .68 }] 
        },
        options: baseChartOptions(),
        plugins: [ChartDataLabels]
    });
}

async function loadIndependentMonthlyChart() {
    const cellTotals = {};
    const activeData = getActiveFilteredData();

    activeData.forEach(row => {
        if (row.Cell) {
            const cellName = String(row.Cell).trim();
            if (cellName !== "") {
                cellTotals[cellName] = (cellTotals[cellName] || 0) + 1;
            }
        }
    });

    const sortedTop10 = Object.entries(cellTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const labels = sortedTop10.map(item => item[0]);
    const dataValues = sortedTop10.map(item => item[1]);

    renderChart("monthlyIssuesChart", {
        type: "bar",
        data: { 
            labels: labels, 
            datasets: [{ 
                label: "Top Cells by Event Count", 
                data: dataValues, 
                backgroundColor: "rgba(124, 58, 237, 0.55)", 
                hoverBackgroundColor: "#7C3AED", 
                borderRadius: 7, 
                borderSkipped: false, 
                barPercentage: 0.68 
            }] 
        },
        options: baseChartOptions(),
        plugins: [ChartDataLabels]
    });
}

function createCellChart() {
    const cellTimeTotals = {};
    getActiveFilteredData().forEach(row => {
        if (row.Cell) {
            const cellName = String(row.Cell).trim();
            if (cellName !== "") {
                cellTimeTotals[cellName] = (cellTimeTotals[cellName] || 0) + parseNum(row.Time);
            }
        }
    });

    const sortedTop10 = Object.entries(cellTimeTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const labels = sortedTop10.map(i => i[0]);
    const values = sortedTop10.map(i => i[1]);

    renderChart("cellChart", {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Top Downtime (Time) by Cell",
                data: values,
                backgroundColor: "rgba(37, 99, 235, 0.55)",
                hoverBackgroundColor: "#2563EB",
                borderRadius: 7,
                borderSkipped: false,
                barPercentage: 0.68
            }]
        },
        options: baseChartOptions(),
        plugins: [ChartDataLabels]
    });
}

function createIssueChart() {
    const codeTimeTotals = {};
    getActiveFilteredData().forEach(row => {
        if (row.Code != null) {
            const codeName = String(row.Code).trim();
            if (codeName !== "" && codeName !== "N/A") {
                codeTimeTotals[codeName] = (codeTimeTotals[codeName] || 0) + parseNum(row.Time);
            }
        }
    });

    const sortedTop10 = Object.entries(codeTimeTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const labels = sortedTop10.map(i => i[0]);
    const values = sortedTop10.map(i => i[1]);

    renderChart("issueChart", {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Top Downtime (Time) by Code",
                data: values,
                backgroundColor: values.map((_, i) => i === 0 ? "rgba(245, 158, 11, 0.65)" : "rgba(37, 99, 235, 0.55)"),
                hoverBackgroundColor: "#2563EB", 
                borderRadius: 7, 
                borderSkipped: false, 
                barPercentage: 0.68
            }]
        },
        options: baseChartOptions(),
        plugins: [ChartDataLabels]
    });
}

function createDailyTrendChart() {
    const datesList = [];
    const displayDatesList = [];
    const countsMap = {};

    const today = new Date();
    for (let i = 14; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        datesList.push(dateStr);
        countsMap[dateStr] = 0;

        const shortYear = String(year).slice(-2);
        const monthIndex = parseInt(month, 10) - 1;
        const shortMonth = MONTH_NAMES_SHORT[monthIndex] || "Jan";
        displayDatesList.push(`${day}-${shortMonth}-${shortYear}`);
    }

    maintenanceData.forEach(row => {
        if (row.Date) {
            let rowDateStr = String(row.Date).trim();
            if (rowDateStr.includes("T")) {
                rowDateStr = rowDateStr.split("T")[0];
            } else if (rowDateStr.includes(" ")) {
                rowDateStr = rowDateStr.split(" ")[0];
            }

            if (countsMap.hasOwnProperty(rowDateStr)) {
                countsMap[rowDateStr]++;
            }
        }
    });

    const values = datesList.map(d => countsMap[d]);

    renderChart("dailyTrendChart", {
        type: "line",
        data: {
            labels: displayDatesList,
            datasets: [{
                label: "Record Count",
                data: values,
                borderColor: "#2563EB",
                backgroundColor: "rgba(37, 99, 235, 0.1)",
                fill: true,
                tension: 0.3,
                pointBackgroundColor: "#2563EB",
                pointBorderColor: "#FFFFFF",
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            ...baseChartOptions(),
            plugins: {
                ...baseChartOptions().plugins,
                datalabels: {
                    color: "#2563EB",
                    anchor: "end",
                    align: "top",
                    offset: 4,
                    font: { weight: "800", size: 11 }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function createTimeTrendChart() {
    const datesList = [];
    const displayDatesList = [];
    const timeSumMap = {};

    const today = new Date();
    for (let i = 14; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        datesList.push(dateStr);
        timeSumMap[dateStr] = 0;

        const shortYear = String(year).slice(-2);
        const monthIndex = parseInt(month, 10) - 1;
        const shortMonth = MONTH_NAMES_SHORT[monthIndex] || "Jan";
        displayDatesList.push(`${day}-${shortMonth}-${shortYear}`);
    }

    maintenanceData.forEach(row => {
        if (row.Date) {
            let rowDateStr = String(row.Date).trim();
            if (rowDateStr.includes("T")) {
                rowDateStr = rowDateStr.split("T")[0];
            } else if (rowDateStr.includes(" ")) {
                rowDateStr = rowDateStr.split(" ")[0];
            }

            if (timeSumMap.hasOwnProperty(rowDateStr)) {
                timeSumMap[rowDateStr] += parseNum(row.Time);
            }
        }
    });

    const values = datesList.map(d => Number(timeSumMap[d].toFixed(1)));

    renderChart("dailyTrendChart", {
        type: "line",
        data: {
            labels: displayDatesList,
            datasets: [{
                label: "Total Time (Minutes)",
                data: values,
                borderColor: "#00A6A6",
                backgroundColor: "rgba(0, 166, 166, 0.1)",
                fill: true,
                tension: 0.3,
                pointBackgroundColor: "#00A6A6",
                pointBorderColor: "#FFFFFF",
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            ...baseChartOptions(),
            plugins: {
                ...baseChartOptions().plugins,
                datalabels: {
                    color: "#00A6A6",
                    anchor: "end",
                    align: "top",
                    offset: 4,
                    font: { weight: "800", size: 11 }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function createShiftCountChart() {
    const shiftTotals = {};
    
    getActiveFilteredData().forEach(row => {
        if (row.Shift !== undefined && row.Shift !== null) {
            const shiftName = String(row.Shift).trim();
            if (shiftName !== "") {
                shiftTotals[shiftName] = (shiftTotals[shiftName] || 0) + 1;
            }
        }
    });

    const labels = Object.keys(shiftTotals);
    const values = Object.values(shiftTotals);

    renderChart("shiftCountChart", {
        type: "bar",
        data: {
            labels: labels.length > 0 ? labels : ["No Data"],
            datasets: [{
                label: "Count by Shift",
                data: values.length > 0 ? values : [0],
                backgroundColor: "rgba(0, 184, 217, 0.6)",
                hoverBackgroundColor: "#00B8D9",
                borderRadius: 7,
                borderSkipped: false,
                barPercentage: 0.68
            }]
        },
        options: baseChartOptions(),
        plugins: [ChartDataLabels]
    });
}

function setProtectedElementsState(isLoggedIn, userName = "") {
    sessionActiveUser = isLoggedIn ? userName : null;
    const dataOption = document.getElementById("dataMenuOption");
    const loginBtn = document.getElementById("loginMenuBtn");
    const logoutBtn = document.getElementById("logoutMenuBtn");
    const signoutTopBtn = document.getElementById("signoutTopBtn");

    if (dataOption) {
        dataOption.style.opacity = isLoggedIn ? "1" : "0.5";
        dataOption.style.pointerEvents = isLoggedIn ? "auto" : "none";
        dataOption.style.cursor = isLoggedIn ? "pointer" : "not-allowed";
    }
    if (loginBtn) loginBtn.style.display = isLoggedIn ? "none" : "flex";
    if (logoutBtn) logoutBtn.style.display = isLoggedIn ? "flex" : "none";
    if (signoutTopBtn) signoutTopBtn.style.display = isLoggedIn ? "block" : "none";

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

    const trendMdBtn = document.getElementById("trendMdBtn");
    const trendTimeBtn = document.getElementById("trendTimeBtn");

    if (trendMdBtn && trendTimeBtn) {
        trendMdBtn.addEventListener("click", function() {
            activeTrendTab = "md";
            trendMdBtn.classList.add("active");
            trendTimeBtn.classList.remove("active");
            createDailyTrendChart();
        });

        trendTimeBtn.addEventListener("click", function() {
            activeTrendTab = "time";
            trendTimeBtn.classList.add("active");
            trendMdBtn.classList.remove("active");
            createTimeTrendChart();
        });
    }

    document.getElementById("recordsMenuLink")?.addEventListener("click", function(e) {
        e.preventDefault();
        openRecordsModal();
    });

    document.getElementById("shareExcelOpt")?.addEventListener("click", function() {
        alert('Exporting to XLS...');
    });

    document.getElementById("sharePdfOpt")?.addEventListener("click", function() {
        exportDashboardToPDF();
    });

    document.getElementById("dataMenuOption")?.addEventListener("click", function() {
        handleDataClick();
    });

    document.getElementById("userAvatarContainerBtn")?.addEventListener("click", function(e) {
        e.stopPropagation();
        const dropdown = document.getElementById("userDropdown");
        if (dropdown) dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    });

    document.getElementById("loginMenuBtn")?.addEventListener("click", function() {
        openLoginPrompt();
    });

    document.getElementById("loginCloseBtn")?.addEventListener("click", function() {
        closeLoginModal();
    });

    document.getElementById("loginForm")?.addEventListener("submit", function(e) {
        handleFormLogin(e);
    });

    document.getElementById("recordsModalCloseBtn")?.addEventListener("click", function() {
        closeRecordsModal();
    });

    document.getElementById("modalMonthFilter")?.addEventListener("change", function() {
        loadModalRecords();
    });

    document.getElementById("modalCellFilter")?.addEventListener("change", function() {
        filterModalTable();
    });

    document.getElementById("clearCellFilterBtn")?.addEventListener("click", function() {
        clearCellFilter();
    });

    document.getElementById("exportTableExcelBtn")?.addEventListener("click", function() {
        exportCurrentTableToExcel();
    });

    document.getElementById("openExportRangeBtn")?.addEventListener("click", function() {
        openExportRangeModal();
    });

    document.getElementById("exportFilterType")?.addEventListener("change", function() {
        toggleExportInputs();
    });

    document.getElementById("exportRangeCancelBtn")?.addEventListener("click", function() {
        closeExportRangeModal();
    });

    document.getElementById("exportRangeSubmitBtn")?.addEventListener("click", function() {
        processAndExportCustomData();
    });

    document.getElementById("dataModalCloseBtn")?.addEventListener("click", function() {
        closeDataModal();
    });

    document.getElementById("monthOptionsContainer")?.addEventListener("click", function(e) {
        const optionItem = e.target.closest(".month-option-item");
        if (optionItem) {
            const monthName = optionItem.getAttribute("data-month");
            selectMonth(monthName, e);
        }
    });
});