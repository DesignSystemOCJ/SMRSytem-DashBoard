const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

/* =========================================================
GLOBAL STATE & CONSTANTS
========================================================= */
let maintenanceData = [];
let activeCharts = {};
let selectedMachine = null;
let currentSelectedMonth = "";
let modalRawData = [];

const operations = ["MD", "OP1", "OP2", "CHIRON", "ROBOT FANUC", "ROBOT JR", "AGS", "TRANSFER", "CONVEYOR"];
const machines = ["C01","C02","C03","C04","C05","C06","C07","C08","C09","C10","C11","C12","C13","C14","C15","C16","C17","C18","C19","C20","C21","C22","C23","C24","C25","C26","C27","C28","C29","C30","C33","C34","C35","C36"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

Chart.defaults.font.family = '"Segoe UI", Inter, Arial, sans-serif';
Chart.defaults.color = "#64748B";
Chart.defaults.animation.duration = 800;

/* =========================================================
SUPABASE PAGINATED FETCH (Optimizado)
========================================================= */
async function fetchAllSupabaseData(queryBuilderFn) {
    let allData = [];
    const pageSize = 1000;
    let from = 0;
    let moreData = true;

    try {
        while (moreData) {
            const query = queryBuilderFn(supabaseClient.from("ManttoIssues")).range(from, from + pageSize - 1);
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

/* =========================================================
UI INITIALIZERS & DROPDOWNS
========================================================= */
function populateMonthDropdowns() {
    const monthContainer = document.getElementById("monthOptionsContainer");
    if (monthContainer) {
        monthContainer.innerHTML = months.map(m => `<div class="custom-option" onclick="selectMonth('${m}', event)">${m}</div>`).join("");
    }
    const modalSelect = document.getElementById("modalMonthFilter");
    if (modalSelect) {
        modalSelect.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join("");
    }
}

function setCurrentMonth() {
    const month = months[new Date().getMonth()] || "August";
    selectMonth(month);
    const modalSelect = document.getElementById("modalMonthFilter");
    if (modalSelect) modalSelect.value = month;
    populateModalCellFilter();
}

function populateModalCellFilter() {
    const cellSelect = document.getElementById("modalCellFilter");
    if (!cellSelect) return;
    cellSelect.innerHTML = '<option value="">All Cells</option>' + machines.map(m => `<option value="${m}">${m}</option>`).join("");
}

/* =========================================================
MODAL CONTROL & RECORDS
========================================================= */
function openRecordsModal() {
    document.getElementById("recordsModal")?.style.setProperty("display", "flex");
    const currentMonth = currentSelectedMonth || months[new Date().getMonth()];
    const modalMonthFilter = document.getElementById("modalMonthFilter");
    if (modalMonthFilter) modalMonthFilter.value = currentMonth;
    loadModalRecords();
}

function closeRecordsModal() {
    document.getElementById("recordsModal")?.style.setProperty("display", "none");
}

function clearCellFilter() {
    const cellFilter = document.getElementById("modalCellFilter");
    if (cellFilter) cellFilter.value = "";
    filterModalTable();
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
    if (modalRawData.length === 0) {
        thead.innerHTML = "<th>No Data</th>";
        tbody.innerHTML = `<tr><td style="text-align:center; padding:40px;"><i class="fa-solid fa-database" style="font-size:25px; color:#CBD5E1; display:block; margin-bottom:10px;"></i>No records found for <strong>${selectedMonth}</strong></td></tr>`;
        if (counter) counter.textContent = "0 records";
        return;
    }

    const keys = Object.keys(modalRawData[0]);
    thead.innerHTML = keys.map(k => `<th>${k}</th>`).join("");
    filterModalTable();
}

function filterModalTable() {
    const selectedCell = document.getElementById("modalCellFilter")?.value || "";
    const tbody = document.getElementById("modalTableBody");
    const counter = document.getElementById("recordsCount");
    if (!tbody) return;

    const filtered = selectedCell ? modalRawData.filter(r => r.Maq === selectedCell) : modalRawData;
    if (counter) counter.textContent = `${filtered.length.toLocaleString()} records`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="100" style="text-align:center; padding:40px;">No records match the selected cell.</td></tr>`;
        return;
    }

    const keys = modalRawData.length > 0 ? Object.keys(modalRawData[0]) : [];
    tbody.innerHTML = filtered.map(row => `<tr>${keys.map(k => `<td>${row[k] ?? ""}</td>`).join("")}</tr>`).join("");
}

function handleDataClick() {
    if (sessionActiveUser) {
        document.getElementById("dataIframe").src = "uploadmtto.html";
        document.getElementById("dataModal")?.style.setProperty("display", "flex");
    } else {
        alert('Debe iniciar sesión para acceder a esta opción.');
    }
}

function closeDataModal() {
    document.getElementById("dataModal")?.style.setProperty("display", "none");
    document.getElementById("dataIframe").src = "";
}

/* =========================================================
EVENTS & MONTH SELECTION
========================================================= */
function toggleMonthDropdown(event) { event?.stopPropagation(); }

window.addEventListener("click", function(event) {
    if (event.target === document.getElementById("recordsModal")) closeRecordsModal();
    if (event.target === document.getElementById("loginModal")) closeLoginModal();
    if (event.target === document.getElementById("dataModal")) closeDataModal();

    const userDropdown = document.getElementById("userDropdown");
    const avatarContainer = document.querySelector(".user-menu-container");
    if (userDropdown && avatarContainer && !avatarContainer.contains(event.target)) {
        userDropdown.style.display = "none";
    }
});

function selectMonth(monthName, event) {
    event?.stopPropagation();
    currentSelectedMonth = monthName;
    const monthTextElement = document.getElementById("selectedMonthText");
    if (monthTextElement) monthTextElement.innerText = monthName;

    document.querySelectorAll(".custom-option").forEach(opt => {
        opt.classList.toggle("selected", opt.innerText === monthName);
    });
    loadMaintenance();
}

async function loadMaintenance() {
    if (!currentSelectedMonth) return;
    const { data, error } = await fetchAllSupabaseData(q => q.select("*").eq("Month", currentSelectedMonth));
    if (error) { alert("Error loading Supabase data."); return; }

    maintenanceData = data || [];
    selectedMachine = null;
    const selectedCellElem = document.getElementById("selectedCell");
    if (selectedCellElem) selectedCellElem.innerText = "ALL";
    updateDashboard();
}

/* =========================================================
DASHBOARD & KPIS
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

function calculateKPIs() {
    document.getElementById("totalIssues").innerText = maintenanceData.length.toLocaleString();

    const cells = {}, issues = {};
    const opCount = Object.fromEntries(operations.map(op => [op, 0]));

    maintenanceData.forEach(row => {
        if (row.Maq) cells[row.Maq] = (cells[row.Maq] || 0) + 1;
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
        topCellElem.innerHTML = topCell ? `${topCell[0]}<small style="display:block; color:#2563EB; font-size:10px; margin-top:2px;">${topCell[1]} Issues</small>` : "--";
    }

    const topOperation = Object.entries(opCount).sort((a,b) => b[1] - a[1])[0];
    document.getElementById("topOperation").innerText = topOperation && topOperation[1] > 0 ? topOperation[0] : "--";

    const topIssue = Object.entries(issues).sort((a,b) => b[1] - a[1])[0];
    document.getElementById("topIssue").innerText = topIssue ? topIssue[0] : "--";
}

/* =========================================================
CHARTS CONFIGURATION
========================================================= */
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
            datalabels: { color: "#334155", anchor: "end", align: "top", offset: 4, font: { weight: "800", size: 9 } }
        },
        scales: {
            y: { beginAtZero: true, grace: "15%", ticks: { precision: 0, color: "#64748B", font: { size: 9 } }, grid: { color: "rgba(148,163,184,.13)" }, border: { display: false } },
            x: { ticks: { color: "#64748B", font: { size: 8, weight: "600" }, maxRotation: 45, minRotation: 30 }, grid: { display: false }, border: { display: false } }
        }
    };
}

function createOperationChart() {
    const values = operations.map(op => maintenanceData.filter(row => row[op]).length);
    renderChart("operationChart", {
        type: "bar",
        data: { labels: operations, datasets: [{ label: "Issues", data: values, backgroundColor: "rgba(37, 99, 235, 0.55)", hoverBackgroundColor: "#2563EB", borderRadius: 7, borderSkipped: false, barPercentage: .68 }] },
        options: baseChartOptions(),
        plugins: [ChartDataLabels]
    });
}

async function loadIndependentMonthlyChart() {
    const { data, error } = await fetchAllSupabaseData(q => q.select("Month"));
    if (error) return;

    const monthlyCount = Object.fromEntries(months.map(m => [m, 0]));
    (data || []).forEach(row => { if (row.Month && monthlyCount.hasOwnProperty(row.Month)) monthlyCount[row.Month]++; });

    const values = months.map(m => monthlyCount[m]);
    const changes = values.map((val, idx) => {
        if (idx === 0) return null;
        const prev = values[idx - 1];
        if (prev === 0) return val > 0 ? 100 : 0;
        return Math.round(((val - prev) / prev) * 100);
    });

    const options = baseChartOptions();
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
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '700 11px "Segoe UI", Inter, sans-serif';
                ctx.fillText(value, bar.x, bar.y + (bar.base - bar.y) / 2);

                if (index > 0 && changes[index] !== null) {
                    const change = changes[index];
                    const isPositive = change >= 0;
                    const badgeWidth = 42, badgeHeight = 18;
                    const badgeX = bar.x - badgeWidth / 2, badgeY = bar.y - 26;

                    ctx.fillStyle = isPositive ? '#FCA5A5' : '#6EE7B7';
                    ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

                    ctx.beginPath();
                    ctx.moveTo(bar.x - 4, badgeY + badgeHeight);
                    ctx.lineTo(bar.x + 4, badgeY + badgeHeight);
                    ctx.lineTo(bar.x, badgeY + badgeHeight + (isPositive ? -5 : 5));
                    ctx.closePath();
                    ctx.fill();

                    ctx.fillStyle = '#000000';
                    ctx.font = '800 9px "Segoe UI", Inter, sans-serif';
                    ctx.fillText(`${isPositive ? '+' : ''}${change}%`, bar.x, badgeY + badgeHeight / 2);
                }
            });
            ctx.restore();
        }
    };

    renderChart("monthlyIssuesChart", {
        type: "bar",
        data: { labels: months, datasets: [{ label: "Issues", data: values, backgroundColor: "rgba(124, 58, 237, 0.55)", hoverBackgroundColor: "#7C3AED", borderRadius: 7, borderSkipped: false, barPercentage: 0.68 }] },
        options,
        plugins: [monthlyTrendPlugin]
    });
}

async function createCellChart() {
    try {
        const today = new Date();
        const endDate = new Date(today); endDate.setDate(endDate.getDate() - 1);
        const startDate = new Date(endDate); startDate.setDate(startDate.getDate() - 14);

        const formatDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const nextDay = new Date(endDate); nextDay.setDate(nextDay.getDate() + 1);

        const { data, error } = await supabaseClient.from("ManttoIssues").select("Date").gte("Date", formatDate(startDate)).lt("Date", formatDate(nextDay));
        if (error) return;

        const dailyCount = {}, dateKeys = [], labels = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let i = 0; i < 15; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const key = formatDate(d);
            dailyCount[key] = 0;
            dateKeys.push(key);
            labels.push(`${String(d.getDate()).padStart(2, "0")}-${monthNames[d.getMonth()]}`);
        }

        (data || []).forEach(row => {
            if (!row.Date) return;
            let key = typeof row.Date === "string" ? row.Date.match(/^(\d{4})-(\d{2})-(\d{2})/)?.[0] : null;
            if (!key) {
                const dt = new Date(row.Date);
                if (!isNaN(dt.getTime())) key = formatDate(dt);
            }
            if (dailyCount.hasOwnProperty(key)) dailyCount[key]++;
        });

        const options = baseChartOptions();
        options.scales.x.ticks.autoSkip = true;
        options.scales.x.ticks.maxTicksLimit = 8;

        renderChart("cellChart", {
            type: "bar",
            data: { labels, datasets: [{ label: "Issues", data: dateKeys.map(k => dailyCount[k]), backgroundColor: "rgba(37, 99, 235, 0.55)", hoverBackgroundColor: "#2563EB", borderRadius: 7, borderSkipped: false, barPercentage: 0.68 }] },
            options,
            plugins: [ChartDataLabels]
        });
    } catch (e) { console.error(e); }
}

function createIssueChart() {
    const issues = {};
    maintenanceData.forEach(row => {
        operations.forEach(op => { if (row[op]) issues[row[op]] = (issues[row[op]] || 0) + 1; });
    });

    const result = Object.entries(issues).sort((a,b) => b[1] - a[1]).slice(0,10);
    renderChart("issueChart", {
        type: "bar",
        data: {
            labels: result.map(x => x[0]),
            datasets: [{ label: "Count", data: result.map(x => x[1]), backgroundColor: result.map((_, i) => i === 0 ? "rgba(245, 158, 11, 0.65)" : "rgba(37, 99, 235, 0.55)"), borderRadius: 7, borderSkipped: false }]
        },
        options: baseChartOptions(),
        plugins: [ChartDataLabels]
    });
}

function createMachineChart() {
    const count = Object.fromEntries(machines.map(m => [m, 0]));
    maintenanceData.forEach(row => { if (row.Maq && count.hasOwnProperty(row.Maq)) count[row.Maq]++; });

    renderChart("machineChart", {
        type: "bar",
        data: {
            labels: Object.keys(count),
            datasets: [{ label: "Issues", data: Object.values(count), backgroundColor: "rgba(37, 99, 235, 0.55)", hoverBackgroundColor: "#2563EB", borderRadius: 6, borderSkipped: false, barPercentage: .65 }]
        },
        options: baseChartOptions(),
        plugins: [ChartDataLabels]
    });
}

/* =========================================================
TOP 10 & CELL ANALYSIS
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

    tbody.innerHTML = result.map(([cell, val], idx) => {
        const pct = totalValidIssues > 0 ? ((val / totalValidIssues) * 100).toFixed(1) + "%" : "0.0%";
        const isSelected = selectedMachine === cell ? "selected-row" : "";
        return `<tr class="${isSelected}" onclick="selectMachineForAnalysis('${cell}')"><td>#${idx + 1}</td><td>${cell}</td><td><b>${val}</b></td><td>${pct}</td></tr>`;
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
        filteredData.forEach(row => { if (row[opName]) issues[row[opName]] = (issues[row[opName]] || 0) + 1; });

        const result = Object.entries(issues).sort((a,b) => b[1] - a[1]).slice(0,5);
        renderChart(opKey + "Chart", {
            type: "bar",
            data: { labels: result.map(x => x[0]), datasets: [{ label: "Count", data: result.map(x => x[1]), backgroundColor: "rgba(0, 166, 166, 0.55)", hoverBackgroundColor: "#00A6A6", borderRadius: 6, borderSkipped: false, barPercentage: 0.72 }] },
            options: baseChartOptions(),
            plugins: [ChartDataLabels]
        });
    });
}

/* =========================================================
SESSION & AUTH
========================================================= */
let sessionActiveUser = null;

function toggleUserDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById("userDropdown");
    if (dropdown) dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
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
    document.getElementById("userEmailText").textContent = isLoggedIn ? `${userName.toLowerCase()}@primewheel.com` : "Inicia sesión para continuar";
}

function openLoginPrompt() {
    document.getElementById("userDropdown")?.style.setProperty("display", "none");
    document.getElementById("loginModal")?.style.setProperty("display", "flex");
}

function closeLoginModal() {
    document.getElementById("loginModal")?.style.setProperty("display", "none");
}

async function handleFormLogin(event) {
    event.preventDefault();
    const userInput = document.getElementById("loginUser").value.trim();
    const passwordInput = document.getElementById("loginPassword").value.trim();

    try {
        const { data, error } = await supabaseClient.from("Cuentas").select("*").eq("Usurio", userInput).eq("Password", passwordInput);
        if (error) { alert("Error al verificar credenciales: " + error.message); return; }

        if (data?.length > 0) {
            closeLoginModal();
            setProtectedElementsState(true, userInput);
            localStorage.setItem("smrc_logged_user", userInput);
            document.getElementById("loginForm").reset();
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
    document.getElementById("userDropdown")?.style.setProperty("display", "none");
}

/* =========================================================
INITIALIZATION & SECURITY
========================================================= */
window.addEventListener("load", function() {
    populateMonthDropdowns();
    if (!currentSelectedMonth) {
        currentSelectedMonth = months[new Date().getMonth()] || "August";
        const monthTextElem = document.getElementById("selectedMonthText");
        if (monthTextElem) monthTextElem.innerText = currentSelectedMonth;
    }
    setCurrentMonth();
    
    const savedUser = localStorage.getItem("smrc_logged_user");
    setProtectedElementsState(!!savedUser, savedUser || "");
});

// Bloqueos de seguridad originales conservados
["contextmenu", "selectstart", "copy", "cut", "dragstart"].forEach(evt => {
    document.addEventListener(evt, e => e.preventDefault());
});

document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.key === "F12" || (e.ctrlKey && (e.shiftKey && ["i", "j", "c"].includes(key) || ["u", "c", "x", "s", "a"].includes(key)))) {
        e.preventDefault();
    }
});