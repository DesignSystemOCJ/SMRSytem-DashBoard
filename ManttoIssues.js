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
"MD",
"OP1",
"OP2",
"CHIRON",
"ROBOT FANUC",
"ROBOT JR",
"AGS",
"TRANSFER",
"CONVEYOR"
];

const machines = [
"C01","C02","C03","C04","C05",
"C06","C07","C08","C09","C10",
"C11","C12","C13","C14","C15",
"C16","C17","C18","C19","C20",
"C21","C22","C23","C24","C25",
"C26","C27","C28","C29","C30",
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
HELPER: SUPABASE PAGINATED FETCH
========================================================= */

async function fetchAllSupabaseData(queryBuilderFn) {
    let allData = [];
    const pageSize = 1000;
    let from = 0;
    let moreData = true;

    try {
        while (moreData) {
            let query = queryBuilderFn(supabaseClient.from("ManttoIssues")).range(from, from + pageSize - 1);
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
LOADING SCREEN
========================================================= */

function showLoading() {}
function hideLoading() {}

/* =========================================================
INITIAL MONTH
========================================================= */

function setCurrentMonth() {
const monthIndex = new Date().getMonth();
const month = months[monthIndex] || "August";

selectMonth(month);

const modalSelect = document.getElementById("modalMonthFilter");
if (modalSelect) modalSelect.value = month;

populateModalCellFilter();
}

/* =========================================================
CELL FILTER
========================================================= */

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

/* =========================================================
RECORD MODAL
========================================================= */

function openRecordsModal() {
const modal = document.getElementById("recordsModal");
if (modal) modal.style.display = "flex";

const currentMonth = currentSelectedMonth || months[new Date().getMonth()];
const modalMonthFilter = document.getElementById("modalMonthFilter");
if (modalMonthFilter) modalMonthFilter.value = currentMonth;

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
const monthFilterElem = document.getElementById("modalMonthFilter");
const selectedMonth = monthFilterElem ? monthFilterElem.value : "August";

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

const { data: allData, error } = await fetchAllSupabaseData(query => query.select("*").eq("Month", selectedMonth));

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
                No records found for <strong>${selectedMonth}</strong>
            </td>
        </tr>
    `;
    if (counter) counter.textContent = "0 records";
    return;
}

const keys = Object.keys(modalRawData[0]);
thead.innerHTML = keys.map(key => `<th>${key}</th>`).join("");

filterModalTable();
}

/* =========================================================
FILTER RECORD TABLE
========================================================= */

function filterModalTable() {
const cellFilterElem = document.getElementById("modalCellFilter");
const selectedCell = cellFilterElem ? cellFilterElem.value : "";
const tbody = document.getElementById("modalTableBody");
const counter = document.getElementById("recordsCount");

if (!tbody) return;

const filtered = selectedCell ? modalRawData.filter(row => row.Maq === selectedCell) : modalRawData;

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
    `<tr>${keys.map(key => `<td>${row[key] !== null && row[key] !== undefined ? row[key] : ""}</td>`).join("")}</tr>`
).join("");
}

/* =========================================================
MODAL DE DATA (uploaddata.html)
========================================================= */

function handleDataClick() {
    if (sessionActiveUser) {
        const modal = document.getElementById("dataModal");
        const iframe = document.getElementById("dataIframe");
        if (iframe) iframe.src = "uploaddata.html"; 
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
MONTH DROPDOWN Y WINDOW EVENTS
========================================================= */

function toggleMonthDropdown(event) {
if (event) event.stopPropagation();
}

window.addEventListener("click", function(event) {
const modal = document.getElementById("recordsModal");
const loginModal = document.getElementById("loginModal");
const dataModal = document.getElementById("dataModal");
const userDropdown = document.getElementById("userDropdown");
const avatarContainer = document.querySelector(".user-menu-container");

if (event.target === modal) closeRecordsModal();
if (event.target === loginModal) closeLoginModal();
if (event.target === dataModal) closeDataModal();

if (userDropdown && avatarContainer && !avatarContainer.contains(event.target)) {
    userDropdown.style.display = "none";
}
});

/* =========================================================
SELECT MONTH
========================================================= */

function selectMonth(monthName, event) {
if (event) event.stopPropagation();

currentSelectedMonth = monthName;

const monthTextElement = document.getElementById("selectedMonthText");
if (monthTextElement) monthTextElement.innerText = monthName;

document.querySelectorAll(".custom-option").forEach(option => {
    option.classList.toggle("selected", option.innerText === monthName);
});

loadMaintenance();
}

/* =========================================================
LOAD MAINTENANCE DATA
========================================================= */

async function loadMaintenance() {
if (!currentSelectedMonth) return;

const { data: allData, error } = await fetchAllSupabaseData(query => query.select("*").eq("Month", currentSelectedMonth));

if (error) {
    alert("Error loading Supabase data.");
    return;
}

maintenanceData = allData || [];
selectedMachine = null;

const selectedCellElem = document.getElementById("selectedCell");
if (selectedCellElem) selectedCellElem.innerText = "ALL";

updateDashboard();
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
const totalIssuesElem = document.getElementById("totalIssues");
if (totalIssuesElem) totalIssuesElem.innerText = maintenanceData.length.toLocaleString();

const cells = {};
const opCount = {};
const issues = {};
operations.forEach(op => opCount[op] = 0);

maintenanceData.forEach(row => {
    if (row.Maq) {
        cells[row.Maq] = (cells[row.Maq] || 0) + 1;
    }
    operations.forEach(op => {
        if (row[op]) {
            opCount[op]++;
            issues[row[op]] = (issues[row[op]] || 0) + 1;
        }
    });
});

const topCell = Object.entries(cells).sort((a,b) => b[1] - a[1])[0];
const topCellElem = document.getElementById("topCell");
if (topCellElem) {
    topCellElem.innerHTML = topCell
        ? `${topCell[0]}<small style="display:block; color:#2563EB; font-size:10px; margin-top:2px;">${topCell[1]} Issues</small>`
        : "--";
}

const topOperation = Object.entries(opCount).sort((a,b) => b[1] - a[1])[0];
const topOpElem = document.getElementById("topOperation");
if (topOpElem) topOpElem.innerText = topOperation && topOperation[1] > 0 ? topOperation[0] : "--";

const topIssue = Object.entries(issues).sort((a,b) => b[1] - a[1])[0];
const topIssueElem = document.getElementById("topIssue");
if (topIssueElem) topIssueElem.innerText = topIssue ? topIssue[0] : "--";
}

/* =========================================================
CHART ENGINE & OPTIONS
========================================================= */

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

/* =========================================================
CHARTS GENERATION
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
        datasets: [{ label: "Issues", data: values, backgroundColor: "rgba(37, 99, 235, 0.55)", hoverBackgroundColor: "#2563EB", borderRadius: 7, borderSkipped: false, barPercentage: .68 }]
    },
    options,
    plugins: [ChartDataLabels]
});
}

async function loadIndependentMonthlyChart() {
const { data: allYearData, error } = await fetchAllSupabaseData(query => query.select("Month"));
if (error) return;

const monthlyCount = {};
months.forEach(m => monthlyCount[m] = 0);

(allYearData || []).forEach(row => {
    if (row.Month && monthlyCount.hasOwnProperty(row.Month)) {
        monthlyCount[row.Month]++;
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

                if (isPositive) {
                    ctx.fillStyle = '#FCA5A5';
                    ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

                    ctx.beginPath();
                    ctx.moveTo(barX - 4, badgeY + badgeHeight);
                    ctx.lineTo(barX + 4, badgeY + badgeHeight);
                    ctx.lineTo(barX, badgeY + badgeHeight - 5);
                    ctx.closePath();
                    ctx.fillStyle = '#FCA5A5';
                    ctx.fill();
                } else {
                    ctx.fillStyle = '#6EE7B7';
                    ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

                    ctx.beginPath();
                    ctx.moveTo(barX - 4, badgeY + badgeHeight);
                    ctx.lineTo(barX + 4, badgeY + badgeHeight);
                    ctx.lineTo(barX, badgeY + badgeHeight + 5);
                    ctx.closePath();
                    ctx.fillStyle = '#6EE7B7';
                    ctx.fill();
                }

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

async function createCellChart() {
try {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 14);

    const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const startDateKey = formatDate(startDate);
    const nextDay = new Date(endDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayKey = formatDate(nextDay);

    const { data, error } = await supabaseClient
        .from("ManttoIssues")
        .select("Date")
        .gte("Date", startDateKey)
        .lt("Date", nextDayKey);

    if (error) return;

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

    (data || []).forEach(row => {
        if (!row.Date) return;
        let dateKey = "";
        if (typeof row.Date === "string") {
            const match = row.Date.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) dateKey = `${match[1]}-${match[2]}-${match[3]}`;
        }
        if (!dateKey) {
            const dateValue = new Date(row.Date);
            if (!isNaN(dateValue.getTime())) dateKey = formatDate(dateValue);
        }
        if (Object.prototype.hasOwnProperty.call(dailyCount, dateKey)) {
            dailyCount[dateKey]++;
        }
    });

    const values = dateKeys.map(dateKey => dailyCount[dateKey]);
    const options = baseChartOptions();
    options.scales.x.ticks.maxRotation = 0;
    options.scales.x.ticks.minRotation = 0;
    options.scales.x.ticks.autoSkip = false;

    renderChart("cellChart", {
        type: "bar",
        data: {
            labels,
            datasets: [{ label: "Issues", data: values, backgroundColor: "rgba(37, 99, 235, 0.55)", hoverBackgroundColor: "#2563EB", borderRadius: 7, borderSkipped: false, barPercentage: 0.68 }]
        },
        options,
        plugins: [ChartDataLabels]
    });
} catch (error) {
    console.error(error);
}
}

function createIssueChart() {
const issues = {};
maintenanceData.forEach(row => {
    operations.forEach(op => {
        if (row[op]) issues[row[op]] = (issues[row[op]] || 0) + 1;
    });
});

const result = Object.entries(issues).sort((a,b) => b[1] - a[1]).slice(0,10);
const colors = result.map((_,i) => i === 0 ? "rgba(245, 158, 11, 0.65)" : "rgba(37, 99, 235, 0.55)");

const options = baseChartOptions();
options.scales.x.ticks.maxRotation = 45;
options.scales.x.ticks.autoSkip = false;

renderChart("issueChart", {
    type: "bar",
    data: {
        labels: result.map(x => x[0]),
        datasets: [{ label: "Count", data: result.map(x => x[1]), backgroundColor: colors, borderRadius: 7, borderSkipped: false }]
    },
    options,
    plugins: [ChartDataLabels]
});
}

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
        datasets: [{ label: "Issues", data: Object.values(count), backgroundColor: "rgba(37, 99, 235, 0.55)", hoverBackgroundColor: "#2563EB", borderRadius: 6, borderSkipped: false, barPercentage: .65 }]
    },
    options,
    plugins: [ChartDataLabels]
});
}

/* =========================================================
TOP 10 TABLE & SELECTION
========================================================= */

function createTop10Table() {
const count = {};
let totalValidIssues = 0;

maintenanceData.forEach(row => {
    if (row.Maq) {
        count[row.Maq] = (count[row.Maq] || 0) + 1;
        totalValidIssues++;
    }
});

const result = Object.entries(count).sort((a,b) => b[1] - a[1]).slice(0,10);
const tbody = document.getElementById("top10Table");
if (!tbody) return;

tbody.innerHTML = result.map((item, index) => {
    const percentage = totalValidIssues > 0 ? ((item[1] / totalValidIssues) * 100).toFixed(1) + "%" : "0.0%";
    const isSelected = selectedMachine === item[0] ? "selected-row" : "";
    return `
        <tr class="${isSelected}" onclick="selectMachineForAnalysis('${item[0]}')">
            <td>#${index + 1}</td>
            <td>${item[0]}</td>
            <td><b>${item[1]}</b></td>
            <td>${percentage}</td>
        </tr>
    `;
}).join("");
}

function selectMachineForAnalysis(machineName) {
selectedMachine = machineName;
const selectedCellElem = document.getElementById("selectedCell");
if (selectedCellElem) selectedCellElem.innerText = machineName;

createTop10Table();
updateCellAnalysis();
}

function updateCellAnalysis() {
const filteredData = selectedMachine ? maintenanceData.filter(row => row.Maq === selectedMachine) : maintenanceData;

["md", "op1", "op2", "chiron"].forEach(opKey => {
    const opName = opKey === "md" ? "MD" : opKey === "op1" ? "OP1" : opKey === "op2" ? "OP2" : "CHIRON";
    const issues = {};

    filteredData.forEach(row => {
        if (row[opName]) issues[row[opName]] = (issues[row[opName]] || 0) + 1;
    });

    const result = Object.entries(issues).sort((a,b) => b[1] - a[1]).slice(0,5);
    const options = baseChartOptions();
    options.scales.x.ticks.maxRotation = 15;
    options.scales.x.ticks.minRotation = 0;
    options.scales.x.ticks.font = { size: 10, weight: '600' };

    renderChart(opKey + "Chart", {
        type: "bar",
        data: {
            labels: result.map(x => x[0]),
            datasets: [{ label: "Count", data: result.map(x => x[1]), backgroundColor: "rgba(0, 166, 166, 0.55)", hoverBackgroundColor: "#00A6A6", borderRadius: 6, borderSkipped: false, barPercentage: 0.72 }]
        },
        options,
        plugins: [ChartDataLabels]
    });
});
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
    if (!currentSelectedMonth) {
        const monthIndex = new Date().getMonth();
        currentSelectedMonth = months[monthIndex] || "August";
        const monthTextElem = document.getElementById("selectedMonthText");
        if (monthTextElem) monthTextElem.innerText = currentSelectedMonth;
    }
    setCurrentMonth();
    setProtectedElementsState(false);
});