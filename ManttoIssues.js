const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

/* =========================================================
GLOBAL STATE
========================================================= */

let maintenanceData = [];
let activeCharts = {};
let selectedMachine = null;
let currentSelectedMonth = "";
let modalRawData = [];

/* =========================================================
CONSTANTS
========================================================= */

const operations = [
    "MD", "OP1", "OP2", "CHIRON", 
    "ROBOT FANUC", "ROBOT JR", "AGS", "TRANSFER", "CONVEYOR"
];

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

/* =========================================================
CHART DEFAULTS
========================================================= */

Chart.defaults.font.family = '"Segoe UI", Inter, Arial, sans-serif';
Chart.defaults.color = "#64748B";
Chart.defaults.animation.duration = 800;

/* =========================================================
DOM UTILS & HELPERS
========================================================= */

const getElem = (id) => document.getElementById(id);

// Función auxiliar genérica para paginar y traer todos los registros de Supabase
async function fetchAllSupabaseRecords(queryBuilder) {
    let allData = [];
    const pageSize = 1000;
    let from = 0;
    let moreData = true;

    while (moreData) {
        const { data, error } = await queryBuilder.range(from, from + pageSize - 1);
        if (error) throw error;

        if (data && data.length > 0) {
            allData = allData.concat(data);
            from += pageSize;
        } else {
            moreData = false;
        }
    }
    return allData;
}

/* =========================================================
LOADING SCREEN
========================================================= */

function showLoading() {
    getElem("loadingScreen")?.classList.remove("hidden");
}

function hideLoading() {
    const screen = getElem("loadingScreen");
    if (screen) {
        setTimeout(() => screen.classList.add("hidden"), 350);
    }
}

/* =========================================================
INITIAL MONTH
========================================================= */

function setCurrentMonth() {
    const month = months[new Date().getMonth()] || "August";
    selectMonth(month);
    
    const modalSelect = getElem("modalMonthFilter");
    if (modalSelect) modalSelect.value = month;

    populateModalCellFilter();
}

/* =========================================================
CELL FILTER
========================================================= */

function populateModalCellFilter() {
    const cellSelect = getElem("modalCellFilter");
    if (!cellSelect) return;

    cellSelect.innerHTML = '<option value="">All Cells</option>' + 
        machines.map(machine => `<option value="${machine}">${machine}</option>`).join("");
}

/* =========================================================
RECORD MODAL
========================================================= */

function openRecordsModal() {
    getElem("recordsModal")?.style.setProperty("display", "flex");
    
    const currentMonth = currentSelectedMonth || months[new Date().getMonth()];
    const modalMonthFilter = getElem("modalMonthFilter");
    if (modalMonthFilter) modalMonthFilter.value = currentMonth;

    loadModalRecords();
}

function closeRecordsModal() {
    getElem("recordsModal")?.style.setProperty("display", "none");
}

function clearCellFilter() {
    const cellFilter = getElem("modalCellFilter");
    if (cellFilter) cellFilter.value = "";
    filterModalTable();
}

/* =========================================================
LOAD RECORDS
========================================================= */

async function loadModalRecords() {
    const selectedMonth = getElem("modalMonthFilter")?.value || "August";
    const tbody = getElem("modalTableBody");
    const thead = getElem("modalTableHeaders");
    const counter = getElem("recordsCount");

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

    try {
        const query = supabaseClient.from("ManttoIssues").select("*").eq("Month", selectedMonth);
        modalRawData = await fetchAllSupabaseRecords(query);

        if (modalRawData.length === 0) {
            thead.innerHTML = "<th>No Data</th>";
            tbody.innerHTML = `
                <tr>
                    <td style="text-align:center; padding:40px;">
                        <i class="fa-solid fa-database" style="font-size:25px; color:#CBD5E1; display:block; margin-bottom:10px;"></i>
                        No records found for <strong>${selectedMonth}</strong>
                    </td>
                </tr>
            `;
            if (counter) counter.textContent = "0 records";
            return;
        }

        thead.innerHTML = Object.keys(modalRawData[0]).map(key => `<th>${key}</th>`).join("");
        filterModalTable();

    } catch (error) {
        console.error(error);
        tbody.innerHTML = `
            <tr>
                <td colspan="100" style="text-align:center; padding:40px; color:#EF4444;">
                    <i class="fa-solid fa-circle-exclamation"></i> Error loading data from Supabase.
                </td>
            </tr>
        `;
        if (counter) counter.textContent = "Unable to load records";
    }
}

/* =========================================================
FILTER RECORD TABLE
========================================================= */

function filterModalTable() {
    const selectedCell = getElem("modalCellFilter")?.value || "";
    const tbody = getElem("modalTableBody");
    const counter = getElem("recordsCount");

    if (!tbody) return;

    const filtered = selectedCell 
        ? modalRawData.filter(row => row.Maq === selectedCell) 
        : modalRawData;

    if (counter) counter.textContent = `${filtered.length.toLocaleString()} records`;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="100" style="text-align:center; padding:40px;">
                    No records match the selected cell.
                </td>
            </tr>
        `;
        return;
    }

    const keys = modalRawData.length > 0 ? Object.keys(modalRawData[0]) : [];

    tbody.innerHTML = filtered.map(row => 
        `<tr>${keys.map(key => `<td>${row[key] ?? ""}</td>`).join("")}</tr>`
    ).join("");
}

/* =========================================================
MONTH DROPDOWN
========================================================= */

function toggleMonthDropdown(event) {
    event.stopPropagation();
    const box = getElem("filterBox");
    const dropdown = getElem("monthDropdown");

    if (!box || !dropdown) return;

    const isOpen = dropdown.style.display === "block";
    dropdown.style.display = isOpen ? "none" : "block";
    box.classList.toggle("active", !isOpen);
}

window.addEventListener("click", function(event) {
    if (event.target === getElem("recordsModal")) {
        closeRecordsModal();
    }
    getElem("monthDropdown")?.style.setProperty("display", "none");
    getElem("filterBox")?.classList.remove("active");
});

/* =========================================================
SELECT MONTH
========================================================= */

function selectMonth(monthName, event) {
    event?.stopPropagation();
    currentSelectedMonth = monthName;

    const monthTextElement = getElem("selectedMonthText");
    if (monthTextElement) monthTextElement.innerText = monthName;

    document.querySelectorAll(".custom-option").forEach(option => {
        option.classList.toggle("selected", option.innerText === monthName);
    });

    getElem("monthDropdown")?.style.setProperty("display", "none");
    getElem("filterBox")?.classList.remove("active");

    loadMaintenance();
}

/* =========================================================
LOAD MAINTENANCE DATA
========================================================= */

async function loadMaintenance() {
    if (!currentSelectedMonth) return;
    showLoading();

    try {
        const query = supabaseClient.from("ManttoIssues").select("*").eq("Month", currentSelectedMonth);
        maintenanceData = await fetchAllSupabaseRecords(query);

        selectedMachine = null;
        const selectedCellElem = getElem("selectedCell");
        if (selectedCellElem) selectedCellElem.innerText = "ALL";

        updateDashboard();
        hideLoading();
    } catch (error) {
        console.error(error);
        alert("Error loading Supabase data.");
        hideLoading();
    }
}

/* =========================================================
DASHBOARD
========================================================= */

function updateDashboard() {
    calculateKPIs();
    createOperationChart();
    loadIndependentMonthlyChart();
    createCellChart();
    createIssueChart();
    createMachineChart();
    createTop10Table();
    updateCellAnalysis();
}

/* =========================================================
KPI CALCULATIONS
========================================================= */

function calculateKPIs() {
    const totalIssuesElem = getElem("totalIssues");
    if (totalIssuesElem) totalIssuesElem.innerText = maintenanceData.length.toLocaleString();

    /* TOP CELL */
    const cells = {};
    maintenanceData.forEach(row => {
        if (row.Maq) cells[row.Maq] = (cells[row.Maq] || 0) + 1;
    });

    const topCell = Object.entries(cells).sort((a, b) => b[1] - a[1])[0];
    const topCellElem = getElem("topCell");
    if (topCellElem) {
        topCellElem.innerHTML = topCell 
            ? `${topCell[0]}<small style="display:block; color:#0A6ED1; font-size:10px; margin-top:2px;">${topCell[1]} Issues</small>` 
            : "--";
    }

    /* TOP OPERATION */
    const opCount = {};
    operations.forEach(op => opCount[op] = 0);
    maintenanceData.forEach(row => {
        operations.forEach(op => { if (row[op]) opCount[op]++; });
    });

    const topOperation = Object.entries(opCount).sort((a, b) => b[1] - a[1])[0];
    const topOpElem = getElem("topOperation");
    if (topOpElem) {
        topOpElem.innerText = (topOperation && topOperation[1] > 0) ? topOperation[0] : "--";
    }

    /* TOP ISSUE */
    const issues = {};
    maintenanceData.forEach(row => {
        operations.forEach(op => {
            if (row[op]) issues[row[op]] = (issues[row[op]] || 0) + 1;
        });
    });

    const topIssue = Object.entries(issues).sort((a, b) => b[1] - a[1])[0];
    const topIssueElem = getElem("topIssue");
    if (topIssueElem) topIssueElem.innerText = topIssue ? topIssue[0] : "--";
}

/* =========================================================
CHART ENGINE
========================================================= */

function renderChart(canvasId, config) {
    if (activeCharts[canvasId]) {
        activeCharts[canvasId].destroy();
    }
    const canvas = getElem(canvasId);
    if (!canvas) return;
    activeCharts[canvasId] = new Chart(canvas, config);
}

/* =========================================================
CHART OPTIONS
========================================================= */

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

/* =========================================================
OPERATION CHART
========================================================= */

function createOperationChart() {
    const values = operations.map(op => maintenanceData.filter(row => row[op]).length);
    const options = baseChartOptions();
    options.scales.x.ticks.maxRotation = 40;
    options.scales.x.ticks.minRotation = 40;

    renderChart("operationChart", {
        type: "bar",
        data: {
            labels: operations,
            datasets: [{
                label: "Issues",
                data: values,
                backgroundColor: "#0A6ED1",
                hoverBackgroundColor: "#00A6A6",
                borderRadius: 7,
                borderSkipped: false,
                barPercentage: 0.68
            }]
        },
        options,
        plugins: [ChartDataLabels]
    });
}

/* =========================================================
MONTHLY ISSUES CHART (INDEPENDENT)
========================================================= */

async function loadIndependentMonthlyChart() {
    try {
        const query = supabaseClient.from("ManttoIssues").select("Month");
        const allYearData = await fetchAllSupabaseRecords(query);

        const monthlyCount = {};
        months.forEach(m => monthlyCount[m] = 0);

        allYearData.forEach(row => {
            if (row.Month && monthlyCount.hasOwnProperty(row.Month)) {
                monthlyCount[row.Month]++;
            }
        });

        const values = months.map(m => monthlyCount[m]);
        const options = baseChartOptions();
        options.scales.x.ticks.maxRotation = 40;
        options.scales.x.ticks.minRotation = 40;

        renderChart("monthlyIssuesChart", {
            type: "bar",
            data: {
                labels: months,
                datasets: [{
                    label: "Issues",
                    data: values,
                    backgroundColor: "#7C3AED",
                    hoverBackgroundColor: "#0A6ED1",
                    borderRadius: 7,
                    borderSkipped: false,
                    barPercentage: 0.68
                }]
            },
            options,
            plugins: [ChartDataLabels]
        });

    } catch (err) {
        console.error("Unexpected error in independent monthly chart:", err);
    }
}

/* =========================================================
ISSUES BY CELL - LAST 15 COMPLETE DAYS
========================================================= */

async function createCellChart() {
    try {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() - 1);

        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 14);

        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };

        const startDateKey = formatDate(startDate);
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayKey = formatDate(nextDay);

        const { data, error } = await supabaseClient
            .from("ManttoIssues")
            .select("Date")
            .gte("Date", startDateKey)
            .lt("Date", nextDayKey);

        if (error) {
            console.error("Error loading daily issues:", error);
            return;
        }

        const dailyCount = {};
        const labels = [];
        const dateKeys = [];

        for (let i = 0; i < 15; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateKey = formatDate(currentDate);

            dailyCount[dateKey] = 0;
            dateKeys.push(dateKey);

            labels.push(`${String(currentDate.getMonth() + 1).padStart(2, "0")}/${String(currentDate.getDate()).padStart(2, "0")}`);
        }

        if (data && data.length > 0) {
            data.forEach(row => {
                if (!row.Date) return;
                let dateKey = "";

                if (typeof row.Date === "string") {
                    const match = row.Date.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (match) dateKey = `${match[1]}-${match[2]}-${match[3]}`;
                }

                if (!dateKey) {
                    const dateValue = new Date(row.Date);
                    if (isNaN(dateValue.getTime())) return;
                    dateKey = formatDate(dateValue);
                }

                if (Object.prototype.hasOwnProperty.call(dailyCount, dateKey)) {
                    dailyCount[dateKey]++;
                }
            });
        }

        const values = dateKeys.map(dateKey => dailyCount[dateKey]);
        const options = baseChartOptions();
        options.scales.x.ticks.maxRotation = 0;
        options.scales.x.ticks.minRotation = 0;
        options.scales.x.ticks.autoSkip = false;

        renderChart("cellChart", {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Issues",
                    data: values,
                    backgroundColor: "#0A6ED1",
                    hoverBackgroundColor: "#00A6A6",
                    borderRadius: 7,
                    borderSkipped: false,
                    barPercentage: 0.68
                }]
            },
            options,
            plugins: [ChartDataLabels]
        });

    } catch (error) {
        console.error("Unexpected error creating Issues by Cell chart:", error);
    }
}

/* =========================================================
ISSUE CHART
========================================================= */

function createIssueChart() {
    const issues = {};
    maintenanceData.forEach(row => {
        operations.forEach(op => {
            if (row[op]) issues[row[op]] = (issues[row[op]] || 0) + 1;
        });
    });

    const result = Object.entries(issues).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const colors = result.map((_, i) => i === 0 ? "#F59E0B" : "#0A6ED1");
    const options = baseChartOptions();
    options.scales.x.ticks.maxRotation = 45;
    options.scales.x.ticks.autoSkip = false;

    renderChart("issueChart", {
        type: "bar",
        data: {
            labels: result.map(x => x[0]),
            datasets: [{
                label: "Count",
                data: result.map(x => x[1]),
                backgroundColor: colors,
                borderRadius: 7,
                borderSkipped: false
            }]
        },
        options,
        plugins: [ChartDataLabels]
    });
}

/* =========================================================
MACHINE CHART
========================================================= */

function createMachineChart() {
    const count = {};
    machines.forEach(machine => count[machine] = 0);

    maintenanceData.forEach(row => {
        if (row.Maq && Object.prototype.hasOwnProperty.call(count, row.Maq)) {
            count[row.Maq]++;
        }
    });

    const options = baseChartOptions();
    options.scales.x.ticks.maxRotation = 45;
    options.scales.x.ticks.minRotation = 45;

    renderChart("machineChart", {
        type: "bar",
        data: {
            labels: Object.keys(count),
            datasets: [{
                label: "Issues",
                data: Object.values(count),
                backgroundColor: "#0A6ED1",
                hoverBackgroundColor: "#00A6A6",
                borderRadius: 6,
                borderSkipped: false,
                barPercentage: 0.65
            }]
        },
        options,
        plugins: [ChartDataLabels]
    });
}

/* =========================================================
TOP 10
========================================================= */

function createTop10Table() {
    const count = {};
    maintenanceData.forEach(row => {
        if (row.Maq) count[row.Maq] = (count[row.Maq] || 0) + 1;
    });

    const result = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const tbody = getElem("top10Table");
    if (!tbody) return;

    tbody.innerHTML = result.map((item, index) => `
        <tr onclick="selectMachineForAnalysis('${item[0]}')">
            <td class="rank">#${index + 1}</td>
            <td>${item[0]}</td>
            <td><b>${item[1]}</b></td>
        </tr>
    `).join("");
}

/* =========================================================
SELECT MACHINE
========================================================= */

function selectMachineForAnalysis(machineName) {
    selectedMachine = machineName;
    const selectedCellElem = getElem("selectedCell");
    if (selectedCellElem) selectedCellElem.innerText = machineName;
    updateCellAnalysis();
}

/* =========================================================
CELL ANALYSIS
========================================================= */

function updateCellAnalysis() {
    const filteredData = selectedMachine 
        ? maintenanceData.filter(row => row.Maq === selectedMachine) 
        : maintenanceData;

    ["md", "op1", "op2", "chiron"].forEach(opKey => {
        const opName = opKey.toUpperCase() === "CHIRON" ? "CHIRON" : opKey.toUpperCase();
        const issues = {};

        filteredData.forEach(row => {
            if (row[opName]) issues[row[opName]] = (issues[row[opName]] || 0) + 1;
        });

        const result = Object.entries(issues).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const options = baseChartOptions();
        options.scales.x.ticks.maxRotation = 30;
        options.scales.x.ticks.minRotation = 30;
        options.scales.x.ticks.font = { size: 9 };

        renderChart(opKey + "Chart", {
            type: "bar",
            data: {
                labels: result.map(x => x[0]),
                datasets: [{
                    label: "Count",
                    data: result.map(x => x[1]),
                    backgroundColor: "#00A6A6",
                    hoverBackgroundColor: "#0A6ED1",
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options,
            plugins: [ChartDataLabels]
        });
    });
}

/* =========================================================
INITIALIZATION
========================================================= */

window.addEventListener("load", function() {
    if (!currentSelectedMonth) {
        const monthIndex = new Date().getMonth();
        currentSelectedMonth = months[monthIndex] || "August";
        const monthTextElem = getElem("selectedMonthText");
        if (monthTextElem) monthTextElem.innerText = currentSelectedMonth;
    }
    setCurrentMonth();
});
