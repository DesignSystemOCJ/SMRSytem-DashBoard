const supabaseUrl =
"https://mrxtqmvufmlozplszfxc.supabase.co";

const supabaseKey =
"sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient =
supabase.createClient(
supabaseUrl,
supabaseKey
);

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

/* =========================================================
CHART DEFAULTS
========================================================= */

Chart.defaults.font.family =
'"Segoe UI", Inter, Arial, sans-serif';

Chart.defaults.color =
"#64748B";

Chart.defaults.animation.duration =
800;

/* =========================================================
LOADING SCREEN
========================================================= */

function showLoading() {
const screen =
    document.getElementById("loadingScreen");

if (screen) {
    screen.classList.remove("hidden");
}
}

function hideLoading() {
const screen =
    document.getElementById("loadingScreen");

if (screen) {
    setTimeout(() => {
        screen.classList.add("hidden");
    }, 350);
}
}

/* =========================================================
INITIAL MONTH
========================================================= */

function setCurrentMonth() {
const monthIndex =
    new Date().getMonth();

const month =
    months[monthIndex] || "August";

selectMonth(month);

const modalSelect =
    document.getElementById(
        "modalMonthFilter"
    );

if (modalSelect) {
    modalSelect.value = month;
}

populateModalCellFilter();
}

/* =========================================================
CELL FILTER
========================================================= */

function populateModalCellFilter() {
const cellSelect =
    document.getElementById(
        "modalCellFilter"
    );

if (!cellSelect) return;

cellSelect.innerHTML =
    '<option value="">All Cells</option>';

machines.forEach(machine => {
    const option =
        document.createElement("option");

    option.value = machine;
    option.textContent = machine;

    cellSelect.appendChild(option);
});
}

/* =========================================================
RECORD MODAL
========================================================= */

function openRecordsModal() {
const modal =
    document.getElementById(
        "recordsModal"
    );

if (modal) {
    modal.style.display = "flex";
}

const currentMonth =
    currentSelectedMonth ||
    months[new Date().getMonth()];

const modalMonthFilter = document.getElementById("modalMonthFilter");
if (modalMonthFilter) {
    modalMonthFilter.value = currentMonth;
}

loadModalRecords();
}

function closeRecordsModal() {
const modal = document.getElementById("recordsModal");
if (modal) {
    modal.style.display = "none";
}
}

function clearCellFilter() {
const cellFilter = document.getElementById("modalCellFilter");
if (cellFilter) {
    cellFilter.value = "";
}

filterModalTable();
}

/* =========================================================
LOAD RECORDS
========================================================= */

async function loadModalRecords() {
const monthFilterElem = document.getElementById("modalMonthFilter");
const selectedMonth = monthFilterElem ? monthFilterElem.value : "August";

const tbody =
    document.getElementById(
        "modalTableBody"
    );

const thead =
    document.getElementById(
        "modalTableHeaders"
    );

const counter =
    document.getElementById(
        "recordsCount"
    );

if (!tbody || !thead) return;

tbody.innerHTML = `
    <tr>
        <td colspan="100"
            class="loading-table">
            <div class="table-loader"></div>
            Loading records...
        </td>
    </tr>
`;

if (counter) {
    counter.textContent =
        "Loading records...";
}

let allData = [];
const pageSize = 1000;
let from = 0;
let moreData = true;

try {
    while (moreData) {
        const {
            data,
            error
        } = await supabaseClient
            .from("ManttoIssues")
            .select("*")
            .eq(
                "Month",
                selectedMonth
            )
            .range(
                from,
                from + pageSize - 1
            );

        if (error) {
            console.error(error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="100"
                        style="
                        text-align:center;
                        padding:40px;
                        color:#EF4444;
                        ">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        Error loading data from Supabase.
                    </td>
                </tr>
            `;

            if (counter) {
                counter.textContent =
                    "Unable to load records";
            }

            return;
        }

        if (data && data.length > 0) {
            allData =
                allData.concat(data);

            from += pageSize;
        } else {
            moreData = false;
        }
    }

    modalRawData = allData;

    if (modalRawData.length === 0) {
        thead.innerHTML =
            "<th>No Data</th>";

        tbody.innerHTML = `
            <tr>
                <td style="
                    text-align:center;
                    padding:40px;
                ">
                    <i class="fa-solid fa-database"
                       style="
                       font-size:25px;
                       color:#CBD5E1;
                       display:block;
                       margin-bottom:10px;
                       "></i>
                    No records found for
                    <strong>${selectedMonth}</strong>
                </td>
            </tr>
        `;

        if (counter) {
            counter.textContent =
                "0 records";
        }

        return;
    }

    const keys =
        Object.keys(
            modalRawData[0]
        );

    let headerHtml = "";

    keys.forEach(key => {
        headerHtml +=
            `<th>${key}</th>`;
    });

    thead.innerHTML =
        headerHtml;

    filterModalTable();

} catch (error) {
    console.error(error);

    tbody.innerHTML = `
        <tr>
            <td colspan="100"
                style="
                text-align:center;
                padding:40px;
                color:#EF4444;
                ">
                Unexpected error loading records.
            </td>
        </tr>
    `;
}
}

/* =========================================================
FILTER RECORD TABLE
========================================================= */

function filterModalTable() {
const cellFilterElem = document.getElementById("modalCellFilter");
const selectedCell = cellFilterElem ? cellFilterElem.value : "";

const tbody =
    document.getElementById(
        "modalTableBody"
    );

const counter =
    document.getElementById(
        "recordsCount"
    );

if (!tbody) return;

let filtered =
    modalRawData;

if (selectedCell) {
    filtered =
        modalRawData.filter(
            row =>
                row.Maq === selectedCell
        );
}

if (counter) {
    counter.textContent =
        `${filtered.length.toLocaleString()} records`;
}

if (filtered.length === 0) {
    tbody.innerHTML = `
        <tr>
            <td colspan="100"
                style="
                text-align:center;
                padding:40px;
                ">
                No records match the selected cell.
            </td>
        </tr>
    `;

    return;
}

const keys =
    modalRawData.length > 0
        ? Object.keys(modalRawData[0])
        : [];

let rowsHtml = "";

filtered.forEach(row => {
    rowsHtml += "<tr>";

    keys.forEach(key => {
        const value =
            row[key] !== null &&
            row[key] !== undefined
                ? row[key]
                : "";

        rowsHtml +=
            `<td>${value}</td>`;
    });

    rowsHtml += "</tr>";
});

tbody.innerHTML =
    rowsHtml;
}

/* =========================================================
MONTH DROPDOWN
========================================================= */

function toggleMonthDropdown(event) {
event.stopPropagation();

const box =
    document.getElementById(
        "filterBox"
    );

const dropdown =
    document.getElementById(
        "monthDropdown"
    );

if (!box || !dropdown) return;

const isOpen =
    dropdown.style.display === "block";

dropdown.style.display =
    isOpen
        ? "none"
        : "block";

box.classList.toggle(
    "active",
    !isOpen
);
}

window.addEventListener(
"click",
function(event) {
    const box =
        document.getElementById(
            "filterBox"
        );

    const dropdown =
        document.getElementById(
            "monthDropdown"
        );

    const modal =
        document.getElementById(
            "recordsModal"
        );

    if (event.target === modal) {
        closeRecordsModal();
    }

    if (dropdown) dropdown.style.display = "none";
    if (box) box.classList.remove("active");
}
);

/* =========================================================
SELECT MONTH
========================================================= */

function selectMonth(
monthName,
event
) {
if (event) {
    event.stopPropagation();
}

currentSelectedMonth =
    monthName;

const monthTextElement = document.getElementById("selectedMonthText");
if (monthTextElement) {
    monthTextElement.innerText = monthName;
}

const options =
    document.querySelectorAll(
        ".custom-option"
    );

options.forEach(option => {
    option.classList.toggle(
        "selected",
        option.innerText ===
            monthName
    );
});

const dropdownElement = document.getElementById("monthDropdown");
if (dropdownElement) {
    dropdownElement.style.display = "none";
}

const filterBoxElement = document.getElementById("filterBox");
if (filterBoxElement) {
    filterBoxElement.classList.remove("active");
}

loadMaintenance();
}

/* =========================================================
LOAD MAINTENANCE DATA
========================================================= */

async function loadMaintenance() {
if (!currentSelectedMonth) return;

showLoading();

let allData = [];
const pageSize = 1000;
let from = 0;
let moreData = true;

try {
    while (moreData) {
        const {
            data,
            error
        } = await supabaseClient
            .from("ManttoIssues")
            .select("*")
            .eq(
                "Month",
                currentSelectedMonth
            )
            .range(
                from,
                from + pageSize - 1
            );

        if (error) {
            console.error(error);
            alert(
                "Error loading Supabase data."
            );
            hideLoading();
            return;
        }

        if (
            data &&
            data.length > 0
        ) {
            allData =
                allData.concat(data);

            from += pageSize;
        } else {
            moreData = false;
        }
    }

    maintenanceData =
        allData;

    selectedMachine =
        null;

    const selectedCellElem = document.getElementById("selectedCell");
    if (selectedCellElem) {
        selectedCellElem.innerText = "ALL";
    }

    updateDashboard();
    hideLoading();

} catch (error) {
    console.error(error);
    alert(
        "Unexpected error loading data."
    );
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
loadLast15DaysChart();
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
if (totalIssuesElem) {
    totalIssuesElem.innerText =
        maintenanceData.length.toLocaleString();
}

/* TOP CELL */
const cells = {};

maintenanceData.forEach(row => {
    if (row.Maq) {
        cells[row.Maq] =
            (cells[row.Maq] || 0) + 1;
    }
});

const topCell =
    Object.entries(cells)
        .sort(
            (a,b) =>
                b[1] - a[1]
        )[0];

const topCellElem = document.getElementById("topCell");
if (topCellElem) {
    topCellElem.innerHTML =
        topCell
            ? `
                ${topCell[0]}
                <small style="
                    display:block;
                    color:#0A6ED1;
                    font-size:10px;
                    margin-top:2px;
                ">
                    ${topCell[1]} Issues
                </small>
              `
            : "--";
}

/* TOP OPERATION */
const opCount = {};

operations.forEach(
    op =>
        opCount[op] = 0
);

maintenanceData.forEach(row => {
    operations.forEach(op => {
        if (row[op]) {
            opCount[op]++;
        }
    });
});

const topOperation =
    Object.entries(opCount)
        .sort(
            (a,b) =>
                b[1] - a[1]
        )[0];

const topOpElem = document.getElementById("topOperation");
if (topOpElem) {
    topOpElem.innerText =
        topOperation &&
        topOperation[1] > 0
            ? topOperation[0]
            : "--";
}

/* TOP ISSUE */
const issues = {};

maintenanceData.forEach(row => {
    operations.forEach(op => {
        if (row[op]) {
            issues[row[op]] =
                (issues[row[op]] || 0) + 1;
        }
    });
});

const topIssue =
    Object.entries(issues)
        .sort(
            (a,b) =>
                b[1] - a[1]
        )[0];

const topIssueElem = document.getElementById("topIssue");
if (topIssueElem) {
    topIssueElem.innerText =
        topIssue
            ? topIssue[0]
            : "--";
}
}

/* =========================================================
CHART ENGINE
========================================================= */

function renderChart(
canvasId,
config
) {
if (
    activeCharts[canvasId]
) {
    activeCharts[
        canvasId
    ].destroy();
}

const canvas =
    document.getElementById(
        canvasId
    );

if (!canvas) return;

activeCharts[canvasId] =
    new Chart(
        canvas,
        config
    );
}

/* =========================================================
CHART OPTIONS
========================================================= */

function baseChartOptions() {
return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        intersect: false,
        mode: "index"
    },
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            backgroundColor:
                "#07111F",
            titleColor:
                "#FFFFFF",
            bodyColor:
                "#CBD5E1",
            borderColor:
                "rgba(255,255,255,.1)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            displayColors: true
        },
        datalabels: {
            color:
                "#334155",
            anchor:
                "end",
            align:
                "top",
            offset:
                4,
            font: {
                weight:
                    "800",
                size:
                    10
            }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            grace: "15%",
            ticks: {
                precision: 0,
                color:
                    "#64748B",
                font: {
                    size: 10
                }
            },
            grid: {
                color:
                    "rgba(148,163,184,.13)"
            },
            border: {
                display: false
            }
        },
        x: {
            ticks: {
                color:
                    "#64748B",
                font: {
                    size: 9,
                    weight: "600"
                }
            },
            grid: {
                display: false
            },
            border: {
                display: false
            }
        }
    }
};
}

/* =========================================================
OPERATION CHART
========================================================= */

function createOperationChart() {
const values =
    operations.map(
        op =>
            maintenanceData.filter(
                row => row[op]
            ).length
    );

const options =
    baseChartOptions();

options.scales.x.ticks.maxRotation =
    40;
options.scales.x.ticks.minRotation =
    40;

renderChart(
    "operationChart",
    {
        type: "bar",
        data: {
            labels:
                operations,
            datasets: [
                {
                    label:
                        "Issues",
                    data:
                        values,
                    backgroundColor:
                        "#0A6ED1",
                    hoverBackgroundColor:
                        "#00A6A6",
                    borderRadius:
                        7,
                    borderSkipped:
                        false,
                    barPercentage:
                        .68
                }
            ]
        },
        options,
        plugins: [
            ChartDataLabels
        ]
    }
);
}

/* =========================================================
MONTHLY ISSUES CHART (INDEPENDENT)
========================================================= */

async function loadIndependentMonthlyChart() {
    let allYearData = [];
    const pageSize = 1000;
    let from = 0;
    let moreData = true;

    try {
        while (moreData) {
            const { data, error } = await supabaseClient
                .from("ManttoIssues")
                .select("Month")
                .range(from, from + pageSize - 1);

            if (error) {
                console.error("Error loading yearly data for monthly chart", error);
                return;
            }

            if (data && data.length > 0) {
                allYearData = allYearData.concat(data);
                from += pageSize;
            } else {
                moreData = false;
            }
        }

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
LAST 15 DAYS ISSUES CHART
========================================================= */

async function loadLast15DaysChart() {

    try {

        /*
        =====================================================
        CALCULATE LAST 15 DAYS

        If today is August 14, 2026:

        30-Jul-2026
        31-Jul-2026
        01-Aug-2026
        ...
        13-Aug-2026

        Today is NOT included.
        =====================================================
        */

        const today = new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );

        const dates = [];

        for (let i = 15; i >= 1; i--) {

            const date =
                new Date(today);

            date.setDate(
                today.getDate() - i
            );

            dates.push(date);
        }


        /*
        =====================================================
        DATE RANGE FOR SUPABASE

        Start = 15 days ago
        End   = yesterday
        =====================================================
        */

        const startDate =
            dates[0];

        const endDate =
            dates[dates.length - 1];


        /*
        =====================================================
        FORMAT DATE AS YYYY-MM-DD

        This is used to compare with the Supabase Date field.
        =====================================================
        */

        function formatDate(date) {

            const year =
                date.getFullYear();

            const month =
                String(
                    date.getMonth() + 1
                ).padStart(2, "0");

            const day =
                String(
                    date.getDate()
                ).padStart(2, "0");

            return `${year}-${month}-${day}`;
        }


        const start =
            formatDate(
                startDate
            );

        const end =
            formatDate(
                endDate
            );


        /*
        =====================================================
        LOAD DATA FROM SUPABASE

        IMPORTANT:
        This query DOES NOT use Month.

        It uses Date so the chart is independent
        from the Maintenance Period selector.
        =====================================================
        */

        let allData = [];

        const pageSize = 1000;

        let from = 0;

        let moreData = true;


        while (moreData) {

            const {
                data,
                error
            } = await supabaseClient
                .from("ManttoIssues")
                .select("Date")
                .gte(
                    "Date",
                    start
                )
                .lte(
                    "Date",
                    end
                )
                .range(
                    from,
                    from + pageSize - 1
                );


            if (error) {

                console.error(
                    "Error loading last 15 days:",
                    error
                );

                return;
            }


            if (
                data &&
                data.length > 0
            ) {

                allData =
                    allData.concat(
                        data
                    );

                from += pageSize;

            } else {

                moreData = false;

            }

        }


        /*
        =====================================================
        COUNT ISSUES PER DAY
        =====================================================
        */

        const dailyCount = {};


        dates.forEach(date => {

            const key =
                formatDate(date);

            dailyCount[key] = 0;

        });


        allData.forEach(row => {

            if (!row.Date) return;


            /*
            Handle:

            2026-08-13
            2026-08-13T00:00:00
            2026-08-13T15:30:00
            */

            const dateValue =
                String(row.Date)
                    .substring(
                        0,
                        10
                    );


            if (
                Object.prototype.hasOwnProperty.call(
                    dailyCount,
                    dateValue
                )
            ) {

                dailyCount[dateValue]++;

            }

        });


        /*
        =====================================================
        CHART LABELS
        =====================================================
        */

        const labels =
            dates.map(date => {

                return date.toLocaleDateString(
                    "en-US",
                    {
                        month: "short",
                        day: "numeric"
                    }
                );

            });


        const values =
            dates.map(date => {

                return dailyCount[
                    formatDate(date)
                ];

            });


        /*
        =====================================================
        CHART OPTIONS
        =====================================================
        */

        const options =
            baseChartOptions();


        options.scales.x.ticks.maxRotation =
            45;

        options.scales.x.ticks.minRotation =
            45;

        options.scales.x.ticks.autoSkip =
            false;


        /*
        =====================================================
        CREATE CHART
        =====================================================
        */

        renderChart(
            "last15DaysChart",
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Issues",

                            data:
                                values,

                            borderColor:
                                "#0A6ED1",

                            backgroundColor:
                                "rgba(10,110,209,.10)",

                            hoverBackgroundColor:
                                "#00A6A6",

                            borderWidth:
                                3,

                            pointRadius:
                                5,

                            pointHoverRadius:
                                7,

                            pointBackgroundColor:
                                "#0A6ED1",

                            pointBorderColor:
                                "#FFFFFF",

                            pointBorderWidth:
                                2,

                            tension:
                                0.35,

                            fill:
                                true
                        }

                    ]

                },

                options,

                plugins: [
                    ChartDataLabels
                ]

            }
        );


        console.log(
            "Last 15 Days:",
            {
                start,
                end,
                data: dailyCount
            }
        );


    } catch (error) {

        console.error(
            "Unexpected error loading last 15 days chart:",
            error
        );

    }

}

/* =========================================================
ISSUE CHART
========================================================= */

function createIssueChart() {
const issues = {};

maintenanceData.forEach(row => {
    operations.forEach(op => {
        if (row[op]) {
            issues[row[op]] =
                (issues[row[op]] || 0) + 1;
        }
    });
});

const result =
    Object.entries(issues)
        .sort(
            (a,b) =>
                b[1] - a[1]
        )
        .slice(0,10);

const colors =
    result.map(
        (_,i) =>
            i === 0
                ? "#F59E0B"
                : "#0A6ED1"
    );

const options =
    baseChartOptions();

options.scales.x.ticks.maxRotation =
    45;
options.scales.x.ticks.autoSkip =
    false;

renderChart(
    "issueChart",
    {
        type: "bar",
        data: {
            labels:
                result.map(x => x[0]),
            datasets: [
                {
                    label:
                        "Count",
                    data:
                        result.map(x => x[1]),
                    backgroundColor:
                        colors,
                    borderRadius:
                        7,
                    borderSkipped:
                        false
                }
            ]
        },
        options,
        plugins: [
            ChartDataLabels
        ]
    }
);
}

/* =========================================================
MACHINE CHART
========================================================= */

function createMachineChart() {
const count = {};

machines.forEach(
    machine =>
        count[machine] = 0
);

maintenanceData.forEach(row => {
    if (
        row.Maq &&
        Object.prototype.hasOwnProperty.call(
            count,
            row.Maq
        )
    ) {
        count[row.Maq]++;
    }
});

const labels =
    Object.keys(count);
const values =
    Object.values(count);

const options =
    baseChartOptions();

options.scales.x.ticks.maxRotation =
    45;
options.scales.x.ticks.minRotation =
    45;

renderChart(
    "machineChart",
    {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label:
                        "Issues",
                    data:
                        values,
                    backgroundColor:
                        "#0A6ED1",
                    hoverBackgroundColor:
                        "#00A6A6",
                    borderRadius:
                        6,
                    borderSkipped:
                        false,
                    barPercentage:
                        .65
                }
            ]
        },
        options,
        plugins: [
            ChartDataLabels
        ]
    }
);
}

/* =========================================================
TOP 10
========================================================= */

function createTop10Table() {
const count = {};

maintenanceData.forEach(row => {
    if (row.Maq) {
        count[row.Maq] =
            (count[row.Maq] || 0) + 1;
    }
});

const result =
    Object.entries(count)
        .sort(
            (a,b) =>
                b[1] - a[1]
        )
        .slice(0,10);

const tbody =
    document.getElementById(
        "top10Table"
    );

if (!tbody) return;

let html = "";

result.forEach(
    (item,index) => {
        html += `
            <tr
                onclick="
                    selectMachineForAnalysis(
                        '${item[0]}'
                    )
                "
            >
                <td class="rank">
                    #${index + 1}
                </td>
                <td>
                    ${item[0]}
                </td>
                <td>
                    <b>
                        ${item[1]}
                    </b>
                </td>
            </tr>
        `;
    }
);

tbody.innerHTML =
    html;
}

/* =========================================================
SELECT MACHINE
========================================================= */

function selectMachineForAnalysis(
machineName
) {
selectedMachine =
    machineName;

const selectedCellElem = document.getElementById("selectedCell");
if (selectedCellElem) {
    selectedCellElem.innerText = machineName;
}

updateCellAnalysis();
}

/* =========================================================
CELL ANALYSIS
========================================================= */

function updateCellAnalysis() {
const filteredData =
    selectedMachine
        ? maintenanceData.filter(
            row =>
                row.Maq ===
                selectedMachine
          )
        : maintenanceData;

[
    "md",
    "op1",
    "op2",
    "chiron"
].forEach(opKey => {
    const opName =
        opKey === "md"
            ? "MD"
            : opKey === "op1"
                ? "OP1"
                : opKey === "op2"
                    ? "OP2"
                    : "CHIRON";

    const issues = {};

    filteredData.forEach(row => {
        if (row[opName]) {
            issues[row[opName]] =
                (issues[row[opName]] || 0) + 1;
        }
    });

    const result =
        Object.entries(issues)
            .sort(
                (a,b) =>
                    b[1] - a[1]
            )
            .slice(0,5);

    const options =
        baseChartOptions();

    options.scales.x.ticks.maxRotation =
        30;
    options.scales.x.ticks.minRotation =
        30;
    options.scales.x.ticks.font =
        {
            size: 9
        };

    renderChart(
        opKey + "Chart",
        {
            type: "bar",
            data: {
                labels:
                    result.map(x => x[0]),
                datasets: [
                    {
                        label:
                            "Count",
                        data:
                            result.map(x => x[1]),
                        backgroundColor:
                            "#00A6A6",
                        hoverBackgroundColor:
                            "#0A6ED1",
                        borderRadius:
                            6,
                        borderSkipped:
                            false
                    }
                ]
            },
            options,
            plugins: [
                ChartDataLabels
            ]
        }
    );
});
}

/* =========================================================
INITIALIZATION
========================================================= */

window.addEventListener(
"load",
function() {
    if (!currentSelectedMonth) {
        const monthIndex = new Date().getMonth();
        currentSelectedMonth = months[monthIndex] || "August";
        const monthTextElem = document.getElementById("selectedMonthText");
        if (monthTextElem) {
            monthTextElem.innerText = currentSelectedMonth;
        }
    }
    setCurrentMonth();
}
);
