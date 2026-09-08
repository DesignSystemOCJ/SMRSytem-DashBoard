const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let scrapData = [];
let activeCharts = {};
let selectedArea = null; 
let currentSelectedMonth = "";
let modalRawData = [];
let currentScrapPercentage = 0.00;

let machineChartAllData = [];
let machineChartWindowIndex = 0;
const MACHINE_WINDOW_SIZE = 15;

let selectedTrendsDefects = [];
let trendChartStates = {};
let activeTrendCharts = {};
const TREND_WINDOW_SIZE = 15;

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
            let query = queryBuilderFn(supabaseClient.from("Scrap")).range(from, from + pageSize - 1);
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

function setCurrentMonth() {
    const monthIndex = new Date().getMonth();
    const month = months[monthIndex] || "August";
    selectMonth(month);
}

function openRecordsModal() {
    const modal = document.getElementById("recordsModal");
    if (modal) modal.style.display = "flex";

    const currentMonth = currentSelectedMonth || months[new Date().getMonth()];
    
    const monthSelect = document.getElementById("modalMonthSelect");
    if (monthSelect) monthSelect.value = currentMonth;

    const searchInput = document.getElementById("trendsSearchInput");
    if (searchInput) searchInput.value = "";

    const monthTitleElem = document.getElementById("trendsModalMonthTitle");
    if (monthTitleElem) monthTitleElem.innerText = currentMonth;

    selectedTrendsDefects = [];
    loadTrendsDefectsData(currentMonth);
}

function handleModalMonthChange(month) {
    const monthTitleElem = document.getElementById("trendsModalMonthTitle");
    if (monthTitleElem) monthTitleElem.innerText = month;

    const searchInput = document.getElementById("trendsSearchInput");
    if (searchInput) searchInput.value = "";

    selectedTrendsDefects = [];
    loadTrendsDefectsData(month);
}

function closeRecordsModal() {
    const modal = document.getElementById("recordsModal");
    if (modal) modal.style.display = "none";
    destroyTrendCharts();
}

function destroyTrendCharts() {
    Object.values(activeTrendCharts).forEach(chart => {
        if (chart) chart.destroy();
    });
    activeTrendCharts = {};
}

async function loadTrendsDefectsData(selectedMonth) {
    const tbody = document.getElementById("trendsDefectsTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#64748B;">Loading defects...</td></tr>`;

    const { data: allData, error } = await fetchAllSupabaseData(query => query.select("*").eq("Month", selectedMonth));

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#EF4444;">Error loading data.</td></tr>`;
        return;
    }

    modalRawData = allData || [];
    renderTrendsTop20Table();
    updateTrendsChartsContainer();
}

function filterTrendsTable() {
    renderTrendsTop20Table();
}

function renderTrendsTop20Table() {
    const tbody = document.getElementById("trendsDefectsTableBody");
    if (!tbody) return;

    const searchInput = document.getElementById("trendsSearchInput");
    const filterText = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const defectCounts = {};
    let totalValid = 0;

    modalRawData.forEach(row => {
        if (row.Defect_Desc) {
            defectCounts[row.Defect_Desc] = (defectCounts[row.Defect_Desc] || 0) + 1;
            totalValid++;
        }
    });

    let allSortedDefects = Object.entries(defectCounts).sort((a, b) => b[1] - a[1]);

    if (filterText) {
        allSortedDefects = allSortedDefects.filter(item => item[0].toLowerCase().includes(filterText));
    } else {
        allSortedDefects = allSortedDefects.slice(0, 20);
    }

    if (allSortedDefects.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">No defects found.</td></tr>`;
        return;
    }

    tbody.innerHTML = allSortedDefects.map((item) => {
        const defectName = item[0];
        const count = item[1];
        const percentage = totalValid > 0 ? ((count / totalValid) * 100).toFixed(2) + "%" : "0.00%";
        const isChecked = selectedTrendsDefects.includes(defectName) ? "checked" : "";

        return `
            <tr style="display: grid; grid-template-columns: 40px 1fr 50px 50px; align-items: center; min-height: 40px; border-bottom: 1px solid #F1F5F9; font-size: 11px;">
                <td style="text-align: center; padding: 4px;">
                    <input type="checkbox" value="${escapeHtml(defectName)}" ${isChecked} onchange="handleTrendCheckboxChange(this)" style="cursor: pointer; width: 15px; height: 15px;">
                </td>
                <td style="padding: 4px; font-weight: 700; color: #1E293B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${defectName}">${defectName}</td>
                <td style="text-align: center; padding: 4px; font-weight: 800;">${count}</td>
                <td style="text-align: center; padding: 4px; color: #64748B; font-weight: 700;">${percentage}</td>
            </tr>
        `;
    }).join("");

    const badge = document.getElementById("selectedTrendsCount");
    if (badge) badge.textContent = `${selectedTrendsDefects.length}/5 Selected`;
}

function escapeHtml(string) {
    return String(string).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function handleTrendCheckboxChange(checkbox) {
    const defectValue = checkbox.value;

    if (checkbox.checked) {
        if (selectedTrendsDefects.length >= 5) {
            alert("You can only select up to 5 defects simultaneously.");
            checkbox.checked = false;
            return;
        }
        if (!selectedTrendsDefects.includes(defectValue)) {
            selectedTrendsDefects.push(defectValue);
        }
    } else {
        selectedTrendsDefects = selectedTrendsDefects.filter(item => item !== defectValue);
    }

    renderTrendsTop20Table();
    updateTrendsChartsContainer();
}

function updateTrendsChartsContainer() {
    const container = document.getElementById("trendsChartsContainer");
    if (!container) return;

    destroyTrendCharts();

    if (selectedTrendsDefects.length === 0) {
        container.innerHTML = `
            <div class="trends-placeholder-msg">
                <i class="fa-solid fa-hand-pointer" style="font-size: 28px; margin-bottom: 8px; color: #94A3B8;"></i>
                <p>Select up to 5 defects from the left list to render comparative charts.</p>
            </div>
        `;
        return;
    }

    trendChartStates = {};

    container.innerHTML = selectedTrendsDefects.map((defect, idx) => {
        const defectRows = modalRawData.filter(row => row.Defect_Desc === defect && row.Date);
        const dateMap = {};
        let totalDefectCount = 0;

        defectRows.forEach(row => {
            const dateStr = String(row.Date).split("T")[0];
            dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
            totalDefectCount++;
        });

        const uniqueDates = Object.keys(dateMap).sort((a, b) => new Date(a) - new Date(b));
        const windowIndex = Math.max(0, uniqueDates.length - TREND_WINDOW_SIZE);

        trendChartStates[idx] = {
            defectName: defect,
            dateMap,
            uniqueDates,
            totalDefectCount,
            windowIndex
        };

        return `
            <div class="trend-chart-card">
                <div class="trend-chart-header">
                    <span><i class="fa-solid fa-chart-column" style="margin-right: 6px;"></i> ${defect}</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="chart-nav-group">
                            <button class="chart-nav-btn" onclick="shiftTrendChart(${idx}, -1)" title="Días anteriores"><i class="fa-solid fa-chevron-left"></i></button>
                            <button class="chart-nav-btn today-btn" onclick="resetTrendChartToday(${idx})" title="Ir a la fecha actual">Hoy</button>
                            <button class="chart-nav-btn" onclick="shiftTrendChart(${idx}, 1)" title="Días siguientes"><i class="fa-solid fa-chevron-right"></i></button>
                        </div>
                        <span style="font-size: 10px; color: #64748B;">Chart #${idx + 1}</span>
                    </div>
                </div>
                <div class="trend-chart-box">
                    <canvas id="trendChartCanvas_${idx}"></canvas>
                </div>
            </div>
        `;
    }).join("");

    selectedTrendsDefects.forEach((_, idx) => {
        renderSingleTrendChart(idx);
    });
}

function shiftTrendChart(idx, direction) {
    const state = trendChartStates[idx];
    if (!state) return;
    const maxStart = Math.max(0, state.uniqueDates.length - TREND_WINDOW_SIZE);
    state.windowIndex += direction;
    state.windowIndex = Math.min(Math.max(0, state.windowIndex), maxStart);
    renderSingleTrendChart(idx);
}

function resetTrendChartToday(idx) {
    const state = trendChartStates[idx];
    if (!state) return;
    state.windowIndex = Math.max(0, state.uniqueDates.length - TREND_WINDOW_SIZE);
    renderSingleTrendChart(idx);
}

function renderSingleTrendChart(idx) {
    const state = trendChartStates[idx];
    if (!state) return;

    const canvasId = `trendChartCanvas_${idx}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const sliceDates = state.uniqueDates.slice(state.windowIndex, state.windowIndex + TREND_WINDOW_SIZE);

    const labels = sliceDates.map(d => formatDateToDDMon(d));
    const counts = sliceDates.map(d => state.dateMap[d] || 0);
    const percentages = sliceDates.map(d => {
        const count = state.dateMap[d] || 0;
        if (state.totalDefectCount === 0) return 0;
        return parseFloat(((count / state.totalDefectCount) * 100).toFixed(2));
    });

    if (activeTrendCharts[canvasId]) {
        activeTrendCharts[canvasId].destroy();
    }

    activeTrendCharts[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Defect Qty',
                    data: counts,
                    backgroundColor: 'rgba(37, 99, 235, 0.6)',
                    hoverBackgroundColor: '#2563EB',
                    borderRadius: 4,
                    barPercentage: 0.6,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Percentage',
                    data: percentages,
                    borderColor: '#EF4444',
                    backgroundColor: '#EF4444',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#EF4444',
                    fill: false,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#07111F',
                    titleColor: '#FFFFFF',
                    bodyColor: '#CBD5E1',
                    padding: 8,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.dataset.type === 'line') {
                                label += context.parsed.y.toFixed(2) + '%';
                            } else {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                },
                datalabels: {
                    display: function(context) {
                        return context.dataset.type === 'line';
                    },
                    color: '#EF4444',
                    align: 'top',
                    font: { weight: '800', size: 9 },
                    formatter: function(value) {
                        return value.toFixed(2) + '%';
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    ticks: { precision: 0, font: { size: 9 }, color: '#64748B' },
                    grid: { color: 'rgba(148,163,184,.1)' },
                    border: { display: false }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    ticks: {
                        font: { size: 9 },
                        color: '#EF4444',
                        callback: function(value) {
                            return value.toFixed(1) + '%';
                        }
                    },
                    border: { display: false }
                },
                x: {
                    ticks: { font: { size: 8 }, color: '#64748B', maxRotation: 45, minRotation: 45 },
                    grid: { display: false },
                    border: { display: false }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function toggleMonthDropdown(event) {
    if (event) event.stopPropagation();
}

window.addEventListener("click", function(event) {
    const modal = document.getElementById("recordsModal");
    const loginModal = document.getElementById("loginModal");
    const userDropdown = document.getElementById("userDropdown");
    const avatarContainer = document.querySelector(".user-menu-container");

    if (event.target === modal) closeRecordsModal();
    if (event.target === loginModal) closeLoginModal();

    if (userDropdown && avatarContainer && !avatarContainer.contains(event.target)) {
        userDropdown.style.display = "none";
    }
});

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

async function loadMaintenance() {
    if (!currentSelectedMonth) return;

    const { data: allData, error } = await fetchAllSupabaseData(query => query.select("*").eq("Month", currentSelectedMonth));

    if (error) {
        alert("Error loading Supabase data.");
        return;
    }

    scrapData = allData || [];
    selectedArea = null;

    const selectedCellElem = document.getElementById("selectedCell");
    if (selectedCellElem) selectedCellElem.innerText = "ALL";

    await updateTopAreaAverage(currentSelectedMonth);
    updateDashboard();
}

function updateDashboard() {
    calculateKPIs();
    createIssueChart(); 
    loadIndependentMonthlyChart();
    createCellChart();
    createDefectChart();
    createMachineChart();
    createTop10Table();
    updateCellAnalysis();
}

function calculateKPIs() {
    const totalIssuesElem = document.getElementById("totalIssues");
    if (totalIssuesElem) totalIssuesElem.innerText = scrapData.length.toLocaleString();

    const models = {};
    const defects = {};

    scrapData.forEach(row => {
        if (row.Model) models[row.Model] = (models[row.Model] || 0) + 1;
        if (row.Defect_Desc) defects[row.Defect_Desc] = (defects[row.Defect_Desc] || 0) + 1;
    });

    const topModel = Object.entries(models).sort((a,b) => b[1] - a[1])[0];
    const topOpElem = document.getElementById("topOperation");
    if (topOpElem) topOpElem.innerText = topModel ? topModel[0] : "--";

    const topDefect = Object.entries(defects).sort((a,b) => b[1] - a[1])[0];
    const topIssueElem = document.getElementById("topIssue");
    if (topIssueElem) topIssueElem.innerText = topDefect ? topDefect[0] : "--";
}

async function updateTopAreaAverage(selectedMonth) {
    try {
        const client = window.supabaseClient || supabaseClient;
        if (!client) return;

        const { data, error } = await client
            .from('Production')
            .select('%Aveg')
            .eq('Month', selectedMonth);

        if (error) throw error;

        const topCellElem = document.getElementById('topCell');
        if (!topCellElem) return;

        if (data && data.length > 0) {
            const sum = data.reduce((acc, row) => acc + (parseFloat(row['%Aveg']) || 0), 0);
            const average = sum / data.length; 
            currentScrapPercentage = average * 100; 
            topCellElem.textContent = currentScrapPercentage.toFixed(2) + '%';
        } else {
            currentScrapPercentage = 0.00;
            topCellElem.textContent = '0.00%';
        }
    } catch (err) {
        console.error('Error fetching Production average:', err);
        currentScrapPercentage = 0.00;
        const topCellElem = document.getElementById('topCell');
        if (topCellElem) topCellElem.textContent = '0.00%';
    }
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

function createIssueChart() {
    const canvasId = "issueChart";
    const maxLimit = 3.50;
    const val = Math.min(Math.max(currentScrapPercentage, 0), maxLimit);

    let statusText = "ÓPTIMO";
    let statusColor = "#22C55E";
    if (val > 2.50) {
        statusText = "CRÍTICO";
        statusColor = "#EF4444";
    } else if (val > 2.00) {
        statusText = "ALERTA";
        statusColor = "#EAB308";
    }

    const gaugeData = {
        labels: ["Óptimo 1", "Óptimo 2", "Alerta", "Crítico 1", "Crítico 2"],
        datasets: [{
            data: [1.0, 1.0, 0.5, 0.5, 0.5],
            backgroundColor: ["#22C55E", "#16A34A", "#EAB308", "#F97316", "#EF4444"],
            borderWidth: 2,
            borderColor: "#FFFFFF",
            spacing: 3,
            circumference: 180,
            rotation: 270
        }]
    };

    const gaugeNeedlePlugin = {
        id: 'gaugeNeedle',
        afterDraw(chart) {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;

            ctx.save();
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = chartArea.bottom - 10;

            const percentage = val / maxLimit;
            const angle = Math.PI + (percentage * Math.PI);

            const radius = (chartArea.right - chartArea.left) / 2 * 0.75;
            const needleX = centerX + Math.cos(angle) * radius;
            const needleY = centerY + Math.sin(angle) * radius;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(needleX, needleY);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#0F172A';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#0F172A';
            ctx.fill();

            ctx.font = '800 18px "Segoe UI", Inter, sans-serif';
            ctx.fillStyle = '#0F172A';
            ctx.textAlign = 'center';
            ctx.fillText(val.toFixed(2) + '%', centerX, centerY - 32);

            ctx.font = '800 12px "Segoe UI", Inter, sans-serif';
            ctx.fillStyle = statusColor;
            ctx.fillText(statusText, centerX, centerY - 14);

            ctx.restore();
        }
    };

    renderChart(canvasId, {
        type: 'doughnut',
        data: gaugeData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            circumference: 180,
            rotation: 270,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                datalabels: { display: false }
            }
        },
        plugins: [gaugeNeedlePlugin]
    });
}

function createDefectChart() {
    const defects = {};
    scrapData.forEach(row => {
        if (row.Defect_Desc) {
            defects[row.Defect_Desc] = (defects[row.Defect_Desc] || 0) + 1;
        }
    });

    const result = Object.entries(defects).sort((a,b) => b[1] - a[1]).slice(0, 10);
    const options = baseChartOptions();
    
    options.indexAxis = 'y';
    delete options.scales.x.ticks.maxRotation;
    delete options.scales.x.ticks.minRotation;

    renderChart("operationChart", {
        type: "bar",
        data: {
            labels: result.map(x => x[0]),
            datasets: [{ label: "Scrap Count", data: result.map(x => x[1]), backgroundColor: "rgba(37, 99, 235, 0.55)", hoverBackgroundColor: "#2563EB", borderRadius: 7, borderSkipped: false, barPercentage: .68 }]
        },
        options,
        plugins: [ChartDataLabels]
    });
}

async function loadIndependentMonthlyChart() {
    try {
        const client = window.supabaseClient || supabaseClient;
        if (!client) return;

        const { data: prodData, error } = await client
            .from('Production')
            .select('Month, "%Aveg"');

        if (error) throw error;

        const monthlyAverages = {};
        months.forEach(m => {
            monthlyAverages[m] = { sum: 0, count: 0 };
        });

        (prodData || []).forEach(row => {
            const m = row.Month;
            const rawVal = row['%Aveg'] !== undefined ? row['%Aveg'] : 0;
            const avgVal = parseFloat(rawVal) || 0;
            
            if (m && monthlyAverages.hasOwnProperty(m)) {
                monthlyAverages[m].sum += avgVal;
                monthlyAverages[m].count += 1;
            }
        });

        const percentages = months.map(m => {
            const item = monthlyAverages[m];
            if (item.count > 0) {
                const avg = item.sum / item.count;
                return parseFloat((avg * 100).toFixed(2));
            }
            return 0;
        });

        const changes = percentages.map((val, idx) => {
            if (idx === 0) return null;
            const prev = percentages[idx - 1];
            if (prev === 0) return val > 0 ? 100 : 0;
            return parseFloat((val - prev).toFixed(2));
        });

        const options = baseChartOptions();
        options.scales.x.ticks.maxRotation = 40;
        options.scales.x.ticks.minRotation = 40;
        options.scales.y.grace = "35%";
        options.plugins.datalabels = { display: false };
        
        options.scales.y.ticks.callback = function(value) {
            return value + '%';
        };

        const monthlyTrendPlugin = {
            id: 'monthlyTrendPlugin',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const datasetMeta = chart.getDatasetMeta(0);
                if (!datasetMeta || !datasetMeta.data) return;
                
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                datasetMeta.data.forEach((bar, index) => {
                    const value = percentages[index];
                    const barX = bar.x;
                    const barY = bar.y;
                    const barBase = bar.base;
                    
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '700 11px "Segoe UI", Inter, sans-serif';
                    const textY = barY + (barBase - barY) / 2;
                    ctx.fillText(value + '%', barX, textY);

                    if (index > 0 && changes[index] !== null) {
                        const change = changes[index];
                        const isPositive = change >= 0;
                        const changeText = `${isPositive ? '+' : ''}${change}%`;
                        
                        const badgeWidth = 48;
                        const badgeHeight = 18;
                        const badgeX = barX - badgeWidth / 2;
                        const badgeY = barY - 26;

                        if (isPositive) {
                            ctx.fillStyle = '#FCA5A5';
                            ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
                        } else {
                            ctx.fillStyle = '#6EE7B7';
                            ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
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
                datasets: [{
                    label: "%Aveg Average",
                    data: percentages,
                    backgroundColor: "rgba(124, 58, 237, 0.55)",
                    hoverBackgroundColor: "#7C3AED",
                    borderRadius: 7,
                    borderSkipped: false,
                    barPercentage: 0.68
                }]
            },
            options,
            plugins: [monthlyTrendPlugin]
        });

    } catch (err) {
        console.error("Error loading monthly Production data:", err);
    }
}

function createCellChart() {
    const models = {};
    scrapData.forEach(row => {
        if (row.Model) {
            models[row.Model] = (models[row.Model] || 0) + 1;
        }
    });

    const result = Object.entries(models).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const options = baseChartOptions();
    
    options.indexAxis = 'y';
    delete options.scales.x.ticks.maxRotation;
    delete options.scales.x.ticks.minRotation;

    renderChart("cellChart", {
        type: "bar",
        data: {
            labels: result.map(x => x[0]),
            datasets: [{ 
                label: "Scrap Count", 
                data: result.map(x => x[1]), 
                backgroundColor: "rgba(37, 99, 235, 0.55)", 
                hoverBackgroundColor: "#2563EB", 
                borderRadius: 7, 
                borderSkipped: false, 
                barPercentage: 0.68 
            }]
        },
        options,
        plugins: [ChartDataLabels]
    });
}

async function createMachineChart() {
    try {
        const client = window.supabaseClient || supabaseClient;
        if (!client) return;

        let allProdData = [];
        let from = 0;
        let pageSize = 1000;
        let more = true;

        while (more) {
            const { data, error } = await client
                .from('Production')
                .select('Date, Scrap, "%Aveg"')
                .eq('Month', currentSelectedMonth)
                .range(from, from + pageSize - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                allProdData = allProdData.concat(data);
                from += pageSize;
            } else {
                more = false;
            }
        }

        if (allProdData.length === 0) {
            machineChartAllData = [];
            resetMachineChartToday();
            return;
        }

        const groupedByDate = {};
        allProdData.forEach(row => {
            if (!row.Date) return;
            const d = String(row.Date).split("T")[0];
            
            if (!groupedByDate[d]) {
                groupedByDate[d] = { Date: d, Scrap: 0, sumAveg: 0, count: 0 };
            }
            groupedByDate[d].Scrap += parseFloat(row.Scrap) || 0;
            groupedByDate[d].sumAveg += parseFloat(row['%Aveg']) || 0;
            groupedByDate[d].count += 1;
        });

        machineChartAllData = Object.values(groupedByDate).map(item => ({
            Date: item.Date,
            Scrap: item.Scrap,
            '%Aveg': item.count > 0 ? item.sumAveg / item.count : 0
        }));

        machineChartAllData.sort((a, b) => new Date(a.Date) - new Date(b.Date));
        resetMachineChartToday();
    } catch (err) {
        console.error("Error loading Production data for Scrap Daily:", err);
    }
}

function resetMachineChartToday() {
    if (machineChartAllData.length === 0) {
        renderMachineChartSlice();
        return;
    }
    machineChartWindowIndex = Math.max(0, machineChartAllData.length - MACHINE_WINDOW_SIZE);
    renderMachineChartSlice();
}

function shiftMachineChart(direction) {
    if (machineChartAllData.length === 0) return;
    const maxStart = Math.max(0, machineChartAllData.length - MACHINE_WINDOW_SIZE);
    machineChartWindowIndex += direction;
    machineChartWindowIndex = Math.min(Math.max(0, machineChartWindowIndex), maxStart);
    renderMachineChartSlice();
}

function formatDateToDDMon(dateString) {
    if (!dateString) return "";
    const cleanDateStr = String(dateString).split("T")[0];
    const parts = cleanDateStr.split("-");
    
    if (parts.length !== 3) return dateString;
    
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthStr = monthNames[monthIndex] || "Jan";

    return `${day}-${monthStr}`;
}

function renderMachineChartSlice() {
    const slice = machineChartAllData.slice(machineChartWindowIndex, machineChartWindowIndex + MACHINE_WINDOW_SIZE);

    const labels = slice.map(row => formatDateToDDMon(row.Date));
    const scrapBars = slice.map(row => parseFloat(row.Scrap) || 0);
    const avegPercentages = slice.map(row => {
        const val = parseFloat(row['%Aveg']) || 0;
        return parseFloat((val * 100).toFixed(2));
    });

    const canvasId = "machineChart";
    if (activeCharts[canvasId]) activeCharts[canvasId].destroy();
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    activeCharts[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Scrap',
                    data: scrapBars,
                    backgroundColor: 'rgba(37, 99, 235, 0.65)',
                    hoverBackgroundColor: '#2563EB',
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.65,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: '%Aveg',
                    data: avegPercentages,
                    borderColor: '#EF4444',
                    backgroundColor: '#EF4444',
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#EF4444',
                    fill: false,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    backgroundColor: '#07111F',
                    titleColor: '#FFFFFF',
                    bodyColor: '#CBD5E1',
                    borderColor: 'rgba(255,255,255,.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.dataset.type === 'line') {
                                label += context.parsed.y.toFixed(2) + '%';
                            } else {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                },
                datalabels: {
                    display: function(context) {
                        return context.dataset.type === 'line';
                    },
                    color: '#EF4444',
                    anchor: 'end',
                    align: 'top',
                    offset: 6,
                    font: { weight: '800', size: 10 },
                    formatter: function(value) {
                        return value.toFixed(2) + '%';
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    ticks: { precision: 0, color: '#64748B', font: { size: 10 } },
                    grid: { color: 'rgba(148,163,184,.13)' },
                    border: { display: false },
                    title: { display: true, text: 'Scrap Count', color: '#64748B', font: { size: 10, weight: '700' } }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    ticks: {
                        color: '#EF4444',
                        font: { size: 10 },
                        callback: function(value) {
                            return value.toFixed(1) + '%';
                        }
                    },
                    border: { display: false },
                    title: { display: true, text: '%Aveg', color: '#EF4444', font: { size: 10, weight: '700' } }
                },
                x: {
                    ticks: { color: '#64748B', font: { size: 9, weight: '600' }, maxRotation: 45, minRotation: 45 },
                    grid: { display: false },
                    border: { display: false }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function createTop10Table() {
    const count = {};
    let totalValidIssues = 0;

    scrapData.forEach(row => {
        if (row.Defect_Desc) {
            count[row.Defect_Desc] = (count[row.Defect_Desc] || 0) + 1;
            totalValidIssues++;
        }
    });

    const result = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const tbody = document.getElementById("top10Table");
    if (!tbody) return;

    tbody.innerHTML = result.map((item, index) => {
        const percentage = totalValidIssues > 0 ? ((item[1] / totalValidIssues) * 100).toFixed(2) + "%" : "0.00%";
        const isSelected = selectedArea === item[0] ? "selected-row" : "";
        return `
            <tr class="${isSelected}" onclick="selectAreaForAnalysis('${item[0].replace(/'/g, "\\'")}')">
                <td>#${index + 1}</td>
                <td>${item[0]}</td>
                <td><b>${item[1]}</b></td>
                <td>${percentage}</td>
            </tr>
        `;
    }).join("");
}

function selectAreaForAnalysis(defectDesc) {
    selectedArea = defectDesc;
    const selectedCellElem = document.getElementById("selectedCell");
    if (selectedCellElem) selectedCellElem.innerText = defectDesc;

    createTop10Table();
    updateCellAnalysis();
}

function updateCellAnalysis() {
    const filteredData = selectedArea ? scrapData.filter(row => row.Defect_Desc === selectedArea) : scrapData;
    
    const modelCounts = {};
    let totalFilteredIssues = filteredData.length;

    filteredData.forEach(row => {
        if (row.Model) {
            modelCounts[row.Model] = (modelCounts[row.Model] || 0) + 1;
        }
    });

    const sortedModels = Object.entries(modelCounts).sort((a, b) => b[1] - a[1]);
    const tbody = document.getElementById("selectedAreaTableBody");
    if (!tbody) return;

    if (sortedModels.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748B;">No records found</td></tr>`;
        return;
    }

    tbody.innerHTML = sortedModels.map((item, index) => {
        const qty = item[1];
        const percentage = totalFilteredIssues > 0 ? ((qty / totalFilteredIssues) * 100).toFixed(2) + "%" : "0.00%";
        return `
            <tr>
                <td>#${index + 1}</td>
                <td style="font-weight: 600; color: #0F172A;">${item[0]}</td>
                <td><b>${qty}</b></td>
                <td>${percentage}</td>
            </tr>
        `;
    }).join("");
}

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
        alert("An error occurred while logging in.");
    }
}

function handleSignOut() {
    setProtectedElementsState(false);
    const dropdown = document.getElementById("userDropdown");
    if (dropdown) dropdown.style.display = "none";
}

function handleDataClick() {
    if (sessionActiveUser) {
        alert('Active session! Opening data controls...');
    } else {
        alert('You must log in to access this option.');
    }
}

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