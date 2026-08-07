const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let maintenanceData = [];
let activeCharts = {};
let selectedMachine = null;
let currentSelectedMonth = "";
let modalRawData = [];

const operations = ["MD", "OP1", "OP2", "CHIRON", "ROBOT FANUC", "ROBOT JR", "AGS", "TRANSFER", "CONVEYOR"];
const machines = ["C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08", "C09", "C10", "C11", "C12", "C13", "C14", "C15", "C16", "C17", "C18", "C19", "C20", "C21", "C22", "C23", "C24", "C25", "C26", "C27", "C28", "C29", "C30", "C33", "C34", "C35", "C36"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function setCurrentMonth() {
    let monthIndex = new Date().getMonth();
    selectMonth(months[monthIndex]);
    
    let modalSelect = document.getElementById("modalMonthFilter");
    if (modalSelect) {
        modalSelect.value = months[monthIndex];
    }
    
    populateModalCellFilter();
}

function populateModalCellFilter() {
    let cellSelect = document.getElementById("modalCellFilter");
    if (!cellSelect) return;
    cellSelect.innerHTML = '<option value="">All Cells</option>';
    
    for (let i = 1; i <= 36; i++) {
        let cellName = "C" + (i < 10 ? "0" + i : i);
        if (cellName === "C31" || cellName === "C32") continue;
        let opt = document.createElement("option");
        opt.value = cellName;
        opt.textContent = cellName;
        cellSelect.appendChild(opt);
    }
}

function openRecordsModal() {
    document.getElementById("recordsModal").style.display = "flex";
    let currentMonthName = currentSelectedMonth || months[new Date().getMonth()];
    document.getElementById("modalMonthFilter").value = currentMonthName;
    loadModalRecords();
}

function closeRecordsModal() {
    document.getElementById("recordsModal").style.display = "none";
}

function clearCellFilter() {
    document.getElementById("modalCellFilter").value = "";
    filterModalTable();
}

async function loadModalRecords() {
    let selectedMonth = document.getElementById("modalMonthFilter").value;
    let tbody = document.getElementById("modalTableBody");
    let thead = document.getElementById("modalTableHeaders");
    
    tbody.innerHTML = '<tr><td colspan="100" style="text-align: center; padding: 30px;">Loading data...</td></tr>';

    let allData = [];
    let pageSize = 1000;
    let from = 0;
    let moreData = true;

    while (moreData) {
        const { data, error } = await supabaseClient
            .from("ManttoIssues")
            .select("*")
            .eq("Month", selectedMonth)
            .range(from, from + pageSize - 1);

        if (error) {
            console.error(error);
            tbody.innerHTML = '<tr><td colspan="100" style="text-align: center; color: red; padding: 30px;">Error loading data from Supabase</td></tr>';
            return;
        }

        if (data && data.length > 0) {
            allData = allData.concat(data);
            from += pageSize;
        } else {
            moreData = false;
        }
    }

    modalRawData = allData;

    if (modalRawData.length === 0) {
        thead.innerHTML = '<th>No Data</th>';
        tbody.innerHTML = '<tr><td style="text-align: center; padding: 30px;">No records found for ' + selectedMonth + '</td></tr>';
        return;
    }

    let keys = Object.keys(modalRawData[0]);
    let headerHtml = "";
    keys.forEach(key => {
        headerHtml += `<th>${key}</th>`;
    });
    thead.innerHTML = headerHtml;

    filterModalTable();
}

function filterModalTable() {
    let selectedCell = document.getElementById("modalCellFilter").value;
    let tbody = document.getElementById("modalTableBody");
    
    let filtered = modalRawData;
    if (selectedCell) {
        filtered = modalRawData.filter(row => row.Maq === selectedCell);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="100" style="text-align: center; padding: 30px;">No records match the selected cell filter</td></tr>';
        return;
    }

    let keys = modalRawData.length > 0 ? Object.keys(modalRawData[0]) : [];
    let rowsHtml = "";

    filtered.forEach(row => {
        rowsHtml += "<tr>";
        keys.forEach(key => {
            let val = row[key] !== null && row[key] !== undefined ? row[key] : "";
            rowsHtml += `<td>${val}</td>`;
        });
        rowsHtml += "</tr>";
    });

    tbody.innerHTML = rowsHtml;
}

function toggleMonthDropdown(event) {
    event.stopPropagation();
    let box = document.getElementById("filterBox");
    let dropdown = document.getElementById("monthDropdown");
    
    let isOpen = dropdown.style.display === "block";
    dropdown.style.display = isOpen ? "none" : "block";
    if (!isOpen) {
        box.classList.add("active");
    } else {
        box.classList.remove("active");
    }
}

window.addEventListener("click", function(event) {
    let box = document.getElementById("filterBox");
    let dropdown = document.getElementById("monthDropdown");
    
    let modal = document.getElementById("recordsModal");
    if (event.target === modal) {
        closeRecordsModal();
    }

    dropdown.style.display = "none";
    box.classList.remove("active");
});

function selectMonth(monthName, event) {
    if (event) event.stopPropagation();
    currentSelectedMonth = monthName;
    document.getElementById("selectedMonthText").innerText = monthName;

    let options = document.querySelectorAll(".custom-option");
    options.forEach(opt => {
        if (opt.innerText === monthName) {
            opt.classList.add("selected");
        } else {
            opt.classList.remove("selected");
        }
    });

    document.getElementById("monthDropdown").style.display = "none";
    document.getElementById("filterBox").classList.remove("active");

    loadMaintenance();
}

async function loadMaintenance() {
    if (!currentSelectedMonth) return;
    let allData = [];
    let pageSize = 1000;
    let from = 0;
    let moreData = true;

    while (moreData) {
        const { data, error } = await supabaseClient
            .from("ManttoIssues")
            .select("*")
            .eq("Month", currentSelectedMonth)
            .range(from, from + pageSize - 1);

        if (error) {
            console.error(error);
            alert("Error loading Supabase data");
            return;
        }

        if (data && data.length > 0) {
            allData = allData.concat(data);
            from += pageSize;
        } else {
            moreData = false;
        }
    }

    maintenanceData = allData;
    updateDashboard();
}

function updateDashboard() {
    calculateKPIs();
    createOperationChart();
    createCellChart();
    createIssueChart();
    createMachineChart();
    createTop10Table();
    updateCellAnalysis();
}

function calculateKPIs() {
    document.getElementById("totalIssues").innerHTML = maintenanceData.length;

    let cells = {};
    maintenanceData.forEach(row => {
        if (row.Maq) cells[row.Maq] = (cells[row.Maq] || 0) + 1;
    });
    let topCell = Object.entries(cells).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("topCell").innerHTML = topCell ? topCell[0] + "<br><small style='color:var(--sap-blue); font-size:12px;'>" + topCell[1] + " Issues</small>" : "--";

    let opCount = {};
    operations.forEach(op => opCount[op] = 0);
    maintenanceData.forEach(row => {
        operations.forEach(op => { if (row[op]) opCount[op]++; });
    });
    let topOperation = Object.entries(opCount).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("topOperation").innerHTML = topOperation && topOperation[1] > 0 ? topOperation[0] : "--";

    let issues = {};
    maintenanceData.forEach(row => {
        operations.forEach(op => { if (row[op]) issues[row[op]] = (issues[row[op]] || 0) + 1; });
    });
    let topIssue = Object.entries(issues).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("topIssue").innerHTML = topIssue ? topIssue[0] : "--";
}

function renderChart(canvasId, config) {
    if (activeCharts[canvasId]) {
        activeCharts[canvasId].destroy();
    }
    activeCharts[canvasId] = new Chart(document.getElementById(canvasId), config);
}

function createOperationChart() {
    let values = operations.map(op => maintenanceData.filter(row => row[op]).length);
    renderChart("operationChart", {
        type: "bar",
        data: { labels: operations, datasets: [{ label: "Issues", data: values, backgroundColor: "#0A6ED1", borderRadius: 6 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 35 } },
            plugins: { legend: { display: false }, datalabels: { color: "#334155", anchor: "end", align: "top", offset: 5, font: { weight: "bold", size: 11 } } },
            scales: { 
                y: { beginAtZero: true, grace: "15%", ticks: { precision: 0, color: "#64748B" }, grid: { color: "#F1F5F9" } }, 
                x: { ticks: { maxRotation: 45, minRotation: 45, color: "#64748B" }, grid: { display: false } } 
            }
        },
        plugins: [ChartDataLabels]
    });
}

function createCellChart() {
    let count = {};
    maintenanceData.forEach(row => { if (row.Maq) count[row.Maq] = (count[row.Maq] || 0) + 1; });
    let result = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 10);
    let colors = result.map((x, i) => i === 0 ? "#00A6A6" : "#0A6ED1");

    renderChart("cellChart", {
        type: "bar",
        data: { labels: result.map(x => x[0]), datasets: [{ label: "Issues", data: result.map(x => x[1]), backgroundColor: colors, borderRadius: 6 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 35 } },
            plugins: { legend: { display: false }, datalabels: { color: "#334155", anchor: "end", align: "top", offset: 5, font: { weight: "bold", size: 11 } } },
            scales: { 
                y: { beginAtZero: true, grace: "15%", ticks: { precision: 0, color: "#64748B" }, grid: { color: "#F1F5F9" } }, 
                x: { ticks: { maxRotation: 45, minRotation: 45, color: "#64748B" }, grid: { display: false } } 
            }
        },
        plugins: [ChartDataLabels]
    });
}

function createIssueChart() {
    let issues = {};
    maintenanceData.forEach(row => {
        operations.forEach(op => { if (row[op]) issues[row[op]] = (issues[row[op]] || 0) + 1; });
    });
    let result = Object.entries(issues).sort((a, b) => b[1] - a[1]).slice(0, 10);
    let colors = result.map((x, i) => i === 0 ? "#00A6A6" : "#0A6ED1");

    renderChart("issueChart", {
        type: "bar",
        data: { labels: result.map(x => x[0]), datasets: [{ label: "Count", data: result.map(x => x[1]), backgroundColor: colors, borderRadius: 6 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 40 } },
            plugins: { legend: { display: false }, datalabels: { color: "#334155", anchor: "end", align: "top", offset: 5, font: { weight: "bold", size: 11 } } },
            scales: { 
                y: { beginAtZero: true, grace: "15%", ticks: { precision: 0, color: "#64748B" }, grid: { color: "#F1F5F9" } }, 
                x: { ticks: { maxRotation: 45, minRotation: 45, autoSkip: false, color: "#64748B" }, grid: { display: false } } 
            }
        },
        plugins: [ChartDataLabels]
    });
}

function createMachineChart() {
    let count = {};
    machines.forEach(machine => count[machine] = 0);
    maintenanceData.forEach(row => {
        if (row.Maq && count.hasOwnProperty(row.Maq)) {
            count[row.Maq]++;
        }
    });
    
    let labels = Object.keys(count);
    let values = Object.values(count);

    renderChart("machineChart", {
        type: "bar",
        data: { labels: labels, datasets: [{ label: "Issues", data: values, backgroundColor: "#0A6ED1", borderRadius: 6 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 35 } },
            plugins: { legend: { display: false }, datalabels: { color: "#334155", anchor: "end", align: "top", offset: 5, font: { weight: "bold", size: 11 } } },
            scales: { 
                y: { beginAtZero: true, grace: "15%", ticks: { precision: 0, color: "#64748B" }, grid: { color: "#F1F5F9" } }, 
                x: { ticks: { maxRotation: 45, minRotation: 45, color: "#64748B" }, grid: { display: false } } 
            }
        },
        plugins: [ChartDataLabels]
    });
}

function createTop10Table() {
    let count = {};
    maintenanceData.forEach(row => { if (row.Maq) count[row.Maq] = (count[row.Maq] || 0) + 1; });
    let result = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 10);
    
    let tbody = document.getElementById("top10Table");
    let html = "";
    result.forEach((item, index) => {
        html += `<tr onclick="selectMachineForAnalysis('${item[0]}')">
            <td class="rank">#${index + 1}</td>
            <td>${item[0]}</td>
            <td><b>${item[1]}</b></td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function selectMachineForAnalysis(machineName) {
    selectedMachine = machineName;
    document.getElementById("selectedCell").innerText = machineName;
    updateCellAnalysis();
}

function updateCellAnalysis() {
    let filteredData = selectedMachine ? maintenanceData.filter(row => row.Maq === selectedMachine) : maintenanceData;
    
    ["md", "op1", "op2", "chiron"].forEach(opKey => {
        let opName = opKey === "md" ? "MD" : opKey === "op1" ? "OP1" : opKey === "op2" ? "OP2" : "CHIRON";
        let issues = {};
        filteredData.forEach(row => { if (row[opName]) issues[row[opName]] = (issues[row[opName]] || 0) + 1; });
        let result = Object.entries(issues).sort((a, b) => b[1] - a[1]).slice(0, 5);

        renderChart(opKey + "Chart", {
            type: "bar",
            data: { labels: result.map(x => x[0]), datasets: [{ label: "Count", data: result.map(x => x[1]), backgroundColor: "#00A6A6", borderRadius: 6 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                layout: { padding: { top: 30 } },
                plugins: { legend: { display: false }, datalabels: { color: "#334155", anchor: "end", align: "top", offset: 4, font: { weight: "bold", size: 10 } } },
                scales: { 
                    y: { beginAtZero: true, grace: "15%", ticks: { precision: 0, color: "#64748B" }, grid: { color: "#F1F5F9" } }, 
                    x: { ticks: { maxRotation: 30, minRotation: 30, color: "#64748B", font: { size: 10 } }, grid: { display: false } } 
                }
            },
            plugins: [ChartDataLabels]
        });
    });
}

window.onload = function() {
    setCurrentMonth();
};