const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const activeCharts = {};

let selectedDefects = [];
let trendCharts = [];
const TREND_DAYS = 15;

// Offset para navegación de fechas
let offsetDiasMain = 0;
const trendOffsets = {}; 

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

let selectedMonth = MONTH_NAMES[new Date().getMonth()];

document.addEventListener("DOMContentLoaded", () => {
    initMonthSelect();
    loadDashboard();
});

function initMonthSelect() {
    const monthSelect = document.getElementById("monthSelect");
    monthSelect.innerHTML = "";
    MONTH_NAMES.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m.toUpperCase();
        if (m === selectedMonth) opt.selected = true;
        monthSelect.appendChild(opt);
    });
}

function changeMonth(newMonth) {
    selectedMonth = newMonth;
    loadDashboard();
}

function renderManagedChart(canvasId, config) {
    if (activeCharts[canvasId]) {
        activeCharts[canvasId].destroy();
    }
    const ctx = document.getElementById(canvasId).getContext("2d");
    activeCharts[canvasId] = new Chart(ctx, config);
    return activeCharts[canvasId];
}

async function loadDashboard() {
    try {
        await Promise.all([
            loadKPIs(),
            loadScrapPercentage(),
            loadMonthlyChart(),
            loadModelChart(),
            loadDefectChart(),
            loadLast14Days(),
            loadTop10DefectsTable()
        ]);
    } catch (err) {
        console.error("Error al cargar el dashboard:", err);
    }
}

async function fetchAllRecords(table, queryBuilderFn) {
    let allData = [];
    let desde = 0;
    const limite = 1000;
    while (true) {
        let query = supabaseClient.from(table).select("*").range(desde, desde + limite - 1);
        if (queryBuilderFn) query = queryBuilderFn(query);
        
        const { data, error } = await query;
        if (error) throw error;
        
        allData = allData.concat(data);
        if (data.length < limite) break;
        desde += limite;
    }
    return allData;
}

async function loadKPIs() {
    const data = await fetchAllRecords("Scrap", q => q.select("Model, Defect_Desc, Stripp, Month").eq("Month", selectedMonth));

    const totalScrap = data.reduce((total, row) => total + (Number(row.Stripp) || 0), 0);
    document.getElementById("totalScrap").textContent = totalScrap.toLocaleString();

    const models = {};
    const defects = {};

    data.forEach(row => {
        const model = row.Model || "Sin Modelo";
        const defect = row.Defect_Desc || "Sin Defecto";
        const val = Number(row.Stripp) || 0;

        models[model] = (models[model] || 0) + val;
        defects[defect] = (defects[defect] || 0) + val;
    });

    const topModel = Object.entries(models).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("topModel").textContent = topModel ? `${topModel[0]} (${topModel[1].toLocaleString()})` : "-";

    const topDefect = Object.entries(defects).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("topDefect").textContent = topDefect ? `${topDefect[0]} (${topDefect[1].toLocaleString()})` : "-";
}

async function loadMonthlyChart() {
    const { data, error } = await supabaseClient.rpc("scrap_por_mes");
    if (error) {
        console.error(error);
        return;
    }

    let totals = {};
    MONTH_NAMES.forEach(m => totals[m] = 0);

    data.forEach(row => {
        let monthDB = row.month.trim().toLowerCase();
        MONTH_NAMES.forEach(m => {
            if (m.toLowerCase() === monthDB) {
                totals[m] = Number(row.total_scrap) || 0;
            }
        });
    });

    renderManagedChart("monthlyChart", {
        type: "bar",
        plugins: [ChartDataLabels],
        data: {
            labels: MONTH_NAMES,
            datasets: [{
                label: "Total Scrap",
                data: MONTH_NAMES.map(m => totals[m]),
                backgroundColor: MONTH_NAMES.map(m => m === selectedMonth ? "#00a3a3" : "rgba(10, 110, 209, 0.75)")
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: "end",
                    align: "top",
                    font: { weight: "bold", size: 10 },
                    color: "#003b5c",
                    formatter: val => val > 0 ? val : ""
                }
            },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
}

async function loadModelChart() {
    const allData = await fetchAllRecords("Scrap", q => q.select("Model, Month, Stripp").eq("Month", selectedMonth));

    let models = {};
    allData.forEach(row => {
        let model = row.Model || "Sin Modelo";
        let qty = Number(row.Stripp) || 1;
        models[model] = (models[model] || 0) + qty;
    });

    let result = Object.entries(models).sort((a, b) => b[1] - a[1]).slice(0, 10);

    renderManagedChart("modelChart", {
        type: "bar",
        plugins: [ChartDataLabels],
        data: {
            labels: result.map(x => x[0]),
            datasets: [{
                label: "Scrap Qty",
                data: result.map(x => x[1]),
                backgroundColor: "rgba(10, 110, 209, 0.75)"
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: "end",
                    align: "right",
                    font: { weight: "bold", size: 10 },
                    color: "#003b5c",
                    formatter: val => val
                }
            }
        }
    });
}

async function loadDefectChart() {
    const allData = await fetchAllRecords("Scrap", q => q.select("Defect_Desc, Stripp, Month").eq("Month", selectedMonth));

    let defectos = {};
    allData.forEach(row => {
        let defecto = row.Defect_Desc || "Sin Defecto";
        let cantidad = Number(row.Stripp) || 0;
        defectos[defecto] = (defectos[defecto] || 0) + cantidad;
    });

    let top10 = Object.entries(defectos).sort((a, b) => b[1] - a[1]).slice(0, 10);

    renderManagedChart("defectChart", {
        type: "bar",
        plugins: [ChartDataLabels],
        data: {
            labels: top10.map(x => x[0]),
            datasets: [{
                label: "Total Scrap",
                data: top10.map(x => x[1]),
                backgroundColor: "rgba(0, 163, 163, 0.75)"
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: "end",
                    align: "right",
                    font: { weight: "bold", size: 10 },
                    color: "#003b5c",
                    formatter: val => val
                }
            }
        }
    });
}

function cambiarDiasRangoMain(dias) {
    if (dias === 0) {
        offsetDiasMain = 0;
    } else {
        offsetDiasMain += dias;
    }
    loadLast14Days();
}

async function loadLast14Days() {
    const hoy = new Date();
    let fechas = [];
    for (let i = 14 + offsetDiasMain; i >= 1 + offsetDiasMain; i--) {
        let fecha = new Date();
        fecha.setDate(hoy.getDate() - i);
        let formato = fecha.getFullYear() + "-" +
            String(fecha.getMonth() + 1).padStart(2, "0") + "-" +
            String(fecha.getDate()).padStart(2, "0");
        fechas.push(formato);
    }
    
    let fechaInicio = fechas[0];
    let fechaFin = fechas[13];

    let fInicioTxt = fechas[0].split("-").reverse().join("/");
    let fFinTxt = fechas[13].split("-").reverse().join("/");
    document.getElementById("last14DaysTitle").textContent = `Tendencia Diaria (${fInicioTxt} al ${fFinTxt})`;

    const allData = await fetchAllRecords("Scrap", q => q.select("Date, Stripp").gte("Date", fechaInicio).lte("Date", fechaFin));

    let totales = {};
    fechas.forEach(f => totales[f] = 0);

    allData.forEach(row => {
        if (totales[row.Date] !== undefined) {
            totales[row.Date] += Number(row.Stripp) || 0;
        }
    });

    let valores = fechas.map(f => totales[f]);
    let etiquetas = fechas.map(f => {
        let p = f.split("-");
        return p[2] + "-" + p[1] + "-" + p[0].slice(2);
    });

    renderManagedChart("last7Chart", {
        type: "bar",
        plugins: [ChartDataLabels],
        data: {
            labels: etiquetas,
            datasets: [{
                label: "Scrap por Día",
                data: valores,
                backgroundColor: "rgba(10, 110, 209, 0.75)"
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: "end",
                    align: "top",
                    font: { weight: "bold" },
                    color: "#003b5c",
                    formatter: val => val > 0 ? val : ""
                }
            },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
}

async function loadTop10DefectsTable() {
    const data = await fetchAllRecords("Scrap", q => q.select("Defect_Desc, Stripp").eq("Month", selectedMonth));

    let defects = {};
    let totalMes = 0;

    data.forEach(row => {
        let defecto = row.Defect_Desc || "Unknown";
        let cantidad = Number(row.Stripp) || 0;
        totalMes += cantidad;
        defects[defecto] = (defects[defecto] || 0) + cantidad;
    });

    let top10 = Object.entries(defects).sort((a, b) => b[1] - a[1]).slice(0, 10);
    let html = "";

    top10.forEach((item, index) => {
        let porcentaje = totalMes > 0 ? ((item[1] / totalMes) * 100).toFixed(2) : "0.00";
        html += `
            <tr style="cursor:pointer" onclick="loadModelTopIssues('${item[0].replace(/'/g, "\\'")}', this)">
                <td>${index + 1}</td>
                <td>${item[0]}</td>
                <td>${item[1].toLocaleString()}</td>
                <td>${porcentaje}%</td>
            </tr>
        `;
    });

    document.getElementById("top10DefectsTable").innerHTML = html;
    
    if (top10.length > 0) {
        const firstRow = document.querySelector("#top10DefectsTable tr");
        if (firstRow) loadModelTopIssues(top10[0][0], firstRow);
    }
}

async function loadModelTopIssues(defect, rowElement) {
    document.querySelectorAll("#top10DefectsTable tr").forEach(r => r.classList.remove("table-primary"));
    if (rowElement) rowElement.classList.add("table-primary");

    document.getElementById("modelTitle").innerHTML = `<i class="fa-solid fa-cube"></i> Top Models - ${defect}`;

    const { data, error } = await supabaseClient
        .from("Scrap")
        .select("Model, Defect_Desc, Stripp")
        .eq("Month", selectedMonth)
        .eq("Defect_Desc", defect);

    if (error) {
        console.error(error);
        return;
    }

    let modelos = {};
    let total = 0;

    data.forEach(row => {
        let model = row.Model || "Unknown";
        let qty = Number(row.Stripp) || 0;
        total += qty;
        modelos[model] = (modelos[model] || 0) + qty;
    });

    let top10 = Object.entries(modelos).sort((a, b) => b[1] - a[1]).slice(0, 10);
    let html = "";

    top10.forEach((item, index) => {
        let porcentaje = total > 0 ? ((item[1] / total) * 100).toFixed(2) : "0.00";
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item[0]}</td>
                <td>${item[1].toLocaleString()}</td>
                <td>${porcentaje}%</td>
            </tr>
        `;
    });

    document.getElementById("modelTopIssuesTable").innerHTML = html;
}

async function loadScrapPercentage() {
    const allData = await fetchAllRecords("Production", q => q.select("%Aveg, Month").eq("Month", selectedMonth));

    if (allData.length === 0) {
        document.getElementById("scrapPercent").textContent = "-";
        return;
    }

    let total = 0;
    let contador = 0;

    allData.forEach(row => {
        let valor = Number(row["%Aveg"]);
        if (!isNaN(valor) && valor > 0) {
            total += valor;
            contador++;
        }
    });

    let promedio = contador > 0 ? total / contador : 0;
    document.getElementById("scrapPercent").textContent = (promedio * 100).toFixed(2) + "%";
}

async function openTrendModal() {
    document.getElementById("trendModal").style.display = "block";
    selectedDefects = [];
    Object.keys(trendOffsets).forEach(k => delete trendOffsets[k]);
    document.getElementById("trendChartsContainer").innerHTML = `
        <div class="text-center mt-5">
            <h3>Select up to 5 defects</h3>
            <p>The combined bar (Quantity) and line (%) charts will appear here.</p>
        </div>
    `;
    await loadTrendTop20();
}

function closeTrendModal() {
    document.getElementById("trendModal").style.display = "none";
}

async function loadTrendTop20() {
    const allData = await fetchAllRecords("Scrap", q => q.select("Defect_Desc, Stripp").eq("Month", selectedMonth));

    let defects = {};
    let totalMes = 0;

    allData.forEach(row => {
        let defecto = row.Defect_Desc || "Unknown";
        let qty = Number(row.Stripp) || 0;
        totalMes += qty;
        defects[defecto] = (defects[defecto] || 0) + qty;
    });

    let top20 = Object.entries(defects).sort((a, b) => b[1] - a[1]).slice(0, 20);
    let html = "";

    top20.forEach((item, index) => {
        let porcentaje = totalMes > 0 ? ((item[1] / totalMes) * 100).toFixed(2) : "0.00";
        html += `
            <tr>
                <td><input type="checkbox" value="${item[0]}" onchange="toggleTrendDefect(this, '${item[0].replace(/'/g, "\\'")}')"></td>
                <td>${index + 1}</td>
                <td>${item[0]}</td>
                <td>${item[1].toLocaleString()}</td>
                <td>${porcentaje}%</td>
            </tr>
        `;
    });

    document.getElementById("trendTableBody").innerHTML = html;
}

function toggleTrendDefect(check, defect) {
    if (check.checked) {
        if (selectedDefects.length >= 5) {
            alert("Máximo 5 defectos simultáneos.");
            check.checked = false;
            return;
        }
        selectedDefects.push(defect);
        trendOffsets[selectedDefects.length - 1] = 0;
    } else {
        const indexRemovido = selectedDefects.indexOf(defect);
        selectedDefects = selectedDefects.filter(d => d !== defect);
        
        const nuevosOffsets = {};
        selectedDefects.forEach((_, idx) => {
            nuevosOffsets[idx] = idx >= indexRemovido ? (trendOffsets[idx + 1] || 0) : (trendOffsets[idx] || 0);
        });
        Object.keys(trendOffsets).forEach(k => delete trendOffsets[k]);
        Object.assign(trendOffsets, nuevosOffsets);
    }
    renderTrendCharts();
}

function cambiarDiasTrend(index, dias) {
    if (dias === 0) {
        trendOffsets[index] = 0;
    } else {
        trendOffsets[index] = (trendOffsets[index] || 0) + dias;
    }
    loadTrendChartDataSingle(index);
}

// Carga datos para la gráfica mixta (Barras = Cantidad, Línea con puntos = Porcentaje del total diario)
async function loadTrendChartDataSingle(index) {
    const defect = selectedDefects[index];
    if (!defect || !trendCharts[index]) return;

    const offset = trendOffsets[index] || 0;
    const hoy = new Date();
    
    let fechasISO = [];
    let fechasLabels = [];

    for (let i = (TREND_DAYS - 1) + offset; i >= offset; i--) {
        let fecha = new Date();
        fecha.setDate(hoy.getDate() - i);
        
        let iso = fecha.getFullYear() + "-" +
            String(fecha.getMonth() + 1).padStart(2, "0") + "-" +
            String(fecha.getDate()).padStart(2, "0");
        
        let label = String(fecha.getDate()).padStart(2, "0") + "/" + 
                    String(fecha.getMonth() + 1).padStart(2, "0") + "/" + 
                    String(fecha.getFullYear()).slice(2);
                    
        fechasISO.push(iso);
        fechasLabels.push(label);
    }

    const fechaInicio = fechasISO[0];
    const fechaFin = fechasISO[fechasISO.length - 1];

    try {
        // Traer scrap total por día para calcular el porcentaje relativo diario
        const totalScrapByDate = await fetchAllRecords("Scrap", q =>
            q.select("Date, Stripp")
             .gte("Date", fechaInicio)
             .lte("Date", fechaFin)
        );

        // Traer scrap del defecto seleccionado
        const defectData = await fetchAllRecords("Scrap", q => 
            q.select("Date, Stripp, Defect_Desc")
             .eq("Defect_Desc", defect)
             .gte("Date", fechaInicio)
             .lte("Date", fechaFin)
        );

        let mapTotalesDia = {};
        let mapDefectosDia = {};
        fechasISO.forEach(f => {
            mapTotalesDia[f] = 0;
            mapDefectosDia[f] = 0;
        });

        totalScrapByDate.forEach(row => {
            if (mapTotalesDia[row.Date] !== undefined) {
                mapTotalesDia[row.Date] += Number(row.Stripp) || 0;
            }
        });

        defectData.forEach(row => {
            if (mapDefectosDia[row.Date] !== undefined) {
                mapDefectosDia[row.Date] += Number(row.Stripp) || 0;
            }
        });

        const cantidades = fechasISO.map(f => mapDefectosDia[f]);
        const porcentajes = fechasISO.map(f => {
            const tot = mapTotalesDia[f];
            const def = mapDefectosDia[f];
            return tot > 0 ? parseFloat(((def / tot) * 100).toFixed(1)) : 0;
        });

        const chart = trendCharts[index];
        chart.data.labels = fechasLabels;
        chart.data.datasets[0].data = cantidades;    // Barras (Cantidad)
        chart.data.datasets[1].data = porcentajes;   // Línea (%)
        chart.update();
    } catch (err) {
        console.error("Error al cargar tendencia mixta:", defect, err);
    }
}

function renderTrendCharts() {
    const container = document.getElementById("trendChartsContainer");
    container.innerHTML = "";

    if (selectedDefects.length === 0) {
        container.innerHTML = `
            <div class="text-center mt-5">
                <h3>Selecciona hasta 5 defectos</h3>
                <p>Las gráficas combinadas de barras (Cantidad) y líneas (%) aparecerán aquí.</p>
            </div>
        `;
        return;
    }

    selectedDefects.forEach((defect, index) => {
        container.innerHTML += `
            <div class="trend-chart-card">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="mb-0" id="trendTitle${index}">
                        <i class="fa-solid fa-bug text-danger"></i> ${defect}
                    </h5>
                    <div class="btn-group" role="group" aria-label="Navegación trend">
                        <button type="button" class="btn btn-outline-primary btn-sm px-2 py-1" style="font-size: 11px;" onclick="cambiarDiasTrend(${index}, 7)">
                            <i class="fa-solid fa-angles-left"></i> +7D
                        </button>
                        <button type="button" class="btn btn-outline-primary btn-sm px-2 py-1" style="font-size: 11px;" onclick="cambiarDiasTrend(${index}, 1)">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                        <button type="button" class="btn btn-outline-primary btn-sm px-2 py-1" style="font-size: 11px;" onclick="cambiarDiasTrend(${index}, 0)">
                            Today
                        </button>
                        <button type="button" class="btn btn-outline-primary btn-sm px-2 py-1" style="font-size: 11px;" onclick="cambiarDiasTrend(${index}, -1)">
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                        <button type="button" class="btn btn-outline-primary btn-sm px-2 py-1" style="font-size: 11px;" onclick="cambiarDiasTrend(${index}, -7)">
                            -7D <i class="fa-solid fa-angles-right"></i>
                        </button>
                    </div>
                </div>
                <canvas id="trendChart${index}"></canvas>
            </div>
        `;
    });

    trendCharts.forEach(chart => chart.destroy());
    trendCharts = [];

    selectedDefects.forEach((defect, index) => {
        const ctx = document.getElementById(`trendChart${index}`).getContext("2d");
        
        // Gráfica mixta (Combo Chart: Barras + Línea con marcadores)
        let chart = new Chart(ctx, {
            data: {
                labels: [],
                datasets: [
                    {
                        type: "bar",
                        label: "Quantity (Scrap)",
                        data: [],
                        backgroundColor: "rgba(10, 110, 209, 0.75)",
                        borderColor: "#0A6ED1",
                        borderWidth: 1,
                        borderRadius: 4,
                        yAxisID: "y"
                    },
                    {
                        type: "line",
                        label: "% of Daily Scrap",
                        data: [],
                        borderColor: "#e74c3c",
                        backgroundColor: "#e74c3c",
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: "#e74c3c",
                        fill: false,
                        tension: 0.2,
                        yAxisID: "y1"
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: "index",
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: "top"
                    },
                    datalabels: {
                        display: function(context) {
                            return context.dataset.type === "bar";
                        },
                        anchor: "end",
                        align: "top",
                        font: { weight: "bold", size: 10 },
                        color: "#003b5c",
                        formatter: val => val > 0 ? val : ""
                    }
                },
                scales: {
                    y: {
                        type: "linear",
                        display: true,
                        position: "left",
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Quantity (Pieces)"
                        },
                        ticks: { precision: 0 }
                    },
                    y1: {
                        type: "linear",
                        display: true,
                        position: "right",
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: "% of Total"
                        },
                        ticks: {
                            callback: value => value + "%"
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });

        trendCharts.push(chart);
        loadTrendChartDataSingle(index);
    });
}