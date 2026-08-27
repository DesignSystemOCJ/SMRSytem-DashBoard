// ============================================================
// SCRAP QUALITY DASHBOARD
// ============================================================

// ============================================================
// SUPABASE
// ============================================================

const supabaseUrl = "https://mrxtqmvufmlozplszfxc.supabase.co";
const supabaseKey = "sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient =
    supabase.createClient(
        supabaseUrl,
        supabaseKey
    );


// ============================================================
// VARIABLES GLOBALES
// ============================================================

const activeCharts = {};

let selectedDefects = [];

let trendCharts = [];

const TREND_DAYS = 15;

let offsetDiasMain = 0;

const trendOffsets = {};

let trendTop20Data = [];


// ============================================================
// MESES
// ============================================================

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

let selectedMonth =
    MONTH_NAMES[new Date().getMonth()];


// ============================================================
// INICIO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "SCRAP DASHBOARD INICIANDO..."
        );

        initMonthSelect();

        loadDashboard();

    }
);


// ============================================================
// SELECTOR DE MES
// ============================================================

function initMonthSelect() {

    const monthSelect =
        document.getElementById(
            "monthSelect"
        );

    if (!monthSelect) return;

    monthSelect.innerHTML = "";

    MONTH_NAMES.forEach(
        month => {

            const opt =
                document.createElement(
                    "option"
                );

            opt.value = month;

            opt.textContent =
                month.toUpperCase();

            if (
                month ===
                selectedMonth
            ) {

                opt.selected = true;

            }

            monthSelect.appendChild(
                opt
            );

        }
    );

}


// ============================================================
// CAMBIAR MES
// ============================================================

function changeMonth(newMonth) {

    console.log(
        "Cambiando mes:",
        newMonth
    );

    selectedMonth = newMonth;

    offsetDiasMain = 0;

    loadDashboard();

}


// ============================================================
// RENDER CHART
// ============================================================

function renderManagedChart(
    canvasId,
    config
) {

    const canvas =
        document.getElementById(
            canvasId
        );

    if (!canvas) {

        console.warn(
            "Canvas no encontrado:",
            canvasId
        );

        return null;

    }

    if (
        activeCharts[canvasId]
    ) {

        try {

            activeCharts[
                canvasId
            ].destroy();

        } catch (error) {

            console.warn(
                "Error destruyendo chart:",
                error
            );

        }

    }

    const ctx =
        canvas.getContext("2d");

    activeCharts[canvasId] =
        new Chart(
            ctx,
            config
        );

    return activeCharts[
        canvasId
    ];

}


// ============================================================
// CARGAR TODO EL DASHBOARD
// ============================================================

async function loadDashboard() {

    console.log(
        "================================="
    );

    console.log(
        "CARGANDO DASHBOARD"
    );

    console.log(
        "MES:",
        selectedMonth
    );

    console.log(
        "================================="
    );

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

        console.log(
            "Dashboard cargado correctamente."
        );

    } catch (err) {

        console.error(
            "ERROR GENERAL DASHBOARD:",
            err
        );

    }

}


// ============================================================
// OBTENER TODOS LOS REGISTROS
// ============================================================

async function fetchAllRecords(
    table,
    queryBuilderFn
) {

    let allData = [];

    let desde = 0;

    const limite = 1000;

    while (true) {

        let query =
            supabaseClient
                .from(table)
                .select("*")
                .range(
                    desde,
                    desde + limite - 1
                );

        if (
            queryBuilderFn
        ) {

            query =
                queryBuilderFn(
                    query
                );

        }

        const {
            data,
            error
        } = await query;

        if (error) {

            console.error(
                "Supabase error:",
                error
            );

            throw error;

        }

        if (
            data &&
            data.length > 0
        ) {

            allData =
                allData.concat(
                    data
                );

        }

        if (
            !data ||
            data.length <
            limite
        ) {

            break;

        }

        desde += limite;

    }

    return allData;

}


// ============================================================
// KPI
// ============================================================

async function loadKPIs() {

    try {

        const data =
            await fetchAllRecords(
                "Scrap",
                q =>
                    q
                        .select(
                            "Model, Defect_Desc, Stripp, Month"
                        )
                        .eq(
                            "Month",
                            selectedMonth
                        )
            );

        let totalScrap = 0;

        const models = {};

        const defects = {};

        data.forEach(
            row => {

                const model =
                    row.Model ||
                    "Sin Modelo";

                const defect =
                    row.Defect_Desc ||
                    "Sin Defecto";

                const val =
                    Number(
                        row.Stripp
                    ) || 0;

                totalScrap += val;

                models[model] =
                    (
                        models[model] ||
                        0
                    ) + val;

                defects[defect] =
                    (
                        defects[defect] ||
                        0
                    ) + val;

            }
        );


        // TOTAL

        const totalElement =
            document.getElementById(
                "totalScrap"
            );

        if (totalElement) {

            totalElement.textContent =
                totalScrap.toLocaleString();

        }


        // TOP MODEL

        const topModel =
            Object.entries(
                models
            )
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                )[0];


        const topModelElement =
            document.getElementById(
                "topModel"
            );

        if (
            topModelElement
        ) {

            topModelElement.textContent =
                topModel
                    ? `${topModel[0]} (${topModel[1].toLocaleString()})`
                    : "-";

        }


        // TOP DEFECT

        const topDefect =
            Object.entries(
                defects
            )
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                )[0];


        const topDefectElement =
            document.getElementById(
                "topDefect"
            );

        if (
            topDefectElement
        ) {

            topDefectElement.textContent =
                topDefect
                    ? `${topDefect[0]} (${topDefect[1].toLocaleString()})`
                    : "-";

        }

    } catch (error) {

        console.error(
            "Error loadKPIs:",
            error
        );

    }

}


// ============================================================
// SCRAP PERCENTAGE
// ============================================================

async function loadScrapPercentage() {

    try {

        const allData =
            await fetchAllRecords(
                "Production",
                q =>
                    q
                        .select(
                            '"%Aveg", Month'
                        )
                        .eq(
                            "Month",
                            selectedMonth
                        )
            );

        if (
            allData.length === 0
        ) {

            document.getElementById(
                "scrapPercent"
            ).textContent = "-";

            return;

        }

        let total = 0;

        let contador = 0;

        allData.forEach(
            row => {

                const valor =
                    Number(
                        row["%Aveg"]
                    );

                if (
                    !isNaN(valor)
                ) {

                    total += valor;

                    contador++;

                }

            }
        );

        const promedio =
            contador > 0
                ? total / contador
                : 0;

        document.getElementById(
            "scrapPercent"
        ).textContent =
            (
                promedio * 100
            ).toFixed(2) + "%";

    } catch (error) {

        console.error(
            "Error loadScrapPercentage:",
            error
        );

    }

}


// ============================================================
// SCRAP PER MONTH
// ============================================================

async function loadMonthlyChart() {

    try {

        const allData =
            await fetchAllRecords(
                "Production",
                q =>
                    q.select(
                        'Month, "%Aveg"'
                    )
            );


        const sumaAveg = {};

        const cantidadAveg = {};


        MONTH_NAMES.forEach(
            month => {

                sumaAveg[month] = 0;

                cantidadAveg[month] = 0;

            }
        );


        allData.forEach(
            row => {

                if (!row.Month)
                    return;

                const monthDB =
                    String(
                        row.Month
                    )
                        .trim()
                        .toLowerCase();

                const valor =
                    Number(
                        row["%Aveg"]
                    );

                if (
                    isNaN(valor)
                )
                    return;


                const month =
                    MONTH_NAMES.find(
                        m =>
                            m.toLowerCase() ===
                            monthDB
                    );

                if (!month)
                    return;


                sumaAveg[month] +=
                    valor;

                cantidadAveg[month]++;

            }
        );


        const valoresPorcentaje =
            MONTH_NAMES.map(
                month => {

                    if (
                        cantidadAveg[month] ===
                        0
                    ) {

                        return 0;

                    }

                    const promedio =
                        sumaAveg[month] /
                        cantidadAveg[month];

                    return Number(
                        (
                            promedio *
                            100
                        ).toFixed(2)
                    );

                }
            );


        renderManagedChart(
            "monthlyChart",
            {

                type: "bar",

                plugins: [
                    ChartDataLabels
                ],

                data: {

                    labels:
                        MONTH_NAMES,

                    datasets: [

                        {

                            label:
                                "Average %Aveg",

                            data:
                                valoresPorcentaje,

                            backgroundColor:
                                "rgba(10, 110, 209, 0.75)",

                            borderColor:
                                "#0A6ED1",

                            borderWidth: 1,

                            borderRadius: 4

                        }

                    ]

                },

                options: {

                    responsive: true,

                    plugins: {

                        legend: {
                            display: false
                        },

                        datalabels: {

                            anchor:
                                "center",

                            align:
                                "center",

                            font: {
                                weight:
                                    "bold",
                                size:
                                    10
                            },

                            color:
                                "#000000",

                            formatter:
                                value =>
                                    value > 0
                                        ? value.toFixed(2) + "%"
                                        : ""

                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    context =>
                                        "Average %Aveg: " +
                                        Number(
                                            context.raw
                                        ).toFixed(2) +
                                        "%"

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            title: {

                                display:
                                    true,

                                text:
                                    "Average %Aveg"

                            },

                            ticks: {

                                callback:
                                    value =>
                                        value + "%"

                            }

                        }

                    }

                }

            }
        );

    } catch (error) {

        console.error(
            "Error loadMonthlyChart:",
            error
        );

    }

}


// ============================================================
// TOP 10 MODELOS
// ============================================================

async function loadModelChart() {

    try {

        const allData =
            await fetchAllRecords(
                "Scrap",
                q =>
                    q
                        .select(
                            "Model, Month, Stripp"
                        )
                        .eq(
                            "Month",
                            selectedMonth
                        )
            );


        const models = {};


        allData.forEach(
            row => {

                const model =
                    row.Model ||
                    "Sin Modelo";

                const qty =
                    Number(
                        row.Stripp
                    ) || 0;

                models[model] =
                    (
                        models[model] ||
                        0
                    ) + qty;

            }
        );


        const result =
            Object.entries(
                models
            )
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                )
                .slice(
                    0,
                    10
                );


        renderManagedChart(
            "modelChart",
            {

                type: "bar",

                plugins: [
                    ChartDataLabels
                ],

                data: {

                    labels:
                        result.map(
                            x => x[0]
                        ),

                    datasets: [

                        {

                            label:
                                "Scrap Qty",

                            data:
                                result.map(
                                    x => x[1]
                                ),

                            backgroundColor:
                                "rgba(10, 110, 209, 0.75)"

                        }

                    ]

                },

                options: {

                    indexAxis: "y",

                    responsive: true,

                    plugins: {

                        legend: {
                            display: false
                        },

                        datalabels: {

                            anchor:
                                "end",

                            align:
                                "right",

                            font: {

                                weight:
                                    "bold",

                                size:
                                    10

                            },

                            color:
                                "#003b5c",

                            formatter:
                                val => val

                        }

                    }

                }

            }
        );

    } catch (error) {

        console.error(
            "Error loadModelChart:",
            error
        );

    }

}


// ============================================================
// TOP 10 DEFECTOS CHART
// ============================================================

async function loadDefectChart() {

    try {

        const allData =
            await fetchAllRecords(
                "Scrap",
                q =>
                    q
                        .select(
                            "Defect_Desc, Stripp, Month"
                        )
                        .eq(
                            "Month",
                            selectedMonth
                        )
            );


        const defectos = {};


        allData.forEach(
            row => {

                const defecto =
                    row.Defect_Desc ||
                    "Sin Defecto";

                const cantidad =
                    Number(
                        row.Stripp
                    ) || 0;

                defectos[defecto] =
                    (
                        defectos[defecto] ||
                        0
                    ) + cantidad;

            }
        );


        const top10 =
            Object.entries(
                defectos
            )
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                )
                .slice(
                    0,
                    10
                );


        renderManagedChart(
            "defectChart",
            {

                type: "bar",

                plugins: [
                    ChartDataLabels
                ],

                data: {

                    labels:
                        top10.map(
                            x => x[0]
                        ),

                    datasets: [

                        {

                            label:
                                "Total Scrap",

                            data:
                                top10.map(
                                    x => x[1]
                                ),

                            backgroundColor:
                                "rgba(0, 163, 163, 0.75)"

                        }

                    ]

                },

                options: {

                    indexAxis: "y",

                    responsive: true,

                    plugins: {

                        legend: {
                            display: false
                        },

                        datalabels: {

                            anchor:
                                "end",

                            align:
                                "right",

                            font: {

                                weight:
                                    "bold",

                                size:
                                    10

                            },

                            color:
                                "#003b5c",

                            formatter:
                                val => val

                        }

                    }

                }

            }
        );

    } catch (error) {

        console.error(
            "Error loadDefectChart:",
            error
        );

    }

}


// ============================================================
// NAVEGACIÓN GRÁFICA PRINCIPAL
// ============================================================

function cambiarDiasRangoMain(
    dias
) {

    if (
        dias === 0
    ) {

        offsetDiasMain = 0;

    } else {

        offsetDiasMain +=
            dias;

    }

    loadLast14Days();

}


// ============================================================
// TREND PRINCIPAL - ÚLTIMOS 15 DÍAS
// ============================================================

async function loadLast14Days() {

    const hoy =
        new Date();


    const fechas = [];


    for (
        let i =
            (TREND_DAYS - 1) +
            offsetDiasMain;

        i >=
            1 +
            offsetDiasMain;

        i--
    ) {

        const fecha =
            new Date(hoy);

        fecha.setDate(
            hoy.getDate() - i
        );


        const formato =
            fecha.getFullYear() +
            "-" +
            String(
                fecha.getMonth() + 1
            ).padStart(2, "0") +
            "-" +
            String(
                fecha.getDate()
            ).padStart(2, "0");


        fechas.push(
            formato
        );

    }


    const fechaInicio =
        fechas[0];

    const fechaFin =
        fechas[
            fechas.length - 1
        ];


    const mesesCortos = [

        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"

    ];


    const fechaInicioObj =
        new Date(
            fechaInicio +
            "T00:00:00"
        );


    const fechaFinObj =
        new Date(
            fechaFin +
            "T00:00:00"
        );


    const fInicioTxt =
        String(
            fechaInicioObj.getDate()
        ).padStart(2, "0") +
        "-" +
        mesesCortos[
            fechaInicioObj.getMonth()
        ];


    const fFinTxt =
        String(
            fechaFinObj.getDate()
        ).padStart(2, "0") +
        "-" +
        mesesCortos[
            fechaFinObj.getMonth()
        ];


    const title =
        document.getElementById(
            "last14DaysTitle"
        );


    if (title) {

        title.textContent =
            `Daily Trend (${fInicioTxt} to ${fFinTxt})`;

    }


    try {

        const fechaFinExclusivaObj =
            new Date(
                fechaFin +
                "T00:00:00"
            );


        fechaFinExclusivaObj.setDate(
            fechaFinExclusivaObj.getDate() +
            1
        );


        const fechaFinExclusiva =
            fechaFinExclusivaObj
                .getFullYear() +
            "-" +
            String(
                fechaFinExclusivaObj
                    .getMonth() + 1
            ).padStart(2, "0") +
            "-" +
            String(
                fechaFinExclusivaObj
                    .getDate()
            ).padStart(2, "0");


        const allData =
            await fetchAllRecords(
                "Production",
                q =>
                    q
                        .select(
                            'Date, Scrap, "%Aveg"'
                        )
                        .gte(
                            "Date",
                            fechaInicio
                        )
                        .lt(
                            "Date",
                            fechaFinExclusiva
                        )
            );


        const scrapPorDia = {};

        const sumaAvegPorDia = {};

        const cantidadAvegPorDia = {};


        fechas.forEach(
            fecha => {

                scrapPorDia[fecha] = 0;

                sumaAvegPorDia[fecha] = 0;

                cantidadAvegPorDia[fecha] = 0;

            }
        );


        allData.forEach(
            row => {

                if (!row.Date)
                    return;


                const fecha =
                    String(
                        row.Date
                    ).substring(
                        0,
                        10
                    );


                if (
                    scrapPorDia[fecha] ===
                    undefined
                ) {

                    return;

                }


                scrapPorDia[fecha] +=
                    Number(
                        row.Scrap
                    ) || 0;


                const aveg =
                    Number(
                        row["%Aveg"]
                    );


                if (
                    !isNaN(aveg)
                ) {

                    sumaAvegPorDia[fecha] +=
                        aveg;

                    cantidadAvegPorDia[fecha]++;

                }

            }
        );


        const porcentajePorDia = {};


        fechas.forEach(
            fecha => {

                if (
                    cantidadAvegPorDia[fecha] >
                    0
                ) {

                    const promedio =
                        sumaAvegPorDia[fecha] /
                        cantidadAvegPorDia[fecha];

                    porcentajePorDia[fecha] =
                        Number(
                            (
                                promedio *
                                100
                            ).toFixed(2)
                        );

                } else {

                    porcentajePorDia[fecha] =
                        0;

                }

            }
        );


        const valoresScrap =
            fechas.map(
                fecha =>
                    scrapPorDia[fecha]
            );


        const valoresAveg =
            fechas.map(
                fecha =>
                    porcentajePorDia[fecha]
            );


        const etiquetas =
            fechas.map(
                fecha => {

                    const partes =
                        fecha.split("-");

                    return (
                        partes[2] +
                        "-" +
                        mesesCortos[
                            Number(
                                partes[1]
                            ) - 1
                        ]
                    );

                }
            );


        const linePercentageLabelsPlugin = {

            id:
                "linePercentageLabels",

            afterDatasetsDraw(
                chart
            ) {

                const ctx =
                    chart.ctx;

                const meta =
                    chart.getDatasetMeta(
                        1
                    );

                if (
                    !meta ||
                    !meta.data
                )
                    return;


                const dataset =
                    chart.data.datasets[1];


                if (
                    !dataset ||
                    !dataset.data
                )
                    return;


                ctx.save();

                ctx.font =
                    "bold 11px Arial";

                ctx.fillStyle =
                    "#000000";

                ctx.textAlign =
                    "center";

                ctx.textBaseline =
                    "bottom";


                meta.data.forEach(
                    (
                        point,
                        index
                    ) => {

                        const value =
                            dataset.data[
                                index
                            ];


                        if (
                            value === null ||
                            value === undefined ||
                            Number(value) === 0
                        ) {

                            return;

                        }


                        ctx.fillText(

                            Number(
                                value
                            ).toFixed(2) +
                            "%",

                            point.x,

                            point.y - 10

                        );

                    }
                );


                ctx.restore();

            }

        };


        renderManagedChart(
            "last7Chart",
            {

                data: {

                    labels:
                        etiquetas,

                    datasets: [

                        {

                            type:
                                "bar",

                            label:
                                "Scrap",

                            data:
                                valoresScrap,

                            backgroundColor:
                                "rgba(10, 110, 209, 0.75)",

                            borderColor:
                                "#0A6ED1",

                            borderWidth: 1,

                            borderRadius: 4,

                            yAxisID:
                                "y"

                        },

                        {

                            type:
                                "line",

                            label:
                                "%Aveg",

                            data:
                                valoresAveg,

                            borderColor:
                                "#e74c3c",

                            backgroundColor:
                                "#e74c3c",

                            borderWidth:
                                2,

                            pointRadius:
                                4,

                            pointHoverRadius:
                                6,

                            fill:
                                false,

                            tension:
                                0.2,

                            yAxisID:
                                "y1"

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },


                    plugins: {

                        legend: {

                            display:
                                true,

                            position:
                                "top"

                        },

                        datalabels: {

                            display:
                                false

                        }

                    },


                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            title: {

                                display:
                                    true,

                                text:
                                    "Scrap"

                            },

                            ticks: {

                                precision:
                                    0

                            }

                        },

                        y1: {

                            beginAtZero:
                                true,

                            position:
                                "right",

                            grid: {

                                drawOnChartArea:
                                    false

                            },

                            title: {

                                display:
                                    true,

                                text:
                                    "%Aveg"

                            },

                            ticks: {

                                callback:
                                    value =>
                                        Number(
                                            value
                                        ).toFixed(
                                            2
                                        ) + "%"

                            }

                        }

                    }

                },

                plugins: [

                    linePercentageLabelsPlugin

                ]

            }
        );

    } catch (error) {

        console.error(
            "Error loadLast14Days:",
            error
        );

    }

}


// ============================================================
// TOP 10 DEFECTOS TABLE (ACTUALIZADA CON BADGES Y ALINEACIÓN)
// ============================================================

async function loadTop10DefectsTable() {

    try {

        const data =
            await fetchAllRecords(
                "Scrap",
                q =>
                    q
                        .select(
                            "Defect_Desc, Stripp"
                        )
                        .eq(
                            "Month",
                            selectedMonth
                        )
            );


        const defects = {};

        let totalMes = 0;


        data.forEach(
            row => {

                const defecto =
                    row.Defect_Desc ||
                    "Unknown";

                const cantidad =
                    Number(
                        row.Stripp
                    ) || 0;

                totalMes +=
                    cantidad;

                defects[defecto] =
                    (
                        defects[defecto] ||
                        0
                    ) + cantidad;

            }
        );


        const top10 =
            Object.entries(
                defects
            )
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                )
                .slice(
                    0,
                    10
                );


        let html = "";


        top10.forEach(
            (item, index) => {

                const porcentaje =
                    totalMes > 0
                        ? (
                            (
                                item[1] /
                                totalMes
                            ) * 100
                        ).toFixed(2)
                        : "0.00";


                const defectEscaped =
                    String(
                        item[0]
                    )
                        .replace(
                            /\\/g,
                            "\\\\"
                        )
                        .replace(
                            /'/g,
                            "\\'"
                        );


                html += `

                    <tr
                        style="cursor:pointer"
                        onclick="loadModelTopIssues('${defectEscaped}', this)"
                        title="Haz clic para ver modelos afectados"
                    >

                        <td class="text-center text-muted fw-bold">
                            ${index + 1}
                        </td>

                        <td>
                            <div class="fw-semibold text-dark">${item[0]}</div>
                        </td>

                        <td class="text-end font-monospace">
                            ${item[1].toLocaleString()}
                        </td>

                        <td class="text-end">
                            <span class="badge bg-primary bg-opacity-10 text-primary px-2 py-1">${porcentaje}%</span>
                        </td>

                    </tr>

                `;

            }
        );


        const table =
            document.getElementById(
                "top10DefectsTable"
            );


        if (table) {

            table.innerHTML =
                html;

        }


        if (
            top10.length > 0
        ) {

            const firstRow =
                document.querySelector(
                    "#top10DefectsTable tr"
                );


            if (
                firstRow
            ) {

                loadModelTopIssues(
                    top10[0][0],
                    firstRow
                );

            }

        }

    } catch (error) {

        console.error(
            "Error loadTop10DefectsTable:",
            error
        );

    }

}


// ============================================================
// MODELOS DEL DEFECTO SELECCIONADO (ACTUALIZADA CON BADGES Y ALINEACIÓN)
// ============================================================

async function loadModelTopIssues(
    defect,
    rowElement
) {

    document
        .querySelectorAll(
            "#top10DefectsTable tr"
        )
        .forEach(
            r =>
                r.classList.remove(
                    "table-primary"
                )
        );


    if (
        rowElement
    ) {

        rowElement.classList.add(
            "table-primary"
        );

    }


    const title =
        document.getElementById(
            "modelTitle"
        );


    if (title) {

        title.innerHTML =
            `<i class="fa-solid fa-cube"></i> Model Top Issues - ${defect}`;

    }


    try {

        const data =
            await fetchAllRecords(
                "Scrap",
                q =>
                    q
                        .select(
                            "Model, Defect_Desc, Stripp"
                        )
                        .eq(
                            "Month",
                            selectedMonth
                        )
                        .eq(
                            "Defect_Desc",
                            defect
                        )
            );


        const modelos = {};

        let total = 0;


        data.forEach(
            row => {

                const model =
                    row.Model ||
                    "Unknown";

                const qty =
                    Number(
                        row.Stripp
                    ) || 0;

                total += qty;

                modelos[model] =
                    (
                        modelos[model] ||
                        0
                    ) + qty;

            }
        );


        const top10 =
            Object.entries(
                modelos
            )
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                )
                .slice(
                    0,
                    10
                );


        let html = "";


        top10.forEach(
            (item, index) => {

                const porcentaje =
                    total > 0
                        ? (
                            (
                                item[1] /
                                total
                            ) * 100
                        ).toFixed(2)
                        : "0.00";


                html += `

                    <tr>

                        <td class="text-center text-muted fw-bold">
                            ${index + 1}
                        </td>

                        <td>
                            <div class="fw-semibold text-dark">${item[0]}</div>
                        </td>

                        <td class="text-end font-monospace">
                            ${item[1].toLocaleString()}
                        </td>

                        <td class="text-end">
                            <span class="badge bg-success bg-opacity-10 text-success px-2 py-1">${porcentaje}%</span>
                        </td>

                    </tr>

                `;

            }
        );


        const table =
            document.getElementById(
                "modelTopIssuesTable"
            );


        if (table) {

            table.innerHTML =
                html;

        }

    } catch (error) {

        console.error(
            "Error loadModelTopIssues:",
            error
        );

    }

}


// ============================================================
// ABRIR TREND MODAL
// ============================================================

async function openTrendModal() {

    const modal =
        document.getElementById(
            "trendModal"
        );


    if (modal) {

        modal.style.display =
            "block";

    }


    selectedDefects = [];


    Object.keys(
        trendOffsets
    ).forEach(
        key =>
            delete trendOffsets[key]
    );


    trendCharts.forEach(
        chart => {

            if (chart) {

                try {

                    chart.destroy();

                } catch (e) {}

            }

        }
    );


    trendCharts = [];


    const container =
        document.getElementById(
            "trendChartsContainer"
        );


    if (container) {

        container.innerHTML = `

            <div class="text-center mt-5">

                <h3>
                    Select up to 5 defects
                </h3>

                <p>
                    The combined bar (Quantity)
                    and line (%) charts will
                    appear here.
                </p>

            </div>

        `;

    }


    const search =
        document.getElementById(
            "trendSearchInput"
        );


    if (search) {

        search.value = "";

    }


    await loadTrendTop20();

}


// ============================================================
// CERRAR TREND MODAL
// ============================================================

function closeTrendModal() {

    const modal =
        document.getElementById(
            "trendModal"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


// ============================================================
// CARGAR TOP 20 TREND
// ============================================================

async function loadTrendTop20() {

    try {

        const allData =
            await fetchAllRecords(
                "Scrap",
                q =>
                    q
                        .select(
                            "Defect_Desc, Stripp"
                        )
                        .eq(
                            "Month",
                            selectedMonth
                        )
            );


        const defects = {};

        let totalMes = 0;


        allData.forEach(
            row => {

                const defecto =
                    row.Defect_Desc ||
                    "Unknown";

                const qty =
                    Number(
                        row.Stripp
                    ) || 0;

                totalMes += qty;

                defects[defecto] =
                    (
                        defects[defecto] ||
                        0
                    ) + qty;

            }
        );


        const top20 =
            Object.entries(
                defects
            )
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                )
                .slice(
                    0,
                    20
                );


        trendTop20Data =
            top20.map(
                (item, index) => ({

                    rank:
                        index + 1,

                    defect:
                        item[0],

                    qty:
                        item[1],

                    percentage:
                        totalMes > 0
                            ? (
                                (
                                    item[1] /
                                    totalMes
                                ) * 100
                            ).toFixed(2)
                            : "0.00"

                })
            );


        renderTrendTable(
            trendTop20Data
        );


    } catch (error) {

        console.error(
            "Error loadTrendTop20:",
            error
        );

    }

}


// ============================================================
// RENDER TABLA TREND
// ============================================================

function renderTrendTable(
    data
) {

    const tbody =
        document.getElementById(
            "trendTableBody"
        );


    if (!tbody) return;


    let html = "";


    if (
        data.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="text-center text-muted"
                >

                    No defects found.

                </td>

            </tr>

        `;


        updateTrendSearchInfo(
            0
        );

        return;

    }


    data.forEach(
        item => {

            const isSelected =
                selectedDefects.includes(
                    item.defect
                );


            const defectEscaped =
                String(
                    item.defect
                )
                    .replace(
                        /\\/g,
                        "\\\\"
                    )
                    .replace(
                        /'/g,
                        "\\'"
                    );


            html += `

                <tr>

                    <td>

                        <input
                            type="checkbox"
                            value="${escapeHtml(item.defect)}"
                            ${isSelected ? "checked" : ""}
                            onchange="toggleTrendDefect(this, '${defectEscaped}')"
                        >

                    </td>

                    <td class="text-center text-muted fw-bold">
                        ${item.rank}
                    </td>

                    <td>
                        <div class="fw-semibold text-dark">${escapeHtml(item.defect)}</div>
                    </td>

                    <td class="text-end font-monospace">
                        ${Number(item.qty).toLocaleString()}
                    </td>

                    <td class="text-end">
                        <span class="badge bg-primary bg-opacity-10 text-primary px-2 py-1">${item.percentage}%</span>
                    </td>

                </tr>

            `;

        }
    );


    tbody.innerHTML =
        html;


    updateTrendSearchInfo(
        data.length
    );

}


// ============================================================
// ESCAPAR HTML
// ============================================================

function escapeHtml(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ============================================================
// FILTRO TREND
// ============================================================

function filterTrendTable() {

    const input =
        document.getElementById(
            "trendSearchInput"
        );


    if (!input) return;


    const search =
        input.value
            .trim()
            .toLowerCase();


    if (
        search === ""
    ) {

        renderTrendTable(
            trendTop20Data
        );

        return;

    }


    const filtered =
        trendTop20Data.filter(
            item =>
                String(
                    item.defect
                )
                    .toLowerCase()
                    .includes(
                        search
                    )
        );


    renderTrendTable(
        filtered
    );

}


// ============================================================
// LIMPIAR BUSCADOR
// ============================================================

function clearTrendSearch() {

    const input =
        document.getElementById(
            "trendSearchInput"
        );


    if (input) {

        input.value = "";

        input.focus();

    }


    renderTrendTable(
        trendTop20Data
    );

}


// ============================================================
// TEXTO RESULTADOS BUSCADOR
// ============================================================

function updateTrendSearchInfo(
    count
) {

    const element =
        document.getElementById(
            "trendSearchResults"
        );


    if (!element)
        return;


    const searchInput =
        document.getElementById(
            "trendSearchInput"
        );


    const search =
        searchInput
            ? searchInput.value.trim()
            : "";


    if (
        search === ""
    ) {

        element.textContent =
            `Showing Top ${trendTop20Data.length} defects`;

    } else {

        element.textContent =
            `${count} defect(s) found`;

    }

}


// ============================================================
// SELECCIONAR / DESELECCIONAR DEFECTO
// ============================================================

function toggleTrendDefect(
    check,
    defect
) {

    if (
        check.checked
    ) {

        if (
            selectedDefects.length >= 5
        ) {

            alert(
                "Máximo 5 defectos simultáneos."
            );

            check.checked =
                false;

            return;

        }


        if (
            !selectedDefects.includes(
                defect
            )
        ) {

            selectedDefects.push(
                defect
            );

        }


        trendOffsets[
            selectedDefects.length - 1
        ] = 0;


    } else {

        const indexRemovido =
            selectedDefects.indexOf(
                defect
            );


        selectedDefects =
            selectedDefects.filter(
                d =>
                    d !== defect
            );


        const nuevosOffsets = {};


        selectedDefects.forEach(
            (
                _,
                idx
            ) => {

                if (
                    idx >=
                    indexRemovido
                ) {

                    nuevosOffsets[idx] =
                        trendOffsets[
                            idx + 1
                        ] || 0;

                } else {

                    nuevosOffsets[idx] =
                        trendOffsets[
                            idx
                        ] || 0;

                }

            }
        );


        Object.keys(
            trendOffsets
        ).forEach(
            key =>
                delete trendOffsets[key]
        );


        Object.assign(
            trendOffsets,
            nuevosOffsets
        );

    }


    renderTrendCharts();

}


// ============================================================
// CAMBIAR DÍAS TREND
// ============================================================

function cambiarDiasTrend(
    index,
    dias
) {

    if (
        dias === 0
    ) {

        trendOffsets[index] =
            0;

    } else {

        trendOffsets[index] =
            (
                trendOffsets[index] ||
                0
            ) + dias;

    }


    loadTrendChartDataSingle(
        index
    );

}


// ============================================================
// CARGAR DATOS DE UNA GRÁFICA TREND
// ============================================================

async function loadTrendChartDataSingle(
    index
) {

    const defect =
        selectedDefects[index];


    if (
        !defect ||
        !trendCharts[index]
    ) {

        return;

    }


    const offset =
        trendOffsets[index] ||
        0;


    const hoy =
        new Date();


    const fechasISO = [];

    const fechasLabels = [];


    for (
        let i =
            (TREND_DAYS - 1) +
            offset;

        i >= offset;

        i--
    ) {

        const fecha =
            new Date(hoy);


        fecha.setDate(
            hoy.getDate() - i
        );


        const iso =
            fecha.getFullYear() +
            "-" +
            String(
                fecha.getMonth() + 1
            ).padStart(2, "0") +
            "-" +
            String(
                fecha.getDate()
            ).padStart(2, "0");


        const label =
            String(
                fecha.getDate()
            ).padStart(2, "0") +
            "/" +
            String(
                fecha.getMonth() + 1
            ).padStart(2, "0") +
            "/" +
            String(
                fecha.getFullYear()
            ).slice(2);


        fechasISO.push(
            iso
        );

        fechasLabels.push(
            label
        );

    }


    const fechaInicio =
        fechasISO[0];


    const fechaFin =
        fechasISO[
            fechasISO.length - 1
        ];


    const fechaFinObj =
        new Date(
            fechaFin +
            "T00:00:00"
        );


    fechaFinObj.setDate(
        fechaFinObj.getDate() + 1
    );


    const fechaFinExclusiva =
        fechaFinObj.getFullYear() +
        "-" +
        String(
            fechaFinObj.getMonth() + 1
        ).padStart(2, "0") +
        "-" +
        String(
            fechaFinObj.getDate()
        ).padStart(2, "0");


    try {

        console.log(
            "Trend:",
            defect,
            fechaInicio,
            fechaFin
        );


        // ========================================================
        // TOTAL SCRAP POR DÍA
        // ========================================================

        const totalScrapByDate =
            await fetchAllRecords(
                "Scrap",
                q =>
                    q
                        .select(
                            "Date, Stripp"
                        )
                        .gte(
                            "Date",
                            fechaInicio
                        )
                        .lt(
                            "Date",
                            fechaFinExclusiva
                        )
            );


        // ========================================================
        // DEFECTO
        // ========================================================

        const defectData =
            await fetchAllRecords(
                "Scrap",
                q =>
                    q
                        .select(
                            "Date, Stripp, Defect_Desc"
                        )
                        .eq(
                            "Defect_Desc",
                            defect
                        )
                        .gte(
                            "Date",
                            fechaInicio
                        )
                        .lt(
                            "Date",
                            fechaFinExclusiva
                        )
            );


        const mapTotalesDia = {};

        const mapDefectosDia = {};


        fechasISO.forEach(
            fecha => {

                mapTotalesDia[fecha] =
                    0;

                mapDefectosDia[fecha] =
                    0;

            }
        );


        totalScrapByDate.forEach(
            row => {

                if (!row.Date)
                    return;


                const fecha =
                    String(
                        row.Date
                    ).substring(
                        0,
                        10
                    );


                if (
                    mapTotalesDia[
                        fecha
                    ] !== undefined
                ) {

                    mapTotalesDia[
                        fecha
                    ] +=
                        Number(
                            row.Stripp
                        ) || 0;

                }

            }
        );


        defectData.forEach(
            row => {

                if (!row.Date)
                    return;


                const fecha =
                    String(
                        row.Date
                    ).substring(
                        0,
                        10
                    );


                if (
                    mapDefectosDia[
                        fecha
                    ] !== undefined
                ) {

                    mapDefectosDia[
                        fecha
                    ] +=
                        Number(
                            row.Stripp
                        ) || 0;

                }

            }
        );


        const cantidades =
            fechasISO.map(
                fecha =>
                    mapDefectosDia[
                        fecha
                    ]
            );


        const porcentajes =
            fechasISO.map(
                fecha => {

                    const total =
                        mapTotalesDia[
                            fecha
                        ];

                    const defectoQty =
                        mapDefectosDia[
                            fecha
                        ];


                    if (
                        total > 0
                    ) {

                        return Number(
                            (
                                (
                                    defectoQty /
                                    total
                                ) * 100
                            ).toFixed(2)
                        );

                    }

                    return 0;

                }
            );


        const chart =
            trendCharts[index];


        if (!chart)
            return;


        chart.data.labels =
            fechasLabels;


        chart.data.datasets[0].data =
            cantidades;


        chart.data.datasets[1].data =
            porcentajes;


        chart.update();


        console.log(
            "Trend actualizado:",
            defect,
            cantidades,
            porcentajes
        );


    } catch (error) {

        console.error(
            "Error loadTrendChartDataSingle:",
            defect,
            error
        );

    }

}


// ============================================================
// RENDER TODAS LAS GRÁFICAS TREND
// ============================================================

function renderTrendCharts() {

    const container =
        document.getElementById(
            "trendChartsContainer"
        );


    if (!container)
        return;


    container.innerHTML = "";


    if (
        selectedDefects.length === 0
    ) {

        container.innerHTML = `

            <div class="text-center mt-5">

                <h3>
                    Selecciona hasta 5 defectos
                </h3>

                <p>
                    Las gráficas combinadas de
                    barras (Cantidad) y
                    líneas (%) aparecerán aquí.
                </p>

            </div>

        `;


        return;

    }


    // ========================================================
    // DESTRUIR ANTERIORES
    // ========================================================

    trendCharts.forEach(
        chart => {

            if (chart) {

                try {

                    chart.destroy();

                } catch (error) {}

            }

        }
    );


    trendCharts = [];


    // ========================================================
    // HTML
    // ========================================================

    selectedDefects.forEach(
        (
            defect,
            index
        ) => {

            container.innerHTML += `

                <div class="trend-chart-card">

                    <div
                        class="d-flex
                               justify-content-between
                               align-items-center
                               mb-2"
                    >

                        <h5
                            class="mb-0"
                            id="trendTitle${index}"
                        >

                            <i
                                class="fa-solid
                                       fa-bug
                                       text-danger"
                            ></i>

                            ${escapeHtml(
                                defect
                            )}

                        </h5>


                        <div
                            class="btn-group"
                            role="group"
                        >

                            <button
                                type="button"
                                class="btn btn-outline-primary btn-sm px-2 py-1"
                                style="font-size:11px;"
                                onclick="cambiarDiasTrend(${index}, 7)"
                            >

                                <i
                                    class="fa-solid
                                           fa-angles-left"
                                ></i>

                                +7D

                            </button>


                            <button
                                type="button"
                                class="btn btn-outline-primary btn-sm px-2 py-1"
                                style="font-size:11px;"
                                onclick="cambiarDiasTrend(${index}, 1)"
                            >

                                <i
                                    class="fa-solid
                                           fa-chevron-left"
                                ></i>

                            </button>


                            <button
                                type="button"
                                class="btn btn-outline-primary btn-sm px-2 py-1"
                                style="font-size:11px;"
                                onclick="cambiarDiasTrend(${index}, 0)"
                            >

                                Today

                            </button>


                            <button
                                type="button"
                                class="btn btn-outline-primary btn-sm px-2 py-1"
                                style="font-size:11px;"
                                onclick="cambiarDiasTrend(${index}, -1)"
                            >

                                <i
                                    class="fa-solid
                                           fa-chevron-right"
                                ></i>

                            </button>


                            <button
                                type="button"
                                class="btn btn-outline-primary btn-sm px-2 py-1"
                                style="font-size:11px;"
                                onclick="cambiarDiasTrend(${index}, -7)"
                            >

                                -7D

                                <i
                                    class="fa-solid
                                           fa-angles-right"
                                ></i>

                            </button>

                        </div>

                    </div>


                    <canvas
                        id="trendChart${index}"
                    ></canvas>

                </div>

            `;

        }
    );


    // ========================================================
    // PLUGIN PORCENTAJES
    // ========================================================

    const trendLineLabelsPlugin = {

        id:
            "trendLineLabels",

        afterDatasetsDraw:
            function(chart) {

                const ctx =
                    chart.ctx;


                const meta =
                    chart.getDatasetMeta(
                        1
                    );


                if (
                    !meta ||
                    !meta.data
                )
                    return;


                const dataset =
                    chart.data.datasets[1];


                if (
                    !dataset ||
                    !dataset.data
                )
                    return;


                ctx.save();


                ctx.font =
                    "bold 11px Arial";

                ctx.fillStyle =
                    "#000000";

                ctx.textAlign =
                    "center";

                ctx.textBaseline =
                    "bottom";


                meta.data.forEach(
                    (
                        point,
                        index
                    ) => {

                        const value =
                            dataset.data[
                                index
                            ];


                        if (
                            value === null ||
                            value === undefined ||
                            Number(value) === 0
                        ) {

                            return;

                        }


                        ctx.fillText(

                            Number(
                                value
                            ).toFixed(2) +
                            "%",

                            point.x,

                            point.y - 10

                        );

                    }
                );


                ctx.restore();

            }

    };


    // ========================================================
    // CREAR CHARTS
    // ========================================================

    selectedDefects.forEach(
        (
            defect,
            index
        ) => {

            const canvas =
                document.getElementById(
                    `trendChart${index}`
                );


            if (!canvas)
                return;


            const ctx =
                canvas.getContext(
                    "2d"
                );


            const chart =
                new Chart(
                    ctx,
                    {

                        type:
                            "bar",

                        data: {

                            labels:
                                [],

                            datasets: [

                                // =================================
                                // BARRAS
                                // =================================

                                {

                                    type:
                                        "bar",

                                    label:
                                        "Quantity (Scrap)",

                                    data:
                                        [],

                                    backgroundColor:
                                        "rgba(10, 110, 209, 0.75)",

                                    borderColor:
                                        "#0A6ED1",

                                    borderWidth:
                                        1,

                                    borderRadius:
                                        4,

                                    yAxisID:
                                        "y"

                                },


                                // =================================
                                // LINEA
                                // =================================

                                {

                                    type:
                                        "line",

                                    label:
                                        "% of Daily Scrap",

                                    data:
                                        [],

                                    borderColor:
                                        "#e74c3c",

                                    backgroundColor:
                                        "#e74c3c",

                                    borderWidth:
                                        2,

                                    pointRadius:
                                        5,

                                    pointHoverRadius:
                                        7,

                                    pointBackgroundColor:
                                        "#e74c3c",

                                    pointBorderColor:
                                        "#ffffff",

                                    pointBorderWidth:
                                        2,

                                    fill:
                                        false,

                                    tension:
                                        0.2,

                                    yAxisID:
                                        "y1"

                                }

                            ]

                        },


                        options: {

                            responsive:
                                true,

                            interaction: {

                                mode:
                                    "index",

                                intersect:
                                    false

                            },


                            plugins: {

                                legend: {

                                    display:
                                        true,

                                    position:
                                        "top"

                                },


                                tooltip: {

                                    enabled:
                                        true,

                                    callbacks: {

                                        label:
                                            function(
                                                context
                                            ) {

                                                const datasetIndex =
                                                    context.datasetIndex;


                                                const value =
                                                    Number(
                                                        context.raw
                                                    );


                                                if (
                                                    datasetIndex ===
                                                    1
                                                ) {

                                                    return (
                                                        "% of Daily Scrap: " +
                                                        value.toFixed(2) +
                                                        "%"
                                                    );

                                                }


                                                return (
                                                    "Quantity (Scrap): " +
                                                    value.toLocaleString()
                                                );

                                            }

                                    }

                                },

                                datalabels: {

                                    display:
                                        false

                                }

                            },


                            scales: {

                                y: {

                                    type:
                                        "linear",

                                    display:
                                        true,

                                    position:
                                        "left",

                                    beginAtZero:
                                        true,

                                    title: {

                                        display:
                                            true,

                                        text:
                                            "Quantity (Pieces)"

                                    },

                                    ticks: {

                                        precision:
                                            0

                                    }

                                },


                                y1: {

                                    type:
                                        "linear",

                                    display:
                                        true,

                                    position:
                                        "right",

                                    beginAtZero:
                                        true,

                                    max:
                                        100,

                                    grid: {

                                        drawOnChartArea:
                                            false

                                    },

                                    title: {

                                        display:
                                            true,

                                        text:
                                            "% of Total"

                                    },

                                    ticks: {

                                        callback:
                                            function(
                                                value
                                            ) {

                                                return (
                                                    Number(
                                                        value
                                                    ).toFixed(2) +
                                                    "%"
                                                );

                                            }

                                    }

                                }

                            }

                        },


                        plugins: [

                            trendLineLabelsPlugin

                        ]

                    }
                );


            trendCharts.push(
                chart
            );


            // CARGAR DATOS
            loadTrendChartDataSingle(
                index
            );

        }
    );

}


// ============================================================
// FIN
// ============================================================

console.log(
    "ScrapMrb.js cargado correctamente."
);