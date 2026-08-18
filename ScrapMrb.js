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

    try {

        // ============================================================
        // OBTENER DATOS DE PRODUCTION
        //
        // Month  = Mes
        // %Aveg  = Valor decimal
        //
        // Ejemplo:
        // 0.00500 + 0.00400 + 0.01090 = 0.01990
        // 0.01990 * 100 = 1.99%
        // ============================================================

        const allData = await fetchAllRecords(
            "Production",
            q => q.select('Month, "%Aveg"')
        );

        console.log("=================================");
        console.log("PRODUCTION - SCRAP PER MONTH");
        console.log("TOTAL REGISTROS:", allData.length);
        console.log(allData);
        console.log("=================================");


        // ============================================================
        // CREAR MAPA DE MESES
        // January → December
        // ============================================================

        let totals = {};

        MONTH_NAMES.forEach(month => {
            totals[month] = 0;
        });


        // ============================================================
        // SUMAR %AVEG POR MES
        // ============================================================

        allData.forEach(row => {

            if (!row.Month) return;

            const monthDB =
                String(row.Month).trim().toLowerCase();

            const valor =
                Number(row["%Aveg"]);

            if (isNaN(valor)) return;


            MONTH_NAMES.forEach(month => {

                if (month.toLowerCase() === monthDB) {

                    totals[month] += valor;

                }

            });

        });


        // ============================================================
        // CONVERTIR A PORCENTAJE
        //
        // Ejemplo:
        // 0.01990 → 1.99
        // ============================================================

        const valoresPorcentaje =
            MONTH_NAMES.map(month => {

                return Number(
                    (totals[month] * 100).toFixed(2)
                );

            });


        // ============================================================
        // DEBUG
        // ============================================================

        console.log("=================================");
        console.log("SUMA DECIMAL POR MES:");
        console.log(totals);

        console.log("PORCENTAJE POR MES:");
        console.log(valoresPorcentaje);

        console.log("=================================");


        // ============================================================
        // CREAR GRÁFICA
        // ============================================================

        renderManagedChart("monthlyChart", {

            type: "bar",

            plugins: [ChartDataLabels],

            data: {

                // ====================================================
                // MESES
                // ====================================================

                labels: MONTH_NAMES,

                datasets: [{

                    label: "%Aveg",

                    data: valoresPorcentaje,

                    backgroundColor:
                        "rgba(10, 110, 209, 0.75)",

                    borderColor:
                        "#0A6ED1",

                    borderWidth: 1,

                    borderRadius: 4

                }]

            },

            options: {

                responsive: true,

                plugins: {

                    // =================================================
                    // OCULTAR LEYENDA
                    // =================================================

                    legend: {
                        display: false
                    },


                    // =================================================
                    // PORCENTAJE DENTRO DE LA BARRA
                    // =================================================

                    datalabels: {

                        anchor: "center",

                        align: "center",

                        font: {
                            weight: "bold",
                            size: 10
                        },

                        // Texto blanco dentro de la barra
                        color: "#000000",

                        formatter: function(value) {

                            return value > 0
                                ? value.toFixed(2) + "%"
                                : "";

                        }

                    },


                    // =================================================
                    // TOOLTIP
                    // =================================================

                    tooltip: {

                        callbacks: {

                            label: function(context) {

                                return "%Aveg: " +
                                    Number(context.raw).toFixed(2) +
                                    "%";

                            }

                        }

                    }

                },


                // ====================================================
                // EJE Y
                // ====================================================

                scales: {

                    y: {

                        beginAtZero: true,

                        title: {

                            display: true,

                            text: "%Aveg"

                        },

                        ticks: {

                            callback: function(value) {

                                return value + "%";

                            }

                        }

                    }

                }

            }

        });

    } catch (err) {

        console.error(
            "Error al cargar Scrap Per Month:",
            err
        );

    }

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

    // ============================================================
    // GENERAR 15 DÍAS
    //
    // Ejemplo si hoy es 18-Aug-2026:
    //
    // 03-Aug-2026 hasta 17-Aug-2026
    //
    // NO incluye el día actual.
    // ============================================================

    for (
        let i = (TREND_DAYS - 1) + offsetDiasMain;
        i >= 1 + offsetDiasMain;
        i--
    ) {

        const fecha = new Date(hoy);

        fecha.setDate(hoy.getDate() - i);

        const formato =
            fecha.getFullYear() + "-" +
            String(fecha.getMonth() + 1).padStart(2, "0") + "-" +
            String(fecha.getDate()).padStart(2, "0");

        fechas.push(formato);
    }

    const fechaInicio = fechas[0];
    const fechaFin = fechas[fechas.length - 1];

    // ============================================================
    // MESES CORTOS
    // ============================================================

    const mesesCortos = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    // ============================================================
    // TÍTULO
    // ============================================================

    const fechaInicioObj =
        new Date(fechaInicio + "T00:00:00");

    const fechaFinObj =
        new Date(fechaFin + "T00:00:00");

    const fInicioTxt =
        String(fechaInicioObj.getDate()).padStart(2, "0") +
        "-" +
        mesesCortos[fechaInicioObj.getMonth()];

    const fFinTxt =
        String(fechaFinObj.getDate()).padStart(2, "0") +
        "-" +
        mesesCortos[fechaFinObj.getMonth()];

    document.getElementById("last14DaysTitle").textContent =
        `Daily Trend (${fInicioTxt} to ${fFinTxt})`;

    try {

        // ============================================================
        // FECHA FINAL EXCLUSIVA
        //
        // Ejemplo:
        //
        // fechaFin = 2026-08-17
        //
        // fechaFinExclusiva = 2026-08-18
        //
        // Así incluimos TODO el día 17.
        // ============================================================

        const fechaFinExclusivaObj =
            new Date(fechaFin + "T00:00:00");

        fechaFinExclusivaObj.setDate(
            fechaFinExclusivaObj.getDate() + 1
        );

        const fechaFinExclusiva =
            fechaFinExclusivaObj.getFullYear() + "-" +
            String(
                fechaFinExclusivaObj.getMonth() + 1
            ).padStart(2, "0") + "-" +
            String(
                fechaFinExclusivaObj.getDate()
            ).padStart(2, "0");

        // ============================================================
        // OBTENER DATOS DE PRODUCTION
        //
        // Date  = Fecha
        // Scrap = Barras
        // %Aveg = Línea
        // ============================================================

        const allData = await fetchAllRecords(
            "Production",
            q =>
                q.select('Date, Scrap, "%Aveg"')
                 .gte("Date", fechaInicio)
                 .lt("Date", fechaFinExclusiva)
        );

        console.log("=================================");
        console.log("DATOS PRODUCTION:");
        console.log(allData);
        console.log("TOTAL REGISTROS:", allData.length);
        console.log("=================================");

        // ============================================================
        // CREAR MAPAS POR DÍA
        // ============================================================

        let scrapPorDia = {};
        let sumaAvegPorDia = {};
        let cantidadAvegPorDia = {};

        fechas.forEach(fecha => {

            scrapPorDia[fecha] = 0;

            sumaAvegPorDia[fecha] = 0;

            cantidadAvegPorDia[fecha] = 0;

        });

        // ============================================================
        // PROCESAR DATOS
        // ============================================================

        allData.forEach(row => {

            if (!row.Date) return;

            // Tomamos solamente YYYY-MM-DD
            const fecha =
                String(row.Date).substring(0, 10);

            // Ignorar registros fuera del rango
            if (scrapPorDia[fecha] === undefined) {
                return;
            }

            // ========================================================
            // BARRAS = SCRAP
            // ========================================================

            scrapPorDia[fecha] +=
                Number(row.Scrap) || 0;

            // ========================================================
            // LÍNEA = %AVEG
            // ========================================================

            const aveg =
                Number(row["%Aveg"]);

            if (!isNaN(aveg)) {

                sumaAvegPorDia[fecha] += aveg;

                cantidadAvegPorDia[fecha]++;

            }

        });

        // ============================================================
        // CALCULAR PROMEDIO DIARIO %AVEG
        // ============================================================

        let porcentajePorDia = {};

        fechas.forEach(fecha => {

            if (cantidadAvegPorDia[fecha] > 0) {

                const promedio =
                    sumaAvegPorDia[fecha] /
                    cantidadAvegPorDia[fecha];

                porcentajePorDia[fecha] =
                    Number(
                        (promedio * 100).toFixed(2)
                    );

            } else {

                porcentajePorDia[fecha] = 0;

            }

        });

        // ============================================================
        // DATOS PARA CHART.JS
        // ============================================================

        const valoresScrap = fechas.map(
            fecha => scrapPorDia[fecha]
        );

        const valoresAveg = fechas.map(
            fecha => porcentajePorDia[fecha]
        );

        // ============================================================
        // ETIQUETAS
        //
        // Ejemplo:
        //
        // 2026-08-03 → 03-Aug
        // ============================================================

        const etiquetas = fechas.map(fecha => {

            const partes = fecha.split("-");

            const dia = partes[2];

            const mes =
                Number(partes[1]) - 1;

            return `${dia}-${mesesCortos[mes]}`;

        });

        // ============================================================
        // DEBUG
        // ============================================================

        console.log("=================================");
        console.log("FECHAS:", fechas);
        console.log("ETIQUETAS:", etiquetas);
        console.log("SCRAP:", valoresScrap);
        console.log("%AVEG:", valoresAveg);
        console.log("=================================");

        // ============================================================
        // PLUGIN PARA MOSTRAR SOLO LOS % DE LA LÍNEA
        //
        // IMPORTANTE:
        //
        // NO MOSTRAMOS NÚMEROS SOBRE LAS BARRAS.
        // ============================================================

        const linePercentageLabelsPlugin = {

            id: "linePercentageLabels",

            afterDatasetsDraw(chart) {

                const ctx = chart.ctx;

                // Dataset 1 = línea %Aveg
                const meta =
                    chart.getDatasetMeta(1);

                if (!meta || !meta.data) {
                    return;
                }

                const dataset =
                    chart.data.datasets[1];

                if (!dataset || !dataset.data) {
                    return;
                }

                ctx.save();

                ctx.font =
                    "bold 11px Arial";

                ctx.fillStyle =
                    "#000000";

                ctx.textAlign =
                    "center";

                ctx.textBaseline =
                    "bottom";

                meta.data.forEach((point, index) => {

                    const value =
                        dataset.data[index];

                    // No mostrar ceros
                    if (
                        value === null ||
                        value === undefined ||
                        Number(value) === 0
                    ) {
                        return;
                    }

                    const x = point.x;

                    const y = point.y;

                    const texto =
                        Number(value).toFixed(1) + "%";

                    ctx.fillText(
                        texto,
                        x,
                        y - 10
                    );

                });

                ctx.restore();

            }

        };

        // ============================================================
        // CREAR GRÁFICA
        // ============================================================

        renderManagedChart("last7Chart", {

            data: {

                labels: etiquetas,

                datasets: [

                    // =================================================
                    // DATASET 0
                    // BARRAS = SCRAP
                    // =================================================

                    {
                        type: "bar",

                        label: "Scrap",

                        data: valoresScrap,

                        backgroundColor:
                            "rgba(10, 110, 209, 0.75)",

                        borderColor:
                            "#0A6ED1",

                        borderWidth: 1,

                        borderRadius: 4,

                        yAxisID: "y"

                    },

                    // =================================================
                    // DATASET 1
                    // LÍNEA = %AVEG
                    // =================================================

                    {
                        type: "line",

                        label: "%Aveg",

                        data: valoresAveg,

                        borderColor:
                            "#e74c3c",

                        backgroundColor:
                            "#e74c3c",

                        borderWidth: 2,

                        pointRadius: 4,

                        pointHoverRadius: 6,

                        pointBackgroundColor:
                            "#e74c3c",

                        pointBorderColor:
                            "#e74c3c",

                        pointHoverBackgroundColor:
                            "#e74c3c",

                        pointHoverBorderColor:
                            "#e74c3c",

                        fill: false,

                        tension: 0.2,

                        yAxisID: "y1"

                    }

                ]

            },

            // ========================================================
            // OPCIONES
            // ========================================================

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

                    // =================================================
                    // IMPORTANTE
                    //
                    // DESACTIVAMOS ChartDataLabels COMPLETAMENTE
                    //
                    // Esto evita que aparezcan números sobre las
                    // barras.
                    // =================================================

                    datalabels: {

                        display: false

                    },

                    tooltip: {

                        enabled: true

                    }

                },

                scales: {

                    // =================================================
                    // EJE IZQUIERDO
                    // SCRAP
                    // =================================================

                    y: {

                        type: "linear",

                        display: true,

                        position: "left",

                        beginAtZero: true,

                        title: {

                            display: true,

                            text: "Scrap"

                        },

                        ticks: {

                            precision: 0

                        }

                    },

                    // =================================================
                    // EJE DERECHO
                    // %AVEG
                    // =================================================

                    y1: {

                        type: "linear",

                        display: true,

                        position: "right",

                        beginAtZero: true,

                        grid: {

                            drawOnChartArea: false

                        },

                        title: {

                            display: true,

                            text: "%Aveg"

                        },

                        ticks: {

                            callback: function(value) {

                                return value + "%";

                            }

                        }

                    }

                }

            },

            // ========================================================
            // SOLO NUESTRO PLUGIN
            //
            // ChartDataLabels NO SE USA AQUÍ.
            // ========================================================

            plugins: [

                linePercentageLabelsPlugin

            ]

        });

    } catch (err) {

        console.error(
            "Error al cargar Tendencia Diaria:",
            err
        );

    }

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

    // ============================================================
    // GENERAR LOS 15 DÍAS
    // ============================================================

    for (let i = (TREND_DAYS - 1) + offset; i >= offset; i--) {

        const fecha = new Date(hoy);

        fecha.setDate(hoy.getDate() - i);

        const iso =
            fecha.getFullYear() + "-" +
            String(fecha.getMonth() + 1).padStart(2, "0") + "-" +
            String(fecha.getDate()).padStart(2, "0");

        const label =
            String(fecha.getDate()).padStart(2, "0") + "/" +
            String(fecha.getMonth() + 1).padStart(2, "0") + "/" +
            String(fecha.getFullYear()).slice(2);

        fechasISO.push(iso);
        fechasLabels.push(label);
    }

    const fechaInicio = fechasISO[0];
    const fechaFin = fechasISO[fechasISO.length - 1];

    // ============================================================
    // FECHA FINAL EXCLUSIVA
    // Esto permite incluir TODO el último día aunque Date tenga hora
    // ============================================================

    const fechaFinObj = new Date(fechaFin + "T00:00:00");
    fechaFinObj.setDate(fechaFinObj.getDate() + 1);

    const fechaFinExclusiva =
        fechaFinObj.getFullYear() + "-" +
        String(fechaFinObj.getMonth() + 1).padStart(2, "0") + "-" +
        String(fechaFinObj.getDate()).padStart(2, "0");

    try {

        // ============================================================
        // TOTAL SCRAP POR DÍA
        // ============================================================

        const totalScrapByDate = await fetchAllRecords(
            "Scrap",
            q =>
                q.select("Date, Stripp")
                 .gte("Date", fechaInicio)
                 .lt("Date", fechaFinExclusiva)
        );

        // ============================================================
        // SCRAP DEL DEFECTO SELECCIONADO
        // ============================================================

        const defectData = await fetchAllRecords(
            "Scrap",
            q =>
                q.select("Date, Stripp, Defect_Desc")
                 .eq("Defect_Desc", defect)
                 .gte("Date", fechaInicio)
                 .lt("Date", fechaFinExclusiva)
        );

        // ============================================================
        // MAPAS
        // ============================================================

        let mapTotalesDia = {};
        let mapDefectosDia = {};

        fechasISO.forEach(fecha => {

            mapTotalesDia[fecha] = 0;
            mapDefectosDia[fecha] = 0;

        });

        // ============================================================
        // TOTAL SCRAP
        // IMPORTANTE:
        // Normalizamos Date para obtener solamente YYYY-MM-DD
        // ============================================================

        totalScrapByDate.forEach(row => {

            if (!row.Date) return;

            const fecha = String(row.Date).substring(0, 10);

            if (mapTotalesDia[fecha] !== undefined) {

                mapTotalesDia[fecha] += Number(row.Stripp) || 0;

            }

        });

        // ============================================================
        // SCRAP DEL DEFECTO
        // ============================================================

        defectData.forEach(row => {

            if (!row.Date) return;

            const fecha = String(row.Date).substring(0, 10);

            if (mapDefectosDia[fecha] !== undefined) {

                mapDefectosDia[fecha] += Number(row.Stripp) || 0;

            }

        });

        // ============================================================
        // DATOS PARA LA GRÁFICA
        // ============================================================

        const cantidades = fechasISO.map(
            fecha => mapDefectosDia[fecha]
        );

        const porcentajes = fechasISO.map(fecha => {

            const total = mapTotalesDia[fecha];
            const defecto = mapDefectosDia[fecha];

            if (total > 0) {

                return Number(
                    ((defecto / total) * 100).toFixed(1)
                );

            }

            return 0;

        });

        // ============================================================
        // DEBUG
        // Puedes dejar esto temporalmente para verificar
        // ============================================================

        console.log("======================================");
        console.log("DEFECTO:", defect);
        console.log("FECHAS:", fechasISO);
        console.log("TOTAL SCRAP:", mapTotalesDia);
        console.log("DEFECTO:", mapDefectosDia);
        console.log("CANTIDADES:", cantidades);
        console.log("PORCENTAJES:", porcentajes);
        console.log("======================================");

        // ============================================================
        // ACTUALIZAR GRÁFICA
        // ============================================================

        const chart = trendCharts[index];

        chart.data.labels = fechasLabels;

        chart.data.datasets[0].data = cantidades;

        chart.data.datasets[1].data = porcentajes;

        chart.update();

    } catch (err) {

        console.error(
            "Error al cargar tendencia mixta:",
            defect,
            err
        );

    }
}

function renderTrendCharts() {

    const container = document.getElementById("trendChartsContainer");

    if (!container) return;

    container.innerHTML = "";

    // ============================================================
    // SIN DEFECTOS SELECCIONADOS
    // ============================================================

    if (selectedDefects.length === 0) {

        container.innerHTML = `
            <div class="text-center mt-5">
                <h3>Selecciona hasta 5 defectos</h3>
                <p>
                    Las gráficas combinadas de barras (Cantidad)
                    y líneas (%) aparecerán aquí.
                </p>
            </div>
        `;

        return;
    }

    // ============================================================
    // DESTRUIR GRÁFICAS ANTERIORES
    // ============================================================

    trendCharts.forEach(chart => {

        if (chart) {
            try {
                chart.destroy();
            } catch (error) {
                console.warn("Error destruyendo gráfica:", error);
            }
        }

    });

    trendCharts = [];

    // ============================================================
    // CREAR HTML
    // ============================================================

    selectedDefects.forEach((defect, index) => {

        container.innerHTML += `
            <div class="trend-chart-card">

                <div class="d-flex justify-content-between align-items-center mb-2">

                    <h5 class="mb-0" id="trendTitle${index}">
                        <i class="fa-solid fa-bug text-danger"></i>
                        ${defect}
                    </h5>

                    <div class="btn-group"
                         role="group"
                         aria-label="Navegación trend">

                        <button
                            type="button"
                            class="btn btn-outline-primary btn-sm px-2 py-1"
                            style="font-size:11px;"
                            onclick="cambiarDiasTrend(${index}, 7)">
                            <i class="fa-solid fa-angles-left"></i>
                            +7D
                        </button>

                        <button
                            type="button"
                            class="btn btn-outline-primary btn-sm px-2 py-1"
                            style="font-size:11px;"
                            onclick="cambiarDiasTrend(${index}, 1)">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>

                        <button
                            type="button"
                            class="btn btn-outline-primary btn-sm px-2 py-1"
                            style="font-size:11px;"
                            onclick="cambiarDiasTrend(${index}, 0)">
                            Today
                        </button>

                        <button
                            type="button"
                            class="btn btn-outline-primary btn-sm px-2 py-1"
                            style="font-size:11px;"
                            onclick="cambiarDiasTrend(${index}, -1)">
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>

                        <button
                            type="button"
                            class="btn btn-outline-primary btn-sm px-2 py-1"
                            style="font-size:11px;"
                            onclick="cambiarDiasTrend(${index}, -7)">
                            -7D
                            <i class="fa-solid fa-angles-right"></i>
                        </button>

                    </div>

                </div>

                <canvas id="trendChart${index}"></canvas>

            </div>
        `;
    });

    // ============================================================
    // PLUGIN PERSONALIZADO
    //
    // IMPORTANTE:
    // NO USA ChartDataLabels
    //
    // DIBUJA ÚNICAMENTE LOS PORCENTAJES
    // DE LA LÍNEA.
    // ============================================================

    const trendLineLabelsPlugin = {

        id: "trendLineLabels",

        afterDatasetsDraw: function(chart) {

            const ctx = chart.ctx;

            // Dataset 1 = línea
            const meta = chart.getDatasetMeta(1);

            if (!meta || !meta.data) return;

            const dataset = chart.data.datasets[1];

            if (!dataset || !dataset.data) return;

            ctx.save();

            // ========================================================
            // CONFIGURACIÓN DEL TEXTO
            // ========================================================

            ctx.font = "bold 11px Arial";

            ctx.fillStyle = "#000000";

            ctx.textAlign = "center";

            ctx.textBaseline = "bottom";

            // ========================================================
            // RECORRER LOS PUNTOS DE LA LÍNEA
            // ========================================================

            meta.data.forEach((point, index) => {

                const value = dataset.data[index];

                // No mostrar si no hay valor
                if (
                    value === null ||
                    value === undefined ||
                    Number(value) === 0
                ) {
                    return;
                }

                // ====================================================
                // POSICIÓN DEL PUNTO
                // ====================================================

                const x = point.x;

                const y = point.y;

                // ====================================================
                // TEXTO
                // ====================================================

                const texto =
                    Number(value).toFixed(1) + "%";

                // ====================================================
                // DIBUJAR TEXTO ARRIBA DEL PUNTO
                // ====================================================

                ctx.fillText(
                    texto,
                    x,
                    y - 10
                );

            });

            ctx.restore();
        }
    };

    // ============================================================
    // CREAR GRÁFICAS
    // ============================================================

    selectedDefects.forEach((defect, index) => {

        const canvas =
            document.getElementById(`trendChart${index}`);

        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        // ========================================================
        // CREAR CHART
        // ========================================================

        const chart = new Chart(ctx, {

            type: "bar",

            data: {

                labels: [],

                datasets: [

                    // =================================================
                    // DATASET 0
                    // BARRAS
                    // =================================================

                    {
                        type: "bar",

                        label: "Quantity (Scrap)",

                        data: [],

                        backgroundColor:
                            "rgba(10, 110, 209, 0.75)",

                        borderColor:
                            "#0A6ED1",

                        borderWidth: 1,

                        borderRadius: 4,

                        yAxisID: "y"

                    },

                    // =================================================
                    // DATASET 1
                    // LÍNEA
                    // =================================================

                    {
                        type: "line",

                        label: "% of Daily Scrap",

                        data: [],

                        borderColor:
                            "#e74c3c",

                        backgroundColor:
                            "#e74c3c",

                        borderWidth: 2,

                        pointRadius: 5,

                        pointHoverRadius: 7,

                        pointBackgroundColor:
                            "#e74c3c",

                        pointBorderColor:
                            "#ffffff",

                        pointBorderWidth: 2,

                        pointHoverBackgroundColor:
                            "#e74c3c",

                        pointHoverBorderColor:
                            "#ffffff",

                        fill: false,

                        tension: 0.2,

                        yAxisID: "y1"

                    }

                ]

            },

            // ========================================================
            // OPCIONES
            // ========================================================

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

                    tooltip: {

                        enabled: true

                    }

                },

                scales: {

                    // =================================================
                    // EJE IZQUIERDO
                    // SCRAP
                    // =================================================

                    y: {

                        type: "linear",

                        display: true,

                        position: "left",

                        beginAtZero: true,

                        title: {

                            display: true,

                            text: "Quantity (Pieces)"

                        },

                        ticks: {

                            precision: 0

                        }

                    },

                    // =================================================
                    // EJE DERECHO
                    // PORCENTAJE
                    // =================================================

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

                            callback: function(value) {

                                return value + "%";

                            }

                        }

                    }

                }

            },

            // ========================================================
            // AQUÍ ESTÁ LA DIFERENCIA IMPORTANTE
            //
            // NO PONEMOS:
            //
            // plugins: [ChartDataLabels]
            //
            // ========================================================

            plugins: [

                trendLineLabelsPlugin

            ]

        });

        // ============================================================
        // GUARDAR GRÁFICA
        // ============================================================

        trendCharts.push(chart);

        // ============================================================
        // CARGAR DATOS
        // ============================================================

        loadTrendChartDataSingle(index);

    });

}
